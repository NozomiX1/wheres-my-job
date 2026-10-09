'use strict';
const test = require('node:test'), a = require('node:assert/strict');
const fs = require('node:fs'), os = require('node:os'), path = require('node:path');
const b = require('../crawler/lib/custom/netease_portal');
const site = { key: 'netease_social', company: '网易', ats: 'custom', adapter: 'netease-portal-v1', track: 'social', batch: '社招', exclude: '(无)',
  origin: 'https://hr.163.com', url: 'https://hr.163.com/job-list.html', api: 'https://hr.163.com/api/hr163/position/queryPage', listJD: true, body: { currentPage: 1, pageSize: 100 } };
const campus = { key: 'netease_huyu', company: '网易互娱', ats: 'custom', adapter: 'netease-portal-v1', track: 'campus', batch: '官网当前应届＋精英实习三项目（102/75/104）', exclude: '(无)',
  origin: 'https://campus.game.163.com', url: 'https://campus.game.163.com/', api: 'https://campus.game.163.com/api/campuspc/position/getJobList', listJD: true,
  body: { pageSize: 100, currentPage: 1, projectIdList: [102, 75, 104] } };
function huyuRow(projectId = 102, id = 4733) {
  return { id, projectId, positionName: '  游戏技术美术工程师  ', positionTypeName: '游戏艺术', workPlaceName: '杭州,上海,广州', interviewCityName: '北京',
    positionDescription: '  List<T> &amp; <b>字面正文</b>\r\n  内部  空白\n\n', positionRequirement: '  List<T> &amp; <b>字面要求</b>\r\n',
    isHot: 1, tagList: [{ id: 137, name: '前沿技术攻坚' }], updateTime: 1791441683000 };
}
function huyuPage(projectId = 102, n = 1, posts = [huyuRow(projectId)], total = posts.length, pages = 1, timeStamp = 1791446928538) {
  return { request: { url: campus.api + '?pageSize=100&currentPage=' + n + '&projectId=' + projectId + '&timeStamp=' + timeStamp, method: 'GET',
    headers: { Accept: 'application/json, text/plain, */*', Referer: campus.origin + '/app/job/position?id=' + projectId }, body: null }, httpStatus: 200,
    response: { code: 200, msg: null, data: { total, pages, list: posts, lastPage: false }, rel: true, subCode: null, traceId: 'synthetic-native-trace' } };
}
function huyuSample() { return b.collectAvailable([huyuPage(102), huyuPage(75, 1, [huyuRow(75, 3724)]), huyuPage(104, 1, [huyuRow(104, 4895)])], campus); }
function row(n = 0) {
  return { id: 76279 + n, name: '高级/资深音乐内容拓展（杭州/北京/广州/成都）', description: '负责音乐人版权合作、自制歌曲打造', requirement: '深度热爱音乐',
    firstPostTypeName: '市场', workPlaceNameList: ['杭州市'], workType: '0', geekPassionateTalentFlag: 1, updateTime: 1791444037000, productName: '网易云音乐', beeUrl: null };
}
function page(n = 1, posts = [row()], total = 2654, pages = 27, lastPage = false) {
  return { request: { url: site.api, method: 'POST', headers: { 'Content-Type': 'application/json;charset=UTF-8', Accept: 'application/json, text/plain, */*', Origin: site.origin, Referer: site.url },
    body: { currentPage: n, pageSize: 100 } }, httpStatus: 200,
    response: { code: 200, msg: null, data: { pages, total, list: posts, lastPage }, subCode: null, traceId: '19f857d25964ab91' } };
}
function sample() { return b.collectAvailable([page()], site); }

test('NetEase retained v2 appends only unobserved native IDs from independently verified prior v1, preserving new order and empty body', () => {
  const fresh = [{ ...row(2), name: '新顺序首岗' }, { ...row(), description: '', requirement: null }];
  const old = [row(), { ...row(1), geekPassionateTalentFlag: 0 }, { ...row(2), name: '旧标题', workType: '1' }];
  const base = b.collectAvailable([page(1, fresh, 2, 1, true)], site), prior = b.collectAvailable([page(1, old, 3, 1, true)], site);
  const baseVerification = structuredClone(base.verification), priorVerification = structuredClone(prior.verification), priorCompletedAt = '2026-10-08T08:19:35.585Z';
  const result = b.collectRetained(baseVerification, priorVerification, site, priorCompletedAt);
  a.equal(result.complete, false); a.equal(result.total, 3); a.deepEqual(result.jobs, [...base.jobs, prior.jobs[1]]);
  a.deepEqual(result.verification, { version: 2, policy: 'available', key: site.key, api: site.api, base: base.verification, prior: prior.verification, priorCompletedAt });
  a.equal(result.verification.base.pages[0].response.data.total, 2); a.equal(result.verification.priorCompletedAt, priorCompletedAt);
  a.strictEqual(result.jobs[2].post, result.verification.prior.pages[0].response.data.list[1]);
  a.ok(Object.isFrozen(result) && Object.isFrozen(result.jobs[2].post));
  a.deepEqual(b.validateEvidence(result.verification, result.jobs, site).jobs, result.jobs);
  const retained = b.normalizeRecord(result.jobs[2], site); a.equal(retained.employment, 'full-time'); a.equal(retained.talentPlan, null);
  a.match(result.issues.join(';'), /旧资料.*08:19:35.585Z.*1.*未重新采集.*全集/);
  baseVerification.pages[0].response.data.list[0].name = 'caller mutation'; priorVerification.pages[0].response.data.list[1].name = 'caller mutation';
  a.equal(result.jobs[0].post.name, '新顺序首岗'); a.equal(result.jobs[2].post.name, old[1].name);
});

test('NetEase retained v2 requires a canonical valid prior completion clock in both collection and revalidation', () => {
  const base = sample().verification, prior = b.collectAvailable([page(1, [row(1)], 1, 1, true)], site).verification;
  const result = b.collectRetained(base, prior, site, '2026-10-08T08:19:35.585Z');
  for (const clock of [undefined, null, 1791447575585, {}, '', '2026-10-08', '2026-10-08T08:19:35Z', '2026-10-08T08:19:35.585+00:00',
    '2026-02-30T08:19:35.585Z', '2026-13-08T08:19:35.585Z', '2026-10-08T24:00:00.000Z']) {
    a.throws(() => b.collectRetained(base, prior, site, clock), /completion time/);
    a.throws(() => b.validateEvidence({ ...result.verification, priorCompletedAt: clock }, result.jobs, site), /completion time/);
  }
});

