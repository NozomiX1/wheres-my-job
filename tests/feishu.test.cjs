// Offline only: native node:test, injected requests/sleep, no Chrome or live websites.
// Run: node --test tests/feishu.test.cjs
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const feishu = require('../crawler/lib/feishu');

const CAMPUS = {
  key: 'bytedance', company: '字节跳动', ats: 'feishu', adapter: 'bytedance-v1',
  url: 'https://jobs.bytedance.com/campus/position', websitePath: 'campus',
  portalType: 3, subjectIdList: [], linkTemplate: 'https://jobs.bytedance.com/campus/position/{id}/detail'
};
// First-party experienced UI uses portal_type 2. Its capped total is NOT production eligibility.
const SOCIAL = {
  ...CAMPUS, key: 'bytedance_social', url: 'https://jobs.bytedance.com/experienced/position',
  websitePath: 'society', portalType: 2, linkTemplate: 'https://jobs.bytedance.com/experienced/position/{id}/detail'
};

// Self-contained reduced public campus response (response-9.json, 2026-10-05).
// No runtime dependency on /tmp evidence, and no invented recruitment/date interpretation.
const OFFICIAL = {
  id: '7667878785178552629', title: 'XR系统应用开发工程师 - 移动OS',
  description: '团队介绍：我们隶属于产品研发与工程架构部，是字节跳动在智能硬件领域的软件技术攻坚力量—— 聚焦 AI 与智能硬件的深度融合，如豆包手机助手等；以 “让人与设备的交互更自然、更便捷” 为目标，探索前沿 AI 技术的落地场景，打造行业领先的智能硬件综合解决方案。\n在这里，你将与一支顶尖技术团队并肩：\n- 直击 AI 与硬件结合的核心技术难题，参与从 “技术探索” 到 “场景落地” 的全链路研发；\n- 主导或深度参与关键技术突破，用创新定义智能硬件的交互未来；\n- 站在行业前沿，将技术理想转化为千万用户可感知的产品体验。\n如果你心怀对技术的热忱，渴望在 AI 与智能硬件的赛道上突破自我、创造价值，我们期待你的加入，与我们一起解锁更多技术可能，共筑智能交互的新生态！\n\n1、负责XR系统应用及服务的设计、开发及实现工作，与产品、设计、QA等团队保持良好沟通，共同保证产品迭代顺利推进；\n2、参与Android XR应用、服务的品质优化、架构设计等相关研发工作，和团队一起建立技术体系建设；\n3、关注AI、空间计算前沿技术，结合业务特点，推动新技术落地。',
  requirement: '1、2027届获得本科及以上学历，计算机、软件工程等相关专业优先；\n2、熟练掌握计算机基础，包括不限于操作系统原理、计算机组成原理、数据结构和一些通用算法；\n3、熟练掌握一门计算机编程语言，C/C++优先，具有良好的编码能力，注重代码的简洁性、扩展性、维护性，追求高效；\n4、具有良好的思维能力，能高效和准确地分析问题、定位问题并得出解决问题的有效路径；\n5、具有良好的自学能力，对未知充满好奇并乐于付出实践。',
  job_category: { id: '6704215957146962184', name: '客户端', parent: { id: '6704215862603155720', name: '研发' } },
  city_list: [{ code: 'CT_11', name: '北京' }],
  recruit_type: { id: '201', name: '正式', en_name: 'Regular', parent: { id: '2', name: '校招' } }
};
const post = (id = 'a', fields = {}) => ({
  id, title: '财务助理', description: '岗位职责全文', requirement: '独立任职要求全文', ...fields
});
const page = (jobs, total = jobs.length) => ({ status: 200, body: { code: 0, data: { count: total, job_post_list: jobs } } });

