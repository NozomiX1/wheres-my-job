'use strict';
const test = require('node:test'), a = require('node:assert/strict');
const fs = require('node:fs'), os = require('node:os'), path = require('node:path');
const x = require('../crawler/lib/custom/xiaohongshu_portal');
const [campus, social] = x.PROFILES;
const headers = { 'Content-Type': 'application/json', Accept: 'application/json' };
function row(id = 1) {
  return { positionId: id, positionName: '  岗位 ' + id + '  ', amountInNeed: null, workplaceIds: '1100,3100', workplace: '北京市，上海市',
    publishTime: '2026-10-01', recruitStatus: 'in_recruitment', duty: '  List<T> &amp;\n  同文\n', qualification: '  List<T> &amp;\n  同文\n',
    jobType: '后端开发', jobProjectName: '', direction: null, directionName: null, subDirection: null, subDirectionName: null, labels: null };
}
function page(site, n, list, total = 3) {
  return { request: { url: site.api, method: 'POST', headers: { ...headers }, body: { ...structuredClone(site.body), pageNum: n } }, httpStatus: 200,
    response: { statusCode: 200, alertMsg: '成功', timestamp: 'native', path: '/native', success: true, errorCode: 200, errorMsg: '成功',
      data: { pageNum: n, pageSize: site.body.pageSize, total, totalPage: Math.ceil(total / site.body.pageSize), list } } };
}
function sample(site = campus) {
  const newer = { ...row(1), duty: '\n newer literal <b> &lt; \n', extraMetadata: { untouched: true } };
  return x.collectAvailable([page(site, 1, [row(1)], 3), page(site, 2, [newer, row(2)], 4), page(site, 3, [], 4)], site);
}
test('XHS fixed independent profiles cannot inherit aliases, altered scopes or generic fallback', () => {
  for (const site of x.PROFILES) {
    a.equal(x.verifiedSource(structuredClone(site)), true); a.equal(x.requiresVerification(site), true);
    a.equal(site.adapter, 'xiaohongshu-portal-v1'); a.equal(site.exclude, '(无)'); a.equal(site.listJD, true);
    for (const bad of [{ ...site, ats: 'moka' }, { ...site, adapter: undefined }, { ...site, company: 'alias' }, { ...site, key: 'alias' },
      { ...site, body: { ...site.body, pageSize: 50 } }, { ...site, url: site.url + '?keyword=AI' }]) {
      a.equal(x.verifiedSource(bad), false); a.equal(x.requiresVerification(bad), true); a.throws(() => x.validateJobs([], bad));
    }
  }
  a.deepEqual(campus.body.jobProjects, ['campus_autumn_27']); a.equal(Object.hasOwn(social.body, 'jobProjects'), false);
  a.equal(x.verifiedSource({ ...campus, body: { ...campus.body, jobProjects: [] } }), false);
  a.equal(x.requiresVerification({ api: 'POST ' + social.api }), true); a.equal(x.requiresVerification({ url: 'relative' }), true);
  a.equal(x.requiresVerification({ url: 'https://example.com/' }), false); a.equal(x.portalNotice({}), '');
  a.match(x.portalNotice(campus), /regular.*REDstar.*Ace/);
});
test('XHS TEXT two slots, equal text and genuine slash remain exact; metadata stays conservative', () => {
  for (const site of x.PROFILES) {
    const native = row(), j = x.normalizeRecord(native, site);
    a.equal(j.id, '1'); a.equal(j.title, native.positionName); a.equal(j.city, native.workplace);
    a.equal(j.duty, native.duty); a.equal(j.requirements, native.qualification); a.equal(j.description, ''); a.equal(j.jdComplete, false);
    a.deepEqual(j.channels, [site.track]); a.deepEqual([j.employment, j.talentPlan, j.date, j.dateKind], [null, null, null, null]);
    a.equal(j.sourceStatus, 'in_recruitment'); a.equal(x.normalizeRecord({ ...native, recruitStatus: '' }, site).sourceStatus, null); a.equal(j.category, site.track === 'social' ? native.jobType : '');
    a.equal(j.url, site.url + '/1'); a.equal(x.normalizeRecord({ ...native, duty: '/', qualification: '/' }, site).duty, '/');
    const unknown = x.normalizeRecord({ ...native, workplace: null, jobType: { name: 'unproved' }, recruitStatus: null, duty: null }, site);
    a.deepEqual([unknown.city, unknown.category, unknown.sourceStatus, unknown.duty], ['', '', null, '']);
    a.throws(() => x.normalizeRecord({ ...native, duty: {} }, site));
  }
});
test('XHS available dedup uses numeric native ID, retains all evidence and separates native totals', () => {
  for (const site of x.PROFILES) {
    const r = sample(site); a.equal(r.complete, false); a.equal(r.total, 2); a.equal(r.verification.policy, 'available');
    a.equal(r.verification.pages.length, 3); a.equal(r.jobs[0].duty, '\n newer literal <b> &lt; \n'); a.deepEqual(r.jobs[0].extraMetadata, { untouched: true });
    a.ok(Array.isArray(x.validateEvidence(r.verification, r.jobs, site).issues));
    a.match(r.issues.join(';'), /重复身份.*官方total 3→4；实际唯一岗位 2/); a.ok(r.issues.includes('已收录列表JD，详情正文完整性待核验'));
    r.verification.pages[0].response.extra = { native: true }; r.verification.pages[0].response.data.totalPage = 999;
    a.equal(x.validateEvidence(r.verification, r.jobs, site).total, 2);
  }
});
test('XHS request/business/vital shape and jobs must bind; partial evidence is not a fake zero', () => {
  const original = sample();
  for (const mutate of [
    r => r.verification.pages[0].request.url += '?keyword=AI', r => r.verification.pages[0].request.method = 'GET',
    r => r.verification.pages[0].request.headers['User-Agent'] = 'spoof', r => r.verification.pages[0].request.body.recruitType = 'social',
    r => r.verification.pages[0].request.body.jobProjects = [], r => r.verification.pages[0].httpStatus = 412,
    r => r.verification.pages[0].response.statusCode = '200', r => r.verification.pages[0].response.success = false,
    r => r.verification.pages[0].response.errorCode = 403, r => r.verification.pages[0].response.data.pageNum = 2,
    r => r.verification.pages[0].response.data.pageSize = 100, r => r.verification.pages[0].response.data.total = '3',
    r => delete r.verification.pages[0].response.data.list, r => r.verification.pages[0].response.data.list = null,
    r => r.verification.pages[0].response.data.list = Array(1),
    r => r.verification.policy = 'complete', r => r.verification.key = social.key, r => r.jobs[0] = { ...r.jobs[0], duty: 'invented' }
  ]) { const bad = structuredClone(original); mutate(bad); a.throws(() => x.validateEvidence(bad.verification, bad.jobs, campus)); }
  const partial = x.collectAvailable([page(campus, 1, [row()])], campus); a.equal(partial.complete, false); a.match(partial.issues.join(';'), /分页未穷尽/);
  a.throws(() => x.collectAvailable([page(campus, 1, [], 0)], campus), /zero cannot clear/);
  const invalid = [{ ...row(), positionId: '1' }, { ...row(), positionId: 0 }, { ...row(), positionId: Number.MAX_SAFE_INTEGER + 1 }];
  const skipped = x.collectAvailable([page(campus, 1, [...invalid, row(2)])], campus); a.equal(skipped.total, 1); a.match(skipped.issues.join(';'), /未应用/);
  a.throws(() => x.validateJobs([row(), row()], campus), /duplicate/);
});
test('XHS single serial scan continues duplicate and short pages until empty EOF without details', async () => {
  for (const site of x.PROFILES) {
    let calls = 0, busy = false, clock = 0; const starts = [], waits = [];
    const result = await x.fetchAvailable(site, { sleep: async ms => { a.equal(busy, false); waits.push(ms); clock += ms; }, fetchImpl: async (url, options) => {
      a.equal(busy, false); busy = true; starts.push(clock); calls++;
      a.equal(url, site.api); a.equal(options.method, 'POST'); a.deepEqual(options.headers, headers); a.equal(options.redirect, 'error'); a.ok(options.signal instanceof AbortSignal);
      a.deepEqual(JSON.parse(options.body), { ...structuredClone(site.body), pageNum: calls });
      const raw = page(site, calls, calls === 1 ? [row()] : calls === 2 ? [row(), row(2)] : [], calls === 1 ? 1 : 2);
      return { status: 200, json: async () => { await Promise.resolve(); busy = false; return raw.response; } };
    } });
    a.equal(calls, 3); a.equal(result.total, 2); a.ok(waits.every(ms => ms >= 200)); a.ok(starts.every((v, i) => !i || v - starts[i - 1] >= 200));
  }
});
test('XHS later refusal/transport/JSON/vital errors stop without retry and preserve prior valid jobs', async () => {
  for (const kind of ['HTTP', 'business', 'transport', 'JSON', 'list']) {
    let calls = 0;
    const result = await x.fetchAvailable(social, { sleep: async () => {}, fetchImpl: async () => {
      calls++; if (calls === 2 && kind === 'transport') throw new Error('transport failure');
      const raw = page(social, calls, [row()]);
      if (calls === 2 && kind === 'business') raw.response.statusCode = 403;
      if (calls === 2 && kind === 'list') delete raw.response.data.list;
      return { status: calls === 2 && kind === 'HTTP' ? 412 : 200, json: async () => { if (calls === 2 && kind === 'JSON') throw new SyntaxError('invalid JSON'); return raw.response; } };
    } });
    a.equal(calls, 2); a.equal(result.total, 1); a.equal(result.complete, false); a.match(result.issues.join(';'), /请求停止/);
    a.equal(result.verification.stopped.request.body.pageNum, 2); a.equal(x.validateEvidence(result.verification, result.jobs, social).total, 1);
    const bad = structuredClone(result); bad.verification.stopped.request.body.pageNum = 3;
    a.throws(() => x.validateEvidence(bad.verification, bad.jobs, social));
  }
});
test('XHS pagination ceiling is partial, while no usable result never overwrites an old candidate', async t => {
  let calls = 0;
  const fetchImpl = async () => { calls++; return { status: 200, json: async () => page(campus, calls, [row()], 10000).response }; };
  const capped = await x.fetchAvailable(campus, { sleep: async () => {}, fetchImpl, maxPages: 2 });
  a.equal(calls, 2); a.equal(capped.total, 1); a.equal(capped.complete, false); a.match(capped.issues.join(';'), /安全上限/);
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ande-xhs-test-')); t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const file = path.join(dir, 'candidate.json'); fs.writeFileSync(file, 'old real candidate');
  await a.rejects(x.run([JSON.stringify(campus), file], { sleep: async () => {}, fetchImpl: async () => ({ status: 412 }) }));
  a.equal(fs.readFileSync(file, 'utf8'), 'old real candidate'); a.deepEqual(fs.readdirSync(dir), ['candidate.json']);
  await a.rejects(x.run([JSON.stringify(campus), file], { sleep: async () => {}, fetchImpl: async () => ({ status: 200, json: async () => page(campus, 1, [], 0).response }) }));
  a.equal(fs.readFileSync(file, 'utf8'), 'old real candidate');
  calls = 0;
  const written = await x.run([JSON.stringify(campus), file], { sleep: async () => {}, fetchImpl, maxPages: 2 });
  a.equal(written.complete, false); a.equal(written.mode, 'custom'); a.deepEqual(JSON.parse(fs.readFileSync(file, 'utf8')), written);
  a.deepEqual(fs.readdirSync(dir), ['candidate.json']);
  await a.rejects(x.fetchAvailable(campus, { maxPages: 201, fetchImpl: async () => { throw new Error('must not request'); } }));
});
test('XHS REDstar/Ace/intern entries keep the observed project codes and page sizes, no alias fallback', () => {
  const map = Object.fromEntries(x.PROFILES.map(p => [p.key, p]));
  a.deepEqual(Object.keys(map), ['xiaohongshu', 'xiaohongshu_social', 'xiaohongshu_redstar', 'xiaohongshu_ace', 'xiaohongshu_intern']);
  a.deepEqual(map.xiaohongshu_redstar.body.jobProjects, ['red_star_27']); a.equal(map.xiaohongshu_redstar.body.pageSize, 100);
  a.deepEqual(map.xiaohongshu_ace.body.jobProjects, ['top_intern_program']); a.equal(map.xiaohongshu_ace.body.pageSize, 100);
  a.deepEqual(map.xiaohongshu_intern.body.jobProjects, ['madang_trainee', 'other_project']); a.equal(map.xiaohongshu_intern.body.pageSize, 10);
  for (const key of ['xiaohongshu_redstar', 'xiaohongshu_ace', 'xiaohongshu_intern']) {
    const site = map[key];
    a.equal(x.verifiedSource(structuredClone(site)), true); a.equal(x.requiresVerification(site), true);
    a.equal(x.verifiedSource({ ...site, body: { ...site.body, pageSize: 50 } }), false);
    a.equal(x.verifiedSource({ ...site, body: { ...site.body, jobProjects: [] } }), false);
    a.equal(x.verifiedSource({ ...site, key: 'xiaohongshu' }), false); a.equal(x.verifiedSource({ ...site, ats: 'moka' }), false);
    a.match(x.portalNotice(site), /(REDstar|Ace|实习生)/); a.match(x.portalNotice(site), /完整性未验证/);
    const r = x.collectAvailable([page(site, 1, [row()], 1), page(site, 2, [], 1)], site);
    a.equal(r.complete, false); a.equal(r.total, 1); a.equal(r.jobs[0].positionId, 1); a.deepEqual(x.normalizeRecord(r.jobs[0], site).channels, ['campus']);
    a.equal(x.normalizeRecord(r.jobs[0], site).url, site.url + '/1'); a.equal(x.validateEvidence(r.verification, r.jobs, site).total, 1);
    const bad = structuredClone(r); bad.verification.pages[0].request.body.jobProjects = ['campus_autumn_27']; a.throws(() => x.validateEvidence(bad.verification, bad.jobs, site));
  }
});
