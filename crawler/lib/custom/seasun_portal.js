'use strict';
const { departmentField, optionalFields } = require('../optional-fields');
const { paginate } = require('../paginate');
const { htmlText } = require('../jd-text');
// 西山居 job.seasungames.cn：社会招聘(mode=social)与校园招聘(mode=campus)共用匿名 GET —— 列表 jobs/xishanju?mode=&offset=&limit=（无 JD）＋详情 jobs/xishanju/<id>?mode=（正文、学历、发布/更新时间）。
// 宽松策略：详情尽力而为——官网拒绝(403/412/429)立即停止详情，其它单条失败跳过，连续 5 次失败也停止；列表出错才整次失败。
const fs = require('node:fs');
const ORIGIN = 'https://job.seasungames.cn', API_ORIGIN = 'https://ssg-recruiting-api.seasungames.cn', BASE = API_ORIGIN + '/api/ssg_recruiting_cn/v1/api-platform/v1/jobs/xishanju';
const ADAPTER = 'seasun-portal-v1', PAGE_SIZE = 100, MAX_PAGES = 50;
const PROFILES = ['campus', 'social'].map(track => ({
  key: track === 'campus' ? 'seasun' : 'seasun_social', company: '西山居', initial: 'X', aliases: ['Seasun', '西山居游戏'], ats: 'custom', adapter: ADAPTER, track, listJD: false, apiOrigin: API_ORIGIN,
  url: ORIGIN + '/index/' + (track === 'campus' ? 'campusList' : 'jobList') + '.html#/', api: BASE, mode: track,
  batch: track === 'campus' ? '官网校园招聘全列表（无筛选，含实习、训练营）' : '官网社会招聘全列表（无筛选）', exclude: '(无)'
}));
const profileOf = site => PROFILES.find(p => p.key === site?.key);
const requiresVerification = site => Boolean(profileOf(site)) || site?.adapter === ADAPTER;
const verifiedSource = site => site?.adapter === ADAPTER && Boolean(profileOf(site)) && site.api === profileOf(site).api && site.mode === profileOf(site).mode;
function profileFor(site) {
  if (!verifiedSource(site)) throw new Error('Unverified Seasun portal identity/scope/mode');
  return profileOf(site);
}
const portalNotice = site => verifiedSource(site) ? '西山居仅覆盖官网' + (site.mode === 'campus' ? '校园招聘全列表（含实习、训练营）' : '社会招聘全列表') + '；详情尽力获取，未取到的只有列表字段；性质只认原生「实习」「全职」。' : '';
const usable = job => job && typeof job === 'object' && typeof job.id === 'string' && job.id && typeof job.title === 'string' && job.title.trim();
const hasDetail = job => (job.duty + job.requirements + job.description).trim() !== '';

function validateJobs(jobs) {
  if (!Array.isArray(jobs) || !jobs.length) throw new Error('Seasun: invalid jobs or effective zero; zero cannot clear existing data');
  return true;
}
const validateEvidence = evidence => ({ issues: Array.isArray(evidence?.issues) ? evidence.issues : [] });
const experience = d => Number(d.minExperience) >= 1 ? (Number(d.maxExperience) > Number(d.minExperience) ? d.minExperience + '-' + d.maxExperience + '年' : d.minExperience + '年以上') : undefined;
const customField = (job, name) => (job.customFields || []).find(f => f?.name === name)?.value;
function normalizeRecord(job, site) {
  const p = profileFor(site);
  if (!usable(job)) throw new Error('Seasun: missing official id/title');
  const description = typeof job.description === 'string' ? htmlText(job.description) : '';
  return {
    id: job.id, title: job.title.trim(), city: [...new Set((job.locations || []).map(l => l?.city).filter(Boolean))].join('、'), category: typeof job.zhineng?.name === 'string' ? job.zhineng.name : '',
    channels: [p.track], employment: job.commitment === '实习' ? 'internship' : job.commitment === '全职' ? 'full-time' : null, talentPlan: null,
    publishedAt: job.publishedAt ?? null, updatedAt: job.updatedAt ?? null, ...departmentField(job.department?.name),
    ...optionalFields({ experience: experience(job), education: job.education, batch: typeof customField(job, '项目') === 'string' ? customField(job, '项目') : '' }),
    sourceStatus: null, url: ORIGIN + '/index/' + (p.track === 'campus' ? 'campusArticle' : 'jobArticle') + '.html#/?jobId=' + job.id,
    duty: '', requirements: '', description, jdComplete: Boolean(description)
  };
}

