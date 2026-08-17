// 快手校招：POST https://campus.kuaishou.cn/recruit/campus/e/api/v1/open/positions/simple
// recruitSubProjectCodes=["20271779425607"]（2027应届生）。该子项目下均为全职（positionNatureCode=fulltime）。
// 「快Star」精英计划岗位由 crawl.js 统一按 exclude 规则排除，模块只做抓取+归一化。
const fs = require('fs');
const path = require('path');

const COMPANY = '快手';
const KEY = 'kuaishou';

const SIMPLE = 'https://campus.kuaishou.cn/recruit/campus/e/api/v1/open/positions/simple';
const SUB = '20271779425607';
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function pullPage(pageNum, pageSize) {
  const res = await fetch(SIMPLE, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': UA,
      'Origin': 'https://campus.kuaishou.cn',
      'Referer': 'https://campus.kuaishou.cn/recruit/campus/e/',
      'Accept': 'application/json, text/plain, */*'
    },
    body: JSON.stringify({ recruitSubProjectCodes: [SUB], pageSize, pageNum })
  });
  const j = await res.json();
  if (!j.result) {
    throw new Error('快手接口异常: ' + JSON.stringify(j).slice(0, 200));
  }
  return { total: j.result.total || 0, list: j.result.list || [] };
}

async function fetchAll() {
  const jobs = [];
  let pageNum = 1, total = 0;
  const pageSize = 100;
  while (true) {
    const { total: t, list } = await pullPage(pageNum, pageSize);
    if (!total) total = t;
    for (const x of list) {
      jobs.push({
        title: String(x.name || '').trim(),
        dept: String(x.departmentName || '-').trim() || '-',
        city: Array.isArray(x.workLocationDicts) ? x.workLocationDicts.map(c => c && c.name).filter(Boolean).join('/') : '-',
        date: String(x.releaseTime || '').slice(0, 10) || '-',
        url: 'https://campus.kuaishou.cn/recruit/campus/e/#/campus/job-info/' + x.code,
        desc: [x.description, x.positionDemand].filter(Boolean).join('\n'),
        commitment: '全职',
        id: String(x.code)
      });
    }
    if (jobs.length >= total) break;
    pageNum++;
    await sleep(150);
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
