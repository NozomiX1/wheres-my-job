// Moka: node moka.js <orgId> <siteId> <campus|social> <aesIv> <outfile> [--details|--list-jd] [--origin=https://...]
// Only an explicit, stable count and exhausted pagination produce a complete envelope.
'use strict';
const crypto = require('node:crypto');
const fs = require('node:fs');
const { isDeepStrictEqual } = require('node:util');
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0 Safari/537.36';
const DEFAULT_ORIGIN = 'https://app.mokahr.com';
// Independently verified public portals; shared protocol never grants a new source eligibility.
const PROFILES = [
  ['kimi', '月之暗面', 'moonshot', 148507, 'campus', true],
  ['kimi_social', '月之暗面', 'moonshot', 148506, 'social', true],
  ['zhipu', '智谱', 'zphz', 148984, 'campus', true],
  ['zhipu_social', '智谱', 'zphz', 148983, 'social', true],
  ['deepseek', 'DeepSeek', 'high-flyer', 140576, 'social', true],
  ['hypergryph', '鹰角网络', 'hypergryph', 26326, 'campus', false],
  ['hypergryph_social', '鹰角网络', 'hypergryph', 26325, 'social', true]
].map(([key, company, orgId, siteId, site, listJD]) => {
  const apiOrigin = orgId === 'hypergryph' ? 'https://jobs.hypergryph.com' : DEFAULT_ORIGIN;
  const url = key === 'hypergryph' ? apiOrigin + '/campus_apply/hypergryph/26326' : key === 'hypergryph_social' ? apiOrigin + '/apply/hypergryph/26325/' : `${apiOrigin}/${site}-recruitment/${orgId}/${siteId}`;
  return { key, company, orgId, siteId, site, listJD, fetchDetails: !listJD, apiOrigin, url };
});
function profileFor(site) { return PROFILES.find(p => p.orgId === site.orgId && p.siteId === Number(site.siteId) && p.site === site.site); }
function requiresVerification(site) {
  return PROFILES.some(p => p.key === site?.key) || site?.ats === 'moka' && (site.listJD !== undefined || site.apiOrigin !== undefined || site.adapter === 'moka-portal-v1');
}
function verifiedSource(site) {
  const p = profileFor(site || {});
  return !!p && site.ats === 'moka' && site.adapter === 'moka-portal-v1' && site.key === p.key && site.company === p.company &&
    site.url === p.url && (site.apiOrigin === undefined ? DEFAULT_ORIGIN : site.apiOrigin) === p.apiOrigin && site.listJD === p.listJD && (site.fetchDetails === undefined ? false : site.fetchDetails) === p.fetchDetails &&
    site.body === undefined && site.matchKeyword === undefined && site.aesIv === 'de7c21ed8d6f50fe' &&
    (!site.linkTemplate || site.linkTemplate === p.url + '#/job/{id}') && (p.orgId !== 'hypergryph' || site.linkTemplate === p.url + '#/job/{id}');
}
const PORTAL_NOTICE = 'Moka来源仅覆盖各登记官网门户的默认无个人筛选列表，不代表公司全球/所有招聘渠道；首次替换历史记录的退出不代表已核验官网下架，官网空正文、转新链接及未知属性如实保留。';
function portalNotice(site) {
  if (!verifiedSource(site)) return '';
  const detail = site.key === 'deepseek' ? '仅DeepSeek官方140576/部门2028422，非整个high-flyer或幻方4604；保留官网旧岗转新链接，列表未给出的性质/日期仍未知。' :
    site.key === 'hypergryph' ? '鹰角校园26326默认无项目筛选，含2027/2028及无项目岗位；日常实习属于独立社会26325，不以校园来源冒充公司全集。' : '';
  return `${site.company} ${site.siteId} ${site.site}默认门户范围；` + PORTAL_NOTICE + detail;
}
function validateListJob(job, orgId, siteId) {
  jobId(job);
  if (!Object.hasOwn(job, 'id') || !Object.hasOwn(job, 'orgId') || job.orgId !== orgId ||
      !Object.hasOwn(job, 'title') || typeof job.title !== 'string' || !job.title.trim() ||
      Object.hasOwn(job, 'jobDescription') && job.jobDescription !== null && typeof job.jobDescription !== 'string') throw new Error('Moka list lacks valid identity/full JD fields');
  if (orgId === 'high-flyer' && Number(siteId) === 140576 && job.deptId !== 2028422) throw new Error('DeepSeek official department boundary changed');
  if (job.commitment != null && typeof job.commitment !== 'string' || job.zhineng != null && (typeof job.zhineng !== 'object' || Array.isArray(job.zhineng)) || job.locations != null && !Array.isArray(job.locations)) throw new Error('Moka native metadata shape changed');
  for (const field of ['publishedAt', 'status']) if (job[field] != null && typeof job[field] !== 'string') throw new Error('Moka list invalid ' + field);
}

