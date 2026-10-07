'use strict';
const fs = require('node:fs');
const { randomUUID } = require('node:crypto');
const { isDeepStrictEqual: equal } = require('node:util');
const ORIGIN = 'https://job.xiaohongshu.com', API = ORIGIN + '/websiterecruit/position/pageQueryPosition';
const ADAPTER = 'xiaohongshu-portal-v1', MAX_PAGES = 200;
const HEADERS = Object.freeze({ 'Content-Type': 'application/json', Accept: 'application/json' });
const JD_NOTICE = '已收录列表JD，详情正文完整性待核验';
function freeze(value) {
  if (value && typeof value === 'object') { Object.values(value).forEach(freeze); Object.freeze(value); }
  return value;
}
const PROFILES = freeze(['campus', 'social'].map(track => ({
  key: track === 'campus' ? 'xiaohongshu' : 'xiaohongshu_social', company: '小红书', ats: 'custom', adapter: ADAPTER,
  track, batch: track === 'campus' ? '2027校园招聘（regular项目）' : '社招', exclude: '(无)', origin: ORIGIN,
  url: ORIGIN + '/' + track + '/position', api: API, listJD: true,
  body: { positionName: '', pageNum: 1, pageSize: 10, recruitType: track, ...(track === 'campus' ? { jobProjects: ['campus_autumn_27'] } : {}) }
})));
const check = (ok, message) => { if (!ok) throw new Error('Xiaohongshu: ' + message); };
function requiresVerification(site) {
  if (PROFILES.some(p => p.key === site?.key) || site?.adapter === ADAPTER) return true;
  return ['origin', 'apiOrigin', 'api', 'url', 'detailApi'].some(k => {
    if (!site || !Object.hasOwn(site, k)) return false;
    try { check(typeof site[k] === 'string', 'invalid URI'); return new URL(site[k].replace(/^(GET|POST)\s+/, '')).hostname.toLowerCase().replace(/\.$/, '') === 'job.xiaohongshu.com'; }
    catch { return true; } // Invalid declarations cannot downgrade to a generic adapter.
  });
}
function verifiedSource(site) { return PROFILES.some(p => equal(site, p)); }
function profile(site) { check(verifiedSource(site), 'unverified source identity/scope/mode'); return PROFILES.find(p => p.key === site.key); }
function requestFor(site, pageNum) { return { url: API, method: 'POST', headers: { ...HEADERS }, body: { ...profile(site).body, pageNum } }; }
function record(job) {
  check(job && typeof job === 'object' && !Array.isArray(job), 'invalid native record');
  check(Object.hasOwn(job, 'positionId') && Number.isSafeInteger(job.positionId) && job.positionId > 0, 'invalid numeric positionId');
  check(Object.hasOwn(job, 'positionName') && typeof job.positionName === 'string' && job.positionName.trim(), 'invalid native title');
  for (const field of ['duty', 'qualification']) check(Object.hasOwn(job, field) && (job[field] === null || typeof job[field] === 'string'), 'missing/invalid TEXT ' + field);
  return job;
}
function validateJobs(jobs, site) {
  profile(site); check(Array.isArray(jobs) && jobs.length > 0, 'no usable jobs; zero cannot clear existing data');
  const seen = new Set();
  for (const job of jobs) { record(job); check(!seen.has(job.positionId), 'duplicate positionId'); seen.add(job.positionId); }
  return true;
}
function pageData(page, site, index) {
  check(page && equal(page.request, requestFor(site, index)), 'native request URL/method/headers/body binding');
  check(page.httpStatus === 200, 'native HTTP ' + page.httpStatus);
  const j = page.response;
  check(j && !Array.isArray(j) && j.statusCode === 200 && j.alertMsg === '成功', 'native business refusal');
  for (const [key, value] of [['success', true], ['errorCode', 200], ['errorMsg', '成功']]) check(!Object.hasOwn(j, key) || j[key] === value, 'native business ' + key);
  const d = j.data;
  check(d && !Array.isArray(d) && d.pageNum === index && d.pageSize === 10 && Number.isSafeInteger(d.total) && d.total >= 0 && Array.isArray(d.list), 'missing/invalid native list/page/total');
  check(d.list.length <= 10 && [...d.list.keys()].every(i => Object.hasOwn(d.list, i)), 'invalid native list slots');
  return d;
}
function availableResult(evidence, site) {
  const p = profile(site);
  check(evidence?.version === 2 && evidence.policy === 'available' && evidence.key === p.key && evidence.api === API, 'available evidence source binding');
  check(Array.isArray(evidence.pages) && evidence.pages.length > 0 && evidence.pages.length <= MAX_PAGES && Array.isArray(evidence.issues) && evidence.issues.every(v => typeof v === 'string'), 'available evidence limits/issues');
  const rows = new Map(), totals = new Set(), issues = new Set(evidence.issues); let duplicates = 0, ended = false;
  for (const [i, page] of evidence.pages.entries()) {
    check(!ended, 'extra request after EOF'); const d = pageData(page, site, i + 1); totals.add(d.total);
    for (const row of d.list) {
      try { record(row); if (rows.has(row.positionId)) duplicates++; rows.set(row.positionId, row); }
      catch (error) { issues.add('列表记录未应用：' + error.message); }
    }
    ended = d.list.length === 0;
  }
  if (evidence.stopped != null) {
    const stopped = evidence.stopped;
    check(!ended && equal(stopped.request, requestFor(site, evidence.pages.length + 1)) && typeof stopped.error === 'string' && stopped.error.length > 0, 'stopped request binding');
    let failed = false; try { pageData(stopped, site, evidence.pages.length + 1); } catch { failed = true; }
    check(failed, 'successful page cannot be disguised as a stopped request'); issues.add('请求停止：' + stopped.error);
  }
  check(rows.size > 0, 'no usable records; zero cannot clear existing data');
  if (duplicates) issues.add('重复身份 ' + duplicates + ' 次，按官网ID保留本次最后取得记录');
  if (totals.size !== 1 || !totals.has(rows.size)) issues.add('官方total ' + [...totals].join('→') + '；实际唯一岗位 ' + rows.size);
  if (!ended) issues.add('分页未穷尽，覆盖待补');
  issues.add(JD_NOTICE);
  const jobs = [...rows.values()]; validateJobs(jobs, site);
  return { complete: false, total: jobs.length, jobs, verification: evidence, issues: [...issues] };
}
function collectAvailable(pages, site, issues = [], stopped = null) {
  profile(site);
  return availableResult({ version: 2, policy: 'available', key: site.key, api: API, pages, issues, stopped }, site);
}
function validateEvidence(evidence, jobs, site) {
  const result = availableResult(evidence, site);
  check(equal(jobs, result.jobs), 'available jobs/native evidence binding'); return result;
}
function normalizeRecord(job, site) {
  const p = profile(site); record(job);
  return { id: String(job.positionId), title: job.positionName, city: typeof job.workplace === 'string' ? job.workplace : '',
    category: p.track === 'social' && typeof job.jobType === 'string' ? job.jobType : '', channels: [p.track],
    employment: null, talentPlan: null, date: null, dateKind: null, sourceStatus: typeof job.recruitStatus === 'string' && job.recruitStatus.trim() ? job.recruitStatus : null,
    url: p.url + '/' + job.positionId, duty: job.duty ?? '', requirements: job.qualification ?? '', description: '', jdComplete: false };
}
function portalNotice(site) {
  if (!verifiedSource(site)) return '';
  return (site.track === 'campus' ? '仅覆盖2027校园招聘regular项目，不含REDstar、Ace及独立实习入口；' : '仅覆盖默认无筛选社招入口；') + JD_NOTICE + '，完整性未验证，不代表公司全球全集；性质、人才计划和日期未知。';
}
async function fetchAvailable(site, options = {}) {
  profile(site);
  const { fetchImpl = globalThis.fetch, sleep = ms => new Promise(r => setTimeout(r, ms)), maxPages = MAX_PAGES } = options;
  check(typeof fetchImpl === 'function' && typeof sleep === 'function' && Number.isSafeInteger(maxPages) && maxPages > 0 && maxPages <= MAX_PAGES, 'invalid request limits');
  const pages = [], issues = []; let stopped = null;
  for (let n = 1; n <= maxPages; n++) {
    const attempt = { request: requestFor(site, n), httpStatus: null, response: null };
    try {
      await sleep(200);
      const r = await fetchImpl(API, { method: 'POST', headers: { ...HEADERS }, body: JSON.stringify(attempt.request.body), redirect: 'error', signal: AbortSignal.timeout(15000) });
      attempt.httpStatus = r?.status ?? null; check(attempt.httpStatus === 200, 'native HTTP ' + attempt.httpStatus);
      attempt.response = await r.json(); const d = pageData(attempt, site, n); pages.push(attempt);
      if (d.list.length === 0) break;
      if (n === maxPages) issues.push('达到分页安全上限，覆盖待补');
    } catch (error) {
      if (!pages.length) throw error;
      stopped = { ...attempt, error: String(error.message ?? error) }; break;
    }
  }
  return collectAvailable(pages, site, issues, stopped);
}
async function run(args, options = {}) {
  check(Array.isArray(args) && args.length === 2 && typeof args[0] === 'string' && typeof args[1] === 'string' && args[1], 'Usage: xiaohongshu_portal.js <siteJSON> <outputFile>');
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