function requests(steps, check = () => {}) {
  const calls = [];
  let active = 0;
  return {
    calls,
    request: async body => {
      calls.push(structuredClone(body));
      const step = steps[calls.length - 1];
      assert.ok(step, 'Unexpected extra fixture request');
      assert.equal(active, 0, 'Requests must be serial');
      active++;
      try {
        check(body);
        await Promise.resolve();
        if (step instanceof Error) throw step;
        return structuredClone(step);
      } finally { active--; }
    },
    done: () => assert.equal(calls.length, steps.length, 'Consume exactly the bounded fixture requests')
  };
}
const options = (fixture, extra = {}) => ({ request: fixture.request, limit: 2, maxPages: 8, sleepImpl: async () => {}, ...extra });
function outfile(t, baseline = 'OLD RAW\n') {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ande-feishu-test-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const file = path.join(dir, 'raw.json');
  if (baseline !== null) fs.writeFileSync(file, baseline);
  return file;
}
const args = file => [JSON.stringify(CAMPUS), file];

// Semantic assertions intentionally do not pin the entire normalized object or optional rawPost.
test('request scope retains official portal/project fields and never legacy career or keyword filters', () => {
  for (const base of [CAMPUS, SOCIAL]) {
    const site = { ...base, subjectIdList: ['official-project'], category: ['old-career'], matchKeyword: 'AI|算法', exclude: 'Seed', batch: '2027届' };
    const before = structuredClone(site);
    const body = feishu.requestBody(site, { limit: 2, offset: 4 });
    assert.deepEqual(body, {
      keyword: '', limit: 2, offset: 4, job_category_id_list: [], tag_id_list: [], location_code_list: [],
      subject_id_list: ['official-project'], recruitment_id_list: [], portal_type: base.portalType,
      job_function_id_list: [], storefront_id_list: [], portal_entrance: 1
    });
    body.subject_id_list.push('do-not-mutate-source');
    assert.deepEqual(site, before);
  }
  const defaults = feishu.requestBody(CAMPUS);
  assert.equal(defaults.limit, 50);
  assert.equal(defaults.offset, 0);
  assert.deepEqual(defaults.subject_id_list, []);
});

test('captured campus schema retains separate full JD, leaf category and explicit channel without guessing Regular/date', () => {
  const raw = structuredClone(OFFICIAL);
  const before = structuredClone(raw);
  raw.publish_time = 1789356581402;
  const job = feishu.normalizePost(raw, CAMPUS);
  assert.equal(job.id, OFFICIAL.id);
  assert.equal(job.title, OFFICIAL.title);
  assert.equal(job.duty, OFFICIAL.description);
  assert.equal(job.requirements, OFFICIAL.requirement);
  assert.equal(job.description, '');
  assert.equal(job.category, '客户端');
  assert.equal(job.city, '北京');
  assert.deepEqual(job.channels, ['campus']);
  assert.equal(job.employment, null, '正式/Regular has not been proved to mean literal full-time');
  assert.equal(job.talentPlan, null);
  assert.equal(job.date, null);
  assert.equal(job.dateKind, null);
  assert.equal(job.url, `https://jobs.bytedance.com/campus/position/${OFFICIAL.id}/detail`);
  assert.equal(job.jdComplete, true);
  assert.deepEqual(raw, { ...before, publish_time: 1789356581402 }, 'Normalization does not mutate raw input');
});

test('official plain-text JD retains literal List<T>/vector<float>/entities and all text beyond 600 characters', () => {
  const longDuty = '完整职责'.repeat(200) + '职责尾标';
  const longRequirement = '完整要求'.repeat(200) + '要求尾标';
  const job = feishu.normalizePost(post('long', {
    description: '\r\n 职责  List<T> &amp; vector<float>\r\n' + longDuty + '\r\n',
    requirement: '\r\n\t资格 &lt;条件&gt; &amp;\r\n' + longRequirement + '\r\n'
  }), CAMPUS);
  assert.equal(job.duty, '职责  List<T> &amp; vector<float>\n' + longDuty);
  assert.equal(job.requirements, '资格 &lt;条件&gt; &amp;\n' + longRequirement);
  assert.ok(job.duty.length > 600 && job.requirements.length > 600);
  assert.equal(job.description, '', 'Do not duplicate duty in a fallback description');
  assert.equal(job.jdComplete, true);
});

