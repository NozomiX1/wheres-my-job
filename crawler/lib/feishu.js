'use strict';
// 飞书招聘（字节跳动与各 SaaS 门户）：无头 Chrome 打开官网列表页，取得匿名请求头后在页面内分页请求。
// 宽松策略：单轮；岗位只需官网ID和标题；total 不符、坏记录、中途失败只记 issues，不挡整源。
const fs = require('node:fs');
const { paginate } = require('./paginate');
const { withRetry } = require('./retry');
const os = require('node:os');
const path = require('node:path');
const { spawn } = require('node:child_process');
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const jdText = value => value.replace(/\r\n?/g, '\n').trim();

const CLASSIFIED_NOTICE = '字节社招仅覆盖已核验九类及子类（75个分类ID）；未分类、旧类别和树外岗位未验证，不代表全社招。';
// 已登记的来源：key → 适配器名。其余 key 不运行。
const SOURCES = {
  bytedance: 'bytedance-v1', bytedance_social: 'bytedance-classified-v1',
  minimax: 'feishu-portal-v1', minimax_social: 'feishu-portal-v1', sensetime: 'feishu-portal-v1', sensetime_social: 'feishu-portal-v1',
  lilith: 'feishu-portal-v1', lilith_social: 'feishu-portal-v1', papegames: 'feishu-portal-v1', papegames_social: 'feishu-portal-v1'
};
const requiresVerification = site => Object.hasOwn(SOURCES, site?.key) || site?.ats === 'feishu';
const verifiedSource = site => Object.hasOwn(SOURCES, site?.key) && SOURCES[site.key] === site.adapter && Number.isSafeInteger(site.portalType);
const isPortal = site => site?.adapter === 'feishu-portal-v1';
const isClassified = site => site?.adapter === 'bytedance-classified-v1' && Array.isArray(site.categoryGroups);

function portalNotice(site) {
  if (!verifiedSource(site)) return '';
  if (isClassified(site)) return CLASSIFIED_NOTICE;
  if (site.key === 'lilith') return '莉莉丝校园来源为官网校园及独立实习两门户联合范围，保留官网逐岗渠道/性质。';
  if (site.key === 'lilith_social') return '莉莉丝社招来源为官网career社会招聘及原index活水平台联合范围，同租户同posting ID只保留一条、优先社招入口；非公司全球全集。';
  return '';
}

function requestBody(site, { limit = 50, offset = 0 } = {}) {
  return { keyword: '', limit, offset, job_category_id_list: [], tag_id_list: [], location_code_list: [], subject_id_list: [...(site.subjectIdList || [])], recruitment_id_list: [], portal_type: site.portalType, job_function_id_list: [], storefront_id_list: [], portal_entrance: 1 };
}

// 成功响应的数据部分；HTTP/业务失败抛错，由调用方决定是停止还是保留已得。
function successfulData(response) {
  if (response?.status !== 200) throw new Error('Feishu HTTP failure: ' + response?.status);
  const body = typeof response.body === 'string' ? JSON.parse(response.body) : response.body;
  const data = body?.data;
  if (body?.code !== 0 || !Array.isArray(data?.job_post_list)) throw new Error('Feishu business response was not successful');
  return data;
}
const extractPage = response => { const data = successfulData(response); return { jobs: data.job_post_list, total: data.count }; };
function validateInitialResponses(responses) {
  if (!Array.isArray(responses) || !responses.length) throw new Error('No successful official initial list response');
  for (const response of responses) successfulData(response);
}

const text = value => typeof value === 'string' ? value : '';
const named = value => text(value?.name).trim();
const usable = post => post && typeof post === 'object' && (typeof post.id === 'string' || Number.isSafeInteger(post.id)) && String(post.id).trim() && text(post.title).trim();

