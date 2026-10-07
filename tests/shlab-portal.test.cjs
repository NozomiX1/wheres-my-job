'use strict';
const test = require('node:test'), a = require('node:assert/strict');
const fs = require('node:fs'), os = require('node:os'), path = require('node:path'), { spawnSync } = require('node:child_process');
const shlab = require('../crawler/lib/custom/shlab_portal');
const checkChain = require('./custom-portal-chain.cjs');
const copy = value => JSON.parse(JSON.stringify(value));
const [campus, social] = shlab.PROFILES;
// Real first-row metadata from the independent scans-v2; JD shortened to its literal first line.
// Tests are offline protocol examples, not live full-source/renderer qualification.
function sample(site = campus) {
  const address = { id: '7384707272630042626', name: { en_us: '', zh_cn: '龙文路129号（国际传媒港L1大楼）' }, city: { code: 'CT_125', name: { en_us: 'Shanghai', zh_cn: '上海' } }, country: { code: 'CN_1', name: { en_us: 'Chinese Mainland', zh_cn: '中国大陆' } }, district: { code: 'DS_43', name: { en_us: 'Xuhui', zh_cn: '徐汇区' } }, state: { code: 'ST_47', name: { en_us: 'Shanghai', zh_cn: '上海' } } };
  const job = {
    JobType: { id: '6791698585114888456', name: { en_us: 'Government agency / Other', zh_cn: '政府机关 / 事业单位 / 其他' } },
    address, address_list: [copy(address)], create_time: '1790691100046', modify_time: '1790691100046',
    creator: { id: 'ou_4e9ae82b005976970b0d6d503a0f7b68', name: { en_us: '张怀哲', zh_cn: '张怀哲' } },
    customized_data_list: [{ name: { zh_cn: '校招职位类别' }, object_id: '7620337195341826345', object_type: 3, value: { option: { key: '5', name: { zh_cn: '职能类' } } } }],
    description: '1. 开展海外顶会人才 mapping 的开源、信息梳理、筛选、招聘支持工作，挖掘和建联海外优质人才；',
    headcount: 1, id: '7690957950969940260', job_id: '7690957950969760036', job_active_status: 1, job_process_type: 2, job_code: 'A200746',
    job_department: { id: 'od-f7ded57b9c31ee18c337fe053b316910', name: { en_us: '人才引进办公室', zh_cn: '人才引进办公室' } },
    job_function: { id: '7566105460273842459', name: { zh_cn: '职能通道' } }, job_recruitment_type: { id: '202', name: { en_us: 'Intern', zh_cn: '实习' } },
    requirement: '1. 研究生在读优先，人力资源、英语、传媒、心理、工商管理、计算机、经管类等相关专业优先；',
    subject: { id: '7619221867426433326', name: { zh_cn: '2027届实习生招聘' } }, title: '【27届留用实习生】海外招聘实习生-人力引进办公室',
    updatedAtShow: '2026-09-29', other_info: '人才引进办公室｜实习｜职能通道｜上海', showtitle: '【27届留用实习生】海外招聘实习生-人力引进办公室'
  };
  if (site.track === 'social') {
    Object.assign(job, { JobType: { id: '6791698585114724616', name: { en_us: 'Internet / Electronics / Games', zh_cn: '互联网 / 电子 / 网游' } }, create_time: '1790234846509', modify_time: '1790234846509', creator: { id: 'ou_261ff64cbbca0f1288ed7fc00e8375b3', name: { en_us: '杨童', zh_cn: '杨童' } }, customized_data_list: [{ name: { zh_cn: '需求紧急度' }, object_id: '7547583947070736678', object_type: 3, value: { option: { key: '3', name: { zh_cn: 'P2' } } } }], id: '7688999843491334427', job_id: '7688999843491186971', job_code: 'A207764', job_process_type: 1, job_department: { id: 'od-08e354b8d0c08a09710f0bf9c7b486b6', name: { en_us: '数据平台中心', zh_cn: '数据平台中心' } }, job_function: { id: '7547583283266930970', name: { zh_cn: '科研通道' } }, job_recruitment_type: { id: '101', name: { en_us: 'Full-time', zh_cn: '全职' } }, min_job_level: { id: '7547659127287070724', name: { en_us: '', zh_cn: '3-1' } }, max_job_level: { id: '7547659127287087108', name: { en_us: '', zh_cn: '3-2' } }, title: '【高阶岗位】Agent 任务与环境青年科学家', showtitle: '【高阶岗位】Agent 任务与环境青年科学家', other_info: '数据平台中心｜全职｜科研通道｜上海', updatedAtShow: '2026-09-24', description: '1. 面向大模型 Agent 的训练与评测，负责任务、环境及交互数据的关键技术研究，推动研究原型向可规模化交付的能力转化。 ', requirement: '1.  计算机、人工智能、软件工程等相关专业，博士及以上学历。 ' });
    delete job.subject;
  }
  job.job_type = copy(job.JobType);
  return job;
}
function request(site, cursor = '') {
  const url = new URL(site.api);
  for (const [key, value] of Object.entries({ ...site.body, page_token: cursor })) url.searchParams.set(key, value);
  return { method: 'GET', url: url.href };
}
function page(site, rows, cursor = '', next) {
  return { request: request(site, cursor), httpStatus: 200, response: { errno: 0, errmsg: 'ok', data: { has_more: next !== undefined, items: copy(rows), ...(next !== undefined ? { page_token: next } : {}) } } };
}
function envelope(site = campus) {
  const jobs = Array.from({ length: 8 }, (_, i) => ({ ...sample(site), id: String(BigInt(sample(site).id) + BigInt(i)) }));
  const scans = ['public-selector-A', 'public-selector-B'].map(token => ({ pages: [page(site, jobs.slice(0, 7), '', token), page(site, jobs.slice(7), token)] }));
  return { complete: true, countKind: 'cursor-exhaustion', total: jobs.length, jobs: copy(jobs), verification: { version: 1, key: site.key, api: site.api, countKind: 'cursor-exhaustion', total: jobs.length, scans } };
}
function mock(env, mutate = () => {}) {
  const queue = copy(env.verification.scans.flatMap(scan => scan.pages)), calls = [], delays = [];
  return { calls, delays, options: { delayMs: 0, timeoutMs: 20000, sleep: async ms => delays.push(ms), fetchImpl: async (url, init) => { calls.push({ url, init }); const item = queue.shift(); mutate(item, calls.length); return { status: item.httpStatus, json: async () => item.response }; } } };
}

