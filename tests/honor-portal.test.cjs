'use strict';
const test = require('node:test'), a = require('node:assert/strict');
const honor = require('../crawler/lib/custom/honor_portal');
const sites = require('../crawler/sites.json').sites, siteOf = k => sites.find(s => s.key === k);
const noSleep = async () => {};

// 假的荣耀接口：每个套件 su 有自己的岗位（postId = su 末两位 + 序号），详情按 postId。
function fake(counts, { refuseDetailAt = 0 } = {}) {
  const calls = [], row = (su, i) => ({ postId: su.slice(-2) + i, postName: '岗位' + i, workTypeStr: su.endsWith('a5') ? '实习' : '全职', workPlaceStr: '深圳市', postTypeName: '研发类', company: '软件部', publishFirstDate: '2026-01-02 00:00:00', publishDate: '2026-02-03 10:00:00', projectName: '项目', educationStr: '本科及以上' });
  const fetchImpl = async (url, init) => {
    calls.push(String(url) + ' ' + init.body); const su = String(url).split('/').pop(), form = new URLSearchParams(init.body);
    if (String(url).includes('/listPositionDetail/')) {
      if (refuseDetailAt && calls.filter(c => c.includes('listPositionDetail')).length >= refuseDetailAt) return { status: 403, json: async () => ({}) };
      return { status: 200, json: async () => ({ state: '200', data: { postId: form.get('postId'), workContent: '负责开发', serviceCondition: '硕士及以上', education: '硕士研究生及以上' } }) };
    }
    const n = counts[su] ?? 0, page = Number(form.get('currentPage')), size = Number(form.get('pageSize'));
    return { status: 200, json: async () => ({ state: '200', data: { pageForm: { dataCount: n, totalPage: Math.ceil(n / size), pageData: Array.from({ length: n }, (_, i) => row(su, i)).slice((page - 1) * size, page * size) } } }) };
  };
  return { fetchImpl, calls };
}

test('honor: campus merges three portals (postId deduped), social has one; record fields and links', async () => {
  const campus = siteOf('honor'), [p1, p2, p3] = campus.portals;
  const f = fake({ [p1.su]: 20, [p2.su]: 3, [p3.su]: 2 }), out = await honor.run(campus, { fetchImpl: f.fetchImpl, sleep: noSleep, known: new Set() });
  a.equal(out.total, 25); a.equal(f.calls.filter(c => c.includes('listPosition/' + p1.su)).length, 2, '20 rows at 15 per page');
  a.ok(f.calls.some(c => c.includes('listPosition/' + p3.su) && c.includes('recruitType=12')));
  const intern = out.jobs.find(j => j._portal.su === p3.su), r = honor.normalizeRecord(intern, campus);
  a.deepEqual({ channels: r.channels, employment: r.employment, publishedAt: r.publishedAt, updatedAt: r.updatedAt, department: r.department, education: r.education, batch: r.batch, req: r.requirements, url: r.url },
    { channels: ['campus'], employment: 'internship', publishedAt: '2026-01-02 00:00:00', updatedAt: '2026-02-03 10:00:00', department: '软件部', education: '硕士研究生及以上', batch: '项目', req: '硕士及以上', url: 'https://career.honor.com/' + p3.su + '/pb/posDetail.html?postId=' + intern.postId + '&postType=intern' });
  const social = siteOf('honor_social'), g = fake({ [social.portals[0].su]: 4 }), s = await honor.run(social, { fetchImpl: g.fetchImpl, sleep: noSleep, known: new Set() });
  a.equal(s.total, 4); a.equal(honor.normalizeRecord(s.jobs[0], social).url.endsWith('postType=society'), true);
});

test('honor: known ids skip details; refusal stops details only; list refusal and unverified identity fail', async () => {
  const social = siteOf('honor_social'), su = social.portals[0].su;
  const f = fake({ [su]: 5 }), out = await honor.run(social, { fetchImpl: f.fetchImpl, sleep: noSleep, known: new Set([su.slice(-2) + '0']) });
  a.equal(f.calls.filter(c => c.includes('listPositionDetail')).length, 4); a.equal(out.jobs.filter(j => j.detailReused).length, 1);
  const g = fake({ [su]: 10 }, { refuseDetailAt: 3 }), partial = await honor.run(social, { fetchImpl: g.fetchImpl, sleep: noSleep, known: new Set() });
  a.equal(partial.total, 10); a.ok(partial.issues.some(i => /详情请求停止/.test(i))); a.equal(g.calls.filter(c => c.includes('listPositionDetail')).length, 3);
  await a.rejects(honor.run(social, { fetchImpl: async () => ({ status: 403, json: async () => ({}) }), sleep: noSleep, known: new Set() }), /HTTP 403/);
  await a.rejects(honor.run({ ...social, api: 'https://example.test/' }, { fetchImpl: async () => { throw new Error('must not call'); } }), /Unverified Honor/);
});
