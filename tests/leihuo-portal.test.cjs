'use strict';
const test = require('node:test'), a = require('node:assert/strict');
const fs = require('node:fs'), os = require('node:os'), path = require('node:path');
const b = require('../crawler/lib/custom/leihuo_portal');
const site = { key: 'netease_leihuo', company: '网易雷火', ats: 'custom', adapter: 'leihuo-portal-v1', track: 'campus',
  origin: 'https://leihuo.163.com', url: 'https://leihuo.163.com/campus/#/', batch: '官网当前27届应届与日常实习热招入口', exclude: '(无)', listJD: true,
  api: 'https://xiaozhao.leihuo.netease.com/api/apply/job/list/show', dailyApi: 'https://xiaozhao.leihuo.netease.com/api/new/v3/normal_intern/job/list',
  query: { full: { job_name: '', page_size: 10, page_number: 1, project_id: 77 }, daily: { currentPage: 1, pageSize: 12, parentProduct: 'P4', workType: 1 } } };
const current = { ...site, batch: '官网公开应届、日常实习、研究实习与暑期精英实习四入口', query: { ...site.query,
  research: { job_name: '', page_size: 10, page_number: 1, project_id: 68 }, intern: { job_name: '', page_size: 10, page_number: 1, project_id: 73 } } };
const projects = { full: '77', research: '68', intern: '73' };
function full(id = '3738', project = '77') {
  return { job_code: 'PO1000087', job_name: '  原标题 <T> &amp;  ', job_description: '<p>完整 &amp; &lt;List&lt;T&gt;&gt;</p><p>下一段<br>末尾</p>',
    job_requirement: '<p>独立要求 &amp;lt;T&amp;gt;</p>', ehr_job_id: id, ehr_project_id: project, ehr_job_category: 2, is_high_need: 0,
    job_target: '2027届应届毕业生', ehr_job_type: '1', type_name: '全职', target: '2027届应届毕业生', category_name: '  游戏策划 <T> &amp;  ',
    department_name: ['雷火事业群'], work_place_name: '杭州,上海,杭州', job_detail_url: 'https://campus.163.com/app/detail/index?id=' + id + '&projectId=' + project };
}
function daily(id = 56088) {
  return { id, positionName: ' 日常实习 <T> &amp; ', description: '<p>独立正文 &lt;T&gt;</p>', requirement: '<p>独立要求 &amp;lt;T&amp;gt;</p>',
    postTypeNames: '项目管理-项目管理-项目管理', firstDepartmentName: '伏羲机器人', workCityName: '杭州市', workTypeName: '实习', updateTime: 1790587344000 };
}
function request(kind, n = 1) {
  return { url: (kind !== 'daily' ? site.api + '?job_name=&page_size=10&page_number=' + n + '&project_id=' + projects[kind] : site.dailyApi + '?currentPage=' + n + '&pageSize=12&parentProduct=P4&workType=1'),
    method: 'GET', headers: { Accept: '*/*', Referer: 'https://leihuo.163.com/campus/', Origin: site.origin }, body: null };
}
function page(kind = 'full', n = 1, posts = [kind !== 'daily' ? full('3738', projects[kind]) : daily()], total = posts.length, pages = 1) {
  return { request: request(kind, n), httpStatus: 200, response: kind !== 'daily'
    ? { status: 200, msg: 'success', data: { last_page: n >= pages, pages_count: pages, count_number: total, apply_job_list: posts } }
    : { code: 200, data: { list: posts, pages, total }, msg: 'success' } };
}
function sample() { return b.collectAvailable([page(), page('daily')], site); }
function fakeClock() { let clock = 0; return { now: () => clock, sleep: async ms => { clock += ms; } }; }

test('Leihuo independent profile and two native GETs bind current UI filters and official ID domains', () => {
  a.deepEqual(b.PROFILES[0], site); a.equal(b.verifiedSource(site), true); a.ok(Object.isFrozen(b.PROFILES[0].query.full));
  a.deepEqual(b.requestFor(site, 'full', 1), request('full')); a.deepEqual(b.requestFor(site, 'daily', 2), request('daily', 2));
  a.deepEqual(b.normalizeRecord({ kind: 'full', post: full() }, site), {
    id: '3738', title: '  原标题 <T> &amp;  ', category: '  游戏策划 <T> &amp;  ', city: '杭州,上海,杭州', channels: ['campus'],
    employment: 'full-time', talentPlan: null, date: null, dateKind: null, sourceStatus: null,
    url: 'https://campus.163.com/app/detail/index?id=3738&projectId=77', duty: '完整 & <List<T>>\n下一段\n末尾', requirements: '独立要求 &lt;T&gt;', description: '', jdComplete: false
  });
  const j = b.normalizeRecord({ kind: 'daily', post: daily() }, site);
  a.equal(j.id, '56088'); a.equal(j.url, 'https://hr.163.com/job-detail.html?id=56088&lang=zh'); a.equal(j.employment, 'internship');
  a.deepEqual(j.channels, ['campus']); a.equal(j.category, '项目管理-项目管理-项目管理'); a.equal(j.title, daily().positionName);
  a.equal(j.duty, '独立正文 <T>'); a.equal(j.requirements, '独立要求 &lt;T&gt;'); a.equal(Object.keys(j).length, 15);
  a.deepEqual([j.talentPlan, j.date, j.dateKind, j.sourceStatus], [null, null, null, null]);
  a.match(b.portalNotice(site), /热招.*非.*全集/); a.match(b.portalNotice(site), /研究.*实习.*待/);
});

