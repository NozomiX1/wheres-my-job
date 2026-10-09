'use strict';
const fs = require('node:fs');
const { randomUUID } = require('node:crypto');
const { isDeepStrictEqual: equal } = require('node:util');
const { htmlText } = require('../jd-text');
const ORIGIN = 'https://hr.vivo.com', ADAPTER = 'vivo-social-portal-v1', MAX_PAGES = 200, PROCESS_MS = 900000;
const JD_NOTICE = '已收录列表JD，详情正文完整性待核验';
const check = (ok, message) => { if (!ok) throw new Error('vivo social: ' + message); };
const object = v => v !== null && typeof v === 'object' && !Array.isArray(v);
const keys = (v, expected) => object(v) && equal(Object.keys(v).sort(), [...expected].sort());
const dense = v => Array.isArray(v) && [...v.keys()].every(i => Object.hasOwn(v, i));
const count = v => Number.isSafeInteger(v) && v >= 0;
const nativeId = v => typeof v === 'string' && /^M[1-9]\d*$/.test(v);
function freeze(v) { if (v && typeof v === 'object') { Object.values(v).forEach(freeze); Object.freeze(v); } return v; }
// Social is a separate system: campus/Beisen qualification is never inherited.
const PROFILES = freeze([{ key: 'vivo_social', company: 'vivo', ats: 'custom', adapter: ADAPTER, track: 'social', batch: '社招', exclude: '(无)',
  origin: ORIGIN, url: ORIGIN + '/jobs', api: ORIGIN + '/api/social/webSite/portal/page', listJD: true,
  body: { city_code_list: [], company_id: 1, group_id: 1, user_id: null, job_category_id_list: [], keyword: '', max_results: 100, page: 1, yoe_list: [], loading: true } }]);
