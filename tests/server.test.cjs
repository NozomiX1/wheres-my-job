'use strict';
// 搜索服务：用仓库里的已发布数据起一个临时端口的服务，只断言不随数据变化的性质。
const test = require('node:test'), a = require('node:assert/strict'), path = require('node:path');
const { createApp, LIMITS } = require('../server/index');
const createRank = require('../assets/rank.js');

const dataFile = path.join(__dirname, '..', 'data', 'catalog.js');
let app, base;
test.before(async () => { app = createApp({ dataFile, reloadMs: 0 }); await new Promise(r => app.server.listen(0, '127.0.0.1', r)); base = 'http://127.0.0.1:' + app.server.address().port; });
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
  for (const body of [{ words: 'x' }, { words: [''] }, { words: ['a'.repeat(LIMITS.wordLength + 1)] }, { words: Array(LIMITS.words + 1).fill('a') }, { limit: LIMITS.page + 1 }, { limit: 0 }, { offset: -1 }, { recruitment: 'x' }, { selected: [1] }, []])
    a.equal((await post(body)).status, 400, JSON.stringify(body).slice(0, 40));
  a.equal((await post(null, '{not json')).status, 400);
  a.equal((await post(null, JSON.stringify({ words: ['a'.repeat(LIMITS.body)] }))).status, 413);
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
  const last = []; for (let i = 0; i < LIMITS.requests + 5; i++) last.push((await fetch(base + '/api/health')).status);
  a.ok(last.includes(429));
});
