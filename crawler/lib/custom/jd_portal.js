'use strict';
const fs = require('node:fs');
const { randomUUID } = require('node:crypto');
const { isDeepStrictEqual: equal } = require('node:util');
const { htmlText } = require('../jd-text');
const ADAPTER = 'jd-portal-v1', MAX_PAGES = 200, PROCESS_MS = 900000;
const JD_NOTICE = '已收录官网列表两栏JD，正文完整性待核验';
const check = (ok, message) => { if (!ok) throw new Error('JD: ' + message); };
const object = v => v !== null && typeof v === 'object' && !Array.isArray(v);
function freeze(v) { if (v && typeof v === 'object') { Object.values(v).forEach(freeze); Object.freeze(v); } return v; }
const PROFILES = freeze([
  { key: 'jd', company: '京东', ats: 'custom', adapter: ADAPTER, track: 'campus', batch: '校园招聘（官网默认全项目，含TGT及实习）', exclude: '(无)',
    origin: 'https://campus.jd.com', url: 'https://campus.jd.com/#/jobs', api: 'https://campus.jd.com/api/wx/position/page?type=present', listJD: true,
    body: { pageSize: 100, pageIndex: 0, parameter: { positionName: '', planIdList: [], jobDirectionCodeList: [], workCityCodeList: [], positionDeptList: [] } } },
  { key: 'jd_social', company: '京东', ats: 'custom', adapter: ADAPTER, track: 'social', batch: '社招', exclude: '(无)',
    origin: 'https://zhaopin.jd.com', url: 'https://zhaopin.jd.com/web/job/job_info_list/3', api: 'https://zhaopin.jd.com/web/job/job_list', listJD: true,
    body: { pageIndex: '1', pageSize: '100', workCityJson: '[]', jobTypeJson: '[]', jobSearch: '', depTypeJson: '[]' } }
]);
function requiresVerification(site) {
  if (PROFILES.some(p => p.key === site?.key) || site?.adapter === ADAPTER) return true;
  return ['origin', 'apiOrigin', 'url', 'api', 'detailApi'].some(k => {
    if (!site || !Object.hasOwn(site, k)) return false;
    try { check(typeof site[k] === 'string', 'invalid URI'); return ['campus.jd.com', 'zhaopin.jd.com'].includes(new URL(site[k].replace(/^(GET|POST)\s+/, '')).hostname.toLowerCase().replace(/\.$/, '')); }
    catch { return true; }
  });
}
function verifiedSource(site) { return PROFILES.some(p => equal(p, site)); }
function profile(site) { check(verifiedSource(site), 'unverified source identity/scope/mode'); return PROFILES.find(p => p.key === site.key); }
function requestFor(site, index) {
  const p = profile(site), first = p.track === 'campus' ? 0 : 1;
  check(Number.isSafeInteger(index) && index >= first && index < MAX_PAGES + first, 'invalid page');
  return { url: p.api, method: 'POST', headers: { Accept: 'application/json, text/plain, */*', Referer: p.track === 'campus' ? p.origin + '/' : p.url,
    'Content-Type': p.track === 'campus' ? 'application/json;charset=UTF-8' : 'application/x-www-form-urlencoded; charset=UTF-8', Origin: p.origin },
    body: { ...p.body, pageIndex: p.track === 'campus' ? index : String(index) } };
}
function countRequestFor(site) {
  const p = profile(site); check(p.key === 'jd_social', 'count is only verified for jd_social');
  const { workCityJson, jobTypeJson, jobSearch, depTypeJson } = p.body;
  return { url: p.origin + '/web/job/job_count', method: 'POST', headers: { Accept: '*/*', 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8', Referer: p.url, Origin: p.origin },
    body: new URLSearchParams({ workCityJson, jobTypeJson, jobSearch, depTypeJson }).toString() };
}
function countData(count, site) {
  check(object(count) && equal(Object.keys(count).sort(), ['httpStatus', 'request', 'response']) && equal(count.request, countRequestFor(site)), 'native count request binding');
  check(count.httpStatus === 200, 'native count HTTP ' + count.httpStatus);
  check(Number.isSafeInteger(count.response) && count.response >= 0, 'invalid native count number'); return count.response;
}
function record(post, site) {
  const p = profile(site), idField = p.track === 'campus' ? 'publishId' : 'requirementId', titleField = p.track === 'campus' ? 'positionName' : 'positionNameOpen';
  check(object(post) && Number.isSafeInteger(post[idField]) && post[idField] > 0, 'invalid native ' + idField);
  check(typeof post[titleField] === 'string' && post[titleField].trim(), 'invalid native ' + titleField);
  for (const k of ['workContent', 'qualification']) check(Object.hasOwn(post, k) && (post[k] === null || typeof post[k] === 'string'), 'missing/invalid native ' + k);
  for (const k of p.track === 'campus' ? ['jobCategory'] : ['workCity', 'jobType']) if (Object.hasOwn(post, k)) check(post[k] === null || typeof post[k] === 'string', 'invalid native ' + k);
  if (p.track === 'campus') check(Object.hasOwn(post, 'requirementVoList') && (post.requirementVoList === null || Array.isArray(post.requirementVoList) && post.requirementVoList.every(q => object(q) && (q.workCity === null || typeof q.workCity === 'string'))), 'invalid native requirementVoList');
  return post;
}
function officialId(post, site) { return post[site.track === 'campus' ? 'publishId' : 'requirementId']; }
function boundRecord(job, site) { check(object(job) && equal(Object.keys(job), ['post']), 'native post binding'); return record(job.post, site); }
function validateJobs(jobs, site) {
  profile(site); check(Array.isArray(jobs) && jobs.length > 0, 'no usable jobs; zero cannot clear existing data'); const seen = new Set();
  for (const j of jobs) { const id = officialId(boundRecord(j, site), site); check(!seen.has(id), 'duplicate official id'); seen.add(id); } return true;
}
function pageData(page, site, index) {
  check(object(page) && equal(Object.keys(page).sort(), ['httpStatus', 'request', 'response']) && equal(page.request, requestFor(site, index)), 'native request binding');
  check(page.httpStatus === 200, 'native HTTP ' + page.httpStatus);
  if (site.track === 'social') { check(Array.isArray(page.response) && page.response.length <= 100 && [...page.response.keys()].every(i => Object.hasOwn(page.response, i)), 'invalid native list'); return { items: page.response, total: null }; }
  const j = page.response;
  check(object(j) && j.success === true && object(j.body), 'native business refusal');
  check(Array.isArray(j.body.items) && j.body.items.length <= 100 && [...j.body.items.keys()].every(i => Object.hasOwn(j.body.items, i)), 'missing/invalid native list');
  check(Number.isSafeInteger(j.body.totalNumber) && j.body.totalNumber >= 0, 'missing/invalid native total');
  return { items: j.body.items, total: j.body.totalNumber };
}
function atEnd(j, index, site) { return j.items.length < 100 || site.track === 'campus' && (index + 1) * 100 >= j.total; }
function availableResult(evidence, site) {
  const p = profile(site), withCount = evidence?.version === 3;
  check(object(evidence) && equal(Object.keys(evidence).sort(), withCount ? ['api', 'count', 'issues', 'key', 'pages', 'policy', 'stopped', 'version'] : ['api', 'issues', 'key', 'pages', 'policy', 'stopped', 'version']) && (evidence.version === 2 || withCount) && evidence.policy === 'available' && evidence.key === p.key && evidence.api === p.api, 'available evidence source binding');
  const officialCount = withCount ? countData(evidence.count, site) : null;
  check(Array.isArray(evidence.pages) && evidence.pages.length > 0 && evidence.pages.length <= MAX_PAGES && Array.isArray(evidence.issues) && evidence.issues.every(v => typeof v === 'string'), 'evidence limits/issues');
  const rows = new Map(), totals = new Set(), issues = new Set(evidence.issues); let index = p.track === 'campus' ? 0 : 1, ended = false, duplicates = 0, slots = 0;
  for (const page of evidence.pages) {
    check(!ended, 'extra request after endpoint'); const j = pageData(page, site, index); slots += j.items.length; if (j.total !== null) totals.add(j.total);
    for (const post of j.items) try {
      record(post, site); const id = officialId(post, site); if (rows.has(id)) duplicates++; else rows.set(id, { post });
    } catch (error) { issues.add('列表记录未应用（id=' + (Number.isSafeInteger(post?.[p.track === 'campus' ? 'publishId' : 'requirementId']) ? officialId(post, site) : '未知') + '）：' + error.message); }
    ended = atEnd(j, index, site); index++;
  }
  if (evidence.stopped !== null) {
    const stopped = evidence.stopped; check(!ended && evidence.pages.length < MAX_PAGES && object(stopped) && equal(Object.keys(stopped).sort(), ['error', 'httpStatus', 'request', 'response']) && equal(stopped.request, requestFor(site, index)) && typeof stopped.error === 'string' && stopped.error, 'stopped request binding');
    const { error, ...attempt } = stopped; let failed = false; try { pageData(attempt, site, index); } catch { failed = true; }
    check(failed, 'successful page disguised as stopped request'); issues.add('请求停止：' + error);
  }
  check(rows.size > 0, 'no usable records; zero cannot clear existing data');
  if (duplicates) issues.add('重复官方id ' + duplicates + ' 次，保留首次顺序/正文');
  if (totals.size && (totals.size !== 1 || !totals.has(rows.size))) issues.add('官方total ' + [...totals].join('→') + '；实际唯一岗位 ' + rows.size);
  if (withCount) issues.add('官网计数' + officialCount + '、列表原槽' + slots + '、唯一' + rows.size + '、重复' + duplicates + '；独立计数为官网列表参考数，不等于唯一岗位数，完整性未验证');
  else if (p.track === 'social') issues.add('列表无官方total，实际唯一岗位 ' + rows.size + '，完整性未验证');
  if (!ended) issues.add('分页未穷尽，覆盖待补'); issues.add(JD_NOTICE);
  const jobs = [...rows.values()]; validateJobs(jobs, site); return { complete: false, total: jobs.length, jobs, verification: evidence, issues: [...issues] };
}
function collectAvailable(pages, site, issues = [], stopped = null, countEvidence = null) { profile(site); return freeze(availableResult(structuredClone({ version: countEvidence === null ? 2 : 3, policy: 'available', key: site.key, api: site.api, pages, issues, stopped, ...(countEvidence === null ? {} : { count: countEvidence }) }), site)); }
function validateEvidence(evidence, jobs, site) { const r = availableResult(evidence, site); check(equal(jobs, r.jobs), 'available jobs/native evidence binding'); return r; }
function normalizeRecord(job, site) {
  const p = profile(site), post = boundRecord(job, site);
  // Current campus renderer inserts newline -> BR HTML; social wraps each native line in P, then appends HTML.
  const text = v => htmlText(p.track === 'campus' ? (v ?? '').replace(/\n/g, '<br/>') : (v ?? '').split('\n').map(line => '<p>' + line + '</p>').join(''));
  return { id: String(officialId(post, site)), title: post[p.track === 'campus' ? 'positionName' : 'positionNameOpen'],
    city: p.track === 'campus' ? (post.requirementVoList ?? []).map(q => q.workCity ?? '').join('/') : post.workCity ?? '',
    category: post[p.track === 'campus' ? 'jobCategory' : 'jobType'] ?? '', channels: [p.track], employment: null, talentPlan: null,
    date: null, dateKind: null, sourceStatus: null, url: p.track === 'campus' ? p.origin + '/#/details?id=' + post.publishId : p.url,
    duty: text(post.workContent), requirements: text(post.qualification), description: '', jdComplete: false };
}
function portalNotice(site) {
  if (!verifiedSource(site)) return '';
  return (site.track === 'campus' ? '仅覆盖官网默认校园全项目列表（含TGT及实习），保留必要type=present及空项目/职能/城市/部门筛选；' : '仅覆盖官网默认无筛选社招列表；官网链接为真实列表入口，不是唯一岗位详情链接；') +
    JD_NOTICE + '，完整性未验证，不代表公司全球全集或独立法律雇主；性质、人才计划、原状态和可靠日期未知。';
}
async function fetchAvailable(site, options = {}) {
  const p = profile(site), { fetchImpl = globalThis.fetch, sleep = ms => new Promise(r => setTimeout(r, ms)), now = Date.now, maxPages = MAX_PAGES } = options;
  check(typeof fetchImpl === 'function' && typeof sleep === 'function' && typeof now === 'function' && Number.isSafeInteger(maxPages) && maxPages > 0 && maxPages <= MAX_PAGES, 'invalid request limits');
  const deadline = now() + PROCESS_MS, pages = [], issues = []; let lastStart = null, stopped = null, countEvidence = null;
  async function fetchRequest(attempt) {
    while (lastStart !== null && now() - lastStart < 200) await sleep(200 - (now() - lastStart));
    check(now() < deadline, 'process safety deadline'); lastStart = now();
    const controller = new AbortController(); let timer;
    try {
      await Promise.race([(async () => {
        const r = await fetchImpl(attempt.request.url, { method: 'POST', headers: attempt.request.headers,
          body: typeof attempt.request.body === 'string' ? attempt.request.body : p.track === 'campus' ? JSON.stringify(attempt.request.body) : new URLSearchParams(attempt.request.body).toString(), redirect: 'error', signal: controller.signal });
        attempt.httpStatus = r?.status ?? null; check(attempt.httpStatus === 200, 'native HTTP ' + attempt.httpStatus); attempt.response = await r.json();
      })(), new Promise((_, reject) => { timer = setTimeout(() => { controller.abort(); reject(new Error('JD: request/body timeout')); }, Math.min(15000, deadline - now())); })]);
    } finally { clearTimeout(timer); }
  }
  if (p.key === 'jd_social') {
    countEvidence = { request: countRequestFor(site), httpStatus: null, response: null };
    await fetchRequest(countEvidence); countData(countEvidence, site);
  }
  for (let count = 0; count < maxPages; count++) {
    if (now() >= deadline) { issues.push('达到进程安全时限，覆盖待补'); break; }
    const index = count + (p.track === 'campus' ? 0 : 1), attempt = { request: requestFor(site, index), httpStatus: null, response: null };
    try {
      await fetchRequest(attempt);
      const j = pageData(attempt, site, index); pages.push(attempt); if (atEnd(j, index, site)) break;
      if (count + 1 === maxPages) issues.push('达到分页安全上限，覆盖待补');
    } catch (error) { if (!pages.length) throw error; stopped = { ...attempt, error: String(error?.message || 'request failure') }; break; }
  }
  return collectAvailable(pages, site, issues, stopped, countEvidence);
}
async function run(args, options = {}) {
  check(Array.isArray(args) && args.length === 2 && typeof args[0] === 'string' && typeof args[1] === 'string' && args[1], 'Usage: jd_portal.js <siteJSON> <outputFile>');
  const site = JSON.parse(args[0]), result = await fetchAvailable(site, options), envelope = { key: site.key, api: site.api, mode: 'custom', ...result }, file = args[1], temp = file + '.tmp-' + randomUUID(); let created = false;
  try { const fd = fs.openSync(temp, 'wx'); created = true; try { fs.writeFileSync(fd, JSON.stringify(envelope, null, 2) + '\n', 'utf8'); } finally { fs.closeSync(fd); } fs.renameSync(temp, file); }
  finally { if (created && fs.existsSync(temp)) fs.unlinkSync(temp); } return envelope;
}
module.exports = { PROFILES, requiresVerification, verifiedSource, validateJobs, normalizeRecord, portalNotice, collectAvailable, validateEvidence, fetchAvailable, run, requestFor, countRequestFor };
if (require.main === module) run(process.argv.slice(2)).catch(error => { console.error(error.message); process.exitCode = 1; });