test('channel and employment come only from explicit parent/leaf facts, never URL, title, year or talent project', () => {
  for (const site of [CAMPUS, SOCIAL]) {
    for (const recruit_type of [undefined, null, { name: '未知性质' }, { name: '未知性质', parent: { name: '未知渠道' } }]) {
      const job = feishu.normalizePost(post('unknown', { title: '2025 Seed 实习招募 财务', recruit_type, job_subject: { name: 'Seed' }, publish_time: '2026-01-01' }), site);
      assert.deepEqual(job.channels, []);
      assert.equal(job.employment, null);
      assert.equal(job.category, '');
      assert.equal(job.city, '');
      assert.equal(job.url, site.linkTemplate.replace('{id}', 'unknown'));
      assert.equal(job.talentPlan, null);
      assert.equal(job.date, null);
      assert.equal(job.dateKind, null);
    }
  }
  for (const [name, parent, employment, channel] of [
    ['实习', '社招', 'internship', 'social'], ['实习', '校招', 'internship', 'campus'],
    ['全职', '校招', 'full-time', 'campus'], ['full-time', '社招', 'full-time', 'social'],
    ['正式', '社招', null, 'social']
  ]) {
    const job = feishu.normalizePost(post('kind', { recruit_type: { name, parent: { name: parent } } }), CAMPUS);
    assert.equal(job.employment, employment);
    assert.deepEqual(job.channels, [channel]);
  }
});

test('required identity/title/JD fields must be own properties; omitted, inherited or undefined JD cannot silently disappear', () => {
  for (const field of ['id', 'title', 'description', 'requirement']) {
    const missing = post();
    delete missing[field];
    assert.throws(() => feishu.normalizePost(missing, CAMPUS), undefined, 'missing ' + field);
    const inherited = Object.assign(Object.create({ [field]: post()[field] }), missing);
    assert.throws(() => feishu.normalizePost(inherited, CAMPUS), undefined, 'inherited ' + field);
  }
  for (const field of ['description', 'requirement']) {
    for (const value of [undefined, 1, {}, ['text']]) {
      assert.throws(() => feishu.normalizePost(post('bad-jd', { [field]: value }), CAMPUS), undefined, field + ' wrong type');
    }
  }
  for (const title of [null, '', ' ', 1, {}]) assert.throws(() => feishu.normalizePost(post('bad-title', { title }), CAMPUS));
});

test('present null/empty JD is retained honestly; readable requirements alone or a short duty can be complete', () => {
  for (const [description, requirement, expected] of [
    [null, null, false], ['', '', false], ['— 。', null, false],
    [null, '独立要求', true], ['做', null, true]
  ]) {
    const job = feishu.normalizePost(post('content', { description, requirement }), CAMPUS);
    assert.equal(job.jdComplete, expected);
    assert.equal(job.description, '');
    if (description === null) assert.equal(job.duty, '');
    if (requirement === null) assert.equal(job.requirements, '');
  }
});

test('one malformed record or official metadata structure rejects the whole source, not just that job', async () => {
  const invalid = [
    null, [], post('bad', { requirement: {} }), post('bad', { description: [] }),
    post('bad', { job_category: '研发' }), post('bad', { job_category: { name: 1 } }),
    post('bad', { city_list: {} }), post('bad', { city_list: [{ name: 123 }] }),
    post('bad', { recruit_type: [] }), post('bad', { recruit_type: { name: '正式', parent: '社招' } })
  ];
  for (const bad of invalid) {
    const fixture = requests([page([post('good'), bad])]);
    await assert.rejects(feishu.fetchAll(CAMPUS, options(fixture)));
    fixture.done();
  }
});

test('extractPage accepts only explicit successful list/count, including a valid zero and JSON response body', () => {
  for (const jobs of [[], [post()]]) {
    const response = page(jobs);
    assert.deepEqual(feishu.extractPage(response), { total: jobs.length, jobs });
    assert.deepEqual(feishu.extractPage({ ...response, body: JSON.stringify(response.body) }), { total: jobs.length, jobs });
  }
});

