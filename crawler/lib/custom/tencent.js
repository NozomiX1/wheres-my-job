// 腾讯 2027届校招（custom）
// 接口：POST https://join.qq.com/api/v1/position/searchPosition（projectMappingIdList=[1] = 2027校园招聘）
// 岗位描述需逐岗 GET /api/v1/jobDetails/getJobDetailsByPostId?postId=<postId>（列表接口不带 JD）。
// workday 来源的海外岗（positionSource=workday）详情链接直接用 positionUrl，JD 一般取不到，desc 留空由筛选兜底。
const fs = require('fs');
const path = require('path');

const COMPANY = '腾讯';
const KEY = 'tencent';
const BASE = 'https://join.qq.com';
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

const H = {
  'User-Agent': UA,
  'Accept': 'application/json, text/plain, */*',
  'Origin': 'https://join.qq.com',
  'Referer': 'https://join.qq.com/post.html',
  'Content-Type': 'application/json',
};

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function searchPage(page, pageSize) {
  const r = await fetch(BASE + '/api/v1/position/searchPosition', {
    method: 'POST',
    headers: H,
    body: JSON.stringify({
      projectIdList: [],
      projectMappingIdList: [1], // 2027校园招聘
      keyword: '',
      bgList: [],
      workCountryType: 0, // 0=不限（含国内+海外）
      workCityList: [],
      recruitCityList: [],
      positionFidList: [],
      pageIndex: page,
      pageSize,
    }),
  });
  return await r.json();
}

async function getDetail(postId) {
  try {
    const r = await fetch(BASE + '/api/v1/jobDetails/getJobDetailsByPostId?postId=' + encodeURIComponent(postId), {
      headers: {
        'User-Agent': UA,
        'Accept': 'application/json, text/plain, */*',
        'Referer': 'https://join.qq.com/post_detail.html?postid=' + postId,
      },
    });
    const j = await r.json();
    return (j && j.data) ? j.data : j;
  } catch (e) {
    return null;
  }
}

async function fetchAll() {
  const positions = [];
  let page = 1;
  let total = 0;
  const pageSize = 100;
  while (true) {
    const j = await searchPage(page, pageSize);
    if (j.status !== 0 || !j.data) throw new Error('searchPosition fail: ' + JSON.stringify(j).slice(0, 200));
    total = j.data.count || 0;
    const list = j.data.positionList || [];
    positions.push(...list);
    if (list.length < pageSize || positions.length >= total) break;
    page++;
    await sleep(150);
  }

  // 逐岗取 JD（限并发，避免触发风控）
  const results = new Array(positions.length);
  let idx = 0;
  const CONC = 6;
  async function worker() {
    while (idx < positions.length) {
      const i = idx++;
      const p = positions[i];
      const detail = await getDetail(p.postId);
      const desc = detail ? [detail.desc, detail.request].filter(Boolean).join('\n') : '';
      const title = String(p.positionTitle || '').trim().replace(/\s+\d{6,}\s*$/, '');
      const isWorkday = p.positionSource === 'workday' || (p.positionUrl && /workday/i.test(String(p.positionUrl)));
      const cityRaw = String(p.workCities || '').trim();
      // 国内多城用空格分隔；workday 海外岗 workCities 是单个地点（含空格，如 "United Kingdom-London"），不拆分
      const city = isWorkday ? (cityRaw || '-') : (cityRaw.split(/\s+/).filter(Boolean).join('/') || '-');
      const url = isWorkday ? String(p.positionUrl || '') : 'https://join.qq.com/post_detail.html?postid=' + p.postId;
      results[i] = {
        title: title || '-',
        dept: String(p.bgs || '').trim() || '-',
        city: city || '-',
        date: '-',
        url,
        desc,
        commitment: '全职',
        id: String(p.postId || p.id || ''),
      };
      await sleep(20);
    }
  }
  await Promise.all(Array.from({ length: CONC }, () => worker()));
  return results.filter(Boolean);
}

module.exports = { fetchAll, COMPANY, KEY };

if (require.main === module) {
  fetchAll().then(jobs => {
    const raw = path.join(__dirname, '..', '..', 'out', KEY + '_raw.json');
    fs.writeFileSync(raw, JSON.stringify(jobs, null, 2), 'utf8');
    console.log('raw=' + jobs.length);
  }).catch(e => { console.error('ERR ' + e.message); process.exit(1); });
}
