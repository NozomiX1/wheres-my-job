'use strict';
const test = require('node:test'), a = require('node:assert/strict');
const fs = require('node:fs'), os = require('node:os'), path = require('node:path');
const b = require('../crawler/lib/custom/bilibili_portal');
const [campus, social] = b.PROFILES;
const TOKEN = 'synthetic-csrf-secret-123', SESSION = 'synthetic-session-secret-456';
const CSRF_API = 'https://jobs.bilibili.com/api/auth/v1/csrf/token';
function row(n = 1) {
  return { campusProjectId: 55, hotRecruit: 0, id: 30710 + n - 1, positionName: '  上海-星计划研发工程师 #012830（完整标题）  ',
    positionDescription: '<p>职责 &amp; &lt;List&lt;T&gt;&gt;</p><p>要求：<b>原始全文</b><br>第二行</p>' + '<p>完整长文'.repeat(400) + '</p>',
    positionTypeName: '全职', postCodeName: '技术类', workLocation: '上海', pushTime: '2026-09-30 15:13:40', recruitType: 1,
    extraNative: { retained: true }, title: '不使用别名', duty: '不使用别名', url: 'javascript:unsafe', talentPlan: true, status: 'open' };
}
function publicHeaders(site) {
  return { 'X-UserType': '2', 'X-AppKey': 'ops.ehr-api.auth', Accept: 'application/json', Origin: site.origin, Referer: site.url, 'X-Channel': site.track };
}
function page(site, n = 1, list = [row()], total = list.length, pages = 1) {
  return { request: { url: site.api, method: 'POST', headers: { ...publicHeaders(site), 'Content-Type': 'application/json' }, body: { ...site.body, pageNum: n } },
    httpStatus: 200, response: { code: 0, data: { list, pages, size: list.length, total }, message: 'success' } };
}
function sample(site = campus) { return b.collectAvailable([page(site)], site); }
function bootstrap(cookies = ['SESSION=' + SESSION + '; Path=/; Secure; HttpOnly']) {
  return { status: 200, headers: { getSetCookie: () => cookies }, text: async () => '<html>normal anonymous SPA</html>' };
}
function token(data = TOKEN) { return { status: 200, json: async () => ({ code: 0, data, message: 'success' }) }; }
function reply(site, n, list, total, pages) { return { status: 200, json: async () => page(site, n, list, total, pages).response }; }
function responder(site, post, getBootstrap = bootstrap, getToken = token) {
  return async (url, options) => {
    if (options.method === 'GET') return url === site.url ? getBootstrap() : getToken();
    return post(url, options, JSON.parse(options.body));
  };
}

