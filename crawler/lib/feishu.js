// Public Feishu recruiting: normal isolated Chrome session, strict complete scans.
// Each pinned profile proves only its registered public portal, never a whole company.
'use strict';
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { createHash } = require('node:crypto');
const { spawn } = require('node:child_process');
// Reviewed ordinary portal details render these fields as literal text, not HTML.
const jdText = value => value.replace(/\r\n?/g, '\n').trim();
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

const CLASSIFIED_NOTICE = '字节社招仅覆盖已核验九类及子类（75个分类ID）；未分类、旧类别和树外岗位未验证，不代表全社招；旧历史按授权范围迁移退出，不代表官网已下架。';

function classifiedScope(site) {
  // Pin the reviewed roots and partitions, rather than trusting a copyable verified flag.
  if (!site || site.key !== 'bytedance_social' || site.company !== '字节跳动' || site.ats !== 'feishu'
    || site.adapter !== 'bytedance-classified-v1' || site.url !== 'https://jobs.bytedance.com/experienced/position'
    || site.websitePath !== 'society' || site.portalType !== 2 || site.portalPaths !== undefined
    || site.categoryTreeHash !== '55e22846974c635e8827276c12e68bf09a551dc5995fdaed61f76593cde3a9ed'
    || !Array.isArray(site.subjectIdList) || site.subjectIdList.length
    || site.linkTemplate !== 'https://jobs.bytedance.com/experienced/position/{id}/detail'
    || !Array.isArray(site.categoryRootIds) || site.categoryRootIds.length !== 9 || site.categoryRootIds.some(id => typeof id !== 'string')
    || !Array.isArray(site.categoryGroups) || site.categoryGroups.length !== 2 || site.categoryGroups.some(g => !Array.isArray(g) || !g.length || g.some(id => typeof id !== 'string'))) return false;
  return createHash('sha256').update(JSON.stringify({ categoryRootIds: site.categoryRootIds, categoryGroups: site.categoryGroups })).digest('hex') === '333ca426bd2302987db9888b152201467fceff86e13e46167b2553cff23e5e4b';
}

// Explicitly reviewed SaaS portals; a generic Feishu flag/host cannot qualify another source.
const PORTALS = {
  minimax: ['MiniMax', 'https://vrfi1sk8a0.jobs.feishu.cn/379481/', '379481'],
  minimax_social: ['MiniMax', 'https://vrfi1sk8a0.jobs.feishu.cn/index', 'index'],
  sensetime: ['商汤', 'https://hr-jobs.sensetime.com/edu', 'edu'],
  sensetime_social: ['商汤', 'https://hr-jobs.sensetime.com/exp', 'exp'],
  lilith: ['莉莉丝', 'https://lilithgames.jobs.feishu.cn/campus', 'campus', ['campus', 'intern']],
  lilith_social: ['莉莉丝', 'https://lilithgames.jobs.feishu.cn/career/', 'career', ['career', 'index']],
  papegames: ['叠纸游戏', 'https://career.papegames.com/campus/position/list', 'campus'],
  papegames_social: ['叠纸游戏', 'https://career.papegames.com/social/position/list', 'social']
};
function portalScope(site) {
  const profile = site && Object.hasOwn(PORTALS, site.key) && PORTALS[site.key];
  if (!profile) return false;
  const [company, url, websitePath, portalPaths] = profile;
  return site.company === company && site.ats === 'feishu' && site.adapter === 'feishu-portal-v1'
    && site.url === url && site.websitePath === websitePath && site.portalType === 6
    && JSON.stringify(site.portalPaths) === JSON.stringify(portalPaths)
    && Array.isArray(site.subjectIdList) && site.subjectIdList.length === 0
    && site.categoryGroups === undefined && site.categoryRootIds === undefined && site.categoryTreeHash === undefined
    && site.linkTemplate === new URL(url).origin + '/' + websitePath + '/position/{id}/detail';
}

function verifiedSource(site) {
  return portalScope(site) || classifiedScope(site) || (!!site && site.key === 'bytedance' && site.company === '字节跳动'
    && site.ats === 'feishu' && site.adapter === 'bytedance-v1'
    && site.url === 'https://jobs.bytedance.com/campus/position'
    && site.websitePath === 'campus' && site.portalType === 3 && site.portalPaths === undefined
    && Array.isArray(site.subjectIdList) && site.subjectIdList.length === 0
    && site.categoryGroups === undefined && site.categoryRootIds === undefined && site.categoryTreeHash === undefined
    && site.linkTemplate === 'https://jobs.bytedance.com/campus/position/{id}/detail');
}

