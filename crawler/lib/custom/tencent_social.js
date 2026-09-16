// 腾讯社招（custom）
// 接口：GET https://careers.tencent.com/tencentcareer/api/post/Query（公开，无需签名）
// 列表自带 Responsibility（职责）+ RequireWorkYearsName（经验年限）+ PostURL（详情链接）。
// 注意：接口偶发返回异常（限频），fetchJSON 带重试。
const fs = require('fs');
const path = require('path');

const COMPANY = '腾讯';
const KEY = 'tencent_social';
const BASE = 'https://careers.tencent.com';
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function queryPage(pageIndex, pageSize) {
  const u = BASE + '/tencentcareer/api/post/Query?timestamp=' + Date.now()
    + '&countryId=&cityId=&bgIds=&productId=&categoryId=&parentCategoryId=&attrId=&keyword='
    + '&pageIndex=' + pageIndex + '&pageSize=' + pageSize + '&language=zh-cn&area=';
  let last = '';
  for (let i = 0; i < 4; i++) {
    try {
      const r = await fetch(u, { headers: { 'User-Agent': UA, 'Referer': BASE + '/search.html', 'Accept': 'application/json' } });
      const j = await r.json();
      if (j && j.Data && Array.isArray(j.Data.Posts)) return j.Data;
      last = JSON.stringify(j).slice(0, 150);
    } catch (e) { last = e.message; }
    await sleep(2000); // 限频退避
  }
  throw new Error('tencent social Query fail: ' + last);
}

function fmtDate(s) {
  // "2026年09月16日" -> 2026-09-16
  const m = String(s || '').match(/(\d{4})年(\d{2})月(\d{2})日/);
  return m ? (m[1] + '-' + m[2] + '-' + m[3]) : '-';
}

async function fetchAll() {
  const jobs = [];
  let pageIndex = 1, total = 0;
  const pageSize = 100;
  while (true) {
    const data = await queryPage(pageIndex, pageSize);
    if (!total) total = data.Count || 0;
    for (const p of data.Posts) {
      const id = String(p.PostId || '');
      jobs.push({
        title: String(p.RecruitPostName || '').trim(),
        dept: String(p.BGName || '-'),
        category: String(p.CategoryName || ''),      // 技术族/产品族/市场族/职能族…（官方类别门）
        city: String(p.LocationName || '-'),
        date: fmtDate(p.LastUpdateTime),
        url: String(p.PostURL || (id ? (BASE + '/jobdesc.html?postId=' + id) : '')),
        desc: String(p.Responsibility || ''),
        // 结构化经验年限（如 "八年以上工作经验"），打分/过滤优先读它
        workYears: String(p.RequireWorkYearsName || ''),
        commitment: '社招',
        id,
      });
    }
    if (data.Posts.length < pageSize || (total && jobs.length >= total)) break;
    pageIndex++;
    await sleep(400);
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