test('HTTP/business errors, malformed lists, unknown response shapes and untrustworthy totals are never empty success', () => {
  const good = page([]);
  const invalid = [
    { ...good, status: 201 }, { ...good, status: 503 }, { ...good, body: '{' },
    { ...good, body: { ...good.body, code: 1 } }, { ...good, body: { ...good.body, code: '0' } },
    { ...good, body: { ...good.body, success: false } }, { ...good, body: { ...good.body, Success: false } },
    { status: 200, body: null }, { status: 200, body: [] }, { status: 200, body: {} },
    { status: 200, body: { data: good.body.data } },
    { status: 200, body: { code: 0, data: { count: 0 } } },
    ...[null, {}, '[]'].map(job_post_list => ({ status: 200, body: { code: 0, data: { count: 0, job_post_list } } })),
    ...[undefined, -1, 1.5, '0', Number.MAX_SAFE_INTEGER + 1].map(count => ({ status: 200, body: { code: 0, data: { count, job_post_list: [] } } }))
  ];
  for (const response of invalid) assert.throws(() => feishu.extractPage(response));
});

test('success requires two full unfiltered scans; reordered stable IDs and equal titles remain distinct opportunities', async () => {
  const jobs = [
    post('7667878785178552629', { title: '财务助理' }), post('7667878785178552630', { title: '财务助理' }),
    post('c', { title: '2025 Seed 架构师' }), post('d', { title: '游戏策划' }), post('e', { title: '十年以上经验法务' })
  ];
  const fixture = requests([
    page(jobs.slice(0, 2), 5), page(jobs.slice(2, 4), 5), page(jobs.slice(4), 5),
    page([jobs[4], jobs[0]], 5), page([jobs[3], jobs[1]], 5), page([jobs[2]], 5)
  ]);
  const site = { ...CAMPUS, matchKeyword: 'AI|算法', exclude: 'Seed|架构师', batch: '2027届' };
  const result = await feishu.fetchAll(site, options(fixture));
  assert.equal(result.complete, true);
  assert.equal(result.total, 5);
  assert.deepEqual(result.jobs.map(job => job.id), jobs.map(job => job.id));
  assert.deepEqual(result.jobs.map(job => job.title), jobs.map(job => job.title));
  assert.ok(result.jobs.every(job => job.requirements === '独立任职要求全文' && job.description === '' && job.jdComplete));
  assert.deepEqual(fixture.calls.map(body => body.offset), [0, 2, 4, 0, 2, 4]);
  for (const body of fixture.calls) {
    assert.equal(body.keyword, '');
    for (const field of ['job_category_id_list', 'job_function_id_list', 'location_code_list', 'subject_id_list', 'recruitment_id_list']) assert.deepEqual(body[field], []);
  }
  fixture.done();
});

test('zero jobs is verified only after a second complete zero result, not after one empty page', async () => {
  const fixture = requests([page([]), page([])]);
  assert.deepEqual(await feishu.fetchAll(CAMPUS, options(fixture)), { complete: true, total: 0, jobs: [] });
  assert.deepEqual(fixture.calls.map(body => body.offset), [0, 0]);
  fixture.done();
  const changed = requests([page([]), page([post()])]);
  await assert.rejects(feishu.fetchAll(CAMPUS, options(changed)));
  changed.done();
});

test('early short/empty first-scan pages are rejected before the declared count, including the legacy 2-total/1-job repro', async () => {
  for (const [steps, extra] of [
    [[page([post()], 2)], { limit: 50 }], [[page([], 2)], {}],
    [[page([post('a'), post('b')], 4), page([post('c')], 4)], {}],
    [[page([post('a'), post('b')], 4), page([], 4)], {}]
  ]) {
    const fixture = requests(steps);
    await assert.rejects(feishu.fetchAll(CAMPUS, options(fixture, extra)));
    fixture.done();
  }
});

test('the verification scan must also paginate completely; a second-scan short or empty page is not confirmation', async () => {
  const jobs = [post('a'), post('b'), post('c')];
  const empty = requests([page(jobs.slice(0, 2), 3), page(jobs.slice(2), 3), page(jobs.slice(0, 2), 3), page([], 3)]);
  await assert.rejects(feishu.fetchAll(CAMPUS, options(empty)));
  empty.done();
  const short = requests([page(jobs.slice(0, 2)), page([jobs[0]], 2)]);
  await assert.rejects(feishu.fetchAll(CAMPUS, options(short)));
  short.done();
});

