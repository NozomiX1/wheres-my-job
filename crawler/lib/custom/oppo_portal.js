'use strict';
const fs = require('node:fs');
const { randomUUID } = require('node:crypto');
const { isDeepStrictEqual: equal } = require('node:util');
const ADAPTER = 'oppo-portal-v1', MAX_PAGES = 200, PROCESS_MS = 900000;
const JD_NOTICE = '已收录取得的列表JD及可得补充正文，正文/覆盖完整性待核验';
const check = (ok, message) => { if (!ok) throw new Error('OPPO: ' + message); };
const object = v => v !== null && typeof v === 'object' && !Array.isArray(v);
function freeze(v) { if (v && typeof v === 'object') { Object.values(v).forEach(freeze); Object.freeze(v); } return v; }
const legacyProfiles = [
  { key: 'oppo', company: 'OPPO', ats: 'custom', adapter: ADAPTER, track: 'campus', batch: '校园招聘（官网默认全项目，含应届、博士及实习）', exclude: '(无)', origin: 'https://careers.oppo.com',
    url: 'https://careers.oppo.com/university/oppo/campus/post', api: 'https://careers.oppo.com/openapi/position/pageNew',
    dictionaryApi: 'https://careers.oppo.com/openapi/system/dictionary/queryList?code=CULTURAL_COMPATIBILITY', listJD: true,
    body: { pageNum: 1, pageSize: 100, positionName: '', projectList: [], positionTypeList: [], workCityCodeList: [], shareId: '' } },
  { key: 'oppo_social', company: 'OPPO', ats: 'custom', adapter: ADAPTER, track: 'social', batch: '社招', exclude: '(无)', origin: 'https://career.oppo.com',
    url: 'https://career.oppo.com/official/oppo/recruitment/post?recruitType=SOCIAL-RECRUITMENT', api: 'https://career.oppo.com/ats-candidate-api/open-api/position/queryPositionList',
    detailApi: 'https://career.oppo.com/ats-candidate-api/open-api/position/queryPosition', listJD: true,
    body: { pageNum: 1, pageSize: 100, publishName: '', workCityCodeList: [], jobTypeList: [], recruitTypeList: ['SOCIAL-RECRUITMENT'], shareId: '' } }
];
const PROFILES = freeze([...legacyProfiles, { ...legacyProfiles[1], batch: '社会招聘与日常实习（官网当前两个公开渠道）',
  query: { daily: { ...legacyProfiles[1].body, pageSize: 10, recruitTypeList: ['OFFEN-RECRUITMENT'] } } }]);
