// 百度校招（custom）
// 接口：POST https://talent.baidu.com/httservice/getPostListNew（form-urlencoded，无需 cookie）
//   recruitType=GRADUATE&pageSize=20&keyWord=&curPage=N&projectType=1
// projectType=1 = 普通校招（非 AIDU/管培生，AIDU 由 crawl.js 按标题 exclude 排除）。
// pageSize 上限 20（50 以上接口返回 fail），145 条岗约 8 页循环拉全量。
// 旧方案（无头 Chrome dump SSR 首屏 __INITIAL_DATA__）只能拿第 1 页 10 条，已弃用。
const fs = require('fs');
const path = require('path');

const COMPANY = '百度';
const KEY = 'baidu';
const BASE = 'https://talent.baidu.com';
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

async function fetchPage(curPage, pageSize) {
  const body = 'recruitType=GRADUATE&pageSize=' + pageSize + '&keyWord=&curPage=' + curPage + '&projectType=1';
  const r = await fetch(BASE + '/httservice/getPostListNew', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
      'User-Agent': UA,
      'Origin': BASE,
      'Referer': BASE + '/jobs/list?projectType=1',
      'Accept': 'application/json, text/plain, */*',
    },
    body,
  });
  const j = await r.json();
  if (!j || j.status !== 'ok' || !j.data || !Array.isArray(j.data.list)) {
    throw new Error('getPostListNew fail: ' + JSON.stringify(j).slice(0, 200));
  }
  return { list: j.data.list, total: Number(j.data.total) || 0 };
}

async function fetchAll() {
  const PAGE_SIZE = 20;
  const jobs = [];
  const seen = new Set();
  let total = 0;
  for (let curPage = 1; curPage <= 30; curPage++) {
    const { list, total: t } = await fetchPage(curPage, PAGE_SIZE);
    if (!total) total = t;
    for (const d of list) {
      const name = String(d.name || '');
      // name 形如 "北京-智能体算法工程师(J101017)"，去掉开头的 "城市-" 前缀
      const title = name.replace(/^[^-]+-/, '');
      const id = String(d.postId || d.jobId || '');
      if (seen.has(id)) continue;
      seen.add(id);
      jobs.push({
        title,
        dept: String(d.orgName || '-'),
        category: String(d.postType || ''),
        city: String(d.workPlace || '-'),
        date: String(d.publishDate || '').slice(0, 10) || '-',
        url: d.jobId ? (BASE + '/jobs/detail/GRADUATE/' + d.jobId) : '',
        desc: [d.workContent, d.serviceCondition].filter(Boolean).join('\n'),
        // 职责/要求分开存，打分器 v3 对要求段降权（"熟悉LLM者优先"≠"负责LLM研发"）
        descDuty: String(d.workContent || ''),
        descRequire: String(d.serviceCondition || ''),
        commitment: '全职',
        id,
      });
    }
    if (!list.length || jobs.length >= total) break;
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