test('Leihuo native page sequences retain frozen evidence, skip unsafe records and first-win duplicates/cross-domain collisions', () => {
  const initial = full(), invalid = { ...full('3748'), job_name: '  ' }, collision = daily(3738);
  const input = [page('full', 1, [initial, invalid], 3, 2), page('full', 2, [{ ...initial, job_description: '' }, full('3749')], 4, 2),
    { ...page('daily', 1, [collision, daily()], 3, 1), kind: 'daily' }];
  const result = b.collectAvailable(input, site); a.equal(result.complete, false); a.equal(result.total, 3);
  a.deepEqual(result.jobs.map(j => [j.kind, b.normalizeRecord(j, site).id]), [['full', '3738'], ['full', '3749'], ['daily', '56088']]);
  a.strictEqual(result.jobs[0].post, result.verification.pages[0].response.data.apply_job_list[0]); a.ok(Object.isFrozen(result.jobs[0].post.department_name));
  a.match(result.issues.join(';'), /记录未应用/); a.match(result.issues.join(';'), /重复官方id/); a.match(result.issues.join(';'), /ID域碰撞.*3738.*未应用/);
  a.match(result.issues.join(';'), /full.*官方total 3→4.*实际唯一岗位 2/); a.match(result.issues.join(';'), /daily.*官方total 3.*实际唯一岗位 2/);
  initial.job_description = 'caller mutation'; input[0].request.body = {}; a.notEqual(result.jobs[0].post.job_description, initial.job_description);
  a.equal(result.verification.pages[0].request.body, null); a.equal(b.validateEvidence(result.verification, result.jobs, site).total, 3);
  a.throws(() => b.validateJobs([{ kind: 'full', post: full() }, { kind: 'daily', post: collision }], site), /collision/);
  a.throws(() => b.collectAvailable([page('daily')], site), /binding/);
  a.throws(() => b.collectAvailable([page('full', 1, [full()], 2, 2), page('daily')], site), /binding/);
  a.throws(() => b.collectAvailable([...sample().verification.pages, page('daily', 2)], site), /extra request/);
  const prefix = b.collectAvailable([page()], site); a.match(prefix.issues.join(';'), /分页未穷尽.*daily/); a.equal(prefix.complete, false);
  const one = b.collectAvailable([page('full', 1, [], 0, 0), page('daily')], site); a.equal(one.total, 1);
  a.throws(() => b.collectAvailable([page('full', 1, [], 0, 0), page('daily', 1, [], 0, 0)], site), /zero cannot clear/);
  a.deepEqual(b.pageData(page(), site, 'full', 1), page().response.data); a.equal(b.atEnd(page().response.data, 'full', 1), true);
  a.equal(b.atEnd(page('daily', 1, [daily()], 20, 2).response.data, 'daily', 1), false);
});

test('Leihuo serial HTTP follows full pages then daily, rechecks early wakes and adds no cooldown after slow bodies', async () => {
  let clock = 0, busy = false; const starts = [], waits = [], urls = [];
  const result = await b.fetchAvailable(site, { now: () => clock, sleep: async ms => { a.equal(busy, false); waits.push(ms); clock += waits.length === 1 ? ms - 1 : ms; },
    fetchImpl: async (url, options) => {
      a.equal(busy, false); busy = true; starts.push(clock); urls.push(url); const i = starts.length;
      const expected = i <= 2 ? page('full', i, [full(String(3737 + i))], 2, 2) : page('daily');
      a.equal(url, expected.request.url); a.equal(options.method, 'GET'); a.equal(options.body, undefined); a.deepEqual(options.headers, expected.request.headers);
      a.equal(options.redirect, 'error'); a.ok(options.signal instanceof AbortSignal);
      return { status: 200, json: async () => { await Promise.resolve(); clock += i === 1 ? 7 : 210; busy = false; return expected.response; } };
    } });
  a.deepEqual(starts, [0, 200, 410]); a.deepEqual(waits, [193, 1]); a.deepEqual(urls, [request('full', 1).url, request('full', 2).url, request('daily').url]);
  a.equal(result.total, 3); a.equal(result.complete, false); a.equal(result.verification.stopped, null); a.equal(b.validateEvidence(result.verification, result.jobs, site).total, 3);
});

