// 网易雷火 2027届校招（custom）
// 接口：GET https://xiaozhao.leihuo.netease.com/api/apply/job/list/show?project_id=77（page_size=200 一页可拉全量）
const fs = require('fs');
const path = require('path');

const COMPANY = '网易雷火';
const KEY = 'netease_leihuo';
const API = 'https://xiaozhao.leihuo.netease.com/api/apply/job/list/show';
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function fetchAll() {
  const all = [];
  const pageSize = 200;
  let page = 1;
  let total = 0;
  while (true) {
    const url = `${API}?job_name=&page_size=${pageSize}&page_number=${page}&project_id=77`;
    const r = await fetch(url, { headers: { 'User-Agent': UA, 'Referer': 'https://xiaozhao.leihuo.netease.com/' } });
    const j = await r.json();
    if (j.status !== 200 || !j.data) throw new Error('leihuo list fail: ' + JSON.stringify(j).slice(0, 200));
    total = j.data.count_number || 0;
    const list = j.data.apply_job_list || [];
    all.push(...list);
    if (j.data.last_page || list.length === 0 || all.length >= total) break;
    page++;
    await sleep(150);
  }

  const jobs = all.map(i => ({
    title: String(i.job_name || '').trim(),
    dept: Array.isArray(i.department_name) ? i.department_name.filter(Boolean).join('/') || '-' : '-',
    city: String(i.work_place_name || '-'),
    date: '-',
    url: String(i.job_detail_url || ''),
    desc: [i.job_description, i.job_requirement].filter(Boolean).join('\n'),
    commitment: String(i.type_name || '全职'),
    id: String(i.ehr_job_id || i.job_code || ''),
  }));
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
