'use strict';
const test = require('node:test'), a = require('node:assert/strict');
const ali = require('../crawler/lib/custom/ali_social_common');
const fixtures = require('./fixtures/ali-social-portals.json');
const copy = structuredClone;
const p = ali.PROFILES.find(p => p.key === 'aliyun_social');
const siteFor = p => ({ key: p.key, company: p.company, ats: 'custom', track: 'social', batch: '社招', exclude: '(无)', adapter: 'ali-social-portal-v1', listJD: true, apiOrigin: p.origin, url: p.url, api: p.api, body: ali.requestBody(p, 1) });
const site = siteFor(p);
// Parameterized OFFLINE native rows. Cloud's independently observed defaults on 2026-10-09:
// requests 1/50 return 10; request 51 empty; HTTP200/success, total670, metadata500/1.
// isLingYang is boolean (including true on page50), tags are null or ["NEW"].
function row(id = 100015423004) {
  return { ...copy(fixtures.alibaba_social.postings[0]), id, name: '离线岗位 ' + id,
    trackId: 'offline-track-' + id, positionUrl: '/off-campus/position-detail?positionId=' + id + '&track_id=offline-track-' + id,
    description: '  <TEXT> &amp; >>>\r\n  内部   空白  ', requirement: '  独立要求\n尾  ', tags: ['NEW'], isLingYang: false };
}
const rows = n => Array.from({ length: n }, (_, i) => row(100015423004 + i));
function page(index = 1, jobs = [row()], total = 670) {
  return { request: ali.requestBody(p, index), httpStatus: 200,
    response: { success: true, errorMsg: null, errorCode: null, content: { datas: copy(jobs), totalCount: total, pageSize: 500, currentPage: 1 } } };
}
const sample = () => ali.collectCloudAvailable([page()], site);
const BASE_CLOCK = '2026-10-09T04:13:28.820Z';
// Captured code/name/order from this Cloud portal's category/list (2026-10-09); no other ATS tree.
const CATEGORY_NODES = [
  ['130', '技术类', '133:前端|135:运维|136:开发|137:质量保证|407:安全|408:数据|409:算法|410:综合|411:综合管理|511:地图|702:基础平台|703:无线（端）|704:综合|747:研究|764:多媒体技术|769:游戏技术|798:芯片|811:方案与服务'],
  ['97', '产品类', '403:平台型|404:商业型|405:用户型|406:综合管理'],
  ['103', '运营类', '108:商家运营|474:安全运营|475:产品运营|476:规则管理|477:行业运营|478:内容运营|479:频道/类目运营|480:无线产品运营|481:无线内容运营|482:无线运营综合|483:运营综合|484:综合管理|529:现场娱乐运营|757:用户运营|758:产品运营|759:商家商品运营|763:商业伙伴运营|834:经营管理|846:行业运营（商业化）|847:商家运营（商业化）'],
  ['112', '设计类', '113:交互|114:视觉|115:用户体验与研究|444:综合管理|802:创意设计'],
  ['143', '数据类', '446:商业数据分析|447:网站运营数据分析|448:综合管理'],
  ['124', '市场拓展', '126:市场|445:BD|716:技术业务发展|812:行业|824:大客户BD|825:行业/区域BD'],
  ['152', '销售类', '156:销售策划|461:Incall|462:产品运营|463:电销|464:渠道管理|465:外贸服务|466:销售品控|467:业务运营|468:业务支持|469:运营|470:在线销售|471:直销|472:资源管理|473:综合管理|512:票务策划|513:票务管理'],
  ['157', '综合类', '159:法务|162:人力资源|163:行政|165:采购|168:综合管理|180:其它|485:IT|486:财务及内控|487:工程建设|488:公司事务|489:培训|490:物流'],
  ['117', '客服类', '427:服务安全|428:服务运营|429:技术服务|430:交易保障|431:客服培训|432:客户接待|433:客户支持|434:流程优化|435:品质提升|436:热线&在线|437:商家管理|438:外包运营|439:现场管理|440:业务分析与运营|441:质量保证|442:综合服务|443:综合管理']
];
function categoryEvidence() {
  const node = (code, name, categories) => ({ parentId: null, id: null, name, code, batchId: null, type: null, categories });
  const content = CATEGORY_NODES.map(([code, name, children]) => node(code, name, children.split('|').map(pair => { const [code, name] = pair.split(':'); return node(code, name, null); })));
  return { request: { url: p.origin + '/category/list', method: 'POST', body: { channel: 'group_official_site', language: 'zh' } }, httpStatus: 200,
    response: { success: true, errorMsg: null, errorCode: null, content } };
}
function filteredPage(code = '130', index = 1, jobs = [row()], total = 353) {
  const raw = page(index, jobs, total), root = categoryEvidence().response.content.find(root => root.code === code);
  raw.request.categories = root.code; raw.request.subCategories = root.categories.map(child => child.code).join(','); return raw;
}
function regionEvidence() {
  const pairs = [['330100', '杭州'], ['110100', '北京'], ['310100', '上海'], ['440100', '广州'], ['440300', '深圳'], ['510100', '成都'], ['500100', '重庆'], ['320100', '南京'], ['420100', '武汉'], ['HKG', '中国香港']];
  return { request: { url: p.origin + '/region/hot', method: 'POST', body: { channel: 'group_official_site', language: 'zh' } }, httpStatus: 200,
    response: { success: true, errorMsg: null, errorCode: null, content: pairs.map(([code, name]) => ({ code, name })) } };
}
function regionSearchEvidence() {
  return { request: { url: p.origin + '/region/search', method: 'POST', body: { channel: 'aliyun_group_official_site', language: 'zh', key: '西安' } }, httpStatus: 200,
    response: { success: true, errorMsg: null, errorCode: null, content: [{ name: '西安', code: '610100' }] } };
}
function regionPage(code = '330100', index = 1, jobs = [row()], total = 454) { const raw = page(index, jobs, total); raw.request.regions = code; return raw; }
function keywordPage(keyword = '瓴羊', index = 1, jobs = [row()], total = 23) { const raw = page(index, jobs, total); raw.request.key = keyword; return raw; }
function supplemented(scans = [{ categoryCode: '130', pages: [filteredPage()] }], extra = {}, base = sample().verification) {
  return ali.collectCloudSupplemented(base, site, { baseCompletedAt: BASE_CLOCK, categoryEvidence: [categoryEvidence(), categoryEvidence()], scans, ...extra });
}
function mock(sequence, config = {}) {
  let clock = 0, activeBodies = 0, maximumBodies = 0, gets = 0, posts = 0;
  const calls = [], delays = [];
  const options = { now: () => clock, sleep: async ms => { delays.push(ms); clock += config.earlyWake && ms > 1 ? Math.ceil(ms / 2) : ms; }, fetchImpl: async (url, init) => {
    a.equal(activeBodies, 0, 'next request must wait until the prior body is read');
    calls.push({ url, init, start: clock }); clock += 20;
    if (config.throwAt === calls.length) throw new Error('live token MUST_NOT_PERSIST ' + url);
    const headers = { getSetCookie: () => ['SESSION=MUST_NOT_PERSIST_COOKIE; Path=/; Secure', 'PATH=secret; Path=/off-campus', 'OTHER=secret; Domain=evil.invalid; Path=/', 'DEAD=secret; Path=/; Max-Age=0'], get: name => name === 'location' ? config.location ?? p.origin + '/off-campus/position-list' : null };
    async function read(value) { activeBodies++; maximumBodies = Math.max(maximumBodies, activeBodies); await Promise.resolve(); clock += 45; config.onBody?.(calls.length, () => { clock = config.deadlineClock ?? 900000; }); activeBodies--; return value; }
    if (init.method === 'GET') {
      gets++;
      return { status: config.bootstrapStatus ?? (config.redirect && gets === 1 ? 302 : 200), headers,
        text: () => read(config.html ?? 'window.__sysconfig = {"__token__": "MUST_NOT_PERSIST_TOKEN"};') };
    }
    posts++;
    const current = copy(sequence[posts - 1]); a.ok(current, 'no unexpected retry or extra page');
    a.deepEqual(JSON.parse(init.body), current.request);
    return { status: current.httpStatus, headers, json: () => config.hangBodyAt === posts ? new Promise(() => {}) : read(current.response) };
  } };
  return { options, calls, delays, get gets() { return gets; }, get posts() { return posts; }, get maximumBodies() { return maximumBodies; } };
}

