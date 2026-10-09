// Offline only: injected child runners and fetch fixtures, never a live adapter/website.
// Run: node --test tests/pipeline.test.cjs
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');
const { runCrawl, validateEnvelope } = require('../crawler/crawl');
const { publish, normalizeJobs, coverageFor, readPublished, loadSites } = require('../crawler/publish');
const { runUpdate } = require('../crawler/update');
const moka = require('../crawler/lib/moka');
const beisen = require('../crawler/lib/beisen');
const A = { key: 'a', company: 'Alpha', ats: 'moka', orgId: 'official', siteId: 123, site: 'campus', batch: '指定批次' };
const B = { key: 'b', company: '乙公司', ats: 'beisen', api: 'https://official.example/api/jobs', category: ['1'], linkTemplate: 'https://official.example/jobs/{id}', batch: '社招' };
const T1 = '2026-01-01T00:00:00.000Z';
const T2 = '2026-01-02T00:00:00.000Z';
const T3 = '2026-01-03T00:00:00.000Z';
const rawJob = (id = '1', title = '财务助理') => ({ id, title, description: '职责全文', requirement: '十年以上工作经验' });
const envelope = jobs => ({ complete: true, total: jobs.length, jobs });

function fixture(t, baseline = true) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ande-pipeline-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const outDir = path.join(dir, 'out');
  const dataFile = path.join(dir, 'data', 'jobs.js');
  const index = path.join(dir, 'index.html');
  fs.writeFileSync(index, 'DO NOT CHANGE');
  if (baseline) {
    fs.mkdirSync(path.dirname(dataFile), { recursive: true });
    const sources = [A, B].map(site => ({ key: site.key, company: site.company, status: 'legacy', lastSuccess: null, lastAttempt: null, message: '旧页面迁移；不保证来源完整', coverage: null }));
    const companies = [{ name: A.company, initial: 'A', aliases: ['阿尔法'] }, { name: B.company, initial: 'Y', aliases: ['乙'] }];
    const jobs = [A, B].flatMap(site => normalizeJobs([rawJob('old')], site)).map(({ category, ...job }) => ({ ...job, duty: '', description: '', requirements: '', channels: [], date: null, dateKind: null, jdComplete: false })); // Older schema-1 data has no category.
    fs.writeFileSync(dataFile, 'globalThis.ANDE_DATA = ' + JSON.stringify({ version: 1, legacy: true, notices: ['旧筛选基线，不是全量 JD 快照'], companies, sources, jobs }) + ';\n');
  }
  return { dir, outDir, dataFile, index, sites: [A, B] };
}

function candidateRunner(jobs, child = { status: 0 }) {
  return (command, args) => {
    assert.equal(command, process.execPath);
    assert.ok(['moka.js', 'beisen.js'].includes(path.basename(args[0])));
    fs.writeFileSync(args.at(-1) === '--details' ? args.at(-2) : args.at(-1), JSON.stringify(envelope(jobs)));
    return child;
  };
}

function crawl(site, f, jobs, time = T2) {
  return runCrawl(site, { outDir: f.outDir, runner: candidateRunner(jobs), now: () => time });
}

function fileBytes(file) { return fs.existsSync(file) ? fs.readFileSync(file) : null; }
function rawFile(f, site = A) { return path.join(f.outDir, site.key + '_raw.json'); }
function snapshotFile(f, site = A) { return path.join(f.outDir, site.key + '_snapshot.json'); }
function statusFile(f, site = A) { return path.join(f.outDir, site.key + '_status.json'); }

function fetchPages(pages, mode, requests = []) {
  let index = 0;
  return async (url, options) => {
    requests.push({ url, body: JSON.parse(options.body) });
    assert.ok(index < pages.length, 'Fixture pagination unexpectedly continued');
    const page = pages[index++];
    return { status: page.status ?? 200, text: async () => typeof page.body === 'string' ? page.body : JSON.stringify(page.body), json: async () => {
      if (typeof page.body === 'string') return JSON.parse(page.body);
      return page.body;
    } };
  };
}

function adapterFetch(mode, pages, requests = [], extra = {}) {
  const options = { fetchImpl: fetchPages(pages, mode, requests), ...extra };
  return mode === 'moka' ? moka.fetchAll({ ...A, aesIv: 'de7c21ed8d6f50fe' }, options) : beisen.fetchAll(B.api, B.category, options);
}

function pageBody(mode, jobs, total) { return mode === 'moka' ? { data: { jobs, total } } : { Data: jobs, Count: total }; }

test('first success reads the NEW raw, stores raw snapshot, and publishes only its source', t => {
  const f = fixture(t);
  assert.equal(fs.existsSync(f.outDir), false);
  let tick = 0;
  const fresh = { ...rawJob('new'), category: ' <b>官网技术</b> ', zhineng: { name: ' 产品研发 ' } };
  const result = runCrawl(A, { outDir: f.outDir, runner: candidateRunner([fresh]), now: () => tick++ === 0 ? T1 : T2 });
  assert.equal(result.code, 0);
  assert.equal(result.lastAttempt, T1);
  assert.equal(result.lastSuccess, T2);
  const snapshot = JSON.parse(fs.readFileSync(snapshotFile(f)));
  assert.deepEqual(snapshot, { version: 1, key: 'a', complete: true, completedAt: T2, coverage: coverageFor(A), jobs: [fresh] });
  const oldCompanies = readPublished(f.dataFile).companies;
  const publication = publish(f);
  assert.equal(publication.code, 1, 'B missing means partial success reports a nonzero overall result');
  assert.equal(publication.written, true);
  const data = readPublished(f.dataFile);
  assert.deepEqual(data.jobs.map(j => j.id).sort(), ['a:new', 'b:old']);
  assert.equal(data.jobs.find(j => j.id === 'a:new').category, '<b>官网技术</b>/产品研发');
  assert.equal(data.jobs.find(j => j.id === 'b:old').category, undefined, 'Retained old jobs keep their original optional-field presence');
  assert.ok(fs.readdirSync(path.join(path.dirname(f.dataFile), 'parts')).some(name => fs.readFileSync(path.join(path.dirname(f.dataFile), 'parts', name), 'utf8').includes('\\u003cb>官网技术\\u003c/b>')), 'JSON escaping preserves labels as text, not HTML markup');
  assert.deepEqual(data.companies, oldCompanies);
  assert.equal(data.sources.find(s => s.key === 'a').lastSuccess, T2);
  assert.equal(data.sources.find(s => s.key === 'b').coverage, null);
  assert.equal(fs.readFileSync(f.index, 'utf8'), 'DO NOT CHANGE');
});

