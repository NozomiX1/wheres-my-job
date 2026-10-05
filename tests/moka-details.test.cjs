// Offline only: local AES and injected fetch/sleep; no live Moka requests.
// Run: node --test tests/moka-details.test.cjs
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const moka = require('../crawler/lib/moka');
const IV = 'de7c21ed8d6f50fe';
const KEY = '0123456789abcdef';
const CONFIG = { orgId: 'step', siteId: '1', site: 'social', aesIv: IV };
const job = (id = 'a', fields = {}) => ({ id, title: '官网岗位', ...fields });
// Reduced from the captured public detail shape, not a list/JD inference.
const detail = (id = 'a', fields = {}) => ({ id, orgId: 'step', jobDescription: '<p>职责</p><p>任职要求</p>', publishedAt: '2026-09-10T21:57:36', status: 'open', ...fields });
const wrapped = data => ({ code: 0, success: true, data });
const list = (jobs, total = jobs.length) => ({ endpoint: 'jobs/v2', body: wrapped({ jobs, total }) });
const oneDetail = (id = 'a', fields = {}) => ({ endpoint: 'job', body: wrapped(detail(id, fields)) });
const envelope = jobs => ({ complete: true, total: jobs.length, jobs });

function encrypted(value, fields = {}) {
  const cipher = crypto.createCipheriv('aes-128-cbc', Buffer.from(KEY), Buffer.from(IV));
  const data = Buffer.concat([cipher.update(JSON.stringify(value)), cipher.final()]).toString('base64');
  return { code: 0, success: true, data, necromancer: KEY, ...fields };
}

function fetchFixture(steps) {
  const requests = [];
  let active = 0;
  const fetchImpl = async (url, options) => {
    const step = steps[requests.length];
    assert.ok(step, 'Unexpected extra request: ' + url);
    assert.equal(url, 'https://app.mokahr.com/api/outer/ats-apply/website/' + step.endpoint);
    assert.equal(options.method, 'POST');
    assert.equal(options.headers['Content-Type'], 'application/json');
    assert.ok(options.signal instanceof AbortSignal, 'Every request has a native timeout signal');
    assert.equal(options.signal.aborted, false);
    assert.equal(active, 0, 'Requests and response consumption must be serial');
    active++;
    requests.push({ url, body: JSON.parse(options.body), signal: options.signal });
    if (step.check) step.check();
    await Promise.resolve();
    return {
      status: step.status ?? 200,
      text: async () => {
        try {
          await Promise.resolve();
          if (step.check) step.check();
          return typeof step.body === 'string' ? step.body : JSON.stringify(step.body);
        } finally { active--; }
      }
    };
  };
  return { requests, fetchImpl, done: () => assert.equal(requests.length, steps.length) };
}
const options = (fixture, extra = {}) => ({ fetchImpl: fixture.fetchImpl, sleep: async () => {}, ...extra });
const fetchDetails = (fixture, extra = {}) => moka.fetchAll({ ...CONFIG, fetchDetails: true }, options(fixture, extra));

function outfile(t, baseline = 'OLD RAW') {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ande-moka-details-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const file = path.join(dir, 'raw.json');
  if (baseline !== null) fs.writeFileSync(file, baseline);
  return file;
}
const args = file => [CONFIG.orgId, CONFIG.siteId, CONFIG.site, IV, file];

test('default/explicit false fetchAll remains list-only, with no markers or extra validation', async () => {
  const jobs = [job(), job(), { title: '旧列表仍交由 publisher 验证' }];
  for (const config of [CONFIG, { ...CONFIG, fetchDetails: false }]) {
    const fixture = fetchFixture([list(jobs)]);
    const result = await moka.fetchAll(config, options(fixture, { sleep: () => assert.fail('No detail delay by default') }));
    assert.deepEqual(result, envelope(jobs));
    assert.ok(result.jobs.every(record => !Object.hasOwn(record, 'detailVerified')));
    fixture.done();
  }
});

test('explicit failure codes cannot make a valid-shaped list a success, wrapped or unwrapped', async () => {
  for (const body of [{ ...wrapped({ jobs: [job()], total: 1 }), code: 1 }, encrypted({ ...wrapped({ jobs: [job()], total: 1 }), code: 1 })]) {
    const fixture = fetchFixture([{ endpoint: 'jobs/v2', body }]);
    await assert.rejects(moka.fetchAll(CONFIG, options(fixture)), /unsuccessful/);fixture.done();
  }
});

