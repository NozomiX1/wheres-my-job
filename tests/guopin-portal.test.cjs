'use strict';
const test = require('node:test'), a = require('node:assert/strict');
const g = require('../crawler/lib/custom/guopin_portal');
const site = require('../crawler/sites.json').sites.find(s => s.key === 'guopin_soe');
const noSleep = async () => {};

// 假的国聘接口：按性质/经验/学历过滤，单次查询最多翻到 1000 条（超过的页重复最后一页，和线上一样）。
function fakeApi(jobs, { refuse = false } = {}) {
  const dict = { job_nature: ['N1', 'N2', 'N3'].map(value => ({ value })), job_experience: ['E1', 'E2'].map(value => ({ value })), job_education: ['D1', 'D2'].map(value => ({ value })) };
  const area = (province, city) => ({ value: province, children: [{ value: city, children: [{ value: city.slice(0, 5) + '1' }, { value: city.slice(0, 5) + '2' }] }] });
  const tree = [{ value: '000000', children: [area('110000', '110100'), area('310000', '310100'), area('440000', '440100')] }];
  const calls = [];
  const fetchImpl = async (url, init) => {
    const body = init.body ? JSON.parse(init.body) : {}; calls.push({ url, body });
    if (url.endsWith('/tree')) return { status: 200, json: async () => ({ code: 200, data: tree }) };
    if (refuse) return { status: 200, json: async () => ({ code: 400, msg: '当前访问人数过多，请稍后重试或联系客服。' }) };
    if (url.endsWith('/by-alias')) return { status: 200, json: async () => ({ code: 200, data: dict }) };
    const match = jobs.filter(j => (!body.nature || body.nature.includes(j.nature)) && (!body.experience || body.experience.includes(j.experience)) && (!body.education || body.education.includes(j.education)) && (!body.district || body.district.some(path => j.district_list.some(d => d.area_code === path || d.area_code.startsWith(path + '.')))));
    const start = Math.min((body.page - 1) * body.page_size, Math.max(0, 1000 - body.page_size));
    const list = match.slice(start, start + body.page_size);
    return { status: 200, json: async () => ({ code: 200, data: { total: 20 * body.page_size, page: body.page, page_size: body.page_size, list: list.length ? list : null } }) }; // 线上没有匹配时 list 是 null
  };
  return { fetchImpl, calls };
}
const mk = (i, extra = {}) => ({ update_time: '2026-10-14 18:59:04', job_id: String(1000 + i), job_name: '岗位' + i, company_name: '公司' + (i % 7), nature: 'N' + (1 + i % 3), experience: 'E' + (1 + i % 2), education: 'D' + (1 + (i >> 1) % 2),
  recruitment_type_cn: i % 2 ? '校园招聘' : '社会招聘', nature_cn: i % 3 ? '社招' : '实习', category_cn: '研发', contents: '工作内容：\n写代码', district_list: [{ area_code: '000000.110000.110100.110101', area_cn: '北京-东城区' }], ...extra });

test('guopin: splits by nature → experience → education until every partition is under the 1000 cap, and collects each job once', async () => {
  const jobs = Array.from({ length: 7000 }, (_, i) => mk(i)), { fetchImpl, calls } = fakeApi(jobs); // 每个性质 2300+ 条：需要继续按经验、学历拆
  const out = await g.run(site, { fetchImpl, sleep: noSleep });
  a.equal(out.jobs.length, 7000); a.equal(new Set(out.jobs.map(j => j.job_id)).size, 7000); a.equal(out.total, 7000);
  a.ok(calls.some(c => c.body.education), 'went down to the education level');
  a.ok(out.verification.partitions > 1 && out.verification.requests === calls.length);
  a.ok(calls.filter(c => c.url.endsWith('/list')).every(c => c.body.company_nature[0] === '11AzDak' && c.body.page_size === 200), 'always scoped to state-owned companies, 200 per page');
});

