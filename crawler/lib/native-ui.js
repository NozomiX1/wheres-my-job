'use strict';
// Observe ordinary website traffic and click its own pagination; never replay an API.
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawn } = require('node:child_process');
const { isDeepStrictEqual: equal } = require('node:util');
const { CDP } = require('./feishu');
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const TRAFFIC_NOTICE = 'automaticWebsiteTrafficMayBeConcurrent:true;官网自动请求，不冒首屏串行扫描';
const SELECTORS = {
  baichuan: '.atsx-pagination-next:not(.atsx-pagination-disabled)',
  kuaishou_social: '.social-index-table .ant-pagination-next:not(.ant-pagination-disabled)'
};
const BLOCKED = /访问被拒绝|访问异常|403 Forbidden|verify you are human|请完成.{0,12}验证|安全验证|滑块验证|拖动.{0,12}滑块|登录后查看|请先登录|请登录后|需要登录|必须登录|please (?:sign|log) in|captcha/i;
class NativeUIError extends Error { constructor(message) { super('Native UI: ' + message); } }
const check = (ok, message) => { if (!ok) throw new NativeUIError(message); };

async function openChrome() {
  const candidates = process.platform === 'darwin' ? ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'] : process.platform === 'win32' ? ['C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'] : ['/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser'];
  const executable = process.env.CHROME_PATH || candidates.find(file => fs.existsSync(file));
  check(executable, 'Chrome not found; set CHROME_PATH');
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'ande-native-ui-'));
  let chrome;
  try { chrome = spawn(executable, ['--headless=new', '--remote-debugging-port=0', '--remote-debugging-address=127.0.0.1', '--user-data-dir=' + profile, '--no-first-run', '--no-default-browser-check', '--disable-background-networking', 'about:blank'], { stdio: 'ignore' }); }
  catch { fs.rmSync(profile, { recursive: true, force: true }); throw new NativeUIError('isolated Chrome startup failed'); }
  let browser, page, spawnError, interrupted = false, closing;
  chrome.on('error', error => { spawnError = error; });
  // Own process/profile only: never connect to a user's existing Chrome.
  const close = () => closing ||= (async () => {
    try { if (browser) await browser.call('Browser.close', {}, 2000); } catch {}
    try { page?.close(); } catch {}
    try { browser?.close(); } catch {}
    for (let i = 0; i < 30 && chrome.exitCode === null && !spawnError; i++) await sleep(100);
    if (chrome.exitCode === null && !spawnError) { chrome.kill('SIGTERM'); for (let i = 0; i < 30 && chrome.exitCode === null; i++) await sleep(100); }
    if (chrome.exitCode === null && !spawnError) { chrome.kill('SIGKILL'); await sleep(500); }
    try { fs.rmSync(profile, { recursive: true, force: true, maxRetries: 10, retryDelay: 200 }); } catch {}
    process.removeListener('SIGTERM', stop); process.removeListener('SIGINT', stop);
  })();
  const stop = () => { interrupted = true; try { page?.close(); } catch {} void close(); };
  process.once('SIGTERM', stop); process.once('SIGINT', stop);
  try {
    let port;
    for (let i = 0; i < 150; i++) {
      check(!spawnError && !interrupted && chrome.exitCode === null, 'Chrome terminated during startup');
      try { port = fs.readFileSync(path.join(profile, 'DevToolsActivePort'), 'utf8').split('\n')[0]; break; } catch {}
      await sleep(100);
    }
    check(port, 'Chrome did not open a debugging port');
    const get = async route => {
      const r = await fetch('http://127.0.0.1:' + port + route, { signal: AbortSignal.timeout(3000) });
      check(r.ok, 'Chrome discovery HTTP failure'); return r.json();
    };
    const version = await get('/json/version'); check(!interrupted, 'Chrome interrupted');
    browser = new CDP(version.webSocketDebuggerUrl); await browser.ready;
    const target = (await get('/json/list')).find(t => t.type === 'page');
    check(!interrupted && target, 'Chrome has no page target or was interrupted');
    page = new CDP(target.webSocketDebuggerUrl); await page.ready;
    check(!interrupted, 'Chrome interrupted');
    return { page, close };
  } catch {
    await close(); throw new NativeUIError('isolated Chrome startup failed');
  }
}