test('Exact source profiles are deeply frozen and known/malformed portal declarations cannot downgrade', () => {
  a.ok(Object.isFrozen(campus) && Object.isFrozen(campus.body) && Object.isFrozen(shlab.PROFILES));
  for (const site of shlab.PROFILES) {
    a.equal(site.company, '上海AI实验室'); a.equal(shlab.verifiedSource(copy(site)), true); a.ok(shlab.portalNotice(site));
    for (const patch of [{ adapter: undefined }, { ats: 'moka' }, { company: '上海人工智能实验室' }, { track: 'internship' }, { key: 'alias', ats: 'beisen', adapter: undefined }, { body: { ...site.body, subject: '7619221867426433326' } }]) {
      const bad = { ...copy(site), ...patch }; a.equal(shlab.requiresVerification(bad), true); a.equal(shlab.verifiedSource(bad), false); a.throws(() => shlab.validateJobs([], bad));
    }
  }
  for (const api of ['GET https://www.shlab.org.cn/api/getJobList?mode=campus', 'https://WWW.SHLAB.ORG.CN:443/unknown', 'https://www.shlab.org.cn:bad/api', '//www.shlab.org.cn/api', null, 7]) a.equal(shlab.requiresVerification({ key: 'alias', ats: 'moka', api }), true);
});

