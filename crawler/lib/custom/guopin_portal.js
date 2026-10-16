'use strict';
// 国聘（iguopin.com，央企国企统一招聘平台）：企业性质为「国企」的在招岗位。列表接口匿名可用（网页自己调用，无需签名），JD 在列表里。
// 单次查询最多只能翻到 1000 条，所以按「岗位性质 → 经验 → 学历 → 地区（省→市→区）」逐级拆分，直到每份不足上限；
// 前三个维度每个岗位只有一个取值、互不重叠；地区维度一个岗位可能有多个工作地点（会重复出现，按岗位 ID 去重）。
// 拆到底仍触顶就整次失败（不发布部分结果）。
// 宽松策略：坏记录只记 issues；官网拒绝（4xx、业务码异常）立即停止，不重试、不绕过。
const fs = require('node:fs');
const { normalizeJD } = require('../jd-text');
const ORIGIN = 'https://www.iguopin.com', API_ORIGIN = 'https://gp-api.iguopin.com';
const LIST = API_ORIGIN + '/api/jobs/v1/list', DICT = API_ORIGIN + '/api/base/category/v1/by-alias', TREE = API_ORIGIN + '/api/base/districts/v1/tree';
const ADAPTER = 'guopin-portal-v1', PAGE_SIZE = 200, MAX_PAGES = 20, SOE = '11AzDak'; // SOE：字典 company_nature 里的「国企」
const HEADERS = { 'Content-Type': 'application/json', Accept: 'application/json', Device: 'h5', Version: '5.2.300' }; // 网页客户端自带的普通应用头

const PROFILES = [{
  key: 'guopin_soe', company: '国聘（国企）', initial: 'G', aliases: ['国企', '央企', '国聘', '国有企业'], unitCategory: '国企', // 招聘单位分类（目录里的互联网/国企切换）；不叫 category，那是北森来源的请求参数
  ats: 'custom', adapter: ADAPTER, listJD: true, url: ORIGIN + '/', api: LIST, body: { company_nature: [SOE] },
  batch: '国聘平台上企业性质为“国企”的在招岗位', exclude: '(无)'
}];
const profileOf = site => PROFILES.find(p => p.key === site?.key);
const requiresVerification = site => Boolean(profileOf(site)) || site?.adapter === ADAPTER;
const verifiedSource = site => site?.adapter === ADAPTER && site.api === LIST && JSON.stringify(site.body?.company_nature) === JSON.stringify([SOE]) && Boolean(profileOf(site));
function profileFor(site) {
  if (!verifiedSource(site)) throw new Error('Unverified Guopin portal identity/scope/mode');
  return profileOf(site);
}
function portalNotice(site) {
  if (!verifiedSource(site)) return '';
  return '国聘仅覆盖平台上企业性质为“国企”的在招岗位，岗位由各企业在国聘自行发布，不代表这些企业官网的全部渠道；招聘单位显示为发布岗位的企业名，岗位链接指向国聘的岗位页。日期是国聘给的岗位更新时间，只显示、不参与排序；人才计划语义未知；性质只认实习。';
}

const usable = job => job && typeof job === 'object' && typeof job.job_id === 'string' && /^\d+$/.test(job.job_id) && typeof job.job_name === 'string' && job.job_name.trim();
function validateJobs(jobs) {
  if (!Array.isArray(jobs) || !jobs.length) throw new Error('Guopin: invalid jobs or effective zero; zero cannot clear existing data');
  return true;
}
function validateEvidence(evidence) {
  return { issues: Array.isArray(evidence?.issues) ? evidence.issues : [] };
}

// 地点：只取「城市」。area_code 形如 000000.530000.530100.530102（国家.省.市.区），area_cn 形如「昆明-五华区」；
// 只到省一级的（没有市）写成「某某省」，页面按“城市未标明”处理，不把省名当城市。
function cityOf(list) {
  const names = [];
  for (const d of Array.isArray(list) ? list : []) {
    const segments = String(d?.area_code || '').split('.'), cn = typeof d?.area_cn === 'string' ? d.area_cn.trim() : '';
    if (!cn) continue;
    const municipality = ['110000', '120000', '310000', '500000'].includes(segments[1]); // 直辖市的省级地点本身就是城市
    names.push(segments.length >= 3 ? cn.split('-')[0] : municipality || /(省|自治区|特别行政区)$/.test(cn) ? cn : cn + '省');
  }
  return [...new Set(names)].join('/');
}
// 国聘给的岗位更新时间（形如 2026-10-16 18:59:04）只取日期，类型记为 platform：页面显示，但不参与同分排序（与互联网来源的日期语义不对等）。
const dateOf = value => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}/.test(value) ? value.slice(0, 10) : null;
// JD：国聘的 contents 有的是纯文本，有的是企业粘贴来的 HTML（<span style>、<br />、\r）；统一用共用的 normalizeJD 转成纯文本，
// 并在能认出「工作职责／任职要求」标题时拆成职责与要求两栏，认不出就整段放 description。去掉不可见的零宽字符。
function normalizeRecord(job, site) {
  profileFor(site);
  if (!usable(job)) throw new Error('Guopin: missing official id/title');
  const channels = job.recruitment_type_cn === '校园招聘' ? ['campus'] : job.recruitment_type_cn === '社会招聘' ? ['social'] : [];
  const jd = normalizeJD(typeof job.contents === 'string' ? job.contents.replace(/[\u200b\u200c\u200d\ufeff]/g, '') : '');
  return {
    id: job.job_id, title: job.job_name, employer: typeof job.company_name === 'string' ? job.company_name.trim() : '',
    city: cityOf(job.district_list), category: typeof job.category_cn === 'string' ? job.category_cn : '', channels,
    employment: job.nature_cn === '实习' ? 'internship' : null, talentPlan: null, date: dateOf(job.update_time), dateKind: 'platform', sourceStatus: null,
    url: ORIGIN + '/job/detail?id=' + job.job_id, duty: jd.duty, requirements: jd.requirements, description: jd.description, jdComplete: jd.hasContent
  };
}