test('NetEase retained v2 rejects unsanitized credential fields without redacting native JD text or rewriting either wire body', () => {
  const base = sample().verification, prior = b.collectAvailable([page(1, [{ ...row(1), description: 'token=字面正文 &amp; password=字面',
    metadata: { access_token: '[REDACTED]', nested: [{ authorization: '[REDACTED]' }] } }], 1, 1, true)], site).verification;
  const result = b.collectRetained(base, prior, site, '2026-10-08T08:19:35.585Z');
  a.deepEqual(result.verification.base, base); a.deepEqual(result.verification.prior, prior);
  a.equal(result.jobs[1].post.description, 'token=字面正文 &amp; password=字面');
  for (const mutate of [
    v => v.base.pages[0].response.data.list[0].metadata = { 'Access-Token': 'secret' },
    v => v.prior.pages[0].response.data.list[0].metadata.nested[0].authorization = 'Bearer secret',
    v => v.prior.pages[0].response.data.list[0].metadata.cookie = 'session=secret',
    v => v.base.pages[0].response.data.list[0].metadata = { nested: [{ 'Session-Id': 'secret', csrfToken: 'secret' }] }
  ]) {
    const bad = structuredClone(result); mutate(bad.verification);
    a.throws(() => b.collectRetained(bad.verification.base, bad.verification.prior, site, bad.verification.priorCompletedAt), /sanitization/);
    a.throws(() => b.validateEvidence(bad.verification, bad.jobs, site), /sanitization/);
  }
});

test('NetEase retained v2 binds both independent v1 scopes and all raw jobs, rejecting extras, recursive evidence and forged posts', () => {
  const result = b.collectRetained(sample().verification, b.collectAvailable([page(1, [row(1)], 1, 1, true)], site).verification, site, '2026-10-08T08:19:35.585Z');
  for (const mutate of [
    r => r.verification.extra = true, r => r.verification.version = 3, r => r.verification.policy = 'complete', r => r.verification.key = 'netease_huyu',
    r => r.verification.api = campus.api, r => r.verification.prior.key = 'netease_huyu', r => r.verification.base.api = campus.api,
    r => r.verification.base.pages[0].httpStatus = 403, r => r.verification.prior.pages[0].response.code = 403,
    r => r.verification.base.pages[0].request.body.projectId = 102, r => r.verification.prior.pages[0].request.body.product = 'P8',
    r => r.verification.prior.pages[0].request.headers.Referer = campus.url, r => r.verification.prior.jobs = r.jobs,
    r => r.verification.prior = r.verification.base = structuredClone(result.verification),
    r => r.jobs[1].post.workType = '1', r => r.jobs[1].post.id++, r => r.jobs[1].post.description = '伪JD',
    r => r.jobs[1].extra = true, r => r.jobs.push({ post: row(10) }), r => r.jobs.reverse(), r => r.jobs.pop()
  ]) { const bad = JSON.parse(JSON.stringify(result)); mutate(bad); a.throws(() => b.validateEvidence(bad.verification, bad.jobs, site)); }
  a.throws(() => b.collectRetained(result.verification.base, huyuSample().verification, site, result.verification.priorCompletedAt), /source binding/);
  a.throws(() => b.collectRetained(huyuSample().verification, huyuSample().verification, campus, result.verification.priorCompletedAt), /source binding/);
  a.throws(() => b.collectRetained(result.verification.base, result.verification.prior, { ...site, company: '网易互娱' }, result.verification.priorCompletedAt), /unverified source/);
  const invalidObserved = b.collectAvailable([page(1, [row(), { ...row(1), description: {} }], 2, 1, true)], site);
  a.equal(b.collectRetained(invalidObserved.verification, result.verification.prior, site, result.verification.priorCompletedAt).total, 1);
});

test('NetEase retained v2 keeps a stopped base partial, never retries or uses old evidence as a fallback for a refused base', async t => {
  let calls = 0, clock = 0;
  const base = await b.fetchAvailable(site, { now: () => clock, sleep: async ms => { clock += ms; }, fetchImpl: async () => {
    calls++; return calls === 1 ? { status: 200, json: async () => page(1, [row()], 2, 2).response } : { status: 403 };
  } });
  a.equal(calls, 2); a.equal(base.verification.version, 1);
  t.mock.method(globalThis, 'fetch', () => a.fail('retention must never request'));
  const prior = b.collectAvailable([page(1, [row(1)], 1, 1, true)], site).verification;
  const result = b.collectRetained(base.verification, prior, site, '2026-10-08T08:19:35.585Z');
  a.equal(result.total, 2); a.equal(result.complete, false); a.deepEqual(result.verification.base.stopped, base.verification.stopped);
  a.deepEqual(b.validateEvidence(result.verification, result.jobs, site).jobs, result.jobs);
  const refused = structuredClone(base.verification); refused.pages[0].httpStatus = 403;
  a.throws(() => b.collectRetained(refused, prior, site, result.verification.priorCompletedAt), /HTTP/); a.equal(calls, 2);
});

test('NetEase current native social fixture binds all raw fields and maps HTML two sections without inferred facts', () => {
  a.deepEqual(b.PROFILES, [site, campus]); const r = sample();
  a.equal(r.complete, false); a.equal(r.total, 1); a.deepEqual(r.jobs, [{ post: row() }]);
  a.deepEqual(b.validateEvidence(r.verification, r.jobs, site).jobs, r.jobs);
  a.deepEqual(b.normalizeRecord(r.jobs[0], site), { id: '76279', title: '高级/资深音乐内容拓展（杭州/北京/广州/成都）', category: '市场', city: '杭州市',
    channels: ['social'], employment: 'full-time', talentPlan: true, date: null, dateKind: null, sourceStatus: null,
    url: 'https://hr.163.com/job-detail.html?id=76279', duty: '负责音乐人版权合作、自制歌曲打造', requirements: '深度热爱音乐', description: '', jdComplete: false });
});

test('NetEase social uses only the renderer-proven string workType enum, independently of channel and plan', () => {
  for (const [workType, employment] of [['0', 'full-time'], ['1', 'internship'], ['2', null], [null, null], [undefined, null],
    [0, null], [1, null], [2, null], ['', null], [' 1 ', null], ['full-time', null], ['internship', null]]) {
    const post = { ...row(), workType, geekPassionateTalentFlag: 0 };
    if (workType === undefined) delete post.workType;
    const result = b.collectAvailable([page(1, [post], 1, 1, true)], site), out = b.normalizeRecord(result.jobs[0], site);
    a.equal(out.employment, employment); a.deepEqual(out.channels, ['social']); a.equal(out.talentPlan, null);
    a.deepEqual(b.validateEvidence(result.verification, result.jobs, site).jobs, result.jobs);
  }
});