test('failure, no write, malformed/unknown/incomplete results and illegal jobs rollback old raw AND snapshot', t => {
  const f = fixture(t);
  assert.equal(crawl(A, f, [rawJob('good')]).code, 0);
  const oldRaw = fileBytes(rawFile(f)), oldSnapshot = fileBytes(snapshotFile(f));
  const scenarios = [
    { label: 'child fail after partial overwrite', value: envelope([rawJob('bad')]), child: { status: 1 } },
    { label: 'timeout after partial overwrite', value: envelope([rawJob('bad')]), child: { status: null, signal: 'SIGTERM' } },
    { label: 'missing new raw', noWrite: true },
    { label: 'malformed JSON', literal: '{' },
    { label: 'array is NOT verified', value: [rawJob('bad')], status: 'unverified' },
    { label: 'legacy all is NOT verified', value: { all: [rawJob('bad')], total: 1 }, status: 'unverified' },
    { label: 'unknown list shape', value: { list: [rawJob('bad')] }, status: 'unverified' },
    { label: 'explicit incomplete', value: { ...envelope([rawJob('bad')]), complete: false }, status: 'unverified' },
    { label: 'count mismatch', value: { ...envelope([rawJob('bad')]), total: 2 }, status: 'unverified' },
    ...[
      { title: 'no id' }, { id: 'bad' }, { id: 'bad', title: ' ' },
      { id: 'bad', title: { html: 'invalid' } }, { ...rawJob('bad'), city: 123 },
      { ...rawJob('bad'), requirement: { text: 'must not vanish' } },
      { ...rawJob('bad'), employment: 'other' }, { ...rawJob('bad'), channels: ['internship'] },
      { ...rawJob('bad'), talentPlan: 'yes' }, { ...rawJob('bad'), date: '2026-02-30' },
      { ...rawJob('bad'), dateKind: 'crawled' }, { ...rawJob('bad'), url: { href: 'bad' } },
      { ...rawJob('bad'), category: true }, { ...rawJob('bad'), category: { html: 'must not vanish' } },
      { ...rawJob('bad'), category: ['研发', ['嵌套']] }, { ...rawJob('bad'), category: { name: 123 } },
      { ...rawJob('bad'), zhineng: { html: 'must not vanish' } }
    ].map(job => ({ label: 'illegal record ' + JSON.stringify(job), value: envelope([rawJob('valid'), job]) })),
    { label: 'duplicate official id', value: envelope([rawJob('dup'), rawJob('dup')]) }
  ];
  for (const scenario of scenarios) {
    const result = runCrawl(A, {
      outDir: f.outDir, now: () => T3,
      runner: (_command, args) => {
        assert.equal(fs.existsSync(rawFile(f)), false, 'Stale raw cannot satisfy an exit-0 child');
        if (!scenario.noWrite) fs.writeFileSync(args.at(-1), scenario.literal ?? JSON.stringify(scenario.value));
        return scenario.child || { status: 0 };
      }
    });
    assert.equal(result.code, 1, scenario.label);
    assert.equal(result.status, scenario.status || 'failed', scenario.label);
    assert.equal(result.lastSuccess, T2, scenario.label);
    assert.deepEqual(fileBytes(rawFile(f)), oldRaw, scenario.label);
    assert.deepEqual(fileBytes(snapshotFile(f)), oldSnapshot, scenario.label);
  }
});

test('first failure deletes newly-created raw and never invents a snapshot or success timestamp', t => {
  const f = fixture(t);
  const result = runCrawl(A, { outDir: f.outDir, now: () => T2, runner: candidateRunner([rawJob()], { status: 1 }) });
  assert.equal(result.code, 1);
  assert.equal(result.lastSuccess, null);
  assert.equal(fs.existsSync(rawFile(f)), false);
  assert.equal(fs.existsSync(snapshotFile(f)), false);
});

test('only explicit verified empty replaces ONE source, leaving the other baseline intact', t => {
  const f = fixture(t);
  assert.equal(crawl(A, f, [rawJob('old')]).code, 0);
  const oldSnapshot = fileBytes(snapshotFile(f));
  const unverified = runCrawl(A, { outDir: f.outDir, now: () => T3, runner: (_command, args) => { fs.writeFileSync(args.at(-1), '[]'); return { status: 0 }; } });
  assert.equal(unverified.status, 'unverified');
  assert.deepEqual(fileBytes(snapshotFile(f)), oldSnapshot);
  const before = fileBytes(f.dataFile);
  assert.equal(publish(f).written, false);
  assert.deepEqual(fileBytes(f.dataFile), before);
  assert.equal(crawl(A, f, [], T3).code, 0);
  const result = publish({ ...f, keys: ['a'] });
  assert.equal(result.code, 0);
  assert.deepEqual(result.data.jobs.map(j => j.id), ['b:old']);
  assert.equal(JSON.parse(fs.readFileSync(snapshotFile(f))).jobs.length, 0);
});