test('changing page totals, surplus records and pages exceeding limit contradict complete pagination', async () => {
  for (const steps of [
    [page([post('a'), post('b')], 3), page([post('c')], 4)],
    [page([post()], 0)], [page([post('a'), post('b'), post('c')], 3)],
    [page([post('a'), post('b')], 3), page([post('c'), post('d')], 3)]
  ]) {
    const fixture = requests(steps);
    await assert.rejects(feishu.fetchAll(CAMPUS, options(fixture)));
    fixture.done();
  }
});

test('missing, blank, invalid or unsafe numeric identity rejects a source rather than losing or rounding jobs', async () => {
  const missing = post(); delete missing.id;
  for (const bad of [missing, ...[null, '', ' ', {}, -1, 1.5, Number.MAX_SAFE_INTEGER + 1, 'undefined'].map(id => post(id))]) {
    const fixture = requests([page([bad])]);
    await assert.rejects(feishu.fetchAll(CAMPUS, options(fixture)));
    fixture.done();
  }
});

test('duplicate identity within/across pages or in the final scan rejects, including equivalent number/string IDs', async () => {
  for (const steps of [
    [page([post('a'), post('a')])], [page([post(1), post('1')])],
    [page([post('a'), post('b')], 3), page([post('a')], 3)],
    [page([post('a'), post('b')]), page([post('a'), post('a')])]
  ]) {
    const fixture = requests(steps);
    await assert.rejects(feishu.fetchAll(CAMPUS, options(fixture)));
    fixture.done();
  }
});

test('unchanged count is not unchanged ID set, and a changed total also invalidates verification', async () => {
  for (const final of [page([post('a'), post('replacement')]), page([post('a')])]) {
    const fixture = requests([page([post('a'), post('b')]), final]);
    await assert.rejects(feishu.fetchAll(CAMPUS, options(fixture)));
    fixture.done();
  }
});

test('same-ID JD or metadata drift invalidates verification even when count and ID set agree', async () => {
  const original = post('a', {
    job_category: { name: '客户端' }, city_list: [{ name: '北京' }],
    recruit_type: { name: '正式', parent: { name: '校招' } }, publish_time: 1789356581402
  });
  for (const change of [
    { description: '新职责' }, { requirement: '新独立要求' }, { title: '新标题' },
    { job_category: { name: '财务' } }, { city_list: [{ name: '上海' }] },
    { recruit_type: { name: '实习', parent: { name: '校招' } } },
    { recruit_type: { name: '正式', parent: { name: '社招' } } }, { publish_time: 1789356581403 }
  ]) {
    const fixture = requests([page([original]), page([{ ...original, ...change }])]);
    await assert.rejects(feishu.fetchAll(CAMPUS, options(fixture)));
    fixture.done();
  }
});

test('pagination cap is a failure, never a truncated complete envelope', async () => {
  const fixture = requests([page([post('a')], 3), page([post('b')], 3)]);
  await assert.rejects(feishu.fetchAll(CAMPUS, options(fixture, { limit: 1, maxPages: 2 })));
  fixture.done();
});

test('official count >=10000 is a capped/unknown total and cannot prove full-source completeness', async () => {
  // Limit 1 makes this first page otherwise valid; reject immediately, not at our safety maxPages.
  for (const site of [CAMPUS, SOCIAL]) {
    for (const total of [10000, 10001]) {
      const fixture = requests([page([post()], total)]);
      await assert.rejects(feishu.fetchAll(site, options(fixture, { limit: 1 })));
      fixture.done();
    }
  }
});

test('requests are serial and the default/custom inter-request delay is injected, not a real timer', async () => {
  for (const delayMs of [undefined, 7]) {
    const events = [];
    const jobs = [post('a'), post('b'), post('c')];
    const fixture = requests([
      page(jobs.slice(0, 2), 3), page(jobs.slice(2), 3), page(jobs.slice(0, 2), 3), page(jobs.slice(2), 3)
    ], body => events.push('request:' + body.offset));
    await feishu.fetchAll(CAMPUS, options(fixture, {
      ...(delayMs === undefined ? {} : { delayMs }), sleepImpl: async ms => { events.push('sleep:' + ms); }
    }));
    const wait = 'sleep:' + (delayMs ?? 150);
    assert.deepEqual(events, ['request:0', wait, 'request:2', wait, 'request:0', wait, 'request:2']);
    fixture.done();
  }
});

