'use strict';
const { departmentField, optionalFields } = require('../optional-fields');
const { paginate } = require('../paginate');
const { htmlText } = require('../jd-text');
// 理想汽车 www.lixiang.com：校园招聘列表 school/job-page（匿名 GET，每页最多 100）＋详情 job/detail?job_id=（正文、部门、项目名）。
// 社招走飞书招聘（lixiang_social）。宽松策略：详情尽力而为——官网拒绝(403/412/429)立即停止详情，其它单条失败跳过，连续 5 次失败也停止；列表出错才整次失败。
const fs = require('node:fs');
const ORIGIN = 'https://www.lixiang.com', API_ORIGIN = 'https://api-web.lixiang.com', BASE = API_ORIGIN + '/osd-hr-recruitment-website/v1/recruit';
const ADAPTER = 'lixiang-portal-v1', PAGE_SIZE = 100, MAX_PAGES = 100;
const PROFILES = [{
  key: 'lixiang', company: '理想汽车', initial: 'L', aliases: ['Li Auto', '理想'], ats: 'custom', adapter: ADAPTER, track: 'campus', listJD: true, apiOrigin: API_ORIGIN,
  url: ORIGIN + '/employ/campus/list.html?fromJob=1', api: BASE + '/school/job-page', detailApi: BASE + '/job/detail',
  batch: '官网校园招聘全列表（无项目/职能筛选，含实习）', exclude: '(无)'
}];
const profileOf = site => PROFILES.find(p => p.key === site?.key);
const HEADERS = { Accept: 'application/json', Origin: ORIGIN, Referer: ORIGIN + '/employ/campus/list.html' };

const requiresVerification = site => Boolean(profileOf(site)) || site?.adapter === ADAPTER;
const verifiedSource = site => site?.adapter === ADAPTER && Boolean(profileOf(site)) && site.api === profileOf(site).api && site.detailApi === profileOf(site).detailApi;
function profileFor(site) {
  if (!verifiedSource(site)) throw new Error('Unverified Lixiang portal identity/scope/mode');
  return profileOf(site);
}
function portalNotice(site) {
  if (!verifiedSource(site)) return '';
  return '理想汽车仅覆盖官网校园招聘全列表（含实习），社招另见飞书招聘来源；详情尽力获取，未取到的只有列表字段；性质只认原生「实习」，计划和日期语义未知。';
}
const usable = job => job && typeof job === 'object' && Number.isSafeInteger(job.id) && job.id > 0 && typeof job.title === 'string' && job.title.trim();
const hasDetail = job => (job.duty + job.requirements + job.description).trim() !== '';

function validateJobs(jobs) {
  if (!Array.isArray(jobs) || !jobs.length) throw new Error('Lixiang: invalid jobs or effective zero; zero cannot clear existing data');
  return true;
}
function validateEvidence(evidence) {
  return { issues: Array.isArray(evidence?.issues) ? evidence.issues : [] };
}
// 官网正文是 HTML 片段（<p>…）：职责 description、要求 requirements 各自转成纯文本；列表里没有正文。
function normalizeRecord(job, site) {
  profileFor(site);
  if (!usable(job)) throw new Error('Lixiang: missing official id/title');
  const duty = typeof job.description === 'string' ? htmlText(job.description) : '', requirements = typeof job.requirements === 'string' ? htmlText(job.requirements) : '';
  return {
    id: String(job.id), title: job.title.trim(), city: typeof job.location_title === 'string' ? job.location_title : '',
    category: [job.first_job_function_title, job.second_job_function_title].filter(v => typeof v === 'string' && v).join('/'), channels: ['campus'],
    employment: job.job_mode_name === '实习' ? 'internship' : null, talentPlan: null, publishedAt: null, updatedAt: null, ...departmentField(job.department_title),
    ...optionalFields({ batch: job.subject_name }), sourceStatus: null,
    url: ORIGIN + '/employ/campus/detail.html?id=' + job.id,
    duty, requirements, description: '', jdComplete: Boolean((duty + requirements).trim())
  };
}

async function run(site, options = {}) {
  const p = profileFor(site);
  const { fetchImpl = globalThis.fetch, sleep = ms => new Promise(resolve => setTimeout(resolve, ms)), maxPages = MAX_PAGES, known = require('../known').knownIds() } = options;
  async function get(url) {
    await sleep(200);
    // 不伪装UA，不带 cookie/会话；页面自己调用的匿名 GET。
    const r = await fetchImpl(url, { method: 'GET', headers: HEADERS, redirect: 'error', signal: AbortSignal.timeout(15000) });
    if (r.status !== 200) { const e = new Error('Lixiang HTTP ' + r.status); e.http = r.status; throw e; }
    const json = await r.json();
    if (json.code !== 0) throw new Error('Lixiang native business refusal: code ' + json.code);
    return json.data;
  }
  const issues = [];
  const { rows: byId, pages } = await paginate(async n => {
    const data = await get(p.api + '?page=' + n + '&page_size=' + PAGE_SIZE);
    if (!Array.isArray(data?.items)) throw new Error('Lixiang: unexpected list shape on page ' + n);
    return { rows: data.items, total: data.total_count, done: n >= data.total_pages };
  }, { maxPages, idOf: row => row.id, usable, issues });
  const jobs = [...byId.values()];
  if (!jobs.length) throw new Error('Lixiang: no usable records; zero cannot clear existing data');

  let got = 0, streak = 0, reused = 0;
  for (let i = 0; i < jobs.length; i++) {
    if (known.has(String(jobs[i].id))) { reused++; jobs[i] = { ...jobs[i], detailReused: true }; continue; } // 增量：已发布且有详情，沿用旧的完整正文
    try {
      const d = await get(p.detailApi + '?job_id=' + jobs[i].id);
      if (!d || d.id !== jobs[i].id) throw new Error('Lixiang: detail identity mismatch');
      jobs[i] = { ...jobs[i], ...d }; got++; streak = 0;
    } catch (error) {
      streak++;
      if ([403, 412, 429].includes(error.http) || streak >= 5) { issues.push('详情请求停止：' + error.message); break; }
    }
  }
  if (reused) console.log('增量：沿用已发布详情 ' + reused + ' 个，新取详情 ' + got + ' 个');
  if (got + reused < jobs.length) issues.push('详情取得 ' + (got + reused) + '/' + jobs.length + '（含沿用 ' + reused + '），其余仅有列表字段');
  return { total: jobs.length, jobs, issues, verification: { key: p.key, api: p.api, detailApi: p.detailApi, pages, issues } };
}
module.exports = { PROFILES, hasDetail, requiresVerification, verifiedSource, validateJobs, normalizeRecord, validateEvidence, fetchAll: run, run, portalNotice };
if (require.main === module) {
  (async () => {
    const [siteJSON, rawFile] = process.argv.slice(2);
    if (!siteJSON || !rawFile) throw new Error('Usage: node lixiang_portal.js <siteJSON> <rawFile>');
    const result = await run(JSON.parse(siteJSON)), temp = rawFile + '.tmp-' + process.pid;
    try {
      fs.writeFileSync(temp, JSON.stringify(result, null, 2) + '\n', { encoding: 'utf8', flag: 'wx' });
      fs.renameSync(temp, rawFile);
    } finally { if (fs.existsSync(temp)) fs.unlinkSync(temp); }
    console.log('DONE fetched=' + result.total);
  })().catch(error => { console.error('ERR ' + error.message); process.exitCode = 1; });
}
