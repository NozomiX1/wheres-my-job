'use strict';
const { paginate } = require('../paginate');
// 携程 careers.ctrip.com：校招 category=2、社招 category=1，同一列表接口（POST，JD 在列表里）。
// 宽松策略：单轮采集；岗位只需官网ID、fromId、标题；total 不符/坏记录/中途失败只记 issues，不挡整源。
const fs = require('node:fs');
const { randomUUID } = require('node:crypto');
const { normalizeJD, htmlText } = require('../jd-text');
const ORIGIN = 'https://careers.ctrip.com', API = ORIGIN + '/api/hrrecruit/getJobAd';
const ADAPTER = 'ctrip-portal-v1', PAGE_SIZE = 10, MAX_PAGES = 400;
const PROFILES = [
  ['ctrip', 'campus', 2, '校招', 'campus'], ['ctrip_social', 'social', 1, '社招', 'experienced']
].map(([key, track, category, batch, route]) => ({
  key, company: '携程集团', ats: 'custom', adapter: ADAPTER, track, batch, exclude: '(无)', listJD: true,
  apiOrigin: ORIGIN, url: ORIGIN + '/#/' + route + '/jobList', api: API,
  body: { condition: { fromId: [], keyword: '', kind: [], country: [], city: [], bucode: [], jobFamilyCode: [], jobFamilyGroupCode: [], category }, pager: { index: '1', size: '10' }, head: { language: 'zh_CN', version: '1' } }
}));
const HEADERS = { 'Content-Type': 'application/json;charset=UTF-8', Accept: 'application/json', Origin: ORIGIN, Referer: ORIGIN + '/' };
const profileOf = site => PROFILES.find(p => p.key === site?.key);

const requiresVerification = site => Boolean(profileOf(site)) || site?.adapter === ADAPTER;
// 身份：已登记的 key + 适配器 + 对应渠道 category；其余字段（说明文字等）可调整而不影响采集。
const verifiedSource = site => site?.adapter === ADAPTER && profileOf(site)?.body.condition.category === site.body?.condition?.category;
function profile(site) {
  if (!verifiedSource(site)) throw new Error('Ctrip: unverified source identity/scope/mode');
  return profileOf(site);
}
function requestBody(site, index) {
  const body = structuredClone(profile(site).body); body.pager.index = String(index); return body;
}
// 能确定官网身份、标题和正文才发布；null/缺失的 JD 按空串处理，不当作坏记录。
const usable = job => job && typeof job === 'object' && typeof job.id === 'string' && /^[1-9]\d*$/.test(job.id) &&
  typeof job.fromId === 'string' && job.fromId.trim() && typeof job.jobTitle === 'string' && job.jobTitle.trim();

function validateJobs(jobs) {
  if (!Array.isArray(jobs) || !jobs.length) throw new Error('Ctrip: invalid jobs or effective zero; zero cannot clear existing data');
  return true;
}
function validateEvidence(evidence) {
  return { issues: Array.isArray(evidence?.issues) ? evidence.issues : [] };
}
function normalizeRecord(job, site) {
  const p = profile(site);
  if (!usable(job)) throw new Error('Ctrip: missing official id/title');
  const html = typeof job.requirements === 'string' ? job.requirements : '';
  const jd = normalizeJD(html), full = htmlText(html);
  // 原生 requirements 是整篇 HTML 职位描述，不是独立「要求」栏；社招及多方向点状标题无法证明分栏边界时用全文回退。
  const unclear = p.track === 'social' || full.split('\n').some(line => /^[.．·•-]\s*(?:职位描述|岗位描述|工作职责|岗位职责|任职资格|任职要求)\s*[:：]?$/.test(line));
  return { id: job.id, title: job.jobTitle, city: job.cityName ?? '', category: '', channels: [p.track], employment: null, talentPlan: null, date: null, dateKind: null, sourceStatus: null,
    url: ORIGIN + '/#/' + (p.track === 'campus' ? 'campus' : 'experienced') + '/job-detail/' + encodeURIComponent(job.fromId),
    duty: unclear ? '' : jd.duty, requirements: unclear ? '' : jd.requirements, description: full, jdComplete: jd.hasContent };
}
function portalNotice(site) {
  if (!verifiedSource(site)) return '';
  return '携程仅覆盖登记官网category=' + profile(site).body.condition.category + '的默认广' + site.batch + '入口，不代表集团全球全部渠道；不按职能、城市或Eagle Program删岗。保留官网原语言；日期语义、性质和人才计划未知，混合职位类型暂不映为职能。' + (site.track === 'social' ? '社招保留完整职位描述；职责/要求分栏未核验，排序使用全文回退。' : '');
}

async function fetchAll(site, options = {}) {
  profile(site);
  const { fetchImpl = globalThis.fetch, sleep = ms => new Promise(resolve => setTimeout(resolve, ms)), maxPages = MAX_PAGES } = options;
  const issues = [];
  const { rows: byId, pages } = await paginate(async index => {
    await sleep(200);
    const r = await fetchImpl(API, { method: 'POST', headers: HEADERS, body: JSON.stringify(requestBody(site, index)), redirect: 'manual', signal: AbortSignal.timeout(15000) });
    if (r.status !== 200) throw new Error('Ctrip: list HTTP ' + r.status);
    const json = await r.json();
    if (json.retCode !== '201' || !Array.isArray(json.retValue?.recruitJobAdList)) throw new Error('Ctrip: native business refusal on page ' + index);
    return { rows: json.retValue.recruitJobAdList, total: json.retValue.total };
  }, { maxPages, idOf: job => job.id, usable, issues });
  const jobs = [...byId.values()];
  if (!jobs.length) throw new Error('Ctrip: no usable records; zero cannot clear existing data');
  return { total: jobs.length, jobs, issues, verification: { key: site.key, api: API, pages, issues } };
}
async function run(args, options = {}) {
  if (!Array.isArray(args) || args.length !== 2 || typeof args[0] !== 'string' || !args[1]) throw new Error('Usage: ctrip_portal.js <siteJSON> <rawFile>');
  const site = JSON.parse(args[0]), result = await fetchAll(site, options);
  const file = args[1], temp = file + '.tmp-' + randomUUID(); let created = false;
  try {
    const fd = fs.openSync(temp, 'wx'); created = true;
    try { fs.writeFileSync(fd, JSON.stringify(result, null, 2) + '\n', 'utf8'); } finally { fs.closeSync(fd); }
    fs.renameSync(temp, file);
  } finally { if (created && fs.existsSync(temp)) fs.unlinkSync(temp); }
  return result;
}
module.exports = { PROFILES, requiresVerification, verifiedSource, validateJobs, normalizeRecord, validateEvidence, requestBody, fetchAll, run, portalNotice };
if (require.main === module) run(process.argv.slice(2)).catch(error => { console.error(error.message); process.exitCode = 1; });
