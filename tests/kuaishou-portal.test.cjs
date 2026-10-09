'use strict';
const test = require('node:test'), a = require('node:assert/strict');
const fs = require('node:fs'), os = require('node:os'), path = require('node:path');
const b = require('../crawler/lib/custom/kuaishou_portal');
const [campus, social] = b.PROFILES;
const copy = value => JSON.parse(JSON.stringify(value));
const base = site => site.origin + (site.track === 'campus' ? '/recruit/campus/e/' : '/recruit/e/');
const nativeMode = 'native-ui-default-domestic';
const nativeNotice = '官网页面自动默认国内；本次仅取得该默认列表，未证明无城市列表/海外等价，未取得者保旧；未注入/生成签名';
const browserAccept = 'application/json, text/plain, */*';
function node(type, code, name, children = null, ifActive = true) { return { id: 1, type, code, name, parentCode: null, ifActive, sortId: null, children }; }
function dictPage(site) {
  const types = site.track === 'campus' ? 'workLocation,positionCategory,positionCategoryFlatten,positionNature,recruitSubProject' : 'workLocation,positionCategory,positionExperience';
  return { request: { url: base(site) + 'api/v1/dictionary/batch?types=' + types, method: 'GET', headers: { Accept: 'application/json', Referer: base(site) }, body: null }, httpStatus: 200,
    response: { code: 0, message: site.track === 'campus' ? 'OK' : 'ok', result: {
      workLocation: [node('workLocation', 'beijing', '北京'), node('workLocation', 'Guangzhou', '广州')],
      positionCategory: [node('positionCategory', 'parent', '工程类', [node('positionCategory', 'child', '服务端', null, false)])],
      ...(site.track === 'campus' ? { positionNature: [node('positionNature', 'fulltime', '全职'), node('positionNature', 'intern', '实习'), node('positionNature', 'parttime', '兼职', null, false)],
        recruitSubProject: campus.body.recruitSubProjectCodes.map((code, index) => node('recruitSubProject', code, code === '20271779425607' ? '2027应届生' : code === '20271772783534' ? '2027实习生' : '往届项目' + index)) } :
        { positionExperience: [node('positionExperience', '4', '1-3年')] }) } } };
}
function row(site = campus, n = 1) {
  return { id: 13990 + n, code: site.track === 'campus' ? '6ac93c9d57d5493ab8845fbda7a1cdbf' : null, type: 'outer', name: '  快Star/原始完整标题（实习）  ',
    recruitProjectCode: site.track === 'campus' ? 'schoolr' : 'socialr', positionNatureCode: site.track === 'campus' ? 'fulltime' : 'C001', positionCategoryCode: 'child',
    ...(site.track === 'campus' ? { recruitSubProjectCode: campus.body.recruitSubProjectCodes[0], workLocationDicts: [{ name: '北京', code: 'beijing' }, { name: '广州', code: 'Guangzhou' }] } :
      { workLocations: null, workLocationsCode: ['beijing', 'Guangzhou'], workLocationCode: 'beijing' }),
    description: '  List<T> &amp; <b>字面正文</b>\r\n  内部  空白\n\n' + '全部長文'.repeat(400) + '\n',
    positionDemand: '  List<T> &amp; <b>字面要求</b>\r\n  内部  空白\n\n',
    positionStatusCode: 'Release', positionLabel: '快Star', departmentName: '不得猜独立雇主', releaseTime: '2026-09-20 21:38:46', updateTime: 1790161343000,
    extraNative: { retained: true }, title: '不映客户端别名', duty: '不映客户端别名', talentPlan: true, employment: 'internship', status: 'open', url: 'javascript:unsafe' };
}
function page(site, n, posts, total = posts.length) {
  const body = { ...site.body, pageNum: n };
  return { request: site.track === 'campus' ? { url: site.api, method: 'POST', headers: { 'Content-Type': 'application/json', Origin: site.origin, Referer: base(site) }, body } :
    { url: site.api + '?' + new URLSearchParams(body), method: 'GET', headers: { Accept: 'application/json', Referer: base(site) }, body: null }, httpStatus: 200,
    response: { code: 0, message: site.track === 'campus' ? 'OK' : 'ok', result: { total, list: posts, pageNum: n, pageSize: 10, size: site.track === 'campus' ? posts.length : 0,
      startRow: 0, endRow: 0, pages: Math.ceil(total / 10), prePage: 0, nextPage: 0, isFirstPage: false, isLastPage: false, hasPreviousPage: false,
      hasNextPage: false, navigatePages: 0, navigatepageNums: null, navigateFirstPage: 0, navigateLastPage: 0 } } };
}
function sample(site = campus) { return b.collectAvailable([page(site, 1, [row(site)])], site, [dictPage(site)]); }
function normalized(post, site = campus, dictionary = dictPage(site)) {
  return b.normalizeRecord(b.collectAvailable([page(site, 1, [post])], site, dictionary ? [dictionary] : []).jobs[0], site);
}
test('Kuaishou social production chooses original domestic UI evidence directly without an unsigned-refusal fallback', async () => {
  let calls = 0;
  const result = await b.fetchAvailable(social, { nativeCollect: async actual => {
    a.deepEqual(actual, social); calls++; return { pages: [nativePage(1, [row(social)])], dictionaryResponses: [nativeDictionary()], issues: [] };
  } });
  a.equal(calls, 1); a.equal(result.verification.version, 3); a.equal(result.verification.mode, nativeMode);
  a.match(result.verification.pages[0].request.url, /workLocationCode=domestic/);
  a.equal(result.complete, false);
  await a.rejects(b.fetchAvailable(social, { nativeCollect: async () => { calls++; throw Error('refused'); } }), /refused/);
  a.equal(calls, 2);
});
function responder(site, callback) {
  return async (url, options) => url.includes('/dictionary/batch?') ? { status: 200, json: async () => dictPage(site).response } : callback(url, options);
}
function response(site, n, posts, total) { return { status: 200, json: async () => page(site, n, posts, total).response }; }
function nativePage(n, posts, total = posts.length) {
  const p = page(social, n, posts, total);
  p.request.url += '&workLocationCode=domestic'; p.request.headers.Accept = browserAccept;
  return p;
}
function nativeDictionary() { const d = dictPage(social); d.request.headers.Accept = browserAccept; return d; }
function nativeSample() { return b.collectNativeAvailable([nativePage(1, [row(social)])], social, [nativeDictionary()]); }

