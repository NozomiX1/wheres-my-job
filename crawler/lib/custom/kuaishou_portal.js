'use strict';
const fs = require('node:fs');
const { randomUUID } = require('node:crypto');
const { isDeepStrictEqual: equal } = require('node:util');
const ADAPTER = 'kuaishou-portal-v1', MAX_PAGES = 200, PROCESS_MS = 900000;
const JD_NOTICE = '已收录列表JD，详情正文完整性待核验';
const NATIVE_MODE = 'native-ui-default-domestic';
const NATIVE_NOTICE = '官网页面自动默认国内；本次仅取得该默认列表，未证明无城市列表/海外等价，未取得者保旧；未注入/生成签名';
const check = (ok, message) => { if (!ok) throw new Error('Kuaishou: ' + message); };
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const dense = value => Array.isArray(value) && [...value.keys()].every(i => Object.hasOwn(value, i));
function freeze(value) {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) { Object.values(value).forEach(freeze); Object.freeze(value); }
  return value;
}
const PROFILES = freeze(['campus', 'social'].map(track => {
  const origin = 'https://' + (track === 'campus' ? 'campus' : 'zhaopin') + '.kuaishou.cn';
  const base = origin + (track === 'campus' ? '/recruit/campus/e/' : '/recruit/e/');
  return { key: track === 'campus' ? 'kuaishou' : 'kuaishou_social', company: '快手', ats: 'custom', adapter: ADAPTER,
    track, batch: track === 'campus' ? '官网校园字典全部项目（2020–2027届/实习生，含往届仍在列项目）' : '社会招聘默认入口（C001，日常实习另入口未核验）', exclude: '(无)', origin,
    url: base + (track === 'campus' ? '#/campus/jobs' : '#/official/social/'), api: base + 'api/v1/open/positions/simple', listJD: true,
    body: track === 'campus' ? { recruitSubProjectCodes: ['2020qiuzhao', '2020summerIntern', '2021qiuzhao', '2022campus', '2023campus', '20241687923507', '20251707035672', '20251718874803', '20261707035672', '20261749721165', '20271772783534', '20271779425607'], pageSize: 10, pageNum: 1 } :
      { pageNum: 1, pageSize: 10, positionNatureCode: 'C001', recruitProject: 'socialr' } };
}));
function requiresVerification(site) {
  if (PROFILES.some(p => p.key === site?.key) || site?.adapter === ADAPTER) return true;
  return ['origin', 'apiOrigin', 'api', 'url', 'detailApi'].some(k => {
    if (!site || !Object.hasOwn(site, k)) return false;
    try { check(typeof site[k] === 'string', 'invalid URI'); return ['campus.kuaishou.cn', 'zhaopin.kuaishou.cn'].includes(new URL(site[k].replace(/^(GET|POST)\s+/, '')).hostname.toLowerCase().replace(/\.$/, '')); }
    catch { return true; } // Malformed declarations must not downgrade to a generic adapter.
  });
}
function verifiedSource(site) { return PROFILES.some(p => equal(site, p)); }
function profile(site) { check(verifiedSource(site), 'unverified source identity/scope/mode'); return PROFILES.find(p => p.key === site.key); }
function baseFor(p) { return p.api.slice(0, -'api/v1/open/positions/simple'.length); }
function requestFor(site, pageNum, nativeMode = null) {
  const p = profile(site);
  check(nativeMode === null || nativeMode === NATIVE_MODE && p.track === 'social', 'unverified native UI mode/source');
  check(Number.isSafeInteger(pageNum) && pageNum > 0 && pageNum <= MAX_PAGES, 'unverified page');
  if (p.track === 'campus') return { url: p.api, method: 'POST', headers: { 'Content-Type': 'application/json', Origin: p.origin, Referer: baseFor(p) }, body: { ...p.body, pageNum } };
  return { url: p.api + '?' + new URLSearchParams({ ...p.body, pageNum, ...(nativeMode ? { workLocationCode: 'domestic' } : {}) }), method: 'GET', headers: { Accept: 'application/json', Referer: baseFor(p) }, body: null };
}
function dictionaryRequest(site) {
  const p = profile(site), base = baseFor(p), types = p.track === 'campus' ?
    'workLocation,positionCategory,positionCategoryFlatten,positionNature,recruitSubProject' : 'workLocation,positionCategory,positionExperience';
  return { url: base + 'api/v1/dictionary/batch?types=' + types, method: 'GET', headers: { Accept: 'application/json', Referer: base }, body: null };
}
function requestMatches(actual, expected, site) {
  // The saved normal social Chrome request uses Axios' JSON negotiation header; unsigned Node uses JSON only.
  if (site.track === 'social' && actual?.headers?.Accept === 'application/json, text/plain, */*')
    expected = { ...expected, headers: { ...expected.headers, Accept: actual.headers.Accept } };
  return equal(actual, expected);
}
function nativeSuccess(j, p) {
  check(object(j) && equal(Object.keys(j).sort(), ['code', 'message', 'result']) && j.code === 0 && j.message === (p.track === 'campus' ? 'OK' : 'ok'), 'native business refusal/unknown response');
  return j.result;
}
function dictionaryNames(nodes, type, names = new Map()) {
  check(dense(nodes), 'invalid native dictionary ' + type);
  for (const node of nodes) {
    check(object(node) && node.type === type && typeof node.code === 'string' && node.code.trim() && typeof node.name === 'string' && node.name.trim() &&
      Object.hasOwn(node, 'children') && (node.children === null || dense(node.children)), 'invalid native dictionary code/name/tree ' + type);
    check(!names.has(node.code), 'duplicate dictionary code ' + node.code); names.set(node.code, node.name);
    if (node.children !== null) dictionaryNames(node.children, type, names);
  }
  return names;
}
function dictionaryResult(dict, site) {
  const p = profile(site);
  if (dict === null) { check(p.track === 'social', 'campus dictionary evidence required'); return dict; }
  const fields = p.track === 'campus' ? ['workLocation', 'positionCategory', 'positionNature', 'recruitSubProject'] : ['workLocation', 'positionCategory', 'positionExperience'];
  check(object(dict) && (equal(Object.keys(dict).sort(), [...fields].sort()) || p.track === 'campus' && equal(Object.keys(dict).sort(), [...fields, 'positionCategoryFlatten'].sort())), 'native dictionary result/source binding');
  for (const field of Object.keys(dict)) dictionaryNames(dict[field], field === 'positionCategoryFlatten' ? 'positionCategory' : field);
  if (p.track === 'campus') {
    const projects = dictionaryNames(dict.recruitSubProject, 'recruitSubProject');
    check(projects.get('20271779425607') === '2027应届生' && projects.get('20271772783534') === '2027实习生', 'native current subproject name binding');
    // The registered profile must cover exactly the current dictionary project set; a new/removed project requires explicit migration.
    check(equal([...projects.keys()].sort(), [...p.body.recruitSubProjectCodes].sort()), 'native dictionary subproject coverage/source mismatch');
  }
  return dict;
}
function dictionaryData(page, site) {
  const p = profile(site);
  check(object(page) && equal(Object.keys(page).sort(), ['httpStatus', 'request', 'response']) && requestMatches(page.request, dictionaryRequest(site), site), 'native dictionary request/source binding');
  check(page.httpStatus === 200, 'dictionary HTTP ' + page.httpStatus);
  const dict = nativeSuccess(page.response, p); check(object(dict), 'missing native dictionary result');
  return dictionaryResult(dict, site);
}
function record(post, site) {
  const p = profile(site);
  check(object(post) && Object.hasOwn(post, 'id') && Number.isSafeInteger(post.id) && post.id > 0, 'invalid native id');
  check(Object.hasOwn(post, 'name') && typeof post.name === 'string' && post.name.trim(), 'invalid native title');
  check(post.recruitProjectCode === (p.track === 'campus' ? 'schoolr' : 'socialr'), 'native recruitProject scope binding');
  if (p.track === 'campus') check(p.body.recruitSubProjectCodes.includes(post.recruitSubProjectCode), 'native current subproject binding');
  else check(post.positionNatureCode === p.body.positionNatureCode, 'native social nature scope binding');
  for (const field of ['description', 'positionDemand', 'positionCategoryCode', 'positionNatureCode'])
    check(Object.hasOwn(post, field) && (post[field] === null || typeof post[field] === 'string'), 'missing/invalid native ' + field);
  const cityField = p.track === 'campus' ? 'workLocationDicts' : 'workLocations';
  check(Object.hasOwn(post, cityField) && (post[cityField] === null || dense(post[cityField]) && post[cityField].every(v => object(v) && typeof v.name === 'string' && v.name.trim())), 'missing/invalid native ' + cityField);
  if (p.track === 'social' && Object.hasOwn(post, 'workLocationsCode'))
    check(post.workLocationsCode === null || dense(post.workLocationsCode) && post.workLocationsCode.every(v => typeof v === 'string'), 'invalid native workLocationsCode');
  return post; // Numeric id is the official router identity; code may be null and is never an id fallback.
}
function dictionaryEntry(nodes, code) {
  for (const node of nodes) {
    if (node.code === code) return node;
    const child = node.children && dictionaryEntry(node.children, code);
    if (child) return child;
  }
  return null;
}
function recordDictionary(post, dict, site) {
  // Persist only matched native entries per post; the full, source-bound dictionary lives once in verification.
  return { category: dict ? dictionaryEntry(dict.positionCategory, post.positionCategoryCode) : null,
    nature: dict && site.track === 'campus' ? dictionaryEntry(dict.positionNature, post.positionNatureCode) : null,
    workLocations: dict && site.track === 'social' && post.workLocations === null ?
      (post.workLocationsCode ?? []).map(code => dictionaryEntry(dict.workLocation, code)).filter(Boolean) : [] };
}
function boundRecord(job, site) {
  profile(site); check(object(job) && equal(Object.keys(job).sort(), ['dict', 'post']), 'native post/dictionary binding');
  const post = record(job.post, site), dict = job.dict;
  check(object(dict) && equal(Object.keys(dict).sort(), ['category', 'nature', 'workLocations']), 'native matched dictionary binding');
  for (const [field, type, code] of [['category', 'positionCategory', post.positionCategoryCode], ['nature', 'positionNature', post.positionNatureCode]]) {
    const entry = dict[field];
    check(entry === null || object(entry) && entry.type === type && entry.code === code && typeof entry.name === 'string' && entry.name.trim(), 'native matched dictionary ' + field);
  }
  check(site.track === 'campus' || dict.nature === null, 'social nature dictionary unverified');
  check(dense(dict.workLocations) && dict.workLocations.every(entry => object(entry) && entry.type === 'workLocation' &&
    post.workLocationsCode?.includes(entry.code) && typeof entry.name === 'string' && entry.name.trim()) &&
    (!dict.workLocations.length || site.track === 'social' && post.workLocations === null), 'native matched dictionary locations');
  return post;
}
function validateJobs(jobs, site) {
  profile(site); check(dense(jobs) && jobs.length > 0, 'no usable jobs; zero cannot clear existing data');
  const seen = new Set();
  for (const job of jobs) { const post = boundRecord(job, site); check(!seen.has(post.id), 'duplicate official id'); seen.add(post.id); }
  return true;
}
const PAGE_FIELDS = ['total', 'list', 'pageNum', 'pageSize', 'size', 'startRow', 'endRow', 'pages', 'prePage', 'nextPage', 'isFirstPage', 'isLastPage', 'hasPreviousPage', 'hasNextPage', 'navigatePages', 'navigatepageNums', 'navigateFirstPage', 'navigateLastPage'].sort();
function pageData(page, site, index, nativeMode = null) {
  const p = profile(site);
  check(object(page) && equal(Object.keys(page).sort(), ['httpStatus', 'request', 'response']) && requestMatches(page.request, requestFor(site, index, nativeMode), site), 'native request URL/method/headers/body/page binding');
  check(page.httpStatus === 200, 'native HTTP ' + page.httpStatus);
  const d = nativeSuccess(page.response, p);
  check(object(d) && equal(Object.keys(d).sort(), PAGE_FIELDS) && dense(d.list) && d.list.length <= 10 && d.pageNum === index && d.pageSize === 10, 'missing/invalid native list/page');
  for (const field of ['total', 'size', 'startRow', 'endRow', 'pages', 'prePage', 'nextPage', 'navigatePages', 'navigateFirstPage', 'navigateLastPage'])
    check(Number.isSafeInteger(d[field]) && d[field] >= 0, 'missing/invalid native pagination ' + field);
  check(d.size <= 10 && (!(d.total || d.list.length) || d.pages > 0) && (!d.list.length || d.total > 0), 'invalid native positive total/page metadata');
  for (const field of ['isFirstPage', 'isLastPage', 'hasPreviousPage', 'hasNextPage']) check(typeof d[field] === 'boolean', 'invalid native pagination ' + field);
  check(d.navigatepageNums === null || dense(d.navigatepageNums) && d.navigatepageNums.every(v => Number.isSafeInteger(v) && v > 0), 'invalid native navigatepageNums');
  return d;
}
// PageInfo size/nextPage/flags are zero/false even on a successful social first page. Do not trust them as EOF.
function atEnd(d, n) { return d.list.length === 0 || n * 10 >= d.total; }
function availableResult(evidence, site, nativeMode = null) {
  const p = profile(site);
  check(nativeMode === null || nativeMode === NATIVE_MODE && p.track === 'social', 'unverified native UI mode/source');
  check(object(evidence) && equal(Object.keys(evidence).sort(), ['api', 'dictionaryResponses', 'issues', 'key', 'pages', 'policy', 'stopped', 'version', ...(nativeMode ? ['mode'] : [])].sort()) &&
    evidence.version === (nativeMode ? 3 : 2) && (!nativeMode || evidence.mode === nativeMode) &&
    evidence.policy === 'available' && evidence.key === p.key && evidence.api === p.api, 'available evidence source binding');
  check(dense(evidence.pages) && evidence.pages.length > 0 && evidence.pages.length <= MAX_PAGES && dense(evidence.dictionaryResponses) && evidence.dictionaryResponses.length <= 1 &&
    dense(evidence.issues) && evidence.issues.every(v => typeof v === 'string'), 'available evidence limits/issues');
  const dict = evidence.dictionaryResponses.length ? dictionaryData(evidence.dictionaryResponses[0], site) : dictionaryResult(null, site);
  const rows = new Map(), totals = new Set(), issues = new Set(evidence.issues);
  let nextPage = 1, ended = false, duplicates = 0;
  for (const page of evidence.pages) {
    check(!ended && nextPage <= MAX_PAGES, 'extra request after endpoint/safety limit');
    const d = pageData(page, site, nextPage, nativeMode); totals.add(d.total);
    for (const post of d.list) {
      try {
        record(post, site);
        if (rows.has(post.id)) duplicates++;
        else rows.set(post.id, { post, dict: recordDictionary(post, dict, site) }); // First native title/city order/JD wins; no project-label/status filtering.
      } catch (error) { issues.add('列表记录未应用（id=' + (Number.isSafeInteger(post?.id) ? post.id : '未知') + '）：' + error.message); }
    }
    if (d.list.length < 10 && nextPage * 10 < d.total) issues.add((d.list.length ? '短页 ' : '提前空页 ') + nextPage + '，覆盖待补');
    ended = atEnd(d, nextPage); nextPage++;
  }
  if (evidence.stopped !== null) {
    const stopped = evidence.stopped;
    check(!ended && nextPage <= MAX_PAGES && object(stopped) && equal(Object.keys(stopped).sort(), ['error', 'httpStatus', 'request', 'response']) &&
      requestMatches(stopped.request, requestFor(site, nextPage, nativeMode), site) && typeof stopped.error === 'string' && stopped.error.length > 0 &&
      (stopped.httpStatus === null || Number.isSafeInteger(stopped.httpStatus) && stopped.httpStatus >= 100 && stopped.httpStatus <= 599), 'stopped request binding');
    const { error, ...attempt } = stopped;
    let failed = false; try { pageData(attempt, site, nextPage, nativeMode); } catch { failed = true; }
    check(failed, 'successful page cannot be disguised as a stopped request'); issues.add('请求停止：' + error);
  }
  check(rows.size > 0, 'no usable records; zero cannot clear existing data');
  if (duplicates) issues.add('重复官方id ' + duplicates + ' 次，保留首次取得的标题/顺序/正文');
  if (totals.size !== 1 || !totals.has(rows.size)) issues.add('官方total ' + [...totals].join('→') + '；实际唯一岗位 ' + rows.size);
  if (!ended) issues.add('分页未穷尽，覆盖待补');
  if (dict === null) issues.add('未取得同源字典，职能类别及仅编号地点待补');
  if (nativeMode) issues.add(NATIVE_NOTICE);
  issues.add(JD_NOTICE);
  const jobs = [...rows.values()]; validateJobs(jobs, site);
  return { complete: false, total: jobs.length, jobs, verification: evidence, issues: [...issues] };
}
function collectAvailable(pages, site, dictionaryResponses = [], issues = [], stopped = null) {
  const p = profile(site);
  return freeze(availableResult(structuredClone({ version: 2, policy: 'available', key: p.key, api: p.api, pages, dictionaryResponses, issues, stopped }), site));
}
// Explicitly qualified partial UI subset, not a new registered scope or proof of broad/overseas equivalence.
function collectNativeAvailable(pages, site, dictionaryResponses = [], issues = [], stopped = null) {
  const p = profile(site);
  return freeze(availableResult(structuredClone({ version: 3, mode: NATIVE_MODE, policy: 'available', key: p.key, api: p.api, pages, dictionaryResponses, issues, stopped }), site, NATIVE_MODE));
}
function validateEvidence(evidence, jobs, site) {
  const result = availableResult(evidence, site, evidence?.version === 3 ? evidence.mode : null); check(equal(jobs, result.jobs), 'available jobs/native evidence binding'); return result;
}
function normalizeRecord(job, site) {
  const p = profile(site), post = boundRecord(job, site), dict = job.dict;
  const nature = dict.nature?.name;
  const internship = post.positionNatureCode === 'intern' && nature === '实习';
  let city = (post[p.track === 'campus' ? 'workLocationDicts' : 'workLocations'] ?? []).map(v => v.name).join('/');
  // Current social list workLocations is null. Its renderer resolves workLocationsCode against this same public dictionary.
  if (p.track === 'social' && post.workLocations === null) city = dict.workLocations.map(entry => entry.name).join('/');
  return { id: String(post.id), title: post.name, city, category: dict.category?.name ?? '',
    channels: p.track === 'social' ? ['social'] : !internship && post.recruitSubProjectCode === p.body.recruitSubProjectCodes[0] ? ['campus'] : [],
    employment: internship ? 'internship' : post.positionNatureCode === 'fulltime' && nature === '全职' ? 'full-time' : null,
    talentPlan: null, date: null, dateKind: null, sourceStatus: null,
    url: baseFor(p) + (p.track === 'campus' ? '#/campus/job-info/' : '#/official/social/job-info/') + post.id,
    duty: post.description ?? '', requirements: post.positionDemand ?? '', description: '', jdComplete: false };
}
function portalNotice(site) {
  if (!verifiedSource(site)) return '';
  return (site.track === 'campus' ? '仅覆盖官网校园当前字典全部12个子项目（含往届仍在列项目），未按快Star等项目标签、职能或性质删岗；' :
    '采集目标为官网社会招聘默认入口（C001/socialr）；实际已取得范围以原生请求及缺口说明为准，官网自动默认国内分页不证明无城市/海外范围；日常实习为另入口，尚未核验，不冒全社招/实习范围；') +
    JD_NOTICE + '，完整性未验证，不代表公司全球全集或独立法律雇主；实习不推定校园渠道，社会入口性质、人才计划、原状态和可靠日期未知；兼职保留原码，不猜为全职/实习。';
}
async function fetchAvailable(site, options = {}) {
  profile(site);
  if (site.track === 'social' && !options.fetchImpl) {
    // The normal UI supplies the default domestic condition. Bind that partial subset; do not rewrite it as broad.
    const native = await (options.nativeCollect || require('../native-ui').collect)(site, options);
    return collectNativeAvailable(native.pages, site, native.dictionaryResponses, native.issues);
  }
  const { fetchImpl = globalThis.fetch, sleep = ms => new Promise(r => setTimeout(r, ms)), maxPages = MAX_PAGES, now = Date.now } = options;
  check(typeof fetchImpl === 'function' && typeof sleep === 'function' && typeof now === 'function' && Number.isSafeInteger(maxPages) && maxPages > 0 && maxPages <= MAX_PAGES, 'invalid request limits');
  const deadline = now() + PROCESS_MS, pages = [], issues = []; let requested = false, stopped = null;
  async function consume(attempt) {
    if (requested) await sleep(200);
    requested = true; const remaining = deadline - now(); check(remaining > 0, 'process safety deadline');
    const { url, method, headers, body } = attempt.request;
    const r = await fetchImpl(url, { method, headers, ...(body === null ? {} : { body: JSON.stringify(body) }),
      redirect: 'error', signal: AbortSignal.timeout(Math.min(15000, Math.ceil(remaining))) });
    attempt.httpStatus = r?.status ?? null; check(attempt.httpStatus === 200, 'native HTTP ' + attempt.httpStatus);
    attempt.response = await r.json(); // Consume the complete body before any next start or pacing sleep.
  }
  // Normal anonymous public dictionary, then unsigned POST/GET. No bootstrap, session token, signature SDK or UA override.
  const dictionary = { request: dictionaryRequest(site), httpStatus: null, response: null };
  await consume(dictionary); dictionaryData(dictionary, site); // Refusal here stops before any job request.
  for (let n = 1; n <= maxPages; n++) {
    if (now() + 200 >= deadline) { issues.push('达到进程安全时限，覆盖待补'); break; }
    const attempt = { request: requestFor(site, n), httpStatus: null, response: null };
    try {
      await consume(attempt); const d = pageData(attempt, site, n); pages.push(attempt);
      if (atEnd(d, n)) break;
      if (n === maxPages) issues.push('达到分页安全上限，覆盖待补');
    } catch (error) {
      if (!pages.length) throw error;
      stopped = { ...attempt, error: String(error?.message || error || 'request failure') }; break; // Refusal is final; no retries or follow-up calls.
    }
  }
  return collectAvailable(pages, site, [dictionary], issues, stopped);
}
async function run(args, options = {}) {
  check(Array.isArray(args) && args.length === 2 && typeof args[0] === 'string' && typeof args[1] === 'string' && args[1], 'Usage: kuaishou_portal.js <siteJSON> <outputFile>');
  const site = JSON.parse(args[0]), result = await fetchAvailable(site, options);
  const envelope = { key: site.key, api: site.api, mode: 'custom', ...result }, file = args[1], temp = file + '.tmp-' + randomUUID(); let created = false;
  try {
    const fd = fs.openSync(temp, 'wx'); created = true;
    try { fs.writeFileSync(fd, JSON.stringify(envelope, null, 2) + '\n', 'utf8'); } finally { fs.closeSync(fd); }
    fs.renameSync(temp, file);
  } finally { if (created && fs.existsSync(temp)) fs.unlinkSync(temp); }
  return envelope;
}
module.exports = freeze({ PROFILES, requiresVerification, verifiedSource, validateJobs, normalizeRecord, portalNotice, validateEvidence, collectAvailable, collectNativeAvailable, fetchAvailable, run });
if (require.main === module) run(process.argv.slice(2)).catch(error => { console.error(error.message); process.exitCode = 1; });