test('Leihuo request and body share a <=15s deadline even when an injected body ignores the abort signal', async t => {
  const budgets = [], nativeTimeout = AbortSignal.timeout; let calls = 0;
  t.mock.method(AbortSignal, 'timeout', ms => { budgets.push(ms); return nativeTimeout(5); });
  const result = await b.fetchAvailable(site, { listPages: [page('full', 1, [full()], 2, 2)], fetchImpl: async () => {
    calls++; return { status: 200, json: () => new Promise(resolve => setTimeout(() => resolve(page('full', 2, [full('3748')], 2, 2).response), 30)) };
  } });
  a.equal(calls, 1); a.deepEqual(budgets, [15000]); a.equal(result.total, 1); a.match(result.verification.stopped.error, /timeout|timed out/i);
  a.equal(result.verification.stopped.httpStatus, 200); a.equal(result.verification.stopped.response, null);
  a.equal(b.validateEvidence(result.verification, result.jobs, site).total, 1);
});

test('Leihuo atomic output preserves old candidate on refusal, empty evidence and rename failure', async t => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ande-leihuo-')); t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const file = path.join(dir, 'candidate.json'); fs.writeFileSync(file, 'old real candidate');
  const clock = { now: () => 0, sleep: async () => {} };
  for (const options of [
    { fetchImpl: async () => ({ status: 403 }) },
    { listPages: [page('full', 1, [], 0, 0), page('daily', 1, [], 0, 0)], fetchImpl: () => a.fail('zero must not request') }
  ]) {
    await a.rejects(b.run([JSON.stringify(site), file], { ...clock, ...options }));
    a.equal(fs.readFileSync(file, 'utf8'), 'old real candidate'); a.deepEqual(fs.readdirSync(dir), ['candidate.json']);
  }
  const completeInputs = { listPages: sample().verification.pages, fetchImpl: () => a.fail('replay must not request') };
  const written = await b.run([JSON.stringify(site), file], completeInputs);
  a.equal(written.mode, 'custom'); a.equal(written.key, 'netease_leihuo'); a.equal(written.api, site.api); a.equal(written.complete, false);
  a.deepEqual(JSON.parse(fs.readFileSync(file, 'utf8')), written); a.deepEqual(fs.readdirSync(dir), ['candidate.json']);
  const previous = fs.readFileSync(file, 'utf8');
  t.mock.method(fs, 'renameSync', () => { throw new Error('rename failure'); });
  await a.rejects(b.run([JSON.stringify(site), file], completeInputs), /rename failure/);
  a.equal(fs.readFileSync(file, 'utf8'), previous); a.deepEqual(fs.readdirSync(dir), ['candidate.json']);
});

test('Leihuo frozen identity rejects key/company/ATS/mode/source/filter tampering before any HTTP', async () => {
  for (const patch of [{ key: 'alias' }, { key: 'netease_huyu' }, { key: 'netease_social' }, { company: '网易' }, { ats: 'moka' }, { adapter: undefined },
    { track: 'social' }, { url: site.url + 'full' }, { origin: site.origin + '/' }, { api: site.dailyApi }, { dailyApi: site.api }, { listJD: false }, { body: {} },
    { query: { ...site.query, full: { ...site.query.full, page_size: 100 } } }, { query: { ...site.query, daily: { ...site.query.daily, parentProduct: 'P8' } } },
    { query: { ...site.query, full: { ...site.query.full, job_name: 'AI' } } }, { query: { ...site.query, daily: { ...site.query.daily, workType: 0 } } }]) {
    const bad = { ...site, ...patch }; a.equal(b.requiresVerification(bad), true); a.equal(b.verifiedSource(bad), false);
    await a.rejects(b.fetchAvailable(bad, { fetchImpl: () => a.fail('unverified identity must not request') }), /unverified source/);
  }
  const missing = structuredClone(site); delete missing.adapter; a.equal(b.requiresVerification(missing), true); a.equal(b.verifiedSource(missing), false);
  for (const other of [{ url: 'https://LEIHUO.163.COM:443/campus/#/' }, { api: 'GET ' + site.api }, { origin: '%' }, { dailyApi: null }]) a.equal(b.requiresVerification(other), true);
  a.equal(b.requiresVerification({ url: 'https://example.com' }), false); a.equal(b.portalNotice({}), '');
  for (const kind of ['intern', null, 1]) a.throws(() => b.requestFor(site, kind, 1), /kind/);
  for (const n of [0, 201, '1', 1.5]) a.throws(() => b.requestFor(site, 'full', n), /page/);
});