function decryptAes(enc, key, iv) {
  const decipher = crypto.createDecipheriv('aes-128-cbc', Buffer.from(key, 'utf8'), Buffer.from(iv, 'utf8'));
  return Buffer.concat([decipher.update(Buffer.from(enc, 'base64')), decipher.final()]).toString('utf8');
}

function extractJobs(decrypted) {
  const parsed = typeof decrypted === 'string' ? JSON.parse(decrypted) : decrypted;
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed) || parsed.success === false || parsed.Success === false) throw new Error('Unknown Moka response shape');
  const d = parsed.data === undefined ? parsed : parsed.data;
  if (!d || typeof d !== 'object' || Array.isArray(d)) throw new Error('Unknown Moka data shape');
  const jobs = d.jobs ?? d.list ?? d.job_post_list;
  const counts = [d.jobStats?.total, d.total, d.count].filter(n => n !== undefined);
  if (!Array.isArray(jobs) || !counts.length || counts.some(n => !Number.isSafeInteger(n) || n < 0 || n !== counts[0])) throw new Error('Moka needs jobs and a consistent explicit total');
  return { jobs, total: counts[0] };
}

function jobId(job) {
  if (!job || typeof job !== 'object' || Array.isArray(job) ||
      !(typeof job.id === 'string' && job.id.trim() || Number.isSafeInteger(job.id) && job.id >= 0)) throw new Error('Moka missing or invalid job ID');
  return String(job.id);
}

