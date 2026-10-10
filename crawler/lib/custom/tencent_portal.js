'use strict';
const fs = require('node:fs');
const { randomUUID } = require('node:crypto');
const { isDeepStrictEqual: equal } = require('node:util');
const workday = require('./tencent_workday');
const ADAPTER = 'tencent-portal-v1', MAX_PAGES = 200, PROCESS_MS = 900000;
const check = (ok, message) => { if (!ok) throw new Error('Tencent: ' + message); };
const object = v => v !== null && typeof v === 'object' && !Array.isArray(v), string = v => typeof v === 'string';
function freeze(v) { if (v && typeof v === 'object') { Object.values(v).forEach(freeze); Object.freeze(v); } return v; }
const PROFILES = freeze([
  { key: 'tencent', company: '腾讯', ats: 'custom', adapter: ADAPTER, track: 'campus', batch: '官网默认校园全部项目', exclude: '(无)', origin: 'https://join.qq.com',
    url: 'https://join.qq.com/post.html', api: 'https://join.qq.com/api/v1/position/searchPosition', detailApi: 'https://join.qq.com/api/v1/jobDetails/getJobDetailsByPostId', listJD: false, fetchDetails: true,
    body: { projectIdList: [], projectMappingIdList: [1, 2, 104, 14, 20], keyword: '', bgList: [], workCountryType: 0, workCityList: [], recruitCityList: [], positionFidList: [], pageIndex: 1, pageSize: 100 } },
  { key: 'tencent_social', company: '腾讯', ats: 'custom', adapter: ADAPTER, track: 'social', batch: '官网默认area=cn广列表', exclude: '(无)', origin: 'https://careers.tencent.com',
    url: 'https://careers.tencent.com/search.html', api: 'https://careers.tencent.com/tencentcareer/api/post/Query', detailApi: 'https://careers.tencent.com/tencentcareer/api/post/ByPostId', listJD: true, fetchDetails: true,
    query: { countryId: '', cityId: '', bgIds: '', productId: '', categoryId: '', parentCategoryId: '', attrId: '', keyword: '', pageIndex: 1, pageSize: 100, language: 'zh-cn', area: 'cn' } }
]);
function requiresVerification(site) {
  if (PROFILES.some(p => p.key === site?.key) || site?.adapter === ADAPTER) return true;
  return ['origin', 'apiOrigin', 'url', 'api', 'detailApi'].some(k => {
    if (!site || !Object.hasOwn(site, k)) return false;
    try { check(string(site[k]), 'invalid URI'); return ['join.qq.com', 'careers.tencent.com'].includes(new URL(site[k].replace(/^(GET|POST)\s+/, '')).hostname.toLowerCase().replace(/\.$/, '')); } catch { return true; }
  });
}
function verifiedSource(site) { return PROFILES.some(p => equal(p, site)); }
function profile(site) { check(verifiedSource(site), 'unverified source identity/scope/mode'); return PROFILES.find(p => p.key === site.key); }
function timestamp(n) { check(Number.isSafeInteger(n) && n >= 0, 'invalid timestamp'); return n; }
function requestFor(site, pageIndex, time = Date.now()) {
  const p = profile(site); check(Number.isSafeInteger(pageIndex) && pageIndex > 0 && pageIndex <= MAX_PAGES, 'invalid page'); timestamp(time);
  const headers = { Accept: 'application/json, text/plain, */*', Referer: p.url };
  if (p.track === 'campus') return { url: p.api + '?timestamp=' + time, method: 'POST', headers: { ...headers, 'Content-Type': 'application/json;charset=UTF-8', Origin: p.origin }, body: { ...p.body, pageIndex } };
  return { url: p.api + '?timestamp=' + time + '&' + new URLSearchParams({ ...p.query, pageIndex }), method: 'GET', headers, body: null };
}
function identity(post, p) { const id = post?.[p.track === 'campus' ? 'postId' : 'PostId']; check(string(id) && /^-?[1-9]\d*$/.test(id), 'invalid native PostId string'); return id; }
function needsDetail(site, post) { const p = profile(site); return p.track === 'campus' ? post.positionSource === 'oa' || !post.positionUrl : post.SourceID === 1; }
function detailRequestFor(site, post, time = Date.now()) {
  const p = profile(site), id = identity(post, p); check(needsDetail(p, post), 'external posting has no proven internal detail contract'); timestamp(time);
  return { url: p.detailApi + '?timestamp=' + time + '&postId=' + id + (p.track === 'social' ? '&language=zh-cn' : ''), method: 'GET',
    headers: { Accept: 'application/json, text/plain, */*', Referer: p.origin + (p.track === 'campus' ? '/post_detail.html?postid=' : '/jobdesc.html?postId=') + id }, body: null };
}
function safeUrl(value) { check(string(value) && value.trim() === value, 'invalid official URL'); let u; try { u = new URL(value); } catch { check(false, 'invalid official URL'); }
  check(['http:', 'https:'].includes(u.protocol) && !u.username && !u.password, 'unsafe official URL'); return value; }
