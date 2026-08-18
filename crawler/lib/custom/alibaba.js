// 阿里巴巴 2027届校招（custom）
// 接口：POST https://campus-talent.alibaba.com/position/search（先 GET /campus/position 拿 XSRF-TOKEN/SESSION cookie）
// batchId=100000760001 = 阿里巴巴2027届应届生（含阿里星，阿里星由 crawl.js 按标题 exclude 排除）
const fs = require('fs');
const path = require('path');

const COMPANY = '阿里巴巴';
const KEY = 'alibaba';
const BASE = 'https://campus-talent.alibaba.com';
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

function fmtDate(v) {
  if (v == null || v === '') return '-';
  const s = String(v);
  const m = s.match(/^\s*(\d{4})-(\d{2})-(\d{2})/);
  if (m) return m[1] + '-' + m[2] + '-' + m[3];
  const n = Number(s);
  if (Number.isFinite(n) && n > 0) {
    // 时间戳按北京时间(UTC+8)展示，与官网「更新于」一致
    const d = new Date(n + 8 * 3600 * 1000);
    if (!Number.isNaN(d.getTime())) return d.toISOString().slice(0, 10);
  }
  return '-';
}

function join(arr) {
  if (!Array.isArray(arr)) return '-';
  const s = arr.map(x => (x && typeof x === 'object') ? (x.name || x.cityName || x.city || '') : String(x || '')).filter(Boolean).join('/');
  return s || '-';
}

async function getSession() {
  const r = await fetch(BASE + '/campus/position', { headers: { 'User-Agent': UA } });
  const jar = {};
  const sc = r.headers.getSetCookie ? r.headers.getSetCookie() : [];
  for (const c of sc) {
    const kv = c.split(';')[0];
    const i = kv.indexOf('=');
    if (i > 0) jar[kv.slice(0, i).trim()] = kv.slice(i + 1).trim();
  }
  const cookie = Object.entries(jar).map(([k, v]) => k + '=' + v).join('; ');
  return { cookie, csrf: jar['XSRF-TOKEN'] || '' };
}

async function fetchAll() {
  const { cookie, csrf } = await getSession();
  const H = {
    'Content-Type': 'application/json',
    'User-Agent': UA,
    'Origin': BASE,
    'Referer': BASE + '/campus/position',
    'Cookie': cookie,
    'X-XSRF-TOKEN': csrf,
  };
  const jobs = [];
  let pageIndex = 1;
  let total = 0;
  const pageSize = 100;
  const batchId = 100000760001; // 阿里巴巴2027届应届生
  while (true) {
    const r = await fetch(BASE + '/position/search?_csrf=' + encodeURIComponent(csrf), {
      method: 'POST', headers: H,
      body: JSON.stringify({ batchId, pageIndex, pageSize, channel: 'campus_group_official_site', language: 'zh' }),
    });
    const j = await r.json();
    if (!j || !j.success) throw new Error('search fail: ' + JSON.stringify(j).slice(0, 200));
    const list = (j.content && j.content.datas) || [];
    if (!total) total = j.content.totalCount || 0;
    for (const x of list) {
      jobs.push({
        title: String(x.name || '').trim(),
        dept: join(x.circleNames),
        city: join(x.workLocations),
        date: fmtDate(x.modifyTime ?? x.publishTime),
        url: BASE + '/campus/position/' + x.id,
        desc: [x.description, x.requirement].filter(Boolean).join('\n'),
        commitment: '全职',
        id: String(x.id),
      });
    }
    if (list.length < pageSize || jobs.length >= total) break;
    pageIndex++;
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
