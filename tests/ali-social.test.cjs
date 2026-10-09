'use strict';
const test = require('node:test'), a = require('node:assert/strict');
const fs = require('node:fs'), os = require('node:os'), path = require('node:path'), { spawnSync } = require('node:child_process');
const ali = require('../crawler/lib/custom/ali_social_common');
const fixtures = require('./fixtures/ali-social-portals.json');
const copy = value => JSON.parse(JSON.stringify(value));
const siteFor = p => ({ key: p.key, company: p.company, ats: 'custom', track: 'social', batch: '社招', exclude: '(无)', adapter: 'ali-social-portal-v1', listJD: true, apiOrigin: p.origin, url: p.url, api: p.api, body: ali.requestBody(p, 1) });
const sites = ali.PROFILES.filter(p => p.qualified).map(siteFor);
const sample = site => copy(fixtures[site.key].postings[0]);
function pageResponse(site, jobs, pageIndex, total = jobs.length) {
  const response = copy(fixtures[site.key].endpoint.response);
  response.content = { datas: copy(jobs), totalCount: total, pageSize: 10, currentPage: pageIndex };
  return response; // Synthetic offline evidence, never a promotion of the partial research fixture.
}
function envelope(site, jobs) {
  const scan = () => ({ pages: jobs.length ? [
    { request: ali.requestBody(site, 1), httpStatus: 200, response: pageResponse(site, jobs, 1) },
    { request: ali.requestBody(site, 2), httpStatus: 200, response: pageResponse(site, [], 2, 0) }
  ] : [{ request: ali.requestBody(site, 1), httpStatus: 200, response: pageResponse(site, [], 1, 0) }] });
  return { complete: true, total: jobs.length, jobs: copy(jobs), verification: { version: 1, key: site.key, api: site.api, scans: [scan(), scan()] } };
}
function track(job, suffix) {
  const next = copy(job); next.trackId += suffix;
  const url = new URL(next.positionUrl, 'https://scope.invalid'); url.searchParams.set('track_id', next.trackId);
  next.positionUrl = next.positionUrl.startsWith('/') ? url.pathname + url.search : url.href;
  return next;
}
function rows(site, count) {
  return Array.from({ length: count }, (_, i) => {
    const job = sample(site); job.id += i; job.trackId = 'offline-track-' + i;
    job.positionUrl = '/off-campus/position-detail?positionId=' + job.id + '&track_id=' + job.trackId;
    return job;
  });
}
function mock(site, jobs, config = {}) {
  const profile = ali.PROFILES.find(p => p.key === site.key), calls = [], delays = [];
  let round = 0, posts = 0, gets = 0;
  const headers = (status, location) => ({ getSetCookie: () => ['SESSION=offline-session; Path=/; Secure', ...(profile.csrfMode === 'cookie' ? ['XSRF-TOKEN=offline-csrf; Path=/; Secure'] : [])], get: name => name.toLowerCase() === 'location' ? location : null });
  const options = { sleep: async ms => { delays.push(ms); }, fetchImpl: async (url, init) => {
    calls.push({ url, init });
    if (config.throwAt === calls.length) throw new Error('offline transport unknown');
    if (init.method === 'GET') {
      gets++;
      const status = config.bootstrapStatus ?? (config.redirect && gets === 1 ? 302 : 200);
      const location = config.location ?? site.url.replace('?lang=zh', '');
      return { status, headers: headers(status, location), text: async () => config.html ?? '<html><script>window.__sysconfig = {__token__: "offline-bootstrap-csrf"};</script></html>' };
    }
    posts++;
    const body = JSON.parse(init.body);
    if (body.pageIndex === 1) round++;
    const data = jobs.slice((body.pageIndex - 1) * 10, body.pageIndex * 10).map(j => track(j, '-round-' + round));
    const response = pageResponse(site, data, body.pageIndex, data.length ? jobs.length : 0);
    config.mutate?.(response, body, round, posts);
    return { status: config.listStatus ?? 200, headers: headers(), json: async () => response };
  } };
  return { options, calls, delays, get posts() { return posts; } };
}

