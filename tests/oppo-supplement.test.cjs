'use strict';
const test = require('node:test'), a = require('node:assert/strict');
const fs = require('node:fs'), os = require('node:os'), path = require('node:path');
const b = require('../crawler/lib/custom/oppo_portal');
const [, social] = b.PROFILES;
const dailyBody = { pageNum: 1, pageSize: 10, publishName: '', workCityCodeList: [], jobTypeList: [], recruitTypeList: ['OFFEN-RECRUITMENT'], shareId: '' };
const dailyUrl = 'https://career.oppo.com/official/oppo/recruitment/post?recruitType=OFFEN-RECRUITMENT';
const extended = { ...social, batch: '社会招聘与日常实习（官网当前两个公开渠道）', query: { daily: dailyBody } };
const baseCompletedAt = '2026-10-08T09:04:31.161Z', dailyCompletedAt = '2026-10-08T14:06:16.176Z', dictCompletedAt = '2026-10-08T07:21:31.363Z';
function row(scope = 'social', id = scope === 'social' ? '2072618621932081153' : '1989260677351657473') {
  return { positionId: id, publishName: '  官网完整标题  ', jobNo: '103802', jobCode: 'J251114000002', jobType: 'DATA', workCityName: '上海市,上海市',
    jobDuty: '  List<T> &amp; <b>TEXT</b>\r\n  空白  \n', workRequire: '  要求\n', jobDirectionList: null,
    recruitType: scope === 'social' ? 'SOCIAL-RECRUITMENT' : 'OFFEN-RECRUITMENT', recruitTypeName: scope === 'social' ? '社招' : '日常实习生招聘', publishDate: '2026-09-22' };
}
function page(scope, posts = [row(scope)], index = 1, total = posts.length, pages = 1) {
  return { request: { url: social.api, method: 'POST', headers: { Accept: 'application/json, text/plain, */*', Referer: scope === 'social' ? social.url : dailyUrl, 'Content-Type': 'application/json;charset=UTF-8', Origin: social.origin }, body: { ...(scope === 'social' ? social.body : dailyBody), pageNum: index } }, httpStatus: 200,
    response: { code: '0', msg: 'success', data: { pageNum: index, pageSize: scope === 'social' ? 100 : 10, pages, total: String(total), list: posts } } };
}
function dictionary(scope = 'social') {
  return { request: { url: 'https://career.oppo.com/ats-candidate-api/open-api/enum/dictionaries?dictTypes=JOB-TYPE', method: 'GET', headers: { Accept: 'application/json, text/plain, */*', Referer: scope === 'social' ? social.url : dailyUrl }, body: null }, httpStatus: 200,
    response: { code: '0', msg: 'success', data: [{ dictType: 'JOB-TYPE', dictValue: 'DATA', dictName: '大数据类' }] }, completedAt: dictCompletedAt };
}
function base(posts = [row()]) { return b.collectAvailable([page('social', posts)], social).verification; }
function sample(extra = {}) { return b.collectExtended(base(), extended, { baseCompletedAt, dailyCompletedAt, dailyPages: [page('daily')], jobTypeResponses: [dictionary()], ...extra }); }
test('OPPO daily scope is an exact, separate extension, never a replacement or legacy qualification', () => {
  a.deepEqual(b.PROFILES[2], extended); a.ok(Object.isFrozen(b.PROFILES[2].query.daily));
  a.equal(b.verifiedSource(structuredClone(extended)), true); a.equal(b.verifiedSource(structuredClone(social)), true);
  a.equal(b.PROFILES[1].body.pageSize, 100); a.deepEqual(b.PROFILES[1].body.recruitTypeList, ['SOCIAL-RECRUITMENT']);
  for (const patch of [{ query: undefined }, { query: { daily: { ...dailyBody, pageSize: 100 } } }, { body: dailyBody }, { url: dailyUrl }, { dictionaryApi: 'https://career.oppo.com/ats-candidate-api/open-api/enum/dictionaries?dictTypes=JOB-TYPE' }]) {
    const bad = { ...extended, ...patch }; a.equal(b.requiresVerification(bad), true); a.equal(b.verifiedSource(bad), false);
  }
});
test('OPPO v3 independently binds OFFEN native pages and JOB-TYPE while preserving legacy base, TEXT and material clocks', () => {
  const r = sample(); a.equal(r.complete, false); a.equal(r.total, 2); a.equal(r.verification.version, 3);
  a.deepEqual(r.verification.base, base()); a.equal(r.verification.baseCompletedAt, baseCompletedAt); a.equal(r.verification.dailyCompletedAt, dailyCompletedAt);
  a.equal(r.verification.jobTypeResponses[0].completedAt, dictCompletedAt); a.deepEqual(b.validateEvidence(r.verification, r.jobs, extended).jobs, r.jobs);
  a.deepEqual(r.jobs.map(j => j.scope), ['social', 'daily']);
  const [s, d] = r.jobs.map(j => b.normalizeRecord(j, extended));
  a.deepEqual([s.category, s.channels, s.employment], ['大数据类', ['social'], null]);
  a.deepEqual([d.id, d.category, d.channels, d.employment, d.city], ['1989260677351657473', '大数据类', [], 'internship', '上海市,上海市']);
  a.equal(d.url, 'https://career.oppo.com/official/oppo/recruitment/post/1989260677351657473?recruitType=OFFEN-RECRUITMENT');
  a.equal(s.url, 'https://career.oppo.com/official/oppo/recruitment/post/2072618621932081153?recruitType=SOCIAL-RECRUITMENT');
  a.equal(d.duty, row('daily').jobDuty); a.equal(d.requirements, row('daily').workRequire); a.equal(d.description, '岗位职责\n  List<T> &amp; <b>TEXT</b>\r\n  空白  \n\n任职要求\n  要求\n');
  a.deepEqual([d.date, d.dateKind, d.talentPlan, d.sourceStatus, d.jdComplete], [null, null, null, null, false]);
  a.equal(b.normalizeRecord(b.collectAvailable([page('social')], social).jobs[0], social).category, '');
  a.throws(() => b.validateEvidence(r.verification, r.jobs, social)); a.throws(() => b.validateEvidence(base(), b.collectAvailable([page('social')], social).jobs, extended));
  a.match(b.portalNotice(extended), /日常实习/); a.doesNotMatch(b.portalNotice(extended), /日常实习另入口未核验/);
});
test('OPPO v3 rejects wrong HTTP/business types, native URL/scope/ID bindings, dictionary kind and fabricated jobs without widening v2', () => {
  for (const change of [v => v.dailyPages[0].httpStatus = 403, v => v.dailyPages[0].response.code = 0, v => v.dailyPages[0].response.msg = 'ok',
    v => v.dailyPages[0].request.headers.Referer = social.url, v => v.dailyPages[0].request.url = social.detailApi, v => v.dailyPages[0].request.body.pageSize = 100,
    v => v.dailyPages[0].response.data.pageSize = 100, v => v.dailyPages[0].request.headers['User-Agent'] = 'browser',
    v => v.jobTypeResponses[0].request.url = 'https://careers.oppo.com/openapi/enum/dictionaries?dictTypes=JOB-TYPE',
    v => v.jobTypeResponses[0].request.headers.Referer += '/1989260677351657473', v => v.jobTypeResponses[0].response.code = 0,
    v => v.jobTypeResponses[0].response.data[0].dictType = 'EDUCATION', v => v.jobTypeResponses[0].response.data[0].dictName = 1,
    v => v.base.pages[0].request.body.recruitTypeList = ['OFFEN-RECRUITMENT'], v => v.baseCompletedAt = 'now']) {
    const r = JSON.parse(JSON.stringify(sample())); change(r.verification); a.throws(() => b.validateEvidence(r.verification, r.jobs, extended));
  }
  for (const change of [j => j.scope = 'social', j => j.post.positionId = j.post.jobNo, j => j.jobTypes[0].dictName = 'invented']) {
    const r = JSON.parse(JSON.stringify(sample())); change(r.jobs[1]); a.throws(() => b.validateEvidence(r.verification, r.jobs, extended));
  }
  const wrong = [{ ...row('daily'), recruitType: 'SOCIAL-RECRUITMENT' }, { ...row('daily'), positionId: 1989260677351657473 }, { ...row('daily'), positionId: '001' }];
  for (const post of wrong) { const r = sample({ dailyPages: [page('daily', [post])] }); a.equal(r.total, 1); a.match(r.issues.join(';'), /日常列表记录未应用/); }
  const legacy = b.collectAvailable([page('social')], social), injected = { ...legacy.jobs[0], scope: 'daily', jobTypes: dictionary().response.data };
  a.throws(() => b.normalizeRecord(injected, social)); a.throws(() => b.collectAvailable([page('daily')], social));
});
test('OPPO keeps first SOC identity on OFFEN collision and unknown dictionary/label facts conservative', () => {
  const collision = { ...row('daily', row().positionId), jobDuty: 'do not merge the other scope body' };
  const r = sample({ dailyPages: [page('daily', [collision, row('daily')])] });
  a.equal(r.total, 2); a.equal(r.jobs[0].post.jobDuty, row().jobDuty); a.match(r.issues.join(';'), /碰撞.*未应用/);
  const unknown = sample({ dailyPages: [page('daily', [{ ...row('daily'), jobType: 'FUTURE', recruitTypeName: '未知标签' }])] });
  const j = b.normalizeRecord(unknown.jobs[1], extended); a.equal(j.category, ''); a.equal(j.employment, null); a.deepEqual(j.channels, []);
  const noDict = sample({ jobTypeResponses: [] }); a.ok(noDict.jobs.every(j => b.normalizeRecord(j, extended).category === ''));
  a.match(noDict.issues.join(';'), /职能字典未取得/);
});
test('OPPO new CLI fetches SOC and necessary details then OFFEN page10 and dictionary, with one refusal latch and no spoofing', async () => {
  let clock = 0, busy = false; const calls = [], starts = [], s = row();
  s.jobDirectionList = [{ jobId: s.positionId, directionName: '已得方向', jobDuty: null, workRequire: null }];
  const detailResponse = { code: '0', msg: 'success', data: { ...s, jobDirectionList: [{ ...s.jobDirectionList[0], jobDuty: '  完整方向\n', workRequire: '方向要求' }] } };
  const responses = [page('social', [s]).response, detailResponse, page('daily').response, dictionary('daily').response];
  const options = { now: () => clock, sleep: async ms => { a.equal(busy, false); clock += ms; }, fetchImpl: async (url, o) => {
    a.equal(busy, false); busy = true; calls.push({ url, ...o, body: o.body && JSON.parse(o.body) }); starts.push(clock);
    a.equal(o.redirect, 'error'); a.ok(o.signal instanceof AbortSignal); a.ok(!Object.hasOwn(o.headers, 'User-Agent')); a.ok(!Object.hasOwn(o.headers, 'Cookie'));
    return { status: 200, json: async () => { await Promise.resolve(); busy = false; return responses[calls.length - 1]; } };
  } };
  const r = await b.fetchAvailable(extended, options); a.equal(r.total, 2); a.equal(r.verification.version, 3);
  a.deepEqual(calls.map(c => c.method), ['POST', 'GET', 'POST', 'GET']); a.equal(calls[0].body.pageSize, 100); a.deepEqual(calls[2].body, dailyBody);
  a.equal(calls[2].headers.Referer, dailyUrl); a.equal(calls[3].url, 'https://career.oppo.com/ats-candidate-api/open-api/enum/dictionaries?dictTypes=JOB-TYPE');
  a.ok(starts.slice(1).every((v, i) => v - starts[i] >= 200)); a.equal(b.validateEvidence(r.verification, r.jobs, extended).total, 2);
  a.ok(b.normalizeRecord(r.jobs[0], extended).description.includes('  完整方向\n'));
});
test('OPPO all collection phases stop the whole extended source at the first HTTP or typed business refusal', async () => {
  const s = row(); s.jobDirectionList = [{ jobId: s.positionId, directionName: '方向', jobDuty: null, workRequire: null }];
  const good = [page('social', [s]).response, { code: '0', msg: 'success', data: s }, page('daily').response, dictionary('daily').response];
  for (let failure = 0; failure < 4; failure++) {
    let clock = 0, calls = 0;
    const options = { now: () => clock, sleep: async ms => { clock += ms; }, fetchImpl: async () => {
      const index = calls++; return { status: index === failure && failure !== 3 ? 403 : 200, json: async () => index === failure ? { ...good[index], code: 0 } : good[index] };
    } };
    if (failure === 0) await a.rejects(b.fetchAvailable(extended, options), /HTTP 403/);
    else { const r = await b.fetchAvailable(extended, options); a.equal(r.total, failure < 3 ? 1 : 2); a.match(r.issues.join(';'), /请求停止/); a.equal(b.validateEvidence(r.verification, r.jobs, extended).total, r.total); }
    a.equal(calls, failure + 1);
  }
  const stopped = { ...page('daily'), httpStatus: 429, response: null, error: 'OPPO: native HTTP 429' };
  const r = sample({ dailyPages: [], jobTypeResponses: [], stopped }); a.equal(r.total, 1);
  a.throws(() => sample({ dailyPages: [], stopped }), /after daily list refusal/);
  a.throws(() => sample({ stopped: { ...page('daily', [row('daily')], 2), error: 'fake refusal' } }), /successful\/unbound/);
});
test('OPPO source page/900-second limits cover base and daily together', async () => {
  const pages = Array.from({ length: 200 }, (_, i) => page('social', [row()], i + 1, 1, 200));
  const largeBase = b.collectAvailable(pages, social).verification;
  a.throws(() => b.collectExtended(largeBase, extended, { dailyPages: [page('daily')] }), /page limit/);
  let clock = 0, calls = 0;
  const r = await b.fetchAvailable(extended, { now: () => clock, sleep: async ms => { clock += ms; }, fetchImpl: async () => {
    calls++; return { status: 200, json: async () => { clock = 900001; return page('social').response; } };
  } });
  a.equal(calls, 1); a.equal(r.total, 1); a.match(r.issues.join(';'), /安全.*时限|时间安全上限/); a.equal(r.verification.dailyPages.length, 0);
});
test('OPPO complete offline seeds re-run atomically without requests or refreshing acquired clocks; canonical projection has 17 fields', async t => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ande-oppo-extended-')); t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const file = path.join(dir, 'candidate.json'); fs.writeFileSync(file, 'old');
  await a.rejects(b.run([JSON.stringify(extended), file], { fetchImpl: async () => ({ status: 403 }) })); a.equal(fs.readFileSync(file, 'utf8'), 'old');
  const r = await b.run([JSON.stringify(extended), file], { base: base(), baseCompletedAt, dailyCompletedAt, dailyPages: [page('daily')], jobTypeResponses: [dictionary()], fetchImpl: () => a.fail('must not refetch acquired material') });
  a.equal(r.verification.baseCompletedAt, baseCompletedAt); a.equal(r.verification.dailyCompletedAt, dailyCompletedAt); a.equal(r.verification.jobTypeResponses[0].completedAt, dictCompletedAt);
  a.deepEqual(JSON.parse(fs.readFileSync(file, 'utf8')), r); a.deepEqual(fs.readdirSync(dir), ['candidate.json']);
  const jobs = require('../crawler/publish').normalizeJobs(r.jobs, extended, { available: true });
  a.equal(jobs.length, 2); a.deepEqual(Object.keys(jobs[1]).sort(), ['category','channels','city','company','date','dateKind','description','duty','employment','id','jdComplete','requirements','sourceKey','sourceStatus','talentPlan','title','url']);
  a.equal(jobs[1].sourceKey, 'oppo_social'); a.equal(jobs[1].company, 'OPPO'); a.equal(jobs[1].id, 'oppo_social:1989260677351657473'); a.deepEqual(jobs[1].channels, []); a.equal(jobs[1].employment, 'internship');
});
const proofBase = '/Users/nozomi/lab/wheres-my-job-work/third-batch-20261008T071347946Z';
const nativeDailyFile = proofBase + '/completion-20261008T133155216Z/oppo-daily-native.json';
test('OPPO current acquired Node OFFEN plus independent JOB-TYPE extends all 155 SOC records and retains all eight direction details', { skip: !fs.existsSync(nativeDailyFile) }, () => {
  const read = file => JSON.parse(fs.readFileSync(proofBase + file, 'utf8'));
  const old = read('/collections/available-oppo_social.json'), material = read('/completion-20261008T133155216Z/oppo-daily-native.json');
  const { request, httpStatus, response, completedAt } = material;
  const entry = read('/observe-oppo-social/network.json').find(e => e.request.url.endsWith('dictionaries?dictTypes=JOB-TYPE'));
  const dict = { request: { ...entry.request, headers: { Accept: entry.request.headers.Accept, Referer: entry.request.headers.Referer } }, httpStatus: entry.response.httpStatus, response: entry.nativeJSON, completedAt: read('/observe-oppo-social/report.json').finishedAt };
  const r = b.collectExtended(old.verification, extended, { baseCompletedAt, dailyCompletedAt: completedAt, dailyPages: [{ request, httpStatus, response }], jobTypeResponses: [dict] });
  a.equal(r.total, 165); a.equal(r.verification.dailyCompletedAt, '2026-10-08T14:06:16.176Z'); a.equal(b.validateEvidence(r.verification, r.jobs, extended).total, 165);
  a.equal(r.jobs.filter(j => j.detail).length, 8); a.equal(r.jobs.reduce((sum, j) => sum + (j.detail?.jobDirectionList?.length ?? 0), 0), 21);
  for (const [i, oldJob] of old.jobs.entries()) {
    const before = b.normalizeRecord(oldJob, social), after = b.normalizeRecord(r.jobs[i], extended);
    a.ok(after.category); delete after.category; delete before.category; a.deepEqual(after, before);
  }
  for (const job of r.jobs.slice(155)) { const j = b.normalizeRecord(job, extended); a.equal(j.employment, 'internship'); a.deepEqual(j.channels, []); a.ok(j.category); a.match(j.url, /\/post\/[1-9]\d*\?recruitType=OFFEN-RECRUITMENT$/); a.equal(j.duty, job.post.jobDuty); a.equal(j.requirements, job.post.workRequire); }
});
