'use strict';
const fs = require('node:fs');
const { randomUUID } = require('node:crypto');
const { isDeepStrictEqual: equal } = require('node:util');
const ORIGIN = 'https://talent.antgroup.com', API_ORIGIN = 'https://hrcareersweb.antgroup.com';
const ADAPTER = 'ant-portal-v1', MAX_PAGES = 200, PROCESS_MS = 900000;
const JD_NOTICE = '已收录列表JD，详情正文完整性待核验';
const check = (ok, message) => { if (!ok) throw new Error('Ant: ' + message); };
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
function freeze(value) {
  if (value && typeof value === 'object') { Object.values(value).forEach(freeze); Object.freeze(value); }
  return value;
}
const PROFILES = freeze(['campus', 'social'].map(track => ({
  key: track === 'campus' ? 'ant' : 'ant_social', company: '蚂蚁集团', ats: 'custom', adapter: ADAPTER,
  track, batch: track === 'campus' ? '校园招聘（批次/项目不限）' : '社招', exclude: '(无)', origin: ORIGIN,
  url: ORIGIN + (track === 'campus' ? '/campus-full-list' : '/off-campus'), api: API_ORIGIN + '/api/' + track + '/position/search', listJD: true,
  body: track === 'campus' ? { channel: 'campus_group_official_site', language: 'zh', regions: '', subCategories: '', bgCode: '', pageIndex: 1, pageSize: 10, recruitType: [], batchIds: [] } :
    { key: '', regions: '', categories: '', subCategories: '', bgCode: '', socialQrCode: '', pageIndex: 1, pageSize: 10, channel: 'group_official_site', language: 'zh' }
})));
function requiresVerification(site) {
  if (PROFILES.some(p => p.key === site?.key) || site?.adapter === ADAPTER) return true;
  return ['origin', 'apiOrigin', 'api', 'url', 'detailApi'].some(k => {
    if (!site || !Object.hasOwn(site, k)) return false;
    try { check(typeof site[k] === 'string', 'invalid URI'); return ['talent.antgroup.com', 'hrcareersweb.antgroup.com'].includes(new URL(site[k].replace(/^(GET|POST)\s+/, '')).hostname.toLowerCase().replace(/\.$/, '')); }
    catch { return true; } // Malformed declarations must not downgrade to a generic adapter.
  });
}
function verifiedSource(site) { return PROFILES.some(p => equal(site, p)); }
function profile(site) { check(verifiedSource(site), 'unverified source identity/scope/mode'); return PROFILES.find(p => p.key === site.key); }
function requestFor(site, pageIndex) {
  const p = profile(site); check(Number.isSafeInteger(pageIndex) && pageIndex > 0 && pageIndex <= MAX_PAGES, 'unverified page');
  return { url: p.api, method: 'POST', headers: { 'Content-Type': 'application/json;charset=UTF-8', Accept: 'application/json', Origin: ORIGIN, Referer: ORIGIN + '/' },
    body: { ...p.body, pageIndex } };
}
function record(post) {
  check(object(post) && Object.hasOwn(post, 'id') && Number.isSafeInteger(post.id) && post.id > 0, 'invalid native id');
  check(Object.hasOwn(post, 'name') && typeof post.name === 'string' && post.name.trim(), 'invalid native title');
  check(Object.hasOwn(post, 'positionUrl') && post.positionUrl === '', 'unverified native positionUrl');
  for (const field of ['description', 'requirement'])
    check(Object.hasOwn(post, field) && (post[field] === null || typeof post[field] === 'string'), 'missing/invalid native ' + field);
  for (const field of ['workLocations', 'categories'])
    check(Object.hasOwn(post, field) && (post[field] === null || Array.isArray(post[field]) &&
      [...post[field].keys()].every(i => Object.hasOwn(post[field], i) && typeof post[field][i] === 'string')), 'missing/invalid native ' + field);
  for (const field of ['categoryName', 'batchType', 'batchTypeDesc', 'teamDescription'])
    if (Object.hasOwn(post, field)) check(post[field] === null || typeof post[field] === 'string', 'invalid native ' + field);
  // The first-party detail formatter renders a truthy showTeamDescription before the two TEXT sections.
  // Until that independent body is mapped, skip only this record, never silently discard visible JD.
  check(!(post.showTeamDescription && post.teamDescription?.trim()), 'visible teamDescription requires body verification');
  return post;
}
function boundRecord(job, site) {
  profile(site); check(object(job) && equal(Object.keys(job), ['post']), 'native post binding'); return record(job.post);
}
function validateJobs(jobs, site) {
  profile(site); check(Array.isArray(jobs) && jobs.length > 0, 'no usable jobs; zero cannot clear existing data');
  const seen = new Set();
  for (const job of jobs) { const post = boundRecord(job, site); check(!seen.has(post.id), 'duplicate official id'); seen.add(post.id); }
  return true;
}
function pageData(page, site, index) {
  check(object(page) && equal(Object.keys(page).sort(), ['httpStatus', 'request', 'response']) && equal(page.request, requestFor(site, index)), 'native request URL/method/headers/body/page binding');
  check(page.httpStatus === 200, 'native HTTP ' + page.httpStatus);
  const j = page.response;
  check(object(j) && equal(Object.keys(j).sort(), ['content', 'currentPage', 'errorCode', 'errorMsg', 'pageSize', 'success', 'totalCount', 'traceId']) &&
    j.success === true && (j.errorCode === null && j.errorMsg === null || j.errorCode === 'success' && j.errorMsg === '成功'), 'native business refusal/unknown response');
  check(Array.isArray(j.content) && j.content.length <= 10 && [...j.content.keys()].every(i => Object.hasOwn(j.content, i)) &&
    j.currentPage === index && j.pageSize === 10 && typeof j.traceId === 'string', 'missing/invalid native list/page');
  check(Number.isSafeInteger(j.totalCount) && j.totalCount >= 0, 'missing/invalid native total');
  return j;
}
function atEnd(j, index) { return j.content.length === 0 || index * 10 >= j.totalCount; }
function availableResult(evidence, site) {
  const p = profile(site);
  check(object(evidence) && equal(Object.keys(evidence).sort(), ['api', 'issues', 'key', 'pages', 'policy', 'stopped', 'version']) &&
    evidence.version === 2 && evidence.policy === 'available' && evidence.key === p.key && evidence.api === p.api, 'available evidence source binding');
  check(Array.isArray(evidence.pages) && evidence.pages.length > 0 && evidence.pages.length <= MAX_PAGES &&
    Array.isArray(evidence.issues) && evidence.issues.every(v => typeof v === 'string'), 'available evidence limits/issues');
  const rows = new Map(), totals = new Set(), issues = new Set(evidence.issues);
  let nextPage = 1, ended = false, duplicates = 0;
  for (const page of evidence.pages) {
    check(!ended && nextPage <= MAX_PAGES, 'extra request after endpoint/safety limit');
    const j = pageData(page, site, nextPage); totals.add(j.totalCount);
    for (const post of j.content) {
      try {
        record(post);
        if (rows.has(post.id)) duplicates++;
        else rows.set(post.id, { post }); // First official order/metadata/JD wins; later blanks cannot erase it.
      } catch (error) { issues.add('列表记录未应用（id=' + (Number.isSafeInteger(post?.id) ? post.id : '未知') + '）：' + error.message); }
    }
    ended = atEnd(j, nextPage); nextPage++;
  }
  if (evidence.stopped !== null) {
    const stopped = evidence.stopped;
    check(!ended && nextPage <= MAX_PAGES && object(stopped) && equal(Object.keys(stopped).sort(), ['error', 'httpStatus', 'request', 'response']) &&
      equal(stopped.request, requestFor(site, nextPage)) && typeof stopped.error === 'string' && stopped.error.length > 0, 'stopped request binding');
    const { error, ...attempt } = stopped;
    let failed = false; try { pageData(attempt, site, nextPage); } catch { failed = true; }
    check(failed, 'successful page cannot be disguised as a stopped request'); issues.add('请求停止：' + error);
  }
  check(rows.size > 0, 'no usable records; zero cannot clear existing data');
  if (duplicates) issues.add('重复官方id ' + duplicates + ' 次，保留首次取得的顺序/正文');
  if (totals.size !== 1 || !totals.has(rows.size)) issues.add('官方total ' + [...totals].join('→') + '；实际唯一岗位 ' + rows.size);
  if (!ended) issues.add('分页未穷尽，覆盖待补');
  issues.add(JD_NOTICE);
  const jobs = [...rows.values()]; validateJobs(jobs, site);
  return { complete: false, total: jobs.length, jobs, verification: evidence, issues: [...issues] };
}
function collectAvailable(pages, site, issues = [], stopped = null) {
  profile(site);
  return freeze(availableResult(structuredClone({ version: 2, policy: 'available', key: site.key, api: site.api, pages, issues, stopped }), site));
}
function validateEvidence(evidence, jobs, site) {
  const result = availableResult(evidence, site); check(equal(jobs, result.jobs), 'available jobs/native evidence binding'); return result;
}
function normalizeRecord(job, site) {
  const p = profile(site), post = boundRecord(job, site), internship = post.batchTypeDesc === '实习生';
  return { id: String(post.id), title: post.name, city: (post.workLocations ?? []).join('/'),
    category: p.track === 'campus' ? post.categoryName ?? '' : (post.categories ?? []).join('/'),
    channels: internship ? [] : p.track === 'social' ? ['social'] : post.batchTypeDesc === '应届生' ? ['campus'] : [], employment: internship ? 'internship' : null,
    talentPlan: null, date: null, dateKind: null, sourceStatus: null,
    url: ORIGIN + (p.track === 'campus' ? '/campus-position' : '/off-campus-position') + '?positionId=' + post.id,
    duty: post.description ?? '', requirements: post.requirement ?? '', description: '', jdComplete: false };
}
function portalNotice(site) {
  if (!verifiedSource(site)) return '';
  return (site.track === 'campus' ? '仅覆盖官网默认校园广列表，批次/项目不限（含蚂蚁星/Plan A及实习）；' : '仅覆盖官网默认无筛选社招列表；') +
    JD_NOTICE + '，完整性未验证，不代表公司全球全集或独立法律雇主；实习不推定校园渠道，其它性质、人才计划、原状态和可靠日期未知，未核验的可见团队正文逐条跳过并记录。';
}
async function fetchAvailable(site, options = {}) {
  const p = profile(site);
  const { fetchImpl = globalThis.fetch, sleep = ms => new Promise(r => setTimeout(r, ms)), maxPages = MAX_PAGES, now = Date.now } = options;
  check(typeof fetchImpl === 'function' && typeof sleep === 'function' && typeof now === 'function' && Number.isSafeInteger(maxPages) && maxPages > 0 && maxPages <= MAX_PAGES, 'invalid request limits');
  const deadline = now() + PROCESS_MS, pages = [], issues = []; let requested = false, stopped = null;
  async function request(url, method, headers, body) {
    if (requested) await sleep(200);
    requested = true; const remaining = deadline - now(); check(remaining > 0, 'process safety deadline');
    return fetchImpl(url, { method, headers, ...(body ? { body: JSON.stringify(body) } : {}),
      redirect: 'error', signal: AbortSignal.timeout(Math.min(15000, Math.ceil(remaining))) });
  }
  // Fresh unsigned Node requests need no cookie, ctoken, CSRF or signature SDK. Consume the normal page before POST.
  const bootstrap = await request(p.url, 'GET', {});
  check(bootstrap?.status === 200, 'bootstrap HTTP ' + bootstrap?.status); await bootstrap.text();
  for (let n = 1; n <= maxPages; n++) {
    if (now() + 200 >= deadline) { issues.push('达到进程安全时限，覆盖待补'); break; }
    const attempt = { request: requestFor(site, n), httpStatus: null, response: null };
    try {
      const r = await request(p.api, 'POST', attempt.request.headers, attempt.request.body);
      attempt.httpStatus = r?.status ?? null; check(attempt.httpStatus === 200, 'native HTTP ' + attempt.httpStatus);
      attempt.response = await r.json(); const j = pageData(attempt, site, n); pages.push(attempt);
      if (atEnd(j, n)) break;
      if (n === maxPages) issues.push('达到分页安全上限，覆盖待补');
    } catch (error) {
      if (!pages.length) throw error;
      stopped = { ...attempt, error: String(error?.message || error || 'request failure') }; break; // No requests or retries after refusal.
    }
  }
  return collectAvailable(pages, site, issues, stopped);
}
async function run(args, options = {}) {
  check(Array.isArray(args) && args.length === 2 && typeof args[0] === 'string' && typeof args[1] === 'string' && args[1], 'Usage: ant_portal.js <siteJSON> <outputFile>');
  const site = JSON.parse(args[0]), result = await fetchAvailable(site, options);
  const envelope = { key: site.key, api: site.api, mode: 'custom', ...result }, file = args[1], temp = file + '.tmp-' + randomUUID(); let created = false;
  try {
    const fd = fs.openSync(temp, 'wx'); created = true;
    try { fs.writeFileSync(fd, JSON.stringify(envelope, null, 2) + '\n', 'utf8'); } finally { fs.closeSync(fd); }
    fs.renameSync(temp, file);
  } finally { if (created && fs.existsSync(temp)) fs.unlinkSync(temp); }
  return envelope;
}
module.exports = { PROFILES, requiresVerification, verifiedSource, validateJobs, normalizeRecord, portalNotice, validateEvidence, collectAvailable, fetchAvailable, run };
if (require.main === module) run(process.argv.slice(2)).catch(error => { console.error(error.message); process.exitCode = 1; });
