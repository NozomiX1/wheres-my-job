'use strict';
const test = require('node:test'), a = require('node:assert/strict');
const b = require('../crawler/lib/custom/tencent_portal');
const [campus, social] = b.PROFILES;
const stamp = 1791446505511;
function row(site = campus, id = '1282707398326592512') { return site.track === 'campus' ? { id: 22444, position: 783, postId: id, positionTitle: '  AI全栈工程师 123456  ', positionFamily: 2, projectId: 1, bgs: 'CDG CSIG ', workCities: '深圳总部 北京 ', positionSource: 'oa', positionUrl: null, projectName: '应届毕业生', recruitLabelName: '应届毕业生' } :
  { Id: 0, PostId: id, RecruitPostId: 122036, RecruitPostName: '  原标题 123456  ', LocationName: '杭州', BGName: 'IEG', CategoryName: '技术', Responsibility: '  List<T> &amp; <b>字面</b>\r\n  内部  空白\n', LastUpdateTime: '2026年10月08日', PostURL: 'http://careers.tencent.com/jobdesc.html?postId=' + id, SourceID: 1, RequireWorkYearsName: '三年以上工作经验' }; }
function page(site, n = 1, posts = [row(site)], total = posts.length) { return { request: b.requestFor(site, n, stamp), httpStatus: 200,
  response: site.track === 'campus' ? { message: '', status: 0, data: { count: total, positionList: posts } } : { Code: 200, Data: { Count: total, Posts: posts } } }; }
function detail(site, p, patch = {}) { return { request: b.detailRequestFor(site, p, stamp), httpStatus: 200, response: site.track === 'campus' ?
  { message: '', status: 0, data: { postId: p.postId, id: p.position, title: p.positionTitle, tidName: '技术', projectId: 1, recruitType: 1, desc: '  职责 List<T> &amp;\n', request: '  要求 <b>字面</b>\n', introduction: '  原简介\n', graduateBonus: '  原加分项\n', internBonus: '', isQingyun: 0, topicDetail: '', topicRequirement: '', subDirectionDtos: null, projectInternDirections: null, intentionBGDList: null, ...patch } } :
  { Code: 200, Data: { ...p, Requirement: '  要求 List<T> &amp;\n', Introduction: '  原简介\n', ImportantItem: '原加分项', PostLightItem: '原亮点', DepartmentIntroduction: '原部门简介', ...patch } } }; }