function requiresVerification(site) {
  if (PROFILES.some(p => p.key === site?.key) || site?.adapter === ADAPTER) return true;
  return ['origin', 'apiOrigin', 'url', 'api', 'detailApi', 'dictionaryApi'].some(k => {
    if (!site || !Object.hasOwn(site, k)) return false;
    try { check(typeof site[k] === 'string', 'invalid URI'); return ['career.oppo.com', 'careers.oppo.com'].includes(new URL(site[k].replace(/^(GET|POST)\s+/, '')).hostname.toLowerCase().replace(/\.$/, '')); }
    catch { return true; }
  });
}
function verifiedSource(site) { return PROFILES.some(p => equal(p, site)); }
function profile(site) { check(verifiedSource(site), 'unverified source identity/scope/mode'); return PROFILES.find(p => equal(p, site)); }
// Redact credential FIELD VALUES, never substrings in original JD or other public native text.
const CREDENTIAL = /^(?:jobsecret|cookie|setcookie|authorization|accesstoken|refreshtoken|token|csrftoken|xsrftoken|xxsrftoken|signature|password|sessiontoken|sessionid)$/;
function sanitize(v) {
  if (Array.isArray(v)) return v.map(sanitize);
  if (object(v)) return Object.fromEntries(Object.entries(v).map(([k, value]) => [k, CREDENTIAL.test(k.toLowerCase().replace(/[^a-z0-9]/g, '')) ? '[REDACTED]' : sanitize(value)]));
  return v;
}
function officialId(post, site) { return post[site.track === 'campus' ? 'idProjPosition' : 'positionId']; }
function record(post, site, scope = 'social') {
  const p = profile(site), campus = p.track === 'campus'; check(object(post), 'invalid native record');
  if (p.query) check(['social', 'daily'].includes(scope) && post.recruitType === (scope === 'daily' ? 'OFFEN-RECRUITMENT' : 'SOCIAL-RECRUITMENT'), 'native recruitment scope binding');
  const id = officialId(post, site); check(campus ? Number.isSafeInteger(id) && id > 0 : typeof id === 'string' && /^[1-9]\d*$/.test(id), 'invalid native official id');
  const title = post[campus ? 'positionName' : 'publishName']; check(typeof title === 'string' && title.trim(), 'invalid native title');
  for (const k of campus ? ['positionDesc', 'positionRequire'] : ['jobDuty', 'workRequire']) check(Object.hasOwn(post, k) && (post[k] === null || typeof post[k] === 'string'), 'missing/invalid native ' + k);
  for (const k of campus ? ['workCityName', 'positionTypeName', 'knowledgeSkill', 'bonusItem', 'aiCapabilityLevelDesc'] : ['workCityName', 'aiCapabilityLevelDesc'])
    if (Object.hasOwn(post, k)) check(post[k] === null || typeof post[k] === 'string', 'invalid native ' + k);
  if (!campus) {
    check(Object.hasOwn(post, 'jobDirectionList') && (post.jobDirectionList === null || Array.isArray(post.jobDirectionList) && post.jobDirectionList.every(d => object(d))), 'missing/invalid native jobDirectionList');
    for (const d of post.jobDirectionList ?? []) {
      if (Object.hasOwn(d, 'jobId')) check(d.jobId === id, 'direction official identity mismatch');
      for (const k of ['directionName', 'workCityName', 'jobDuty', 'workRequire', 'aiCapabilityLevelDesc'])
        if (Object.hasOwn(d, k)) check(d[k] === null || typeof d[k] === 'string', 'invalid native direction ' + k);
    }
  }
  return post;
}
function scopeUrl(site, scope) { return scope === 'daily' ? site.url.replace('SOCIAL-RECRUITMENT', 'OFFEN-RECRUITMENT') : site.url; }
function jobUrl(site, post) {
  const url = scopeUrl(site, site.query && post.recruitType === 'OFFEN-RECRUITMENT' ? 'daily' : 'social');
  return site.track === 'campus' ? url + '/' + officialId(post, site) : url.replace('?recruitType=', '/' + officialId(post, site) + '?recruitType=');
}
function requestFor(site, pageNum, scope = 'social') {
  const p = profile(site); check(Number.isSafeInteger(pageNum) && pageNum > 0 && pageNum <= MAX_PAGES, 'invalid page');
  check(scope === 'social' || scope === 'daily' && p.query?.daily, 'unverified request scope');
  return { url: p.api, method: 'POST', headers: { Accept: 'application/json, text/plain, */*', Referer: scopeUrl(p, scope), 'Content-Type': 'application/json;charset=UTF-8', Origin: p.origin }, body: { ...(scope === 'daily' ? p.query.daily : p.body), pageNum } };
}
function detailRequestFor(site, post, scope = 'social') {
  const p = profile(site); record(post, site, scope); check(p.track === 'social' && post.jobDirectionList?.length, 'unnecessary/unverified detail request');
  return { url: p.detailApi + '?positionId=' + post.positionId, method: 'GET', headers: { Accept: 'application/json, text/plain, */*', Referer: jobUrl(p, post) }, body: null };
}
function dictionaryRequestFor(site, post) {
  const p = profile(site); record(post, site); check(p.track === 'campus', 'unverified dictionary source');
  return { url: p.dictionaryApi, method: 'GET', headers: { Accept: 'application/json, text/plain, */*', Referer: jobUrl(p, post) }, body: null };
}
function nativeResponse(attempt, expected, site) {
  check(object(attempt) && equal(Object.keys(attempt).sort(), ['httpStatus', 'request', 'response']) && equal(attempt.request, expected), 'native request binding');
  check(attempt.httpStatus === 200, 'native HTTP ' + attempt.httpStatus);
  const j = attempt.response; check(object(j) && j.code === (site.track === 'campus' ? 0 : '0') && j.msg === 'success' && Object.hasOwn(j, 'data'), 'native business refusal'); return j.data;
}
function number(v) { return Number.isSafeInteger(v) && v >= 0 ? v : typeof v === 'string' && /^(?:0|[1-9]\d*)$/.test(v) && Number.isSafeInteger(Number(v)) ? Number(v) : null; }
function pageData(page, site, index, scope = 'social') {
  const expected = requestFor(site, index, scope), data = nativeResponse(page, expected, site), campus = site.track === 'campus'; check(object(data), 'invalid native data');
  const list = data[campus ? 'records' : 'list'];
  check(Array.isArray(list) && list.length <= expected.body.pageSize && [...list.keys()].every(i => Object.hasOwn(list, i)), 'missing/invalid native list');
  check(data[campus ? 'current' : 'pageNum'] === index && data[campus ? 'size' : 'pageSize'] === expected.body.pageSize, 'native page metadata binding');
  const total = number(data.total), pages = number(data.pages); check(total !== null && pages !== null, 'missing/invalid native total/pages');
  return { list, total, pages };
}
function atEnd(j, index) { return j.list.length === 0 || index >= j.pages; }
function cultureData(attempt, post, site) {
  const data = nativeResponse(attempt, dictionaryRequestFor(site, post), site);
  check(Array.isArray(data) && data.every(d => object(d) && d.groupCode === 'CULTURAL_COMPATIBILITY' && typeof d.itemName === 'string'), 'invalid native culture dictionary'); return data;
}
function detailData(attempt, post, site, scope = 'social') {
  const data = nativeResponse(attempt, detailRequestFor(site, post, scope), site); check(object(data) && data.positionId === post.positionId, 'detail official identity binding'); return record(data, site, scope);
}
const JOB_TYPE_API = 'https://career.oppo.com/ats-candidate-api/open-api/enum/dictionaries?dictTypes=JOB-TYPE';
function jobTypeRequestFor(site, scope = 'daily') {
  const p = profile(site); check(p.query && ['social', 'daily'].includes(scope), 'unverified job-type dictionary source');
  return { url: JOB_TYPE_API, method: 'GET', headers: { Accept: 'application/json, text/plain, */*', Referer: scopeUrl(p, scope) }, body: null };
}
function jobTypes(data) {
  check(Array.isArray(data) && data.every(d => object(d) && d.dictType === 'JOB-TYPE' && typeof d.dictValue === 'string' && d.dictValue && typeof d.dictName === 'string' && d.dictName.trim()), 'invalid native job-type dictionary');
  check(new Set(data.map(d => d.dictValue)).size === data.length, 'duplicate job-type dictionary code'); return data;
}
function materialTime(value) { check(value === null || typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value) && Number.isFinite(Date.parse(value)) && new Date(value).toISOString() === value, 'invalid material completion time'); }
function jobTypeData(material, site) {
  check(object(material) && Object.hasOwn(material, 'completedAt'), 'dictionary material clock binding');
  const { completedAt, ...attempt } = material; materialTime(completedAt);
  const expected = ['social', 'daily'].map(scope => jobTypeRequestFor(site, scope)).find(req => equal(req, attempt.request));
  check(expected, 'dictionary native source/Referer binding'); return jobTypes(nativeResponse(attempt, expected, site));
}
function boundRecord(job, site) {
  const p = profile(site); check(object(job) && Object.keys(job).every(k => (p.query ? ['post', 'detail', 'scope', 'jobTypes'] : ['post', 'detail', 'culture']).includes(k)) && Object.hasOwn(job, 'post') && equal(job, sanitize(job)), 'native wrapper/sanitization binding');
  if (p.query) check(['social', 'daily'].includes(job.scope), 'native wrapper scope binding');
  const post = record(job.post, site, job.scope);
  if (Object.hasOwn(job, 'detail')) { check(site.track === 'social' && post.jobDirectionList?.length && object(job.detail) && job.detail.positionId === post.positionId, 'detail native identity binding'); record(job.detail, site, job.scope); }
  if (Object.hasOwn(job, 'jobTypes')) { check(p.query, 'unexpected job-type dictionary'); jobTypes(job.jobTypes); }
  if (Object.hasOwn(job, 'culture')) check(site.track === 'campus' && Array.isArray(job.culture) && job.culture.every(d => object(d) && d.groupCode === 'CULTURAL_COMPATIBILITY' && typeof d.itemName === 'string'), 'native culture binding');
  return post;
}
function validateJobs(jobs, site) {
  profile(site); check(Array.isArray(jobs) && jobs.length > 0, 'no usable jobs; zero cannot clear existing data'); const seen = new Set();
  for (const job of jobs) { const id = officialId(boundRecord(job, site), site); check(!seen.has(id), 'duplicate official id'); seen.add(id); } return true;
}
function availableResult(evidence, site) {
  const p = profile(site); check(!p.query, 'legacy evidence cannot qualify extended scope');
  check(object(evidence) && equal(Object.keys(evidence).sort(), ['api', 'details', 'dictionaryResponses', 'issues', 'key', 'pages', 'policy', 'stopped', 'version']) && evidence.version === 2 && evidence.policy === 'available' && evidence.key === p.key && evidence.api === p.api, 'available evidence source binding');
  check(equal(evidence, sanitize(evidence)), 'unsafe credential sanitization');
  check(Array.isArray(evidence.pages) && evidence.pages.length > 0 && evidence.pages.length <= MAX_PAGES && Array.isArray(evidence.details) && Array.isArray(evidence.dictionaryResponses) && evidence.dictionaryResponses.length <= 1 && Array.isArray(evidence.issues) && evidence.issues.every(v => typeof v === 'string'), 'evidence limits/issues');
  const rows = new Map(), totals = new Set(), issues = new Set(evidence.issues); let index = 1, ended = false, duplicates = 0;
  for (const page of evidence.pages) {
    check(!ended, 'extra request after endpoint'); const j = pageData(page, site, index); totals.add(j.total);
    for (const post of j.list) try { record(post, site); const id = officialId(post, site); if (rows.has(id)) duplicates++; else rows.set(id, { post }); }
    catch (error) { issues.add('列表记录未应用（id=' + (typeof post?.positionId === 'string' || Number.isSafeInteger(post?.idProjPosition) ? officialId(post, site) : '未知') + '）：' + error.message); }
    ended = atEnd(j, index); index++;
  }
  check(rows.size > 0, 'no usable records; zero cannot clear existing data');
  for (const dict of evidence.dictionaryResponses) {
    check(p.track === 'campus', 'unexpected dictionary source');
    const target = [...rows.values()].find(job => equal(dict.request, dictionaryRequestFor(site, job.post))); check(target, 'dictionary native posting Referer binding');
    const data = cultureData(dict, target.post, site); for (const job of rows.values()) job.culture = data;
  }
  const detailIds = new Set();
  for (const attempt of evidence.details) {
    check(p.track === 'social', 'unexpected details source');
    const target = [...rows.values()].find(job => job.post.jobDirectionList?.length && equal(attempt.request, detailRequestFor(site, job.post)));
    check(target && !detailIds.has(target.post.positionId), 'detail native posting/duplicate request binding'); detailIds.add(target.post.positionId);
    // A valid successful transport may contain a bad record: keep its list body and report the single gap.
    nativeResponse(attempt, detailRequestFor(site, target.post), site);
    try { target.detail = detailData(attempt, target.post, site); }
    catch (error) { issues.add('方向详情未应用（id=' + target.post.positionId + '）：' + error.message); }
  }
  if (evidence.stopped !== null) {
    const stopped = evidence.stopped; check(object(stopped) && equal(Object.keys(stopped).sort(), ['error', 'httpStatus', 'request', 'response']) && typeof stopped.error === 'string' && stopped.error, 'stopped request binding');
    const { error, ...attempt } = stopped; let failed = false, bound = false;
    if (!ended && evidence.pages.length < MAX_PAGES && equal(stopped.request, requestFor(site, index))) {
      check(evidence.details.length === 0 && evidence.dictionaryResponses.length === 0, 'supplement after list refusal'); bound = true; try { pageData(attempt, site, index); } catch { failed = true; }
    } else if (p.track === 'campus' && evidence.dictionaryResponses.length === 0) {
      const target = [...rows.values()].find(job => equal(stopped.request, dictionaryRequestFor(site, job.post)));
      if (target) { bound = true; try { cultureData(attempt, target.post, site); } catch { failed = true; } }
    } else if (p.track === 'social') {
      const target = [...rows.values()].find(job => job.post.jobDirectionList?.length && !detailIds.has(job.post.positionId) && equal(stopped.request, detailRequestFor(site, job.post)));
      if (target) { bound = true; try { detailData(attempt, target.post, site); } catch { failed = true; } }
    }
    check(bound && failed, 'successful/unbound stopped request'); issues.add('请求停止：' + error);
  }
  if (duplicates) issues.add('重复官方id ' + duplicates + ' 次，保留首次顺序/正文');
  if (totals.size !== 1 || !totals.has(rows.size)) issues.add('官方total ' + [...totals].join('→') + '；实际唯一岗位 ' + rows.size);
  if (!ended) issues.add('分页未穷尽，覆盖待补');
  if (p.track === 'campus' && !evidence.dictionaryResponses.length) issues.add('文化匹配性正文未取得，待补');
  if (p.track === 'social') { const missing = [...rows.values()].filter(job => job.post.jobDirectionList?.length && !job.detail).length; if (missing) issues.add('有 ' + missing + ' 个岗位方向详情未取得，保留列表JD并待补'); }
  issues.add(JD_NOTICE); const jobs = [...rows.values()]; validateJobs(jobs, site);
  return { complete: false, total: jobs.length, jobs, verification: evidence, issues: [...issues] };
}
function collectAvailable(pages, site, issues = [], stopped = null, supplements = {}) {
  profile(site); check(object(supplements) && Object.keys(supplements).every(k => ['details', 'dictionaryResponses'].includes(k)), 'invalid supplements');
  return freeze(availableResult(sanitize(structuredClone({ version: 2, policy: 'available', key: site.key, api: site.api, pages, details: supplements.details ?? [], dictionaryResponses: supplements.dictionaryResponses ?? [], issues, stopped })), site));
}
function extendedResult(evidence, site) {
  const p = profile(site); check(p.query, 'unverified extended source');
  check(object(evidence) && equal(Object.keys(evidence).sort(), ['api', 'base', 'baseCompletedAt', 'dailyCompletedAt', 'dailyDetails', 'dailyPages', 'issues', 'jobTypeResponses', 'key', 'policy', 'stopped', 'version']) && evidence.version === 3 && evidence.policy === 'available' && evidence.key === p.key && evidence.api === p.api, 'extended evidence source binding');
  check(equal(evidence, sanitize(evidence)), 'unsafe credential sanitization'); materialTime(evidence.baseCompletedAt); materialTime(evidence.dailyCompletedAt);
  check(Array.isArray(evidence.dailyPages) && evidence.dailyPages.length <= MAX_PAGES && Array.isArray(evidence.dailyDetails) && Array.isArray(evidence.jobTypeResponses) && evidence.jobTypeResponses.length <= 1 && Array.isArray(evidence.issues) && evidence.issues.every(v => typeof v === 'string'), 'extended evidence limits/issues');
  const base = availableResult(evidence.base, PROFILES[1]), issues = new Set([...base.issues, ...evidence.issues]), rows = new Map(), dailyRows = new Map(), totals = new Set();
  check(evidence.base.pages.length + evidence.dailyPages.length <= MAX_PAGES, 'extended source page limit');
  check(!evidence.base.stopped || evidence.dailyPages.length === 0 && evidence.dailyDetails.length === 0 && evidence.jobTypeResponses.length === 0 && evidence.stopped === null, 'supplement after base refusal');
  for (const job of base.jobs) {
    record(job.post, p, 'social'); if (job.detail) record(job.detail, p, 'social'); rows.set(job.post.positionId, { ...job, scope: 'social' });
  }
  let index = 1, ended = false, duplicates = 0;
  for (const page of evidence.dailyPages) {
    check(!ended, 'extra daily request after endpoint'); const data = pageData(page, p, index, 'daily'); totals.add(data.total);
    for (const post of data.list) try {
      record(post, p, 'daily');
      if (rows.has(post.positionId)) { if (!dailyRows.has(post.positionId)) issues.add('跨招聘渠道官方id碰撞（id=' + post.positionId + '），日常记录未应用，保留首次正文'); else duplicates++; }
      else { const job = { post, scope: 'daily' }; dailyRows.set(post.positionId, job); rows.set(post.positionId, job); }
    } catch (error) { issues.add('日常列表记录未应用（id=' + (typeof post?.positionId === 'string' ? post.positionId : '未知') + '）：' + error.message); }
    ended = atEnd(data, index++);
  }
  const detailIds = new Set();
  for (const attempt of evidence.dailyDetails) {
    const target = [...dailyRows.values()].find(job => job.post.jobDirectionList?.length && equal(attempt.request, detailRequestFor(p, job.post, 'daily')));
    check(target && !detailIds.has(target.post.positionId), 'daily detail native posting/duplicate request binding'); detailIds.add(target.post.positionId);
    nativeResponse(attempt, detailRequestFor(p, target.post, 'daily'), p);
    try { target.detail = detailData(attempt, target.post, p, 'daily'); } catch (error) { issues.add('日常方向详情未应用（id=' + target.post.positionId + '）：' + error.message); }
  }
  for (const material of evidence.jobTypeResponses) { const data = jobTypeData(material, p); for (const job of rows.values()) job.jobTypes = data; }
  if (evidence.stopped !== null) {
    const stopped = evidence.stopped; check(object(stopped) && equal(Object.keys(stopped).sort(), ['error', 'httpStatus', 'request', 'response']) && typeof stopped.error === 'string' && stopped.error, 'extended stopped request binding');
    const { error, ...attempt } = stopped; let bound = false, failed = false;
    if (!ended && evidence.base.pages.length + evidence.dailyPages.length < MAX_PAGES && equal(attempt.request, requestFor(p, index, 'daily'))) {
      check(evidence.dailyDetails.length === 0 && evidence.jobTypeResponses.length === 0, 'supplement after daily list refusal'); bound = true;
      try { pageData(attempt, p, index, 'daily'); } catch { failed = true; }
    } else {
      const target = [...dailyRows.values()].find(job => job.post.jobDirectionList?.length && !detailIds.has(job.post.positionId) && equal(attempt.request, detailRequestFor(p, job.post, 'daily')));
      if (target) { check(evidence.jobTypeResponses.length === 0, 'dictionary after daily detail refusal'); bound = true; try { detailData(attempt, target.post, p, 'daily'); } catch { failed = true; } }
      else if (evidence.jobTypeResponses.length === 0 && ['social', 'daily'].some(scope => equal(attempt.request, jobTypeRequestFor(p, scope)))) {
        bound = true; try { jobTypeData({ ...attempt, completedAt: null }, p); } catch { failed = true; }
      }
    }
    check(bound && failed, 'successful/unbound extended stopped request'); issues.add('请求停止：' + error);
  }
  if (duplicates) issues.add('日常重复官方id ' + duplicates + ' 次，保留首次顺序/正文');
  if (evidence.dailyPages.length && (totals.size !== 1 || !totals.has(dailyRows.size))) issues.add('日常官方total ' + [...totals].join('→') + '；实际唯一岗位 ' + dailyRows.size);
  if (!ended) issues.add('日常分页未穷尽，覆盖待补');
  const missing = [...dailyRows.values()].filter(job => job.post.jobDirectionList?.length && !job.detail).length;
  if (missing) issues.add('有 ' + missing + ' 个日常岗位方向详情未取得，保留列表JD并待补');
  if (!evidence.jobTypeResponses.length) issues.add('职能字典未取得，类别保持未知');
  const jobs = [...rows.values()]; validateJobs(jobs, p); return { complete: false, total: jobs.length, jobs, verification: evidence, issues: [...issues] };
}
function collectExtended(base, site, options = {}) {
  check(object(options) && Object.keys(options).every(k => ['baseCompletedAt', 'dailyCompletedAt', 'dailyPages', 'dailyDetails', 'jobTypeResponses', 'issues', 'stopped'].includes(k)), 'invalid extended supplements');
  const evidence = { version: 3, policy: 'available', key: site.key, api: site.api, base, baseCompletedAt: options.baseCompletedAt ?? null, dailyCompletedAt: options.dailyCompletedAt ?? null,
    dailyPages: options.dailyPages ?? [], dailyDetails: options.dailyDetails ?? [], jobTypeResponses: options.jobTypeResponses ?? [], issues: options.issues ?? [], stopped: options.stopped ?? null };
  return freeze(extendedResult(sanitize(structuredClone(evidence)), site));
}
function validateEvidence(evidence, jobs, site) { const r = evidence?.version === 3 ? extendedResult(evidence, site) : availableResult(evidence, site); check(equal(jobs, r.jobs), 'available jobs/native evidence binding'); return r; }
function normalizeRecord(job, site) {
  const p = profile(site), post = boundRecord(job, site), campus = p.track === 'campus', duty = post[campus ? 'positionDesc' : 'jobDuty'] ?? '', requirements = post[campus ? 'positionRequire' : 'workRequire'] ?? '';
  const sections = [], add = (title, desc) => { if (typeof desc === 'string' && desc.trim()) sections.push(title + '\n' + desc); };
  add('岗位职责', duty);
  if (campus) {
    // The current TEXT renderer chooses knowledgeSkill || positionRequire. Preserve the separately acquired alternate too.
    if (post.knowledgeSkill && post.knowledgeSkill !== requirements) add('任职要求', requirements);
    add('知识技能要求', post.knowledgeSkill || requirements); add('AI能力要求', post.aiCapabilityLevelDesc); add('加分项', post.bonusItem);
    const culture = job.culture?.find(d => d.status === 1) ?? job.culture?.[0]; add('文化匹配性', culture?.itemName);
  } else {
    add('任职要求', requirements); add('AI能力要求', post.aiCapabilityLevelDesc);
    const directions = job.detail?.jobDirectionList ?? post.jobDirectionList;
    for (const d of directions ?? []) {
      if (d.directionName) sections.push(d.directionName);
      if (d.workCityName) sections.push(d.workCityName);
      add('岗位职责', d.jobDuty); add('任职要求', d.workRequire); add('AI能力要求', d.aiCapabilityLevelDesc);
    }
    // Do not erase previously obtained base fields when a newer detail has an empty/null section.
    if (job.detail?.jobDuty && job.detail.jobDuty !== duty) add('岗位职责', job.detail.jobDuty);
    if (job.detail?.workRequire && job.detail.workRequire !== requirements) add('任职要求', job.detail.workRequire);
    if (job.detail?.aiCapabilityLevelDesc && job.detail.aiCapabilityLevelDesc !== post.aiCapabilityLevelDesc) add('AI能力要求', job.detail.aiCapabilityLevelDesc);
  }
  return { id: String(officialId(post, site)), title: post[campus ? 'positionName' : 'publishName'], city: post.workCityName ?? '', category: campus ? post.positionTypeName ?? '' : job.jobTypes?.find(d => d.dictValue === post.jobType)?.dictName ?? '',
    channels: job.scope === 'daily' ? [] : [p.track], employment: job.scope === 'daily' && post.recruitTypeName === '日常实习生招聘' ? 'internship' : null, talentPlan: null, date: null, dateKind: null, sourceStatus: null, url: jobUrl(p, post), duty, requirements, description: sections.join('\n'), jdComplete: false };
}
function portalNotice(site) {
  if (!verifiedSource(site)) return '';
  if (site.query) return '仅覆盖官网SOCIAL-RECRUITMENT社会招聘与OFFEN-RECRUITMENT日常实习两个公开渠道，保留原社会范围，职位类别/城市不限；日常实习性质按官网明确标签，校/社渠道未明确；' + JD_NOTICE + '，不代表公司全球全集；原社会资料与补充材料各保真实取得钟，日期、人才计划及原状态未知。';
  return (site.track === 'campus' ? '仅覆盖官网默认校园全项目列表，项目/职位类别/城市不限，包含应届、博士及实习；独立日常实习入口未核验；' : '仅覆盖官网默认社招渠道，保留SOCIAL-RECRUITMENT，职位类别/城市/经验不限；仅为有方向的岗位取得可得方向正文，日常实习另入口未核验；') +
    JD_NOTICE + '，不代表公司全球全集或独立法律雇主；其它未核验日期、性质、人才计划、原状态保持未知。';
}
function requestSession(options) {
  const { fetchImpl = globalThis.fetch, sleep = ms => new Promise(r => setTimeout(r, ms)), now = Date.now } = options;
  check(typeof fetchImpl === 'function' && typeof sleep === 'function' && typeof now === 'function', 'invalid request transport');
  const deadline = now() + PROCESS_MS; let lastStart = null, stopped = null;
  async function request(expected, validate) {
    if (stopped) return null;
    const attempt = { request: expected, httpStatus: null, response: null };
    try {
      while (lastStart !== null && now() - lastStart < 200) await sleep(200 - (now() - lastStart));
      check(now() < deadline, 'process safety deadline'); lastStart = now(); const controller = new AbortController(); let timer;
      try {
        await Promise.race([(async () => {
          const r = await fetchImpl(expected.url, { method: expected.method, headers: expected.headers, ...(expected.body === null ? {} : { body: JSON.stringify(expected.body) }), redirect: 'error', signal: controller.signal });
          attempt.httpStatus = r?.status ?? null; check(attempt.httpStatus === 200, 'native HTTP ' + attempt.httpStatus);
          attempt.response = sanitize(await r.json());
        })(), new Promise((_, reject) => { timer = setTimeout(() => { controller.abort(); reject(new Error('OPPO: request/body timeout')); }, Math.min(15000, deadline - now())); })]);
      } finally { clearTimeout(timer); }
      validate(attempt); return attempt;
    } catch (error) { stopped = { ...attempt, error: String(error?.message || 'request failure') }; return null; }
  }
  return { request, deadline, now, get stopped() { return stopped; } };
}
async function fetchLegacyAvailable(site, options = {}, session = requestSession(options)) {
  const p = profile(site), { maxPages = MAX_PAGES, listPages = [], supplementSeed = {} } = options, { deadline, now } = session;
  check(Number.isSafeInteger(maxPages) && maxPages > 0 && maxPages <= MAX_PAGES && Array.isArray(listPages) && listPages.length <= maxPages, 'invalid request limits/seeds');
  const pages = sanitize(structuredClone(listPages)), details = sanitize(structuredClone(supplementSeed.details ?? [])), dictionaryResponses = sanitize(structuredClone(supplementSeed.dictionaryResponses ?? [])), issues = [];
  let stopped = null, ended = false;
  if (pages.length) { collectAvailable(pages, site, [], null, { details, dictionaryResponses }); ended = atEnd(pageData(pages.at(-1), site, pages.length), pages.length); }
  else check(details.length === 0 && dictionaryResponses.length === 0, 'supplement seeds need bound list pages');
  const request = async (...args) => { const attempt = await session.request(...args); stopped = session.stopped; return attempt; };
  for (let index = pages.length + 1; !ended && index <= maxPages; index++) {
    if (now() >= deadline) { issues.push('达到进程安全时限，覆盖待补'); break; }
    const attempt = await request(requestFor(site, index), a => pageData(a, site, index));
    if (!attempt) { if (!pages.length) throw new Error(stopped.error); break; }
    pages.push(attempt); ended = atEnd(pageData(attempt, site, index), index);
    if (!ended && index === maxPages) issues.push('达到分页安全上限，覆盖待补');
  }
  let result = collectAvailable(pages, site, issues, stopped, { details, dictionaryResponses });
  if (!stopped) {
    if (p.track === 'campus' && dictionaryResponses.length === 0) {
      if (now() >= deadline) issues.push('达到进程安全时限，文化正文待补');
      else { const post = result.jobs[0].post, attempt = await request(dictionaryRequestFor(site, post), a => cultureData(a, post, site)); if (attempt) dictionaryResponses.push(attempt); }
    }
    if (p.track === 'social') for (const job of result.jobs) {
      if (stopped) break;
      if (!job.post.jobDirectionList?.length || details.some(d => equal(d.request, detailRequestFor(site, job.post)))) continue;
      if (now() >= deadline) { issues.push('达到进程安全时限，方向正文待补'); break; }
      const attempt = await request(detailRequestFor(site, job.post), a => detailData(a, job.post, site)); if (attempt) details.push(attempt);
    }
  }
  result = collectAvailable(pages, site, issues, stopped, { details, dictionaryResponses }); return result;
}
async function fetchExtended(site, options = {}) {
  const p = profile(site); check(p.query, 'unverified extended source');
  const session = requestSession(options), { now, deadline, request } = session, maxPages = options.maxPages ?? MAX_PAGES;
  check(Number.isSafeInteger(maxPages) && maxPages > 0 && maxPages <= MAX_PAGES, 'invalid extended page limit');
  // An explicitly supplied v2 base reuses its real clock, never the replay time. Default CLI collects the original SOC scope first.
  const base = options.base ?? (await fetchLegacyAvailable(PROFILES[1], options, session)).verification;
  const evidence = { baseCompletedAt: options.base ? options.baseCompletedAt ?? null : new Date(now()).toISOString(), dailyCompletedAt: options.dailyCompletedAt ?? null,
    dailyPages: sanitize(structuredClone(options.dailyPages ?? [])), dailyDetails: sanitize(structuredClone(options.dailyDetails ?? [])), jobTypeResponses: sanitize(structuredClone(options.jobTypeResponses ?? [])), issues: [], stopped: null };
  let result = collectExtended(base, p, evidence);
  if (base.stopped) return result;
  check(base.pages.length + evidence.dailyPages.length <= maxPages, 'extended seed page limit');
  let ended = evidence.dailyPages.length > 0 && atEnd(pageData(evidence.dailyPages.at(-1), p, evidence.dailyPages.length, 'daily'), evidence.dailyPages.length);
  for (let index = evidence.dailyPages.length + 1; !ended && base.pages.length + index <= maxPages; index++) {
    if (now() >= deadline) { evidence.issues.push('达到进程安全时限，日常覆盖待补'); break; }
    const attempt = await request(requestFor(p, index, 'daily'), a => pageData(a, p, index, 'daily'));
    if (!attempt) break;
    evidence.dailyPages.push(attempt); evidence.dailyCompletedAt = new Date(now()).toISOString(); ended = atEnd(pageData(attempt, p, index, 'daily'), index);
  }
  if (!ended && !session.stopped) evidence.issues.push('达到分页/时间安全上限，日常覆盖待补');
  evidence.stopped = session.stopped; result = collectExtended(base, p, evidence);
  if (!session.stopped) for (const job of result.jobs.filter(j => j.scope === 'daily')) {
    if (!job.post.jobDirectionList?.length || evidence.dailyDetails.some(d => equal(d.request, detailRequestFor(p, job.post, 'daily')))) continue;
    if (now() >= deadline) { evidence.issues.push('达到进程安全时限，日常方向正文待补'); break; }
    const attempt = await request(detailRequestFor(p, job.post, 'daily'), a => detailData(a, job.post, p, 'daily'));
    if (!attempt) break;
    evidence.dailyDetails.push(attempt); evidence.dailyCompletedAt = new Date(now()).toISOString();
  }
  if (!session.stopped && !evidence.jobTypeResponses.length) {
    if (now() >= deadline) evidence.issues.push('达到进程安全时限，职能字典待补');
    else {
      const attempt = await request(jobTypeRequestFor(p), a => jobTypeData({ ...a, completedAt: null }, p));
      if (attempt) evidence.jobTypeResponses.push({ ...attempt, completedAt: new Date(now()).toISOString() });
    }
  }
  evidence.stopped = session.stopped; return collectExtended(base, p, evidence);
}
async function fetchAvailable(site, options = {}) { return profile(site).query ? fetchExtended(site, options) : fetchLegacyAvailable(site, options); }
async function run(args, options = {}) {
  check(Array.isArray(args) && args.length === 2 && typeof args[0] === 'string' && typeof args[1] === 'string' && args[1], 'Usage: oppo_portal.js <siteJSON> <outputFile>');
  const site = JSON.parse(args[0]), result = await fetchAvailable(site, options), envelope = { key: site.key, api: site.api, mode: 'custom', ...result }, file = args[1], temp = file + '.tmp-' + randomUUID(); let created = false;
  try { const fd = fs.openSync(temp, 'wx'); created = true; try { fs.writeFileSync(fd, JSON.stringify(envelope, null, 2) + '\n', 'utf8'); } finally { fs.closeSync(fd); } fs.renameSync(temp, file); }
  finally { if (created && fs.existsSync(temp)) fs.unlinkSync(temp); } return envelope;
}
module.exports = { PROFILES, requiresVerification, verifiedSource, validateJobs, normalizeRecord, portalNotice, collectAvailable, collectExtended, jobTypeRequestFor, validateEvidence, fetchExtended, fetchAvailable, run, requestFor, detailRequestFor, dictionaryRequestFor };
if (require.main === module) run(process.argv.slice(2)).catch(error => { console.error(error.message); process.exitCode = 1; });
