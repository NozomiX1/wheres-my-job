'use strict';
const { paginate } = require('./paginate');
// 北森招聘（讯飞校园／社会、vivo 校园）：POST 列表接口，JD 在列表里。
// 宽松策略：单轮分页；岗位只需 Id（UUID）、JobAdId 与标题；缺失字段按空处理；
// total 不符、坏记录、中途失败只记 issues，不挡整源。
const fs = require('node:fs');
const PROFILES = [
  { key: 'iflytek', company: '科大讯飞', origin: 'https://iflytek.zhiye.com', url: 'https://iflytek.zhiye.com/jobs', category: ['2', '3', '4', '5', '6', '7'], pageSize: 100, fields: ['Category', 'Kind', 'LocId', 'PostDate', 'ClassificationOne', 'WorkWeChatQrCode'] },
  { key: 'iflytek_social', company: '科大讯飞', origin: 'https://iflytek.zhiye.com', url: 'https://iflytek.zhiye.com/social/jobs', category: ['1'], pageSize: 100, fields: ['Category', 'Kind', 'LocId', 'PostDate', 'ClassificationOne', 'ClassificationTwo', 'WorkWeChatQrCode'], track: 'social' },
  { key: 'vivo', company: 'vivo', origin: 'https://hr-campus.vivo.com', url: 'https://hr-campus.vivo.com/jobs', category: [], pageSize: 20, fields: ['Category', 'LocId', 'HeadCount', 'WorkWeChatQrCode', 'ClassificationOne', 'ClassificationTwo', 'Kind', 'PostDate'] }
].map(p => ({ ...p, api: p.origin + '/api/Jobad/GetJobAdPageList' }));
const ADAPTER = 'beisen-portal-v1', MAX_PAGES = 200;
const PORTAL_NOTICE = '北森来源仅覆盖各登记官网广列表及已核验渠道/项目集合，不代表公司全球所有招聘渠道；招聘渠道、项目、性质及未知属性分别保留。';
const profileOf = site => PROFILES.find(p => p.key === site?.key);

const requiresVerification = site => Boolean(profileOf(site)) || site?.adapter === ADAPTER || site?.ats === 'beisen';
const verifiedSource = site => site?.adapter === ADAPTER && Boolean(profileOf(site));
function portalNotice(site) {
  if (!verifiedSource(site)) return '';
  return site.key === 'iflytek' ? '讯飞联合普通校园、飞YOUNG实习、飞星、飞凡、校园大使、星火X六个官方频道；星火X不强推校招/社招。'
    : site.key === 'vivo' ? 'vivo校园默认全项目，含秋招、蓝极星、日常/暑期实习；ClassificationOne是项目、ClassificationTwo是职能，性质只按Kind；社会另套系统不在本源。'
    : '讯飞社会频道Category1；职能只按ClassificationOne，不把渠道Category或部门ClassificationTwo当职能。';
}

const usable = job => job && typeof job === 'object' && typeof job.Id === 'string' && job.Id.trim() && typeof job.JobAdName === 'string' && job.JobAdName.trim();
function validateJobs(jobs) {
  if (!Array.isArray(jobs) || !jobs.length) throw new Error('Beisen: invalid jobs or effective zero; zero cannot clear existing data');
  return true;
}
function validateEvidence(evidence) {
  return { issues: Array.isArray(evidence?.issues) ? evidence.issues : [] };
}