test('missing out/no verified updates never touches any published file, including mtime', t => {
  const f = fixture(t);
  const before = fileBytes(f.dataFile), mtime = fs.statSync(f.dataFile).mtimeMs;
  assert.ok(!before.toString().includes('"category"'), 'Fixture represents an older schema-1 baseline');
  assert.deepEqual(readPublished(f.dataFile).jobs.map(job => job.category), [undefined, undefined]);
  assert.deepEqual(fileBytes(f.dataFile), before, 'Reading missing optional categories never writes the baseline');
  const result = publish(f);
  assert.equal(result.code, 1);
  assert.equal(result.written, false);
  assert.deepEqual(fileBytes(f.dataFile), before);
  assert.equal(fs.statSync(f.dataFile).mtimeMs, mtime);
  assert.equal(fs.existsSync(f.outDir), false);
  const empty = fixture(t, false);
  assert.equal(publish(empty).written, false);
  assert.equal(fs.existsSync(empty.dataFile), false);
});

test('failed/unverified latest attempt cannot publish a prior ready snapshot; other verified source may publish', t => {
  const f = fixture(t);
  const baseline = readPublished(f.dataFile);
  baseline.jobs[0].category = '官网行政';
  baseline.jobs[1].category = '官网财务';
  fs.writeFileSync(f.dataFile, 'globalThis.ANDE_DATA = ' + JSON.stringify(baseline) + ';\n');
  crawl(A, f, [{ ...rawJob('new'), zhineng: { name: '未发布分类' } }]);
  const snapshot = fileBytes(snapshotFile(f));
  runCrawl(A, { outDir: f.outDir, now: () => T3, runner: candidateRunner([rawJob('bad')], { status: 1 }) });
  crawl(B, f, [{ ...rawJob('verified'), category: '官网研发' }], T3);
  const result = publish(f);
  assert.equal(result.code, 1);
  assert.equal(result.written, true);
  assert.deepEqual(result.updated, ['b']);
  assert.deepEqual(result.data.jobs.map(j => j.id).sort(), ['a:old', 'b:verified']);
  assert.equal(result.data.jobs.find(j => j.id === 'a:old').category, '官网行政', 'Partial replacement preserves the failed source’s published name');
  assert.equal(result.data.jobs.find(j => j.id === 'b:verified').category, '官网研发');
  assert.deepEqual(fileBytes(snapshotFile(f)), snapshot);
  const failed = result.data.sources.find(s => s.key === 'a');
  assert.equal(failed.status, 'failed');
  assert.equal(failed.lastSuccess, null, 'A crawl success not published cannot be claimed as baseline freshness');
  assert.equal(failed.lastAttempt, T3);
  assert.equal(failed.coverage, null);
});

test('metadata/coverage/record tampering cannot replace a published source, and repeated snapshots are not new updates', t => {
  const f = fixture(t);
  crawl(A, f, [rawJob('new')]);
  const pristine = JSON.parse(fs.readFileSync(snapshotFile(f)));
  const status = JSON.parse(fs.readFileSync(statusFile(f)));
  const before = fileBytes(f.dataFile);
  for (const change of [
    { key: 'wrong' }, { complete: false }, { version: 2 }, { completedAt: T3 },
    { coverage: coverageFor({ ...A, siteId: 124 }) }, { jobs: [{ title: 'missing id' }] },
    { jobs: [{ ...rawJob('new'), category: true }] }
  ]) {
    fs.writeFileSync(snapshotFile(f), JSON.stringify({ ...pristine, ...change }));
    assert.equal(publish({ ...f, keys: ['a'] }).written, false);
    assert.deepEqual(fileBytes(f.dataFile), before);
  }
  fs.writeFileSync(snapshotFile(f), JSON.stringify(pristine));
  fs.writeFileSync(statusFile(f), JSON.stringify({ ...status, message: { invalid: true } }));
  assert.equal(publish({ ...f, keys: ['a'] }).written, false);
  fs.writeFileSync(statusFile(f), JSON.stringify(status));
  assert.equal(publish({ ...f, keys: ['a'] }).written, true);
  const published = fileBytes(f.dataFile);
  assert.equal(publish({ ...f, keys: ['a'] }).written, false);
  assert.deepEqual(fileBytes(f.dataFile), published);
  assert.notEqual(coverageFor(A), coverageFor({ ...A, batch: '扩大批次' }));
  assert.notEqual(coverageFor(B), coverageFor({ ...B, category: ['1', '2'] }));
  assert.notEqual(coverageFor(B), coverageFor({ ...B, api: 'https://official.example/expanded' }));
  assert.equal(coverageFor(A), coverageFor(Object.fromEntries(Object.entries(A).reverse())));
});

test('a changed coverage publishes normally and replaces the source scope', t => {
  const f = fixture(t);
  crawl(A, f, [rawJob('published')], T2);
  assert.equal(publish({ ...f, keys: ['a'] }).written, true);
  const expanded = { ...A, batch: 'different coverage' };
  crawl(expanded, f, [rawJob('second')], T3);
  const result = publish({ ...f, sites: [expanded, B], keys: ['a'] });
  assert.equal(result.written, true);
  assert.deepEqual(readPublished(f.dataFile).jobs.filter(j => j.sourceKey === 'a').map(j => j.id), ['a:second']);
});

