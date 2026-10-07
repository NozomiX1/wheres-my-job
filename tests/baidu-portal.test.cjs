'use strict';
const test = require('node:test'), a = require('node:assert/strict');
const fs = require('node:fs'), os = require('node:os'), path = require('node:path');
const b = require('../crawler/lib/custom/baidu_portal');
const [campus, social] = b.PROFILES;
const uuid = n => '00000000-0000-4000-8000-' + String(n).padStart(12, '0');
function row(n = 1) {
  return { postId: uuid(n), jobId: uuid(1000 + n), name: '  北京-AIDU研发工程师(J100700)  ', postType: '技术', workPlace: '北京市,上海市',
    workContent: '  List<T> &amp; <b>文字</b>\r\n  同文\n', serviceCondition: '  List<T> &amp; <b>文字</b>\r\n  同文\n',
    publishDate: '2026-07-08', updateDate: '2026-08-05', projectType: 'AIDU', projectTypeCode: '1', hotFlag: true, extraNative: { retained: true } };
}
function page(site, type, n, list, total = String(list.length), pages = 1) {
  const data = { total, pageNum: n, pageSize: 10, list, size: 0, isLastPage: false, hasNextPage: true };
  if (pages !== undefined) data.pages = pages;
  return { recruitType: type, request: { url: site.api, method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8', Referer: site.track === 'social' ? site.url : site.url + '?search=&recruitType=' + type },
    body: { recruitType: type, curPage: n, pageSize: 10, keyWord: '', projectType: '' } }, httpStatus: 200, response: { status: 'ok', data } };
}
function sample(site = campus) {
  return b.collectAvailable(site.body.recruitTypes.map((type, i) => page(site, type, 1, [row(i + 1)])), site);
}
test('Baidu exactly two immutable profiles; changed identity/scope and malformed declarations cannot downgrade', () => {
  a.equal(b.PROFILES.length, 2);
  for (const site of b.PROFILES) {
    a.deepEqual(site, { key: site.track === 'campus' ? 'baidu' : 'baidu_social', company: '百度', ats: 'custom', adapter: 'baidu-portal-v1',
      track: site.track, batch: site.track === 'campus' ? '校园招聘（应届＋实习，项目不限）' : '社招', exclude: '(无)', origin: 'https://talent.baidu.com',
      api: 'https://talent.baidu.com/httservice/getPostListNew', url: 'https://talent.baidu.com/jobs/' + (site.track === 'campus' ? 'list' : 'social-list'), listJD: true,
      body: { recruitTypes: site.track === 'campus' ? ['GRADUATE', 'INTERN'] : ['SOCIAL'], pageSize: 10, keyWord: '', projectType: '' } });
    a.equal(b.verifiedSource(structuredClone(site)), true); a.equal(b.requiresVerification(site), true); a.ok(Object.isFrozen(site.body.recruitTypes));
    for (const bad of [{ ...site, ats: 'moka' }, { ...site, adapter: undefined }, { ...site, key: 'alias' }, { ...site, company: 'alias' },
      { ...site, body: { ...site.body, recruitTypes: ['GRADUATE'] } }, { ...site, body: { ...site.body, projectType: '1' } }, { ...site, url: site.url + '?keyword=AI' }]) {
      a.equal(b.verifiedSource(bad), false); a.equal(b.requiresVerification(bad), true); a.throws(() => b.validateJobs([], bad));
    }
    const deleted = structuredClone(site); delete deleted.adapter;
    a.equal(b.requiresVerification(deleted), true); a.equal(b.verifiedSource(deleted), false);
  }
  for (const bad of [{ api: 'POST ' + social.api }, { url: 'https://TALENT.BAIDU.COM:443/jobs/list' }, { url: 'relative' }, { origin: null }, { api: '%' }]) a.equal(b.requiresVerification(bad), true);
  a.equal(b.requiresVerification({ url: 'https://example.com/' }), false); a.equal(b.portalNotice({}), '');
  a.match(b.portalNotice(campus), /GRADUATE.*INTERN.*项目不限/); a.match(b.portalNotice(social), /SOCIAL/);
});
test('Baidu full native envelopes bind both campus types and social; postId, full title and React TEXT survive', () => {
  for (const site of b.PROFILES) {
    const r = sample(site); a.equal(r.complete, false); a.equal(r.total, site.body.recruitTypes.length); a.equal(r.verification.policy, 'available');
    a.deepEqual(b.validateEvidence(r.verification, r.jobs, site).jobs, r.jobs);
    a.equal(r.verification.pages[0].response.data.hasNextPage, true); // Other native pagination flags are not interpreted as a boundary.
    for (const job of r.jobs) {
      const native = structuredClone(job.post), j = b.normalizeRecord(job, site);
      a.equal(j.id, native.postId); a.notEqual(j.id, native.jobId); a.equal(j.title, native.name); a.equal(j.city, native.workPlace); a.equal(j.category, native.postType);
      a.equal(j.url, 'https://talent.baidu.com/jobs/detail/' + job.recruitType + '/' + native.postId); a.ok(!j.url.includes(native.jobId));
      a.equal(j.duty, native.workContent); a.equal(j.requirements, native.serviceCondition); a.equal(j.description, ''); a.equal(j.jdComplete, false);
      a.deepEqual(j.channels, job.recruitType === 'INTERN' ? [] : [site.track]); a.equal(j.employment, job.recruitType === 'INTERN' ? 'internship' : null);
      a.deepEqual([j.talentPlan, j.date, j.dateKind, j.sourceStatus], [null, null, null, null]); a.deepEqual(job.post, native);
      const unknown = b.normalizeRecord({ ...job, post: { ...native, workPlace: null, postType: null, workContent: null, serviceCondition: '/' } }, site);
      a.deepEqual([unknown.city, unknown.category, unknown.duty, unknown.requirements, unknown.jdComplete], ['', '', '', '/', false]);
    }
    a.ok(r.issues.includes('已收录列表JD，详情正文完整性待核验'));
  }
});
test('Baidu total drift and same/cross-type postId duplicates keep FIRST original type/order/nonblank JD', () => {
  const first = row(), blank = { ...row(), workContent: '', serviceCondition: null }, distinctPost = { ...row(2), jobId: first.jobId };
  const r = b.collectAvailable([page(campus, 'GRADUATE', 1, [first], '3', 2), page(campus, 'GRADUATE', 2, [blank, distinctPost], 4, 2),
    page(campus, 'INTERN', 1, [blank, row(3)], '2')], campus);
  a.equal(r.total, 3); a.deepEqual(r.jobs.map(j => j.recruitType), ['GRADUATE', 'GRADUATE', 'INTERN']); a.deepEqual(r.jobs[0].post, first);
  a.deepEqual(r.verification.pages[2].response.data.list[0], blank); a.match(r.issues.join(';'), /重复postId 2.*首次.*GRADUATE官方total 3→4；实际唯一岗位 2/);
  a.equal(b.validateEvidence(r.verification, r.jobs, campus).complete, false);
  a.throws(() => b.validateJobs([r.jobs[0], r.jobs[0]], campus), /duplicate/);
});
test('Baidu revalidation rejects request/header/type/page/job tampering and false business/total shapes', () => {
  const original = sample();
  for (const mutate of [
    r => r.verification.pages[0].request.url += '?keyword=AI', r => r.verification.pages[0].request.method = 'GET',
    r => delete r.verification.pages[0].request.headers.Referer, r => r.verification.pages[0].request.headers['User-Agent'] = 'spoof',
    r => r.verification.pages[0].request.headers.Origin = campus.origin, r => r.verification.pages[0].request.headers.Cookie = 'session',
    r => r.verification.pages[0].request.body.recruitType = 'INTERN', r => r.verification.pages[0].request.body.projectType = '1',
    r => r.verification.pages[0].request.body.curPage = 2, r => r.verification.pages[0].recruitType = 'INTERN',
    r => r.verification.pages.reverse(), r => r.verification.pages[0].httpStatus = 403, r => r.verification.pages[0].response.status = 'no-auth',
    r => r.verification.pages[0].response.data.pageNum = '1', r => r.verification.pages[0].response.data.pageSize = 100,
    r => r.verification.pages[0].response.data.total = '', r => r.verification.pages[0].response.data.total = null,
    r => r.verification.pages[0].response.data.total = false, r => r.verification.pages[0].response.data.total = '1.5',
    r => r.verification.pages[0].response.data.total = Number.MAX_SAFE_INTEGER + 1, r => delete r.verification.pages[0].response.data.total,
    r => r.verification.pages[0].response.data.pages = '1', r => r.verification.pages[0].response.data.pages = 0,
    r => r.verification.pages[0].response.data.pages = 1.5, r => r.verification.pages[0].response.data.pages = null,
    r => r.verification.pages[0].response.data.list = Array(1), r => delete r.verification.pages[0].response.data.list,
    r => r.verification.key = social.key, r => r.verification.policy = 'complete', r => r.jobs[0].post.workContent = 'invented',
    r => r.jobs[0].recruitType = 'INTERN', r => r.jobs[0].post.postId = r.jobs[0].post.jobId
  ]) { const bad = JSON.parse(JSON.stringify(original)); mutate(bad); a.throws(() => b.validateEvidence(bad.verification, bad.jobs, campus)); }
  a.throws(() => b.collectAvailable([page(social, 'SOCIAL', 1, [row()]), page(social, 'SOCIAL', 2, [row(2)])], social), /extra request/);
  a.throws(() => b.collectAvailable([page(campus, 'GRADUATE', 1, [row()], '2', 2), page(campus, 'INTERN', 1, [row(2)])], campus), /binding/);
});
test('Baidu invalid native rows skip with an issue, but no usable rows/zero cannot become a clearing update', () => {
  const invalid = [{ ...row(), postId: 'not-a-uuid' }, { ...row(), name: 42 }, { ...row(), workContent: {} }, { ...row(), postType: ['技术'] }];
  const missing = row(); delete missing.serviceCondition; invalid.push(missing);
  const r = b.collectAvailable([page(social, 'SOCIAL', 1, [...invalid, row(2)], '6')], social);
  a.equal(r.total, 1); a.match(r.issues.join(';'), /列表记录未应用/);
  a.throws(() => b.collectAvailable([page(social, 'SOCIAL', 1, invalid)], social), /zero cannot clear/);
  a.throws(() => b.collectAvailable([page(social, 'SOCIAL', 1, [], '0', 0)], social), /zero cannot clear/);
  a.throws(() => b.validateJobs([], campus), /zero cannot clear/);
  a.throws(() => b.normalizeRecord({ recruitType: 'SOCIAL', post: row() }, campus), /binding/);
});
test('Baidu normal form headers, serial starts >=200ms/body completion, native last page avoids beyond-last requests', async () => {
  for (const site of b.PROFILES) {
    let busy = false, clock = 0; const calls = [], starts = [];
    const r = await b.fetchAvailable(site, { now: () => clock, sleep: async ms => { a.equal(busy, false); a.ok(ms >= 200); clock += ms; },
      fetchImpl: async (url, options) => {
        a.equal(busy, false); busy = true; starts.push(clock);
        const params = new URLSearchParams(options.body), type = params.get('recruitType'), n = Number(params.get('curPage')); calls.push([type, n]);
        const expected = page(site, type, n, [row(calls.length)], '19', 2);
        a.equal(url, site.api); a.equal(options.method, 'POST'); a.equal(options.redirect, 'error'); a.ok(options.signal instanceof AbortSignal);
        a.deepEqual(options.headers, expected.request.headers); a.equal(options.body, `recruitType=${type}&curPage=${n}&pageSize=10&keyWord=&projectType=`);
        return { status: 200, json: async () => { await Promise.resolve(); busy = false; return expected.response; } };
      } });
    a.deepEqual(calls, site.body.recruitTypes.flatMap(type => [[type, 1], [type, 2]])); a.equal(r.total, calls.length);
    a.ok(starts.every((v, i) => !i || v - starts[i - 1] >= 200)); a.equal(r.complete, false);
  }
});
test('Baidu without native pages uses empty EOF, not short-page/total/other pagination flags', async () => {
  let calls = 0;
  const r = await b.fetchAvailable(social, { sleep: async () => {}, fetchImpl: async () => {
    calls++; const raw = page(social, 'SOCIAL', calls, calls === 3 ? [] : [row(calls)], '1'); delete raw.response.data.pages;
    raw.response.data.isLastPage = true; raw.response.data.hasNextPage = false;
    return { status: 200, json: async () => raw.response };
  } });
  a.equal(calls, 3); a.equal(r.total, 2); a.equal(b.validateEvidence(r.verification, r.jobs, social).total, 2);
  const extra = structuredClone(r); extra.verification.pages.push(page(social, 'SOCIAL', 4, [row(4)], '1'));
  a.throws(() => b.validateEvidence(extra.verification, extra.jobs, social), /extra request/);
});
test('Baidu HTTP/business/transport/JSON/list failure stops ALL remaining types without retry, retaining earlier usable rows', async () => {
  for (const failAt of ['GRADUATE', 'INTERN']) for (const kind of ['HTTP', 'business', 'transport', 'JSON', 'list']) {
    const calls = [];
    const r = await b.fetchAvailable(campus, { sleep: async () => {}, fetchImpl: async (_, options) => {
      const form = new URLSearchParams(options.body), type = form.get('recruitType'), n = Number(form.get('curPage')); calls.push([type, n]);
      const fail = type === failAt && (type === 'INTERN' || n === 2);
      if (fail && kind === 'transport') throw new Error('transport failure');
      const raw = page(campus, type, n, [row(calls.length)], '19', failAt === 'GRADUATE' ? 2 : 1);
      if (fail && kind === 'business') raw.response = { status: 'no-auth', message: 'illegal-visit' };
      if (fail && kind === 'list') delete raw.response.data.list;
      return { status: fail && kind === 'HTTP' ? 412 : 200, json: async () => { if (fail && kind === 'JSON') throw new SyntaxError('invalid JSON'); return raw.response; } };
    } });
    a.deepEqual(calls, failAt === 'GRADUATE' ? [['GRADUATE', 1], ['GRADUATE', 2]] : [['GRADUATE', 1], ['INTERN', 1]]);
    a.equal(r.total, 1); a.equal(r.complete, false); a.match(r.issues.join(';'), /请求停止.*INTERN尚未取得/);
    a.equal(r.verification.stopped.recruitType, failAt); a.equal(b.validateEvidence(r.verification, r.jobs, campus).total, 1);
    if (kind === 'business') a.deepEqual(r.verification.stopped.response, { status: 'no-auth', message: 'illegal-visit' });
    const tampered = structuredClone(r); tampered.verification.stopped.request.body.curPage++;
    a.throws(() => b.validateEvidence(tampered.verification, tampered.jobs, campus), /stopped request/);
    const success = structuredClone(r); const stopped = success.verification.stopped;
    stopped.httpStatus = 200; stopped.response = page(campus, failAt, stopped.request.body.curPage, [row(99)]).response;
    a.throws(() => b.validateEvidence(success.verification, success.jobs, campus), /successful page/);
  }
});
test('Baidu empty first type may continue, but initial refusal/empty source reject; caps and 900000ms stop conservatively', async () => {
  let calls = 0;
  const mixed = await b.fetchAvailable(campus, { sleep: async () => {}, fetchImpl: async (_, options) => {
    calls++; const type = new URLSearchParams(options.body).get('recruitType'), raw = page(campus, type, 1, type === 'GRADUATE' ? [] : [row()], type === 'GRADUATE' ? '0' : '1', type === 'GRADUATE' ? 0 : 1);
    return { status: 200, json: async () => raw.response };
  } });
  a.equal(calls, 2); a.equal(mixed.jobs[0].recruitType, 'INTERN');
  calls = 0; await a.rejects(b.fetchAvailable(campus, { sleep: async () => {}, fetchImpl: async () => { calls++; return { status: 403 }; } }), /HTTP/); a.equal(calls, 1);
  calls = 0;
  const capped = await b.fetchAvailable(campus, { maxPages: 2, sleep: async () => {}, fetchImpl: async () => {
    calls++; return { status: 200, json: async () => page(campus, 'GRADUATE', calls, [row()], '3000', 300).response };
  } });
  a.equal(calls, 2); a.equal(capped.total, 1); a.match(capped.issues.join(';'), /安全上限.*INTERN尚未取得/);
  let clock = 0; calls = 0;
  const timed = await b.fetchAvailable(campus, { now: () => clock, sleep: async ms => { clock += ms; }, fetchImpl: async () => {
    calls++; return { status: 200, json: async () => { clock = 900000; return page(campus, 'GRADUATE', 1, [row()]).response; } };
  } });
  a.equal(calls, 1); a.equal(timed.total, 1); a.match(timed.issues.join(';'), /进程安全时限.*INTERN尚未取得/);
  await a.rejects(b.fetchAvailable(campus, { maxPages: 201, fetchImpl: async () => { throw new Error('must not request'); } }), /limits/);
});
test('Baidu run atomically writes available envelope; refusal/zero/no usable rows leave candidate and no temp', async t => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ande-baidu-test-')); t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const file = path.join(dir, 'candidate.json'); fs.writeFileSync(file, 'old real candidate');
  for (const reply of [{ status: 412 }, { status: 200, json: async () => page(social, 'SOCIAL', 1, [], '0', 0).response },
    { status: 200, json: async () => page(social, 'SOCIAL', 1, [{ ...row(), postId: 'invalid' }]).response }]) {
    await a.rejects(b.run([JSON.stringify(social), file], { sleep: async () => {}, fetchImpl: async () => reply }));
    a.equal(fs.readFileSync(file, 'utf8'), 'old real candidate'); a.deepEqual(fs.readdirSync(dir), ['candidate.json']);
  }
  const written = await b.run([JSON.stringify(social), file], { sleep: async () => {}, fetchImpl: async () => ({ status: 200, json: async () => page(social, 'SOCIAL', 1, [row()]).response }) });
  a.equal(written.mode, 'custom'); a.equal(written.complete, false); a.equal(written.key, social.key);
  a.deepEqual(JSON.parse(fs.readFileSync(file, 'utf8')), written); a.deepEqual(fs.readdirSync(dir), ['candidate.json']);
  await a.rejects(b.run([JSON.stringify(campus)]), /Usage/);
});
