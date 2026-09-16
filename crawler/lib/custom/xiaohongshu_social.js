// 小红书社招（custom）
// 接口同校招：POST https://job.xiaohongshu.com/websiterecruit/position/pageQueryPosition
//   {"recruitType":"social","positionName":"","pageNum":N,"pageSize":100}
// 详情链接：job.xiaohongshu.com/social/position/{positionId}
const fs = require('fs');
const path = require('path');

const COMPANY = '小红书';
const KEY = 'xiaohongshu_social';
const BASE = 'https://job.xiaohongshu.com';
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

async function fetchPage(pageNum, pageSize) {
  const r = await fetch(BASE + '/websiterecruit/position/pageQueryPosition', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': UA,
      'Origin': BASE,
      'Referer': BASE + '/social/position',
      'Accept': 'application/json, text/plain, */*',
    },
    body: JSON.stringify({ recruitType: 'social', positionName: '', pageNum, pageSize }),
  });
  const j = await r.json();
  if (!j || j.statusCode !== 200 || !j.data || !Array.isArray(j.data.list)) {
    throw new Error('pageQueryPosition fail: ' + JSON.stringify(j).slice(0, 200));
  }
  return { list: j.data.list, total: Number(j.data.total) || 0 };
}

async function fetchAll() {
  const PAGE_SIZE = 100;
  const jobs = [];
  let total = 0;
  for (let pageNum = 1; pageNum <= 50; pageNum++) {
    const { list, total: t } = await fetchPage(pageNum, PAGE_SIZE);
    if (!total) total = t;
    for (const d of list) {
      jobs.push({
        title: String(d.positionName || '').trim(),
        dept: String(d.jobProjectName || '-'),
        category: String(d.jobType || ''),
        city: String(d.workplace || '-'),
        date: String(d.publishTime || '').slice(0, 10) || '-',
        url: d.positionId ? (BASE + '/social/position/' + d.positionId) : '',
        desc: [d.duty, d.qualification].filter(Boolean).join('\n'),
        descDuty: String(d.duty || ''),
        descRequire: String(d.qualification || ''),
        commitment: '社招',
        id: String(d.positionId || ''),
      });
    }
    if (!list.length || jobs.length >= total) break;
    await new Promise(res => setTimeout(res, 100));
  }
  return jobs;
}

module.exports = { fetchAll, COMPANY, KEY };

if (require.main === module) {
  fetchAll().then(jobs => {
    const raw = path.join(__dirname, '..', '..', 'out', KEY + '_raw.json');
    fs.writeFileSync(raw, JSON.stringify(jobs, null, 2), 'utf8');
    console.log('raw=' + jobs.length);
  }).catch(e => { console.error('ERR ' + e.message); process.exit(1); });
}