function normalizePost(post, site) {
  const id = String(post.id).trim(), duty = jdText(text(post.description)), requirements = jdText(text(post.requirement));
  const cities = Array.isArray(post.city_list) ? post.city_list : post.city_info ? [post.city_info] : [];
  const kind = named(post.recruit_type), parent = named(post.recruit_type?.parent);
  return { id, title: text(post.title).trim(), city: [...new Set(cities.map(named).filter(Boolean))].join('/'), category: named(post.job_category) || named(post.job_function), duty, requirements, description: '',
    channels: ['校招', '校园招聘'].includes(parent) ? ['campus'] : ['社招', '社会招聘'].includes(parent) ? ['social'] : [],
    employment: ['实习', '实习生'].includes(kind) ? 'internship' : ['全职', 'full-time'].includes(kind) ? 'full-time' : null, talentPlan: null, date: null, dateKind: null,
    url: site.linkTemplate.replace('{id}', encodeURIComponent(id)), jdComplete: /[\p{L}\p{N}]/u.test(duty + requirements) };
}

// 联合门户（莉莉丝）：同一岗位在多个门户路径下只保留先列出的那个，URL 按其门户路径生成。
function portalSite(site, portalPath) {
  const origin = new URL(site.url).origin;
  return { ...site, websitePath: portalPath, url: portalPath === site.websitePath ? site.url : origin + '/' + portalPath + '/', linkTemplate: origin + '/' + portalPath + '/position/{id}/detail' };
}
function normalizeRecord(job, site) {
  if (!usable(job.rawPost)) throw new Error('Feishu: missing official id/title');
  return normalizePost(job.rawPost, site.portalPaths ? portalSite(site, job.portalPath || site.portalPaths[0]) : site);
}
function validateJobs(jobs) {
  if (!Array.isArray(jobs) || !jobs.length) throw new Error('Feishu: invalid jobs or effective zero; zero cannot clear existing data');
  return true;
}
function validateEvidence(evidence) {
  return { issues: Array.isArray(evidence?.issues) ? evidence.issues : [] };
}

// 单轮分页：total 只用于判断何时停；后面失败保留已得，坏记录和重复只计数。
async function fetchAll(site, { request, limit = 50, maxPages = 500, delayMs = 150, sleepImpl = sleep, log = () => {} } = {}) {
  const issues = [];
  const { rows, total, pages } = await paginate(async page => {
    if (page > 1) await sleepImpl(delayMs);
    const data = successfulData(await request(requestBody(site, { limit, offset: (page - 1) * limit })));
    log('Feishu: page ' + page);
    return { rows: data.job_post_list.map(rawPost => ({ rawPost })), total: data.count };
  }, { maxPages, idOf: job => String(job.rawPost?.id).trim(), usable: job => usable(job.rawPost), issues });
  if (total >= 10000) issues.push('官方total达到10000上限，覆盖待补');
  return { total: rows.size, jobs: [...rows.values()], issues, pages };
}

async function fetchPortals(site, { collect }) {
  const byId = new Map(), issues = [];
  for (const portalPath of site.portalPaths) {
    const result = await collect(portalSite(site, portalPath));
    issues.push(...result.issues.map(i => portalPath + '：' + i));
    for (const job of result.jobs) { const id = String(job.rawPost.id).trim(); if (!byId.has(id)) byId.set(id, { ...job, portalPath }); }
  }
  return { total: byId.size, jobs: [...byId.values()], issues, pages: 0 };
}

// 字节社招：按登记的分类分组分别分页，合并去重（分组用于避开官网 10000 条上限）。
async function fetchClassified(site, options) {
  const byId = new Map(), issues = [];
  for (const ids of site.categoryGroups) {
    const part = await fetchAll(site, { ...options, request: body => options.request({ ...body, job_category_id_list: [...ids] }) });
    issues.push(...part.issues);
    for (const job of part.jobs) byId.set(String(job.rawPost.id).trim(), job);
  }
  return { total: byId.size, jobs: [...byId.values()], issues, pages: 0 };
}