test('details follow complete unfiltered pagination serially, decrypt wrappers, merge, delay, then recheck the ID set', async () => {
  const jobs = [job('a', { listOnly: '保留', createdAt: 'list-create', jobDescription: '列表不完整', detailVerified: false }), job('b'), job('c')];
  const publicA = detail('a', { title: '详情标题', publishedAt: 'unparsed-publication', zhineng: { name: '算法' }, commitment: '实习', locations: [{ country: '美国' }] });
  const a = { ...publicA, createdAt: 'detail-create', headhunterRequirement: 'private config', pipelineId: 147283, jobContactWorkWechatQRCode: 'contact', aiThresholdAccuracy: 0.5 };
  const fixture = fetchFixture([
    { endpoint: 'jobs/v2', body: encrypted(wrapped({ jobs: jobs.slice(0, 2), jobStats: { total: 3 } })) },
    list(jobs.slice(2), 3),
    { endpoint: 'job', body: encrypted(wrapped(a)) }, oneDetail('b'), oneDetail('c'),
    list([jobs[2], jobs[0]], 3), list([jobs[1]], 3)
  ]);
  const delays = [];
  const result = await fetchDetails(fixture, { limit: 2, sleep: async ms => {
    delays.push(ms);
    assert.equal(fixture.requests.at(-1).url.endsWith('/job'), true);
  } });
  assert.deepEqual(delays, [150, 150]);
  assert.deepEqual(result, envelope(jobs.map((listed, index) => ({ ...listed, ...(index === 0 ? publicA : detail(listed.id)), id: listed.id, detailVerified: true }))));
  assert.equal(jobs[0].jobDescription, '列表不完整', 'Input list records are not mutated');
  assert.equal(result.jobs[0].publishedAt, 'unparsed-publication');
  assert.equal(result.jobs[0].createdAt, 'list-create', 'Unrelated detail fields cannot overwrite source list fields');
  for (const field of ['headhunterRequirement', 'pipelineId', 'jobContactWorkWechatQRCode', 'aiThresholdAccuracy']) assert.equal(Object.hasOwn(result.jobs[0], field), false);
  assert.deepEqual(fixture.requests.filter(request => request.url.endsWith('/job')).map(request => request.body), jobs.map(listed => ({ orgId: 'step', jobId: listed.id, siteId: 1, locale: 'zh-CN' })));
  const listRequests = fixture.requests.filter(request => request.url.endsWith('/jobs/v2'));
  assert.deepEqual(listRequests.map(request => request.body.offset), [0, 2, 0, 2]);
  for (const request of listRequests) assert.deepEqual(request.body, {
    orgId: 'step', siteId: 1, limit: 2, offset: request.body.offset, needStat: true,
    keyword: '', zhinengIds: [], projectFolderIds: [], departmentIds: [], campusSiteIds: [],
    jobRankIds: [], experiences: [], customFields: {}, site: 'social'
  });
  assert.equal(new Set(fixture.requests.map(request => request.signal)).size, fixture.requests.length);
  fixture.done();
});

test('unwrapped detail records are accepted, numeric source identity is retained and custom delay is injected', async () => {
  const jobs = [job(0), job(1)];
  const fixture = fetchFixture([list(jobs), { endpoint: 'job', body: detail('0') }, oneDetail('1'), list(jobs)]);
  const delays = [];
  const result = await fetchDetails(fixture, { detailDelayMs: 0, sleep: async ms => delays.push(ms) });
  assert.deepEqual(delays, [0]);
  assert.deepEqual(result.jobs.map(record => record.id), [0, 1]);
  assert.deepEqual(fixture.requests.filter(request => request.url.endsWith('/job')).map(request => request.body.jobId), [0, 1]);
  fixture.done();
});

test('optional null/absent metadata and placeholder/empty JD strings are preserved, not interpreted', async () => {
  const jobs = [job('a'), job('b', { publishedAt: 'listed-date', status: 'listed-status', zhineng: { name: '列表分类' }, commitment: '实习', locations: [{ country: '美国' }] }), job('c')];
  const a = detail('a', { jobDescription: '', publishedAt: null, status: null });
  const b = { id: 'b', orgId: 'step', jobDescription: '-' };
  const c = detail('c', { jobDescription: '<p>。</p>', status: 'pause' });
  const fixture = fetchFixture([list(jobs), ...[a, b, c].map(data => ({ endpoint: 'job', body: wrapped(data) })), list(jobs)]);
  const result = await fetchDetails(fixture);
  assert.deepEqual(result.jobs, jobs.map((listed, index) => ({ ...listed, ...[a, b, c][index], detailVerified: true })));
  assert.ok(result.jobs.every(record => !Object.hasOwn(record, 'jdComplete') && !Object.hasOwn(record, 'dateKind')));
  fixture.done();
});

