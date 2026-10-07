// Two independently researched scopes; profiles are protocol identities, not production success.
'use strict';
const fs = require('node:fs');
const { randomUUID } = require('node:crypto');
const { isDeepStrictEqual: equal } = require('node:util');
const { normalizeJD, htmlText } = require('../jd-text');
const ORIGIN = 'https://careers.ctrip.com', API = ORIGIN + '/api/hrrecruit/getJobAd';
const ADAPTER = 'ctrip-portal-v1', PAGE_SIZE = 10, MAX_PAGES = 150;
function freeze(value) {
  if (value && typeof value === 'object') { Object.values(value).forEach(freeze); Object.freeze(value); }
  return value;
}
const PROFILES = freeze([
  ['ctrip', 'campus', 2, '校招', 'campus'], ['ctrip_social', 'social', 1, '社招', 'experienced']
].map(([key, track, category, batch, route]) => ({
  key, company: '携程集团', ats: 'custom', adapter: ADAPTER, track, batch, exclude: '(无)', listJD: true,
  apiOrigin: ORIGIN, url: ORIGIN + '/#/' + route + '/jobList', api: API,
  body: { condition: { fromId: [], keyword: '', kind: [], country: [], city: [], bucode: [], jobFamilyCode: [], jobFamilyGroupCode: [], category }, pager: { index: '1', size: '10' }, head: { language: 'zh_CN', version: '1' } }
})));
// Exactly the successful ordinary Node request; no browser UA, cookie, signature or guessed locale.
const HEADERS = freeze({ 'Content-Type': 'application/json;charset=UTF-8', Accept: 'application/json', Origin: ORIGIN, Referer: ORIGIN + '/' });
const FIELDS = 'id fromId jobId jobTitle publishDate city cityName requirements duty jobFamilyGroupCode jobFamilyGroupName buCode buName user hrDutyUser hrUserName channelId internalId kind kindName atsApiType ynShowInterviewDate nextWeekDays dutyUserCode category'.split(' ');
const STRINGS = FIELDS.filter(k => !['city', 'cityName', 'duty', 'internalId', 'ynShowInterviewDate', 'nextWeekDays'].includes(k));
const check = (ok, message) => { if (!ok) throw new Error('Ctrip: ' + message); };
function shape(value, fields, label) {
  check(value && typeof value === 'object' && !Array.isArray(value) && [Object.prototype, null].includes(Object.getPrototypeOf(value)), label + ' object shape');
  const keys = Reflect.ownKeys(value);
  check(keys.length === fields.length && fields.every(k => Object.hasOwn(value, k)) && keys.every(k => typeof k === 'string' && fields.includes(k)), label + ' fields');
  check(keys.every(k => Object.hasOwn(Object.getOwnPropertyDescriptor(value, k), 'value')), label + ' data fields');
}
function array(value, label) {
  check(Array.isArray(value) && Object.getPrototypeOf(value) === Array.prototype && Reflect.ownKeys(value).length === value.length + 1, label + ' array shape');
  for (let i = 0; i < value.length; i++) check(Object.hasOwn(value, i), label + ' sparse array');
}
function uri(value) {
  check(typeof value === 'string' && /^https?:\/\/[^/]/i.test(value) && !/[\u0000-\u0020\u007f\\]/.test(value) && !/%(?![0-9a-f]{2})/i.test(value), 'invalid URI');
  const u = new URL(value); check(!u.username && !u.password, 'URI credentials'); return u;
}
function requiresVerification(site) {
  if (PROFILES.some(p => p.key === site?.key) || site?.adapter === ADAPTER) return true;
  for (const field of ['apiOrigin', 'origin', 'api', 'url', 'detailApi']) {
    if (!site || !Object.hasOwn(site, field)) continue;
    try { if (['careers.ctrip.com', 'campus.ctrip.com'].includes(uri(site[field]).hostname.toLowerCase().replace(/\.$/, ''))) return true; }
    catch { return true; } // A malformed declared URI never authorizes generic fallback.
  }
  return false;
}
function verifiedSource(site) {
  const p = PROFILES.find(p => p.key === site?.key);
  if (!p) return false;
  try {
    shape(site, Object.keys(p), 'source');
    return Object.keys(p).every(k => ['apiOrigin', 'api', 'url'].includes(k) ? uri(site[k]).href === uri(p[k]).href : equal(site[k], p[k]));
  } catch { return false; }
}
function profile(site) {
  check(verifiedSource(site), 'unverified source identity/scope/mode');
  return PROFILES.find(p => p.key === site.key);
}
function requestBody(site, index) {
  const p = profile(site); check(Number.isSafeInteger(index) && index > 0, 'invalid page index');
  const body = structuredClone(p.body); body.pager.index = String(index); return body;
}
function listRequest(site, index) { return { url: API, method: 'POST', headers: { ...HEADERS }, body: requestBody(site, index) }; }
function record(job, p) {
  shape(job, FIELDS, 'native job');
  check(STRINGS.every(k => typeof job[k] === 'string'), 'native string field type');
  check(/^[1-9]\d*$/.test(job.id) && /^[\da-f]{8}(?:-[\da-f]{4}){3}-[\da-f]{12}$/i.test(job.jobId) && job.fromId.trim() && !/[\s/?#\\]/u.test(job.fromId), 'independent id/jobId/fromId');
  check(job.jobTitle.trim() && job.requirements.trim(), 'missing title/JD; empty/null JD not yet proved');
  for (const k of ['city', 'cityName']) check(job[k] === null || typeof job[k] === 'string', 'native nullable ' + k);
  check(job.duty === null && job.internalId === null, 'unverified additional duty/internalId');
  check(typeof job.ynShowInterviewDate === 'boolean', 'native boolean field type');
  array(job.nextWeekDays, 'nextWeekDays'); check(job.nextWeekDays.every(v => typeof v === 'string'), 'nextWeekDays item type');
  check(job.category === String(p.body.condition.category), 'native scope category mismatch');
}
function add(job, p, state) {
  record(job, p);
  for (const field of ['id', 'fromId', 'jobId']) {
    const id = field === 'jobId' ? job[field].toLowerCase() : job[field];
    check(!state[field].has(id), 'duplicate native ' + field); state[field].add(id);
  }
  state.jobs.push(job);
}
function newState() { return { jobs: [], id: new Set(), fromId: new Set(), jobId: new Set() }; }
function validateJobs(jobs, site) {
  const p = profile(site); array(jobs, 'jobs'); check(jobs.length > 0, 'effective zero has not been verified');
  const state = newState(); for (const job of jobs) add(job, p, state); return true;
}
function consume(page, p, index, state, maxPages = MAX_PAGES) {
  shape(page, ['request', 'httpStatus', 'response'], 'page evidence');
  check(page.httpStatus === 200 && equal(page.request, listRequest(p, index)), 'native request/HTTP binding');
  const j = page.response; shape(j, ['retCode', 'retMessage', 'retValue', 'ResponseStatus'], 'native response');
  check(j.retCode === '201' && j.retMessage === '调用成功', 'native business refusal');
  const s = j.ResponseStatus; shape(s, ['Timestamp', 'Ack', 'Errors', 'Build', 'Version', 'Extension'], 'ResponseStatus');
  array(s.Errors, 'Errors'); array(s.Extension, 'Extension');
  check(s.Ack === 'Success' && !s.Errors.length && !s.Extension.length && s.Build === null && s.Version === null && Number.isSafeInteger(s.Timestamp) && s.Timestamp > 0, 'ResponseStatus refusal/type');
  const v = j.retValue; shape(v, ['total', 'recruitJobAdList'], 'retValue'); array(v.recruitJobAdList, 'native list');
  check(Number.isSafeInteger(v.total) && v.total > 0, 'native total; effective zero has not been verified');
  if (state.total === undefined) {
    state.total = v.total; check(Math.ceil(state.total / PAGE_SIZE) + 1 < maxPages, 'pagination safety ceiling');
  }
  const ended = state.jobs.length === state.total;
  check(v.total === state.total && v.recruitJobAdList.length === Math.min(PAGE_SIZE, state.total - state.jobs.length), 'total drift / early empty or short / endpoint');
  for (const job of v.recruitJobAdList) add(job, p, state);
  return ended;
}
function facts(jobs) { return new Map(jobs.map(job => [job.id, job])); }
function validateEvidence(evidence, jobs, site) {
  const p = profile(site); validateJobs(jobs, site);
  shape(evidence, ['version', 'key', 'api', 'scans'], 'verification');
  check(evidence.version === 1 && evidence.key === p.key && evidence.api === API, 'verification source binding');
  array(evidence.scans, 'scans'); check(evidence.scans.length === 2, 'two complete scans required');
  const states = evidence.scans.map(scan => {
    shape(scan, ['pages'], 'scan'); array(scan.pages, 'pages');
    check(scan.pages.length > 1 && scan.pages.length < MAX_PAGES, 'missing endpoint / pagination ceiling');
    const state = newState(); let ended = false;
    for (let i = 0; i < scan.pages.length; i++) { check(!ended, 'extra page after endpoint'); ended = consume(scan.pages[i], p, i + 1, state); }
    check(ended && state.jobs.length === state.total, 'incomplete native scan endpoint'); return state;
  });
  // No dynamic job-field exemptions: locale, nextWeekDays, all 25 facts and full HTML must agree.
  check(states[0].total === states[1].total && equal(facts(states[0].jobs), facts(states[1].jobs)), 'full native raw facts/set drift');
  check(equal(jobs, states[0].jobs), 'snapshot jobs not bound to first native scan'); return true;
}
function normalizeRecord(job, site) {
  const p = profile(site); record(job, p);
  const jd = normalizeJD(job.requirements), full = htmlText(job.requirements);
  // The shared splitter does not prove dotted boundaries in multi-direction JDs. Never attach later work to requirements.
  const unclear = full.split('\n').some(line => /^[.．·•-]\s*(?:职位描述|岗位描述|工作职责|岗位职责|任职资格|任职要求)\s*[:：]?$/.test(line));
  // Native requirements is the entire HTML 职位描述, not a semantic requirements slot.
  // Keep its original order/headings for display, but split scoring slots only at explicit proved boundaries.
  return { id: job.id, title: job.jobTitle, city: job.cityName ?? '', category: '', channels: [p.track], employment: null, talentPlan: null, date: null, dateKind: null, sourceStatus: null,
    url: ORIGIN + '/#/' + (p.track === 'campus' ? 'campus' : 'experienced') + '/job-detail/' + encodeURIComponent(job.fromId),
    duty: unclear ? '' : jd.duty, requirements: unclear ? '' : jd.requirements, description: full, jdComplete: jd.hasContent };
}
function portalNotice(site) {
  if (!verifiedSource(site)) return '';
  return '携程仅覆盖登记官网category=' + profile(site).body.condition.category + '的默认广' + site.batch + '入口，不代表集团全球全部渠道；不按职能、城市或Eagle Program删岗。沿已成功正常Node请求保留官网原语言，英/中文元数据不互译或豁免漂移；日期语义、性质和人才计划未知，混合职位类型暂不映为职能。';
}
async function fetchAll(site, options = {}) {
  const p = profile(site);
  const { fetchImpl = globalThis.fetch, sleep = ms => new Promise(resolve => setTimeout(resolve, ms)), delayMs = 200, timeoutMs = 15000, maxPages = MAX_PAGES } = options;
  check(typeof fetchImpl === 'function' && typeof sleep === 'function' && Number.isFinite(delayMs) && delayMs >= 0 && Number.isSafeInteger(timeoutMs) && timeoutMs > 0 && Number.isSafeInteger(maxPages) && maxPages > 1 && maxPages <= MAX_PAGES, 'invalid request limits');
  const verification = { version: 1, key: p.key, api: API, scans: [] }; let first;
  for (let round = 0; round < 2; round++) {
    const scan = { pages: [] }, state = newState(); let ended = false;
    for (let index = 1; index < maxPages; index++) {
      await sleep(Math.max(200, delayMs));
      const request = listRequest(p, index);
      const r = await fetchImpl(API, { method: request.method, headers: request.headers, body: JSON.stringify(request.body), redirect: 'manual', signal: AbortSignal.timeout(Math.min(15000, timeoutMs)) });
      check(r && r.status === 200, 'list HTTP refusal');
      const page = { request, httpStatus: r.status, response: await r.json() };
      ended = consume(page, p, index, state, maxPages); scan.pages.push(page);
      if (round) {
        check(state.total === first.total, 'full native total drift');
        for (const job of page.response.retValue.recruitJobAdList) check(equal(job, first.byId.get(job.id)), 'full native raw facts/set drift');
      }
      if (ended) break;
    }
    check(ended, 'pagination safety ceiling / missing endpoint');
    if (!round) first = { total: state.total, byId: facts(state.jobs), jobs: state.jobs };
    verification.scans.push(scan);
  }
  validateEvidence(verification, first.jobs, site);
  return { complete: true, total: first.total, jobs: first.jobs, verification };
}
async function run(args, options = {}) {
  check(Array.isArray(args) && args.length === 2 && typeof args[0] === 'string' && typeof args[1] === 'string' && args[1], 'Usage: ctrip_portal.js <siteJSON> <rawFile>');
  const site = JSON.parse(args[0]), result = await fetchAll(site, options);
  const file = args[1], temp = file + '.tmp-' + randomUUID(); let created = false;
  try {
    const fd = fs.openSync(temp, 'wx'); created = true;
    try { fs.writeFileSync(fd, JSON.stringify(result, null, 2) + '\n', 'utf8'); } finally { fs.closeSync(fd); }
    fs.renameSync(temp, file);
  } finally { if (created && fs.existsSync(temp)) fs.unlinkSync(temp); }
  return result;
}
module.exports = { PROFILES, requiresVerification, verifiedSource, validateJobs, normalizeRecord, validateEvidence, requestBody, listRequest, fetchAll, run, portalNotice };
if (require.main === module) run(process.argv.slice(2)).catch(error => { console.error(error.message); process.exitCode = 1; });
