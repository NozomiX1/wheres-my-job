'use strict';
const test = require('node:test'), a = require('node:assert/strict');
const b = require('../crawler/lib/custom/tencent_portal'), w = require('../crawler/lib/custom/tencent_workday');
const [site] = b.PROFILES, time = 1791454500000;
const url = 'https://tencent.wd1.myworkdayjobs.com/Tencent_Careers/job/Seoul/Original_R108129';
function post(id = '-2') { return { id: Number(id), position: Number(id), postId: id, positionTitle: '原项目实习标题', positionFamily: -Number(id), projectId: 12, positionSource: 'oa', positionUrl: null, workCities: '深圳总部 ', bgs: '' }; }
function page(posts) { return { request: b.requestFor(site, 1, time), httpStatus: 200, response: { status: 0, message: '', data: { count: posts.length, positionList: posts } } }; }
function detail(p) { return { request: b.detailRequestFor(site, p, time), httpStatus: 200, response: { status: 0, message: '', data: { postId: null, id: p.position, tid: p.positionFamily, title: p.positionTitle, projectId: 12, recruitType: 2, desc: '  完整 List<T> &amp;\n', request: '  完整要求\n', introduction: null, graduateBonus: null, internBonus: null, isQingyun: null, topicDetail: null, topicRequirement: null, projectInternDirections: [{ subProjectInterns: [{ title: '原方向', intentionBGDList: [{ departmentList: [{ name: '原部门', comment: '  全部部门内容\n' }] }] }] }], subDirectionDtos: null, intentionBGDList: null } } }; }
function external() { return { ...post('100'), id: 2099443063863820300, position: null, positionSource: 'workday', positionUrl: url }; }
function wd(p) { return { postId: p.postId, kind: 'workday', request: w.requestFor(url), httpStatus: 200, response: { userAuthenticated: false, jobPostingInfo: { id: 'a'.repeat(32), title: '外部标题不改原标题', jobReqId: 'R108129', jobPostingId: 'Original_R108129', jobPostingSiteId: 'Tencent_Careers', externalUrl: url, jobDescription: '<p>全部外部正文 &amp; &lt;T&gt;</p>' } } }; }
test('Tencent project12 negative template binds native id/tid/title, not a fabricated or changed PostId', () => {
  for (const id of ['-2', '-3', '-4', '-5', '-6']) { const p = post(id), d = detail(p), r = b.collectAvailable([page([p])], site, [d]);
    const j = b.normalizeRecord(r.jobs[0], site); a.equal(j.id, id); a.equal(j.duty, d.response.data.desc); a.equal(j.requirements, d.response.data.request); a.ok(j.description.includes('原方向\n原部门\n  全部部门内容\n'));
    a.equal(d.response.data.postId, null); a.equal(d.request.url, b.detailRequestFor(site, p, time).url);
    for (const patch of [{ id: -9 }, { tid: 9 }, { title: 'other' }, { projectId: 1 }, { recruitType: 1 }, { postId: '999' }]) { const bad = structuredClone(d); Object.assign(bad.response.data, patch); a.throws(() => b.collectAvailable([page([p])], site, [bad])); }
  }
  const p = { ...post(), postId: '200' }; a.throws(() => b.collectAvailable([page([p])], site, [detail(p)]));
});
test('Tencent all five project12 templates retain independent parent/child titles and every department tab in v2 without changing two columns', () => {
  const literal = '  同文父子 List<T> &amp;\r\n  内部  空白\n', group = { title: '不替代官网showTitle/showTxt', showTitle: '  CDG <T>\n', showTxt: '  企业 &amp;  发展\n', departmentList: [{ name: '原部门', comment: '  全部部门内容\n' }] };
  const department = group.showTitle + '\n' + group.showTxt + '\n\n原部门\n  全部部门内容\n';
  for (const id of ['-2', '-3', '-4', '-5', '-6']) {
    const p = post(id), base = b.collectAvailable([page([p])], site), raw = detail(p);
    Object.assign(raw.response.data, { desc: '', request: '', projectInternDirections: [
      { positionFidName: literal, subProjectInterns: [{ title: literal, intentionBGDList: [group, structuredClone(group)] }, { title: '无部门的子标题', intentionBGDList: null }] },
      { positionFidName: literal, subProjectInterns: [{ title: literal, intentionBGDList: [group] }] },
      { positionFidName: '无子项的父标题', subProjectInterns: [] }
    ] });
    const supplement = { postId: id, kind: 'internal', ...raw }, original = structuredClone(supplement), clock = '2026-10-08T08:54:32.606Z';
    const r = b.collectSupplemented(base.verification, site, [supplement], [], null, clock), j = b.normalizeRecord(r.jobs[0], site);
    a.equal(j.description, ['岗位描述\n', '岗位要求\n', literal, literal + '\n' + department + '\n\n' + department, '无部门的子标题', literal, literal + '\n' + department, '无子项的父标题'].join('\n\n'));
    a.equal(j.id, id); a.equal(j.title, p.positionTitle); a.equal(j.duty, ''); a.equal(j.requirements, '');
    a.deepEqual([j.city, j.employment, j.talentPlan, j.date, j.dateKind, j.jdComplete], [p.workCities, null, null, null, null, false]);
    a.equal(j.description.includes('工作城市'), false); a.equal(j.description.includes('方向\n'), false); a.equal(j.description.includes(group.title), false);
    a.deepEqual(r.verification.base, base.verification); a.equal(r.verification.baseCompletedAt, clock); a.deepEqual(r.verification.supplements, [original]);
    a.deepEqual(b.validateEvidence(r.verification, r.jobs, site).jobs, r.jobs); a.deepEqual(supplement, original);
  }
});
test('Tencent exact historical project12 guard receipt stays unchanged and does not sign away other stops', () => {
  const p = post(), stopped = { ...detail(p), stage: 'detail', error: 'Tencent: detail PostId identity' }, original = structuredClone(stopped);
  const base = b.collectAvailable([page([p])], site, [], [], stopped); a.deepEqual(base.verification.stopped, original); a.equal(b.normalizeRecord(base.jobs[0], site).duty, '');
  const bad = structuredClone(stopped); bad.response.data.title = 'wrong'; a.throws(() => b.collectAvailable([page([p])], site, [detail(p)], [], bad));
});
test('Tencent supplements bind to both original registered source and native row; only JD is enriched', () => {
  const p = post(), e = external(), base = b.collectAvailable([page([p, e])], site); const supplements = [{ postId: p.postId, kind: 'internal', ...detail(p) }, wd(e)];
  const r = b.collectSupplemented(base.verification, site, supplements), pj = b.normalizeRecord(r.jobs[0], site), ej = b.normalizeRecord(r.jobs[1], site);
  a.equal(r.complete, false); a.equal(pj.city, p.workCities); a.equal(pj.title, p.positionTitle); a.equal(ej.title, e.positionTitle); a.equal(ej.url, url); a.equal(ej.description, '全部外部正文 & <T>'); a.equal(ej.duty, ''); a.equal(ej.requirements, ''); a.equal(ej.jdComplete, false);
  a.deepEqual(b.validateEvidence(r.verification, r.jobs, site).jobs, r.jobs); a.deepEqual(base.jobs[0], { post: p, detail: null });
  for (const mutate of [r => r.verification.key = 'tencent_social', r => r.verification.supplements[0].postId = '999', r => r.verification.supplements[1].response.jobPostingInfo.externalUrl += 'bad', r => r.jobs[1].post.positionTitle = 'invented', r => r.verification.base.pages[0].request.body.keyword = 'AI']) { const bad = structuredClone(r); mutate(bad); a.throws(() => b.validateEvidence(bad.verification, bad.jobs, site)); }
});
test('Tencent sparse already-obtained material is bound without requesting intervening jobs or altering other rows', () => {
  const p = post(), e = external(), base = b.collectAvailable([page([p, e])], site);
  const r = b.collectSupplemented(base.verification, site, [wd(e)]);
  a.equal(Object.hasOwn(r.jobs[0], 'supplement'), false); a.equal(b.normalizeRecord(r.jobs[1], site).description, '全部外部正文 & <T>');
  a.deepEqual(b.validateEvidence(r.verification, r.jobs, site).jobs, r.jobs);
  a.throws(() => b.collectSupplemented(base.verification, site, [wd(e), wd(e)]), /duplicate/);
});
const fs = require('node:fs'), captureFile = '/path/to/wheres-my-job-work/third-batch-20261008T071347946Z/followup-20261008T112757164Z/tencent-available.json';
test('Tencent offline captured 905 internal campus details retain all 1277 displayed department groups and 11 parent directions with native v2 evidence unchanged', { skip: !fs.existsSync(captureFile) }, () => {
  const capture = JSON.parse(fs.readFileSync(captureFile, 'utf8')), original = structuredClone(capture);
  const r = b.validateEvidence(capture.verification, capture.jobs, site);
  a.equal(r.total, 995); a.equal(r.verification.version, 2); a.equal(r.verification.baseCompletedAt, '2026-10-08T08:54:32.606Z');
  let internal = 0, templates = 0, groups = 0, parents = 0, children = 0;
  function departmentText(list) {
    return (list ?? []).flatMap(g => {
      groups++; const header = [g.showTitle, g.showTxt].filter(v => typeof v === 'string').join('\n');
      return [...(header ? [header] : []), ...g.departmentList.map(d => d.name + (d.comment ? '\n' + d.comment : ''))];
    }).join('\n\n');
  }
  for (const row of r.jobs) {
    const d = row.detail?.response.data ?? (row.supplement?.kind === 'internal' ? row.supplement.response.data : null);
    const j = b.normalizeRecord(row, site);
    a.equal(j.id, row.post.postId); a.equal(j.title, row.post.positionTitle); a.deepEqual([j.date, j.dateKind, j.jdComplete], [null, null, false]);
    a.equal(j.employment, ['应届实习', '实习生 青云计划', '日常实习'].includes(row.post.recruitLabelName) ? 'internship' : null);
    a.equal(j.talentPlan, ['应届毕业生 青云计划', '实习生 青云计划'].includes(row.post.recruitLabelName) ? true : null);
    if (!d) continue;
    internal++; if (row.post.postId.startsWith('-')) templates++;
    const sections = d.subDirectionDtos ? d.subDirectionDtos.map(({ subDirection: s }) => ({ ...d, ...s })) : [d];
    const duty = [], requirements = []; let cursor = 0;
    for (const section of sections) {
      const topic = [14, 20].includes(section.projectId) && section.isQingyun === 1;
      duty.push((topic ? section.topicDetail : section.desc) ?? ''); requirements.push((topic ? section.topicRequirement : section.request) ?? '');
      const blocks = [], ordinary = departmentText(section.intentionBGDList); if (ordinary) blocks.push(ordinary);
      for (const parent of section.projectInternDirections ?? []) {
        parents++; if (parent.positionFidName) blocks.push(parent.positionFidName);
        for (const child of parent.subProjectInterns) { children++; const body = departmentText(child.intentionBGDList); blocks.push(child.title + (body ? '\n' + body : '')); }
      }
      for (const block of blocks) { const start = j.description.indexOf(block, cursor); a.ok(start >= cursor, row.post.postId + ': complete renderer context/order'); cursor = start + block.length; }
    }
    a.equal(j.duty, duty.join('\n\n')); a.equal(j.requirements, requirements.join('\n\n'));
  }
  a.deepEqual([internal, templates, groups, parents, children], [905, 5, 1277, 11, 12]);
  a.deepEqual(r.jobs.filter(row => row.supplement?.kind === 'internal').map(row => b.normalizeRecord(row, site).category), ['技术', '产品', '设计', '市场', '职能']);
  a.deepEqual(capture, original); a.deepEqual(r.verification, original.verification); a.deepEqual(r.jobs, original.jobs);
});
const priorCompletedAt = '2026-10-08T12:22:06.608Z';
const baseCompletedAt = '2026-10-08T08:54:32.606Z';
function linked(id, slug) { return { ...external(), postId: id, positionUrl: url.replace('Original_R108129', slug) }; }
function nativeWorkday(p) {
  const raw = wd(p), official = p.positionUrl ?? p.PostURL, slug = official.split('/').at(-1);
  raw.postId = p.postId ?? p.PostId; raw.request = w.requestFor(official);
  Object.assign(raw.response.jobPostingInfo, { externalUrl: official, jobPostingId: slug, jobReqId: /_(R\d+)/.exec(slug)[1] });
  return raw;
}
function resumedFixture() {
  const internal = post(), obtained = external(), denied = linked('101', 'Associate-Backend-Engineer_R108032'), fresh = linked('102', 'AI-Compute-Intern_R108149'), unknown = linked('103', 'Unknown_R108150');
  const base = b.collectAvailable([page([internal, obtained, denied, fresh, unknown])], site, [detail(internal)]);
  const stopped = { ...nativeWorkday(denied), httpStatus: 403, response: { errorCode: 'S22', errorMessage: 'permission denied' }, error: 'Tencent Workday: detail HTTP refusal' };
  const prior = b.collectSupplemented(base.verification, site, [nativeWorkday(obtained)], ['旧阶段原问题'], stopped, baseCompletedAt);
  return { internal, obtained, denied, fresh, unknown, prior, supplement: nativeWorkday(fresh) };
}
function resumedSample() { const f = resumedFixture(); return b.collectResumed(f.prior.verification, site, { priorCompletedAt, supplements: [f.supplement], issues: ['新阶段原问题'] }); }