for (const [name, jobs, error] of [
  ['missing ID', [{ title: 'missing' }], /job ID/],
  ['blank ID', [job(' ')], /job ID/],
  ['null record', [null], /job ID/],
  ['array record', [[]], /job ID/],
  ['object ID', [job({ id: 'a' })], /job ID/],
  ['unsafe numeric ID', [job(Number.MAX_SAFE_INTEGER + 1)], /job ID/],
  ['duplicate IDs', [job(), job()], /duplicate/],
  ['numeric/string duplicate IDs', [job(1), job('1')], /duplicate/],
  ['wrong list organization', [job('a', { orgId: 'other' })], /orgId mismatch/]
]) test('rejects ' + name + ' before any detail calls', async () => {
  const fixture = fetchFixture([list(jobs)]);
  await assert.rejects(fetchDetails(fixture), error);
  fixture.done();
});

for (const [name, fields, error] of [
  ['missing ID', { id: undefined }, /job ID/], ['wrong ID', { id: 'wrong' }, /ID mismatch/],
  ['invalid ID', { id: {} }, /job ID/], ['missing organization', { orgId: undefined }, /orgId mismatch/],
  ['wrong organization', { orgId: 'other' }, /orgId mismatch/], ['invalid organization', { orgId: 1 }, /orgId mismatch/],
  ['missing JD', { jobDescription: undefined }, /jobDescription/], ['null JD', { jobDescription: null }, /jobDescription/],
  ['object JD', { jobDescription: { html: '正文' } }, /jobDescription/], ['numeric JD', { jobDescription: 1 }, /jobDescription/],
  ['numeric publishedAt', { publishedAt: 1767225600000 }, /publishedAt/], ['object publishedAt', { publishedAt: {} }, /publishedAt/],
  ['numeric status', { status: 1 }, /status/], ['array status', { status: ['open'] }, /status/]
]) test('rejects detail ' + name, async () => {
  const fixture = fetchFixture([list([job()]), oneDetail('a', fields)]);
  await assert.rejects(fetchDetails(fixture), error);
  fixture.done();
});

for (const [name, response, error] of [
  ['HTTP 201', { status: 201, body: wrapped(detail()) }, /HTTP 201/],
  ['HTTP 503', { status: 503, body: {} }, /HTTP 503/],
  ['bad JSON', { body: '{' }, /JSON/],
  ['outer success false', { body: { ...wrapped(detail()), success: false } }, /unsuccessful/],
  ['outer Success false', { body: { ...wrapped(detail()), Success: false } }, /unsuccessful/],
  ['outer code failure', { body: { ...wrapped(detail()), code: 1 } }, /unsuccessful/],
  ['outer code string', { body: { ...wrapped(detail()), code: '0' } }, /unsuccessful/],
  ['encrypted outer failure', { body: encrypted(wrapped(detail()), { success: false }) }, /unsuccessful/],
  ['encrypted inner success false', { body: encrypted({ ...wrapped(detail()), success: false }) }, /unsuccessful/],
  ['encrypted inner Success false', { body: encrypted({ ...wrapped(detail()), Success: false }) }, /unsuccessful/],
  ['encrypted inner code failure', { body: encrypted({ ...wrapped(detail()), code: 1 }) }, /unsuccessful/],
  ['null response', { body: null }, /response shape/], ['array response', { body: [] }, /response shape/],
  ['unknown object', { body: {} }, /job ID/], ['array data', { body: wrapped([]) }, /job ID/],
  ['null data', { body: wrapped(null) }, /job ID/],
  ['wrong AES key', { body: encrypted(wrapped(detail()), { necromancer: 'wrong' }) }, /key length/i]
]) test('aborts for detail ' + name, async () => {
  const fixture = fetchFixture([list([job()]), { endpoint: 'job', ...response }]);
  await assert.rejects(fetchDetails(fixture), error);
  fixture.done();
});

for (const [name, final, error] of [
  ['same total but changed IDs', list([job('replacement')]), /list changed/],
  ['changed total', list([job(), job('new')]), /list changed/],
  ['duplicate final IDs', list([job(), job()], 2), /duplicate/],
  ['missing final ID', list([{ title: 'missing' }]), /job ID/],
  ['short final pagination', list([], 1), /ended before total/],
  ['failed final HTTP', { endpoint: 'jobs/v2', status: 500, body: {} }, /HTTP 500/]
]) test('rejects ' + name + ' after successful details', async () => {
  const fixture = fetchFixture([list([job()]), oneDetail(), final]);
  await assert.rejects(fetchDetails(fixture), error);
  fixture.done();
});

