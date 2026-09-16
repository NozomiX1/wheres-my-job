// 网易社招（custom，覆盖网易集团：互娱/雷火/有道/云音乐/伏羲/传媒…）
// 接口：POST https://hr.163.com/api/hr163/position/queryPage
//   body {"currentPage":N,"pageSize":100} → {pages,total,list}
// 字段：name/firstPostTypeName(职类)/productName(事业部)/firstDepName/workPlaceNameList/
//   reqWorkYearsName(结构化年限"0-3年/不限/3-5年")/description+requirement(JD)。
// 实习岗混在池内（标题带"实习生"），由 build 的 isIntern 排除。
// 详情路由：hr.163.com/job-detail.html?id={id}
const fs = require('fs');
const path = require('path');

const COMPANY = '网易';
const KEY = 'netease_social';
const URL = 'https://hr.163.com/api/hr163/position/queryPage';
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function fetchPage(currentPage, pageSize) {
  const r = await fetch(URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': UA,
      'Origin': 'https://hr.163.com',
      'Referer': 'https://hr.163.com/job-list.html',
      'Accept': 'application/json, text/plain, */*',
    },
    body: JSON.stringify({ currentPage, pageSize }),
  });
  const j = await r.json();
  if (!j || j.code !== 200 || !j.data || !Array.isArray(j.data.list)) {
    throw new Error('netease queryPage fail: ' + JSON.stringify(j).slice(0, 200));
  }
  return { list: j.data.list, pages: Number(j.data.pages) || 1, total: Number(j.data.total) || 0 };
}

async function fetchAll() {
  const jobs = [];
  const seen = new Set();
  const PAGE_SIZE = 100;
  let pages = 1;
  for (let currentPage = 1; currentPage <= pages && currentPage <= 40; currentPage++) {
    const { list, pages: p } = await fetchPage(currentPage, PAGE_SIZE);
    if (p) pages = Math.min(p, 40);
    for (const x of list) {
      const id = String(x.id || '');
      if (!id || seen.has(id)) continue;
      seen.add(id);
      jobs.push({
        title: String(x.name || '').trim(),
        dept: [x.productName, x.firstDepName].filter(Boolean).join('/') || '-',
        category: String(x.firstPostTypeName || ''),
        city: Array.isArray(x.workPlaceNameList) ? x.workPlaceNameList.join('/') : '-',
        date: x.updateTime ? new Date(Number(x.updateTime)).toISOString().slice(0, 10) : '-',
        url: 'https://hr.163.com/job-detail.html?id=' + id,
        desc: [x.description, x.requirement].filter(Boolean).join('\n'),
        descDuty: String(x.description || ''),
        descRequire: String(x.requirement || ''),
        workYears: String(x.reqWorkYearsName || ''),
        commitment: '社招',
        id,
      });
    }
    if (!list.length) break;
    await sleep(120);
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
