'use strict';
const test = require('node:test'), a = require('node:assert/strict');
const fs = require('node:fs'), os = require('node:os'), path = require('node:path');
const b = require('../crawler/lib/custom/vivo_social_portal');
const site = { key: 'vivo_social', company: 'vivo', ats: 'custom', adapter: 'vivo-social-portal-v1', track: 'social', batch: '社招', exclude: '(无)',
  origin: 'https://hr.vivo.com', url: 'https://hr.vivo.com/jobs', api: 'https://hr.vivo.com/api/social/webSite/portal/page', listJD: true,
  body: { city_code_list: [], company_id: 1, group_id: 1, user_id: null, job_category_id_list: [], keyword: '', max_results: 100, page: 1, yoe_list: [], loading: true } };
function row(n = 0) {
  return { job_id: n ? 'M202763218665451929' + n : 'M2027632186654519297', job_code: 'H8644Q', job_title: 'AI产品规划专家', requirement_org_name: 'AI产品部',
    job_category: '产品运营类', job_category_id: 'M1718986621235408897', job_location_list: [{ city: '深圳', id: 'M2108040782515965953' }],
    job_desc: '岗位职责：\n负责vivo手机AI中长期产品战略\n\n任职要求：\n学历与专业：本科及以上', publish_timestamp: 1791431067964, hot: false, collect_flag: false, forward: true, yoe_min: 5, yoe_max: -1 };
}
function page(n = 1, posts = [row()], total = 119, pages = 2) {
  return { request: { url: site.api, method: 'POST', headers: { 'Content-Type': 'application/json;charset=UTF-8', Accept: 'application/json, text/plain, */*', Origin: site.origin, Referer: site.url },
    body: { ...structuredClone(site.body), page: n } }, httpStatus: 200,
    response: { code: 0, message: 'success', data: posts, meta: { page: n, total, page_count: pages, max_results: 100 }, success: true } };
}
function sample() { return b.collectAvailable([page()], site); }

test('vivo social native M identity stays separate from display code; HTML single body never guesses independent sections or dates', () => {
  a.deepEqual(b.PROFILES, [site]); const r = sample();
  a.equal(r.complete, false); a.equal(r.total, 1); a.deepEqual(r.jobs, [{ post: row() }]);
  a.deepEqual(b.validateEvidence(r.verification, r.jobs, site).jobs, r.jobs);
  a.deepEqual(b.normalizeRecord(r.jobs[0], site), { id: 'M2027632186654519297', title: 'AI产品规划专家', category: '产品运营类', city: '深圳',
    channels: ['social'], employment: null, talentPlan: null, date: null, dateKind: null, sourceStatus: null,
    url: 'https://hr.vivo.com/job-detail?_irjid=M2027632186654519297&_irjc=M1718986621235408897',
    duty: '', requirements: '', description: '岗位职责：\n负责vivo手机AI中长期产品战略\n任职要求：\n学历与专业：本科及以上', jdComplete: false });
});

test('vivo unsigned native POSTs finish each body before >=200ms next start; meta page_count, not short pages, controls pagination', async () => {
  let clock = 0, busy = false; const starts = [], calls = [];
  const result = await b.fetchAvailable(site, { now: () => clock, sleep: async ms => { a.equal(busy, false); a.equal(ms, 193); clock += ms; }, fetchImpl: async (url, options) => {
    a.equal(busy, false); busy = true; starts.push(clock); calls.push(url);
    const n = JSON.parse(options.body).page, expected = page(n, [row(n)], 20, 2);
    a.equal(options.method, 'POST'); a.deepEqual(options.headers, expected.request.headers); a.deepEqual(JSON.parse(options.body), expected.request.body);
    a.equal(options.redirect, 'error'); a.ok(options.signal instanceof AbortSignal);
    return { status: 200, json: async () => { await Promise.resolve(); clock += 7; busy = false; return expected.response; } };
  } });
  a.deepEqual(calls, [site.api, site.api]); a.deepEqual(starts, [0, 200]); a.equal(result.total, 2); a.equal(result.complete, false);
  a.equal(result.verification.stopped, null); a.equal(b.validateEvidence(result.verification, result.jobs, site).total, 2);
});

test('vivo slow bodies already satisfy the start interval; no extra post-response cooldown', async () => {
  let clock = 0; const starts = [];
  await b.fetchAvailable(site, { now: () => clock, sleep: async () => a.fail('300ms body needs no extra cooldown'), fetchImpl: async (_, options) => {
    starts.push(clock); const n = JSON.parse(options.body).page;
    return { status: 200, json: async () => { clock += 300; return page(n, [row(n)], 119, 2).response; } };
  } });
  a.deepEqual(starts, [0, 300]);
});