test('final recheck reuses the pagination cap rather than recursing details', async () => {
  const fixture = fetchFixture([list([job()]), oneDetail(), list([job()], 2)]);
  await assert.rejects(fetchDetails(fixture, { limit: 1, maxPages: 1 }), /pagination limit reached/);
  fixture.done();
});

test('verified empty is returned only after a second complete empty list, without details/delays', async () => {
  const fixture = fetchFixture([list([]), list([])]);
  assert.deepEqual(await fetchDetails(fixture, { sleep: () => assert.fail('Empty list has no detail delay') }), envelope([]));
  fixture.done();
});

test('empty initial list becoming nonempty during final verification aborts', async () => {
  const fixture = fetchFixture([list([]), list([job()])]);
  await assert.rejects(fetchDetails(fixture), /list changed/);
  fixture.done();
});

test('five-argument CLI stays list-only and writes the existing envelope', async t => {
  const file = outfile(t);
  const fixture = fetchFixture([list([job()])]);
  assert.deepEqual(await moka.run(args(file), options(fixture)), envelope([job()]));
  assert.deepEqual(JSON.parse(fs.readFileSync(file)), envelope([job()]));
  fixture.done();
});

test('sixth-argument details CLI does not touch old outfile until every detail and final list succeeds', async t => {
  const file = outfile(t);
  const fixture = fetchFixture([list([job()]), oneDetail(), list([job()])].map(step => ({
    ...step, check: () => assert.equal(fs.readFileSync(file, 'utf8'), 'OLD RAW')
  })));
  const result = await moka.run([...args(file), '--details'], options(fixture));
  assert.deepEqual(result, envelope([{ ...job(), ...detail(), detailVerified: true }]));
  assert.equal(fs.readFileSync(file, 'utf8'), JSON.stringify(result, null, 2) + '\n');
  fixture.done();
});

test('detail failure after one success preserves old outfile byte-for-byte and never rechecks/writes partials', async t => {
  const file = outfile(t);
  const fixture = fetchFixture([list([job(), job('b')]), oneDetail(), { endpoint: 'job', status: 503, body: {} }]);
  await assert.rejects(moka.run([...args(file), '--details'], options(fixture)), /HTTP 503/);
  assert.equal(fs.readFileSync(file, 'utf8'), 'OLD RAW');
  fixture.done();
});

test('final-list failure preserves old outfile despite successful detail collection', async t => {
  const file = outfile(t);
  const fixture = fetchFixture([list([job()]), oneDetail(), list([job('replacement')])]);
  await assert.rejects(moka.run([...args(file), '--details'], options(fixture)), /list changed/);
  assert.equal(fs.readFileSync(file, 'utf8'), 'OLD RAW');
  fixture.done();
});

test('first failed detail attempt never creates an outfile', async t => {
  const file = outfile(t, null);
  const fixture = fetchFixture([list([job()]), oneDetail('wrong')]);
  await assert.rejects(moka.run([...args(file), '--details'], options(fixture)), /ID mismatch/);
  assert.equal(fs.existsSync(file), false);
  fixture.done();
});

test('unknown CLI flag and nonboolean fetchDetails reject before requests or writes', async t => {
  const file = outfile(t);
  const neverFetch = () => assert.fail('Invalid configuration must not fetch');
  await assert.rejects(moka.run([...args(file), '--unknown'], { fetchImpl: neverFetch }), /Usage/);
  await assert.rejects(moka.fetchAll({ ...CONFIG, fetchDetails: 'true' }, { fetchImpl: neverFetch }), /details configuration/);
  assert.equal(fs.readFileSync(file, 'utf8'), 'OLD RAW');
});

test('native per-request timeout also works with an injected fetch and aborts detail collection', async () => {
  const signals = [];
  const fetchImpl = async (url, options) => {
    signals.push(options.signal);
    if (url.endsWith('/jobs/v2')) return { status: 200, text: async () => JSON.stringify(list([job()]).body) };
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('Timeout signal did not abort')), 500);
      options.signal.addEventListener('abort', () => {
        clearTimeout(timer);
        reject(options.signal.reason);
      }, { once: true });
    });
  };
  await assert.rejects(moka.fetchAll({ ...CONFIG, fetchDetails: true }, { fetchImpl, timeoutMs: 5 }), error => error.name === 'TimeoutError');
  assert.equal(signals.length, 2);
  assert.notEqual(signals[0], signals[1]);
  assert.equal(signals[1].aborted, true);
});