test('NetEase social maps the proven numeric geek badge to true, never using workType or badge absence to exclude other plans', () => {
  for (const [flag, talentPlan] of [[1, true], [0, null], [null, null], [undefined, null], [2, null], [true, null], ['1', null], ['0', null], [{}, null], [[], null]]) {
    for (const workType of ['0', '1', '2', null]) {
      const post = { ...row(), workType, geekPassionateTalentFlag: flag, talentPlan: false, employment: 'internship' };
      if (flag === undefined) delete post.geekPassionateTalentFlag;
      const out = b.normalizeRecord({ post }, site); a.equal(out.talentPlan, talentPlan); a.deepEqual(out.channels, ['social']);
    }
  }
});

test('NetEase social fact projection preserves literal body/identity and does not guess date, status or organization', () => {
  const post = { ...row(), name: '  实习/全职/极客计划原标题  ', description: '<p>List&lt;T&gt; &amp;amp; &amp;lt;T&amp;gt;</p>',
    requirement: '<p>List&lt;T&gt; &amp;amp; &amp;lt;T&amp;gt;</p>', workPlaceNameList: ['杭州', '', '北京', '杭州'] };
  for (const [workType, employment, flag, talentPlan] of [['0', 'full-time', 0, null], ['1', 'internship', 1, true], ['2', null, 1, true], [null, null, 0, null]]) {
    const native = { ...post, workType, geekPassionateTalentFlag: flag, productName: '网易互娱', firstDepName: '极客计划部门', parentProduct: 'P8',
      publishedAt: '2026-10-08', updatedAt: '2026-10-08T00:00:00Z', sourceStatus: 'open', channels: ['campus'], employment: 'full-time', talentPlan: false };
    const before = structuredClone(native), out = b.normalizeRecord({ post: native }, site);
    a.deepEqual(out, { id: '76279', title: post.name, category: '市场', city: '杭州//北京/杭州', channels: ['social'], employment, talentPlan,
      date: null, dateKind: null, sourceStatus: null, url: 'https://hr.163.com/job-detail.html?id=76279',
      duty: 'List<T> &amp; &lt;T&gt;', requirements: 'List<T> &amp; &lt;T&gt;', description: '', jdComplete: false });
    a.deepEqual(native, before);
  }
  for (const patch of [{ key: 'netease_huyu' }, { key: 'netease_leihuo' }, { key: 'other' }, { company: '网易互娱' }, { company: '网易云音乐' }, { adapter: undefined }])
    a.throws(() => b.normalizeRecord({ post }, { ...site, ...patch }), /unverified source/);
  a.throws(() => b.normalizeRecord({ post, renderer: 'commons.c65656b8' }, site), /native post binding/);
});

test('Huyu cannot inherit social workType/geek badge facts, and still preserves its own literal TEXT and navigation facts', () => {
  for (const [projectId, channels, employment] of [[102, ['campus'], null], [75, [], 'internship'], [104, [], 'internship']]) {
    for (const workType of ['0', '1', '2']) {
      const post = { ...huyuRow(projectId), workType, geekPassionateTalentFlag: 1, productName: '网易', talentPlan: true, employment: 'full-time' };
      const out = b.normalizeRecord({ post }, campus);
      a.deepEqual(out.channels, channels); a.equal(out.employment, employment); a.equal(out.talentPlan, null);
      a.equal(out.duty, post.positionDescription); a.equal(out.requirements, post.positionRequirement);
      a.deepEqual([out.date, out.dateKind, out.sourceStatus], [null, null, null]);
    }
  }
});

test('NetEase social notice distinguishes proven work types/geek badge from unknown dispatch/other plans, without changing Huyu claims', () => {
  const notice = b.portalNotice(site);
  a.match(notice, /workType.*全职.*实习.*派遣.*未知/); a.match(notice, /极客计划.*其余.*计划.*未知/);
  a.match(notice, /实习不推定校园渠道/); a.match(notice, /原状态.*可靠日期未知/); a.match(notice, /完整性未验证/);
  a.doesNotMatch(notice, /性质、人才计划.*未知|不按workType/);
  a.match(b.portalNotice(campus), /102性质及全部人才计划、原状态、可靠日期未知.*不继承社招\/雷火资格/);
});

test('NetEase unsigned native POSTs finish each body before >=200ms next start; native ending, not short pages, controls pagination', async () => {
  let clock = 0, busy = false; const starts = [], calls = [];
  const result = await b.fetchAvailable(site, { now: () => clock, sleep: async ms => { a.equal(busy, false); a.equal(ms, 193); clock += ms; }, fetchImpl: async (url, options) => {
    a.equal(busy, false); busy = true; starts.push(clock); calls.push(url);
    const n = JSON.parse(options.body).currentPage, expected = page(n, [row(n)], 20, 2, n === 2);
    a.equal(options.method, 'POST'); a.deepEqual(options.headers, expected.request.headers); a.deepEqual(JSON.parse(options.body), expected.request.body);
    a.equal(options.redirect, 'error'); a.ok(options.signal instanceof AbortSignal);
    return { status: 200, json: async () => { await Promise.resolve(); clock += 7; busy = false; return expected.response; } };
  } });
  a.deepEqual(calls, [site.api, site.api]); a.deepEqual(starts, [0, 200]); a.equal(result.total, 2); a.equal(result.complete, false);
  a.equal(result.verification.stopped, null); a.equal(b.validateEvidence(result.verification, result.jobs, site).total, 2);
});

