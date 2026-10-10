'use strict';
// 美团 zhaopin.meituan.com：社招(jobType 3)与校园(jobType 1+2，见 meituan_campus_portal.js)共用列表＋详情接口（POST）。
// 宽松策略：单轮分页；岗位只需 jobUnionId 和标题；详情尽力获取（拒绝即停详情）；
// total 不符、坏记录、中途失败只记 issues，不挡整源。
const fs = require('node:fs');
const { paginate: loop } = require('../paginate');
const { randomUUID } = require('node:crypto');

const ORIGIN = 'https://zhaopin.meituan.com';
const LIST_API = ORIGIN + '/api/official/job/getJobList';
const { knownIds } = require('../known');
const DETAIL_API = ORIGIN + '/api/official/job/getJobDetail';
const HEADERS = { 'Content-Type': 'application/json', Accept: 'application/json' };
const MAX_PAGES = 1000, PAGE_SIZE = 10;
const SECTIONS = [['departmentIntro', '部门介绍'], ['desc', '岗位描述'], ['jobDuty', '岗位职责'], ['jobRequirement', '岗位基本要求'], ['precedence', '具备以下条件优先'], ['highLight', '岗位亮点']];
const PORTAL_NOTICE = '美团来源仅覆盖官网当前默认全部社招入口，不代表公司所有招聘渠道；六片完整JD按真实文本顺序展示，独立职责/岗位基本要求用于排序，其余片段不另加字段分。性质、人才计划、职能映射及可靠官网日期未知；官网原状态码不证明实际可投性。';
const PROFILE = {
  key: 'meituan_social', company: '美团', ats: 'custom', adapter: 'meituan-portal-v1', track: 'social', batch: '社招', exclude: '(无)',
  apiOrigin: ORIGIN, url: ORIGIN + '/web/social', api: LIST_API, fetchDetails: true,
  body: { page: { pageNo: 1, pageSize: 10 }, jobShareType: '1', keywords: '', cityList: [], department: [], jfJgList: [], jobType: [{ code: '3', subCode: [] }], typeCode: [], specialCode: [] }
};

const CAMPUS_ADAPTER = 'meituan-campus-partitions-v1';
const requiresVerification = site => ['meituan', 'meituan_social'].includes(site?.key) || site?.adapter === PROFILE.adapter || site?.adapter === CAMPUS_ADAPTER;
const verifiedSource = site => site?.key === PROFILE.key && site.adapter === PROFILE.adapter;
const portalNotice = site => verifiedSource(site) ? PORTAL_NOTICE : '';

const listRequest = (n, { body = PROFILE.body, jobType } = {}) => {
  const next = structuredClone(body); next.page.pageNo = n; if (jobType) next.jobType = [{ code: jobType, subCode: [] }];
  return { url: LIST_API, method: 'POST', headers: { ...HEADERS }, body: next };
};
const detailRequest = id => ({ url: DETAIL_API, method: 'POST', headers: { ...HEADERS }, body: { jobUnionId: id, jobShareType: '1' } });
const usable = job => job && typeof job === 'object' && typeof job.jobUnionId === 'string' && /^[1-9]\d*$/.test(job.jobUnionId) && typeof job.name === 'string' && job.name.trim();
const text = value => typeof value === 'string' ? value : '';

function validateJobs(jobs) {
  if (!Array.isArray(jobs) || !jobs.length) throw new Error('Meituan: invalid jobs or effective zero; zero cannot clear existing data');
  return true;
}
// 详情取得与否记在 verification.detailIds（新）或 details 原始响应（旧快照）里。
function validateEvidence(evidence) {
  const old = Array.isArray(evidence?.details) ? evidence.details.filter(d => d?.response?.status === 1).map(d => d.request?.body?.jobUnionId) : [];
  return { issues: Array.isArray(evidence?.issues) ? evidence.issues : [], detailIds: new Set([...old, ...(evidence?.detailIds || [])]) };
}
function normalizeRecord(job, site, { detailIds = new Set() } = {}) {
  if (!verifiedSource(site)) throw new Error('Meituan: unverified source identity/scope/mode');
  if (!usable(job)) throw new Error('Meituan: missing official id/title');
  return {
    id: job.jobUnionId, title: job.name, city: (Array.isArray(job.cityList) ? job.cityList : []).map(v => v?.name).filter(Boolean), category: '',
    description: SECTIONS.filter(([k]) => text(job[k]) !== '').map(([k, title]) => title + '\n' + job[k]).join('\n\n'),
    duty: text(job.jobDuty), requirements: text(job.jobRequirement),
    date: null, dateKind: null, employment: null, talentPlan: null, channels: ['social'], sourceStatus: job.jobStatus ?? null,
    // 只有取到详情且没有未映射的 otherInfo 内容，才说 JD 完整。
    jdComplete: (detailIds.has(job.jobUnionId) || job.detailFetched === true) && [null, undefined, '', '暂无'].includes(job.otherInfo) && SECTIONS.some(([k]) => /[\p{L}\p{N}]/u.test(text(job[k]))),
    url: ORIGIN + '/web/position/detail?jobUnionId=' + encodeURIComponent(job.jobUnionId) + '&jobShareType=1'
  };
}

