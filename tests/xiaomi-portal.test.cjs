'use strict';
const test = require('node:test'), a = require('node:assert/strict');
const x = require('../crawler/lib/custom/xiaomi_portal');
const { adapterCommand } = require('../crawler/crawl');
const { normalizeJobs } = require('../crawler/publish');
const checkChain = require('./custom-portal-chain.cjs');
const site = structuredClone(x.PROFILE);
const jobs = [1, 2].map(id => ({ id, title: '  岗位' + id + '  ', cityZhNames: ['北京', '上海'], levelOneDeptName: '部门', description: '  List<T> &amp;\n完整职责' + id + '\n', requirement: '  同文要求' + id + '\n', expectedJobLevel: null, publishTime: '2026-07-01', larkJobCode: 'A' + id, type: 2, url: 'https://xiaomi.jobs.f.mioffice.cn/' + (id === 1 ? 'campus' : 'toptalent') + '/position/' + (100 + id) + '/detail', jobId: String(200 + id), jobPostId: String(100 + id) }));
function detailFor(native) {
  return { code: 0, message: 'ok', error: null, data: { recommend_job_post_List: [], job_post_detail: { id: native.jobPostId, job_id: native.jobId, title: native.title, description: native.description, requirement: native.requirement, recruit_type: {}, publish_time: 0, channel_online_status: 1, city_list: [], city_info_list_for_delivery: [], tag_list: [], storefront_mode: 0, storefront_list: [], process_type: 1, job_post_info: { recruitment_type: {}, HighlightList: [], JobChannelPublishList: [], job_post_object_value_map: {}, address_list: [], city_list: [], correlation_job_list: [], tag_list: [], storefront_list: [], target_major_list: [], job_post_process_time_list: [], job_level_id_list: [] } } } };
}
async function candidate(mutate = () => {}) {
  let calls = 0; const delays = [];
  const raw = await x.fetchAll(site, { sleep: async ms => delays.push(ms), fetchImpl: async (url, options) => {
    calls++; a.equal(options.method, 'GET'); a.equal(options.redirect, 'error'); a.equal(options.body, undefined);
    const u = new URL(url), page = Number(u.searchParams.get('pageNum'));
    let json;
    if (u.hostname === 'hr.xiaomi.com') {
      a.deepEqual(options.headers, { Accept: 'application/json' }); a.equal(u.searchParams.get('type'), '2'); a.equal(u.searchParams.get('keyword'), ''); a.equal(u.searchParams.get('cityZhNames'), ''); a.equal(u.searchParams.get('pageSize'), '10');
      json = { code: 0, message: '成功', data: { list: page === 1 ? structuredClone(jobs) : [], pageSize: 10, pageNum: page, pageTotal: 1, total: 2 }, traceId: null };
    } else { a.equal(u.searchParams.get('portal_type'), '6'); a.equal(u.searchParams.get('with_recommend'), 'false'); const native = jobs.find(j => u.pathname.endsWith('/' + j.jobPostId)); a.deepEqual(options.headers, { Accept: 'application/json', 'website-path': new URL(native.url).pathname.split('/')[1], 'accept-language': 'zh-CN', Referer: native.url }); json = detailFor(native); }
    const status = mutate(json, calls) ?? 200;
    return { status, json: async () => json };
  } });
  a.equal(calls, 8); a.equal(delays.length, 7); a.ok(delays.every(ms => ms >= 200)); return raw;
}
test('Xiaomi native two complete scans preserve all TEXT, routes, raw identities and unknown attributes', async () => {
  const raw = await candidate(); a.equal(x.validateEvidence(raw.verification, raw.jobs, site), true);
  const j = normalizeJobs(raw.jobs, site)[0]; a.equal(j.id, 'xiaomi:1'); a.equal(j.title, jobs[0].title); a.equal(j.duty, jobs[0].description); a.equal(j.requirements, jobs[0].requirement); a.equal(j.description, ''); a.equal(j.city, '北京/上海');
  a.deepEqual([j.category, j.employment, j.talentPlan, j.date, j.dateKind, j.sourceStatus], ['', null, null, null, null, null]); a.deepEqual(j.channels, ['campus']);
  for (const field of ['description', 'requirement']) { const blank = structuredClone(jobs[0]); blank[field] = null; a.throws(() => x.normalizeRecord(blank, site)); }
  const symbols = { ...jobs[0], description: '---', requirement: '***' }; symbols.detail = detailFor(symbols); a.equal(x.normalizeRecord(symbols, site).jdComplete, false);
});
test('Xiaomi native evidence rejects partial/total/JD/city/identity/request and unknown-field changes', async () => {
  const raw = await candidate();
  for (const mutate of [
    r => r.verification.scans[1].pages.pop(), r => r.verification.scans[0].pages[0].httpStatus = 412,
    r => r.verification.scans[1].pages[0].response.data.total++, r => r.verification.scans[0].pages[0].request.url += '&keyword=AI',
    r => r.verification.scans[1].pages[0].response.data.list[0].description += 'changed',
    r => r.verification.scans[1].pages[0].response.data.list[0].cityZhNames.reverse(),
    r => r.verification.scans[1].pages[0].response.data.list[1].jobId = '201',
    r => r.verification.scans[1].pages[0].response.data.list[0].extraJD = 'unknown',
    r => r.jobs[0].url = r.jobs[1].url,
    r => r.verification.scans[1].pages[1].response.data.list.push(jobs[0]),
    r => r.verification.scans[0].pages[0].response.data.pageTotal++,
    r => r.verification.scans[0].pages[0].response.data.list.pop()
  ]) { const bad = structuredClone(raw); mutate(bad); a.throws(() => x.validateEvidence(bad.verification, bad.jobs, site)); }
});
test('Xiaomi stops immediately on HTTP/business/empty/unknown errors without retry', async () => {
  for (const kind of ['http', 'business', 'zero', 'unknown']) {
    let calls = 0;
    await a.rejects(x.fetchAll(site, { sleep: async () => {}, fetchImpl: async () => {
      calls++; const json = { code: kind === 'business' ? 1 : 0, message: '成功', data: { list: [], pageSize: 10, pageNum: 1, pageTotal: 0, total: 0 }, traceId: null };
      if (kind === 'unknown') json.extra = 1; return { status: kind === 'http' ? 412 : 200, json: async () => json };
    } })); a.equal(calls, 1);
  }
});
test('Xiaomi scope gate rejects old filters, social and downgrades even before empty jobs', () => {
  for (const invalid of [{ ...site, exclude: '顶尖人才' }, { ...site, key: 'xiaomi_social' }, { ...site, adapter: undefined }, { ...site, ats: 'moka' }, { ...site, key: 'alias', adapter: undefined }, { ...site, body: { ...site.body, type: 1 } }]) { a.equal(adapterCommand(invalid, '/tmp/no-call'), null); a.throws(() => normalizeJobs([], invalid)); }
});
test('Xiaomi necessary custom topic JD is complete but never a fourth score field; missing/unknown/drifting details reject', async () => {
  const raw = await candidate(); const j = structuredClone(raw.jobs[1]);
  const map = j.detail.data.job_post_detail.job_post_info.job_post_object_value_map;
  map['7595885661741271302'] = '【课题名称】\nAgent智能体研究\n\n【课题内容】\n完整研究内容';
  const p = x.normalizeRecord(j, site); a.ok(p.description.includes('课题名称及内容：\n' + map['7595885661741271302'])); a.equal(p.duty, j.description); a.equal(p.requirements, j.requirement);
  map.unknown = 'other JD'; a.throws(() => x.normalizeRecord(j, site));
  for (const mutate of [r => r.verification.scans[1].details.pop(), r => r.verification.scans[1].details[0].httpStatus = 403, r => r.verification.scans[1].details[0].request.headers['website-path'] = 'index', r => r.verification.scans[1].details[0].response.data.job_post_detail.publish_time++, r => delete r.jobs[0].detail]) { const bad = structuredClone(raw); mutate(bad); a.throws(() => x.validateEvidence(bad.verification, bad.jobs, site)); }
});
test('Xiaomi real single chain validates publisher again and protects failed/raw/clock/non-target baselines', async t => {
  await checkChain(t, site, await candidate(), bad => bad.verification.scans[1].pages.pop(), 2400000);
});
