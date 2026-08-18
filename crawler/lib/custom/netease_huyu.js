// 网易互娱 2027届校招（custom）
// 接口：GET https://campus.game.163.com/api/campuspc/position/getJobList?projectId=102（pageSize=100 一页可拉全量）
const fs = require('fs');
const path = require('path');

const COMPANY = '网易互娱';
const KEY = 'netease_huyu';
const API = 'https://campus.game.163.com/api/campuspc/position/getJobList';
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

const sleep = ms => new Promise(r => setTimeout(r, ms));

function fmtDate(ms) {
  if (ms == null || ms === '') return '-';
  const n = Number(ms);
  if (!Number.isFinite(n) || n <= 0) return '-';
  const d = new Date(n + 8 * 3600 * 1000); // 站点为北京时间（UTC+8）
  return isNaN(d.getTime()) ? '-' : d.toISOString().slice(0, 10);
}

async function fetchAll() {
  const all = [];
  const pageSize = 100;
  let page = 1;
  let total = 0;
  while (true) {
    const url = `${API}?pageSize=${pageSize}&currentPage=${page}&projectId=102&timeStamp=${Date.now()}`;
    const r = await fetch(url, { headers: { 'User-Agent': UA, 'Referer': 'https://campus.game.163.com/' } });
    const j = await r.json();
    if (j.code !== 200 || !j.data) throw new Error('huyu list fail: ' + JSON.stringify(j).slice(0, 200));
    total = j.data.total || 0;
    const list = j.data.list || [];
    all.push(...list);
    if (list.length < pageSize || all.length >= total) break;
    page++;
    await sleep(150);
  }

  const jobs = all.map(i => ({
    title: String(i.positionName || '').trim(),
    dept: String(i.positionTypeName || '-'), // 岗位类别（人工智能/技术/游戏策划…），该接口无部门字段
    city: String(i.workPlaceName || '-').replace(/,/g, '/'),
    date: fmtDate(i.updateTime),
    url: 'https://campus.game.163.com/app/detail/index?id=' + i.id + '&projectId=102',
    desc: [i.positionDescription, i.positionRequirement].filter(Boolean).join('\n'),
    commitment: '全职',
    id: String(i.id || ''),
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
