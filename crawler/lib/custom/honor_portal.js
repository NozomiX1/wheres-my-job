'use strict';
const { departmentField, optionalFields } = require('../optional-fields');
const { paginate } = require('../paginate');
// 荣耀 career.honor.com（Hotjob wecruit）：官网入口 hihonor.com/cn/career 有四个门户——社招、应届生、博士生、实习生，各自一个 SU 套件。
// 列表 POST listPosition/<SU>（recruitType 社招2、校招1、实习12，每页 15）＋详情 POST listPositionDetail/<SU>（职责、要求、学历）。同一 postId 出现在多个门户时只收第一个。
// 宽松策略：详情尽力而为——官网拒绝(403/412/429)立即停止详情，其它单条失败跳过，连续 5 次失败也停止；列表出错才整次失败。
const fs = require('node:fs');
const ORIGIN = 'https://career.honor.com', ADAPTER = 'honor-portal-v1', PAGE_SIZE = 15, MAX_PAGES = 100;
const PORTALS = {
  social: [{ su: 'SU5ff669649b0d78e6f4296c9a', recruitType: 2, page: 'social', postType: 'society' }],
  campus: [
    { su: 'SU60eea919bef57c1023f6fe78', recruitType: 1, page: 'school', postType: 'campus' },
    { su: 'SU60eea1aa0dcad47a7e1ce1ed', recruitType: 1, page: 'school', postType: 'campus' },
    { su: 'SU61b9b9992f9d24431f5050a5', recruitType: 12, page: 'interns', postType: 'intern' }
  ]
};
const PROFILES = ['campus', 'social'].map(track => ({
  key: track === 'campus' ? 'honor' : 'honor_social', company: '荣耀', initial: 'H', aliases: ['Honor', '荣耀终端'], ats: 'custom', adapter: ADAPTER, track, listJD: false, apiOrigin: ORIGIN,
  url: ORIGIN + '/' + PORTALS[track][0].su + '/pb/' + PORTALS[track][0].page + '.html', api: ORIGIN + '/wecruit/positionInfo/listPosition', portals: PORTALS[track],
  batch: track === 'campus' ? '官网应届生、博士生、实习生三个门户全列表' : '官网社会招聘全列表', exclude: '(无)'
}));
const profileOf = site => PROFILES.find(p => p.key === site?.key);
const requiresVerification = site => Boolean(profileOf(site)) || site?.adapter === ADAPTER;
const verifiedSource = site => site?.adapter === ADAPTER && Boolean(profileOf(site)) && site.api === profileOf(site).api && JSON.stringify(site.portals) === JSON.stringify(profileOf(site).portals);
function profileFor(site) {
  if (!verifiedSource(site)) throw new Error('Unverified Honor portal identity/scope/mode');
  return profileOf(site);
}
const portalNotice = site => verifiedSource(site) ? '荣耀仅覆盖官网' + (site.track === 'campus' ? '应届生、博士生、实习生三个门户的全列表' : '社会招聘门户全列表') + '；详情尽力获取，未取到的只有列表字段；日期取官网 publishFirstDate（首次发布）与 publishDate（最近发布）。' : '';
const usable = job => job && typeof job === 'object' && typeof job.postId === 'string' && job.postId && typeof job.postName === 'string' && job.postName.trim();
const hasDetail = job => (job.duty + job.requirements + job.description).trim() !== '';

function validateJobs(jobs) {
  if (!Array.isArray(jobs) || !jobs.length) throw new Error('Honor: invalid jobs or effective zero; zero cannot clear existing data');
  return true;
}
const validateEvidence = evidence => ({ issues: Array.isArray(evidence?.issues) ? evidence.issues : [] });
const text = v => typeof v === 'string' ? v.trim() : '';
function normalizeRecord(job, site) {
  const p = profileFor(site);
  if (!usable(job)) throw new Error('Honor: missing official id/title');
  const duty = text(job.workContent), requirements = text(job.serviceCondition), portal = job._portal || p.portals[0];
  return {
    id: job.postId, title: job.postName.trim(), city: text(job.workPlaceStr), category: text(job.postTypeName), channels: [p.track],
    employment: job.workTypeStr === '实习' ? 'internship' : job.workTypeStr === '全职' ? 'full-time' : null, talentPlan: null,
    publishedAt: job.publishFirstDate ?? null, updatedAt: job.publishDate ?? null, ...departmentField(job.company),
    ...optionalFields({ education: job.education ?? job.educationStr, batch: job.projectName }), sourceStatus: null,
    url: ORIGIN + '/' + portal.su + '/pb/posDetail.html?postId=' + job.postId + '&postType=' + portal.postType,
    duty, requirements, description: '', jdComplete: Boolean(duty + requirements)
  };
}

