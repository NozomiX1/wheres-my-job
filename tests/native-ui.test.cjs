'use strict';
const test = require('node:test');
const a = require('node:assert/strict');
const vm = require('node:vm');
const ui = require('../crawler/lib/native-ui');
const baiPortal = require('../crawler/lib/custom/baichuan_portal');
const kuaPortal = require('../crawler/lib/custom/kuaishou_portal');
const [bai] = baiPortal.PROFILES, kua = kuaPortal.PROFILES.find(p => p.key === 'kuaishou_social');
const accept = 'application/json, text/plain, */*';
const tick = () => new Promise(resolve => setImmediate(resolve));
const rows = (site, start, size) => Array.from({ length: size }, (_, i) => site === bai ? {
  id: String(7680029585811360027n + BigInt(start + i)), title: ' 原官网标题 ', description: ' List<T> &amp;\r\n  完整正文 ', requirement: ' 原始要求 ',
  city_list: [{ name: '北京' }], job_category: null, recruit_type: { name: '实习', parent: { name: '校招' } }
} : {
  id: 32422 + start + i, name: ' 原官网标题 ', recruitProjectCode: 'socialr', positionNatureCode: 'C001', positionCategoryCode: 'J001',
  description: ' List<T> &amp;\r\n  完整正文 ', positionDemand: ' 原始要求 ', workLocations: null, workLocationsCode: ['Beijing']
});
function baiReferer(n) {
  return n === 1 ? bai.url : bai.url + '/?keywords=&category=&location=&project=&type=&job_hot_flag=&current=' + n + '&limit=10&functionCategory=&tag=';
}
function list(site, n, total = 18, size = Math.min(10, Math.max(0, total - (n - 1) * 10)), broad = false) {
  const body = site === bai ? { ...bai.body, offset: (n - 1) * 10 } : null;
  const url = site.api + '?' + (site === bai ? new URLSearchParams(Object.entries(body).map(([k, v]) => [k, Array.isArray(v) ? v.join(',') : String(v)])) + '&_signature=DO_NOT_PERSIST' :
    new URLSearchParams({ ...site.body, pageNum: n, ...(!broad ? { workLocationCode: 'domestic' } : {}) }));
  return { request: { url, method: site === bai ? 'POST' : 'GET', headers: {
    referer: site === bai ? baiReferer(n) : kua.origin + '/recruit/e/', 'content-type': 'application/json', Accept: accept,
    Cookie: 'DO_NOT_PERSIST_COOKIE', Sign: 'DO_NOT_PERSIST_SIGN', 'X-CSRF-Token': 'DO_NOT_PERSIST_CSRF', 'User-Agent': 'native browser'
  }, ...(body ? { postData: JSON.stringify(body) } : {}) }, status: 200,
  response: site === bai ? { code: 0, data: { count: total, job_post_list: rows(site, (n - 1) * 10, size) } } :
    { code: 0, message: 'ok', result: { total, list: rows(site, (n - 1) * 10, size), pageNum: n, pageSize: 10, size: 0, startRow: 0, endRow: 0,
      pages: Math.ceil(total / 10), prePage: 0, nextPage: 0, isFirstPage: false, isLastPage: false, hasPreviousPage: false, hasNextPage: false,
      navigatePages: 0, navigatepageNums: null, navigateFirstPage: 0, navigateLastPage: 0 } } };
}
function dictionary() {
  const entry = (type, code, name) => ({ type, code, name, children: null });
  return { request: { url: kua.origin + '/recruit/e/api/v1/dictionary/batch?types=workLocation,positionCategory,positionExperience', method: 'GET', headers: {
    accept, Referer: kua.origin + '/recruit/e/', Cookie: 'DO_NOT_PERSIST_COOKIE', Sign: 'DO_NOT_PERSIST_SIGN'
  } }, status: 200, response: { code: 0, message: 'ok', result: {
    workLocation: [entry('workLocation', 'Beijing', '北京')], positionCategory: [entry('positionCategory', 'J001', '研发')], positionExperience: []
  } } };
}
function fake(site, { startup = [list(site, 1)], next = n => [list(site, n)], text = '登录 岗位列表', selector = true } = {}) {
  const handlers = new Map(), responses = new Map();
  let clock = 0, seq = 0, busy = 0;
  const f = { clicks: [], calls: [], evaluations: [], reads: [], maxBusy: 0, closed: 0, text, selector, origin: site.origin };
  f.emit = (name, event) => { for (const handler of handlers.get(name) || []) handler(event); };
  f.traffic = specs => {
    for (const spec of specs) {
      const requestId = 'r' + ++seq; responses.set(requestId, spec);
      f.emit('Network.requestWillBeSent', { requestId, request: spec.request });
      if (spec.extra) f.emit('Network.requestWillBeSentExtraInfo', { requestId, headers: spec.extra });
      if (spec.networkFailure) f.emit('Network.loadingFailed', { requestId, errorText: 'https://secret.invalid/?token=DO_NOT_PERSIST' });
      else if (!spec.unfinished) {
        f.emit('Network.responseReceived', { requestId, response: { status: spec.status } });
        f.emit('Network.loadingFinished', { requestId });
      }
    }
  };
  f.page = {
    on(name, handler) { handlers.set(name, [...(handlers.get(name) || []), handler]); },
    async call(method, params, timeout) {
      f.calls.push({ method, params, timeout });
      if (method === 'Page.navigate') { a.equal(params.url, site.url); f.traffic(startup); return {}; }
      if (method === 'Network.getResponseBody') {
        a.ok(timeout > 0 && timeout <= 15000); busy++; f.maxBusy = Math.max(f.maxBusy, busy); f.reads.push(params.requestId);
        try {
          a.equal(busy, 1); const spec = responses.get(params.requestId);
          await tick(); if (spec.delay) { clock += spec.delay; await tick(); }
          spec.beforeBody?.(f);
          if (spec.toolError) throw new Error('https://secret.invalid/?token=DO_NOT_PERSIST Cookie: DO_NOT_PERSIST');
          const body = spec.invalidJSON ? 'secret invalid body DO_NOT_PERSIST' : JSON.stringify(spec.response);
          return { body: spec.base64 ? Buffer.from(body).toString('base64') : body, base64Encoded: !!spec.base64 };
        } finally { busy--; }
      }
      a.ok(['Page.enable', 'Runtime.enable', 'Network.enable'].includes(method)); return {};
    },
    async evaluate(expression) {
      f.evaluations.push(expression);
      a.doesNotMatch(expression, /fetch\s*\(|XMLHttpRequest|navigator\.|document\.cookie|localStorage|setRequestHeader|\.send\s*\(|SDK|crypto/);
      const element = { disabled: false, getAttribute: () => null, getClientRects: () => [{}], click() {
        a.equal(busy, 0, 'a native click must follow all necessary complete bodies');
        f.clicks.push(clock); f.traffic(next(f.clicks.length + 1));
      } };
      return vm.runInNewContext(expression, { location: { origin: f.origin }, document: { title: '招聘官网', body: { innerText: f.text },
        querySelector(selectorText) {
          a.equal(selectorText, site === bai ? '.atsx-pagination-next:not(.atsx-pagination-disabled)' : '.social-index-table .ant-pagination-next:not(.ant-pagination-disabled)');
          return f.selector ? element : null;
        } } });
    }
  };
  f.options = { open: async () => ({ page: f.page, close: async () => { f.closed++; } }), now: () => clock,
    sleep: async ms => { await tick(); clock += ms; f.onSleep?.(ms); } };
  f.clock = () => clock;
  return f;
}

function secretsAbsent(value) { a.doesNotMatch(JSON.stringify(value), /DO_NOT_PERSIST|_signature|User-Agent|X-CSRF|Cookie|https:\/\/secret/); }

test('native collector exports only collect/openChrome and reuses the existing Feishu CDP; qualification occurs before open', async () => {
  a.deepEqual(Object.keys(ui).sort(), ['collect', 'openChrome']); a.equal(typeof require('../crawler/lib/feishu').CDP, 'function');
  let opens = 0;
  for (const site of [{ ...bai, key: 'baichuan_social' }, kuaPortal.PROFILES[0], { ...kua, company: 'alias' }, { ...bai, adapter: undefined }, { ...bai, url: 'https://example.com' }])
    await a.rejects(ui.collect(site, { open: () => { opens++; } }), /independently qualified/);
  for (const maxPages of [0, 201, 1.2, NaN]) await a.rejects(ui.collect(bai, { maxPages, open: () => { opens++; } }), /options/);
  a.equal(opens, 0);
});

test('Baichuan two native pages preserve decoded complete body, actual changing Referer and all unsigned query bytes; no injected API', async () => {
  const first = list(bai, 1), second = list(bai, 2); first.delay = 750; second.base64 = true;
  second.extra = { REFERER: baiReferer(2), 'CONTENT-TYPE': 'application/json', Cookie: 'DO_NOT_PERSIST_COOKIE' };
  const f = fake(bai, { startup: [first], next: () => [second] });
  const originalFetch = globalThis.fetch; let fetches = 0;
  globalThis.fetch = () => { fetches++; throw new Error('website API must not be injected'); };
  let result;
  try { result = await ui.collect(bai, f.options); } finally { globalThis.fetch = originalFetch; }
  a.equal(fetches, 0); a.equal(result.pages.length, 2); a.deepEqual(result.dictionaryResponses, []); a.equal(f.closed, 1); a.equal(f.maxBusy, 1);
  a.equal(f.clicks.length, 1); a.ok(f.clicks[0] >= 750, 'wait the expected complete body, not 600ms');
  a.deepEqual(result.pages.map(p => p.request.body.offset), [0, 10]);
  for (const [n, spec] of [first, second].entries()) {
    const saved = result.pages[n]; a.deepEqual(saved.request.body, JSON.parse(spec.request.postData)); a.deepEqual(saved.response, spec.response);
    a.equal(saved.request.url, spec.request.url.replace('&_signature=DO_NOT_PERSIST', ''));
    a.deepEqual(saved.request.headers, { 'Content-Type': 'application/json', Referer: baiReferer(n + 1) });
  }
  a.match(result.issues.join(';'), /automaticWebsiteTrafficMayBeConcurrent:true;官网自动请求，不冒首屏串行扫描/); secretsAbsent(result);
  const bound = baiPortal.collectAvailable(result.pages, bai, result.issues);
  a.equal(bound.total, 18); a.equal(bound.complete, false); a.equal(baiPortal.validateEvidence(bound.verification, bound.jobs, bai).total, 18);
});

test('Kuaishou queues concurrent broad+domestic+dictionary startup, saves only domestic N1..2, ignores zero PageInfo/false flags', async () => {
  const broad = list(kua, 1, 11, 10, true), first = list(kua, 1, 11), dict = dictionary(); broad.delay = 700;
  const f = fake(kua, { startup: [broad, first, dict], next: n => [list(kua, n, 11)] });
  const r = await ui.collect(kua, f.options);
  a.equal(f.maxBusy, 1); a.equal(f.reads.length, 4); a.equal(f.clicks.length, 1); a.equal(f.closed, 1);
  a.deepEqual(r.pages.map(p => p.response.result.pageNum), [1, 2]); a.deepEqual(r.pages.map(p => p.response.result.list.length), [10, 1]);
  a.equal(r.dictionaryResponses.length, 1); a.equal(r.dictionaryResponses[0].request.url, dict.request.url);
  for (const p of [...r.pages, ...r.dictionaryResponses]) a.deepEqual(p.request.headers, { Accept: accept, Referer: kua.origin + '/recruit/e/' });
  for (const p of r.pages) { a.equal(new URL(p.request.url).searchParams.get('workLocationCode'), 'domestic'); a.equal(p.response.result.hasNextPage, false); a.equal(p.response.result.size, 0); }
  a.match(r.issues.join(';'), /无城市首屏已校验成功但未加入pages/); secretsAbsent(r);
  const bound = kuaPortal.collectNativeAvailable(r.pages, kua, r.dictionaryResponses, r.issues);
  a.equal(bound.total, 11); a.equal(bound.complete, false); a.equal(bound.verification.version, 3);
  a.equal(kuaPortal.validateEvidence(bound.verification, bound.jobs, kua).total, 11);
});

test('native clicks are paced at >=200ms starts, serialize complete bodies and stop at the native total', async () => {
  const f = fake(kua, { startup: [list(kua, 1, 21), dictionary()], next: n => [list(kua, n, 21)] });
  const r = await ui.collect(kua, f.options);
  a.equal(r.pages.length, 3); a.equal(f.clicks.length, 2); a.ok(f.clicks[0] >= 200); a.ok(f.clicks[1] - f.clicks[0] >= 200); a.equal(f.maxBusy, 1);
  a.equal(r.pages[2].response.result.list.length, 1); a.equal(f.reads.length, 4);
});

test('native social 1211 total reaches page122/tail1 despite every zero/false PageInfo flag', async () => {
  const f = fake(kua, { startup: [list(kua, 1, 1211, 10, true), list(kua, 1, 1211), dictionary()], next: n => [list(kua, n, 1211)] });
  const r = await ui.collect(kua, f.options);
  a.equal(r.pages.length, 122); a.equal(f.clicks.length, 121); a.equal(r.pages.at(-1).response.result.list.length, 1);
  a.equal(r.pages.reduce((n, p) => n + p.response.result.list.length, 0), 1211); a.equal(f.maxBusy, 1); a.equal(f.closed, 1);
  for (let i = 1; i < f.clicks.length; i++) a.ok(f.clicks[i] - f.clicks[i - 1] >= 200);
});

test('new automatic traffic during pacing is drained before clicking and its start resets the >=200ms interval', async () => {
  const f = fake(bai); let automatic = false, lastAutomaticStart;
  f.onSleep = ms => {
    if (ms >= 100 && !automatic) {
      automatic = true; lastAutomaticStart = f.clock();
      const late = list(bai, 1); late.delay = 500; f.traffic([late]);
    }
  };
  const r = await ui.collect(bai, f.options);
  a.equal(r.pages.length, 2); a.equal(f.clicks.length, 1); a.ok(f.clicks[0] - lastAutomaticStart >= 500); a.equal(f.maxBusy, 1);
  a.equal(f.reads.length, 3); a.match(r.issues.join(';'), /自动重复首屏/);
});

test('all startup duplicates are separately success checked; only one selected page is saved', async () => {
  const first = list(bai, 1, 1), duplicate = list(bai, 1, 1);
  const f = fake(bai, { startup: [first, duplicate] }), r = await ui.collect(bai, f.options);
  a.equal(r.pages.length, 1); a.equal(f.reads.length, 2); a.equal(f.clicks.length, 0); a.match(r.issues.join(';'), /自动重复首屏已单独校验成功/);
  duplicate.response.code = -1;
  const rejected = fake(bai, { startup: [first, duplicate] }), partial = await ui.collect(bai, rejected.options);
  a.equal(partial.pages.length, 1); a.equal(rejected.clicks.length, 0); a.match(partial.issues.join(';'), /business refusal.*stopped/);
});

test('HTTP !=200, business refusals, network/JSON/tool errors latch stop: no further UI or response-body API after refusal', async () => {
  for (const kind of ['HTTP', 'business', 'network', 'JSON', 'tool']) {
    const bad = list(bai, 2, 25);
    if (kind === 'HTTP') bad.status = 302;
    if (kind === 'business') bad.response.code = -1;
    if (kind === 'network') bad.networkFailure = true;
    if (kind === 'JSON') bad.invalidJSON = true;
    if (kind === 'tool') bad.toolError = true;
    const f = fake(bai, { startup: [list(bai, 1, 25)], next: () => [bad] }), r = await ui.collect(bai, f.options);
    a.equal(r.pages.length, 1); a.equal(f.clicks.length, 1); a.equal(f.evaluations.length, 2); a.equal(f.closed, 1);
    a.equal(f.reads.length, ['HTTP', 'network'].includes(kind) ? 1 : 2); a.match(r.issues.join(';'), /请求停止.*覆盖待补/); secretsAbsent(r);
    if (kind === 'HTTP') a.match(r.issues.join(';'), /HTTP 302/);
  }
  const first = list(bai, 1); first.status = 405;
  const f = fake(bai, { startup: [first] }); await a.rejects(ui.collect(bai, f.options), /HTTP 405/);
  a.equal(f.clicks.length, 0); a.equal(f.evaluations.length, 0); a.equal(f.reads.length, 0); a.equal(f.closed, 1);
});

test('a startup dictionary refusal stops before clicks and cancels later queued body reads; broad errors cannot be ignored', async () => {
  const dict = dictionary(); dict.response.code = -1;
  const f = fake(kua, { startup: [list(kua, 1, 21), dict, list(kua, 1, 21, 10, true)] });
  const r = await ui.collect(kua, f.options); a.equal(r.pages.length, 1); a.equal(f.reads.length, 2); a.equal(f.clicks.length, 0); a.equal(f.evaluations.length, 0);
  const badBroad = list(kua, 1, 21, 10, true); badBroad.response.code = -1;
  const rejected = fake(kua, { startup: [badBroad, list(kua, 1, 21), dictionary()] });
  await a.rejects(ui.collect(kua, rejected.options), /business refusal/); a.equal(rejected.reads.length, 1); a.equal(rejected.clicks.length, 0);
});

test('zero/no-page success never becomes a usable partial; broad startup alone cannot masquerade as domestic', async () => {
  for (const site of [bai, kua]) {
    const f = fake(site, { startup: [list(site, 1, 0), ...(site === kua ? [dictionary()] : [])] });
    await a.rejects(ui.collect(site, f.options), /zero cannot clear/); a.equal(f.clicks.length, 0); a.equal(f.closed, 1);
  }
  const f = fake(kua, { startup: [list(kua, 1, 11, 10, true), dictionary()] });
  await a.rejects(ui.collect(kua, f.options), /timed out/); a.equal(f.clicks.length, 0); a.equal(f.closed, 1);
});

test('missing selector/no response stop once without repeated clicks or retries; page caps and source budget preserve previous pages', async () => {
  const missing = fake(bai, { selector: false }), r1 = await ui.collect(bai, missing.options);
  a.equal(r1.pages.length, 1); a.equal(missing.clicks.length, 0); a.match(r1.issues.join(';'), /selector missing.*no retry/);
  const timeout = fake(bai, { next: () => [] }), r2 = await ui.collect(bai, timeout.options);
  a.equal(r2.pages.length, 1); a.equal(timeout.clicks.length, 1); a.ok(timeout.clock() - timeout.clicks[0] >= 15000); a.match(r2.issues.join(';'), /timed out/);
  const capped = fake(bai), r3 = await ui.collect(bai, { ...capped.options, maxPages: 1 });
  a.equal(r3.pages.length, 1); a.equal(capped.clicks.length, 0); a.match(r3.issues.join(';'), /分页安全上限/);
  const budget = fake(bai);
  // Change the injected clock used by collect only after the successful initial page.
  let expired = false; const originalSleep = budget.options.sleep;
  const r4 = await ui.collect(bai, { ...budget.options, now: () => expired ? 900001 : budget.clock(), sleep: async ms => { await originalSleep(ms); if (ms >= 100) expired = true; } });
  a.equal(r4.pages.length, 1); a.equal(budget.clicks.length, 0); a.match(r4.issues.join(';'), /source safety deadline/);
});

test('SIGTERM/SIGINT latch stop, close only the injected owned session and remove our handlers', async () => {
  for (const signal of ['SIGTERM', 'SIGINT']) {
    const count = process.listenerCount(signal), f = fake(bai);
    f.onSleep = ms => { if (ms >= 100) process.emit(signal); };
    const r = await ui.collect(bai, f.options);
    a.equal(r.pages.length, 1); a.equal(f.clicks.length, 0); a.equal(f.closed, 1); a.equal(process.listenerCount(signal), count);
    a.match(r.issues.join(';'), /Chrome interrupted/);
  }
});

test('ordinary 登录 is not refusal; origin changes, visible captcha or required login block any native click', async () => {
  for (const text of ['请完成安全验证', '请先登录后查看岗位', 'verify you are human', '拖动滑块完成验证']) {
    const f = fake(bai, { text }), r = await ui.collect(bai, f.options);
    a.equal(r.pages.length, 1); a.equal(f.clicks.length, 0); a.match(r.issues.join(';'), /blocked/); secretsAbsent(r);
  }
  const f = fake(bai); f.onSleep = ms => { if (ms >= 100) f.origin = 'https://secret.invalid'; };
  const r = await ui.collect(bai, f.options); a.equal(r.pages.length, 1); a.equal(f.clicks.length, 0); a.match(r.issues.join(';'), /redirected/); secretsAbsent(r);
});

test('only _signature is stripped: all other actual query bytes survive for caller qualification; sensitive params/Referers are refused', async () => {
  const initial = list(bai, 1, 1); initial.request.url += '&extraPublic=A%20B%2fC&empty=';
  const f = fake(bai, { startup: [initial] }), r = await ui.collect(bai, f.options);
  a.equal(r.pages[0].request.url, initial.request.url.replace('&_signature=DO_NOT_PERSIST', ''));
  for (const change of [p => p.request.url += '&token=DO_NOT_PERSIST', p => p.request.headers.referer = bai.url + '?csrfToken=DO_NOT_PERSIST']) {
    const bad = list(bai, 1); change(bad); const refused = fake(bai, { startup: [bad] });
    await a.rejects(ui.collect(bai, refused.options), error => { secretsAbsent(error.message); return true; });
    a.equal(refused.clicks.length, 0); a.equal(refused.closed, 1);
  }
});

test('unexpected page/offset/city requests and responses are refused, not silently used or retried', async () => {
  for (const mutate of [
    p => p.request.url = p.request.url.replace('pageNum=2', 'pageNum=3'),
    p => p.request.url = p.request.url.replace('workLocationCode=domestic', 'workLocationCode=overseas'),
    p => p.response.result.pageNum = 3
  ]) {
    const bad = list(kua, 2, 21); mutate(bad);
    const f = fake(kua, { startup: [list(kua, 1, 21), dictionary()], next: () => [bad] }), r = await ui.collect(kua, f.options);
    a.equal(r.pages.length, 1); a.equal(f.clicks.length, 1); a.match(r.issues.join(';'), /停止/);
  }
  const bad = list(bai, 2); bad.request.postData = JSON.stringify({ ...bai.body, offset: 20 });
  const f = fake(bai, { next: () => [bad] }), r = await ui.collect(bai, f.options);
  a.equal(r.pages.length, 1); a.equal(f.clicks.length, 1); a.equal(f.reads.length, 1);
});
