// 腾讯音乐 TME 2027届校招（custom）
// 接口：GET https://join.tencentmusic.com/api/uc-job/list?page=N
// job_type: 10=应届生(全职) / 20=实习生 / 30=日常实习生 / 40=技术大咖(精英计划，映射为"社招"经 isSocial 排除)
const fs = require('fs');
const path = require('path');

const COMPANY = '腾讯音乐';
const KEY = 'tme';
const BASE = 'https://join.tencentmusic.com/api';
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

const H = {
  'User-Agent': UA,
  'Accept': 'application/json, text/plain, */*',
  'Origin': 'https://join.tencentmusic.com',
  'Referer': 'https://join.tencentmusic.com/campus',
};

const sleep = ms => new Promise(r => setTimeout(r, ms));

function commitmentOf(jobType) {
  if (jobType === 20 || jobType === 30) return '实习';
  if (jobType === 40) return '社招'; // 技术大咖（精英计划），按口径排除
  return '全职'; // 10 = 应届生
}

async function fetchAll() {
  const all = [];
  let page = 1;
  let pageCount = 1;
  while (true) {
    const r = await fetch(`${BASE}/uc-job/list?page=${page}`, { headers: H });
    const j = await r.json();
    if (!j || !j.data) throw new Error('tme list fail: ' + JSON.stringify(j).slice(0, 200));
    const items = j.data.items || [];
    const meta = j.data._meta || {};
    pageCount = meta.page_count || 1;
    all.push(...items);
    if (items.length === 0 || page >= pageCount) break;
    page++;
    await sleep(150);
  }

  const jobs = all.map(i => {
    const city = (i.work_city || []).map(c => c && c.label).filter(Boolean).join('/');
    return {
      title: String(i.name || '').trim(),
      dept: String(i.setid_descr || i.jobf_descr || '-'),
      city: city || '-',
      date: String(i.date || '-'),
      url: i.id ? `https://join.tencentmusic.com/campus/post-details?id=${i.id}` : '',
      desc: String(i.duty || ''),
      commitment: commitmentOf(i.job_type),
      id: String(i.id || ''),
    };
  });
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