test('Cloud has independent exact available eligibility; seven complete-v1 qualifications stay unchanged', () => {
  a.equal(ali.availableSource(site), true); a.equal(ali.verifiedSource(site), false); a.equal(p.qualified, false);
  a.equal(ali.PROFILES.filter(p => p.qualified).length, 7);
  for (const profile of ali.PROFILES.filter(p => p.qualified)) { a.equal(ali.verifiedSource(siteFor(profile)), true); a.equal(ali.availableSource(siteFor(profile)), false); a.throws(() => ali.collectCloudAvailable([page()], siteFor(profile))); }
  a.equal(ali.requiresVerification(site), true);
  a.match(ali.portalNotice(site), /阿里云.*默认空筛选.*瓴羊、诚云.*不推定法律雇主/);
  a.match(ali.portalNotice(site), /详情正文完整性待核验.*完整性未验证/);
  for (const field of Object.keys(site)) {
    const bad = copy(site); delete bad[field]; a.equal(ali.requiresVerification(bad), true); a.equal(ali.availableSource(bad), false); a.throws(() => ali.validateJobs([row()], bad));
  }
  for (const patch of [{ key: 'cloud_alias' }, { company: '瓴羊' }, { ats: 'generic' }, { adapter: 'other' }, { track: 'campus' }, { listJD: false }, { url: p.origin + '/off-campus/position-list' }, { api: p.api + '?lang=zh' }, { body: { ...site.body, regions: '杭州' } }, { body: { ...site.body, categories: '技术' } }, { body: { ...site.body, channel: 'aliyun_group_official_site' } }, { body: { ...site.body, pageSize: 500 } }, { verified: true }]) {
    const bad = { ...copy(site), ...patch }; a.equal(ali.requiresVerification(bad), true); a.equal(ali.availableSource(bad), false); a.throws(() => ali.collectCloudAvailable([page()], bad));
  }
  for (const uri of [null, 5, '/relative', 'not-a-url', 'https://user:pw@careers.aliyun.com/path', p.origin.toUpperCase() + ':443/path']) {
    const bad = { key: 'alias', ats: 'generic', api: uri }; a.equal(ali.requiresVerification(bad), true); a.equal(ali.availableSource(bad), false);
  }
});

test('The observed 500/1 metadata is accepted ONLY on Cloud, with native ten-row request scope', () => {
  for (const index of [1, 50, 51]) {
    const raw = page(index, index === 51 ? [] : rows(10));
    a.equal(ali.cloudNativePage(raw, site, index), raw.response.content);
    a.equal(raw.request.pageSize, 10); a.equal(raw.response.content.pageSize, 500); a.equal(raw.response.content.currentPage, 1);
  }
  const r = ali.collectCloudAvailable([page(1, rows(10))], site);
  a.equal(r.complete, false); a.equal(r.verification.version, 2); a.equal(r.verification.policy, 'available');
  a.equal(r.total, 10); a.match(r.issues.join(';'), /官方total 670；实际唯一岗位 10.*分页未穷尽/);
  a.deepEqual(ali.validateEvidence(r.verification, r.jobs, site).jobs, r.jobs);
  a.throws(() => ali.validateEvidence({ version: 1, key: site.key, api: site.api, scans: [{ pages: [page()] }, { pages: [page()] }] }, r.jobs, site), /source binding/);
});

test('Single pass reaches the observed early empty, preserving 500 native IDs and total670 without complete', () => {
  const native = rows(500), pages = Array.from({ length: 50 }, (_, i) => page(i + 1, native.slice(i * 10, i * 10 + 10)));
  pages[49].response.content.datas.forEach(job => { job.isLingYang = true; }); pages.push(page(51, []));
  const before = copy(pages), r = ali.collectCloudAvailable(pages, site);
  a.equal(r.total, 500); a.equal(r.complete, false); a.equal(r.verification.pages.at(-1).response.content.totalCount, 670);
  a.match(r.issues.join(';'), /第51页提前空.*官方total 670；实际唯一岗位 500/);
  a.deepEqual(r.jobs, pages.flatMap(p => p.response.content.datas)); a.deepEqual(pages, before);
  a.ok(Object.isFrozen(r) && Object.isFrozen(r.jobs[0]) && Object.isFrozen(r.verification.pages[0].response));
  a.equal(ali.validateEvidence(r.verification, r.jobs, site).total, 500);
  a.throws(() => ali.collectCloudAvailable([...pages, page(52)], site), /extra request/);
});

test('Duplicates, total drift and short/empty partials retain first original raw ordering/body and bind jobs', () => {
  const first = row(), duplicate = { ...row(), description: 'later body must not replace first' }, second = row(first.id + 1);
  const r = ali.collectCloudAvailable([page(1, [first], 670), page(2, [duplicate, second], 669), page(3, [], 669)], site);
  a.deepEqual(r.jobs, [first, second]); a.equal(r.complete, false);
  a.match(r.issues.join(';'), /短页.*提前空.*重复官方id 1.*官方total 670→669；实际唯一岗位 2/);
  for (const jobs of [[second, first], [{ ...first, description: 'corrupt' }, second], [first], []]) a.throws(() => ali.validateEvidence(r.verification, jobs, site), /jobs\/native/);
  const zero = ali.collectCloudAvailable([page(1, [first], 1), page(2, [], 0)], site);
  a.equal(zero.total, 1); a.equal(zero.complete, false); a.match(zero.issues.join(';'), /官方total 1→0；实际唯一岗位 1/);
  for (const pages of [[], [page(1, [], 0)], [page(1, [], 670)], [page(1, [{ ...first, id: 0 }])]]) a.throws(() => ali.collectCloudAvailable(pages, site), /zero cannot clear|limits/);
  a.throws(() => ali.validateJobs([], site), /zero cannot clear/);
  a.throws(() => ali.validateJobs([first, first], site), /Duplicate/);
});