test('Eight immutable profiles, seven independently qualified sources, fixed native bodies', () => {
  a.equal(ali.PROFILES.length, 8); a.equal(sites.length, 7);
  for (const site of sites) {
    a.equal(ali.requiresVerification(site), true); a.equal(ali.verifiedSource(site), true);
    a.deepEqual(site.body, fixtures[site.key].listRequest);
    ali.validateJobs(fixtures[site.key].postings, site);
    const source = ali.PROFILES.find(p => p.key === site.key);
    a.equal(Object.isFrozen(source), true); a.equal(Object.isFrozen(source.body.deptCodes), true);
    const witness = fixtures[site.key].bootstrapWitness;
    a.equal(witness.httpStatus, 200);
    if (source.languageRedirect) { a.equal(source.url, witness.initialURL); a.equal(witness.initialStatus, 302); a.equal(source.url.replace('?lang=zh', ''), witness.finalURL); }
    else a.equal(source.url, witness.finalURL);
    const body = ali.requestBody(source, 2); body.deptCodes.push('untrusted');
    a.deepEqual(ali.requestBody(source, 1), site.body);
  }
  const international = ali.PROFILES.find(p => p.key === 'aidc_social');
  a.equal(international.url, international.origin + '/zh/off-campus/position-list');
  a.equal(international.api, international.origin + '/zh/position/search?lang=zh');
  for (const name of ['shareType', 'shareId', 'myReferralShareCode']) a.equal(Object.hasOwn(international.body, name), false);
  a.throws(() => ali.requestBody({ key: 'unknown' }, 1));
});

test('Scope qualification cannot be deleted, rekeyed, narrowed or ATS-downgraded', () => {
  for (const site of sites) {
    for (const field of Object.keys(site)) { const bad = copy(site); delete bad[field]; a.equal(ali.requiresVerification(bad), true); a.equal(ali.verifiedSource(bad), false); a.throws(() => ali.validateJobs([], bad)); }
    for (const patch of [{ key: 'ali_alias' }, { company: '其它阿里' }, { ats: 'generic' }, { track: 'campus' }, { batch: '校招' }, { exclude: '实习' }, { listJD: false }, { body: { ...site.body, regions: '杭州' } }, { body: { ...site.body, pageSize: 100 } }, { matchKeyword: '算法' }, { category: ['技术'] }, { department: '研发' }, { fetchDetails: false }, { qualified: true }]) {
      const bad = { ...copy(site), ...patch }; a.equal(ali.requiresVerification(bad), true); a.equal(ali.verifiedSource(bad), false); a.throws(() => ali.normalizeRecord(sample(site), bad));
    }
  }
});

test('Known host equivalent URL spellings always require verification before any ATS dispatch', () => {
  for (const profile of ali.PROFILES) for (const field of ['api', 'url', 'apiOrigin']) {
    for (const value of [profile.origin + '/unknown?x=1', profile.origin.replace('https:', 'http:') + '/path', profile.origin + ':443/path', profile.origin + '.:443/path', profile.origin.replace('https://', 'https://user:secret@') + '/path', profile.origin.toUpperCase() + '/path']) {
      const unknown = { key: 'alias', ats: 'generic', [field]: value };
      a.equal(ali.requiresVerification(unknown), true, value); a.equal(ali.verifiedSource(unknown), false);
    }
    if (field === 'api') a.equal(ali.requiresVerification({ key: 'alias', api: 'POST ' + profile.api }), true);
  }
  a.equal(ali.requiresVerification({ key: 'other', api: 'https://ordinary.invalid/api' }), false);
  a.equal(ali.requiresVerification({ key: 'other', adapter: 'ali-social-portal-v1' }), true);
});

test('Cloud independently qualifies available data, never the seven portals complete contract', async () => {
  const cloud = siteFor(ali.PROFILES.find(p => p.key === 'aliyun_social'));
  a.equal(ali.requiresVerification(cloud), true); a.equal(ali.verifiedSource(cloud), false); a.equal(ali.availableSource(cloud), true);
  a.throws(() => ali.validateEvidence({ version: 1, key: cloud.key, api: cloud.api, scans: [] }, [], cloud));
  let calls = 0; const options = { fetchImpl: async () => { calls++; throw Error('MUST NOT FETCH'); } };
  await a.rejects(ali.run({ ...cloud, qualified: true, verified: true }, options));
  a.throws(() => ali.fetchAllFor('unknown.invalid', options)); a.equal(calls, 0);
});