test('guopin: a partition that is still full after nature/experience/education is split by the area tree (province, then city)', async () => {
  const places = ['000000.110000.110100.110101', '000000.110000.110100.110102', '000000.310000.310100.310101', '000000.440000.440100.440101'];
  const jobs = Array.from({ length: 4400 }, (_, i) => mk(i, { nature: 'N1', experience: 'E1', education: 'D1', district_list: [{ area_code: places[i % 4], area_cn: '某-区' }] })); // 每个区 1100 条：连区也触顶
  const { fetchImpl } = fakeApi(jobs.map((j, i) => i < 3300 ? { ...j, district_list: [{ area_code: places[i % 3], area_cn: '某-区' }] } : j));
  await a.rejects(g.run(site, { fetchImpl, sleep: noSleep }), /still reaches the 1000-row cap/);
  const ok = fakeApi(Array.from({ length: 3996 }, (_, i) => mk(i, { nature: 'N1', experience: 'E1', education: 'D1', district_list: [{ area_code: places[i % 4], area_cn: '某-区' }] }))); // 每个区 999 条（恰好 1000 条看起来也像触顶，要再拆）
  const out = await g.run(site, { fetchImpl: ok.fetchImpl, sleep: noSleep });
  a.equal(out.jobs.length, 3996); a.ok(ok.calls.some(c => c.body.district && c.body.district[0].split('.').length === 4), 'went down to the district level');
});

test('guopin: a small result needs a single pass and a stop on any refusal or bad dictionary', async () => {
  const small = fakeApi(Array.from({ length: 30 }, (_, i) => mk(i))), out = await g.run(site, { fetchImpl: small.fetchImpl, sleep: noSleep });
  a.equal(out.jobs.length, 30); a.equal(small.calls.length, 3, 'dictionary + area tree + one list request');
  await a.rejects(g.run(site, { fetchImpl: fakeApi([], { refuse: true }).fetchImpl, sleep: noSleep }), /native refusal/);
  await a.rejects(g.run(site, { fetchImpl: async () => ({ status: 403, json: async () => ({}) }), sleep: noSleep }), /HTTP 403/);
  await a.rejects(g.run(site, { fetchImpl: fakeApi([]).fetchImpl, sleep: noSleep }), /no usable records/);
});

test('guopin: refuses to run for an unverified source identity', async () => {
  await a.rejects(g.run({ ...site, api: 'https://example.test/' }, { fetchImpl: async () => { throw new Error('must not call'); } }), /Unverified Guopin/);
  a.equal(g.verifiedSource({ ...site, body: { company_nature: ['x'] } }), false); a.equal(g.verifiedSource(site), true);
});

test('guopin: records map to published fields; employer is the posting company; date and plan stay unknown', () => {
  const r = g.normalizeRecord(mk(1, { nature_cn: '实习', recruitment_type_cn: '校园招聘' }), site);
  a.deepEqual({ id: r.id, title: r.title, employer: r.employer, city: r.city, category: r.category, channels: r.channels, employment: r.employment, date: r.date, dateKind: r.dateKind, talentPlan: r.talentPlan, url: r.url, jd: r.jdComplete, description: r.description },
    { id: '1001', title: '岗位1', employer: '公司1', city: '北京', category: '研发', channels: ['campus'], employment: 'internship', date: '2026-10-14', dateKind: 'platform', talentPlan: null, url: 'https://www.iguopin.com/job/detail?id=1001', jd: true, description: '工作内容：\n写代码' });
  const html = g.normalizeRecord(mk(3, { contents: '<span style="font-size: 14px;color: #666666;">工作职责<br />1.负责A；\r<br />2.负责B&nbsp;。<br /><br />任职资格<br />1.硕士\u200b；\r<br />2.熟悉Linux</span>' }), site);
  a.deepEqual({ duty: html.duty, requirements: html.requirements, description: html.description }, { duty: '工作职责\n1.负责A；\n2.负责B 。', requirements: '任职资格\n1.硕士；\n2.熟悉Linux', description: '' }, 'HTML is turned into plain text and split into duty / requirements');
  a.ok(!/[<>]|&nbsp;|\r|\u200b/.test(html.duty + html.requirements));
  a.deepEqual(g.normalizeRecord(mk(2, { nature_cn: '社招', recruitment_type_cn: '社会招聘' }), site).channels, ['social']);
  a.equal(g.normalizeRecord(mk(2, { nature_cn: '社招' }), site).employment, null, 'only an explicit internship is recorded');
  a.throws(() => g.normalizeRecord({ job_id: 'x', job_name: '' }, site), /missing official id/);
});

