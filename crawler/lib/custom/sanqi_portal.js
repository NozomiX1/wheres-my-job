'use strict';
const { optionalFields } = require('../optional-fields');
const { paginate } = require('../paginate');
const { htmlText } = require('../jd-text');
// 三七互娱 zhaopin.37.com 社会招聘：匿名 GET society/getIndexPage（每页 8 条，含职责）＋详情页 post_info（服务端渲染 HTML，两个 <pre>：职位描述、任职要求）。
// 官网校招列表当前是 2025 届的旧岗位且页面写「校招岗位待公布」，不收。宽松策略：详情尽力而为——官网拒绝(403/412/429)立即停止详情，其它单条失败跳过，连续 5 次失败也停止；列表出错才整次失败。
const fs = require('node:fs');
const ORIGIN = 'https://zhaopin.37.com', API = ORIGIN + '/index.php?m=Home&c=society&a=getIndexPage', ADAPTER = 'sanqi-portal-v1', MAX_PAGES = 100;
const PROFILES = [{
  key: 'sanqi_social', company: '三七互娱', initial: 'S', aliases: ['37 Interactive', '三七'], ats: 'custom', adapter: ADAPTER, track: 'social', listJD: false, apiOrigin: ORIGIN,
  url: ORIGIN + '/index.php?m=Home&c=recruit&a=recruit&recruit=1', api: API, batch: '官网社会招聘全列表（无筛选）', exclude: '(无)'
}];
const profileOf = site => PROFILES.find(p => p.key === site?.key);
const requiresVerification = site => Boolean(profileOf(site)) || site?.adapter === ADAPTER;
const verifiedSource = site => site?.adapter === ADAPTER && Boolean(profileOf(site)) && site.api === profileOf(site).api;
function profileFor(site) {
  if (!verifiedSource(site)) throw new Error('Unverified Sanqi portal identity/scope/mode');
  return profileOf(site);
}
const portalNotice = site => verifiedSource(site) ? '三七互娱仅覆盖官网社会招聘全列表；官网校招列表是旧批次岗位，不收；官网没有发布日期。详情尽力获取，未取到的只有列表里的职责。' : '';
const idOf = job => String(job?.url ?? '').match(/[?&]id=(\d+)$/)?.[1] ?? null;
const usable = job => job && typeof job === 'object' && idOf(job) && typeof job.name === 'string' && job.name.trim();
const hasDetail = job => (job.duty + job.requirements + job.description).trim() !== '';

function validateJobs(jobs) {
  if (!Array.isArray(jobs) || !jobs.length) throw new Error('Sanqi: invalid jobs or effective zero; zero cannot clear existing data');
  return true;
}
const validateEvidence = evidence => ({ issues: Array.isArray(evidence?.issues) ? evidence.issues : [] });
// 详情页：「职位描述：」「任职要求：」各跟一个 <pre>。
function parseDetail(html) {
  const section = label => { const m = html.match(new RegExp(label + '[：:]?\\s*</div>\\s*<div[^>]*>\\s*<pre[^>]*>([\\s\\S]*?)</pre>')); return m ? htmlText(m[1]).trim() : ''; };
  return { duty: section('职位描述'), requirements: section('任职要求') };
}
function normalizeRecord(job, site) {
  profileFor(site);
  if (!usable(job)) throw new Error('Sanqi: missing official id/title');
  const duty = (job.detail?.duty ?? (typeof job.duty === 'string' ? job.duty.trim() : '')), requirements = job.detail?.requirements ?? '';
  return {
    id: idOf(job), title: job.name.trim(), city: typeof job.work_place === 'string' ? job.work_place : '', category: typeof job.pname === 'string' ? job.pname : '', channels: ['social'],
    employment: null, talentPlan: null, publishedAt: null, updatedAt: null, ...optionalFields({}), sourceStatus: null,
    url: ORIGIN + '/index.php?m=Home&c=society&a=post_info&id=' + idOf(job),
    duty, requirements, description: '', jdComplete: Boolean(duty + requirements)
  };
}

async function run(site, options = {}) {
  const p = profileFor(site);
  const { fetchImpl = globalThis.fetch, sleep = ms => new Promise(resolve => setTimeout(resolve, ms)), maxPages = MAX_PAGES, known = require('../known').knownIds() } = options;
  async function get(url, accept) {
    await sleep(200);
    // 不伪装UA，不带 cookie/会话；页面自己发的匿名 GET。
    const r = await fetchImpl(url, { method: 'GET', headers: { Accept: accept, Referer: p.url }, redirect: 'error', signal: AbortSignal.timeout(20000) });
    if (r.status !== 200) { const e = new Error('Sanqi HTTP ' + r.status); e.http = r.status; throw e; }
    return r;
  }
  const issues = [];
  const { rows, pages } = await paginate(async n => {
    const json = await (await get(p.api + '&category=&key=&post_type=&place_type=&page=' + n, 'application/json, text/javascript, */*')).json();
    if (json?.code !== 0 || !Array.isArray(json?.data?.list)) throw new Error('Sanqi: unexpected list response on page ' + n);
    return { rows: json.data.list, total: Number(json.data.count), done: n >= Number(json.data.pageCount) };
  }, { maxPages, idOf, usable, issues });
  const jobs = [...rows.values()];
  if (!jobs.length) throw new Error('Sanqi: no usable records; zero cannot clear existing data');

  let got = 0, streak = 0, reused = 0;
  for (let i = 0; i < jobs.length; i++) {
    if (known.has(idOf(jobs[i]))) { reused++; jobs[i] = { ...jobs[i], detailReused: true }; continue; } // 增量：已发布且有详情，沿用旧的完整正文
    try {
      const detail = parseDetail(await (await get(ORIGIN + '/index.php?m=Home&c=society&a=post_info&id=' + idOf(jobs[i]), 'text/html')).text());
      if (!detail.duty && !detail.requirements) throw new Error('Sanqi: detail page has no JD sections');
      jobs[i] = { ...jobs[i], detail }; got++; streak = 0;
    } catch (error) {
      streak++;
      if ([403, 412, 429].includes(error.http) || streak >= 5) { issues.push('详情请求停止：' + error.message); break; }
    }
  }
  if (reused) console.log('增量：沿用已发布详情 ' + reused + ' 个，新取详情 ' + got + ' 个');
  if (got + reused < jobs.length) issues.push('详情取得 ' + (got + reused) + '/' + jobs.length + '（含沿用 ' + reused + '），其余仅有列表里的职责');
  return { total: jobs.length, jobs, issues, verification: { key: p.key, api: p.api, pages, issues } };
}
module.exports = { PROFILES, hasDetail, requiresVerification, verifiedSource, validateJobs, normalizeRecord, validateEvidence, fetchAll: run, run, portalNotice, parseDetail };
if (require.main === module) {
  (async () => {
    const [siteJSON, rawFile] = process.argv.slice(2);
    if (!siteJSON || !rawFile) throw new Error('Usage: node sanqi_portal.js <siteJSON> <rawFile>');
    const result = await run(JSON.parse(siteJSON)), temp = rawFile + '.tmp-' + process.pid;
    try {
      fs.writeFileSync(temp, JSON.stringify(result, null, 2) + '\n', { encoding: 'utf8', flag: 'wx' });
      fs.renameSync(temp, rawFile);
    } finally { if (fs.existsSync(temp)) fs.unlinkSync(temp); }
    console.log('DONE fetched=' + result.total);
  })().catch(error => { console.error('ERR ' + error.message); process.exitCode = 1; });
}
