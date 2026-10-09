// Independently reviewed Chinese social portals; Cloud has a separate available-only contract.
'use strict';
const { paginate } = require('../paginate');
const fs = require('node:fs');
const { isDeepStrictEqual } = require('node:util');
const { createHash } = require('node:crypto');
const PAGE_SIZE = 10, MAX_PAGES = 200, LIST_PAGES = 400, ADAPTER = 'ali-social-portal-v1';
const QUALIFIED_KEYS = new Set(['alibaba_social', 'taotian_social', 'ele_social', 'aidc_social', 'tongyi_social', 'dingtalk_social', 'quark_social']);
const PROFILES = Object.freeze([
  ['alibaba_social', '阿里巴巴', 'talent-holding.alibaba.com', 'bootstrap'],
  ['taotian_social', '淘天集团', 'talent.taotian.com', 'cookie'],
  ['ele_social', '饿了么', 'talent.ele.me', 'cookie'],
  ['aidc_social', '阿里国际', 'aidc-jobs.alibaba.com', 'bootstrap'],
  ['aliyun_social', '阿里云', 'careers.aliyun.com', 'bootstrap'],
  ['tongyi_social', '通义', 'careers-tongyi.alibaba.com', 'bootstrap'],
  ['dingtalk_social', '钉钉', 'talent.dingtalk.com', 'cookie'],
  ['quark_social', '夸克', 'talent.quark.cn', 'cookie']
].map(([key, company, host, csrfMode]) => {
  const origin = 'https://' + host, international = key === 'aidc_social';
  const body = Object.freeze({ channel: 'group_official_site', language: 'zh', batchId: '', categories: '', deptCodes: Object.freeze([]), key: '', pageIndex: 1, pageSize: PAGE_SIZE, regions: '', subCategories: '', ...(!international ? { shareType: '', shareId: '', myReferralShareCode: '' } : {}) });
  // Core URLs are the recorded successful Node GET final URLs, not guessed redirects.
  const route = international ? '/zh/off-campus/position-list' : key === 'alibaba_social' ? '/off-campus/position-list' : key === 'tongyi_social' ? '/off-campus/position-list?&search=' : '/off-campus/position-list?lang=zh';
  return Object.freeze({ key, company, origin, url: origin + route, api: origin + (international ? '/zh/position/search?lang=zh' : '/position/search'), body, csrfMode, languageRedirect: csrfMode === 'cookie', qualified: QUALIFIED_KEYS.has(key) });
}));
const PORTAL_NOTICE = '阿里来源仅覆盖各登记官网当前中文社会招聘广入口，不代表公司所有渠道；社会入口不证明逐岗全职或无人才计划，性质、计划及状态未知分别保留。官网更新日依访问者本地时区，无法唯一映射；本批日期未知，publishTime发布语义亦未证。首次范围迁移退出不代表已核验官网下架。';
function requiresVerification(site) {
  return PROFILES.some(p => p.key === site?.key) || site?.adapter === ADAPTER || ['api', 'url', 'apiOrigin'].some(field => {
    try {
      const value = site?.[field];
      if (value === undefined) return false;
      if (typeof value !== 'string') return true;
      const hostname = new URL(field === 'api' && value.startsWith('POST ') ? value.slice(5) : value).hostname.toLowerCase().replace(/\.$/, '');
      return PROFILES.some(p => new URL(p.origin).hostname === hostname);
    } catch { return true; } // A malformed declared portal URI cannot authorize an ATS fallback.
  });
}
function requestBody(profile, pageIndex) {
  const p = PROFILES.find(p => p.key === profile?.key);
  if (!p || !Number.isSafeInteger(pageIndex) || pageIndex < 1) throw new Error('Invalid Ali portal/page');
  return { ...p.body, deptCodes: [], pageIndex };
}
function siteFor(p) {
  return { key: p.key, company: p.company, ats: 'custom', track: 'social', batch: '社招', exclude: '(无)', adapter: ADAPTER, listJD: true, apiOrigin: p.origin, url: p.url, api: p.api, body: requestBody(p, 1) };
}
// 七个常规社招门户：已登记 key + 适配器名即可；阿里云(Cloud)仍走下面独立的 availableSource 合同。
function verifiedSource(site) {
  return QUALIFIED_KEYS.has(site?.key) && site.adapter === ADAPTER;
}
function availableSource(site) {
  const p = PROFILES.find(p => p.key === 'aliyun_social');
  return site?.key === p.key && isDeepStrictEqual(site, siteFor(p));
}
function portalNotice(site) {
  if (availableSource(site)) return PORTAL_NOTICE + '仅覆盖阿里云官网当前默认空筛选社会列表（含官网列出的瓴羊、诚云等岗位，不推定法律雇主）；原生分页metadata固定500/1，早空及官方total差异不代表下架。已收录列表JD，详情正文完整性待核验，完整性未验证。';
  if (!verifiedSource(site)) return '';
  const extra = {
    alibaba_social: '当前阿里巴巴控股集团门户，不合并其它阿里入口。',
    aidc_social: '当前阿里国际全部职位入口，不自动并入校园、Bravo Star或Global Hiring。',
    tongyi_social: '通义既有门户当前名称Token Foundry，页脚仍为通义实验室；保留原公司目录与key。',
    ele_social: '饿了么品牌现已更名淘宝闪购，仍为原官方招聘门户；保留原公司目录与key。',
    dingtalk_social: '钉钉官方招聘门户当前名称千问办公；保留原公司目录与key。',
    quark_social: '夸克既有门户官网现称千问事业部／千问C端事业群，业务介绍含千问APP、夸克、AI硬件、UC、书旗、汇川六产品，不是仅夸克单产品的窄范围；保留原公司目录与key。',
    taotian_social: '当前淘天集团官方招聘门户全部职位入口。'
  };
  return PORTAL_NOTICE + extra[site.key];
}
const NULL_FIELDS = ['status', 'graduationTime', 'interviewLocations', 'tags', 'department', 'project', 'positionType', 'categoryName', 'categoryType', 'batchName', 'batchId', 'batchWillingCount', 'channels', 'circle', 'circleNames', 'circleCodeList', 'niuKeProjectName', 'useInternal', 'isLingYang'];
const NATIVE_FIELDS = new Set(['trackId', 'positionUrl', 'bucket', 'id', 'name', 'categories', 'publishTime', 'modifyTime', 'workLocations', 'regionEnNameMap', 'technologyNameIdMap', 'requirement', 'description', 'experience', 'degree', 'code', 'operations', 'isTongyi', 'tongyi', ...NULL_FIELDS]);
// These client aliases never supply facts. They still participate in full raw stability/binding.
const ALIASES = new Set(['title', 'duty', 'requirements', 'url', 'date', 'dateKind', 'employment', 'talentPlan', 'sourceStatus', 'jdComplete']);
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const textOrNull = value => value === null || typeof value === 'string';
const stringsOrNull = value => value === null || Array.isArray(value) && value.every(v => typeof v === 'string');
const dense = value => Array.isArray(value) && [...value.keys()].every(i => Object.hasOwn(value, i));
const keys = (value, expected) => object(value) && isDeepStrictEqual(Object.keys(value).sort(), [...expected].sort());
function freeze(value) { if (value && typeof value === 'object') { Object.values(value).forEach(freeze); Object.freeze(value); } return value; }
function officialURL(job, profile) {
  if (typeof job.positionUrl !== 'string' || !job.positionUrl || /[\u0000-\u0020\\#]/.test(job.positionUrl) || typeof job.trackId !== 'string' || !job.trackId.trim()) throw new Error('Invalid Ali native URL/tracking');
  let url;
  try { url = new URL(job.positionUrl, profile.origin); } catch { throw new Error('Invalid Ali native URL'); }
  const keys = [...url.searchParams.keys()];
  if (url.origin !== profile.origin || url.username || url.password || url.hash || url.pathname !== '/off-campus/position-detail' || keys.length !== 2 || !keys.includes('positionId') || !keys.includes('track_id') || url.searchParams.get('positionId') !== String(job.id) || url.searchParams.get('track_id') !== job.trackId) throw new Error('Ali official URL/identity/tracking mismatch');
  return url.href;
}
function validateJob(job, p) {
  const cloud = p.key === 'aliyun_social';
  if (!object(job) || [...NATIVE_FIELDS].some(field => !Object.hasOwn(job, field)) || !Number.isSafeInteger(job.id) || job.id <= 0 || typeof job.name !== 'string' || !job.name.trim()) throw new Error('Ali native identity/title or own fields changed');
  if (['description', 'requirement', 'degree'].some(field => !textOrNull(job[field])) || ['categories', 'workLocations'].some(field => !stringsOrNull(job[field])) || NULL_FIELDS.some(field => cloud && field === 'isLingYang' ? typeof job[field] !== 'boolean' : cloud && field === 'tags' ? !stringsOrNull(job[field]) : job[field] !== null)) throw new Error('Ali native text/metadata shape changed or unverified nonnull facts');
  if (['publishTime', 'modifyTime'].some(field => job[field] !== null && (!Number.isSafeInteger(job[field]) || job[field] < 0 || !Number.isFinite(new Date(job[field]).getTime())))) throw new Error('Ali native date shape changed');
  if (typeof job.bucket !== 'string' || typeof job.code !== 'string' || ['isTongyi', 'tongyi'].some(field => typeof job[field] !== 'boolean') || !Array.isArray(job.operations) || job.operations.length || ['regionEnNameMap', 'technologyNameIdMap'].some(field => !object(job[field]) || Object.keys(job[field]).length)) throw new Error('Ali native metadata shape changed');
  if (job.experience !== null && (!object(job.experience) || !isDeepStrictEqual(Object.keys(job.experience).sort(), ['from', 'to']) || ['from', 'to'].some(field => job.experience[field] !== null && (!Number.isSafeInteger(job.experience[field]) || job.experience[field] < 0)))) throw new Error('Ali native experience shape changed');
  if (Object.keys(job).some(field => !NATIVE_FIELDS.has(field) && !ALIASES.has(field) && job[field] !== null && job[field] !== '')) throw new Error('Unverified Ali additional native JD/field');
  officialURL(job, p);
}
function validateJobs(jobs, site) {
  if (!verifiedSource(site) && !availableSource(site)) throw new Error('Unverified Ali portal identity/scope/mode');
  if (!Array.isArray(jobs)) throw new Error('Ali jobs must be an array');
  if (!jobs.length) throw new Error('Ali: no usable jobs; zero cannot clear existing data');
  if (availableSource(site)) {
    if (!dense(jobs)) throw new Error('Ali Cloud no usable jobs; zero cannot clear existing data');
    const p = PROFILES.find(p => p.key === site.key), ids = new Set();
    for (const job of jobs) {
      validateCloudJob(job, p);
      if (ids.has(job.id)) throw new Error('Duplicate Ali official id');
      ids.add(job.id);
    }
  }
}
// 常规社招门户的岗位只需官网ID、标题和可由 positionUrl/trackId 还原的官网链接。
function usableJob(job, p) {
  if (!object(job) || !Number.isSafeInteger(job.id) || job.id <= 0 || typeof job.name !== 'string' || !job.name.trim()) return false;
  try { officialURL(job, p); return true; } catch { return false; }
}
function validateEvidence(evidence, jobs, site) {
  if (availableSource(site)) {
    const result = evidence?.version === 3 ? cloudSupplementedResult(evidence, site) : cloudAvailableResult(evidence, site);
    if (!isDeepStrictEqual(jobs, result.jobs)) throw new Error('Ali Cloud jobs/native evidence binding');
    return result;
  }
  if (!verifiedSource(site)) throw new Error('Unverified Ali portal identity/scope/mode');
  return { issues: Array.isArray(evidence?.issues) ? evidence.issues : [] };
}
// Cloud's independently observed 500/1 response metadata is not the seven portals' page contract.
function validateCloudJob(job, p) {
  validateJob(job, p);
  if (['duty', 'requirements'].some(field => Object.hasOwn(job, field) && job[field] !== null && job[field] !== '')) throw new Error('Unverified Ali Cloud additional native JD alias');
  if (['categories', 'workLocations', 'tags'].some(field => job[field] !== null && !dense(job[field]))) throw new Error('Ali Cloud sparse native metadata');
}
function cloudNativePage(page, site, index) {
  if (!availableSource(site)) throw new Error('Unverified Ali Cloud source identity/scope/mode');
  if (!Number.isSafeInteger(index) || index < 1 || index > MAX_PAGES || !keys(page, ['request', 'httpStatus', 'response']) || page.httpStatus !== 200 || !isDeepStrictEqual(page.request, requestBody(site, index))) throw new Error('Ali Cloud native request/status binding');
  return cloudPageResponse(page);
}
function cloudPageResponse(page) {
  if (!keys(page, ['request', 'httpStatus', 'response']) || page.httpStatus !== 200) throw new Error('Ali Cloud native request/status binding');
  const json = page.response;
  if (!keys(json, ['content', 'errorCode', 'errorMsg', 'success']) || json.success !== true || ['errorCode', 'errorMsg'].some(field => json[field] !== null && json[field] !== '')) throw new Error('Ali Cloud native business refusal/unknown response');
  const c = json.content;
  if (!keys(c, ['currentPage', 'datas', 'pageSize', 'totalCount']) || !dense(c.datas) || c.datas.length > PAGE_SIZE || !Number.isSafeInteger(c.totalCount) || c.totalCount < 0 || c.pageSize !== 500 || c.currentPage !== 1) throw new Error('Ali Cloud native Count/page metadata changed');
  return c;
}
function cloudAvailableResult(evidence, site) {
  if (!availableSource(site) || !keys(evidence, ['version', 'policy', 'key', 'api', 'pages', 'issues', 'stopped']) || evidence.version !== 2 || evidence.policy !== 'available' || evidence.key !== site.key || evidence.api !== site.api) throw new Error('Ali Cloud available evidence source binding');
  if (!dense(evidence.pages) || !evidence.pages.length || evidence.pages.length > MAX_PAGES || !dense(evidence.issues) || evidence.issues.some(issue => typeof issue !== 'string')) throw new Error('Ali Cloud available evidence limits/issues');
  const p = PROFILES.find(p => p.key === site.key), rows = new Map(), totals = new Set(), issues = new Set(evidence.issues);
  let ended = false, duplicates = 0;
  for (const [offset, page] of evidence.pages.entries()) {
    if (ended) throw new Error('Ali Cloud extra request after empty ending');
    const c = cloudNativePage(page, site, offset + 1); totals.add(c.totalCount);
    for (const job of c.datas) {
      try {
        validateCloudJob(job, p);
        if (rows.has(job.id)) duplicates++; else rows.set(job.id, job);
      } catch (error) { issues.add('列表记录未应用（id=' + (Number.isSafeInteger(job?.id) && job.id > 0 ? job.id : '未知') + '）：' + error.message); }
    }
    ended = c.datas.length === 0;
    if (ended && rows.size < c.totalCount) issues.add('第' + (offset + 1) + '页提前空，不能证明官网零岗或下架，覆盖待补');
    else if (!ended && c.datas.length < PAGE_SIZE) issues.add('第' + (offset + 1) + '页短页，继续至空页或安全上限，覆盖待核验');
  }
  if (evidence.stopped !== null) {
    const s = evidence.stopped, next = evidence.pages.length + 1;
    if (ended || next > MAX_PAGES || !keys(s, ['error', 'request', 'httpStatus', 'response']) || !isDeepStrictEqual(s.request, requestBody(site, next)) || typeof s.error !== 'string' || !s.error.trim() || !(s.httpStatus === null || Number.isSafeInteger(s.httpStatus) && s.httpStatus >= 100 && s.httpStatus <= 599)) throw new Error('Ali Cloud stopped request binding');
    const { error, ...attempt } = s;
    let failed = false; try { cloudNativePage(attempt, site, next); } catch { failed = true; }
    if (!failed) throw new Error('Ali Cloud successful page cannot be disguised as a stopped request');
    issues.add('请求停止：' + error);
  }
  if (!rows.size) throw new Error('Ali Cloud no usable records; zero cannot clear existing data');
  if (duplicates) issues.add('重复官方id ' + duplicates + ' 次，保留首次取得的顺序/正文');
  if (totals.size !== 1 || !totals.has(rows.size)) issues.add('官方total ' + [...totals].join('→') + '；实际唯一岗位 ' + rows.size);
  if (!ended) issues.add('分页未穷尽，覆盖待补');
  if (!ended && evidence.pages.length === MAX_PAGES) issues.add('达到分页安全上限，覆盖待补');
  issues.add('已收录列表JD，详情正文完整性待核验');
  const jobs = [...rows.values()]; validateJobs(jobs, site);
  return { complete: false, total: jobs.length, jobs, verification: evidence, issues: [...issues] };
}
function collectCloudAvailable(pages, site, { issues = [], stopped = null } = {}) {
  return freeze(cloudAvailableResult(structuredClone({ version: 2, policy: 'available', key: site?.key, api: site?.api, pages, issues, stopped }), site));
}
// This fingerprint binds the independently observed Cloud tree, not a generic category dictionary.
// Include code/name and original root/child order; every remaining native field below must be null.
const CLOUD_CATEGORY_TREE = 'e59a8ae850d62cfd250fe3bf8bb6ad05850c9a4cb5f973cffbc13c50490b2ade';
function cloudCategoryRequest(site) {
  if (!availableSource(site)) throw new Error('Unverified Ali Cloud source identity/scope/mode');
  return { url: site.apiOrigin + '/category/list', method: 'POST', body: { channel: 'group_official_site', language: 'zh' } };
}
function cloudCategoryData(raw, site) {
  if (!keys(raw, ['request', 'httpStatus', 'response']) || !isDeepStrictEqual(raw.request, cloudCategoryRequest(site)) || raw.httpStatus !== 200) throw new Error('Ali Cloud category request/status binding');
  const json = raw.response;
  if (!keys(json, ['content', 'errorCode', 'errorMsg', 'success']) || json.success !== true || ['errorCode', 'errorMsg'].some(field => json[field] !== null && json[field] !== '')) throw new Error('Ali Cloud category business refusal/unknown response');
  const tree = json.content, codes = new Set();
  if (!dense(tree) || tree.length !== 9) throw new Error('Ali Cloud category nine-root tree changed');
  function node(n, root) {
    if (!keys(n, ['parentId', 'id', 'name', 'code', 'batchId', 'type', 'categories']) || ['parentId', 'id', 'batchId', 'type'].some(f => n[f] !== null) || typeof n.name !== 'string' || !n.name.trim() || typeof n.code !== 'string' || !/^[1-9]\d*$/.test(n.code) || !Number.isSafeInteger(Number(n.code)) || codes.has(n.code) || (root ? !dense(n.categories) || !n.categories.length : n.categories !== null)) throw new Error('Ali Cloud category native fields/code/duplicate changed');
    codes.add(n.code);
  }
  for (const root of tree) { node(root, true); for (const child of root.categories) node(child, false); }
  const projection = JSON.stringify(tree.map(root => [root.code, root.name, root.categories.map(child => [child.code, child.name])]));
  if (codes.size !== 110 || createHash('sha256').update(projection).digest('hex') !== CLOUD_CATEGORY_TREE) throw new Error('Ali Cloud unobserved category tree/value/order');
  return tree;
}
const CLOUD_HOT_REGIONS = [['330100', '杭州'], ['110100', '北京'], ['310100', '上海'], ['440100', '广州'], ['440300', '深圳'], ['510100', '成都'], ['500100', '重庆'], ['320100', '南京'], ['420100', '武汉'], ['HKG', '中国香港']];
const CLOUD_MENU_KEYWORDS = ['瓴羊', '诚云科技'];
function cloudRegionRequest(site) { return { url: site.apiOrigin + '/region/hot', method: 'POST', body: { channel: 'group_official_site', language: 'zh' } }; }
function cloudRegionData(raw, site) {
  if (!keys(raw, ['request', 'httpStatus', 'response']) || !isDeepStrictEqual(raw.request, cloudRegionRequest(site)) || raw.httpStatus !== 200) throw new Error('Ali Cloud region request/status binding');
  const json = raw.response;
  if (!keys(json, ['content', 'errorCode', 'errorMsg', 'success']) || json.success !== true || ['errorCode', 'errorMsg'].some(field => json[field] !== null && json[field] !== '')) throw new Error('Ali Cloud region business refusal/unknown response');
  if (!dense(json.content) || json.content.some(region => !keys(region, ['code', 'name'])) || !isDeepStrictEqual(json.content.map(region => [region.code, region.name]), CLOUD_HOT_REGIONS)) throw new Error('Ali Cloud unobserved hot-region code/name/order');
  return json.content;
}
function cloudRegionSearchRequest(site) { return { url: site.apiOrigin + '/region/search', method: 'POST', body: { channel: 'aliyun_group_official_site', language: 'zh', key: '西安' } }; }
function cloudRegionSearchData(raw, site) {
  if (!keys(raw, ['request', 'httpStatus', 'response']) || !isDeepStrictEqual(raw.request, cloudRegionSearchRequest(site)) || raw.httpStatus !== 200) throw new Error('Ali Cloud More-search request/status binding');
  const json = raw.response;
  if (!keys(json, ['content', 'errorCode', 'errorMsg', 'success']) || json.success !== true || ['errorCode', 'errorMsg'].some(field => json[field] !== null && json[field] !== '')) throw new Error('Ali Cloud More-search business refusal/unknown response');
  // One independently observed public More option. No hot-channel inheritance or arbitrary code authorization.
  if (!dense(json.content) || json.content.length !== 1 || !keys(json.content[0], ['code', 'name']) || json.content[0].code !== '610100' || json.content[0].name !== '西安') throw new Error('Ali Cloud unobserved More-search option/code/name');
  return json.content;
}
function cloudFilter(selection, roots, regions) {
  if (keys(selection, ['categoryCode']) && roots.has(selection.categoryCode)) {
    const root = roots.get(selection.categoryCode);
    return { id: 'category:' + root.code, label: '类别' + root.code, body: { categories: root.code, subCategories: root.categories.map(child => child.code).join(',') } };
  }
  if (keys(selection, ['regionCode']) && regions.has(selection.regionCode)) return { id: 'region:' + selection.regionCode, label: '地点' + selection.regionCode, body: { regions: selection.regionCode } };
  if (keys(selection, ['keyword']) && CLOUD_MENU_KEYWORDS.includes(selection.keyword)) return { id: 'keyword:' + selection.keyword, label: '官网关联词' + selection.keyword, body: { key: selection.keyword } };
  throw new Error('Ali Cloud unobserved filtered root/region/menu keyword');
}
function cloudFilterBody(site, filter, index) { return { ...requestBody(site, index), ...filter.body }; }
function cloudFilteredPage(raw, site, filter, index) {
  if (!Number.isSafeInteger(index) || index < 1 || index > MAX_PAGES || !object(raw) || !isDeepStrictEqual(raw.request, cloudFilterBody(site, filter, index))) throw new Error('Ali Cloud filtered request/body/page binding');
  return cloudPageResponse(raw);
}
function cloudSupplementedResult(evidence, site) {
  const fields = ['version', 'policy', 'key', 'api', 'base', 'baseCompletedAt', 'categoryEvidence', 'scans', 'issues', 'stopped'];
  if (object(evidence)) for (const field of ['regionEvidence', 'regionSearchEvidence']) if (Object.hasOwn(evidence, field)) fields.push(field);
  if (!availableSource(site) || !keys(evidence, fields) || evidence.version !== 3 || evidence.policy !== 'available' || evidence.key !== site.key || evidence.api !== site.api) throw new Error('Ali Cloud supplemented evidence source binding');
  const stamp = evidence.baseCompletedAt;
  if (typeof stamp !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(stamp) || !Number.isFinite(Date.parse(stamp)) || new Date(stamp).toISOString() !== stamp) throw new Error('Ali Cloud base completion time');
  const base = cloudAvailableResult(evidence.base, site); // v2 only: never recursively promote v3 or erase an old stopped receipt.
  const regionEvidence = Object.hasOwn(evidence, 'regionEvidence') ? evidence.regionEvidence : [];
  const searchEvidence = Object.hasOwn(evidence, 'regionSearchEvidence') ? evidence.regionSearchEvidence : [];
  if (![evidence.categoryEvidence, regionEvidence, searchEvidence].every(v => dense(v) && v.length <= 2) || !dense(evidence.scans) || !evidence.scans.length || evidence.scans.length > 22 || !dense(evidence.issues) || evidence.issues.some(issue => typeof issue !== 'string')) throw new Error('Ali Cloud supplemented evidence limits/issues');
  const trees = evidence.categoryEvidence.map(raw => cloudCategoryData(raw, site)), hot = regionEvidence.map(raw => cloudRegionData(raw, site)), more = searchEvidence.map(raw => cloudRegionSearchData(raw, site));
  if ([trees, hot, more].some(pair => pair.length === 2 && !isDeepStrictEqual(pair[0], pair[1]))) throw new Error('Ali Cloud dictionary before/after drift');
  const roots = new Map((trees[0] ?? []).map(root => [root.code, root])), regions = new Map([...(hot[0] ?? []), ...(more[0] ?? [])].map(region => [region.code, region]));
  const states = new Map(), filtered = new Map(), p = PROFILES.find(p => p.key === site.key), issues = new Set(evidence.issues);
  base.issues.forEach(issue => issues.add('基础列表：' + issue));
  let spent = 0, duplicates = 0;
  for (const scan of evidence.scans) {
    if (!object(scan) || !Object.hasOwn(scan, 'pages') || !dense(scan.pages) || !scan.pages.length || scan.pages.length > MAX_PAGES || (spent += scan.pages.length) > MAX_PAGES) throw new Error('Ali Cloud filtered scans/limits binding');
    const { pages, ...selection } = scan, filter = cloudFilter(selection, roots, regions);
    if (states.has(filter.id)) throw new Error('Ali Cloud duplicate filtered scan binding');
    const state = { ids: new Set(), totals: new Set(), ended: false, pages: pages.length }; states.set(filter.id, state);
    for (const [offset, raw] of pages.entries()) {
      if (state.ended) throw new Error('Ali Cloud filtered extra request after empty ending');
      const c = cloudFilteredPage(raw, site, filter, offset + 1); state.totals.add(c.totalCount);
      for (const job of c.datas) {
        try {
          validateCloudJob(job, p); state.ids.add(job.id);
          if (filtered.has(job.id)) duplicates++; else filtered.set(job.id, job);
        } catch (error) { issues.add(filter.label + '列表记录未应用（id=' + (Number.isSafeInteger(job?.id) && job.id > 0 ? job.id : '未知') + '）：' + error.message); }
      }
      state.ended = c.datas.length === 0;
      if (state.ended && state.ids.size < c.totalCount) issues.add(filter.label + '第' + (offset + 1) + '页提前空，覆盖待补');
      else if (!state.ended && c.datas.length < PAGE_SIZE) issues.add(filter.label + '第' + (offset + 1) + '页短页，覆盖待核验');
    }
    issues.add(filter.label + '：官方total ' + [...state.totals].join('→') + '；实际唯一岗位 ' + state.ids.size);
    if (!state.ended) issues.add(filter.label + '分页未穷尽，覆盖待补');
  }
  if (evidence.stopped !== null) {
    const s = evidence.stopped;
    if (!keys(s, ['request', 'httpStatus', 'response', 'error']) || typeof s.error !== 'string' || !s.error.trim() || !(s.httpStatus === null || Number.isSafeInteger(s.httpStatus) && s.httpStatus >= 100 && s.httpStatus <= 599)) throw new Error('Ali Cloud supplemented stopped request binding');
    const { error, ...attempt } = s; let failed = false;
    if (keys(s.request, ['url', 'method', 'body'])) {
      if (trees.length === 1 && isDeepStrictEqual(s.request, cloudCategoryRequest(site))) { try { cloudCategoryData(attempt, site); } catch { failed = true; } }
      else if (hot.length === 1 && isDeepStrictEqual(s.request, cloudRegionRequest(site))) { try { cloudRegionData(attempt, site); } catch { failed = true; } }
      else if (more.length === 1 && isDeepStrictEqual(s.request, cloudRegionSearchRequest(site))) { try { cloudRegionSearchData(attempt, site); } catch { failed = true; } }
      else throw new Error('Ali Cloud dictionary stopped request binding');
    } else {
      const body = s.request, selection = body?.categories ? { categoryCode: body.categories } : body?.regions ? { regionCode: body.regions } : { keyword: body?.key };
      let filter; try { filter = cloudFilter(selection, roots, regions); } catch { throw new Error('Ali Cloud filtered stopped request binding'); }
      const state = states.get(filter.id), next = (state?.pages ?? 0) + 1;
      if (spent >= MAX_PAGES || state?.ended || !isDeepStrictEqual(body, cloudFilterBody(site, filter, next))) throw new Error('Ali Cloud filtered stopped request binding');
      try { cloudFilteredPage(attempt, site, filter, next); } catch { failed = true; }
    }
    if (!failed) throw new Error('Ali Cloud successful page/dictionary cannot be disguised as a stopped request');
    issues.add('新请求停止：' + error);
  }
  if (trees.length === 1) issues.add('未取得类别字典末检，覆盖待核验');
  if (hot.length === 1) issues.add('未取得热点字典末检，覆盖待核验');
  if (hot.length) issues.add('热点仅为已证子范围，不代表所有城市、海外或无地点全集');
  if (more.length) issues.add('More仅绑定官网搜索西安返回选项，不代表完整地点字典');
  if (spent === MAX_PAGES) issues.add('达到补充分页安全上限，覆盖待补');
  const missing = [...roots.keys()].filter(code => !states.has('category:' + code));
  if (missing.length) issues.add('尚未取得根类别 ' + missing.join('/'));
  if (duplicates) issues.add('过滤列表重复官方id ' + duplicates + ' 次，保留过滤首次取得的顺序/正文');
  // Explicit supplement is new-only: preserve every base byte, including native tracking URLs/metadata.
  const rows = new Map(base.jobs.map(job => [job.id, job]));
  let overlap = 0; for (const [id, job] of filtered) { if (rows.has(id)) overlap++; else rows.set(id, job); }
  issues.add('基础唯一岗位 ' + base.total + '；过滤唯一岗位 ' + filtered.size + '；基础重叠 ' + overlap + '；补充后唯一岗位 ' + rows.size);
  const nativeTotals = [...new Set(evidence.base.pages.map(page => page.response.content.totalCount))];
  issues.add('基础广列表官方total ' + nativeTotals.join('→') + '；补充后实际唯一岗位 ' + rows.size);
  issues.add('筛选片并集不证明默认广范围穷尽；完整性未验证');
  const jobs = [...rows.values()]; validateJobs(jobs, site);
  return { complete: false, total: jobs.length, jobs, verification: evidence, issues: [...issues] };
}
function collectCloudSupplemented(baseV2Verification, site, { baseCompletedAt, categoryEvidence = [], regionEvidence, regionSearchEvidence, scans, issues = [], stopped = null } = {}) {
  return freeze(cloudSupplementedResult(structuredClone({ version: 3, policy: 'available', key: site?.key, api: site?.api, base: baseV2Verification, baseCompletedAt, categoryEvidence, ...(regionEvidence === undefined ? {} : { regionEvidence }), ...(regionSearchEvidence === undefined ? {} : { regionSearchEvidence }), scans, issues, stopped }), site));
}
async function fetchCloudAvailable(site, options = {}) {
  if (!availableSource(site)) throw new Error('Unverified Ali Cloud source identity/scope/mode');
  const p = PROFILES.find(p => p.key === site.key);
  const { fetchImpl = globalThis.fetch, sleep = ms => new Promise(resolve => setTimeout(resolve, ms)), now = Date.now, delayMs = 200, timeoutMs = 15000, maxPages = MAX_PAGES } = options;
  if (typeof fetchImpl !== 'function' || typeof sleep !== 'function' || typeof now !== 'function' || !Number.isFinite(delayMs) || delayMs < 0 || !Number.isSafeInteger(timeoutMs) || timeoutMs <= 0 || !Number.isSafeInteger(maxPages) || maxPages < 1 || maxPages > MAX_PAGES) throw new Error('Invalid Ali Cloud request limits');
  const deadline = now() + 900000, cookies = new Map(), sessionValues = new Set(), pages = [], issues = []; let lastStart = null, stopped = null, csrf;
  const rememberSessions = () => { for (const c of cookies.values()) if (c.value && /session|csrf|xsrf|token/i.test(c.name)) sessionValues.add(c.value); };
  function cookieHeader(url, current) {
    const u = new URL(url);
    return [...cookies.values()].filter(c => c.expires > current && (!c.secure || u.protocol === 'https:') && (u.pathname === c.path || u.pathname.startsWith(c.path.endsWith('/') ? c.path : c.path + '/'))).map(c => c.name + '=' + c.value).join('; ');
  }
  function acceptCookies(response, url) {
    const u = new URL(url);
    for (const raw of response.headers?.getSetCookie?.() ?? []) {
      const [pair, ...attributes] = raw.split(';'), at = pair.indexOf('=');
      if (at < 1) continue;
      const name = pair.slice(0, at).trim(), value = pair.slice(at + 1).trim();
      const attrs = Object.fromEntries(attributes.map(a => { const [k, ...v] = a.trim().split('='); return [k.toLowerCase(), v.join('=')]; }));
      const domain = attrs.domain?.toLowerCase().replace(/^\./, '');
      if (domain && u.hostname !== domain && !u.hostname.endsWith('.' + domain)) continue;
      const path = attrs.path?.startsWith('/') ? attrs.path : u.pathname.slice(0, u.pathname.lastIndexOf('/')) || '/';
      const expires = attrs['max-age'] !== undefined ? now() + Number(attrs['max-age']) * 1000 : attrs.expires ? Date.parse(attrs.expires) : Infinity;
      cookies.set(name + ':' + path, { name, value, path, expires, secure: Object.hasOwn(attrs, 'secure') });
    }
  }
  async function request(url, body, attempt) {
    // Recheck after each wake: an early sleep or a moved clock must not start a request too soon/late.
    for (;;) {
      const current = now(), wait = lastStart === null ? 0 : Math.max(0, Math.max(200, delayMs) - (current - lastStart));
      if (current + wait >= deadline) throw new Error('Ali Cloud process safety deadline');
      if (!wait) { lastStart = current; break; }
      await sleep(wait);
    }
    const headers = body ? { 'Content-Type': 'application/json', Origin: p.origin, Referer: p.url } : {}, cookie = cookieHeader(url, lastStart);
    if (cookie) headers.Cookie = cookie;
    const controller = new AbortController(); let timer;
    const expiry = new Promise((_, reject) => { timer = setTimeout(() => { controller.abort(); reject(new Error('Ali Cloud request/body timeout')); }, Math.min(15000, timeoutMs, Math.ceil(deadline - lastStart))); });
    try {
      return await Promise.race([expiry, (async () => {
        rememberSessions(); // A response may replace a cookie while echoing its just-sent value.
        const r = await fetchImpl(url, { method: body ? 'POST' : 'GET', headers, ...(body ? { body: JSON.stringify(body) } : {}), redirect: 'manual', signal: controller.signal });
        acceptCookies(r, url); rememberSessions(); // Sensitive history stays only in memory.
        if (!body) return { status: r.status, location: r.headers?.get('location'), html: await r.text() };
        attempt.httpStatus = r?.status ?? null;
        try { attempt.response = await r.json(); } catch { throw new Error('Ali Cloud list response unreadable'); }
        // Transport errors and server echoes may contain the live _csrf URL; never serialize them.
        const serialized = JSON.stringify(attempt.response);
        if (typeof serialized !== 'string' || serialized.includes(csrf) || [...sessionValues].some(value => serialized.includes(value))) { attempt.response = null; throw new Error('Ali Cloud session material/unreadable response'); }
        return cloudNativePage(attempt, site, body.pageIndex);
      })()]);
    } finally { clearTimeout(timer); }
  }
  let bootstrap = await request(p.url);
  if (bootstrap.status === 302) {
    // Separately witnessed Cloud redirect. This does not grant another core portal redirects.
    const canonical = new URL(p.url); canonical.searchParams.delete('lang');
    if (!bootstrap.location || new URL(bootstrap.location, p.url).href !== canonical.href) throw new Error('Ali Cloud unverified bootstrap redirect');
    bootstrap = await request(canonical.href);
  }
  if (bootstrap.status !== 200) throw new Error('Ali Cloud bootstrap HTTP ' + bootstrap.status);
  csrf = bootstrap.html.match(/window\.__sysconfig\s*=\s*\{[\s\S]*?["']?__token__["']?\s*:\s*["']([^"']+)["']/)?.[1];
  if (!csrf || csrf === '[REDACTED]' || /[\u0000-\u0020]/.test(csrf)) throw new Error('Ali Cloud normal anonymous CSRF absent');
  const api = new URL(p.api); api.searchParams.set('_csrf', csrf);
  for (let pageIndex = 1; pageIndex <= maxPages; pageIndex++) {
    const wait = Math.max(0, Math.max(200, delayMs) - (now() - lastStart));
    if (now() + wait >= deadline) { issues.push('达到进程安全时限，覆盖待补'); break; }
    const attempt = { request: requestBody(p, pageIndex), httpStatus: null, response: null };
    try {
      const c = await request(api.href, attempt.request, attempt); pages.push(attempt);
      if (!c.datas.length) break;
      if (pageIndex === maxPages) issues.push('达到分页安全上限，覆盖待补');
    } catch {
      if (!pages.length) throw new Error('Ali Cloud list request failed');
      stopped = { ...attempt, error: '请求失败，已停止后续请求' }; break;
    }
  }
  return collectCloudAvailable(pages, site, { issues, stopped });
}
function normalizeRecord(job, site) {
  const cloud = availableSource(site);
  if (!verifiedSource(site) && !cloud) throw new Error('Unverified Ali portal identity/scope/mode');
  const p = PROFILES.find(p => p.key === site.key);
  if (cloud) validateCloudJob(job, p); else if (!usableJob(job, p)) throw new Error('Ali: missing official id/title/url');
  const text = value => cloud ? value ?? '' : (typeof value === 'string' ? value : '').replace(/\r\n?/g, '\n').trim();
  // Proven renderer uses browser-local Date getters, not a source-canonical calendar.
  // Keep both native timestamps in evidence; neither supplies a canonical public date.
  return { id: String(job.id), title: job.name, city: (Array.isArray(job.workLocations) ? job.workLocations : []).join('/'), category: (Array.isArray(job.categories) ? job.categories : []).join('/'), channels: ['social'], employment: null, talentPlan: null, date: null, dateKind: null, sourceStatus: null, url: officialURL(job, p), duty: text(job.description), requirements: text(job.requirement), description: '', jdComplete: !cloud };
}
async function run(site, options = {}) {
  if (availableSource(site)) return fetchCloudAvailable(site, options);
  if (!verifiedSource(site)) throw new Error('Unverified Ali portal identity/scope/mode');
  const p = PROFILES.find(p => p.key === site.key);
  const { fetchImpl = globalThis.fetch, sleep = ms => new Promise(resolve => setTimeout(resolve, ms)), delayMs = 200, timeoutMs = 15000, maxPages = LIST_PAGES } = options;
  if (typeof fetchImpl !== 'function' || typeof sleep !== 'function' || !Number.isFinite(delayMs) || delayMs < 0 || !Number.isSafeInteger(timeoutMs) || timeoutMs <= 0 || !Number.isSafeInteger(maxPages) || maxPages < 2 || maxPages > LIST_PAGES) throw new Error('Invalid Ali request limits');
  const cookies = new Map();
  let requested = false;
  function cookieHeader(url) {
    const u = new URL(url);
    return [...cookies.values()].filter(c => c.expires > Date.now() && (!c.secure || u.protocol === 'https:') && (u.pathname === c.path || u.pathname.startsWith(c.path.endsWith('/') ? c.path : c.path + '/'))).map(c => c.name + '=' + c.value).join('; ');
  }
  function acceptCookies(response, url) {
    const u = new URL(url);
    for (const raw of response.headers?.getSetCookie?.() ?? []) {
      const [pair, ...attributes] = raw.split(';'), at = pair.indexOf('=');
      if (at < 1) continue;
      const name = pair.slice(0, at).trim(), value = pair.slice(at + 1).trim();
      const attrs = Object.fromEntries(attributes.map(a => { const [k, ...v] = a.trim().split('='); return [k.toLowerCase(), v.join('=')]; }));
      const domain = attrs.domain?.toLowerCase().replace(/^\./, '');
      if (domain && u.hostname !== domain && !u.hostname.endsWith('.' + domain)) continue;
      const path = attrs.path?.startsWith('/') ? attrs.path : u.pathname.slice(0, u.pathname.lastIndexOf('/')) || '/';
      const expires = attrs['max-age'] !== undefined ? Date.now() + Number(attrs['max-age']) * 1000 : attrs.expires ? Date.parse(attrs.expires) : Infinity;
      cookies.set(name + ':' + path, { name, value, path, expires, secure: Object.hasOwn(attrs, 'secure') });
    }
  }
  async function request(url, body, csrf) {
    if (requested) await sleep(Math.max(200, delayMs));
    requested = true;
    const headers = body ? { 'Content-Type': 'application/json', Origin: p.origin, Referer: p.url, ...(p.csrfMode === 'cookie' ? { 'X-XSRF-TOKEN': csrf } : {}) } : {};
    const cookie = cookieHeader(url);
    if (cookie) headers.Cookie = cookie;
    const r = await fetchImpl(url, { method: body ? 'POST' : 'GET', headers, ...(body ? { body: JSON.stringify(body) } : {}), redirect: 'manual', signal: AbortSignal.timeout(Math.min(15000, timeoutMs)) });
    acceptCookies(r, url);
    return r;
  }
  let bootstrap = await request(p.url);
  if (bootstrap.status === 302 && p.languageRedirect) {
    const canonical = new URL(p.url); canonical.searchParams.delete('lang');
    const target = new URL(bootstrap.headers?.get('location') || '', p.url);
    if (!bootstrap.headers?.get('location') || target.href !== canonical.href) throw new Error('Ali unverified bootstrap redirect');
    await bootstrap.text();
    bootstrap = await request(target.href);
  }
  if (bootstrap.status !== 200) throw new Error('Ali bootstrap HTTP ' + bootstrap.status);
  const html = await bootstrap.text();
  let csrf;
  if (p.csrfMode === 'bootstrap') csrf = html.match(/window\.__sysconfig\s*=\s*\{[\s\S]*?\b__token__\s*:\s*["']([^"']+)["']/)?.[1];
  else csrf = cookieHeader(p.api).split('; ').find(pair => pair.startsWith('XSRF-TOKEN='))?.slice('XSRF-TOKEN='.length);
  if (!csrf || csrf === '[REDACTED]') throw new Error('Ali normal anonymous CSRF absent');
  const api = new URL(p.api); api.searchParams.set('_csrf', csrf);
  // 单轮扫描：中途失败保留已得岗位，total 不符/坏记录只记 issues。
  const issues = [];
  const { rows: byId, pages } = await paginate(async pageIndex => {
    const response = await request(api.href, requestBody(p, pageIndex), csrf);
    if (response.status !== 200) throw new Error('Ali list HTTP ' + response.status);
    const json = await response.json(), content = json?.content;
    if (json?.success !== true || !Array.isArray(content?.datas)) throw new Error('Ali native business refusal on page ' + pageIndex);
    return { rows: content.datas, total: content.totalCount };
  }, { maxPages, idOf: job => job.id, usable: job => usableJob(job, p), issues });
  const jobs = [...byId.values()];
  if (!jobs.length) throw new Error('Ali: no usable records; zero cannot clear existing data');
  return { total: jobs.length, jobs, issues, verification: { key: p.key, api: p.api, pages, issues } };
}
function fetchAllFor(host, options) {
  const p = PROFILES.find(p => new URL(p.origin).hostname === host);
  if (!p) throw new Error('Unknown Ali portal host');
  return run(siteFor(p), options);
}
module.exports = { PROFILES, requiresVerification, verifiedSource, availableSource, portalNotice, PORTAL_NOTICE, requestBody, cloudNativePage, collectCloudAvailable, collectCloudSupplemented, fetchCloudAvailable, validateJobs, normalizeRecord, validateEvidence, fetchAllFor, run };
if (require.main === module) {
  (async () => {
    const [siteJSON, rawFile] = process.argv.slice(2);
    if (!siteJSON || !rawFile) throw new Error('Usage: node ali_social_common.js <siteJSON> <rawFile>');
    const result = await run(JSON.parse(siteJSON)), temp = rawFile + '.tmp-' + process.pid;
    try { fs.writeFileSync(temp, JSON.stringify(result, null, 2) + '\n', { encoding: 'utf8', flag: 'wx' }); fs.renameSync(temp, rawFile); }
    finally { if (fs.existsSync(temp)) fs.unlinkSync(temp); }
    console.log('DONE fetched=' + result.total);
  })().catch(error => { console.error('ERR ' + error.message); process.exitCode = 1; });
}