test('Tencent fixed broad profiles and literal request builders distinguish official PostId from all secondary IDs', () => {
  a.deepEqual(campus.body.projectMappingIdList, [1, 2, 104, 14, 20]); a.equal(campus.body.pageSize, 100); a.equal(social.query.area, 'cn');
  a.ok(Object.isFrozen(campus.body.projectMappingIdList));
  const cp = row(), sp = row(social); a.equal(new URL(b.detailRequestFor(campus, cp, stamp).url).searchParams.get('postId'), cp.postId);
  a.equal(new URL(b.detailRequestFor(social, sp, stamp).url).searchParams.get('postId'), sp.PostId);
  for (const site of [campus, social]) { const r = b.collectAvailable([page(site)], site); a.equal(r.complete, false); a.equal(r.total, 1);
    const j = b.normalizeRecord(r.jobs[0], site); a.equal(j.id, '1282707398326592512'); a.equal(j.title, site.track === 'campus' ? cp.positionTitle : sp.RecruitPostName);
    a.deepEqual([j.employment, j.talentPlan, j.date, j.dateKind], [null, null, null, null]); a.equal(j.jdComplete, false);
    a.deepEqual(b.validateEvidence(r.verification, r.jobs, site).jobs, r.jobs);
  }
  a.equal(b.normalizeRecord(b.collectAvailable([page(social)], social).jobs[0], social).url, sp.PostURL);
});
test('Tencent retains the other acquired bonus as literal TEXT without relabeling requirements or merging independent equal fields', () => {
  const post = row(), literal = '  另一段 <T> &amp;\r\n 原空白  ';
  for (const recruitType of [1, 2]) {
    const selected = recruitType === 1 ? 'graduateBonus' : 'internBonus', other = recruitType === 1 ? 'internBonus' : 'graduateBonus';
    const baseline = detail(campus, post, { recruitType, [selected]: '当前分支', [other]: '' }), captured = detail(campus, post, { recruitType, [selected]: '当前分支', [other]: literal });
    const old = b.normalizeRecord({ post, detail: baseline }, campus), j = b.normalizeRecord({ post, detail: captured }, campus);
    a.equal(j.description, old.description + '\n\n' + literal); a.deepEqual({ ...j, description: '' }, { ...old, description: '' });
    const same = b.normalizeRecord({ post, detail: detail(campus, post, { recruitType, graduateBonus: literal, internBonus: literal }) }, campus);
    a.equal(same.description.split(literal).length - 1, 2); a.equal(same.duty, old.duty); a.equal(same.requirements, old.requirements);
  }
});
test('Tencent all TEXT sections retain source order and exact characters; empty detail never erases social list responsibility', () => {
  for (const site of [campus, social]) {
    const p = row(site), d = detail(site, p), r = b.collectAvailable([page(site, 1, [p])], site, [d]), j = b.normalizeRecord(r.jobs[0], site);
    a.equal(j.jdComplete, false); a.equal(j.title, site.track === 'campus' ? p.positionTitle : p.RecruitPostName);
    if (site.track === 'campus') {
      a.equal(j.duty, d.response.data.desc); a.equal(j.requirements, d.response.data.request);
      a.equal(j.description, '  原简介\n\n\n岗位描述\n  职责 List<T> &amp;\n\n\n岗位要求\n  要求 <b>字面</b>\n\n\n加分项或注意事项\n  原加分项\n');
    } else {
      a.equal(j.duty, p.Responsibility); a.equal(j.requirements, d.response.Data.Requirement);
      a.equal(j.description, '  原简介\n\n\n岗位职责\n' + p.Responsibility + '\n\n岗位要求\n  要求 List<T> &amp;\n\n\n加分项\n原加分项\n\n岗位亮点\n原亮点\n\n原部门简介');
      const blank = b.collectAvailable([page(site, 1, [p])], site, [detail(site, p, { Responsibility: '', Requirement: p.Responsibility })]);
      a.equal(b.normalizeRecord(blank.jobs[0], site).duty, p.Responsibility); a.equal(b.normalizeRecord(blank.jobs[0], site).requirements, p.Responsibility);
    }
    a.ok(Object.isFrozen(r.jobs[0].post)); a.deepEqual(b.validateEvidence(r.verification, r.jobs, site).jobs, r.jobs);
  }
});
test('Tencent Workday/external identities and URLs survive unsafe unused Numbers without invented internal requests/JD', () => {
  const ext = { ...row(), id: 2099443063863820300, position: null, positionSource: 'workday', positionUrl: 'https://tencent.wd1.myworkdayjobs.com/en-US/Tencent_Careers/job/United-Kingdom-London/Original_R00001', workCities: 'United Kingdom-London' };
  const r = b.collectAvailable([page(campus, 1, [ext])], campus), j = b.normalizeRecord(r.jobs[0], campus);
  a.equal(r.total, 1); a.equal(j.id, ext.postId); a.equal(j.url, ext.positionUrl); a.equal(j.city, ext.workCities); a.equal(j.duty, '');
  a.equal(b.needsDetail(campus, ext), false); a.throws(() => b.detailRequestFor(campus, ext), /external posting/);
  const se = { ...row(social), SourceID: 4, PostURL: ext.positionUrl, RecruitPostId: 2099443063863820300 };
  const sj = b.normalizeRecord(b.collectAvailable([page(social, 1, [se])], social).jobs[0], social);
  a.equal(sj.url, ext.positionUrl); a.equal(sj.duty, se.Responsibility); a.equal(sj.requirements, ''); a.equal(b.needsDetail(social, se), false);
  const summary = { ...row(), postId: '-2', id: -2, position: -2 }; a.equal(b.collectAvailable([page(campus, 1, [summary])], campus).total, 1);
  a.equal(new URL(b.detailRequestFor(campus, summary, stamp).url).searchParams.get('postId'), '-2');
});
test('Tencent Qingyun renderer chooses native topic fields; bonus and department TEXT remain separate from scoring fields', () => {
  const p = row(), d = detail(campus, p, { projectId: 14, isQingyun: 1, topicDetail: '  全部课题 <T>\n', topicRequirement: '  课题要求 &amp;\n', introduction: '隐藏简介',
    intentionBGDList: [{ departmentList: [{ name: '原部门', comment: '  部门完整正文 <b>literal</b>\n' }] }] });
  const j = b.normalizeRecord(b.collectAvailable([page(campus, 1, [p])], campus, [d]).jobs[0], campus);
  a.equal(j.duty, '  全部课题 <T>\n'); a.equal(j.requirements, '  课题要求 &amp;\n'); a.ok(!j.description.includes('隐藏简介'));
  a.match(j.description, /^课题描述/); a.ok(j.description.includes('原部门\n  部门完整正文 <b>literal</b>\n'));
  const sub = detail(campus, p, { subDirectionDtos: [{ subDirection: { title: '方向一', desc: '全部方向一', request: '一要求' } }, { subDirection: { title: '方向二', desc: '全部方向二', request: '二要求' } }] });
  const s = b.normalizeRecord(b.collectAvailable([page(campus, 1, [p])], campus, [sub]).jobs[0], campus);
  a.equal(s.duty, '全部方向一\n\n全部方向二'); a.equal(s.requirements, '一要求\n\n二要求'); a.ok(s.description.includes(p.positionTitle + '-方向一'));
  a.equal(s.talentPlan, null); a.equal(s.employment, null);
});
test('Tencent campus department tabs retain both displayed strings, duplicate TEXT and renderer order without scoring metadata', () => {
  const p = row(), literal = '  相同 List<T> &amp;\r\n  内部  空白\n', groups = [
    { title: '未被renderer使用的组title', showTitle: literal, showTxt: literal, departmentList: [{ name: literal, comment: literal }, { name: '第二部门', comment: '第二正文' }] },
    { showTitle: '末组', showTxt: '末组说明', departmentList: [{ name: '空正文部门', comment: null }, { name: '空串正文部门', comment: '' }] },
    { showTitle: '只有分组标题', showTxt: '只有分组说明', departmentList: [] }
  ];
  const tail = [literal + '\n' + literal, literal + '\n' + literal, '第二部门\n第二正文', '末组\n末组说明', '空正文部门', '空串正文部门', '只有分组标题\n只有分组说明'].join('\n\n');
  for (const patch of [{}, { projectId: 14, isQingyun: 1, topicDetail: '课题两栏同文', topicRequirement: '课题两栏同文' },
    { subDirectionDtos: [{ subDirection: { title: '细分方向', desc: '方向两栏同文', request: '方向两栏同文', intentionBGDList: groups } }] }]) {
    const before = b.collectAvailable([page(campus, 1, [p])], campus, [detail(campus, p, patch)]);
    const r = b.collectAvailable([page(campus, 1, [p])], campus, [detail(campus, p, { ...patch, intentionBGDList: groups })]);
    const old = b.normalizeRecord(before.jobs[0], campus), j = b.normalizeRecord(r.jobs[0], campus);
    a.equal(j.description, old.description + (patch.subDirectionDtos ? '' : '\n\n' + tail));
    a.ok(j.description.endsWith(tail));
    a.deepEqual({ ...j, description: '' }, { ...old, description: '' });
    a.equal(j.description.includes(groups[0].title), false);
    a.equal(j.description.includes(p.workCities), false);
    a.deepEqual(b.validateEvidence(r.verification, r.jobs, campus).jobs, r.jobs);
  }
});
test('Tencent campus optional group display fields may be absent/null/empty and do not become a new response gate', () => {
  const p = row(), dep = { departmentList: [{ name: '原部门', comment: '原正文' }] };
  const project = { projectId: 12, recruitType: 2, projectInternDirections: [{ subProjectInterns: [{ title: '原方向', intentionBGDList: [dep] }] }], intentionBGDList: null };
  for (const patch of [{ intentionBGDList: [dep] }, project]) {
    const expected = b.normalizeRecord(b.collectAvailable([page(campus, 1, [p])], campus, [detail(campus, p, patch)]).jobs[0], campus);
    for (const value of [undefined, null, '']) {
      const changed = structuredClone(patch), group = changed.intentionBGDList?.[0] ?? changed.projectInternDirections[0].subProjectInterns[0].intentionBGDList[0];
      if (value !== undefined) { group.showTitle = value; group.showTxt = value; if (changed.projectInternDirections) changed.projectInternDirections[0].positionFidName = value; }
      const r = b.collectAvailable([page(campus, 1, [p])], campus, [detail(campus, p, changed)]);
      a.deepEqual(b.normalizeRecord(r.jobs[0], campus), expected); a.deepEqual(b.validateEvidence(r.verification, r.jobs, campus).jobs, r.jobs);
    }
  }
  for (const fields of [{ showTitle: '单独标题' }, { showTxt: '  单独说明\n' }, { showTitle: '', showTxt: '  \n' }]) {
    const r = b.collectAvailable([page(campus, 1, [p])], campus, [detail(campus, p, { intentionBGDList: [{ ...dep, ...fields }] })]);
    a.ok(b.normalizeRecord(r.jobs[0], campus).description.endsWith(Object.values(fields).join('\n') + '\n\n原部门\n原正文'));
  }
});
test('Tencent exact source, response, requests, original IDs/URL and raw metadata cannot downgrade or drift unbound', () => {
  for (const site of [campus, social]) {
    for (const patch of [{ key: 'alias' }, { company: '腾讯音乐' }, { adapter: undefined }, { origin: 'https://example.com' }, { api: site.api + '?signature=fake' }]) {
      const bad = { ...site, ...patch }; a.equal(b.requiresVerification(bad), true); a.equal(b.verifiedSource(bad), false); a.throws(() => b.validateJobs([], bad));
    }
    const p = row(site), original = b.collectAvailable([page(site, 1, [p])], site, [detail(site, p)]);
    for (const mutate of [r => r.verification.key = 'other', r => r.verification.version++, r => r.verification.complete = true,
      r => r.verification.pages[0].request.url += '&keyword=AI', r => r.verification.pages[0].request.headers['User-Agent'] = 'fake',
      r => r.verification.pages[0].httpStatus = 403, r => r.verification.pages[0].response.extra = true,
      r => r.verification.details[0].request.url += '&extra=1', r => r.verification.details[0].request.headers.Cookie = 'secret',
      r => r.jobs[0].post[site.track === 'campus' ? 'positionTitle' : 'RecruitPostName'] = 'invented',
      r => r.verification.details[0].response[site.track === 'campus' ? 'data' : 'Data'][site.track === 'campus' ? 'postId' : 'PostId'] = '1',
      r => r.verification.details[0].response[site.track === 'campus' ? 'data' : 'Data'].extraJD = 'unknown body']) {
      const bad = JSON.parse(JSON.stringify(original)); mutate(bad); a.throws(() => b.validateEvidence(bad.verification, bad.jobs, site));
    }
    a.throws(() => b.collectAvailable([page(site, 1, [], 0)], site), /zero cannot clear/);
    const bad = { ...p, [site.track === 'campus' ? 'postId' : 'PostId']: Number(p[site.track === 'campus' ? 'postId' : 'PostId']) };
    a.throws(() => b.collectAvailable([page(site, 1, [bad])], site), /zero cannot clear/);
  }
});
test('Tencent drift/duplicates/early short pages remain partial, unsafe links skip only records, complete is never asserted', () => {
  const p = row(social), other = row(social, '1282707398326592513'), r = b.collectAvailable([page(social, 1, [p], 210), page(social, 2, [{ ...p, Responsibility: '' }, other], 201), page(social, 3, [], 0)], social);
  a.equal(r.total, 2); a.equal(r.jobs[0].post.Responsibility, p.Responsibility); a.match(r.issues.join(';'), /重复官方PostId.*210→201→0/); a.equal(r.complete, false);
  const unsafe = { ...other, PostURL: 'https://user:secret@careers.tencent.com/jobdesc.html' };
  a.equal(b.collectAvailable([page(social, 1, [p, unsafe])], social).total, 1);
  a.throws(() => b.collectAvailable([...r.verification.pages, page(social, 4, [p])], social), /extra page/);
});
test('Tencent native requests serialize body consumption, START spacing and refusal; no retry/fallback or external detail requests', async () => {
  for (const site of [campus, social]) for (const failure of ['none', 'pageHTTP', 'detailHTTP', 'business', 'identity', 'JSON']) {
    let clock = stamp, busy = false; const starts = [], calls = [], sleeps = [], p = row(site);
    const r = await b.fetchAvailable(site, { now: () => clock, sleep: async ms => { a.equal(busy, false); sleeps.push(ms); clock += Math.max(1, ms - 1); }, fetchImpl: async (url, options) => {
      a.equal(busy, false); busy = true; starts.push(clock); calls.push(url); a.ok(options.signal instanceof AbortSignal); a.equal(options.redirect, 'error');
      for (const k of ['Cookie', 'User-Agent', 'X-XSRF-TOKEN']) a.equal(Object.hasOwn(options.headers, k), false);
      const isDetail = url.includes('ByPostId'), n = isDetail ? 0 : site.track === 'campus' ? JSON.parse(options.body).pageIndex : Number(new URL(url).searchParams.get('pageIndex'));
      if (failure === 'pageHTTP' && n === 2 || failure === 'detailHTTP' && isDetail) { busy = false; return { status: 403 }; }
      const raw = isDetail ? detail(site, p) : page(site, n, n === 1 ? [p] : [], 110);
      if (isDetail && failure === 'business') raw.response[site.track === 'campus' ? 'status' : 'Code'] = 403;
      if (isDetail && failure === 'identity') raw.response[site.track === 'campus' ? 'data' : 'Data'][site.track === 'campus' ? 'postId' : 'PostId'] = '1';
      return { status: 200, json: async () => { await Promise.resolve(); busy = false; clock += 75; if (isDetail && failure === 'JSON') throw new SyntaxError('bad JSON'); return raw.response; } };
    } });
    a.equal(r.total, 1); a.equal(r.complete, false); a.equal(calls.length, failure === 'pageHTTP' ? 2 : 3);
    a.ok(starts.every((s, i) => !i || s - starts[i - 1] >= 200)); a.ok(sleeps.every(ms => ms === 125 || ms === 1), 'early timer wakes are checked again');
    a.equal(r.jobs[0].detail !== null, failure === 'none'); a.equal(b.validateEvidence(r.verification, r.jobs, site).total, 1);
    if (failure !== 'none') a.match(r.issues.join(';'), /请求停止/);
    if (failure === 'JSON') a.equal(r.verification.stopped.httpStatus, 200);
  }
});
test('Tencent atomic run preserves prior candidate on failure; valid external-only source never fabricates details', async t => {
  const fs = require('node:fs'), os = require('node:os'), path = require('node:path'), dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ande-tencent-portal-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true })); const file = path.join(dir, 'candidate.json'); fs.writeFileSync(file, 'old real candidate');
  for (const response of [{ status: 403 }, { status: 200, json: async () => page(campus, 1, [], 0).response }]) {
    await a.rejects(b.run([JSON.stringify(campus), file], { fetchImpl: async () => response })); a.equal(fs.readFileSync(file, 'utf8'), 'old real candidate'); a.deepEqual(fs.readdirSync(dir), ['candidate.json']);
  }
  const external = { ...row(), positionSource: 'workday', positionUrl: 'https://tencent.wd1.myworkdayjobs.com/job/Original_R1' }; let calls = 0;
  const result = await b.run([JSON.stringify(campus), file], { fetchImpl: async () => { calls++; return { status: 200, json: async () => page(campus, 1, [external]).response }; } });
  a.equal(calls, 1); a.equal(result.mode, 'custom'); a.equal(result.complete, false); a.deepEqual(JSON.parse(fs.readFileSync(file, 'utf8')), result); a.deepEqual(fs.readdirSync(dir), ['candidate.json']);
});
const proofRoot = '/path/to/wheres-my-job-work/third-batch-20261008T071347946Z';
for (const [site, count, internal] of [[campus, 995, 905], [social, 2254, 1948]]) {
  const fs = require('node:fs'), file = proofRoot + '/collections/' + site.key + '.json';
  test('Tencent offline first-party captured list ' + site.key + ': all native IDs and external links retained, independent source proof', { skip: !fs.existsSync(file) }, () => {
    const raw = JSON.parse(fs.readFileSync(file, 'utf8')), r = b.collectAvailable(raw.pages, site);
    a.equal(r.total, count); a.equal(r.jobs.filter(j => b.needsDetail(site, j.post)).length, internal); a.equal(r.complete, false);
    a.deepEqual(r.verification.pages, raw.pages); a.equal(b.validateEvidence(r.verification, r.jobs, site).total, count);
    for (const job of r.jobs) { const j = b.normalizeRecord(job, site); a.equal(j.id, job.post[site.track === 'campus' ? 'postId' : 'PostId']); a.equal(j.jdComplete, false); a.equal(j.date, null); }
    if (site.track === 'campus') a.equal(r.jobs.filter(j => j.post.postId.startsWith('-')).length, 5);
  });
}

test('Tencent details bind to their official PostId, so a skipped (incrementally known) job never shifts the pairing', () => {
  const known = row(social, '1111111111111111111'), fresh = row(social, '2222222222222222222');
  const r = b.collectAvailable([page(social, 1, [known, fresh])], social, [detail(social, fresh)]);
  const detailOf = id => r.jobs.find(j => j.post.PostId === id).detail;
  a.equal(detailOf(fresh.PostId) !== null, true); a.equal(detailOf(known.PostId), null);
  a.deepEqual(b.validateEvidence(r.verification, r.jobs, social).jobs, r.jobs);
  a.throws(() => b.collectAvailable([page(social, 1, [known, fresh])], social, [detail(social, fresh), detail(social, fresh)]), /not bound/);
});
