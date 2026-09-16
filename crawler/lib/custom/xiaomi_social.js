// 小米社招：GET https://hr.xiaomi.com/website/api/agent/searchJobPage?type=1
// type=1 社招（type=2 校招）。列表带 description/requirement。
const fs = require('fs');
const path = require('path');

const COMPANY = '小米';
const KEY = 'xiaomi_social';

const BASE = 'https://hr.xiaomi.com/website/api/agent/searchJobPage';
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function pullPage(pageNum, pageSize) {
  const qs = new URLSearchParams({ keyword: '', cityZhNames: '', pageSize: String(pageSize), pageNum: String(pageNum), type: '1' });
  const res = await fetch(BASE + '?' + qs.toString(), {
    headers: { 'User-Agent': UA, 'Referer': 'https://hr.xiaomi.com/website/opportunities.html' }
  });
  const j = await res.json();
  if (j.code !== 0 || !j.data) {
    throw new Error('小米社招接口异常: ' + JSON.stringify(j).slice(0, 200));
  }
  return { total: j.data.total || 0, list: j.data.list || [] };
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
        title: String(x.title || '').trim(),
        dept: String(x.levelOneDeptName || '-').trim() || '-',
        city: Array.isArray(x.cityZhNames) ? x.cityZhNames.join('/') : (String(x.cityZhNames || '').trim() || '-'),
        date: String(x.publishTime || '').slice(0, 10) || '-',
        url: String(x.url || ''),
        desc: [x.description, x.requirement].filter(Boolean).join('\n'),
        commitment: '社招',
        id: String(x.id)
      });
    }
    if (list.length < pageSize || jobs.length >= total) break;
    pageNum++;
    await sleep(200);
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
