'use strict';
const test = require('node:test'), a = require('node:assert/strict');
const fs = require('node:fs'), os = require('node:os'), path = require('node:path');
const x = require('../crawler/lib/custom/xiaomi_portal'), { runCrawl } = require('../crawler/crawl'), { publish, readPublished } = require('../crawler/publish');
const site = x.SOCIAL_PROFILE;

// 合成的官网记录（和 scope-extension 测试同款）；每天采一次，北京日期依次是 1 月 1、2、3 日。
const post = id => ({ id, title: '岗位 ' + id, cityZhNames: ['上海'], levelOneDeptName: '部门', description: '职责 ' + id, requirement: '要求 ' + id, expectedJobLevel: null, publishTime: null, larkJobCode: 'J' + id, type: 1, url: 'https://xiaomi.jobs.f.mioffice.cn/index/position/' + (100 + id) + '/detail', jobId: String(200 + id), jobPostId: String(100 + id) });
const raw = rows => ({ complete: false, total: rows.length, jobs: rows, issues: [], verification: { version: 4, policy: 'available', key: site.key, api: site.api, pages: 1, issues: [] } });

test('first sighting and the 7-day added/removed history: a new source records nothing, later runs record the difference', t => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ande-history-')); t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const file = path.join(dir, 'catalog.js');
  const day = (n, ids, hour = '02') => {
    const r = runCrawl(site, { outDir: dir, now: () => `2026-01-0${n}T${hour}:00:00.000Z`, runner: (_, args) => { fs.writeFileSync(args.at(-1), JSON.stringify(raw(ids.map(post)))); return { status: 0 }; } });
    a.equal(r.code, 0); a.equal(publish({ sites: [site], keys: [site.key], outDir: dir, dataFile: file, retiredKeys: [] }).code, 0);
    const data = readPublished(file); return { jobs: new Map(data.jobs.map(j => [j.id.split(':')[1], j])), source: data.sources.find(s => s.key === site.key) };
  };
  const one = day(1, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  a.equal(one.source.history, undefined, 'the first crawl of a source has nothing to compare with'); a.ok([...one.jobs.values()].every(j => !('firstSeen' in j)));
  const two = day(2, [2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
  a.equal(two.jobs.get('11').firstSeen, '2026-01-02'); a.ok(!('firstSeen' in two.jobs.get('2')), 'jobs from before tracking began have no first-seen day');
  a.deepEqual(two.source.history, [{ date: '2026-01-02', added: 1, removed: 1 }]);
  const three = day(3, [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
  a.equal(three.jobs.get('11').firstSeen, '2026-01-02', 'kept across later crawls'); a.equal(three.jobs.get('12').firstSeen, '2026-01-03');
  a.deepEqual(three.source.history, [{ date: '2026-01-02', added: 1, removed: 1 }, { date: '2026-01-03', added: 1, removed: 0 }]);
  const again = day(3, [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], '05'); // 同一天再采一次：不重复计数
  a.deepEqual(again.source.history.at(-1), { date: '2026-01-03', added: 1, removed: 0 });
});
