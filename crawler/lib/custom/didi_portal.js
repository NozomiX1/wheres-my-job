'use strict';
const { departmentField, optionalFields } = require('../optional-fields');
const { paginate } = require('../paginate');
// 滴滴 talent.didiglobal.com 社会招聘：匿名 GET job/front/list，页面自带的每页 100 选项；JD（jobDuty/jobQualification）就在列表里。
// 校招、实习在 Moka（campus.didiglobal.com 的 didiglobal/96064、app.mokahr.com 的 didiglobal/6222），由 moka 来源覆盖；海外招聘 careers.didiglobal.com 不收。
const fs = require('node:fs');
const ORIGIN = 'https://talent.didiglobal.com', API = ORIGIN + '/recruit-portal-service/api/job/front/list';
const ADAPTER = 'didi-portal-v1', PAGE_SIZE = 100, MAX_PAGES = 100;
const PROFILES = [{
  key: 'didi_social', company: '滴滴', initial: 'D', aliases: ['Didi', '滴滴出行'], ats: 'custom', adapter: ADAPTER, track: 'social', listJD: true, apiOrigin: ORIGIN,
  url: ORIGIN + '/social/', api: API, batch: '官网社会招聘全列表（无筛选）', exclude: '(无)'
}];
const profileOf = site => PROFILES.find(p => p.key === site?.key);
const requiresVerification = site => Boolean(profileOf(site)) || site?.adapter === ADAPTER;
const verifiedSource = site => site?.adapter === ADAPTER && Boolean(profileOf(site)) && site.api === profileOf(site).api;
function profileFor(site) {
  if (!verifiedSource(site)) throw new Error('Unverified Didi portal identity/scope/mode');
  return profileOf(site);
}
const portalNotice = site => verifiedSource(site) ? '滴滴仅覆盖官网社会招聘全列表（含实习生之外的社招岗位）；校招、实习见 Moka 来源，海外招聘不收。官网 createTime 记为发布日期、refreshTime 记为更新日期。' : '';
const usable = job => job && typeof job === 'object' && Number.isSafeInteger(job.jdId) && job.jdId > 0 && typeof job.jobName === 'string' && job.jobName.trim();

function validateJobs(jobs) {
  if (!Array.isArray(jobs) || !jobs.length) throw new Error('Didi: invalid jobs or effective zero; zero cannot clear existing data');
  return true;
}
const validateEvidence = evidence => ({ issues: Array.isArray(evidence?.issues) ? evidence.issues : [] });
const text = v => typeof v === 'string' ? v.trim() : '';
function normalizeRecord(job, site) {
  profileFor(site);
  if (!usable(job)) throw new Error('Didi: missing official id/title');
  const duty = text(job.jobDuty), requirements = text(job.jobQualification);
  return {
    id: String(job.jdId), title: job.jobName.trim(), city: text(job.workArea), category: text(job.jobTypeName), channels: ['social'],
    employment: null, talentPlan: null, publishedAt: job.createTime ?? null, updatedAt: job.refreshTime ?? null, ...departmentField(job.deptName), ...optionalFields({}),
    sourceStatus: null, url: ORIGIN + '/social/jobDetail?jdId=' + job.jdId,
    duty, requirements, description: '', jdComplete: Boolean(duty + requirements)
  };
}

async function run(site, options = {}) {
  const p = profileFor(site);
  const { fetchImpl = globalThis.fetch, sleep = ms => new Promise(resolve => setTimeout(resolve, ms)), maxPages = MAX_PAGES } = options;
  const issues = [];
  const { rows, pages } = await paginate(async n => {
    await sleep(200);
    // 不伪装UA，不带 cookie/会话；页面自己调用的匿名 GET。
    const r = await fetchImpl(p.api + '?page=' + n + '&size=' + PAGE_SIZE, { method: 'GET', headers: { Accept: 'application/json', Referer: p.url }, redirect: 'error', signal: AbortSignal.timeout(20000) });
    if (r.status !== 200) { const e = new Error('Didi HTTP ' + r.status); e.http = r.status; throw e; }
    const json = await r.json();
    if (json?.meta?.code !== 0 || !Array.isArray(json?.data?.items)) throw new Error('Didi: unexpected list response on page ' + n + (json?.meta ? ' code ' + json.meta.code : ''));
    return { rows: json.data.items, total: json.data.total };
  }, { maxPages, idOf: row => row.jdId, usable, issues });
  const jobs = [...rows.values()];
  if (!jobs.length) throw new Error('Didi: no usable records; zero cannot clear existing data');
  return { total: jobs.length, jobs, issues, verification: { key: p.key, api: p.api, pages, issues } };
}
module.exports = { PROFILES, requiresVerification, verifiedSource, validateJobs, normalizeRecord, validateEvidence, fetchAll: run, run, portalNotice };
if (require.main === module) {
  (async () => {
    const [siteJSON, rawFile] = process.argv.slice(2);
    if (!siteJSON || !rawFile) throw new Error('Usage: node didi_portal.js <siteJSON> <rawFile>');
    const result = await run(JSON.parse(siteJSON)), temp = rawFile + '.tmp-' + process.pid;
    try {
      fs.writeFileSync(temp, JSON.stringify(result, null, 2) + '\n', { encoding: 'utf8', flag: 'wx' });
      fs.renameSync(temp, rawFile);
    } finally { if (fs.existsSync(temp)) fs.unlinkSync(temp); }
    console.log('DONE fetched=' + result.total);
  })().catch(error => { console.error('ERR ' + error.message); process.exitCode = 1; });
}