test('normalization retains every occupation, internship, plan and experience; full JD and unknowns are honest', () => {
  const longText = '<p>' + '完整正文'.repeat(400) + '</p>';
  const raw = [
    { ...rawJob('hr', 'HR 十年以上'), description: longText },
    { ...rawJob('intern', '实习工程师'), commitment: '实习' },
    { ...rawJob('plan', '天才少年/精英计划') },
    { ...rawJob('finance', '<img src=x onerror=alert(1)>财务') },
    { ...rawJob('duplicate-title', 'HR 十年以上'), requirements: '完整要求', descRequire: '补充要求', descDuty: '独立职责' },
    { id: 'unknown', title: '无 JD 岗位' }
  ];
  const jobs = normalizeJobs(raw, A);
  assert.equal(jobs.length, raw.length);
  assert.equal(jobs[0].description, longText);
  assert.ok(jobs[0].description.length > 600);
  assert.equal(jobs[0].requirements, '十年以上工作经验');
  assert.equal(jobs[1].employment, 'internship');
  assert.deepEqual(jobs[1].channels, [], 'Internship alone is not campus recruitment');
  assert.equal(jobs[2].talentPlan, null, 'Do not infer plan membership from a title');
  assert.equal(jobs[3].title, raw[3].title, 'Frontend, not crawler, escapes HTML');
  assert.equal(jobs[4].requirements, '完整要求\n十年以上工作经验\n补充要求');
  assert.equal(jobs[4].duty, '独立职责');
  assert.equal(jobs[5].date, null);
  assert.equal(jobs[5].dateKind, null);
  assert.equal(jobs[5].employment, null);
  assert.equal(jobs[5].talentPlan, null);
  assert.equal(jobs[5].jdComplete, false);
  for (const job of jobs) {
    assert.equal(job.jdComplete, false);
    assert.equal(job.category, '');
    assert.ok(!['score', 'years', 'strength', 'titleTier', 'track', 'dept'].some(key => key in job));
  }
  const feishu = normalizeJobs([{ id: 'f', title: '岗位', description: '职责', requirement: '必须保留' }], { key: 'f', company: 'Feishu', ats: 'feishu' })[0];
  assert.equal(feishu.requirements, '必须保留');
  assert.equal(feishu.description, '职责');
  assert.equal(feishu.url, '');
  assert.deepEqual(feishu.channels, []);
  const known = normalizeJobs([{ id: 'known', title: '完整岗位', date: '2026-01-01', dateKind: 'updated', duty: '正文', jdComplete: true, talentPlan: false, employment: 'full-time', channels: ['campus', 'social'] }], A)[0];
  assert.equal(known.jdComplete, true);
  assert.equal(known.dateKind, 'updated');
  assert.deepEqual(known.channels, ['campus', 'social']);
  const dated = normalizeJobs([{ id: 'date', name: '岗位', createdAt: 1767225600000 }], A)[0];
  assert.equal(dated.date, '2026-01-01');
  assert.equal(dated.dateKind, null);
});

test('official category names are merged in source-field order; codes, departments, channels and batches are not functions', () => {
  const feishu = { key: 'f', company: 'Feishu', ats: 'feishu' };
  const custom = { key: 'c', company: 'Custom', ats: 'custom' };
  const raw = { ...rawJob('label', '<img src=x onerror=alert(1)>财务'), city: '北京', date: '2026-01-01', dateKind: 'updated', duty: '<p>职责</p>', jdComplete: true, employment: 'full-time', talentPlan: false, channels: ['campus', 'social'] };
  const cases = [
    [A, { zhineng: { name: ' 研发 ' } }, '研发'],
    [A, { category: { name: ' 技术 ' }, zhineng: ' 研发 ' }, '技术/研发'],
    [feishu, { category: ' 技术 ', jobFunction: ' 算法 ' }, '技术/算法'],
    [feishu, { job_category: { name: ' 研发 ' }, jobFunction: '算法' }, '研发/算法'],
    [custom, { category: ' 财务 ' }, '财务'],
    [custom, { category: ' <b>职能</b><img src=x onerror=alert(1)> ' }, '<b>职能</b><img src=x onerror=alert(1)>'],
    [A, { category: ['研发', { name: ' 设计 ' }, ' 研发 ', '123', { id: 4 }, {}], zhineng: [{ name: '设计' }, { name: '算法' }] }, '研发/设计/算法']
  ];
  for (const [site, fields, category] of cases) {
    const unchanged = normalizeJobs([raw], site)[0];
    assert.deepEqual(normalizeJobs([{ ...raw, ...fields }], site)[0], { ...unchanged, category }, 'Category must not change title, JD or any official metadata');
  }
  for (const category of [undefined, null, '', ' ', {}, { id: '123' }, { name: '' }, 123, ' 007 ', '1e3', []]) {
    const fields = { category, dept: '算法研发部', department: { name: '研发部' }, Category: '社会招聘', ClassificationOne: '2026批次', BeisenCategory: '技术', categoryID: '技术', code: '研发', jobFamilyName: '未验证职族', jobCategoryName: '未验证职类' };
    assert.deepEqual(normalizeJobs([{ ...raw, ...fields }], B)[0], normalizeJobs([raw], B)[0], 'Only usable official labels may populate category');
  }
  for (const sourceChannelCategory of ['1', '2']) {
    const job = normalizeJobs([{ ...rawJob(), Category: sourceChannelCategory, ClassificationOne: '2026批次' }], { ...B, category: [sourceChannelCategory] })[0];
    assert.equal(job.category, '');
    assert.deepEqual(job.channels, [sourceChannelCategory === '1' ? 'social' : 'campus']);
  }
});

