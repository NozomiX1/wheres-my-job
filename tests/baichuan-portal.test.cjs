'use strict';
const test = require('node:test'), a = require('node:assert/strict');
const fs = require('node:fs'), os = require('node:os'), path = require('node:path');
const b = require('../crawler/lib/custom/baichuan_portal');
const [site] = b.PROFILES;
const bodyAt = offset => ({ keyword: '', limit: 10, offset, job_category_id_list: [], tag_id_list: [], location_code_list: [], subject_id_list: [],
  recruitment_id_list: [], portal_type: 6, job_function_id_list: [], storefront_id_list: [], portal_entrance: 1 });
function request(offset = 0) {
  const body = bodyAt(offset), query = new URLSearchParams(Object.entries(body).map(([k, v]) => [k, Array.isArray(v) ? v.join(',') : String(v)]));
  return { url: site.api + '?' + query, method: 'POST', headers: { 'Content-Type': 'application/json', Referer: site.url }, body };
}
function row(n = 1, patch = {}) {
  return { id: String(7680029585811360000n + BigInt(n)), title: '  原官网岗位-源点计划  ', description: '  List<T> &amp; <b>文字</b>\r\n  同文\r尾部\n',
    requirement: '  List<T> &amp; <b>文字</b>\r\n  同文\r尾部\n', city_list: [{ name: '北京' }, { name: '上海' }], job_category: null, job_function: { name: '算法' },
    recruit_type: { id: '202', name: '实习', parent: { name: '校招' } }, publish_time: 1788146288408, channel_online_status: 0,
    job_subject: { name: '源点顶尖人才计划' }, job_post_info: { description: null, requirement: null, job_post_object_value_map: {} }, extraNative: { retained: true }, ...patch };
}
function page(offset, jobs, count = jobs.length) {
  return { request: request(offset), httpStatus: 200, response: { code: 0, data: { job_post_list: jobs, count, extra: { tracking: 'native-extra' } } } };
}
const sample = () => b.collectAvailable([page(0, [row()])], site);
const captureDir = '/tmp/ande-first-batch-special-second-baichuan';
test('Baichuan replays the existing normal Chrome first page: ten complete original raw records, official18/missing8, no new clock',
  { skip: !fs.existsSync(path.join(captureDir, 'network.json')) }, () => {
    const network = JSON.parse(fs.readFileSync(path.join(captureDir, 'network.json'), 'utf8'));
    const observed = network.find(r => new URL(r.request.url).pathname === '/api/v1/search/job/posts' && r.nativeJSON);
    a.ok(observed); a.equal(observed.response.httpStatus, 200); a.equal(observed.nativeJSON.data.count, 18);
    a.match(observed.request.url, /_signature=\[REDACTED\]/);
    a.deepEqual(observed.request.body.value, bodyAt(0));
    const url = new URL(observed.request.url); url.searchParams.delete('_signature');
    const publicRequest = { url: url.href, method: observed.request.method, headers: {
      'Content-Type': observed.request.headers['Content-Type'], Referer: observed.request.headers.Referer }, body: observed.request.body.value };
    a.deepEqual(publicRequest, request());
    const r = b.collectAvailable([{ request: publicRequest, httpStatus: observed.response.httpStatus, response: observed.nativeJSON }], site,
      ['正常Node无签名POST返回HTTP405，已停止百川请求；本次复用既有官网Chrome资料，不冒新采集']);
    a.equal(r.complete, false); a.equal(r.total, 10); a.equal(r.verification.policy, 'available');
    a.match(r.issues.join(';'), /HTTP405/); a.match(r.issues.join(';'), /官方total 18；实际唯一岗位 10；尚未取得 8 岗/);
    a.match(r.issues.join(';'), /分页未穷尽/); a.deepEqual(r.verification.pages[0].response, observed.nativeJSON);
    a.deepEqual(r.jobs.map(j => j.post), observed.nativeJSON.data.job_post_list);
    const dom = JSON.parse(fs.readFileSync(path.join(captureDir, 'dom.json'), 'utf8'));
    for (const job of r.jobs) {
      const post = job.post, normalized = b.normalizeRecord(job, site);
      a.equal(normalized.title, post.title); a.equal(normalized.duty, post.description); a.equal(normalized.requirements, post.requirement);
      a.equal(normalized.description, ''); a.equal(normalized.jdComplete, false); a.match(normalized.id, /^[1-9][0-9]{18}$/);
      a.equal(normalized.url, site.url + '/position/' + post.id + '/detail'); a.ok(dom.links.some(l => l.href === normalized.url));
      a.deepEqual([normalized.talentPlan, normalized.date, normalized.dateKind, normalized.sourceStatus], [null, null, null, null]);
    }
    a.deepEqual(b.validateEvidence(r.verification, r.jobs, site).jobs, r.jobs);
    a.equal(JSON.parse(fs.readFileSync(path.join(captureDir, 'report.json'), 'utf8')).finishedAt, '2026-10-07T16:38:01.858Z');
    a.equal(Object.hasOwn(r, 'finishedAt'), false); a.equal(JSON.stringify(r).includes('_signature'), false);
  });