test('NetEase exact frozen social scope rejects aliases, campus projects, removed adapter and changed request filters', async () => {
  a.ok(Object.isFrozen(b.PROFILES) && Object.isFrozen(b.PROFILES[0].body)); a.equal(b.verifiedSource(site), true);
  for (const patch of [{ key: 'netease_huyu' }, { key: 'netease_leihuo' }, { key: 'alias' }, { company: '网易互娱' }, { ats: 'moka' }, { adapter: undefined },
    { track: 'campus' }, { url: site.url + '?productKey=P8' }, { api: site.api + '?id=1' }, { body: { ...site.body, projectId: 102 } }, { body: { ...site.body, pageSize: 10 } }]) {
    const bad = { ...site, ...patch }; a.equal(b.requiresVerification(bad), true); a.equal(b.verifiedSource(bad), false);
    await a.rejects(b.fetchAvailable(bad, { fetchImpl: () => a.fail('unqualified source must never request') }), /unverified source/);
  }
  const absent = structuredClone(site); delete absent.adapter; a.equal(b.requiresVerification(absent), true); a.equal(b.verifiedSource(absent), false);
  for (const bad of [{ url: 'https://HR.163.COM:443/job-list.html' }, { api: 'POST ' + site.api }, { origin: '%' }, { detailApi: null }]) a.equal(b.requiresVerification(bad), true);
  a.equal(b.requiresVerification({ url: 'https://example.com' }), false); a.equal(b.portalNotice({}), ''); a.match(b.portalNotice(site), /完整性未验证/);
});
test('NetEase HTML conversion is whole, single-decode, independent even when identical; empty/null/symbol JD stays honest', () => {
  const html = '<p>完整 &amp; &lt;List&lt;T&gt;&gt;</p><p>段落<br>结尾</p><script>hidden()</script>';
  const post = { ...row(), name: '  实习/资深/人才计划原标题  ', description: html, requirement: html, workPlaceNameList: ['杭州', '北京', '杭州'], workType: null, geekPassionateTalentFlag: 0 };
  const j = b.normalizeRecord({ post }, site);
  a.equal(j.title, post.name); a.equal(j.duty, '完整 & <List<T>>\n段落\n结尾'); a.equal(j.requirements, j.duty); a.equal(j.description, '');
  a.equal(j.city, '杭州/北京/杭州'); a.equal(j.jdComplete, false); a.deepEqual([j.employment, j.talentPlan, j.date, j.dateKind, j.sourceStatus], [null, null, null, null, null]);
  const long = '长正文'.repeat(1000); a.equal(b.normalizeRecord({ post: { ...post, description: long } }, site).duty, long);
  for (const value of ['', null, '/']) {
    const result = b.collectAvailable([page(1, [{ ...post, description: value, requirement: value, workPlaceNameList: null, firstPostTypeName: null }], 1, 1, true)], site);
    const out = b.normalizeRecord(result.jobs[0], site); a.equal(out.duty, value ?? ''); a.equal(out.requirements, value ?? ''); a.equal(out.city, ''); a.equal(out.category, ''); a.equal(out.jdComplete, false);
  }
});
test('NetEase native raw evidence detaches/freeze inputs, skips only illegal records and preserves first duplicate with total drift issues', () => {
  const post = row(), first = page(1, [post, { ...row(1), description: {} }], 40, 4), blank = { ...row(), description: '', requirement: null };
  const result = b.collectAvailable([first, page(2, [blank, row(2)], 28, 3), page(3, [], 27, 3, true)], site);
  a.equal(result.total, 2); a.equal(result.jobs[0].post.description, post.description); a.equal(result.jobs[1].post.id, 76281);
  const projected = b.normalizeRecord(result.jobs[0], site); a.equal(projected.duty, post.description); a.equal(projected.requirements, post.requirement);
  a.equal(projected.employment, 'full-time'); a.equal(projected.talentPlan, true);
  a.strictEqual(result.jobs[0].post, result.verification.pages[0].response.data.list[0]); a.ok(Object.isFrozen(result.jobs[0].post));
  post.description = 'caller mutation'; first.request.body.currentPage = 77; a.notEqual(result.jobs[0].post.description, post.description); a.equal(result.verification.pages[0].request.body.currentPage, 1);
  a.match(result.issues.join(';'), /列表记录未应用/); a.match(result.issues.join(';'), /重复官方id 1/); a.match(result.issues.join(';'), /官方total 40→28→27；实际唯一岗位 2/);
  a.throws(() => b.validateJobs([result.jobs[0], result.jobs[0]], site), /duplicate/);
  a.throws(() => b.collectAvailable([...result.verification.pages, page(4)], site), /extra request/);
});
test('NetEase source/request/HTTP/native/JD/all metadata bindings reject tampering and malformed native envelopes', () => {
  const original = sample();
  for (const mutate of [
    r => r.verification.key = 'netease_huyu', r => r.verification.api += '?filter=AI', r => r.verification.policy = 'complete', r => r.verification.complete = true,
    r => r.verification.version = 2, r => r.verification.pages[0].httpStatus = 403, r => r.verification.pages[0].request.method = 'GET',
    r => r.verification.pages[0].request.url += '?fake=1', r => r.verification.pages[0].request.body.currentPage = 0, r => r.verification.pages[0].request.body.pageSize = 10,
    r => r.verification.pages[0].request.body.product = 'P8', r => r.verification.pages[0].request.headers.Origin += '/', r => r.verification.pages[0].request.headers.Referer = site.origin + '/',
    r => r.verification.pages[0].request.headers['User-Agent'] = 'Chrome spoof', r => r.verification.pages[0].request.headers.Cookie = 'session=secret',
    r => r.verification.pages[0].response.code = '200', r => r.verification.pages[0].response.msg = 'refused', r => r.verification.pages[0].response.subCode = 'REFUSED',
    r => delete r.verification.pages[0].response.traceId, r => r.verification.pages[0].response.data.list = {}, r => r.verification.pages[0].response.data.list = Array(1),
    r => r.verification.pages[0].response.data.lastPage = 'false', r => r.verification.pages[0].response.data.total = '2654', r => r.verification.pages[0].response.data.pages = null,
    r => r.verification.pages[0].response.data.list[0].requirement = 'tampered native JD', r => r.jobs[0].post.description = 'invented JD',
    r => r.jobs[0].post.workType = 'guessed full time', r => r.jobs[0].post.geekPassionateTalentFlag = 0, r => r.jobs[0].post.id++, r => r.jobs[0].extra = true
  ]) { const bad = JSON.parse(JSON.stringify(original)); mutate(bad); a.throws(() => b.validateEvidence(bad.verification, bad.jobs, site)); }
  for (const invalid of [{ ...row(), id: '76279' }, { ...row(), id: 0 }, { ...row(), id: Number.MAX_SAFE_INTEGER + 1 }, { ...row(), id: '1&unsafe=1' },
    { ...row(), name: null }, { ...row(), description: [] }, { ...row(), requirement: 5 }, { ...row(), workPlaceNameList: [null] }]) {
    a.throws(() => b.normalizeRecord({ post: invalid }, site));
    const r = b.collectAvailable([page(1, [invalid, row(1)], 2, 1, true)], site); a.equal(r.total, 1); a.match(r.issues.join(';'), /记录未应用/);
  }
  const missing = row(); delete missing.requirement; a.throws(() => b.normalizeRecord({ post: missing }, site));
  a.throws(() => b.collectAvailable([page(1, [], 0, 0, true)], site), /zero cannot clear/); a.throws(() => b.validateJobs([], site), /zero cannot clear/);
});
test('NetEase HTTP/business/transport/JSON/shape refusal stops immediately, with no retry/fallback and prior usable pages preserved', async () => {
  for (const kind of ['HTTP', 'business', 'transport', 'JSON', 'shape']) {
    let calls = 0;
    const result = await b.fetchAvailable(site, { sleep: async () => {}, fetchImpl: async () => {
      calls++; if (calls === 1) return { status: 200, json: async () => page().response };
      if (kind === 'transport') throw new Error('transport failure');
      const native = page(2, [row(1)]).response;
      if (kind === 'business') native.code = 412; if (kind === 'shape') native.data.list = {};
      return { status: kind === 'HTTP' ? 403 : 200, json: async () => { if (kind === 'JSON') throw new SyntaxError('not JSON'); return native; } };
    } });
    a.equal(calls, 2); a.equal(result.total, 1); a.equal(result.complete, false); a.match(result.issues.join(';'), /请求停止/);
    a.equal(result.verification.stopped.request.body.currentPage, 2); a.equal(b.validateEvidence(result.verification, result.jobs, site).total, 1);
    const bad = structuredClone(result); bad.verification.stopped.request.body.currentPage = 3; a.throws(() => b.validateEvidence(bad.verification, bad.jobs, site), /stopped request/);
    const disguised = structuredClone(result); disguised.verification.stopped.httpStatus = 200; disguised.verification.stopped.response = page(2).response;
    a.throws(() => b.validateEvidence(disguised.verification, disguised.jobs, site), /successful page/);
  }
  let calls = 0; await a.rejects(b.fetchAvailable(site, { fetchImpl: async () => { calls++; return { status: 429 }; } }), /HTTP/); a.equal(calls, 1);
});
test('NetEase 200-page/900s safety bounds report partial coverage rather than inventing complete or a zero', async () => {
  let calls = 0;
  const capped = await b.fetchAvailable(site, { sleep: async () => {}, fetchImpl: async (_, options) => {
    calls++; return { status: 200, json: async () => page(JSON.parse(options.body).currentPage, [row()], 3000, 300).response };
  } });
  a.equal(calls, 200); a.equal(capped.total, 1); a.equal(capped.complete, false); a.match(capped.issues.join(';'), /安全上限/);
  let clock = 0; calls = 0;
  const timed = await b.fetchAvailable(site, { now: () => clock, sleep: async ms => { clock += ms; }, fetchImpl: async () => {
    calls++; return { status: 200, json: async () => { clock = 900000; return page().response; } };
  } });
  a.equal(calls, 1); a.equal(timed.total, 1); a.equal(timed.verification.stopped, null); a.match(timed.issues.join(';'), /进程安全时限/);
  for (const maxPages of [0, 201, 1.5]) await a.rejects(b.fetchAvailable(site, { maxPages, fetchImpl: () => a.fail('invalid limit must not request') }), /limits/);
});
test('NetEase atomic run writes only available envelopes and preserves an old candidate on refusal or unproved zero', async t => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ande-netease-test-')); t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const file = path.join(dir, 'candidate.json'); fs.writeFileSync(file, 'old real candidate');
  for (const native of [null, page(1, [], 0, 0, true).response]) {
    await a.rejects(b.run([JSON.stringify(site), file], { fetchImpl: async () => native ? { status: 200, json: async () => native } : { status: 403 } }));
    a.equal(fs.readFileSync(file, 'utf8'), 'old real candidate'); a.deepEqual(fs.readdirSync(dir), ['candidate.json']);
  }
  const written = await b.run([JSON.stringify(site), file], { fetchImpl: async () => ({ status: 200, json: async () => page(1, [row()], 1, 1, true).response }) });
  a.equal(written.mode, 'custom'); a.equal(written.key, site.key); a.equal(written.api, site.api); a.equal(written.complete, false);
  a.deepEqual(JSON.parse(fs.readFileSync(file, 'utf8')), written); a.deepEqual(fs.readdirSync(dir), ['candidate.json']);
});