test('verified Moka details give one nonduplicated JD, publishedAt only, factual state and channel/internship intersection', t => {
  const f = fixture(t), detailed = { ...A, siteId: 94905, fetchDetails: true };
  const raw = { ...rawJob('detail', '实习开发'), detailVerified: true, jobDescription: '<p>【工作职责】</p><p>Agent &amp; C++ 开发 Agent</p><p>【任职要求】</p><p>熟悉 Agent 和 C++</p>', publishedAt: '2026-09-10T21:57:36', createdAt: '2025-01-01T00:00', openedAt: '2025-02-01T00:00', status: 'pause', commitment: '实习', zhineng: { name: '工程研发' } };
  const job = normalizeJobs([raw], detailed)[0];
  assert.ok(job.duty.includes('Agent & C++'));assert.ok(job.requirements.includes('熟悉 Agent'));assert.equal(job.description, '');
  assert.equal((job.duty + job.requirements).match(/Agent/g).length, 3);assert.ok(!job.duty.includes('职责全文'));assert.ok(!job.requirements.includes('十年以上工作经验'));
  assert.equal(job.date, '2026-09-10');assert.equal(job.dateKind, 'published');assert.equal(job.sourceStatus, 'pause');assert.equal(job.jdComplete, true);
  assert.equal(job.category, '工程研发');assert.equal(job.employment, 'internship');assert.deepEqual(job.channels, ['campus']);assert.ok(job.url.includes('/official/94905#/job/detail'));
  const missingDate = normalizeJobs([{ ...raw, publishedAt: null }], detailed)[0];assert.equal(missingDate.date, null);assert.equal(missingDate.dateKind, null);
  const placeholder = normalizeJobs([{ ...raw, jobDescription: '<p>。</p>' }], detailed)[0];assert.equal(placeholder.jdComplete, false);assert.equal(placeholder.description, '。');
  const retained = readPublished(f.dataFile).jobs.find(j => j.sourceKey === 'b');
  assert.equal(crawl(detailed, f, [raw]).code, 0);assert.equal(publish({ ...f, sites: [detailed, B], keys: ['a'] }).written, true);
  assert.deepEqual(readPublished(f.dataFile).jobs.find(j => j.sourceKey === 'b'), retained, 'Other sources retain content and optional-key presence exactly');
  assert.equal(readPublished(f.dataFile).jobs.find(j => j.sourceKey === 'a').sourceStatus, 'pause');
  for (const fields of [{ detailVerified: undefined }, { detailVerified: 'true' }, { jobDescription: undefined }, { publishedAt: true }, { publishedAt: 1767225600000 }, { status: {} }, { status: '' }]) {
    const savedRaw = fileBytes(rawFile(f)), savedSnapshot = fileBytes(snapshotFile(f));
    assert.equal(crawl(detailed, f, [{ ...raw, ...fields }], T3).code, 1);assert.deepEqual(fileBytes(rawFile(f)), savedRaw);assert.deepEqual(fileBytes(snapshotFile(f)), savedSnapshot);
  }
});

test('StepFun scope correction rejects prior small/list-only snapshots until fresh wide detail success', t => {
  const f = fixture(t), detailed = { ...A, siteId: 94905, fetchDetails: true };
  crawl(A, f, [rawJob('small')]);const before = fileBytes(f.dataFile);
  assert.equal(publish({ ...f, sites: [detailed, B], keys: ['a'] }).written, false);assert.deepEqual(fileBytes(f.dataFile), before);
  const full = { id: 'wide', title: '其他职业', detailVerified: true, jobDescription: '<p>其他完整正文</p>', commitment: '全职', status: 'open' };
  assert.equal(crawl(detailed, f, [full]).code, 0);assert.equal(publish({ ...f, sites: [detailed, B], keys: ['a'] }).written, true);
  assert.deepEqual(readPublished(f.dataFile).jobs.map(j => j.id).sort(), ['a:wide', 'b:old']);
  const sites = loadSites();assert.equal(sites.find(s => s.key === 'stepfun').siteId, 94905);assert.equal(sites.find(s => s.key === 'stepfun').fetchDetails, true);assert.equal(sites.find(s => s.key === 'stepfun_social').fetchDetails, true);
  assert.notEqual(coverageFor(A), coverageFor({ ...A, fetchDetails: true }));
});

test('reviewed ByteDance campus runs/publishes; raw JD facts and old broad social scope stay guarded', t => {
  const f = fixture(t), feishu = require('../crawler/lib/feishu');
  const site = loadSites().find(s => s.key === 'bytedance');
  const social = { ...loadSites().find(s => s.key === 'bytedance_social'), adapter: undefined, categoryGroups: undefined, categoryRootIds: undefined };
  assert.equal(feishu.verifiedSource(site), true);assert.equal(feishu.verifiedSource(social), false);
  const old = readPublished(f.dataFile), rawPost = { id: 'official', title: '财务实习生', description: '完整职责 Agent', requirement: '完整要求 C++', recruit_type: { name: '实习', parent: { name: '校招' } }, job_category: { name: '财务' }, city_list: [{ name: '上海' }] };
  const job = { ...feishu.normalizePost(rawPost, site), rawPost };
  const runner = (command, args) => { assert.equal(command, process.execPath);assert.equal(path.basename(args[0]), 'feishu.js');assert.deepEqual(JSON.parse(args[1]), site);fs.writeFileSync(args.at(-1), JSON.stringify(envelope([job])));return { status: 0 }; };
  assert.equal(runCrawl(site, { outDir: f.outDir, runner, now: () => T2 }).code, 0);
  assert.equal(publish({ ...f, sites: [...f.sites, site], keys: [site.key] }).written, true);
  const data = readPublished(f.dataFile), fresh = data.jobs.find(j => j.sourceKey === site.key);
  assert.deepEqual(data.jobs.filter(j => j.sourceKey !== site.key), old.jobs);assert.deepEqual(data.sources.filter(s => s.key !== site.key), old.sources);
  assert.equal(fresh.requirements, '完整要求 C++');assert.equal(fresh.duty, '完整职责 Agent');assert.equal(fresh.description, '');assert.deepEqual(fresh.channels, ['campus']);assert.equal(fresh.employment, 'internship');assert.equal(fresh.date, null);assert.equal(fresh.talentPlan, null);
  const savedRaw = fileBytes(rawFile(f, site)), savedSnapshot = fileBytes(snapshotFile(f, site));
  const forged = (command, args) => { fs.writeFileSync(args.at(-1), JSON.stringify(envelope([{ ...job, requirements: 'silently omitted' }])));return { status: 0 }; };
  assert.equal(runCrawl(site, { outDir: f.outDir, runner: forged, now: () => T3 }).code, 1);assert.deepEqual(fileBytes(rawFile(f, site)), savedRaw);assert.deepEqual(fileBytes(snapshotFile(f, site)), savedSnapshot);
  const before = fileBytes(f.dataFile);assert.equal(publish({ ...f, sites: [site], keys: [site.key] }).written, false);assert.deepEqual(fileBytes(f.dataFile), before);
  assert.equal(runCrawl(social, { outDir: f.outDir, runner: () => assert.fail('Capped source cannot run'), now: () => T3 }).status, 'unverified');
  for (const change of [{ adapter: undefined }, { portalType: 6 }, { websitePath: 'society' }, { subjectIdList: ['single-project'] }, { url: 'https://wrong.example/position' }]) assert.equal(feishu.verifiedSource({ ...site, ...change }), false);
  assert.notEqual(coverageFor(site), coverageFor({ ...site, portalType: 6 }));assert.notEqual(coverageFor(site), coverageFor({ ...site, adapter: 'future-version' }));
});

