'use strict';
const test = require('node:test'), a = require('node:assert/strict');
const fs = require('node:fs'), os = require('node:os'), path = require('node:path');
const b = require('../crawler/lib/custom/oppo_portal');
const [campus, social] = b.PROFILES;
function row(p = campus, n = 1) {
  return p.track === 'campus' ? { idProjPosition: 1769 + n - 1, idRecruitPosition: 9000 + n, projectPositionId: 1783 + n - 1, positionName: '  Intern/博士 财务 完整标题  ', positionDesc: '  List<T> &amp; <b>字面</b>\r\n  空白  \n', positionRequire: '  独立要求原文\n',
    knowledgeSkill: '  知识技能原文\n', aiCapabilityLevelDesc: '  AI原文\n', bonusItem: '  加分原文\n', workCityName: '深圳市,东莞市', positionTypeName: 'AI/算法类', recruitmentType: 'Intern', releaseTime: '2026-07-15' } :
    { positionId: String(2072618621932081153n + BigInt(n - 1)), jobNo: '101060', publishName: '  外部完整标题  ', jobName: '内部职位不可映射', jobDuty: '  List<T> &amp; <b>字面</b>\n', workRequire: '要求\n', workCityName: '深圳市', jobType: 'DESIGN', recruitType: 'SOCIAL-RECRUITMENT', jobSecret: 'real-sensitive-secret',
      jobDirectionList: [{ id: '2082791019143028738', jobId: String(2072618621932081153n + BigInt(n - 1)), directionName: '原方向', workCityName: null, jobDuty: null, workRequire: null }] };
}
function page(p, n, posts, total = posts.length, pages = 1) {
  return { request: { url: p.api, method: 'POST', headers: { Accept: 'application/json, text/plain, */*', Referer: p.url, 'Content-Type': 'application/json;charset=UTF-8', Origin: p.origin }, body: { ...p.body, pageNum: n } }, httpStatus: 200,
    response: { code: p.track === 'campus' ? 0 : '0', data: p.track === 'campus' ? { records: posts, total, size: 100, current: n, pages } : { list: posts, total: String(total), pageSize: 100, pageNum: n, pages }, msg: 'success' } };
}
function culture(post = row()) { return { request: { url: 'https://careers.oppo.com/openapi/system/dictionary/queryList?code=CULTURAL_COMPATIBILITY', method: 'GET', headers: { Accept: 'application/json, text/plain, */*', Referer: 'https://careers.oppo.com/university/oppo/campus/post/' + post.idProjPosition }, body: null }, httpStatus: 200,
  response: { code: 0, data: [{ groupCode: 'CULTURAL_COMPATIBILITY', status: 0, itemName: '不优先的旧文' }, { groupCode: 'CULTURAL_COMPATIBILITY', status: 1, itemName: '  文化原文 &amp; <b>TEXT</b>\n' }], msg: 'success' } }; }
function detail(post = row(social)) { return { request: { url: 'https://career.oppo.com/ats-candidate-api/open-api/position/queryPosition?positionId=' + post.positionId, method: 'GET', headers: { Accept: 'application/json, text/plain, */*', Referer: social.url.replace('?recruitType=', '/' + post.positionId + '?recruitType=') }, body: null }, httpStatus: 200,
  response: { code: '0', data: { ...post, jobSecret: 'different-secret', jobDirectionList: [{ ...post.jobDirectionList[0], workCityName: '深圳市', jobDuty: '  方向全部 List<T> &amp;\n', workRequire: '  方向任职全部\n', aiCapabilityLevelDesc: '  方向AI\n' }] }, msg: 'success' } }; }