test('Clean native projection preserves independent attributes, public string identity and proven plain TEXT', () => {
  const raw = sample(); raw.description = '  R&D / IEEE S&P / x<3 / n<=10 / 1 < 2\n\n 双  空格\r\n' + '完整正文'.repeat(300) + '  '; raw.requirement = raw.description;
  const before = copy(raw), job = shlab.normalizeRecord(raw, campus);
  a.equal(job.duty, raw.description); a.equal(job.requirements, raw.requirement); a.equal(job.description, ''); a.deepEqual(raw, before);
  a.equal(job.id, raw.id); a.ok(job.url.includes(raw.id) && !job.url.includes(raw.job_id)); a.equal(job.category, '职能通道'); a.equal(job.city, '上海'); a.deepEqual(job.channels, ['campus']); a.equal(job.employment, 'internship');
  a.equal(job.talentPlan, null); a.equal(job.date, null); a.equal(job.dateKind, null); a.equal(job.sourceStatus, '1'); a.equal(job.jdComplete, true); a.equal(Object.hasOwn(job, 'subject'), false);
  raw.job_recruitment_type = { id: '201', name: { en_us: 'Regular', zh_cn: '正式' } }; a.equal(shlab.normalizeRecord(raw, campus).employment, null);
  raw.subject.name.zh_cn = '星启计划'; a.equal(shlab.normalizeRecord(raw, campus).talentPlan, null);
  raw.job_recruitment_type.name.zh_cn = 'toString'; a.equal(shlab.normalizeRecord(raw, campus).employment, null);
  raw.creator = { id: '', name: { en_us: '', zh_cn: '' } }; a.equal(shlab.normalizeRecord(raw, campus).id, raw.id);
  a.equal(shlab.normalizeRecord(sample(social), social).employment, 'full-time');
  for (const field of ['job_function', 'customized_data_list', 'headcount']) delete raw[field]; a.equal(shlab.normalizeRecord(raw, campus).category, '');
});

test('Unproved markup/entities reject the entire source; ordinary ampersands and comparisons stay literal', async () => {
  for (const site of shlab.PROFILES) for (const field of ['description', 'requirement']) {
    for (const value of ['List<T>', '<b>Work</b>', '<p', '</p>', '<img src=x>', '<!-- note -->', '<!DOCTYPE html>', '<?xml>', '&amp;', '&lt;x&gt;', '&#62;', '&#x3c', '&quot', '&not', '&cent', '&pound', '&ampxyz', '&COPYright', '&Aacutefoo']) {
      const raw = sample(site); raw[field] = value;
      a.throws(() => shlab.normalizeRecord(raw, site), /unverified JD/);
      const env = envelope(site), io = mock(env, page => { if (page.request.url === env.verification.scans[0].pages[0].request.url) page.response.data.items[0][field] = value; });
      await a.rejects(shlab.fetchAll(site, io.options), /unverified JD/); a.equal(io.calls.length, 1);
    }
    for (const value of ['R&D', 'R&D;', 'IEEE S&P', 'IEEE S&P;', 'x<3', 'n<=10', '1 < 2', '', '  ', '---']) {
      const raw = sample(site); raw[field] = value; a.equal(shlab.normalizeRecord(raw, site)[field === 'description' ? 'duty' : 'requirements'], value);
    }
  }
});

test('Proven social requirement omission is empty, not a blanket missing/null/extra-JD exemption', () => {
  const raw = sample(social); raw.id = '7535362154582575406'; raw.job_id = '7535362154582378798'; delete raw.requirement;
  a.equal(shlab.normalizeRecord(raw, social).requirements, ''); a.equal(shlab.normalizeRecord(raw, social).duty, raw.description);
  for (const value of [null, 7, [], {}]) a.throws(() => shlab.normalizeRecord({ ...raw, requirement: value }, social));
  for (const value of ['', '-', '  ']) { raw.description = value; a.equal(shlab.normalizeRecord(raw, social).duty, value); a.equal(shlab.normalizeRecord(raw, social).jdComplete, false); }
  const missing = sample(); delete missing.requirement; a.throws(() => shlab.validateJobs([missing], campus));
  a.throws(() => shlab.validateJobs([{ ...sample(social), extraJD: '' }], social));
});

test('both cursor sources use the sole chain; fully native-bound unknown markup still rejects and retains prior snapshot', async t => {
  for (const site of shlab.PROFILES) {
    const env = envelope(site);
    await checkChain(t, site, env, bad => {
      const id = bad.jobs[0].id;
      function change(value) {
        if (!value || typeof value !== 'object') return;
        if (value.id === id && Object.hasOwn(value, 'description')) value.description = '<b>Unproved renderer shape</b>';
        Object.values(value).forEach(change);
      }
      change(bad);
    }, 900000);
  }
});