// ---- 采集（社招与校园共用）----
function client({ fetchImpl = globalThis.fetch, sleep = ms => new Promise(r => setTimeout(r, ms)) } = {}) {
  return async req => {
    await sleep(200);
    const r = await fetchImpl(req.url, { method: req.method, headers: req.headers, body: JSON.stringify(req.body), redirect: 'manual', signal: AbortSignal.timeout(15000) });
    if (r.status !== 200) { const e = new Error('Meituan: HTTP ' + r.status); e.http = r.status; throw e; }
    const json = await r.json();
    if (json?.status !== 1) throw new Error('Meituan: native business refusal');
    return json.data;
  };
}
// 按 makeRequest(n) 分页到空页/null 或取满 total；中途失败或触顶即整次失败（见 ../paginate.js）。
const paginate = (get, makeRequest, rows, issues, { maxPages = MAX_PAGES, label = '' } = {}) => loop(async n => {
  const data = await get(makeRequest(n));
  return { rows: Array.isArray(data?.list) ? data.list : [], total: data?.page?.totalCount };
}, { maxPages, idOf: job => job.jobUnionId, usable, issues, rows, label });
// 详情尽力而为：拒绝(403/412/429)立即停止，其它单条失败跳过，连续5次失败也停止。
async function fetchDetails(get, rows, issues, known = knownIds()) {
  let got = 0, streak = 0, reused = 0;
  for (const [id, row] of rows) {
    if (known.has(id)) { reused++; continue; } // 增量：已发布且有详情，沿用
    try {
      const detail = await get(detailRequest(id));
      if (detail?.jobUnionId !== id) throw new Error('Meituan: detail identity mismatch');
      rows.set(id, { ...row, ...detail, detailFetched: true }); got++; streak = 0;
    } catch (error) {
      streak++;
      if ([403, 412, 429].includes(error.http) || streak >= 5) { issues.push('详情请求停止：' + error.message); break; }
    }
  }
  if (reused) console.log('增量：沿用已发布详情 ' + reused + ' 个，新取详情 ' + got + ' 个');
  if (got + reused < rows.size) issues.push('详情取得 ' + (got + reused) + '/' + rows.size + '（含沿用 ' + reused + '），其余仅有列表正文');
  return got;
}
function envelope(site, rows, issues, extra) {
  const jobs = [...rows.values()];
  if (!jobs.length) throw new Error('Meituan: no usable records; zero cannot clear existing data');
  return { total: jobs.length, jobs, issues, verification: { key: site.key, api: LIST_API, detailApi: DETAIL_API, issues, detailIds: jobs.filter(j => j.detailFetched).map(j => j.jobUnionId), ...extra } };
}

async function fetchAvailable(site, options = {}) {
  if (!verifiedSource(site)) throw new Error('Meituan: unverified source identity/scope/mode');
  const get = client(options), rows = new Map(), issues = [];
  const { total, pages } = await paginate(get, n => listRequest(n), rows, issues, { maxPages: options.maxPages });
  if (total !== null && total !== rows.size) issues.push('官方total ' + total + '；实际唯一岗位 ' + rows.size);
  if (options.withDetails !== false) await fetchDetails(get, rows, issues, options.known);
  return envelope(site, rows, issues, { pages });
}

async function run(args, options = {}) {
  if (!Array.isArray(args) || args.length !== 2 || !args[1]) throw new Error('Usage: meituan_portal.js <siteJSON> <outputFile>');
  const site = JSON.parse(args[0]);
  const result = await fetchAvailable(site, options), out = { key: site.key, api: site.api, mode: 'custom', ...result };
  const file = args[1], temporary = file + '.tmp-' + randomUUID(); let created = false;
  try {
    const fd = fs.openSync(temporary, 'wx'); created = true;
    try { fs.writeFileSync(fd, JSON.stringify(out, null, 2) + '\n', 'utf8'); } finally { fs.closeSync(fd); }
    fs.renameSync(temporary, file);
  } finally { if (created && fs.existsSync(temporary)) fs.unlinkSync(temporary); }
  return out;
}
module.exports = { PROFILE, PORTAL_NOTICE, SECTIONS, portalNotice, requiresVerification, verifiedSource, validateJobs, normalizeRecord, validateEvidence, fetchAvailable, fetchAll: fetchAvailable, run,
  shared: { client, paginate, fetchDetails, envelope, listRequest, usable, text, CAMPUS_ADAPTER } };
if (require.main === module) run(process.argv.slice(2)).catch(error => { console.error(error.message); process.exitCode = 1; });