test('Cloud projection preserves literal independent TEXT, native fields and unknown dimensions without aliases', () => {
  const raw = { ...row(), title: 'FAKE', url: 'https://evil.invalid', date: '2999-01-01', dateKind: 'published', employment: 'full-time', talentPlan: true, sourceStatus: 'OPEN', jdComplete: true,
    categories: ['技术类', '', '算法'], workLocations: ['福州', '深圳', '广州'], isLingYang: true };
  const out = ali.normalizeRecord(raw, site);
  a.equal(out.title, raw.name); a.equal(out.duty, raw.description); a.equal(out.requirements, raw.requirement);
  a.equal(out.category, '技术类//算法'); a.equal(out.city, '福州/深圳/广州'); a.equal(out.description, ''); a.equal(out.jdComplete, false);
  a.deepEqual(out.channels, ['social']); for (const field of ['employment', 'talentPlan', 'date', 'dateKind', 'sourceStatus']) a.equal(out[field], null);
  a.equal(out.url, p.origin + raw.positionUrl); a.equal(Object.hasOwn(out, 'isLingYang'), false); a.equal(Object.hasOwn(out, 'tags'), false);
  for (const body of ['', null, '>>>', '同文', '  ']) {
    const j = { ...raw, description: body, requirement: body, categories: null, workLocations: null };
    const text = ali.normalizeRecord(j, site); a.equal(text.duty, body ?? ''); a.equal(text.requirements, body ?? ''); a.equal(text.jdComplete, false);
    a.equal(ali.collectCloudAvailable([page(1, [j])], site).total, 1);
  }
});

test('Cloud rejects unreviewed nonempty duty/requirements aliases instead of discarding extra native JD', () => {
  for (const field of ['duty', 'requirements']) {
    const raw = { ...row(), [field]: '独立额外原文，不允许吞掉' };
    a.throws(() => ali.normalizeRecord(raw, site), /additional native JD/);
    const r = ali.collectCloudAvailable([page(1, [row(raw.id + 1), raw])], site);
    a.equal(r.total, 1); a.match(r.issues.join(';'), /additional native JD/);
    for (const empty of [null, '']) a.equal(ali.normalizeRecord({ ...row(), [field]: empty }, site).duty, row().description);
  }
});

test('Cloud never persists an old sent session cookie echoed after response cookie rotation', async () => {
  const refusal = page(2); refusal.httpStatus = 403; refusal.response.success = false; refusal.response.errorMsg = 'ROTATED_OLD_SECRET';
  const m = mock([page(), refusal]), originalFetch = m.options.fetchImpl;
  m.options.fetchImpl = async (url, init) => {
    const response = await originalFetch(url, init), n = m.calls.length;
    if (n === 3) a.match(init.headers.Cookie, /SESSION=ROTATED_OLD_SECRET/);
    response.headers.getSetCookie = () => ['SESSION=' + (n === 3 ? 'ROTATED_NEW_SECRET' : 'ROTATED_OLD_SECRET') + '; Path=/; Secure'];
    return response;
  };
  const result = await ali.run(site, m.options);
  a.equal(m.posts, 2); a.equal(result.verification.stopped.response, null);
  a.equal(JSON.stringify(result).includes('ROTATED_OLD_SECRET'), false);
  a.equal(JSON.stringify(result).includes('ROTATED_NEW_SECRET'), false);
});

test('Native identity/link/own fields and added JD are checked; bad nonessential metadata skips the intact raw job', () => {
  const original = row();
  for (const field of Object.keys(original)) { const bad = copy(original); delete bad[field]; a.throws(() => ali.normalizeRecord(bad, site), field); }
  for (const patch of [{ id: 0 }, { id: '100' }, { name: ' ' }, { description: [] }, { requirement: {} }, { trackId: '' }, { trackId: 1 }, { positionUrl: 'https://evil.invalid' + original.positionUrl }, { positionUrl: original.positionUrl + '&x=1' }, { positionUrl: original.positionUrl + '&positionId=' + original.id }, { positionUrl: original.positionUrl + '#' }, { positionUrl: original.positionUrl.replace('offline-track-', 'wrong-') }, { positionUrl: original.positionUrl.replace('position-detail', 'other') }, { positionUrl: original.positionUrl.replace(String(original.id), '1') }, { positionUrl: p.origin.replace('https://', 'https://user:pw@') + original.positionUrl }, { isLingYang: null }, { isLingYang: 'false' }, { tags: {} }, { tags: [3] }, { workLocations: '杭州' }, { categories: [1] }, { degree: [] }, { status: 'OPEN' }, { publishTime: -1 }, { modifyTime: '1791517889000' }, { experience: { from: '5', to: null } }, { operations: ['apply'] }, { regionEnNameMap: [] }, { newNativeJD: '未核完整段落' }]) {
    const bad = { ...copy(original), ...patch };
    a.throws(() => ali.normalizeRecord(bad, site));
    const r = ali.collectCloudAvailable([page(1, [original, { ...bad, id: bad.id === original.id ? original.id + 1 : bad.id }])], site);
    a.equal(r.total, 1); a.deepEqual(r.jobs[0], original); a.match(r.issues.join(';'), /列表记录未应用/);
  }
  const sparse = copy(original); sparse.categories = Array(1); a.throws(() => ali.normalizeRecord(sparse, site), /sparse/);
  a.equal(ali.collectCloudAvailable([page(1, [{ ...original, newMetadata: null }])], site).total, 1);
});

test('Envelope, HTTP/business/metadata/body/page-order mutations cannot promote jobs or manufacture zero', () => {
  const r = sample();
  const changes = [v => v.version = 1, v => v.policy = 'complete', v => delete v.policy, v => v.key = 'alias', v => v.api += '?alias=1', v => v.complete = true, v => v.pages = [], v => v.issues = [1], v => v.pages[0].request.pageIndex = 2, v => v.pages[0].request.pageSize = 500, v => v.pages[0].request.key = '算法', v => v.pages[0].request.regions = '杭州', v => v.pages[0].request.deptCodes = ['部门'], v => v.pages[0].request.extra = true, v => v.pages[0].url = p.api, v => v.pages[0].httpStatus = 403, v => v.pages[0].httpStatus = 500, v => v.pages[0].response.success = false, v => v.pages[0].response.errorCode = 'DENIED', v => v.pages[0].response.errorMsg = '拒绝', v => v.pages[0].response.other = true, v => delete v.pages[0].response.content.totalCount, v => v.pages[0].response.content.totalCount = '670', v => v.pages[0].response.content.totalCount = -1, v => v.pages[0].response.content.pageSize = 10, v => v.pages[0].response.content.currentPage = 2, v => v.pages[0].response.content.count = 670, v => v.pages[0].response.content.datas = {}, v => v.pages[0].response.content.datas = rows(11), v => v.pages[0].response.content.datas = Array(1)];
  for (const mutate of changes) { const v = copy(r.verification); mutate(v); a.throws(() => ali.validateEvidence(v, r.jobs, site)); }
  a.throws(() => ali.validateEvidence(undefined, r.jobs, site));
  const inherited = copy(r.verification); const c = inherited.pages[0].response.content; delete c.totalCount; Object.setPrototypeOf(c, { totalCount: 670 }); a.throws(() => ali.validateEvidence(inherited, r.jobs, site));
  a.throws(() => ali.collectCloudAvailable([page(1), page(3)], site), /request\/status/);
  a.throws(() => ali.collectCloudAvailable(Array.from({ length: 201 }, (_, i) => page(i + 1)), site), /limits/);
});