test('Scope/brand notices preserve company directory and explicitly disclose the wider Quark portal', () => {
  for (const site of sites) { a.match(ali.portalNotice(site), /中文社会招聘广入口/); a.match(ali.portalNotice(site), /访问者本地时区.*日期未知/); }
  a.match(ali.portalNotice(sites.find(s => s.key === 'ele_social')), /饿了么.*淘宝闪购/);
  a.match(ali.portalNotice(sites.find(s => s.key === 'dingtalk_social')), /千问办公/);
  a.match(ali.portalNotice(sites.find(s => s.key === 'tongyi_social')), /Token Foundry.*通义实验室/);
  a.match(ali.portalNotice(sites.find(s => s.key === 'quark_social')), /千问APP、夸克、AI硬件、UC、书旗、汇川六产品.*不是仅夸克/);
  a.equal(ali.portalNotice({}), '');
});

test('Projection only uses native fields, independent TEXT JD and honest unknown dimensions', () => {
  for (const site of sites) {
    const job = { ...sample(site), description: '  <tag>&amp; >>>正文<<<\r\n  内部   空白\r尾  ', requirement: '  独立要求\r\n  两栏不同  ', categories: ['技术类', '', '算法'], workLocations: ['杭州', '东京'], title: 'FAKE', duty: 'FAKE', requirements: 'FAKE', url: 'https://evil.invalid', date: '2999-01-01', employment: 'full-time', talentPlan: true, jdComplete: false };
    const out = ali.normalizeRecord(job, site);
    a.equal(out.id, String(job.id)); a.equal(out.title, job.name); a.equal(out.city, '杭州/东京'); a.equal(out.category, '技术类//算法');
    a.deepEqual(out.channels, ['social']); a.equal(out.employment, null); a.equal(out.talentPlan, null); a.equal(out.sourceStatus, null);
    a.equal(out.date, null); a.equal(out.dateKind, null);
    a.equal(out.duty, '<tag>&amp; >>>正文<<<\n  内部   空白\n尾'); a.equal(out.requirements, '独立要求\n  两栏不同');
    a.equal(out.description, ''); a.equal(out.jdComplete, true); a.equal(out.url, new URL(job.positionUrl, site.apiOrigin).href);
    const honest = ali.normalizeRecord({ ...job, description: null, requirement: '>>>', categories: null, workLocations: null }, site);
    a.equal(honest.duty, ''); a.equal(honest.requirements, '>>>'); a.equal(honest.category, ''); a.equal(honest.city, ''); a.equal(honest.jdComplete, true);
    const same = ali.normalizeRecord({ ...job, description: '同文', requirement: '同文' }, site);
    a.equal(same.duty, '同文'); a.equal(same.requirements, '同文');
  }
});

test('Real angle-bracket posting keeps literal text; real endpoint-zero fixtures are not empty-source evidence', () => {
  const site = sites.find(s => s.key === 'taotian_social'), job = fixtures.taotian_social.angle.posting;
  a.match(job.requirement, />>>[\s\S]*<<</); a.equal(ali.normalizeRecord(job, site).requirements, job.requirement.replace(/\r\n?/g, '\n').trim());
  for (const site of sites) { const endpoint = fixtures[site.key].endpoint; a.equal(endpoint.response.content.totalCount, 0); a.deepEqual(endpoint.response.content.datas, []);
    const evidence = { version: 1, key: site.key, api: site.api, scans: [{ pages: [endpoint] }, { pages: [endpoint] }] };
    a.throws(() => ali.validateEvidence(evidence, [], site));
  }
});

test('Native IDs, own JD and every observed native metadata field are protected before projection', () => {
  for (const site of sites) {
    const original = sample(site);
    for (const field of Object.keys(original)) { const job = copy(original); delete job[field]; a.throws(() => ali.normalizeRecord(job, site), field); }
    for (const patch of [{ id: 0 }, { id: -1 }, { id: '1' }, { id: Number.MAX_SAFE_INTEGER + 1 }, { id: {} }, { name: ' ' }, { name: 3 }, { description: [] }, { requirement: {} }, { categories: [1] }, { workLocations: '杭州' }, { publishTime: '1790000000000' }, { modifyTime: -1 }, { modifyTime: 9e15 }, { status: 'OPEN' }, { positionType: '全职' }, { channels: ['social'] }, { batchName: '校园' }, { categoryName: '算法' }, { batchId: 123 }, { operations: ['apply'] }, { experience: { from: '3', to: null } }, { regionEnNameMap: [] }, { newNativeJD: '新增完整段落' }, { videoDescription: { text: '未核' } }]) a.throws(() => ali.normalizeRecord({ ...original, ...patch }, site), JSON.stringify(patch));
    ali.validateJobs([{ ...original, description: '', requirement: null, modifyTime: null, publishTime: null }], site);
    a.throws(() => ali.validateJobs([original, copy(original)], site), /Duplicate/);
  }
});

