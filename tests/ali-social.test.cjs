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

test('Official detail URLs pin origin, path, posting ID and unique matching tracking query', () => {
  for (const site of sites) {
    const job = sample(site), route = '/off-campus/position-detail?positionId=' + job.id;
    for (const positionUrl of ['https://evil.invalid' + route + '&track_id=' + job.trackId, site.apiOrigin.replace('https://', 'https://user:pw@') + route + '&track_id=' + job.trackId, route + '&track_id=' + job.trackId + '#fragment', route + '&track_id=' + job.trackId + '#', route.replace('position-detail', 'other') + '&track_id=' + job.trackId, route.replace(String(job.id), '1') + '&track_id=' + job.trackId, route + '&track_id=wrong', route, route + '&track_id=' + job.trackId + '&x=1', route + '&track_id=' + job.trackId + '&positionId=' + job.id, route + '&track_id=' + job.trackId + '&track_id=' + job.trackId]) a.throws(() => ali.normalizeRecord({ ...job, positionUrl }, site), positionUrl);
    a.throws(() => ali.normalizeRecord({ ...job, trackId: '' }, site));
    a.throws(() => ali.normalizeRecord({ ...job, trackId: 123 }, site));
    a.equal(ali.normalizeRecord({ ...job, positionUrl: site.apiOrigin + job.positionUrl }, site).url, site.apiOrigin + job.positionUrl);
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

test('Registered key + adapter qualifies; rekeyed, missing-adapter and Cloud keys do not', () => {
  for (const site of sites) {
    a.equal(ali.verifiedSource(site), true);
    for (const bad of [{ ...site, key: 'ali_alias' }, { ...site, adapter: undefined }, { ...site, key: 'aliyun_social' }]) {
      a.equal(ali.verifiedSource(bad), false); a.throws(() => ali.normalizeRecord(sample(site), bad)); a.throws(() => ali.validateJobs([], bad));
    }
  }
  ali.validateJobs([sample(sites[0])], sites[0]); a.throws(() => ali.validateJobs({}, sites[0])); a.throws(() => ali.validateJobs([], sites[0]), /zero cannot clear/);
});

test('Projection tolerates unknown or missing native metadata but needs id, title and an official link', () => {
  for (const site of sites) {
    const original = sample(site), out = ali.normalizeRecord({ ...original, newNativeField: 'x', status: 'OPEN', description: undefined, experience: undefined }, site);
    a.equal(out.duty, ''); a.equal(out.requirements, original.requirement.replace(/\r\n?/g, '\n').trim()); a.equal(out.id, String(original.id));
    ali.validateJobs([original, { ...original, id: original.id + 1 }], site);
    for (const bad of [{ id: 0 }, { id: '1' }, { name: ' ' }, { trackId: '' }, { positionUrl: 'https://evil.invalid' + original.positionUrl }]) a.throws(() => ali.normalizeRecord({ ...original, ...bad }, site), JSON.stringify(bad));
  }
});

test('Single scan keeps raw jobs, requests are serial and anonymous, and nothing is recorded as drift', async () => {
  for (const site of sites) {
    const m = mock(site, rows(site, 11)), result = await ali.run(site, m.options);
    a.equal(result.total, 11); a.equal(result.jobs.length, 11); a.equal(m.posts, 2);
    a.deepEqual(result.issues, []); a.deepEqual(ali.validateEvidence(result.verification, result.jobs, site), { issues: [] });
    a.equal(m.delays.length, m.calls.length - 1); a.equal(m.delays.every(ms => ms >= 200), true);
    for (const call of m.calls) { a.equal(call.init.redirect, 'manual'); a.equal(call.init.signal instanceof AbortSignal, true); a.equal(Object.hasOwn(call.init.headers, 'User-Agent'), false); a.equal(new URL(call.url).origin, site.apiOrigin); }
    const request = m.calls.find(c => c.init.method === 'POST');
    a.equal(request.init.headers.Origin, site.apiOrigin); a.equal(request.init.headers.Referer, site.url); a.match(request.init.headers.Cookie, /SESSION=offline-session/);
    a.equal(new URL(request.url).searchParams.get('_csrf'), ['taotian_social', 'ele_social', 'dingtalk_social', 'quark_social'].includes(site.key) ? 'offline-csrf' : 'offline-bootstrap-csrf');
    a.equal(Object.hasOwn(request.init.headers, 'X-XSRF-TOKEN'), ali.PROFILES.find(p => p.key === site.key).csrfMode === 'cookie');
    a.equal(ali.normalizeRecord(result.jobs[0], site).id, String(result.jobs[0].id));
  }
});

test('Total drift, duplicates, bad rows and drift are recorded, not fatal; a failing later page fails the whole run', async () => {
  const site = sites[0], jobs = rows(site, 11);
  const drift = await ali.run(site, mock(site, jobs, { mutate: r => { if (r.content.datas.length) r.content.totalCount = 40; } }).options);
  a.equal(drift.total, 11); a.ok(drift.issues.some(s => s.includes('官方total 40；实际唯一岗位 11')));
  const duplicate = await ali.run(site, mock(site, jobs, { mutate: (r, body) => { if (body.pageIndex === 2) r.content.datas[0] = track(rows(site, 1)[0], '-again'); } }).options);
  a.equal(duplicate.total, 10);
  const bad = await ali.run(site, mock(site, jobs, { mutate: (r, body) => { if (body.pageIndex === 1) r.content.datas[0].positionUrl = 'https://evil.invalid/x'; } }).options);
  a.equal(bad.total, 10); a.ok(bad.issues.some(s => s.includes('缺ID/标题')));
  await a.rejects(ali.run(site, mock(site, jobs, { throwAt: 3 }).options), /offline transport unknown/);
  await a.rejects(ali.run(site, mock(site, []).options), /no usable/);
});

test('Only the observed brands same-origin/same-path lang-removal 302 is allowed, never login/external redirects', async () => {
  for (const site of sites.filter(s => ali.PROFILES.find(p => p.key === s.key).languageRedirect)) {
    const m = mock(site, rows(site, 2), { redirect: true }); a.equal((await ali.run(site, m.options)).total, 2);
    a.equal(m.calls.length, 3); a.equal(m.calls[1].url, site.url.replace('?lang=zh', '')); a.equal(m.delays.every(ms => ms >= 200), true);
    for (const location of ['https://evil.invalid/off-campus/position-list', site.apiOrigin + '/login', site.apiOrigin + '/off-campus/position-list?other=1', site.apiOrigin.replace('https://', 'https://user@') + '/off-campus/position-list']) {
      const bad = mock(site, rows(site, 2), { redirect: true, location }); await a.rejects(ali.run(site, bad.options)); a.equal(bad.calls.length, 1);
    }
    const repeated = mock(site, rows(site, 2), { bootstrapStatus: 302 }); await a.rejects(ali.run(site, repeated.options)); a.equal(repeated.calls.length, 2);
  }
  // Core bootstraps use their recorded successful final URLs directly; no redirect is authorized.
  for (const core of sites.filter(s => !ali.PROFILES.find(p => p.key === s.key).languageRedirect)) {
    const m = mock(core, rows(core, 2), { redirect: true }); await a.rejects(ali.run(core, m.options)); a.equal(m.calls.length, 1);
  }
});

test('Cookie path/domain/secure/expiry semantics protect ordinary same-origin anonymous requests', async () => {
  const site = sites[0], m = mock(site, rows(site, 2)), original = m.options.fetchImpl;
  m.options.fetchImpl = async (...args) => { const r = await original(...args); r.headers.getSetCookie = () => ['ROOT=ok; Path=/; Secure', 'PATH=private; Path=/off-campus', 'OTHER=bad; Domain=evil.invalid; Path=/', 'DEAD=bad; Path=/; Max-Age=0']; return r; };
  await ali.run(site, m.options);
  for (const call of m.calls.filter(c => c.init.method === 'POST')) a.equal(call.init.headers.Cookie, 'ROOT=ok');
});

test('Host wrapper uses the same single-scan envelope and cannot run unknown portals', async () => {
  for (const site of sites) { const m = mock(site, rows(site, 2)), result = await ali.fetchAllFor(new URL(site.apiOrigin).hostname, m.options); a.equal(result.total, 2); }
});

test('Offline CLI atomically replaces raw only after a usable scan; failures leave the baseline intact', t => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ande-ali-cli-mock-')); t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const raw = path.join(dir, 'raw.json'), preload = path.join(dir, 'mock.cjs'), script = path.resolve(__dirname, '../crawler/lib/custom/ali_social_common.js');
  fs.writeFileSync(raw, 'preserved');
  const payload = pageResponse(sites[0], rows(sites[0], 1), 1, 1);
  const install = () => fs.writeFileSync(preload, 'globalThis.fetch=async(url,init)=>({status:200,headers:{getSetCookie:()=>[],get:()=>null},text:async()=>\'window.__sysconfig = {__token__: "offline-csrf"};\',json:async()=>(' + JSON.stringify(payload) + ')});\n');
  install();
  const success = spawnSync(process.execPath, ['--require', preload, script, JSON.stringify(sites[0]), raw], { encoding: 'utf8', timeout: 5000 });
  a.equal(success.status, 0, success.stderr); a.match(success.stdout, /DONE fetched=1/);
  const result = JSON.parse(fs.readFileSync(raw, 'utf8')); a.equal(result.total, 1);
  const before = fs.readFileSync(raw, 'utf8'); payload.success = false; install();
  const failure = spawnSync(process.execPath, ['--require', preload, script, JSON.stringify(sites[0]), raw], { encoding: 'utf8', timeout: 5000 });
  a.equal(failure.status, 1); a.match(failure.stderr, /business refusal/); a.equal(fs.readFileSync(raw, 'utf8'), before); a.deepEqual(fs.readdirSync(dir).sort(), ['mock.cjs', 'raw.json']);
});

test('CLI refuses unqualified sites without touching the existing raw output or making any network request', t => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ande-ali-cli-offline-')); t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const raw = path.join(dir, 'raw.json'); fs.writeFileSync(raw, 'preserved');
  const site = { ...sites[0], adapter: undefined }, result = spawnSync(process.execPath, [path.resolve(__dirname, '../crawler/lib/custom/ali_social_common.js'), JSON.stringify(site), raw], { encoding: 'utf8', timeout: 5000 });
  a.equal(result.status, 1); a.match(result.stderr, /Unverified Ali/); a.equal(fs.readFileSync(raw, 'utf8'), 'preserved'); a.deepEqual(fs.readdirSync(dir), ['raw.json']);
});