test('Failed next-request evidence preserves prior jobs; successful pages cannot be dressed up as stopped', () => {
  for (const kind of ['transport', 'HTTP', 'business', 'metadata']) {
    const stopped = { ...page(2), error: 'offline stopped' };
    if (kind === 'transport') { stopped.httpStatus = null; stopped.response = null; }
    if (kind === 'HTTP') stopped.httpStatus = 403;
    if (kind === 'business') stopped.response.success = false;
    if (kind === 'metadata') stopped.response.content.pageSize = 10;
    const r = ali.collectCloudAvailable([page()], site, { issues: ['已核离线缺口'], stopped });
    a.equal(r.total, 1); a.equal(ali.validateEvidence(r.verification, r.jobs, site).total, 1); a.match(r.issues.join(';'), /已核离线缺口.*请求停止/);
    const bad = copy(r.verification); bad.stopped.request.pageIndex = 3; a.throws(() => ali.validateEvidence(bad, r.jobs, site), /stopped request/);
    const disguised = copy(r.verification); disguised.stopped = { ...page(2), error: 'forged failure' }; a.throws(() => ali.validateEvidence(disguised, r.jobs, site), /successful page/);
  }
  a.throws(() => ali.collectCloudAvailable([page(), page(2, [])], site, { stopped: { ...page(3), error: 'extra' } }), /stopped request/);
});

test('Default Cloud transport follows only its witnessed lang-removal302, serial START>=200ms and body completion', async () => {
  const m = mock([page(), page(2, [])], { redirect: true, earlyWake: true });
  const r = await ali.run(site, { ...m.options, delayMs: 0 });
  a.equal(r.total, 1); a.equal(r.complete, false); a.equal(m.gets, 2); a.equal(m.posts, 2); a.equal(m.maximumBodies, 1);
  a.equal(m.calls[0].url, p.url); a.equal(m.calls[1].url, p.origin + '/off-campus/position-list');
  for (let i = 1; i < m.calls.length; i++) a.ok(m.calls[i].start - m.calls[i - 1].start >= 200);
  for (const call of m.calls) { a.equal(call.init.redirect, 'manual'); a.equal(Object.hasOwn(call.init.headers, 'User-Agent'), false); a.ok(call.init.signal instanceof AbortSignal); }
  const post = m.calls.find(c => c.init.method === 'POST'); a.equal(post.init.headers.Referer, p.url); a.equal(post.init.headers.Origin, p.origin); a.equal(post.init.headers.Cookie, 'SESSION=MUST_NOT_PERSIST_COOKIE');
  a.equal(Object.hasOwn(post.init.headers, 'X-XSRF-TOKEN'), false); a.equal(new URL(post.url).searchParams.get('_csrf'), 'MUST_NOT_PERSIST_TOKEN');
  a.ok(!JSON.stringify(r).includes('MUST_NOT_PERSIST'));
  a.equal(ali.validateEvidence(r.verification, r.jobs, site).total, 1);
  for (const location of [p.origin + '/login', p.origin + '/off-campus/position-list?other=1', 'https://evil.invalid/off-campus/position-list', p.origin.replace('https://', 'https://user@') + '/off-campus/position-list']) {
    const bad = mock([], { redirect: true, location }); await a.rejects(ali.run(site, bad.options), /unverified bootstrap redirect/); a.equal(bad.calls.length, 1);
  }
  const repeated = mock([], { bootstrapStatus: 302 }); await a.rejects(ali.run(site, repeated.options), /bootstrap HTTP/); a.equal(repeated.calls.length, 2);
  const wrapper = mock([page(), page(2, [])]); a.equal((await ali.fetchAllFor('careers.aliyun.com', wrapper.options)).complete, false); a.equal(wrapper.posts, 2);
  a.throws(() => ali.fetchAllFor('unknown.invalid', mock([]).options), /Unknown Ali/);
});

test('Transport/HTTP/business/body errors stop without retry and sanitize live session material', async () => {
  const first = page(), failed = page(2);
  for (const config of [{ throwAt: 3 }, { hangBodyAt: 2 }]) {
    const m = mock([first, failed], config); const r = await ali.fetchCloudAvailable(site, { ...m.options, timeoutMs: 5 });
    a.equal(m.calls.filter(c => c.init.method === 'POST').length, 2); a.equal(r.total, 1); a.equal(r.verification.stopped.request.pageIndex, 2); a.match(r.issues.join(';'), /请求停止/); a.ok(!JSON.stringify(r).includes('MUST_NOT_PERSIST'));
    a.equal(ali.validateEvidence(r.verification, r.jobs, site).total, 1);
  }
  for (const mutate of [p => p.httpStatus = 403, p => p.httpStatus = 500, p => p.response.success = false, p => p.response.content.pageSize = 10, p => p.response.echo = 'MUST_NOT_PERSIST_TOKEN', p => p.response.echo = 'MUST_NOT_PERSIST_COOKIE']) {
    const bad = page(2); mutate(bad); const m = mock([first, bad]), r = await ali.run(site, m.options);
    a.equal(m.posts, 2); a.equal(r.total, 1); a.equal(r.complete, false); a.ok(!JSON.stringify(r).includes('MUST_NOT_PERSIST'));
    a.equal(ali.validateEvidence(r.verification, r.jobs, site).total, 1);
  }
  for (const config of [{ bootstrapStatus: 403 }, { html: '<html>login</html>' }, { throwAt: 1 }, { throwAt: 2 }, { hangBodyAt: 1 }]) {
    const m = mock([first], config); await a.rejects(ali.run(site, { ...m.options, timeoutMs: 5 })); a.ok(m.posts <= 1); a.ok(m.calls.length <= 2);
  }
  const invalid = mock([]); await a.rejects(ali.run({ ...site, ats: 'generic' }, invalid.options)); a.equal(invalid.calls.length, 0);
  const htmlTimeout = mock([], { html: '' }); const original = htmlTimeout.options.fetchImpl;
  htmlTimeout.options.fetchImpl = async (...args) => { const response = await original(...args); response.text = () => new Promise(() => {}); return response; };
  await a.rejects(ali.run(site, { ...htmlTimeout.options, timeoutMs: 5 }), /request\/body timeout/); a.equal(htmlTimeout.calls.length, 1);
  const fetchTimeout = mock([first, failed]); const fetch = fetchTimeout.options.fetchImpl; let starts = 0;
  fetchTimeout.options.fetchImpl = async (...args) => { starts++; if (starts === 3) return new Promise(() => {}); return fetch(...args); };
  const partial = await ali.run(site, { ...fetchTimeout.options, timeoutMs: 5 }); a.equal(starts, 3); a.equal(partial.total, 1); a.equal(partial.verification.stopped.httpStatus, null);
});

