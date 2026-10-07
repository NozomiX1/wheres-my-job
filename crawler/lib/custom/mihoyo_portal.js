// Fixed independently researched scopes; protocol identity is not production qualification.
'use strict';
const fs = require('node:fs');
const { randomUUID } = require('node:crypto');
const { isDeepStrictEqual: equal } = require('node:util');
const ORIGIN = 'https://jobs.mihoyo.com', API_ORIGIN = 'https://ats.openout.mihoyo.com';
const API = API_ORIGIN + '/ats-portal/v1/job/list', DETAIL_API = API_ORIGIN + '/ats-portal/v1/job/info';
const ADAPTER = 'mihoyo-portal-v1', PAGE_SIZE = 10, MAX_PAGES = 200;
function freeze(value) {
  if (value && typeof value === 'object') { Object.values(value).forEach(freeze); Object.freeze(value); }
  return value;
}
// Ordinary public headers only. Node supplies its native UA; no session/token is persisted.
const HEADERS = freeze({ 'Content-Type': 'application/json', Accept: 'application/json', Origin: ORIGIN, Referer: ORIGIN + '/', 'Release-Tag': 'v26.9.0-260805', 'current-request': 'request', 'Accept-Language': 'zh-CN,zh;q=0.9' });
const PROFILES = freeze([
  ['mihoyo', 'campus', 1, '校招', '/campus/position'], ['mihoyo_social', 'social', 0, '社招', '/position']
].map(([key, track, hireType, batch, route]) => ({
  key, company: '米哈游', ats: 'custom', adapter: ADAPTER, track, batch, exclude: '(无)', fetchDetails: true,
  origin: ORIGIN, apiOrigin: API_ORIGIN, url: ORIGIN + '/#' + route, api: API, detailApi: DETAIL_API, headers: HEADERS,
  body: { pageNo: 1, pageSize: PAGE_SIZE, channelDetailIds: [1], hireType }
})));
const LIST_FIELDS = 'id title addressDetailList competencyType jobNatureId jobNature projectName hurry channelDetailIds tagList jobSummary objectId objectName'.split(' ');
const DETAIL_FIELDS = [...LIST_FIELDS, ...'code competencyTypeId description jobRequire addition deliveryInstructions hadDelivery status projectId hireType hireTypeName'.split(' ')];
const SECTIONS = [['jobSummary', '岗位摘要'], ['description', '工作职责'], ['jobRequire', '任职要求'], ['addition', '加分项'], ['deliveryInstructions', '投递说明'], ['objectName', '面向对象']];
const check = (ok, message) => { if (!ok) throw new Error('Mihoyo: ' + message); };
function shape(value, fields, label) {
  check(value && typeof value === 'object' && !Array.isArray(value) && [Object.prototype, null].includes(Object.getPrototypeOf(value)), label + ' object shape');
  const keys = Reflect.ownKeys(value);
  check(keys.length === fields.length && fields.every(k => Object.hasOwn(value, k)) && keys.every(k => typeof k === 'string' && fields.includes(k)), label + ' own fields');
  check(keys.every(k => Object.hasOwn(Object.getOwnPropertyDescriptor(value, k), 'value')), label + ' data fields');
}
function array(value, label) {
  check(Array.isArray(value) && Object.getPrototypeOf(value) === Array.prototype && Reflect.ownKeys(value).length === value.length + 1, label + ' array shape');
  for (let i = 0; i < value.length; i++) check(Object.hasOwn(value, i) && Object.hasOwn(Object.getOwnPropertyDescriptor(value, String(i)), 'value'), label + ' sparse/accessor array');
}
function uri(value) {
  check(typeof value === 'string' && /^https?:\/\/[^/]/i.test(value) && !/[\u0000-\u0020\u007f\\]/.test(value) && !/%(?![0-9a-f]{2})/i.test(value), 'invalid URI');
  const u = new URL(value); check(!u.username && !u.password, 'URI credentials'); return u;
}
function requiresVerification(site) {
  if (PROFILES.some(p => p.key === site?.key) || site?.adapter === ADAPTER) return true;
  for (const field of ['origin', 'apiOrigin', 'api', 'url', 'detailApi']) {
    if (!site || !Object.hasOwn(site, field)) continue;
    try { if (['jobs.mihoyo.com', 'ats.openout.mihoyo.com'].includes(uri(site[field]).hostname.toLowerCase().replace(/\.$/, ''))) return true; }
    catch { return true; } // Invalid declared URIs must not authorize generic ATS fallback.
  }
  return false;
}
function verifiedSource(site) {
  const p = PROFILES.find(p => p.key === site?.key);
  if (!p) return false;
  try {
    shape(site, Object.keys(p), 'source');
    return Object.keys(p).every(k => ['origin', 'apiOrigin', 'api', 'url', 'detailApi'].includes(k) ? uri(site[k]).href === uri(p[k]).href : equal(site[k], p[k]));
  } catch { return false; }
}
function profile(site) {
  check(verifiedSource(site), 'unverified source identity/scope/mode');
  return PROFILES.find(p => p.key === site.key);
}
function portalNotice(site) {
  if (!verifiedSource(site)) return '';
  return '米哈游来源仅覆盖官网当前' + (site.track === 'campus' ? '校园' : '社会') + '招聘默认入口（channelDetailIds=[1]），不代表公司全部渠道；六片完整JD保留官网文本标题及顺序，独立职责/任职要求用于排序，其余片段不另加字段分。第三方编制及其他性质、人才计划和可靠官网日期保持未知；原状态码不证明实际可投性，首次范围迁移退出不表示已核验下架。';
}
const nativeID = value => typeof value === 'string' && /^[1-9]\d*$/.test(value);
function record(job, p, mode = 'detail') {
  shape(job, mode === 'list' ? LIST_FIELDS : DETAIL_FIELDS, 'native ' + mode + ' job');
  check(nativeID(job.id), 'native string identity/route');
  for (const k of ['title', 'competencyType', 'jobNature', 'projectName']) check(typeof job[k] === 'string' && job[k].trim(), 'native text field ' + k);
  for (const k of ['jobSummary', 'objectName']) check(typeof job[k] === 'string', 'native TEXT field ' + k);
  check(Number.isSafeInteger(job.jobNatureId) && job.jobNatureId > 0 && typeof job.hurry === 'boolean', 'native nature/hurry type');
  check(job.objectId === null || nativeID(job.objectId), 'native nullable objectId');
  array(job.tagList, 'tagList'); check(job.tagList.every(v => typeof v === 'string'), 'native tag text');
  array(job.channelDetailIds, 'channels');
  check(job.channelDetailIds.includes(1) && job.channelDetailIds.every(v => Number.isSafeInteger(v) && v > 0) && new Set(job.channelDetailIds).size === job.channelDetailIds.length, 'native channel scope');
  array(job.addressDetailList, 'addresses'); check(job.addressDetailList.length > 0, 'unverified empty addresses');
  const addresses = new Set();
  for (const a of job.addressDetailList) {
    shape(a, ['addressId', 'addressDetail'], 'address');
    check(nativeID(a.addressId) && typeof a.addressDetail === 'string' && a.addressDetail.trim() && !addresses.has(a.addressId), 'native address identity/text');
    addresses.add(a.addressId);
  }
  if (mode === 'detail') {
    for (const k of ['code', 'description', 'jobRequire', 'addition', 'deliveryInstructions', 'hireTypeName']) check(typeof job[k] === 'string', 'native TEXT field ' + k);
    check(nativeID(job.competencyTypeId) && Number.isSafeInteger(job.projectId) && job.projectId > 0, 'native competency/project IDs');
    check(job.hireType === p.body.hireType && job.hireTypeName === (p.track === 'campus' ? '校园招聘' : '社会招聘'), 'native hireType scope');
    check(job.hadDelivery === 0 && Number.isSafeInteger(job.status) && job.status >= 0, 'native anonymous delivery/status');
  }
  return job;
}
function validateJobs(jobs, site) {
  const p = profile(site); array(jobs, 'jobs'); check(jobs.length > 0, 'effective zero has not been verified');
  const ids = new Set();
  for (const job of jobs) { record(job, p); check(!ids.has(job.id), 'duplicate native identity'); ids.add(job.id); }
  return true;
}
function normalizeRecord(job, site) {
  const p = profile(site); record(job, p);
  return {
    id: job.id, title: job.title, city: job.addressDetailList.map(a => a.addressDetail), category: job.competencyType,
    description: SECTIONS.filter(([k]) => job[k] !== '').map(([k, title]) => title + '\n' + job[k]).join('\n\n'),
    duty: job.description, requirements: job.jobRequire, channels: [p.track],
    employment: job.jobNature === '全职' ? 'full-time' : job.jobNature === '实习' ? 'internship' : null,
    talentPlan: null, date: null, dateKind: null, sourceStatus: String(job.status),
    jdComplete: SECTIONS.some(([k]) => /[\p{L}\p{N}]/u.test(job[k])), url: p.url + '/' + job.id
  };
}
function request(p, url, body) { return { url, method: 'POST', headers: { ...p.headers }, body }; }
function listRequest(p, n) { return request(p, p.api, { ...structuredClone(p.body), pageNo: n }); }
function detailRequest(p, id) { return request(p, p.detailApi, { id, channelDetailIds: [1], hireType: p.body.hireType }); }
function response(raw, expected) {
  shape(raw, ['request', 'httpStatus', 'response'], 'raw envelope');
  check(equal(raw.request, expected), 'raw request binding'); check(raw.httpStatus === 200, 'HTTP status');
  const j = raw.response; shape(j, ['code', 'message', 'traceId', 'data', 'success', 'error'], 'native response');
  check(j.code === 0 && j.success === true && j.error === false && typeof j.message === 'string' && typeof j.traceId === 'string', 'native business status/type');
  return j.data;
}
function newState() { return { total: null, rows: [], byId: new Map() }; }
function consumePage(raw, p, n, state, maxPages = MAX_PAGES) {
  const d = response(raw, listRequest(p, n)); shape(d, ['list', 'pageNo', 'pageSize', 'total'], 'native list data');
  check(d.pageNo === n && Number.isSafeInteger(d.pageNo) && d.pageSize === PAGE_SIZE, 'native page echo');
  check(Number.isSafeInteger(d.total) && d.total >= 0, 'native total type'); array(d.list, 'native list');
  if (state.total === null) {
    check(d.total > 0, 'effective zero has not been verified'); state.total = d.total;
    check(Math.ceil(state.total / PAGE_SIZE) + 1 < maxPages, 'page safety ceiling reached');
  }
  const endpoint = n === Math.ceil(state.total / PAGE_SIZE) + 1;
  if (endpoint) {
    check(state.rows.length === state.total && d.total === 0 && d.list.length === 0, 'native total0 endpoint before complete count or wrong shape');
    return true;
  }
  check(n <= Math.ceil(state.total / PAGE_SIZE) && d.total === state.total, 'native in-range total drift');
  check(d.list.length === Math.min(PAGE_SIZE, state.total - state.rows.length), 'native early empty/short page');
  for (const row of d.list) {
    record(row, p, 'list'); check(!state.byId.has(row.id), 'duplicate native identity');
    state.rows.push(row); state.byId.set(row.id, row);
  }
  return false;
}
function consumeDetail(raw, p, listed) {
  const full = record(response(raw, detailRequest(p, listed.id)), p);
  for (const k of LIST_FIELDS) check(equal(full[k], listed[k]), 'list/detail binding ' + k);
  return full;
}
function facts(rows) { return new Map(rows.map(row => [row.id, row])); }
function validateEvidence(evidence, jobs, site) {
  validateJobs(jobs, site); const p = profile(site);
  shape(evidence, ['version', 'key', 'api', 'detailApi', 'scans'], 'verification');
  check(evidence.version === 1 && evidence.key === p.key && evidence.api === p.api && evidence.detailApi === p.detailApi, 'verification source binding');
  array(evidence.scans, 'scans'); check(evidence.scans.length === 2, 'two complete scans required');
  const states = [], details = [];
  for (const scan of evidence.scans) {
    shape(scan, ['pages', 'details'], 'scan'); array(scan.pages, 'pages'); array(scan.details, 'details');
    check(scan.pages.length > 1 && scan.pages.length < MAX_PAGES, 'page safety ceiling / missing endpoint');
    const state = newState(); let ended = false;
    for (let i = 0; i < scan.pages.length; i++) { check(!ended, 'extra page after endpoint'); ended = consumePage(scan.pages[i], p, i + 1, state); }
    check(ended, 'missing native endpoint'); check(scan.details.length === state.total, 'missing/extra necessary details');
    const full = scan.details.map((raw, i) => consumeDetail(raw, p, state.rows[i]));
    validateJobs(full, site); states.push(state); details.push(full);
  }
  check(equal(states[0].byId, states[1].byId), 'full native list set/facts not stable');
  check(equal(facts(details[0]), facts(details[1])), 'full native detail facts/JD not stable');
  check(equal(jobs, details[0]), 'snapshot jobs do not match bound full raw details');
  return true;
}
async function fetchAll(site, options = {}) {
  const p = profile(site);
  const { fetchImpl = globalThis.fetch, sleep = ms => new Promise(resolve => setTimeout(resolve, ms)), delayMs = 200, timeoutMs = 15000, maxPages = MAX_PAGES } = options;
  check(typeof fetchImpl === 'function' && typeof sleep === 'function' && Number.isFinite(delayMs) && delayMs >= 0 && Number.isSafeInteger(timeoutMs) && timeoutMs > 0 && Number.isSafeInteger(maxPages) && maxPages > 1 && maxPages <= MAX_PAGES, 'invalid request limits');
  async function get(req) {
    await sleep(Math.max(200, delayMs));
    const r = await fetchImpl(req.url, { method: req.method, headers: req.headers, body: JSON.stringify(req.body), redirect: 'manual', signal: AbortSignal.timeout(Math.min(15000, timeoutMs)) });
    check(r && r.status === 200, 'HTTP status'); let json;
    try { json = await r.json(); }
    catch (error) { if (error instanceof SyntaxError) throw new Error('Mihoyo: invalid native JSON response'); throw error; }
    return { request: req, httpStatus: r.status, response: json };
  }
  const verification = { version: 1, key: p.key, api: p.api, detailApi: p.detailApi, scans: [] };
  let firstLists; const firstDetails = new Map();
  for (let round = 0; round < 2; round++) {
    if (round) await sleep(15000);
    const scan = { pages: [], details: [] }, state = newState(); let ended = false;
    for (let n = 1; n < maxPages; n++) {
      const raw = await get(listRequest(p, n)); ended = consumePage(raw, p, n, state, maxPages); scan.pages.push(raw);
      if (round) {
        check(state.total === firstLists.size, 'full native list total not stable');
        if (!ended) for (const row of raw.response.data.list) check(equal(row, firstLists.get(row.id)), 'full native list set/facts not stable');
      }
      if (ended) break;
    }
    check(ended, 'page safety ceiling / incomplete endpoint');
    if (!round) firstLists = state.byId;
    for (const listed of state.rows) {
      const raw = await get(detailRequest(p, listed.id)), full = consumeDetail(raw, p, listed);
      if (round) check(equal(full, firstDetails.get(listed.id)), 'full native detail facts/JD not stable');
      else firstDetails.set(listed.id, full);
      scan.details.push(raw);
    }
    verification.scans.push(scan);
  }
  const jobs = verification.scans[0].details.map(raw => raw.response.data); validateEvidence(verification, jobs, site);
  return { complete: true, total: jobs.length, jobs, verification };
}
async function run(args, options = {}) {
  check(Array.isArray(args) && args.length === 2 && typeof args[0] === 'string' && typeof args[1] === 'string' && args[1].length > 0, 'Usage: mihoyo_portal.js <siteJSON> <outputFile>');
  const site = JSON.parse(args[0]); profile(site);
  const result = await fetchAll(site, options), envelope = { key: site.key, api: site.api, mode: 'custom', ...result };
  const file = args[1], temporary = file + '.tmp-' + randomUUID(); let created = false;
  try {
    const fd = fs.openSync(temporary, 'wx'); created = true;
    try { fs.writeFileSync(fd, JSON.stringify(envelope, null, 2) + '\n', 'utf8'); }
    finally { fs.closeSync(fd); }
    fs.renameSync(temporary, file);
  } finally { if (created && fs.existsSync(temporary)) fs.unlinkSync(temporary); }
  return envelope;
}
module.exports = { PROFILES, requiresVerification, verifiedSource, validateJobs, normalizeRecord, validateEvidence, fetchAll, run, portalNotice };
if (require.main === module) run(process.argv.slice(2)).catch(error => { console.error(error.message); process.exitCode = 1; });