function portalNotice(site) {
  if (!portalScope(site) || !site.portalPaths) return '';
  return site.key === 'lilith'
    ? '莉莉丝校园来源为官网校园及独立实习两门户联合范围，保留官网逐岗渠道/性质；首次历史迁移退出不代表下架。'
    : '莉莉丝社招来源为官网career社会招聘及原index活水平台联合范围，同租户同posting ID且身份/JD一致才合并、优先社招入口；非公司全球全集，历史迁移退出不代表下架。';
}

function requestBody(site, { limit = 50, offset = 0 } = {}) {
  if (!Number.isSafeInteger(limit) || limit < 1 || limit > 50 || !Number.isSafeInteger(offset) || offset < 0 || !Number.isSafeInteger(site.portalType) || !Array.isArray(site.subjectIdList) || site.subjectIdList.some(x => typeof x !== 'string')) throw new Error('Invalid Feishu request scope');
  return { keyword: '', limit, offset, job_category_id_list: [], tag_id_list: [], location_code_list: [], subject_id_list: [...site.subjectIdList], recruitment_id_list: [], portal_type: site.portalType, job_function_id_list: [], storefront_id_list: [], portal_entrance: 1 };
}

function successfulData(response) {
  if (response?.status !== 200) throw new Error('Feishu HTTP failure: ' + response?.status);
  const body = typeof response.body === 'string' ? JSON.parse(response.body) : response.body;
  if (!body || Array.isArray(body) || body.code !== 0 || body.success === false || body.Success === false) throw new Error('Feishu business response was not successful');
  const data = body.data;
  if (!data || !Array.isArray(data.job_post_list) || !Number.isSafeInteger(data.count) || data.count < 0) throw new Error('Feishu response requires a list and explicit total');
  return data;
}

function validateInitialResponses(responses) {
  if (!Array.isArray(responses) || !responses.length) throw new Error('No successful official initial list response');
  for (const response of responses) successfulData(response);
}

function extractPage(response) {
  const data = successfulData(response);
  if (data.count >= 10000) throw new Error('Feishu reported total reached the official 10000 ceiling; complete coverage is unproved');
  return { jobs: data.job_post_list, total: data.count };
}

function officialText(value, field) {
  if (value == null) return '';
  if (typeof value !== 'string') throw new Error('Invalid Feishu text: ' + field);
  return value;
}

function named(value, field) {
  if (value == null) return '';
  if (typeof value !== 'object' || Array.isArray(value) || (value.name != null && typeof value.name !== 'string')) throw new Error('Invalid Feishu named field: ' + field);
  return officialText(value.name, field + '.name').trim();
}

