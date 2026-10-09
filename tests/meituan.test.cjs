'use strict';
// 离线：注入 fetch/sleep，不访问官网。社招(meituan_social)与校园(meituan)共用列表＋详情接口。
const test = require('node:test'), a = require('node:assert/strict'), fs = require('node:fs'), os = require('node:os'), path = require('node:path');
const social = require('../crawler/lib/custom/meituan_portal'), campus = require('../crawler/lib/custom/meituan_campus_portal');
const { adapterCommand, runCrawl } = require('../crawler/crawl');
const { loadSites, normalizeJobs, publish, readPublished, validateSnapshot } = require('../crawler/publish');
const sites = new Map(loadSites().map(s => [s.key, s]));
const S = sites.get('meituan_social'), C = sites.get('meituan');
const row = (id, extra = {}) => ({ jobUnionId: String(id), name: '岗位' + id, jobType: '3', jobSpecialCode: '5', jobStatus: '000', cityList: [{ name: '北京' }, { name: '上海' }],
  jobDuty: '职责' + id + ' <T> &amp;', jobRequirement: '要求' + id, desc: null, departmentIntro: null, precedence: null, highLight: null, otherInfo: null, someNewField: 1, ...extra });
const ok = data => ({ status: 200, json: async () => ({ status: 1, message: '成功', data }) });
// lists: jobType代码 → 行；details: id → 详情行 / HTTP 状态
function fake(lists, details = {}) {
  const calls = [];
  const fetchImpl = async (url, init) => {
    const body = JSON.parse(init.body); calls.push(url.endsWith('/getJobList') ? 'list:' + body.jobType.map(t => t.code) + ':' + body.page.pageNo : 'detail:' + body.jobUnionId);
    if (url.endsWith('/getJobList')) {
      const all = lists[body.jobType[0].code] || [], n = body.page.pageNo, slice = all.slice((n - 1) * 10, n * 10);
      return ok({ list: slice.length ? slice : null, page: { pageNo: n, pageSize: 10, totalCount: all.length, totalPage: Math.ceil(all.length / 10) }, traceId: null });
    }
    const d = details[body.jobUnionId];
    if (typeof d === 'number') return { status: d, json: async () => ({}) };
    return d ? ok(d) : { status: 200, json: async () => ({ status: 0, message: '失败' }) };
  };
  return { fetchImpl, calls, sleep: async () => {} };
}

test('profiles: registered key + adapter only; the campus scope has both partitions', () => {
  for (const [mod, site] of [[social, S], [campus, C]]) { a.equal(mod.verifiedSource(site), true); a.ok(adapterCommand(site, '/tmp/raw.json')); a.ok(mod.portalNotice(site)); }
  a.equal(social.verifiedSource(C), false); a.equal(campus.verifiedSource(S), false);
  for (const bad of [{ ...S, key: 'alias' }, { ...S, adapter: undefined }, { ...C, key: 'alias' }]) a.equal(adapterCommand(bad, '/tmp/raw.json'), null);
  a.deepEqual(campus.PROFILE.body.jobType.map(t => t.code), ['1', '2']);
});

test('social single scan: list pages, details merged, unknown fields tolerated, drift and bad rows only recorded', async () => {
  const rows = [...Array.from({ length: 11 }, (_, i) => row(i + 1)), row(3), row(99, { name: ' ' })];
  const f = fake({ 3: rows }, { 1: row(1, { desc: '完整岗位描述', departmentIntro: '部门介绍' }) });
  const result = await social.fetchAvailable(S, f);
  a.equal(result.total, 11);
  a.ok(result.issues.some(s => s.includes('缺ID/标题')) && result.issues.some(s => s.includes('官方total 13')) && result.issues.some(s => s.includes('详情取得 1/11')));
  a.equal(f.calls.filter(c => c.startsWith('list')).length, 3); // 重复行不计数，所以多取一页空页即停；没有第二遍扫描
  const evidence = social.validateEvidence(result.verification);
  const [withDetail, listOnly] = normalizeJobs(result.jobs, S, { available: true, detailIds: evidence.detailIds });
  a.equal(withDetail.id, 'meituan_social:1'); a.deepEqual(withDetail.channels, ['social']); a.equal(withDetail.city, '北京/上海'); a.equal(withDetail.duty, '职责1 <T> &amp;');
  a.match(withDetail.description, /部门介绍\n部门介绍\n\n岗位描述\n完整岗位描述\n\n岗位职责\n职责1/); a.equal(withDetail.jdComplete, true);
  a.equal(listOnly.jdComplete, false); a.equal(listOnly.requirements, '要求2');
});

test('social: a detail refusal stops detail requests; first-page refusal and zero never succeed', async () => {
  const f = fake({ 3: [row(1), row(2), row(3)] }, { 1: 403 });
  const result = await social.fetchAvailable(S, f);
  a.equal(f.calls.filter(c => c.startsWith('detail')).length, 1); a.ok(result.issues.some(s => s.includes('详情请求停止')));
  await a.rejects(social.fetchAvailable(S, { ...fake({}), fetchImpl: async () => ({ status: 412, json: async () => ({}) }) }), /HTTP 412/);
  await a.rejects(social.fetchAvailable(S, fake({ 3: [] })), /no usable/);
  a.throws(() => normalizeJobs([], S), /zero cannot clear/);
});