test('explicit classified social migration replaces only its old source and permanently discloses the limited scope', t => {
  const f=fixture(t),feishu=require('../crawler/lib/feishu'),site=loadSites().find(s=>s.key==='bytedance_social');
  assert.equal(feishu.verifiedSource(site),true);const old=readPublished(f.dataFile);
  old.sources.push({key:site.key,company:site.company,status:'legacy',lastSuccess:null,lastAttempt:null,message:'历史',coverage:null});
  old.companies.push({name:site.company,initial:'Z',aliases:[]});
  old.jobs.push({...old.jobs[0],id:'legacy-social',sourceKey:site.key,company:site.company});
  fs.writeFileSync(f.dataFile,'globalThis.ANDE_DATA = '+JSON.stringify(old)+';\n');
  const rawPost={id:'social-official',title:'法务',description:'完整职责',requirement:'完整要求',job_category:{id:site.categoryGroups[1][1],name:'职能'},recruit_type:{name:'正式',parent:{name:'社招'}}};
  const job={...feishu.normalizePost(rawPost,site),rawPost};
  const runner=(command,args)=>{assert.equal(path.basename(args[0]),'feishu.js');fs.writeFileSync(args.at(-1),JSON.stringify(envelope([job])));return {status:0}};
  assert.equal(runCrawl(site,{outDir:f.outDir,runner,now:()=>T2}).code,0);
  assert.equal(publish({...f,sites:[...f.sites,site],keys:[site.key]}).written,true);
  const data=readPublished(f.dataFile);assert.deepEqual(data.jobs.filter(j=>j.sourceKey!==site.key),old.jobs.filter(j=>j.sourceKey!==site.key));assert.deepEqual(data.sources.filter(s=>s.key!==site.key),old.sources.filter(s=>s.key!==site.key));
  assert.deepEqual(data.jobs.filter(j=>j.sourceKey===site.key).map(j=>j.id),[site.key+':social-official']);assert(data.sources.find(s=>s.key===site.key).message.includes('不代表全社招'));assert(data.notices.some(n=>n.includes('未分类')));
  assert.notEqual(coverageFor(site),coverageFor({...site,categoryGroups:[]}));assert.notEqual(coverageFor(site),coverageFor({...site,categoryRootIds:[]}));
  assert.equal(crawl(A,f,[rawJob('other-new')],T3).code,0);assert.equal(publish({...f,sites:[...f.sites,site],keys:['a']}).written,true);assert(readPublished(f.dataFile).notices.some(n=>n.includes('不代表全社招')));
  assert.throws(()=>normalizeJobs([{...job,rawPost:{...rawPost,job_category:{id:'outside',name:'职能'}}}],site),/scope|category/i);
});

test('country-only official locations retain overseas jobs without inventing a city', t => {
  const f = fixture(t);
  const site = { ...A, site: 'social' };
  const raw = [
    { ...rawJob('sales', '海外API销售'), locations: [{ country: '美国', id: 808318 }] },
    { ...rawJob('gtm', '海外GTM运营'), locations: [{ country: '美国', id: 808318 }] },
    { ...rawJob('local'), locations: [{ country: '中国', cityName: '上海市' }, { country: '美国', id: 808318 }] }
  ];
  const before = fileBytes(f.dataFile);
  assert.equal(crawl(site, f, raw).code, 0);
  assert.deepEqual(normalizeJobs(raw, site).map(j => j.city), ['美国', '美国', '上海市/美国']);
  assert.equal(JSON.parse(fs.readFileSync(snapshotFile(f))).jobs.length, 3);
  assert.deepEqual(fileBytes(f.dataFile), before, 'Crawling never publishes');
  for (const locations of [[{ country: 123 }], [{ country: false }], [{ cityName: '上海', country: 123 }], [{ id: 808318 }]]) {
    assert.throws(() => normalizeJobs([{ ...rawJob(), locations }], site), /Invalid/);
  }
});

test('ATS fields, official URLs and source+official identity do not lose requirements or merge titles', () => {
  const jobs = normalizeJobs([{ JobAdId: 0, JobAdName: '相同标题', LocNames: ['北京', '上海'], Duty: '完整职责', Require: '完整要求', PostDate: '2026-01-01', Kind: 1 }, { JobAdId: '2', JobName: '相同标题', Requirement: '另一份要求' }], B);
  assert.equal(jobs[0].id, 'b:0');
  assert.equal(jobs[0].city, '北京/上海');
  assert.equal(jobs[0].duty, '完整职责');
  assert.equal(jobs[0].requirements, '完整要求');
  assert.equal(jobs[0].dateKind, null);
  assert.equal(jobs[0].employment, null);
  assert.equal(jobs[0].url, 'https://official.example/jobs/0');
  assert.deepEqual(jobs[0].channels, ['social']);
  assert.equal(jobs[1].requirements, '另一份要求');
  assert.equal(new Set(jobs.map(job => job.id)).size, 2);
  assert.notEqual(normalizeJobs([rawJob('same')], A)[0].id, normalizeJobs([rawJob('same')], B)[0].id);
  const generic = { key: 'unknown', company: 'Unknown', ats: 'custom' };
  for (const url of ['javascript:alert(1)', 'data:text/html,unsafe', 'https://user:pass@example.com', 'not-a-url']) assert.equal(normalizeJobs([{ ...rawJob(), url }], generic)[0].url, '');
  assert.equal(normalizeJobs([{ ...rawJob(), url: 'https://official.example/detail?id=1' }], generic)[0].url, 'https://official.example/detail?id=1');
  assert.match(normalizeJobs([{ ...rawJob('unsafe/id'), url: 'javascript:alert(1)' }], A)[0].url, /unsafe%2Fid$/);
});

