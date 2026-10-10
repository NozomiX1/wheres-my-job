'use strict';
const { paginate } = require('../paginate');
// 米哈游 jobs.mihoyo.com：校招(hireType=1)与社招(hireType=0)共用列表+详情接口（POST）。
// 宽松策略：单轮列表 + 逐岗详情（尽力而为）；岗位只需官网ID和标题；缺详情时只有列表字段；
// total 不符/坏记录/中途失败只记 issues，不挡整源。
const fs = require('node:fs');
const { randomUUID } = require('node:crypto');
const ORIGIN = 'https://jobs.mihoyo.com', API_ORIGIN = 'https://ats.openout.mihoyo.com';
const API = API_ORIGIN + '/ats-portal/v1/job/list', DETAIL_API = API_ORIGIN + '/ats-portal/v1/job/info';
const ADAPTER = 'mihoyo-portal-v1', PAGE_SIZE = 10, MAX_PAGES = 400;
// 普通公开请求头；Node 自带 UA，不保存会话/token。
const HEADERS = { 'Content-Type': 'application/json', Accept: 'application/json', Origin: ORIGIN, Referer: ORIGIN + '/', 'Release-Tag': 'v26.9.0-260805', 'current-request': 'request', 'Accept-Language': 'zh-CN,zh;q=0.9' };
const PROFILES = [
  ['mihoyo', 'campus', 1, '校招', '/campus/position'], ['mihoyo_social', 'social', 0, '社招', '/position']
].map(([key, track, hireType, batch, route]) => ({
  key, company: '米哈游', ats: 'custom', adapter: ADAPTER, track, batch, exclude: '(无)', fetchDetails: true,
  origin: ORIGIN, apiOrigin: API_ORIGIN, url: ORIGIN + '/#' + route, api: API, detailApi: DETAIL_API, headers: HEADERS,
  body: { pageNo: 1, pageSize: PAGE_SIZE, channelDetailIds: [1], hireType }
}));
const SECTIONS = [['jobSummary', '岗位摘要'], ['description', '工作职责'], ['jobRequire', '任职要求'], ['addition', '加分项'], ['deliveryInstructions', '投递说明'], ['objectName', '面向对象']];
const profileOf = site => PROFILES.find(p => p.key === site?.key);

const requiresVerification = site => Boolean(profileOf(site)) || site?.adapter === ADAPTER;
const verifiedSource = site => site?.adapter === ADAPTER && profileOf(site)?.body.hireType === site.body?.hireType;
function profile(site) {
  if (!verifiedSource(site)) throw new Error('Mihoyo: unverified source identity/scope/mode');
  return profileOf(site);
}
function portalNotice(site) {
  if (!verifiedSource(site)) return '';
  return '米哈游来源仅覆盖官网当前' + (site.track === 'campus' ? '校园' : '社会') + '招聘默认入口（channelDetailIds=[1]），不代表公司全部渠道；六片完整JD保留官网文本标题及顺序，独立职责/任职要求用于排序，其余片段不另加字段分。第三方编制及其他性质、人才计划和可靠官网日期保持未知；原状态码不证明实际可投性，首次范围迁移退出不表示已核验下架。';
}
const usable = job => job && typeof job === 'object' && typeof job.id === 'string' && /^[1-9]\d*$/.test(job.id) && typeof job.title === 'string' && job.title.trim();
const text = value => typeof value === 'string' ? value : '';

function validateJobs(jobs) {
  if (!Array.isArray(jobs) || !jobs.length) throw new Error('Mihoyo: invalid jobs or effective zero; zero cannot clear existing data');
  return true;
}
function validateEvidence(evidence) {
  return { issues: Array.isArray(evidence?.issues) ? evidence.issues : [] };
}
function normalizeRecord(job, site) {
  const p = profile(site);
  if (!usable(job)) throw new Error('Mihoyo: missing official id/title');
  return {
    id: job.id, title: job.title, city: (Array.isArray(job.addressDetailList) ? job.addressDetailList : []).map(a => a?.addressDetail).filter(Boolean), category: text(job.competencyType),
    description: SECTIONS.filter(([k]) => text(job[k]) !== '').map(([k, title]) => title + '\n' + job[k]).join('\n\n'),
    duty: text(job.description), requirements: text(job.jobRequire), channels: [p.track],
    employment: job.jobNature === '全职' ? 'full-time' : job.jobNature === '实习' ? 'internship' : null,
    talentPlan: null, date: null, dateKind: null, sourceStatus: job.status == null ? null : String(job.status),
    jdComplete: job.detailReused !== true && SECTIONS.some(([k]) => /[\p{L}\p{N}]/u.test(text(job[k]))), url: p.url + '/' + job.id
  };
}

