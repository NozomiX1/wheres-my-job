'use strict';
const test = require('node:test'), a = require('node:assert/strict');
const b = require('../crawler/lib/custom/tme_portal');
const [campus, social] = b.PROFILES;
function row(site = social, id = '13128') {
  return { id, name: '  原标题（技术大咖）  ', duty: '  List<T> &amp; <b>原字面</b>\r\n  内部  空白\n' + '完整正文'.repeat(400), jobf_descr: '技术类', date: '二周前',
    ...(site.track === 'campus' ? { work_city: [{ value: 440300, label: '深圳市' }, { value: 'GBR000', label: '英国' }], job_type: 40, job_type_descr: '技术大咖' } : { work_city: '西安', work_nature_descr: '全职' }) };
}
function page(site, n = 1, rows = [row(site)], total = rows.length) {
  return { request: b.requestFor(site, n), httpStatus: 200, response: { code: '200', msg: '操作完成', data: { items: rows, _meta: { total_count: total, page_count: Math.ceil(total / 100), page_size: 100, current_page: n } } } };
}
function detail(site, post, patch = {}) {
  return { request: b.detailRequestFor(site, post, 1791446505511), httpStatus: 200, response: { code: '200', msg: '操作完成', data: { ...post, requirement: '  List<T> &amp; 同文  要求\n', ...patch } } };
}
test('TME only exact broad campus/social profiles, native TEXT and partial evidence are independently bound', () => {
  a.equal(campus.adapter, 'tme-portal-v1'); a.equal(campus.body.type, ''); a.equal(campus.body.ss, 100); a.equal(social.body.order_by, 'is_recommend');
  a.ok(Object.isFrozen(campus.body.job_class));
  const post = row(), raw = page(social, 1, [post], 124), r = b.collectAvailable([raw], social);
  a.equal(r.complete, false); a.equal(r.total, 1); a.deepEqual(b.validateEvidence(r.verification, r.jobs, social).jobs, r.jobs);
  const j = b.normalizeRecord(r.jobs[0], social);
  a.equal(j.id, '13128'); a.equal(j.title, post.name); a.equal(j.duty, post.duty); a.equal(j.requirements, ''); a.equal(j.jdComplete, false);
  a.equal(j.employment, 'full-time'); a.deepEqual([j.date, j.dateKind, j.talentPlan], [null, null, null]);
  a.equal(j.url, 'https://join.tencentmusic.com/social/post-details/?id=13128');
  a.match(r.issues.join(';'), /124.*实际唯一岗位 1/);
  for (const site of [campus, social]) {
    for (const patch of [{ key: 'alias' }, { adapter: undefined }, { company: '腾讯' }, { body: { ...site.body, keyword: 'AI' } }]) {
      const bad = { ...site, ...patch }; a.equal(b.requiresVerification(bad), true); a.equal(b.verifiedSource(bad), false);
      a.throws(() => b.validateJobs([], bad));
    }
  }
});
test('TME full detail independently retains both TEXT fields; empty detail cannot erase list duty; all four projects remain', () => {
  for (const site of [campus, social]) {
    const post = row(site), raw = detail(site, post), r = b.collectAvailable([page(site, 1, [post])], site, [raw]);
    const j = b.normalizeRecord(r.jobs[0], site); a.equal(j.duty, post.duty); a.equal(j.requirements, raw.response.data.requirement); a.equal(j.jdComplete, false);
    const blank = b.collectAvailable([page(site, 1, [post])], site, [detail(site, post, { duty: '' })]); a.equal(b.normalizeRecord(blank.jobs[0], site).duty, post.duty);
    const identical = b.collectAvailable([page(site, 1, [post])], site, [detail(site, post, { requirement: post.duty })]);
    a.equal(b.normalizeRecord(identical.jobs[0], site).duty, b.normalizeRecord(identical.jobs[0], site).requirements);
  }
  for (const [type, label] of [[10, '应届生'], [20, '实习生'], [30, '日常实习生'], [40, '技术大咖']]) {
    const p = { ...row(campus), job_type: type, job_type_descr: label }, r = b.collectAvailable([page(campus, 1, [p])], campus), j = b.normalizeRecord(r.jobs[0], campus);
    a.equal(r.total, 1); a.equal(j.talentPlan, null); a.equal(j.employment, [20, 30].includes(type) ? 'internship' : null);
    a.deepEqual(j.channels, [20, 30].includes(type) ? [] : ['campus']);
  }
});
test('TME evidence rejects scope, HTTP/business/metadata and detail identity tampering, safe empty is never a clearing snapshot', () => {
  const p = row(), original = b.collectAvailable([page(social, 1, [p])], social, [detail(social, p)]);
  for (const mutate of [r => r.verification.key = 'tme', r => r.verification.version++, r => r.verification.complete = true,
    r => r.verification.pages[0].request.body.ss = 10, r => r.verification.pages[0].request.headers['User-Agent'] = 'spoof',
    r => r.verification.pages[0].request.body.keyword = 'AI', r => r.verification.pages[0].httpStatus = 403,
    r => r.verification.pages[0].response.code = 200, r => r.verification.pages[0].response.extra = true,
    r => r.verification.pages[0].response.data._meta.current_page = 2, r => r.verification.pages[0].response.data._meta.total_count = '124',
    r => r.verification.details[0].request.url += '&signature=fake', r => r.verification.details[0].request.headers.Cookie = 'secret',
    r => r.verification.details[0].response.data.id = '99999', r => r.verification.details[0].response.data.requirement = null,
    r => r.verification.details[0].response.data.extraJD = 'unmapped', r => r.jobs[0].post.name = 'invented', r => r.jobs[0].detail.response.data.requirement = 'invented']) {
    const bad = JSON.parse(JSON.stringify(original)); mutate(bad); a.throws(() => b.validateEvidence(bad.verification, bad.jobs, social));
  }
  a.throws(() => b.collectAvailable([page(social, 1, [], 0)], social), /zero cannot clear/);
  a.throws(() => b.collectAvailable([page(social, 1, [{ ...p, id: 13128 }])], social), /zero cannot clear/);
});
test('TME native pagination follows page_count despite short or duplicate pages; first nonempty facts survive', () => {
  const p = row(), r = b.collectAvailable([page(social, 1, [p], 240), page(social, 2, [{ ...p, duty: '' }, row(social, '15018')], 230), page(social, 3, [], 0)], social);
  a.equal(r.total, 2); a.equal(b.normalizeRecord(r.jobs[0], social).duty, p.duty); a.match(r.issues.join(';'), /重复官方id.*240→230→0/);
  a.throws(() => b.collectAvailable([...r.verification.pages, page(social, 4, [row()])], social), /extra page/);
  a.ok(Object.isFrozen(r.jobs[0].post));
});
test('TME serial unsigned requests include actual native detail time; preserve body completion and stop once on refusal', async () => {
  for (const failure of ['none', 'pageHTTP', 'detailHTTP', 'business', 'identity', 'JSON']) {
    let clock = 1791446505511, busy = false; const calls = [], post = row();
    const r = await b.fetchAvailable(social, { now: () => clock, sleep: async ms => { a.equal(busy, false); a.equal(ms, 200); clock += ms; }, fetchImpl: async (url, options) => {
      a.equal(busy, false); busy = true; calls.push(url); a.ok(options.signal instanceof AbortSignal); a.equal(options.redirect, 'error');
      for (const k of ['Cookie', 'User-Agent', 'X-XSRF-TOKEN']) a.equal(Object.hasOwn(options.headers, k), false);
      const isDetail = url.includes('/info?'), n = isDetail ? 0 : JSON.parse(options.body).page;
      if (failure === 'pageHTTP' && n === 2 || failure === 'detailHTTP' && isDetail) { busy = false; return { status: 403 }; }
      const response = isDetail ? detail(social, post).response : page(social, n, n === 1 ? [post] : [], 110).response;
      if (isDetail && failure === 'business') response.code = '403'; if (isDetail && failure === 'identity') response.data.id = '9999';
      return { status: 200, json: async () => { await Promise.resolve(); busy = false; if (isDetail && failure === 'JSON') throw new SyntaxError('bad JSON'); return response; } };
    } });
    a.equal(r.complete, false); a.equal(r.total, 1); a.equal(b.validateEvidence(r.verification, r.jobs, social).total, 1);
    a.equal(calls.length, failure === 'pageHTTP' ? 2 : 3); a.equal(r.jobs[0].detail !== null, failure === 'none');
    if (failure !== 'none') a.match(r.issues.join(';'), /请求停止/);
  }
});
test('TME page/source safety caps retain available records without fake zero or complete', async () => {
  const post = row(); let calls = 0, clock = 1;
  const r = await b.fetchAvailable(social, { maxPages: 1, now: () => clock, sleep: async ms => { clock += ms; }, fetchImpl: async (url) => {
    calls++; return { status: 200, json: async () => { clock = 900001; return page(social, 1, [post], 124).response; } };
  } }); a.equal(calls, 1); a.equal(r.total, 1); a.equal(r.complete, false); a.match(r.issues.join(';'), /安全上限.*详情待补/);
  for (const maxPages of [0, 201, 1.5]) await a.rejects(b.fetchAvailable(social, { maxPages, fetchImpl: () => a.fail('no request') }), /limits/);
});
test('TME START spacing subtracts fully consumed response time, not adding a second fixed post-body delay', async () => {
  let clock = 1791446505511, busy = false; const starts = [], delays = [], p = row();
  const r = await b.fetchAvailable(social, { now: () => clock, sleep: async ms => { a.equal(busy, false); delays.push(ms); clock += Math.max(1, ms - 1); }, fetchImpl: async (url, options) => {
    a.equal(busy, false); busy = true; starts.push(clock); const isDetail = url.includes('/info?');
    return { status: 200, json: async () => { clock += 75; busy = false; return isDetail ? detail(social, p).response : page(social, 1, [p]).response; } };
  } }); a.equal(r.total, 1); a.deepEqual(delays, [125, 1], 'early timer wake must recheck START gap'); a.equal(starts[1] - starts[0], 200); a.equal(b.normalizeRecord(r.jobs[0], social).jdComplete, false);
});
test('TME atomic available envelope preserves old output on initial refusal/zero and retains requirements on success', async t => {
  const fs = require('node:fs'), os = require('node:os'), path = require('node:path'), dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ande-tme-portal-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true })); const file = path.join(dir, 'candidate.json'); fs.writeFileSync(file, 'old real candidate');
  for (const response of [{ status: 403 }, { status: 200, json: async () => page(social, 1, [], 0).response }]) {
    await a.rejects(b.run([JSON.stringify(social), file], { fetchImpl: async () => response })); a.equal(fs.readFileSync(file, 'utf8'), 'old real candidate'); a.deepEqual(fs.readdirSync(dir), ['candidate.json']);
  }
  const p = row(), written = await b.run([JSON.stringify(social), file], { sleep: async () => {}, fetchImpl: async url => ({ status: 200, json: async () => url.includes('/info?') ? detail(social, p).response : page(social, 1, [p]).response }) });
  a.equal(written.mode, 'custom'); a.equal(written.complete, false); a.equal(b.normalizeRecord(written.jobs[0], social).requirements, '  List<T> &amp; 同文  要求\n');
  a.deepEqual(JSON.parse(fs.readFileSync(file, 'utf8')), written); a.deepEqual(fs.readdirSync(dir), ['candidate.json']);
});
const proofRoot = '/Users/nozomi/lab/wheres-my-job-work/third-batch-20261008T071347946Z';
for (const [site, count] of [[campus, 146], [social, 124]]) {
  const fs = require('node:fs'), file = proofRoot + '/collections/' + site.key + '.json';
  test('TME offline current first-party broad list ' + site.key + ' retains all unique native records', { skip: !fs.existsSync(file) }, () => {
    const raw = JSON.parse(fs.readFileSync(file, 'utf8')), r = b.collectAvailable(raw.pages, site); a.equal(r.total, count); a.equal(r.complete, false); a.deepEqual(r.verification.pages, raw.pages);
    if (site.track === 'campus') a.deepEqual([...new Set(r.jobs.map(j => j.post.job_type))].sort((x, y) => x - y), [10, 20, 30, 40]);
    for (const job of r.jobs) { const j = b.normalizeRecord(job, site); a.equal(j.title, job.post.name); a.equal(j.duty, job.post.duty); a.equal(j.date, null); a.equal(j.talentPlan, null); a.equal(j.jdComplete, false); }
  });
}
