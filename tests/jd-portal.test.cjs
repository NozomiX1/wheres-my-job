'use strict';
const test = require('node:test'), a = require('node:assert/strict');
const fs = require('node:fs'), os = require('node:os'), path = require('node:path');
const b = require('../crawler/lib/custom/jd_portal');
const [campus, social] = b.PROFILES;
test('JD fixed 100-grain campus/social profiles cannot lose scope or downgrade', () => {
  a.equal(campus.url, 'https://campus.jd.com/#/jobs');
  a.equal(campus.body.pageIndex, 0); a.equal(campus.body.pageSize, 100);
  a.deepEqual(campus.body.parameter, { positionName: '', planIdList: [], jobDirectionCodeList: [], workCityCodeList: [], positionDeptList: [] });
  a.equal(social.url, 'https://zhaopin.jd.com/web/job/job_info_list/3');
  a.equal(social.body.pageIndex, '1'); a.equal(social.body.pageSize, '100');
  for (const p of b.PROFILES) {
    a.ok(Object.isFrozen(p.body)); a.equal(b.verifiedSource(structuredClone(p)), true);
    for (const patch of [{ key: 'alias' }, { adapter: undefined }, { company: 'other' }, { ats: 'moka' }, { url: p.url + '?jobSearch=AI' }, { body: {} }, { listJD: false }]) {
      const bad = { ...p, ...patch }; a.equal(b.requiresVerification(bad), true); a.equal(b.verifiedSource(bad), false);
    }
  }
  a.equal(b.requiresVerification({ api: 'POST https://CAMPUS.JD.COM/api/wx/position/page?type=present' }), true);
  a.equal(b.requiresVerification({ url: 'relative' }), true);
  a.equal(b.requiresVerification({ url: 'https://example.com' }), false);
});
function row(p = campus, n = 1) {
  return p.track === 'campus' ? { publishId: 9260 + n - 1, positionName: '  TGT 财务/实习 原标题  ', workContent: '<p>List&lt;T&gt; &amp; 完整</p>第二行\n全部', qualification: '<b>任职要求</b> &lt;literal&gt;',
    requirementVoList: [{ workCity: '北京市-北京市' }, { workCity: '上海市-上海市' }], jobCategory: '物流防损类', publishTime: 1786938172000, positionType: null, planName: null } :
    { id: 177114 + n - 1, positionId: 225740 + n - 1, requirementId: 225814 + n - 1, positionName: '内部标题不可映射', positionNameOpen: '  社会完整外部标题  ', workContent: '第一行\n<b>第二行</b>', qualification: '实体 &amp; 要求', jobType: '运营类', workCity: '北京市', formatPublishTime: '2026-10-08' };
}
function page(p, n, posts, total = posts.length) {
  const headers = { Accept: 'application/json, text/plain, */*', Referer: p.track === 'campus' ? p.origin + '/' : p.url,
    'Content-Type': p.track === 'campus' ? 'application/json;charset=UTF-8' : 'application/x-www-form-urlencoded; charset=UTF-8', Origin: p.origin };
  return { request: { url: p.api, method: 'POST', headers, body: { ...p.body, pageIndex: p.track === 'campus' ? n : String(n) } }, httpStatus: 200,
    response: p.track === 'campus' ? { success: true, body: { totalNumber: total, pageCount: 0, items: posts } } : posts };
}
test('JD current publishId/requirementId, external titles, HTML renderer, honest URLs and unknown facts', () => {
  for (const p of b.PROFILES) {
    const post = row(p), n = p.track === 'campus' ? 0 : 1, r = b.collectAvailable([page(p, n, [post])], p), j = b.normalizeRecord(r.jobs[0], p);
    a.equal(r.complete, false); a.equal(j.jdComplete, false); a.equal(r.total, 1); a.deepEqual(r.jobs[0], { post });
    a.equal(j.id, p.track === 'campus' ? '9260' : '225814'); a.equal(j.title, p.track === 'campus' ? post.positionName : post.positionNameOpen);
    a.equal(j.url, p.track === 'campus' ? 'https://campus.jd.com/#/details?id=9260' : 'https://zhaopin.jd.com/web/job/job_info_list/3');
    a.equal(j.duty, p.track === 'campus' ? 'List<T> & 完整\n第二行\n全部' : '第一行\n第二行');
    a.equal(j.requirements, p.track === 'campus' ? '任职要求 <literal>' : '实体 & 要求'); a.equal(j.description, '');
    a.equal(j.city, p.track === 'campus' ? '北京市-北京市/上海市-上海市' : '北京市'); a.equal(j.category, p.track === 'campus' ? '物流防损类' : '运营类');
    a.deepEqual([j.date, j.dateKind, j.employment, j.talentPlan, j.sourceStatus], [null, null, null, null, null]); a.equal(Object.hasOwn(j, 'company'), false);
    a.deepEqual(b.validateEvidence(r.verification, r.jobs, p).jobs, r.jobs);
    const empty = { ...post, workContent: null, qualification: '/' };
    a.equal(b.normalizeRecord({ post: empty }, p).duty, ''); a.equal(b.normalizeRecord({ post: empty }, p).requirements, '/');
  }
  a.match(b.portalNotice(social), /非唯一.*详情|不是唯一.*详情/); a.ok(!b.normalizeRecord({ post: row(social) }, social).url.includes('jobSearch'));
});
test('JD availability retains first duplicate, drift, invalid-record issues; missing fields and zero cannot clear', () => {
  const first = row(campus), duplicate = { ...first, workContent: '' }, bad = row(campus, 3); delete bad.qualification;
  const rows = Array.from({ length: 100 }, (_, i) => row(campus, i + 1)); rows[0] = first;
  const r = b.collectAvailable([page(campus, 0, rows, 124), page(campus, 1, [duplicate, bad, row(campus, 101)], 125)], campus);
  a.equal(r.total, 101); a.equal(r.jobs[0].post.workContent, first.workContent); a.match(r.issues.join(';'), /重复.*官方|重复官方/); a.match(r.issues.join(';'), /124→125/); a.match(r.issues.join(';'), /记录未应用/);
  a.equal(r.verification.pages[1].response.body.items[1].publishId, bad.publishId);
  a.throws(() => b.collectAvailable([page(campus, 0, [], 0)], campus), /zero cannot clear/);
  a.throws(() => b.collectAvailable([page(social, 1, [{ ...row(social), requirementId: null }])], social), /zero cannot clear/);
  a.throws(() => b.validateJobs([r.jobs[0], r.jobs[0]], campus), /duplicate/);
  const detached = row(campus), input = page(campus, 0, [detached]); const frozen = b.collectAvailable([input], campus); detached.workContent = 'changed';
  a.notEqual(frozen.jobs[0].post.workContent, detached.workContent); a.ok(Object.isFrozen(frozen.jobs[0].post));
});
test('JD evidence binds native request/header/body/status and all raw facts, rejects generic/forged success', () => {
  const original = b.collectAvailable([page(campus, 0, [row(campus)])], campus);
  for (const mutate of [r => r.verification.version = 1, r => r.verification.policy = 'complete', r => r.verification.key = social.key,
    r => r.verification.pages[0].request.body.parameter.planIdList = [1], r => r.verification.pages[0].request.headers['User-Agent'] = 'forged',
    r => r.verification.pages[0].request.body.pageSize = 10, r => r.verification.pages[0].httpStatus = 403, r => r.verification.pages[0].response.success = 'true',
    r => r.verification.pages[0].response.body.totalNumber = null, r => r.jobs[0].post.workContent = 'invented', r => r.jobs[0].post.publishTime++]) {
    const bad = JSON.parse(JSON.stringify(original)); mutate(bad); a.throws(() => b.validateEvidence(bad.verification, bad.jobs, campus));
  }
});
test('JD native Node serial starts/body completion, partial refusals/no retries, caps and atomic file preservation', async t => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ande-jd-test-')); t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  let clock = 0, busy = false, calls = 0; const starts = [];
  const options = { now: () => clock, sleep: async ms => { a.equal(busy, false); clock += ms; }, fetchImpl: async (url, o) => {
    a.equal(busy, false); starts.push(clock); busy = true; calls++; a.equal(url, campus.api); a.equal(o.redirect, 'error'); a.ok(o.signal instanceof AbortSignal);
    a.ok(!Object.hasOwn(o.headers, 'User-Agent')); a.ok(!Object.hasOwn(o.headers, 'Cookie')); a.equal(JSON.parse(o.body).pageSize, 100);
    return { status: 200, json: async () => { await Promise.resolve(); busy = false; return page(campus, 0, Array.from({ length: 100 }, (_, i) => row(campus, i + 1)), 20000).response; } };
  }, maxPages: 2 };
  const capped = await b.fetchAvailable(campus, options); a.equal(calls, 2); a.equal(capped.total, 100); a.ok(starts[1] - starts[0] >= 200); a.match(capped.issues.join(';'), /安全上限/);
  for (const kind of ['HTTP', 'business', 'JSON']) {
    calls = 0; const r = await b.fetchAvailable(campus, { sleep: async () => {}, fetchImpl: async () => {
      calls++; if (calls === 1) return { status: 200, json: async () => page(campus, 0, Array.from({ length: 100 }, (_, i) => row(campus, i + 1)), 201).response };
      return { status: kind === 'HTTP' ? 429 : 200, json: async () => { if (kind === 'JSON') throw new Error('JSON failed'); return { success: false }; } };
    } });
    a.equal(calls, 2); a.equal(r.total, 100); a.match(r.issues.join(';'), /请求停止/); a.equal(b.validateEvidence(r.verification, r.jobs, campus).total, 100);
  }
  const file = path.join(dir, 'candidate.json'); fs.writeFileSync(file, 'old');
  await a.rejects(b.run([JSON.stringify(social), file], { fetchImpl: async () => ({ status: 403 }) })); a.equal(fs.readFileSync(file, 'utf8'), 'old');
  const saved = await b.run([JSON.stringify(social), file], { fetchImpl: async (url, o) => {
    if (url === 'https://zhaopin.jd.com/web/job/job_count') {
      a.equal(o.body, 'workCityJson=%5B%5D&jobTypeJson=%5B%5D&jobSearch=&depTypeJson=%5B%5D'); return { status: 200, json: async () => 1 };
    }
    a.equal(url, social.api); a.equal(o.body, 'pageIndex=1&pageSize=100&workCityJson=%5B%5D&jobTypeJson=%5B%5D&jobSearch=&depTypeJson=%5B%5D'); return { status: 200, json: async () => [row(social)] };
  } }); a.equal(saved.mode, 'custom'); a.equal(saved.complete, false); a.deepEqual(JSON.parse(fs.readFileSync(file, 'utf8')), saved); a.deepEqual(fs.readdirSync(dir), ['candidate.json']);
});
const proofBase = '/path/to/wheres-my-job-work/third-batch-20261008T071347946Z';
for (const p of b.PROFILES) test('JD offline current captured list pages ' + p.key, { skip: !fs.existsSync(proofBase + '/collections/' + p.key + '.json') }, () => {
  const raw = JSON.parse(fs.readFileSync(proofBase + '/collections/' + p.key + '.json', 'utf8'));
  const r = b.collectAvailable(raw.pages, p, raw.issues, raw.stopped); a.ok(r.total > 0); a.equal(r.complete, false);
  a.deepEqual(r.verification.pages, raw.pages); a.equal(b.validateEvidence(r.verification, r.jobs, p).total, r.total);
  for (const job of r.jobs) { const j = b.normalizeRecord(job, p); a.equal(j.jdComplete, false); a.equal(j.title, p.track === 'campus' ? job.post.positionName : job.post.positionNameOpen); }
});
