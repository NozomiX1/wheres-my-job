'use strict';
// 搜索服务：用仓库里的已发布数据起一个临时端口的服务，只断言不随数据变化的性质。
const test = require('node:test'), a = require('node:assert/strict'), path = require('node:path');
const { createApp, clientIp, LIMITS } = require('../server/index');
const createRank = require('../assets/rank.js');

const dataFile = path.join(__dirname, 'fixtures', 'data', 'catalog.js'); // 从真实数据抽样的小数据集（每来源 30 条、正文截短）
let app, base;
test.before(async () => { app = createApp({ dataFile, reloadMs: 0, warm: false }); await new Promise(r => app.server.listen(0, '127.0.0.1', r)); base = 'http://127.0.0.1:' + app.server.address().port; });
test.after(() => app.server.close());
const post = (body, raw) => fetch(base + '/api/search', { method: 'POST', body: raw ?? JSON.stringify(body) });

test('search returns the same ranking as the shared rank module, and pages are consistent', async () => {
  const query = { words: ['算法', 'python'], lowered: ['销售'], recruitment: 'all' };
  const full = await (await post({ ...query, limit: 40 })).json(), p1 = await (await post({ ...query, limit: 20 })).json(), p2 = await (await post({ ...query, limit: 20, offset: 20 })).json();
  a.deepEqual([...p1.items, ...p2.items].map(i => i.id), full.items.map(i => i.id));
  const { jobs } = app.state(), rank = createRank({ unitMemberships: undefined, ...{} });
  const expected = jobs.map(j => rank.score(j, query)).sort(rank.compare).slice(0, 5).map(r => [r.job.id, r.value]);
  a.deepEqual(full.items.slice(0, 5).map(i => [i.id, i.value]), expected);
  a.equal(full.total, jobs.length); a.ok(full.matched > 0); a.ok(full.items.every(i => !('duty' in i) && !('description' in i)), 'list rows must not carry JD text');
  const top = full.items[0]; a.ok(top.matchedText.length === top.matched.length);
  a.ok(full.items.every(i => /^https?:\/\//.test(i.url)), 'rows need the official link for the apply button');
});

test('selected units and recruitment scope filter the result set', async () => {
  const r = await (await post({ words: [], selected: ['字节跳动'], recruitment: 'campus', limit: 100 })).json();
  a.ok(r.total > 0 && r.items.every(i => i.company === '字节跳动'));
});

test('invalid input is rejected with 4xx, never 500', async () => {
  for (const body of [{ words: 'x' }, { words: [''] }, { words: ['a'.repeat(LIMITS.wordLength + 1)] }, { words: Array(LIMITS.words + 1).fill('a') }, { limit: LIMITS.page + 1 }, { limit: 0 }, { offset: -1 }, { recruitment: 'x' }, { selected: [1] }, { cities: '北京' }, { cities: [1] }, { cities: Array(LIMITS.cities + 1).fill('北京') }, { unknown: 'no' }, []])
    a.equal((await post(body)).status, 400, JSON.stringify(body).slice(0, 40));
  a.equal((await post(null, '{not json')).status, 400);
  a.equal((await post(null, JSON.stringify({ words: ['a'.repeat(LIMITS.body)] }))).status, 413);
});

test('starting without a data file fails with a clear instruction, not a raw stack', () => {
  a.throws(() => createApp({ dataFile: path.join(__dirname, 'no-such-dir', 'catalog.js'), reloadMs: 0, warm: false }), /找不到数据文件.*先采集/);
});

test('health reports data freshness and the last crawl result', async () => {
  const h = await (await fetch(base + '/api/health')).json();
  a.ok(h.jobs > 0 && /^\d{4}-\d\d-\d\dT/.test(h.dataUpdatedAt)); a.ok('lastRun' in h);
});

test('job detail returns the full job without internal fields; unknown ids are 404', async () => {
  const id = app.state().jobs[0].id, job = await (await fetch(base + '/api/job/' + encodeURIComponent(id))).json();
  a.equal(job.id, id); a.ok('duty' in job && !('__lc' in job));
  a.equal((await fetch(base + '/api/job/nope')).status, 404);
});

test('static: page, assets and catalog are served; shards, source files and traversal are not', async () => {
  for (const url of ['/', '/assets/rank.js', '/assets/app.js', '/data/catalog.js']) a.equal((await fetch(base + url)).status, 200, url);
  for (const url of ['/data/parts/x.js', '/crawler/publish.js', '/assets/../crawler/publish.js', '/%2e%2e/package.json', '/assets/%2e%2e%2fcrawler%2fpublish.js']) a.equal((await fetch(base + url)).status, 404, url);
  a.equal((await fetch(base + '/', { method: 'POST' })).status, 405);
});

test('per-IP rate limit answers 429 and the service survives', async () => {
  const own = createApp({ dataFile, reloadMs: 0, warm: false }); await new Promise(r => own.server.listen(0, '127.0.0.1', r));
  try {
    const url = 'http://127.0.0.1:' + own.server.address().port + '/api/health', codes = [];
    for (let i = 0; i < LIMITS.requests + 5; i++) codes.push((await fetch(url)).status);
    a.ok(codes.includes(429)); a.equal(codes[0], 200);
  } finally { own.server.close(); }
});

test('the cached index ranks exactly like the reference rank.collect: order, values, hit words, counts, deep pages', async () => {
  const { jobs, rank } = app.state();
  const queries = [{ words: ['算法', 'python', '大模型'], lowered: ['销售'] }, { words: ['Agent', 'C++', '实习'] }, { lowered: ['测试'] }, { words: ['算法', '算法'], lowered: ['算法'] },
    { words: ['财务'], selected: ['字节跳动'], recruitment: 'campus' }, { words: ['  前端'], lowered: ['后端 '] }, {},
    { cities: ['北京'] }, { words: ['算法'], cities: ['北京', '上海'], unknown: false }, { cities: ['不存在的城市'] }, { cities: ['杭州'], unknown: false, recruitment: 'campus', selected: ['字节跳动'] }];
  for (const q of queries) {
    const query = { words: [], lowered: [], selected: [], recruitment: 'all', cities: [], ...q }, ref = rank.collect(jobs, { ...query, cities: new Set(query.cities) }, new Set(query.selected));
    for (const offset of [0, 1500]) {
      const got = await (await post({ ...query, offset, limit: 100 })).json();
      a.equal(got.total, ref.length); a.equal(got.matched, ref.filter(r => r.matched.length).length); a.equal(got.penalized, ref.filter(r => r.downranked.length).length);
      a.deepEqual(got.items.map(i => [i.id, i.value, i.matched, i.downranked]), ref.slice(offset, offset + 100).map(r => [r.job.id, r.value, r.matched, r.downranked]), JSON.stringify(q));
    }
  }
});

test('a large word list (the example set) is accepted and answers quickly once its terms are cached', async () => {
  const words = Array.from({ length: 120 }, (_, i) => '词' + i), body = { words: words.slice(0, 85), lowered: words.slice(85), limit: 50 };
  a.equal((await post(body)).status, 200);
  const started = Date.now(); a.equal((await post(body)).status, 200); a.ok(Date.now() - started < 1500, 'cached query took ' + (Date.now() - started) + 'ms');
});

test('behind a local proxy each visitor (X-Forwarded-For) has their own rate-limit budget; the header is ignored for non-local peers', async () => {
  const own = createApp({ dataFile, reloadMs: 0, warm: false }); await new Promise(r => own.server.listen(0, '127.0.0.1', r));
  try {
    const url = 'http://127.0.0.1:' + own.server.address().port + '/api/health', as = ip => fetch(url, { headers: { 'X-Forwarded-For': ip } }).then(r => r.status), codes = [];
    for (let i = 0; i < LIMITS.requests + 5; i++) codes.push(await as('1.1.1.1'));
    a.ok(codes.includes(429), 'first visitor is limited'); a.equal(await as('2.2.2.2'), 200, 'another visitor is not'); a.equal(await as('9.9.9.9, 2.2.2.2'), 200, 'last hop wins, so a spoofed prefix cannot dodge the limit');
  } finally { own.server.close(); }
  const req = (peer, header) => ({ socket: { remoteAddress: peer }, headers: header === undefined ? {} : { 'x-forwarded-for': header } });
  a.equal(clientIp(req('127.0.0.1', '8.8.8.8')), '8.8.8.8'); a.equal(clientIp(req('::1', '7.7.7.7, 8.8.8.8')), '8.8.8.8');
  a.equal(clientIp(req('203.0.113.5', '8.8.8.8')), '203.0.113.5', 'direct peers cannot spoof'); a.equal(clientIp(req('127.0.0.1')), '127.0.0.1');
});

test('when the client IP is unknown (loopback only), each browser id gets its own rate-limit budget; without an id they share one', async () => {
  const own = createApp({ dataFile, reloadMs: 0, warm: false }); await new Promise(r => own.server.listen(0, '127.0.0.1', r));
  try {
    const url = 'http://127.0.0.1:' + own.server.address().port + '/api/health', as = id => fetch(url, id ? { headers: { 'X-Visitor-Id': id } } : {}).then(r => r.status), codes = [];
    for (let i = 0; i < LIMITS.requests + 5; i++) codes.push(await as('browser-aaaa1111'));
    a.ok(codes.includes(429), 'one browser is limited'); a.equal(await as('browser-bbbb2222'), 200, 'another browser is not'); a.equal(await as('bad id!'), 200, 'an invalid id falls back to the shared budget, which is still unused');
  } finally { own.server.close(); }
});
