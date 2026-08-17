// 蚂蚁集团 2027届校招（custom）
// 接口：POST https://hrcareersweb.antgroup.com/api/campus/position/search
// body {channel:"campus_group_official_site",language:"zh_CN",pageIndex:0,pageSize:10}（pageSize 上限 10，pageIndex 从 0 开始）
// 该接口返回全部校招岗位（含实习/精英计划），commitment 标记实习，精英计划/实习由 crawl.js 统一排除。
const fs = require('fs');
const path = require('path');

const COMPANY = '蚂蚁集团';
const KEY = 'ant';
const URL = 'https://hrcareersweb.antgroup.com/api/campus/position/search';
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

async function fetchAll() {
  const H = {
    'Content-Type': 'application/json',
    'User-Agent': UA,
    'Origin': 'https://talent.antgroup.com',
    'Referer': 'https://talent.antgroup.com/campus-list',
  };
  const jobs = [];
  let pageIndex = 0;
  const pageSize = 10;
  while (true) {
    const r = await fetch(URL, {
      method: 'POST', headers: H,
      body: JSON.stringify({ channel: 'campus_group_official_site', language: 'zh_CN', pageIndex, pageSize }),
    });
    const j = await r.json();
    if (!j || !j.success) throw new Error('ant fail: ' + JSON.stringify(j).slice(0, 200));
    const list = j.content || [];
    for (const x of list) {
      const isIntern = /实习/.test(String(x.batchName || '')) || String(x.batchTypeDesc || '') === '实习生';
      const locs = Array.isArray(x.workLocations) ? x.workLocations.filter(Boolean).join('/') : '-';
      jobs.push({
        title: String(x.name || '').trim(),
        dept: x.department || x.departmentPath || '-',
        city: locs || '-',
        date: fmtDate(x.publishTime),
        url: 'https://talent.antgroup.com/campus-position?positionId=' + x.id,
        desc: [x.description, x.requirement].filter(Boolean).join('\n'),
        commitment: isIntern ? '实习' : '全职',
        id: String(x.id),
      });
    }
    // pageSize 上限 10；totalCount 不稳定，拉到空页为止
    if (list.length === 0) break;
    pageIndex++;
    if (pageIndex > 200) break;
    await new Promise(res => setTimeout(res, 120));
  }
  // 接口翻页不稳定，同一 id 可能跨页重复出现，按 id 去重
  const seen = new Map();
  for (const j of jobs) seen.set(j.id, j);
  return [...seen.values()];
}

module.exports = { fetchAll, COMPANY, KEY };

if (require.main === module) {
  fetchAll().then(jobs => {
    const raw = path.join(__dirname, '..', '..', 'out', KEY + '_raw.json');
    fs.writeFileSync(raw, JSON.stringify(jobs, null, 2), 'utf8');
    console.log('raw=' + jobs.length);
  }).catch(e => { console.error('ERR ' + e.message); process.exit(1); });
}
