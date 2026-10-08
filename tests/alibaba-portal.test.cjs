'use strict';
const test = require('node:test'), a = require('node:assert/strict');
const fs = require('node:fs'), os = require('node:os'), path = require('node:path');
const b = require('../crawler/lib/custom/alibaba_portal');
const [site] = b.PROFILES, [graduate, daily, research] = site.body.batchIds;
const TOKEN = 'synthetic-csrf-secret-123', SESSION = 'synthetic-session-secret-456';
function row(n = 1, batchId = graduate) {
  return { id: 199907740040 + n - 1, name: '  阿里星-AI应用算法工程师（完整标题）  ', batchId, positionUrl: null,
    description: '  List<T> &amp; <b>字面正文</b>\r\n  内部  空白\n\n' + '完整长文'.repeat(400) + '\n',
    requirement: '  List<T> &amp; <b>字面要求</b>\r\n  内部  空白\n\n',
    workLocations: ['北京', '上海', '海外'], categories: ['技术类', '产品'], categoryType: 'freshman', categoryName: '不猜此字段',
    circleNames: ['阿里巴巴控股集团', '淘天集团', '阿里云', 'Token Foundry', '千问办公', '千问事业部', '高德地图'],
    batchName: '不用于推断', status: 'recruit', channels: ['campus_group_official_site'], modifyTime: 1788437212000,
    publishTime: null, graduationTime: { from: 1793491200000, to: 1824940800000 }, extraNative: { preserved: true },
    title: '客户端别名不用', duty: '客户端别名不用', employment: 'full-time', talentPlan: true, url: 'javascript:unsafe' };
}
function page(batchId, n, datas, total = datas.length) {
  return { batchId, request: { url: site.api, method: 'POST', headers: { 'Content-Type': 'application/json', Origin: site.origin, Referer: site.url + '?batchId=' + batchId },
    body: { batchId, pageIndex: n, pageSize: 10, customDeptCode: '', channel: 'campus_group_official_site', language: 'zh' } }, httpStatus: 200,
    response: { success: true, errorCode: null, errorMsg: null, content: { datas, totalCount: total, pageSize: 10, currentPage: n } } };
}
function sample() { return b.collectAvailable(site.body.batchIds.map((id, i) => page(id, 1, [row(i + 1, id)])), site); }
function bootstrap(html = "window.__sysconfig = {__token__: '" + TOKEN + "'};", cookies = ['SESSION=' + SESSION + '; Path=/; Secure; HttpOnly']) {
  return { status: 200, headers: { getSetCookie: () => cookies }, text: async () => html };
}
function responder(post) {
  return async (url, options) => options.method === 'GET' ? bootstrap() : post(url, options, JSON.parse(options.body));
}
function response(batchId, n, datas, total) { return { status: 200, json: async () => page(batchId, n, datas, total).response }; }

