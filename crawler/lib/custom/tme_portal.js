'use strict';
const fs = require('node:fs');
const { randomUUID } = require('node:crypto');
const { isDeepStrictEqual: equal } = require('node:util');
const ORIGIN = 'https://join.tencentmusic.com', ADAPTER = 'tme-portal-v1', MAX_PAGES = 200, PROCESS_MS = 900000;
const check = (ok, message) => { if (!ok) throw new Error('TME: ' + message); };
const object = v => v !== null && typeof v === 'object' && !Array.isArray(v);
const string = v => typeof v === 'string';
function freeze(v) { if (v && typeof v === 'object') { Object.values(v).forEach(freeze); Object.freeze(v); } return v; }
const PROFILES = freeze(['campus', 'social'].map(track => ({
  key: track === 'campus' ? 'tme' : 'tme_social', company: '腾讯音乐', ats: 'custom', adapter: ADAPTER, track,
  batch: track === 'campus' ? '校园招聘（应届、实习、日常实习、技术大咖）' : '社招', exclude: '(无)', origin: ORIGIN,
  url: ORIGIN + (track === 'campus' ? '/campus/post/' : '/social/'), api: ORIGIN + '/api/' + (track === 'campus' ? 'uc-job' : 'job') + '/list',
  detailApi: ORIGIN + '/api/' + (track === 'campus' ? 'uc-job' : 'job') + '/info', listJD: true, fetchDetails: true,
  body: track === 'campus' ? { page: 1, ss: 100, type: '', job_class: [], work_city: '', setid: '', keyword: '' } :
    { page: 1, ss: 100, job_class: [], work_city: '', setid: '', deptids: '', keyword: '', order_by: 'is_recommend' }
})));
function requiresVerification(site) {
  if (PROFILES.some(p => p.key === site?.key) || site?.adapter === ADAPTER) return true;
  return ['origin', 'apiOrigin', 'api', 'url', 'detailApi'].some(k => {
    if (!site || !Object.hasOwn(site, k)) return false;
    try { check(string(site[k]), 'invalid URI'); return new URL(site[k].replace(/^(GET|POST)\s+/, '')).hostname.toLowerCase().replace(/\.$/, '') === 'join.tencentmusic.com'; }
    catch { return true; }
  });
}
function verifiedSource(site) { return PROFILES.some(p => equal(site, p)); }
function profile(site) { check(verifiedSource(site), 'unverified source identity/scope/mode'); return PROFILES.find(p => p.key === site.key); }
function requestFor(site, page) {
  const p = profile(site); check(Number.isSafeInteger(page) && page > 0 && page <= MAX_PAGES, 'invalid page');
  return { url: p.api, method: 'POST', headers: { Accept: 'application/json, text/plain, */*', 'Content-Type': 'application/json;charset=UTF-8', Origin: ORIGIN, Referer: p.url }, body: { ...p.body, page } };
}
function identity(post) { check(object(post) && string(post.id) && /^[1-9]\d*$/.test(post.id), 'invalid native id'); return post.id; }
function detailRequestFor(site, post, time = Date.now()) {
  const p = profile(site), id = identity(post); check(Number.isSafeInteger(time) && time >= 0, 'invalid time');
  return { url: p.detailApi + '?id=' + id + '&time=' + time, method: 'GET', headers: { Accept: 'application/json, text/plain, */*', Referer: ORIGIN + '/' + p.track + '/post-details/?id=' + id }, body: null };
}
function listRecord(post, p) {
  identity(post); check(string(post.name) && post.name.trim(), 'invalid native title');
  for (const k of ['duty', 'jobf_descr', 'date']) check(Object.hasOwn(post, k) && string(post[k]), 'missing/invalid native ' + k);
  if (p.track === 'campus') {
    check(Array.isArray(post.work_city) && post.work_city.every(c => object(c) && string(c.label)), 'invalid native work_city');
    check([10, 20, 30, 40].includes(post.job_type) && post.job_type_descr === ({ 10: '应届生', 20: '实习生', 30: '日常实习生', 40: '技术大咖' })[post.job_type], 'unverified native project type');
  } else {
    check(string(post.work_city), 'invalid native work_city');
    if (Object.hasOwn(post, 'work_nature_descr')) check(post.work_nature_descr === null || string(post.work_nature_descr), 'invalid native work nature');
  }
  return post;
}
function business(raw) {
  check(raw?.httpStatus === 200, 'native HTTP refusal');
  const r = raw.response; check(object(r) && equal(Object.keys(r).sort(), ['code', 'data', 'msg']) && r.code === '200' && r.msg === '操作完成' && object(r.data), 'native business/response refusal');
  return r.data;
}
function pageData(raw, site, index) {
  const p = profile(site); check(object(raw) && equal(raw.request, requestFor(p, index)), 'list request binding'); const d = business(raw), m = d._meta;
  check(equal(Object.keys(d).sort(), ['_meta', 'items']) && Array.isArray(d.items) && d.items.length <= 100 && [...d.items.keys()].every(i => Object.hasOwn(d.items, i)), 'native list shape');
  check(object(m) && equal(Object.keys(m).sort(), ['current_page', 'page_count', 'page_size', 'total_count']) && m.current_page === index && m.page_size === 100 &&
    Number.isSafeInteger(m.total_count) && m.total_count >= 0 && Number.isSafeInteger(m.page_count) && m.page_count >= 0, 'native pagination metadata');
  return d;
}
function atEnd(data, index) { return data.items.length === 0 || index >= data._meta.page_count; }
const DETAIL_KEYS = new Set(('id name position_nbr position_nbr_descr duty requirement setid has_tech_savvy_tag setid_descr jobf_descr work_city obj_city date job_class job_type job_type_descr user_status job_sub_func job_function work_city_code need_num status is_open deliver_rate status_descr applier_num company company_set sub_flag is_hot is_recommend type is_advance_approval empl_class_descr work_nature_descr processing_rate feedback').split(' '));
function detailData(raw, site, post) {
  const p = profile(site), u = new URL(raw?.request?.url ?? 'https://invalid');
  const time = u.searchParams.get('time'); check(time !== null && /^(0|[1-9]\d*)$/.test(time) && equal(raw.request, detailRequestFor(p, post, Number(time))), 'detail request binding');
  const d = business(raw); check(d.id === post.id && string(d.name) && d.name.trim(), 'detail native identity');
  check(Object.keys(d).every(k => DETAIL_KEYS.has(k)), 'unknown detail body field');
  for (const k of ['duty', 'requirement']) check(Object.hasOwn(d, k) && string(d[k]), 'missing/invalid detail ' + k);
  if (p.track === 'campus') check(d.job_type === post.job_type && d.job_type_descr === post.job_type_descr, 'detail project identity');
  return d;
}
function validateJobs(jobs, site) {
  const p = profile(site); check(Array.isArray(jobs) && jobs.length > 0, 'no usable jobs; zero cannot clear existing data'); const ids = new Set();
  for (const row of jobs) {
    check(object(row) && equal(Object.keys(row).sort(), ['detail', 'post']), 'native row binding'); listRecord(row.post, p);
    check(!ids.has(row.post.id), 'duplicate official id'); ids.add(row.post.id);
    check(row.detail === null || object(row.detail), 'invalid detail slot'); if (row.detail) detailData(row.detail, p, row.post);
  }
  return true;
}
function availableResult(evidence, site) {
  const p = profile(site); check(object(evidence) && equal(Object.keys(evidence).sort(), ['api', 'details', 'issues', 'key', 'pages', 'policy', 'stopped', 'version']) &&
    evidence.version === 1 && evidence.policy === 'available' && evidence.key === p.key && evidence.api === p.api, 'evidence source binding');
  check(Array.isArray(evidence.pages) && evidence.pages.length > 0 && evidence.pages.length <= MAX_PAGES && Array.isArray(evidence.details) && Array.isArray(evidence.issues) && evidence.issues.every(string), 'evidence limits/issues');
  const rows = new Map(), notes = new Set(evidence.issues), totals = new Set(); let ended = false, duplicates = 0;
  evidence.pages.forEach((raw, i) => {
    check(!ended, 'extra page after endpoint'); const d = pageData(raw, p, i + 1); totals.add(d._meta.total_count);
    for (const post of d.items) { try { listRecord(post, p); if (rows.has(post.id)) duplicates++; else rows.set(post.id, { post, detail: null }); }
      catch (error) { notes.add('列表记录未应用：' + error.message); } }
    ended = atEnd(d, i + 1);
  });
  const ordered = [...rows.values()]; check(evidence.details.length <= ordered.length, 'extra detail requests');
  evidence.details.forEach((raw, i) => { detailData(raw, p, ordered[i].post); ordered[i].detail = raw; });
  if (evidence.stopped !== null) {
    const s = evidence.stopped; check(object(s) && equal(Object.keys(s).sort(), ['error', 'httpStatus', 'request', 'response', 'stage']) && string(s.error) && s.error, 'stopped evidence');
    let failed = false;
    if (s.stage === 'page') { check(!ended && evidence.details.length === 0 && evidence.pages.length < MAX_PAGES, 'stopped page order');
      check(equal(s.request, requestFor(p, evidence.pages.length + 1)), 'stopped page request binding'); try { pageData(s, p, evidence.pages.length + 1); } catch { failed = true; }
    } else { check(s.stage === 'detail' && evidence.details.length < ordered.length, 'stopped detail order');
      const post = ordered[evidence.details.length].post, time = Number(new URL(s.request.url).searchParams.get('time'));
      check(equal(s.request, detailRequestFor(p, post, time)), 'stopped detail request binding'); try { detailData(s, p, post); } catch { failed = true; }
    }
    check(failed, 'successful request disguised as stopped'); notes.add('请求停止：' + s.error);
  }
  check(rows.size > 0, 'no usable jobs; zero cannot clear existing data');
  if (duplicates) notes.add('重复官方id ' + duplicates + ' 次，保留首次事实/正文');
  if (totals.size !== 1 || !totals.has(rows.size)) notes.add('官方total ' + [...totals].join('→') + '；实际唯一岗位 ' + rows.size);
  if (!ended) notes.add('分页未穷尽，覆盖待补');
  const missing = ordered.filter(r => !r.detail).length; if (missing) notes.add('详情要求未取得 ' + missing + ' 岗；保留列表JD，正文完整性待核验');
  validateJobs(ordered, p); return { complete: false, total: rows.size, jobs: ordered, verification: evidence, issues: [...notes] };
}
function collectAvailable(pages, site, details = [], issues = [], stopped = null) {
  profile(site); return freeze(availableResult(structuredClone({ version: 1, policy: 'available', key: site.key, api: site.api, pages, details, issues, stopped }), site));
}
function validateEvidence(evidence, jobs, site) { const r = availableResult(evidence, site); check(equal(jobs, r.jobs), 'jobs/native evidence binding'); return r; }
function normalizeRecord(row, site) {
  const p = profile(site); validateJobs([row], p); const post = row.post, d = row.detail ? detailData(row.detail, p, post) : null;
  // Both official renderers split LF and create Vue text nodes. Do not decode entities, strip angle brackets, or collapse whitespace.
  const duty = d?.duty.trim() ? d.duty : post.duty, requirements = d?.requirement ?? '';
  const intern = p.track === 'campus' && [20, 30].includes(post.job_type);
  return { id: post.id, title: post.name, city: p.track === 'campus' ? post.work_city.map(c => c.label).join('/') : post.work_city, category: post.jobf_descr,
    channels: p.track === 'social' ? ['social'] : intern ? [] : ['campus'], employment: intern ? 'internship' : p.track === 'social' && post.work_nature_descr === '全职' ? 'full-time' : null,
    talentPlan: null, date: null, dateKind: null, sourceStatus: null, url: ORIGIN + '/' + p.track + '/post-details/?id=' + post.id,
    duty, requirements, description: '', jdComplete: false };
}
function portalNotice(site) { return verifiedSource(site) ? (site.track === 'campus' ? '仅覆盖官网空type校园广列表（应届、实习、日常实习及技术大咖）；' : '仅覆盖官网无筛选社会列表，按官网推荐顺序；') +
  '完整性未验证，不代表公司全球全集或独立法律雇主；已取得详情两栏全文按TEXT保留，缺详情保留列表JD并提示待补；相对日期及可靠日期语义未知，实习不推校园渠道，未证明性质/人才计划未知。' : ''; }