test('Leihuo exact native evidence binds HTTP/business/request/body and every retained raw field', () => {
  const original = sample();
  for (const mutate of [
    r => r.verification.key = 'netease_social', r => r.verification.api += '?filter=AI', r => r.verification.policy = 'complete', r => r.verification.version = 2,
    r => r.verification.pages[0].request.url += '&is_high_need=1', r => r.verification.pages[1].request.url = r.verification.pages[1].request.url.replace('workType=1', 'workType=0'),
    r => r.verification.pages[0].request.body = {}, r => r.verification.pages[0].request.method = 'POST', r => r.verification.pages[0].kind = 'daily',
    r => r.verification.pages[0].request.headers.Accept = 'application/json', r => r.verification.pages[0].request.headers.Origin += '/',
    r => r.verification.pages[0].request.headers.Referer = site.url, r => r.verification.pages[0].request.headers.Token = 'invented', r => r.verification.pages[0].request.headers['User-Agent'] = 'Chrome',
    r => r.verification.pages[0].httpStatus = 403, r => r.verification.pages[0].response.status = '200', r => r.verification.pages[1].response.code = '200',
    r => r.verification.pages[1].response.msg = 'refused', r => r.verification.pages[0].response.data.last_page = 'true',
    r => r.verification.pages[0].response.data.pages_count = '1', r => r.verification.pages[1].response.data.total = null,
    r => r.verification.pages[0].response.data.apply_job_list = Array(1), r => r.verification.pages[1].response.data.list = {},
    r => r.verification.pages[0].response.data.apply_job_list[0].ehr_project_id = '75', r => r.verification.pages[0].response.data.apply_job_list[0].job_requirement = 'invented',
    r => r.jobs[1].post.updateTime = 1, r => r.jobs[1].post.firstDepartmentName = 'guessed legal employer', r => r.jobs[0].post.department_name = ['guessed'],
    r => r.jobs[0].post.is_high_need = 1, r => r.jobs[0].kind = 'daily', r => r.jobs[0].extra = true
  ]) { const bad = JSON.parse(JSON.stringify(original)); mutate(bad); a.throws(() => b.validateEvidence(bad.verification, bad.jobs, site)); }
});

test('Leihuo basic title/ID/native URL safety skips only unusable rows; unknown attributes stay unknown', () => {
  const illegalFull = [{ ...full(), ehr_job_id: 3738 }, { ...full(), ehr_job_id: '0' }, { ...full(), ehr_job_id: '1&evil=1' }, { ...full(), job_name: '' },
    { ...full(), job_detail_url: 'javascript:alert(1)' }, { ...full(), job_detail_url: 'https://user:pass@campus.163.com/app/detail/index?id=3738&projectId=77' },
    { ...full(), job_detail_url: 'https://campus.163.com.evil.test/app/detail/index?id=3738&projectId=77' }, { ...full(), job_detail_url: 'https://campus.163.com/app/detail/index?id=3739&projectId=77' },
    { ...full(), job_description: {} }];
  for (const invalid of illegalFull) {
    a.throws(() => b.normalizeRecord({ kind: 'full', post: invalid }, site));
    const r = b.collectAvailable([page('full', 1, [invalid, full('3748')])], site); a.equal(r.total, 1); a.match(r.issues.join(';'), /记录未应用/);
  }
  for (const invalid of [{ ...daily(), id: '56088' }, { ...daily(), id: 0 }, { ...daily(), id: Number.MAX_SAFE_INTEGER + 1 }, { ...daily(), positionName: '  ' },
    { ...daily(), requirement: [] }, { ...daily(), postTypeNames: ['项目管理'] }]) {
    a.throws(() => b.normalizeRecord({ kind: 'daily', post: invalid }, site));
    const r = b.collectAvailable([page(), page('daily', 1, [invalid, daily(56089)])], site); a.equal(r.total, 2); a.match(r.issues.join(';'), /记录未应用/);
  }
  const missing = full(); delete missing.job_requirement; a.throws(() => b.normalizeRecord({ kind: 'full', post: missing }, site));
  a.throws(() => b.validateJobs([], site), /zero cannot clear/);
  for (const [kind, post] of [['full', { ...full(), type_name: '正式' }], ['daily', { ...daily(), workTypeName: null }]]) {
    const j = b.normalizeRecord({ kind, post }, site); a.equal(j.employment, null); a.equal(j.date, null); a.equal(j.talentPlan, null); a.equal(j.sourceStatus, null);
  }
  const big = '12345678901234567890'; a.equal(b.normalizeRecord({ kind: 'full', post: full(big) }, site).id, big);
});

test('Leihuo corrected full and daily innerHTML keep independent identical sections and single-decode escaped literals, not guessed sections', () => {
  const html = '<p>岗位要求 &amp;lt;T&amp;gt; &lt;b&gt;字面&lt;/b&gt;</p><p>下一段<br>尾部</p><script>hidden()</script>';
  for (const kind of ['full', 'daily']) {
    const post = kind === 'full' ? { ...full(), job_description: html, job_requirement: html } : { ...daily(), description: html, requirement: html };
    const j = b.normalizeRecord({ kind, post }, site);
    a.equal(j.duty, '岗位要求 &lt;T&gt; <b>字面</b>\n下一段\n尾部'); a.equal(j.requirements, j.duty); a.equal(j.description, ''); a.equal(j.jdComplete, false);
    for (const value of ['', null, '/']) {
      const empty = kind === 'full' ? { ...post, job_description: value, job_requirement: value } : { ...post, description: value, requirement: value };
      const e = b.normalizeRecord({ kind, post: empty }, site); a.equal(e.duty, value ?? ''); a.equal(e.requirements, value ?? '');
    }
    const long = '<p>' + '完整原文'.repeat(1000) + '</p>';
    const uncut = kind === 'full' ? { ...post, job_description: long } : { ...post, description: long };
    a.equal(b.normalizeRecord({ kind, post: uncut }, site).duty.length, 4000);
  }
});