test('Tencent explicit canonical location evidence survives v3 validation and normalization without changing the original request or public URL', () => {
  const f = resumedFixture(), raw = structuredClone(f.supplement), origin = 'https://tencent.wd1.myworkdayjobs.com', current = f.fresh.positionUrl.replace('/job/Seoul/', '/job/Busan/');
  raw.response.jobPostingInfo.externalUrl = current;
  a.throws(() => b.collectResumed(f.prior.verification, site, { priorCompletedAt, supplements: [raw] }), /externalUrl binding/);
  raw.canonical = { url: current, listing: { request: { url: origin + '/wday/cxs/tencent/Tencent_Careers/jobs', method: 'POST', headers: { Accept: 'application/json', 'Content-Type': 'application/json', 'Accept-Language': 'zh-CN', Referer: origin + '/zh-CN/Tencent_Careers', Origin: origin }, body: { appliedFacets: {}, limit: 20, offset: 0, searchText: '' } }, httpStatus: 200, response: { total: 1, jobPostings: [{ externalPath: '/job/Busan/AI-Compute-Intern_R108149', bulletFields: ['R108149'] }], userAuthenticated: false } } };
  const original = structuredClone(raw), r = b.collectResumed(f.prior.verification, site, { priorCompletedAt, supplements: [raw] }), j = b.normalizeRecord(r.jobs.find(x => x.post.postId === f.fresh.postId), site);
  a.equal(j.url, f.fresh.positionUrl); a.equal(j.title, f.fresh.positionTitle); a.equal(j.description, '全部外部正文 & <T>');
  a.deepEqual(raw.request, w.requestFor(f.fresh.positionUrl)); a.deepEqual(raw, original); a.deepEqual(b.validateEvidence(r.verification, r.jobs, site).jobs, r.jobs);
  const bad = structuredClone(r); bad.verification.supplements[0].canonical.listing.request.body.searchText = 'AI'; a.throws(() => b.validateEvidence(bad.verification, bad.jobs, site), /request binding/);
  const internal = { postId: f.internal.postId, kind: 'internal', ...detail(f.internal), canonical: raw.canonical }; a.throws(() => b.collectSupplemented(b.collectAvailable([page([f.internal])], site).verification, site, [internal]), /native\/source binding/);
});

