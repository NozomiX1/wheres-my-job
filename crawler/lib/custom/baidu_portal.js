'use strict';
const fs = require('node:fs');
const { randomUUID } = require('node:crypto');
const { isDeepStrictEqual: equal } = require('node:util');
const ORIGIN = 'https://talent.baidu.com', API = ORIGIN + '/httservice/getPostListNew';
const ADAPTER = 'baidu-portal-v1', MAX_PAGES = 200, PROCESS_MS = 900000;
const CONTENT_TYPE = 'application/x-www-form-urlencoded;charset=utf-8';
const JD_NOTICE = '已收录列表JD，详情正文完整性待核验';
const check = (ok, message) => { if (!ok) throw new Error('Baidu: ' + message); };
function freeze(value) {
  if (value && typeof value === 'object') { Object.values(value).forEach(freeze); Object.freeze(value); }
  return value;
}
const PROFILES = freeze(['campus', 'social'].map(track => ({
  key: track === 'campus' ? 'baidu' : 'baidu_social', company: '百度', ats: 'custom', adapter: ADAPTER,
  track, batch: track === 'campus' ? '校园招聘（应届＋实习，项目不限）' : '社招', exclude: '(无)', origin: ORIGIN,
  api: API, url: ORIGIN + (track === 'campus' ? '/jobs/list' : '/jobs/social-list'), listJD: true,
  body: { recruitTypes: track === 'campus' ? ['GRADUATE', 'INTERN'] : ['SOCIAL'], pageSize: 10, keyWord: '', projectType: '' }
})));
function requiresVerification(site) {
  if (PROFILES.some(p => p.key === site?.key) || site?.adapter === ADAPTER) return true;
  return ['origin', 'apiOrigin', 'api', 'url', 'detailApi'].some(k => {
    if (!site || !Object.hasOwn(site, k)) return false;
    try { check(typeof site[k] === 'string', 'invalid URI'); return new URL(site[k].replace(/^(GET|POST)\s+/, '')).hostname.toLowerCase().replace(/\.$/, '') === 'talent.baidu.com'; }
    catch { return true; } // Malformed declarations must not downgrade to a generic adapter.
  });
}
function verifiedSource(site) { return PROFILES.some(p => equal(site, p)); }
function profile(site) { check(verifiedSource(site), 'unverified source identity/scope/mode'); return PROFILES.find(p => p.key === site.key); }
function requestFor(site, recruitType, curPage) {
  const p = profile(site); check(p.body.recruitTypes.includes(recruitType), 'unverified recruitType');
  return { url: API, method: 'POST', headers: { 'Content-Type': CONTENT_TYPE,
    Referer: p.track === 'social' ? p.url : p.url + '?search=&recruitType=' + recruitType },
    body: { recruitType, curPage, pageSize: 10, keyWord: '', projectType: '' } };
}
function record(post) {
  check(post && typeof post === 'object' && !Array.isArray(post), 'invalid native post');
  check(Object.hasOwn(post, 'postId') && typeof post.postId === 'string' && /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(post.postId), 'invalid UUID postId');
  check(Object.hasOwn(post, 'name') && typeof post.name === 'string' && post.name.trim(), 'invalid native title');
  for (const field of ['workContent', 'serviceCondition', 'workPlace', 'postType'])
    check(Object.hasOwn(post, field) && (post[field] === null || typeof post[field] === 'string'), 'missing/invalid native ' + field);
  return post;
}
function boundRecord(job, site) {
  const p = profile(site);
  check(job && equal(Object.keys(job).sort(), ['post', 'recruitType']) && p.body.recruitTypes.includes(job.recruitType), 'native post/recruitType binding');
  return record(job.post);
}
function validateJobs(jobs, site) {
  profile(site); check(Array.isArray(jobs) && jobs.length > 0, 'no usable jobs; zero cannot clear existing data');
  const seen = new Set();
  for (const job of jobs) { const post = boundRecord(job, site); check(!seen.has(post.postId), 'duplicate postId'); seen.add(post.postId); }
  return true;
}
function nativeTotal(value) {
  check(typeof value === 'number' || typeof value === 'string' && /^[0-9]+$/.test(value), 'invalid native total');
  const total = Number(value); check(Number.isSafeInteger(total) && total >= 0, 'invalid native total'); return total;
}
function pageData(page, site, recruitType, index) {
  check(page?.recruitType === recruitType && equal(page.request, requestFor(site, recruitType, index)), 'native request URL/method/headers/body/type binding');
  check(page.httpStatus === 200, 'native HTTP ' + page.httpStatus);
  const j = page.response;
  check(j && typeof j === 'object' && !Array.isArray(j) && j.status === 'ok', 'native business refusal');
  const d = j.data;
  check(d && typeof d === 'object' && !Array.isArray(d) && d.pageNum === index && d.pageSize === 10 && Array.isArray(d.list), 'missing/invalid native list/page');
  const total = nativeTotal(d.total);
  check(d.list.length <= 10 && [...d.list.keys()].every(i => Object.hasOwn(d.list, i)), 'invalid native list slots');
  if (Object.hasOwn(d, 'pages')) check(Number.isSafeInteger(d.pages) && d.pages >= 0 && (!(total || d.list.length) || d.pages > 0), 'invalid native pages');
  return d;
}
function atEnd(d, n) { return d.list.length === 0 || Object.hasOwn(d, 'pages') && n >= d.pages; }
function availableResult(evidence, site) {
  const p = profile(site), types = p.body.recruitTypes;
  check(evidence?.version === 2 && evidence.policy === 'available' && evidence.key === p.key && evidence.api === API, 'available evidence source binding');
  check(Array.isArray(evidence.pages) && evidence.pages.length > 0 && evidence.pages.length <= MAX_PAGES * types.length &&
    Array.isArray(evidence.issues) && evidence.issues.every(v => typeof v === 'string'), 'available evidence limits/issues');
  const rows = new Map(), totals = types.map(() => new Set()), counts = types.map(() => new Set()), issues = new Set(evidence.issues);
  let typeIndex = 0, nextPage = 1, ended = false, duplicates = 0;
  // Advance only at a native pages boundary or empty EOF; each type gets one contiguous scan.
  function advance() { if (ended) { typeIndex++; nextPage = 1; ended = false; } }
  for (const page of evidence.pages) {
    advance(); check(typeIndex < types.length && nextPage <= MAX_PAGES, 'extra request after endpoint/safety limit');
    const recruitType = types[typeIndex], d = pageData(page, site, recruitType, nextPage); totals[typeIndex].add(nativeTotal(d.total));
    for (const post of d.list) {
      try {
        record(post); counts[typeIndex].add(post.postId);
        if (rows.has(post.postId)) duplicates++;
        else rows.set(post.postId, { recruitType, post }); // First official type/order wins; later blank JD cannot erase it.
      } catch (error) { issues.add('列表记录未应用：' + error.message); }
    }
    ended = atEnd(d, nextPage); nextPage++;
  }
  if (evidence.stopped != null) {
    advance(); const stopped = evidence.stopped;
    check(typeIndex < types.length && nextPage <= MAX_PAGES && stopped.recruitType === types[typeIndex] &&
      equal(stopped.request, requestFor(site, types[typeIndex], nextPage)) && typeof stopped.error === 'string' && stopped.error.length > 0, 'stopped request binding');
    let failed = false; try { pageData(stopped, site, types[typeIndex], nextPage); } catch { failed = true; }
    check(failed, 'successful page cannot be disguised as a stopped request'); issues.add('请求停止：' + stopped.error);
  }
  check(rows.size > 0, 'no usable records; zero cannot clear existing data');
  if (duplicates) issues.add('重复postId ' + duplicates + ' 次，保留首次取得的官网类型/顺序/正文');
  for (let i = 0; i < types.length; i++) {
    if (!totals[i].size) issues.add(types[i] + '尚未取得可用列表，覆盖待补');
    else if (totals[i].size !== 1 || !totals[i].has(counts[i].size)) issues.add(types[i] + '官方total ' + [...totals[i]].join('→') + '；实际唯一岗位 ' + counts[i].size);
  }
  if (typeIndex < types.length && !ended && totals[typeIndex].size) issues.add(types[typeIndex] + '分页未穷尽，覆盖待补');
  issues.add(JD_NOTICE);
  const jobs = [...rows.values()]; validateJobs(jobs, site);
  return { complete: false, total: jobs.length, jobs, verification: evidence, issues: [...issues] };
}
function collectAvailable(pages, site, issues = [], stopped = null) {
  profile(site); return availableResult({ version: 2, policy: 'available', key: site.key, api: API, pages, issues, stopped }, site);
}
function validateEvidence(evidence, jobs, site) {
  const result = availableResult(evidence, site); check(equal(jobs, result.jobs), 'available jobs/native evidence binding'); return result;
}
function normalizeRecord(job, site) {
  const post = boundRecord(job, site), type = job.recruitType;
  return { id: post.postId, title: post.name, city: post.workPlace ?? '', category: post.postType ?? '',
    channels: type === 'INTERN' ? [] : [type === 'GRADUATE' ? 'campus' : 'social'], employment: type === 'INTERN' ? 'internship' : null,
    talentPlan: null, date: null, dateKind: null, sourceStatus: null,
    url: ORIGIN + '/jobs/detail/' + type + '/' + post.postId, duty: post.workContent ?? '', requirements: post.serviceCondition ?? '', description: '', jdComplete: false };
}
function portalNotice(site) {
  if (!verifiedSource(site)) return '';
  return (site.track === 'campus' ? '仅覆盖官网GRADUATE应届及INTERN实习列表，关键词/项目不限；' : '仅覆盖官网默认无筛选SOCIAL社招列表；') +
    JD_NOTICE + '，完整性未验证，不代表公司全球全集；应届/社招性质、人才计划、原状态和可靠日期未知，实习不推定校园渠道。';
}
async function fetchAvailable(site, options = {}) {
  const p = profile(site);
  const { fetchImpl = globalThis.fetch, sleep = ms => new Promise(r => setTimeout(r, ms)), maxPages = MAX_PAGES, now = Date.now } = options;
  check(typeof fetchImpl === 'function' && typeof sleep === 'function' && typeof now === 'function' && Number.isSafeInteger(maxPages) && maxPages > 0 && maxPages <= MAX_PAGES, 'invalid request limits');
  const deadline = now() + PROCESS_MS, pages = [], issues = []; let stopped = null;
  scan: for (const recruitType of p.body.recruitTypes) {
    for (let n = 1; n <= maxPages; n++) {
      if (now() + 200 >= deadline) { issues.push('达到进程安全时限，覆盖待补'); break scan; }
      const attempt = { recruitType, request: requestFor(site, recruitType, n), httpStatus: null, response: null }; let sent = false;
      try {
        await sleep(200); // Await the previous response body before delaying; no body overlap.
        const remaining = deadline - now(); check(remaining > 0, 'process safety deadline'); sent = true;
        const r = await fetchImpl(API, { method: 'POST', headers: attempt.request.headers, body: new URLSearchParams(attempt.request.body).toString(),
          redirect: 'error', signal: AbortSignal.timeout(Math.min(15000, Math.ceil(remaining))) });
        attempt.httpStatus = r?.status ?? null; check(attempt.httpStatus === 200, 'native HTTP ' + attempt.httpStatus);
        attempt.response = await r.json(); const d = pageData(attempt, site, recruitType, n); pages.push(attempt);
        if (atEnd(d, n)) break;
        if (n === maxPages) { issues.push(recruitType + '达到分页安全上限，覆盖待补'); break scan; }
      } catch (error) {
        if (!pages.length) throw error;
        if (sent) stopped = { ...attempt, error: String(error?.message || error || 'request failure') };
        else issues.push('达到进程安全时限，覆盖待补');
        break scan; // A refusal or failed request stops this entire source, not just one type. No retries.
      }
    }
  }
  return collectAvailable(pages, site, issues, stopped);
}
async function run(args, options = {}) {
  check(Array.isArray(args) && args.length === 2 && typeof args[0] === 'string' && typeof args[1] === 'string' && args[1], 'Usage: baidu_portal.js <siteJSON> <outputFile>');
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
