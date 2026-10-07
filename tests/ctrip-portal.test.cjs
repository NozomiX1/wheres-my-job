'use strict';
const test = require('node:test'), assert = require('node:assert/strict');
const fs = require('node:fs'), os = require('node:os'), path = require('node:path');
const c = require('../crawler/lib/custom/ctrip_portal');
const checkChain = require('./custom-portal-chain.cjs');
const [campus, social] = c.PROFILES, clone = structuredClone;
// Complete small native Node row (not a canonical fixture); no /tmp research dependency.
const SAMPLE = { id: '30437359', fromId: 'MJ036670', jobId: '30510a92-becf-4a44-be24-9d7e0b41660f', jobTitle: '数据分析师（技术方向）（2027届秋招）(MJ036670)', publishDate: '2026-09-15', city: 'CO0009', cityName: 'Shanghai',
  requirements: '<p>招聘对象：本、硕、博。</p><p>毕业时间：2026 年 9 月至 2027 年 8 月期间毕业（中国大陆以毕业证为准，非中国大陆地区以教育部学位认证为准）且最高学历毕业后无全职工作经验的学生。</p><p><br></p><p>你将会负责：</p><p>1. 构建多维度数据分析体系，通过海量用户行为数据挖掘潜在业务增长点，建立数据监控预警机制； </p><p>2. 搭建AB实验分析框架与因果推断模型，持续迭代优化用户体验策略；</p><p>3. 设计并落地数据驱动的解决方案，应用于用户增长/产品优化/精准营销/用户体验提升等核心业务决策，并完成策略效果量化评估。 </p><p><br></p><p>我们期望你：</p><p>1. 精通SQL语言，并能在一种主流数据库中运用；</p><p>2. 扎实的统计学基础，有一定机器学习知识，熟练使用Python进行数据清洗、特征工程及机器学习建模；</p><p>3. 良好的学习能力和沟通能力，对互联网相关新技术有热情；</p><p>4. 掌握分布式大数据生态系统（Hadoop/Spark等）者优先。</p>',
  duty: null, jobFamilyGroupCode: 'JFG_33', jobFamilyGroupName: 'AI & BI', buCode: '29', buName: 'Trip.com Group', user: '', hrDutyUser: '', hrUserName: '', channelId: '1,1,0', internalId: null, kind: '1', kindName: 'Fresh Graduates', atsApiType: 'Moka', ynShowInterviewDate: false, nextWeekDays: ['2026-10-08', '2026-10-09', '2026-10-10'], dutyUserCode: 'TR039620', category: '2' };
