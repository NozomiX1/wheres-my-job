'use strict';
const test = require('node:test'), a = require('node:assert/strict');
const fs = require('node:fs'), os = require('node:os'), path = require('node:path');
const b = require('../crawler/lib/custom/ant_portal');
const [campus, social] = b.PROFILES;
function row(n = 1) {
  return { id: 260813011416487 + n - 1, name: '  【Plan A】原始完整标题（实习）  ', positionUrl: '', workLocations: ['北京', '杭州'], categories: ['技术类-开发', '产品类'], categoryName: '技术类',
    description: '  List<T> &amp; <b>字面正文</b>\r\n  内部  空白\n\n' + '全部长文'.repeat(400) + '\n',
    requirement: '  List<T> &amp; <b>字面要求</b>\r\n  内部  空白\n\n', teamDescription: null, showTeamDescription: null,
    batchId: 26041500085351, batchName: '2027届蚂蚁星- Plan A人才计划', batchType: 'graduate', batchTypeDesc: '应届生',
    positionType: null, department: '不得猜独立雇主', publishTime: '2026-08-13T07:50:34.000+00:00', isCollected: 'N', tid: 'native-tracking-id',
    extraNative: { retained: true }, title: '不映客户端别名', duty: '不映客户端别名', talentPlan: true, employment: 'full-time', status: 'recruit', url: 'javascript:unsafe' };
}
function page(site, n, posts, total = posts.length) {
  return { request: { url: site.api, method: 'POST', headers: { 'Content-Type': 'application/json;charset=UTF-8', Accept: 'application/json', Origin: site.origin, Referer: site.origin + '/' },
    body: { ...site.body, pageIndex: n } }, httpStatus: 200,
    response: { success: true, errorMsg: null, errorCode: null, content: posts, traceId: 'synthetic-trace', totalCount: total, pageSize: 10, currentPage: n } };
}
function sample(site = campus) { return b.collectAvailable([page(site, 1, [row()])], site); }
function responder(post) {
  return async (url, options) => options.method === 'GET' ? { status: 200, text: async () => '<html>normal anonymous page, no credentials</html>' } : post(url, options, JSON.parse(options.body));
}
function response(site, n, posts, total) { return { status: 200, json: async () => page(site, n, posts, total).response }; }