async function run(site, options = {}) {
  const p = profileFor(site);
  const { fetchImpl = globalThis.fetch, sleep = ms => new Promise(resolve => setTimeout(resolve, ms)), maxPages = MAX_PAGES, known = require('../known').knownIds() } = options;
  async function post(url, body) {
    await sleep(200);
    // 不伪装UA，不带 cookie/会话；页面自己发的匿名表单 POST。
    const r = await fetchImpl(url, { method: 'POST', headers: { Accept: 'application/json, text/plain, */*', 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8', Referer: ORIGIN + '/' }, body, redirect: 'error', signal: AbortSignal.timeout(20000) });
    if (r.status !== 200) { const e = new Error('Honor HTTP ' + r.status); e.http = r.status; throw e; }
    const json = await r.json();
    if (json.state !== '200') throw new Error('Honor native business refusal: state ' + json.state);
    return json.data;
  }
  const issues = [], byId = new Map();
  for (const portal of p.portals) {
    const { rows } = await paginate(async n => {
      const form = await post(p.api + '/' + portal.su, 'isFrompb=true&recruitType=' + portal.recruitType + '&pageSize=' + PAGE_SIZE + '&currentPage=' + n);
      if (!Array.isArray(form?.pageForm?.pageData)) throw new Error('Honor: unexpected list shape on page ' + n);
      return { rows: form.pageForm.pageData, total: form.pageForm.dataCount, done: n >= form.pageForm.totalPage };
    }, { maxPages, idOf: row => row.postId, usable, issues, label: portal.su + ' ' });
    for (const [id, row] of rows) if (!byId.has(id)) byId.set(id, { ...row, _portal: portal });
  }
  const jobs = [...byId.values()];
  if (!jobs.length) throw new Error('Honor: no usable records; zero cannot clear existing data');

  let got = 0, streak = 0, reused = 0;
  for (let i = 0; i < jobs.length; i++) {
    if (known.has(jobs[i].postId)) { reused++; jobs[i] = { ...jobs[i], detailReused: true }; continue; } // 增量：已发布且有详情，沿用旧的完整正文
    try {
      const d = await post('https://career.honor.com/wecruit/positionInfo/listPositionDetail/' + jobs[i]._portal.su, 'postId=' + jobs[i].postId + '&recruitType=' + jobs[i]._portal.recruitType);
      if (d?.postId !== jobs[i].postId) throw new Error('Honor: detail identity mismatch');
      jobs[i] = { ...jobs[i], ...d }; got++; streak = 0;
    } catch (error) {
      streak++;
      if ([403, 412, 429].includes(error.http) || streak >= 5) { issues.push('详情请求停止：' + error.message); break; }
    }
  }
  if (reused) console.log('增量：沿用已发布详情 ' + reused + ' 个，新取详情 ' + got + ' 个');
  if (got + reused < jobs.length) issues.push('详情取得 ' + (got + reused) + '/' + jobs.length + '（含沿用 ' + reused + '），其余仅有列表字段');
  return { total: jobs.length, jobs, issues, verification: { key: p.key, api: p.api, issues } };
}
module.exports = { PROFILES, hasDetail, requiresVerification, verifiedSource, validateJobs, normalizeRecord, validateEvidence, fetchAll: run, run, portalNotice };
if (require.main === module) {
  (async () => {
    const [siteJSON, rawFile] = process.argv.slice(2);
    if (!siteJSON || !rawFile) throw new Error('Usage: node honor_portal.js <siteJSON> <rawFile>');
    const result = await run(JSON.parse(siteJSON)), temp = rawFile + '.tmp-' + process.pid;
    try {
      fs.writeFileSync(temp, JSON.stringify(result, null, 2) + '\n', { encoding: 'utf8', flag: 'wx' });
      fs.renameSync(temp, rawFile);
    } finally { if (fs.existsSync(temp)) fs.unlinkSync(temp); }
    console.log('DONE fetched=' + result.total);
  })().catch(error => { console.error('ERR ' + error.message); process.exitCode = 1; });
}