const retainedCapture = '/Users/nozomi/lab/wheres-my-job-work/third-batch-20261008T071347946Z/completion-20261008T133155216Z/';
test('NetEase retained v2 offline capture replays 2657 unchanged new jobs plus exactly three old full-time facts, never complete',
  { skip: !fs.existsSync(retainedCapture + 'netease_social-available.json') || !fs.existsSync(retainedCapture + 'before-out/netease_social_snapshot.json') }, () => {
    const base = JSON.parse(fs.readFileSync(retainedCapture + 'netease_social-available.json', 'utf8'));
    const prior = JSON.parse(fs.readFileSync(retainedCapture + 'before-out/netease_social_snapshot.json', 'utf8'));
    const before = [JSON.stringify(base), JSON.stringify(prior)];
    b.validateEvidence(base.verification, base.jobs, site); b.validateEvidence(prior.verification, prior.jobs, site);
    const result = b.collectRetained(base.verification, prior.verification, site, prior.completedAt);
    a.equal(base.jobs.length, 2657); a.equal(result.total, 2660); a.equal(result.complete, false);
    a.deepEqual(result.jobs.slice(0, 2657), base.jobs); a.equal(result.verification.priorCompletedAt, '2026-10-08T08:19:35.585Z');
    const retained = result.jobs.slice(2657); a.deepEqual(retained.map(j => j.post.id).sort((x, y) => x - y), [78335, 78336, 78339]);
    for (const job of retained) {
      a.deepEqual(job, prior.jobs.find(j => j.post.id === job.post.id)); a.equal(job.post.workType, '0'); a.equal(job.post.geekPassionateTalentFlag, 0);
      const out = b.normalizeRecord(job, site); a.equal(out.employment, 'full-time'); a.equal(out.talentPlan, null);
    }
    const counts = {}; for (const job of result.jobs) { const employment = b.normalizeRecord(job, site).employment; counts[employment] = (counts[employment] || 0) + 1; }
    a.deepEqual(counts, { 'full-time': 2027, internship: 577, null: 56 });
    a.deepEqual(b.validateEvidence(result.verification, result.jobs, site).jobs, result.jobs);
    a.deepEqual([JSON.stringify(base), JSON.stringify(prior)], before);
  });