test('Safety deadline and page ceiling yield only an available partial, never another request after expiry', async () => {
  const m = mock([page()], { onBody: (n, setDeadline) => { if (n === 2) setDeadline(); } });
  const r = await ali.run(site, m.options); a.equal(m.posts, 1); a.equal(r.total, 1); a.equal(r.verification.stopped, null); a.match(r.issues.join(';'), /进程安全时限/);
  const wake = mock([page()]); const sleep = wake.options.sleep; let sleeps = 0;
  wake.options.sleep = async ms => { sleeps++; await sleep(sleeps === 2 ? 900000 : ms); };
  const late = await ali.run(site, wake.options); a.equal(wake.posts, 1); a.equal(late.total, 1); a.match(late.issues.join(';'), /请求停止/);
  const cap = mock([page(), page(2)]), partial = await ali.run(site, { ...cap.options, maxPages: 2 });
  a.equal(cap.posts, 2); a.equal(partial.complete, false); a.match(partial.issues.join(';'), /分页安全上限/);
  const before = mock([page()], { onBody: (_n, setDeadline) => setDeadline() }); await a.rejects(ali.run(site, before.options)); a.equal(before.posts, 0);
  for (const bad of [{ maxPages: 201 }, { maxPages: 0 }, { timeoutMs: 0 }, { delayMs: -1 }]) await a.rejects(ali.run(site, { ...mock([]).options, ...bad }), /limits/);
});

test('Explicit v3 embeds a revalidated v2/real old clock and a portal-bound nine-root dictionary', () => {
  const base = sample(), first = filteredPage(), before = copy([base.verification, first]);
  const r = supplemented([{ categoryCode: '130', pages: [first] }], {}, base.verification);
  a.equal(r.verification.version, 3); a.equal(r.verification.policy, 'available'); a.equal(r.complete, false); a.equal(r.total, 1);
  a.equal(r.verification.baseCompletedAt, BASE_CLOCK); a.deepEqual(r.verification.base, base.verification);
  a.deepEqual([base.verification, first], before); a.ok(Object.isFrozen(r.verification.base) && Object.isFrozen(r.jobs[0]));
  a.equal(ali.validateEvidence(r.verification, r.jobs, site).total, 1);
  a.match(r.issues.join(';'), /类别130：官方total 353；实际唯一岗位 1/);
  a.match(r.issues.join(';'), /基础唯一岗位 1；过滤唯一岗位 1；基础重叠 1；补充后唯一岗位 1/);
  a.match(r.issues.join(';'), /基础广列表官方total 670；补充后实际唯一岗位 1/);
  a.match(r.issues.join(';'), /筛选片并集不证明默认广范围穷尽/);
  for (const stamp of [null, BASE_CLOCK.replace('2026', 'not-year'), '2026-02-30T04:13:28.820Z', '2026-10-09T04:13:28Z', '2026-10-09T12:13:28.820+08:00']) a.throws(() => supplemented(undefined, { baseCompletedAt: stamp }), /completion time/);
  a.throws(() => supplemented(undefined, {}, r.verification), /available evidence source binding/);
  const old = copy(base.verification); old.pages[0].request.language = 'en'; a.throws(() => supplemented(undefined, {}, old), /native request/);
});

test('Explicit supplementation is base-first/new-only: overlapping text/tracking/metadata never replaces old raw', () => {
  const native = rows(3), base = ali.collectCloudAvailable([page(1, native, 670), page(2, [])], site);
  const changed = { ...copy(native[0]), name: '新标题不覆盖', description: '新的两栏不覆盖', requirement: '新要求不覆盖', isLingYang: true, publishTime: native[0].publishTime + 1000, modifyTime: native[0].modifyTime + 1000 }, fresh = row(native[0].id + 99);
  changed.trackId += '-fresh'; changed.positionUrl = changed.positionUrl.replace(native[0].trackId, changed.trackId);
  const later = { ...copy(changed), description: 'later root must not win' };
  const r = supplemented([
    { categoryCode: '130', pages: [filteredPage('130', 1, [changed, fresh], 2), filteredPage('130', 2, [], 2)] },
    { categoryCode: '97', pages: [filteredPage('97', 1, [later], 1), filteredPage('97', 2, [], 1)] }
  ], {}, base.verification);
  a.deepEqual(r.jobs, [...native, fresh]); a.equal(r.total, 4); a.equal(r.complete, false);
  a.throws(() => ali.validateEvidence(r.verification, [changed, native[1], native[2], fresh], site), /jobs\/native/);
  const ordinary = ali.collectCloudAvailable([page(1, [changed])], site); a.deepEqual(ordinary.jobs[0], changed); // Ordinary v2 refresh remains allowed.
  a.match(r.issues.join(';'), /过滤列表重复官方id 1.*基础唯一岗位 3；过滤唯一岗位 2；基础重叠 1；补充后唯一岗位 4/);
  a.deepEqual(r.verification.base.pages[0].response.content.datas, native);
  const out = ali.normalizeRecord(r.jobs[0], site); a.equal(out.duty, native[0].description); a.equal(out.requirements, native[0].requirement); a.equal(out.title, native[0].name); a.equal(out.url, p.origin + native[0].positionUrl); a.equal(out.jdComplete, false);
  a.equal(out.category, native[0].categories?.join('/') ?? ''); a.equal(out.employment, null); a.equal(out.talentPlan, null); a.equal(out.date, null); a.equal(Object.hasOwn(out, 'isLingYang'), false);
  const zeroSlice = supplemented([{ categoryCode: '130', pages: [filteredPage('130', 1, [], 0)] }], {}, base.verification); a.deepEqual(zeroSlice.jobs, native); a.equal(zeroSlice.complete, false);
});

test('One/two dictionary receipts bind exact POST JSON, native fields, all110 safe unique codes/names/order', () => {
  const r = supplemented();
  const mutations = [v => v.categoryEvidence = [], v => v.categoryEvidence.push(categoryEvidence()), v => v.categoryEvidence[0].request.url += '?_csrf=[REDACTED]', v => v.categoryEvidence[0].request.url = 'https://other.invalid/category/list', v => v.categoryEvidence[0].request.method = 'GET', v => v.categoryEvidence[0].request.body.channel = 'aliyun_group_official_site', v => v.categoryEvidence[0].request.body.language = 'en', v => v.categoryEvidence[0].request.headers = {}, v => v.categoryEvidence[0].httpStatus = 403, v => v.categoryEvidence[0].response.success = false, v => v.categoryEvidence[0].response.errorCode = 'DENIED', v => v.categoryEvidence[0].response.extra = true, v => v.categoryEvidence[0].response.content.pop(), v => v.categoryEvidence[0].response.content.reverse(), v => v.categoryEvidence[0].response.content[0].categories.reverse(), v => v.categoryEvidence[0].response.content[0].categories[0].code = '99999', v => v.categoryEvidence[0].response.content[0].categories[0].code = '0133', v => v.categoryEvidence[0].response.content[0].categories[0].code = 'x,133', v => v.categoryEvidence[0].response.content[0].categories[0].code = 133, v => v.categoryEvidence[0].response.content[0].categories[0].name += 'unobserved', v => v.categoryEvidence[0].response.content[0].id = 130, v => v.categoryEvidence[0].response.content[0].categories[0].categories = [], v => v.categoryEvidence[0].response.content[0].categories.push(copy(v.categoryEvidence[0].response.content[0].categories[0])), v => v.categoryEvidence[1].response.content[0].categories[0].code = '99999'];
  for (const mutate of mutations) { const v = copy(r.verification); mutate(v); a.throws(() => ali.validateEvidence(v, r.jobs, site)); }
  const partial = supplemented(undefined, { categoryEvidence: [categoryEvidence()] }); a.match(partial.issues.join(';'), /未取得类别字典末检/);
});

