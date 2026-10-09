'use strict';
const fs = require('node:fs');
const { randomUUID } = require('node:crypto');
const { isDeepStrictEqual: equal } = require('node:util');
const { htmlText } = require('../jd-text');
const ORIGIN = 'https://leihuo.163.com', ADAPTER = 'leihuo-portal-v1', MAX_PAGES = 200, PROCESS_MS = 900000;
const JD_NOTICE = '已收录列表JD，详情正文完整性待核验';
const check = (ok, message) => { if (!ok) throw new Error('Leihuo: ' + message); };
const object = v => v !== null && typeof v === 'object' && !Array.isArray(v);
const keys = (v, expected) => object(v) && equal(Object.keys(v).sort(), [...expected].sort());
const dense = v => Array.isArray(v) && [...v.keys()].every(i => Object.hasOwn(v, i));
const count = v => Number.isSafeInteger(v) && v >= 0;
const stringId = v => typeof v === 'string' && /^[1-9]\d*$/.test(v);
function freeze(v) { if (v && typeof v === 'object') { Object.values(v).forEach(freeze); Object.freeze(v); } return v; }
// Keep the exact two-menu profile for historical evidence replay; do not lend it new route qualification.
const LEGACY = { key: 'netease_leihuo', company: '网易雷火', ats: 'custom', adapter: ADAPTER, track: 'campus',
  origin: ORIGIN, url: ORIGIN + '/campus/#/', batch: '官网当前27届应届与日常实习热招入口', exclude: '(无)', listJD: true,
  api: 'https://xiaozhao.leihuo.netease.com/api/apply/job/list/show', dailyApi: 'https://xiaozhao.leihuo.netease.com/api/new/v3/normal_intern/job/list',
  query: { full: { job_name: '', page_size: 10, page_number: 1, project_id: 77 }, daily: { currentPage: 1, pageSize: 12, parentProduct: 'P4', workType: 1 } } };
// Current public router, native requests and shared Position renderer independently observed, not NetEase inheritance.
const PROFILES = freeze([LEGACY, { ...LEGACY, batch: '官网公开应届、日常实习、研究实习与暑期精英实习四入口',
  query: { ...LEGACY.query, research: { job_name: '', page_size: 10, page_number: 1, project_id: 68 },
    intern: { job_name: '', page_size: 10, page_number: 1, project_id: 73 } } }]);
