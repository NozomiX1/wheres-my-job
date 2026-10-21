'use strict';
const test = require('node:test'), a = require('node:assert/strict');
const sanqi = require('../crawler/lib/custom/sanqi_portal');
const site = require('../crawler/sites.json').sites.find(s => s.key === 'sanqi_social');
const noSleep = async () => {};

const page = (title, duty, req) => '<div class="post-sub">职位描述：</div>\n<div class="wordBorder"><pre style="x">' + duty + '</pre></div>\n<div class="post-sub">任职要求： </div>\n<div class="d_top"><pre style="x">' + req + '</pre></div><div class="post-title">' + title + '</div>';
function fake(n, { refuseDetailAt = 0, emptyDetail = false } = {}) {
  const calls = [], row = i => ({ url: '/index.php?m=Home&c=society&a=post_info&id=' + (500 + i), name: '岗位' + i, work_place: '广州市', pname: '技术开发类', duty: '列表职责' + i });
  const fetchImpl = async url => {
    calls.push(String(url)); const u = new URL(url);
    if (u.searchParams.get('a') === 'getIndexPage') { const p = Number(u.searchParams.get('page')); return { status: 200, json: async () => ({ code: 0, data: { list: Array.from({ length: n }, (_, i) => row(i)).slice((p - 1) * 8, p * 8), count: n, page: p, pageSize: 8, pageCount: Math.ceil(n / 8) } }) }; }
    if (refuseDetailAt && calls.filter(c => c.includes('post_info')).length >= refuseDetailAt) return { status: 403, text: async () => '' };
    return { status: 200, text: async () => emptyDetail ? '<html></html>' : page('x', '1. 开发&amp;测试', '本科及以上，3年以上经验') };
  };
  return { fetchImpl, calls };
}

test('sanqi: parses the two <pre> sections of the detail page', () => {
  a.deepEqual(sanqi.parseDetail(page('t', '1. 开发&amp;测试\n2. 上线', '本科及以上')), { duty: '1. 开发&测试\n2. 上线', requirements: '本科及以上' });
  a.deepEqual(sanqi.parseDetail('<html></html>'), { duty: '', requirements: '' });
});

test('sanqi: pages the list (8 per page), fetches each detail, maps the record', async () => {
  const f = fake(20), out = await sanqi.run(site, { fetchImpl: f.fetchImpl, sleep: noSleep, known: new Set() });
  a.equal(out.total, 20); a.equal(f.calls.filter(c => c.includes('getIndexPage')).length, 3); a.equal(f.calls.filter(c => c.includes('post_info')).length, 20);
  const r = sanqi.normalizeRecord(out.jobs[0], site);
  a.deepEqual({ id: r.id, city: r.city, category: r.category, channels: r.channels, duty: r.duty, req: r.requirements, url: r.url }, { id: '500', city: '广州市', category: '技术开发类', channels: ['social'], duty: '1. 开发&测试', req: '本科及以上，3年以上经验', url: 'https://zhaopin.37.com/index.php?m=Home&c=society&a=post_info&id=500' });
});

test('sanqi: known ids skip details; refusal stops details only; a failed detail keeps the list duty', async () => {
  const f = fake(5), out = await sanqi.run(site, { fetchImpl: f.fetchImpl, sleep: noSleep, known: new Set(['500', '501']) });
  a.equal(f.calls.filter(c => c.includes('post_info')).length, 3); a.equal(out.jobs.filter(j => j.detailReused).length, 2);
  const g = fake(10, { refuseDetailAt: 3 }), partial = await sanqi.run(site, { fetchImpl: g.fetchImpl, sleep: noSleep, known: new Set() });
  a.equal(partial.total, 10); a.ok(partial.issues.some(i => /详情请求停止/.test(i))); a.equal(g.calls.filter(c => c.includes('post_info')).length, 3);
  const h = fake(2, { emptyDetail: true }), bare = await sanqi.run(site, { fetchImpl: h.fetchImpl, sleep: noSleep, known: new Set() });
  a.equal(sanqi.normalizeRecord(bare.jobs[0], site).duty, '列表职责0');
  await a.rejects(sanqi.run(site, { fetchImpl: async () => ({ status: 403 }), sleep: noSleep, known: new Set() }), /HTTP 403/);
  await a.rejects(sanqi.run({ ...site, api: 'https://example.test/' }, { fetchImpl: async () => { throw new Error('must not call'); } }), /Unverified Sanqi/);
});