test('Root scans only change categories/subCategories to that observed whole root and keep exact page order', () => {
  const r = supplemented();
  const mutations = [v => delete v.base, v => v.version = 2, v => delete v.policy, v => v.policy = 'complete', v => v.key = 'alias', v => v.api += '?x=1', v => v.complete = true, v => v.scans = [], v => v.scans.push(copy(v.scans[0])), v => v.scans[0].categoryCode = 'unobserved', v => v.scans[0].categoryCode = 130, v => v.scans[0].pages = [], v => v.scans[0].pages[0].request.categories = '', v => v.scans[0].pages[0].request.subCategories = '133', v => v.scans[0].pages[0].request.subCategories += ',133', v => v.scans[0].pages[0].request.subCategories = v.scans[0].pages[0].request.subCategories.split(',').reverse().join(','), v => v.scans[0].pages[0].request.regions = '杭州', v => v.scans[0].pages[0].request.key = 'AI', v => v.scans[0].pages[0].request.pageSize = 500, v => v.scans[0].pages[0].request.pageIndex = 2, v => v.scans[0].pages[0].response.content.pageSize = 10, v => v.scans[0].pages[0].response.content.currentPage = 2, v => v.scans[0].pages[0].httpStatus = 403, v => v.scans[0].pages[0].response.success = false, v => v.issues = [1]];
  for (const mutate of mutations) { const v = copy(r.verification); mutate(v); a.throws(() => ali.validateEvidence(v, r.jobs, site)); }
  for (const jobs of [[], [{ ...r.jobs[0], description: 'corrupt' }], [r.jobs[0], r.jobs[0]]]) a.throws(() => ali.validateEvidence(r.verification, jobs, site), /jobs\/native/);
  a.throws(() => ali.cloudNativePage(filteredPage(), site, 1), /native request/); // Default v2 never silently inherits filtered scope.
  a.throws(() => supplemented([{ categoryCode: '130', pages: [filteredPage(), filteredPage('130', 3)] }]), /filtered request/);
  a.throws(() => supplemented([{ categoryCode: '130', pages: [filteredPage('130', 1, []), filteredPage('130', 2)] }]), /extra request/);
  for (const bad of [{ ...site, key: 'ali_alias' }, { ...site, ats: 'generic' }, { ...site, body: { ...site.body, categories: '130' } }]) a.throws(() => ali.collectCloudSupplemented(sample().verification, bad, { baseCompletedAt: BASE_CLOCK, categoryEvidence: [categoryEvidence()], scans: [{ categoryCode: '130', pages: [filteredPage()] }] }), /source binding/);
});

test('Partial slices report native total/drift/dup/early empty and retain genuine old/new stopped evidence', () => {
  const first = row(), second = row(first.id + 1), bad = { ...row(first.id + 2), newNativeJD: 'unverified' };
  const r = supplemented([
    { categoryCode: '130', pages: [filteredPage('130', 1, [first, second, bad], 353), filteredPage('130', 2, [first], 352), filteredPage('130', 3, [], 352)] },
    { categoryCode: '97', pages: [filteredPage('97', 1, [second], 40)] }
  ], { categoryEvidence: [categoryEvidence()] });
  a.equal(r.total, 2); a.equal(r.complete, false); a.match(r.issues.join(';'), /未应用.*提前空.*官方total 353→352；实际唯一岗位 2/);
  a.match(r.issues.join(';'), /类别97分页未穷尽/); a.match(r.issues.join(';'), /过滤列表重复官方id 2/);
  const oldStop = { request: page(2).request, httpStatus: 403, response: null, error: 'old phase stopped' };
  const base = ali.collectCloudAvailable([page()], site, { stopped: oldStop });
  for (const code of ['130', '97']) {
    const stopped = { request: filteredPage(code, code === '130' ? 2 : 1).request, httpStatus: 403, response: null, error: 'new phase stopped' };
    const partial = supplemented(undefined, { categoryEvidence: [categoryEvidence()], stopped }, base.verification);
    a.deepEqual(partial.verification.base.stopped, oldStop); a.deepEqual(partial.verification.stopped, stopped); a.equal(partial.total, 1);
    a.equal(ali.validateEvidence(partial.verification, partial.jobs, site).total, 1);
    const corrupt = copy(partial.verification); corrupt.stopped.request.pageIndex++;
    a.throws(() => ali.validateEvidence(corrupt, partial.jobs, site), /stopped request/);
    const success = copy(partial.verification); success.stopped = { ...filteredPage(code, code === '130' ? 2 : 1), error: 'forged stop' };
    a.throws(() => ali.validateEvidence(success, partial.jobs, site), /successful page/);
  }
  const dictStop = { ...categoryEvidence(), httpStatus: 403, response: null, error: 'dictionary stopped' };
  const dictPartial = supplemented(undefined, { categoryEvidence: [categoryEvidence()], stopped: dictStop }); a.equal(dictPartial.total, 1);
  const disguised = copy(dictPartial.verification); disguised.stopped = { ...categoryEvidence(), error: 'forged dictionary stop' };
  a.throws(() => ali.validateEvidence(disguised, dictPartial.jobs, site), /successful page\/dictionary/);
  const wrongDict = copy(dictPartial.verification); wrongDict.stopped.request.body.channel = 'other'; a.throws(() => ali.validateEvidence(wrongDict, dictPartial.jobs, site), /stopped request/);
});

test('Supplement pages have a whole-phase200 ceiling and default transport stays independently v2', async () => {
  const first = Array.from({ length: 199 }, (_, i) => filteredPage('130', i + 1));
  const atCap = supplemented([{ categoryCode: '130', pages: first }, { categoryCode: '97', pages: [filteredPage('97')] }]);
  a.equal(atCap.complete, false); a.match(atCap.issues.join(';'), /达到补充分页安全上限/);
  a.throws(() => supplemented([{ categoryCode: '130', pages: first }, { categoryCode: '97', pages: [filteredPage('97'), filteredPage('97', 2)] }]), /limits/);
  a.throws(() => supplemented([{ categoryCode: '130', pages: first }, { categoryCode: '97', pages: [filteredPage('97')] }], { stopped: { ...filteredPage('97', 2), httpStatus: 403, response: null, error: 'past cap' } }), /stopped request/);
  const m = mock([page(), page(2, [])]), r = await ali.run(site, m.options); a.equal(r.verification.version, 2); a.equal(m.posts, 2); a.equal(Object.hasOwn(r.verification, 'base'), false);
});