// 官网发布时间：PostDate 的日历日，0001-01-01 或缺少 PostDateInt 视为未知。
function publicationDate(job) {
  const match = /^(\d{4}-\d{2}-\d{2})T/.exec(typeof job.PostDate === 'string' ? job.PostDate.trim() : '');
  return match && match[1] !== '0001-01-01' && job.PostDateInt ? match[1] : null;
}
// 普通 TEXT 渲染器解码，不是 HTML 解析；角括号保持字面。
function nativeText(value) {
  const text = typeof value === 'string' ? value : '';
  return text.replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&').replace(/\r\n?/g, '\n').trim();
}
function normalizeRecord(job, site) {
  if (!verifiedSource(site)) throw new Error('Beisen portal identity/scope/mode has not been verified');
  if (!usable(job)) throw new Error('Beisen: missing official id/title');
  const duty = nativeText(job.Duty), requirements = nativeText(job.Require), categoryId = job.CategoryId;
  const channels = categoryId === '1' ? ['social'] : ['2', '4', '5', '6'].includes(categoryId) ? ['campus'] : [];
  const route = categoryId === '1' ? 'social' : categoryId === '2' ? 'campus' : categoryId === '3' ? 'intern' : categoryId;
  const date = publicationDate(job);
  return { id: job.Id.toLowerCase(), title: job.JobAdName, city: Array.isArray(job.LocNames) ? job.LocNames : [], category: nativeText(site.key === 'vivo' ? job.ClassificationTwo : job.ClassificationOne), channels,
    employment: job.Kind === '全职' ? 'full-time' : job.Kind === '实习' ? 'internship' : null,
    talentPlan: site.key === 'vivo' ? job.ClassificationOne === '蓝极星计划' ? true : null : ['4', '5', '7'].includes(categoryId) ? true : null,
    date, dateKind: date ? 'published' : null, url: new URL(site.api).origin + '/' + route + '/detail?jobAdId=' + encodeURIComponent(job.Id),
    duty, requirements, description: '', jdComplete: /[\p{L}\p{N}]/u.test(duty + requirements), sourceStatus: job.Status == null ? null : String(job.Status) };
}

function requestBody(site, page, size) {
  const profile = profileOf(site);
  return { PageIndex: page, PageSize: size, ...(profile.category.length ? { Category: profile.category } : {}), KeyWords: '', SpecialType: 0, PortalId: '', DisplayFields: profile.fields };
}

async function fetchAll(site, options = {}) {
  if (!verifiedSource(site)) throw new Error('Unverified Beisen portal/scope/mode');
  const profile = profileOf(site);
  const { fetchImpl = globalThis.fetch, pageSize = profile.pageSize, maxPages = MAX_PAGES, sleep = ms => new Promise(r => setTimeout(r, ms)), delayMs = 150 } = options;
  const issues = [];
  const { rows: byId, pages } = await paginate(async n => {
    const page = n - 1;
    if (page) await sleep(delayMs);
    const r = await fetchImpl(profile.api, { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: profile.origin, Referer: profile.url, Accept: 'application/json, text/plain, */*' }, body: JSON.stringify(requestBody(site, page, pageSize)), signal: AbortSignal.timeout(15000), redirect: 'error' });
    if (r.status !== 200) throw new Error('Beisen HTTP ' + r.status);
    const json = await r.json();
    if (json?.Success === false || json?.success === false || (json?.Code != null && json.Code !== 200) || !Array.isArray(json?.Data)) throw new Error('Beisen business refusal on page ' + page);
    return { rows: json.Data, total: json.Count };
  }, { maxPages, idOf: job => job.Id.toLowerCase(), usable, issues });
  const jobs = [...byId.values()];
  if (!jobs.length) throw new Error('Beisen: no usable records; zero cannot clear existing data');
  return { total: jobs.length, jobs, issues, verification: { key: site.key, api: profile.api, pages, issues } };
}

async function run(args, options) {
  const [config, outfile] = args;
  if (!config || !outfile) throw new Error('Usage: node beisen.js <siteJSON> <outfile>');
  const envelope = await fetchAll(JSON.parse(config), options);
  fs.writeFileSync(outfile, JSON.stringify(envelope, null, 2) + '\n', 'utf8');
  return envelope;
}
module.exports = { requiresVerification, verifiedSource, portalNotice, PORTAL_NOTICE, validateJobs, validateEvidence, publicationDate, nativeText, normalizeRecord, requestBody, fetchAll, run };
if (require.main === module) run(process.argv.slice(2)).then(result => console.log('DONE fetched=' + result.total)).catch(error => { console.error('ERR ' + error.message); process.exitCode = 1; });