test('campus: both partitions merged, internship from type 2, short special types add the work-city footer, missing details are honest', async () => {
  const lists = { 1: [row(1, { jobType: '1', jobSpecialCode: '1' })], 2: [row(2, { jobType: '2', jobSpecialCode: '5', desc: null }), row(3, { jobType: '2' })] };
  const f = fake(lists, { 1: row(1, { jobType: '1', jobSpecialCode: '1' }), 2: row(2, { jobType: '2', desc: '岗位描述2' }) });
  const result = await campus.fetchAll(C, f);
  a.deepEqual(result.jobs.map(j => j.jobUnionId), ['1', '2', '3']); a.ok(f.calls.includes('list:1:1') && f.calls.includes('list:2:1'));
  const [t1, t2, t3] = normalizeJobs(result.jobs, C);
  a.deepEqual(t1.channels, ['campus']); a.equal(t1.employment, null); a.equal(t1.description, '岗位职责\n职责1 <T> &amp;\n\n任职要求\n要求1\n\n工作城市\n北京、上海'); a.equal(t1.jdComplete, true);
  a.equal(t2.employment, 'internship'); a.deepEqual(t2.channels, []); a.match(t2.description, /岗位描述\n岗位描述2/);
  a.equal(t3.jdComplete, false); // 没取到详情
  a.equal(normalizeJobs([{ ...row(4, { jobType: '1' }) }], C)[0].jdComplete, true); // 旧快照的行都是详情行，不带标记
  await a.rejects(campus.fetchAll(C, fake({ 1: [], 2: [] })), /no usable/);
});

test('old evidence shape still yields the detail ids used for jdComplete', () => {
  const old = { policy: 'available', details: [{ request: { body: { jobUnionId: '7' } }, response: { status: 1 } }, { request: { body: { jobUnionId: '8' } }, response: { status: 0 } }], issues: ['x'] };
  a.deepEqual([...social.validateEvidence(old).detailIds], ['7']); a.deepEqual(social.validateEvidence(old).issues, ['x']);
  a.deepEqual([...social.validateEvidence({ detailIds: ['9'] }).detailIds], ['9']);
});

// 整条发布链：增量保旧、不被空 JD 抹掉
const raw = jobs => ({ complete: false, total: jobs.length, jobs, issues: [], verification: { version: 3, policy: 'available', key: 'meituan_social', pages: 1, issues: [], detailIds: jobs.map(j => j.jobUnionId) } });
function chain(t) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ande-meituan-')); t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const dataFile = path.join(dir, 'data', 'catalog.js'); let sec = 0;
  const apply = (envelope, acceptShrink) => {
    const times = ['2026-01-01T00:00:' + String(sec++).padStart(2, '0') + '.000Z', '2026-01-01T00:00:' + String(sec++).padStart(2, '0') + '.000Z'];
    const c = runCrawl(S, { outDir: dir, now: () => times.shift(), runner: (_, args) => { fs.writeFileSync(args.at(-1), JSON.stringify(envelope)); return { status: 0 }; } });
    a.equal(c.code, 0); a.equal(c.status, 'ready');
    return publish({ outDir: dir, dataFile, sites: [S], keys: [S.key], ...(acceptShrink ? { acceptShrink } : {}) });
  };
  return { dir, dataFile, apply };
}

test('a new result replaces the source (missing jobs are gone), empty fields keep earlier JD, and zero cannot clear', t => {
  const f = chain(t), first = row(1, { jobDuty: '原始职责', jobRequirement: '原始要求' });
  a.equal(f.apply(raw([first])).code, 0);
  const before = readPublished(f.dataFile);
  const replaced = f.apply(raw([row(2)]));
  a.equal(replaced.code, 0); a.deepEqual(replaced.data.jobs.map(j => j.id), ['meituan_social:2']);
  const kept = f.apply(raw([{ ...row(2), jobDuty: '', jobRequirement: null }]));
  a.deepEqual(kept.data.jobs, replaced.data.jobs); // 空字段不抹掉已有正文
  const bytes = fs.readFileSync(f.dataFile);
  const failed = runCrawl(S, { outDir: f.dir, now: () => '2026-01-02T00:00:00.000Z', runner: (_, args) => { fs.writeFileSync(args.at(-1), JSON.stringify(raw([]))); return { status: 0 }; } });
  a.equal(failed.code, 1); a.equal(publish({ outDir: f.dir, dataFile: f.dataFile, sites: [S], keys: [S.key] }).written, false); a.deepEqual(fs.readFileSync(f.dataFile), bytes);
  a.ok(before.jobs.length === 1);
});

test('the shrink guard refuses a result with fewer than half of the published jobs unless explicitly accepted', t => {
  const f = chain(t);
  a.equal(f.apply(raw(Array.from({ length: 6 }, (_, i) => row(i + 1)))).data.jobs.length, 6);
  const refused = f.apply(raw([row(1), row(2)]));
  a.equal(refused.code, 1); a.match(refused.errors.join(';'), /fewer than half/); a.equal(readPublished(f.dataFile).jobs.length, 6);
  const accepted = f.apply(raw([row(1), row(2)]), [S.key]);
  a.equal(accepted.code, 0); a.equal(readPublished(f.dataFile).jobs.length, 2);
  a.equal(f.apply(raw([row(1), row(2), row(3)])).data.jobs.length, 3);
});