const socialScripts = '/Users/nozomi/lab/wheres-my-job-work/third-batch-20261008T071347946Z/observe-netease-social/scripts/';
test('NetEase offline current first-party renderer proves strict workType labels and the geek badge display chain without executing scripts',
  { skip: !fs.existsSync(socialScripts + '003.js') || !fs.existsSync(socialScripts + '009.js') }, () => {
    const commons = fs.readFileSync(socialScripts + '003.js', 'utf8'), list = fs.readFileSync(socialScripts + '009.js', 'utf8');
    const enumStart = commons.indexOf('"0vM+":function'), utilityStart = commons.indexOf('uJMD:function'); a.ok(enumStart >= 0 && utilityStart >= 0);
    const workTypes = commons.slice(enumStart, enumStart + 400), utility = commons.slice(utilityStart, utilityStart + 2400);
    a.ok(workTypes.includes('{id:"0",en_name:"Full time",name:"\\u5168\\u804c"}'));
    a.ok(workTypes.includes('{id:"1",en_name:"Internship",name:"\\u5b9e\\u4e60"}'));
    a.ok(workTypes.includes('{id:"2",en_name:"Dispatch",name:"\\u6d3e\\u9063"}'));
    a.ok(utility.includes('n.d(t,"j",(function(){return g}))') && utility.includes('n("0vM+")'));
    a.ok(utility.includes('c.b.map((function(r){r.id===e&&(n="zh"===t?r.name:r.en_name)}))'));
    a.ok(list.includes('l=n("uJMD")') && list.includes('m=Object(l.j)(t.workType,e)'));
    a.ok(list.includes('O=m.workType') && list.includes('O&&g.a.createElement("span",{className:"tag tag-work"},O)'));
    a.ok(list.includes('geekPassionateTalentFlag:!!t.geekPassionateTalentFlag') && list.includes('A=m.geekPassionateTalentFlag'));
    a.ok(list.includes('I=n("VhrK")') && list.includes('I.a,{isGeek:A}'));
    const badgeStart = list.indexOf('VhrK:function'); a.ok(badgeStart >= 0); const badge = list.slice(badgeStart, badgeStart + 1400);
    a.ok(badge.includes('t=e.isGeek') && badge.includes('return!!n&&i.a.createElement("img"'));
    a.ok(badge.includes('alt:"\\u6781\\u5ba2\\u8ba1\\u5212"'));
  });

const observedFile = '/Users/nozomi/lab/wheres-my-job-work/third-batch-20261008T071347946Z/node-first/netease_social.json';
test('NetEase offline parent normal Node 100-row capture binds actual plain wire body/headers and preserves all native records', { skip: !fs.existsSync(observedFile) }, () => {
  const raw = JSON.parse(fs.readFileSync(observedFile, 'utf8'));
  a.equal(raw.httpStatus, 200); a.deepEqual(raw.request.body, { currentPage: 1, pageSize: 100 });
  a.equal(raw.response.data.total, 2654); a.equal(raw.response.data.pages, 27); a.equal(raw.response.data.list.length, 100);
  const result = b.collectAvailable([{ request: raw.request, httpStatus: raw.httpStatus, response: raw.response }], site);
  a.equal(result.total, 100); a.equal(result.complete, false); a.deepEqual(result.jobs.map(j => j.post), raw.response.data.list);
  a.deepEqual(result.verification.pages[0].request, raw.request); a.deepEqual(result.verification.pages[0].response, raw.response);
  a.equal(b.validateEvidence(result.verification, result.jobs, site).total, 100);
});

test('Huyu independently frozen current navigation scope enumerates 102/75/104, preserves TEXT, comma city and original official identity', () => {
  a.deepEqual(b.PROFILES, [site, campus]); a.equal(b.verifiedSource(campus), true); a.equal(b.verifiedSource({ ...site, key: 'netease_huyu' }), false);
  const result = huyuSample(); a.equal(result.complete, false); a.equal(result.total, 3);
  a.deepEqual(b.normalizeRecord(result.jobs[0], campus), { id: '4733', title: '  游戏技术美术工程师  ', category: '游戏艺术', city: '杭州,上海,广州', channels: ['campus'],
    employment: null, talentPlan: null, date: null, dateKind: null, sourceStatus: null, url: 'https://campus.game.163.com/app/detail/index?id=4733&projectId=102',
    duty: '  List<T> &amp; <b>字面正文</b>\r\n  内部  空白\n\n', requirements: '  List<T> &amp; <b>字面要求</b>\r\n', description: '', jdComplete: false });
  for (const job of result.jobs.slice(1)) { const j = b.normalizeRecord(job, campus); a.deepEqual(j.channels, []); a.equal(j.employment, 'internship'); a.equal(j.talentPlan, null); }
  a.equal(b.validateEvidence(result.verification, result.jobs, campus).total, 3);
});

