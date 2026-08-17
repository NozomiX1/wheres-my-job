// 上海人工智能实验室：GET https://www.shlab.org.cn/api/getJobList?mode=campus
// page_token 翻页。该站 mode=campus 基本全是实习（留用/日常实习），commitment 如实标"实习"，
// 交给 crawl.js 的实习过滤排除（因此校招全职命中 = 0 属正常）。
const fs = require('fs');
const path = require('path');

const COMPANY = '上海AI实验室';
const KEY = 'shlab';
const BASE = 'https://www.shlab.org.cn/api/getJobList';
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36';

const zhName = (x) => (x && x.name && x.name.zh_cn) || '';

async function getList(page_token, limit) {
  const u = `${BASE}?mode=campus&jobFunction=&location=&jobType=&subject=&keyword=&page_token=${encodeURIComponent(page_token || '')}&limit=${limit}`;
  const r = await fetch(u, {
    headers: {
      'User-Agent': UA,
      'Referer': 'https://www.shlab.org.cn/joinus/campus',
      'Accept': 'application/json'
    }
  });
  return r.json();
}

function msDate(ms) {
  if (!ms) return '-';
  const d = new Date(Number(ms));
  return isNaN(d.getTime()) ? '-' : d.toISOString().slice(0, 10);
}

async function fetchAll() {
  const jobs = [];
  const limit = 10; // 该接口 limit 上限为 10（>10 返回 400 Bad Request）
  let token = '';
  for (let i = 0; i < 100; i++) {
    const j = await getList(token, limit);
    if (!j || !j.data) throw new Error('上海AI实验室接口无 data: ' + JSON.stringify(j).slice(0, 200));
    const items = j.data.items || [];
    for (const it of items) {
      const addr = (it.address_list && it.address_list.length) ? it.address_list : (it.address ? [it.address] : []);
      const cities = [...new Set(addr.map(a => zhName(a && a.city)).filter(Boolean))];
      jobs.push({
        title: String(it.title || '').trim(),
        dept: zhName(it.job_department) || '-',
        city: cities.join('/') || '-',
        date: msDate(it.create_time),
        url: it.id ? ('https://www.shlab.org.cn/joinus/detail/' + it.id + '?mode=campus') : '',
        desc: [it.description, it.requirement].filter(Boolean).join('\n'),
        commitment: zhName(it.job_recruitment_type) || '实习',
        id: String(it.id || '')
      });
    }
    if (!j.data.has_more || !j.data.page_token) break;
    if (items.length === 0) break;
    token = j.data.page_token;
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
