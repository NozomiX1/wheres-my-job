// 小红书校招（custom）
// 接口：POST https://job.xiaohongshu.com/websiterecruit/position/pageQueryPosition（JSON，无需 cookie）
//   {"recruitType":"campus","positionName":"","pageNum":N,"pageSize":100}
// 站点是自研 ATS（job.xiaohongshu.com，React SPA），列表走上面这个 XHR。
// recruitType=campus 的列表里混有实习岗（如"HR实习生"），由 build_score_html.js 按标题 isIntern 硬排除。
const fs = require('fs');
const path = require('path');

const COMPANY = '小红书';
const KEY = 'xiaohongshu';
const BASE = 'https://job.xiaohongshu.com';
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

async function fetchPage(pageNum, pageSize) {
  const r = await fetch(BASE + '/websiterecruit/position/pageQueryPosition', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': UA,
      'Origin': BASE,
      'Referer': BASE + '/campus/position',
      'Accept': 'application/json, text/plain, */*',
    },
    body: JSON.stringify({ recruitType: 'campus', positionName: '', pageNum, pageSize }),
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
        url: d.positionId ? (BASE + '/campus/position/' + d.positionId) : '',
        desc: [d.duty, d.qualification].filter(Boolean).join('\n'),
        // 职责/要求分开存，打分器 v3 对要求段降权
        descDuty: String(d.duty || ''),
        descRequire: String(d.qualification || ''),
        commitment: '全职',
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
