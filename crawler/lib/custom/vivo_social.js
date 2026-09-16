// vivo 社招：POST https://hr.vivo.com/api/social/webSite/portal/page
// body {city_code_list:[],company_id:1,group_id:1,user_id:null,job_category_id_list:[],keyword:"",max_results:100,page:N,yoe_list:[],loading:true}
// yoe_min/yoe_max 为结构化经验区间（年）。详情页从路由 state 传参（无深链），URL 用列表页 + keyword 预填搜索。
const fs = require('fs');
const path = require('path');

const COMPANY = 'vivo';
const KEY = 'vivo_social';
const URL = 'https://hr.vivo.com/api/social/webSite/portal/page';
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function pullPage(page) {
  const r = await fetch(URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': UA,
      'Origin': 'https://hr.vivo.com',
      'Referer': 'https://hr.vivo.com/jobs',
      'Accept': 'application/json, text/plain, */*',
    },
    body: JSON.stringify({ city_code_list: [], company_id: 1, group_id: 1, user_id: null, job_category_id_list: [], keyword: '', max_results: 100, page, yoe_list: [], loading: true }),
  });
  const j = await r.json();
  if (j.code !== 0 || !Array.isArray(j.data)) throw new Error('vivo 社招接口异常: ' + JSON.stringify(j).slice(0, 200));
  return j.data;
}

function fmtDate(ts) {
  if (!ts) return '-';
  const d = new Date(Number(ts));
  return isNaN(d.getTime()) ? '-' : d.toISOString().slice(0, 10);
}

async function fetchAll() {
  const jobs = [];
  const seen = new Set();
  // 兜底上限 40 页（4000 岗）
  for (let page = 1; page <= 40; page++) {
    const list = await pullPage(page);
    for (const x of list) {
      const id = String(x.job_id || x.job_code || '');
      if (!id || seen.has(id)) continue;
      seen.add(id);
      // 结构化经验：yoe_min/yoe_max（数字，年）
      let years = '';
      const mn = Number(x.yoe_min), mx = x.yoe_max == null ? null : Number(x.yoe_max);
      if (Number.isFinite(mn) && mn > 0) years = (mx != null && Number.isFinite(mx) && mx > mn) ? (mn + '-' + mx + '年') : (mn + '年以上');
      const city = Array.isArray(x.job_location_list) ? x.job_location_list.map(l => l && l.city).filter(Boolean).join('/') : '-';
      jobs.push({
        title: String(x.job_title || '').trim(),
        dept: String(x.requirement_org_name || '-'),
        category: String(x.job_category || ''),
        city: city || '-',
        date: fmtDate(x.publish_timestamp),
        url: 'https://hr.vivo.com/jobs?keyword=' + encodeURIComponent(String(x.job_title || '').slice(0, 20)),
        desc: String(x.job_desc || ''),
        workYears: years,
        commitment: '社招',
        id,
      });
    }
    if (list.length < 100) break;
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
