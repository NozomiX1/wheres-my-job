'use strict';
const test = require('node:test'), a = require('node:assert/strict');
const c = require('../crawler/lib/custom/ctrip_portal');
const { adapterCommand } = require('../crawler/crawl');
const { normalizeJobs } = require('../crawler/publish');
const [campus, social] = c.PROFILES;
const HTML = '<p>你将会负责：</p><p>1. 构建数据分析体系</p><p>任职要求：</p><p>1. 本科及以上</p>';
const row = (n, extra = {}) => ({ id: String(100 + n), fromId: 'MJ' + n, jobId: 'uuid-' + n, jobTitle: '岗位' + n, cityName: 'Shanghai', requirements: HTML, duty: null, someNewField: 1, ...extra });
// pages: 每页 10 条；total 默认等于行数
function fakeFetch(rows, { total = rows.length, failOn } = {}) {
  const calls = [];
  const impl = async (url, options) => {
    const n = Number(JSON.parse(options.body).pager.index); calls.push(n);
    if (n === failOn) return { status: 429, json: async () => ({}) };
    return { status: 200, json: async () => ({ retCode: '201', retMessage: '调用成功', retValue: { total, recruitJobAdList: rows.slice((n - 1) * 10, n * 10) } }) };
  };
  impl.calls = calls;
  return impl;
}
const opts = f => ({ fetchImpl: f, sleep: async () => {} });

test('single scan keeps usable rows, tolerates unknown fields and records total drift / bad rows', async () => {
  const rows = [row(1), row(2, { requirements: null }), row(3, { jobTitle: '' }), row(4, { id: 'x' }), row(1)];
  const f = fakeFetch(rows, { total: 9 });
  const raw = await c.fetchAll(campus, opts(f));
  a.deepEqual(f.calls, [1, 2]); a.equal(raw.total, 2);
  a.ok(raw.issues.some(s => s.includes('缺ID/标题') && s.includes('2')));
  a.ok(raw.issues.some(s => s.includes('官方total 9')));
  const [x, y] = normalizeJobs(raw.jobs, campus);
  a.equal(x.id, 'ctrip:101'); a.equal(x.title, '岗位1'); a.deepEqual(x.channels, ['campus']); a.equal(x.jdComplete, true);
  a.match(x.url, /#\/campus\/job-detail\/MJ1$/); a.ok(x.description.includes('构建数据分析体系'));
  a.equal(y.description, ''); a.equal(y.jdComplete, false);
});

test('social keeps the whole description as fallback; a later page failure fails the whole run', async () => {
  const rows = Array.from({ length: 12 }, (_, i) => row(i + 1));
  await a.rejects(c.fetchAll(social, opts(fakeFetch(rows, { failOn: 2 }))), /HTTP 429/);
  const raw = await c.fetchAll(social, opts(fakeFetch(rows)));
  const j = normalizeJobs(raw.jobs, social)[0];
  a.deepEqual(j.channels, ['social']); a.equal(j.duty, ''); a.equal(j.requirements, ''); a.ok(j.description.includes('任职要求'));
  a.match(j.url, /#\/experienced\/job-detail\//);
});

test('first-page refusal and effective zero never succeed', async () => {
  await a.rejects(c.fetchAll(campus, opts(fakeFetch([row(1)], { failOn: 1 }))), /HTTP 429/);
  await a.rejects(c.fetchAll(campus, opts(fakeFetch([]))), /no usable/);
});

test('source gate: registered key+adapter+category only', () => {
  for (const p of c.PROFILES) { a.equal(c.verifiedSource(p), true); a.ok(adapterCommand(p, '/tmp/raw.json')); a.ok(c.portalNotice(p)); }
  const wrongCategory = { ...campus, body: { ...campus.body, condition: { ...campus.body.condition, category: 1 } } };
  a.equal(c.verifiedSource(wrongCategory), false); a.equal(adapterCommand(wrongCategory, '/tmp/raw.json'), null);
  a.equal(adapterCommand({ ...campus, key: 'alias' }, '/tmp/raw.json'), null);
  a.throws(() => normalizeJobs([], { ...campus, adapter: undefined, key: 'ctrip' }));
});