async function run(site, options = {}) {
  const p = profileFor(site);
  const { fetchImpl = globalThis.fetch, sleep = ms => new Promise(resolve => setTimeout(resolve, ms)), gap = 2000, log = () => {} } = options;
  let requests = 0;
  async function call(url, body) {
    if (requests++) await sleep(gap);
    const response = await fetchImpl(url, { method: body ? 'POST' : 'GET', headers: HEADERS, ...(body ? { body: JSON.stringify(body) } : {}), redirect: 'error', signal: AbortSignal.timeout(60000) });
    if (response.status !== 200) throw new Error('Guopin HTTP ' + response.status);
    const json = await response.json();
    if (json?.code !== 200) throw new Error('Guopin native refusal: code ' + json?.code + ' ' + String(json?.msg ?? '').slice(0, 60));
    return json.data;
  }
  // 拆分维度：字典里的所有取值（岗位性质、经验、学历），每个岗位在每个维度上只有一个取值。
  const dict = await call(DICT, { alias: ['job_nature', 'job_experience', 'job_education'] });
  const dims = [['nature', 'job_nature'], ['experience', 'job_experience'], ['education', 'job_education']].map(([param, alias]) => {
    const values = (dict?.[alias] || []).map(item => item?.value).filter(value => typeof value === 'string' && value);
    if (!values.length) throw new Error('Guopin: dictionary ' + alias + ' is empty');
    return [param, values];
  });
  // 地区树（国家→省→市→区），district 过滤值是从根开始的点分路径，如 000000.110000.110100。
  const tree = await call(TREE);
  const countries = Array.isArray(tree) ? tree : [];
  if (!countries.length || !countries.every(node => typeof node?.value === 'string' && node.value)) throw new Error('Guopin: unexpected area tree');
  const rows = new Map(), issues = []; let skipped = 0, partitions = 0;
  // 取完一份（过滤条件 filters）：翻页直到不满一页；某页没有任何新岗位就说明触到 1000 条上限。
  async function collect(filters) {
    partitions++;
    const seen = new Set();
    for (let page = 1; page <= MAX_PAGES; page++) {
      const data = await call(LIST, { ...p.body, ...filters, page, page_size: PAGE_SIZE });
      // 没有匹配的岗位时官网返回 list: null（不是空数组）。
      const list = data && typeof data === 'object' && (Array.isArray(data.list) || data.list == null) ? data.list ?? [] : null;
      if (!list) throw new Error('Guopin: unexpected list response');
      let fresh = 0;
      for (const job of list) {
        if (!usable(job)) { skipped++; continue; }
        if (!seen.has(job.job_id)) { seen.add(job.job_id); fresh++; }
        rows.set(job.job_id, job);
      }
      if (list.length < PAGE_SIZE) return false;
      if (!fresh) return true;
    }
    return true;
  }
  // 最后一个维度：地区树。某个地区触顶就继续拆它的下一级；拆到底仍触顶就失败。
  async function walkArea(filters, nodes, prefix) {
    for (const node of nodes) {
      const path = prefix ? prefix + '.' + node.value : node.value;
      if (!await collect({ ...filters, district: [path] })) continue;
      if (!Array.isArray(node.children) || !node.children.length) throw new Error('Guopin: a partition still reaches the 1000-row cap after all splits: ' + JSON.stringify({ ...filters, district: [path] }));
      await walkArea(filters, node.children, path);
    }
  }
  async function walk(filters, rest) {
    if (!await collect(filters)) return;
    if (!rest.length) return walkArea(filters, countries, '');
    const [[param, values], ...next] = rest;
    for (const value of values) await walk({ ...filters, [param]: [value] }, next);
  }
  await walk({}, dims);
  const jobs = [...rows.values()];
  if (!jobs.length) throw new Error('Guopin: no usable records; zero cannot clear existing data');
  if (skipped) issues.push('列表中 ' + skipped + ' 条缺ID/标题，未收录');
  log('guopin: ' + jobs.length + ' jobs, ' + partitions + ' partitions, ' + requests + ' requests');
  return { total: jobs.length, jobs, issues, verification: { key: p.key, api: LIST, partitions, requests, issues } };
}

module.exports = { PROFILES, requiresVerification, verifiedSource, validateJobs, normalizeRecord, validateEvidence, fetchAll: run, run, portalNotice, cityOf };
if (require.main === module) {
  (async () => {
    const [siteJSON, rawFile] = process.argv.slice(2);
    if (!siteJSON || !rawFile) throw new Error('Usage: node guopin_portal.js <siteJSON> <rawFile>');
    const result = await run(JSON.parse(siteJSON), { log: line => console.error(line) }), temp = rawFile + '.tmp-' + process.pid;
    try {
      fs.writeFileSync(temp, JSON.stringify(result, null, 2) + '\n', { encoding: 'utf8', flag: 'wx' });
      fs.renameSync(temp, rawFile);
    } finally { if (fs.existsSync(temp)) fs.unlinkSync(temp); }
    console.log('DONE fetched=' + result.total);
  })().catch(error => { console.error('ERR ' + error.message); process.exitCode = 1; });
}
