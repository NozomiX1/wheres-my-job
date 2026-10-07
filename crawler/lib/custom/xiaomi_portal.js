'use strict';
const fs = require('node:fs');
const { isDeepStrictEqual } = require('node:util');
const ORIGIN = 'https://hr.xiaomi.com', API = ORIGIN + '/website/api/agent/searchJobPage';
const PROFILE = Object.freeze({ key: 'xiaomi', company: '小米', ats: 'custom', adapter: 'xiaomi-hr-v1', origin: ORIGIN, api: API, url: ORIGIN + '/website/opportunities.html?project=%E6%A0%A1%E6%8B%9B', track: 'campus', detailApi: 'https://xiaomi.jobs.f.mioffice.cn/api/v1/job/posts', fetchDetails: true, body: Object.freeze({ keyword: '', cityZhNames: '', pageSize: 10, type: 2 }) });
const SOCIAL_PROFILE = Object.freeze({ ...PROFILE, key: 'xiaomi_social', track: 'social', url: ORIGIN + '/website/opportunities.html?project=%E7%A4%BE%E6%8B%9B', fetchDetails: false, body: Object.freeze({ ...PROFILE.body, type: 1 }) });
const FIELDS = ['id', 'title', 'cityZhNames', 'levelOneDeptName', 'description', 'requirement', 'expectedJobLevel', 'publishTime', 'larkJobCode', 'type', 'url', 'jobId', 'jobPostId'];
const MAX_PAGES = 200;
const NOTICE = '小米校招覆盖探索机会入口type=2的无关键词/城市筛选全集（含其顶尖应届、新零售等项目），不等于公司全球或独立实习/type=4入口全集；性质、人才计划、职能和日期未知。';
function shape(value, keys) {
  if (!value || typeof value !== 'object' || Array.isArray(value) || !isDeepStrictEqual(Object.keys(value).sort(), keys.slice().sort())) throw new Error('Xiaomi: unknown/missing native shape');
}
function requiresVerification(site) {
  if (!site) return false;
  if (['xiaomi', 'xiaomi_social'].includes(site.key) || site.adapter === PROFILE.adapter) return true;
  return ['api', 'url', 'origin', 'apiOrigin'].some(k => {
    if (site[k] === undefined) return false;
    if (typeof site[k] !== 'string') return true;
    try { return ['hr.xiaomi.com', 'xiaomi.jobs.f.mioffice.cn'].includes(new URL(site[k].replace(/^GET\s+/, '')).hostname.toLowerCase().replace(/\.$/, '')); }
    catch { return true; } // A malformed declaration must not authorize generic downgrade.
  });
}
function verifiedSource(site) { return isDeepStrictEqual(site, PROFILE) || isDeepStrictEqual(site, SOCIAL_PROFILE); }
function profileFor(site) { if (!verifiedSource(site)) throw new Error('Xiaomi: unverified identity/scope/mode'); return site.key === 'xiaomi_social' ? SOCIAL_PROFILE : PROFILE; }
function portalNotice(site) { return verifiedSource(site) ? site.key === 'xiaomi_social' ? '小米社招只覆盖HR type=1无关键词/城市筛选入口；先展示官网列表职责/要求，详情及额外正文待补，完整性未验证，不冒公司全球全集。城市按原序展示，不推断主次；性质、计划、职能及日期未知。' : NOTICE : ''; }
function socialJob(job) {
  if (!job || !Number.isSafeInteger(job.id) || job.id < 1 || job.type !== 1 || typeof job.title !== 'string' || !job.title.trim()) throw new Error('Xiaomi: invalid social identity/title/type');
  for (const key of ['jobId', 'jobPostId']) if (typeof job[key] !== 'string' || !/^[1-9]\d*$/.test(job[key])) throw new Error('Xiaomi: invalid social posting identity');
  if (job.url !== 'https://xiaomi.jobs.f.mioffice.cn/index/position/' + job.jobPostId + '/detail') throw new Error('Xiaomi: social official URL/identity mismatch');
  if (!Array.isArray(job.cityZhNames) || job.cityZhNames.some(c => typeof c !== 'string')) throw new Error('Xiaomi: invalid social cities');
  for (const key of ['description', 'requirement']) if (job[key] != null && typeof job[key] !== 'string') throw new Error('Xiaomi: invalid social JD text');
  return job;
}
function validateJob(job) {
  shape(job, FIELDS);
  if (!Number.isSafeInteger(job.id) || job.id < 1 || !/^[1-9]\d*$/.test(job.jobId) || typeof job.jobId !== 'string' || !/^[1-9]\d*$/.test(job.jobPostId) || typeof job.jobPostId !== 'string' || job.type !== 2) throw new Error('Xiaomi: invalid native identities/type');
  for (const key of ['title', 'description', 'requirement', 'levelOneDeptName', 'publishTime', 'larkJobCode']) if (typeof job[key] !== 'string' || !job[key].trim()) throw new Error('Xiaomi: unverified empty/invalid native field ' + key);
  if (job.expectedJobLevel !== null || !/^\d{4}-\d{2}-\d{2}$/.test(job.publishTime) || !Array.isArray(job.cityZhNames) || !job.cityZhNames.length || job.cityZhNames.some(c => typeof c !== 'string' || !c.trim())) throw new Error('Xiaomi: invalid native attributes');
  if (typeof job.url !== 'string' || !/^https:\/\/xiaomi\.jobs\.f\.mioffice\.cn\/(?:campus|futurestar|toptalent|newretailing)\/position\/[1-9]\d*\/detail$/.test(job.url) || new URL(job.url).pathname.split('/')[3] !== job.jobPostId) throw new Error('Xiaomi: official posting URL/identity mismatch');
}
const TOPIC_KEY = '7595885661741271302';
function nativeList(job) { shape(job, [...FIELDS, 'detail']); const { detail, ...native } = job; return native; }
function validateDetail(json, native) {
  shape(json, ['code', 'data', 'message', 'error']);
  if (json.code !== 0 || json.message !== 'ok' || json.error !== null) throw new Error('Xiaomi: detail business refusal');
  shape(json.data, ['job_post_detail', 'recommend_job_post_List']);
  if (!isDeepStrictEqual(json.data.recommend_job_post_List, [])) throw new Error('Xiaomi: unexpected recommendation scope');
  const d = json.data.job_post_detail;
  const required = ['id', 'title', 'description', 'requirement', 'recruit_type', 'publish_time', 'channel_online_status', 'job_id', 'city_list', 'job_post_info', 'city_info_list_for_delivery', 'tag_list', 'storefront_mode', 'storefront_list', 'process_type'];
  const optional = ['city_info', 'job_subject', 'job_function'];
  if (!d || typeof d !== 'object' || required.some(k => !Object.hasOwn(d, k)) || Object.keys(d).some(k => !required.includes(k) && !optional.includes(k))) throw new Error('Xiaomi: unknown/missing detail fields');
  if (d.id !== native.jobPostId || d.job_id !== native.jobId || ['title', 'description', 'requirement'].some(k => d[k] !== native[k])) throw new Error('Xiaomi: list/detail identity or TEXT mismatch');
  const info = d.job_post_info;
  shape(info, ['recruitment_type', 'HighlightList', 'JobChannelPublishList', 'job_post_object_value_map', 'address_list', 'city_list', 'correlation_job_list', 'tag_list', 'storefront_list', 'target_major_list', 'job_post_process_time_list', 'job_level_id_list']);
  // All nonstandard text is inspected. Only this exact published TEXT field/label is proved.
  const custom = info.job_post_object_value_map;
  if (!custom || typeof custom !== 'object' || Array.isArray(custom) || Object.keys(custom).some(k => k !== TOPIC_KEY || typeof custom[k] !== 'string')) throw new Error('Xiaomi: unknown extra JD');
  for (const key of ['HighlightList', 'JobChannelPublishList', 'correlation_job_list', 'storefront_list']) if (!isDeepStrictEqual(info[key], [])) throw new Error('Xiaomi: unknown extra detail information');
  if (!isDeepStrictEqual(d.tag_list, []) || !isDeepStrictEqual(d.storefront_list, [])) throw new Error('Xiaomi: unknown detail tags/storefront text');
  return custom[TOPIC_KEY] || '';
}
function validateJobs(jobs, site) {
  profileFor(site);
  if (!Array.isArray(jobs)) throw new Error('Xiaomi: invalid jobs');
  const seen = ['id', 'jobId', 'jobPostId'].map(() => new Set());
  for (const job of jobs) { if (site.key === 'xiaomi_social') socialJob(job); else { const native = nativeList(job); validateJob(native); validateDetail(job.detail, native); } ['id', 'jobId', 'jobPostId'].forEach((key, i) => { if (seen[i].has(job[key])) throw new Error('Xiaomi: duplicate native identity ' + key); seen[i].add(job[key]); }); }
  return true;
}
function detailRequest(native) { return { url: PROFILE.detailApi + '/' + native.jobPostId + '?portal_type=6&with_recommend=false', method: 'GET', body: null, headers: { Accept: 'application/json', 'website-path': new URL(native.url).pathname.split('/')[1], 'accept-language': 'zh-CN', Referer: native.url } }; }
function requestFor(pageNum, site = PROFILE) {
  const query = new URLSearchParams({ keyword: '', cityZhNames: '', pageSize: '10', pageNum: String(pageNum), type: String(profileFor(site).body.type) });
  return { url: API + '?' + query, method: 'GET', body: null };
}
function stateFor() { return { total: null, next: 1, jobs: [], seen: ['id', 'jobId', 'jobPostId'].map(() => new Set()), ended: false }; }
function consume(page, state) {
  shape(page, ['request', 'httpStatus', 'response']);
  if (state.ended || page.httpStatus !== 200 || !isDeepStrictEqual(page.request, requestFor(state.next))) throw new Error('Xiaomi: request/status/page chain mismatch');
  const json = page.response; shape(json, ['code', 'message', 'data', 'traceId']);
  if (json.code !== 0 || json.message !== '成功' || json.traceId !== null) throw new Error('Xiaomi: native business refusal/unknown envelope');
  const d = json.data; shape(d, ['list', 'pageSize', 'pageNum', 'pageTotal', 'total']);
  if (!Number.isSafeInteger(d.total) || d.total < 1) throw new Error('Xiaomi: effective zero has not been verified');
  if (state.total === null) state.total = d.total;
  const last = Math.ceil(state.total / 10);
  if (d.total !== state.total || d.pageSize !== 10 || d.pageNum !== state.next || d.pageTotal !== last || !Array.isArray(d.list)) throw new Error('Xiaomi: native totals/page metadata changed');
  const length = state.next > last ? 0 : Math.min(10, state.total - (state.next - 1) * 10);
  if (d.list.length !== length) throw new Error('Xiaomi: early empty/short/overflow page');
  for (const job of d.list) { validateJob(job); ['id', 'jobId', 'jobPostId'].forEach((k, i) => { if (state.seen[i].has(job[k])) throw new Error('Xiaomi: duplicate native identity ' + k); state.seen[i].add(job[k]); }); state.jobs.push(job); }
  state.ended = state.next === last + 1;
  state.next++;
}
function collectAvailable(pages, issues = []) {
  const verification = { version: 2, policy: 'available', key: SOCIAL_PROFILE.key, api: API, pages, issues };
  const result = availableResult(verification, SOCIAL_PROFILE); return { ...result, verification };
}
function availableResult(evidence, site) {
  if (!isDeepStrictEqual(site, SOCIAL_PROFILE)) throw new Error('Xiaomi: available social scope mismatch');
  shape(evidence, ['version', 'policy', 'key', 'api', 'pages', 'issues']);
  if (evidence.version !== 2 || evidence.policy !== 'available' || evidence.key !== site.key || evidence.api !== API || !Array.isArray(evidence.pages) || !evidence.pages.length || evidence.pages.length >= MAX_PAGES || !Array.isArray(evidence.issues) || evidence.issues.some(v => typeof v !== 'string')) throw new Error('Xiaomi: invalid available evidence');
  const rows = new Map(), totals = new Set(), issues = new Set(evidence.issues); let duplicates = 0;
  for (const [i, page] of evidence.pages.entries()) {
    if (page.httpStatus !== 200 || !isDeepStrictEqual(page.request, requestFor(i + 1, site)) || page.response?.code !== 0 || page.response.message !== '成功') throw new Error('Xiaomi: available HTTP/business/scope binding');
    const d = page.response.data;
    if (!d || d.pageNum !== i + 1 || d.pageSize !== 10 || !Array.isArray(d.list)) throw new Error('Xiaomi: available page/list binding');
    if (Number.isSafeInteger(d.total)) totals.add(d.total);
    for (const row of d.list) {
      try { socialJob(row); if (rows.has(row.id)) duplicates++; rows.set(row.id, row); }
      catch (error) { issues.add('列表记录未应用：' + error.message); }
    }
  }
  if (!rows.size) throw new Error('Xiaomi: no usable social records; zero cannot clear existing data');
  if (duplicates) issues.add('重复身份 ' + duplicates + ' 次，按官网ID保留最后取得记录');
  if (totals.size !== 1 || !totals.has(rows.size)) issues.add('官方total ' + [...totals].join('→') + '；实际唯一岗位 ' + rows.size);
  issues.add('全部岗位仅取得列表职责/要求，详情及额外正文完整性待补');
  validateJobs([...rows.values()], site);
  return { complete: false, total: rows.size, jobs: [...rows.values()], issues: [...issues] };
}
function validateEvidence(evidence, jobs, site) {
  if (evidence?.policy === 'available') { const result = availableResult(evidence, site); if (!isDeepStrictEqual(jobs, result.jobs)) throw new Error('Xiaomi: available jobs/native binding'); return result; }
  if (site.key === 'xiaomi_social') throw new Error('Xiaomi: social completeness has not been verified');
  profileFor(site); shape(evidence, ['version', 'key', 'api', 'total', 'scans']); validateJobs(jobs, site);
  if (evidence.version !== 1 || evidence.key !== PROFILE.key || evidence.api !== API || evidence.total !== jobs.length || !Array.isArray(evidence.scans) || evidence.scans.length !== 2) throw new Error('Xiaomi: missing/mismatched native evidence');
  const scans = evidence.scans.map(scan => {
    shape(scan, ['pages', 'details']);
    if (!Array.isArray(scan.pages) || !scan.pages.length || scan.pages.length >= MAX_PAGES) throw new Error('Xiaomi: pagination ceiling/invalid scan');
    const state = stateFor(); for (const page of scan.pages) consume(page, state);
    if (!state.ended || state.jobs.length !== evidence.total || !Array.isArray(scan.details) || scan.details.length !== state.jobs.length) throw new Error('Xiaomi: incomplete native pagination/EOF/details');
    return state.jobs.map((native, i) => {
      const detail = scan.details[i]; shape(detail, ['request', 'httpStatus', 'response']);
      if (detail.httpStatus !== 200 || !isDeepStrictEqual(detail.request, detailRequest(native))) throw new Error('Xiaomi: detail native request/status/order mismatch');
      validateDetail(detail.response, native); return { ...native, detail: detail.response };
    });
  });
  const map = rows => new Map(rows.map(j => [j.id, j]));
  // Cities remain ordered raw facts too. No social multiset exception is inferred here.
  if (!isDeepStrictEqual(map(scans[0]), map(scans[1])) || !isDeepStrictEqual(jobs, scans[0])) throw new Error('Xiaomi: full raw facts/set drift or jobs/native mismatch');
  return true;
}
function normalizeRecord(job, site) {
  profileFor(site);
  if (site.key === 'xiaomi_social') { socialJob(job); return { id: String(job.id), title: job.title, city: job.cityZhNames.join('/'), category: '', channels: ['social'], employment: null, talentPlan: null, date: null, dateKind: null, sourceStatus: null, url: job.url, duty: job.description ?? '', requirements: job.requirement ?? '', description: '', jdComplete: false }; }
  const native = nativeList(job); validateJob(native); const topic = validateDetail(job.detail, native);
  // Official React TEXT sections and the proved custom TEXT/label, no trim or HTML decoding.
  const description = topic ? '职位描述\n' + job.description + '\n\n职位要求\n' + job.requirement + '\n\n职位信息\n课题名称及内容：\n' + topic : '';
  return { id: String(job.id), title: job.title, city: job.cityZhNames.join('/'), category: '', channels: ['campus'], employment: null, talentPlan: null, date: null, dateKind: null, sourceStatus: null, url: job.url, duty: job.description, requirements: job.requirement, description, jdComplete: /[\p{L}\p{N}]/u.test(job.description + job.requirement + topic) };
}
async function fetchAll(site, options = {}) {
  profileFor(site);
  const { fetchImpl = globalThis.fetch, sleep = ms => new Promise(resolve => setTimeout(resolve, ms)), delayMs = 200, timeoutMs = 15000, maxPages = MAX_PAGES } = options;
  if (typeof fetchImpl !== 'function' || typeof sleep !== 'function' || !Number.isFinite(delayMs) || delayMs < 0 || !Number.isSafeInteger(timeoutMs) || timeoutMs < 1 || !Number.isSafeInteger(maxPages) || maxPages < 2 || maxPages > MAX_PAGES) throw new Error('Xiaomi: invalid request limits');
  const scans = []; let requested = false;
  async function get(request) {
    if (requested) await sleep(Math.max(200, delayMs)); requested = true;
    const response = await fetchImpl(request.url, { method: 'GET', headers: request.headers || { Accept: 'application/json' }, redirect: 'error', signal: AbortSignal.timeout(Math.min(15000, timeoutMs)) });
    if (response.status !== 200) throw new Error('Xiaomi: native HTTP ' + response.status);
    return { request, httpStatus: response.status, response: await response.json() };
  }
  for (let round = 0; round < 2; round++) {
    const state = stateFor(), scan = { pages: [], details: [] };
    for (let index = 1; index < maxPages; index++) {
      const page = await get(requestFor(state.next)); consume(page, state); scan.pages.push(page);
      if (state.ended) break;
    }
    if (!state.ended) throw new Error('Xiaomi: pagination safety ceiling reached');
    for (const native of state.jobs) { const detail = await get(detailRequest(native)); validateDetail(detail.response, native); scan.details.push(detail); }
    scans.push(scan);
  }
  const jobs = scans[0].pages.flatMap(page => page.response.data.list).map((native, i) => ({ ...native, detail: scans[0].details[i].response })), verification = { version: 1, key: PROFILE.key, api: API, total: jobs.length, scans };
  validateEvidence(verification, jobs, site); return { complete: true, total: jobs.length, jobs, verification };
}
async function fetchAvailable(site, options = {}) {
  if (!isDeepStrictEqual(site, SOCIAL_PROFILE)) throw new Error('Xiaomi: available social scope mismatch');
  const { fetchImpl = globalThis.fetch, sleep = ms => new Promise(r => setTimeout(r, ms)), maxPages = MAX_PAGES } = options;
  if (typeof fetchImpl !== 'function' || typeof sleep !== 'function' || !Number.isSafeInteger(maxPages) || maxPages < 2 || maxPages > MAX_PAGES) throw new Error('Xiaomi: invalid request limits');
  const pages = [], issues = [];
  for (let n = 1; n < maxPages; n++) {
    try {
      await sleep(200); const request = requestFor(n, site);
      const r = await fetchImpl(request.url, { method: 'GET', headers: { Accept: 'application/json' }, redirect: 'error', signal: AbortSignal.timeout(15000) });
      if (r.status !== 200) throw new Error('Xiaomi: native HTTP ' + r.status);
      const response = await r.json();
      if (response.code !== 0 || response.message !== '成功' || response.data?.pageNum !== n || response.data.pageSize !== 10 || !Array.isArray(response.data.list)) throw new Error('Xiaomi: native business/page refusal');
      pages.push({ request, httpStatus: r.status, response });
      if (response.data.list.length === 0) break;
      if (n === maxPages - 1) issues.push('达到分页安全上限，覆盖待补');
    } catch (error) { if (!pages.length) throw error; issues.push('请求停止：' + error.message); break; }
  }
  return collectAvailable(pages, issues);
}
const run = (site, options) => site.key === 'xiaomi_social' ? fetchAvailable(site, options) : fetchAll(site, options);
module.exports = { PROFILE, SOCIAL_PROFILE, requiresVerification, verifiedSource, portalNotice, validateJobs, validateEvidence, normalizeRecord, fetchAll, fetchAvailable, collectAvailable, run };
if (require.main === module) (async () => {
  const [siteJSON, rawFile] = process.argv.slice(2); if (!siteJSON || !rawFile) throw new Error('Usage: node xiaomi_portal.js <siteJSON> <rawFile>');
  const result = await run(JSON.parse(siteJSON)), temp = rawFile + '.tmp-' + process.pid;
  try { fs.writeFileSync(temp, JSON.stringify(result, null, 2) + '\n', { flag: 'wx' }); fs.renameSync(temp, rawFile); } finally { if (fs.existsSync(temp)) fs.unlinkSync(temp); }
  console.log('DONE fetched=' + result.total);
})().catch(error => { console.error('ERR ' + error.message); process.exitCode = 1; });