function sample(p = campus) { const post = row(p); return b.collectAvailable([page(p, 1, [post])], p, [], null, p.track === 'campus' ? { dictionaryResponses: [culture(post)] } : { details: [detail(post)] }); }
test('OPPO immutable broad 100 profiles remove legacy project30 and keep necessary social channel without generic downgrade', () => {
  a.deepEqual(campus.body, { pageNum: 1, pageSize: 100, positionName: '', projectList: [], positionTypeList: [], workCityCodeList: [], shareId: '' });
  a.deepEqual(social.body.recruitTypeList, ['SOCIAL-RECRUITMENT']); a.equal(social.body.pageSize, 100);
  for (const p of b.PROFILES) {
    a.ok(Object.isFrozen(p.body)); a.equal(b.verifiedSource(structuredClone(p)), true);
    for (const patch of [{ key: 'alias' }, { adapter: undefined }, { company: 'other' }, { ats: 'moka' }, { body: { ...p.body, idRecruitProject: 30 } }, { listJD: false }, { origin: 'https://example.com' }]) {
      const bad = { ...p, ...patch }; a.equal(b.requiresVerification(bad), true); a.equal(b.verifiedSource(bad), false); a.throws(() => b.validateJobs([], bad));
    }
  }
  a.equal(b.requiresVerification({ api: 'POST https://CAREER.OPPO.COM/x' }), true); a.equal(b.requiresVerification({ detailApi: '%' }), true);
});
test('OPPO proved idProjPosition vs positionId routes, no jobNo fallback, all TEXT supplemental bodies/order without metadata invention', () => {
  const c = sample(), j = b.normalizeRecord(c.jobs[0], campus), post = c.jobs[0].post;
  a.equal(j.id, '1769'); a.equal(j.url, 'https://careers.oppo.com/university/oppo/campus/post/1769'); a.equal(j.title, post.positionName);
  a.equal(j.duty, post.positionDesc); a.equal(j.requirements, post.positionRequire); a.equal(j.category, 'AI/算法类'); a.equal(j.city, '深圳市,东莞市');
  for (const text of [post.positionDesc, post.positionRequire, post.knowledgeSkill, post.aiCapabilityLevelDesc, post.bonusItem, c.jobs[0].culture[1].itemName]) a.ok(j.description.includes(text));
  const headings = ['岗位职责', '任职要求', '知识技能要求', 'AI能力要求', '加分项', '文化匹配性']; a.ok(headings.every((h, i) => !i || j.description.indexOf(h) > j.description.indexOf(headings[i - 1])));
  a.deepEqual([j.date, j.dateKind, j.employment, j.talentPlan, j.sourceStatus], [null, null, null, null, null]); a.equal(j.jdComplete, false);
  const s = sample(social), sj = b.normalizeRecord(s.jobs[0], social); a.equal(sj.id, '2072618621932081153'); a.equal(sj.url, 'https://career.oppo.com/official/oppo/recruitment/post/2072618621932081153?recruitType=SOCIAL-RECRUITMENT');
  a.equal(sj.title, s.jobs[0].post.publishName); a.equal(sj.category, ''); a.ok(sj.description.includes(s.jobs[0].post.jobDuty)); a.ok(sj.description.includes('原方向\n深圳市\n岗位职责\n  方向全部 List<T> &amp;\n'));
  a.ok(sj.description.includes('任职要求\n  方向任职全部\n')); a.ok(sj.description.includes('AI能力要求\n  方向AI\n')); a.equal(sj.jdComplete, false);
  for (const r of [c, s]) { a.equal(r.complete, false); a.equal(r.verification.version, 2); a.equal(r.total, 1); a.deepEqual(b.validateEvidence(r.verification, r.jobs, r === c ? campus : social).jobs, r.jobs); }
});
test('OPPO credential keys only sanitized recursively BEFORE bind/persist; JD strings retain literal secrets/markup and native metadata', () => {
  const post = row(social); post.jobDuty += 'jobSecret=literal-original-text'; post.nested = { JobSecret: 'nested-secret', accessToken: 'token', text: 'real-sensitive-secret is JD literal' };
  const r = b.collectAvailable([page(social, 1, [post])], social); a.equal(post.jobSecret, 'real-sensitive-secret'); a.equal(r.jobs[0].post.jobSecret, '[REDACTED]');
  a.equal(r.jobs[0].post.nested.JobSecret, '[REDACTED]'); a.equal(r.jobs[0].post.nested.accessToken, '[REDACTED]'); a.equal(r.jobs[0].post.nested.text, post.nested.text); a.equal(r.jobs[0].post.jobDuty, post.jobDuty);
  a.strictEqual(r.jobs[0].post, r.verification.pages[0].response.data.list[0]); a.ok(Object.isFrozen(r.jobs[0].post.nested));
  const bad = JSON.parse(JSON.stringify(r)); bad.verification.pages[0].response.data.list[0].jobSecret = 'unsafe'; a.throws(() => b.validateEvidence(bad.verification, bad.jobs, social), /sanit/);
});
test('OPPO keeps Intern, doctor, future unknown types, first duplicate and total drift; invalid record issues and zero protection', () => {
  const first = row(), rows = Array.from({ length: 100 }, (_, i) => row(campus, i + 1)); const bad = row(campus, 103); delete bad.positionRequire;
  const r = b.collectAvailable([page(campus, 1, rows, 237, 3), page(campus, 2, [{ ...first, positionDesc: '' }, { ...row(campus, 101), recruitmentType: 'future' }, { ...row(campus, 102), recruitmentType: 'doctor' }, bad], 238, 3)], campus);
  a.equal(r.total, 102); a.equal(r.jobs[0].post.positionDesc, first.positionDesc); a.match(r.issues.join(';'), /237→238/); a.match(r.issues.join(';'), /记录未应用/); a.match(r.issues.join(';'), /重复官方/);
  a.throws(() => b.collectAvailable([page(campus, 1, [], 0, 0)], campus), /zero cannot clear/); a.throws(() => b.collectAvailable([page(social, 1, [{ ...row(social), positionId: 2072618621932081153 }])], social), /zero cannot clear/);
});
test('OPPO bound supplements cannot change source/request/IDs/secrets/JD; no fake complete or date authority', () => {
  for (const p of [campus, social]) {
    const original = sample(p);
    for (const change of [r => r.verification.version = 1, r => r.verification.policy = 'complete', r => r.verification.pages[0].httpStatus = 403,
      r => r.verification.pages[0].request.body.pageSize = 10, r => r.jobs[0].post.positionName = 'invented',
      r => r.verification.pages[0].request.headers.Cookie = 'secret', r => r.verification.pages[0].response.code = p.track === 'campus' ? '0' : 0]) {
      const bad = JSON.parse(JSON.stringify(original)); change(bad); a.throws(() => b.validateEvidence(bad.verification, bad.jobs, p));
    }
  }
  for (const change of [r => r.verification.details[0].request.url += '&jobNo=101060', r => r.verification.details[0].response.data.positionId = '1', r => r.jobs[0].detail.jobDirectionList[0].jobDuty = 'invented']) {
    const bad = JSON.parse(JSON.stringify(sample(social))); change(bad); a.throws(() => b.validateEvidence(bad.verification, bad.jobs, social));
  }
  const bad = JSON.parse(JSON.stringify(sample())); bad.verification.dictionaryResponses[0].request.headers.Referer += '?shareId=x'; a.throws(() => b.validateEvidence(bad.verification, bad.jobs, campus));
});
test('OPPO saved list seeds fetch ONLY missing culture/directions, serial starts/body completion and whole-source refusal latch', async () => {
  for (const p of [campus, social]) {
    let clock = 0, busy = false; const starts = [], urls = [], post = row(p);
    const options = { listPages: [page(p, 1, [post])], now: () => clock, sleep: async ms => { a.equal(busy, false); clock += ms; }, fetchImpl: async (url, o) => {
      a.equal(busy, false); busy = true; starts.push(clock); urls.push(url); a.equal(o.method, 'GET'); a.equal(o.redirect, 'error'); a.ok(!Object.hasOwn(o.headers, 'User-Agent'));
      return { status: 200, json: async () => { busy = false; return (p.track === 'campus' ? culture(post) : detail(post)).response; } };
    } };
    const r = await b.fetchAvailable(p, options); a.equal(urls.length, 1); a.equal(r.total, 1); a.equal(b.validateEvidence(r.verification, r.jobs, p).total, 1);
    const seed = { details: r.verification.details, dictionaryResponses: r.verification.dictionaryResponses };
    const reused = await b.fetchAvailable(p, { ...options, supplementSeed: seed, fetchImpl: () => a.fail('no duplicate seeded request') }); a.deepEqual(reused.jobs, r.jobs);
  }
  let calls = 0; const post = row(social), r = await b.fetchAvailable(social, { listPages: [page(social, 1, [post, row(social, 2)])], sleep: async () => {}, fetchImpl: async () => { calls++; return { status: 429 }; } });
  a.equal(calls, 1); a.equal(r.total, 2); a.match(r.issues.join(';'), /请求停止/); a.equal(r.jobs[0].post.jobDuty, post.jobDuty); a.equal(Object.hasOwn(r.jobs[0], 'detail'), false);
});
test('OPPO native list POST and supplements are body-read serial, capped partial and atomic no-write on initial failure', async t => {
  let clock = 0, calls = 0, busy = false; const starts = [];
  const r = await b.fetchAvailable(campus, { now: () => clock, sleep: async ms => { a.equal(busy, false); clock += ms; }, maxPages: 1, fetchImpl: async (url, o) => {
    a.equal(busy, false); busy = true; starts.push(clock); calls++; a.ok(o.signal instanceof AbortSignal);
    return { status: 200, json: async () => { await Promise.resolve(); busy = false; return o.method === 'POST' ? page(campus, 1, Array.from({ length: 100 }, (_, i) => row(campus, i + 1)), 500, 5).response : culture().response; } };
  } }); a.equal(calls, 2); a.ok(starts[1] - starts[0] >= 200); a.match(r.issues.join(';'), /安全上限/); a.equal(r.complete, false);
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ande-oppo-test-')); t.after(() => fs.rmSync(dir, { recursive: true, force: true })); const file = path.join(dir, 'candidate.json'); fs.writeFileSync(file, 'old');
  await a.rejects(b.run([JSON.stringify(social), file], { fetchImpl: async () => ({ status: 403 }) })); a.equal(fs.readFileSync(file, 'utf8'), 'old'); a.deepEqual(fs.readdirSync(dir), ['candidate.json']);
  const noDirections = { ...row(social), jobDirectionList: null };
  const saved = await b.run([JSON.stringify(social), file], { fetchImpl: async () => ({ status: 200, json: async () => page(social, 1, [noDirections]).response }) });
  a.equal(saved.complete, false); a.equal(saved.mode, 'custom'); a.equal(JSON.stringify(saved).includes('real-sensitive-secret'), false); a.deepEqual(JSON.parse(fs.readFileSync(file, 'utf8')), saved);
});
const proofBase = '/path/to/wheres-my-job-work/third-batch-20261008T071347946Z';
for (const p of [campus, social]) test('OPPO offline current list plus normal Node culture/direction proof ' + p.key, { skip: !fs.existsSync(proofBase + '/node-first/oppo-culture-first.json') }, () => {
  const read = file => JSON.parse(fs.readFileSync(proofBase + file, 'utf8')), raw = read('/collections/' + p.key + '.json'), seed = read('/node-first/' + (p.track === 'campus' ? 'oppo-culture-first' : 'oppo-direction-first') + '.json');
  const { request, httpStatus, response } = seed, extra = p.track === 'campus' ? { dictionaryResponses: [{ request, httpStatus, response }] } : { details: [{ request, httpStatus, response }] };
  const r = b.collectAvailable(raw.pages, p, raw.issues, raw.stopped, extra); a.equal(r.complete, false); a.equal(r.total, p.track === 'campus' ? 237 : 155); a.equal(b.validateEvidence(r.verification, r.jobs, p).total, r.total);
  const j = b.normalizeRecord(r.jobs[0], p); if (p.track === 'campus') { a.ok(j.description.includes(seed.response.data[0].itemName)); a.ok(j.description.includes(r.jobs[0].post.knowledgeSkill)); }
  else for (const d of seed.response.data.jobDirectionList) { a.ok(j.description.includes(d.jobDuty)); a.ok(j.description.includes(d.workRequire)); }
});