function normalizePost(post, site) {
  if (!post || typeof post !== 'object' || Array.isArray(post)) throw new Error('Invalid Feishu post');
  for (const field of ['id', 'title', 'description', 'requirement']) if (!Object.hasOwn(post, field) || post[field] === undefined) throw new Error('Feishu list omitted required field: ' + field);
  if (!(typeof post.id === 'string' || (Number.isSafeInteger(post.id) && post.id >= 0))) throw new Error('Invalid Feishu official ID');
  const id = String(post.id).trim();
  if (!id || /^(?:undefined|null|nan|infinity)$/i.test(id)) throw new Error('Missing Feishu official ID');
  if (classifiedScope(site) && !site.categoryGroups.flat().includes(String(post.job_category?.id))) throw new Error('Feishu post is outside the reviewed category scope');
  const title = officialText(post.title, 'title').trim();
  if (!title) throw new Error('Missing Feishu title');
  const duty = jdText(officialText(post.description, 'description'));
  const requirements = jdText(officialText(post.requirement, 'requirement'));
  // A new nonduplicated nested JD requires fresh first-party verification, not silent loss.
  for (const field of ['description', 'requirement']) {
    const extra = post.job_post_info?.[field];
    if (extra != null && jdText(officialText(extra, 'job_post_info.' + field)) && jdText(extra) !== jdText(post[field] ?? '')) throw new Error('Unexpected independent nested Feishu JD');
  }
  const cities = post.city_list ?? (post.city_info == null ? [] : [post.city_info]);
  if (!Array.isArray(cities)) throw new Error('Invalid Feishu city list');
  const city = [...new Set(cities.map(c => named(c, 'city')).filter(Boolean))].join('/');
  const kind = named(post.recruit_type, 'recruit_type');
  const parent = named(post.recruit_type?.parent, 'recruit_type.parent');
  const channels = ['校招', '校园招聘'].includes(parent) ? ['campus'] : ['社招', '社会招聘'].includes(parent) ? ['social'] : [];
  const employment = ['实习', '实习生'].includes(kind) ? 'internship' : ['全职', 'full-time'].includes(kind) ? 'full-time' : null;
  const custom = post.job_post_info?.job_post_object_value_map;
  if (custom != null && (typeof custom !== 'object' || Array.isArray(custom) || Object.keys(custom).length)) throw new Error('Unexpected custom Feishu fields; visible JD semantics require verification');
  const category = named(post.job_category, 'job_category'), jobFunction = named(post.job_function, 'job_function');
  if (category && jobFunction && category !== jobFunction) throw new Error('Unreviewed simultaneous Feishu category/function names');
  return { id, title, city, category: category || jobFunction, duty, requirements, description: '', channels, employment, talentPlan: null,
    date: null, dateKind: null, url: site.linkTemplate.replace('{id}', encodeURIComponent(id)), jdComplete: /[\p{L}\p{N}]/u.test(duty + requirements) };
}

async function fetchAll(site, { request, limit = 50, maxPages = 500, delayMs = 150, sleepImpl = sleep, log = () => {} } = {}) {
  if (typeof request !== 'function' || !Number.isSafeInteger(maxPages) || maxPages < 1 || !Number.isFinite(delayMs) || delayMs < 0) throw new Error('Invalid Feishu scan options');
  requestBody(site, { limit });
  async function scan(round) {
    const jobs = [], seen = new Set(); let total;
    for (let page = 0; page < maxPages; page++) {
      const result = extractPage(await request(requestBody(site, { limit, offset: page * limit })));
      if (total === undefined) total = result.total;
      if (result.total !== total) throw new Error('Feishu total changed during pagination');
      if (result.jobs.length !== Math.min(limit, Math.max(0, total - jobs.length))) throw new Error('Feishu premature empty/short or contradictory page');
      for (const rawPost of result.jobs) {
        const job = normalizePost(rawPost, site);
        if (seen.has(job.id)) throw new Error('Duplicate Feishu official ID');
        seen.add(job.id); jobs.push({ ...job, rawPost });
      }
      log(`Feishu ${round}: page ${page + 1}, ${jobs.length}/${total}`);
      if (jobs.length === total) return { total, jobs };
      await sleepImpl(delayMs);
    }
    throw new Error('Feishu pagination limit reached before complete result');
  }
  const first = await scan('collect');
  await sleepImpl(delayMs);
  const last = await scan('verify');
  if (first.total !== last.total) throw new Error('Feishu total changed during final verification');
  const byId = new Map(last.jobs.map(j => [j.id, j]));
  for (const job of first.jobs) {
    const other = byId.get(job.id);
    if (!other) throw new Error('Feishu ID set changed during final verification');
    // Snapshot facts and full raw fields must agree, not merely counts or title samples.
    if (JSON.stringify(job) !== JSON.stringify(other)) throw new Error('Feishu JD/metadata changed during final verification');
  }
  return { complete: true, total: first.total, jobs: first.jobs };
}

function portalSite(site, portalPath) {
  if (!portalScope(site) || !site.portalPaths?.includes(portalPath)) throw new Error('Unreviewed Feishu portal path');
  const origin = new URL(site.url).origin;
  return { ...site, websitePath: portalPath, url: portalPath === site.websitePath ? site.url : origin + '/' + portalPath + '/', linkTemplate: origin + '/' + portalPath + '/position/{id}/detail' };
}

function samePosting(a, b) {
  for (const field of ['id', 'title', 'city', 'duty', 'requirements', 'description', 'channels', 'employment', 'talentPlan', 'date', 'dateKind', 'jdComplete']) {
    if (JSON.stringify(a[field]) !== JSON.stringify(b[field])) throw new Error('Feishu same posting has conflicting portal facts: ' + field);
  }
}

