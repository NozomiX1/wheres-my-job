'use strict';
const fs = require('node:fs');
const { randomUUID } = require('node:crypto');
const { isDeepStrictEqual: equal } = require('node:util');
const { htmlText } = require('../jd-text');
const ORIGIN = 'https://jobs.bilibili.com', CSRF_API = ORIGIN + '/api/auth/v1/csrf/token';
const ADAPTER = 'bilibili-portal-v1', MAX_PAGES = 200, PROCESS_MS = 900000;
const JD_NOTICE = '已收录列表JD，详情正文完整性待核验';
const STOP_NOTICE = '请求失败，已停止后续请求';
const check = (ok, message) => { if (!ok) throw new Error('Bilibili: ' + message); };
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
function freeze(value) {
  if (value && typeof value === 'object') { Object.values(value).forEach(freeze); Object.freeze(value); }
  return value;
}
const PROFILES = freeze(['campus', 'social'].map(track => ({
  key: track === 'campus' ? 'bilibili' : 'bilibili_social', company: 'B站', ats: 'custom', adapter: ADAPTER,
  track, batch: track === 'campus' ? '校园招聘（应届＋实习，项目/性质不限）' : '社会招聘入口（性质不限）', exclude: '(无)', origin: ORIGIN,
  url: ORIGIN + '/' + track + '/positions', api: ORIGIN + '/api/' + (track === 'campus' ? 'campus' : 'srs') + '/position/positionList', listJD: true,
  body: { pageSize: 10, pageNum: 1, positionName: '', postCode: [], postCodeList: [], workLocationList: [], workTypeList: [],
    positionTypeList: [], deptCodeList: [], recruitType: track === 'campus' ? null : 0, practiceTypes: [], onlyHotRecruit: 0 }
})));
function requiresVerification(site) {
  if (PROFILES.some(p => p.key === site?.key) || site?.adapter === ADAPTER) return true;
  return ['origin', 'apiOrigin', 'api', 'url', 'detailApi'].some(k => {
    if (typeof site?.[k] !== 'string') return false;
    const uri = site[k].replace(/^(GET|POST)\s+/, '');
    try { return ['jobs.bilibili.com', 'campus.bilibili.com'].includes(new URL(uri).hostname.toLowerCase().replace(/\.$/, '')); }
    catch { return /^(?:https?:\/\/)?(?:[^/?#]*@)?(?:jobs|campus)\.bilibili\.com\.?(?=[:/?#]|$)/i.test(uri); }
    // Only this portal's malformed declarations are gated, not unrelated ordinary sources.
  });
}
function verifiedSource(site) { return PROFILES.some(p => equal(site, p)); }
function profile(site) { check(verifiedSource(site), 'unverified source identity/scope/mode'); return PROFILES.find(p => p.key === site.key); }
function publicHeaders(p) {
  return { 'X-UserType': '2', 'X-AppKey': 'ops.ehr-api.auth', Accept: 'application/json', Origin: ORIGIN, Referer: p.url, 'X-Channel': p.track };
}
function requestFor(site, pageNum) {
  const p = profile(site);
  check(Number.isSafeInteger(pageNum) && pageNum > 0 && pageNum <= MAX_PAGES, 'unverified page');
  return { url: p.api, method: 'POST', headers: { ...publicHeaders(p), 'Content-Type': 'application/json' }, body: { ...p.body, pageNum } };
}
function record(post) {
  check(object(post) && Object.hasOwn(post, 'id') && Number.isSafeInteger(post.id) && post.id > 0, 'invalid native id');
  check(Object.hasOwn(post, 'positionName') && typeof post.positionName === 'string' && post.positionName.trim(), 'invalid native title');
  for (const field of ['positionDescription', 'positionTypeName', 'postCodeName', 'workLocation'])
    check(Object.hasOwn(post, field) && (post[field] === null || typeof post[field] === 'string'), 'missing/invalid native ' + field);
  // The renderer also knows these optional detail fields; a new nonempty list field must not silently lose JD.
  for (const field of ['positionDescriptions', 'jobHighlights', 'deptIntro'])
    check(!Object.hasOwn(post, field) || post[field] === null || post[field] === '', 'unverified extra JD field ' + field);
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
  check(object(page) && equal(Object.keys(page).sort(), ['httpStatus', 'request', 'response']) &&
    equal(page.request, requestFor(site, index)), 'native request URL/method/headers/body/page binding');
  check(page.httpStatus === 200, 'native HTTP ' + page.httpStatus);
  const j = page.response;
  check(object(j) && equal(Object.keys(j).sort(), ['code', 'data', 'message']) && j.code === 0 && j.message === 'success', 'native business refusal/unknown response');
  const d = j.data;
  check(object(d) && equal(Object.keys(d).sort(), ['list', 'pages', 'size', 'total']) && Array.isArray(d.list) && d.list.length <= 10 &&
    [...d.list.keys()].every(i => Object.hasOwn(d.list, i)), 'missing/invalid native list');
  check(Number.isSafeInteger(d.total) && d.total >= 0 && Number.isSafeInteger(d.pages) && d.pages >= 0 &&
    (!(d.total || d.list.length) || d.pages > 0) && Number.isSafeInteger(d.size) && d.size >= d.list.length && d.size <= 10, 'missing/invalid native pagination');
  return d;
}
// Native tail pages is recomputed using actual size (411/1 => 411, 479/9 => 54), not requested pageSize 10.
function atEnd(d, n) { return d.list.length === 0 || n * 10 >= d.total || n >= d.pages; }
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
    const d = pageData(page, site, nextPage); totals.add(d.total);
    for (const post of d.list) {
      try {
        record(post);
        if (rows.has(post.id)) duplicates++;
        else rows.set(post.id, { post }); // First original title/order/JD wins, including #012830; no UI title filtering.
      } catch (error) { issues.add('列表记录未应用：' + error.message); }
    }
    if (d.list.length === 0 && nextPage < d.pages) issues.add('提前空页，覆盖待补');
    ended = atEnd(d, nextPage); nextPage++;
  }
  if (evidence.stopped !== null) {
    const stopped = evidence.stopped;
    check(object(stopped) && equal(Object.keys(stopped).sort(), ['error', 'httpStatus', 'request', 'response']) && !ended && nextPage <= MAX_PAGES &&
      equal(stopped.request, requestFor(site, nextPage)) && stopped.error === STOP_NOTICE &&
      (stopped.httpStatus === null || Number.isSafeInteger(stopped.httpStatus) && stopped.httpStatus >= 100 && stopped.httpStatus <= 599), 'stopped request binding');
    const { error, ...attempt } = stopped;
    let failed = false; try { pageData(attempt, site, nextPage); } catch { failed = true; }
    check(failed, 'successful page cannot be disguised as a stopped request');
    check(stopped.response === null, 'stopped response must not retain arbitrary refusal payloads'); issues.add(error);
  }
  check(rows.size > 0, 'no usable records; zero cannot clear existing data');
  if (duplicates) issues.add('重复官方id ' + duplicates + ' 次，保留首次取得的标题/顺序/正文');
  if (totals.size !== 1 || !totals.has(rows.size)) issues.add('官方total ' + [...totals].join('→') + '；实际唯一岗位 ' + rows.size);
  if (!ended) issues.add('分页未穷尽，覆盖待补');
  issues.add(JD_NOTICE);
  const jobs = [...rows.values()]; validateJobs(jobs, site);
  return { complete: false, total: jobs.length, jobs, verification: evidence, issues: [...issues] };
}
function collectAvailable(pages, site, issues = [], stopped = null) {
  const p = profile(site);
  return freeze(availableResult(structuredClone({ version: 2, policy: 'available', key: p.key, api: p.api, pages, issues, stopped }), site));
}
function validateEvidence(evidence, jobs, site) {
  const result = availableResult(evidence, site); check(equal(jobs, result.jobs), 'available jobs/native evidence binding'); return result;
}
function normalizeRecord(job, site) {
  const post = boundRecord(job, site), internship = post.positionTypeName === '实习';
  return { id: String(post.id), title: post.positionName, city: post.workLocation ?? '', category: post.postCodeName ?? '',
    channels: internship ? [] : [site.track], employment: internship ? 'internship' : post.positionTypeName === '全职' ? 'full-time' : null,
    talentPlan: null, date: null, dateKind: null, sourceStatus: null,
    // Official app router: w(track) declares child path "positions/:id" under /campus and /social.
    url: ORIGIN + '/' + site.track + '/positions/' + post.id, duty: '', requirements: '', description: htmlText(post.positionDescription), jdComplete: false };
}
function portalNotice(site) {
  if (!verifiedSource(site)) return '';
  return (site.track === 'campus' ? '仅覆盖官网校园招聘入口（应届及实习），项目/性质/职能不限；' : '仅覆盖官网社会招聘入口，性质/职能不限；') +
    JD_NOTICE + '，完整性未验证，不代表公司全球全集；保留官网原标题及完整列表描述，实习不推定校园渠道，人才计划、原状态和可靠日期未知。';
}
async function fetchAvailable(site, options = {}) {
  const p = profile(site);
  const { fetchImpl = globalThis.fetch, sleep = ms => new Promise(r => setTimeout(r, ms)), maxPages = MAX_PAGES, now = Date.now } = options;
  check(typeof fetchImpl === 'function' && typeof sleep === 'function' && typeof now === 'function' &&
    Number.isSafeInteger(maxPages) && maxPages > 0 && maxPages <= MAX_PAGES, 'invalid request limits');
  const deadline = now() + PROCESS_MS, cookies = new Map(), secrets = new Set(), pages = [], issues = [];
  let requested = false, sent = false, csrf, stopped = null;
  // Same-origin anonymous cookie jar, following ali_social_common; session material never enters evidence.
  function cookieHeader(url) {
    const u = new URL(url);
    return [...cookies.values()].filter(c => c.expires > now() && (!c.secure || u.protocol === 'https:') &&
      (u.pathname === c.path || u.pathname.startsWith(c.path.endsWith('/') ? c.path : c.path + '/'))).map(c => c.name + '=' + c.value).join('; ');
  }
  function acceptCookies(response, url) {
    const u = new URL(url);
    for (const raw of response.headers?.getSetCookie?.() ?? []) {
      const [pair, ...attributes] = raw.split(';'), at = pair.indexOf('=');
      if (at < 1) continue;
      const name = pair.slice(0, at).trim(), value = pair.slice(at + 1).trim();
      const attrs = Object.fromEntries(attributes.map(a => { const [k, ...v] = a.trim().split('='); return [k.toLowerCase(), v.join('=')]; }));
      const domain = attrs.domain?.toLowerCase().replace(/^\./, '');
      if (domain && u.hostname !== domain && !u.hostname.endsWith('.' + domain)) continue;
      const path = attrs.path?.startsWith('/') ? attrs.path : u.pathname.slice(0, u.pathname.lastIndexOf('/')) || '/';
      const expires = attrs['max-age'] !== undefined ? now() + Number(attrs['max-age']) * 1000 : attrs.expires ? Date.parse(attrs.expires) : Infinity;
      cookies.set(name + ':' + path, { name, value, path, expires, secure: Object.hasOwn(attrs, 'secure') });
    }
  }
  async function request(url, method, publicHeaders, body) {
    if (requested) await sleep(200); // Previous body was consumed before this delay: no overlapping response reads.
    requested = true; const remaining = deadline - now(); check(remaining > 0, 'process safety deadline');
    const headers = { ...publicHeaders }, cookie = cookieHeader(url);
    if (cookie) { headers.Cookie = cookie; secrets.add(cookie); }
    if (method === 'POST') { headers['X-CSRF'] = csrf; sent = true; }
    const response = await fetchImpl(url, { method, headers, ...(body ? { body: JSON.stringify(body) } : {}),
      redirect: 'error', signal: AbortSignal.timeout(Math.min(15000, Math.ceil(remaining))) });
    acceptCookies(response, url); return response;
  }
  try {
    const bootstrap = await request(p.url, 'GET', {});
    check(bootstrap?.status === 200, 'bootstrap refused'); await bootstrap.text();
    const tokenResponse = await request(CSRF_API, 'GET', publicHeaders(p));
    check(tokenResponse?.status === 200, 'CSRF refused'); const token = await tokenResponse.json();
    check(object(token) && token.code === 0 && typeof token.data === 'string' && token.data.length > 0 &&
      token.data !== '[REDACTED]' && !/[\u0000-\u0020\u007f]/.test(token.data), 'normal anonymous CSRF absent');
    csrf = token.data; secrets.add(csrf);
  } catch { throw new Error('Bilibili: anonymous bootstrap/CSRF failed'); }
  for (let n = 1; n <= maxPages; n++) {
    if (now() + 200 >= deadline) { issues.push('达到进程安全时限，覆盖待补'); break; }
    const attempt = { request: requestFor(site, n), httpStatus: null, response: null }; sent = false;
    try {
      const r = await request(p.api, 'POST', attempt.request.headers, attempt.request.body);
      attempt.httpStatus = r?.status ?? null; check(attempt.httpStatus === 200, 'native HTTP refused'); attempt.response = await r.json();
      const serialized = JSON.stringify(attempt.response);
      check(![...secrets].some(secret => serialized.includes(secret)), 'session material in response');
      const d = pageData(attempt, site, n); pages.push(attempt);
      if (atEnd(d, n)) break;
      if (n === maxPages) issues.push('达到分页安全上限，覆盖待补');
    } catch {
      if (!pages.length) throw new Error('Bilibili: list request failed');
      if (!sent) { issues.push(now() >= deadline ? '达到进程安全时限，覆盖待补' : '请求未发送，覆盖待补'); break; }
      if (attempt.httpStatus === 200 && object(attempt.response) && attempt.response.code === 0)
        issues.push('官网HTTP/业务成功；响应未通过本地校验，覆盖待补');
      stopped = { ...attempt, response: null, error: STOP_NOTICE }; break; // Generic stop does not attribute a local schema failure to website refusal; no retry.
    }
  }
  return collectAvailable(pages, site, issues, stopped);
}
async function run(args, options = {}) {
  check(Array.isArray(args) && args.length === 2 && typeof args[0] === 'string' && typeof args[1] === 'string' && args[1], 'Usage: bilibili_portal.js <siteJSON> <outputFile>');
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