test('Official detail URLs pin origin, path, posting ID and unique matching tracking query', () => {
  for (const site of sites) {
    const job = sample(site), route = '/off-campus/position-detail?positionId=' + job.id;
    for (const positionUrl of ['https://evil.invalid' + route + '&track_id=' + job.trackId, site.apiOrigin.replace('https://', 'https://user:pw@') + route + '&track_id=' + job.trackId, route + '&track_id=' + job.trackId + '#fragment', route + '&track_id=' + job.trackId + '#', route.replace('position-detail', 'other') + '&track_id=' + job.trackId, route.replace(String(job.id), '1') + '&track_id=' + job.trackId, route + '&track_id=wrong', route, route + '&track_id=' + job.trackId + '&x=1', route + '&track_id=' + job.trackId + '&positionId=' + job.id, route + '&track_id=' + job.trackId + '&track_id=' + job.trackId]) a.throws(() => ali.normalizeRecord({ ...job, positionUrl }, site), positionUrl);
    a.throws(() => ali.normalizeRecord({ ...job, trackId: '' }, site));
    a.throws(() => ali.normalizeRecord({ ...job, trackId: 123 }, site));
    a.equal(ali.normalizeRecord({ ...job, positionUrl: site.apiOrigin + job.positionUrl }, site).url, site.apiOrigin + job.positionUrl);
  }
});

test('Full evidence binds first raw array exactly and only the proven dynamic tracking pair may vary', () => {
  for (const site of sites) {
    const job = sample(site), env = envelope(site, [job]);
    const second = env.verification.scans[1].pages[0].response.content.datas;
    second[0] = track(second[0], '-dynamic');
    a.equal(ali.validateEvidence(env.verification, env.jobs, site), true);
    for (const field of ['description', 'requirement', 'publishTime', 'modifyTime', 'name', 'code', 'degree']) {
      const changed = copy(env); const raw = changed.verification.scans[1].pages[0].response.content.datas[0]; raw[field] = typeof raw[field] === 'number' ? raw[field] + 1 : raw[field] + 'changed';
      a.throws(() => ali.validateEvidence(changed.verification, changed.jobs, site), field);
    }
    const metadata = copy(env); metadata.verification.scans[1].pages[0].response.content.datas[0].categories = ['new']; a.throws(() => ali.validateEvidence(metadata.verification, metadata.jobs, site));
    const spelling = copy(env); spelling.verification.scans[1].pages[0].response.content.datas[0].positionUrl = site.apiOrigin + spelling.verification.scans[1].pages[0].response.content.datas[0].positionUrl; a.throws(() => ali.validateEvidence(spelling.verification, spelling.jobs, site));
    const snapshot = copy(env); snapshot.jobs[0] = track(snapshot.jobs[0], '-snapshot-only'); a.throws(() => ali.validateEvidence(snapshot.verification, snapshot.jobs, site));
    const extension = copy(env); extension.verification.scans[1].pages[0].response.content.datas[0].newMetadata = null; a.throws(() => ali.validateEvidence(extension.verification, extension.jobs, site));
  }
});