function normalizeRecord(job, site) {
  if (!site.portalPaths) return normalizePost(job.rawPost, site);
  const primary = normalizePost(job.rawPost, portalSite(site, job.portalPath));
  if (!Array.isArray(job.portalPosts) || !job.portalPosts.length) throw new Error('Missing Feishu portal provenance');
  const seen = new Set(); let matched = false;
  for (const entry of job.portalPosts) {
    if (!entry || seen.has(entry.portalPath)) throw new Error('Invalid/duplicate Feishu portal provenance');
    seen.add(entry.portalPath);
    const other = normalizePost(entry.rawPost, portalSite(site, entry.portalPath));
    samePosting(primary, other);
    for (const field of ['title', 'description', 'requirement']) if (JSON.stringify(job.rawPost[field]) !== JSON.stringify(entry.rawPost[field])) throw new Error('Feishu same posting has different raw JD');
    if (entry.portalPath === job.portalPath && JSON.stringify(entry.rawPost) === JSON.stringify(job.rawPost)) matched = true;
  }
  if (!matched) throw new Error('Feishu primary raw post lacks matching portal provenance');
  // Official portal-specific category projections and URLs can differ; prefer the first portal.
  return primary;
}

async function fetchPortals(site, { collect } = {}) {
  if (!portalScope(site) || !site.portalPaths || typeof collect !== 'function') throw new Error('Unreviewed Feishu portal union');
  const byId = new Map(), portals = [];
  for (const portalPath of site.portalPaths) {
    const result = await collect(portalSite(site, portalPath));
    if (result?.complete !== true || !Number.isSafeInteger(result.total) || !Array.isArray(result.jobs) || result.total !== result.jobs.length) throw new Error('Incomplete Feishu portal');
    const seen = new Set();
    for (const record of result.jobs) {
      if (seen.has(record.id)) throw new Error('Duplicate Feishu ID within portal');
      seen.add(record.id);
      const entry = { portalPath, rawPost: record.rawPost }, previous = byId.get(record.id);
      if (previous) previous.portalPosts.push(entry);
      else byId.set(record.id, { ...record, portalPath, portalPosts: [entry] });
      const job = byId.get(record.id), verified = normalizeRecord(job, site);
      for (const [field, value] of Object.entries(verified)) if (JSON.stringify(job[field]) !== JSON.stringify(value)) throw new Error('Feishu union canonical facts differ from raw portal post: ' + field);
    }
    portals.push({ portalPath, total: result.total });
  }
  // This explicit union is proved by complete portal enumerations and same-tenant posting IDs.
  // It is not an independent employer-wide aggregate count.
  return { complete: true, total: byId.size, portals, jobs: [...byId.values()] };
}

