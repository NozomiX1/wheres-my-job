// 京东 2027届校招（custom）
// 接口：POST https://campus.jd.com/api/wx/position/page?type=present（body: pageSize/pageIndex/parameter）
// type=present = 应届生（已天然排除 TGT/实习）；pageIndex 从 0 开始。
const fs = require('fs');
const path = require('path');

const COMPANY = '京东';
const KEY = 'jd';
const URL = 'https://campus.jd.com/api/wx/position/page?type=present';
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

function fmtDate(v) {
  if (v == null || v === '') return '-';
  const s = String(v);
  const m = s.match(/^\s*(\d{4})-(\d{2})-(\d{2})/);
  if (m) return m[1] + '-' + m[2] + '-' + m[3];
  const n = Number(s);
  if (Number.isFinite(n) && n > 0) {
    const d = new Date(n);
    if (!Number.isNaN(d.getTime())) return d.toISOString().slice(0, 10);
  }
  return '-';
}

// "北京市-北京市" -> "北京"、"广东省-深圳市" -> "深圳"、"湖北省-黄冈市" -> "黄冈"
function cityName(s) {
  if (!s) return '';
  let c = String(s);
  const i = c.lastIndexOf('-');
  if (i >= 0) c = c.slice(i + 1);
  c = c.replace(/市$/, '').replace(/特别行政区$/, '');
  return c.trim();
}

async function fetchAll() {
  const jobs = [];
  let pageIndex = 0;
  let total = 0;
  const pageSize = 100;
  while (true) {
    const r = await fetch(URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'User-Agent': UA },
      body: JSON.stringify({
        pageSize,
        pageIndex,
        parameter: { positionName: '', planIdList: [], jobDirectionCodeList: [], workCityCodeList: [], positionDeptList: [] },
      }),
    });
    const j = await r.json();
    if (!j || !j.success) throw new Error('jd fail: ' + JSON.stringify(j).slice(0, 200));
    const body = j.body || {};
    if (!total) total = body.totalNumber || 0;
    const items = body.items || [];
    for (const x of items) {
      const depts = [];
      const cities = [];
      if (Array.isArray(x.requirementVoList)) {
        for (const q of x.requirementVoList) {
          if (q.positionBg && !depts.includes(q.positionBg)) depts.push(q.positionBg);
          const cn = cityName(q.workCity);
          if (cn && !cities.includes(cn)) cities.push(cn);
        }
      }
      jobs.push({
        title: String(x.positionName || '').trim(),
        dept: depts.join('/') || '-',
        city: cities.join('/') || '-',
        date: fmtDate(x.publishTime),
        url: 'https://campus.jd.com/#/details?id=' + x.publishId,
        desc: [x.workContent, x.qualification].filter(Boolean).join('\n'),
        commitment: '全职',
        id: String(x.publishId),
      });
    }
    if (items.length < pageSize || jobs.length >= total) break;
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
