// Normal anonymous public cursors; qualification is restricted to the two reviewed scopes.
'use strict';
const fs = require('node:fs');
const { isDeepStrictEqual } = require('node:util');
const ORIGIN = 'https://www.shlab.org.cn', API = ORIGIN + '/api/getJobList';
const ADAPTER = 'shlab-portal-v1', COUNT_KIND = 'cursor-exhaustion', MAX_PAGES = 150;
function freeze(value) {
  if (value && typeof value === 'object') {
    Object.values(value).forEach(freeze);
    Object.freeze(value);
  }
  return value;
}
// Preserve the existing registry's company spelling, not the portal's full display name.
const PROFILES = freeze(['campus', 'social'].map(track => ({
  key: track === 'campus' ? 'shlab' : 'shlab_social', company: '上海AI实验室',
  ats: 'custom', adapter: ADAPTER, track, listJD: true, apiOrigin: ORIGIN,
  url: ORIGIN + '/joinus/' + track, api: API,
  body: { mode: track, jobFunction: '', location: '', jobType: '', subject: '', keyword: '', page_token: '', limit: 7 },
  batch: track === 'campus' ? '官网校园默认全项目（无职业/项目筛选）' : '官网社会默认全列表（无职业/项目筛选）', exclude: '(无)'
})));
function requiresVerification(site) {
  return PROFILES.some(p => p.key === site?.key) || site?.adapter === ADAPTER || ['api', 'url', 'apiOrigin'].some(field => {
    const value = site?.[field];
    if (value === undefined) return false;
    if (typeof value !== 'string') return true;
    try {
      const uri = field === 'api' && value.startsWith('GET ') ? value.slice(4) : value;
      return new URL(uri).hostname.toLowerCase().replace(/\.$/, '') === 'www.shlab.org.cn';
    } catch { return true; } // Malformed declared URIs cannot authorize a generic ATS fallback.
  });
}
function verifiedSource(site) {
  const p = PROFILES.find(profile => profile.key === site?.key);
  return !!p && isDeepStrictEqual(site, p);
}
function profileFor(site) {
  if (!verifiedSource(site)) throw new Error('Unverified SHLAB portal identity/scope/mode');
  return PROFILES.find(p => p.key === site.key);
}
function portalNotice(site) {
  if (!verifiedSource(site)) return '';
  return '上海AI实验室仅覆盖登记官网' + (site.track === 'campus' ? '校园默认全部招聘项目' : '社会默认全列表') + '，不代表全部渠道；游标穷尽后的唯一记录数不是官网声明总数。性质只按原生实习/全职，正式、人才计划和日期语义未知。首次范围迁移退出不代表已核验官网下架。';
}
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const decimal = value => typeof value === 'string' && /^[1-9]\d*$/.test(value);
function shape(value, required, optional = []) {
  if (!object(value) || required.some(key => !Object.hasOwn(value, key)) ||
      Object.keys(value).some(key => !required.includes(key) && !optional.includes(key))) {
    throw new Error('SHLAB native own fields/shape changed');
  }
}
function strings(value, fields) {
  if (fields.some(field => typeof value[field] !== 'string')) throw new Error('SHLAB native text type changed');
}
function localized(value, bilingual = true) {
  const fields = bilingual ? ['en_us', 'zh_cn'] : ['zh_cn'];
  shape(value, fields);
  strings(value, fields);
}
function named(value, bilingual = true, numericID = true) {
  shape(value, ['id', 'name']);
  // A real campus row has an empty creator id/name; this is metadata, not route identity.
  if (numericID ? !decimal(value.id) : typeof value.id !== 'string') throw new Error('Invalid SHLAB native metadata id');
  localized(value.name, bilingual);
}
function address(value) {
  shape(value, ['city', 'country', 'district', 'id', 'name', 'state']);
  if (!decimal(value.id)) throw new Error('Invalid SHLAB address identity');
  localized(value.name);
  for (const field of ['city', 'country', 'district', 'state']) {
    shape(value[field], ['code', 'name']);
    strings(value[field], ['code']);
    localized(value[field].name);
  }
}
const COMMON = [
  'JobType', 'address', 'address_list', 'create_time', 'creator', 'description', 'id',
  'job_active_status', 'job_code', 'job_department', 'job_id', 'job_process_type',
  'job_recruitment_type', 'job_type', 'modify_time', 'other_info', 'showtitle', 'title', 'updatedAtShow'
];
const CAMPUS_OPTIONAL = [
  'job_function', 'headcount', 'customized_data_list', 'min_job_level', 'min_salary', 'max_salary'
];
// Current SSR proves LF→BR for plain strings, not arbitrary markup/entity escaping.
// Unknown shapes stop the source instead of silently rendering a different JD.
// HTML TEXT-context legacy names (106; fixed data, no Python/runtime dependency).
const LEGACY_ENTITY = /&(?:AElig|AMP|Aacute|Acirc|Agrave|Aring|Atilde|Auml|COPY|Ccedil|ETH|Eacute|Ecirc|Egrave|Euml|GT|Iacute|Icirc|Igrave|Iuml|LT|Ntilde|Oacute|Ocirc|Ograve|Oslash|Otilde|Ouml|QUOT|REG|THORN|Uacute|Ucirc|Ugrave|Uuml|Yacute|aacute|acirc|acute|aelig|agrave|amp|aring|atilde|auml|brvbar|ccedil|cedil|cent|copy|curren|deg|divide|eacute|ecirc|egrave|eth|euml|frac12|frac14|frac34|gt|iacute|icirc|iexcl|igrave|iquest|iuml|laquo|lt|macr|micro|middot|nbsp|not|ntilde|oacute|ocirc|ograve|ordf|ordm|oslash|otilde|ouml|para|plusmn|pound|quot|raquo|reg|sect|shy|sup1|sup2|sup3|szlig|thorn|times|uacute|ucirc|ugrave|uml|uuml|yacute|yen|yuml)/;
function plainJD(value) {
  if (/<!--|<[!?]|<\/?[a-z]/i.test(value) ||
      /&(?:#(?:x[\da-f]+|\d+);?|[a-z][a-z\d]+;)/i.test(value) || LEGACY_ENTITY.test(value)) {
    throw new Error('SHLAB unverified JD markup/character-reference shape');
  }
}
function validateJob(job, p) {
  const campus = p.track === 'campus';
  const required = campus ? ['subject', 'requirement'] :
    ['job_function', 'headcount', 'customized_data_list', 'min_job_level', 'max_job_level'];
  shape(job, [...COMMON, ...required], campus ? CAMPUS_OPTIONAL : ['requirement']);
  if (!decimal(job.id) || !decimal(job.job_id) || job.id === job.job_id) throw new Error('Invalid SHLAB publication/internal identity');
  strings(job, ['description', 'title', 'job_code', 'create_time', 'modify_time', 'other_info', 'showtitle', 'updatedAtShow']);
  if (!job.title.trim() || !decimal(job.create_time) || !decimal(job.modify_time)) throw new Error('Invalid SHLAB title/native timestamp');
  if (Object.hasOwn(job, 'requirement')) strings(job, ['requirement']);
  plainJD(job.description);
  if (Object.hasOwn(job, 'requirement')) plainJD(job.requirement);
  if (!Number.isSafeInteger(job.job_active_status) || job.job_active_status < 0 ||
      job.job_process_type !== (campus ? 2 : 1)) {
    throw new Error('SHLAB native status/scope type changed');
  }
  for (const field of ['JobType', 'job_type', 'job_recruitment_type']) named(job[field]);
  for (const field of ['creator', 'job_department']) named(job[field], true, false);
  for (const field of ['job_function', 'subject']) if (Object.hasOwn(job, field)) named(job[field], false);
  for (const field of ['min_job_level', 'max_job_level']) if (Object.hasOwn(job, field)) named(job[field]);
  if (Object.hasOwn(job, 'headcount') && (!Number.isSafeInteger(job.headcount) || job.headcount < 0)) throw new Error('Invalid SHLAB headcount');
  for (const field of ['min_salary', 'max_salary']) {
    if (Object.hasOwn(job, field) && (typeof job[field] !== 'string' || !/^\d+$/.test(job[field]))) {
      throw new Error('Invalid SHLAB native salary');
    }
  }
  address(job.address);
  if (!Array.isArray(job.address_list)) throw new Error('Invalid SHLAB native address list');
  job.address_list.forEach(address);
  if (Object.hasOwn(job, 'customized_data_list')) {
    if (!Array.isArray(job.customized_data_list)) throw new Error('Invalid SHLAB custom metadata');
    for (const item of job.customized_data_list) {
      shape(item, ['name', 'object_id', 'object_type', 'value']);
      localized(item.name, false);
      if (!decimal(item.object_id) || item.object_type !== 3) throw new Error('Unverified SHLAB custom metadata type');
      shape(item.value, ['option']);
      shape(item.value.option, ['key', 'name']);
      strings(item.value.option, ['key']);
      localized(item.value.option.name, false);
    }
  }
}
function validateJobs(jobs, site) {
  const p = profileFor(site);
  if (!Array.isArray(jobs) || !jobs.length) throw new Error('SHLAB effective zero has not been verified');
  const ids = new Set();
  for (const job of jobs) {
    validateJob(job, p);
    if (ids.has(job.id)) throw new Error('Duplicate SHLAB publication identity');
    ids.add(job.id);
  }
}
function requestFor(p, cursor) {
  const url = new URL(p.api);
  for (const [key, value] of Object.entries({ ...p.body, page_token: cursor })) url.searchParams.set(key, value);
  return { method: 'GET', url: url.href };
}
function stateFor() { return { cursor: '', cursors: new Set(['']), ids: new Set(), jobs: [], ended: false }; }
function consume(page, p, state) {
  shape(page, ['request', 'httpStatus', 'response']);
  if (state.ended || page.httpStatus !== 200 || !isDeepStrictEqual(page.request, requestFor(p, state.cursor))) throw new Error('SHLAB native request/status/chain mismatch');
  const json = page.response;
  shape(json, ['errno', 'errmsg', 'data']);
  // Every page of both independent research scans says "ok", not the report's mistaken "".
  if (json.errno !== 0 || json.errmsg !== 'ok') throw new Error('SHLAB native business refusal');
  const data = json.data;
  if (!object(data) || typeof data.has_more !== 'boolean') throw new Error('Invalid SHLAB typed has_more');
  shape(data, data.has_more ? ['has_more', 'items', 'page_token'] : ['has_more', 'items']);
  if (!Array.isArray(data.items) || data.items.length > p.body.limit || data.has_more && data.items.length !== p.body.limit) throw new Error('SHLAB page overflow/early empty or short page');
  if (data.has_more) {
    if (typeof data.page_token !== 'string' || !data.page_token.trim() ||
        data.page_token === '[REDACTED]' || state.cursors.has(data.page_token)) {
      throw new Error('SHLAB cursor missing/redacted/unadvanced/cyclic');
    }
    state.cursors.add(data.page_token);
    state.cursor = data.page_token;
  }
  for (const job of data.items) {
    validateJob(job, p);
    if (state.ids.has(job.id)) throw new Error('Duplicate SHLAB publication identity');
    state.ids.add(job.id);
    state.jobs.push(job);
  }
  state.ended = !data.has_more;
}
function validateEvidence(evidence, jobs, site) {
  const p = profileFor(site);
  shape(evidence, ['version', 'key', 'api', 'countKind', 'total', 'scans']);
  if (evidence.version !== 1 || evidence.key !== p.key || evidence.api !== p.api ||
      evidence.countKind !== COUNT_KIND || !Number.isSafeInteger(evidence.total) ||
      evidence.total !== jobs?.length || !Array.isArray(evidence.scans) || evidence.scans.length !== 2) {
    throw new Error('Missing/mismatched SHLAB native evidence');
  }
  validateJobs(jobs, site);
  const scans = evidence.scans.map(scan => {
    shape(scan, ['pages']);
    if (!Array.isArray(scan.pages) || !scan.pages.length || scan.pages.length >= MAX_PAGES) throw new Error('SHLAB pagination safety ceiling/invalid scan');
    const state = stateFor();
    for (const page of scan.pages) consume(page, p, state);
    if (!state.ended || state.jobs.length !== evidence.total) throw new Error('Incomplete SHLAB native cursor exhaustion/count');
    return state.jobs;
  });
  const map = rows => new Map(rows.map(job => [job.id, job]));
  if (!isDeepStrictEqual(map(scans[0]), map(scans[1])) || !isDeepStrictEqual(jobs, scans[0])) throw new Error('SHLAB full raw facts drift or jobs/native evidence mismatch');
  return true;
}
function normalizeRecord(job, site) {
  const p = profileFor(site);
  validateJob(job, p);
  const duty = job.description, requirements = Object.hasOwn(job, 'requirement') ? job.requirement : '';
  // TEXT: no HTML stripping, entity decoding, whitespace folding, heading guessing or Set dedup.
  // Native description IS the independent duty section. There is no third full-body field
  // to synthesize or use as a duty fallback; the two real sections already preserve all JD.
  const kind = job.job_recruitment_type.name.zh_cn;
  const employment = kind === '实习' ? 'internship' : kind === '全职' ? 'full-time' : null;
  return {
    id: job.id, title: job.title, city: job.address_list.map(a => a.city.name.zh_cn).join('/'),
    category: Object.hasOwn(job, 'job_function') ? job.job_function.name.zh_cn : '', channels: [p.track],
    employment, talentPlan: null, date: null, dateKind: null, sourceStatus: String(job.job_active_status),
    url: ORIGIN + '/joinus/detail/' + job.id + '?mode=' + p.track,
    duty, requirements, description: '', jdComplete: /[\p{L}\p{N}]/u.test(duty + requirements)
  };
}
async function fetchAll(site, options = {}) {
  const p = profileFor(site);
  const { fetchImpl = globalThis.fetch, sleep = ms => new Promise(resolve => setTimeout(resolve, ms)), delayMs = 200, timeoutMs = 15000, maxPages = MAX_PAGES } = options;
  if (typeof fetchImpl !== 'function' || typeof sleep !== 'function' || !Number.isFinite(delayMs) || delayMs < 0 || !Number.isSafeInteger(timeoutMs) || timeoutMs < 1 || !Number.isSafeInteger(maxPages) || maxPages < 2 || maxPages > MAX_PAGES) throw new Error('Invalid SHLAB request limits');
  let requested = false;
  const scans = [];
  for (let round = 0; round < 2; round++) {
    const state = stateFor(), scan = { pages: [] };
    for (let index = 1; index < maxPages; index++) {
      if (requested) await sleep(Math.max(200, delayMs));
      requested = true;
      const request = requestFor(p, state.cursor);
      // No UA impersonation, cookies, CSRF, auth or session values are injected or persisted.
      const response = await fetchImpl(request.url, {
        method: request.method,
        headers: { Accept: 'application/json', Referer: p.url },
        redirect: 'error', signal: AbortSignal.timeout(Math.min(15000, timeoutMs))
      });
      if (response.status !== 200) throw new Error('SHLAB list HTTP ' + response.status);
      const page = { request, httpStatus: response.status, response: await response.json() };
      consume(page, p, state);
      scan.pages.push(page);
      if (state.ended) break;
    }
    if (!state.ended) throw new Error('SHLAB pagination safety ceiling reached');
    if (!state.jobs.length) throw new Error('SHLAB effective zero has not been verified');
    scans.push(scan);
  }
  const jobs = scans[0].pages.flatMap(page => page.response.data.items);
  // page_token is a proven public pagination selector, NOT an identity/session credential.
  // Preserve its exact native value so publisher can replay every request/response binding.
  const verification = { version: 1, key: p.key, api: p.api, countKind: COUNT_KIND, total: jobs.length, scans };
  validateEvidence(verification, jobs, site);
  return { complete: true, countKind: COUNT_KIND, total: jobs.length, jobs, verification };
}
const run = fetchAll;
module.exports = { PROFILES, requiresVerification, verifiedSource, validateJobs, normalizeRecord, validateEvidence, fetchAll, run, portalNotice };
if (require.main === module) {
  (async () => {
    const [siteJSON, rawFile] = process.argv.slice(2);
    if (!siteJSON || !rawFile) throw new Error('Usage: node shlab_portal.js <siteJSON> <rawFile>');
    const result = await run(JSON.parse(siteJSON)), temp = rawFile + '.tmp-' + process.pid;
    try {
      fs.writeFileSync(temp, JSON.stringify(result, null, 2) + '\n', { encoding: 'utf8', flag: 'wx' });
      fs.renameSync(temp, rawFile);
    } finally { if (fs.existsSync(temp)) fs.unlinkSync(temp); }
    console.log('DONE fetched=' + result.total + ' countKind=' + result.countKind);
  })().catch(error => { console.error('ERR ' + error.message); process.exitCode = 1; });
}
