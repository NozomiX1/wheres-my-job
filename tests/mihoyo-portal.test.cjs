'use strict';
const test = require('node:test'), a = require('node:assert/strict');
const m = require('../crawler/lib/custom/mihoyo_portal');
const { adapterCommand } = require('../crawler/crawl');
const { normalizeJobs } = require('../crawler/publish');
const [campus, social] = m.PROFILES;
const list = n => ({ id: String(n), title: '岗位' + n, competencyType: '研发', jobNature: '实习', jobSummary: '摘要' + n, objectName: '', addressDetailList: [{ addressId: '1', addressDetail: '上海' }, { addressId: '2', addressDetail: '北京' }], unknownNew: 1 });
const detailOf = n => ({ ...list(n), code: 'C' + n, description: '职责' + n, jobRequire: '要求' + n, addition: '', deliveryInstructions: '', status: 1, hireType: 1, extra: true });
// rows 每页10条；details: id → 详情数据 / HTTP 状态 / undefined(业务拒绝)
function fakeFetch(rows, { details = {}, total = rows.length } = {}) {
  const calls = [];
  const impl = async (url, options) => {
    const body = JSON.parse(options.body); calls.push(url.endsWith('/list') ? 'list:' + body.pageNo : 'info:' + body.id);
    const ok = data => ({ status: 200, json: async () => ({ code: 0, success: true, error: false, message: 'ok', traceId: 't', data }) });
    if (url.endsWith('/list')) return ok({ list: rows.slice((body.pageNo - 1) * 10, body.pageNo * 10), pageNo: body.pageNo, pageSize: 10, total });
    const d = details[body.id];
    if (typeof d === 'number') return { status: d, json: async () => ({}) };
    return d ? ok(d) : { status: 200, json: async () => ({ code: 1, success: false }) };
  };
  impl.calls = calls;
  return impl;
}
const opts = f => ({ fetchImpl: f, sleep: async () => {} });

test('single scan merges details over list rows, keeps unknown fields and records drift / bad rows', async () => {
  const rows = [list(1), list(2), { ...list(3), title: '' }, list(1)];
  const f = fakeFetch(rows, { details: { 1: detailOf(1) }, total: 9 });
  const raw = await m.fetchAll(campus, opts(f));
  a.equal(raw.total, 2);
  a.equal(f.calls.filter(c => c.startsWith('list')).length, 2); // total 声称 9 但只有 4 条：多请求一页，空页即停
  a.ok(raw.issues.some(s => s.includes('官方total 9'))); a.ok(raw.issues.some(s => s.includes('缺ID/标题'))); a.ok(raw.issues.some(s => s.includes('详情取得 1/2')));
  const [full, listOnly] = normalizeJobs(raw.jobs, campus);
  a.equal(full.id, 'mihoyo:1'); a.deepEqual(full.channels, ['campus']); a.equal(full.employment, 'internship'); a.equal(full.sourceStatus, '1');
  a.equal(full.duty, '职责1'); a.equal(full.requirements, '要求1'); a.equal(full.city, '上海/北京'); a.equal(full.category, '研发');
  a.equal(full.description, '岗位摘要\n摘要1\n\n工作职责\n职责1\n\n任职要求\n要求1'); a.equal(full.url, 'https://jobs.mihoyo.com/#/campus/position/1');
  a.equal(listOnly.duty, ''); a.equal(listOnly.sourceStatus, null); a.equal(listOnly.description, '岗位摘要\n摘要2'); a.equal(listOnly.jdComplete, true);
});

test('detail refusal stops further detail requests; first-page refusal and zero never succeed', async () => {
  const rows = [1, 2, 3].map(list);
  const f = fakeFetch(rows, { details: { 1: 403 } });
  const raw = await m.fetchAll(social, opts(f));
  a.deepEqual(f.calls, ['list:1', 'info:1']); a.equal(raw.total, 3); a.ok(raw.issues.some(s => s.includes('详情请求停止')));
  await a.rejects(m.fetchAll(campus, opts(async () => ({ status: 412, json: async () => ({}) }))), /HTTP 412/);
  await a.rejects(m.fetchAll(campus, opts(fakeFetch([]))), /no usable/);
});

test('source gate: registered key+adapter+hireType only', () => {
  for (const p of m.PROFILES) { a.equal(m.verifiedSource(p), true); a.ok(adapterCommand(p, '/tmp/raw.json')); a.ok(m.portalNotice(p)); }
  const swapped = { ...campus, body: { ...campus.body, hireType: 0 } };
  a.equal(m.verifiedSource(swapped), false); a.equal(adapterCommand(swapped, '/tmp/raw.json'), null);
  a.equal(adapterCommand({ ...campus, key: 'alias' }, '/tmp/raw.json'), null);
});

test('incremental: known ids skip the detail request, new ids still get details', async () => {
  const rows = [list(1), list(2)];
  const f = fakeFetch(rows, { details: { 2: detailOf(2) } });
  const raw = await m.fetchAll(campus, { ...opts(f), known: new Set(['1']) });
  a.equal(raw.total, 2);
  a.deepEqual(f.calls.filter(c => c.startsWith('info')), ['info:2']);
  a.deepEqual(raw.issues, []);
  const [reused, fresh] = normalizeJobs(raw.jobs, campus);
  a.equal(reused.jdComplete, false, 'reused job must not claim a complete JD, so publish keeps the published full text'); a.equal(fresh.jdComplete, true);
});