test('vivo exact frozen social scope rejects campus qualification, removed adapter and changed organization/filters', async () => {
  a.ok(Object.isFrozen(b.PROFILES) && Object.isFrozen(b.PROFILES[0].body.city_code_list)); a.equal(b.verifiedSource(site), true);
  for (const patch of [{ key: 'vivo' }, { key: 'alias' }, { company: 'iQOO' }, { ats: 'beisen' }, { adapter: undefined }, { track: 'campus' },
    { url: 'https://hr-campus.vivo.com/jobs' }, { api: site.api + '?fake=1' }, { body: { ...site.body, company_id: 0 } }, { body: { ...site.body, group_id: 0 } },
    { body: { ...site.body, max_results: 10 } }, { body: { ...site.body, keyword: 'AI' } }, { body: { ...site.body, user_id: 'M1' } }, { body: { ...site.body, yoe_list: [5] } }]) {
    const bad = { ...site, ...patch }; a.equal(b.requiresVerification(bad), true); a.equal(b.verifiedSource(bad), false);
    await a.rejects(b.fetchAvailable(bad, { fetchImpl: () => a.fail('unqualified source must never request') }), /unverified source/);
  }
  const absent = structuredClone(site); delete absent.adapter; a.equal(b.requiresVerification(absent), true); a.equal(b.verifiedSource(absent), false);
  a.equal(b.requiresVerification({ key: 'vivo', ats: 'beisen', url: 'https://hr-campus.vivo.com/jobs' }), false);
  a.equal(b.verifiedSource({ key: 'vivo', ats: 'beisen', url: 'https://hr-campus.vivo.com/jobs' }), false);
  for (const bad of [{ url: 'https://HR.VIVO.COM:443/jobs' }, { api: 'POST ' + site.api }, { origin: '%' }, { detailApi: null }]) a.equal(b.requiresVerification(bad), true);
  a.equal(b.portalNotice({}), ''); a.match(b.portalNotice(site), /company_id=1.*有界诊断.*完整性未验证.*不继承校园/);
});
test('vivo entire HTML single body converts once without guessed section splitting, title code suffix or truncated city order', () => {
  const post = { ...row(), job_title: '  岗位原标题  ', job_desc: '<p>岗位职责 &amp; &lt;List&lt;T&gt;&gt;</p><p>任职要求<br>全量结尾</p><script>hidden()</script>',
    job_location_list: [{ city: '西安' }, { city: '杭州' }, { city: '深圳' }, { city: '杭州' }] };
  const j = b.normalizeRecord({ post }, site);
  a.equal(j.title, '  岗位原标题  '); a.equal(j.city, '西安/杭州/深圳/杭州'); a.equal(j.description, '岗位职责 & <List<T>>\n任职要求\n全量结尾');
  a.equal(j.duty, ''); a.equal(j.requirements, ''); a.equal(j.jdComplete, false);
  const long = '全部长文'.repeat(1000); a.equal(b.normalizeRecord({ post: { ...post, job_desc: long } }, site).description, long);
  for (const value of ['', null, '/']) {
    const result = b.collectAvailable([page(1, [{ ...post, job_desc: value, job_location_list: null, job_category: null }], 1, 1)], site);
    const out = b.normalizeRecord(result.jobs[0], site); a.equal(out.description, value ?? ''); a.equal(out.city, ''); a.equal(out.category, ''); a.equal(out.jdComplete, false);
    a.deepEqual([out.employment, out.talentPlan, out.date, out.dateKind, out.sourceStatus], [null, null, null, null, null]);
  }
  const noDisplayCode = { ...post }; delete noDisplayCode.job_code;
  a.equal(b.normalizeRecord({ post: noDisplayCode }, site).id, post.job_id);
  const noCategoryId = { ...post }; delete noCategoryId.job_category_id;
  a.equal(b.normalizeRecord({ post: noCategoryId }, site).url, 'https://hr.vivo.com/job-detail?_irjid=M2027632186654519297');
});
test('vivo raw wrappers detach/freeze inputs, skip illegal records, preserve first duplicate and report total drift', () => {
  const post = row(), first = page(1, [post, { ...row(1), job_desc: {} }], 40, 4), blank = { ...row(), job_desc: '', job_location_list: [{ city: '东莞' }] };
  const result = b.collectAvailable([first, page(2, [blank, row(2)], 28, 3), page(3, [], 27, 3)], site);
  a.equal(result.total, 2); a.equal(result.jobs[0].post.job_desc, post.job_desc); a.equal(result.jobs[1].post.job_id, row(2).job_id);
  a.strictEqual(result.jobs[0].post, result.verification.pages[0].response.data[0]); a.ok(Object.isFrozen(result.jobs[0].post.job_location_list[0]));
  post.job_desc = 'caller mutation'; first.request.body.city_code_list.push('filter'); a.notEqual(result.jobs[0].post.job_desc, post.job_desc); a.deepEqual(result.verification.pages[0].request.body.city_code_list, []);
  a.match(result.issues.join(';'), /列表记录未应用/); a.match(result.issues.join(';'), /重复官方id 1/); a.match(result.issues.join(';'), /官方total 40→28→27；实际唯一岗位 2/);
  a.throws(() => b.validateJobs([result.jobs[0], result.jobs[0]], site), /duplicate/);
  a.throws(() => b.collectAvailable([...result.verification.pages, page(4)], site), /extra request/);
});
test('vivo source/request/HTTP/native/JD/all metadata bindings reject tampering, string totals and numeric/fallback identities', () => {
  const original = sample();
  for (const mutate of [
    r => r.verification.key = 'vivo', r => r.verification.api += '?filter=AI', r => r.verification.policy = 'complete', r => r.verification.complete = true,
    r => r.verification.version = 2, r => r.verification.pages[0].httpStatus = 403, r => r.verification.pages[0].request.method = 'GET',
    r => r.verification.pages[0].request.url += '?fake=1', r => r.verification.pages[0].request.body.page = 0, r => r.verification.pages[0].request.body.max_results = 10,
    r => r.verification.pages[0].request.body.company_id = 0, r => r.verification.pages[0].request.body.group_id = 0, r => r.verification.pages[0].request.body.keyword = 'AI',
    r => r.verification.pages[0].request.headers.Origin += '/', r => r.verification.pages[0].request.headers.Referer = site.origin + '/',
    r => r.verification.pages[0].request.headers['User-Agent'] = 'Chrome spoof', r => r.verification.pages[0].request.headers.Cookie = 'session=secret',
    r => r.verification.pages[0].response.code = '0', r => r.verification.pages[0].response.message = 'refused', r => r.verification.pages[0].response.success = false,
    r => r.verification.pages[0].response.data = {}, r => r.verification.pages[0].response.data = Array(1), r => r.verification.pages[0].response.meta.page = '1',
    r => r.verification.pages[0].response.meta.max_results = 10, r => r.verification.pages[0].response.meta.total = '119', r => r.verification.pages[0].response.meta.page_count = null,
    r => r.verification.pages[0].response.data[0].job_desc = 'tampered native JD', r => r.jobs[0].post.job_desc = 'invented JD',
    r => r.jobs[0].post.publish_timestamp = 1, r => r.jobs[0].post.job_code = 'other display code', r => r.jobs[0].post.collect_flag = true, r => r.jobs[0].extra = true
  ]) { const bad = JSON.parse(JSON.stringify(original)); mutate(bad); a.throws(() => b.validateEvidence(bad.verification, bad.jobs, site)); }
  for (const invalid of [{ ...row(), job_id: 2027632186654519297 }, { ...row(), job_id: 'H8644Q' }, { ...row(), job_id: '' }, { ...row(), job_id: 'M1&unsafe=1' },
    { ...row(), job_title: null }, { ...row(), job_desc: [] }, { ...row(), job_category: 5 }, { ...row(), job_location_list: [null] }, { ...row(), job_category_id: 'M1&unsafe=1' }]) {
    a.throws(() => b.normalizeRecord({ post: invalid }, site));
    const r = b.collectAvailable([page(1, [invalid, row(1)], 2, 1)], site); a.equal(r.total, 1); a.match(r.issues.join(';'), /记录未应用/);
  }
  const missing = row(); delete missing.job_desc; a.throws(() => b.normalizeRecord({ post: missing }, site));
  const missingId = row(); delete missingId.job_id; a.throws(() => b.normalizeRecord({ post: missingId }, site), /job_id/);
  a.throws(() => b.collectAvailable([page(1, [], 0, 0)], site), /zero cannot clear/); a.throws(() => b.validateJobs([], site), /zero cannot clear/);
});
test('vivo HTTP/business/transport/JSON/shape refusal stops immediately, with no retry/fallback and prior usable pages preserved', async () => {
  for (const kind of ['HTTP', 'business', 'transport', 'JSON', 'shape']) {
    let calls = 0;
    const result = await b.fetchAvailable(site, { sleep: async () => {}, fetchImpl: async () => {
      calls++; if (calls === 1) return { status: 200, json: async () => page().response };
      if (kind === 'transport') throw new Error('transport failure');
      const native = page(2, [row(1)]).response;
      if (kind === 'business') native.success = false; if (kind === 'shape') native.data = {};
      return { status: kind === 'HTTP' ? 403 : 200, json: async () => { if (kind === 'JSON') throw new SyntaxError('not JSON'); return native; } };
    } });
    a.equal(calls, 2); a.equal(result.total, 1); a.equal(result.complete, false); a.match(result.issues.join(';'), /请求停止/);
    a.equal(result.verification.stopped.request.body.page, 2); a.equal(b.validateEvidence(result.verification, result.jobs, site).total, 1);
    const bad = structuredClone(result); bad.verification.stopped.request.body.page = 3; a.throws(() => b.validateEvidence(bad.verification, bad.jobs, site), /stopped request/);
    const disguised = structuredClone(result); disguised.verification.stopped.httpStatus = 200; disguised.verification.stopped.response = page(2).response;
    a.throws(() => b.validateEvidence(disguised.verification, disguised.jobs, site), /successful page/);
  }
  let calls = 0; await a.rejects(b.fetchAvailable(site, { fetchImpl: async () => { calls++; return { status: 429 }; } }), /HTTP/); a.equal(calls, 1);
});
test('vivo 200-page/900s safety bounds report partial coverage rather than inventing complete or a zero', async () => {
  let calls = 0;
  const capped = await b.fetchAvailable(site, { sleep: async () => {}, fetchImpl: async (_, options) => {
    calls++; return { status: 200, json: async () => page(JSON.parse(options.body).page, [row()], 3000, 300).response };
  } });
  a.equal(calls, 200); a.equal(capped.total, 1); a.equal(capped.complete, false); a.match(capped.issues.join(';'), /安全上限/);
  let clock = 0; calls = 0;
  const timed = await b.fetchAvailable(site, { now: () => clock, sleep: async ms => { clock += ms; }, fetchImpl: async () => {
    calls++; return { status: 200, json: async () => { clock = 900000; return page().response; } };
  } });
  a.equal(calls, 1); a.equal(timed.total, 1); a.equal(timed.verification.stopped, null); a.match(timed.issues.join(';'), /进程安全时限/);
  for (const maxPages of [0, 201, 1.5]) await a.rejects(b.fetchAvailable(site, { maxPages, fetchImpl: () => a.fail('invalid limit must not request') }), /limits/);
});
test('vivo atomic run writes only available envelopes and preserves an old candidate on refusal or unproved zero', async t => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ande-vivo-social-test-')); t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const file = path.join(dir, 'candidate.json'); fs.writeFileSync(file, 'old real candidate');
  for (const native of [null, page(1, [], 0, 0).response]) {
    await a.rejects(b.run([JSON.stringify(site), file], { fetchImpl: async () => native ? { status: 200, json: async () => native } : { status: 403 } }));
    a.equal(fs.readFileSync(file, 'utf8'), 'old real candidate'); a.deepEqual(fs.readdirSync(dir), ['candidate.json']);
  }
  const written = await b.run([JSON.stringify(site), file], { fetchImpl: async () => ({ status: 200, json: async () => page(1, [row()], 1, 1).response }) });
  a.equal(written.mode, 'custom'); a.equal(written.key, site.key); a.equal(written.api, site.api); a.equal(written.complete, false);
  a.deepEqual(JSON.parse(fs.readFileSync(file, 'utf8')), written); a.deepEqual(fs.readdirSync(dir), ['candidate.json']);
});

const observedFile = '/path/to/wheres-my-job-work/third-batch-20261008T071347946Z/node-first/vivo_social.json';
test('vivo offline parent normal Node 100-row capture binds actual plain wire body/headers and preserves all M ids/full raw metadata', { skip: !fs.existsSync(observedFile) }, () => {
  const raw = JSON.parse(fs.readFileSync(observedFile, 'utf8'));
  a.equal(raw.httpStatus, 200); a.deepEqual(raw.request.body, site.body);
  a.deepEqual(raw.response.meta, { page: 1, total: 119, page_count: 2, max_results: 100 }); a.equal(raw.response.data.length, 100);
  const result = b.collectAvailable([{ request: raw.request, httpStatus: raw.httpStatus, response: raw.response }], site);
  a.equal(result.total, 100); a.equal(result.complete, false); a.deepEqual(result.jobs.map(j => j.post), raw.response.data);
  a.deepEqual(result.verification.pages[0].request, raw.request); a.deepEqual(result.verification.pages[0].response, raw.response);
  a.equal(b.validateEvidence(result.verification, result.jobs, site).total, 100);
});
