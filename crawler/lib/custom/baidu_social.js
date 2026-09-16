// 百度社招（custom）
// 接口：POST https://talent.baidu.com/httservice/getPostListNew（form-urlencoded，无需 cookie）
//   recruitType=SOCIAL&pageSize=20&keyWord=&curPage=N&projectType=（社招 projectType 留空）
// 列表 workYears/education 为空，经验年限从 serviceCondition（要求段）文本解析。
// 详情链接：talent.baidu.com/jobs/detail/SOCIAL/{jobId}
const fs = require('fs');
const path = require('path');

const COMPANY = '百度';
const KEY = 'baidu_social';
const BASE = 'https://talent.baidu.com';
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

async function fetchPage(curPage, pageSize) {
  const body = 'recruitType=SOCIAL&pageSize=' + pageSize + '&keyWord=&curPage=' + curPage + '&projectType=';
  const r = await fetch(BASE + '/httservice/getPostListNew', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
      'User-Agent': UA,
      'Origin': BASE,
      'Referer': BASE + '/jobs/social-list',
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
  for (let curPage = 1; curPage <= 200; curPage++) {
    const { list, total: t } = await fetchPage(curPage, PAGE_SIZE);
    if (!total) total = t;
    for (const d of list) {
      // name 形如 "北京-智能体算法工程师(J101017)"，去掉开头的 "城市-" 前缀
      const title = String(d.name || '').replace(/^[^-]+-/, '');
      const id = String(d.postId || d.jobId || '');
      if (seen.has(id)) continue;
      seen.add(id);
      jobs.push({
        title,
        dept: String(d.orgName || '-'),
        category: String(d.postType || ''),
        city: String(d.workPlace || '-'),
        date: String(d.publishDate || '').slice(0, 10) || '-',
        url: d.jobId ? (BASE + '/jobs/detail/SOCIAL/' + d.jobId) : '',
        desc: [d.workContent, d.serviceCondition].filter(Boolean).join('\n'),
        // 职责/要求分开存，打分器 v3 对要求段降权；年限解析优先读要求段
        descDuty: String(d.workContent || ''),
        descRequire: String(d.serviceCondition || ''),
        commitment: '社招',
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
