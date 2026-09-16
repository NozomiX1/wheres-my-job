// 华为社招：POST https://apigw-dgg-b0.huawei.com/api/apig/channelhw/recruitmentPosition/pub/getJobPage
// jobType=SR（校招 CR）。recruitmentType 留空即可（EXPERIENCED/SOCIAL/空 结果一致）。
// workYear 为结构化经验下限（数字字符串），jobFamilyName 为官方职族（研发族/营销族…）。
const fs = require('fs');
const path = require('path');

const COMPANY = '华为';
const KEY = 'huawei_social';

const BASE = 'https://apigw-dgg-b0.huawei.com/api/apig/channelhw/recruitmentPosition/pub/getJobPage?X-HW-ID=app_000000035886';
const H = {
  'Content-Type': 'application/json',
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124 Safari/537.36',
  'Origin': 'https://career.huawei.com',
  'Referer': 'https://career.huawei.com/cn',
  'X-HW-ID': 'app_000000035886',
  'x-jalor-tenantAlias': 'hcm',
  'x-language': 'zh_CN',
  'x-Referer': 'https://career.huawei.com/cn',
  'x-alb-gray': 'prod'
};

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function pullPage(curPage, pageSize) {
  const res = await fetch(BASE, {
    method: 'POST',
    headers: H,
    body: JSON.stringify({ jobType: 'SR', recruitmentType: [], curPage, pageSize })
  });
  const j = await res.json();
  if (j.status !== 'SUCCESS' || !j.data) {
    throw new Error('华为社招接口异常: ' + JSON.stringify(j).slice(0, 200));
  }
  return { totalRows: (j.data.pageVO && j.data.pageVO.totalRows) || 0, result: j.data.result || [] };
}

async function fetchAll() {
  const jobs = [];
  let curPage = 1, total = 0;
  const pageSize = 100;
  while (true) {
    const { totalRows, result } = await pullPage(curPage, pageSize);
    if (!total) total = totalRows;
    for (const x of result) {
      const wy = Number(x.workYear);
      jobs.push({
        title: String(x.jobName || '').trim(),
        dept: String(x.firstDeptName || x.deptName || '-').trim() || '-',
        category: String(x.jobFamilyName || x.categoryName || ''),
        city: String(x.workPlace || '').trim() || '-',
        date: x.releaseDate ? String(x.releaseDate).slice(0, 10) : '-',
        url: 'https://career.huawei.com/cn/job-details?advertisementId=' + x.advertisementId,
        desc: [x.mainBusiness, x.jobDesc, x.jobRequire].filter(Boolean).join('\n'),
        workYears: Number.isFinite(wy) && wy > 0 ? wy + '年以上' : '',
        commitment: '社招',
        id: String(x.advertisementId)
      });
    }
    if (jobs.length >= total) break;
    curPage++;
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