test('Native own fields, all nested localized metadata and types are checked before projection', () => {
  for (const site of shlab.PROFILES) for (const mutate of [r => { delete r.title; }, r => { r.id = Number(r.id); }, r => { r.job_id = r.id; }, r => { r.description = null; }, r => { r.description = 1; }, r => { r.extraJD = '新增段'; }, r => { r.address.country.name.zh_cn = 7; }, r => { delete r.address_list[0].state.name.en_us; }, r => { r.job_type.name = null; }, r => { r.creator.name.en_us = false; }, r => { r.job_function.name.zh_cn = {}; }, r => { r.customized_data_list[0].value.option.name.zh_cn = null; }, r => { r.customized_data_list[0].value.extra = '未知'; }, r => { r.job_process_type = 9; }, r => { r.headcount = '1'; }]) {
    const raw = sample(site); mutate(raw); a.throws(() => shlab.normalizeRecord(raw, site));
  }
  const raw = sample(); delete raw.creator; a.throws(() => shlab.validateJobs([raw], campus)); a.throws(() => shlab.validateJobs([sample(), sample()], campus)); a.throws(() => shlab.validateJobs([], campus));
});

test('Independent native scans exhaust exact cursor chains and bind all raw facts by publication ID', async () => {
  for (const site of shlab.PROFILES) {
    const env = envelope(site), io = mock(env), result = await shlab.run(site, io.options);
    a.deepEqual(result, env); a.equal(shlab.validateEvidence(result.verification, result.jobs, site), true); a.deepEqual(io.delays, [200, 200, 200]);
    for (const { url, init } of io.calls) { a.equal(init.redirect, 'error'); a.ok(init.signal); a.equal(init.headers['User-Agent'], undefined); a.equal(init.headers.Cookie, undefined); a.equal(new URL(url).searchParams.get('subject'), ''); a.equal(new URL(url).searchParams.get('limit'), '7'); }
    a.equal(result.verification.scans[0].pages[0].response.data.page_token, 'public-selector-A'); a.equal(Object.hasOwn(result.verification.scans[0].pages[1].response.data, 'page_token'), false);
    env.verification.scans[1].pages[0].response.data.items.reverse(); a.equal(shlab.validateEvidence(env.verification, env.jobs, site), true);
  }
});

test('Publisher-facing evidence rejects cursor advance/cycle, early-empty, duplicates, count and any raw drift', () => {
  const mutators = [e => { e.countKind = 'official-total'; }, e => { e.total++; }, e => { e.scans.pop(); }, e => { e.scans[0].pages.pop(); }, e => { e.scans[0].pages[1].request.url = request(campus, 'different').url; }, e => { e.scans[0].pages[0].response.data.page_token = ''; }, e => { delete e.scans[0].pages[0].response.data.page_token; }, e => { e.scans[0].pages[0].response.data.page_token = null; }, e => { e.scans[0].pages[0].response.data.items = []; }, e => { e.scans[0].pages[0].response.data.items.pop(); }, e => { e.scans[0].pages[1].response.data.page_token = ''; }, e => { e.scans[0].pages[1].response.data.items[0].id = e.scans[0].pages[0].response.data.items[0].id; }, e => { e.scans[1].pages[1].response.data.items[0].creator.name.en_us += '漂移'; }, e => { e.scans[0].pages.push(copy(e.scans[0].pages[1])); }, e => { e.scans[0].pages[0].response.data.has_more = 'true'; }, e => { e.scans[0].pages[0].response.total = 8; }, e => { e.scans[0].pages[0].response.errmsg = ''; }, e => { e.scans[0].pages[0].response.errno = '0'; }, e => { e.scans[0].pages[0].httpStatus = 403; }];
  for (const mutate of mutators) { const env = envelope(); mutate(env.verification); a.throws(() => shlab.validateEvidence(env.verification, env.jobs, campus)); }
  for (const mutate of [e => { delete e.scans[0].pages[1].response.data.items; }, e => { e.scans[0].pages[0].request.url += '&subject=狭项目'; }, e => { e.scans[0].pages[0].response.newBusiness = true; }, e => { e.scans[0].pages[0].response.data.items[0].requirements = '新JD'; }]) { const env = envelope(); mutate(env.verification); a.throws(() => shlab.validateEvidence(env.verification, env.jobs, campus)); }
  const redacted = envelope(); redacted.verification.scans[0].pages[0].response.data.page_token = '[REDACTED]'; a.throws(() => shlab.validateEvidence(redacted.verification, redacted.jobs, campus), /redacted/);
  const ceiling = envelope(); ceiling.verification.scans[0].pages = Array(150).fill(ceiling.verification.scans[0].pages[0]); a.throws(() => shlab.validateEvidence(ceiling.verification, ceiling.jobs, campus), /ceiling/);
  const env = envelope(); env.jobs[0].description += 'snapshot-only'; a.throws(() => shlab.validateEvidence(env.verification, env.jobs, campus));
  const cycle = envelope(), pages = cycle.verification.scans[0].pages; pages[1] = page(campus, cycle.jobs.slice(0, 7), 'public-selector-A', 'public-selector-A'); a.throws(() => shlab.validateEvidence(cycle.verification, cycle.jobs, campus), /cyclic/);
  const zero = { version: 1, key: campus.key, api: campus.api, countKind: 'cursor-exhaustion', total: 0, scans: [{ pages: [page(campus, [])] }, { pages: [page(campus, [])] }] }; a.throws(() => shlab.validateEvidence(zero, [], campus), /zero/);
});