test('Kuaishou native default-domestic is additive v3 AVAILABLE only; original URL/Accept/raw/dictionary and normalizer survive', () => {
  const p = nativePage(1, [row(social)]), d = nativeDictionary(), before = copy([p, d]);
  a.throws(() => b.collectAvailable([p], social, [d]), /request.*binding/); // The broad v2 collector must never silently drop domestic.
  const r = b.collectNativeAvailable([p], social, [d]);
  a.deepEqual(Object.keys(r.verification).sort(), ['api', 'dictionaryResponses', 'issues', 'key', 'mode', 'pages', 'policy', 'stopped', 'version']);
  a.equal(r.verification.version, 3); a.equal(r.verification.mode, nativeMode); a.equal(r.verification.policy, 'available');
  a.equal(r.verification.key, social.key); a.equal(r.verification.api, social.api); a.equal(r.verification.stopped, null);
  a.deepEqual(r.verification.pages, [before[0]]); a.deepEqual(r.verification.dictionaryResponses, [before[1]]); a.deepEqual([p, d], before);
  a.equal(r.verification.pages[0].request.headers.Accept, browserAccept); a.match(r.verification.pages[0].request.url, /&workLocationCode=domestic$/);
  a.equal(r.total, 1); a.equal(r.complete, false); a.equal(r.verification.pages[0].response.result.total, r.total);
  a.ok(r.issues.includes(nativeNotice)); a.ok(r.issues.includes('已收录列表JD，详情正文完整性待核验'));
  a.equal(b.validateEvidence(r.verification, r.jobs, social).complete, false);
  a.strictEqual(r.jobs[0].post, r.verification.pages[0].response.result.list[0]);
  a.strictEqual(r.jobs[0].dict.category, r.verification.dictionaryResponses[0].response.result.positionCategory[0].children[0]);
  a.ok(Object.isFrozen(r) && Object.isFrozen(r.verification.pages[0].request.headers) && Object.isFrozen(r.jobs[0].post.extraNative));
  a.deepEqual(b.normalizeRecord(r.jobs[0], social), normalized(row(social), social));
  a.equal(b.normalizeRecord(r.jobs[0], social).employment, null);
  const broad = sample(social); a.equal(broad.verification.version, 2); a.equal(Object.hasOwn(broad.verification, 'mode'), false);
  a.equal(Object.hasOwn(social.body, 'workLocationCode'), false); a.equal(b.verifiedSource(copy(social)), true);
});
test('Kuaishou native v3 is closed and social-qualified: no alternate mode/city/filter/URL/header/body or campus downgrade', () => {
  const original = nativeSample();
  const mutations = [
    r => r.verification.version = 2, r => r.verification.version = 4, r => delete r.verification.mode,
    r => r.verification.mode = 'native-ui-unfiltered', r => r.verification.mode = null, r => r.verification.mode = {},
    r => r.verification.key = campus.key, r => r.verification.api = campus.api, r => r.verification.policy = 'complete',
    r => r.verification.complete = false, r => r.verification.nativeMode = nativeMode,
    r => r.verification.pages[0].request.url = r.verification.pages[0].request.url.replace('&workLocationCode=domestic', ''),
    r => r.verification.pages[0].request.url = r.verification.pages[0].request.url.replace(social.origin, campus.origin),
    r => r.verification.pages[0].request.url += '#ignored', r => r.verification.pages[0].request.url += '&workLocationCode=domestic',
    r => r.verification.pages[0].request.url = r.verification.pages[0].request.url.replace('C001', 'C002'),
    r => r.verification.pages[0].request.url = r.verification.pages[0].request.url.replace('socialr', 'schoolr'),
    r => r.verification.pages[0].request.url = r.verification.pages[0].request.url.replace('pageSize=10', 'pageSize=20'),
    r => r.verification.pages[0].request.url = r.verification.pages[0].request.url.replace('pageNum=1', 'pageNum=2'),
    r => r.verification.pages[0].request.method = 'POST', r => r.verification.pages[0].request.body = { ...social.body, workLocationCode: 'domestic' },
    r => r.verification.pages[0].request.headers.Accept = '*/*', r => r.verification.pages[0].request.headers.Referer = social.url,
    r => r.verification.pages[0].response.result.pageSize = 20, r => r.verification.pages[0].response.code = -1,
    r => r.verification.pages[0].response.result.pageNum = 2, r => r.verification.pages[0].response.extra = true,
    r => r.verification.dictionaryResponses[0].request.url += ',positionNature',
    r => r.verification.jobs = r.jobs, r => r.jobs[0].post.description = 'invented', r => r.jobs[0].dict.category.name = 'invented'
  ];
  for (const city of ['Beijing', 'overseas', '', 'Domestic', 'domestic,overseas'])
    mutations.push(r => r.verification.pages[0].request.url = r.verification.pages[0].request.url.replace('workLocationCode=domestic', 'workLocationCode=' + city));
  for (const filter of ['name=AI', 'positionCategoryCode=J0001', 'positionLabel=快Star', 'Sign=fake'])
    mutations.push(r => r.verification.pages[0].request.url += '&' + filter);
  for (const header of ['Sign', 'signTimestamp', 'Cookie', 'User-Agent', 'Origin', 'X-XSRF-TOKEN'])
    mutations.push(r => r.verification.pages[0].request.headers[header] = 'invented');
  for (const mutate of mutations) { const bad = copy(original); mutate(bad); a.throws(() => b.validateEvidence(bad.verification, bad.jobs, social)); }
  a.throws(() => b.collectNativeAvailable([page(campus, 1, [row()])], campus, [dictPage(campus)]), /mode|source/);
  a.throws(() => b.validateEvidence(original.verification, original.jobs, campus), /mode|source/);
  a.throws(() => b.collectNativeAvailable([nativePage(1, [row(social)])], { ...social, body: { ...social.body, workLocationCode: 'domestic' } }), /source/);
  a.throws(() => b.collectNativeAvailable([nativePage(1, [row(social)])], social, [dictPage(campus)]), /dictionary request/);
  const broad = copy(sample(social)); broad.verification.mode = nativeMode;
  a.throws(() => b.validateEvidence(broad.verification, broad.jobs, social), /source binding/);
});
test('Kuaishou native domestic N1..N pages share v2 duplicate/dictionary/record/atEnd guards and remain incomplete', () => {
  const first = row(social), later = { ...first, description: '', positionDemand: null }, second = row(social, 2);
  const r = b.collectNativeAvailable([nativePage(1, [first], 30), nativePage(2, [later, second], 28), nativePage(3, [], 28)], social);
  a.equal(r.total, 2); a.equal(r.complete, false); a.deepEqual(r.jobs[0].post, first); a.deepEqual(r.verification.pages[1].response.result.list[0], later);
  a.ok(r.issues.includes(nativeNotice)); a.match(r.issues.join(';'), /重复官方id 1.*官方total 30→28；实际唯一岗位 2/);
  a.match(r.issues.join(';'), /短页.*未取得同源字典/); a.equal(b.validateEvidence(r.verification, r.jobs, social).total, 2);
  a.throws(() => b.collectNativeAvailable([...r.verification.pages, nativePage(4, [row(social, 3)], 28)], social), /extra request/);
  a.throws(() => b.collectNativeAvailable([nativePage(2, [first], 30)], social), /binding/);
  a.throws(() => b.collectNativeAvailable([nativePage(1, [], 0)], social), /zero cannot clear/);
  for (const patch of [{ id: '13991' }, { recruitProjectCode: 'schoolr' }, { positionNatureCode: 'C002' }, { description: [] }, { workLocationsCode: [3] }])
    a.throws(() => b.collectNativeAvailable([nativePage(1, [{ ...first, ...patch }])], social), /zero cannot clear/);
  const incomplete = b.collectNativeAvailable([nativePage(1, [first], 1211)], social, [], ['正常UI读取尚未结束']);
  a.equal(incomplete.total, 1); a.match(incomplete.issues.join(';'), /正常UI读取尚未结束.*官方total 1211；实际唯一岗位 1.*分页未穷尽/);
});
test('Kuaishou native domestic stopped browser requests preserve actual Accept and HTTP/JSON/business failure evidence, never promote refusal', () => {
  const p = nativePage(1, [row(social)], 1211);
  for (const kind of ['HTTP', 'JSON', 'business']) {
    const stopped = { ...nativePage(2, [], 1211), error: kind + ' refusal' };
    stopped.httpStatus = kind === 'HTTP' ? 429 : 200;
    stopped.response = kind === 'business' ? { code: -1, message: '系统错误', result: null } : null;
    const r = b.collectNativeAvailable([p], social, [nativeDictionary()], [], stopped);
    a.equal(r.total, 1); a.equal(r.complete, false); a.deepEqual(r.verification.stopped, stopped); a.equal(r.verification.stopped.request.headers.Accept, browserAccept);
    a.equal(b.validateEvidence(r.verification, r.jobs, social).total, 1); a.match(r.issues.join(';'), /请求停止/); a.ok(r.issues.includes(nativeNotice));
    const next = copy(r); next.verification.stopped.request = nativePage(3, [], 1211).request;
    a.throws(() => b.validateEvidence(next.verification, next.jobs, social), /stopped request/);
    const broad = copy(r); broad.verification.stopped.request.url = broad.verification.stopped.request.url.replace('&workLocationCode=domestic', '');
    a.throws(() => b.validateEvidence(broad.verification, broad.jobs, social), /stopped request/);
    const successful = copy(r); successful.verification.stopped.httpStatus = 200; successful.verification.stopped.response = nativePage(2, [row(social, 2)], 1211).response;
    a.throws(() => b.validateEvidence(successful.verification, successful.jobs, social), /successful page/);
  }
});

