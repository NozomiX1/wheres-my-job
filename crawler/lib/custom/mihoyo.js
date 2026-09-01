// 米哈游校招：POST https://ats.openout.mihoyo.com/ats-portal/v1/job/list
// 无需登录，hireType 1=校招。列表接口无逐岗详情/发布时间，desc 取自 jobSummary（部分岗位有）。
// 详情链接统一指向校招职位列表页（无逐岗 detail）。
const fs = require('fs');
const path = require('path');

const COMPANY = '米哈游';
const KEY = 'mihoyo';
const BASE = 'https://ats.openout.mihoyo.com/ats-portal';
const LIST_URL = 'https://jobs.mihoyo.com/#/campus/position';
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

async function post(pathname, body) {
  const r = await fetch(BASE + pathname, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': UA,
      'Release-Tag': 'v26.9.0-260805',
      'current-request': 'request',
      'Origin': 'https://jobs.mihoyo.com',
      'Referer': 'https://jobs.mihoyo.com/'
    },
    body: JSON.stringify(body)
  });
  return r.json();
}

// 列表接口 jobSummary 大多为空，详情接口 /v1/job/info 有完整 description/jobRequire
async function fetchDetail(id) {
  try {
    const r = await post('/v1/job/info', { id: String(id), channelDetailIds: [1], hireType: 1 });
    const d = (r && r.data) || {};
    return [d.description, d.jobRequire].filter(Boolean).join('\n');
  } catch (e) { return ''; }
}

async function fetchAll() {
  const jobs = [];
  const pageSize = 50;
  let pageNo = 1;
  let total = 0;
  // 兜底：最多翻 40 页，避免接口异常导致死循环
  while (pageNo <= 40) {
    const res = await post('/v1/job/list', { pageNo, pageSize, channelDetailIds: [1], hireType: 1 });
    if (!res || !res.data) throw new Error('米哈游接口无 data: ' + JSON.stringify(res).slice(0, 300));
    const list = res.data.list || [];
    if (!total) total = res.data.total || res.data.totalCount || 0;
    for (const it of list) {
      jobs.push({
        title: String(it.title || '').trim(),
        dept: String(it.competencyType || '-'),
        category: String(it.competencyType || ''),
        city: (it.addressDetailList || []).map(a => a && a.addressDetail).filter(Boolean).join('/') || '-',
        date: '-',
        url: 'https://jobs.mihoyo.com/#/campus/position/' + it.id,
        desc: '',
        commitment: String(it.jobNature || '全职'),
        id: String(it.id || '')
      });
    }
    if (list.length < pageSize) break;
    if (total && jobs.length >= total) break;
    pageNo++;
    await new Promise(r => setTimeout(r, 200));
  }
  // 逐岗拉详情补 desc
  for (const j of jobs) {
    j.desc = await fetchDetail(j.id);
    await new Promise(r => setTimeout(r, 120));
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