test('Evidence always replays native HTTP/business/Count/meta/requests/pages, not markers or hashes', () => {
  const site = sites[0], env = envelope(site, [sample(site)]);
  const mutations = [e => delete e.version, e => e.key = 'alias', e => e.api += '?alias=1', e => e.scans.pop(), e => e.scans[0].pages.pop(), e => e.scans[0].pages.push(copy(e.scans[0].pages.at(-1))), e => e.scans[0].pages[0].httpStatus = 302, e => e.scans[0].pages[0].request.regions = '杭州', e => e.scans[0].pages[0].request.pageSize = 100, e => e.scans[0].pages[0].request.extraFilter = '算法', e => e.scans[0].pages[0].response.success = false, e => e.scans[0].pages[0].response.errorCode = 'DENIED', e => delete e.scans[0].pages[0].response.content.totalCount, e => e.scans[0].pages[0].response.content.totalCount = '1', e => e.scans[0].pages[0].response.content.currentPage = 2, e => e.scans[0].pages[0].response.content.pageSize = 500, e => e.scans[0].pages[0].response.content.datas = [], e => e.scans[0].pages[1].response.content.totalCount = 7];
  for (const mutate of mutations) { const evidence = copy(env.verification); mutate(evidence); a.throws(() => ali.validateEvidence(evidence, env.jobs, site)); }
  a.throws(() => ali.validateEvidence(undefined, [], site));
  a.throws(() => ali.validateEvidence({ ready: true, complete: true, hash: 'claimed', verification: true }, [], site));
  a.throws(() => ali.validateEvidence(env.verification, [], site));
  const capped = copy(env.verification); capped.scans[0].pages = Array.from({ length: 200 }, () => copy(capped.scans[0].pages[0])); a.throws(() => ali.validateEvidence(capped, env.jobs, site), /scan evidence/);
  const reordered = envelope(site, rows(site, 2)); reordered.verification.scans[1].pages[0].response.content.datas.reverse(); a.equal(ali.validateEvidence(reordered.verification, reordered.jobs, site), true);
  const reversedJobs = copy(reordered.jobs).reverse(); a.throws(() => ali.validateEvidence(reordered.verification, reversedJobs, site), /first native scan/);
  const inherited = copy(env.verification); const c = inherited.scans[0].pages[0].response.content; const total = c.totalCount; delete c.totalCount; Object.setPrototypeOf(c, { totalCount: total }); a.throws(() => ali.validateEvidence(inherited, env.jobs, site));
});

test('Genuine zero requires two successful native first-page witnesses and retains full evidence', async () => {
  for (const site of sites) {
    const m = mock(site, []), result = await ali.run(site, m.options);
    a.equal(result.complete, true); a.equal(result.total, 0); a.deepEqual(result.jobs, []); a.equal(m.posts, 2);
    a.equal(ali.validateEvidence(result.verification, [], site), true);
    for (const mutate of [e => e.scans.pop(), e => delete e.scans[0].pages[0].response.success, e => e.scans[1].pages[0].request.key = '仅算法', e => e.scans[1].pages[0].response.content.totalCount = 7, e => e.scans[0].pages[0].httpStatus = 403]) { const e = copy(result.verification); mutate(e); a.throws(() => ali.validateEvidence(e, [], site)); }
  }
});

test('Serial anonymous two-wide scans retain raw native responses and require the extra empty endpoint', async () => {
  for (const site of sites) {
    const m = mock(site, rows(site, 11)), result = await ali.run(site, m.options);
    a.equal(result.total, 11); a.equal(result.jobs.length, 11); a.equal(m.posts, 6);
    a.equal(m.delays.length, m.calls.length - 1); a.equal(m.delays.every(ms => ms >= 200), true);
    a.deepEqual(result.jobs, result.verification.scans[0].pages.flatMap(p => p.response.content.datas));
    a.equal(ali.validateEvidence(result.verification, result.jobs, site), true);
    a.equal(Object.hasOwn(result.jobs[0], 'listJDVerified'), false); a.equal(Object.hasOwn(result.jobs[0], 'canonicalFacts'), false);
    for (const call of m.calls) { a.equal(call.init.redirect, 'manual'); a.equal(call.init.signal instanceof AbortSignal, true); a.equal(Object.hasOwn(call.init.headers, 'User-Agent'), false); a.equal(new URL(call.url).origin, site.apiOrigin); }
    const request = m.calls.find(c => c.init.method === 'POST');
    a.equal(request.init.headers.Origin, site.apiOrigin); a.equal(request.init.headers.Referer, site.url); a.match(request.init.headers.Cookie, /SESSION=offline-session/);
    a.equal(new URL(request.url).searchParams.get('_csrf'), site.key === 'taotian_social' || site.key === 'ele_social' || site.key === 'dingtalk_social' || site.key === 'quark_social' ? 'offline-csrf' : 'offline-bootstrap-csrf');
    a.equal(Object.hasOwn(request.init.headers, 'X-XSRF-TOKEN'), ali.PROFILES.find(p => p.key === site.key).csrfMode === 'cookie');
  }
});