test('Huyu exported request/page helpers bind literal GET query, native timestamp, headers/null body and rel business status', () => {
  const p = huyuPage(); a.deepEqual(b.requestFor(campus, 1, 102, 1791446928538), p.request);
  a.deepEqual(b.pageData(p, campus, 1, 102), p.response.data); a.equal(b.atEnd(p.response.data, 1), true); // Native lastPage=false despite pages=1.
  a.equal(b.atEnd({ ...p.response.data, pages: 2 }, 1), false);
  for (const projectId of [null, 77, 74, '102']) a.throws(() => b.requestFor(campus, 1, projectId, 1791446928538), /project/);
  for (const timeStamp of [-1, '1791446928538', NaN, Number.MAX_SAFE_INTEGER + 1]) a.throws(() => b.requestFor(campus, 1, 102, timeStamp), /timestamp/);
  a.throws(() => b.requestFor(campus, 101, 102, 1791446928538), /page/);
  for (const mutate of [
    p => p.request.url += '&keyword=AI', p => p.request.url = p.request.url.replace('projectId=102', 'projectId=104'), p => p.request.url = p.request.url.replace('1791446928538', '01791446928538'),
    p => p.request.url = p.request.url.replace('1791446928538', 'NaN'), p => p.request.method = 'POST', p => p.request.body = {}, p => p.request.headers.Origin = campus.origin,
    p => p.request.headers.Referer = campus.url, p => p.request.headers['User-Agent'] = 'fake Chrome', p => p.httpStatus = 403,
    p => p.response.rel = false, p => p.response.code = '200', p => p.response.data.total = '1', p => p.response.data.lastPage = 'false'
  ]) { const bad = structuredClone(p); mutate(bad); a.throws(() => b.pageData(bad, campus, 1, 102)); }
});
test('Huyu scope is independently immutable and cannot downgrade to social/legacy projects/another company or qualified leihuo', async () => {
  a.ok(Object.isFrozen(b.PROFILES[1].body.projectIdList));
  for (const patch of [{ key: 'alias' }, { key: 'netease_leihuo' }, { adapter: undefined }, { ats: 'moka' }, { company: '网易' }, { track: 'social' },
    { api: site.api }, { url: campus.url + 'app/job/position?id=104' }, { body: { ...campus.body, projectIdList: [102] } },
    { body: { ...campus.body, projectIdList: [102, 104, 75] } }, { body: { ...campus.body, projectIdList: [102, 75, 104, 74] } }, { body: { ...campus.body, pageSize: 10 } }]) {
    const bad = { ...campus, ...patch }; a.equal(b.requiresVerification(bad), true); a.equal(b.verifiedSource(bad), false);
    await a.rejects(b.fetchAvailable(bad, { fetchImpl: () => a.fail('unqualified scope must not request') }), /unverified source/);
  }
  const dropped = structuredClone(campus); delete dropped.adapter; a.equal(b.requiresVerification(dropped), true); a.equal(b.verifiedSource(dropped), false);
  a.equal(b.PROFILES.some(p => p.key === 'netease_leihuo'), false); a.match(b.portalNotice(campus), /102应届生.*75.*104.*不把无id默认104.*实习不推定校园/);
});
test('Huyu project sequences start at page1; zeros are retained as native evidence, short/duplicate/total drift remain available', () => {
  const first = huyuRow(), duplicate = { ...first, positionDescription: '' };
  const input = [huyuPage(102, 1, [first], 3, 2), huyuPage(102, 2, [duplicate], 2, 2), huyuPage(75, 1, [], 0, 0), huyuPage(104, 1, [huyuRow(104, 4895)])];
  const result = b.collectAvailable(input, campus); a.equal(result.total, 2); a.equal(result.jobs[0].post.positionDescription, first.positionDescription);
  a.strictEqual(result.jobs[0].post, result.verification.pages[0].response.data.list[0]); a.ok(Object.isFrozen(result.jobs[0].post.tagList[0]));
  a.equal(result.verification.pages[2].response.data.total, 0); a.match(result.issues.join(';'), /projectId=102：官方total 3→2；实际唯一岗位 1/);
  a.match(result.issues.join(';'), /重复官方id 1/); a.equal(result.complete, false); a.equal(b.validateEvidence(result.verification, result.jobs, campus).total, 2);
  a.throws(() => b.collectAvailable([huyuPage(75)], campus), /binding/);
  a.throws(() => b.collectAvailable([huyuPage(102), huyuPage(104)], campus), /binding/);
  a.throws(() => b.collectAvailable([...huyuSample().verification.pages, huyuPage(104)], campus), /extra request/);
  const partial = b.collectAvailable([huyuPage(102)], campus); a.match(partial.issues.join(';'), /未完成项目 75\/104/);
  const cross = b.collectAvailable([huyuPage(102), huyuPage(75, 1, [huyuRow(75)]), huyuPage(104, 1, [huyuRow(104, 4895)])], campus);
  a.deepEqual(cross.jobs.map(j => j.post.id), [4733, 4895]); a.equal(cross.jobs[0].post.projectId, 102); a.match(cross.issues.join(';'), /跨项目同官方id 4733.*102→75.*未生成复合ID/);
  const zeroThenGood = b.collectAvailable([huyuPage(102, 1, [], 0, 0), huyuPage(75, 1, [huyuRow(75, 3724)]), huyuPage(104, 1, [], 0, 0)], campus);
  a.equal(zeroThenGood.total, 1); a.equal(zeroThenGood.jobs[0].post.projectId, 75);
  a.throws(() => b.collectAvailable([102, 75, 104].map(id => huyuPage(id, 1, [], 0, 0)), campus), /zero cannot clear/);
});
test('Huyu raw project identity/native TEXT/JD/metadata remain bound; illegal records skip individually without invented placeholders', () => {
  const original = huyuSample();
  for (const mutate of [r => r.verification.key = 'netease_social', r => r.verification.api = site.api, r => r.verification.pages[1].request.url += '&filter=AI',
    r => r.verification.pages[1].response.data.list[0].projectId = 102, r => r.jobs[0].post.projectId = 75, r => r.jobs[0].post.positionDescription = 'invented JD',
    r => r.jobs[0].post.tagList[0].name = 'invented tag', r => r.jobs[0].post.updateTime = 1, r => r.jobs[0].post.interviewCityName = 'invented interview city']) {
    const bad = JSON.parse(JSON.stringify(original)); mutate(bad); a.throws(() => b.validateEvidence(bad.verification, bad.jobs, campus));
  }
  const illegal = [{ ...huyuRow(), id: '4733' }, { ...huyuRow(), positionName: 3 }, { ...huyuRow(), projectId: 74 }, { ...huyuRow(), projectId: 75 },
    { ...huyuRow(), positionDescription: {} }, { ...huyuRow(), positionRequirement: [] }, { ...huyuRow(), workPlaceName: ['杭州'] }];
  const result = b.collectAvailable([huyuPage(102, 1, [...illegal, huyuRow()], 8), huyuPage(75, 1, [], 0, 0), huyuPage(104, 1, [], 0, 0)], campus);
  a.equal(result.total, 1); a.match(result.issues.join(';'), /native project identity\/request binding/); a.equal(result.verification.pages[0].response.data.list.length, 8);
  for (const value of ['', null, '/', '  与要求同文 &amp; <T>\n\n']) {
    const post = { ...huyuRow(), positionDescription: value, positionRequirement: value, workPlaceName: null, positionTypeName: null };
    const j = b.normalizeRecord({ post }, campus); a.equal(j.duty, value ?? ''); a.equal(j.requirements, value ?? ''); a.equal(j.city, ''); a.equal(j.category, ''); a.equal(j.jdComplete, false);
    a.notEqual(j.duty, '无描述'); a.notEqual(j.requirements, '无要求');
  }
  const long = '完整原字符'.repeat(1000); a.equal(b.normalizeRecord({ post: { ...huyuRow(), positionDescription: long } }, campus).duty, long);
});
test('Huyu GETs use >=200ms START spacing, finish bodies without overlap and enumerate only current projects; later refusal halts all requests', async () => {
  let clock = 1791446928538, busy = false; const starts = [], waits = [], ids = [];
  const result = await b.fetchAvailable(campus, { now: () => clock, sleep: async ms => { a.equal(busy, false); waits.push(ms); clock += ms; }, fetchImpl: async (url, options) => {
    a.equal(busy, false); busy = true; starts.push(clock); const u = new URL(url), id = Number(u.searchParams.get('projectId')); ids.push(id);
    a.equal(u.searchParams.get('timeStamp'), String(clock)); a.equal(options.method, 'GET'); a.equal(options.body, undefined);
    a.deepEqual(options.headers, huyuPage(id).request.headers); a.equal(options.redirect, 'error'); a.ok(options.signal instanceof AbortSignal);
    return { status: 200, json: async () => { await Promise.resolve(); clock += id === 102 ? 7 : 210; busy = false; return huyuPage(id, 1, [huyuRow(id, id)]).response; } };
  } });
  a.deepEqual(ids, [102, 75, 104]); a.deepEqual(waits, [193]); a.deepEqual(starts, [1791446928538, 1791446928738, 1791446928948]); a.equal(result.total, 3);
  for (const kind of ['HTTP', 'business', 'JSON', 'transport']) {
    let calls = 0;
    const partial = await b.fetchAvailable(campus, { sleep: async () => {}, fetchImpl: async url => {
      calls++; const id = Number(new URL(url).searchParams.get('projectId')); if (calls === 1) return { status: 200, json: async () => huyuPage(102).response };
      a.equal(id, 75); if (kind === 'transport') throw new Error('transport failure');
      const native = huyuPage(75).response; if (kind === 'business') native.rel = false;
      return { status: kind === 'HTTP' ? 403 : 200, json: async () => { if (kind === 'JSON') throw new Error('invalid JSON'); return native; } };
    } });
    a.equal(calls, 2); a.equal(partial.total, 1); a.match(partial.issues.join(';'), /请求停止/); a.equal(b.validateEvidence(partial.verification, partial.jobs, campus).total, 1);
    const forged = structuredClone(partial); forged.verification.stopped.request.url = forged.verification.stopped.request.url.replace('projectId=75', 'projectId=104');
    a.throws(() => b.validateEvidence(forged.verification, forged.jobs, campus), /stopped request/);
  }
});
test('Huyu request/body abort shares <=15s/900s budget; project/source caps preserve available prefixes and no fabricated stop request', async t => {
  const start = 1791446928538; let clock = start, calls = 0; const budgets = [], timeout = AbortSignal.timeout;
  t.mock.method(AbortSignal, 'timeout', ms => { budgets.push(ms); return timeout(ms); });
  const partial = await b.fetchAvailable(campus, { now: () => clock, sleep: async ms => { clock += ms; }, fetchImpl: async (_, options) => {
    calls++; if (calls === 1) return { status: 200, json: async () => { clock = start + 900000 - 5; return huyuPage(102).response; } };
    return { status: 200, json: () => new Promise((resolve, reject) => {
      const guard = setTimeout(() => reject(new Error('body did not abort')), 50);
      options.signal.addEventListener('abort', () => { clearTimeout(guard); reject(options.signal.reason); }, { once: true });
    }) };
  } });
  a.deepEqual(budgets, [15000, 5]); a.equal(calls, 2); a.equal(partial.total, 1); a.match(partial.verification.stopped.error, /timed out|timeout/i);
  calls = 0;
  const capped = await b.fetchAvailable(campus, { sleep: async () => {}, fetchImpl: async url => {
    calls++; const n = Number(new URL(url).searchParams.get('currentPage')); return { status: 200, json: async () => huyuPage(102, n, [huyuRow()], 30000, 300).response };
  } });
  a.equal(calls, 100); a.equal(capped.total, 1); a.match(capped.issues.join(';'), /安全上限/); a.equal(capped.verification.stopped, null);
  calls = 0;
  const sourceCapped = await b.fetchAvailable(campus, { maxPages: 2, sleep: async () => {}, fetchImpl: async url => {
    calls++; const id = Number(new URL(url).searchParams.get('projectId')); return { status: 200, json: async () => huyuPage(id, 1, [huyuRow(id, id)]).response };
  } });
  a.equal(calls, 2); a.match(sourceCapped.issues.join(';'), /未完成项目 104/); a.equal(sourceCapped.complete, false);
});

