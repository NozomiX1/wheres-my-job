'use strict';
const test = require('node:test'), a = require('node:assert/strict');
const lx = require('../crawler/lib/custom/lixiang_portal');
const site = require('../crawler/sites.json').sites.find(s => s.key === 'lixiang');
const noSleep = async () => {};

// 假的理想接口：列表按 page/page_size 翻页，详情按 job_id。
const row = i => ({ id: 1000 + i, code: 'A' + i, title: '岗位' + i, job_mode_name: i % 3 ? '正式' : '实习', location_title: '北京', first_job_function_title: '研发', second_job_function_title: '后端', department_title: '' });
function fake(n, { refuseDetailAt = 0, badDetailId = 0 } = {}) {
  const calls = [];
  const fetchImpl = async url => {
    calls.push(String(url)); const u = new URL(url);
    if (u.pathname.endsWith('/school/job-page')) {
      const page = Number(u.searchParams.get('page')), size = Number(u.searchParams.get('page_size'));
      const items = Array.from({ length: n }, (_, i) => row(i)).slice((page - 1) * size, page * size);
      return { status: 200, json: async () => ({ code: 0, data: { items, total_count: n, total_pages: Math.ceil(n / size), page, page_size: size } }) };
    }
    const id = Number(u.searchParams.get('job_id')), i = id - 1000;
    if (refuseDetailAt && calls.filter(c => c.includes('/job/detail')).length >= refuseDetailAt) return { status: 403, json: async () => ({}) };
    return { status: 200, json: async () => ({ code: 0, data: { ...row(i), id: badDetailId === id ? id + 1 : id, description: '<p>负责后端开发</p>', requirements: '<p>1. 本科及以上</p><p>2. 熟悉Go</p>', department_title: '销售与服务群组', subject_name: i % 3 ? '2027校园招聘' : '实习生招聘' } }) };
  };
  return { fetchImpl, calls };
}

test('lixiang: pages the list at 100 per page, fetches each detail once, and maps the record', async () => {
  const f = fake(130), out = await lx.run(site, { fetchImpl: f.fetchImpl, sleep: noSleep, known: new Set() });
  a.equal(out.total, 130); a.equal(f.calls.filter(c => c.includes('/school/job-page')).length, 2); a.equal(f.calls.filter(c => c.includes('/job/detail')).length, 130);
  const r = lx.normalizeRecord(out.jobs[1], site);
  a.deepEqual({ id: r.id, title: r.title, city: r.city, category: r.category, channels: r.channels, employment: r.employment, department: r.department, batch: r.batch, jd: r.jdComplete, duty: r.duty, req: r.requirements, url: r.url },
    { id: '1001', title: '岗位1', city: '北京', category: '研发/后端', channels: ['campus'], employment: null, department: '销售与服务群组', batch: '2027校园招聘', jd: true, duty: '负责后端开发', req: '1. 本科及以上\n2. 熟悉Go', url: 'https://www.lixiang.com/employ/campus/detail.html?id=1001' });
  a.equal(lx.normalizeRecord(out.jobs[0], site).employment, 'internship', 'only the native 实习 label gives internship');
});

test('lixiang: incremental runs skip details of known ids; a refusal stops the details but not the source', async () => {
  const known = new Set(['1000', '1001']), f = fake(5), out = await lx.run(site, { fetchImpl: f.fetchImpl, sleep: noSleep, known });
  a.equal(f.calls.filter(c => c.includes('/job/detail')).length, 3); a.equal(out.jobs.filter(j => j.detailReused).length, 2);
  const g = fake(10, { refuseDetailAt: 3 }), partial = await lx.run(site, { fetchImpl: g.fetchImpl, sleep: noSleep, known: new Set() });
  a.equal(partial.total, 10); a.ok(partial.issues.some(i => /详情请求停止/.test(i))); a.equal(g.calls.filter(c => c.includes('/job/detail')).length, 3, 'no request after the refusal');
  a.equal(lx.normalizeRecord(partial.jobs.at(-1), site).jdComplete, false, 'a job without its detail keeps only the list fields');
});

test('lixiang: list failures fail the source; unverified identity does not run', async () => {
  await a.rejects(lx.run(site, { fetchImpl: async () => ({ status: 403, json: async () => ({}) }), sleep: noSleep, known: new Set() }), /HTTP 403/);
  await a.rejects(lx.run({ ...site, api: 'https://example.test/' }, { fetchImpl: async () => { throw new Error('must not call'); } }), /Unverified Lixiang/);
});