test('Endpoint can retain native total only AFTER all postings are accounted for', async () => {
  const site = sites[0], jobs = rows(site, 2), m = mock(site, jobs, { mutate: (r, body) => { if (body.pageIndex === 2) r.content.totalCount = jobs.length; } });
  const result = await ali.run(site, m.options); a.equal(result.total, 2); a.equal(ali.validateEvidence(result.verification, result.jobs, site), true);
});

test('Early empty/short pages, duplicates, Count drift and page caps fail immediately without retry', async () => {
  const site = sites[0];
  for (const mutate of [
    r => { r.content.datas = []; }, r => { r.content.datas.pop(); },
    r => { r.content.datas[1] = copy(r.content.datas[0]); }, r => { r.content.totalCount = 2000; },
    r => { r.content.currentPage = 1; r.content.pageSize = 500; }
  ]) {
    const m = mock(site, rows(site, 11), { mutate }); await a.rejects(ali.run(site, m.options)); a.equal(m.posts, 1);
  }
  const drift = mock(site, rows(site, 11), { mutate: (r, body) => { if (body.pageIndex === 2) r.content.totalCount++; } }); await a.rejects(ali.run(site, drift.options)); a.equal(drift.posts, 2);
  const early = mock(site, rows(site, 11), { mutate: (r, body) => { if (body.pageIndex === 2) { r.content.datas = []; r.content.totalCount = 0; } } }); await a.rejects(ali.run(site, early.options)); a.equal(early.posts, 2);
  const duplicateAcrossPages = mock(site, rows(site, 11), { mutate: (r, body) => { if (body.pageIndex === 2) r.content.datas[0] = track(rows(site, 1)[0], '-round-1'); } }); await a.rejects(ali.run(site, duplicateAcrossPages.options), /Duplicate/); a.equal(duplicateAcrossPages.posts, 2);
  const lowered = mock(site, rows(site, 11)); await a.rejects(ali.run(site, { ...lowered.options, maxPages: 3 })); a.equal(lowered.posts, 1);
  const stableDrift = mock(site, rows(site, 2), { mutate: (r, body, round) => { if (round === 2 && body.pageIndex === 1) r.content.datas[0].requirement += 'single-round drift'; } }); await a.rejects(ali.run(site, stableDrift.options), /raw facts/);
});

test('Only the observed brands same-origin/same-path lang-removal 302 is allowed, never login/external redirects', async () => {
  for (const site of sites.filter(s => ali.PROFILES.find(p => p.key === s.key).languageRedirect)) {
    const m = mock(site, [], { redirect: true }); a.equal((await ali.run(site, m.options)).total, 0);
    a.equal(m.calls.length, 4); a.equal(m.calls[1].url, site.url.replace('?lang=zh', '')); a.equal(m.delays.every(ms => ms >= 200), true);
    for (const location of ['https://evil.invalid/off-campus/position-list', site.apiOrigin + '/login', site.apiOrigin + '/off-campus/position-list?other=1', site.apiOrigin.replace('https://', 'https://user@') + '/off-campus/position-list']) {
      const bad = mock(site, [], { redirect: true, location }); await a.rejects(ali.run(site, bad.options)); a.equal(bad.calls.length, 1);
    }
    const repeated = mock(site, [], { bootstrapStatus: 302 }); await a.rejects(ali.run(site, repeated.options)); a.equal(repeated.calls.length, 2);
  }
  // Core bootstraps use their recorded successful final URLs directly; no redirect is authorized.
  for (const core of sites.filter(s => !ali.PROFILES.find(p => p.key === s.key).languageRedirect)) {
    const m = mock(core, [], { redirect: true }); await a.rejects(ali.run(core, m.options)); a.equal(m.calls.length, 1);
  }
});

test('HTTP/business/unknown failures stop once, with no retries, fallback CSRF, UA or SDK tricks', async () => {
  const site = sites[0];
  for (const config of [{ bootstrapStatus: 403 }, { bootstrapStatus: 500 }, { html: '<html>login</html>' }, { listStatus: 403 }, { listStatus: 302 }, { throwAt: 1 }, { throwAt: 2 }, { mutate: r => { r.success = false; } }, { mutate: r => { r.content = null; } }, { mutate: r => { delete r.content.totalCount; } }, { mutate: r => { r.content.totalCount = '0'; } }]) {
    const m = mock(site, [], config); await a.rejects(ali.run(site, m.options)); a.equal(m.calls.length <= 2, true); a.equal(m.posts <= 1, true);
  }
  const cookie = sites.find(s => s.key === 'taotian_social'), m = mock(cookie, []);
  const original = m.options.fetchImpl; m.options.fetchImpl = async (...args) => { const r = await original(...args); r.headers.getSetCookie = () => ['SESSION=x; Path=/']; return r; };
  await a.rejects(ali.run(cookie, m.options), /CSRF absent/); a.equal(m.posts, 0);
});