test('Normal HTTP/business refusal stops immediately without retries; zero and ceiling never complete', async () => {
  for (const mutate of [p => { p.httpStatus = 412; }, p => { p.response.errno = 403; }, p => { p.response.data.items = []; }, p => { p.response.data.items[0].requirement = null; }]) {
    const io = mock(envelope(), mutate); await a.rejects(shlab.fetchAll(campus, io.options)); a.equal(io.calls.length, 1);
  }
  const env = envelope(), ceiling = mock(env); await a.rejects(shlab.run(campus, { ...ceiling.options, maxPages: 2 }), /ceiling/); a.equal(ceiling.calls.length, 1);
  const zero = mock(env, p => { p.response.data = { has_more: false, items: [] }; }); await a.rejects(shlab.run(campus, zero.options), /zero/); a.equal(zero.calls.length, 1);
  const later = mock(env, (p, n) => { if (n === 4) p.response.data.items[0].description += '全量二扫漂移'; }); await a.rejects(shlab.run(campus, later.options), /drift/); a.equal(later.calls.length, 4);
  const bad = { ...copy(campus), adapter: undefined }; await a.rejects(shlab.run(bad, { fetchImpl: () => a.fail('must not fetch') }));
});

test('CLI writes only a fully verified candidate atomically and preserves it on a later final-page drift', t => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'ande-shlab-offline-test-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const raw = path.join(root, 'candidate.json'), queue = path.join(root, 'responses.json'), preload = path.join(root, 'fetch.cjs');
  fs.writeFileSync(preload, `const pages=JSON.parse(require('node:fs').readFileSync(${JSON.stringify(queue)},'utf8'));globalThis.fetch=async()=>{const p=pages.shift();if(!p)throw Error('offline mock exhausted');return{status:p.httpStatus,json:async()=>p.response}};`);
  const run = env => {
    fs.writeFileSync(queue, JSON.stringify(env.verification.scans.flatMap(s => s.pages)));
    return spawnSync(process.execPath, ['--require', preload, path.resolve(__dirname, '../crawler/lib/custom/shlab_portal.js'), JSON.stringify(campus), raw], { encoding: 'utf8', timeout: 5000 });
  };
  const env = envelope(); a.equal(run(env).status, 0); a.deepEqual(JSON.parse(fs.readFileSync(raw, 'utf8')), env);
  const previous = fs.readFileSync(raw); env.verification.scans[1].pages[1].response.data.items[0].description += '最后页漂移';
  const failed = run(env); a.equal(failed.status, 1); a.match(failed.stderr, /raw facts drift/); a.deepEqual(fs.readFileSync(raw), previous);
  a.equal(fs.readdirSync(root).some(file => file.includes('.tmp-')), false);
});