// Keep all non-signature query bytes and the actual public header values. Do not
// normalize a UI-changed Referer back to site.url, or turn domestic into broad.
function publicURL(raw) {
  const url = new URL(raw);
  check(['https:', 'http:'].includes(url.protocol) && !url.username && !url.password && !url.hash, 'unsafe observed request URL');
  for (const key of url.searchParams.keys())
    check(key === '_signature' || !/cookie|token|csrf|signature|^sign(?:timestamp)?$/i.test(key), 'unexpected sensitive query; stopped');
  if (!url.searchParams.has('_signature')) return url.href;
  const parts = url.search.slice(1).split('&').filter(part => decodeURIComponent(part.split('=')[0].replace(/\+/g, ' ')) !== '_signature');
  return url.origin + url.pathname + (parts.length ? '?' + parts.join('&') : '');
}
function publicHeaders(headers, baichuan) {
  const names = baichuan ? { 'content-type': 'Content-Type', referer: 'Referer' } : { accept: 'Accept', referer: 'Referer' };
  const result = {};
  for (const [key, value] of Object.entries(headers)) if (Object.hasOwn(names, key.toLowerCase())) {
    check(typeof value === 'string', 'invalid public request header'); result[names[key.toLowerCase()]] = value;
  }
  check(Object.keys(result).length === 2, 'missing observed public request headers');
  const referer = new URL(result.Referer);
  check(!referer.username && !referer.password && ![...referer.searchParams.keys()].some(k => /cookie|token|csrf|signature|^sign$/i.test(k)), 'unsafe observed Referer');
  return result;
}