test('Leihuo HTTP/business/transport/JSON/shape/scope refusal stops the whole source without retry or daily fallback', async () => {
  for (const kind of ['HTTP', 'business', 'transport', 'JSON', 'shape', 'identity']) {
    let calls = 0; const prior = page('full', 1, [full()], 2, 2);
    const result = await b.fetchAvailable(site, { ...fakeClock(), listPages: [prior], fetchImpl: async url => {
      calls++; a.equal(url, request('full', 2).url);
      if (kind === 'transport') throw new Error('transport failure');
      const native = page('full', 2, [full('3748')], 2, 2).response;
      if (kind === 'business') native.status = 401; if (kind === 'shape') native.data.apply_job_list = {};
      if (kind === 'identity') native.data.apply_job_list[0].ehr_project_id = '75';
      return { status: kind === 'HTTP' ? 403 : 200, json: async () => { if (kind === 'JSON') throw new Error('invalid JSON'); return native; } };
    } });
    a.equal(calls, 1); a.equal(result.total, 1); a.equal(result.complete, false); a.match(result.issues.join(';'), /请求停止/);
    a.equal(b.validateEvidence(result.verification, result.jobs, site).total, 1);
    if (kind === 'identity') { a.equal(result.verification.stopped.httpStatus, 200); a.match(result.verification.stopped.error, /identity guard/); }
    const bad = structuredClone(result); bad.verification.stopped.request.url = request('daily').url;
    a.throws(() => b.validateEvidence(bad.verification, bad.jobs, site), /stopped request/);
    const success = structuredClone(result); success.verification.stopped.httpStatus = 200; success.verification.stopped.response = page('full', 2, [full('3748')], 2, 2).response;
    a.throws(() => b.validateEvidence(success.verification, success.jobs, site), /successful page/);
  }
  let calls = 0; await a.rejects(b.fetchAvailable(site, { fetchImpl: async () => { calls++; return { status: 429 }; } }), /HTTP 429/); a.equal(calls, 1);
  calls = 0;
  const dailyStop = await b.fetchAvailable(site, { listPages: [page()], fetchImpl: async url => { calls++; a.equal(url, request('daily').url); return { status: 403 }; } });
  a.equal(calls, 1); a.equal(dailyStop.total, 1); a.equal(dailyStop.verification.stopped.request.url, request('daily').url);
});

test('Leihuo same-scope resume and total 200-page/900s bounds retain available prefixes without jumping to another entry', async () => {
  let calls = 0;
  const capped = await b.fetchAvailable(site, { ...fakeClock(), fetchImpl: async url => {
    calls++; const n = Number(new URL(url).searchParams.get('page_number')); a.ok(n > 0);
    return { status: 200, json: async () => page('full', n, [full()], 3000, 300).response };
  } });
  a.equal(calls, 200); a.equal(capped.total, 1); a.match(capped.issues.join(';'), /安全上限/); a.equal(capped.verification.stopped, null); a.equal(capped.complete, false);
  const capAtFullEnd = await b.fetchAvailable(site, { maxPages: 1, fetchImpl: async url => { a.equal(url, request('full').url); return { status: 200, json: async () => page().response }; } });
  a.equal(capAtFullEnd.verification.pages.length, 1); a.match(capAtFullEnd.issues.join(';'), /未完成入口 daily/);
  const resumed = await b.fetchAvailable(site, { listPages: [page('full', 1, [full()], 2, 2)], ...fakeClock(), fetchImpl: async url => {
    const kind = url.includes('/normal_intern/') ? 'daily' : 'full'; a.notEqual(url, request('full').url);
    return { status: 200, json: async () => kind === 'full' ? page('full', 2, [full('3748')], 2, 2).response : page('daily').response };
  } });
  a.equal(resumed.total, 3); a.equal(resumed.verification.pages.length, 3); a.match(resumed.issues.join(';'), /未重采/);
  let clock = 0; calls = 0;
  const timed = await b.fetchAvailable(site, { now: () => clock, sleep: async ms => { clock += ms; }, fetchImpl: async () => {
    calls++; return { status: 200, json: async () => { clock = 900000; return page('full', 1, [full()], 2, 2).response; } };
  } });
  a.equal(calls, 1); a.equal(timed.total, 1); a.match(timed.issues.join(';'), /进程安全时限/); a.equal(timed.verification.stopped, null);
  for (const maxPages of [0, 201, 1.5]) await a.rejects(b.fetchAvailable(site, { maxPages, fetchImpl: () => a.fail('invalid cap must not request') }), /limits/);
  const wrong = page('daily'); await a.rejects(b.fetchAvailable(site, { listPages: [wrong], fetchImpl: () => a.fail('invalid resume must not request') }), /binding/);
});

