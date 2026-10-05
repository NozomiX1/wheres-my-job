// Beisen shared protocol: fixed, independently reviewed portals + offline legacy fixtures.
'use strict';
const fs = require('node:fs');
const { isDeepStrictEqual } = require('node:util');
const PROFILES = [
  { key: 'iflytek', company: '科大讯飞', origin: 'https://iflytek.zhiye.com', url: 'https://iflytek.zhiye.com/jobs', category: ['2', '3', '4', '5', '6', '7'], pageSize: 100, fields: ['Category', 'Kind', 'LocId', 'PostDate', 'ClassificationOne', 'WorkWeChatQrCode'] },
  { key: 'iflytek_social', company: '科大讯飞', origin: 'https://iflytek.zhiye.com', url: 'https://iflytek.zhiye.com/social/jobs', category: ['1'], pageSize: 100, fields: ['Category', 'Kind', 'LocId', 'PostDate', 'ClassificationOne', 'ClassificationTwo', 'WorkWeChatQrCode'], track: 'social' },
  { key: 'vivo', company: 'vivo', origin: 'https://hr-campus.vivo.com', url: 'https://hr-campus.vivo.com/jobs', category: [], pageSize: 20, fields: ['Category', 'LocId', 'HeadCount', 'WorkWeChatQrCode', 'ClassificationOne', 'ClassificationTwo', 'Kind', 'PostDate'] }
].map(p => ({ ...p, api: p.origin + '/api/Jobad/GetJobAdPageList' }));
const CATEGORY_LABELS = { '1': '社会招聘', '2': '校园招聘', '3': '实习生招聘', '4': '飞星计划', '5': '飞凡计划', '6': '校园大使', '7': '星火X顶尖AI人才计划' };
const PORTAL_NOTICE = '北森来源仅覆盖各登记官网广列表及已核验渠道/项目集合，不代表公司全球所有招聘渠道；首次历史迁移退出不代表已核验官网下架，招聘渠道、项目、性质及未知属性分别保留。';
function knownPortalAPI(api) {
  try { return ['iflytek.zhiye.com', 'hr-campus.vivo.com'].includes(new URL(api).hostname.toLowerCase().replace(/\.$/, '')); } catch { return false; }
}
function requiresVerification(site) {
  return knownPortalAPI(site?.api) || PROFILES.some(p => p.key === site?.key) || site?.adapter === 'beisen-portal-v1' || site?.ats === 'beisen' && site.listJD !== undefined;
}
function verifiedSource(site) {
  const p = PROFILES.find(p => p.key === site?.key);
  return !!p && site.ats === 'beisen' && site.adapter === 'beisen-portal-v1' && site.listJD === true &&
    site.company === p.company && site.api === p.api && site.url === p.url && site.track === p.track &&
    isDeepStrictEqual(site.category, p.category) && ['body', 'matchKeyword', 'classificationOne', 'ClassificationOne', 'portalId', 'specialType', 'fetchDetails', 'apiOrigin', 'linkTemplate'].every(field => site[field] === undefined);
}
function portalNotice(site) {
  if (!verifiedSource(site)) return '';
  return PORTAL_NOTICE + (site.key === 'iflytek' ? '讯飞联合普通校园、飞YOUNG实习、飞星、飞凡、校园大使、星火X六个官方频道；星火X不强推校招/社招，实习频道当前零条不证明未来岗位契约。' : site.key === 'vivo' ? 'vivo校园默认全项目，含秋招、蓝极星、日常/暑期实习；ClassificationOne是项目、ClassificationTwo是职能，性质只按Kind，不用实习标题/项目/渠道覆盖官网全职；社会另套系统不在本源。' : '讯飞社会频道Category1；职能只按已核验ClassificationOne，不把渠道Category或部门ClassificationTwo当职能。');
}
function extractJobs(json, strict = false) {
  if (!json || typeof json !== 'object' || Array.isArray(json) || ['Success', 'success'].some(field => Object.hasOwn(json, field) && json[field] !== true) || (Object.hasOwn(json, 'Code') && json.Code !== 200) || !Object.hasOwn(json, 'Data') || !Array.isArray(json.Data) || !Object.hasOwn(json, 'Count') || !Number.isSafeInteger(json.Count) || json.Count < 0) throw new Error('Unknown Beisen response shape or missing Count');
  if (strict && (!Object.hasOwn(json, 'Code') || !Object.hasOwn(json, 'TipType') || json.Code !== 200 || json.TipType !== 'Success' || Object.hasOwn(json, 'Total') && json.Total !== 0)) throw new Error('Beisen portal needs explicit native successful business status');
  return { jobs: json.Data, total: json.Count };
}
function officialId(job) {
  if (!job || typeof job !== 'object' || Array.isArray(job)) throw new Error('Invalid Beisen job identity');
  // Id UUID and JobAdId posting number are distinct; the public detail route uses Id.
  const fields = job.Id != null || job.id != null ? ['Id', 'id'] : ['JobAdId', 'jobAdId'];
  const values = fields.filter(field => job[field] != null).map(field => {
    const value = job[field];
    if (!(typeof value === 'string' || Number.isSafeInteger(value) && value >= 0) || !String(value).trim()) throw new Error('Invalid Beisen official id');
    return String(value).trim();
  });
  if (!values.length || new Set(values).size !== 1) throw new Error('Missing or conflicting Beisen job identity');
  return values[0];
}
function validateListJob(job, site, authority = false) {
  // Only native fields have meaning here; aliases/canonical claims are never facts.
  if (!job || typeof job !== 'object' || Array.isArray(job) || !Object.hasOwn(job, 'Id') || typeof job.Id !== 'string' || !/^[\da-f]{8}(?:-[\da-f]{4}){3}-[\da-f]{12}$/i.test(job.Id) || !Object.hasOwn(job, 'JobAdId') || !Number.isSafeInteger(job.JobAdId) || job.JobAdId <= 0 || typeof job.JobAdName !== 'string' || !job.JobAdName.trim()) throw new Error('Beisen native identity/title changed');
  const textFields = ['Duty', 'Require', 'Kind', 'PostDate', 'ClassificationOne', 'ClassificationTwo'];
  if (textFields.some(field => !Object.hasOwn(job, field) || job[field] !== null && typeof job[field] !== 'string') || !Object.hasOwn(job, 'LocNames') || !Array.isArray(job.LocNames) || job.LocNames.some(value => typeof value !== 'string')) throw new Error('Beisen native text/metadata shape changed');
  if (['Status', 'PostDateInt'].some(field => !Object.hasOwn(job, field) || job[field] !== null && (!Number.isSafeInteger(job[field]) || job[field] < 0))) throw new Error('Beisen native status/date shape changed');
  if (!Object.hasOwn(job, 'JobVideoJd') || job.JobVideoJd != null && job.JobVideoJd !== '') throw new Error('Unverified Beisen native additional JD shape');
  publicationDate(job);
  const allowed = authority ? Object.keys(CATEGORY_LABELS) : site.key === 'vivo' ? ['2', '3'] : site.category;
  if (typeof job.CategoryId !== 'string' || !allowed.includes(job.CategoryId) || job.Category !== CATEGORY_LABELS[job.CategoryId]) throw new Error('Beisen portal channel/project boundary changed');
  if (site.key === 'iflytek' && job.CategoryId === '3') throw new Error('Iflytek nonempty internship posting contract requires re-verification');
}
function publicationDate(job) {
  const value = (job.PostDate ?? '').trim();
  if (!value) return null;
  if (!/^\d{4}-\d{2}-\d{2}T(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d(?:\.\d{1,7})?$/.test(value)) throw new Error('Invalid Beisen native publication timestamp');
  if (/^0001-01-01T00:00:00(?:\.0{1,7})?$/.test(value) || job.PostDateInt == null || job.PostDateInt === 0) return null;
  const day = value.slice(0, 10), calendar = new Date(day + 'T00:00:00Z'), local = new Date(job.PostDateInt + 8 * 3600000);
  if (!Number.isFinite(calendar.getTime()) || calendar.toISOString().slice(0, 10) !== day || !Number.isFinite(local.getTime()) || local.toISOString().slice(0, 10) !== day) throw new Error('Beisen native publication calendar/date mismatch');
  return day; // Official PostDate calendar agrees with the proven UTC+8 PostDateInt, not crawl time.
}
function validateJobs(jobs, site, authority = false, raw = false) {
  if (!Array.isArray(jobs)) throw new Error('Beisen jobs must be an array');
  const ids = new Set(), numbers = new Set();
  for (const job of jobs) {
    validateListJob(job, site, authority);
    if (raw && Object.hasOwn(job, 'listJDVerified')) throw new Error('Beisen raw reserved verification field changed');
    if (ids.has(job.Id.toLowerCase()) || numbers.has(job.JobAdId)) throw new Error('Duplicate Beisen official UUID/business posting number');
    ids.add(job.Id.toLowerCase()); numbers.add(job.JobAdId);
  }
}
function requestBody(site, page, size, authority = false) {
  const profile = PROFILES.find(p => p.key === site.key);
  return { PageIndex: page, PageSize: size, ...(!authority && site.category.length ? { Category: site.category } : {}), KeyWords: '', SpecialType: 0, PortalId: '', DisplayFields: profile.fields };
}
// Retain native page envelopes in snapshots, including genuine-zero and authority scans.
function validateEvidence(evidence, jobs, site) {
  if (!verifiedSource(site) || !evidence || evidence.version !== 1 || evidence.key !== site.key || evidence.api !== site.api || !Array.isArray(evidence.scans) || evidence.scans.length !== (site.key === 'iflytek' ? 4 : 2)) throw new Error('Missing or mismatched Beisen native verification evidence');
  validateJobs(jobs, site);
  const scans = evidence.scans.map((scan, n) => {
    const authority = site.key === 'iflytek' && (n === 0 || n === 3);
    if (!scan || scan.authority !== authority || !Array.isArray(scan.pages) || !scan.pages.length || scan.pages.length >= 50) throw new Error('Invalid Beisen native scan evidence');
    const all = [], size = scan.pages[0]?.request?.PageSize;
    if (!Number.isSafeInteger(size) || size < 1) throw new Error('Invalid Beisen native page size evidence');
    let total;
    for (const [index, page] of scan.pages.entries()) {
      if (!page || page.httpStatus !== 200 || !isDeepStrictEqual(page.request, requestBody(site, index, size, authority))) throw new Error('Beisen native request/status evidence changed');
      const data = extractJobs(page.response, true);
      if (total !== undefined && total !== data.total || data.total >= size * 50 || data.jobs.length !== Math.min(size, data.total - all.length)) throw new Error('Beisen native Count/page evidence changed');
      total = data.total; all.push(...data.jobs);
      if (all.length === total && index !== scan.pages.length - 1) throw new Error('Beisen native evidence has extra pages');
    }
    if (all.length !== total) throw new Error('Incomplete Beisen native scan evidence');
    validateJobs(all, site, authority, true);
    return all;
  });
  const map = rows => new Map(rows.map(j => [j.Id.toLowerCase(), j]));
  const native = jobs.map(({ listJDVerified, ...job }) => { if (listJDVerified !== true) throw new Error('Beisen full list JD was not verified'); return job; });
  const before = site.key === 'iflytek' ? scans[1] : scans[0], after = site.key === 'iflytek' ? scans[2] : scans[1];
  if (!isDeepStrictEqual(map(before), map(after)) || !isDeepStrictEqual(map(before), map(native))) throw new Error('Beisen native full raw evidence does not match snapshot');
  if (site.key === 'iflytek' && (!isDeepStrictEqual(map(scans[0]), map(scans[3])) || !isDeepStrictEqual(map(scans[0].filter(j => site.category.includes(j.CategoryId))), map(native)))) throw new Error('Beisen native authority/partition evidence does not match snapshot');
  return true;
}
// Exact ordinary TEXT renderer decode, not HTML parsing. Angle brackets stay literal.
function nativeText(value) {
  let text = value ?? '';
  if (typeof text !== 'string') throw new Error('Invalid Beisen text');
  text = text.replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
  return text.replace(/\r\n?/g, '\n').trim();
}
function normalizeRecord(job, site) {
  if (!verifiedSource(site)) throw new Error('Beisen portal identity/scope/mode has not been verified');
  validateListJob(job, site);
  if (job.listJDVerified !== true) throw new Error('Beisen full list JD was not verified');
  const duty = nativeText(job.Duty), requirements = nativeText(job.Require), categoryId = job.CategoryId;
  const channels = categoryId === '1' ? ['social'] : ['2', '4', '5', '6'].includes(categoryId) ? ['campus'] : [];
  const origin = new URL(site.api).origin, route = categoryId === '1' ? 'social' : categoryId === '2' ? 'campus' : categoryId === '3' ? 'intern' : categoryId;
  const date = publicationDate(job);
  return { id: job.Id.toLowerCase(), title: job.JobAdName, city: job.LocNames, category: nativeText(site.key === 'vivo' ? job.ClassificationTwo : job.ClassificationOne), channels,
    employment: job.Kind === '全职' ? 'full-time' : job.Kind === '实习' ? 'internship' : null,
    talentPlan: site.key === 'vivo' ? job.ClassificationOne === '蓝极星计划' ? true : null : ['4', '5', '7'].includes(categoryId) ? true : null,
    date, dateKind: date ? 'published' : null, url: origin + '/' + route + '/detail?jobAdId=' + encodeURIComponent(job.Id),
    duty, requirements, description: '', jdComplete: /[\p{L}\p{N}]/u.test(duty + requirements), sourceStatus: job.Status == null ? null : String(job.Status) };
}
async function fetchAll(apiOrSite, category = ['2'], options = {}) {
  const site = typeof apiOrSite === 'object' && apiOrSite !== null ? apiOrSite : null;
  if (site && !verifiedSource(site)) throw new Error('Unverified Beisen portal/scope/mode');
  if (!site && knownPortalAPI(apiOrSite)) throw new Error('Beisen fixed portal requires its verified source profile');
  const profile = site && PROFILES.find(p => p.key === site.key), apiBase = site ? site.api : apiOrSite, origin = new URL(apiBase).origin;
  const { fetchImpl = globalThis.fetch, pageSize = profile?.pageSize ?? 100, maxPages = 50, timeoutMs = 15000, sleep = ms => new Promise(r => setTimeout(r, ms)), delayMs = 150 } = options;
  if (!/^https?:/.test(apiBase) || !Array.isArray(category) || !site && (!category.length || category.some(c => typeof c !== 'string' || !c))) throw new Error('Invalid Beisen site');
  if (![pageSize, maxPages, timeoutMs].every(n => Number.isSafeInteger(n) && n > 0) || typeof sleep !== 'function' || !Number.isFinite(delayMs) || delayMs < 0) throw new Error('Invalid Beisen pagination/request limits');
  let requested = false;
  const recorded = [];
  async function scan(authority = false) {
    const all = [], seen = new Set(), numbers = new Set(), record = { authority, pages: [] };
    if (site) recorded.push(record);
    let total;
    for (let page = 0; page < maxPages; page++) {
      if (site && requested) await sleep(Math.max(150, delayMs));
      requested = true;
      const body = site ? requestBody(site, page, pageSize, authority) : { PageIndex: page, PageSize: pageSize, Category: category, KeyWords: '', SpecialType: 0, PortalId: '', DisplayFields: ['Category', 'Kind', 'LocId', 'PostDate', 'ClassificationOne', 'WorkWeChatQrCode'] };
      const r = await fetchImpl(apiBase, { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: origin, Referer: (site?.url || origin + '/'), Accept: 'application/json, text/plain, */*' }, body: JSON.stringify(body), signal: AbortSignal.timeout(timeoutMs), ...(site ? { redirect: 'error' } : {}) });
      if (r.status !== 200) throw new Error('Beisen HTTP ' + r.status);
      const response = await r.json(), result = extractJobs(response, !!site);
      if (site) record.pages.push({ request: body, httpStatus: r.status, response });
      if (site && result.total >= pageSize * maxPages) throw new Error('Beisen portal pagination safety ceiling reached');
      if (total !== undefined && total !== result.total) throw new Error('Beisen Count changed during pagination');
      total = result.total;
      if (result.jobs.length !== Math.min(pageSize, total - all.length)) throw new Error('Beisen pagination ended before Count or count mismatch');
      for (const job of result.jobs) {
        if (site) {
          validateListJob(job, site, authority);
          if (Object.hasOwn(job, 'listJDVerified')) throw new Error('Beisen raw reserved verification field changed');
        }
        const id = site ? job.Id.toLowerCase() : officialId(job);
        if (seen.has(id)) throw new Error('Duplicate Beisen official id');
        seen.add(id);
        if (site && numbers.has(job.JobAdId)) throw new Error('Duplicate Beisen business posting number');
        if (site) numbers.add(job.JobAdId);
      }
      all.push(...result.jobs);
      if (all.length === total) return { complete: true, total, jobs: all };
    }
    throw new Error('Beisen pagination limit reached');
  }
  // The multi-channel source must also prove it did not silently miss new/unclassified channels.
  const wideFirst = site?.key === 'iflytek' ? await scan(true) : null;
  const first = await scan();
  if (!site) return first;
  const byId = jobs => new Map(jobs.map(j => [j.Id.toLowerCase(), j]));
  const second = await scan();
  if (first.total !== second.total || !isDeepStrictEqual(byId(first.jobs), byId(second.jobs))) throw new Error('Beisen full list fields changed during verification');
  if (wideFirst) {
    const wideLast = await scan(true);
    if (wideFirst.total !== wideLast.total || !isDeepStrictEqual(byId(wideFirst.jobs), byId(wideLast.jobs)) || !isDeepStrictEqual(byId(wideFirst.jobs.filter(j => site.category.includes(j.CategoryId))), byId(first.jobs))) throw new Error('Beisen full portal authority/channel partition changed');
  }
  const result = { ...first, ...(wideFirst ? { scopeWitness: wideFirst } : {}), verification: { version: 1, key: site.key, api: site.api, scans: recorded }, jobs: first.jobs.map(job => ({ ...job, listJDVerified: true })) };
  validateEvidence(result.verification, result.jobs, site);
  return result;
}
async function run(args, options) {
  const portal = args[0]?.startsWith('{');
  const site = portal ? JSON.parse(args[0]) : null, apiBase = args[0], categoryCSV = args[1], outfile = portal ? args[1] : args[2];
  if (!outfile) throw new Error('Usage: node beisen.js <siteJSON> <outfile> (legacy offline: <api> <categoryCSV> <outfile>)');
  const envelope = await fetchAll(site || apiBase, site?.category || (categoryCSV || '2').split(','), options);
  fs.writeFileSync(outfile, JSON.stringify(envelope, null, 2) + '\n', 'utf8');
  return envelope;
}
module.exports = { requiresVerification, verifiedSource, portalNotice, PORTAL_NOTICE, extractJobs, officialId, validateListJob, validateJobs, publicationDate, validateEvidence, nativeText, normalizeRecord, fetchAll, run };
if (require.main === module) run(process.argv.slice(2)).then(result => console.log('DONE fetched=' + result.total)).catch(error => { console.error('ERR ' + error.message); process.exitCode = 1; });