test('Ant exactly two immutable broad profiles, one-based native zh bodies; identity/scope/mode cannot downgrade', () => {
  a.deepEqual(b.PROFILES, ['campus', 'social'].map(track => ({ key: track === 'campus' ? 'ant' : 'ant_social', company: '蚂蚁集团', ats: 'custom', adapter: 'ant-portal-v1',
    track, batch: track === 'campus' ? '校园招聘（批次/项目不限）' : '社招', exclude: '(无)', origin: 'https://talent.antgroup.com',
    url: 'https://talent.antgroup.com/' + (track === 'campus' ? 'campus-full-list' : 'off-campus'), api: 'https://hrcareersweb.antgroup.com/api/' + track + '/position/search', listJD: true,
    body: track === 'campus' ? { channel: 'campus_group_official_site', language: 'zh', regions: '', subCategories: '', bgCode: '', pageIndex: 1, pageSize: 10, recruitType: [], batchIds: [] } :
      { key: '', regions: '', categories: '', subCategories: '', bgCode: '', socialQrCode: '', pageIndex: 1, pageSize: 10, channel: 'group_official_site', language: 'zh' } })));
  a.ok(Object.isFrozen(b.PROFILES) && Object.isFrozen(campus.body.recruitType) && Object.isFrozen(campus.body.batchIds));
  for (const site of b.PROFILES) {
    a.ok(Object.isFrozen(site.body)); a.equal(b.requiresVerification(site), true); a.equal(b.verifiedSource(structuredClone(site)), true);
    for (const patch of [{ key: 'alias' }, { company: '支付宝' }, { ats: 'moka' }, { adapter: undefined }, { listJD: false }, { track: 'intern' },
      { url: site.url + '?search=AI' }, { api: site.api + '?ctoken=fake' }, { origin: 'https://example.com' }, { exclude: '实习' },
      { body: { ...site.body, pageIndex: 0 } }, { body: { ...site.body, language: 'zh_CN' } }, { body: { ...site.body, regions: '北京' } },
      { body: { ...site.body, batchIds: [26041500085351] } }, { body: { ...site.body, key: 'AI' } }]) {
      const bad = { ...site, ...patch }; a.equal(b.requiresVerification(bad), true); a.equal(b.verifiedSource(bad), false); a.throws(() => b.validateJobs([], bad));
    }
    const deleted = structuredClone(site); delete deleted.adapter;
    a.equal(b.requiresVerification(deleted), true); a.equal(b.verifiedSource(deleted), false);
  }
  for (const bad of [{ api: 'POST ' + campus.api }, { url: 'https://TALENT.ANTGROUP.COM:443/campus-full-list' }, { apiOrigin: 'https://HRCAREERSWEB.ANTGROUP.COM/' },
    { origin: '%' }, { api: 'relative' }, { detailApi: null }]) a.equal(b.requiresVerification(bad), true);
  a.equal(b.requiresVerification({ url: 'https://example.com' }), false); a.equal(b.portalNotice({}), '');
  a.match(b.portalNotice(campus), /批次\/项目不限.*蚂蚁星\/Plan A.*实习.*完整性未验证/); a.match(b.portalNotice(social), /默认无筛选社招/);
});
test('Ant numeric native id and original TEXT/title/all raw metadata survive; only explicit native type maps employment/channel', () => {
  for (const site of b.PROFILES) {
    const r = sample(site); a.equal(r.complete, false); a.equal(r.total, 1); a.deepEqual(b.validateEvidence(r.verification, r.jobs, site).jobs, r.jobs);
    const native = structuredClone(r.jobs[0].post), j = b.normalizeRecord(r.jobs[0], site);
    a.equal(j.id, String(native.id)); a.equal(j.title, native.name); a.equal(j.city, native.workLocations.join('/'));
    a.equal(j.category, site.track === 'campus' ? native.categoryName : native.categories.join('/'));
    a.equal(j.url, site.origin + (site.track === 'campus' ? '/campus-position' : '/off-campus-position') + '?positionId=' + native.id);
    a.deepEqual([...new URL(j.url).searchParams], [['positionId', String(native.id)]]); a.ok(!j.url.includes('tid='));
    a.equal(j.duty, native.description); a.equal(j.requirements, native.requirement); a.equal(j.description, ''); a.equal(j.jdComplete, false);
    a.deepEqual(j.channels, [site.track]); a.deepEqual([j.employment, j.talentPlan, j.date, j.dateKind, j.sourceStatus], [null, null, null, null, null]);
    a.equal(Object.hasOwn(j, 'company'), false); a.deepEqual(r.jobs[0].post, native); a.ok(r.issues.includes('已收录列表JD，详情正文完整性待核验'));
    const intern = b.normalizeRecord({ post: { ...native, batchType: 'trainee', batchTypeDesc: '实习生' } }, site);
    a.deepEqual(intern.channels, []); a.equal(intern.employment, 'internship'); a.equal(intern.talentPlan, null);
    const unknown = b.normalizeRecord({ post: { ...native, workLocations: null, categories: null, categoryName: null, batchTypeDesc: 'unexpected', description: null, requirement: '/' } }, site);
    a.deepEqual([unknown.city, unknown.category, unknown.duty, unknown.requirements, unknown.employment], ['', '', '', '/', null]);
    a.deepEqual(unknown.channels, site.track === 'campus' ? [] : ['social']);
    const identical = b.normalizeRecord({ post: { ...native, requirement: native.description } }, site); a.equal(identical.duty, identical.requirements);
  }
});
test('Ant collected native evidence detaches caller objects and freezes complete raw jobs and page bindings', () => {
  const post = row(), input = [page(campus, 1, [post])], r = b.collectAvailable(input, campus);
  a.strictEqual(r.jobs[0].post, r.verification.pages[0].response.content[0]);
  a.ok(Object.isFrozen(r) && Object.isFrozen(r.jobs[0].post.extraNative) && Object.isFrozen(r.verification.pages[0].request.body.batchIds));
  post.description = 'caller changed'; input[0].request.body.bgCode = 'filter';
  a.notEqual(r.jobs[0].post.description, post.description); a.equal(r.verification.pages[0].request.body.bgCode, '');
  a.throws(() => { r.jobs[0].post.name = 'changed'; }, TypeError);
});
test('Ant total drift, duplicate/short/empty pages are partial issues, keeping first native identity/order/JD', () => {
  const first = row(), blank = { ...row(), description: '', requirement: null, workLocations: ['杭州', '北京'] };
  const r = b.collectAvailable([page(campus, 1, [first], 30), page(campus, 2, [blank, row(2)], 28), page(campus, 3, [], 0)], campus);
  a.equal(r.total, 2); a.deepEqual(r.jobs[0].post, first); a.deepEqual(r.verification.pages[1].response.content[0], blank);
  a.match(r.issues.join(';'), /重复官方id 1.*首次.*官方total 30→28→0；实际唯一岗位 2/);
  a.equal(b.validateEvidence(r.verification, r.jobs, campus).complete, false);
  a.throws(() => b.validateJobs([r.jobs[0], r.jobs[0]], campus), /duplicate/);
  a.throws(() => b.collectAvailable([...r.verification.pages, page(campus, 4, [row(3)])], campus), /extra request/);
  a.throws(() => b.collectAvailable([page(campus, 1, [row()]), page(campus, 2, [row(2)])], campus), /extra request/);
  const partial = b.collectAvailable([page(campus, 1, [row()], 403)], campus);
  a.match(partial.issues.join(';'), /官方total 403；实际唯一岗位 1.*分页未穷尽/);
});
test('Ant revalidation rejects altered source/request/native shapes/raw metadata, false complete and old nested content/zero-based protocol', () => {
  const original = sample();
  for (const mutate of [
    r => r.verification.api = social.api, r => r.verification.key = social.key, r => r.verification.version = 1, r => r.verification.policy = 'complete',
    r => r.verification.complete = true, r => r.verification.pages[0].request.url += '?ctoken=fake', r => r.verification.pages[0].request.method = 'GET',
    r => r.verification.pages[0].request.body.pageIndex = 0, r => r.verification.pages[0].request.body.pageSize = 100,
    r => r.verification.pages[0].request.body.language = 'zh_CN', r => r.verification.pages[0].request.body.batchIds = [26041500085351],
    r => r.verification.pages[0].request.body.recruitType = ['graduate'], r => r.verification.pages[0].request.body.key = '',
    r => r.verification.pages[0].request.body.bgCode = 'technical', r => r.verification.pages[0].request.headers.Referer = campus.url,
    r => delete r.verification.pages[0].request.headers.Accept, r => r.verification.pages[0].request.headers.Origin += '/',
    r => r.verification.pages[0].request.headers.Cookie = 'ctoken=fake', r => r.verification.pages[0].request.headers['User-Agent'] = 'spoof',
    r => r.verification.pages[0].request.headers['X-XSRF-TOKEN'] = 'fabricated', r => r.verification.pages[0].httpStatus = 403,
    r => r.verification.pages[0].response.success = false, r => r.verification.pages[0].response.errorCode = 'REFUSED',
    r => r.verification.pages[0].response.errorMsg = 'illegal-visit', r => delete r.verification.pages[0].response.errorCode,
    r => r.verification.pages[0].response.traceId = {}, r => r.verification.pages[0].response.extraStatus = true,
    r => r.verification.pages[0].response.content = { datas: r.verification.pages[0].response.content },
    r => r.verification.pages[0].response.content = Array(1), r => r.verification.pages[0].response.currentPage = 0,
    r => r.verification.pages[0].response.currentPage = '1', r => r.verification.pages[0].response.pageSize = 100,
    r => r.verification.pages[0].response.totalCount = '403', r => r.verification.pages[0].response.totalCount = null,
    r => r.verification.pages[0].response.totalCount = false, r => r.verification.pages[0].response.totalCount = -1,
    r => r.verification.pages[0].response.totalCount = 1.5, r => r.verification.pages[0].response.totalCount = Number.MAX_SAFE_INTEGER + 1,
    r => delete r.verification.pages[0].response.totalCount, r => r.jobs[0].post.id++, r => r.jobs[0].post.description = 'invented',
    r => r.jobs[0].post.tid = 'changed raw tracking', r => r.jobs[0].post.extraNative.retained = false, r => r.jobs[0].batchId = 123
  ]) { const bad = JSON.parse(JSON.stringify(original)); mutate(bad); a.throws(() => b.validateEvidence(bad.verification, bad.jobs, campus)); }
  const nativeSuccess = page(campus, 1, [row()]); nativeSuccess.response.errorCode = 'success'; nativeSuccess.response.errorMsg = '成功';
  a.equal(b.collectAvailable([nativeSuccess], campus).total, 1);
  nativeSuccess.response.errorMsg = null; a.throws(() => b.collectAvailable([nativeSuccess], campus), /business/);
});
test('Ant optional nonblank visible team JD skips only that record with issue, invalid native records and zero never clear', () => {
  const visible = { ...row(), teamDescription: '  独立团队完整正文\n', showTeamDescription: true };
  const r = b.collectAvailable([page(campus, 1, [visible, row(2)], 2)], campus);
  a.equal(r.total, 1); a.equal(r.jobs[0].post.id, row(2).id); a.match(r.issues.join(';'), /260813011416487.*visible teamDescription/);
  a.equal(r.verification.pages[0].response.content[0].teamDescription, visible.teamDescription);
  a.throws(() => b.normalizeRecord({ post: visible }, campus), /visible teamDescription/);
  for (const showTeamDescription of [false, null, undefined]) {
    const hidden = { ...visible, showTeamDescription }; if (showTeamDescription === undefined) delete hidden.showTeamDescription;
    a.equal(b.collectAvailable([page(campus, 1, [hidden])], campus).total, 1);
  }
  a.equal(b.collectAvailable([page(campus, 1, [{ ...visible, teamDescription: ' \n\t' }])], campus).total, 1);
  const absentOptional = row(); delete absentOptional.teamDescription; delete absentOptional.showTeamDescription;
  a.equal(b.collectAvailable([page(campus, 1, [absentOptional])], campus).total, 1);
  const invalid = [{ ...row(), id: String(row().id) }, { ...row(), id: 0 }, { ...row(), id: Number.MAX_SAFE_INTEGER + 1 }, { ...row(), name: 42 },
    { ...row(), description: {} }, { ...row(), requirement: [] }, { ...row(), categories: [1] }, { ...row(), workLocations: {} }, { ...row(), positionUrl: 'javascript:unsafe' }];
  const missing = row(); delete missing.requirement; invalid.push(missing);
  a.throws(() => b.collectAvailable([page(campus, 1, invalid)], campus), /zero cannot clear/);
  a.throws(() => b.collectAvailable([page(campus, 1, [], 0)], campus), /zero cannot clear/);
  a.throws(() => b.validateJobs([], campus), /zero cannot clear/);
});
test('Ant normal GET then unsigned JSON POSTs: exact cross-origin root Referer, >=200ms serial starts/body completion, no cookies/tokens/SDK', async () => {
  for (const site of b.PROFILES) {
    let clock = 0, busy = false; const starts = [], calls = [];
    const r = await b.fetchAvailable(site, { now: () => clock, sleep: async ms => { a.equal(busy, false); a.equal(ms, 200); clock += ms; }, fetchImpl: async (url, options) => {
      a.equal(busy, false); busy = true; starts.push(clock); calls.push([url, options.method]);
      a.equal(options.redirect, 'error'); a.ok(options.signal instanceof AbortSignal);
      if (options.method === 'GET') {
        a.equal(url, site.url); a.deepEqual(options.headers, {}); a.equal(options.body, undefined);
        return { status: 200, text: async () => { await Promise.resolve(); busy = false; return '<html>No token bootstrap is needed</html>'; } };
      }
      const body = JSON.parse(options.body), expected = page(site, body.pageIndex, [row(body.pageIndex)], 11);
      a.equal(url, site.api); a.equal(options.method, 'POST'); a.deepEqual(options.headers, expected.request.headers); a.deepEqual(body, expected.request.body);
      return { status: 200, json: async () => { await Promise.resolve(); busy = false; return expected.response; } };
    } });
    a.deepEqual(calls, [[site.url, 'GET'], [site.api, 'POST'], [site.api, 'POST']]); a.equal(r.total, 2); a.equal(r.complete, false);
    a.ok(starts.every((v, i) => !i || v - starts[i - 1] >= 200)); a.equal(b.validateEvidence(r.verification, r.jobs, site).total, 2);
    for (const secret of ['ctoken=', '_csrf', 'Cookie', 'User-Agent', 'X-XSRF-TOKEN']) a.equal(JSON.stringify(r).includes(secret), false);
  }
});
test('Ant HTTP/business/transport/JSON/shape refusal stops immediately without retry or extra HTTP, preserving earlier usable records', async () => {
  for (const kind of ['HTTP', 'business', 'transport', 'JSON', 'shape']) {
    let calls = 0;
    const r = await b.fetchAvailable(campus, { sleep: async () => {}, fetchImpl: responder(async () => {
      calls++; if (calls === 1) return response(campus, 1, [row()], 403);
      if (kind === 'transport') throw new Error('transport failure');
      const raw = page(campus, 2, [row(2)], 403);
      if (kind === 'business') { raw.response.success = false; raw.response.errorCode = 'REFUSED'; raw.response.errorMsg = 'illegal-visit'; }
      if (kind === 'shape') raw.response.content = { datas: [row(2)] };
      return { status: kind === 'HTTP' ? 412 : 200, json: async () => { if (kind === 'JSON') throw new SyntaxError('invalid JSON'); return raw.response; } };
    }) });
    a.equal(calls, 2); a.equal(r.total, 1); a.equal(r.complete, false); a.match(r.issues.join(';'), /请求停止/);
    a.equal(r.verification.stopped.request.body.pageIndex, 2); a.equal(b.validateEvidence(r.verification, r.jobs, campus).total, 1);
    const bad = structuredClone(r); bad.verification.stopped.request.body.pageIndex++; a.throws(() => b.validateEvidence(bad.verification, bad.jobs, campus), /stopped request/);
    const success = structuredClone(r); success.verification.stopped.httpStatus = 200; success.verification.stopped.response = page(campus, 2, [row(99)], 403).response;
    a.throws(() => b.validateEvidence(success.verification, success.jobs, campus), /successful page/);
  }
  for (const reply of [{ status: 403 }, { status: 302 }, { status: 200, text: async () => { throw new Error('body failure'); } }]) {
    let calls = 0; await a.rejects(b.fetchAvailable(campus, { fetchImpl: async () => { calls++; return reply; } })); a.equal(calls, 1);
  }
  let calls = 0; await a.rejects(b.fetchAvailable(campus, { sleep: async () => {}, fetchImpl: responder(async () => { calls++; return { status: 429 }; }) }), /HTTP/); a.equal(calls, 1);
});
test('Ant 200-page/900000ms safety caps keep available records, but initial zero/unusable source rejects', async () => {
  let calls = 0;
  const capped = await b.fetchAvailable(campus, { maxPages: 2, sleep: async () => {}, fetchImpl: responder(async (_, options, body) => {
    calls++; return response(campus, body.pageIndex, [row()], 3000);
  }) });
  a.equal(calls, 2); a.equal(capped.total, 1); a.match(capped.issues.join(';'), /安全上限/); a.equal(capped.verification.stopped, null);
  let clock = 0; calls = 0;
  const timed = await b.fetchAvailable(campus, { now: () => clock, sleep: async ms => { clock += ms; }, fetchImpl: responder(async () => {
    calls++; return { status: 200, json: async () => { clock = 900000; return page(campus, 1, [row()], 403).response; } };
  }) });
  a.equal(calls, 1); a.equal(timed.total, 1); a.match(timed.issues.join(';'), /进程安全时限/);
  for (const maxPages of [0, 201, 1.5]) await a.rejects(b.fetchAvailable(campus, { maxPages, fetchImpl: () => a.fail('no HTTP') }), /limits/);
  for (const posts of [[], [{ ...row(), id: 'unsafe' }]]) {
    calls = 0; await a.rejects(b.fetchAvailable(campus, { sleep: async () => {}, fetchImpl: responder(async () => { calls++; return response(campus, 1, posts, posts.length); }) }), /zero cannot clear/); a.equal(calls, 1);
  }
});
test('Ant run atomically writes available envelope; bootstrap/refusal/zero failures preserve old candidate without temp files', async t => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ande-ant-test-')); t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const file = path.join(dir, 'candidate.json'); fs.writeFileSync(file, 'old real candidate');
  for (const kind of ['bootstrap', 'HTTP', 'zero', 'invalid']) {
    await a.rejects(b.run([JSON.stringify(social), file], { sleep: async () => {}, fetchImpl: async (_, options) => {
      if (options.method === 'GET') return { status: kind === 'bootstrap' ? 403 : 200, text: async () => '<html>normal page</html>' };
      return kind === 'HTTP' ? { status: 412 } : response(social, 1, kind === 'zero' ? [] : [{ ...row(), name: null }], kind === 'zero' ? 0 : 1);
    } }));
    a.equal(fs.readFileSync(file, 'utf8'), 'old real candidate'); a.deepEqual(fs.readdirSync(dir), ['candidate.json']);
  }
  const written = await b.run([JSON.stringify(social), file], { sleep: async () => {}, fetchImpl: responder(async () => response(social, 1, [row()], 1)) });
  a.equal(written.mode, 'custom'); a.equal(written.complete, false); a.equal(written.key, social.key); a.equal(written.api, social.api);
  a.deepEqual(JSON.parse(fs.readFileSync(file, 'utf8')), written); a.deepEqual(fs.readdirSync(dir), ['candidate.json']);
  await a.rejects(b.run([JSON.stringify(campus)]), /Usage/);
});