test('unverified custom and Feishu are not run, do not touch raw, and cannot publish even a forged ready snapshot', t => {
  const f = fixture(t);
  fs.mkdirSync(f.outDir);
  for (const ats of ['custom', 'feishu']) {
    const site = { key: ats, company: ats, ats };
    fs.writeFileSync(rawFile(f, site), '["old"]');
    const result = runCrawl(site, { outDir: f.outDir, now: () => T2, runner: () => { assert.fail('Unverified adapter must not run'); } });
    assert.equal(result.status, 'unverified');
    assert.equal(fs.readFileSync(rawFile(f, site), 'utf8'), '["old"]');
    fs.writeFileSync(statusFile(f, site), JSON.stringify({ version: 1, key: site.key, status: 'ready', coverage: coverageFor(site), lastAttempt: T2, lastSuccess: T2, message: 'forged' }));
    fs.writeFileSync(snapshotFile(f, site), JSON.stringify({ version: 1, key: site.key, complete: true, coverage: coverageFor(site), completedAt: T2, jobs: [rawJob()] }));
    assert.equal(publish({ ...f, sites: [site] }).written, false);
  }
});

for (const mode of ['moka', 'beisen']) {
  test(mode + ' verifies stable count/full pagination including 0; preserves source request parameters', async () => {
    const requests = [];
    const jobs = [rawJob('1'), rawJob('2'), rawJob('3')];
    const result = await adapterFetch(mode, [{ body: pageBody(mode, jobs.slice(0, 2), 3) }, { body: pageBody(mode, jobs.slice(2), 3) }], requests, mode === 'moka' ? { limit: 2 } : { pageSize: 2 });
    assert.deepEqual(result, envelope(jobs));
    assert.equal(requests.length, 2);
    if (mode === 'moka') {
      assert.equal(requests[0].body.site, 'campus');
      assert.equal(requests[1].body.offset, 2);
    } else {
      assert.deepEqual(requests[0].body.Category, ['1']);
      assert.equal(requests[1].body.PageIndex, 1);
      for (const sourceChannelCategory of [['1'], ['2']]) {
        const channelRequests = [];
        assert.deepEqual(await beisen.fetchAll(B.api, sourceChannelCategory, { fetchImpl: fetchPages([{ body: pageBody(mode, [], 0) }], mode, channelRequests) }), envelope([]));
        assert.deepEqual(channelRequests[0].body.Category, sourceChannelCategory, 'Official channel request parameters are not job-function labels');
      }
    }
    assert.deepEqual(await adapterFetch(mode, [{ body: pageBody(mode, [], 0) }]), envelope([]));
  });

  test(mode + ' rejects HTTP errors, malformed/unknown shape, absent/contradictory counts, early empty/short pages and pagination cap', async () => {
    const one = rawJob();
    const invalid = [
      [{ status: 503, body: {} }], [{ body: '{' }], [{ body: [] }], [{ body: {} }],
      [{ body: mode === 'moka' ? { jobs: [one] } : { Data: [one] } }],
      [{ body: mode === 'moka' ? { jobs: [one], total: '1' } : { Data: [one], Count: '1' } }],
      [{ body: pageBody(mode, [one], 0) }], [{ body: pageBody(mode, [], 1) }],
      [{ body: pageBody(mode, [one], 2) }],
      [{ body: pageBody(mode, [one, rawJob('2')], 3) }, { body: pageBody(mode, [], 3) }],
      [{ body: pageBody(mode, [one, rawJob('2')], 3) }, { body: pageBody(mode, [rawJob('3')], 4) }]
    ];
    for (const pages of invalid) await assert.rejects(adapterFetch(mode, pages, [], mode === 'moka' ? { limit: 2 } : { pageSize: 2 }));
    await assert.rejects(adapterFetch(mode, [{ body: pageBody(mode, [one, rawJob('2')], 3) }], [], mode === 'moka' ? { limit: 2, maxPages: 1 } : { pageSize: 2, maxPages: 1 }), /limit reached/);
    if (mode === 'moka') assert.throws(() => moka.extractJobs({ jobs: [], total: 0, count: 1 }), /consistent/);
  });

  test(mode + ' CLI run writes once only AFTER all requests succeed, never partial output', async t => {
    const f = fixture(t, false);
    const file = path.join(f.dir, 'raw.json');
    fs.writeFileSync(file, 'OLD RAW');
    const args = mode === 'moka' ? [A.orgId, String(A.siteId), A.site, 'de7c21ed8d6f50fe', file] : [B.api, '1', file];
    const adapter = mode === 'moka' ? moka : beisen;
    await assert.rejects(adapter.run(args, { fetchImpl: fetchPages([{ status: 500 }], mode) }));
    assert.equal(fs.readFileSync(file, 'utf8'), 'OLD RAW');
    await adapter.run(args, { fetchImpl: fetchPages([{ body: pageBody(mode, [], 0) }], mode) });
    assert.deepEqual(JSON.parse(fs.readFileSync(file)), envelope([]));
  });
}