function requiresVerification(site) {
  if (site?.key === 'netease_leihuo' || site?.adapter === ADAPTER) return true;
  return ['origin', 'apiOrigin', 'api', 'dailyApi', 'url', 'detailApi'].some(k => {
    if (!site || !Object.hasOwn(site, k)) return false;
    try { check(typeof site[k] === 'string', 'invalid URI'); return ['leihuo.163.com', 'xiaozhao.leihuo.netease.com'].includes(new URL(site[k].replace(/^(GET|POST)\s+/, '')).hostname.toLowerCase().replace(/\.$/, '')); }
    catch { return true; }
  });
}
function verifiedSource(site) { return PROFILES.some(p => equal(site, p)); }
function profile(site) { const p = PROFILES.find(p => equal(site, p)); check(p, 'unverified source identity/scope/mode'); return p; }
function requestFor(site, kind, page) {
  const p = profile(site); check(typeof kind === 'string' && Object.hasOwn(p.query, kind) && Number.isSafeInteger(page) && page > 0 && page <= MAX_PAGES, 'unverified kind/page');
  const daily = kind === 'daily', query = { ...p.query[kind], [daily ? 'currentPage' : 'page_number']: page };
  return { url: (daily ? p.dailyApi : p.api) + '?' + new URLSearchParams(query), method: 'GET',
    headers: { Accept: '*/*', Referer: p.origin + '/campus/', Origin: p.origin }, body: null };
}
function record(post, kind, site) {
  const p = profile(site); check(object(post) && typeof kind === 'string' && Object.hasOwn(p.query, kind), 'invalid native kind/post');
  const project = kind !== 'daily', id = project ? post.ehr_job_id : post.id;
  check(project ? stringId(id) : Number.isSafeInteger(id) && id > 0, 'invalid native id');
  const title = project ? 'job_name' : 'positionName';
  check(Object.hasOwn(post, title) && typeof post[title] === 'string' && post[title].trim(), 'invalid native title');
  const fields = project ? ['job_description', 'job_requirement', 'category_name', 'work_place_name', 'type_name'] : ['description', 'requirement', 'postTypeNames', 'workCityName', 'workTypeName'];
  for (const field of fields) check(Object.hasOwn(post, field) && (post[field] === null || typeof post[field] === 'string'), 'missing/invalid native ' + field);
  if (project) {
    const projectId = String(p.query[kind].project_id);
    check(post.ehr_project_id === projectId, 'native project identity guard');
    check(post.job_detail_url === 'https://campus.163.com/app/detail/index?id=' + id + '&projectId=' + projectId, 'unsafe native URI/id/project binding');
  }
  return post;
}
function boundRecord(job, site) { profile(site); check(keys(job, ['kind', 'post']), 'native post binding'); return record(job.post, job.kind, site); }
function validateJobs(jobs, site) {
  profile(site); check(dense(jobs) && jobs.length > 0, 'no usable jobs; zero cannot clear existing data'); const seen = new Set();
  for (const job of jobs) { const post = boundRecord(job, site), id = String(job.kind !== 'daily' ? post.ehr_job_id : post.id); check(!seen.has(id), 'duplicate official id / ID-domain collision'); seen.add(id); }
  return true;
}
function normalizeRecord(job, site) {
  const post = boundRecord(job, site), project = job.kind !== 'daily', label = project ? post.type_name : post.workTypeName;
  // full/research/intern use the observed shared Position innerHTML; daily has its own observed innerHTML renderer.
  return { id: String(project ? post.ehr_job_id : post.id), title: project ? post.job_name : post.positionName, category: (project ? post.category_name : post.postTypeNames) ?? '',
    city: (project ? post.work_place_name : post.workCityName) ?? '', channels: ['campus'], employment: label === '全职' ? 'full-time' : label === '实习' ? 'internship' : null,
    talentPlan: null, date: null, dateKind: null, sourceStatus: null,
    url: project ? post.job_detail_url : 'https://hr.163.com/job-detail.html?id=' + post.id + '&lang=zh',
    duty: htmlText(project ? post.job_description : post.description), requirements: htmlText(project ? post.job_requirement : post.requirement), description: '', jdComplete: false };
}
function portalNotice(site) {
  if (!verifiedSource(site)) return '';
  const p = profile(site), scope = Object.hasOwn(p.query, 'research')
    ? '仅覆盖官网公开应届、日常实习、研究实习与暑期精英实习四入口（projectId=77/68/73、P4/workType=1），非公司全球或全网易全集；单入口零岗位不代表整源零岗位；公开仍列出不证明当前可投；'
    : '仅覆盖官网当前27届应届与日常实习两个热招入口（projectId=77、P4/workType=1），非公司全球或全网易全集；研究实习及其它独立实习入口待核；';
  return scope + JD_NOTICE + '，完整性未验证。两栏按官网HTML renderer分别转换，不猜分栏；组织字段不推法律雇主，性质仅按全职/实习字面标签，人才计划、原状态及可靠日期未知；两接口ID域独立，碰撞保首次、后者未应用，不合并正文或造ID。';
}
function pageData(page, site, kind, index) {
  const p = profile(site);
  check((keys(page, ['request', 'httpStatus', 'response']) || keys(page, ['kind', 'request', 'httpStatus', 'response']) && page.kind === kind) &&
    equal(page.request, requestFor(site, kind, index)), 'native request URL/method/headers/body/kind/page binding');
  check(page.httpStatus === 200, 'native HTTP ' + page.httpStatus);
  const j = page.response;
  const project = kind !== 'daily';
  check(keys(j, project ? ['status', 'msg', 'data'] : ['code', 'msg', 'data']) && (project ? j.status : j.code) === 200 && j.msg === 'success', 'native business refusal/unknown response');
  const d = j.data, list = project ? d?.apply_job_list : d?.list, total = project ? d?.count_number : d?.total, pages = project ? d?.pages_count : d?.pages;
  check(keys(d, project ? ['last_page', 'pages_count', 'count_number', 'apply_job_list'] : ['list', 'pages', 'total']) && count(total) && count(pages) &&
    dense(list) && list.length <= (project ? p.query[kind].page_size : p.query.daily.pageSize) && (pages > 0 || list.length === 0 && total === 0) && (!project || typeof d.last_page === 'boolean'), 'missing/invalid native list/total/pages');
  if (project) for (const post of list) if (object(post) && Object.hasOwn(post, 'ehr_project_id')) check(post.ehr_project_id === String(p.query[kind].project_id), 'native project identity guard');
  return d;
}
function atEnd(data, kind, index, site = PROFILES[0]) { check(typeof kind === 'string' && Object.hasOwn(profile(site).query, kind), 'unverified kind'); return kind !== 'daily' ? data.last_page || index >= data.pages_count : index >= data.pages; }
function scanPages(pages, site, initialIssues = []) {
  const p = profile(site), kinds = Object.keys(p.query), rows = new Map(), totals = new Map(), ids = new Map(), issues = new Set(initialIssues);
  let kindIndex = 0, nextPage = 1, duplicates = 0;
  for (const page of pages) {
    check(kindIndex < kinds.length && nextPage <= MAX_PAGES, 'extra request after native ending/safety limit');
    const kind = kinds[kindIndex], d = pageData(page, site, kind, nextPage), project = kind !== 'daily', list = project ? d.apply_job_list : d.list;
    if (!totals.has(kind)) { totals.set(kind, new Set()); ids.set(kind, new Set()); }
    totals.get(kind).add(project ? d.count_number : d.total);
    for (const post of list) {
      try {
        record(post, kind, site); const id = String(project ? post.ehr_job_id : post.id); ids.get(kind).add(id);
        if (!rows.has(id)) rows.set(id, { kind, post });
        else if (rows.get(id).kind !== kind) issues.add('两接口ID域碰撞 ' + id + '（' + rows.get(id).kind + '→' + kind + '）：后者未应用，保首次；未合并正文或生成复合ID');
        else duplicates++;
      } catch (error) { issues.add(kind + '列表记录未应用：' + error.message); }
    }
    const ended = atEnd(d, kind, nextPage, site);
    if (!ended && list.length < (project ? p.query[kind].page_size : p.query.daily.pageSize)) issues.add(kind + '第' + nextPage + '页提前短/空，按原生页数继续，覆盖待核验');
    if (ended) { kindIndex++; nextPage = 1; } else nextPage++;
  }
  if (duplicates) issues.add('重复官方id ' + duplicates + ' 次，保留首次正文/顺序');
  for (const [kind, values] of totals) if (values.size !== 1 || !values.has(ids.get(kind).size)) issues.add(kind + '：官方total ' + [...values].join('→') + '；实际唯一岗位 ' + ids.get(kind).size);
  const ended = kindIndex === kinds.length;
  if (!ended) issues.add('分页未穷尽，覆盖待补（未完成入口 ' + kinds.slice(kindIndex).join('/') + '）');
  if (!ended && (pages.length === MAX_PAGES || nextPage > MAX_PAGES)) issues.add('达到分页安全上限，覆盖待补');
  issues.add(JD_NOTICE);
  return { jobs: [...rows.values()], issues, kindIndex, nextPage, ended };
}
function availableResult(evidence, site) {
  const p = profile(site);
  check(keys(evidence, ['version', 'policy', 'key', 'api', 'pages', 'issues', 'stopped']) && evidence.version === 1 && evidence.policy === 'available' && evidence.key === p.key && evidence.api === p.api, 'available evidence source binding');
  check(dense(evidence.pages) && evidence.pages.length > 0 && evidence.pages.length <= MAX_PAGES && dense(evidence.issues) && evidence.issues.every(v => typeof v === 'string'), 'available evidence limits/issues');
  const state = scanPages(evidence.pages, site, evidence.issues);
  if (evidence.stopped !== null) {
    const stopped = evidence.stopped, kind = Object.keys(p.query)[state.kindIndex];
    check(!state.ended && state.nextPage <= MAX_PAGES && evidence.pages.length < MAX_PAGES &&
      (keys(stopped, ['error', 'request', 'httpStatus', 'response']) || keys(stopped, ['kind', 'error', 'request', 'httpStatus', 'response']) && stopped.kind === kind) &&
      equal(stopped.request, requestFor(site, kind, state.nextPage)) && typeof stopped.error === 'string' && stopped.error.length > 0, 'stopped request binding');
    const { error, ...attempt } = stopped;
    let failed = false; try { pageData(attempt, site, kind, state.nextPage); } catch { failed = true; }
    check(failed, 'successful page cannot be disguised as a stopped request'); state.issues.add('请求停止：' + error);
  }
  validateJobs(state.jobs, site);
  return { complete: false, total: state.jobs.length, jobs: state.jobs, verification: evidence, issues: [...state.issues] };
}
function collectAvailable(pages, site, issues = [], stopped = null) {
  profile(site); return freeze(availableResult(structuredClone({ version: 1, policy: 'available', key: site.key, api: site.api, pages, issues, stopped }), site));
}
function validateEvidence(evidence, jobs, site) { const result = availableResult(evidence, site); check(equal(jobs, result.jobs), 'available jobs/native evidence binding'); return result; }
async function bounded(operation, signal) {
  signal.throwIfAborted(); let onAbort;
  const aborted = new Promise((_, reject) => { onAbort = () => reject(signal.reason); signal.addEventListener('abort', onAbort, { once: true }); });
  try { return await Promise.race([Promise.resolve().then(operation), aborted]); }
  finally { signal.removeEventListener('abort', onAbort); }
}
async function fetchAvailable(site, options = {}) {
  const kinds = Object.keys(profile(site).query);
  const { fetchImpl = globalThis.fetch, sleep = ms => new Promise(r => setTimeout(r, ms)), maxPages = MAX_PAGES, now = Date.now, listPages = [] } = options;
  check(typeof fetchImpl === 'function' && typeof sleep === 'function' && typeof now === 'function' && Number.isSafeInteger(maxPages) && maxPages > 0 && maxPages <= MAX_PAGES &&
    dense(listPages) && listPages.length <= maxPages, 'invalid request limits/resume pages');
  const deadline = now() + PROCESS_MS, pages = structuredClone(listPages), issues = [];
  const state = scanPages(pages, site); let kindIndex = state.kindIndex, n = state.nextPage, stopped = null, lastStart = null;
  if (pages.length) issues.push('复用已取得的同scope列表页，未重采这些列表');
  // Anonymous Node GET only: no login/bootstrap, session tokens, invented UA, retry or alternate-client fallback.
  while (pages.length < maxPages && kindIndex < kinds.length) {
    const wait = lastStart === null ? 0 : Math.max(0, 200 - (now() - lastStart));
    if (now() + wait >= deadline) { issues.push('达到进程安全时限，覆盖待补'); break; }
    while (lastStart !== null && now() - lastStart < 200) {
      if (now() >= deadline) break;
      await sleep(200 - (now() - lastStart));
    }
    const remaining = deadline - now(); if (remaining <= 0) { issues.push('达到进程安全时限，覆盖待补'); break; }
    const kind = kinds[kindIndex], attempt = { request: requestFor(site, kind, n), httpStatus: null, response: null };
    const signal = AbortSignal.timeout(Math.min(15000, Math.ceil(remaining))); lastStart = now();
    try {
      const r = await bounded(() => fetchImpl(attempt.request.url, { method: 'GET', headers: attempt.request.headers, redirect: 'error', signal }), signal);
      attempt.httpStatus = r?.status ?? null;
      if (attempt.httpStatus !== 200) {
        if (typeof r?.json === 'function') { try { attempt.response = await bounded(() => r.json(), signal); } catch { /* A non-JSON refusal is not native success. */ } }
        check(false, 'native HTTP ' + attempt.httpStatus);
      }
      attempt.response = await bounded(() => r.json(), signal); const d = pageData(attempt, site, kind, n); pages.push(attempt);
      if (atEnd(d, kind, n, site)) { kindIndex++; n = 1; } else n++;
    } catch (error) {
      if (!pages.length) throw error;
      stopped = { ...attempt, error: String(error?.message || error || 'request failure') }; break;
    }
  }
  if (pages.length === maxPages && kindIndex < kinds.length) issues.push('达到分页安全上限，覆盖待补');
  return collectAvailable(pages, site, issues, stopped);
}
async function run(args, options = {}) {
  check(Array.isArray(args) && args.length === 2 && typeof args[0] === 'string' && typeof args[1] === 'string' && args[1], 'Usage: leihuo_portal.js <siteJSON> <outputFile>');
  const site = JSON.parse(args[0]), result = await fetchAvailable(site, options);
  const envelope = { key: site.key, api: site.api, mode: 'custom', ...result }, file = args[1], temp = file + '.tmp-' + randomUUID(); let created = false;
  try {
    const fd = fs.openSync(temp, 'wx'); created = true;
    try { fs.writeFileSync(fd, JSON.stringify(envelope, null, 2) + '\n', 'utf8'); } finally { fs.closeSync(fd); }
    fs.renameSync(temp, file);
  } finally { if (created && fs.existsSync(temp)) fs.unlinkSync(temp); }
  return envelope;
}
module.exports = { PROFILES, requiresVerification, verifiedSource, validateJobs, normalizeRecord, portalNotice, requestFor, pageData, atEnd, collectAvailable, validateEvidence, fetchAvailable, run };
if (require.main === module) run(process.argv.slice(2)).catch(error => { console.error(error.message); process.exitCode = 1; });
