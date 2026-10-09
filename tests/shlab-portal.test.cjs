'use strict';
const test = require('node:test'), a = require('node:assert/strict');
const s = require('../crawler/lib/custom/shlab_portal');
const { adapterCommand } = require('../crawler/crawl');
const { normalizeJobs } = require('../crawler/publish');
const [campus, social] = s.PROFILES;
const name = zh => ({ en_us: zh, zh_cn: zh });
const row = (n, extra = {}) => ({ id: String(1000 + n), job_id: String(n), title: '岗位' + n, description: '职责' + n + '\n<b>原样文本</b> &amp;', requirement: '要求' + n,
  job_active_status: 1, job_recruitment_type: { id: '1', name: name('实习') }, job_function: { id: '1', name: { zh_cn: '算法' } },
  address_list: [{ city: { code: 'c', name: name('上海') } }, { city: { code: 'd', name: name('北京') } }], futureField: { a: 1 }, ...extra });
// 每页 limit=7 的游标分页
function fakeFetch(rows, { failOn, brokenCursor } = {}) {
  const calls = [];
  const impl = async url => {
    const u = new URL(url), token = u.searchParams.get('page_token'), page = token ? Number(token.slice(1)) : 0;
    calls.push(u.searchParams.get('mode') + ':' + (token || '-'));
    if (page + 1 === failOn) return { status: 403, json: async () => ({}) };
    const items = rows.slice(page * 7, page * 7 + 7), more = (page + 1) * 7 < rows.length;
    return { status: 200, json: async () => ({ errno: 0, errmsg: 'ok', data: { has_more: more, items, ...(more ? { page_token: brokenCursor ? token || 'p0' : 'p' + (page + 1) } : {}) } }) };
  };
  impl.calls = calls;
  return impl;
}
const opts = f => ({ fetchImpl: f, sleep: async () => {} });

test('single cursor scan keeps markup text verbatim, tolerates unknown fields and bad rows', async () => {
  const rows = Array.from({ length: 9 }, (_, i) => row(i + 1)); rows.push(row(10, { title: ' ' }), row(1));
  const f = fakeFetch(rows);
  const raw = await s.run(campus, opts(f));
  a.equal(f.calls.length, 2); a.equal(raw.complete, false); a.equal(raw.total, 9); a.equal(raw.verification.policy, 'available');
  a.ok(raw.issues.some(m => m.includes('缺ID/标题')));
  const j = normalizeJobs(raw.jobs, campus)[0];
  a.equal(j.id, 'shlab:1001'); a.equal(j.duty, '职责1\n<b>原样文本</b> &amp;'); a.equal(j.requirements, '要求1');
  a.equal(j.city, '上海/北京'); a.equal(j.category, '算法'); a.equal(j.employment, 'internship'); a.equal(j.sourceStatus, '1'); a.deepEqual(j.channels, ['campus']);
  a.equal(j.url, 'https://www.shlab.org.cn/joinus/detail/1001?mode=campus'); a.equal(j.jdComplete, true);
});

test('minimal records still publish; later page failure and cyclic cursor keep earlier rows', async () => {
  const bare = normalizeJobs([{ id: '5', title: 'T' }], social)[0];
  a.equal(bare.city, ''); a.equal(bare.duty, ''); a.equal(bare.employment, null); a.equal(bare.sourceStatus, null); a.equal(bare.jdComplete, false);
  const rows = Array.from({ length: 15 }, (_, i) => row(i + 1));
  const failed = await s.run(social, opts(fakeFetch(rows, { failOn: 2 })));
  a.equal(failed.total, 7); a.ok(failed.issues.some(m => m.includes('第2页停止')));
  const cyclic = await s.run(social, opts(fakeFetch(rows, { brokenCursor: true })));
  a.ok(cyclic.issues.some(m => m.includes('游标')));
});

test('first-page refusal and effective zero never succeed', async () => {
  await a.rejects(s.run(campus, opts(fakeFetch([row(1)], { failOn: 1 }))), /HTTP 403/);
  await a.rejects(s.run(campus, opts(fakeFetch([]))), /no usable/);
});

test('source gate: registered key+adapter+mode only', () => {
  for (const p of s.PROFILES) { a.equal(s.verifiedSource(p), true); a.ok(adapterCommand(p, '/tmp/raw.json')); a.ok(s.portalNotice(p)); }
  const swapped = { ...campus, body: { ...campus.body, mode: 'social' } };
  a.equal(s.verifiedSource(swapped), false); a.equal(adapterCommand(swapped, '/tmp/raw.json'), null);
  a.equal(adapterCommand({ ...campus, key: 'alias' }, '/tmp/raw.json'), null);
});
