'use strict';
const { paginate } = require('../paginate');
// 上海AI实验室 www.shlab.org.cn：校园(mode=campus)与社会(mode=social)共用游标分页接口，JD 在列表里。
// 宽松策略：单轮游标穷尽；岗位只需官网ID和标题；元数据缺失按空处理；坏记录/中途失败只记 issues，不挡整源。
const fs = require('node:fs');
const ORIGIN = 'https://www.shlab.org.cn', API = ORIGIN + '/api/getJobList';
const ADAPTER = 'shlab-portal-v1', MAX_PAGES = 400;
// 保持登记表里的公司写法，不用门户的完整展示名。
const PROFILES = ['campus', 'social'].map(track => ({
  key: track === 'campus' ? 'shlab' : 'shlab_social', company: '上海AI实验室',
  ats: 'custom', adapter: ADAPTER, track, listJD: true, apiOrigin: ORIGIN,
  url: ORIGIN + '/joinus/' + track, api: API,
  body: { mode: track, jobFunction: '', location: '', jobType: '', subject: '', keyword: '', page_token: '', limit: 7 },
  batch: track === 'campus' ? '官网校园默认全项目（无职业/项目筛选）' : '官网社会默认全列表（无职业/项目筛选）', exclude: '(无)'
}));
const profileOf = site => PROFILES.find(p => p.key === site?.key);

const requiresVerification = site => Boolean(profileOf(site)) || site?.adapter === ADAPTER;
const verifiedSource = site => site?.adapter === ADAPTER && profileOf(site)?.body.mode === site.body?.mode;
function profileFor(site) {
  if (!verifiedSource(site)) throw new Error('Unverified SHLAB portal identity/scope/mode');
  return profileOf(site);
}
function portalNotice(site) {
  if (!verifiedSource(site)) return '';
  return '上海AI实验室仅覆盖登记官网' + (site.track === 'campus' ? '校园默认全部招聘项目' : '社会默认全列表') + '，不代表全部渠道；游标穷尽后的唯一记录数不是官网声明总数。性质只按原生实习/全职，正式、人才计划和日期语义未知。首次范围迁移退出不代表已核验官网下架。';
}
const decimal = value => typeof value === 'string' && /^[1-9]\d*$/.test(value);
const usable = job => job && typeof job === 'object' && decimal(job.id) && typeof job.title === 'string' && job.title.trim();

function validateJobs(jobs) {
  if (!Array.isArray(jobs) || !jobs.length) throw new Error('SHLAB: invalid jobs or effective zero; zero cannot clear existing data');
  return true;
}
function validateEvidence(evidence) {
  return { issues: Array.isArray(evidence?.issues) ? evidence.issues : [] };
}
// JD 是原生纯文本：不剥 HTML、不解实体、不折叠空白。description 就是职责栏，没有第三个全文字段。
function normalizeRecord(job, site) {
  const p = profileFor(site);
  if (!usable(job)) throw new Error('SHLAB: missing official id/title');
  const duty = typeof job.description === 'string' ? job.description : '', requirements = typeof job.requirement === 'string' ? job.requirement : '';
  const kind = job.job_recruitment_type?.name?.zh_cn;
  return {
    id: job.id, title: job.title, city: (Array.isArray(job.address_list) ? job.address_list : []).map(a => a?.city?.name?.zh_cn).filter(Boolean).join('/'),
    category: job.job_function?.name?.zh_cn ?? '', channels: [p.track],
    employment: kind === '实习' ? 'internship' : kind === '全职' ? 'full-time' : null, talentPlan: null, date: null, dateKind: null,
    sourceStatus: job.job_active_status == null ? null : String(job.job_active_status),
    url: ORIGIN + '/joinus/detail/' + job.id + '?mode=' + p.track,
    duty, requirements, description: '', jdComplete: /[\p{L}\p{N}]/u.test(duty + requirements)
  };
}

function requestFor(p, cursor) {
  const url = new URL(p.api);
  for (const [key, value] of Object.entries({ ...p.body, page_token: cursor })) url.searchParams.set(key, value);
  return url.href;
}
async function run(site, options = {}) {
  const p = profileFor(site);
  const { fetchImpl = globalThis.fetch, sleep = ms => new Promise(resolve => setTimeout(resolve, ms)), maxPages = MAX_PAGES } = options;
  const issues = [], cursors = new Set(['']);
  let cursor = '';
  const { rows: byId, pages } = await paginate(async index => {
    if (index > 1) await sleep(200);
    // 不伪装UA，不带 cookie/CSRF/会话；page_token 是公开分页游标，不是凭据。
    const response = await fetchImpl(requestFor(p, cursor), { method: 'GET', headers: { Accept: 'application/json', Referer: p.url }, redirect: 'error', signal: AbortSignal.timeout(15000) });
    if (response.status !== 200) throw new Error('SHLAB list HTTP ' + response.status);
    const json = await response.json();
    if (json.errno !== 0 || !Array.isArray(json.data?.items)) throw new Error('SHLAB native business refusal on page ' + index);
    const data = json.data;
    if (data.has_more) {
      if (typeof data.page_token !== 'string' || !data.page_token.trim() || cursors.has(data.page_token)) throw new Error('SHLAB: pagination cursor missing or repeated after page ' + index);
      cursors.add(data.page_token); cursor = data.page_token;
    }
    return { rows: data.items, done: !data.has_more };
  }, { maxPages, idOf: job => job.id, usable, issues });
  const jobs = [...byId.values()];
  if (!jobs.length) throw new Error('SHLAB: no usable records; zero cannot clear existing data');
  return { total: jobs.length, jobs, issues, verification: { key: p.key, api: p.api, pages, issues } };
}
module.exports = { PROFILES, requiresVerification, verifiedSource, validateJobs, normalizeRecord, validateEvidence, fetchAll: run, run, portalNotice };
if (require.main === module) {
  (async () => {
    const [siteJSON, rawFile] = process.argv.slice(2);
    if (!siteJSON || !rawFile) throw new Error('Usage: node shlab_portal.js <siteJSON> <rawFile>');
    const result = await run(JSON.parse(siteJSON)), temp = rawFile + '.tmp-' + process.pid;
    try {
      fs.writeFileSync(temp, JSON.stringify(result, null, 2) + '\n', { encoding: 'utf8', flag: 'wx' });
      fs.renameSync(temp, rawFile);
    } finally { if (fs.existsSync(temp)) fs.unlinkSync(temp); }
    console.log('DONE fetched=' + result.total);
  })().catch(error => { console.error('ERR ' + error.message); process.exitCode = 1; });
}