async function run(site, options = {}) {
  const p = profileFor(site);
  const { fetchImpl = globalThis.fetch, sleep = ms => new Promise(resolve => setTimeout(resolve, ms)), maxPages = MAX_PAGES, known = require('../known').knownIds() } = options;
  async function get(url) {
    await sleep(200);
    // 不伪装UA，不带 cookie/会话；页面自己调用的匿名 GET。
    const r = await fetchImpl(url, { method: 'GET', headers: { Accept: 'application/json', Origin: ORIGIN, Referer: ORIGIN + '/' }, redirect: 'error', signal: AbortSignal.timeout(15000) });
    if (r.status !== 200) { const e = new Error('Seasun HTTP ' + r.status); e.http = r.status; throw e; }
    const json = await r.json();
    if (json.code !== 0) throw new Error('Seasun native business refusal: code ' + json.code);
    return json;
  }
  const issues = [];
  const { rows, pages } = await paginate(async n => {
    const json = await get(p.api + '?mode=' + p.mode + '&offset=' + (n - 1) * PAGE_SIZE + '&limit=' + PAGE_SIZE);
    if (!Array.isArray(json.jobs)) throw new Error('Seasun: unexpected list shape on page ' + n);
    return { rows: json.jobs, total: json.total };
  }, { maxPages, idOf: row => row.id, usable, issues });
  const jobs = [...rows.values()];
  if (!jobs.length) throw new Error('Seasun: no usable records; zero cannot clear existing data');

  let got = 0, streak = 0, reused = 0;
  for (let i = 0; i < jobs.length; i++) {
    if (known.has(jobs[i].id)) { reused++; jobs[i] = { ...jobs[i], detailReused: true }; continue; } // 增量：已发布且有详情，沿用旧的完整正文
    try {
      const d = await get(p.api + '/' + jobs[i].id + '?mode=' + p.mode);
      if (d.id !== jobs[i].id) throw new Error('Seasun: detail identity mismatch');
      jobs[i] = { ...jobs[i], ...d }; got++; streak = 0;
    } catch (error) {
      streak++;
      if ([403, 412, 429].includes(error.http) || streak >= 5) { issues.push('详情请求停止：' + error.message); break; }
    }
  }
  if (reused) console.log('增量：沿用已发布详情 ' + reused + ' 个，新取详情 ' + got + ' 个');
  if (got + reused < jobs.length) issues.push('详情取得 ' + (got + reused) + '/' + jobs.length + '（含沿用 ' + reused + '），其余仅有列表字段');
  return { total: jobs.length, jobs, issues, verification: { key: p.key, api: p.api, pages, issues } };
}
module.exports = { PROFILES, hasDetail, requiresVerification, verifiedSource, validateJobs, normalizeRecord, validateEvidence, fetchAll: run, run, portalNotice };
if (require.main === module) {
  (async () => {
    const [siteJSON, rawFile] = process.argv.slice(2);
    if (!siteJSON || !rawFile) throw new Error('Usage: node seasun_portal.js <siteJSON> <rawFile>');
    const result = await run(JSON.parse(siteJSON)), temp = rawFile + '.tmp-' + process.pid;
    try {
      fs.writeFileSync(temp, JSON.stringify(result, null, 2) + '\n', { encoding: 'utf8', flag: 'wx' });
      fs.renameSync(temp, rawFile);
    } finally { if (fs.existsSync(temp)) fs.unlinkSync(temp); }
    console.log('DONE fetched=' + result.total);
  })().catch(error => { console.error('ERR ' + error.message); process.exitCode = 1; });
}