async function fetchClassified(site, options = {}) {
  if (!classifiedScope(site) || typeof options.request !== 'function' || typeof options.readFilters !== 'function') throw new Error('Invalid classified Feishu scope/transport');
  const readTree = async () => {
    const response = await options.readFilters();
    if (response?.status !== 200) throw new Error('Feishu filter HTTP failure');
    const body = typeof response.body === 'string' ? JSON.parse(response.body) : response.body;
    const tree = body?.data?.job_type_list;
    if (body?.code !== 0 || body.success === false || body.Success === false || !Array.isArray(tree)) throw new Error('Invalid Feishu filter tree');
    if (createHash('sha256').update(JSON.stringify(tree)).digest('hex') !== site.categoryTreeHash) throw new Error('Feishu category tree changed from reviewed scope; explicit migration required');
    const seen = new Set();
    const flatten = nodes => nodes.flatMap(node => {
      if (!node || typeof node.id !== 'string' || seen.has(node.id) || (node.children != null && !Array.isArray(node.children))) throw new Error('Invalid/duplicate Feishu category tree');
      seen.add(node.id); return [node.id, ...flatten(node.children ?? [])];
    });
    const sameSet = (a, b) => a.length === b.length && a.every(id => b.includes(id));
    if (!sameSet(tree.map(n => n?.id), site.categoryRootIds)) throw new Error('Feishu category scope changed; explicit migration required');
    const first = site.categoryRootIds[0];
    const groups = [flatten(tree.filter(n => n.id === first)), flatten(tree.filter(n => n.id !== first))];
    if (groups.some((g, i) => !sameSet(g, site.categoryGroups[i]))) throw new Error('Feishu category scope changed; explicit migration required');
    return tree;
  };
  const before = await readTree(), jobs = [], seen = new Set(); let total = 0;
  for (const ids of site.categoryGroups) {
    const partition = await fetchAll(site, { ...options, request: async body => {
      const response = await options.request({ ...body, job_category_id_list: [...ids] });
      for (const post of extractPage(response).jobs) if (!ids.includes(String(post?.job_category?.id))) throw new Error('Feishu post is outside the requested category partition');
      return response;
    }});
    total += partition.total; // Sum explicit official totals only for the declared disjoint scope.
    for (const job of partition.jobs) {
      if (seen.has(job.id)) throw new Error('Feishu partitions overlap an official ID');
      seen.add(job.id); jobs.push(job);
    }
  }
  if (JSON.stringify(before) !== JSON.stringify(await readTree())) throw new Error('Feishu category tree changed during collection');
  return { complete: true, total, jobs }; // Complete within registered categories, NOT whole-social.
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
      const request = async body => {
        if (interrupted) throw new Error('Chrome interrupted');
        if (normalError) throw normalError;
        // SaaS uses ordinary XHR through its already-loaded official client/session.
        // Never inject an SDK, manufacture signatures/fingerprints, or weaken TLS.
        if (portalScope(site)) return page.evaluate(`(()=>{const body=${JSON.stringify(body)},headers=${JSON.stringify(headers)},query=new URLSearchParams(Object.entries(body).map(([k,v])=>[k,Array.isArray(v)?v.join(','):String(v)]));return new Promise((resolve,reject)=>{const r=new XMLHttpRequest();r.open('POST','/api/v1/search/job/posts?'+query);r.timeout=15000;for(const [k,v]of Object.entries(headers))r.setRequestHeader(k,v);r.onload=()=>resolve({status:r.status,body:r.responseText});r.onerror=()=>reject(new Error('Official XHR network failure'));r.ontimeout=()=>reject(new Error('Official XHR timeout'));r.send(JSON.stringify(body))})})()`);
        // Keep the previously reviewed ByteDance fetch transport unchanged.
        return page.evaluate(`(async()=>{const body=${JSON.stringify(body)},headers=${JSON.stringify(headers)},query=new URLSearchParams(Object.entries(body).map(([k,v])=>[k,Array.isArray(v)?v.join(','):String(v)]));const r=await fetch('/api/v1/search/job/posts?'+query,{method:'POST',headers,body:JSON.stringify(body),signal:AbortSignal.timeout(15000)});return {status:r.status,body:await r.text()}})()`);
      };
      if (classifiedScope(site)) {
        const readFilters = async () => page.evaluate(`(async()=>{const r=await fetch('/api/v1/config/job/filters/2',{headers:${JSON.stringify(headers)},signal:AbortSignal.timeout(15000)});return {status:r.status,body:await r.text()}})()`);
        return await fetchClassified(site, { ...options, request, readFilters });
      }
      return await fetchAll(scope, { ...options, request });
    };
    return await (site.portalPaths ? fetchPortals(site, { collect }) : collect(site));
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
  const result = options.request ? await (site.portalPaths
    ? fetchPortals(site, { collect: scope => fetchAll(scope, { ...options, request: body => options.request(body, scope) }) })
    : classifiedScope(site) ? fetchClassified(site, options) : fetchAll(site, options)) : await fetchWithChrome(site, options);
  require('../publish').atomicWrite(file, JSON.stringify(result, null, 2) + '\n');
  return result;
}

module.exports = { verifiedSource, classifiedScope, portalScope, portalNotice, CLASSIFIED_NOTICE, requestBody, validateInitialResponses, extractPage, normalizePost, normalizeRecord, fetchAll, fetchPortals, fetchClassified, fetchWithChrome, run };
if (require.main === module) run(process.argv.slice(2), { log: console.log }).then(result => console.log('Complete Feishu source: ' + result.total)).catch(error => { console.error('ERR ' + error.message); process.exitCode = 1; });