test('Moka encrypted response uses strict decrypted shape (local encryption only)', async () => {
  const key = '0123456789abcdef', iv = 'de7c21ed8d6f50fe';
  const encrypt = value => {
    const cipher = crypto.createCipheriv('aes-128-cbc', Buffer.from(key), Buffer.from(iv));
    return Buffer.concat([cipher.update(JSON.stringify(value)), cipher.final()]).toString('base64');
  };
  const result = await adapterFetch('moka', [{ body: { data: encrypt({ jobs: [rawJob()], jobStats: { total: 1 } }), necromancer: key } }]);
  assert.deepEqual(result, envelope([rawJob()]));
  await assert.rejects(adapterFetch('moka', [{ body: { data: encrypt([rawJob()]), necromancer: key } }]));
  for (const successField of ['success', 'Success']) await assert.rejects(adapterFetch('moka', [{ body: { [successField]: false, data: encrypt({ jobs: [], total: 0 }), necromancer: key } }]), /unsuccessful/);
  assert.throws(() => moka.extractJobs({ Success: false, jobs: [], total: 0 }), /Unknown/);
});

test('update is the ONLY chain: serial process.execPath crawl, then one publish; partial failure returns 1', t => {
  const f = fixture(t);
  const calls = [];
  const result = runUpdate(['a', 'b', 'a'], {
    ...f,
    runner: (command, args) => {
      assert.equal(command, process.execPath);
      assert.equal(path.basename(args[0]), 'crawl.js');
      const site = f.sites.find(s => s.key === args[1]);
      calls.push('crawl:' + site.key);
      const child = runCrawl(site, { outDir: f.outDir, now: () => T2, runner: candidateRunner([rawJob('fresh')], { status: site.key === 'a' ? 0 : 1 }) });
      return { status: child.code };
    },
    publisher: options => { calls.push('publish'); return publish(options); }
  });
  assert.deepEqual(calls, ['crawl:a', 'crawl:b', 'publish']);
  assert.equal(result.code, 1);
  assert.equal(result.publication.written, true);
  assert.deepEqual(readPublished(f.dataFile).jobs.map(j => j.id).sort(), ['a:fresh', 'b:old']);
  const allCalls = [];
  const all = runUpdate([], { sites: loadSites(), runner: (_command, args) => { allCalls.push(args[1]); return { status: 1 }; }, publisher: () => ({ code: 1, written: false }) });
  assert.equal(all.code, 1);
  assert.deepEqual(allCalls, loadSites().map(s => s.key), 'No second hardcoded site list');
  assert.throws(() => runUpdate(['unknown'], { sites: [A], runner: () => assert.fail('must reject first'), publisher: () => assert.fail('must reject first') }), /Unknown/);
  const chain = ['crawl.js', 'publish.js', 'update.js', 'run_daily.ps1'].map(file => fs.readFileSync(path.join(__dirname, '..', 'crawler', file), 'utf8')).join('\n');
  assert.ok(!/require\([^\n]*(?:score|filter|recall)|(?:build_score_html|split_batches|merge_judge|write_cache|aggregate|narrow|recall)\.js/.test(chain));
  assert.equal(fs.readFileSync(f.index, 'utf8'), 'DO NOT CHANGE');
});

test('notices always disclose registry scope and only mention JD gaps when present; string aliases survive', t => {
  const f = fixture(t);
  const baseline = readPublished(f.dataFile);
  baseline.companies[0].aliases = 'Alibaba / Alpha';
  baseline.jobs = baseline.jobs.filter(job => job.sourceKey === 'a');
  fs.writeFileSync(f.dataFile, 'globalThis.ANDE_DATA = ' + JSON.stringify(baseline) + ';\n');
  crawl(A, f, [{ ...rawJob('full'), jdComplete: true }]);
  const partial = publish({ ...f, keys: ['a'] });
  assert.equal(partial.data.companies[0].aliases, 'Alibaba / Alpha');
  assert.ok(partial.data.notices.some(n => n.includes('不等于公司全量')));
  assert.ok(!partial.data.notices.some(n => n.includes('历史个人筛选基线') || n.includes('初版HTML')));
  assert.ok(!partial.data.notices.some(n => n.includes('缺少 JD')));
});

test('failed top-level crawl launch cannot publish a stale ready candidate alongside a successful source', t => {
  const f = fixture(t);
  crawl(A, f, [rawJob('stale-not-published')]);
  const result = runUpdate(['a', 'b'], {
    ...f,
    runner: (_command, args) => {
      if (args[1] === 'a') return { status: null, error: new Error('spawn failed') };
      return { status: crawl(B, f, [rawJob('fresh')], T3).code };
    }
  });
  assert.equal(result.code, 1);
  assert.deepEqual(result.publication.updated, ['b']);
  assert.deepEqual(readPublished(f.dataFile).jobs.map(j => j.id).sort(), ['a:old', 'b:fresh']);
  assert.equal(readPublished(f.dataFile).sources.find(s => s.key === 'a').status, 'failed');
});

test('bad baseline is refused without evaluating JavaScript or overwriting it', t => {
  const f = fixture(t);
  const baseline = readPublished(f.dataFile);
  crawl(A, f, [rawJob('new')]);
  const invalid = 'globalThis.ANDE_DATA = (() => { throw new Error("must not execute"); })();';
  fs.writeFileSync(f.dataFile, invalid);
  assert.throws(() => publish(f));
  assert.equal(fs.readFileSync(f.dataFile, 'utf8'), invalid);
  for (const category of [null, true, 123, [], {}, { name: '研发' }]) {
    const data = { ...baseline, jobs: baseline.jobs.map(job => ({ ...job })) };
    data.jobs[0].category = category;
    const content = 'globalThis.ANDE_DATA = ' + JSON.stringify(data) + ';\n';
    fs.writeFileSync(f.dataFile, content);
    assert.throws(() => publish(f), /Invalid baseline category/);
    assert.equal(fs.readFileSync(f.dataFile, 'utf8'), content, 'Explicit illegal category types must never overwrite the baseline');
  }
  assert.throws(() => validateEnvelope([]), /complete/);
});