function rows(site = campus, count = 1) { return Array.from({ length: count }, (_, n) => ({ ...clone(SAMPLE), id: String(30437359 + n), fromId: 'MJ' + (36670 + n), jobId: '30510a92-becf-4a44-be24-' + String(n).padStart(12, '0'), category: String(site.body.condition.category) })); }
function page(site, index, jobs, total) { return { request: c.listRequest(site, index), httpStatus: 200, response: { retCode: '201', retMessage: '调用成功', retValue: { total, recruitJobAdList: clone(jobs) }, ResponseStatus: { Timestamp: 1791279699436, Ack: 'Success', Errors: [], Build: null, Version: null, Extension: [] } } }; }
function proof(site = campus, count = 1) {
  const jobs = rows(site, count), pages = [];
  for (let i = 0; i <= Math.ceil(count / 10); i++) pages.push(page(site, i + 1, jobs.slice(i * 10, (i + 1) * 10), count));
  return { jobs, verification: { version: 1, key: site.key, api: site.api, scans: [{ pages }, { pages: clone(pages) }] } };
}
function replay(p, observe = () => {}) {
  const queue = p.verification.scans.flatMap(scan => scan.pages).map(v => clone(v)); let calls = 0;
  return { sleep: async ms => assert.ok(ms >= 200), fetchImpl: async (url, options) => {
    const native = queue[calls++]; assert.ok(native, 'no extra/retry/detail requests');
    assert.equal(url, native.request.url); assert.equal(options.method, 'POST'); assert.deepEqual(options.headers, native.request.headers);
    assert.deepEqual(JSON.parse(options.body), native.request.body); assert.equal(options.redirect, 'manual'); assert.ok(options.signal instanceof AbortSignal);
    assert.equal(Object.keys(options.headers).some(k => /user-agent|cookie|authorization|accept-language/i.test(k)), false);
    observe(calls, options); return { status: native.httpStatus, json: async () => clone(native.response) };
  }, calls: () => calls };
}
test('deep-frozen independent profiles and known/malformed URI cannot downgrade to generic', () => {
  function frozen(v) { if (v && typeof v === 'object') { assert.ok(Object.isFrozen(v)); Object.values(v).forEach(frozen); } } frozen(c.PROFILES);
  for (const site of c.PROFILES) {
    assert.equal(c.verifiedSource(clone(site)), true); assert.equal(site.company, '携程集团'); assert.equal(site.adapter, 'ctrip-portal-v1');
    for (const delta of [{ key: 'other' }, { ats: 'moka' }, { adapter: undefined }, { listJD: false }, { track: 'other' }, { company: '携程' }, { url: site.url + '?kind=1' }]) {
      const bad = { ...clone(site), ...delta }; assert.ok(c.requiresVerification(bad)); assert.equal(c.verifiedSource(bad), false); assert.throws(() => c.validateJobs([], bad));
    }
    const noMode = clone(site); delete noMode.adapter; assert.ok(c.requiresVerification(noMode)); assert.equal(c.verifiedSource(noMode), false);
    const bad = clone(site); bad.body.condition.keyword = 'AI'; assert.equal(c.verifiedSource(bad), false);
    assert.deepEqual(c.requestBody(site, 2).pager, { index: '2', size: '10' }); assert.equal(c.portalNotice(site).includes('不代表'), true);
  }
  for (const uri of ['https://CAREERS.CTRIP.COM:443/#/campus/jobList', 'https://campus.ctrip.com/', '/relative', null, 7, 'http://user:pass@careers.ctrip.com/']) assert.ok(c.requiresVerification({ key: 'other', ats: 'moka', url: uri }));
  assert.equal(c.verifiedSource({ ...clone(campus), url: 'https://CAREERS.CTRIP.COM:443/#/campus/jobList' }), true);
  assert.equal(c.verifiedSource({ ...clone(campus), key: social.key }), false); assert.throws(() => c.validateJobs(rows(campus), social), /scope/);
});
test('native types, all own 25 fields, independent identities and pollution rejected', () => {
  assert.ok(c.validateJobs([clone(SAMPLE)], campus)); assert.ok(c.validateJobs(rows(campus, 2), campus));
  for (const delta of [{ id: 30437359 }, { fromId: '' }, { jobId: SAMPLE.id }, { requirements: null }, { requirements: '' }, { requirements: {} }, { duty: '<p>extra JD</p>' }, { internalId: 'new' }, { cityName: [] }, { category: 2 }, { ynShowInterviewDate: 0 }, { nextWeekDays: [null] }, { title: 'alias' }, { description: '' }, { newJD: '<p>new</p>' }]) assert.throws(() => c.validateJobs([{ ...clone(SAMPLE), ...delta }], campus));
  for (const [key, value] of Object.entries(SAMPLE)) if (typeof value === 'string') assert.throws(() => c.validateJobs([{ ...clone(SAMPLE), [key]: 7 }], campus));
  const absent = clone(SAMPLE); delete absent.requirements; assert.throws(() => c.normalizeRecord(absent, campus));
  const inherited = Object.create(SAMPLE); assert.throws(() => c.validateJobs([inherited], campus));
  for (const id of ['id', 'fromId', 'jobId']) { const jobs = rows(); jobs.push({ ...rows(campus, 2)[1], [id]: jobs[0][id] }); assert.throws(() => c.validateJobs(jobs, campus), /duplicate/); }
  const nullable = { ...clone(SAMPLE), city: null, cityName: null }; assert.ok(c.validateJobs([nullable], campus)); assert.equal(c.normalizeRecord(nullable, campus).city, '');
});
test('HTML full body, literal escaped angles/entities, explicit semantic split only, same text retained', () => {
  const j = c.normalizeRecord(SAMPLE, campus); assert.equal(j.duty, ''); assert.equal(j.requirements, ''); assert.ok(j.description.endsWith('者优先。'));
  assert.equal(j.city, 'Shanghai'); assert.equal(j.url, campus.apiOrigin + '/#/campus/job-detail/MJ036670'); assert.equal(j.id, SAMPLE.id);
  for (const key of ['date', 'dateKind', 'employment', 'talentPlan', 'sourceStatus']) assert.equal(j[key], null);
  const long = { ...clone(SAMPLE), jobFamilyGroupName: 'Eagle Program', requirements: '<p>' + '完整正文'.repeat(400) + '</p><p>List&lt;T&gt; &amp;lt; &unknown; END</p>' };
  const full = c.normalizeRecord(long, campus); assert.ok(full.description.length > 1600); assert.ok(full.description.endsWith('List<T> &lt; &unknown; END')); assert.equal(full.category, ''); assert.equal(full.talentPlan, null);
  const split = c.normalizeRecord({ ...clone(SAMPLE), requirements: '<p>岗位职责</p><p>同文 List&lt;T&gt;</p><p>任职要求</p><p>同文 List&lt;T&gt;</p>' }, campus);
  assert.ok(split.duty.endsWith('同文 List<T>')); assert.ok(split.requirements.endsWith('同文 List<T>')); assert.equal((split.description.match(/同文/g) || []).length, 2);
  assert.ok(c.normalizeRecord(rows(social)[0], social).url.includes('/experienced/job-detail/'));
});
test('real malformed Ctrip font-family attributes cannot become JD/scoring text or content', () => {
  const tag = '<p style="font-family: -apple-system, " segoe="" ui",="" roboto,="" "helvetica="" neue",="" emoji""="">';
  for (const site of c.PROFILES) {
    const native = rows(site)[0];
    const complete = c.normalizeRecord({ ...native, requirements: '<p>岗位职责</p><p>Original Work</p>' + tag + '</p><p>任职资格</p><p>Original Need</p>' }, site);
    assert.equal(complete.description, '岗位职责\nOriginal Work\n任职资格\nOriginal Need');
    assert.equal(complete.duty, '岗位职责\nOriginal Work');
    assert.equal(complete.requirements, '任职资格\nOriginal Need');
    assert.equal(complete.jdComplete, true);
    const blank = c.normalizeRecord({ ...native, requirements: tag + '</p>' }, site);
    assert.equal(blank.description, ''); assert.equal(blank.duty, ''); assert.equal(blank.requirements, ''); assert.equal(blank.jdComplete, false);
  }
});

