// 腾讯音乐社招（custom）
// 接口：POST https://join.tencentmusic.com/api/job/list（同域，社招页 /social/ 使用）
//   body {page:N,ss:100,job_class:[],work_city:"",setid:"",deptids:"",keyword:"",order_by:"is_recommend"}
// 列表自带 duty（职责 JD）；无 total 字段，翻页到空为止。
// 详情路由：join.tencentmusic.com/social/post-details?id={id}（对称校招 /campus/post-details）。
const fs = require('fs');
const path = require('path');

const COMPANY = '腾讯音乐';
const KEY = 'tme_social';
const API = 'https://join.tencentmusic.com/api/job/list';
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function fetchPage(page, ss) {
  const r = await fetch(API, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': UA,
      'Origin': 'https://join.tencentmusic.com',
      'Referer': 'https://join.tencentmusic.com/social/',
      'Accept': 'application/json, text/plain, */*',
    },
    body: JSON.stringify({ page, ss, job_class: [], work_city: '', setid: '', deptids: '', keyword: '', order_by: 'is_recommend' }),
  });
  const j = await r.json();
  if (!j || j.code !== '200' || !j.data || !Array.isArray(j.data.items)) {
    throw new Error('tme social job/list fail: ' + JSON.stringify(j).slice(0, 200));
  }
  return j.data.items;
}

async function fetchAll() {
  const jobs = [];
  const seen = new Set();
  const PAGE_SIZE = 100;
  // 兜底上限 40 页（4000 岗）
  for (let page = 1; page <= 40; page++) {
    const items = await fetchPage(page, PAGE_SIZE);
    for (const x of items) {
      const id = String(x.id || '');
      if (!id || seen.has(id)) continue;
      seen.add(id);
      jobs.push({
        title: String(x.name || '').trim(),
        dept: String(x.position_nbr_descr || x.company_set || '-'),
        category: String(x.jobf_descr || ''),
        city: String(x.work_city || '-'),
        date: String(x.date || '').slice(0, 10) || '-',
        url: 'https://join.tencentmusic.com/social/post-details?id=' + id,
        desc: String(x.duty || ''),
        commitment: String(x.work_nature_descr || '社招'),
        id,
      });
    }
    if (items.length < PAGE_SIZE) break;
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