async function fetchAll(site, options = {}) {
  const p = profile(site);
  const { fetchImpl = globalThis.fetch, sleep = ms => new Promise(resolve => setTimeout(resolve, ms)), maxPages = MAX_PAGES, withDetails = true, known = require('../known').knownIds() } = options;
  async function post(url, body) {
    await sleep(200);
    const r = await fetchImpl(url, { method: 'POST', headers: { ...p.headers }, body: JSON.stringify(body), redirect: 'manual', signal: AbortSignal.timeout(15000) });
    if (r.status !== 200) { const e = new Error('Mihoyo: HTTP ' + r.status); e.http = r.status; throw e; }
    const json = await r.json();
    if (json.code !== 0 || json.success !== true) throw new Error('Mihoyo: native business refusal');
    return json.data;
  }
  const issues = [];
  const { rows: byId, pages } = await paginate(async n => {
    const data = await post(p.api, { ...structuredClone(p.body), pageNo: n });
    if (!Array.isArray(data?.list)) throw new Error('Mihoyo: unexpected list shape on page ' + n);
    return { rows: data.list, total: data.total };
  }, { maxPages, idOf: row => row.id, usable, issues });
  const jobs = [...byId.values()];
  if (!jobs.length) throw new Error('Mihoyo: no usable records; zero cannot clear existing data');

  // 详情尽力而为：官网拒绝(403/412/429)立即停止详情；其它单条失败跳过，连续5次失败也停止。
  if (withDetails) {
    let got = 0, streak = 0, reused = 0;
    for (let i = 0; i < jobs.length; i++) {
      if (known.has(jobs[i].id)) { reused++; jobs[i] = { ...jobs[i], detailReused: true }; continue; } // 增量：已发布且有详情，沿用（列表自带部分分段文本，所以要明确标记，发布时才会沿用旧的完整正文）
      try {
        const data = await post(p.detailApi, { id: jobs[i].id, channelDetailIds: [1], hireType: p.body.hireType });
        if (!data || data.id !== jobs[i].id) throw new Error('Mihoyo: detail identity mismatch');
        jobs[i] = { ...jobs[i], ...data }; got++; streak = 0;
      } catch (error) {
        streak++;
        if ([403, 412, 429].includes(error.http) || streak >= 5) { issues.push('详情请求停止：' + error.message); break; }
      }
    }
    if (reused) console.log('增量：沿用已发布详情 ' + reused + ' 个，新取详情 ' + got + ' 个');
    if (got + reused < jobs.length) issues.push('详情取得 ' + (got + reused) + '/' + jobs.length + '（含沿用 ' + reused + '），其余仅有列表字段');
  }
  return { total: jobs.length, jobs, issues, verification: { key: p.key, api: p.api, detailApi: p.detailApi, pages, issues } };
}
async function run(args, options = {}) {
  if (!Array.isArray(args) || args.length !== 2 || typeof args[0] !== 'string' || !args[1]) throw new Error('Usage: mihoyo_portal.js <siteJSON> <outputFile>');
  const site = JSON.parse(args[0]); profile(site);
  const result = await fetchAll(site, options), envelope = { key: site.key, api: site.api, mode: 'custom', ...result };
  const file = args[1], temporary = file + '.tmp-' + randomUUID(); let created = false;
  try {
    const fd = fs.openSync(temporary, 'wx'); created = true;
    try { fs.writeFileSync(fd, JSON.stringify(envelope, null, 2) + '\n', 'utf8'); }
    finally { fs.closeSync(fd); }
    fs.renameSync(temporary, file);
  } finally { if (created && fs.existsSync(temporary)) fs.unlinkSync(temporary); }
  return envelope;
}
module.exports = { PROFILES, requiresVerification, verifiedSource, validateJobs, normalizeRecord, validateEvidence, fetchAll, run, portalNotice };
if (require.main === module) run(process.argv.slice(2)).catch(error => { console.error(error.message); process.exitCode = 1; });