test('Kuaishou normal social browser JSON negotiation header is retained, not fabricated or given broader scope', () => {
  const p=page(social,1,[row(social)]),d=dictPage(social);
  p.request.headers.Accept=d.request.headers.Accept='application/json, text/plain, */*';
  const r=b.collectAvailable([p],social,[d]);a.equal(r.total,1);a.equal(b.validateEvidence(r.verification,r.jobs,social).total,1);
  for(const value of ['*/*','text/html']){const bad=copy(p);bad.request.headers.Accept=value;a.throws(()=>b.collectAvailable([bad],social,[d]),/binding/);}
  const wrong=copy(p);wrong.request.headers.Sign='invented';a.throws(()=>b.collectAvailable([wrong],social,[d]),/binding/);
});

test('Kuaishou exactly two deeply frozen current profiles: both campus subprojects, social C001 scope; no downgrade', () => {
  a.deepEqual(b.PROFILES, ['campus', 'social'].map(track => {
    const origin = 'https://' + (track === 'campus' ? 'campus' : 'zhaopin') + '.kuaishou.cn', root = origin + (track === 'campus' ? '/recruit/campus/e/' : '/recruit/e/');
    return { key: track === 'campus' ? 'kuaishou' : 'kuaishou_social', company: '快手', ats: 'custom', adapter: 'kuaishou-portal-v1', track,
      batch: track === 'campus' ? '官网校园字典全部项目（2020–2027届/实习生，含往届仍在列项目）' : '社会招聘默认入口（C001，日常实习另入口未核验）', exclude: '(无)', origin,
      url: root + (track === 'campus' ? '#/campus/jobs' : '#/official/social/'), api: root + 'api/v1/open/positions/simple', listJD: true,
      body: track === 'campus' ? { recruitSubProjectCodes: ['2020qiuzhao', '2020summerIntern', '2021qiuzhao', '2022campus', '2023campus', '20241687923507', '20251707035672', '20251718874803', '20261707035672', '20261749721165', '20271772783534', '20271779425607'], pageSize: 10, pageNum: 1 } : { pageNum: 1, pageSize: 10, positionNatureCode: 'C001', recruitProject: 'socialr' } };
  }));
  a.ok(Object.isFrozen(b) && Object.isFrozen(b.PROFILES) && Object.isFrozen(campus.body.recruitSubProjectCodes));
  for (const site of b.PROFILES) {
    a.ok(Object.isFrozen(site) && Object.isFrozen(site.body)); a.equal(b.requiresVerification(site), true); a.equal(b.verifiedSource(structuredClone(site)), true);
    for (const patch of [{ key: 'alias' }, { company: '快手游戏' }, { ats: 'moka' }, { adapter: undefined }, { listJD: false }, { exclude: '快Star' }, { track: 'intern' },
      { origin: 'https://example.com' }, { api: site.api + '?Sign=fake' }, { url: site.url + '?search=AI' }, { body: { ...site.body, pageSize: 100 } },
      { body: { ...site.body, pageNum: 0 } }, { body: { ...site.body, workLocationCode: 'domestic' } }, { body: { ...site.body, positionLabel: '普通' } },
      { body: { ...site.body, recruitSubProjectCodes: [campus.body.recruitSubProjectCodes[0]] } }, { body: { ...site.body, positionNatureCode: 'C002' } }]) {
      const bad = { ...site, ...patch }; a.equal(b.requiresVerification(bad), true); a.equal(b.verifiedSource(bad), false); a.throws(() => b.validateJobs([], bad));
    }
    const deleted = structuredClone(site); delete deleted.adapter; a.equal(b.requiresVerification(deleted), true); a.equal(b.verifiedSource(deleted), false);
  }
  for (const declaration of [{ api: 'POST ' + campus.api }, { url: 'https://CAMPUS.KUAISHOU.CN:443/' }, { origin: 'https://ZHAOPIN.KUAISHOU.CN./' },
    { apiOrigin: '%' }, { api: 'relative' }, { detailApi: null }]) a.equal(b.requiresVerification(declaration), true);
  a.equal(b.requiresVerification({ url: 'https://example.com' }), false); a.equal(b.portalNotice({}), '');
  a.match(b.portalNotice(campus), /字典全部12个子项目.*快Star.*完整性未验证/); a.match(b.portalNotice(social), /C001\/socialr.*实际已取得范围.*国内分页不证明无城市\/海外.*日常实习.*尚未核验/);
});
test('Kuaishou numeric id-only URLs, raw original TEXT/title/metadata, exact dictionary leaf names and independent dimensions', () => {
  for (const site of b.PROFILES) {
    const r = sample(site), post = row(site), j = b.normalizeRecord(r.jobs[0], site);
    a.equal(r.complete, false); a.equal(r.total, 1); a.equal(b.validateEvidence(r.verification, r.jobs, site).total, 1); a.deepEqual(r.jobs[0].post, post);
    a.equal(j.id, String(post.id)); a.equal(j.title, post.name); a.equal(j.city, '北京/广州'); a.equal(j.category, '服务端');
    a.equal(j.url, base(site) + (site.track === 'campus' ? '#/campus/job-info/' : '#/official/social/job-info/') + post.id);
    a.equal(new URL(j.url).search, ''); a.ok(!j.url.includes(post.code ?? 'NULL')); a.equal(j.duty, post.description); a.equal(j.requirements, post.positionDemand); a.equal(j.description, '');
    a.deepEqual(j.channels, [site.track]); a.equal(j.employment, site.track === 'campus' ? 'full-time' : null);
    a.deepEqual([j.talentPlan, j.date, j.dateKind, j.sourceStatus, j.jdComplete], [null, null, null, null, false]); a.equal(Object.hasOwn(j, 'company'), false);
    const same = b.normalizeRecord({ ...r.jobs[0], post: { ...post, positionDemand: post.description } }, site); a.equal(same.duty, same.requirements);
    const blank = normalized({ ...post, description: null, positionDemand: '/', positionCategoryCode: 'unknown' }, site);
    a.deepEqual([blank.duty, blank.requirements, blank.category, blank.jdComplete], ['', '/', '', false]);
    const parent = normalized({ ...post, positionCategoryCode: 'parent' }, site); a.equal(parent.category, '工程类');
  }
  const r = sample();
  for (const [nature, expected] of [['intern', 'internship'], ['fulltime', 'full-time'], ['parttime', null], ['C001', null], [null, null]]) {
    const post = { ...r.jobs[0].post, recruitSubProjectCode: campus.body.recruitSubProjectCodes[1], positionNatureCode: nature }, j = normalized(post);
    a.equal(j.employment, expected); a.deepEqual(j.channels, []); a.equal(j.talentPlan, null);
  }
  const changedName = copy(r.jobs[0]); changedName.dict.nature.name = '正式'; a.equal(b.normalizeRecord(changedName, campus).employment, null);
  const extraFlatten = dictPage(campus); extraFlatten.response.result.positionCategoryFlatten = [node('positionCategory', 'unknown', '不可由flatten猜类别')];
  a.equal(normalized({ ...row(), positionCategoryCode: 'unknown' }, campus, extraFlatten).category, '');
});
test('Kuaishou source-bound dictionaries live once in verification; small per-post native entries freeze, no static fallback', () => {
  const post = row(), input = [page(campus, 1, [post])], dictionary = dictPage(campus), r = b.collectAvailable(input, campus, [dictionary]);
  a.strictEqual(r.jobs[0].post, r.verification.pages[0].response.result.list[0]);
  a.strictEqual(r.jobs[0].dict.category, r.verification.dictionaryResponses[0].response.result.positionCategory[0].children[0]);
  a.strictEqual(r.jobs[0].dict.nature, r.verification.dictionaryResponses[0].response.result.positionNature[0]);
  a.ok(Object.isFrozen(r) && Object.isFrozen(r.jobs[0].post.extraNative) && Object.isFrozen(r.jobs[0].dict.category));
  a.deepEqual(Object.keys(r.jobs[0].dict).sort(), ['category', 'nature', 'workLocations']);
  a.ok(JSON.stringify(r.jobs[0].dict).length < JSON.stringify(r.verification.dictionaryResponses[0].response.result).length / 2);
  post.description = 'caller changed'; dictionary.response.result.positionCategory[0].children[0].name = 'caller changed';
  a.notEqual(r.jobs[0].post.description, post.description); a.equal(r.jobs[0].dict.category.name, '服务端');
  a.throws(() => { r.jobs[0].dict.category.ifActive = true; }, TypeError);
  a.throws(() => b.collectAvailable(input, campus), /dictionary evidence required/);
  const without = b.collectAvailable([page(social, 1, [row(social)])], social), j = b.normalizeRecord(without.jobs[0], social);
  a.deepEqual(without.jobs[0].dict, { category: null, nature: null, workLocations: [] }); a.deepEqual([j.category, j.city, j.employment], ['', '', null]); a.match(without.issues.join(';'), /未取得同源字典/);
  const named = { ...row(social), workLocations: [{ code: 'x', name: '官网城市' }, { code: 'y', name: '官网国家' }] };
  a.equal(b.normalizeRecord(b.collectAvailable([page(social, 1, [named])], social).jobs[0], social).city, '官网城市/官网国家');
  a.throws(() => b.collectAvailable([page(social, 1, [row(social)])], social, [dictPage(campus)]), /dictionary request/);
});
test('Kuaishou duplicates, short/empty pages and total drift are honest gaps; zero/false total and unsafe records never clear', () => {
  const first = row(), later = { ...first, description: '', positionDemand: null, workLocationDicts: [...first.workLocationDicts].reverse() };
  const r = b.collectAvailable([page(campus, 1, [first], 30), page(campus, 2, [later, row(campus, 2)], 28), page(campus, 3, [], 28)], campus, [dictPage(campus)]);
  a.equal(r.total, 2); a.deepEqual(r.jobs[0].post, first); a.deepEqual(r.verification.pages[1].response.result.list[0], later);
  a.match(r.issues.join(';'), /重复官方id 1.*官方total 30→28；实际唯一岗位 2/); a.match(r.issues.join(';'), /短页/); a.equal(b.validateEvidence(r.verification, r.jobs, campus).complete, false);
  a.throws(() => b.validateJobs([r.jobs[0], r.jobs[0]], campus), /duplicate/);
  a.throws(() => b.collectAvailable([...r.verification.pages, page(campus, 4, [row(campus, 3)], 30)], campus, [dictPage(campus)]), /extra request/);
  for (const posts of [[], [{ ...row(), id: '13991' }], [{ ...row(), name: null }]])
    a.throws(() => b.collectAvailable([page(campus, 1, posts, posts.length)], campus, [dictPage(campus)]), /zero cannot clear/);
  a.throws(() => b.collectAvailable([page(campus, 1, [row()], 0)], campus, [dictPage(campus)]), /positive total/);
  const bad = [{ ...row(), id: 0 }, { ...row(), id: Number.MAX_SAFE_INTEGER + 1 }, { ...row(), recruitProjectCode: 'socialr' },
    { ...row(), recruitSubProjectCode: '2026' }, { ...row(), description: [] }, { ...row(), positionDemand: 2 }, { ...row(), workLocationDicts: [null] }];
  const missing = row(); delete missing.positionDemand; bad.push(missing);
  const retained = b.collectAvailable([page(campus, 1, [...bad, row(campus, 2)], 9)], campus, [dictPage(campus)]);
  a.equal(retained.total, 1); a.match(retained.issues.join(';'), /列表记录未应用/); a.equal(retained.verification.pages[0].response.result.list.length, 9);
  a.throws(() => b.normalizeRecord({ post: { ...row(social), positionNatureCode: 'C002' }, dict: null }, social), /nature scope/);
});
test('Kuaishou revalidation rejects source/header/query/body/business/PageInfo/material tampering, fake sign and old code identity', () => {
  for (const site of b.PROFILES) {
    const original = sample(site);
    for (const mutate of [
      r => r.verification.key = 'alias', r => r.verification.api = 'https://example.com', r => r.verification.policy = 'complete', r => r.verification.version = 1,
      r => r.verification.complete = true, r => r.verification.pages[0].request.url += '&workLocationCode=domestic', r => r.verification.pages[0].request.method = 'PATCH',
      r => r.verification.pages[0].request.headers.Referer = site.url, r => r.verification.pages[0].request.headers.Sign = 'HMAC',
      r => r.verification.pages[0].request.headers.signTimestamp = 1, r => r.verification.pages[0].request.headers.Cookie = 'session=fake',
      r => r.verification.pages[0].request.headers['User-Agent'] = 'spoof', r => r.verification.pages[0].httpStatus = 412,
      r => r.verification.pages[0].response.code = -1, r => r.verification.pages[0].response.message = '系统错误', r => r.verification.pages[0].response.extra = true,
      r => r.verification.pages[0].response.result = null, r => delete r.verification.pages[0].response.result.total,
      r => r.verification.pages[0].response.result.total = '1', r => r.verification.pages[0].response.result.total = false,
      r => r.verification.pages[0].response.result.total = -1, r => r.verification.pages[0].response.result.total = 1.5,
      r => r.verification.pages[0].response.result.pageNum = 0, r => r.verification.pages[0].response.result.pageSize = 100,
      r => r.verification.pages[0].response.result.size = null, r => r.verification.pages[0].response.result.pages = '1',
      r => r.verification.pages[0].response.result.hasNextPage = null, r => r.verification.pages[0].response.result.list = { list: [] },
      r => r.verification.dictionaryResponses[0].request.url += ',positionNature', r => r.verification.dictionaryResponses[0].httpStatus = 403,
      r => r.verification.dictionaryResponses[0].response.code = -1, r => r.verification.dictionaryResponses[0].response.result = null,
      r => r.verification.dictionaryResponses[0].response.result.positionCategory[0].children[0].name = 'changed',
      r => r.jobs[0].post.id++, r => r.jobs[0].post.description = 'invented', r => r.jobs[0].post.extraNative.retained = false,
      r => r.jobs[0].post.code = 'changed unrelated raw', r => r.jobs[0].dict.category.name = 'forged', r => r.jobs[0].dict = null
    ]) { const bad = copy(original); mutate(bad); a.throws(() => b.validateEvidence(bad.verification, bad.jobs, site)); }
    const sparse = copy(original); sparse.verification.pages[0].response.result.list = Array(1); a.throws(() => b.validateEvidence(sparse.verification, sparse.jobs, site));
  }
  for (const mutate of [p => p.request.body.recruitSubProjectCodes.pop(), p => p.request.body.positionNatureCode = 'fulltime',
    p => p.request.headers.Origin += '/', p => p.request.body.pageNum = 0, p => p.request.body.positionLabel = '快Star']) {
    const r = copy(sample()); mutate(r.verification.pages[0]); a.throws(() => b.validateEvidence(r.verification, r.jobs, campus));
  }
  for (const mutate of [p => p.request.body = { ...social.body }, p => p.request.url += '&Sign=fake', p => p.request.url = p.request.url.replace('C001', 'C002')]) {
    const r = copy(sample(social)); mutate(r.verification.pages[0]); a.throws(() => b.validateEvidence(r.verification, r.jobs, social));
  }
  for (const mutate of [d => d.response.result.recruitSubProject.find(n => n.code === '20271779425607').name = '2026应届生', d => d.response.result.positionNature[0].code = null,
    d => d.response.result.positionCategory[0].children[0].name = {}, d => d.response.result.positionCategory.push(copy(d.response.result.positionCategory[0]))]) {
    const dictionary = dictPage(campus); mutate(dictionary); a.throws(() => b.collectAvailable([page(campus, 1, [row()])], campus, [dictionary]));
  }
});
test('Kuaishou normal dictionary GET then unsigned campus POST/social GET, exact headers/query, serial starts and body completion; total stops without EOF', async () => {
  for (const site of b.PROFILES) {
    let clock = 0, busy = false; const starts = [], calls = [];
    const r = await b.fetchAvailable(site, { now: () => clock, sleep: async ms => { a.equal(busy, false); a.equal(ms, 200); clock += ms; }, fetchImpl: async (url, options) => {
      a.equal(busy, false); busy = true; starts.push(clock); calls.push([url, options.method]); a.equal(options.redirect, 'error'); a.ok(options.signal instanceof AbortSignal);
      const dictionary = url.includes('/dictionary/batch?'), n = dictionary ? 0 : site.track === 'campus' ? JSON.parse(options.body).pageNum : Number(new URL(url).searchParams.get('pageNum'));
      const expected = dictionary ? dictPage(site) : page(site, n, [row(site, n)], 11);
      // Deliberately unreliable PageInfo pages=1/size=0/nextPage=0: the requested count, not native flags, determines EOF.
      if (!dictionary) expected.response.result.pages = 1;
      a.equal(url, expected.request.url); a.equal(options.method, expected.request.method); a.deepEqual(options.headers, expected.request.headers);
      a.deepEqual(options.body === undefined ? null : JSON.parse(options.body), expected.request.body);
      return { status: 200, json: async () => { await Promise.resolve(); clock += 30; busy = false; return expected.response; } };
    } });
    a.equal(calls.length, 3); a.equal(calls[0][1], 'GET'); a.equal(r.total, 2); a.equal(r.complete, false);
    a.ok(starts.every((v, i) => !i || v - starts[i - 1] >= 200)); a.equal(b.validateEvidence(r.verification, r.jobs, site).total, 2);
    for (const secret of ['Sign', 'signTimestamp', 'Cookie', 'User-Agent', 'X-XSRF-TOKEN']) a.equal(JSON.stringify(r).includes(secret), false);
  }
});
test('Kuaishou dictionary/first-page refusal fails; later HTTP/business/parser/transport refusal stops with earlier available jobs, no retries', async () => {
  for (const site of b.PROFILES) {
    for (const kind of ['HTTP', 'business', 'transport', 'JSON', 'shape']) {
      let calls = 0;
      const r = await b.fetchAvailable(site, { sleep: async () => {}, fetchImpl: responder(site, async () => {
        calls++; if (calls === 1) return response(site, 1, [row(site)], 1212);
        if (kind === 'transport') throw new Error('transport failure');
        const raw = page(site, 2, [row(site, 2)], 1212);
        if (kind === 'business') raw.response = { code: -1, message: '系统错误', result: null };
        if (kind === 'shape') delete raw.response.result.total;
        return { status: kind === 'HTTP' ? 429 : 200, json: async () => { if (kind === 'JSON') throw new Error('body parser failure'); return raw.response; } };
      }) });
      a.equal(calls, 2); a.equal(r.total, 1); a.match(r.issues.join(';'), /请求停止/); a.equal(b.validateEvidence(r.verification, r.jobs, site).total, 1);
      const bad = copy(r); bad.verification.stopped.request = page(site, 3, [], 1212).request; a.throws(() => b.validateEvidence(bad.verification, bad.jobs, site), /stopped request/);
      const successful = copy(r); successful.verification.stopped.httpStatus = 200; successful.verification.stopped.response = page(site, 2, [row(site, 2)], 1212).response;
      a.throws(() => b.validateEvidence(successful.verification, successful.jobs, site), /successful page/);
    }
    for (const reply of [{ status: 403 }, { status: 302 }, { status: 200, json: async () => ({ code: -1, message: '系统错误', result: null }) },
      { status: 200, json: async () => { throw new Error('dictionary JSON failed'); } }]) {
      let calls = 0; await a.rejects(b.fetchAvailable(site, { fetchImpl: async () => { calls++; return reply; } })); a.equal(calls, 1);
    }
    let calls = 0; await a.rejects(b.fetchAvailable(site, { sleep: async () => {}, fetchImpl: responder(site, async () => { calls++; return { status: 200, json: async () => ({ code: -1, message: '系统错误', result: null }) }; }) }), /business refusal/); a.equal(calls, 1);
  }
});
test('Kuaishou 200-page/900000ms/15s safety bounds, initial zero/invalid limits, body timeout has no following request', async () => {
  let calls = 0;
  const capped = await b.fetchAvailable(campus, { maxPages: 2, sleep: async () => {}, fetchImpl: responder(campus, async (_, options) => {
    calls++; return response(campus, JSON.parse(options.body).pageNum, [row()], 3000);
  }) });
  a.equal(calls, 2); a.equal(capped.total, 1); a.match(capped.issues.join(';'), /安全上限/);
  let clock = 0; calls = 0;
  const timed = await b.fetchAvailable(campus, { now: () => clock, sleep: async ms => { clock += ms; }, fetchImpl: responder(campus, async () => {
    calls++; return { status: 200, json: async () => { clock = 900000; return page(campus, 1, [row()], 506).response; } };
  }) });
  a.equal(calls, 1); a.match(timed.issues.join(';'), /进程安全时限/);
  for (const maxPages of [0, 201, 1.5]) await a.rejects(b.fetchAvailable(campus, { maxPages, fetchImpl: () => a.fail('no HTTP') }), /limits/);
  calls = 0; await a.rejects(b.fetchAvailable(social, { sleep: async () => {}, fetchImpl: responder(social, async () => { calls++; return response(social, 1, [], 0); }) }), /zero cannot clear/); a.equal(calls, 1);
  // Inspect both the normal 15s signal and a shortened remaining process budget without waiting 15 seconds.
  const timeout = AbortSignal.timeout, seen = [];
  try {
    AbortSignal.timeout = ms => { seen.push(ms); return timeout(ms); };
    await b.fetchAvailable(campus, { sleep: async () => {}, fetchImpl: responder(campus, async () => response(campus, 1, [row()], 1)) });
    a.deepEqual(seen, [15000, 15000]); seen.length = 0; calls = 0;
    let first = true;
    await a.rejects(b.fetchAvailable(campus, { now: () => { if (first) { first = false; return 0; } return 899999; }, fetchImpl: async (_, options) => {
      calls++; return { status: 200, json: async () => { await new Promise(resolve => setTimeout(resolve, 5)); options.signal.throwIfAborted(); return dictPage(campus).response; } };
    } }), /aborted|timeout/i);
    a.deepEqual(seen, [1]); a.equal(calls, 1);
  } finally { AbortSignal.timeout = timeout; }
});
test('Kuaishou atomic run leaves old candidates intact on dictionary/Node business/zero failures; only successful available envelope is written', async t => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ande-kuaishou-test-')); t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const file = path.join(dir, 'candidate.json'); fs.writeFileSync(file, 'old real candidate');
  for (const kind of ['dictionary', 'HTTP', 'business', 'zero']) {
    await a.rejects(b.run([JSON.stringify(social), file], { sleep: async () => {}, fetchImpl: async (url) => {
      if (url.includes('/dictionary/batch?')) return { status: kind === 'dictionary' ? 403 : 200, json: async () => dictPage(social).response };
      if (kind === 'HTTP') return { status: 412 };
      if (kind === 'business') return { status: 200, json: async () => ({ code: -1, message: '系统错误', result: null }) };
      return response(social, 1, [], 0);
    } }));
    a.equal(fs.readFileSync(file, 'utf8'), 'old real candidate'); a.deepEqual(fs.readdirSync(dir), ['candidate.json']);
  }
  const written = await b.run([JSON.stringify(campus), file], { sleep: async () => {}, fetchImpl: responder(campus, async () => response(campus, 1, [row()], 1)) });
  a.equal(written.mode, 'custom'); a.equal(written.complete, false); a.equal(written.key, campus.key); a.equal(written.api, campus.api);
  a.deepEqual(JSON.parse(fs.readFileSync(file, 'utf8')), written); a.deepEqual(fs.readdirSync(dir), ['candidate.json']); await a.rejects(b.run([JSON.stringify(campus)]), /Usage/);
});

