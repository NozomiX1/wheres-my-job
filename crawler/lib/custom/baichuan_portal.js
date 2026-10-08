'use strict';
const fs = require('node:fs');
const { randomUUID } = require('node:crypto');
const { isDeepStrictEqual: equal } = require('node:util');
const feishu = require('../feishu');
const ORIGIN = 'https://cq6qe6bvfr6.jobs.feishu.cn', API = ORIGIN + '/api/v1/search/job/posts';
const ADAPTER = 'baichuan-portal-v1', MAX_PAGES = 200, PROCESS_MS = 900000;
const JD_NOTICE = '已收录列表JD，详情正文完整性待核验', STOP = '请求失败，已停止后续请求';
const check = (ok, message) => { if (!ok) throw new Error('Baichuan: ' + message); };
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
function freeze(value) {
  if (value && typeof value === 'object') { Object.values(value).forEach(freeze); Object.freeze(value); }
  return value;
}
const PROFILES = freeze([{
  key: 'baichuan', company: '百川智能', ats: 'custom', adapter: ADAPTER, track: 'campus',
  batch: '校园招聘入口（项目/职能不限）', exclude: '(无)', origin: ORIGIN, url: ORIGIN + '/646926', api: API,
  websitePath: '646926', portalType: 6, subjectIdList: [], listJD: true,
  body: feishu.requestBody({ portalType: 6, subjectIdList: [] }, { limit: 10, offset: 0 })
}]);
function requiresVerification(site) {
  if (site?.key === 'baichuan' || site?.adapter === ADAPTER) return true;
  return ['origin', 'apiOrigin', 'api', 'url', 'detailApi'].some(k => {
    if (!site || !Object.hasOwn(site, k)) return false;
    try {
      check(typeof site[k] === 'string', 'invalid URI');
      return ['campus.baichuan-inc.com', 'cq6qe6bvfr6.jobs.feishu.cn'].includes(new URL(site[k].replace(/^(GET|POST)\s+/, '')).hostname.toLowerCase().replace(/\.$/, ''));
    } catch { return true; } // Invalid declarations must not downgrade to a generic adapter.
  });
}
function verifiedSource(site) { return equal(site, PROFILES[0]); }
function profile(site) { check(verifiedSource(site), 'unverified source identity/scope/mode'); return PROFILES[0]; }
function requestFor(site, offset) {
  const p = profile(site);
  check(Number.isSafeInteger(offset) && offset >= 0 && offset % 10 === 0 && offset < MAX_PAGES * 10, 'invalid native offset');
  const body = feishu.requestBody(p, { limit: 10, offset });
  const query = new URLSearchParams(Object.entries(body).map(([k, v]) => [k, Array.isArray(v) ? v.join(',') : String(v)]));
  return { url: API + '?' + query, method: 'POST', headers: { 'Content-Type': 'application/json', Referer: p.url }, body };
}
function requestMatches(actual, expected) {
  if (equal(actual, expected)) return true;
  // Native page 2+ puts its empty UI filters/page in Referer. Preserve and bind it, never fabricate the base URL.
  try {
    const ref = new URL(actual.headers.Referer), query = {
      keywords: '', category: '', location: '', project: '', type: '', job_hot_flag: '',
      current: String(expected.body.offset / 10 + 1), limit: '10', functionCategory: '', tag: ''
    };
    if (ref.origin !== ORIGIN || ref.pathname !== '/646926/' || ref.username || ref.password || ref.hash ||
      ref.searchParams.size !== Object.keys(query).length || Object.entries(query).some(([k, v]) => ref.searchParams.get(k) !== v)) return false;
    return equal({ ...actual, headers: { ...actual.headers, Referer: expected.headers.Referer } }, expected);
  } catch { return false; }
}
function record(post, site) {
  const p = profile(site);
  check(object(post) && Object.hasOwn(post, 'id') && typeof post.id === 'string' && /^[1-9][0-9]{18}$/.test(post.id), 'invalid native 19-digit string id');
  check(Object.hasOwn(post, 'title') && typeof post.title === 'string' && post.title.trim(), 'invalid native title');
  check(post.job_post_info == null || object(post.job_post_info), 'invalid native job_post_info');
  // Shared validation guards independent nested JD/custom fields and invalid named metadata.
  const normalized = feishu.normalizePost(post, { ...p, linkTemplate: p.url + '/position/{id}/detail' });
  return { ...normalized, title: post.title, duty: post.description ?? '', requirements: post.requirement ?? '', jdComplete: false,
    channels: ['校招', '校园招聘'].includes(post.recruit_type?.parent?.name) ? ['campus'] : [],
    employment: ['实习', '实习生'].includes(post.recruit_type?.name) ? 'internship' : null, sourceStatus: null };
}
function boundRecord(job, site) {
  check(object(job) && equal(Object.keys(job), ['post']), 'native post binding');
  return record(job.post, site);
}
function validateJobs(jobs, site) {
  profile(site); check(Array.isArray(jobs) && jobs.length > 0, 'no usable jobs; zero cannot clear existing data');
  const seen = new Set();
  for (const job of jobs) { const j = boundRecord(job, site); check(!seen.has(j.id), 'duplicate official id'); seen.add(j.id); }
  return true;
}
function pageData(page, site, offset) {
  check(object(page) && equal(Object.keys(page).sort(), ['httpStatus', 'request', 'response']) && requestMatches(page.request, requestFor(site, offset)), 'native request URL/method/headers/body binding');
  check(page.httpStatus === 200, 'native HTTP ' + page.httpStatus);
  const body = page.response, d = body?.data;
  check(object(body) && Object.hasOwn(body, 'code') && body.code === 0 && body.success !== false && body.Success !== false && object(d) &&
    Object.hasOwn(d, 'count') && Number.isSafeInteger(d.count) && d.count >= 0 && Object.hasOwn(d, 'job_post_list') &&
    Array.isArray(d.job_post_list) && d.job_post_list.length <= 10 && [...d.job_post_list.keys()].every(i => Object.hasOwn(d.job_post_list, i)), 'native business/list/total failure');
  // A count ceiling is a coverage issue, not grounds to discard available native records.
  return d.count < 10000 ? feishu.extractPage({ status: page.httpStatus, body }) : { total: d.count, jobs: d.job_post_list };
}
function availableResult(evidence, site) {
  const p = profile(site);
  check(object(evidence) && equal(Object.keys(evidence).sort(), ['api', 'issues', 'key', 'pages', 'policy', 'stopped', 'version']) &&
    evidence.version === 2 && evidence.policy === 'available' && evidence.key === p.key && evidence.api === API, 'available evidence source binding');
  check(Array.isArray(evidence.pages) && evidence.pages.length > 0 && evidence.pages.length <= MAX_PAGES &&
    Array.isArray(evidence.issues) && evidence.issues.every(v => typeof v === 'string'), 'available evidence limits/issues');
  const rows = new Map(), totals = new Set(), issues = new Set(evidence.issues);
  let offset = 0, last, duplicates = 0;
  for (const page of evidence.pages) {
    check(!last || last.jobs.length > 0, 'extra request after empty endpoint');
    last = pageData(page, site, offset); totals.add(last.total);
    const expected = Math.min(10, Math.max(0, last.total - offset));
    if (last.jobs.length !== expected) issues.add('offset ' + offset + '列表页不完整/数量矛盾：取得 ' + last.jobs.length + '，官方count推算 ' + expected);
    for (const post of last.jobs) {
      try {
        record(post, site);
        if (rows.has(post.id)) duplicates++;
        else rows.set(post.id, { post }); // Keep the first native order and full raw record, including original JD whitespace.
      } catch (error) { issues.add('列表记录未应用：' + error.message); }
    }
    offset += 10;
  }
  if (evidence.stopped !== null) {
    const stopped = evidence.stopped;
    check(object(stopped) && equal(Object.keys(stopped).sort(), ['error', 'httpStatus', 'request', 'response']) && last.jobs.length > 0 &&
      equal(stopped.request, requestFor(site, offset)) && stopped.error === STOP, 'stopped request binding');
    const { error, ...attempt } = stopped;
    let failed = false; try { pageData(attempt, site, offset); } catch { failed = true; }
    check(failed, 'successful page cannot be disguised as a stopped request');
    check(stopped.response === null, 'stopped response must not retain arbitrary refusal payloads');
    check(stopped.httpStatus === null || Number.isInteger(stopped.httpStatus) && stopped.httpStatus >= 100 && stopped.httpStatus <= 599, 'invalid stopped HTTP status');
    issues.add(STOP + (stopped.httpStatus === null ? '' : '（HTTP ' + stopped.httpStatus + '）'));
  }
  check(rows.size > 0, 'no usable records; zero cannot clear existing data');
  if (duplicates) issues.add('重复官方id ' + duplicates + ' 次，保留首次取得的顺序/完整原记录');
  if (totals.size !== 1 || !totals.has(rows.size)) issues.add('官方total ' + [...totals].join('→') + '；实际唯一岗位 ' + rows.size +
    (totals.size === 1 && last.total > rows.size ? '；尚未取得 ' + (last.total - rows.size) + ' 岗' : ''));
  if (last.jobs.length && offset - 10 + last.jobs.length < last.total) issues.add('分页未穷尽，覆盖待补');
  if ([...totals].some(n => n >= 10000)) issues.add('官方count达到10000或以上，覆盖未验证');
  issues.add(JD_NOTICE);
  const jobs = [...rows.values()]; validateJobs(jobs, site);
  return { complete: false, total: jobs.length, jobs, verification: evidence, issues: [...issues] };
}
function collectAvailable(pages, site, issues = [], stopped = null) {
  profile(site);
  return freeze(availableResult(structuredClone({ version: 2, policy: 'available', key: site.key, api: API, pages, issues, stopped }), site));
}
function validateEvidence(evidence, jobs, site) {
  const result = availableResult(evidence, site); check(equal(jobs, result.jobs), 'available jobs/native evidence binding'); return result;
}
function normalizeRecord(job, site) { return boundRecord(job, site); }
function portalNotice(site) {
  if (!verifiedSource(site)) return '';
  return '仅覆盖百川智能官网646926校园招聘入口，项目/职能不限，不含其它门户；' + JD_NOTICE +
    '，完整性未验证，不代表公司全球全集；仅按具名实习类型及明确校园parent取证，人才计划、可靠日期、原状态及其它性质未知。';
}
async function fetchAvailable(site, options = {}) {
  const p = profile(site);
  if (!options.fetchImpl) {
    // Choose the website's own pagination directly; never fall back to Chrome after an unsigned refusal.
    const native = await (options.nativeCollect || require('../native-ui').collect)(site, options);
    return collectAvailable(native.pages, site, native.issues);
  }
  const { fetchImpl = globalThis.fetch, sleep = ms => new Promise(r => setTimeout(r, ms)), maxPages = MAX_PAGES, now = Date.now } = options;
  check(typeof fetchImpl === 'function' && typeof sleep === 'function' && typeof now === 'function' &&
    Number.isSafeInteger(maxPages) && maxPages > 0 && maxPages <= MAX_PAGES, 'invalid request limits');
  const deadline = now() + PROCESS_MS, pages = [], issues = []; let stopped = null;
  const signal = () => { const left = deadline - now(); check(left > 0, 'process safety deadline'); return AbortSignal.timeout(Math.min(15000, Math.ceil(left))); };
  const bootstrap = await fetchImpl(p.url, { method: 'GET', headers: {}, redirect: 'error', signal: signal() });
  check(bootstrap?.status === 200, 'bootstrap HTTP ' + bootstrap?.status); await bootstrap.text();
  // Ordinary native Node requests only: no captured website signature, SDK, UA, CSRF or website-path fabrication.
  for (let n = 0; n < maxPages; n++) {
    if (now() + 200 >= deadline) { issues.push('达到进程安全时限，覆盖待补'); break; }
    const attempt = { request: requestFor(site, n * 10), httpStatus: null, response: null }; let sent = false;
    try {
      await sleep(200); const timeout = signal(); sent = true;
      const r = await fetchImpl(attempt.request.url, { method: 'POST', headers: attempt.request.headers, body: JSON.stringify(attempt.request.body), redirect: 'error', signal: timeout });
      attempt.httpStatus = r?.status ?? null; check(attempt.httpStatus === 200, 'native HTTP ' + attempt.httpStatus);
      attempt.response = await r.json(); const d = pageData(attempt, site, n * 10); pages.push(attempt);
      if (!d.jobs.length || n * 10 + d.jobs.length >= d.total) break;
      if (n + 1 === maxPages) issues.push('达到分页安全上限，覆盖待补');
    } catch (error) {
      if (!pages.length) throw error;
      if (sent) stopped = { ...attempt, response: null, error: STOP };
      else issues.push('达到进程安全时限，覆盖待补');
      break; // Refusal stops this source immediately; no retry or browser fallback.
    }
  }
  return collectAvailable(pages, site, issues, stopped);
}
async function run(args, options = {}) {
  check(Array.isArray(args) && args.length === 2 && typeof args[0] === 'string' && typeof args[1] === 'string' && args[1], 'Usage: baichuan_portal.js <siteJSON> <outputFile>');
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