function envelope(site, result) {
  if (!result.jobs.length) throw new Error('Feishu: no usable records; zero cannot clear existing data');
  return { total: result.jobs.length, jobs: result.jobs, issues: result.issues, verification: { key: site.key, pages: result.pages, issues: result.issues } };
}

class CDP {
  constructor(url) {
    this.seq = 0; this.pending = new Map(); this.handlers = new Map(); this.ws = new WebSocket(url);
    this.ready = new Promise((resolve, reject) => {
      const timer = setTimeout(() => { reject(new Error('Chrome websocket open timeout')); this.ws.close(); }, 15000);
      this.ws.addEventListener('open', () => { clearTimeout(timer); resolve(); }, { once: true });
      this.ws.addEventListener('error', () => { clearTimeout(timer); reject(new Error('Chrome websocket error')); }, { once: true });
    });
    this.ws.addEventListener('message', ({ data }) => {
      const message = JSON.parse(data);
      if (message.id) {
        const p = this.pending.get(message.id); if (!p) return;
        clearTimeout(p.timer); this.pending.delete(message.id);
        message.error ? p.reject(new Error(message.error.message)) : p.resolve(message.result);
      } else for (const f of this.handlers.get(message.method) || []) f(message.params);
    });
    this.ws.addEventListener('close', () => { for (const p of this.pending.values()) { clearTimeout(p.timer); p.reject(new Error('Chrome session closed')); } this.pending.clear(); });
  }
  async call(method, params = {}, timeout = 20000) {
    await this.ready;
    return new Promise((resolve, reject) => {
      const id = ++this.seq, timer = setTimeout(() => { this.pending.delete(id); reject(new Error('Chrome protocol timeout: ' + method)); }, timeout);
      this.pending.set(id, { resolve, reject, timer }); this.ws.send(JSON.stringify({ id, method, params }));
    });
  }
  on(method, f) { this.handlers.set(method, [...(this.handlers.get(method) || []), f]); }
  async evaluate(expression) {
    const r = await this.call('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true }, 25000);
    if (r.exceptionDetails) throw new Error('Official page request failed: ' + r.exceptionDetails.text);
    return r.result.value;
  }
  close() { this.ws.close(); }
}

async function fetchWithChrome(site, options = {}) {
  if (!verifiedSource(site)) throw new Error('Feishu source has not been individually verified');
  const candidates = process.platform === 'darwin' ? ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'] : process.platform === 'win32' ? ['C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'] : ['/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser'];
  const executable = process.env.CHROME_PATH || candidates.find(file => fs.existsSync(file));
  if (!executable) throw new Error('Chrome not found; set CHROME_PATH');
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'ande-feishu-'));
  const chrome = spawn(executable, ['--headless=new', '--remote-debugging-port=0', '--remote-debugging-address=127.0.0.1', '--user-data-dir=' + profile, '--no-first-run', '--no-default-browser-check', '--disable-background-networking', 'about:blank'], { stdio: 'ignore' });
  const origin = new URL(site.url).origin;
  let spawnError, browser, page, headers, activeSite, normalError, capturing = false, interrupted = false;
  const normalRequests = new Map();
  chrome.on('error', error => { spawnError = error; });
  const stop = () => { interrupted = true; page?.close(); };
  process.once('SIGTERM', stop); process.once('SIGINT', stop);
  try {
    let port;
    for (let i = 0; i < 150; i++) {
      if (spawnError) throw new Error('Chrome start failed: ' + spawnError.code);
      if (interrupted || chrome.exitCode !== null) throw new Error('Chrome terminated during startup');
      try { port = fs.readFileSync(path.join(profile, 'DevToolsActivePort'), 'utf8').split('\n')[0]; break; } catch {}
      await sleep(100);
    }
    if (!port) throw new Error('Chrome did not open a debugging port');
    const get = async route => { const r = await fetch('http://127.0.0.1:' + port + route, { signal: AbortSignal.timeout(3000) }); if (!r.ok) throw new Error('Chrome discovery HTTP failure'); return r.json(); };
    browser = new CDP((await get('/json/version')).webSocketDebuggerUrl);
    const target = (await get('/json/list')).find(t => t.type === 'page');
    if (!target) throw new Error('Chrome has no page target');
    page = new CDP(target.webSocketDebuggerUrl);
    for (const method of ['Page.enable', 'Runtime.enable', 'Network.enable']) await page.call(method);
    page.on('Network.requestWillBeSent', p => {
      if (!capturing) return;
      const url = new URL(p.request.url);
      if (url.origin !== origin || url.pathname !== '/api/v1/search/job/posts') return;
      let body; try { body = JSON.parse(p.request.postData); } catch { return; }
      if (body.portal_type !== activeSite.portalType || body.keyword !== '' || ['job_category_id_list', 'subject_id_list', 'recruitment_id_list', 'job_function_id_list', 'location_code_list', 'tag_id_list', 'storefront_id_list'].some(k => !Array.isArray(body[k]) || body[k].length)) return;
      const normal = Object.fromEntries(Object.entries(p.request.headers).map(([k, v]) => [k.toLowerCase(), v]));
      if (normal['website-path'] !== activeSite.websitePath) return;
      // The current official client supplies this anonymous CSRF header normally.
      // Keep it only in memory; never log/store cookies, token or signatures.
      normalRequests.set(p.requestId, {});
      if (!headers) headers = Object.fromEntries(Object.entries(normal).filter(([k]) => ['x-csrf-token', 'website-path', 'portal-channel', 'portal-platform', 'env', 'content-type', 'accept-language', 'accept'].includes(k)));
    });
    page.on('Network.responseReceived', p => {
      const response = normalRequests.get(p.requestId);
      if (!response) return;
      response.status = p.response.status;
      if (response.status !== 200) normalError = new Error('Official initial list was rejected: HTTP ' + response.status + '; stopped');
    });
    page.on('Network.loadingFinished', p => {
      const response = normalRequests.get(p.requestId);
      if (!response) return;
      page.call('Network.getResponseBody', { requestId: p.requestId }).then(r => {
        try { successfulData({ ...response, body: r.body }); response.body = r.body; } catch (error) { normalError = error; }
      }).catch(error => { normalError = error; });
    });
    page.on('Network.loadingFailed', p => { if (normalRequests.has(p.requestId)) normalError = new Error('Official initial list network failure'); });
    const collect = async scope => {
      activeSite = scope; headers = null; normalError = null; normalRequests.clear(); capturing = true;
      const nav = await page.call('Page.navigate', { url: scope.url });
      if (nav.errorText) throw new Error('Official page navigation failed');
      const complete = () => normalRequests.size && [...normalRequests.values()].every(r => r.body !== undefined);
      for (let i = 0; !complete() && !normalError && i < 100; i++) { if (interrupted) throw new Error('Chrome interrupted'); await sleep(200); }
      if (normalError) throw normalError;
      if (!headers || !complete()) throw new Error('Official normal successful list request/scope was not observed');
      const visible = await page.evaluate('({url:location.href,text:document.body.innerText})');
      if (new URL(visible.url).origin !== origin || /访问异常|verify you are human|403 Forbidden|请完成验证|安全验证|滑块验证|登录后查看|请先登录|请登录后/i.test(visible.text)) throw new Error('Official page blocked or requires verification; stopped');
      validateInitialResponses([...normalRequests.values()]);
      if (normalError) throw normalError;
      capturing = false;
      const send = async body => {
        if (interrupted) throw new Error('Chrome interrupted');
        if (normalError) throw normalError;
        // SaaS uses ordinary XHR through its already-loaded official client/session.
        // Never inject an SDK, manufacture signatures/fingerprints, or weaken TLS.
        if (isPortal(site)) return page.evaluate(`(()=>{const body=${JSON.stringify(body)},headers=${JSON.stringify(headers)},query=new URLSearchParams(Object.entries(body).map(([k,v])=>[k,Array.isArray(v)?v.join(','):String(v)]));return new Promise((resolve,reject)=>{const r=new XMLHttpRequest();r.open('POST','/api/v1/search/job/posts?'+query);r.timeout=15000;for(const [k,v]of Object.entries(headers))r.setRequestHeader(k,v);r.onload=()=>resolve({status:r.status,body:r.responseText});r.onerror=()=>reject(new Error('Official XHR network failure'));r.ontimeout=()=>reject(new Error('Official XHR timeout'));r.send(JSON.stringify(body))})})()`);
        // Keep the previously reviewed ByteDance fetch transport unchanged.
        return page.evaluate(`(async()=>{const body=${JSON.stringify(body)},headers=${JSON.stringify(headers)},query=new URLSearchParams(Object.entries(body).map(([k,v])=>[k,Array.isArray(v)?v.join(','):String(v)]));const r=await fetch('/api/v1/search/job/posts?'+query,{method:'POST',headers,body:JSON.stringify(body),signal:AbortSignal.timeout(15000)});return {status:r.status,body:await r.text()}})()`);
      };
      // 页面内请求同样只对临时性错误（XHR 网络错误／超时、5xx）重试；被拒绝或被中断不重试。
      const request = body => withRetry(() => send(body), { retryable: error => /XHR network failure|XHR timeout|fetch failed|timed? ?out/i.test(error.message), onRetry: (n, why) => console.error('[retry] ' + new URL(site.url).host + ' ' + why + '（第' + n + '次重试）') });
      return isClassified(site) ? fetchClassified(site, { ...options, request }) : fetchAll(scope, { ...options, request });
    };
    return envelope(site, await (site.portalPaths ? fetchPortals(site, { collect }) : collect(site)));
  } finally {
    try { if (browser) await browser.call('Browser.close', {}, 2000); } catch {}
    page?.close(); browser?.close();
    for (let i = 0; i < 30 && chrome.exitCode === null && !spawnError; i++) await sleep(100);
    if (chrome.exitCode === null && !spawnError) { chrome.kill('SIGTERM'); for (let i = 0; i < 30 && chrome.exitCode === null; i++) await sleep(100); }
    if (chrome.exitCode === null && !spawnError) { chrome.kill('SIGKILL'); await sleep(500); }
    fs.rmSync(profile, { recursive: true, force: true });
    process.removeListener('SIGTERM', stop); process.removeListener('SIGINT', stop);
  }
}

async function run(args, options = {}) {
  const [config, file] = args;
  if (!config || !file) throw new Error('Usage: node feishu.js <siteJSON> <rawFile>');
  const site = JSON.parse(config);
  if (!verifiedSource(site)) throw new Error('Feishu source has not been individually verified');
  const collect = scope => fetchAll(scope, { ...options, request: body => options.request(body, scope) });
  const result = options.request
    ? envelope(site, await (site.portalPaths ? fetchPortals(site, { collect }) : isClassified(site) ? fetchClassified(site, options) : fetchAll(site, options)))
    : await fetchWithChrome(site, options);
  require('../publish').atomicWrite(file, JSON.stringify(result, null, 2) + '\n');
  return result;
}

module.exports = { CDP, requiresVerification, verifiedSource, portalNotice, CLASSIFIED_NOTICE, requestBody, validateInitialResponses, extractPage, normalizePost, normalizeRecord, validateJobs, validateEvidence, fetchAll, fetchPortals, fetchClassified, fetchWithChrome, run };
if (require.main === module) run(process.argv.slice(2), { log: console.log }).then(result => console.log('Feishu source fetched: ' + result.total)).catch(error => { console.error('ERR ' + error.message); process.exitCode = 1; });
