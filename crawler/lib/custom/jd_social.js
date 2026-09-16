// 京东社招（custom）
// 接口：POST https://zhaopin.jd.com/web/job/job_list（form-urlencoded，无需登录）
//   pageIndex=N&pageSize=100&workCityJson=[]&jobTypeJson=[]&jobSearch=&depTypeJson=[]
// 老式服务端渲染站，岗位详情在列表页内联展开（无独立详情路由），URL 用列表页 + jobSearch 预填搜索词。
// 响应字段：positionName/positionDeptName/jobType(官方职类)/workCity/formatPublishTime/workContent/qualification。
const fs = require('fs');
const path = require('path');

const COMPANY = '京东';
const KEY = 'jd_social';
const BASE = 'https://zhaopin.jd.com';
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function pullPage(pageIndex, pageSize) {
  const body = 'pageIndex=' + pageIndex + '&pageSize=' + pageSize + '&workCityJson=%5B%5D&jobTypeJson=%5B%5D&jobSearch=&depTypeJson=%5B%5D';
  const r = await fetch(BASE + '/web/job/job_list', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': UA,
      'Origin': BASE,
      'Referer': BASE + '/web/job/job_info_list/3',
      'Accept': 'application/json, text/plain, */*',
    },
    body,
  });
  const j = await r.json();
  if (!Array.isArray(j)) throw new Error('job_list fail: ' + JSON.stringify(j).slice(0, 200));
  return j;
}

async function fetchAll() {
  const jobs = [];
  const seen = new Set();
  const pageSize = 100;
  // 兜底上限 60 页（6000 岗）
  for (let pageIndex = 1; pageIndex <= 60; pageIndex++) {
    const list = await pullPage(pageIndex, pageSize);
    for (const d of list) {
      const id = String(d.requirementId || d.positionId || d.id || '');
      if (!id || seen.has(id)) continue;
      seen.add(id);
      const title = String(d.positionName || d.positionNameOpen || '').trim();
      if (!title) continue;
      jobs.push({
        title,
        dept: String(d.positionDeptName || '-'),
        category: String(d.jobType || ''),
        city: String(d.workCity || '-'),
        date: String(d.formatPublishTime || '').slice(0, 10) || '-',
        url: BASE + '/web/job/job_info_list/3?jobSearch=' + encodeURIComponent(String(d.positionNameOpen || title).slice(0, 30)),
        desc: [d.workContent, d.qualification].filter(Boolean).join('\n'),
        descDuty: String(d.workContent || ''),
        descRequire: String(d.qualification || ''),
        commitment: '社招',
        id,
      });
    }
    if (list.length < pageSize) break;
    await sleep(150);
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
