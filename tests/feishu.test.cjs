'use strict';
// 离线：注入 request/sleep，不启动 Chrome、不访问官网。
const test = require('node:test'), a = require('node:assert/strict'), fs = require('node:fs'), os = require('node:os'), path = require('node:path');
const feishu = require('../crawler/lib/feishu');
const { adapterCommand, runCrawl } = require('../crawler/crawl');
const { loadSites, normalizeJobs, publish, readPublished } = require('../crawler/publish');
const sites = new Map(loadSites().map(s => [s.key, s]));
const campus = sites.get('bytedance'), social = sites.get('bytedance_social'), lilith = sites.get('lilith'), lilithSocial = sites.get('lilith_social'), sensetime = sites.get('sensetime');
const post = (id, extra = {}) => ({ id, title: '岗位' + id, description: '职责' + id + ' List<T> &amp;', requirement: '要求' + id, city_list: [{ name: '深圳' }, { name: '北京' }], job_category: { name: '研发' },
  recruit_type: { name: '实习', parent: { name: '校招' } }, someNewField: { a: 1 }, ...extra });
const page = (posts, count = posts.length) => ({ status: 200, body: { code: 0, data: { count, job_post_list: posts } } });
// 按 offset/limit 切页的假官网
function fake(posts, { count = posts.length, failAt } = {}) {
  const calls = [];
  const request = async body => {
    calls.push(body); if (failAt === calls.length) return { status: 403, body: '{}' };
    return page(posts.slice(body.offset, body.offset + body.limit), count);
  };
  return { request, calls };
}
const opts = f => ({ request: f.request, limit: 2, maxPages: 20, sleepImpl: async () => {} });

test('all registered feishu sources qualify; aliases, wrong adapters and unknown feishu sites do not run', () => {
  for (const key of ['bytedance', 'bytedance_social', 'minimax', 'minimax_social', 'sensetime', 'sensetime_social', 'lilith', 'lilith_social', 'papegames', 'papegames_social']) {
    const site = sites.get(key); a.equal(feishu.verifiedSource(site), true, key);
    a.equal(path.basename(adapterCommand(site, '/tmp/raw.json').script), 'feishu.js');
  }
  for (const bad of [{ ...campus, key: 'alias' }, { ...campus, adapter: 'feishu-portal-v1' }, { ...sensetime, adapter: undefined }]) a.equal(adapterCommand(bad, '/tmp/raw.json'), null);
  a.equal(adapterCommand({ key: 'unknown_feishu', company: 'X', ats: 'feishu', adapter: 'feishu-portal-v1', portalType: 6 }, '/tmp/raw.json'), null);
  a.equal(feishu.requestBody(sensetime).portal_type, 6); a.equal(feishu.requestBody(sensetime).keyword, '');
});

test('single scan: one pass, unknown fields tolerated, duplicates/bad rows and total drift only recorded', async () => {
  const posts = [post('1'), post('2'), post('3', { title: '' }), post('4', { id: undefined }), post('1'), post('5')];
  const f = fake(posts, { count: 9 });
  const result = await feishu.fetchAll(campus, opts(f));
  a.deepEqual(result.jobs.map(j => j.rawPost.id), ['1', '2', '5']);
  a.ok(result.issues.some(s => s.includes('缺ID/标题')) && result.issues.some(s => s.includes('官方total 9')));
  a.equal(f.calls.at(-1).offset, 6); // 到空页即停，没有第二遍「verify」扫描
  a.ok(f.calls.every(b => b.portal_type === 3 && b.keyword === '' && b.job_category_id_list.length === 0));
});

