'use strict';
const test = require('node:test'), a = require('node:assert/strict');
const b = require('../crawler/lib/custom/jd_portal');
const [campus, social] = b.PROFILES;
// Current normal Node job_count receipt; its completion clock is not part of the wire evidence.
const countRequest = {
  url: 'https://zhaopin.jd.com/web/job/job_count', method: 'POST',
  headers: { Accept: '*/*', 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8', Referer: 'https://zhaopin.jd.com/web/job/job_info_list/3', Origin: 'https://zhaopin.jd.com' },
  body: 'workCityJson=%5B%5D&jobTypeJson=%5B%5D&jobSearch=&depTypeJson=%5B%5D'
};
function count(response = 1838) { return { request: structuredClone(countRequest), httpStatus: 200, response }; }
function row(n) { return { requirementId: n, positionNameOpen: '原岗位 ' + n, workContent: '完整职责\n<b>原文</b>', qualification: '完整要求', workCity: '北京市', jobType: '运营类' }; }
function pages(posts) {
  const result = [];
  for (let start = 0; start < posts.length; start += 100) result.push({ request: b.requestFor(social, result.length + 1), httpStatus: 200, response: posts.slice(start, start + 100) });
  return result;
}
test('JD independent social count keeps raw slots, unique jobs and legacy v2 distinct', () => {
  const posts = Array.from({ length: 1828 }, (_, i) => row(i + 1)); posts.push(...posts.slice(0, 10));
  const list = pages(posts), receipt = count(), notes = ['计数完成2026-10-08T13:58:45.385Z；列表完成2026-10-08T14:00:40.646Z，独立收据'];
  const legacy = b.collectAvailable(list, social), current = b.collectAvailable(list, social, notes, null, receipt);
  a.deepEqual(b.countRequestFor(social), countRequest);
  a.equal(legacy.verification.version, 2); a.equal(Object.hasOwn(legacy.verification, 'count'), false);
  a.match(legacy.issues.join(';'), /列表无官方total/); a.deepEqual(b.validateEvidence(legacy.verification, legacy.jobs, social).jobs, legacy.jobs);
  a.equal(current.verification.version, 3); a.deepEqual(current.verification.count, receipt); a.deepEqual(current.verification.pages, list);
  a.equal(current.total, 1828); a.equal(current.complete, false); a.deepEqual(current.jobs, legacy.jobs);
  a.ok(current.issues.includes(notes[0])); a.match(current.issues.join(';'), /官网计数1838、列表原槽1838、唯一1828、重复10/);
  a.match(current.issues.join(';'), /列表参考数.*不等于唯一岗位数/); a.doesNotMatch(current.issues.join(';'), /列表无官方total/);
  a.deepEqual(b.validateEvidence(current.verification, current.jobs, social).jobs, current.jobs);
  receipt.response = 999; a.equal(current.verification.count.response, 1838); a.ok(Object.isFrozen(current.verification.count));
});
test('JD native count is bound only to exact social source, POST form, headers, HTTP and numeric response', () => {
  const list = pages([row(1)]), valid = b.collectAvailable(list, social, [], null, count(1));
  a.throws(() => b.countRequestFor(campus), /count.*jd_social/);
  for (const patch of [{ key: 'another_key' }, { company: '其它公司' }, { body: {} }, { adapter: undefined }]) {
    a.throws(() => b.collectAvailable(list, { ...social, ...patch }, [], null, count(1)), /source/);
    a.throws(() => b.countRequestFor({ ...social, ...patch }), /source/);
  }
  const mutations = [
    c => c.request.url = social.api, c => c.request.method = 'GET', c => c.request.body += '&jobSearch=AI',
    c => c.request.body = { workCityJson: '[]', jobTypeJson: '[]', jobSearch: '', depTypeJson: '[]' },
    c => c.request.body = 'workCityJson=[]&jobTypeJson=[]&jobSearch=&depTypeJson=[]',
    c => c.request.headers.Accept = 'application/json, text/plain, */*', c => c.request.headers.Referer = campus.url,
    c => c.request.headers.Origin = campus.origin, c => c.request.headers['Content-Type'] = 'application/json;charset=UTF-8',
    c => c.request.headers.Cookie = 'session=forged', c => c.finishedAt = '2026-10-08T13:58:45.385Z',
    c => delete c.response,
    ...[403, 429, 201, '200', null].map(status => c => c.httpStatus = status),
    ...[-1, 1.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1, '1838', '0', '<html>1838</html>', '', null, true, [1838], { total: 1838 }].map(response => c => c.response = response)
  ];
  for (const mutate of mutations) {
    const bad = structuredClone(valid); mutate(bad.verification.count);
    a.throws(() => b.collectAvailable(list, social, [], null, bad.verification.count));
    a.throws(() => b.validateEvidence(bad.verification, bad.jobs, social));
  }
  for (const mutate of [e => e.key = campus.key, e => e.api = campus.api, e => e.version = 2, e => delete e.count, e => e.count = null]) {
    const bad = structuredClone(valid); mutate(bad.verification); a.throws(() => b.validateEvidence(bad.verification, bad.jobs, social));
  }
  const badJob = JSON.parse(JSON.stringify(valid)); badJob.jobs[0].post.workContent = '虚构正文';
  a.throws(() => b.validateEvidence(badJob.verification, badJob.jobs, social), /jobs\/native evidence binding/);
  const campusPage = { request: b.requestFor(campus, 0), httpStatus: 200, response: { success: true, body: { totalNumber: 1, items: [{ publishId: 1, positionName: '校园原岗位', workContent: '', qualification: '', requirementVoList: [] }] } } };
  a.throws(() => b.collectAvailable([campusPage], campus, [], null, count(1)), /count.*jd_social/);
});
test('JD count discrepancies and zero remain available facts, never endpoints or permission to clear', () => {
  const list = pages([row(1), row(1), row(2)]), legacy = b.collectAvailable(list, social);
  for (const reference of [0, 1, 3, 999, Number.MAX_SAFE_INTEGER]) {
    const r = b.collectAvailable(list, social, ['原收据差异待补'], null, count(reference));
    a.equal(r.complete, false); a.equal(r.total, 2); a.deepEqual(r.jobs, legacy.jobs); a.ok(r.issues.includes('原收据差异待补'));
    a.ok(r.issues.some(issue => issue.includes('官网计数' + reference + '、列表原槽3、唯一2、重复1')));
    a.deepEqual(b.validateEvidence(r.verification, r.jobs, social).jobs, legacy.jobs);
  }
  a.throws(() => b.collectAvailable([{ request: b.requestFor(social, 1), httpStatus: 200, response: [] }], social, [], null, count(0)), /zero cannot clear/);
  a.throws(() => b.collectAvailable([], social, [], null, count(0)), /evidence limits/);
});
test('JD social fetch obtains independent count before paced serial list, without count-based endpoint', async () => {
  const responses = [1, Array.from({ length: 100 }, (_, i) => row(i + 1)), [row(101)]];
  let clock = 0, busy = false, index = 0; const starts = [], sleeps = [], requests = [];
  const r = await b.fetchAvailable(social, { now: () => clock, sleep: async ms => {
    a.equal(busy, false); sleeps.push(ms); clock += ms > 1 ? ms - 1 : ms;
  }, fetchImpl: async (url, options) => {
    a.equal(busy, false); busy = true; starts.push(clock); requests.push({ url, method: options.method, headers: options.headers, body: options.body });
    a.equal(options.redirect, 'error'); a.ok(options.signal instanceof AbortSignal);
    const response = responses[index++];
    return { status: 200, json: async () => { await Promise.resolve(); busy = false; return response; } };
  } });
  a.equal(index, 3); a.deepEqual(requests[0], countRequest); a.deepEqual(starts, [0, 200, 400]); a.deepEqual(sleeps, [200, 1, 200, 1]);
  a.equal(requests[1].url, social.api); a.equal(requests[1].body, 'pageIndex=1&pageSize=100&workCityJson=%5B%5D&jobTypeJson=%5B%5D&jobSearch=&depTypeJson=%5B%5D');
  a.equal(requests[2].body, 'pageIndex=2&pageSize=100&workCityJson=%5B%5D&jobTypeJson=%5B%5D&jobSearch=&depTypeJson=%5B%5D');
  a.equal(r.verification.version, 3); a.deepEqual(r.verification.count, count(1)); a.equal(r.verification.pages.length, 2);
  a.equal(r.total, 101); a.equal(r.complete, false); a.match(r.issues.join(';'), /官网计数1、列表原槽101、唯一101、重复0/);
  a.deepEqual(b.validateEvidence(r.verification, r.jobs, social).jobs, r.jobs);
});
test('JD count refusal or malformed response stops before any list, with no retries or fake zero', async () => {
  for (const failure of [
    { status: 403 }, { status: 429 },
    ...[{ success: false }, '1838', '<html>refused</html>', null, -1, 1.5].map(response => ({ status: 200, response })),
    { status: 200, jsonError: true }
  ]) {
    let calls = 0, reads = 0;
    await a.rejects(b.fetchAvailable(social, { fetchImpl: async (url, options) => {
      calls++; a.equal(url, countRequest.url); a.deepEqual({ url, method: options.method, headers: options.headers, body: options.body }, countRequest);
      return { status: failure.status, json: async () => { reads++; if (failure.jsonError) throw new Error('body parse failure'); return failure.response; } };
    } }));
    a.equal(calls, 1); a.equal(reads, failure.status === 200 ? 1 : 0);
  }
});
test('JD count zero still fetches real list; empty or refused lists cannot become successful zero', async () => {
  for (const response of [[row(1)], []]) {
    let clock = 0, calls = 0;
    const result = b.fetchAvailable(social, { now: () => clock, sleep: async ms => { clock += ms; }, fetchImpl: async url => {
      calls++; a.equal(url, calls === 1 ? countRequest.url : social.api);
      return { status: 200, json: async () => calls === 1 ? 0 : response };
    } });
    if (!response.length) await a.rejects(result, /zero cannot clear/);
    else { const r = await result; a.equal(r.total, 1); a.equal(r.complete, false); a.match(r.issues.join(';'), /官网计数0、列表原槽1、唯一1、重复0/); }
    a.equal(calls, 2);
  }
  let clock = 0, calls = 0;
  await a.rejects(b.fetchAvailable(social, { now: () => clock, sleep: async ms => { clock += ms; }, fetchImpl: async () => {
    calls++; return { status: calls === 1 ? 200 : 403, json: async () => 0 };
  } }), /HTTP 403/);
  a.equal(calls, 2);
});
test('JD list refusal after independent count preserves acquired jobs and stopped evidence', async () => {
  for (const failure of ['HTTP', 'business', 'JSON']) {
    let clock = 0, calls = 0;
    const r = await b.fetchAvailable(social, { now: () => clock, sleep: async ms => { clock += ms; }, fetchImpl: async url => {
      calls++; a.equal(url, calls === 1 ? countRequest.url : social.api);
      return { status: calls === 3 && failure === 'HTTP' ? 429 : 200, json: async () => {
        if (calls === 1) return 1;
        if (calls === 2) return Array.from({ length: 100 }, (_, i) => row(i + 1));
        if (failure === 'JSON') throw new Error('list JSON failed'); return { success: false };
      } };
    } });
    a.equal(calls, 3); a.equal(r.total, 100); a.equal(r.complete, false); a.deepEqual(r.verification.count, count(1));
    a.equal(r.verification.pages.length, 1); a.deepEqual(r.verification.stopped.request, b.requestFor(social, 2));
    a.match(r.issues.join(';'), /请求停止/); a.match(r.issues.join(';'), /官网计数1、列表原槽100、唯一100、重复0/);
    a.equal(b.validateEvidence(r.verification, r.jobs, social).total, 100);
  }
});