async function collect(site, { open = openChrome, maxPages = 200, now = Date.now, sleep: pause = sleep } = {}) {
  const baichuan = site?.key === 'baichuan';
  check(site && Object.hasOwn(SELECTORS, site.key) && (baichuan ? require('./custom/baichuan_portal') : require('./custom/kuaishou_portal')).verifiedSource(site), 'source has not been independently qualified');
  check(typeof open === 'function' && typeof now === 'function' && typeof pause === 'function' && Number.isSafeInteger(maxPages) && maxPages > 0 && maxPages <= 200, 'invalid collection options');
  const origin = new URL(site.url).origin, api = new URL(site.api);
  const dictionaryPath = baichuan ? null : api.pathname.replace(/\/api\/v1\/open\/positions\/simple$/, '/api/v1/dictionary/batch');
  const pages = [], dictionaryResponses = [], issues = [TRAFFIC_NOTICE], requests = new Map();
  const deadline = now() + 900000;
  let session, page, failure, closed = false, startup = true, expected = 1, lastStart = -Infinity, phaseDeadline, phaseTimer, wake;
  let tail = Promise.resolve(), rejectStop;
  const stopped = new Promise((_, reject) => { rejectStop = reject; }); stopped.catch(() => {});
  const notify = () => { wake?.(); wake = null; };
  const fail = message => {
    if (!failure && !closed) { failure = new NativeUIError(message); rejectStop(failure); notify(); }
  };
  const sourceTimer = setTimeout(() => fail('source safety deadline; stopped'), 900000);
  const interrupt = () => fail('Chrome interrupted; stopped');
  const active = () => {
    if (now() >= deadline) fail('source safety deadline; stopped');
    if (failure) throw failure;
    check(!closed, 'collector closed');
  };
  const operate = fn => { active(); return Promise.race([fn(), stopped]); };
  const requestDone = () => [...requests.values()].every(r => r.done);
  function beginPhase() {
    clearTimeout(phaseTimer);
    phaseDeadline = Math.min(deadline, now() + 15000);
    phaseTimer = setTimeout(() => fail('expected native page response timed out (15s); stopped'), Math.max(1, phaseDeadline - now()));
  }
  async function waitExpected() {
    // Resolve from the expected *complete body*, not a fixed post-click delay.
    while (true) {
      active();
      if (pages.length === expected && requestDone() && (baichuan || dictionaryResponses.length)) {
        await operate(() => tail);
        if (requestDone()) { clearTimeout(phaseTimer); return; }
      }
      const left = Math.min(phaseDeadline, deadline) - now();
      if (left <= 0) { fail('expected native page response timed out (15s); stopped'); active(); }
      await Promise.race([new Promise(resolve => { wake = resolve; }), pause(Math.min(50, left)), stopped]);
    }
  }
  function observedRequest(event) {
    if (failure || closed) return;
    try {
      const raw = event.request, url = new URL(raw.url);
      if (url.origin !== origin || (url.pathname !== api.pathname && url.pathname !== dictionaryPath)) return;
      check(!event.redirectResponse, 'necessary request redirected; stopped');
      const kind = url.pathname === api.pathname ? 'list' : 'dictionary';
      const body = raw.postData === undefined ? null : JSON.parse(raw.postData);
      const request = { url: publicURL(raw.url), method: raw.method, body };
      let selected = false, index;
      if (kind === 'list') {
        if (baichuan) {
          check(raw.method === 'POST' && equal(body, { ...site.body, offset: (expected - 1) * 10 }), 'unexpected native list body/offset; stopped');
          index = expected; selected = true;
        } else {
          check(raw.method === 'GET' && body === null, 'unexpected native list method/body; stopped');
          check(url.searchParams.getAll('pageNum').length === 1 && url.searchParams.get('pageNum') === String(expected) && url.searchParams.get('pageSize') === '10', 'unexpected native list page; stopped');
          const cities = url.searchParams.getAll('workLocationCode');
          selected = cities.length === 1 && cities[0] === 'domestic'; index = expected;
          check(selected || startup && expected === 1 && cities.length === 0, 'unqualified native city/scope; stopped');
        }
        check(startup || ![...requests.values()].some(r => r.kind === 'list' && r.index === index), 'duplicate pagination request; stopped');
      } else check(raw.method === 'GET' && body === null, 'unexpected native dictionary method/body; stopped');
      lastStart = now();
      requests.set(event.requestId, { kind, index, selected, request, headers: { ...raw.headers }, done: false, queued: false });
      notify();
    } catch { fail('unexpected necessary request/scope; stopped'); }
  }
  function readBody(record, requestId) {
    tail = tail.then(async () => {
      if (failure || closed) return;
      try {
        active();
        const remaining = Math.min(phaseDeadline, deadline) - now();
        check(remaining > 0, 'native response deadline');
        const result = await operate(() => page.call('Network.getResponseBody', { requestId }, Math.min(15000, Math.ceil(remaining))));
        if (failure || closed) return;
        const text = result.base64Encoded ? Buffer.from(result.body, 'base64').toString('utf8') : result.body;
        const response = JSON.parse(text);
        check(response && response.code === 0 && response.success !== false && response.Success !== false, 'business refusal');
        const captured = { request: { ...record.request, headers: publicHeaders(record.headers, baichuan) }, httpStatus: record.status, response };
        check(captured.httpStatus === 200, 'missing successful HTTP status');
        if (record.kind === 'dictionary') {
          check(response.result && typeof response.result === 'object' && !Array.isArray(response.result), 'invalid dictionary result');
          if (!dictionaryResponses.length) dictionaryResponses.push(captured);
        } else {
          const data = baichuan ? response.data : response.result;
          const list = baichuan ? data?.job_post_list : data?.list, total = baichuan ? data?.count : data?.total;
          check(Array.isArray(list) && list.length <= 10 && Number.isSafeInteger(total) && total >= 0 && (!list.length || total > 0), 'invalid native list/total');
          if (!baichuan) check(data.pageNum === record.index && data.pageSize === 10, 'unexpected response page');
          if (record.selected) {
            check(pages.length || list.length > 0, 'no usable native records; zero cannot clear existing data');
            if (pages.length < record.index) pages.push(captured);
            else issues.push('官网自动重复首屏已单独校验成功，未重复加入分页证据');
          } else issues.push('官网自动无城市首屏已校验成功但未加入pages；本次仅默认国内，未证明海外/无城市范围等价');
        }
        record.done = true; notify();
      } catch (error) { fail(error instanceof NativeUIError ? error.message.slice('Native UI: '.length) + '; stopped' : 'necessary response body/business/shape failure; stopped'); }
    }).catch(() => fail('response capture queue failed; stopped'));
  }
  const domExpression = click => `(()=>{const text=document.title+'\\n'+(document.body?.innerText||''),blocked=${BLOCKED}.test(text);if(location.origin!==${JSON.stringify(origin)})return 'origin';if(blocked)return 'blocked';${click ? `const e=document.querySelector(${JSON.stringify(SELECTORS[site.key])});if(!e||e.disabled||e.getAttribute('aria-disabled')==='true'||!e.getClientRects().length)return 'missing';e.click();` : ''}return 'ok';})()`;
  try {
    session = await operate(() => open()); page = session.page;
    process.once('SIGTERM', interrupt); process.once('SIGINT', interrupt);
    page.on('Network.requestWillBeSent', observedRequest);
    page.on('Network.requestWillBeSentExtraInfo', e => {
      if (failure || closed) return;
      const record = requests.get(e.requestId); if (record) Object.assign(record.headers, e.headers);
    });
    page.on('Network.responseReceived', e => {
      if (failure || closed) return;
      const record = requests.get(e.requestId); if (!record) return;
      record.status = e.response.status;
      // 令牌未就绪时页面首个请求会得 405，页面自己取令牌后重发；这一次不算拒绝，以重发为准。
      if (record.status === 405) { requests.delete(e.requestId); return; }
      if (record.status !== 200) fail('necessary HTTP ' + (Number.isInteger(record.status) ? record.status : 'failure') + '; stopped');
      notify();
    });
    page.on('Network.loadingFailed', e => { if (requests.has(e.requestId)) fail('necessary network failure; stopped'); });
    page.on('Network.loadingFinished', e => {
      const record = requests.get(e.requestId);
      if (!record || record.queued || failure || closed) return;
      record.queued = true; readBody(record, e.requestId);
    });
    for (const method of ['Page.enable', 'Runtime.enable', 'Network.enable']) await operate(() => page.call(method));
    beginPhase();
    const nav = await operate(() => page.call('Page.navigate', { url: site.url }, Math.max(1, phaseDeadline - now())));
    check(!nav.errorText, 'official navigation failed');
    await waitExpected();
    check(await operate(() => page.evaluate(domExpression(false))) === 'ok', 'official page blocked, redirected or requires login/verification; stopped');
    while (true) {
      active();
      const last = pages.at(-1), data = baichuan ? last.response.data : last.response.result;
      const list = baichuan ? data.job_post_list : data.list, total = baichuan ? data.count : data.total;
      const reached = baichuan ? last.request.body.offset + list.length >= total : expected * 10 >= total;
      if (reached) break; // Social PageInfo size/nextPage/false flags are not EOF.
      if (!list.length) { issues.push('提前空页，覆盖待补；未继续点击'); break; }
      if (expected >= maxPages) { issues.push('达到分页安全上限，覆盖待补'); break; }
      // Automatic startup traffic can arrive during pacing too. Drain it and
      // recalculate the interval before clicking, rather than racing its body.
      while (true) {
        await operate(() => tail);
        if (!requestDone()) await waitExpected();
        const delay = Math.max(0, 200 - (now() - lastStart));
        if (!delay) break;
        await operate(() => pause(delay));
      }
      active(); startup = false; expected++;
      beginPhase();
      const state = await operate(() => page.evaluate(domExpression(true)));
      check(state === 'ok', state === 'missing' ? 'native next selector missing/disabled; stopped, no retry' : 'official page blocked, redirected or requires login/verification; stopped');
      await waitExpected();
    }
  } catch (error) {
    // Only our canned errors cross this boundary; CDP errors may contain raw URLs.
    const message = error instanceof NativeUIError ? error.message : 'Native UI: local browser/protocol failure; stopped';
    fail(message.replace(/^Native UI: /, ''));
    if (!pages.length) throw failure;
    issues.push('请求停止：' + message + '；覆盖待补');
  } finally {
    closed = true; clearTimeout(sourceTimer); clearTimeout(phaseTimer); notify();
    process.removeListener('SIGTERM', interrupt); process.removeListener('SIGINT', interrupt);
    if (session) {
      try { await session.close(); } catch { throw new NativeUIError('isolated Chrome cleanup failed'); }
    }
  }
  return { pages, dictionaryResponses, issues };
}

module.exports = { collect, openChrome };