test('Bilibili exactly two immutable unfiltered profiles; source-specific URI gate blocks downgrade but not unrelated malformed URIs', () => {
  a.equal(b.PROFILES.length, 2); a.ok(Object.isFrozen(b.PROFILES));
  a.deepEqual(Object.keys(b).sort(), ['PROFILES', 'collectAvailable', 'fetchAvailable', 'normalizeRecord', 'portalNotice', 'requiresVerification', 'run', 'validateEvidence', 'validateJobs', 'verifiedSource']);
  for (const site of b.PROFILES) {
    a.deepEqual(site, { key: site.track === 'campus' ? 'bilibili' : 'bilibili_social', company: 'B站', ats: 'custom', adapter: 'bilibili-portal-v1',
      track: site.track, batch: site.track === 'campus' ? '校园招聘（应届＋实习，项目/性质不限）' : '社会招聘入口（性质不限）', exclude: '(无)', origin: 'https://jobs.bilibili.com',
      url: 'https://jobs.bilibili.com/' + site.track + '/positions', api: 'https://jobs.bilibili.com/api/' + (site.track === 'campus' ? 'campus' : 'srs') + '/position/positionList', listJD: true,
      body: { pageSize: 10, pageNum: 1, positionName: '', postCode: [], postCodeList: [], workLocationList: [], workTypeList: [], positionTypeList: [],
        deptCodeList: [], recruitType: site.track === 'campus' ? null : 0, practiceTypes: [], onlyHotRecruit: 0 } });
    a.equal(b.verifiedSource(structuredClone(site)), true); a.equal(b.requiresVerification(site), true); a.ok(Object.isFrozen(site.body.positionTypeList));
    for (const patch of [{ key: 'alias' }, { company: '别名' }, { ats: 'moka' }, { adapter: undefined }, { track: 'other' }, { listJD: false },
      { url: site.url + '?type=3' }, { api: site.api + '?csrf=fake' }, { origin: 'https://campus.bilibili.com' },
      { body: { ...site.body, workTypeList: ['3'] } }, { body: { ...site.body, positionTypeList: ['0'] } },
      { body: { ...site.body, recruitType: 1 } }, { body: { ...site.body, pageSize: 200 } }, { body: { ...site.body, onlyHotRecruit: 1 } },
      { body: { ...site.body, extra: [] } }, { headers: { Cookie: 'fake' } }]) {
      const bad = { ...site, ...patch }; a.equal(b.requiresVerification(bad), true); a.equal(b.verifiedSource(bad), false); a.throws(() => b.validateJobs([], bad));
    }
    const deleted = structuredClone(site); delete deleted.adapter;
    a.equal(b.requiresVerification(deleted), true); a.equal(b.verifiedSource(deleted), false);
    a.match(b.portalNotice(site), /性质.*不限.*列表JD.*完整性未验证.*全球全集.*实习不推定校园.*日期未知/);
  }
  for (const gated of [{ api: 'POST ' + campus.api }, { url: 'https://JOBS.BILIBILI.COM:443/campus/positions' }, { url: 'https://jobs.bilibili.com./' },
    { url: 'https://campus.bilibili.com/index.html' }, { api: 'https://jobs.bilibili.com:bad/api' }, { detailApi: 'jobs.bilibili.com/social/positions/1' },
    { key: 'bilibili', url: null }, { adapter: 'bilibili-portal-v1', api: '%' }]) a.equal(b.requiresVerification(gated), true);
  for (const ordinary of [{ url: 'relative' }, { api: '%' }, { url: null }, { origin: 5 }, { url: 'https://example.com/' },
    { url: 'https://jobs.bilibili.com.example.com/' }, { url: 'https://example.com/bilibili' }]) a.equal(b.requiresVerification(ordinary), false);
  a.equal(b.portalNotice({}), '');
});
test('Bilibili literal innerHTML becomes full HTML text without guessed splits or title deletion; attributes are independent', () => {
  for (const site of b.PROFILES) {
    const native = row(), j = b.normalizeRecord({ post: native }, site);
    a.equal(j.id, String(native.id)); a.equal(j.title, native.positionName); a.equal(j.city, native.workLocation); a.equal(j.category, native.postCodeName);
    a.equal(j.url, site.origin + '/' + site.track + '/positions/' + native.id); // Official w(track) child path is plural positions/:id.
    a.deepEqual([j.duty, j.requirements, j.jdComplete], ['', '', false]); a.match(j.description, /^职责 & <List<T>>\n要求：原始全文\n第二行\n完整长文/);
    a.equal((j.description.match(/完整长文/g) || []).length, 400); a.ok(!j.description.includes('<p>')); a.ok(j.title.includes('#012830'));
    a.deepEqual([j.talentPlan, j.date, j.dateKind, j.sourceStatus], [null, null, null, null]); a.equal(Object.hasOwn(j, 'company'), false);
    for (const [name, expected] of [['实习', 'internship'], ['全职', 'full-time'], ['正式', null], ['全职 ', null], ['', null], [null, null]]) {
      const post = { ...native, positionTypeName: name, recruitType: 99, campusProjectId: 999 }, r = b.normalizeRecord({ post }, site);
      a.equal(r.employment, expected); a.deepEqual(r.channels, name === '实习' ? [] : [site.track]);
    }
    for (const positionDescription of ['', null, '/', '<p>&nbsp;</p>']) {
      const r = b.normalizeRecord({ post: { ...native, positionDescription, workLocation: null, postCodeName: null, jobHighlights: '', deptIntro: null } }, site);
      a.deepEqual([r.city, r.category, r.duty, r.requirements, r.jdComplete], ['', '', '', '', false]); a.equal(r.description, positionDescription === '/' ? '/' : '');
    }
    a.deepEqual(native, row());
  }
});
test('Bilibili capture-shaped first ten pages: 89/322 filtered requests are not eligible, fresh unfiltered 411/42 is bound available evidence', () => {
  const list = Array.from({ length: 10 }, (_, i) => row(i + 1));
  // Portable synthetic replay of observed native metadata, not captured sessions or a completeness claim.
  for (const [type, total, pages] of [['3', 89, 9], ['0', 322, 33]]) {
    const captured = page(campus, 1, list, total, pages);
    captured.request.body = { ...captured.request.body, workTypeList: [type], positionTypeList: [type] };
    a.throws(() => b.collectAvailable([captured], campus), /request.*binding/);
  }
  const current = page(campus, 1, list, 411, 42), r = b.collectAvailable([current], campus);
  a.equal(r.complete, false); a.equal(r.total, 10); a.equal(r.verification.policy, 'available'); a.deepEqual(r.verification.pages[0], current);
  a.deepEqual(r.verification.pages[0].request.body.workTypeList, []); a.deepEqual(r.verification.pages[0].request.body.positionTypeList, []);
  a.match(r.issues.join(';'), /官方total 411；实际唯一岗位 10.*分页未穷尽/); a.deepEqual(b.validateEvidence(r.verification, r.jobs, campus).jobs, r.jobs);
  const socialList = list.map(p => { const post = { ...p, recruitType: 0 }; delete post.campusProjectId; return post; });
  const sr = b.collectAvailable([page(social, 1, socialList, 479, 48)], social);
  a.equal(sr.total, 10); a.equal(sr.verification.pages[0].request.body.recruitType, 0); a.equal(sr.jobs[0].post.campusProjectId, undefined);
  const originalSocialFilter = page(social, 1, socialList, 479, 48);
  originalSocialFilter.request.body = { ...originalSocialFilter.request.body, workTypeList: ['3'], positionTypeList: ['3'] };
  a.throws(() => b.collectAvailable([originalSocialFilter], social), /binding/);
});
test('Bilibili requested pageSize boundary avoids extra EOF when native tail pages is recomputed from actual size', async () => {
  const results = [], requestCounts = [];
  for (const [site, total, expectedPages, tailPages] of [[campus, 411, 42, 411], [social, 479, 48, 54]]) {
    let requests = 0;
    const r = await b.fetchAvailable(site, { sleep: async () => {}, fetchImpl: responder(site, async (_, options, body) => {
      requests++;
      a.equal(body.pageSize, 10);
      if (body.pageNum > expectedPages) return { status: 200, json: async () => ({ code: 0,
        data: { list: [], pageNum: 10, pageSize: 1, pages: 0, size: 0, total: 0 }, message: 'success' }) };
      const offset = (body.pageNum - 1) * 10, length = Math.min(10, total - offset);
      const list = Array.from({ length }, (_, i) => ({ ...row(offset + i + 1), positionDescription: 'synthetic complete list description' }));
      return reply(site, body.pageNum, list, total, body.pageNum === expectedPages ? tailPages : expectedPages);
    }) });
    requestCounts.push(requests); results.push([site, total, expectedPages, tailPages, r]);
  }
  a.deepEqual(requestCounts, [42, 48]);
  for (const [site, total, expectedPages, tailPages, r] of results) {
    a.equal(r.total, total); a.equal(r.verification.pages.length, expectedPages); a.equal(r.verification.stopped, null);
    a.equal(r.verification.pages.at(-1).response.data.pages, tailPages); // Preserve native metadata, don't rewrite it into a guessed page count.
    a.equal(r.complete, false); a.deepEqual(r.issues, ['已收录列表JD，详情正文完整性待核验']);
    a.equal(b.validateEvidence(r.verification, r.jobs, site).total, total); a.ok(Object.isFrozen(r) && Object.isFrozen(r.jobs[0].post));
    const oldStopped = structuredClone(r.verification);
    oldStopped.stopped = { request: page(site, expectedPages + 1).request, httpStatus: 200, response: null, error: '请求失败，已停止后续请求' };
    a.throws(() => b.validateEvidence(oldStopped, r.jobs, site), /stopped request binding/); // Repair must explicitly use already-fetched pages, not bless the old extra request.
  }
});
test('Bilibili collected result is detached and deeply frozen, with identical native response/job objects', () => {
  const native = row(), input = [page(campus, 1, [native])], r = b.collectAvailable(input, campus);
  a.ok(Object.isFrozen(r) && Object.isFrozen(r.jobs[0].post.extraNative) && Object.isFrozen(r.verification.pages[0].request.body.postCodeList));
  a.strictEqual(r.jobs[0].post, r.verification.pages[0].response.data.list[0]);
  native.positionDescription = 'caller rewrite'; input[0].request.body.positionName = 'AI';
  a.notEqual(r.jobs[0].post.positionDescription, native.positionDescription); a.equal(r.verification.pages[0].request.body.positionName, '');
  a.throws(() => { r.jobs[0].post.positionName = 'rewrite'; }, TypeError);
});
test('Bilibili total drift/duplicates preserve FIRST official identity/title/order/JD and retain all native records', () => {
  const first = row(), blank = { ...row(), positionName: 'later title', positionDescription: null, positionTypeName: '实习' };
  const r = b.collectAvailable([page(campus, 1, [first], 30, 3), page(campus, 2, [blank, row(2)], 31, 3), page(campus, 3, [blank, row(3)], 29, 3)], campus);
  a.equal(r.total, 3); a.deepEqual(r.jobs[0].post, first); a.deepEqual(r.jobs.map(j => j.post.id), [30710, 30711, 30712]);
  a.deepEqual(r.verification.pages[2].response.data.list[0], blank); a.match(r.issues.join(';'), /重复官方id 2.*首次.*官方total 30→31→29；实际唯一岗位 3/);
  a.equal(b.validateEvidence(r.verification, r.jobs, campus).complete, false); a.throws(() => b.validateJobs([r.jobs[0], r.jobs[0]], campus), /duplicate/);
});
test('Bilibili requested total/native pages boundaries avoid EOF/double scan; short/early empty are only coverage issues', () => {
  const r = b.collectAvailable([page(social, 1, [row()], 21, 3), page(social, 2, [row(2)], 21, 3), page(social, 3, [row(3)], 21, 3)], social);
  a.equal(r.total, 3); a.match(r.issues.join(';'), /官方total 21；实际唯一岗位 3/);
  a.throws(() => b.collectAvailable([...r.verification.pages, page(social, 4, [row(4)], 21, 3)], social), /extra request/);
  const nativeEarlier = b.collectAvailable([page(social, 1, [row()], 21, 1)], social);
  a.match(nativeEarlier.issues.join(';'), /官方total 21；实际唯一岗位 1/);
  a.throws(() => b.collectAvailable([...nativeEarlier.verification.pages, page(social, 2, [row(2)], 21, 1)], social), /extra request/);
  const empty = b.collectAvailable([page(social, 1, [row()], 20, 2), page(social, 2, [], 20, 3)], social);
  a.equal(empty.total, 1); a.match(empty.issues.join(';'), /提前空页.*覆盖待补/);
  a.throws(() => b.collectAvailable([...empty.verification.pages, page(social, 3, [row(2)], 20, 3)], social), /extra request/);
  a.throws(() => b.collectAvailable([page(social, 2)], social), /binding/);
});
test('Bilibili revalidation rejects identity/request/filter/public-header/native-shape/job tampering, never treating unknown response as zero', () => {
  const original = sample();
  for (const mutate of [
    r => r.verification.key = social.key, r => r.verification.api = social.api, r => r.verification.version = 1,
    r => r.verification.policy = 'complete', r => r.verification.extra = null, r => r.verification.pages[0].extra = false,
    r => r.verification.pages[0].request.url += '?csrf=fake', r => r.verification.pages[0].request.method = 'GET',
    r => r.verification.pages[0].request.headers.Cookie = SESSION, r => r.verification.pages[0].request.headers['X-CSRF'] = TOKEN,
    r => r.verification.pages[0].request.headers['User-Agent'] = 'spoof', r => delete r.verification.pages[0].request.headers['X-AppKey'],
    r => r.verification.pages[0].request.headers['X-Channel'] = 'social', r => r.verification.pages[0].request.headers['X-UserType'] = '4',
    r => r.verification.pages[0].request.headers.Origin = 'https://campus.bilibili.com', r => delete r.verification.pages[0].request.headers.Referer,
    r => r.verification.pages[0].request.body.pageNum = 2, r => r.verification.pages[0].request.body.pageSize = 200,
    r => r.verification.pages[0].request.body.workTypeList = ['0'], r => r.verification.pages[0].request.body.positionTypeList = ['3'],
    r => r.verification.pages[0].request.body.recruitType = 1, r => r.verification.pages[0].request.body.onlyHotRecruit = 1,
    r => r.verification.pages[0].request.body.positionName = 'AI', r => r.verification.pages[0].request.body.postCodeList = ['tech'],
    r => r.verification.pages[0].request.body.workLocationList = ['上海'], r => r.verification.pages[0].request.body.extra = [],
    r => r.verification.pages[0].httpStatus = 403, r => r.verification.pages[0].response.code = '0', r => r.verification.pages[0].response.code = 1,
    r => r.verification.pages[0].response.message = 'failed', r => delete r.verification.pages[0].response.message,
    r => r.verification.pages[0].response.extra = false, r => r.verification.pages[0].response.data.extra = true,
    r => r.verification.pages[0].response.data.pages = 0, r => r.verification.pages[0].response.data.pages = '1',
    r => r.verification.pages[0].response.data.pages = 1.5, r => delete r.verification.pages[0].response.data.pages,
    r => r.verification.pages[0].response.data.total = '1', r => r.verification.pages[0].response.data.total = false,
    r => r.verification.pages[0].response.data.total = null, r => r.verification.pages[0].response.data.total = -1,
    r => r.verification.pages[0].response.data.total = Number.MAX_SAFE_INTEGER + 1, r => delete r.verification.pages[0].response.data.total,
    r => r.verification.pages[0].response.data.size = '1', r => r.verification.pages[0].response.data.size = 0,
    r => r.verification.pages[0].response.data.size = 11, r => delete r.verification.pages[0].response.data.size,
    r => r.verification.pages[0].response.data.list = Array(1), r => r.verification.pages[0].response.data.list = Array.from({ length: 11 }, () => row()),
    r => delete r.verification.pages[0].response.data.list, r => r.jobs[0].post.positionDescription = 'invented',
    r => r.jobs[0].post.id++, r => r.jobs[0].post.extraNative.retained = false, r => r.jobs[0].recruitType = 1
  ]) { const bad = JSON.parse(JSON.stringify(original)); mutate(bad); a.throws(() => b.validateEvidence(bad.verification, bad.jobs, campus)); }
  a.throws(() => b.validateEvidence(original.verification, original.jobs, social), /source binding/);
});
test('Bilibili invalid identities/field types/missing or unknown extra JD skip with issues; null/empty JD keep records; zero cannot clear', () => {
  const invalid = [{ ...row(), id: '30710' }, { ...row(), id: 0 }, { ...row(), id: Number.MAX_SAFE_INTEGER + 1 }, { ...row(), positionName: 42 },
    { ...row(), positionDescription: {} }, { ...row(), positionTypeName: [] }, { ...row(), postCodeName: {} }, { ...row(), workLocation: ['上海'] }];
  const missing = row(); delete missing.positionDescription;
  const r = b.collectAvailable([page(social, 1, [...invalid, missing, row(2)], 12, 2), page(social, 2, [
    { ...row(3), positionDescriptions: 'additional JD' }, { ...row(4), jobHighlights: 'additional JD' }, { ...row(5), deptIntro: 'additional JD' },
    { ...row(6), positionDescription: null }, { ...row(7), positionDescription: '' }], 15, 2)], social);
  a.equal(r.total, 3); a.match(r.issues.join(';'), /列表记录未应用.*extra JD/);
  a.deepEqual(r.jobs.map(j => b.normalizeRecord(j, social).description).slice(1), ['', '']);
  a.throws(() => b.collectAvailable([page(social, 1, invalid)], social), /zero cannot clear/);
  a.throws(() => b.collectAvailable([page(social, 1, [], 0, 0)], social), /zero cannot clear/);
  a.throws(() => b.collectAvailable([], social), /limits/); a.throws(() => b.validateJobs([], campus), /zero cannot clear/);
  a.throws(() => b.normalizeRecord({ post: row(), detail: {} }, campus), /post binding/);
});
test('Bilibili normal bootstrap/token once; dynamic CSRF and path/domain-scoped cookies memory only; serial >=200ms/body completion', async () => {
  for (const site of b.PROFILES) {
    let busy = false, clock = 0; const calls = [], starts = [];
    const r = await b.fetchAvailable(site, { now: () => clock, sleep: async ms => { a.equal(busy, false); a.equal(ms, 200); clock += ms; },
      fetchImpl: async (url, options) => {
        a.equal(busy, false); busy = true; starts.push(clock); calls.push([url, options]);
        a.equal(options.redirect, 'error'); a.ok(options.signal instanceof AbortSignal); a.equal(options.headers['User-Agent'], undefined);
        if (url === site.url) {
          a.equal(options.method, 'GET'); a.deepEqual(options.headers, {}); a.equal(options.body, undefined);
          return { ...bootstrap(['SESSION=' + SESSION + '; Domain=.bilibili.com; Path=/; Secure; HttpOnly', 'PREFERENCE=1; Path=/',
            'FOREIGN=foreign-secret; Domain=example.com; Path=/', 'SCOPED=scoped-secret; Path=/' + site.track,
            'EXPIRED=expired-secret; Path=/; Max-Age=0']), text: async () => { await Promise.resolve(); busy = false; return '<html>SPA</html>'; } };
        }
        if (url === CSRF_API) {
          a.equal(options.method, 'GET'); a.equal(options.body, undefined); a.equal(options.headers['X-CSRF'], undefined);
          a.deepEqual(options.headers, { ...publicHeaders(site), Cookie: 'SESSION=' + SESSION + '; PREFERENCE=1' });
          return { ...token(), json: async () => { await Promise.resolve(); busy = false; return { code: 0, data: TOKEN }; } };
        }
        const body = JSON.parse(options.body), expected = page(site, body.pageNum);
        a.equal(url, site.api); a.equal(options.method, 'POST'); a.deepEqual(body, expected.request.body);
        a.deepEqual(options.headers, { ...expected.request.headers, Cookie: 'SESSION=' + SESSION + '; PREFERENCE=1', 'X-CSRF': TOKEN });
        const list = body.pageNum === 1 ? Array.from({ length: 10 }, (_, i) => row(i + 1)) : [row(11)];
        return { status: 200, json: async () => { await Promise.resolve(); busy = false; return page(site, body.pageNum, list, 11, 2).response; } };
      } });
    a.deepEqual(calls.map(([url]) => url), [site.url, CSRF_API, site.api, site.api]); a.equal(r.total, 11); a.equal(r.complete, false);
    a.ok(starts.every((v, i) => !i || v - starts[i - 1] >= 200)); a.equal(b.validateEvidence(r.verification, r.jobs, site).total, 11);
    const stored = JSON.stringify(r);
    for (const secret of [TOKEN, SESSION, 'foreign-secret', 'scoped-secret', 'expired-secret', 'Cookie', 'X-CSRF', 'PREFERENCE', '/auth/v1/csrf']) a.equal(stored.includes(secret), false);
  }
});
test('Bilibili bootstrap/CSRF refusals, redacted/malformed tokens and parser/transport failures stop before POST without retry or secret errors', async () => {
  for (const site of b.PROFILES) {
    for (const failure of [{ status: 412 }, { status: 302 }, { status: 200, text: async () => { throw new Error(TOKEN + SESSION); } }]) {
      let calls = 0;
      await a.rejects(b.fetchAvailable(site, { sleep: async () => {}, fetchImpl: async () => { calls++; return failure; } }), /anonymous bootstrap\/CSRF failed/);
      a.equal(calls, 1);
    }
    for (const failure of [{ status: 403 }, { status: 200, json: async () => ({ code: 1, data: TOKEN }) }, token(null), token({ token: TOKEN }),
      token(''), token('[REDACTED]'), token('bad\r\ntoken'), { status: 200, json: async () => { throw new Error(TOKEN + SESSION); } }]) {
      const calls = [];
      await a.rejects(b.fetchAvailable(site, { sleep: async () => {}, fetchImpl: async (url) => {
        calls.push(url); return url === site.url ? bootstrap() : failure;
      } }), error => error.message === 'Bilibili: anonymous bootstrap/CSRF failed');
      a.deepEqual(calls, [site.url, CSRF_API]);
    }
    let calls = 0;
    await a.rejects(b.fetchAvailable(site, { fetchImpl: async () => { calls++; throw new Error(TOKEN + SESSION); } }), /anonymous bootstrap\/CSRF failed/); a.equal(calls, 1);
  }
});
test('Bilibili HTTP/business/transport/parser/shape/token echo stops once without token refresh; earlier jobs survive sanitized failure evidence', async () => {
  for (const site of b.PROFILES) for (const kind of ['HTTP', 'business', 'transport', 'JSON', 'shape', 'token-echo']) {
    const calls = [];
    const r = await b.fetchAvailable(site, { sleep: async () => {}, fetchImpl: async (url, options) => {
      calls.push(url);
      if (url === site.url) return bootstrap();
      if (url === CSRF_API) return token();
      const body = JSON.parse(options.body), fail = body.pageNum === 2;
      if (fail && kind === 'transport') throw new Error('failed ' + TOKEN + SESSION);
      const native = page(site, body.pageNum, [row(body.pageNum)], 29, 3).response;
      if (fail && kind === 'business') { native.code = 403; native.message = 'failed ' + TOKEN + SESSION; native.credentials = SESSION; }
      if (fail && kind === 'shape') delete native.data.list;
      if (fail && kind === 'token-echo') native.data.list[0].positionDescription = TOKEN;
      return { status: fail && kind === 'HTTP' ? 412 : 200, json: async () => { if (fail && kind === 'JSON') throw new SyntaxError('failed ' + TOKEN + SESSION); return native; } };
    } });
    a.deepEqual(calls, [site.url, CSRF_API, site.api, site.api]); a.equal(r.total, 1); a.equal(r.complete, false);
    a.deepEqual(r.verification.stopped, { request: page(site, 2).request, httpStatus: kind === 'HTTP' ? 412 : kind === 'transport' ? null : 200,
      response: null, error: '请求失败，已停止后续请求' });
    a.match(r.issues.join(';'), /请求失败.*分页未穷尽/); a.equal(b.validateEvidence(r.verification, r.jobs, site).total, 1);
    if (kind === 'shape' || kind === 'token-echo') a.match(r.issues.join(';'), /官网HTTP\/业务成功；响应未通过本地校验/);
    else a.equal(r.issues.some(issue => issue.includes('响应未通过本地校验')), false);
    a.equal(JSON.stringify(r).includes(TOKEN), false); a.equal(JSON.stringify(r).includes(SESSION), false);
    for (const change of [s => s.request.body.pageNum++, s => s.error = TOKEN, s => s.httpStatus = '200', s => s.response = { message: TOKEN }]) {
      const bad = JSON.parse(JSON.stringify(r)); change(bad.verification.stopped); a.throws(() => b.validateEvidence(bad.verification, bad.jobs, site));
    }
    const success = JSON.parse(JSON.stringify(r)); success.verification.stopped.httpStatus = 200;
    success.verification.stopped.response = page(site, 2, [row(2)], 29, 3).response;
    a.throws(() => b.validateEvidence(success.verification, success.jobs, site), /successful page/);
  }
});
test('Bilibili max200 pages and 900000ms process/15000ms request bounds preserve available data without a second scan', async t => {
  const timeouts = [], timeout = AbortSignal.timeout;
  t.mock.method(AbortSignal, 'timeout', ms => { timeouts.push(ms); return timeout(ms); });
  let calls = 0;
  const capped = await b.fetchAvailable(campus, { sleep: async () => {}, fetchImpl: responder(campus, async (_, options, body) => {
    calls++; return reply(campus, body.pageNum, [row()], 3000, 300);
  }) });
  a.equal(calls, 200); a.equal(capped.total, 1); a.match(capped.issues.join(';'), /安全上限.*分页未穷尽/); a.equal(capped.verification.stopped, null);
  let clock = 0; calls = 0;
  const timed = await b.fetchAvailable(campus, { now: () => clock, sleep: async ms => { clock += ms; }, fetchImpl: responder(campus, async (_, options, body) => {
    calls++; return { status: 200, json: async () => { clock = 900000; return page(campus, body.pageNum, [row()], 20, 2).response; } };
  }) });
  a.equal(calls, 1); a.equal(timed.total, 1); a.match(timed.issues.join(';'), /进程安全时限.*分页未穷尽/); a.equal(timed.verification.stopped, null);
  clock = 0; calls = 0; let sleeps = 0;
  const delayed = await b.fetchAvailable(campus, { now: () => clock, sleep: async ms => { if (++sleeps === 3) clock = 900000; else clock += ms; },
    fetchImpl: responder(campus, async (_, options, body) => { calls++; return reply(campus, body.pageNum, [row()], 20, 2); }) });
  a.equal(calls, 1); a.match(delayed.issues.join(';'), /进程安全时限/); a.equal(delayed.verification.stopped, null); // No fictitious unsent failed page.
  clock = 0;
  await b.fetchAvailable(social, { now: () => clock, sleep: async ms => { clock += ms; }, fetchImpl: responder(social, async (_, options, body) => reply(social, body.pageNum, [row()]),
    bootstrap, () => ({ status: 200, json: async () => { clock = 899000; return { code: 0, data: TOKEN }; } })) });
  a.ok(timeouts.every(ms => ms > 0 && ms <= 15000)); a.equal(timeouts.at(-1), 800);
  for (const maxPages of [0, 201, 1.5]) await a.rejects(b.fetchAvailable(campus, { maxPages, fetchImpl: () => a.fail('must not request') }), /limits/);
});
test('Bilibili run atomically emits only available/public/native evidence; initial refusal/zero/unusable rows leave old file and no temp', async t => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ande-bilibili-test-')); t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const file = path.join(dir, 'candidate.json'); fs.writeFileSync(file, 'old real candidate');
  for (const kind of ['bootstrap', 'CSRF', 'HTTP', 'business', 'transport', 'zero', 'invalid']) {
    let calls = 0;
    await a.rejects(b.run([JSON.stringify(social), file], { sleep: async () => {}, fetchImpl: async (url) => {
      calls++;
      if (url === social.url) return kind === 'bootstrap' ? { status: 412 } : bootstrap();
      if (url === CSRF_API) return kind === 'CSRF' ? token(null) : token();
      if (kind === 'HTTP') return { status: 403 };
      if (kind === 'transport') throw new Error(TOKEN + SESSION);
      if (kind === 'business') return { status: 200, json: async () => ({ code: 403, message: TOKEN + SESSION, data: {} }) };
      return reply(social, 1, kind === 'zero' ? [] : [{ ...row(), id: 'invalid' }], kind === 'zero' ? 0 : 1, kind === 'zero' ? 0 : 1);
    } }), error => !error.message.includes(TOKEN) && !error.message.includes(SESSION));
    a.equal(calls, kind === 'bootstrap' ? 1 : kind === 'CSRF' ? 2 : 3);
    a.equal(fs.readFileSync(file, 'utf8'), 'old real candidate'); a.deepEqual(fs.readdirSync(dir), ['candidate.json']);
  }
  const written = await b.run([JSON.stringify(social), file], { sleep: async () => {}, fetchImpl: responder(social, async () => reply(social, 1, [row()])) });
  a.equal(written.mode, 'custom'); a.equal(written.complete, false); a.equal(written.key, social.key); a.equal(written.api, social.api);
  const bytes = fs.readFileSync(file, 'utf8'); a.deepEqual(JSON.parse(bytes), written); a.deepEqual(fs.readdirSync(dir), ['candidate.json']);
  for (const secret of [TOKEN, SESSION, 'Cookie', 'X-CSRF', '/auth/v1/csrf']) a.equal(bytes.includes(secret), false);
  await a.rejects(b.run([JSON.stringify(campus)]), /Usage/);
});