async function fetchAll({ orgId, siteId, site, aesIv, fetchDetails = false, listJD = false, apiOrigin = DEFAULT_ORIGIN }, {
  fetchImpl = globalThis.fetch, limit = listJD || apiOrigin !== DEFAULT_ORIGIN ? 30 : 50, maxPages = 200,
  sleep = ms => new Promise(resolve => setTimeout(resolve, ms)), detailDelayMs = 150, timeoutMs = 15000
} = {}) {
  if (!orgId || !Number.isSafeInteger(Number(siteId)) || Number(siteId) <= 0 || !['campus', 'social'].includes(site)) throw new Error('Invalid Moka site');
  if (!Number.isSafeInteger(limit) || limit < 1 || !Number.isSafeInteger(maxPages) || maxPages < 1) throw new Error('Invalid pagination limits');
  if (typeof fetchDetails !== 'boolean' || fetchDetails && (typeof orgId !== 'string' || !orgId.trim())) throw new Error('Invalid Moka details configuration');
  if (typeof listJD !== 'boolean' || listJD && fetchDetails) throw new Error('Invalid Moka list JD configuration');
  const profile = profileFor({ orgId, siteId, site });
  const strictPortal = listJD || apiOrigin !== DEFAULT_ORIGIN;
  if (strictPortal && (!profile || profile.apiOrigin !== apiOrigin || profile.listJD !== listJD || profile.fetchDetails !== fetchDetails)) throw new Error('Unverified Moka portal/mode/origin');
  if (!Number.isSafeInteger(timeoutMs) || timeoutMs < 1) throw new Error('Invalid Moka request timeout');
  if ((fetchDetails || strictPortal) && (typeof sleep !== 'function' || !Number.isFinite(detailDelayMs) || detailDelayMs < 0)) throw new Error('Invalid Moka detail delay');

  let requested = false;
  async function request(endpoint, body) {
    if (strictPortal && requested) await sleep(Math.max(150, detailDelayMs));
    requested = true;
    const label = endpoint === 'job' ? 'Moka detail ' + body.jobId : 'Moka';
    const r = await fetchImpl(apiOrigin + '/api/outer/ats-apply/website/' + endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(!strictPortal ? { 'User-Agent': UA } : {}), Origin: apiOrigin, Referer: apiOrigin + '/' },
      body: JSON.stringify(body), signal: AbortSignal.timeout(timeoutMs)
    });
    if (r.status !== 200) throw new Error(label + ' HTTP ' + r.status);
    let response = JSON.parse(await r.text());
    if (strictPortal) for (const field of ['success', 'Success', 'code']) {
      if (response && Object.hasOwn(response, field) && response[field] !== (field === 'code' ? 0 : true)) throw new Error(label + ' invalid outer business status: ' + field);
    }
    if (response?.success === false || response?.Success === false || response?.code !== undefined && response.code !== 0) throw new Error(label + ' reported an unsuccessful response');
    if (typeof response?.data === 'string') response = JSON.parse(decryptAes(response.data, response.necromancer, aesIv));
    if (response?.success === false || response?.Success === false || response?.code !== undefined && response.code !== 0) throw new Error(label + ' reported an unsuccessful response');
    if (strictPortal && (response?.code !== 0 || response?.success !== true || Object.hasOwn(response, 'Success') && response.Success !== true)) throw new Error(label + ' needs explicit successful portal business status');
    return response;
  }

  // Reuse the same bounded, unfiltered pagination for the before/after checks.
  async function fetchList() {
    const all = [];
    let total;
    for (let page = 0; page < maxPages; page++) {
      const body = {
        orgId, siteId: Number(siteId), limit, offset: page * limit, needStat: true,
        keyword: '', zhinengIds: [], projectFolderIds: [], departmentIds: [],
        campusSiteIds: [], jobRankIds: [], experiences: [], customFields: {}, site
      };
      const requestBody = strictPortal ? { orgId, siteId: String(siteId), limit, offset: page * limit, needStat: true, jobIdTopList: [], customFields: {}, site, locale: 'zh-CN' } : body;
      const response = await request('jobs/v2', requestBody);
      if (strictPortal && (!Array.isArray(response.data?.jobs) || response.data?.jobStats?.orgId !== orgId || !Number.isSafeInteger(response.data?.jobStats?.total) || response.data.jobStats.total < 0)) throw new Error('Moka portal list shape/organization changed');
      const result = extractJobs(response);
      if (strictPortal && result.total >= limit * maxPages) throw new Error('Moka portal pagination safety ceiling reached');
      if (strictPortal) for (const job of result.jobs) validateListJob(job, orgId, siteId);
      if (total !== undefined && total !== result.total) throw new Error('Moka total changed during pagination');
      total = result.total;
      if (result.jobs.length > limit || all.length + result.jobs.length > total) throw new Error('Moka count mismatch');
      all.push(...result.jobs);
      if (all.length === total) return { complete: true, total, jobs: all };
      if (result.jobs.length < limit) throw new Error('Moka pagination ended before total');
    }
    throw new Error('Moka pagination limit reached');
  }

  function listIds(jobs) {
    const ids = new Set();
    for (const job of jobs) {
      const id = jobId(job);
      if (ids.has(id)) throw new Error('Moka duplicate job ID: ' + id);
      if (job.orgId !== undefined && job.orgId !== orgId) throw new Error('Moka list orgId mismatch for ' + id);
      ids.add(id);
    }
    return ids;
  }

  const envelope = await fetchList();
  if (!fetchDetails && !listJD) return envelope;
  const ids = listIds(envelope.jobs);
  if (listJD) {
    const final = await fetchList();
    const finalIds = listIds(final.jobs), byId = new Map(final.jobs.map(job => [jobId(job), job]));
    if (final.total !== envelope.total || finalIds.size !== ids.size || [...ids].some(id => !finalIds.has(id)) ||
        envelope.jobs.some(job => !isDeepStrictEqual(job, byId.get(jobId(job))))) throw new Error('Moka full list fields changed during verification');
    return { complete: true, total: envelope.total, jobs: envelope.jobs.map(job => ({ ...job, listJDVerified: true })) };
  }
  const jobs = [];
  for (const job of envelope.jobs) {
    if (jobs.length && !strictPortal) await sleep(detailDelayMs);
    const response = await request('job', { orgId, jobId: job.id, siteId: Number(siteId), locale: 'zh-CN' });
    if (!response || typeof response !== 'object' || Array.isArray(response)) throw new Error('Unknown Moka detail response shape');
    const detail = response.data === undefined ? response : response.data;
    if (jobId(detail) !== String(job.id)) throw new Error('Moka detail job ID mismatch for ' + job.id);
    if (detail.orgId !== orgId) throw new Error('Moka detail orgId mismatch for ' + job.id);
    if (strictPortal) for (const field of ['title', 'commitment', 'status']) {
      if (!Object.hasOwn(detail, field) || detail[field] !== job[field]) throw new Error('Moka list/detail identity or factual field conflict: ' + field);
    }
    if (typeof detail.jobDescription !== 'string') throw new Error('Moka detail needs jobDescription for ' + job.id);
    for (const field of ['publishedAt', 'status']) {
      if (detail[field] != null && typeof detail[field] !== 'string') throw new Error('Moka detail invalid ' + field + ' for ' + job.id);
    }
    const publicDetail = {};
    for (const field of ['orgId', 'title', 'jobDescription', 'publishedAt', 'zhineng', 'commitment', 'locations', 'status']) {
      if (Object.hasOwn(detail, field)) publicDetail[field] = detail[field];
    }
    jobs.push({ ...job, ...publicDetail, id: job.id, detailVerified: true });
  }
  const finalList = await fetchList();
  const finalIds = listIds(finalList.jobs);
  if (finalList.total !== envelope.total || finalIds.size !== ids.size || [...ids].some(id => !finalIds.has(id)) ||
      strictPortal && envelope.jobs.some(job => !isDeepStrictEqual(job, finalList.jobs.find(final => jobId(final) === jobId(job))))) throw new Error('Moka list changed during detail collection');
  return { complete: true, total: envelope.total, jobs };
}

async function run(args, options) {
  const [orgId, siteId, site, aesIv, outfile, detailsFlag, originFlag] = args;
  if (!outfile || args.length > 7 || detailsFlag !== undefined && !['--details', '--list-jd'].includes(detailsFlag) || originFlag !== undefined && !originFlag.startsWith('--origin=')) throw new Error('Usage: node moka.js <orgId> <siteId> <site> <aesIv> <outfile> [--details|--list-jd] [--origin=https://...]');
  const envelope = await fetchAll({ orgId, siteId, site, aesIv, fetchDetails: detailsFlag === '--details', listJD: detailsFlag === '--list-jd', apiOrigin: originFlag?.slice('--origin='.length) }, options);
  fs.writeFileSync(outfile, JSON.stringify(envelope, null, 2) + '\n', 'utf8');
  return envelope;
}

module.exports = { decryptAes, extractJobs, fetchAll, run, requiresVerification, verifiedSource, validateListJob, portalNotice, PORTAL_NOTICE };
if (require.main === module) {
  run(process.argv.slice(2)).then(result => console.log('DONE fetched=' + result.total)).catch(error => {
    console.error('ERR ' + error.message);
    process.exitCode = 1;
  });
}