function old180Pages() {
  const pages = [];
  for (let n = 1; n <= 7; n++) pages.push(page('full', n, Array.from({ length: n === 7 ? 3 : 10 }, (_, i) => full(String(4000 + (n - 1) * 10 + i))), 63, 7));
  for (let n = 1; n <= 10; n++) pages.push(page('daily', n, Array.from({ length: n === 10 ? 9 : 12 }, (_, i) => daily(56000 + (n - 1) * 12 + i)), 117, 10));
  return pages;
}
function researchPages() {
  return Array.from({ length: 4 }, (_, i) => page('research', i + 1,
    Array.from({ length: 10 }, (_, j) => ({ ...full(String(6000 + i * 10 + j), '68'), type_name: '实习', job_target: '原官网范围' })), 40, 4));
}
function fourEntryPages() { return [...old180Pages(), ...researchPages(), page('intern', 1, [], 0, 1)]; }

test('Leihuo four-entry profile qualifies exact current router scopes without lending new kinds to legacy evidence', async () => {
  a.deepEqual(b.PROFILES, [site, current]); a.equal(b.verifiedSource(current), true); a.ok(Object.isFrozen(b.PROFILES[1].query.research));
  a.deepEqual(b.requestFor(current, 'research', 4), request('research', 4)); a.deepEqual(b.requestFor(current, 'intern', 1), request('intern'));
  a.equal(b.atEnd(page('intern', 1, [], 0, 1).response.data, 'intern', 1, current), true);
  a.equal(b.atEnd(researchPages()[0].response.data, 'research', 1, current), false);
  for (const kind of [['full'], ['daily'], ['research'], ['intern'], { toString: () => 'research' }]) {
    a.throws(() => b.requestFor(current, kind, 1), /kind/);
    a.throws(() => b.normalizeRecord({ kind, post: full() }, current), /kind/);
    a.throws(() => b.atEnd({}, kind, 1, current), /kind/);
  }
  for (const kind of ['research', 'intern']) {
    a.throws(() => b.requestFor(site, kind, 1), /kind/);
    a.throws(() => b.normalizeRecord({ kind, post: full('6000', projects[kind]) }, site), /kind/);
    a.throws(() => b.pageData(page(kind), site, kind, 1), /kind/);
  }
  for (const patch of [{ batch: site.batch }, { query: { ...current.query, research: { ...current.query.research, project_id: 77 } } },
    { query: { ...current.query, intern: { ...current.query.intern, page_size: 100 } } }, { query: { ...current.query, research: { ...current.query.research, job_name: 'AI' } } },
    { query: { ...current.query, research: current.query.intern, intern: current.query.research } }, { query: { full: current.query.full, daily: current.query.daily, research: current.query.research } }]) {
    const bad = { ...current, ...patch }; a.equal(b.verifiedSource(bad), false);
    await a.rejects(b.fetchAvailable(bad, { fetchImpl: () => a.fail('tampered scope must not request') }), /unverified source/);
  }
  a.match(b.portalNotice(current), /四.*入口/); a.match(b.portalNotice(current), /研究实习.*暑期精英实习/);
  a.match(b.portalNotice(current), /完整性未验证/); a.doesNotMatch(b.portalNotice(current), /研究实习.*入口待核/);
  a.equal(b.validateEvidence(sample().verification, sample().jobs, site).total, 2);
});

test('Leihuo four research pages and project-specific valid zero retain all old 180 native rows and projections', () => {
  const inputs = fourEntryPages(), before = structuredClone(inputs), old = b.collectAvailable(inputs.slice(0, 17), site);
  const result = b.collectAvailable(inputs, current);
  a.equal(result.total, 220); a.equal(result.complete, false); a.equal(result.verification.pages.length, 22);
  a.deepEqual(result.jobs.slice(0, 180), old.jobs);
  a.deepEqual(result.jobs.slice(0, 180).map(j => b.normalizeRecord(j, current)), old.jobs.map(j => b.normalizeRecord(j, site)));
  a.deepEqual(result.verification.pages.slice(0, 17), old.verification.pages); a.deepEqual(inputs, before);
  a.deepEqual(result.jobs.slice(180).map(j => j.kind), Array(40).fill('research'));
  a.deepEqual(result.verification.pages.at(-1).response.data, { last_page: true, pages_count: 1, count_number: 0, apply_job_list: [] });
  a.doesNotMatch(result.issues.join(';'), /未穷尽|未完成入口|官方total/);
  a.equal(b.validateEvidence(result.verification, result.jobs, current).total, 220);
  a.throws(() => b.validateEvidence(result.verification, result.jobs, site), /extra request/);
  const prefix = b.collectAvailable(inputs.slice(0, 17), current); a.equal(prefix.total, 180); a.match(prefix.issues.join(';'), /未完成入口 research\/intern/);
  const newOnly = b.collectAvailable([page('full', 1, [], 0, 1), page('daily', 1, [], 0, 0), ...researchPages(), page('intern', 1, [], 0, 1)], current);
  a.equal(newOnly.total, 40);
  a.throws(() => b.collectAvailable([page('full', 1, [], 0, 1), page('daily', 1, [], 0, 0), page('research', 1, [], 0, 1), page('intern', 1, [], 0, 1)], current), /zero cannot clear/);
  a.throws(() => b.collectAvailable([...inputs, page('intern', 2, [], 0, 1)], current), /extra request/);
});