test('Baichuan pins just one immutable campus profile and the exact observed unsigned body, not index/social or filtered scope', () => {
  a.deepEqual(b.PROFILES, [{ key: 'baichuan', company: '百川智能', ats: 'custom', adapter: 'baichuan-portal-v1', track: 'campus',
    batch: '校园招聘入口（项目/职能不限）', exclude: '(无)', origin: 'https://cq6qe6bvfr6.jobs.feishu.cn', url: 'https://cq6qe6bvfr6.jobs.feishu.cn/646926',
    api: 'https://cq6qe6bvfr6.jobs.feishu.cn/api/v1/search/job/posts', websitePath: '646926', portalType: 6, subjectIdList: [], listJD: true, body: bodyAt(0) }]);
  a.ok(Object.isFrozen(site)); a.ok(Object.isFrozen(site.body.subject_id_list)); a.ok(Object.isFrozen(site.subjectIdList));
  a.equal(b.verifiedSource(structuredClone(site)), true); a.equal(b.requiresVerification(site), true);
  for (const patch of [{ key: 'baichuan_social' }, { company: 'alias' }, { ats: 'feishu' }, { adapter: undefined }, { track: 'social' }, { listJD: false },
    { origin: 'https://campus.baichuan-inc.com' }, { url: site.origin + '/index' }, { url: site.url + '?keyword=AI' }, { websitePath: 'index' },
    { portalType: 2 }, { subjectIdList: ['plan'] }, { portalPaths: ['646926', 'index'] }, { api: site.api + '?_signature=fake' },
    { body: { ...site.body, keyword: 'AI' } }, { body: { ...site.body, subject_id_list: ['plan'] } }, { body: { ...site.body, limit: 50 } },
    { linkTemplate: 'https://evil.example/{id}' }]) {
    const bad = { ...site, ...patch }; a.equal(b.verifiedSource(bad), false); a.equal(b.requiresVerification(bad), true); a.throws(() => b.validateJobs([], bad));
  }
  const deleted = structuredClone(site); delete deleted.adapter; a.equal(b.requiresVerification(deleted), true); a.equal(b.verifiedSource(deleted), false);
  for (const uri of ['https://CAMPUS.BAICHUAN-INC.COM:443/', 'https://CQ6QE6BVFR6.JOBS.FEISHU.CN.:443/index', 'https://user:pw@cq6qe6bvfr6.jobs.feishu.cn/unknown',
    'POST ' + site.api, 'relative', null, 5]) a.equal(b.requiresVerification({ key: 'alias', adapter: undefined, ats: 'moka', api: uri }), true);
  a.equal(b.requiresVerification({ url: 'https://example.com/' }), false); a.equal(b.portalNotice({}), '');
  a.match(b.portalNotice(site), /646926.*项目\/职能不限.*完整性未验证/);
});
test('Baichuan preserves complete TEXT/title/CR/whitespace and exact named facts; no numeric/title/project/date/status inference', () => {
  const r = sample(), native = row(), normalized = b.normalizeRecord(r.jobs[0], site);
  a.deepEqual(r.jobs[0].post, native); a.deepEqual(r.verification.pages[0].response.data.extra, { tracking: 'native-extra' });
  a.equal(normalized.title, native.title); a.equal(normalized.duty, native.description); a.equal(normalized.requirements, native.requirement);
  a.equal(normalized.description, ''); a.equal(normalized.jdComplete, false); a.equal(normalized.city, '北京/上海'); a.equal(normalized.category, '算法');
  a.deepEqual(normalized.channels, ['campus']); a.equal(normalized.employment, 'internship');
  a.deepEqual([normalized.talentPlan, normalized.date, normalized.dateKind, normalized.sourceStatus], [null, null, null, null]);
  for (const recruit_type of [null, { id: '202', name: '正式' }, { name: '全职', parent: { name: '社会招聘' } }, { name: ' 实习 ', parent: { name: ' 校招 ' } }]) {
    const j = b.normalizeRecord({ post: row(2, { recruit_type }) }, site); a.deepEqual(j.channels, []); a.equal(j.employment, null);
  }
  a.deepEqual(b.normalizeRecord({ post: row(2, { recruit_type: { name: '实习生' } }) }, site).channels, []);
  const long = '  原文\r\n'.repeat(2000), j = b.normalizeRecord({ post: row(2, { description: long, requirement: long }) }, site);
  a.equal(j.duty, long); a.equal(j.requirements, long);
  const empty = b.normalizeRecord({ post: row(2, { description: null, requirement: '/', city_list: null, job_function: null }) }, site);
  a.deepEqual([empty.duty, empty.requirements, empty.description, empty.city, empty.category, empty.jdComplete], ['', '/', '', '', '', false]);
  a.ok(Object.isFrozen(r.jobs[0].post.extraNative)); a.notEqual(r.jobs[0].post, native);
});
test('Baichuan skips rows without a usable id/title while retaining other available records', () => {
  const bad = [row(2, { id: 7680029585811360002 }), row(2, { id: '../login?evil' }), row(2, { id: ' 7680029585811360002' }), row(2, { id: '0000029585811360002' }), row(2, { title: 2 }), row(2, { job_post_info: [] })];
  for (const post of bad) a.throws(() => b.normalizeRecord({ post }, site));
  const r = b.collectAvailable([page(0, bad, 7), page(10, [row()], 7)], site);
  a.equal(r.total, 1); a.match(r.issues.join(';'), /列表记录未应用/);
  a.deepEqual(r.verification.pages[0].response.data.job_post_list, bad); a.equal(b.validateEvidence(r.verification, r.jobs, site).total, 1);
  // Unknown extra metadata and an independent nested JD no longer block a row (the shared Feishu projection is lenient).
  const duplicateNested = row(2); duplicateNested.job_post_info.description = duplicateNested.description;
  a.equal(b.normalizeRecord({ post: duplicateNested }, site).duty, duplicateNested.description);
  for (const pages of [[], [page(0, [], 0)], [page(0, [bad[0]], 1)]]) a.throws(() => b.collectAvailable(pages, site));
  a.throws(() => b.validateJobs([], site)); a.throws(() => b.normalizeRecord({ post: row(), url: 'https://evil.example' }, site), /binding/);
});
test('Baichuan total drift, partial pages, duplicates and count ceiling disclose gaps without blocking other records', () => {
  const first = row(), blank = row(1, { description: '', requirement: null });
  const r = b.collectAvailable([page(0, [first], 18), page(10, [blank, row(2)], 19)], site);
  a.equal(r.total, 2); a.deepEqual(r.jobs[0].post, first); a.deepEqual(r.verification.pages[1].response.data.job_post_list[0], blank);
  a.match(r.issues.join(';'), /重复官方id 1.*官方total 18→19；实际唯一岗位 2/); a.match(r.issues.join(';'), /分页未穷尽/);
  a.equal(r.complete, false); a.throws(() => b.validateJobs([r.jobs[0], r.jobs[0]], site), /duplicate/);
  const ceiling = b.collectAvailable([page(0, [row()], 10000)], site); a.equal(ceiling.total, 1); a.match(ceiling.issues.join(';'), /count达到10000/);
  const laterDrift = b.collectAvailable([page(0, [row()], 1), page(10, [row(2)], 12)], site); a.equal(laterDrift.total, 2);
});
test('Baichuan revalidates the exact public request, native response, scope and FULL raw-job evidence binding', () => {
  const original = sample();
  for (const mutate of [r => r.verification.pages[0].request.url += '&_signature=fake', r => r.verification.pages[0].request.url = site.api,
    r => r.verification.pages[0].request.method = 'GET', r => delete r.verification.pages[0].request.headers.Referer,
    r => r.verification.pages[0].request.headers['website-path'] = '646926', r => r.verification.pages[0].request.headers['X-CSRF-Token'] = 'fake',
    r => r.verification.pages[0].request.headers['User-Agent'] = 'spoof', r => r.verification.pages[0].request.headers.Cookie = 'session',
    r => r.verification.pages[0].request.body.portal_type = 2, r => r.verification.pages[0].request.body.offset = 10,
    r => r.verification.pages[0].request.body.subject_id_list = ['plan'], r => r.verification.pages[0].request.body.limit = 50,
    r => r.verification.pages[0].httpStatus = 405, r => r.verification.pages[0].response.code = 1,
    r => r.verification.pages[0].response.success = false, r => r.verification.pages[0].response.Success = false,
    r => r.verification.pages[0].response.data.count = '1', r => r.verification.pages[0].response.data.count = -1,
    r => r.verification.pages[0].response.data.count = null, r => delete r.verification.pages[0].response.data.count,
    r => delete r.verification.pages[0].response.data.job_post_list, r => r.verification.pages[0].response.data.job_post_list = Array(1),
    r => r.verification.key = 'baichuan_social', r => r.verification.api += '?fake', r => r.verification.policy = 'complete', r => r.verification.version = 1,
    r => r.jobs[0].post.description = 'invented', r => r.jobs[0].post.extraNative.retained = false, r => delete r.jobs[0].post.job_post_info,
    r => r.jobs[0].post.id = row(2).id, r => r.jobs[0].url = 'https://evil.example', r => r.jobs = []]) {
    const bad = JSON.parse(JSON.stringify(original)); mutate(bad); a.throws(() => b.validateEvidence(bad.verification, bad.jobs, site));
  }
  a.throws(() => b.collectAvailable([page(10, [row()])], site), /binding/);
  a.throws(() => b.collectAvailable([page(0, [row()], 11), page(20, [row(2)], 11)], site), /binding/);
  a.throws(() => b.collectAvailable([page(0, [row()], 20), page(10, [], 20), page(20, [row(2)], 20)], site), /empty endpoint/);
});
test('Baichuan accepts the actual native pagination Referer, not rewritten headers or filtered UI scope', () => {
  const second = page(10, [row(11)], 11);
  const nativeRef = site.url + '/?keywords=&category=&location=&project=&type=&job_hot_flag=&current=2&limit=10&functionCategory=&tag=';
  second.request.headers.Referer = nativeRef;
  const result = b.collectAvailable([page(0, Array.from({ length: 10 }, (_, i) => row(i + 1)), 11), second], site);
  a.equal(result.total, 11); a.equal(result.complete, false);
  a.equal(result.verification.pages[1].request.headers.Referer, nativeRef);
  a.equal(b.validateEvidence(result.verification, result.jobs, site).total, 11);
  for (const ref of [nativeRef.replace('current=2', 'current=3'), nativeRef.replace('keywords=', 'keywords=AI'),
    nativeRef.replace('location=', 'location=Beijing'), nativeRef.replace('limit=10', 'limit=50'),
    nativeRef + '&extra=', nativeRef.replace(site.origin, 'https://evil.example'),
    nativeRef.replace('/646926/', '/index/'), nativeRef + '#login', nativeRef.replace('https://', 'https://user:pw@')]) {
    const bad = structuredClone(result); bad.verification.pages[1].request.headers.Referer = ref;
    a.throws(() => b.validateEvidence(bad.verification, bad.jobs, site), /binding/);
  }
});
test('Baichuan production chooses native UI directly, never tries unsigned Node then retries in a browser', async () => {
  let calls = 0;
  const result = await b.fetchAvailable(site, { nativeCollect: async actual => {
    a.deepEqual(actual, site); calls++; return { pages: [page(0, [row()])], issues: ['官网原生翻页'] };
  } });
  a.equal(calls, 1); a.equal(result.total, 1); a.equal(result.complete, false);
  await a.rejects(b.fetchAvailable(site, { nativeCollect: async () => { calls++; throw Error('refused'); } }), /refused/);
  a.equal(calls, 2);
});
function transport(handler, bootstrap = { status: 200, text: async () => 'normal public portal' }) {
  return async (url, options) => options.method === 'GET' ? bootstrap : handler(url, options, JSON.parse(options.body));
}
test('Baichuan normal GET then unsigned native POST, serial >=200ms/body completion and native paging without retries', async () => {
  let busy = false, clock = 0; const calls = [], starts = [];
  const r = await b.fetchAvailable(site, { now: () => clock, sleep: async ms => { a.equal(busy, false); a.equal(ms, 200); clock += ms; },
    fetchImpl: async (url, options) => {
      a.equal(busy, false); busy = true; starts.push(clock); calls.push(options.method);
      a.equal(options.redirect, 'error'); a.ok(options.signal instanceof AbortSignal);
      if (options.method === 'GET') { a.equal(url, site.url); a.deepEqual(options.headers, {}); a.equal(options.body, undefined);
        return { status: 200, text: async () => { busy = false; return 'normal public entry'; } }; }
      const body = JSON.parse(options.body), expected = request(body.offset);
      a.equal(url, expected.url); a.deepEqual(options.headers, expected.headers); a.deepEqual(body, expected.body);
      return { status: 200, json: async () => { await Promise.resolve(); busy = false; return page(body.offset, [row(body.offset + 1)], 11).response; } };
    } });
  a.deepEqual(calls, ['GET', 'POST', 'POST']); a.deepEqual(starts, [0, 200, 400]); a.equal(r.total, 2); a.equal(r.complete, false);
  a.deepEqual(r.verification.pages.map(p => p.request.body.offset), [0, 10]);
  a.equal(b.validateEvidence(r.verification, r.jobs, site).total, 2);
});
test('Baichuan HTTP405/business/transport/JSON/list failures stop immediately; earlier usable pages remain available', async () => {
  for (const kind of ['HTTP', 'business', 'transport', 'JSON', 'shape']) {
    let calls = 0;
    const r = await b.fetchAvailable(site, { sleep: async () => {}, fetchImpl: transport(async (_, options, body) => {
      calls++; if (body.offset === 10 && kind === 'transport') throw new Error('normal request failed');
      const native = page(body.offset, [row(calls)], 18).response;
      if (body.offset === 10 && kind === 'business') native.code = 1;
      if (body.offset === 10 && kind === 'shape') delete native.data.count;
      return { status: body.offset === 10 && kind === 'HTTP' ? 405 : 200, json: async () => {
        if (body.offset === 10 && kind === 'JSON') throw new SyntaxError('not JSON'); return native; } };
    }) });
    a.equal(calls, 2); a.equal(r.total, 1); a.equal(r.verification.stopped.request.body.offset, 10); a.equal(r.verification.stopped.response, null);
    a.match(r.issues.join(';'), /请求失败，已停止后续请求/); if (kind === 'HTTP') a.match(r.issues.join(';'), /HTTP 405/);
    a.equal(b.validateEvidence(r.verification, r.jobs, site).total, 1);
    const bad = JSON.parse(JSON.stringify(r)); bad.verification.stopped.request.body.offset = 20;
    a.throws(() => b.validateEvidence(bad.verification, bad.jobs, site), /stopped request/);
    const success = JSON.parse(JSON.stringify(r)); success.verification.stopped.httpStatus = 200;
    success.verification.stopped.response = page(10, [row(2)], 18).response;
    a.throws(() => b.validateEvidence(success.verification, success.jobs, site), /successful page/);
  }
  let calls = 0;
  await a.rejects(b.fetchAvailable(site, { sleep: async () => {}, fetchImpl: transport(async () => { calls++; return { status: 405 }; }) }), /HTTP 405/);
  a.equal(calls, 1);
  await a.rejects(b.fetchAvailable(site, { fetchImpl: async () => { calls++; return { status: 403 }; } }), /bootstrap HTTP 403/); a.equal(calls, 2);
});
test('Baichuan safety caps disclose partial coverage, initial zero/no usable rows reject and unverified profiles never request', async () => {
  let calls = 0;
  const capped = await b.fetchAvailable(site, { maxPages: 2, sleep: async () => {}, fetchImpl: transport(async (_, options, body) => {
    calls++; return { status: 200, json: async () => page(body.offset, [row()], 2000).response };
  }) });
  a.equal(calls, 2); a.equal(capped.total, 1); a.match(capped.issues.join(';'), /安全上限/);
  let clock = 0; calls = 0;
  const timed = await b.fetchAvailable(site, { now: () => clock, sleep: async ms => { clock += ms; }, fetchImpl: transport(async (_, options, body) => {
    calls++; return { status: 200, json: async () => { clock = 900000; return page(body.offset, [row()], 18).response; } };
  }) });
  a.equal(calls, 1); a.equal(timed.total, 1); a.match(timed.issues.join(';'), /进程安全时限/);
  for (const maxPages of [0, 201, 1.5]) await a.rejects(b.fetchAvailable(site, { maxPages, fetchImpl: () => a.fail('no HTTP') }), /limits/);
  await a.rejects(b.fetchAvailable({ ...site, adapter: undefined }, { fetchImpl: () => a.fail('no HTTP') }), /unverified/);
  for (const jobs of [[], [row(1, { id: 'invalid' })]]) {
    calls = 0;
    await a.rejects(b.fetchAvailable(site, { sleep: async () => {}, fetchImpl: transport(async () => {
      calls++; return { status: 200, json: async () => page(0, jobs).response };
    }) }), /zero cannot clear/); a.equal(calls, 1);
  }
});
test('Baichuan CLI atomically writes available envelope; failed/empty candidates preserve existing file and leave no temporary files', async t => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ande-baichuan-test-')); t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const file = path.join(dir, 'candidate.json'); fs.writeFileSync(file, 'old real candidate');
  for (const reply of [{ status: 405 }, { status: 200, json: async () => page(0, []).response },
    { status: 200, json: async () => page(0, [row(1, { id: 'invalid' })]).response }]) {
    await a.rejects(b.run([JSON.stringify(site), file], { sleep: async () => {}, fetchImpl: transport(async () => reply) }));
    a.equal(fs.readFileSync(file, 'utf8'), 'old real candidate'); a.deepEqual(fs.readdirSync(dir), ['candidate.json']);
  }
  const written = await b.run([JSON.stringify(site), file], { sleep: async () => {}, fetchImpl: transport(async () => ({ status: 200, json: async () => page(0, [row()]).response })) });
  a.equal(written.mode, 'custom'); a.equal(written.key, 'baichuan'); a.equal(written.api, site.api); a.equal(written.complete, false);
  a.deepEqual(JSON.parse(fs.readFileSync(file, 'utf8')), written); a.deepEqual(fs.readdirSync(dir), ['candidate.json']);
  a.equal(Object.hasOwn(written, 'finishedAt'), false); await a.rejects(b.run([JSON.stringify(site)]), /Usage/);
});
function infoObject(patch = {}) {
  return { recruitment_type: null, HighlightList: [], JobChannelPublishList: [], job_post_object_value_map: {}, address_list: [], city_list: [],
    correlation_job_list: [], tag_list: [], storefront_list: [], target_major_list: [], job_post_process_time_list: [], job_level_id_list: [], ...patch };
}
function detailPost(n = 1) { return row(n, { job_function: { id: '7273445734858852662', name: '算法', i18n_name: '算法' } }); }
function detailJson(post, patch = {}, dataPatch = {}) {
  return { code: 0, message: 'ok', error: null, data: { recommend_job_post_List: [], job_post_detail: {
    id: post.id, title: post.title, description: post.description, requirement: post.requirement, recruit_type: structuredClone(post.recruit_type),
    publish_time: post.publish_time, channel_online_status: post.channel_online_status, job_function: structuredClone(post.job_function), job_id: '7000000000000000001',
    city_list: structuredClone(post.city_list), job_post_info: infoObject(), department_info: { name: '模型算法部', en_name: '模型算法部', i18n_name: '模型算法部' },
    city_info_list_for_delivery: [{ name: '北京' }], tag_list: [], storefront_mode: null, storefront_list: [], process_type: null, ...patch }, ...dataPatch } };
}
test('Baichuan detail request/response binds the official anonymous GET without signature and only the proved renderer text', () => {
  const post = detailPost(), request = b.detailRequest(post);
  a.deepEqual(request, { url: site.api.replace('/search/job/posts', '/job/posts/' + post.id) + '?portal_type=6&with_recommend=false',
    method: 'GET', headers: { Accept: 'application/json', 'website-path': '646926', 'accept-language': 'zh-CN', Referer: site.url + '/position/' + post.id + '/detail' }, body: null });
  a.equal(b.validateDetail(detailJson(post), post), '模型算法部');
  for (const mutate of [
    d => d.code = 1, d => d.message = 'okx', d => d.error = {}, d => d.data.recommend_job_post_List = [post],
    d => delete d.data.job_post_detail.title, d => d.data.job_post_detail.extra = 'x', d => d.data.job_post_detail.id = row(2).id,
    d => d.data.job_post_detail.description = 'changed', d => d.data.job_post_detail.job_id = '0', d => d.data.job_post_detail.job_id = 7,
    d => d.data.job_post_detail.department_info.name = '   ', d => d.data.job_post_detail.department_info = { name: 'x' },
    d => d.data.job_post_detail.job_function.id = 'other', d => d.data.job_post_detail.job_function.name = '',
    d => d.data.job_post_detail.job_post_info.job_post_object_value_map = { custom: '额外JD' },
    d => d.data.job_post_detail.job_post_info.HighlightList = ['亮点'],
    d => d.data.job_post_detail.job_post_info.correlation_job_list = ['关联'],
    d => d.data.job_post_detail.tag_list = ['标签'], d => d.data.job_post_detail.storefront_list = ['门店'],
    d => delete d.data.job_post_detail.city_info_list_for_delivery
  ]) { const bad = detailJson(post); mutate(bad); a.throws(() => b.validateDetail(bad, post)); }
});
test('Baichuan detail enrichment validates every detail then publishes the renderer sections; refusal keeps list-only', async () => {
  const post = detailPost(), base = b.collectAvailable([page(0, [post])], site);
  const ok = await b.attachDetails(base, site, { sleep: async () => {}, detailFetch: async (url, options) => {
    a.equal(url, b.detailRequest(post).url); a.equal(options.method, 'GET'); a.deepEqual(options.headers, b.detailRequest(post).headers);
    return { status: 200, json: async () => detailJson(post) };
  } });
  a.equal(ok.verification.version, 3); a.deepEqual(ok.verification.details.map(d => d.request), [b.detailRequest(post)]);
  a.equal(ok.jobs[0].detail.response.data.job_post_detail.department_info.name, '模型算法部');
  const normalized = b.normalizeRecord(ok.jobs[0], site);
  a.equal(normalized.description, '职位描述\n' + post.description + '\n\n职位要求\n' + post.requirement + '\n\n职位信息\n部门：模型算法部');
  a.equal(normalized.jdComplete, true); a.equal(normalized.duty, post.description); a.equal(normalized.requirements, post.requirement);
  a.equal(normalized.city, '北京/上海'); a.equal(normalized.category, '算法');
  a.match(ok.issues.join(';'), /已收录列表及详情正文/);
  a.deepEqual(b.validateEvidence(ok.verification, ok.jobs, site).jobs, ok.jobs);
  for (const mutate of [v => v.details[0].request.url = site.api, v => v.details[0].httpStatus = 500, v => v.details[0].response.data.job_post_detail.id = row(2).id,
    v => v.details = [v.details[0], v.details[0]], v => v.version = 2]) { const bad = JSON.parse(JSON.stringify(ok)); mutate(bad.verification); a.throws(() => b.validateEvidence(bad.verification, bad.jobs, site)); }
  for (const reply of [{ status: 403 }, { status: 200, json: async () => ({ code: 1 }) }, { status: 200, json: async () => { throw new SyntaxError('not JSON'); } }]) {
    let calls = 0;
    const failed = await b.attachDetails(base, site, { sleep: async () => {}, detailFetch: async () => { calls++; return reply; } });
    a.equal(calls, 1); a.equal(failed.verification.version, 2); a.equal(failed.jobs.some(j => Object.hasOwn(j, 'detail')), false);
    a.match(failed.issues.join(';'), /详情请求停止/); a.equal(b.normalizeRecord(failed.jobs[0], site).jdComplete, false);
    a.equal(b.validateEvidence(failed.verification, failed.jobs, site).total, 1);
  }
});
test('Baichuan production run enriches details by default and writes the v3 envelope atomically', async t => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ande-baichuan-detail-')); t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const file = path.join(dir, 'candidate.json'), post = detailPost(); let gets = 0;
  const fetchImpl = async (url, options) => {
    if (url === site.url) return { status: 200, text: async () => 'normal public entry' };
    if (options.method === 'POST') return { status: 200, json: async () => page(0, [post]).response };
    gets++; return { status: 200, json: async () => detailJson(post) };
  };
  const written = await b.run([JSON.stringify(site), file], { fetchImpl, sleep: async () => {} });
  a.equal(gets, 1); a.equal(written.verification.version, 3); a.equal(written.jobs[0].detail.response.data.job_post_detail.department_info.name, '模型算法部');
  a.deepEqual(JSON.parse(fs.readFileSync(file, 'utf8')), written); a.deepEqual(fs.readdirSync(dir), ['candidate.json']);
  const listOnly = await b.run([JSON.stringify(site), file], { fetchImpl, sleep: async () => {}, withDetails: false });
  a.equal(listOnly.verification.version, 2); a.equal(JSON.parse(fs.readFileSync(file, 'utf8')).verification.version, 2);
});