test('Only the two official menu words supplement keyword-only v3, with no dictionary or attribute inference', () => {
  const fresh = { ...row(100015423103), isLingYang: true }, other = row(fresh.id + 1);
  const r = ali.collectCloudSupplemented(sample().verification, site, { baseCompletedAt: BASE_CLOCK, scans: [
    { keyword: '瓴羊', pages: [keywordPage('瓴羊', 1, [fresh], 23), keywordPage('瓴羊', 2, [], 23)] },
    { keyword: '诚云科技', pages: [keywordPage('诚云科技', 1, [other], 7)] }
  ] });
  a.equal(r.total, 3); a.equal(r.complete, false); a.deepEqual(r.verification.categoryEvidence, []); a.equal(Object.hasOwn(r.verification, 'regionEvidence'), false);
  a.match(r.issues.join(';'), /官网关联词瓴羊第2页提前空/); a.match(r.issues.join(';'), /官网关联词诚云科技分页未穷尽/);
  a.equal(ali.validateEvidence(r.verification, r.jobs, site).total, 3);
  a.equal(ali.normalizeRecord(fresh, site).employment, null); a.equal(ali.normalizeRecord(fresh, site).category, fresh.categories?.join('/') ?? '');
  for (const word of ['AI', '阿里云', '诚云', ' 瓴羊', '瓴羊,诚云科技', '', null]) a.throws(() => supplemented([{ keyword: word, pages: [keywordPage(word)] }], { categoryEvidence: [] }), /unobserved/);
  for (const change of [v => v.scans[0].pages[0].request.regions = '330100', v => v.scans[0].pages[0].request.categories = '130', v => v.scans[0].pages[0].request.language = 'en', v => v.scans[0].pages[0].request.channel = 'aliyun_group_official_site', v => v.scans[0].pages[0].request.key = '诚云科技', v => v.scans[0].regionCode = '330100']) {
    const v = copy(r.verification); change(v); a.throws(() => ali.validateEvidence(v, r.jobs, site));
  }
});

test('Exact same-portal hot-region POST evidence authorizes only single known Tree-checkbox codes', () => {
  const r = supplemented([{ regionCode: '330100', pages: [regionPage()] }], { categoryEvidence: [], regionEvidence: [regionEvidence(), regionEvidence()] });
  a.equal(r.total, 1); a.equal(r.complete, false); a.match(r.issues.join(';'), /地点330100：官方total 454；实际唯一岗位 1/);
  a.match(r.issues.join(';'), /热点仅为已证子范围，不代表所有城市、海外或无地点全集/);
  a.equal(ali.validateEvidence(r.verification, r.jobs, site).total, 1);
  const hk = supplemented([{ regionCode: 'HKG', pages: [regionPage('HKG')] }], { categoryEvidence: [], regionEvidence: [regionEvidence()] }); a.equal(hk.total, 1); a.match(hk.issues.join(';'), /未取得热点字典末检/);
  a.throws(() => supplemented([{ regionCode: '330100', pages: [regionPage()] }]), /unobserved/);
  for (const code of ['999999', '杭州', '330100,110100', '0330100', 330100]) a.throws(() => supplemented([{ regionCode: code, pages: [regionPage(code)] }], { categoryEvidence: [], regionEvidence: [regionEvidence()] }), /unobserved/);
  const changes = [v => v.regionEvidence = null, v => v.regionEvidence = [], v => v.regionEvidence.push(regionEvidence()), v => v.regionEvidence[0].request.url = 'https://other.invalid/region/hot', v => v.regionEvidence[0].request.url += '?_csrf=[REDACTED]', v => v.regionEvidence[0].request.method = 'GET', v => v.regionEvidence[0].request.body.language = 'en', v => v.regionEvidence[0].request.body.channel = 'aliyun_group_official_site', v => v.regionEvidence[0].httpStatus = 403, v => v.regionEvidence[0].response.success = false, v => v.regionEvidence[0].response.content.reverse(), v => v.regionEvidence[0].response.content[0].code = '999999', v => v.regionEvidence[0].response.content[0].code = 330100, v => v.regionEvidence[0].response.content[0].name = '海外', v => v.regionEvidence[0].response.content.push({ code: '999999', name: '其它' }), v => v.regionEvidence[0].response.content[0].extra = null, v => v.scans[0].pages[0].request.regions = '110100', v => v.scans[0].pages[0].request.key = '瓴羊'];
  for (const change of changes) { const v = copy(r.verification); change(v); a.throws(() => ali.validateEvidence(v, r.jobs, site)); }
});

test('Mixed category/region/menu slices deduplicate first raw, accept independent partial first pages and bind stopping', () => {
  const original = row(), later = { ...row(), description: 'later city must not replace first root' }, fresh = row(original.id + 1);
  const scans = [
    { categoryCode: '130', pages: [filteredPage('130', 1, [original])] },
    { regionCode: '330100', pages: [regionPage('330100', 1, [later, fresh])] },
    { keyword: '瓴羊', pages: [keywordPage('瓴羊', 1, [fresh])] }
  ];
  const r = supplemented(scans, { regionEvidence: [regionEvidence()] }); a.deepEqual(r.jobs, [original, fresh]); a.equal(r.total, 2); a.equal(r.complete, false);
  a.match(r.issues.join(';'), /过滤列表重复官方id 2/); a.equal(ali.validateEvidence(r.verification, r.jobs, site).total, 2);
  for (const attempt of [regionPage('330100', 2), keywordPage('瓴羊', 2)]) {
    const stopped = { ...attempt, httpStatus: 403, response: null, error: 'new portal refusal' };
    const partial = supplemented(scans, { regionEvidence: [regionEvidence()], stopped }); a.equal(partial.total, 2); a.match(partial.issues.join(';'), /新请求停止/);
    const success = copy(partial.verification); success.stopped = { ...attempt, error: 'forged successful page' }; a.throws(() => ali.validateEvidence(success, partial.jobs, site), /successful page/);
    const wrong = copy(partial.verification); wrong.stopped.request.key = 'unknown'; a.throws(() => ali.validateEvidence(wrong, partial.jobs, site), /stopped request/);
  }
  const stopped = { ...regionEvidence(), httpStatus: 403, response: null, error: 'region dictionary stopped' };
  const partial = supplemented(scans, { regionEvidence: [regionEvidence()], stopped }); a.equal(partial.total, 2);
  const success = copy(partial.verification); success.stopped = { ...regionEvidence(), error: 'forged dictionary failure' }; a.throws(() => ali.validateEvidence(success, partial.jobs, site), /successful page\/dictionary/);
  a.throws(() => supplemented([...scans, copy(scans[1])], { regionEvidence: [regionEvidence()] }), /duplicate filtered scan/);
});

test('The single200 new-page ceiling includes all fixed filter kinds but never counts historical base pages', () => {
  const native = rows(500), base = ali.collectCloudAvailable([...Array.from({ length: 50 }, (_, i) => page(i + 1, native.slice(i * 10, i * 10 + 10))), page(51, [])], site);
  const scans = [{ categoryCode: '130', pages: Array.from({ length: 198 }, (_, i) => filteredPage('130', i + 1)) }, { regionCode: '330100', pages: [regionPage()] }, { keyword: '瓴羊', pages: [keywordPage()] }];
  const r = supplemented(scans, { regionEvidence: [regionEvidence()] }, base.verification); a.equal(r.verification.base.pages.length, 51); a.equal(r.total, 500); a.equal(r.complete, false); a.match(r.issues.join(';'), /补充分页安全上限/);
  scans[2].pages.push(keywordPage('瓴羊', 2)); a.throws(() => supplemented(scans, { regionEvidence: [regionEvidence()] }, base.verification), /limits/);
});