function requiresVerification(site) {
  if (site?.key === 'vivo_social' || site?.adapter === ADAPTER) return true;
  return ['origin', 'apiOrigin', 'api', 'url', 'detailApi'].some(k => {
    if (!site || !Object.hasOwn(site, k)) return false;
    try { check(typeof site[k] === 'string', 'invalid URI'); return new URL(site[k].replace(/^(GET|POST)\s+/, '')).hostname.toLowerCase().replace(/\.$/, '') === 'hr.vivo.com'; }
    catch { return true; }
  });
}
function verifiedSource(site) { return PROFILES.some(p => equal(site, p)); }
function profile(site) { check(verifiedSource(site), 'unverified source identity/scope/mode'); return PROFILES.find(p => p.key === site.key); }
function requestFor(site, page) {
  const p = profile(site); check(Number.isSafeInteger(page) && page > 0 && page <= MAX_PAGES, 'unverified page');
  return { url: p.api, method: 'POST', headers: { 'Content-Type': 'application/json;charset=UTF-8', Accept: 'application/json, text/plain, */*', Origin: p.origin, Referer: p.url }, body: { ...p.body, page } };
}
function record(post) {
  check(object(post) && Object.hasOwn(post, 'job_id') && nativeId(post.job_id), 'invalid native job_id');
  check(Object.hasOwn(post, 'job_title') && typeof post.job_title === 'string' && post.job_title.trim(), 'invalid native title');
  for (const field of ['job_desc', 'job_category'])
    check(Object.hasOwn(post, field) && (post[field] === null || typeof post[field] === 'string'), 'missing/invalid native ' + field);
  for (const field of ['job_code', 'job_category_id'])
    if (Object.hasOwn(post, field)) check(post[field] === null || typeof post[field] === 'string', 'invalid native ' + field);
  check(post.job_category_id == null || post.job_category_id === '' || nativeId(post.job_category_id), 'unsafe native category identity');
  check(Object.hasOwn(post, 'job_location_list') && (post.job_location_list === null || dense(post.job_location_list) && post.job_location_list.every(l => object(l) && Object.hasOwn(l, 'city') && (l.city === null || typeof l.city === 'string'))), 'missing/invalid native locations');
  return post;
}
function boundRecord(job, site) { profile(site); check(keys(job, ['post']), 'native post binding'); return record(job.post); }
function validateJobs(jobs, site) {
  profile(site); check(dense(jobs) && jobs.length > 0, 'no usable jobs; zero cannot clear existing data');
  const seen = new Set();
  for (const job of jobs) { const post = boundRecord(job, site); check(!seen.has(post.job_id), 'duplicate official id'); seen.add(post.job_id); }
  return true;
}
function pageData(page, site, index) {
  check(keys(page, ['request', 'httpStatus', 'response']) && equal(page.request, requestFor(site, index)), 'native request URL/method/headers/body/page binding');
  check(page.httpStatus === 200, 'native HTTP ' + page.httpStatus);
  const j = page.response;
  check(keys(j, ['code', 'message', 'data', 'meta', 'success']) && j.code === 0 && j.message === 'success' && j.success === true, 'native business refusal/unknown response');
  const m = j.meta;
  check(dense(j.data) && j.data.length <= site.body.max_results && keys(m, ['page', 'total', 'page_count', 'max_results']) && m.page === index && m.max_results === site.body.max_results &&
    count(m.total) && count(m.page_count) && (m.page_count > 0 || j.data.length === 0 && m.total === 0), 'missing/invalid native list/meta/total/pages');
  return j;
}
function atEnd(j, index) { return index >= j.meta.page_count; }
function availableResult(evidence, site) {
  const p = profile(site);
  check(keys(evidence, ['version', 'policy', 'key', 'api', 'pages', 'issues', 'stopped']) && evidence.version === 1 && evidence.policy === 'available' && evidence.key === p.key && evidence.api === p.api, 'available evidence source binding');
  check(dense(evidence.pages) && evidence.pages.length > 0 && evidence.pages.length <= MAX_PAGES && dense(evidence.issues) && evidence.issues.every(v => typeof v === 'string'), 'available evidence limits/issues');
  const rows = new Map(), totals = new Set(), issues = new Set(evidence.issues);
  let nextPage = 1, ended = false, duplicates = 0;
  for (const page of evidence.pages) {
    check(!ended, 'extra request after native ending'); const j = pageData(page, site, nextPage); totals.add(j.meta.total);
    for (const post of j.data) {
      try { record(post); if (rows.has(post.job_id)) duplicates++; else rows.set(post.job_id, { post }); }
      catch (error) { issues.add('列表记录未应用（id=' + (nativeId(post?.job_id) ? post.job_id : '未知') + '）：' + error.message); }
    }
    ended = atEnd(j, nextPage);
    if (!ended && j.data.length < p.body.max_results) issues.add('第' + nextPage + '页提前短/空，按原生页数继续，覆盖待核验');
    nextPage++;
  }
  if (evidence.stopped !== null) {
    const stopped = evidence.stopped;
    check(!ended && nextPage <= MAX_PAGES && keys(stopped, ['error', 'request', 'httpStatus', 'response']) && equal(stopped.request, requestFor(site, nextPage)) && typeof stopped.error === 'string' && stopped.error.length > 0, 'stopped request binding');
    const { error, ...attempt } = stopped;
    let failed = false; try { pageData(attempt, site, nextPage); } catch { failed = true; }
    check(failed, 'successful page cannot be disguised as a stopped request'); issues.add('请求停止：' + error);
  }
  check(rows.size > 0, 'no usable records; zero cannot clear existing data');
  if (duplicates) issues.add('重复官方id ' + duplicates + ' 次，保留首次取得的顺序/正文');
  if (totals.size !== 1 || !totals.has(rows.size)) issues.add('官方total ' + [...totals].join('→') + '；实际唯一岗位 ' + rows.size);
  if (!ended) issues.add('分页未穷尽，覆盖待补');
  if (!ended && evidence.pages.length === MAX_PAGES) issues.add('达到分页安全上限，覆盖待补');
  issues.add(JD_NOTICE);
  const jobs = [...rows.values()]; validateJobs(jobs, site);
  return { complete: false, total: jobs.length, jobs, verification: evidence, issues: [...issues] };
}
function collectAvailable(pages, site, issues = [], stopped = null) {
  profile(site); return freeze(availableResult(structuredClone({ version: 1, policy: 'available', key: site.key, api: site.api, pages, issues, stopped }), site));
}
function validateEvidence(evidence, jobs, site) { const result = availableResult(evidence, site); check(equal(jobs, result.jobs), 'available jobs/native evidence binding'); return result; }
function normalizeRecord(job, site) {
  const p = profile(site), post = boundRecord(job, site);
  // Current JS assigns cardList.job_desc to innerHTML. Keep one full body; do not guess a section split.
  // getInternalReferralSearchKeyMap maps the actual router aliases _irjid / _irjc.
  const query = new URLSearchParams({ _irjid: post.job_id }); if (post.job_category_id) query.set('_irjc', post.job_category_id);
  return { id: post.job_id, title: post.job_title, category: post.job_category ?? '', city: (post.job_location_list ?? []).map(l => l.city ?? '').join('/'),
    channels: ['social'], employment: null, talentPlan: null, date: null, dateKind: null, sourceStatus: null,
    url: p.origin + '/job-detail?' + query, duty: '', requirements: '', description: htmlText(post.job_desc), jdComplete: false };
}
function portalNotice(site) {
  return verifiedSource(site) ? '仅覆盖官网默认社招列表（company_id/group_id=1，组织范围未证全）；' + JD_NOTICE + '，完整性未验证；单字段全文不猜独立职责/要求，性质、人才计划、原状态和可靠日期未知，不继承校园系统资格。' : '';
}
async function fetchAvailable(site, options = {}) {
  const p = profile(site);
  const { fetchImpl = globalThis.fetch, sleep = ms => new Promise(r => setTimeout(r, ms)), maxPages = MAX_PAGES, now = Date.now } = options;
  check(typeof fetchImpl === 'function' && typeof sleep === 'function' && typeof now === 'function' && Number.isSafeInteger(maxPages) && maxPages > 0 && maxPages <= MAX_PAGES, 'invalid request limits');
  const deadline = now() + PROCESS_MS, pages = [], issues = []; let stopped = null, lastStart = null;
  // No bootstrap, cookies, fabricated signatures or browser UA: only the native anonymous POST protocol.
  for (let n = 1; n <= maxPages; n++) {
    const wait = lastStart === null ? 0 : Math.max(0, 200 - (now() - lastStart));
    if (now() + wait >= deadline) { issues.push('达到进程安全时限，覆盖待补'); break; }
    while (lastStart !== null && now() - lastStart < 200) await sleep(200 - (now() - lastStart));
    lastStart = now(); const remaining = deadline - lastStart;
    if (remaining <= 0) { issues.push('达到进程安全时限，覆盖待补'); break; }
    const attempt = { request: requestFor(site, n), httpStatus: null, response: null };
    try {
      const r = await fetchImpl(p.api, { method: 'POST', headers: attempt.request.headers, body: JSON.stringify(attempt.request.body), redirect: 'error', signal: AbortSignal.timeout(Math.min(15000, Math.ceil(remaining))) });
      attempt.httpStatus = r?.status ?? null;
      if (attempt.httpStatus !== 200) {
        if (typeof r?.json === 'function') { try { attempt.response = await r.json(); } catch { /* Non-JSON refusal is not native success. */ } }
        check(false, 'native HTTP ' + attempt.httpStatus);
      }
      attempt.response = await r.json(); const j = pageData(attempt, site, n); pages.push(attempt);
      if (atEnd(j, n)) break;
      if (n === maxPages) issues.push('达到分页安全上限，覆盖待补');
    } catch (error) {
      if (!pages.length) throw error;
      stopped = { ...attempt, error: String(error?.message || error || 'request failure') }; break;
    }
  }
  return collectAvailable(pages, site, issues, stopped);
}
async function run(args, options = {}) {
  check(Array.isArray(args) && args.length === 2 && typeof args[0] === 'string' && typeof args[1] === 'string' && args[1], 'Usage: vivo_social_portal.js <siteJSON> <outputFile>');
  const site = JSON.parse(args[0]), result = await fetchAvailable(site, options);
  const envelope = { key: site.key, api: site.api, mode: 'custom', ...result }, file = args[1], temp = file + '.tmp-' + randomUUID(); let created = false;
  try {
    const fd = fs.openSync(temp, 'wx'); created = true;
    try { fs.writeFileSync(fd, JSON.stringify(envelope, null, 2) + '\n', 'utf8'); } finally { fs.closeSync(fd); }
    fs.renameSync(temp, file);
  } finally { if (created && fs.existsSync(temp)) fs.unlinkSync(temp); }
  return envelope;
}
module.exports = { PROFILES, requiresVerification, verifiedSource, validateJobs, normalizeRecord, portalNotice, collectAvailable, validateEvidence, fetchAvailable, run };
if (require.main === module) run(process.argv.slice(2)).catch(error => { console.error(error.message); process.exitCode = 1; });
