'use strict';
const test = require('node:test'), a = require('node:assert/strict'), fs = require('node:fs'), os = require('node:os'), path = require('node:path');
const x = require('../crawler/lib/custom/xiaomi_portal');
const { runCrawl, adapterCommand } = require('../crawler/crawl');
const { publish, readPublished, normalizeJobs } = require('../crawler/publish');
const TOPIC = '7595885661741271302';
const job = (id, type, route = 'campus', extra = {}) => ({ id, title: '岗位' + id, cityZhNames: ['北京', '上海'], description: '职责' + id, requirement: '要求' + id, type,
  url: 'https://xiaomi.jobs.f.mioffice.cn/' + route + '/position/' + (100 + id) + '/detail', jobId: String(200 + id), jobPostId: String(100 + id), ...extra });
const detail = (j, d = {}) => ({ code: 0, message: 'ok', error: null, data: { recommend_job_post_List: [], job_post_detail: { id: j.jobPostId, description: j.description, requirement: j.requirement, job_post_info: { job_post_object_value_map: {} }, ...d } } });
// rows: 每页10条的列表；details: jobPostId → 详情响应或 HTTP 状态
function fakeFetch(rows, details = {}) {
  const calls = [];
  const impl = async url => {
    calls.push(url);
    const u = new URL(url);
    if (u.hostname === 'hr.xiaomi.com') {
      const n = Number(u.searchParams.get('pageNum'));
      return { status: 200, json: async () => ({ code: 0, message: '成功', data: { list: rows.slice((n - 1) * 10, n * 10), pageNum: n, pageSize: 10, total: rows.length } }) };
    }
    const d = details[u.pathname.split('/').pop()];
    if (typeof d === 'number') return { status: d, json: async () => ({}) };
    return { status: 200, json: async () => d };
  };
  impl.calls = calls;
  return impl;
}

test('campus run: single scan with details, unknown fields tolerated, topic JD kept', async () => {
  const rows = [job(1, 2), job(2, 2, 'toptalent', { someNewField: { a: 1 } })];
  const details = { 101: detail(rows[0]), 102: detail(rows[1], { job_post_info: { job_post_object_value_map: { [TOPIC]: '课题正文', other: '未识别' } }, extra: 1 }) };
  const f = fakeFetch(rows, details);
  const raw = await x.run(x.PROFILE, { fetchImpl: f, sleep: async () => {} });
  a.equal(f.calls.length, 3); a.equal(raw.complete, false); a.equal(raw.total, 2); a.equal(raw.verification.policy, 'available');
  const [p, q] = normalizeJobs(raw.jobs, x.PROFILE);
  a.equal(p.id, 'xiaomi:1'); a.equal(p.city, '北京/上海'); a.deepEqual(p.channels, ['campus']); a.equal(p.jdComplete, true); a.equal(p.description, '');
  a.match(q.description, /职位信息\n课题名称及内容：\n课题正文$/); a.equal(q.duty, '职责2');
  a.deepEqual(x.validateEvidence(raw.verification).issues, []);
});

test('bad rows, total drift and missing details are recorded, not fatal', async () => {
  const rows = [job(1, 1, 'index'), { ...job(2, 1, 'index'), title: '' }, job(3, 1, 'index', { url: 'http://insecure' }), job(4, 1, 'index')];
  const f = fakeFetch(rows, { 101: detail(rows[0]), 104: { code: 1 } });
  const raw = await x.run(x.SOCIAL_PROFILE, { fetchImpl: f, sleep: async () => {} });
  a.equal(raw.total, 2);
  a.ok(raw.issues.some(s => s.includes('缺ID/标题/链接')));
  a.ok(raw.issues.some(s => s.includes('详情取得 1/2')));
  const [withDetail, listOnly] = normalizeJobs(raw.jobs, x.SOCIAL_PROFILE);
  a.deepEqual(withDetail.channels, ['social']); a.equal(withDetail.jdComplete, true); a.equal(listOnly.jdComplete, false); a.equal(listOnly.duty, '职责4');
});

test('detail refusal stops detail requests; list failure with no jobs throws and zero never succeeds', async () => {
  const rows = [1, 2, 3].map(id => job(id, 3, 'internship'));
  const f = fakeFetch(rows, { 101: 403 });
  const raw = await x.run(x.INTERN_PROFILE, { fetchImpl: f, sleep: async () => {} });
  a.equal(f.calls.length, 2); a.equal(raw.total, 3); a.ok(raw.issues.some(s => s.includes('详情请求停止')));
  await a.rejects(x.run(x.PROFILE, { fetchImpl: async () => ({ status: 412, json: async () => ({}) }), sleep: async () => {} }), /HTTP 412/);
  await a.rejects(x.run(x.PROFILE, { fetchImpl: fakeFetch([]), sleep: async () => {} }), /no usable/);
});

test('intern entry marks internship from the official detail and runs through crawl+publish as available', async t => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ande-xiaomi-')); t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const rows = [job(1, 3, 'internship')];
  const raw = await x.run(x.INTERN_PROFILE, { fetchImpl: fakeFetch(rows, { 101: detail(rows[0], { recruit_type: { name: '实习' } }) }), sleep: async () => {} });
  const file = path.join(dir, 'jobs.js');
  fs.writeFileSync(file, 'globalThis.ANDE_DATA = ' + JSON.stringify({ version: 1, legacy: false, notices: [], companies: [], sources: [], jobs: [] }) + ';\n');
  const crawled = runCrawl(x.INTERN_PROFILE, { outDir: dir, now: () => '2026-01-01T00:00:00.000Z', runner: (_, args) => { fs.writeFileSync(args.at(-1), JSON.stringify(raw)); return { status: 0 }; } });
  a.equal(crawled.code, 0); a.equal(crawled.status, 'available');
  const result = publish({ outDir: dir, dataFile: file, sites: [x.INTERN_PROFILE], keys: ['xiaomi_intern'] });
  a.equal(result.code, 0);
  const [j] = readPublished(file).jobs;
  a.equal(j.id, 'xiaomi_intern:1'); a.equal(j.employment, 'internship'); a.deepEqual(j.channels, ['campus']);
});

test('source gate: only registered keys with their own type run; others are not crawled', () => {
  for (const p of [x.PROFILE, x.SOCIAL_PROFILE, x.INTERN_PROFILE]) { a.equal(x.verifiedSource(p), true); a.ok(adapterCommand(p, '/tmp/raw.json')); }
  a.equal(x.verifiedSource({ ...x.PROFILE, body: { ...x.PROFILE.body, type: 9 } }), false);
  a.equal(x.verifiedSource({ ...x.PROFILE, key: 'alias' }), false);
  a.equal(adapterCommand({ ...x.PROFILE, body: { ...x.PROFILE.body, type: 9 } }, '/tmp/raw.json'), null);
});