// Local-only first-party captures, never committed raw fixtures or fabricated fresh success clocks. No network/browser calls.
const nativeFiles = ['pages', 'dictionary', 'dom'].map(name => '/tmp/ande-two-portals-YP2JeR/kuaishou_social/' + name + '.json');
test('Kuaishou offline captured actual domestic URL fails broad v2 but qualifies partial native v3; equal initial totals prove no scope equivalence', { skip: nativeFiles.some(file => !fs.existsSync(file)) }, () => {
  const [pages, dictionary, dom] = nativeFiles.map(file => JSON.parse(fs.readFileSync(file, 'utf8')));
  const broad = pages.find(p => !new URL(p.request.url).searchParams.has('workLocationCode'));
  const domestic = pages.find(p => new URL(p.request.url).searchParams.get('workLocationCode') === 'domestic' && p.response.result.pageNum === 1);
  a.ok(broad && domestic); a.equal(broad.response.result.total, 1211); a.equal(domestic.response.result.total, 1211);
  a.equal(broad.response.result.list.length, 10); a.equal(domestic.response.result.list.length, 10); a.match(dom.text, /工作地点\n国内/);
  a.throws(() => b.collectAvailable([domestic], social, dictionary), /request.*binding/);
  const r = b.collectNativeAvailable([domestic], social, dictionary);
  a.equal(r.total, 10); a.equal(r.complete, false); a.equal(r.verification.version, 3); a.equal(r.verification.mode, nativeMode);
  a.equal(r.verification.pages.length, 1); a.deepEqual(r.verification.pages[0], domestic); a.deepEqual(r.verification.dictionaryResponses, dictionary);
  a.equal(r.verification.pages[0].request.headers.Accept, browserAccept); a.deepEqual(r.jobs.map(j => j.post), domestic.response.result.list);
  a.ok(r.issues.includes(nativeNotice)); a.match(r.issues.join(';'), /官方total 1211；实际唯一岗位 10.*分页未穷尽.*详情正文完整性待核验/);
  a.equal(b.validateEvidence(r.verification, r.jobs, social).total, 10);
  for (const job of r.jobs) {
    const j = b.normalizeRecord(job, social);
    a.equal(j.employment, null); a.equal(j.jdComplete, false); a.equal(j.duty, job.post.description); a.equal(j.requirements, job.post.positionDemand);
    a.ok(j.city && j.category); a.ok(dom.text.includes(j.category)); a.ok(j.url.endsWith('/' + job.post.id));
  }
});
const nodeBase = '/tmp/ande-second-batch-Ghxbqi';
for (const site of b.PROFILES) {
  const observed = '/tmp/ande-first-batch-special-second-kuaishou-' + (site.track === 'campus' ? 'jobs' : 'social-jobs');
  const files = [observed + '/network.json', observed + '/dom.json', observed + '/report.json', nodeBase + (site.track === 'campus' ? '/kuaishou-campus-first.json' : '/002-kuaishou-social-node-first.json')];
  test('Kuaishou offline native ' + site.track + ' first 10 records/dictionary/UI retain exact original material and timestamps', { skip: files.some(file => !fs.existsSync(file)) }, () => {
    const read = file => JSON.parse(fs.readFileSync(file, 'utf8')), network = read(files[0]), dom = read(files[1]), report = read(files[2]);
    const observedPage = network.find(n => n.nativeJSON && n.request.url.includes('/positions/simple') && !n.request.url.includes('workLocationCode='));
    const observedDictionary = network.find(n => n.nativeJSON && n.request.url.includes('/dictionary/batch?'));
    a.equal(observedPage.response.httpStatus, 200); a.equal(observedDictionary.response.httpStatus, 200); a.equal(observedPage.nativeJSON.code, 0);
    const native = site.track === 'campus' ? read(files[3]) : observedPage.nativeJSON, p = page(site, 1, native.result.list, native.result.total), d = dictPage(site);
    p.response = native; d.response = observedDictionary.nativeJSON; a.equal(observedDictionary.request.url, d.request.url);
    if (site.track === 'campus') {
      const probe = read(nodeBase + '/002-kuaishou-campus-node-first.json');
      a.equal(probe.httpStatus, 200); a.deepEqual(probe.headers, p.request.headers); a.deepEqual(probe.body.value, p.request.body); a.deepEqual(probe.json, native);
      a.equal(native.result.total, 506); a.equal(observedPage.nativeJSON.result.total, 279); a.deepEqual(native.result.list, observedPage.nativeJSON.result.list);
      a.match(dom.text, /27届校园/); a.match(dom.text, /留用实习/); a.match(dom.text, /快Star/);
    } else {
      a.equal(native.result.total, 1212); a.equal(native.result.size, 0); a.equal(native.result.hasNextPage, false); a.equal(observedPage.request.body, null);
      a.equal(observedPage.request.url, p.request.url); a.match(dom.text, /日常实习/); a.equal(report.finishedAt, '2026-10-07T17:36:13.072Z');
      const refusal = read(files[3]); a.equal(refusal.httpStatus, 200); a.deepEqual(refusal.json, { code: -1, message: '系统错误', result: null });
      a.equal(refusal.url, p.request.url); a.equal(refusal.body, null); a.deepEqual(refusal.headers, p.request.headers);
    }
    const r = b.collectAvailable([p], site, [d]); a.equal(r.total, 10); a.equal(r.complete, false); a.equal(b.validateEvidence(r.verification, r.jobs, site).total, 10);
    a.deepEqual(r.verification.pages[0].response, native); a.deepEqual(r.verification.dictionaryResponses[0].response, observedDictionary.nativeJSON); a.deepEqual(r.jobs.map(j => j.post), native.result.list);
    for (const job of r.jobs) {
      const j = b.normalizeRecord(job, site), post = job.post;
      a.equal(j.title, post.name); a.equal(j.id, String(post.id)); a.equal(j.duty, post.description ?? ''); a.equal(j.requirements, post.positionDemand ?? '');
      a.ok(j.city && j.category); a.ok(dom.text.includes(j.category)); a.equal(j.jdComplete, false); a.equal(j.talentPlan, null); a.equal(j.date, null); a.equal(j.sourceStatus, null);
      a.ok(j.url.endsWith('/' + post.id)); a.equal(j.employment, site.track === 'campus' ? 'full-time' : null);
    }
  });
}
const scripts = [nodeBase + '/kuaishou-campus-main.js', nodeBase + '/kuaishou-social-contract.js'];
test('Kuaishou offline current first-party renderers prove id routes and literal pre TEXT (no HTML/entity decoding or SDK)', { skip: scripts.some(file => !fs.existsSync(file)) }, () => {
  const campusJS = fs.readFileSync(scripts[0], 'utf8'), socialJS = fs.readFileSync(scripts[1], 'utf8');
  a.ok(campusJS.includes('return"/campus/job-info/"+e')); a.ok(campusJS.includes('e.push("/campus/job-info/"+t.id)'));
  a.ok(campusJS.includes('createElement("pre",{className:"value"},N)')); a.ok(campusJS.includes('createElement("pre",{className:"value"},O)'));
  for (const code of ['20271779425607', '20271772783534']) a.ok(campusJS.includes(code));
  a.ok(socialJS.includes('location.origin+location.pathname+"#/official/"+(t.isSocial?"social":"trainee")+"/job-info/"+n'));
  a.ok(socialJS.includes('value:"description"')); a.ok(socialJS.includes('value:"positionDemand"')); a.ok(socialJS.includes('createElement("pre",{className:"job-info-des-item-value"},c[n])'));
  a.ok(socialJS.includes('dataIndex:"workLocationsCode"')); a.ok(socialJS.includes('SimpleTransform)(e,"workLocationsCode",t,"preview",void 0,"workLocationCode")'));
});
