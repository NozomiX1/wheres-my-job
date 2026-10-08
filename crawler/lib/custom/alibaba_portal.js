'use strict';
const fs = require('node:fs');
const { randomUUID } = require('node:crypto');
const { isDeepStrictEqual: equal } = require('node:util');
const ORIGIN = 'https://campus-talent.alibaba.com', API = ORIGIN + '/position/search';
const ADAPTER = 'alibaba-portal-v1', MAX_PAGES = 200, PROCESS_MS = 900000;
const JD_NOTICE = '已收录列表JD，详情正文完整性待核验';
const check = (ok, message) => { if (!ok) throw new Error('Alibaba: ' + message); };
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
function freeze(value) {
  if (value && typeof value === 'object') { Object.values(value).forEach(freeze); Object.freeze(value); }
  return value;
}
const PROFILES = freeze([{
  key: 'alibaba', company: '阿里巴巴', ats: 'custom', adapter: ADAPTER, track: 'campus',
  batch: '校园招聘（应届＋日常/研究实习，项目不限）', exclude: '(无)', origin: ORIGIN,
  url: ORIGIN + '/campus/position', api: API, listJD: true,
  body: { batchIds: [100000760001, 100000560002, 100000560001], pageSize: 10, customDeptCode: '', channel: 'campus_group_official_site', language: 'zh' }
}]);
function requiresVerification(site) {
  if (site?.key === 'alibaba' || site?.adapter === ADAPTER) return true;
  return ['origin', 'apiOrigin', 'api', 'url', 'detailApi', 'batchApi'].some(k => {
    if (!site || !Object.hasOwn(site, k)) return false;
    try { check(typeof site[k] === 'string', 'invalid URI'); return new URL(site[k].replace(/^(GET|POST)\s+/, '')).hostname.toLowerCase().replace(/\.$/, '') === 'campus-talent.alibaba.com'; }
    catch { return true; } // Malformed declarations must not downgrade to a generic adapter.
  });
}
function verifiedSource(site) { return equal(site, PROFILES[0]); }
function profile(site) { check(verifiedSource(site), 'unverified source identity/scope/mode'); return PROFILES[0]; }
function requestFor(site, batchId, pageIndex) {
  const p = profile(site);
  check(p.body.batchIds.includes(batchId) && Number.isSafeInteger(pageIndex) && pageIndex > 0 && pageIndex <= MAX_PAGES, 'unverified batch/page');
  return { url: API, method: 'POST', headers: { 'Content-Type': 'application/json', Origin: ORIGIN, Referer: p.url + '?batchId=' + batchId },
    body: { batchId, pageIndex, pageSize: 10, customDeptCode: '', channel: 'campus_group_official_site', language: 'zh' } };
}
function record(post, batchId) {
  check(object(post) && Object.hasOwn(post, 'id') && Number.isSafeInteger(post.id) && post.id > 0, 'invalid native id');
  check(Object.hasOwn(post, 'name') && typeof post.name === 'string' && post.name.trim(), 'invalid native title');
  check(Object.hasOwn(post, 'batchId') && post.batchId === batchId, 'native batchId binding');
  check(Object.hasOwn(post, 'positionUrl') && post.positionUrl === null, 'unverified native positionUrl');
  for (const field of ['description', 'requirement'])
    check(Object.hasOwn(post, field) && (post[field] === null || typeof post[field] === 'string'), 'missing/invalid native ' + field);
  for (const field of ['workLocations', 'categories'])
    check(Object.hasOwn(post, field) && (post[field] === null || Array.isArray(post[field]) &&
      [...post[field].keys()].every(i => Object.hasOwn(post[field], i) && typeof post[field][i] === 'string')), 'missing/invalid native ' + field);
  return post;
}
function boundRecord(job, site) {
  const p = profile(site);
  check(object(job) && equal(Object.keys(job).sort(), ['batchId', 'post']) && p.body.batchIds.includes(job.batchId), 'native post/batch binding');
  return record(job.post, job.batchId);
}
function validateJobs(jobs, site) {
  profile(site); check(Array.isArray(jobs) && jobs.length > 0, 'no usable jobs; zero cannot clear existing data');
  const seen = new Set();
  for (const job of jobs) { const post = boundRecord(job, site); check(!seen.has(post.id), 'duplicate official id'); seen.add(post.id); }
  return true;
}
function pageData(page, site, batchId, index) {
  check(object(page) && equal(Object.keys(page).sort(), ['batchId', 'httpStatus', 'request', 'response']) && page.batchId === batchId &&
    equal(page.request, requestFor(site, batchId, index)), 'native request URL/method/headers/body/batch binding');
  check(page.httpStatus === 200, 'native HTTP ' + page.httpStatus);
  const j = page.response;
  check(object(j) && equal(Object.keys(j).sort(), ['content', 'errorCode', 'errorMsg', 'success']) && j.success === true &&
    [j.errorCode, j.errorMsg].every(v => v === null || v === ''), 'native business refusal/unknown response');
  const c = j.content;
  check(object(c) && equal(Object.keys(c).sort(), ['currentPage', 'datas', 'pageSize', 'totalCount']) &&
    Array.isArray(c.datas) && c.datas.length <= 10 && [...c.datas.keys()].every(i => Object.hasOwn(c.datas, i)) &&
    c.currentPage === index && c.pageSize === 10, 'missing/invalid native list/page');
  check(Number.isSafeInteger(c.totalCount) && c.totalCount >= 0, 'missing/invalid native total');
  return c;
}
function atEnd(c, index) { return c.datas.length === 0 || index * 10 >= c.totalCount; }
function availableResult(evidence, site) {
  const p = profile(site), batches = p.body.batchIds;
  check(object(evidence) && equal(Object.keys(evidence).sort(), ['api', 'issues', 'key', 'pages', 'policy', 'stopped', 'version']) &&
    evidence.version === 2 && evidence.policy === 'available' && evidence.key === p.key && evidence.api === API, 'available evidence source binding');
  check(Array.isArray(evidence.pages) && evidence.pages.length > 0 && evidence.pages.length <= MAX_PAGES * batches.length &&
    Array.isArray(evidence.issues) && evidence.issues.every(v => typeof v === 'string'), 'available evidence limits/issues');
  const rows = new Map(), totals = batches.map(() => new Set()), counts = batches.map(() => new Set()), issues = new Set(evidence.issues);
  let batchIndex = 0, nextPage = 1, ended = false, duplicates = 0;
  function advance() { if (ended) { batchIndex++; nextPage = 1; ended = false; } }
  for (const page of evidence.pages) {
    advance(); check(batchIndex < batches.length && nextPage <= MAX_PAGES, 'extra request after endpoint/safety limit');
    const batchId = batches[batchIndex], c = pageData(page, site, batchId, nextPage); totals[batchIndex].add(c.totalCount);
    for (const post of c.datas) {
      try {
        record(post, batchId); counts[batchIndex].add(post.id);
        if (rows.has(post.id)) duplicates++;
        else rows.set(post.id, { batchId, post }); // First native batch/order/JD wins; never infer an employer from circleNames.
      } catch (error) { issues.add('列表记录未应用：' + error.message); }
    }
    ended = atEnd(c, nextPage); nextPage++;
  }
  if (evidence.stopped !== null) {
    advance(); const stopped = evidence.stopped;
    check(object(stopped) && equal(Object.keys(stopped).sort(), ['batchId', 'error', 'httpStatus', 'request', 'response']) &&
      batchIndex < batches.length && nextPage <= MAX_PAGES && stopped.batchId === batches[batchIndex] &&
      equal(stopped.request, requestFor(site, batches[batchIndex], nextPage)) && stopped.error === '请求失败，已停止后续请求', 'stopped request binding');
    const { error, ...attempt } = stopped;
    let failed = false; try { pageData(attempt, site, batches[batchIndex], nextPage); } catch { failed = true; }
    check(failed, 'successful page cannot be disguised as a stopped request');
    check(stopped.response === null, 'stopped response must not retain arbitrary refusal payloads'); issues.add(error);
  }
  check(rows.size > 0, 'no usable records; zero cannot clear existing data');
  if (duplicates) issues.add('重复官方id ' + duplicates + ' 次，保留首次取得的批次/顺序/正文');
  for (let i = 0; i < batches.length; i++) {
    if (!totals[i].size) issues.add(batches[i] + '尚未取得可用列表，覆盖待补');
    else if (totals[i].size !== 1 || !totals[i].has(counts[i].size)) issues.add(batches[i] + '官方total ' + [...totals[i]].join('→') + '；实际唯一岗位 ' + counts[i].size);
  }
  if (batchIndex < batches.length && !ended && totals[batchIndex].size) issues.add(batches[batchIndex] + '分页未穷尽，覆盖待补');
  issues.add(JD_NOTICE);
  const jobs = [...rows.values()]; validateJobs(jobs, site);
  return { complete: false, total: jobs.length, jobs, verification: evidence, issues: [...issues] };
}
function collectAvailable(pages, site, issues = [], stopped = null) {
  profile(site);
  // Detach injected response objects, then freeze native pages and their bound raw jobs together.
  return freeze(availableResult(structuredClone({ version: 2, policy: 'available', key: site.key, api: API, pages, issues, stopped }), site));
}
function validateEvidence(evidence, jobs, site) {
  const result = availableResult(evidence, site); check(equal(jobs, result.jobs), 'available jobs/native evidence binding'); return result;
}
function normalizeRecord(job, site) {
  const post = boundRecord(job, site), internship = job.batchId !== PROFILES[0].body.batchIds[0];
  return { id: String(post.id), title: post.name, city: (post.workLocations ?? []).join('/'), category: (post.categories ?? []).join('/'),
    channels: internship ? [] : ['campus'], employment: internship ? 'internship' : null, talentPlan: null, date: null, dateKind: null, sourceStatus: null,
    url: ORIGIN + '/campus/position/' + post.id + '?deptCodes=', duty: post.description ?? '', requirements: post.requirement ?? '', description: '', jdComplete: false };
}
function unitMemberships(jobs, site) {
  validateJobs(jobs, site);
  return Object.fromEntries(jobs.flatMap(job => {
    const names = job.post.circleNames;
    if (names == null) return [];
    check(Array.isArray(names) && [...names.keys()].every(i => Object.hasOwn(names, i) && typeof names[i] === 'string' && names[i].trim()), 'invalid native unit names');
    return names.length ? [[site.key + ':' + job.post.id, [...new Set(names)]]] : [];
  }));
}
function portalNotice(site) {
  if (!verifiedSource(site)) return '';
  return '仅覆盖阿里巴巴校园招聘共享入口的应届、日常及研究实习三批次，项目/职能/业务不限；阿里星与应届共用批次，不另重复采集。' +
    '入口涵盖多个业务集团/公司，不证明岗位归属阿里巴巴控股或任何单一业务单位；' + JD_NOTICE +
    '，完整性未验证，不代表公司全球全集；实习不推定校园渠道，应届性质、人才计划、原状态和可靠日期未知。';
}
async function fetchAvailable(site, options = {}) {
  const p = profile(site);
  const { fetchImpl = globalThis.fetch, sleep = ms => new Promise(r => setTimeout(r, ms)), maxPages = MAX_PAGES, now = Date.now } = options;
  check(typeof fetchImpl === 'function' && typeof sleep === 'function' && typeof now === 'function' &&
    Number.isSafeInteger(maxPages) && maxPages > 0 && maxPages <= MAX_PAGES, 'invalid request limits');
  const deadline = now() + PROCESS_MS, cookies = new Map(), pages = [], issues = []; let requested = false, stopped = null;
  // Same-origin anonymous cookie jar, copied from ali_social_common; never exposed in evidence or on disk.
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
    if (requested) await sleep(200);
    requested = true; const remaining = deadline - now(); check(remaining > 0, 'process safety deadline');
    const headers = { ...publicHeaders }, cookie = cookieHeader(url);
    if (cookie) headers.Cookie = cookie;
    const response = await fetchImpl(url, { method, headers, ...(body ? { body: JSON.stringify(body) } : {}),
      redirect: 'error', signal: AbortSignal.timeout(Math.min(15000, Math.ceil(remaining))) });
    acceptCookies(response, url); return response;
  }
  let csrf;
  try {
    const bootstrap = await request(p.url, 'GET', {});
    check(bootstrap?.status === 200, 'bootstrap HTTP ' + bootstrap?.status);
    const html = await bootstrap.text();
    csrf = html.match(/window\.__sysconfig\s*=\s*\{[\s\S]*?["']?__token__["']?\s*:\s*["']([^"']+)["']/)?.[1];
    if (!csrf) {
      const cookie = cookieHeader(API).split('; ').find(pair => pair.startsWith('XSRF-TOKEN='))?.slice('XSRF-TOKEN='.length);
      if (cookie) csrf = decodeURIComponent(cookie);
    }
  } catch { throw new Error('Alibaba: anonymous bootstrap failed'); }
  check(typeof csrf === 'string' && csrf.length > 0 && csrf !== '[REDACTED]' && !/[\u0000-\u0020]/.test(csrf), 'normal anonymous CSRF absent');
  const api = new URL(API); api.searchParams.set('_csrf', csrf);
  scan: for (const batchId of p.body.batchIds) {
    for (let n = 1; n <= maxPages; n++) {
      if (now() + 200 >= deadline) { issues.push('达到进程安全时限，覆盖待补'); break scan; }
      const attempt = { batchId, request: requestFor(site, batchId, n), httpStatus: null, response: null };
      try {
        const r = await request(api.href, 'POST', attempt.request.headers, attempt.request.body);
        attempt.httpStatus = r?.status ?? null; check(attempt.httpStatus === 200, 'native HTTP ' + attempt.httpStatus);
        attempt.response = await r.json();
        // Do not persist a server echo of the actual CSRF query token.
        check(!JSON.stringify(attempt.response).includes(csrf), 'CSRF token in response');
        const c = pageData(attempt, site, batchId, n); pages.push(attempt);
        if (atEnd(c, n)) break;
        if (n === maxPages) { issues.push(batchId + '达到分页安全上限，覆盖待补'); break scan; }
      } catch {
        // Network/parser errors may contain the real _csrf URL. Do not persist them or arbitrary refusal payloads.
        if (!pages.length) throw new Error('Alibaba: list request failed');
        stopped = { ...attempt, response: null, error: '请求失败，已停止后续请求' }; break scan;
      }
    }
  }
  return collectAvailable(pages, site, issues, stopped);
}
async function run(args, options = {}) {
  check(Array.isArray(args) && args.length === 2 && typeof args[0] === 'string' && typeof args[1] === 'string' && args[1], 'Usage: alibaba_portal.js <siteJSON> <outputFile>');
  const site = JSON.parse(args[0]), result = await fetchAvailable(site, options);
  const envelope = { key: site.key, api: site.api, mode: 'custom', ...result }, file = args[1], temp = file + '.tmp-' + randomUUID(); let created = false;
  try {
    const fd = fs.openSync(temp, 'wx'); created = true;
    try { fs.writeFileSync(fd, JSON.stringify(envelope, null, 2) + '\n', 'utf8'); } finally { fs.closeSync(fd); }
    fs.renameSync(temp, file);
  } finally { if (created && fs.existsSync(temp)) fs.unlinkSync(temp); }
  return envelope;
}
module.exports = { PROFILES, requiresVerification, verifiedSource, validateJobs, normalizeRecord, unitMemberships, portalNotice, validateEvidence, collectAvailable, fetchAvailable, run };
if (require.main === module) run(process.argv.slice(2)).catch(error => { console.error(error.message); process.exitCode = 1; });