test('Leihuo research/intern native project and original URL bindings stay strict, while cross-kind IDs keep the first record', () => {
  for (const kind of ['research', 'intern']) {
    const good = { ...full('7000', projects[kind]), type_name: '实习' };
    a.equal(b.normalizeRecord({ kind, post: good }, current).employment, 'internship');
    for (const patch of [{ ehr_project_id: '77' }, { ehr_project_id: Number(projects[kind]) }, { job_detail_url: full('7000').job_detail_url },
      { job_detail_url: good.job_detail_url.replace('7000', '7001') }, { job_detail_url: good.job_detail_url + '&scope=' + kind },
      { job_detail_url: 'https://user:pass@campus.163.com/app/detail/index?id=7000&projectId=' + projects[kind] }]) {
      a.throws(() => b.normalizeRecord({ kind, post: { ...good, ...patch } }, current), /identity guard|URI/);
    }
    a.throws(() => b.pageData(page(kind, 1, [{ ...good, ehr_project_id: '77' }]), current, kind, 1), /identity guard/);
    const invalid = { ...good, job_detail_url: full('7000').job_detail_url };
    const pages = [page(), page('daily'), page('research', 1, kind === 'research' ? [invalid, good] : [], kind === 'research' ? 2 : 0, 1),
      page('intern', 1, kind === 'intern' ? [invalid, good] : [], kind === 'intern' ? 2 : 0, 1)];
    const result = b.collectAvailable(pages, current); a.equal(result.total, 3); a.match(result.issues.join(';'), /记录未应用.*URI/);
  }
  const first = full(), later = { ...full('3738', '68'), job_description: '<p>后者不能合并</p>' };
  const result = b.collectAvailable([page('full', 1, [first]), page('daily', 1, [daily(3738)]), page('research', 1, [later]), page('intern', 1, [full('3738', '73')])], current);
  a.equal(result.total, 1); a.deepEqual(result.jobs, [{ kind: 'full', post: first }]);
  a.match(result.issues.join(';'), /full→daily/); a.match(result.issues.join(';'), /full→research/); a.match(result.issues.join(';'), /full→intern/);
  a.throws(() => b.validateJobs([{ kind: 'full', post: first }, { kind: 'research', post: later }], current), /collision/);
});

test('Leihuo shared Position HTML renderer preserves new schema, raw fields, identical long JD and direct type_name only', () => {
  const html = '<p>' + '完整 &amp;lt;T&amp;gt; '.repeat(1000) + '</p><p>下一段<br>末尾</p>';
  for (const kind of ['research', 'intern']) {
    const post = { ...full('7000', projects[kind]), job_description: html, job_requirement: html, type_name: '实习',
      target: '原官网目标', department_name: ['雷火事业群', '原部门'], extra_native: { retained: ['未经投影的原字段'] } };
    const actual = b.normalizeRecord({ kind, post }, current), reference = b.normalizeRecord({ kind: 'full', post: { ...post, ehr_project_id: '77', job_detail_url: full('7000').job_detail_url } }, site);
    a.deepEqual(actual, { ...reference, url: post.job_detail_url }); a.equal(Object.keys(actual).length, 15);
    a.equal(actual.duty, '完整 &lt;T&gt; '.repeat(1000).trimEnd() + '\n下一段\n末尾'); a.equal(actual.requirements, actual.duty);
    a.deepEqual([actual.description, actual.jdComplete, actual.talentPlan, actual.date, actual.dateKind, actual.sourceStatus], ['', false, null, null, null, null]);
    for (const label of ['正式', null, '研究实习']) a.equal(b.normalizeRecord({ kind, post: { ...post, type_name: label } }, current).employment, null);
    for (const value of [null, '', '/']) {
      const j = b.normalizeRecord({ kind, post: { ...post, job_description: value, job_requirement: value } }, current);
      a.equal(j.duty, value ?? ''); a.equal(j.requirements, value ?? '');
    }
    const pages = [page(), page('daily'), page('research', 1, kind === 'research' ? [post] : []), page('intern', 1, kind === 'intern' ? [post] : [])];
    const result = b.collectAvailable(pages, current); a.deepEqual(result.jobs.at(-1).post, post);
    const changed = JSON.parse(JSON.stringify(result)); changed.jobs.at(-1).post.extra_native.retained[0] = 'invented';
    a.throws(() => b.validateEvidence(changed.verification, changed.jobs, current), /jobs\/native/);
  }
  const original = b.collectAvailable(fourEntryPages(), current);
  for (const mutate of [r => r.verification.pages[17].request.url = request('intern').url,
    r => r.verification.pages[17].response.status = 401, r => r.verification.pages[18].kind = 'intern',
    r => r.verification.pages[18].response.data.apply_job_list[0].ehr_project_id = '73',
    r => r.verification.pages[21].httpStatus = 403, r => r.verification.pages[21].response.msg = 'refused',
    r => delete r.verification.pages[21].response.data.count_number, r => r.jobs[180].post.job_requirement = 'invented',
    r => r.jobs[180].kind = 'intern']) {
    const bad = JSON.parse(JSON.stringify(original)); mutate(bad); a.throws(() => b.validateEvidence(bad.verification, bad.jobs, current));
  }
});