test('unproved dotted multi-direction section boundaries keep the complete body fallback', () => {
  // Real 30439771 switches to later directions using dotted headings, unsupported by the shared splitter.
  const html = '<p>1、职位描述（自然语言搜索算法）</p><p>First Work</p><p>任职资格</p><p>First Need</p>' +
    '<p>2、AI搜推算法</p><p>.职位描述</p><p>Second Work</p><p>.任职资格</p><p>Second Need</p>';
  for (const site of c.PROFILES) {
    const job = c.normalizeRecord({ ...rows(site)[0], requirements: html }, site);
    assert.equal(job.duty, ''); assert.equal(job.requirements, ''); assert.equal(job.jdComplete, true);
    assert.equal(job.description, '1、职位描述（自然语言搜索算法）\nFirst Work\n任职资格\nFirst Need\n2、AI搜推算法\n.职位描述\nSecond Work\n.任职资格\nSecond Need');
  }
});

test('typed HTTP/business/status/envelope and exact requests remain bound through evidence', () => {
  for (const site of c.PROFILES) { const p = proof(site, 11); assert.ok(c.validateEvidence(p.verification, p.jobs, site)); assert.throws(() => c.validateEvidence(p.verification, p.jobs, site === campus ? social : campus)); }
  const changes = [p => p.httpStatus = 302, p => p.httpStatus = '200', p => p.request.body.pager.index = 1, p => p.request.body.head.language = 'en_US', p => p.request.headers.Accept = '*/*', p => p.request.body.condition.city = ['CO0009'], p => p.response.extra = null, p => p.response.retCode = 201, p => p.response.retMessage = '', p => p.response.ResponseStatus.Ack = 'Failure', p => p.response.ResponseStatus.Errors = [{}], p => p.response.ResponseStatus.Timestamp = '1', p => p.response.ResponseStatus.Extension = [{}], p => p.response.retValue.total = '1', p => p.response.retValue.total = 1.5, p => p.response.retValue.total = 0, p => p.response.retValue.recruitJobAdList = null, p => p.response.retValue.newJD = 'new'];
  for (const change of changes) { const p = proof(); change(p.verification.scans[0].pages[0]); assert.throws(() => c.validateEvidence(p.verification, p.jobs, campus)); }
  assert.throws(() => c.validateEvidence(undefined, [], campus)); assert.throws(() => c.validateJobs([], campus), /zero/);
});
test('early empty/short, missing/nonempty/extra endpoint, drift of every raw fact and pseudo zero fail', () => {
  const changes = [v => v.scans[0].pages[0].response.retValue.recruitJobAdList.pop(), v => v.scans[0].pages[1].response.retValue.recruitJobAdList = [], v => v.scans[0].pages.pop(), v => v.scans[0].pages.at(-1).response.retValue.total = 0, v => v.scans[0].pages.at(-1).response.retValue.recruitJobAdList.push(rows()[0]), v => v.scans[0].pages.push(clone(v.scans[0].pages.at(-1))), v => v.scans.pop()];
  for (const change of changes) { const p = proof(campus, 11); change(p.verification); assert.throws(() => c.validateEvidence(p.verification, p.jobs, campus)); }
  for (const [field, value] of [['requirements', '<p>changed</p>'], ['cityName', '上海'], ['nextWeekDays', ['2026-10-11']], ['kindName', '应届校招生'], ['buName', 'changed']]) { const p = proof(); p.verification.scans[1].pages[0].response.retValue.recruitJobAdList[0][field] = value; assert.throws(() => c.validateEvidence(p.verification, p.jobs, campus), /drift/); }
  const p = proof(); p.jobs[0].publishDate = '2000-01-01'; assert.throws(() => c.validateEvidence(p.verification, p.jobs, campus), /bound/);
  const z = proof(campus, 0); assert.throws(() => c.validateEvidence(z.verification, [], campus), /zero/);
});
test('offline normal serial fetch keeps entire native jobs/evidence, ceiling and true refusals stop', async () => {
  const p = proof(campus, 11), opts = replay(p); const result = await c.fetchAll(campus, opts);
  assert.equal(opts.calls(), 6); assert.equal(result.complete, true); assert.deepEqual(result.jobs, p.jobs); assert.deepEqual(result.verification, p.verification); assert.equal(Object.keys(result.jobs[0]).length, 25);
  const capped = replay(p); await assert.rejects(c.fetchAll(campus, { ...capped, maxPages: 3 }), /ceiling/); assert.equal(capped.calls(), 1);
  for (const failure of ['http', 'business', 'JSON']) {
    const q = proof(); if (failure === 'http') q.verification.scans[0].pages[1].httpStatus = 403; else q.verification.scans[0].pages[1].response.retCode = '403';
    const opts = replay(q); if (failure === 'JSON') opts.fetchImpl = async () => ({ status: 200, json: async () => { throw new SyntaxError('bad JSON'); } });
    await assert.rejects(c.fetchAll(campus, opts)); if (failure !== 'JSON') assert.equal(opts.calls(), 2);
  }
});
test('both Ctrip sources use the sole crawl/snapshot/publish chain and reject native-boundary drift', async t => {
  for (const site of c.PROFILES) {
    const p = proof(site, 2), env = { complete: true, total: p.jobs.length, ...p };
    await checkChain(t, site, env, bad => { bad.jobs[0].requirements += ' unbound native JD'; }, 900000);
  }
});

test('failed run writes no partial file and preserves prior raw; success writes only complete bound result', async t => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ande-ctrip-test-')); t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const file = path.join(dir, 'raw.json'); fs.writeFileSync(file, 'prior raw bytes'); const before = fs.statSync(file).mtimeMs;
  for (const target of [file, path.join(dir, 'first.json')]) {
    const p = proof(); p.verification.scans[1].pages[0].response.retCode = '403'; const opts = replay(p);
    await assert.rejects(c.run([JSON.stringify(campus), target], opts)); assert.equal(opts.calls(), 3);
  }
  assert.equal(fs.readFileSync(file, 'utf8'), 'prior raw bytes'); assert.equal(fs.statSync(file).mtimeMs, before); assert.deepEqual(fs.readdirSync(dir), ['raw.json']);
  const p = proof(), opts = replay(p); await c.run([JSON.stringify(campus), file], opts); const result = JSON.parse(fs.readFileSync(file, 'utf8'));
  assert.equal(result.complete, true); assert.ok(c.validateEvidence(result.verification, result.jobs, campus)); assert.deepEqual(fs.readdirSync(dir), ['raw.json']);
});
