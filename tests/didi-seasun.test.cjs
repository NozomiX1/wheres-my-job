'use strict';
const test = require('node:test'), a = require('node:assert/strict');
const didi = require('../crawler/lib/custom/didi_portal'), seasun = require('../crawler/lib/custom/seasun_portal');
const sites = require('../crawler/sites.json').sites, siteOf = k => sites.find(s => s.key === k);
const noSleep = async () => {};

test('didi: pages the social list at 100 per page, JD and dates come from the list', async () => {
  const urls = [], item = i => ({ jdId: 100 + i, jobName: '岗位' + i, workArea: '北京市', deptName: '网约车', jobTypeName: '技术', createTime: '2026-09-16 11:28:54', refreshTime: '2026-10-21', jobDuty: '负责开发', jobQualification: '本科及以上' });
  const fetchImpl = async url => { urls.push(String(url)); const n = Number(new URL(url).searchParams.get('page')); return { status: 200, json: async () => ({ meta: { code: 0 }, data: { total: 130, items: Array.from({ length: 130 }, (_, i) => item(i)).slice((n - 1) * 100, n * 100) } }) }; };
  const out = await didi.run(siteOf('didi_social'), { fetchImpl, sleep: noSleep });
  a.equal(out.total, 130); a.equal(urls.length, 2); a.ok(urls[0].includes('size=100'));
  const r = didi.normalizeRecord(out.jobs[0], siteOf('didi_social'));
  a.deepEqual({ id: r.id, channels: r.channels, publishedAt: r.publishedAt, updatedAt: r.updatedAt, department: r.department, url: r.url, jd: r.jdComplete, req: r.requirements },
    { id: '100', channels: ['social'], publishedAt: '2026-09-16 11:28:54', updatedAt: '2026-10-21', department: '网约车', url: 'https://talent.didiglobal.com/social/jobDetail?jdId=100', jd: true, req: '本科及以上' });
});

test('didi: refusal and bad shapes fail the source; unverified identity does not run', async () => {
  await a.rejects(didi.run(siteOf('didi_social'), { fetchImpl: async () => ({ status: 403, json: async () => ({}) }), sleep: noSleep }), /HTTP 403/);
  await a.rejects(didi.run(siteOf('didi_social'), { fetchImpl: async () => ({ status: 200, json: async () => ({ meta: { code: 1 } }) }), sleep: noSleep }), /unexpected list response/);
  await a.rejects(didi.run({ ...siteOf('didi_social'), api: 'https://example.test/' }, { fetchImpl: async () => { throw new Error('must not call'); } }), /Unverified Didi/);
});

// 假的西山居接口：列表按 offset/limit，详情按 id；campus 与 social 用同一套。
function fakeSeasun(n, { refuseDetailAt = 0 } = {}) {
  const calls = [], row = i => ({ id: 'id' + i, title: '岗位' + i, commitment: i % 2 ? '全职' : '实习', zhineng: { name: '运营发行' }, locations: [{ city: '成都市' }, { city: '成都市' }], department: { name: '成都西山居' }, customFields: [{ name: '项目', value: '实习生招聘' }] });
  const fetchImpl = async url => {
    calls.push(String(url)); const u = new URL(url), last = u.pathname.split('/').pop();
    if (last === 'xishanju') { const off = Number(u.searchParams.get('offset')), lim = Number(u.searchParams.get('limit')); return { status: 200, json: async () => ({ code: 0, total: n, jobs: Array.from({ length: n }, (_, i) => row(i)).slice(off, off + lim) }) }; }
    if (refuseDetailAt && calls.filter(c => !c.includes('offset=')).length >= refuseDetailAt) return { status: 403, json: async () => ({}) };
    return { status: 200, json: async () => ({ code: 0, id: last, description: '<p>岗位职责：</p><p>开发</p>', education: '本科', minExperience: 3, maxExperience: 5, publishedAt: '2026-10-20T09:47:30.000Z', updatedAt: '2026-10-20T16:10:47.000Z' }) };
  };
  return { fetchImpl, calls };
}

test('seasun: lists then fetches each detail once and maps the record', async () => {
  const f = fakeSeasun(120), site = siteOf('seasun'), out = await seasun.run(site, { fetchImpl: f.fetchImpl, sleep: noSleep, known: new Set() });
  a.equal(out.total, 120); a.equal(f.calls.filter(c => c.includes('offset=')).length, 2); a.equal(f.calls.filter(c => !c.includes('offset=')).length, 120);
  const r = seasun.normalizeRecord(out.jobs[0], site);
  a.deepEqual({ id: r.id, city: r.city, channels: r.channels, employment: r.employment, department: r.department, batch: r.batch, experience: r.experience, education: r.education, publishedAt: r.publishedAt, desc: r.description, url: r.url },
    { id: 'id0', city: '成都市', channels: ['campus'], employment: 'internship', department: '成都西山居', batch: '实习生招聘', experience: '3-5年', education: '本科', publishedAt: '2026-10-20T09:47:30.000Z', desc: '岗位职责：\n开发', url: 'https://job.seasungames.cn/index/campusArticle.html#/?jobId=id0' });
  a.equal(seasun.normalizeRecord(out.jobs[1], siteOf('seasun_social')).employment, 'full-time');
  a.equal(seasun.normalizeRecord(out.jobs[1], siteOf('seasun_social')).url, 'https://job.seasungames.cn/index/jobArticle.html#/?jobId=id1');
});

test('seasun: known ids skip details; a refusal stops the details but not the source', async () => {
  const f = fakeSeasun(5), out = await seasun.run(siteOf('seasun'), { fetchImpl: f.fetchImpl, sleep: noSleep, known: new Set(['id0', 'id1']) });
  a.equal(f.calls.filter(c => !c.includes('offset=')).length, 3); a.equal(out.jobs.filter(j => j.detailReused).length, 2);
  const g = fakeSeasun(10, { refuseDetailAt: 3 }), partial = await seasun.run(siteOf('seasun_social'), { fetchImpl: g.fetchImpl, sleep: noSleep, known: new Set() });
  a.equal(partial.total, 10); a.ok(partial.issues.some(i => /详情请求停止/.test(i))); a.equal(g.calls.filter(c => !c.includes('offset=')).length, 3, 'no request after the refusal');
  await a.rejects(seasun.run(siteOf('seasun'), { fetchImpl: async () => ({ status: 403, json: async () => ({}) }), sleep: noSleep, known: new Set() }), /HTTP 403/);
  await a.rejects(seasun.run({ ...siteOf('seasun'), mode: 'social' }, { fetchImpl: async () => { throw new Error('must not call'); } }), /Unverified Seasun/);
});
