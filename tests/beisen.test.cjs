'use strict';
// 离线：注入 fetch/sleep，不访问官网。
const test = require('node:test'), a = require('node:assert/strict'), fs = require('node:fs'), os = require('node:os'), path = require('node:path');
const beisen = require('../crawler/lib/beisen');
const { adapterCommand, runCrawl } = require('../crawler/crawl');
const { loadSites, normalizeJobs, publish, readPublished } = require('../crawler/publish');
const sites = new Map(loadSites().map(s => [s.key, s]));
const iflytek = sites.get('iflytek'), social = sites.get('iflytek_social'), vivo = sites.get('vivo');
const uuid = n => '0000000' + n + '-aaaa-bbbb-cccc-' + String(n).padStart(12, '0');
const job = (n, extra = {}) => ({ Id: uuid(n), JobAdId: n, JobAdName: '岗位' + n, Duty: ' 职责 &lt;T&gt; &amp;\r\n末尾 ', Require: '要求' + n, Kind: '全职', PostDate: '2026-09-15T10:00:00', PostDateInt: Date.UTC(2026, 8, 15, 2), ClassificationOne: '研发', ClassificationTwo: '算法部',
  LocNames: ['合肥', '北京'], Category: '校园招聘', CategoryId: '2', Status: 1, someNewField: { a: 1 }, ...extra });
// 每页 size 条的假官网
function fake(rows, { count = rows.length, failAt } = {}) {
  const calls = [];
  const fetchImpl = async (url, init) => {
    const body = JSON.parse(init.body); calls.push(body);
    if (failAt === calls.length) return { status: 403, json: async () => ({}) };
    return { status: 200, json: async () => ({ Success: true, Code: 200, TipType: 'Success', Count: count, Data: rows.slice(body.PageIndex * body.PageSize, (body.PageIndex + 1) * body.PageSize) }) };
  };
  return { fetchImpl, calls, sleep: async () => {}, pageSize: 2 };
}

test('registered beisen sources qualify; aliases, wrong adapters and unregistered beisen sites do not run', () => {
  for (const site of [iflytek, social, vivo]) { a.equal(beisen.verifiedSource(site), true); a.equal(path.basename(adapterCommand(site, '/tmp/raw.json').script), 'beisen.js'); a.ok(beisen.portalNotice(site)); }
  for (const bad of [{ ...iflytek, key: 'alias' }, { ...iflytek, adapter: undefined }]) a.equal(adapterCommand(bad, '/tmp/raw.json'), null);
  a.equal(adapterCommand({ key: 'other', company: 'X', ats: 'beisen', api: 'https://example.com/api' }, '/tmp/raw.json'), null);
  const body = beisen.requestBody(iflytek, 0, 100); a.deepEqual(body.Category, ['2', '3', '4', '5', '6', '7']); a.equal(body.KeyWords, ''); a.equal('Category' in beisen.requestBody(vivo, 0, 20), false);
});

test('single scan: one pass, unknown fields tolerated, duplicates/bad rows and Count drift only recorded', async () => {
  const rows = [job(1), job(2), job(3, { JobAdName: '' }), job(1), job(4)];
  const f = fake(rows, { count: 9 }), result = await beisen.fetchAll(iflytek, f);
  a.deepEqual(result.jobs.map(j => j.JobAdId), [1, 2, 4]);
  a.ok(result.issues.some(s => s.includes('缺ID/标题')) && result.issues.some(s => s.includes('官方total 9')));
  a.equal(f.calls.at(-1).PageIndex, 3); a.ok(f.calls.every(b => b.KeyWords === '' && b.SpecialType === 0)); // 没有第二遍或「权威」全渠道扫描
});

test('failures: first-page refusal throws, a later failure fails the whole run, zero never succeeds', async () => {
  await a.rejects(beisen.fetchAll(iflytek, fake([job(1)], { failAt: 1 })), /HTTP 403/);
  await a.rejects(beisen.fetchAll(iflytek, fake([job(1), job(2), job(3), job(4)], { failAt: 2 })), /HTTP 403/);
  await a.rejects(beisen.fetchAll(iflytek, fake([])), /no usable/);
  await a.rejects(beisen.fetchAll({ ...iflytek, adapter: undefined }, fake([job(1)])), /Unverified/);
});

test('projection: TEXT decode, channel/employment/plan from explicit facts, date only when PostDateInt agrees, tolerant of missing fields', () => {
  const j = normalizeJobs([job(1)], iflytek)[0];
  a.equal(j.id, 'iflytek:' + uuid(1)); a.equal(j.title, '岗位1'); a.equal(j.duty, '职责 <T> &\n末尾'); a.equal(j.requirements, '要求1'); a.equal(j.city, '合肥/北京'); a.equal(j.category, '研发');
  a.deepEqual(j.channels, ['campus']); a.equal(j.employment, 'full-time'); a.equal(j.talentPlan, null); a.equal(j.date, '2026-09-15'); a.equal(j.dateKind, 'published'); a.equal(j.sourceStatus, '1');
  a.equal(j.url, 'https://iflytek.zhiye.com/campus/detail?jobAdId=' + uuid(1)); a.equal(j.jdComplete, true);
  a.equal(normalizeJobs([job(2, { CategoryId: '4', Category: '飞星计划', Kind: '实习' })], iflytek)[0].talentPlan, true);
  a.deepEqual(normalizeJobs([job(3, { CategoryId: '1', Category: '社会招聘' })], social)[0].channels, ['social']);
  a.equal(normalizeJobs([job(4, { ClassificationOne: '蓝极星计划', ClassificationTwo: '软件' })], vivo)[0].talentPlan, true);
  a.equal(normalizeJobs([job(4, { ClassificationTwo: '软件' })], vivo)[0].category, '软件');
  const bare = normalizeJobs([{ Id: uuid(9), JobAdName: '无元数据' }], iflytek)[0];
  a.deepEqual([bare.duty, bare.requirements, bare.city, bare.channels, bare.employment, bare.date, bare.jdComplete], ['', '', '', [], null, null, false]);
  a.equal(normalizeJobs([job(5, { PostDate: '0001-01-01T00:00:00', PostDateInt: 0 })], iflytek)[0].date, null);
  a.throws(() => normalizeJobs([], iflytek), /zero cannot clear/);
});

test('real chain: injected run → crawl snapshot → publisher', async t => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ande-beisen-chain-')); t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const out = path.join(dir, 'out'), dataFile = path.join(dir, 'data', 'catalog.js'), candidate = path.join(dir, 'candidate.json'); fs.mkdirSync(out);
  await beisen.run([JSON.stringify(vivo), candidate], fake([job(1), job(2), job(3)]));
  const crawled = runCrawl(vivo, { outDir: out, now: () => '2026-10-09T00:00:00.000Z', runner: (_, args) => { fs.copyFileSync(candidate, args.at(-1)); return { status: 0 }; } });
  a.equal(crawled.code, 0); a.equal(crawled.status, 'ready');
  a.equal(publish({ outDir: out, dataFile, sites: [vivo], keys: ['vivo'] }).written, true);
  const data = readPublished(dataFile); a.equal(data.jobs.length, 3); a.ok(data.notices.some(n => n.includes('北森来源仅覆盖')));
});