test('failures: first-page refusal throws, a later page failure fails the whole run, zero never succeeds', async () => {
  await a.rejects(feishu.fetchAll(campus, opts(fake([post('1')], { failAt: 1 }))), /HTTP failure: 403/);
  await a.rejects(feishu.fetchAll(campus, opts(fake(['1', '2', '3', '4'].map(id => post(id)), { failAt: 2 }))), /HTTP failure: 403/);
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ande-feishu-')); const file = path.join(dir, 'raw.json');
  try {
    await a.rejects(feishu.run([JSON.stringify(campus), file], opts(fake([]))), /no usable/);
    a.equal(fs.existsSync(file), false);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test('projection keeps literal JD text and takes channel/employment/category only from explicit facts', () => {
  const j = feishu.normalizePost(post('9', { job_category: null, job_function: { name: ' 美术 ' } }), sensetime);
  a.equal(j.duty, '职责9 List<T> &amp;'); a.equal(j.requirements, '要求9'); a.equal(j.category, '美术'); a.equal(j.city, '深圳/北京');
  a.deepEqual(j.channels, ['campus']); a.equal(j.employment, 'internship'); a.equal(j.date, null); a.equal(j.url, sensetime.linkTemplate.replace('{id}', '9')); a.equal(j.jdComplete, true);
  const bare = feishu.normalizePost({ id: 7, title: '无元数据' }, sensetime);
  a.deepEqual([bare.duty, bare.requirements, bare.city, bare.channels, bare.employment, bare.jdComplete], ['', '', '', [], null, false]);
  a.throws(() => feishu.normalizeRecord({ rawPost: { id: 'x' } }, sensetime), /id\/title/);
});

test('union portals keep the first listed portal for a shared posting and use each portal URL', async () => {
  const byPath = { career: [post('1'), post('2')], index: [post('2'), post('3')] };
  const result = await feishu.fetchPortals(lilithSocial, { collect: scope => feishu.fetchAll(scope, { ...opts(fake(byPath[scope.websitePath])) }) });
  a.deepEqual(result.jobs.map(j => [j.rawPost.id, j.portalPath]), [['1', 'career'], ['2', 'career'], ['3', 'index']]);
  const records = normalizeJobs(result.jobs, lilithSocial);
  a.deepEqual(records.map(r => r.url), ['https://lilithgames.jobs.feishu.cn/career/position/1/detail', 'https://lilithgames.jobs.feishu.cn/career/position/2/detail', 'https://lilithgames.jobs.feishu.cn/index/position/3/detail']);
  await a.rejects(feishu.fetchPortals(lilith, { collect: scope => scope.websitePath === 'campus' ? feishu.fetchAll(scope, opts(fake([post('1')]))) : feishu.fetchAll(scope, opts(fake([post('2')], { failAt: 1 }))) }), /HTTP failure/);
});

test('classified social scans each category group and merges by official id', async () => {
  const seen = [], request = async body => { seen.push(body.job_category_id_list.join(',')); const ids = body.job_category_id_list.length === social.categoryGroups[0].length ? ['1', '2'] : ['2', '3']; return page(ids.map(id => post(id)).slice(body.offset, body.offset + body.limit), 2); };
  const result = await feishu.fetchClassified(social, { request, limit: 2, maxPages: 5, sleepImpl: async () => {} });
  a.deepEqual(result.jobs.map(j => j.rawPost.id).sort(), ['1', '2', '3']);
  a.ok(seen.includes(social.categoryGroups[0].join(',')) && seen.includes(social.categoryGroups[1].join(',')));
  a.equal(feishu.portalNotice(social), feishu.CLASSIFIED_NOTICE);
});

test('real chain: injected run → crawl snapshot → publisher', async t => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ande-feishu-chain-')); t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const out = path.join(dir, 'out'), dataFile = path.join(dir, 'data', 'catalog.js'), candidate = path.join(dir, 'candidate.json'); fs.mkdirSync(out);
  await feishu.run([JSON.stringify(sensetime), candidate], opts(fake([post('1'), post('2')])));
  const crawled = runCrawl(sensetime, { outDir: out, now: () => '2026-10-09T00:00:00.000Z', runner: (_, args) => { fs.copyFileSync(candidate, args.at(-1)); return { status: 0 }; } });
  a.equal(crawled.code, 0); a.equal(crawled.status, 'ready');
  const published = publish({ outDir: out, dataFile, sites: [sensetime], keys: ['sensetime'] });
  a.equal(published.written, true);
  a.deepEqual(readPublished(dataFile).jobs.map(j => j.id), ['sensetime:1', 'sensetime:2']);
});