async function fetchAvailable(site, options = {}) {
  const p = profile(site), { fetchImpl = globalThis.fetch, sleep = ms => new Promise(r => setTimeout(r, ms)), now = Date.now, maxPages = MAX_PAGES, listPages = [] } = options;
  check(typeof fetchImpl === 'function' && typeof sleep === 'function' && typeof now === 'function' && Number.isSafeInteger(maxPages) && maxPages > 0 && maxPages <= MAX_PAGES && Array.isArray(listPages), 'invalid request limits');
  const pages = structuredClone(listPages), details = [], issues = [], deadline = now() + PROCESS_MS; let lastStart = null, stopped = null;
  if (pages.length) collectAvailable(pages, p);
  async function send(raw) {
    while (lastStart !== null && now() - lastStart < 200) await sleep(200 - (now() - lastStart));
    const start = now(), remaining = deadline - start; check(remaining > 0, 'source safety deadline'); lastStart = start;
    const request = raw.request, r = await fetchImpl(request.url, { method: request.method, headers: request.headers, ...(request.body === null ? {} : { body: JSON.stringify(request.body) }), redirect: 'error', signal: AbortSignal.timeout(Math.min(15000, Math.ceil(remaining))) });
    raw.httpStatus = r?.status ?? null; if (raw.httpStatus !== 200) return raw;
    raw.response = await r.json(); return raw;
  }
  let ended = pages.length > 0 && atEnd(pageData(pages.at(-1), p, pages.length), pages.length);
  for (let n = pages.length + 1; !ended && n <= maxPages; n++) {
    if (now() + 200 >= deadline) { issues.push('达到进程安全时限，覆盖待补'); break; }
    const request = requestFor(p, n); let raw = { request, httpStatus: null, response: null };
    try { raw = await send(raw); const d = pageData(raw, p, n); pages.push(raw); ended = atEnd(d, n); }
    catch (error) { if (!pages.length) throw error; stopped = { ...raw, stage: 'page', error: String(error?.message || error) }; break; }
  }
  if (!ended && !stopped) issues.push('达到分页/时间安全上限，覆盖待补');
  const rows = collectAvailable(pages, p).jobs;
  if (!stopped) for (const row of rows) {
    if (now() + 200 >= deadline) { issues.push('达到进程安全时限，详情待补'); break; }
    const request = detailRequestFor(p, row.post, now()); let raw = { request, httpStatus: null, response: null };
    try { raw = await send(raw); detailData(raw, p, row.post); details.push(raw); }
    catch (error) { stopped = { ...raw, stage: 'detail', error: String(error?.message || error) }; break; }
  }
  return collectAvailable(pages, p, details, issues, stopped);
}
async function run(args, options = {}) {
  check(Array.isArray(args) && args.length === 2 && string(args[0]) && string(args[1]) && args[1], 'Usage: tme_portal.js <siteJSON> <outputFile>');
  const site = JSON.parse(args[0]), result = await fetchAvailable(site, options), envelope = { key: site.key, api: site.api, mode: 'custom', ...result };
  const file = args[1], temp = file + '.tmp-' + randomUUID(); let created = false;
  try { const fd = fs.openSync(temp, 'wx'); created = true; try { fs.writeFileSync(fd, JSON.stringify(envelope, null, 2) + '\n', 'utf8'); } finally { fs.closeSync(fd); } fs.renameSync(temp, file); }
  finally { if (created && fs.existsSync(temp)) fs.unlinkSync(temp); } return envelope;
}
module.exports = { PROFILES, requiresVerification, verifiedSource, requestFor, detailRequestFor, pageData, atEnd, validateJobs, normalizeRecord, portalNotice, collectAvailable, validateEvidence, fetchAvailable, run };
if (require.main === module) run(process.argv.slice(2)).catch(error => { console.error(error.message); process.exitCode = 1; });