test('run uses injected transport and atomically replaces output only after both complete scans succeed', async t => {
  const file = outfile(t);
  const oldHandle = fs.openSync(file, 'r');
  const jobs = [post('a'), post('b'), post('c')];
  const fixture = requests([
    page(jobs.slice(0, 2), 3), page(jobs.slice(2), 3), page(jobs.slice(0, 2), 3), page(jobs.slice(2), 3)
  ], () => assert.equal(fs.readFileSync(file, 'utf8'), 'OLD RAW\n', 'No write before final verification'));
  try {
    const result = await feishu.run(args(file), options(fixture));
    assert.equal(result.complete, true);
    assert.equal(result.total, 3);
    assert.deepEqual(result.jobs.map(job => job.id), ['a', 'b', 'c']);
    assert.deepEqual(JSON.parse(fs.readFileSync(file, 'utf8')), result);
    assert.equal(fs.readFileSync(oldHandle, 'utf8'), 'OLD RAW\n', 'Atomic replacement leaves the old open file intact');
    assert.deepEqual(fs.readdirSync(path.dirname(file)), ['raw.json'], 'No leftover staging files');
    fixture.done();
  } finally { fs.closeSync(oldHandle); }
});

test('run preserves old output bytes/mtime on short page, omitted requirements, late failure and same-ID final JD drift', async t => {
  const file = outfile(t);
  const before = fs.readFileSync(file);
  const mtime = fs.statSync(file).mtimeMs;
  const missingRequirement = post('bad'); delete missingRequirement.requirement;
  for (const steps of [
    [page([post()], 2)],
    [page([post('good')], 2), page([missingRequirement], 2)],
    [page([post('good')], 2), { status: 200, body: { code: 1, data: { count: 2, job_post_list: [post('bad')] } } }],
    [page([post('a')]), page([post('a', { requirement: 'changed requirement' })])],
    [page([post('good')], 2), new Error('injected transport failure')]
  ]) {
    const fixture = requests(steps, () => assert.deepEqual(fs.readFileSync(file), before));
    const limit = steps.length === 1 ? 50 : 1;
    await assert.rejects(feishu.run(args(file), options(fixture, { limit })));
    assert.deepEqual(fs.readFileSync(file), before);
    assert.equal(fs.statSync(file).mtimeMs, mtime);
    assert.deepEqual(fs.readdirSync(path.dirname(file)), ['raw.json']);
    fixture.done();
  }
});

test('first-ever failed run creates neither output nor a partial staging file', async t => {
  const file = outfile(t, null);
  const fixture = requests([page([post()], 2)]);
  await assert.rejects(feishu.run(args(file), options(fixture, { limit: 50 })));
  assert.equal(fs.existsSync(file), false);
  assert.deepEqual(fs.readdirSync(path.dirname(file)), []);
  fixture.done();
});

test('production eligibility is individually reviewed campus only; social cap and generic Feishu remain unverified', async t => {
  assert.equal(feishu.verifiedSource(CAMPUS), true);
  for (const site of [
    SOCIAL, { ...CAMPUS, key: 'other' }, { ...CAMPUS, adapter: undefined },
    { ...CAMPUS, portalType: 6 }, { ...CAMPUS, subjectIdList: ['narrow-project'] },
    { ...CAMPUS, url: 'https://unreviewed.example/campus/position' }
  ]) assert.equal(feishu.verifiedSource(site), false);
  const file = outfile(t);
  let calls = 0;
  await assert.rejects(feishu.run([JSON.stringify(SOCIAL), file], { request: async () => { calls++; throw new Error('Must not request unverified source'); } }));
  assert.equal(calls, 0);
  assert.equal(fs.readFileSync(file, 'utf8'), 'OLD RAW\n');
});
