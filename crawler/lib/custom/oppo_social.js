// OPPO 社招（custom）
// 站点：career.oppo.com（单数域名=社招部署；careers.oppo.com 是校招部署）
// 接口：POST https://career.oppo.com/ats-candidate-api/open-api/position/queryPositionList
//   body {pageNum,pageSize:100,publishName:"",workCityCodeList:[],jobTypeList:[],recruitTypeList:["SOCIAL-RECRUITMENT"],shareId:""}
// minWorkYears/maxWorkYears 为结构化经验区间；jobDuty/workRequire 职责与要求分开。
const fs = require('fs');
const path = require('path');

const COMPANY = 'OPPO';
const KEY = 'oppo_social';
const BASE = 'https://career.oppo.com';
const API = BASE + '/ats-candidate-api/open-api/position/queryPositionList';
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

const JOB_TYPE = { SOFTWARE: '软件类', PRODUCT: '产品类', MARKETING: '市场类', DESIGN: '设计类', HARDWARE: '硬件类', TEST: '测试类', DATA: '数据类', FUNCTION: '职能类', OTHER: '其他' };

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function pullPage(pageNum, pageSize) {
  const r = await fetch(API, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': UA,
      'Origin': BASE,
      'Referer': BASE + '/official/oppo/recruitment/post?recruitType=SOCIAL-RECRUITMENT',
      'Accept': 'application/json, text/plain, */*',
    },
    body: JSON.stringify({ pageNum, pageSize, publishName: '', workCityCodeList: [], jobTypeList: [], recruitTypeList: ['SOCIAL-RECRUITMENT'], shareId: '' }),
  });
  const j = await r.json();
  if (!j || j.code !== '0' || !j.data || !Array.isArray(j.data.list)) {
    throw new Error('OPPO 社招接口异常: ' + JSON.stringify(j).slice(0, 200));
  }
  return { list: j.data.list, pages: Number(j.data.pages) || 1, total: Number(j.data.total) || 0 };
}

async function fetchAll() {
  const jobs = [];
  const seen = new Set();
  let pages = 1;
  for (let pageNum = 1; pageNum <= pages && pageNum <= 20; pageNum++) {
    const { list, pages: p } = await pullPage(pageNum, 100);
    if (p) pages = Math.min(p, 20);
    for (const x of list) {
      const id = String(x.positionId || x.jobNo || '');
      if (!id || seen.has(id)) continue;
      seen.add(id);
      // 结构化经验区间：minWorkYears-maxWorkYears
      let years = '';
      const mn = Number(x.minWorkYears), mx = Number(x.maxWorkYears);
      if (Number.isFinite(mn) && mn > 0) years = (Number.isFinite(mx) && mx > mn) ? (mn + '-' + mx + '年') : (mn + '年以上');
      jobs.push({
        title: String(x.publishName || x.jobName || '').trim(),
        dept: '-',
        category: JOB_TYPE[x.jobType] || String(x.jobType || ''),
        city: String(x.workCityName || '-'),
        date: String(x.publishDate || '').slice(0, 10) || '-',
        url: BASE + '/official/oppo/recruitment/post/' + (x.jobNo || id) + '?recruitType=SOCIAL-RECRUITMENT',
        desc: [x.jobDuty, x.workRequire].filter(Boolean).join('\n'),
        descDuty: String(x.jobDuty || ''),
        descRequire: String(x.workRequire || ''),
        workYears: years,
        commitment: '社招',
        id,
      });
    }
    if (!list.length) break;
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