test('The explicitly observed More Xi’an search independently authorizes610100 and two successful10/1 partial pages', () => {
  const native = rows(11); native[1].workLocations = null;
  const scans = [{ regionCode: '610100', pages: [regionPage('610100', 1, native.slice(0, 10), 11), regionPage('610100', 2, native.slice(10), 11)] }];
  const receipt = regionSearchEvidence(), before = copy(receipt), r = supplemented(scans, { categoryEvidence: [], regionSearchEvidence: [receipt], issues: ['达到200真实请求保护；其中2个传输粒度诊断不作生产证明'] });
  a.equal(r.total, 11); a.equal(r.complete, false); a.equal(r.verification.stopped, null); a.deepEqual(r.jobs, [row(), ...native.slice(1)]); a.deepEqual(receipt, before);
  a.match(r.issues.join(';'), /地点610100第2页短页.*地点610100：官方total 11；实际唯一岗位 11.*分页未穷尽/);
  a.match(r.issues.join(';'), /More仅绑定官网搜索西安返回选项/); a.match(r.issues.join(';'), /达到200真实请求保护/);
  a.equal(ali.normalizeRecord(r.jobs[1], site).city, ''); a.equal(ali.normalizeRecord(r.jobs[1], site).jdComplete, false);
  a.equal(ali.validateEvidence(r.verification, r.jobs, site).total, 11);
  const pair = supplemented(scans, { categoryEvidence: [], regionSearchEvidence: [receipt, receipt] }); a.equal(pair.total, 11);
  for (const extra of [{ categoryEvidence: [] }, { regionEvidence: [regionEvidence()] }, { regionSearchEvidence: [] }]) a.throws(() => supplemented(scans, extra), /unobserved/);
  const wrongJobs = copy(r.jobs); wrongJobs[10].description += 'corrupt'; a.throws(() => ali.validateEvidence(r.verification, wrongJobs, site), /jobs\/native/);
});

test('More receipt key/code/name/URL/native business are exact, distinct from hot or list channel and never a mode downgrade', () => {
  const r = supplemented([{ regionCode: '610100', pages: [regionPage('610100')] }], { categoryEvidence: [], regionSearchEvidence: [regionSearchEvidence()] });
  const changes = [v => delete v.regionSearchEvidence, v => v.regionSearchEvidence = null, v => v.regionSearchEvidence = [], v => v.regionSearchEvidence.push(regionSearchEvidence(), regionSearchEvidence()), v => v.regionSearchEvidence[0].request.url = p.origin + '/region/hot', v => v.regionSearchEvidence[0].request.url = 'https://other.invalid/region/search', v => v.regionSearchEvidence[0].request.url += '?_csrf=[REDACTED]', v => v.regionSearchEvidence[0].request.method = 'GET', v => v.regionSearchEvidence[0].request.body.channel = 'group_official_site', v => v.regionSearchEvidence[0].request.body.language = 'en', v => v.regionSearchEvidence[0].request.body.key = '', v => v.regionSearchEvidence[0].request.body.key = '北京', v => v.regionSearchEvidence[0].request.body.key = ' 西安', v => v.regionSearchEvidence[0].httpStatus = 403, v => v.regionSearchEvidence[0].response.success = false, v => v.regionSearchEvidence[0].response.errorCode = 'DENIED', v => v.regionSearchEvidence[0].response.extra = true, v => v.regionSearchEvidence[0].response.content = [], v => v.regionSearchEvidence[0].response.content = Array(1), v => v.regionSearchEvidence[0].response.content.push({ code: '610100', name: '西安' }), v => v.regionSearchEvidence[0].response.content[0].code = '999999', v => v.regionSearchEvidence[0].response.content[0].code = 610100, v => v.regionSearchEvidence[0].response.content[0].name = '西安市', v => v.regionSearchEvidence[0].response.content[0].code = '610100,330100', v => v.regionSearchEvidence[0].response.content[0].extra = null, v => v.scans[0].pages[0].request.channel = 'aliyun_group_official_site', v => v.scans[0].pages[0].request.key = '西安', v => v.scans[0].pages[0].response.content.pageSize = 10, v => v.scans[0].pages[0].response.content.currentPage = 2, v => v.scans[0].pages[0].response.success = false];
  for (const change of changes) { const v = copy(r.verification); change(v); a.throws(() => ali.validateEvidence(v, r.jobs, site)); }
  for (const patch of [{ adapter: undefined }, { ats: 'generic' }, { key: 'aliyun_alias' }, { company: '诚云科技' }, { apiOrigin: 'https://other.invalid' }]) {
    const bad = { ...site, ...patch }; a.equal(ali.requiresVerification(bad), true); a.equal(ali.availableSource(bad), false);
    a.throws(() => ali.collectCloudSupplemented(sample().verification, bad, { baseCompletedAt: BASE_CLOCK, regionSearchEvidence: [regionSearchEvidence()], scans: [{ regionCode: '610100', pages: [regionPage('610100')] }] }), /source binding/);
  }
});

test('More shares the200 new-page ceiling, retains prior stopped evidence and cannot fake successful stop', () => {
  const xi = [{ regionCode: '610100', pages: [regionPage('610100', 1, rows(10), 11), regionPage('610100', 2, [row(100015423014)], 11)] }];
  const extra = { regionSearchEvidence: [regionSearchEvidence()] };
  const scans = [{ categoryCode: '130', pages: Array.from({ length: 198 }, (_, i) => filteredPage('130', i + 1)) }, ...xi];
  const capped = supplemented(scans, extra); a.equal(capped.complete, false); a.match(capped.issues.join(';'), /补充分页安全上限/);
  scans[0].pages.push(filteredPage('130', 199)); a.throws(() => supplemented(scans, extra), /limits/);
  const old = ali.collectCloudAvailable([page()], site, { stopped: { request: page(2).request, httpStatus: 403, response: null, error: 'old stopped' } });
  const r = supplemented(xi, extra, old.verification); a.deepEqual(r.verification.base.stopped, old.verification.stopped);
  const disguised = copy(r.verification); disguised.stopped = { ...regionPage('610100', 3, [], 11), error: 'fake failure after success' };
  a.throws(() => ali.validateEvidence(disguised, r.jobs, site), /successful page/);
  const dictStop = { ...regionSearchEvidence(), httpStatus: 403, response: null, error: 'More dictionary failed' };
  const partial = supplemented(xi, { ...extra, stopped: dictStop }, old.verification); a.equal(partial.total, 11);
  const success = copy(partial.verification); success.stopped = { ...regionSearchEvidence(), error: 'fake successful dictionary failure' }; a.throws(() => ali.validateEvidence(success, partial.jobs, site), /successful page\/dictionary/);
});