// Fresh first-party research files are local-only, not committed raw fixtures or new production success clocks.
const nodeBase = '/tmp/ande-second-batch-Ghxbqi';
for (const [site, kind, total] of [[campus, 'unfiltered', 403], [social, 'social', 1193]]) {
  const file = path.join(nodeBase, 'ant-' + kind + '-first.json');
  test('Ant offline fresh Node ' + site.track + ' first page retains all 10 records/entire native response', { skip: !fs.existsSync(file) }, () => {
    const raw = JSON.parse(fs.readFileSync(file, 'utf8')), p = page(site, 1, raw.content, raw.totalCount); p.response = raw;
    const r = b.collectAvailable([p], site); a.equal(r.total, 10); a.equal(raw.totalCount, total); a.equal(r.complete, false);
    a.deepEqual(r.verification.pages[0].response, raw); a.deepEqual(r.jobs.map(j => j.post), raw.content); a.equal(b.validateEvidence(r.verification, r.jobs, site).total, 10);
    for (const job of r.jobs) {
      const j = b.normalizeRecord(job, site), native = job.post;
      a.equal(j.title, native.name); a.equal(j.id, String(native.id)); a.equal(j.duty, native.description ?? ''); a.equal(j.requirements, native.requirement ?? '');
      a.equal(j.city, native.workLocations.join('/')); a.equal(j.category, site.track === 'campus' ? native.categoryName : native.categories.join('/'));
      a.equal(j.jdComplete, false); a.equal(j.talentPlan, null); a.equal(j.date, null); a.equal(j.sourceStatus, null); a.equal(new URL(j.url).searchParams.get('positionId'), String(native.id));
      a.equal(native.teamDescription, null); a.equal(native.showTeamDescription, null);
    }
    if (site.track === 'campus') {
      a.ok(r.jobs.some(job => job.post.name.includes('Plan A'))); a.ok(r.jobs.some(job => job.post.name.includes('蚂蚁星')));
      const intern = r.jobs.find(job => job.post.batchTypeDesc === '实习生'); a.ok(intern); a.equal(b.normalizeRecord(intern, site).employment, 'internship'); a.deepEqual(b.normalizeRecord(intern, site).channels, []);
    }
  });
}
const detailBase = '/tmp/ande-first-batch-special-second-ant-detail';
const sourceFiles = [detailBase + '/network.json', detailBase + '/dom.json', detailBase + '/report.json', nodeBase + '/ant-unfiltered-first.json', nodeBase + '/ant-contract-0.js', nodeBase + '/ant-contract-1.js'];
test('Ant offline current official detail DOM/renderer preserves complete primary TEXT and confirms native id-only URLs', { skip: sourceFiles.some(file => !fs.existsSync(file)) }, () => {
  const read = file => JSON.parse(fs.readFileSync(file, 'utf8'));
  const network = read(detailBase + '/network.json'), dom = read(detailBase + '/dom.json'), report = read(detailBase + '/report.json');
  const detail = network.find(n => n.nativeJSON && n.request.url.includes('/campus/position/detail'));
  a.equal(detail.response.httpStatus, 200); a.equal(detail.nativeJSON.success, true); a.equal(detail.request.body.value.id, 260813011416487);
  a.equal(report.cleanup.chromeExited, true); a.equal(report.cleanup.profileRemoved, true);
  const post = detail.nativeJSON.content, list = read(nodeBase + '/ant-unfiltered-first.json').content.find(p => p.id === post.id), primary = dom.blocks.find(block => block.className === 'content___CH2WV');
  a.ok(primary); a.equal(post.description, list.description); a.equal(post.requirement, list.requirement);
  const flat = text => text.replace(/[\r\n]/g, '');
  for (const field of ['description', 'requirement']) {
    a.ok(flat(primary.text).includes(flat(post[field]))); a.ok(flat(primary.innerText).includes(flat(post[field])));
    a.ok(primary.html.includes(post[field])); a.ok(!/<\/?[A-Za-z][^>]*>/.test(post[field]));
  }
  const j = b.normalizeRecord({ post: list }, campus); a.equal(j.duty, post.description); a.equal(j.requirements, post.requirement); a.equal(j.url, dom.url);
  const root = fs.readFileSync(nodeBase + '/ant-contract-0.js', 'utf8'), campusJS = fs.readFileSync(nodeBase + '/ant-contract-1.js', 'utf8');
  a.ok(campusJS.includes('window.open("/campus-position?positionId=".concat(e)+(i?"&tid=".concat(i):""))'));
  a.ok(root.includes('window.open("/off-campus-position?positionId=".concat(e.positionId))'));
  a.ok(root.includes('e.showTeamDescription&&null!=e&&e.teamDescription'));
});