test('Alibaba one exact immutable campus profile, no inherited social scopes or downgrade', () => {
  a.deepEqual(b.PROFILES, [{ key: 'alibaba', company: '阿里巴巴', ats: 'custom', adapter: 'alibaba-portal-v1', track: 'campus',
    batch: '校园招聘（应届＋日常/研究实习，项目不限）', exclude: '(无)', origin: 'https://campus-talent.alibaba.com',
    url: 'https://campus-talent.alibaba.com/campus/position', api: 'https://campus-talent.alibaba.com/position/search', listJD: true,
    body: { batchIds: [100000760001, 100000560002, 100000560001], pageSize: 10, customDeptCode: '', channel: 'campus_group_official_site', language: 'zh' } }]);
  a.ok(Object.isFrozen(b.PROFILES) && Object.isFrozen(site.body.batchIds)); a.equal(b.verifiedSource(structuredClone(site)), true);
  for (const patch of [{ key: 'alibaba_social' }, { company: '阿里巴巴控股' }, { ats: 'moka' }, { adapter: undefined }, { listJD: false },
    { track: 'social' }, { url: site.url + '?search=AI' }, { api: site.api + '?_csrf=fake' }, { origin: 'https://talent-holding.alibaba.com' },
    { body: { ...site.body, batchIds: [graduate] } }, { body: { ...site.body, categories: [] } }, { body: { ...site.body, customDeptCode: '60004' } }]) {
    const bad = { ...site, ...patch }; a.equal(b.requiresVerification(bad), true); a.equal(b.verifiedSource(bad), false); a.throws(() => b.validateJobs([], bad));
  }
  const deleted = structuredClone(site); delete deleted.adapter;
  a.equal(b.requiresVerification(deleted), true); a.equal(b.verifiedSource(deleted), false);
  for (const bad of [{ api: 'POST ' + site.api }, { url: 'https://CAMPUS-TALENT.ALIBABA.COM:443/campus/position' }, { batchApi: site.origin + '/searchCondition/listBatch' },
    { api: 'relative' }, { url: null }, { detailApi: '%' }, { origin: 5 }]) a.equal(b.requiresVerification(bad), true);
  a.equal(b.requiresVerification({ key: 'alibaba_social', url: 'https://talent-holding.alibaba.com/off-campus/position-list' }), false);
  a.equal(b.requiresVerification({ url: 'https://example.com/' }), false); a.equal(b.portalNotice({}), '');
  a.match(b.portalNotice(site), /应届、日常及研究实习.*项目\/职能\/业务不限.*阿里星.*不另重复.*多个业务集团.*不证明.*控股.*完整性未验证/);
});
test('Alibaba native id/title/list TEXT and all raw metadata retained, no guessed employer/categoryType/date/status/plan', () => {
  const r = sample(); a.equal(r.complete, false); a.equal(r.total, 3); a.equal(r.verification.policy, 'available');
  a.deepEqual(b.validateEvidence(r.verification, r.jobs, site).jobs, r.jobs);
  for (const job of r.jobs) {
    const native = structuredClone(job.post), j = b.normalizeRecord(job, site), internship = job.batchId !== graduate;
    a.equal(j.id, String(native.id)); a.equal(j.title, native.name); a.equal(j.city, native.workLocations.join('/')); a.equal(j.category, native.categories.join('/'));
    a.equal(j.url, site.origin + '/campus/position/' + native.id + '?deptCodes='); a.equal(j.duty, native.description); a.equal(j.requirements, native.requirement);
    a.equal(j.description, ''); a.equal(j.jdComplete, false); a.deepEqual(j.channels, internship ? [] : ['campus']); a.equal(j.employment, internship ? 'internship' : null);
    a.deepEqual([j.talentPlan, j.date, j.dateKind, j.sourceStatus], [null, null, null, null]); a.equal(Object.hasOwn(j, 'company'), false); a.deepEqual(job.post, native);
    const unknown = b.normalizeRecord({ batchId: job.batchId, post: { ...native, categories: null, workLocations: null, description: null, requirement: '/' } }, site);
    a.deepEqual([unknown.category, unknown.city, unknown.duty, unknown.requirements, unknown.jdComplete], ['', '', '', '/', false]);
    const same = b.normalizeRecord({ batchId: job.batchId, post: { ...native, requirement: native.description } }, site); a.equal(same.duty, same.requirements);
  }
  a.ok(r.issues.includes('已收录列表JD，详情正文完整性待核验'));
});
test('Alibaba collected evidence detaches caller objects and freezes raw job/native response binding', () => {
  const native = row(), input = [page(graduate, 1, [native])], r = b.collectAvailable(input, site);
  a.ok(Object.isFrozen(r) && Object.isFrozen(r.verification.pages[0].response.content.datas[0]) && Object.isFrozen(r.jobs[0].post.circleNames));
  a.strictEqual(r.jobs[0].post, r.verification.pages[0].response.content.datas[0]);
  native.description = 'caller changed'; input[0].request.body.customDeptCode = 'filter';
  a.notEqual(r.jobs[0].post.description, native.description); a.equal(r.verification.pages[0].request.body.customDeptCode, '');
  a.throws(() => { r.jobs[0].post.name = 'changed'; }, TypeError);
});
test('Alibaba total drift/duplicate pages and cross-batch ids retain first batch/order/JD with issues', () => {
  const first = row(), blank = { ...row(), description: '', requirement: null };
  const r = b.collectAvailable([page(graduate, 1, [first], 30), page(graduate, 2, [blank, row(2)], 18),
    page(daily, 1, [{ ...blank, batchId: daily }, row(3, daily)], 2), page(research, 1, [row(4, research)], 1)], site);
  a.equal(r.total, 4); a.deepEqual(r.jobs.map(j => j.batchId), [graduate, graduate, daily, research]); a.deepEqual(r.jobs[0].post, first);
  a.deepEqual(r.verification.pages[2].response.content.datas[0], { ...blank, batchId: daily });
  a.match(r.issues.join(';'), /重复官方id 2.*首次.*官方total 30→18；实际唯一岗位 2/);
  a.equal(b.validateEvidence(r.verification, r.jobs, site).complete, false);
  a.throws(() => b.validateJobs([r.jobs[0], r.jobs[0]], site), /duplicate/);
});
test('Alibaba only explicit total boundary or empty EOF advances batches, no short-page inference', () => {
  const r = b.collectAvailable([page(graduate, 1, [row()], 29), page(graduate, 2, [], 29), page(daily, 1, [], 0), page(research, 1, [row(2, research)], 1)], site);
  a.equal(r.total, 2); a.match(r.issues.join(';'), /官方total 29；实际唯一岗位 1/);
  a.throws(() => b.collectAvailable([page(graduate, 1, [row()], 29), page(daily, 1, [row(2, daily)])], site), /binding/);
  a.throws(() => b.collectAvailable([page(graduate, 1, [row()]), page(graduate, 2, [row(2)])], site), /binding/);
  a.throws(() => b.collectAvailable([...r.verification.pages, page(research, 2, [row(3, research)])], site), /extra request/);
});
test('Alibaba revalidation rejects source/request/method/body/header/native envelope/job tampering or fake complete evidence', () => {
  const original = sample();
  for (const mutate of [
    r => r.verification.api += '?_csrf=secret', r => r.verification.key = 'alibaba_social', r => r.verification.policy = 'complete', r => r.verification.version = 1,
    r => r.verification.complete = true, r => r.verification.bootstrap = { Cookie: 'secret' }, r => r.verification.pages[0].request.url += '?_csrf=secret',
    r => r.verification.pages[0].request.method = 'GET', r => delete r.verification.pages[0].request.headers.Referer,
    r => r.verification.pages[0].request.headers.Cookie = 'secret', r => r.verification.pages[0].request.headers['X-XSRF-TOKEN'] = 'secret',
    r => r.verification.pages[0].request.headers['User-Agent'] = 'spoof', r => r.verification.pages[0].request.headers.Origin = 'https://example.com',
    r => r.verification.pages[0].request.body.batchId = daily, r => r.verification.pages[0].request.body.pageIndex = 2,
    r => r.verification.pages[0].request.body.pageSize = 100, r => r.verification.pages[0].request.body.language = 'en',
    r => r.verification.pages[0].request.body.customDeptCode = '60004', r => r.verification.pages[0].request.body.keywords = '',
    r => r.verification.pages[0].request.body.categories = [], r => r.verification.pages[0].batchId = research, r => r.verification.pages.reverse(),
    r => r.verification.pages[0].httpStatus = 403, r => r.verification.pages[0].response.success = false,
    r => r.verification.pages[0].response.errorCode = 'REFUSED', r => r.verification.pages[0].response.errorMsg = 'illegal-visit',
    r => delete r.verification.pages[0].response.errorCode, r => delete r.verification.pages[0].response.errorMsg,
    r => r.verification.pages[0].response.extraStatus = false, r => r.verification.pages[0].response.content.hasMore = true,
    r => r.verification.pages[0].response.content.currentPage = '1', r => r.verification.pages[0].response.content.pageSize = 100,
    r => r.verification.pages[0].response.content.totalCount = '3', r => r.verification.pages[0].response.content.totalCount = null,
    r => r.verification.pages[0].response.content.totalCount = false, r => r.verification.pages[0].response.content.totalCount = -1,
    r => r.verification.pages[0].response.content.totalCount = 1.5, r => r.verification.pages[0].response.content.totalCount = Number.MAX_SAFE_INTEGER + 1,
    r => delete r.verification.pages[0].response.content.totalCount, r => r.verification.pages[0].response.content.datas = Array(1),
    r => r.jobs[0].post.description = 'invented', r => r.jobs[0].batchId = daily, r => r.jobs[0].post.id++, r => r.jobs[0].post.extraNative.preserved = false
  ]) { const bad = JSON.parse(JSON.stringify(original)); mutate(bad); a.throws(() => b.validateEvidence(bad.verification, bad.jobs, site)); }
  const emptyErrors = site.body.batchIds.map((id, i) => page(id, 1, [row(i + 1, id)]));
  for (const p of emptyErrors) { p.response.errorCode = ''; p.response.errorMsg = ''; }
  a.equal(b.collectAvailable(emptyErrors, site).total, 3);
});
test('Alibaba skips invalid native records honestly but missing JD/unsafe identity/no usable data never clear', () => {
  const invalid = [{ ...row(), id: '199907740040' }, { ...row(), id: 0 }, { ...row(), name: 42 }, { ...row(), batchId: daily },
    { ...row(), description: {} }, { ...row(), requirement: [] }, { ...row(), workLocations: ['北京', 1] }, { ...row(), categories: {} },
    { ...row(), positionUrl: 'https://example.com/job' }];
  const missing = row(); delete missing.requirement;
  const r = b.collectAvailable([page(graduate, 1, [...invalid, row(2)], 10), page(daily, 1, [missing], 1)], site);
  a.equal(r.total, 1); a.match(r.issues.join(';'), /列表记录未应用/);
  a.throws(() => b.collectAvailable([page(graduate, 1, invalid)], site), /zero cannot clear/);
  a.throws(() => b.collectAvailable([page(graduate, 1, [], 0)], site), /zero cannot clear/);
  a.throws(() => b.validateJobs([], site), /zero cannot clear/);
  a.throws(() => b.normalizeRecord({ batchId: daily, post: row() }, site), /batchId binding/);
});
test('Alibaba normal GET sysconfig CSRF and cookies are memory-only; serial >=200ms, no UA/SDK/token evidence', async () => {
  let clock = 0, busy = false; const calls = [], starts = [];
  const r = await b.fetchAvailable(site, { now: () => clock, sleep: async ms => { a.equal(busy, false); a.equal(ms, 200); clock += ms; },
    fetchImpl: async (url, options) => {
      a.equal(busy, false); busy = true; starts.push(clock); calls.push([url, options]);
      a.equal(options.redirect, 'error'); a.ok(options.signal instanceof AbortSignal); a.equal(options.headers['User-Agent'], undefined); a.equal(options.headers['X-XSRF-TOKEN'], undefined);
      if (options.method === 'GET') {
        a.equal(url, site.url); a.deepEqual(options.headers, {}); a.equal(options.body, undefined);
        return { ...bootstrap("window.__sysconfig = {'__token__': '" + TOKEN + "'};", ['SESSION=' + SESSION + '; Domain=.alibaba.com; Path=/; Secure',
          'XSRF-TOKEN=unused-cookie-token; Path=/; Secure', 'UNRELATED=foreign-secret; Domain=example.com; Path=/', 'SCOPED=scoped-secret; Path=/campus',
          'EXPIRED=expired-secret; Path=/; Max-Age=0', 'PREFERENCE=1; Path=/']), text: async () => { await Promise.resolve(); busy = false; return "window.__sysconfig = {'__token__': '" + TOKEN + "'};"; } };
      }
      const body = JSON.parse(options.body), expected = page(body.batchId, body.pageIndex, []);
      a.equal(new URL(url).origin + new URL(url).pathname, site.api); a.deepEqual([...new URL(url).searchParams], [['_csrf', TOKEN]]);
      a.deepEqual(body, expected.request.body); a.deepEqual(options.headers, { ...expected.request.headers, Cookie: 'SESSION=' + SESSION + '; XSRF-TOKEN=unused-cookie-token; PREFERENCE=1' });
      const datas = body.batchId === graduate && body.pageIndex === 1 ? Array.from({ length: 10 }, (_, i) => row(i + 1)) : [row(calls.length + 20, body.batchId)];
      const native = page(body.batchId, body.pageIndex, datas, body.batchId === graduate ? 11 : 1).response;
      return { status: 200, json: async () => { await Promise.resolve(); busy = false; return native; } };
    } });
  a.deepEqual(calls.slice(1).map(([, o]) => { const p = JSON.parse(o.body); return [p.batchId, p.pageIndex]; }), [[graduate, 1], [graduate, 2], [daily, 1], [research, 1]]);
  a.equal(r.total, 13); a.equal(r.complete, false); a.ok(starts.every((v, i) => !i || v - starts[i - 1] >= 200));
  const stored = JSON.stringify(r);
  for (const secret of [TOKEN, SESSION, 'unused-cookie-token', 'scoped-secret', 'foreign-secret', 'expired-secret', '_csrf', 'Cookie', 'X-XSRF']) a.equal(stored.includes(secret), false);
  a.equal(b.validateEvidence(r.verification, r.jobs, site).total, 13);
});
test('Alibaba XSRF cookie fallback only when normal sysconfig absent; absent/redacted CSRF and bootstrap refusals stop', async () => {
  const encoded = encodeURIComponent('synthetic-cookie-token+/='); let calls = 0;
  const r = await b.fetchAvailable(site, { sleep: async () => {}, fetchImpl: async (url, options) => {
    calls++;
    if (options.method === 'GET') return bootstrap('<html>normal anonymous page</html>', ['XSRF-TOKEN=' + encoded + '; Path=/; Secure']);
    a.equal(new URL(url).searchParams.get('_csrf'), 'synthetic-cookie-token+/='); a.equal(options.headers.Cookie, 'XSRF-TOKEN=' + encoded);
    const body = JSON.parse(options.body); return response(body.batchId, body.pageIndex, [row(calls, body.batchId)], 1);
  } });
  a.equal(calls, 4); a.equal(r.total, 3); a.equal(JSON.stringify(r).includes('synthetic-cookie-token'), false);
  for (const reply of [bootstrap('', []), bootstrap("window.__sysconfig={__token__:'[REDACTED]'}", []),
    bootstrap('', ['XSRF-TOKEN=not-applicable; Path=/campus']), { status: 412 }, { status: 302 }, { status: 200, text: async () => { throw new Error(TOKEN); } }]) {
    calls = 0;
    await a.rejects(b.fetchAvailable(site, { sleep: async () => {}, fetchImpl: async () => { calls++; return reply; } }), error => !error.message.includes(TOKEN));
    a.equal(calls, 1);
  }
  calls = 0;
  await a.rejects(b.fetchAvailable(site, { fetchImpl: async () => { calls++; throw new Error('GET failed ' + TOKEN); } }), /anonymous bootstrap failed/); a.equal(calls, 1);
});
test('Alibaba refusal/HTTP/transport/parser/shape failure stops entire source once, earlier usable records survive without secret errors', async () => {
  for (const failAt of [graduate, daily]) for (const kind of ['HTTP', 'business', 'transport', 'JSON', 'shape', 'secret-echo']) {
    const calls = [];
    const r = await b.fetchAvailable(site, { sleep: async () => {}, fetchImpl: responder(async (url, options, body) => {
      calls.push([body.batchId, body.pageIndex]); const fail = body.batchId === failAt && (failAt === daily || body.pageIndex === 2);
      if (fail && kind === 'transport') throw new Error(url + ' Cookie=' + SESSION);
      const native = page(body.batchId, body.pageIndex, [row(calls.length, body.batchId)], failAt === graduate ? 21 : 1).response;
      if (fail && kind === 'business') { native.success = false; native.errorMsg = 'refusal ' + url + ' ' + SESSION; }
      if (fail && kind === 'shape') delete native.content.datas;
      if (fail && kind === 'secret-echo') native.content.datas[0].description = TOKEN;
      return { status: fail && kind === 'HTTP' ? 403 : 200, json: async () => { if (fail && kind === 'JSON') throw new SyntaxError('bad JSON ' + TOKEN); return native; } };
    }) });
    a.deepEqual(calls, failAt === graduate ? [[graduate, 1], [graduate, 2]] : [[graduate, 1], [daily, 1]]);
    a.equal(r.total, 1); a.equal(r.complete, false); a.equal(r.verification.stopped.batchId, failAt); a.equal(r.verification.stopped.response, null);
    a.equal(r.verification.stopped.error, '请求失败，已停止后续请求'); a.match(r.issues.join(';'), /请求失败.*尚未取得/);
    a.equal(JSON.stringify(r).includes(TOKEN), false); a.equal(JSON.stringify(r).includes(SESSION), false); a.equal(b.validateEvidence(r.verification, r.jobs, site).total, 1);
    const bad = JSON.parse(JSON.stringify(r)); bad.verification.stopped.request.body.pageIndex++;
    a.throws(() => b.validateEvidence(bad.verification, bad.jobs, site), /stopped request/);
    const arbitrary = JSON.parse(JSON.stringify(r)); arbitrary.verification.stopped.response = { errorMsg: TOKEN };
    a.throws(() => b.validateEvidence(arbitrary.verification, arbitrary.jobs, site), /refusal payloads/);
    const success = JSON.parse(JSON.stringify(r)), stopped = success.verification.stopped;
    stopped.httpStatus = 200; stopped.response = page(failAt, stopped.request.body.pageIndex, [row(99, failAt)]).response;
    a.throws(() => b.validateEvidence(success.verification, success.jobs, site), /successful page/);
  }
});
test('Alibaba initial failed/zero/unusable list refuses clearing, but empty first batch may continue other batches', async () => {
  for (const kind of ['HTTP', 'zero', 'invalid']) {
    let calls = 0;
    await a.rejects(b.fetchAvailable(site, { sleep: async () => {}, fetchImpl: responder(async (_, options, body) => {
      calls++;
      if (kind === 'HTTP') return { status: 412 };
      return response(body.batchId, body.pageIndex, kind === 'zero' ? [] : [{ ...row(1, body.batchId), id: 'invalid' }], kind === 'zero' ? 0 : 1);
    }) }));
    a.equal(calls, kind === 'HTTP' ? 1 : 3);
  }
  const calls = [];
  const r = await b.fetchAvailable(site, { sleep: async () => {}, fetchImpl: responder(async (_, options, body) => {
    calls.push(body.batchId); return response(body.batchId, 1, body.batchId === graduate ? [] : [row(calls.length, body.batchId)], body.batchId === graduate ? 0 : 1);
  }) });
  a.deepEqual(calls, [graduate, daily, research]); a.equal(r.total, 2); a.deepEqual(r.jobs.map(j => b.normalizeRecord(j, site).employment), ['internship', 'internship']);
});
test('Alibaba per-batch 200-page/900000ms process caps retain available data, no retries or next-batch requests', async () => {
  let calls = 0;
  const r = await b.fetchAvailable(site, { maxPages: 2, sleep: async () => {}, fetchImpl: responder(async (_, options, body) => {
    calls++; return response(body.batchId, body.pageIndex, [row()], 3000);
  }) });
  a.equal(calls, 2); a.equal(r.total, 1); a.match(r.issues.join(';'), /安全上限.*尚未取得/); a.equal(r.verification.stopped, null);
  let clock = 0; calls = 0;
  const timed = await b.fetchAvailable(site, { now: () => clock, sleep: async ms => { clock += ms; }, fetchImpl: responder(async (_, options, body) => {
    calls++; return { status: 200, json: async () => { clock = 900000; return page(body.batchId, body.pageIndex, [row()], 20).response; } };
  }) });
  a.equal(calls, 1); a.equal(timed.total, 1); a.match(timed.issues.join(';'), /进程安全时限.*尚未取得/);
  for (const maxPages of [0, 201, 1.5]) await a.rejects(b.fetchAvailable(site, { maxPages, fetchImpl: () => a.fail('no network') }), /limits/);
});
test('Alibaba run atomically emits only available envelope and public evidence; failures leave old file/no temp or tokens', async t => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ande-alibaba-test-')); t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const file = path.join(dir, 'candidate.json'); fs.writeFileSync(file, 'old real candidate');
  for (const kind of ['bootstrap', 'HTTP', 'zero', 'invalid']) {
    await a.rejects(b.run([JSON.stringify(site), file], { sleep: async () => {}, fetchImpl: async (url, options) => {
      if (options.method === 'GET') return kind === 'bootstrap' ? { status: 403 } : bootstrap();
      if (kind === 'HTTP') throw new Error(url + ' Cookie=' + SESSION);
      const body = JSON.parse(options.body); return response(body.batchId, 1, kind === 'zero' ? [] : [{ ...row(1, body.batchId), name: null }], kind === 'zero' ? 0 : 1);
    } }));
    a.equal(fs.readFileSync(file, 'utf8'), 'old real candidate'); a.deepEqual(fs.readdirSync(dir), ['candidate.json']);
  }
  const written = await b.run([JSON.stringify(site), file], { sleep: async () => {}, fetchImpl: responder(async (_, options, body) => response(body.batchId, 1, [row(site.body.batchIds.indexOf(body.batchId) + 1, body.batchId)], 1)) });
  a.equal(written.mode, 'custom'); a.equal(written.complete, false); a.equal(written.key, 'alibaba'); a.equal(written.api, site.api);
  const bytes = fs.readFileSync(file, 'utf8'); a.deepEqual(JSON.parse(bytes), written); a.deepEqual(fs.readdirSync(dir), ['candidate.json']);
  for (const secret of [TOKEN, SESSION, '_csrf', 'Cookie', 'X-XSRF', '__sysconfig']) a.equal(bytes.includes(secret), false);
  await a.rejects(b.run([JSON.stringify(site)]), /Usage/);
});