const huyuObserved = [102, 75, 104].map(id => '/Users/nozomi/lab/wheres-my-job-work/third-batch-20261008T071347946Z/node-first/netease_huyu-' + id + '.json');
test('Huyu offline three actual Node100 pages retain every native response/record and current id/project links without campus/social inheritance', { skip: huyuObserved.some(f => !fs.existsSync(f)) }, () => {
  const raw = huyuObserved.map(f => JSON.parse(fs.readFileSync(f, 'utf8')));
  a.deepEqual(raw.map(p => [p.projectId, p.response.data.total, p.response.data.list.length]), [[102, 42, 42], [75, 5, 5], [104, 42, 42]]);
  const pages = raw.map(p => ({ request: p.request, httpStatus: p.httpStatus, response: p.response })), result = b.collectAvailable(pages, campus);
  a.equal(result.total, 89); a.equal(result.complete, false); a.deepEqual(result.jobs.map(j => j.post), raw.flatMap(p => p.response.data.list));
  a.equal(b.validateEvidence(result.verification, result.jobs, campus).total, 89); a.deepEqual(result.verification.pages, pages);
  for (const job of result.jobs) {
    const j = b.normalizeRecord(job, campus); a.equal(j.id, String(job.post.id)); a.equal(j.title, job.post.positionName); a.equal(j.city, job.post.workPlaceName ?? '');
    a.equal(j.duty, job.post.positionDescription ?? ''); a.equal(j.requirements, job.post.positionRequirement ?? '');
    a.equal(new URL(j.url).searchParams.get('id'), String(job.post.id)); a.equal(new URL(j.url).searchParams.get('projectId'), String(job.post.projectId));
    a.deepEqual([j.date, j.dateKind, j.talentPlan, j.sourceStatus], [null, null, null, null]);
  }
});
const huyuContract = '/Users/nozomi/lab/wheres-my-job-work/third-batch-20261008T071347946Z/contracts/huyu/huyu-mf-25.js';
test('Huyu current officially loaded MF renderer proves React TEXT sections and id/project detail route', { skip: !fs.existsSync(huyuContract) }, () => {
  const source = fs.readFileSync(huyuContract, 'utf8');
  a.ok(source.includes('className:"desc"},t||"\\u65e0\\u63cf\\u8ff0"')); a.ok(source.includes('className:"desc"},n||"\\u65e0\\u8981\\u6c42"'));
  a.ok(source.includes('window.open("/app/detail/index?id=".concat(t,"&projectId=").concat(a)'));
});
