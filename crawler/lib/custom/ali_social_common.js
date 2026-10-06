// Independently reviewed Chinese social portals; no city shards or inherited cloud qualification.
'use strict';
const fs = require('node:fs');
const { isDeepStrictEqual } = require('node:util');
const PAGE_SIZE = 10, MAX_PAGES = 200, ADAPTER = 'ali-social-portal-v1';
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
function verifiedSource(site) {
  const p = PROFILES.find(p => p.key === site?.key);
  return !!p && QUALIFIED_KEYS.has(p.key) && isDeepStrictEqual(site, siteFor(p));
}
function portalNotice(site) {
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
function officialURL(job, profile) {
  if (typeof job.positionUrl !== 'string' || !job.positionUrl || /[\u0000-\u0020\\#]/.test(job.positionUrl) || typeof job.trackId !== 'string' || !job.trackId.trim()) throw new Error('Invalid Ali native URL/tracking');
  let url;
  try { url = new URL(job.positionUrl, profile.origin); } catch { throw new Error('Invalid Ali native URL'); }
  const keys = [...url.searchParams.keys()];
  if (url.origin !== profile.origin || url.username || url.password || url.hash || url.pathname !== '/off-campus/position-detail' || keys.length !== 2 || !keys.includes('positionId') || !keys.includes('track_id') || url.searchParams.get('positionId') !== String(job.id) || url.searchParams.get('track_id') !== job.trackId) throw new Error('Ali official URL/identity/tracking mismatch');
  return url.href;
}
function validateJob(job, p) {
  if (!object(job) || [...NATIVE_FIELDS].some(field => !Object.hasOwn(job, field)) || !Number.isSafeInteger(job.id) || job.id <= 0 || typeof job.name !== 'string' || !job.name.trim()) throw new Error('Ali native identity/title or own fields changed');
  if (['description', 'requirement', 'degree'].some(field => !textOrNull(job[field])) || ['categories', 'workLocations'].some(field => !stringsOrNull(job[field])) || NULL_FIELDS.some(field => job[field] !== null)) throw new Error('Ali native text/metadata shape changed or unverified nonnull facts');
  if (['publishTime', 'modifyTime'].some(field => job[field] !== null && (!Number.isSafeInteger(job[field]) || job[field] < 0 || !Number.isFinite(new Date(job[field]).getTime())))) throw new Error('Ali native date shape changed');
  if (typeof job.bucket !== 'string' || typeof job.code !== 'string' || ['isTongyi', 'tongyi'].some(field => typeof job[field] !== 'boolean') || !Array.isArray(job.operations) || job.operations.length || ['regionEnNameMap', 'technologyNameIdMap'].some(field => !object(job[field]) || Object.keys(job[field]).length)) throw new Error('Ali native metadata shape changed');
  if (job.experience !== null && (!object(job.experience) || !isDeepStrictEqual(Object.keys(job.experience).sort(), ['from', 'to']) || ['from', 'to'].some(field => job.experience[field] !== null && (!Number.isSafeInteger(job.experience[field]) || job.experience[field] < 0)))) throw new Error('Ali native experience shape changed');
  if (Object.keys(job).some(field => !NATIVE_FIELDS.has(field) && !ALIASES.has(field) && job[field] !== null && job[field] !== '')) throw new Error('Unverified Ali additional native JD/field');
  officialURL(job, p);
}
function validateJobs(jobs, site) {
  if (!verifiedSource(site)) throw new Error('Unverified Ali portal identity/scope/mode');
  if (!Array.isArray(jobs)) throw new Error('Ali jobs must be an array');
  const p = PROFILES.find(p => p.key === site.key), ids = new Set();
  for (const job of jobs) {
    validateJob(job, p);
    if (ids.has(job.id)) throw new Error('Duplicate Ali official id');
    ids.add(job.id);
  }
}
function nativePage(page, p, index) {
  if (!object(page) || page.httpStatus !== 200 || !isDeepStrictEqual(page.request, requestBody(p, index))) throw new Error('Ali native request/status evidence changed');
  const json = page.response;
  if (!object(json) || !isDeepStrictEqual(Object.keys(json).sort(), ['content', 'errorCode', 'errorMsg', 'success']) || json.success !== true || !object(json.content) || ['errorCode', 'errorMsg'].some(field => json[field] !== null && json[field] !== '')) throw new Error('Ali native business refusal/unknown response');
  const c = json.content;
  if (!isDeepStrictEqual(Object.keys(c).sort(), ['currentPage', 'datas', 'pageSize', 'totalCount']) || !Array.isArray(c.datas) || !Number.isSafeInteger(c.totalCount) || c.totalCount < 0 || c.pageSize !== PAGE_SIZE || c.currentPage !== index) throw new Error('Ali native Count/page metadata changed');
  return c;
}
function consume(page, p, index, state, maxPages = MAX_PAGES) {
  const c = nativePage(page, p, index);
  if (state.total === undefined) {
    state.total = c.totalCount;
    if (Math.ceil(state.total / PAGE_SIZE) + 1 >= maxPages) throw new Error('Ali pagination safety ceiling reached');
  }
  const endpoint = state.jobs.length === state.total;
  if (endpoint) {
    if (c.datas.length || c.totalCount !== 0 && c.totalCount !== state.total) throw new Error('Ali native endpoint Count/page changed');
  } else if (c.totalCount !== state.total || c.datas.length !== Math.min(PAGE_SIZE, state.total - state.jobs.length)) throw new Error('Ali native Count drift/early empty or short page');
  for (const job of c.datas) {
    validateJob(job, p);
    if (state.ids.has(job.id)) throw new Error('Duplicate Ali official id');
    state.ids.add(job.id); state.jobs.push(job);
  }
  return endpoint;
}
function stableJob(job) {
  const { trackId, ...stable } = job;
  // Preserve the original URL spelling and every remaining byte, not the whole-field omission.
  const [route, query] = job.positionUrl.split('?');
  stable.positionUrl = route + '?' + query.split('&').filter(part => decodeURIComponent(part.split('=')[0]) !== 'track_id').join('&');
  return stable;
}
function validateEvidence(evidence, jobs, site) {
  if (!verifiedSource(site) || !object(evidence) || evidence.version !== 1 || evidence.key !== site.key || evidence.api !== site.api || !Array.isArray(evidence.scans) || evidence.scans.length !== 2) throw new Error('Missing or mismatched Ali native verification evidence');
  validateJobs(jobs, site);
  const p = PROFILES.find(p => p.key === site.key);
  const scans = evidence.scans.map(scan => {
    if (!object(scan) || !Array.isArray(scan.pages) || !scan.pages.length || scan.pages.length >= MAX_PAGES) throw new Error('Invalid Ali native scan evidence');
    const state = { jobs: [], ids: new Set() };
    let ended = false;
    for (const [offset, page] of scan.pages.entries()) {
      if (ended) throw new Error('Ali native evidence has extra pages');
      ended = consume(page, p, offset + 1, state);
    }
    if (!ended || state.jobs.length !== state.total) throw new Error('Incomplete Ali native scan evidence');
    return state;
  });
  const map = rows => new Map(rows.map(job => [job.id, stableJob(job)]));
  if (scans[0].total !== scans[1].total || !isDeepStrictEqual(map(scans[0].jobs), map(scans[1].jobs)) || !isDeepStrictEqual(jobs, scans[0].jobs)) throw new Error('Ali full raw facts changed or snapshot does not match first native scan');
  return true;
}
function normalizeRecord(job, site) {
  if (!verifiedSource(site)) throw new Error('Unverified Ali portal identity/scope/mode');
  const p = PROFILES.find(p => p.key === site.key);
  validateJob(job, p);
  const text = value => (value ?? '').replace(/\r\n?/g, '\n').trim();
  // Proven renderer uses browser-local Date getters, not a source-canonical calendar.
  // Keep both native timestamps in evidence; neither supplies a canonical public date.
  return { id: String(job.id), title: job.name, city: (job.workLocations ?? []).join('/'), category: (job.categories ?? []).join('/'), channels: ['social'], employment: null, talentPlan: null, date: null, dateKind: null, sourceStatus: null, url: officialURL(job, p), duty: text(job.description), requirements: text(job.requirement), description: '', jdComplete: true };
}
async function run(site, options = {}) {
  if (!verifiedSource(site)) throw new Error('Unverified Ali portal identity/scope/mode (cloud coverage remains blocked)');
  const p = PROFILES.find(p => p.key === site.key);
  const { fetchImpl = globalThis.fetch, sleep = ms => new Promise(resolve => setTimeout(resolve, ms)), delayMs = 200, timeoutMs = 15000, maxPages = MAX_PAGES } = options;
  if (typeof fetchImpl !== 'function' || typeof sleep !== 'function' || !Number.isFinite(delayMs) || delayMs < 0 || !Number.isSafeInteger(timeoutMs) || timeoutMs <= 0 || !Number.isSafeInteger(maxPages) || maxPages < 2 || maxPages > MAX_PAGES) throw new Error('Invalid Ali request limits');
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
  const scans = [];
  for (let round = 0; round < 2; round++) {
    const scan = { pages: [] }, state = { jobs: [], ids: new Set() };
    let ended = false;
    for (let pageIndex = 1; pageIndex < maxPages; pageIndex++) {
      const body = requestBody(p, pageIndex), response = await request(api.href, body, csrf);
      if (response.status !== 200) throw new Error('Ali list HTTP ' + response.status);
      const page = { request: body, httpStatus: response.status, response: await response.json() };
      scan.pages.push(page);
      ended = consume(page, p, pageIndex, state, maxPages);
      if (ended) break;
    }
    if (!ended) throw new Error('Ali pagination safety ceiling reached');
    scans.push(scan);
  }
  const jobs = scans[0].pages.flatMap(page => page.response.content.datas);
  const result = { complete: true, total: jobs.length, jobs, verification: { version: 1, key: p.key, api: p.api, scans } };
  validateEvidence(result.verification, jobs, site);
  return result;
}
function fetchAllFor(host, options) {
  const p = PROFILES.find(p => new URL(p.origin).hostname === host);
  if (!p) throw new Error('Unknown Ali portal host');
  return run(siteFor(p), options);
}
module.exports = { PROFILES, requiresVerification, verifiedSource, portalNotice, PORTAL_NOTICE, requestBody, validateJobs, normalizeRecord, validateEvidence, fetchAllFor, run };
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