test('guopin: cities are the city level only; province-only places are marked as provinces', () => {
  const c = (code, cn) => ({ area_code: code, area_cn: cn });
  a.equal(g.cityOf([c('000000.530000.530100.530102', '昆明-五华区'), c('000000.530000.530100.530114', '昆明-呈贡区'), c('000000.310000.310100.310101', '上海-黄浦区')]), '昆明/上海');
  a.equal(g.cityOf([c('000000.440000', '广东')]), '广东省'); a.equal(g.cityOf([c('000000.650000', '新疆维吾尔自治区')]), '新疆维吾尔自治区');
  a.equal(g.cityOf([c('000000.110000', '北京')]), '北京', 'a municipality at province level is the city'); a.equal(g.cityOf(undefined), '');
});

test('guopin: the publisher turns records into published jobs with the posting company as employer', () => {
  const { normalizeJobs } = require('../crawler/publish');
  const [job] = normalizeJobs([mk(1, { nature_cn: '实习' })], site);
  a.equal(job.company, '国聘（国企）'); a.equal(job.employer, '公司1'); a.equal(job.id, 'guopin_soe:1001'); a.equal(job.employment, 'internship');
  a.equal(job.city, '北京'); a.equal(job.url, 'https://www.iguopin.com/job/detail?id=1001'); a.equal(job.date, '2026-10-14'); a.equal(job.dateKind, 'platform'); a.deepEqual(job.channels, ['campus']);
  a.equal(normalizeJobs([mk(5, { update_time: '' })], site)[0].date, null, 'no platform time → no date');
  const [other] = normalizeJobs([mk(2, { company_name: ' ' })], site); a.ok(!('employer' in other), 'no employer field when the posting company is unknown');
});

test('guopin: through the real crawl+publish chain, a JD that becomes split does not bring its old whole-body text back', t => {
  const fs = require('node:fs'), os = require('node:os'), path = require('node:path');
  const { runCrawl } = require('../crawler/crawl'), { publish, readPublished } = require('../crawler/publish');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ande-guopin-chain-')); t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const dataFile = path.join(dir, 'data', 'catalog.js');
  const apply = (contents, time) => {
    const raw = { total: 1, jobs: [mk(1, { contents })], issues: [], verification: { key: 'guopin_soe', issues: [] } };
    const crawl = runCrawl(site, { outDir: dir, now: () => time, runner: (_command, args) => { fs.writeFileSync(args.at(-1), JSON.stringify(raw)); return { status: 0 }; } });
    a.equal(crawl.code, 0); a.equal(publish({ outDir: dir, dataFile, sites: [site], keys: [site.key] }).written, true);
    return readPublished(dataFile).jobs[0];
  };
  const first = apply('这是一整段没有标题的岗位介绍，负责写代码。', '2026-01-01T00:00:00.000Z');
  a.deepEqual([first.duty, first.requirements, first.description], ['', '', '这是一整段没有标题的岗位介绍，负责写代码。']);
  const second = apply('工作职责\n1.写代码\n任职资格\n1.本科', '2026-01-02T00:00:00.000Z');
  a.deepEqual([second.duty, second.requirements, second.description], ['工作职责\n1.写代码', '任职资格\n1.本科', ''], 'the old whole body is not restored next to the new split');
});