function officialUrl(post, p) {
  if (p.track === 'social') return safeUrl(post.PostURL);
  return post.positionSource !== 'oa' && post.positionUrl ? safeUrl(post.positionUrl) : p.origin + '/post_detail.html?postid=' + identity(post, p);
}
function listRecord(post, p) {
  check(object(post), 'invalid native post'); identity(post, p);
  const fields = p.track === 'campus' ? ['positionTitle', 'workCities', 'positionSource'] : ['RecruitPostName', 'LocationName', 'CategoryName', 'Responsibility'];
  for (const k of fields) check(Object.hasOwn(post, k) && string(post[k]), 'missing/invalid native ' + k);
  check(post[p.track === 'campus' ? 'positionTitle' : 'RecruitPostName'].trim(), 'empty native title');
  if (p.track === 'campus') {
    check(Object.hasOwn(post, 'positionUrl') && (post.positionUrl === null || string(post.positionUrl)), 'invalid native positionUrl');
    check(post.recruitLabelName == null || string(post.recruitLabelName), 'invalid native recruitLabelName');
  }
  else check([1, 2, 4].includes(post.SourceID), 'unverified native SourceID');
  officialUrl(post, p); return post;
}
function business(raw, p) {
  check(raw?.httpStatus === 200, 'native HTTP refusal'); const r = raw.response;
  if (p.track === 'campus') { check(object(r) && equal(Object.keys(r).sort(), ['data', 'message', 'status']) && r.status === 0 && r.message === '' && object(r.data), 'native business/response refusal'); return r.data; }
  check(object(r) && equal(Object.keys(r).sort(), ['Code', 'Data']) && r.Code === 200 && object(r.Data), 'native business/response refusal'); return r.Data;
}
function requestTime(raw) { const value = new URL(raw?.request?.url ?? 'https://invalid').searchParams.get('timestamp'); check(value !== null && /^(0|[1-9]\d*)$/.test(value), 'missing/invalid request timestamp'); return timestamp(Number(value)); }
function pageData(raw, site, index) {
  const p = profile(site); check(object(raw) && equal(raw.request, requestFor(p, index, requestTime(raw))), 'list request binding'); const d = business(raw, p);
  const keys = p.track === 'campus' ? ['count', 'positionList'] : ['Count', 'Posts']; check(equal(Object.keys(d).sort(), keys), 'native list response shape');
  const posts = p.track === 'campus' ? d.positionList : d.Posts, total = p.track === 'campus' ? d.count : d.Count;
  check(Array.isArray(posts) && posts.length <= 100 && [...posts.keys()].every(i => Object.hasOwn(posts, i)) && Number.isSafeInteger(total) && total >= 0, 'native list/total');
  return { posts, total };
}
function atEnd(data, index) { return data.posts.length === 0 || index * 100 >= data.total; }
const CAMPUS_DETAIL_KEYS = new Set(('postId id tid tidName fid oldId title desc request workCity workCityList recruitCity recruitCityList ordering status selectedWorks withFile ideptId intentionBGDList projectId projectName recruitType recruitLabelName introduction fileUrl coverUrl graduateBonus internBonus isQingyun techTagId techTagName topicDetail topicRequirement projectInternDirections subDirectionId subDirectionDtos rrCount positionSource positionUrl').split(' '));
const SOCIAL_DETAIL_KEYS = new Set(('Id PostId RecruitPostId RecruitPostName LocationId LocationName CountryName BGId BGName ComCode ComName OuterPostTypeID CategoryName ProductName Responsibility Requirement LastUpdateTime PostURL SourceID IsCollect IsValid PostLightItem ImportantItem Introduction DepartmentIntroduction RequireWorkYearsName').split(' '));
const text = v => v ?? '';
function nullableText(d, fields) { for (const k of fields) check(Object.hasOwn(d, k) && (d[k] === null || string(d[k])), 'missing/invalid detail ' + k); }
function departments(groups) {
  if (groups === null) return '';
  check(Array.isArray(groups), 'invalid department body'); const pieces = [];
  for (const g of groups) { check(object(g) && Array.isArray(g.departmentList), 'invalid department list');
    // Both ordinary tabs and project-12 newIntentionBGDList render these TEXT nodes before name/comment.
    check([g.showTitle, g.showTxt].every(v => v == null || string(v)), 'invalid department group text');
    if (g.showTitle || g.showTxt) pieces.push([g.showTitle, g.showTxt].filter(string).join('\n'));
    for (const d of g.departmentList) { check(object(d) && string(d.name) && (d.comment === null || string(d.comment)), 'invalid department text'); if (d.name || d.comment) pieces.push(d.name + (d.comment ? '\n' + d.comment : '')); }
  }
  return pieces.join('\n\n');
}
function campusSections(d) {
  nullableText(d, ['desc', 'request', 'introduction', 'graduateBonus', 'internBonus', 'topicDetail', 'topicRequirement']);
  check(Number.isSafeInteger(d.projectId) && Number.isSafeInteger(d.recruitType) && [null, 0, 1].includes(d.isQingyun), 'invalid body branch');
  const topic = [14, 20].includes(d.projectId) && d.isQingyun === 1;
  const duty = text(topic ? d.topicDetail : d.desc), requirements = text(topic ? d.topicRequirement : d.request), pieces = [];
  if (!topic && d.introduction) pieces.push(d.introduction);
  pieces.push((topic ? '课题描述' : '岗位描述') + '\n' + duty, (topic ? '课题要求' : '岗位要求') + '\n' + requirements);
  const bonus = d.recruitType === 1 ? d.graduateBonus : d.recruitType === 2 ? d.internBonus : null;
  if (bonus) pieces.push('加分项或注意事项\n' + bonus);
  // Keep the other acquired TEXT field without inventing a heading or interpreting it as this branch's application requirements.
  if (d.recruitType !== 1 && d.graduateBonus) pieces.push(d.graduateBonus);
  if (d.recruitType !== 2 && d.internBonus) pieces.push(d.internBonus);
  if (Object.hasOwn(d, 'intentionBGDList')) { const body = departments(d.intentionBGDList); if (body) pieces.push(body); }
  if (d.projectInternDirections !== null && d.projectInternDirections !== undefined) {
    check(Array.isArray(d.projectInternDirections), 'invalid intern direction body');
    for (const g of d.projectInternDirections) { check(object(g) && Array.isArray(g.subProjectInterns), 'invalid intern directions');
      // The parent tab precedes child titles; selecting a child binds its own department groups.
      check(g.positionFidName == null || string(g.positionFidName), 'invalid intern direction group title');
      if (g.positionFidName) pieces.push(g.positionFidName);
      for (const s of g.subProjectInterns) { check(object(s) && string(s.title), 'invalid intern direction title'); const body = departments(s.intentionBGDList ?? null); if (s.title || body) pieces.push(s.title + (body ? '\n' + body : '')); }
    }
  }
  return { duty, requirements, description: pieces.join('\n\n') };
}
function campusBody(d) {
  if (!d.subDirectionDtos) return campusSections(d);
  check(Array.isArray(d.subDirectionDtos) && d.subDirectionDtos.length > 0, 'invalid subdirections'); const parts = [];
  for (const row of d.subDirectionDtos) { check(object(row) && object(row.subDirection) && string(row.subDirection.title), 'invalid subdirection body'); const s = row.subDirection;
    check(Object.keys(s).every(k => CAMPUS_DETAIL_KEYS.has(k)), 'unknown subdirection body field');
    const body = campusSections({ ...d, ...s, title: d.title, introduction: d.introduction, recruitType: d.recruitType, subDirectionDtos: null });
    parts.push({ ...body, description: d.title + '-' + s.title + '\n' + body.description });
  }
  return { duty: parts.map(s => s.duty).join('\n\n'), requirements: parts.map(s => s.requirements).join('\n\n'), description: parts.map(s => s.description).join('\n\n') };
}
// The official project-12 renderer consumes the server's category template DTO:
// null postId, fixed negative id and tid. It is not an ordinary post or a client-generated JD.
function templateIdentity(d, post, p) {
  return p.track === 'campus' && ['-2', '-3', '-4', '-5', '-6'].includes(post.postId) &&
    post.id === Number(post.postId) && post.position === Number(post.postId) && post.projectId === 12 && post.positionFamily === -Number(post.postId) &&
    d.postId === null && d.id === post.position && d.tid === post.positionFamily && d.projectId === 12 && d.recruitType === 2 && d.title === post.positionTitle;
}
function detailData(raw, site, post) {
  const p = profile(site); check(object(raw) && equal(raw.request, detailRequestFor(p, post, requestTime(raw))), 'detail request binding'); const d = business(raw, p);
  const fields = p.track === 'campus' ? CAMPUS_DETAIL_KEYS : SOCIAL_DETAIL_KEYS; check(Object.keys(d).every(k => fields.has(k)), 'unknown detail body field');
  check(d[p.track === 'campus' ? 'postId' : 'PostId'] === identity(post, p) || templateIdentity(d, post, p), 'detail PostId identity');
  if (p.track === 'campus') { check(d.id === post.position && string(d.title) && d.title.trim(), 'detail secondary position/title binding'); campusBody(d);
    if (Object.hasOwn(d, 'tidName')) check(d.tidName === null || string(d.tidName), 'invalid native category');
  } else { check(d.RecruitPostId === post.RecruitPostId && string(d.RecruitPostName), 'detail RecruitPostId identity'); nullableText(d, ['Responsibility', 'Requirement', 'Introduction', 'ImportantItem', 'PostLightItem', 'DepartmentIntroduction']); }
  return d;
}
function validateJobs(jobs, site) {
  const p = profile(site); check(Array.isArray(jobs) && jobs.length > 0, 'no usable jobs; zero cannot clear existing data'); const ids = new Set();
  for (const row of jobs) { check(object(row) && equal(Object.keys(row).sort(), Object.hasOwn(row, 'supplement') ? ['detail', 'post', 'supplement'] : ['detail', 'post']), 'native row binding'); listRecord(row.post, p); const id = identity(row.post, p);
    check(!ids.has(id), 'duplicate official PostId'); ids.add(id); check(row.detail === null || object(row.detail), 'invalid detail slot'); if (row.detail) detailData(row.detail, p, row.post);
    if (Object.hasOwn(row, 'supplement')) { check(row.detail === null, 'supplement cannot replace obtained internal detail'); supplementData(row.supplement, p, row.post); } }
  return true;
}
function availableResult(evidence, site) {
  const p = profile(site); check(object(evidence) && equal(Object.keys(evidence).sort(), ['api', 'details', 'issues', 'key', 'pages', 'policy', 'stopped', 'version']) &&
    evidence.version === 1 && evidence.policy === 'available' && evidence.key === p.key && evidence.api === p.api, 'evidence source binding');
  check(Array.isArray(evidence.pages) && evidence.pages.length > 0 && evidence.pages.length <= MAX_PAGES && Array.isArray(evidence.details) && Array.isArray(evidence.issues) && evidence.issues.every(string), 'evidence limits/issues');
  const rows = new Map(), notes = new Set(evidence.issues), totals = new Set(); let ended = false, duplicates = 0;
  evidence.pages.forEach((raw, i) => { check(!ended, 'extra page after endpoint'); const d = pageData(raw, p, i + 1); totals.add(d.total);
    for (const post of d.posts) { try { listRecord(post, p); const id = identity(post, p); if (rows.has(id)) duplicates++; else rows.set(id, { post, detail: null }); } catch (error) { notes.add('列表记录未应用：' + error.message); } }
    ended = atEnd(d, i + 1);
  });
  const eligible = [...rows.values()].filter(r => needsDetail(p, r.post)); check(evidence.details.length <= eligible.length, 'extra detail requests');
  evidence.details.forEach((raw, i) => { detailData(raw, p, eligible[i].post); eligible[i].detail = raw; });
  if (evidence.stopped !== null) {
    const s = evidence.stopped; check(object(s) && equal(Object.keys(s).sort(), ['error', 'httpStatus', 'request', 'response', 'stage']) && string(s.error) && s.error, 'stopped evidence'); let failed = false;
    if (s.stage === 'page') { check(!ended && evidence.details.length === 0 && evidence.pages.length < MAX_PAGES, 'stopped page order'); check(equal(s.request, requestFor(p, evidence.pages.length + 1, requestTime(s))), 'stopped page request binding'); try { pageData(s, p, evidence.pages.length + 1); } catch { failed = true; }
    } else { check(s.stage === 'detail' && evidence.details.length < eligible.length, 'stopped detail order'); const post = eligible[evidence.details.length].post;
      check(equal(s.request, detailRequestFor(p, post, requestTime(s))), 'stopped detail request binding'); try { detailData(s, p, post); } catch { failed = true; }
      // Keep the actual v1 receipt of the old PostId-only guard; do not rewrite it as a website refusal.
      if (!failed && s.error === 'Tencent: detail PostId identity' && templateIdentity(business(s, p), post, p)) failed = true; }
    check(failed, 'successful request disguised as stopped'); notes.add('请求停止：' + s.error);
  }
  check(rows.size > 0, 'no usable jobs; zero cannot clear existing data');
  if (duplicates) notes.add('重复官方PostId ' + duplicates + ' 次，保留首次事实/正文');
  if (totals.size !== 1 || !totals.has(rows.size)) notes.add('官方total ' + [...totals].join('→') + '；实际唯一岗位 ' + rows.size);
  if (!ended) notes.add('分页未穷尽，覆盖待补'); const jobs = [...rows.values()], missing = jobs.filter(r => !r.detail).length;
  if (missing) notes.add('详情未取得 ' + missing + ' 岗（含外部入口）；已取得列表职责保留，正文完整性待核验');
  validateJobs(jobs, p); return { complete: false, total: jobs.length, jobs, verification: evidence, issues: [...notes] };
}
function collectAvailable(pages, site, details = [], issues = [], stopped = null) { profile(site); return freeze(availableResult(structuredClone({ version: 1, policy: 'available', key: site.key, api: site.api, pages, details, issues, stopped }), site)); }
function supplementRequestFor(site, post, time = Date.now()) {
  const p = profile(site); listRecord(post, p);
  return needsDetail(p, post) ? detailRequestFor(p, post, time) : workday.requestFor(officialUrl(post, p));
}
function supplementData(raw, site, post) {
  const p = profile(site), kind = needsDetail(p, post) ? 'internal' : 'workday';
  check(object(raw) && equal(Object.keys(raw).sort(), ['httpStatus', 'kind', 'postId', 'request', 'response', ...(kind === 'workday' && Object.hasOwn(raw, 'canonical') ? ['canonical'] : [])].sort()) && raw.postId === identity(post, p) && raw.kind === kind, 'supplement native/source binding');
  return kind === 'internal' ? detailData(raw, p, post) : workday.validateDetail(raw, officialUrl(post, p));
}
function supplementRows(jobs, site) {
  const missing = jobs.filter(r => !r.detail && !r.supplement);
  return [...missing.filter(r => needsDetail(site, r.post)), ...missing.filter(r => !needsDetail(site, r.post))];
}
function supplementedResult(evidence, site) {
  const p = profile(site); check(object(evidence) && equal(Object.keys(evidence).sort(), ['api', 'base', 'baseCompletedAt', 'issues', 'key', 'policy', 'stopped', 'supplements', 'version']) && evidence.version === 2 && evidence.policy === 'available' && evidence.key === p.key && evidence.api === p.api, 'supplement evidence source binding');
  check(evidence.baseCompletedAt === null || string(evidence.baseCompletedAt) && new Date(evidence.baseCompletedAt).toISOString() === evidence.baseCompletedAt, 'base capture clock');
  const base = availableResult(evidence.base, p), jobs = structuredClone(base.jobs), wanted = supplementRows(jobs, p);
  check(Array.isArray(evidence.supplements) && evidence.supplements.length <= wanted.length && Array.isArray(evidence.issues) && evidence.issues.every(string), 'supplement limits/issues');
  // A recorded public response may fill a sparse gap; never request intervening jobs just to make evidence contiguous.
  const byId = new Map(wanted.map(r => [identity(r.post, p), r]));
  evidence.supplements.forEach(raw => { const row = byId.get(raw?.postId); check(row && !row.supplement, 'unknown/duplicate supplemental native ID'); supplementData(raw, p, row.post); row.supplement = raw; });
  if (evidence.stopped !== null) {
    const s = evidence.stopped; check(object(s) && equal(Object.keys(s).sort(), ['error', 'httpStatus', 'kind', 'postId', 'request', 'response', ...(s.kind === 'workday' && Object.hasOwn(s, 'canonical') ? ['canonical'] : [])].sort()) && string(s.error) && s.error && evidence.supplements.length < wanted.length, 'stopped supplement');
    const row = byId.get(s.postId); check(row && !row.supplement, 'stopped supplement cannot reuse obtained material'); const post = row.post;
    check(s.postId === identity(post, p) && s.kind === (needsDetail(p, post) ? 'internal' : 'workday') && equal(s.request, supplementRequestFor(p, post, s.kind === 'internal' ? requestTime(s) : 0)), 'stopped supplement request binding');
    let failed = false; try { const { error, ...raw } = s; supplementData(raw, p, post); } catch { failed = true; } check(failed, 'successful supplement disguised as stopped');
  }
  const notes = base.issues.filter(n => !n.startsWith('详情未取得 ')).map(n => n.startsWith('请求停止：') ? '首轮历史记录：' + n : n);
  notes.push('复用已取得的列表和内部详情，仅补充缺口；列表未重新采集，范围和额外正文完整性仍待核验', ...evidence.issues);
  const missing = jobs.filter(r => !r.detail && !r.supplement).length;
  if (missing) notes.push('详情仍未取得 ' + missing + ' 岗；保留已取得列表正文，不推定官网缺失或下架');
  if (evidence.stopped) notes.push('本次补充停止：' + evidence.stopped.error);
  validateJobs(jobs, p); return { complete: false, total: jobs.length, jobs, verification: evidence, issues: [...new Set(notes)] };
}
function collectSupplemented(base, site, supplements = [], issues = [], stopped = null, baseCompletedAt = null) {
  profile(site);
  if (base.version === 2) { const old = supplementedResult(base, site); check(base.stopped === null, 'a stopped supplemental run requires a newly authorized collection phase'); baseCompletedAt ??= base.baseCompletedAt; supplements = [...old.verification.supplements, ...supplements]; base = base.base; }
  return freeze(supplementedResult(structuredClone({ version: 2, policy: 'available', key: site.key, api: site.api, base, baseCompletedAt, supplements, issues, stopped }), site));
}
function resumedResult(evidence, site) {
  const p = profile(site); check(object(evidence) && equal(Object.keys(evidence).sort(), ['api', 'issues', 'key', 'policy', 'prior', 'priorCompletedAt', 'stopped', 'supplements', 'version']) && evidence.version === 3 && evidence.policy === 'available' && evidence.key === p.key && evidence.api === p.api && evidence.prior?.version === 2, 'resumed evidence source/prior binding');
  check(string(evidence.priorCompletedAt) && new Date(evidence.priorCompletedAt).toISOString() === evidence.priorCompletedAt, 'prior capture clock');
  const prior = supplementedResult(evidence.prior, p);
  check(evidence.prior.baseCompletedAt === null || Date.parse(evidence.priorCompletedAt) >= Date.parse(evidence.prior.baseCompletedAt), 'prior capture clock precedes base');
  check(Array.isArray(evidence.supplements) && [...evidence.supplements.keys()].every(i => Object.hasOwn(evidence.supplements, i)) && Array.isArray(evidence.issues) && [...evidence.issues.keys()].every(i => Object.hasOwn(evidence.issues, i)) && evidence.issues.every(string), 'resumed supplement limits/issues');
  // Reuse the same native gap/stop checks; the complete original v2 (including its stop) stays embedded and independently verified above.
  const current = supplementedResult({ ...evidence.prior, supplements: [...evidence.prior.supplements, ...evidence.supplements], issues: evidence.issues, stopped: evidence.stopped }, p);
  const history = prior.issues.filter(n => !n.startsWith('详情仍未取得 ')).map(n => n.startsWith('本次补充停止：') ? '前阶段历史记录：' + n : n);
  return { ...current, verification: evidence, issues: [...new Set([...history, ...current.issues, '新授权阶段显式补充原缺口；前阶段资料钟 ' + evidence.priorCompletedAt + '，列表和已取得正文未重新采集'])] };
}
function collectResumed(prior, site, { priorCompletedAt, supplements = [], issues = [], stopped = null } = {}) {
  profile(site);
  return freeze(resumedResult(structuredClone({ version: 3, policy: 'available', key: site.key, api: site.api, prior, priorCompletedAt, supplements, issues, stopped }), site));
}
function validateEvidence(evidence, jobs, site) { const r = evidence?.version === 3 ? resumedResult(evidence, site) : evidence?.version === 2 ? supplementedResult(evidence, site) : availableResult(evidence, site); check(equal(jobs, r.jobs), 'jobs/native evidence binding'); return r; }
function normalizeRecord(row, site) {
  const p = profile(site); validateJobs([row], p); const post = row.post, d = row.detail ? detailData(row.detail, p, post) : null;
  const extra = row.supplement ? supplementData(row.supplement, p, post) : null;
  let duty = p.track === 'social' ? post.Responsibility : '', requirements = '', description = '';
  if (d && p.track === 'campus') ({ duty, requirements, description } = campusBody(d));
  if (d && p.track === 'social') {
    duty = text(d.Responsibility).trim() ? d.Responsibility : post.Responsibility; requirements = text(d.Requirement);
    const pieces = []; if (d.Introduction) pieces.push(d.Introduction); pieces.push('岗位职责\n' + duty, '岗位要求\n' + requirements);
    if (d.ImportantItem) pieces.push('加分项\n' + d.ImportantItem); if (d.PostLightItem) pieces.push('岗位亮点\n' + d.PostLightItem);
    // The current official locale contains no DepartmentIntroduction heading; preserve its TEXT without inventing one.
    if (d.DepartmentIntroduction) pieces.push(d.DepartmentIntroduction); description = pieces.join('\n\n');
  }
  if (extra && row.supplement.kind === 'internal' && p.track === 'campus') ({ duty, requirements, description } = campusBody(extra));
  if (extra && row.supplement.kind === 'workday') description = workday.description(row.supplement, officialUrl(post, p));
  // The official list shows the first three space-delimited TEXT badges. Do not infer from project IDs, titles, or a detail-only flag.
  const badges = p.track === 'campus' && string(post.recruitLabelName) ? post.recruitLabelName.split(' ').slice(0, 3) : [];
  return { id: identity(post, p), title: p.track === 'campus' ? post.positionTitle : post.RecruitPostName,
    city: p.track === 'campus' ? (Array.isArray(d?.workCityList) && d.workCityList.every(string) ? d.workCityList.join('/') : post.workCities) : post.LocationName,
    category: p.track === 'campus' ? text((d ?? (row.supplement?.kind === 'internal' ? extra : null))?.tidName) : post.CategoryName, channels: [p.track], employment: badges.some(label => ['应届实习', '实习生', '日常实习'].includes(label)) ? 'internship' : null, talentPlan: badges.includes('青云计划') ? true : null, date: null, dateKind: null, sourceStatus: null,
    url: officialUrl(post, p), duty, requirements, description, jdComplete: false };
}
function portalNotice(site) { return verifiedSource(site) ? (site.track === 'campus' ? '仅覆盖官网默认五项目校园广列表，包含实习、青云及官网链接的Workday岗位；' : '仅覆盖官网默认area=cn无职业筛选广列表，含官网链接的外部入口；') +
  '完整性未验证，不代表公司全球全集；原生PostId字符串是身份，内部详情与外部链接分开；已取得当前正文及额外描述保留，缺详情诚实提示；' + (site.track === 'campus' ? '按官网直接可见原标签标实习及青云计划，应届毕业生不推全职，无计划标签不推非人才计划；' : '性质、人才计划未知；') + '日期及原状态语义未证明，不推定实际可投。' : ''; }
