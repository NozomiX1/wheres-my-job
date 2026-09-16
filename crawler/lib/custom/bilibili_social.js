// B站社招（custom）
// 站点：jobs.bilibili.com/social，API 同域（srs = 社招职位系统）。
// 两步（与校招同款鉴权）：
//   ① GET /api/auth/v1/csrf/token（X-UserType:2 + X-AppKey:ops.ehr-api.auth）
//   ② POST /api/srs/position/positionList，header X-CSRF
// body：workTypeList/positionTypeList = ["3"]（全职/社招），recruitType 0。
// 详情路由：jobs.bilibili.com/social/position/{id}
const fs = require('fs');
const path = require('path');

const COMPANY = 'B站';
const KEY = 'bilibili_social';
const API = 'https://jobs.bilibili.com';
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

async function getCsrf() {
  const r = await fetch(API + '/api/auth/v1/csrf/token', {
    headers: {
      'User-Agent': UA,
      'Referer': 'https://jobs.bilibili.com/social',
      'Origin': 'https://jobs.bilibili.com',
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
  const r = await fetch(API + '/api/srs/position/positionList', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': UA,
      'Referer': 'https://jobs.bilibili.com/social',
      'Origin': 'https://jobs.bilibili.com',
      'X-UserType': '2',
      'X-AppKey': 'ops.ehr-api.auth',
      'X-CSRF': csrf,
      'Accept': 'application/json',
    },
    body: JSON.stringify({
      pageSize, pageNum, positionName: '', postCode: [], postCodeList: [],
      workLocationList: [], workTypeList: ['3'], positionTypeList: ['3'],
      deptCodeList: [], recruitType: 0, practiceTypes: [], onlyHotRecruit: 0,
    }),
  });
  const j = await r.json();
  if (!j || j.code !== 0 || !j.data || !Array.isArray(j.data.list)) {
    throw new Error('srs positionList fail: ' + JSON.stringify(j).slice(0, 200));
  }
  return { list: j.data.list, total: Number(j.data.total) || 0, pages: Number(j.data.pages) || 1 };
}

async function fetchAll() {
  const PAGE_SIZE = 100;
  const jobs = [];
  let pages = 1;
  for (let pageNum = 1; pageNum <= pages && pageNum <= 60; pageNum++) {
    const { list, total, pages: p } = await fetchPage(pageNum, PAGE_SIZE);
    if (p) pages = Math.min(p, 60);
    for (const x of list) {
      jobs.push({
        title: String(x.positionName || '').trim(),
        dept: '-',
        category: String(x.postCodeName || ''),
        city: String(x.workLocation || '-'),
        date: String(x.pushTime || '').slice(0, 10) || '-',
        url: 'https://jobs.bilibili.com/social/position/' + x.id,
        desc: String(x.positionDescription || ''),
        commitment: String(x.positionTypeName || '社招'),
        id: String(x.id || ''),
      });
    }
    if (!list.length || (total && jobs.length >= total)) break;
    await new Promise(res => setTimeout(res, 120));
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
