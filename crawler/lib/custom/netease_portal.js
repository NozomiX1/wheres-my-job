'use strict';
const fs = require('node:fs');
const { randomUUID } = require('node:crypto');
const { isDeepStrictEqual: equal } = require('node:util');
const { htmlText } = require('../jd-text');
const ORIGIN = 'https://hr.163.com', CAMPUS = 'https://campus.game.163.com', ADAPTER = 'netease-portal-v1', MAX_PAGES = 200, PROCESS_MS = 900000;
const JD_NOTICE = '已收录列表JD，详情正文完整性待核验';
const check = (ok, message) => { if (!ok) throw new Error('NetEase: ' + message); };
const object = v => v !== null && typeof v === 'object' && !Array.isArray(v);
const keys = (v, expected) => object(v) && equal(Object.keys(v).sort(), [...expected].sort());
const dense = v => Array.isArray(v) && [...v.keys()].every(i => Object.hasOwn(v, i));
const count = v => Number.isSafeInteger(v) && v >= 0;
const campus = site => site.key === 'netease_huyu';
const projectsFor = site => campus(site) ? site.body.projectIdList : [null];
const pageCap = site => campus(site) ? 100 : MAX_PAGES;
function freeze(v) { if (v && typeof v === 'object') { Object.values(v).forEach(freeze); Object.freeze(v); } return v; }
// Independently observed scopes. Huyu's three projects come from current status=1 navigation, not legacy 102/default 104.
const PROFILES = freeze([
  { key: 'netease_social', company: '网易', ats: 'custom', adapter: ADAPTER, track: 'social', batch: '社招', exclude: '(无)',
    origin: ORIGIN, url: ORIGIN + '/job-list.html', api: ORIGIN + '/api/hr163/position/queryPage', listJD: true, body: { currentPage: 1, pageSize: 100 } },
  { key: 'netease_huyu', company: '网易互娱', ats: 'custom', adapter: ADAPTER, track: 'campus', batch: '官网当前应届＋精英实习三项目（102/75/104）', exclude: '(无)',
    origin: CAMPUS, url: CAMPUS + '/', api: CAMPUS + '/api/campuspc/position/getJobList', listJD: true, body: { pageSize: 100, currentPage: 1, projectIdList: [102, 75, 104] } }
]);
function requiresVerification(site) {
  // This adapter does not grant Leihuo qualification; the separately guarded portal owns that mode.
  if (site?.adapter === 'leihuo-portal-v1') return false;
  if (['netease_social', 'netease_huyu', 'netease_leihuo'].includes(site?.key) || site?.adapter === ADAPTER) return true;
  return ['origin', 'apiOrigin', 'api', 'url', 'detailApi'].some(k => {
    if (!site || !Object.hasOwn(site, k)) return false;
    try {
      check(typeof site[k] === 'string', 'invalid URI');
      return ['hr.163.com', 'campus.game.163.com', 'xiaozhao.leihuo.netease.com'].includes(new URL(site[k].replace(/^(GET|POST)\s+/, '')).hostname.toLowerCase().replace(/\.$/, ''));
    } catch { return true; }
  });
}
function verifiedSource(site) { return PROFILES.some(p => equal(site, p)); }
function profile(site) { check(verifiedSource(site), 'unverified source identity/scope/mode'); return PROFILES.find(p => p.key === site.key); }
function requestFor(site, currentPage, projectId = null, timeStamp = Date.now()) {
  const p = profile(site); check(Number.isSafeInteger(currentPage) && currentPage > 0 && currentPage <= pageCap(p), 'unverified page');
  if (campus(p)) {
    check(p.body.projectIdList.includes(projectId) && count(timeStamp), 'unverified project/timestamp');
    return { url: p.api + '?pageSize=' + p.body.pageSize + '&currentPage=' + currentPage + '&projectId=' + projectId + '&timeStamp=' + timeStamp, method: 'GET',
      headers: { Accept: 'application/json, text/plain, */*', Referer: p.origin + '/app/job/position?id=' + projectId }, body: null };
  }
  check(projectId === null, 'unverified social project');
  return { url: p.api, method: 'POST', headers: { 'Content-Type': 'application/json;charset=UTF-8', Accept: 'application/json, text/plain, */*', Origin: p.origin, Referer: p.url },
    body: { ...p.body, currentPage } };
}
function record(post, site, projectId = null) {
  check(object(post) && Object.hasOwn(post, 'id') && Number.isSafeInteger(post.id) && post.id > 0, 'invalid native id');
  const name = campus(site) ? 'positionName' : 'name';
  check(Object.hasOwn(post, name) && typeof post[name] === 'string' && post[name].trim(), 'invalid native title');
  const fields = campus(site) ? ['positionDescription', 'positionRequirement', 'positionTypeName', 'workPlaceName'] : ['description', 'requirement', 'firstPostTypeName'];
  for (const field of fields) check(Object.hasOwn(post, field) && (post[field] === null || typeof post[field] === 'string'), 'missing/invalid native ' + field);
  if (campus(site)) {
    check(Object.hasOwn(post, 'projectId') && site.body.projectIdList.includes(post.projectId) && (projectId === null || post.projectId === projectId), 'native project identity/request binding');
  } else {
    check(Object.hasOwn(post, 'workPlaceNameList') && (post.workPlaceNameList === null || dense(post.workPlaceNameList) && post.workPlaceNameList.every(v => typeof v === 'string')), 'missing/invalid native locations');
  }
  return post;
}
function boundRecord(job, site) { profile(site); check(keys(job, ['post']), 'native post binding'); return record(job.post, site); }
function validateJobs(jobs, site) {
  profile(site); check(dense(jobs) && jobs.length > 0, 'no usable jobs; zero cannot clear existing data');
  const seen = new Set();
  for (const job of jobs) { const post = boundRecord(job, site); check(!seen.has(post.id), 'duplicate official id'); seen.add(post.id); }
  return true;
}
function pageData(page, site, index, projectId = null) {
  const p = profile(site); let timeStamp = 0;
  check(keys(page, ['request', 'httpStatus', 'response']), 'native page binding');
  if (campus(p)) {
    check(object(page.request) && typeof page.request.url === 'string', 'native request URL');
    const value = new URL(page.request.url).searchParams.get('timeStamp');
    check(typeof value === 'string' && /^(?:0|[1-9]\d*)$/.test(value) && count(Number(value)), 'native timestamp binding'); timeStamp = Number(value);
  }
  check(equal(page.request, requestFor(site, index, projectId, timeStamp)), 'native request URL/method/headers/body/page binding');
  check(page.httpStatus === 200, 'native HTTP ' + page.httpStatus);
  const j = page.response, expected = campus(p) ? ['code', 'msg', 'data', 'rel', 'subCode', 'traceId'] : ['code', 'msg', 'data', 'subCode', 'traceId'];
  check(keys(j, expected) && j.code === 200 && j.msg === null && j.subCode === null && typeof j.traceId === 'string' && (!campus(p) || j.rel === true), 'native business refusal/unknown response');
  const d = j.data;
  check(keys(d, ['pages', 'total', 'list', 'lastPage']) && count(d.pages) && count(d.total) && typeof d.lastPage === 'boolean' &&
    dense(d.list) && d.list.length <= p.body.pageSize && (d.pages > 0 || d.list.length === 0 && d.total === 0), 'missing/invalid native list/total/pages');
  return d;
}
function atEnd(d, index) { return d.lastPage || index >= d.pages; }
function availableResult(evidence, site) {
  const p = profile(site), projects = projectsFor(p);
  check(keys(evidence, ['version', 'policy', 'key', 'api', 'pages', 'issues', 'stopped']) && evidence.version === 1 && evidence.policy === 'available' && evidence.key === p.key && evidence.api === p.api, 'available evidence source binding');
  check(dense(evidence.pages) && evidence.pages.length > 0 && evidence.pages.length <= MAX_PAGES && dense(evidence.issues) && evidence.issues.every(v => typeof v === 'string'), 'available evidence limits/issues');
  const rows = new Map(), totals = new Map(), projectIds = new Map(), issues = new Set(evidence.issues);
  let nextPage = 1, projectIndex = 0, duplicates = 0;
  for (const page of evidence.pages) {
    check(projectIndex < projects.length && nextPage <= pageCap(p), 'extra request after native ending/project safety limit');
    const projectId = projects[projectIndex], d = pageData(page, site, nextPage, projectId);
    if (!totals.has(projectId)) { totals.set(projectId, new Set()); projectIds.set(projectId, new Set()); }
    totals.get(projectId).add(d.total);
    for (const post of d.list) {
      try {
        record(post, p, projectId); projectIds.get(projectId).add(post.id);
        if (rows.has(post.id)) {
          duplicates++;
          if (campus(p) && rows.get(post.id).post.projectId !== post.projectId)
            issues.add('跨项目同官方id ' + post.id + '（' + rows.get(post.id).post.projectId + '→' + post.projectId + '），关系/字段差异待核验；保留首次，未生成复合ID');
        } else rows.set(post.id, { post });
      } catch (error) { issues.add('列表记录未应用（id=' + (Number.isSafeInteger(post?.id) ? post.id : '未知') + '）：' + error.message); }
    }
    const ended = atEnd(d, nextPage);
    if (!ended && d.list.length < p.body.pageSize) issues.add('第' + nextPage + '页提前短/空，按原生页数继续，覆盖待核验');
    if (ended) { projectIndex++; nextPage = 1; } else nextPage++;
  }
  const ended = projectIndex === projects.length;
  if (evidence.stopped !== null) {
    const stopped = evidence.stopped, projectId = projects[projectIndex];
    check(!ended && nextPage <= pageCap(p) && evidence.pages.length < MAX_PAGES && keys(stopped, ['error', 'request', 'httpStatus', 'response']) && typeof stopped.error === 'string' && stopped.error.length > 0, 'stopped request binding');
    const { error, ...attempt } = stopped;
    // Check request separately: malformed scope must not be excused as an ordinary transport refusal.
    const timeStamp = campus(p) ? Number(new URL(stopped.request?.url).searchParams.get('timeStamp')) : 0;
    check(equal(stopped.request, requestFor(site, nextPage, projectId, timeStamp)), 'stopped request binding');
    let failed = false; try { pageData(attempt, site, nextPage, projectId); } catch { failed = true; }
    check(failed, 'successful page cannot be disguised as a stopped request'); issues.add('请求停止：' + error);
  }
  check(rows.size > 0, 'no usable records; zero cannot clear existing data');
  if (duplicates) issues.add('重复官方id ' + duplicates + ' 次，保留首次取得的顺序/正文');
  for (const [projectId, values] of totals) {
    const n = projectIds.get(projectId).size;
    if (values.size !== 1 || !values.has(n)) issues.add((projectId === null ? '' : 'projectId=' + projectId + '：') + '官方total ' + [...values].join('→') + '；实际唯一岗位 ' + n);
  }
  if (!ended) issues.add('分页未穷尽，覆盖待补' + (campus(p) ? '（未完成项目 ' + projects.slice(projectIndex).join('/') + '）' : ''));
  if (!ended && (evidence.pages.length === MAX_PAGES || nextPage > pageCap(p))) issues.add('达到分页安全上限，覆盖待补');
  issues.add(JD_NOTICE);
  const jobs = [...rows.values()]; validateJobs(jobs, site);
  return { complete: false, total: jobs.length, jobs, verification: evidence, issues: [...issues] };
}
function collectAvailable(pages, site, issues = [], stopped = null) {
  profile(site); return freeze(availableResult(structuredClone({ version: 1, policy: 'available', key: site.key, api: site.api, pages, issues, stopped }), site));
}
// Check credential field values recursively; never redact substrings of native JD text or rewrite wire material.
const CREDENTIAL = /^(?:jobsecret|cookie|setcookie|authorization|accesstoken|refreshtoken|token|csrftoken|xcsrftoken|xsrftoken|xxsrftoken|signature|password|sessiontoken|sessionid)$/;
function sanitized(v) {
  if (Array.isArray(v)) return v.every(sanitized);
  return !object(v) || Object.entries(v).every(([key, value]) => CREDENTIAL.test(key.toLowerCase().replace(/[^a-z0-9]/g, '')) ? value === '[REDACTED]' : sanitized(value));
}
function retainedResult(evidence, site) {
  const p = profile(site); check(!campus(p), 'retained evidence source binding');
  check(keys(evidence, ['version', 'policy', 'key', 'api', 'base', 'prior', 'priorCompletedAt']) && evidence.version === 2 && evidence.policy === 'available' && evidence.key === p.key && evidence.api === p.api, 'retained evidence source binding');
  check(sanitized(evidence), 'unsafe credential sanitization');
  const clock = evidence.priorCompletedAt;
  check(typeof clock === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(clock) && Number.isFinite(Date.parse(clock)) && new Date(clock).toISOString() === clock, 'invalid prior completion time');
  const base = availableResult(evidence.base, p), prior = availableResult(evidence.prior, p);
  // An observed native ID is not absent even if its new record failed the individual field guard.
  const observed = new Set(evidence.base.pages.flatMap(page => page.response.data.list.map(post => post?.id)));
  const retained = prior.jobs.filter(job => !observed.has(job.post.id)), jobs = [...base.jobs, ...retained]; validateJobs(jobs, p);
  const issues = [...base.issues, ...prior.issues.map(issue => '旧资料：' + issue),
    '复用同范围旧资料（' + evidence.priorCompletedAt + '）保留本轮未观察岗位 ' + retained.length + '；未重新采集，不据此证明当前在招或全集'];
  return { complete: false, total: jobs.length, jobs, verification: evidence, issues: [...new Set(issues)] };
}
function collectRetained(baseVerification, priorVerification, site, priorCompletedAt) {
  const p = profile(site);
  return freeze(retainedResult(structuredClone({ version: 2, policy: 'available', key: p.key, api: p.api, base: baseVerification, prior: priorVerification, priorCompletedAt }), p));
}
function validateEvidence(evidence, jobs, site) { const result = evidence?.version === 2 ? retainedResult(evidence, site) : availableResult(evidence, site); check(equal(jobs, result.jobs), 'available jobs/native evidence binding'); return result; }
function normalizeRecord(job, site) {
  const p = profile(site), post = boundRecord(job, site);
  if (campus(p)) {
    // Current official MF-25 uses React children for both sections: preserve literal markup/entities/whitespace.
    // Current status=1 nav proves 102 under 应届生; 75/104 under 精英实习生. These are independent dimensions.
    return { id: String(post.id), title: post.positionName, category: post.positionTypeName ?? '', city: post.workPlaceName ?? '',
      channels: post.projectId === 102 ? ['campus'] : [], employment: post.projectId === 102 ? null : 'internship', talentPlan: null, date: null, dateKind: null, sourceStatus: null,
      url: p.origin + '/app/detail/index?id=' + post.id + '&projectId=' + post.projectId, duty: post.positionDescription ?? '', requirements: post.positionRequirement ?? '', description: '', jdComplete: false };
  }
  // Social card passes each independent field to its first-party HTML parser (fhwx), not React TEXT.
  // Current social commons.c65656b8 (25330/1336134), 34.e3c060e4 (59036): strict string workType 0/1/2 = 全职/实习/派遣.
  // Dispatch has no canonical employment value; workType never proves a campus channel or talent plan.
  // 34.e3c060e4 (59420/2506/37810): observed numeric flag 1 -> isGeek -> img alt 极客计划; absent/0 is not no-plan proof.
  return { id: String(post.id), title: post.name, category: post.firstPostTypeName ?? '', city: (post.workPlaceNameList ?? []).join('/'),
    channels: ['social'], employment: post.workType === '0' ? 'full-time' : post.workType === '1' ? 'internship' : null,
    talentPlan: post.geekPassionateTalentFlag === 1 ? true : null, date: null, dateKind: null, sourceStatus: null,
    url: p.origin + '/job-detail.html?id=' + post.id, duty: htmlText(post.description), requirements: htmlText(post.requirement), description: '', jdComplete: false };
}
function portalNotice(site) {
  if (!verifiedSource(site)) return '';
  if (campus(site)) return '仅覆盖官网当前导航三项目：102应届生、75蛋仔派对AI实习专项、104实习生项目，不把无id默认104冒应届全量；' + JD_NOTICE +
    '，完整性未验证，不代表公司全球全集；实习不推定校园渠道，102性质及全部人才计划、原状态、可靠日期未知，跨项目同官方id保首次并标待核，不继承社招/雷火资格。';
  return '仅覆盖官网默认无筛选社招列表；' + JD_NOTICE + '，完整性未验证，不代表公司全球全集或独立法律雇主；按官网workType枚举标全职/实习，派遣及其它/缺失码在本站性质未知；官网极客计划真徽标标为人才计划，其余计划未知（不以徽标缺失判非计划）；实习不推定校园渠道，原状态和可靠日期未知。';
}
async function fetchAvailable(site, options = {}) {
  const p = profile(site), projects = projectsFor(p);
  const { fetchImpl = globalThis.fetch, sleep = ms => new Promise(r => setTimeout(r, ms)), maxPages = MAX_PAGES, now = Date.now } = options;
  check(typeof fetchImpl === 'function' && typeof sleep === 'function' && typeof now === 'function' && Number.isSafeInteger(maxPages) && maxPages > 0 && maxPages <= MAX_PAGES, 'invalid request limits');
  const deadline = now() + PROCESS_MS, pages = [], issues = []; let stopped = null, lastStart = null, projectIndex = 0, n = 1;
  // Only normal anonymous protocols; no bootstrap, cookies, fabricated signatures, browser UA or retry.
  for (let requested = 0; requested < maxPages && projectIndex < projects.length; requested++) {
    if (n > pageCap(p)) { issues.push('达到分页安全上限，覆盖待补'); break; }
    const wait = lastStart === null ? 0 : Math.max(0, 200 - (now() - lastStart));
    if (now() + wait >= deadline) { issues.push('达到进程安全时限，覆盖待补'); break; }
    while (lastStart !== null && now() - lastStart < 200) await sleep(200 - (now() - lastStart));
    const remaining = deadline - now(); if (remaining <= 0) { issues.push('达到进程安全时限，覆盖待补'); break; }
    lastStart = now(); const projectId = projects[projectIndex], attempt = { request: requestFor(site, n, projectId, lastStart), httpStatus: null, response: null };
    try {
      const r = await fetchImpl(attempt.request.url, { method: attempt.request.method, headers: attempt.request.headers,
        ...(attempt.request.body === null ? {} : { body: JSON.stringify(attempt.request.body) }), redirect: 'error', signal: AbortSignal.timeout(Math.min(15000, Math.ceil(remaining))) });
      attempt.httpStatus = r?.status ?? null;
      if (attempt.httpStatus !== 200) {
        if (typeof r?.json === 'function') { try { attempt.response = await r.json(); } catch { /* Non-JSON refusal is not native success. */ } }
        check(false, 'native HTTP ' + attempt.httpStatus);
      }
      attempt.response = await r.json(); const d = pageData(attempt, site, n, projectId); pages.push(attempt);
      if (atEnd(d, n)) { projectIndex++; n = 1; } else n++;
      if (requested + 1 === maxPages && projectIndex < projects.length) issues.push('达到分页安全上限，覆盖待补');
    } catch (error) {
      if (!pages.length) throw error;
      stopped = { ...attempt, error: String(error?.message || error || 'request failure') }; break;
    }
  }
  return collectAvailable(pages, site, issues, stopped);
}
async function run(args, options = {}) {
  check(Array.isArray(args) && args.length === 2 && typeof args[0] === 'string' && typeof args[1] === 'string' && args[1], 'Usage: netease_portal.js <siteJSON> <outputFile>');
  const site = JSON.parse(args[0]), result = await fetchAvailable(site, options);
  const envelope = { key: site.key, api: site.api, mode: 'custom', ...result }, file = args[1], temp = file + '.tmp-' + randomUUID(); let created = false;
  try {
    const fd = fs.openSync(temp, 'wx'); created = true;
    try { fs.writeFileSync(fd, JSON.stringify(envelope, null, 2) + '\n', 'utf8'); } finally { fs.closeSync(fd); }
    fs.renameSync(temp, file);
  } finally { if (created && fs.existsSync(temp)) fs.unlinkSync(temp); }
  return envelope;
}
module.exports = { PROFILES, requiresVerification, verifiedSource, requestFor, pageData, atEnd, validateJobs, normalizeRecord, portalNotice, collectAvailable, collectRetained, validateEvidence, fetchAvailable, run };
if (require.main === module) run(process.argv.slice(2)).catch(error => { console.error(error.message); process.exitCode = 1; });