async function fetchSupplemented(site, base, options = {}) {
  const p = profile(site), { fetchImpl = globalThis.fetch, sleep = ms => new Promise(r => setTimeout(r, ms)), now = Date.now, seed = [], baseCompletedAt = null, known = require('../known').knownIds() } = options;
  check(typeof fetchImpl === 'function' && typeof sleep === 'function' && typeof now === 'function' && Array.isArray(seed), 'invalid supplemental request limits');
  let result = collectSupplemented(base, p, seed, [], null, baseCompletedAt), lastStart = null, stopped = null;
  const deadline = options.deadline ?? now() + PROCESS_MS, supplements = [...seed], issues = [];
  async function send(raw) {
    if (options.sendImpl) return options.sendImpl(raw);
    while (lastStart !== null && now() - lastStart < 200) await sleep(200 - (now() - lastStart));
    const start = now(), remaining = deadline - start; check(remaining > 0, 'source safety deadline'); lastStart = start;
    const request = raw.request, response = await fetchImpl(request.url, { method: request.method, headers: request.headers, redirect: 'error', signal: AbortSignal.timeout(Math.min(15000, Math.ceil(remaining))) });
    raw.httpStatus = response?.status ?? null; if (raw.httpStatus === 200) raw.response = await response.json(); return raw;
  }
  for (const row of supplementRows(result.jobs, p).filter(r => !known.has(identity(r.post, p)))) { // 增量：已发布且有补充正文的沿用
    if (now() + 200 >= deadline) { issues.push('达到进程安全时限，补充待补'); break; }
    let raw;
    try { raw = { postId: identity(row.post, p), kind: needsDetail(p, row.post) ? 'internal' : 'workday', request: supplementRequestFor(p, row.post, now()), httpStatus: null, response: null }; }
    catch (error) { issues.push('外部协议尚未核验，保留原生链接和列表正文：' + error.message); break; }
    try { raw = await send(raw); supplementData(raw, p, row.post); supplements.push(raw); }
    catch (error) { stopped = { ...raw, error: String(error?.message || error) }; break; }
  }
  return collectSupplemented(base, p, supplements, issues, stopped, baseCompletedAt);
}
async function fetchAvailable(site, options = {}) {
  const p = profile(site), { fetchImpl = globalThis.fetch, sleep = ms => new Promise(r => setTimeout(r, ms)), now = Date.now, maxPages = MAX_PAGES, listPages = [], known = require('../known').knownIds() } = options;
  check(typeof fetchImpl === 'function' && typeof sleep === 'function' && typeof now === 'function' && Number.isSafeInteger(maxPages) && maxPages > 0 && maxPages <= MAX_PAGES && Array.isArray(listPages), 'invalid request limits');
  const pages = structuredClone(listPages), details = [], issues = [], deadline = now() + PROCESS_MS; let lastStart = null, stopped = null;
  if (pages.length) collectAvailable(pages, p);
  async function send(raw) {
    while (lastStart !== null && now() - lastStart < 200) await sleep(200 - (now() - lastStart));
    const start = now(), remaining = deadline - start; check(remaining > 0, 'source safety deadline'); lastStart = start; const request = raw.request;
    const r = await fetchImpl(request.url, { method: request.method, headers: request.headers, ...(request.body === null ? {} : { body: JSON.stringify(request.body) }), redirect: 'error', signal: AbortSignal.timeout(Math.min(15000, Math.ceil(remaining))) });
    raw.httpStatus = r?.status ?? null; if (raw.httpStatus === 200) raw.response = await r.json(); return raw;
  }
  let ended = pages.length > 0 && atEnd(pageData(pages.at(-1), p, pages.length), pages.length);
  for (let n = pages.length + 1; !ended && n <= maxPages; n++) {
    if (now() + 200 >= deadline) { issues.push('达到进程安全时限，覆盖待补'); break; }
    let raw = { request: requestFor(p, n, now()), httpStatus: null, response: null };
    try { raw = await send(raw); const d = pageData(raw, p, n); pages.push(raw); ended = atEnd(d, n); }
    catch (error) { if (!pages.length) throw error; stopped = { ...raw, stage: 'page', error: String(error?.message || error) }; break; }
  }
  if (!ended && !stopped) issues.push('达到分页/时间安全上限，覆盖待补'); const rows = collectAvailable(pages, p).jobs;
  if (!stopped) for (const row of rows.filter(r => needsDetail(p, r.post) && !known.has(identity(r.post, p)))) { // 增量：已发布且有详情的沿用
    if (now() + 200 >= deadline) { issues.push('达到进程安全时限，详情待补'); break; }
    let raw = { request: detailRequestFor(p, row.post, now()), httpStatus: null, response: null };
    try { raw = await send(raw); detailData(raw, p, row.post); details.push(raw); }
    catch (error) { stopped = { ...raw, stage: 'detail', error: String(error?.message || error) }; break; }
  }
  const result = collectAvailable(pages, p, details, issues, stopped);
  if (stopped || !result.jobs.some(r => !needsDetail(p, r.post))) return result;
  return fetchSupplemented(p, result.verification, { ...options, sendImpl: send, deadline, baseCompletedAt: new Date(now()).toISOString() });
}
async function run(args, options = {}) {
  check(Array.isArray(args) && args.length === 2 && string(args[0]) && string(args[1]) && args[1], 'Usage: tencent_portal.js <siteJSON> <outputFile>');
  const site = JSON.parse(args[0]), result = options.supplementBase ? await fetchSupplemented(site, options.supplementBase, options) : await fetchAvailable(site, options), envelope = { key: site.key, api: site.api, mode: 'custom', ...result }, file = args[1], temp = file + '.tmp-' + randomUUID(); let created = false;
  try { const fd = fs.openSync(temp, 'wx'); created = true; try { fs.writeFileSync(fd, JSON.stringify(envelope, null, 2) + '\n', 'utf8'); } finally { fs.closeSync(fd); } fs.renameSync(temp, file); }
  finally { if (created && fs.existsSync(temp)) fs.unlinkSync(temp); } return envelope;
}
// 增量：旧门户不声称 JD 完整（jdComplete 恒为 false），以“已有补充/详情正文”作为已取得详情的标志。
const hasDetail = job => job.description.trim() !== '';
module.exports = { hasDetail, PROFILES, requiresVerification, verifiedSource, requestFor, detailRequestFor, needsDetail, pageData, atEnd, validateJobs, normalizeRecord, portalNotice, collectAvailable, collectSupplemented, collectResumed, supplementRequestFor, validateEvidence, fetchSupplemented, fetchAvailable, run };
if (require.main === module) run(process.argv.slice(2)).catch(error => { console.error(error.message); process.exitCode = 1; });