test('Leihuo production continues the old 17 pages with serial research then intern, while full native replay sends no HTTP', async () => {
  let clock = 0, busy = false; const starts = [], waits = [], expected = [...researchPages(), page('intern', 1, [], 0, 1)];
  const old = old180Pages(), prior = structuredClone(old);
  const result = await b.fetchAvailable(current, { listPages: old, now: () => clock,
    sleep: async ms => { a.equal(busy, false); waits.push(ms); clock += waits.length === 1 ? ms - 1 : ms; },
    fetchImpl: async (url, options) => {
      a.equal(busy, false); busy = true; const native = expected[starts.length]; starts.push(clock); a.equal(url, native.request.url);
      a.deepEqual(options.headers, native.request.headers); a.equal(options.body, undefined); a.equal(options.redirect, 'error');
      a.ok(options.signal instanceof AbortSignal);
      return { status: 200, json: async () => { await Promise.resolve(); clock += starts.length === 1 ? 7 : 210; busy = false; return native.response; } };
    } });
  a.deepEqual(starts, [0, 200, 410, 620, 830]); a.deepEqual(waits, [193, 1]); a.deepEqual(old, prior);
  a.equal(result.total, 220); a.equal(result.verification.pages.length, 22); a.match(result.issues.join(';'), /未重采/);
  const replay = await b.fetchAvailable(current, { listPages: result.verification.pages, fetchImpl: () => a.fail('bound 22-page replay must not request') });
  a.deepEqual(replay.jobs, result.jobs); a.deepEqual(replay.verification.pages, result.verification.pages); a.equal(replay.complete, false);
  const freshPages = fourEntryPages(); let calls = 0;
  const fresh = await b.fetchAvailable(current, { ...fakeClock(), fetchImpl: async url => {
    const native = freshPages[calls++]; a.equal(url, native.request.url); return { status: 200, json: async () => native.response };
  } });
  a.equal(calls, 22); a.deepEqual(fresh.jobs, result.jobs);
  const legacy = await b.fetchAvailable(site, { listPages: old, fetchImpl: () => a.fail('legacy cannot acquire new kinds') }); a.equal(legacy.total, 180);
  const capped = await b.fetchAvailable(current, { listPages: result.verification.pages.slice(0, 19), maxPages: 19, fetchImpl: () => a.fail('shared total cap must not request') });
  a.equal(capped.total, 200); a.match(capped.issues.join(';'), /安全上限/); a.match(capped.issues.join(';'), /未完成入口 research\/intern/);
});

test('Leihuo research refusal stops the entire source before intern and native replay binds the exact stopped project/page', async () => {
  const prefix = [...old180Pages(), researchPages()[0]];
  for (const failure of ['HTTP', 'business', 'identity', 'JSON']) {
    let calls = 0;
    const result = await b.fetchAvailable(current, { listPages: prefix, ...fakeClock(), fetchImpl: async url => {
      calls++; a.equal(url, request('research', 2).url);
      const native = structuredClone(researchPages()[1].response);
      if (failure === 'business') native.status = 401;
      if (failure === 'identity') native.data.apply_job_list[0].ehr_project_id = '73';
      return { status: failure === 'HTTP' ? 403 : 200, json: async () => { if (failure === 'JSON') throw new Error('invalid JSON'); return native; } };
    } });
    a.equal(calls, 1); a.equal(result.total, 190); a.equal(result.verification.pages.length, 18); a.equal(result.complete, false);
    a.deepEqual(result.jobs.slice(0, 180), b.collectAvailable(old180Pages(), site).jobs); a.match(result.issues.join(';'), /请求停止/);
    a.equal(b.validateEvidence(result.verification, result.jobs, current).total, 190);
    const bad = structuredClone(result); bad.verification.stopped.request = request('intern');
    a.throws(() => b.validateEvidence(bad.verification, bad.jobs, current), /stopped request/);
  }
  let clock = 0, calls = 0;
  const timed = await b.fetchAvailable(current, { listPages: old180Pages(), now: () => clock, sleep: async ms => { clock += ms; }, fetchImpl: async () => {
    calls++; return { status: 200, json: async () => { clock = 900000; return researchPages()[0].response; } };
  } });
  a.equal(calls, 1); a.equal(timed.total, 190); a.match(timed.issues.join(';'), /进程安全时限/);
});