test('Tencent explicit v2-to-v3 phase preserves the entire stopped prior and its original clock without recollecting lists', () => {
  const f = resumedFixture(), original = structuredClone(f), r = b.collectResumed(f.prior.verification, site, { priorCompletedAt, supplements: [f.supplement], issues: ['新阶段原问题'] });
  a.equal(r.verification.version, 3); a.equal(r.verification.policy, 'available'); a.equal(r.complete, false); a.equal(r.total, f.prior.total);
  a.deepEqual(r.verification.prior, original.prior.verification); a.equal(r.verification.priorCompletedAt, priorCompletedAt);
  a.deepEqual(r.verification.prior.stopped, original.prior.verification.stopped); a.equal(r.verification.stopped, null);
  a.deepEqual(r.verification.supplements, [original.supplement]); a.deepEqual(r.jobs.slice(0, 3), original.prior.jobs.slice(0, 3));
  a.deepEqual(b.validateEvidence(r.verification, r.jobs, site).jobs, r.jobs); a.deepEqual(f, original);
  a.ok(Object.isFrozen(r.verification.prior.stopped.response)); a.ok(Object.isFrozen(r.jobs[3].supplement));
  a.match(r.issues.join(';'), /新阶段原问题/); a.match(r.issues.join(';'), /旧阶段原问题/); a.match(r.issues.join(';'), /历史记录.*permission|历史记录.*HTTP refusal/);
  a.equal(r.issues.some(n => n.startsWith('本次补充停止：')), false);
});
test('Tencent resumed phase enriches only the exact original gap and leaves denied/unobserved URLs unknown', () => {
  const f = resumedFixture(), r = b.collectResumed(f.prior.verification, site, { priorCompletedAt, supplements: [f.supplement] });
  const before = b.normalizeRecord(f.prior.jobs[3], site), after = b.normalizeRecord(r.jobs[3], site);
  a.equal(after.description, '全部外部正文 & <T>'); a.deepEqual({ ...after, description: '' }, before);
  a.deepEqual([after.jdComplete, after.sourceStatus, after.date, after.dateKind, after.employment, after.talentPlan], [false, null, null, null, null, null]);
  for (const i of [0, 1, 2, 4]) a.deepEqual(r.jobs[i], f.prior.jobs[i]);
  for (const i of [2, 4]) a.equal(b.normalizeRecord(r.jobs[i], site).description, '');
  a.match(r.issues.join(';'), /详情仍未取得 2 岗/);
});
test('Tencent legacy supplemental entry points cannot automatically unlock a stopped v2 or accept a v3 phase', async () => {
  const f = resumedFixture(), r = resumedSample(); let requests = 0;
  a.throws(() => b.collectSupplemented(f.prior.verification, site, [f.supplement]), /newly authorized collection phase/);
  await a.rejects(b.fetchSupplemented(site, f.prior.verification, { fetchImpl: async () => { requests++; throw new Error('unexpected network'); } }), /newly authorized collection phase/);
  a.throws(() => b.collectSupplemented(r.verification, site), /evidence source binding/);
  await a.rejects(b.fetchSupplemented(site, r.verification, { fetchImpl: async () => { requests++; throw new Error('unexpected network'); } }), /evidence source binding/);
  a.equal(requests, 0);
});
test('Tencent v3 permits only one explicit prior-v2 layer, not v1, v3, missing or loosely bound phases', () => {
  const f = resumedFixture(), r = resumedSample();
  for (const prior of [f.prior.verification.base, r.verification, null, {}]) a.throws(() => b.collectResumed(prior, site, { priorCompletedAt }));
  for (const mutate of [e => e.version = 4, e => e.policy = 'complete', e => e.key = 'tencent_social', e => e.api += '/other', e => e.extra = true, e => delete e.priorCompletedAt]) {
    const bad = structuredClone(r); mutate(bad.verification); a.throws(() => b.validateEvidence(bad.verification, bad.jobs, site));
  }
});
test('Tencent v3 requires the prior real canonical capture clock and never takes base/replay time as a substitute', () => {
  const f = resumedFixture();
  for (const clock of [undefined, null, '', 1791454500000, 'invalid', '2026-10-08T12:22:06Z', '2026-10-08T12:22:06.608+00:00', '2026-10-08T08:54:32.605Z']) {
    a.throws(() => b.collectResumed(f.prior.verification, site, { priorCompletedAt: clock, supplements: [f.supplement] }));
  }
  const r = resumedSample(), bad = structuredClone(r); bad.verification.prior.baseCompletedAt = 'invalid';
  a.throws(() => b.validateEvidence(bad.verification, bad.jobs, site));
  a.equal(r.verification.priorCompletedAt, priorCompletedAt); a.equal(r.verification.prior.baseCompletedAt, baseCompletedAt);
});
test('Tencent v3 independently revalidates historical list, internal, Workday and stopped receipts', () => {
  const r = resumedSample();
  for (const mutate of [
    e => e.prior.key = 'tencent_social', e => e.prior.api += '/other', e => e.prior.base.pages[0].request.body.keyword = 'AI',
    e => e.prior.base.pages[0].response.data.positionList[3].positionUrl += '-1',
    e => e.prior.base.details[0].response.data.title = 'fabricated',
    e => e.prior.supplements[0].response.jobPostingInfo.id = 'invalid',
    e => e.prior.stopped.request.url += '-1', e => e.prior.stopped.request.method = 'POST'
  ]) { const bad = structuredClone(r); mutate(bad.verification); a.throws(() => b.validateEvidence(bad.verification, bad.jobs, site)); }
});
test('Tencent v3 rejects duplicate IDs and replacements of obtained internal or Workday material', () => {
  const f = resumedFixture(), options = supplements => ({ priorCompletedAt, supplements });
  const internal = { postId: f.internal.postId, kind: 'internal', ...detail(f.internal) };
  for (const supplements of [[f.supplement, f.supplement], [internal], [nativeWorkday(f.obtained)]]) a.throws(() => b.collectResumed(f.prior.verification, site, options(supplements)), /unknown|duplicate/);
  // An independently obtained internal supplement is protected just like the original internal slot.
  const base = b.collectAvailable([page([f.internal, f.fresh])], site);
  const withInternal = b.collectSupplemented(base.verification, site, [internal], [], null, baseCompletedAt);
  a.throws(() => b.collectResumed(withInternal.verification, site, options([internal])), /unknown|duplicate/);
});
test('Tencent v3 binds every new native supplement to the original URL, ID and anonymous Workday contract', () => {
  const f = resumedFixture();
  for (const mutate of [
    raw => raw.postId = '999', raw => raw.kind = 'internal', raw => raw.httpStatus = 403,
    raw => raw.request.url += '-1', raw => raw.request.headers.Cookie = 'invented', raw => raw.request.method = 'POST',
    raw => raw.response.userAuthenticated = true, raw => raw.response.jobPostingInfo.jobReqId = 'R999',
    raw => raw.response.jobPostingInfo.jobPostingId += '-1', raw => raw.response.jobPostingInfo.externalUrl += '-1',
    raw => raw.response.jobPostingInfo.id = 'x'.repeat(32), raw => raw.response.jobPostingInfo.requirements = 'fake text',
    raw => raw.sourceKey = 'tencent_social'
  ]) { const raw = structuredClone(f.supplement); mutate(raw); a.throws(() => b.collectResumed(f.prior.verification, site, { priorCompletedAt, supplements: [raw] })); }
});
test('Tencent v3 rejects fabricated post/body jobs, incomplete arrays and unknown source/profile declarations', () => {
  const r = resumedSample(), f = resumedFixture();
  for (const mutate of [jobs => jobs[3].post.positionTitle = 'fabricated', jobs => jobs[3].post.positionUrl += '-1', jobs => jobs[3].supplement.response.jobPostingInfo.jobDescription = 'fabricated', jobs => jobs.push(structuredClone(jobs[3]))]) {
    const jobs = structuredClone(r.jobs); mutate(jobs); a.throws(() => b.validateEvidence(r.verification, jobs, site), /binding/);
  }
  for (const supplements of [null, {}, [undefined], Array(1)]) a.throws(() => b.collectResumed(f.prior.verification, site, { priorCompletedAt, supplements }));
  for (const issues of [null, ['okay', 1], Array(1)]) a.throws(() => b.collectResumed(f.prior.verification, site, { priorCompletedAt, issues }));
  for (const patch of [{ key: 'other' }, { company: 'other' }, { adapter: 'other' }, { body: { ...site.body, keyword: 'AI' } }]) a.throws(() => b.collectResumed(f.prior.verification, { ...site, ...patch }, { priorCompletedAt }));
});
test('Tencent new phase 403 retains its own exact request and response separately from the historical stop', () => {
  const f = resumedFixture(), stopped = { ...nativeWorkday(f.unknown), httpStatus: 403, response: { errorCode: 'S22', errorMessage: 'permission denied' }, error: 'Tencent Workday: detail HTTP refusal' };
  const original = structuredClone(stopped), r = b.collectResumed(f.prior.verification, site, { priorCompletedAt, supplements: [f.supplement], stopped });
  a.deepEqual(r.verification.stopped, original); a.deepEqual(r.verification.prior.stopped, f.prior.verification.stopped);
  a.equal(r.verification.stopped.postId, f.unknown.postId); a.equal(r.verification.prior.stopped.postId, f.denied.postId);
  a.equal(r.jobs[4].supplement, undefined); a.equal(r.complete, false); a.match(r.issues.join(';'), /本次补充停止/);
  a.equal(b.validateEvidence(r.verification, r.jobs, site).total, 5);
  for (const mutate of [s => s.request.url += '-1', s => s.postId = '999', s => s.extra = true, s => delete s.response]) {
    const bad = structuredClone(r); mutate(bad.verification.stopped); a.throws(() => b.validateEvidence(bad.verification, bad.jobs, site));
  }
});
test('Tencent v3 never accepts successful or already-obtained material as a new stopped request', () => {
  const f = resumedFixture();
  for (const stopped of [{ ...nativeWorkday(f.unknown), error: 'fake stop' }, { ...f.supplement, httpStatus: 403, response: null, error: 'fake stop' }, { ...nativeWorkday(f.obtained), httpStatus: 403, response: null, error: 'fake stop' }]) {
    a.throws(() => b.collectResumed(f.prior.verification, site, { priorCompletedAt, supplements: [f.supplement], stopped }), /successful|obtained/);
  }
});
test('Tencent one recorded Workday response binds independently to social original references without a request or merged source', () => {
  const f = resumedFixture(), social = b.PROFILES[1], rows = [f.fresh, { ...f.fresh, postId: '104' }].map(p => ({ PostId: p.postId, RecruitPostId: 1, RecruitPostName: p.positionTitle, LocationName: '原社会城市', CategoryName: '原类别', Responsibility: '原列表职责完整保留', PostURL: p.positionUrl, SourceID: 4 }));
  const raw = { request: b.requestFor(social, 1, time), httpStatus: 200, response: { Code: 200, Data: { Count: rows.length, Posts: rows } } };
  const base = b.collectAvailable([raw], social), prior = b.collectSupplemented(base.verification, social, [], [], null, baseCompletedAt), socialClock = '2026-10-08T11:39:15.916Z';
  const material = rows.map(p => ({ ...structuredClone(f.supplement), postId: p.PostId }));
  const r = b.collectResumed(prior.verification, social, { priorCompletedAt: socialClock, supplements: material, issues: ['复用其它已授权来源的同URL材料；本源0新增请求'] });
  a.equal(r.total, 2); a.equal(r.verification.key, social.key); a.equal(r.verification.priorCompletedAt, socialClock);
  for (const row of r.jobs) { const j = b.normalizeRecord(row, social); a.equal(j.duty, rows[0].Responsibility); a.equal(j.description, '全部外部正文 & <T>'); a.equal(j.jdComplete, false); a.equal(j.sourceStatus, null); }
  a.deepEqual(b.validateEvidence(r.verification, r.jobs, social).jobs, r.jobs);
  a.throws(() => b.collectResumed(f.prior.verification, social, { priorCompletedAt: socialClock, supplements: material }), /source binding/);
  a.throws(() => b.validateEvidence(r.verification, r.jobs, site), /source.*binding/);
});

test('Tencent supplemental collector waits for bodies and rechecks early wakeups; HTTP denial stops without retry', async () => {
  const p = post(), e = external(), base = b.collectAvailable([page([p, e])], site); let clock = time, busy = false; const starts = [];
  const r = await b.fetchSupplemented(site, base.verification, { now: () => clock, sleep: async ms => { a.equal(busy, false); clock += Math.max(1, ms - 1); }, fetchImpl: async (url, options) => { a.equal(busy, false); busy = true; starts.push(clock); a.equal(options.redirect, 'error'); a.ok(options.signal instanceof AbortSignal); if (starts.length === 2) { busy = false; return { status: 403 }; } return { status: 200, json: async () => { clock += 75; busy = false; return detail(p).response; } }; } });
  a.equal(starts.length, 2); a.ok(starts[1] - starts[0] >= 200); a.equal(r.verification.supplements.length, 1); a.equal(r.verification.stopped.httpStatus, 403); a.equal(r.jobs[1].detail, null); a.equal(b.normalizeRecord(r.jobs[1], site).description, ''); a.equal(b.validateEvidence(r.verification, r.jobs, site).total, 2);
});
