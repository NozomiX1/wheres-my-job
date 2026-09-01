// B站校招（custom）
// 站点：campus.bilibili.com（Vue SPA，zhaopin-toc），API 在 jobs.bilibili.com。
// 两步：
//   ① GET /api/auth/v1/csrf/token（需 X-UserType:2 + X-AppKey:ops.ehr-api.auth）拿 X-CSRF
//   ② POST /api/campus/position/positionList，header X-CSRF，body {"pageSize":200,"pageNum":N}
// 列表混有实习岗（positionTypeName=实习），由 build_score_html.js 按标题 isIntern 排除。
// 详情路由：campus.bilibili.com/index.html#/positions/{id}
const fs = require('fs');
const path = require('path');

const COMPANY = 'B站';
const KEY = 'bilibili';
const API = 'https://jobs.bilibili.com';
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

async function getCsrf() {
  const r = await fetch(API + '/api/auth/v1/csrf/token', {
    headers: {
      'User-Agent': UA,
      'Referer': 'https://campus.bilibili.com/index.html',
      'Origin': 'https://campus.bilibili.com',
      'X-UserType': '2',
      'X-AppKey': 'ops.ehr-api.auth',
      'Accept': 'application/json',
    },
  });
  const j = await r.json();
  if (!j || j.code !== 0 || !j.data) throw new Error('csrf fail: ' + JSON.stringify(j).slice(0, 150));
  return j.data;
}

async function fetchPage(pageNum, pageSize) {
  const csrf = await getCsrf();
  const r = await fetch(API + '/api/campus/position/positionList', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': UA,
      'Referer': 'https://campus.bilibili.com/index.html',
      'Origin': 'https://campus.bilibili.com',
      'X-UserType': '2',
      'X-AppKey': 'ops.ehr-api.auth',
      'X-CSRF': csrf,
      'Accept': 'application/json',
    },
    body: JSON.stringify({ pageSize, pageNum }),
  });
  const j = await r.json();
  if (!j || j.code !== 0 || !j.data || !Array.isArray(j.data.list)) {
    throw new Error('positionList fail: ' + JSON.stringify(j).slice(0, 200));
  }
  return { list: j.data.list, total: Number(j.data.total) || 0, pages: Number(j.data.pages) || 1 };
}

async function fetchAll() {
  const PAGE_SIZE = 200;
  const jobs = [];
  let pages = 1;
  for (let pageNum = 1; pageNum <= pages; pageNum++) {
    const { list, total, pages: p } = await fetchPage(pageNum, PAGE_SIZE);
    if (pageNum === 1) pages = Math.min(p || 1, 30);
    for (const d of list) {
      jobs.push({
        title: String(d.positionName || '').trim(),
        dept: String(d.postCodeName || '-'),
        city: String(d.workLocation || '-'),
        date: String(d.pushTime || '').slice(0, 10) || '-',
        url: d.id ? ('https://campus.bilibili.com/index.html#/positions/' + d.id) : '',
        desc: String(d.positionDescription || ''),
        commitment: String(d.positionTypeName || '全职'),
        id: String(d.id || ''),
      });
    }
    if (!list.length || jobs.length >= total) break;
    await new Promise(res => setTimeout(res, 200));
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
