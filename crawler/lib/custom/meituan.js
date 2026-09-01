// 美团 2027届校招（custom）
// 接口：POST https://zhaopin.meituan.com/api/official/job/getJobList
// jobShareType=1(校招) + jobType=[{code:1}](应届生) + specialCode=['1'](常规校招，排除 LongCat/北斗/食杂精英)
const fs = require('fs');
const path = require('path');

const COMPANY = '美团';
const KEY = 'meituan';
const URL = 'https://zhaopin.meituan.com/api/official/job/getJobList';
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
    'Origin': 'https://zhaopin.meituan.com',
    'Referer': 'https://zhaopin.meituan.com/web/campus',
    'Accept': 'application/json, text/plain, */*',
  };
  const jobs = [];
  let pageNo = 1;
  let totalPage = 1;
  const pageSize = 100;
  while (true) {
    const body = {
      page: { pageNo, pageSize },
      jobShareType: '1',
      keywords: '',
      cityList: [], department: [], jfJgList: [],
      jobType: [{ code: '1', subCode: [] }],
      typeCode: [], specialCode: ['1'],
      u_query_id: 'x', r_query_id: String(Date.now()),
    };
    const r = await fetch(URL, { method: 'POST', headers: H, body: JSON.stringify(body) });
    const j = await r.json();
    if (!j || !j.data || !Array.isArray(j.data.list)) throw new Error('meituan fail: ' + JSON.stringify(j).slice(0, 200));
    const list = j.data.list;
    totalPage = (j.data.page && j.data.page.totalPage) || 1;
    for (const x of list) {
      const dept = Array.isArray(x.department) ? x.department.filter(Boolean).join('/') : '-';
      const city = Array.isArray(x.cityList) ? x.cityList.map(c => (c && c.name) || '').filter(Boolean).join('/') : '-';
      jobs.push({
        title: String(x.name || '').trim(),
        dept: dept || '-',
        // jobFamily=官方职类（技术类/职能类/销售客服与支持类…），jobFamilyGroup=细分（算法/后端…）
        category: String(x.jobFamily || ''),
        city: city || '-',
        date: fmtDate(x.firstPostTime),
        url: 'https://zhaopin.meituan.com/web/position/detail?jobUnionId=' + x.jobUnionId + '&highlightType=campus',
        desc: [x.jobDuty, x.jobRequirement].filter(Boolean).join('\n'),
        commitment: '全职',
        id: String(x.jobUnionId),
      });
    }
    if (pageNo >= totalPage || list.length === 0) break;
    pageNo++;
    await new Promise(res => setTimeout(res, 120));
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