test('Cookie path/domain/secure/expiry semantics protect ordinary same-origin anonymous requests', async () => {
  const site = sites[0], m = mock(site, []), original = m.options.fetchImpl;
  m.options.fetchImpl = async (...args) => { const r = await original(...args); r.headers.getSetCookie = () => ['ROOT=ok; Path=/; Secure', 'PATH=private; Path=/off-campus', 'OTHER=bad; Domain=evil.invalid; Path=/', 'DEAD=bad; Path=/; Max-Age=0']; return r; };
  await ali.run(site, m.options);
  for (const call of m.calls.filter(c => c.init.method === 'POST')) a.equal(call.init.headers.Cookie, 'ROOT=ok');
});

test('All wrapper host calls use the same verified complete envelope and cannot run unknown/cloud portals', async () => {
  for (const site of sites) { const m = mock(site, []), result = await ali.fetchAllFor(new URL(site.apiOrigin).hostname, m.options); a.equal(result.complete, true); a.equal(ali.validateEvidence(result.verification, result.jobs, site), true); }
});

test('Offline CLI atomically replaces raw only after both native scans; failures leave the baseline intact', t => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ande-ali-cli-mock-')); t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const raw = path.join(dir, 'raw.json'), preload = path.join(dir, 'mock.cjs'), script = path.resolve(__dirname, '../crawler/lib/custom/ali_social_common.js');
  fs.writeFileSync(raw, 'preserved');
  const payload = pageResponse(sites[0], [], 1, 0);
  fs.writeFileSync(preload, 'globalThis.fetch=async(url,init)=>({status:200,headers:{getSetCookie:()=>[],get:()=>null},text:async()=>\'window.__sysconfig = {__token__: "offline-csrf"};\',json:async()=>('+JSON.stringify(payload)+')});\n');
  const success = spawnSync(process.execPath, ['--require', preload, script, JSON.stringify(sites[0]), raw], { encoding: 'utf8', timeout: 5000 });
  a.equal(success.status, 0, success.stderr); a.match(success.stdout, /DONE fetched=0/);
  const result = JSON.parse(fs.readFileSync(raw, 'utf8')); a.equal(result.complete, true); a.equal(result.total, 0); a.equal(result.verification.scans.length, 2); a.equal(ali.validateEvidence(result.verification, result.jobs, sites[0]), true);
  const before = fs.readFileSync(raw, 'utf8'); payload.content.pageSize = 500;
  fs.writeFileSync(preload, 'globalThis.fetch=async(url,init)=>({status:200,headers:{getSetCookie:()=>[],get:()=>null},text:async()=>\'window.__sysconfig = {__token__: "offline-csrf"};\',json:async()=>('+JSON.stringify(payload)+')});\n');
  const failure = spawnSync(process.execPath, ['--require', preload, script, JSON.stringify(sites[0]), raw], { encoding: 'utf8', timeout: 5000 });
  a.equal(failure.status, 1); a.match(failure.stderr, /metadata changed/); a.equal(fs.readFileSync(raw, 'utf8'), before); a.deepEqual(fs.readdirSync(dir).sort(), ['mock.cjs', 'raw.json']);
});

test('CLI refuses unqualified sites without touching the existing raw output or making any network request', t => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ande-ali-cli-offline-')); t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const raw = path.join(dir, 'raw.json'); fs.writeFileSync(raw, 'preserved');
  const site = { ...sites[0], ats: 'generic' }, result = spawnSync(process.execPath, [path.resolve(__dirname, '../crawler/lib/custom/ali_social_common.js'), JSON.stringify(site), raw], { encoding: 'utf8', timeout: 5000 });
  a.equal(result.status, 1); a.match(result.stderr, /Unverified Ali/); a.equal(fs.readFileSync(raw, 'utf8'), 'preserved'); a.deepEqual(fs.readdirSync(dir), ['raw.json']);
});
