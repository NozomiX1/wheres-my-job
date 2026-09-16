// 蚂蚁社招（custom）
// 接口：POST https://hrcareersweb.antgroup.com/api/social/position/search?ctoken=<bigfish_ctoken>
//   ctoken 为客户端自造随机值（umi.js：cookie ctoken 与 query 同值即可过 CSRF，已验证）
// body {key:"",regions:"",categories:"",subCategories:"",bgCode:"",socialQrCode:"",pageIndex:N,pageSize:10,channel:"group_official_site",language:"zh"}
// pageSize 上限 10；experience {from:N,to:null} 为结构化经验下限（年）。
// 详情链接：talent.antgroup.com/off-campus-position?positionId={id}（列表页路由，与校招 campus-position 对称）。
const fs = require('fs');
const path = require('path');

const COMPANY = '蚂蚁集团';
const KEY = 'ant_social';
const URL = 'https://hrcareersweb.antgroup.com/api/social/position/search';
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

function fmtDate(v) {
  if (v == null || v === '') return '-';
  const m = String(v).match(/^(\d{4}-\d{2}-\d{2})/);
  return m ? m[1] : '-';
}

async function fetchAll() {
  const ctoken = 'bigfish_ctoken_' + Date.now().toString(22);
  const H = {
    'Content-Type': 'application/json',
    'User-Agent': UA,
    'Origin': 'https://talent.antgroup.com',
    'Referer': 'https://talent.antgroup.com/off-campus-position',
    'Cookie': 'ctoken=' + ctoken,
  };
  const jobs = [];
  const seen = new Set();
  let pageIndex = 1;
  const pageSize = 10;
  // 兜底上限 400 页（4000 岗）
  while (pageIndex <= 400) {
    const r = await fetch(URL + '?ctoken=' + encodeURIComponent(ctoken), {
      method: 'POST', headers: H,
      body: JSON.stringify({ key: '', regions: '', categories: '', subCategories: '', bgCode: '', socialQrCode: '', pageIndex, pageSize, channel: 'group_official_site', language: 'zh' }),
    });
    const j = await r.json();
    if (!j || j.success !== true || !Array.isArray(j.content)) throw new Error('ant social fail: ' + JSON.stringify(j).slice(0, 200));
    const list = j.content;
    for (const x of list) {
      const id = String(x.id || '');
      if (!id || seen.has(id)) continue;
      seen.add(id);
      // 结构化经验：{from:N,to:M|null} → "3年以上" / "1-3年"
      let years = '';
      if (x.experience && typeof x.experience === 'object') {
        const from = Number(x.experience.from), to = x.experience.to == null ? null : Number(x.experience.to);
        if (Number.isFinite(from)) years = (to != null && Number.isFinite(to)) ? (from + '-' + to + '年') : (from > 0 ? from + '年以上' : '');
      }
      const locs = Array.isArray(x.workLocations) ? x.workLocations.filter(Boolean).join('/') : '-';
      jobs.push({
        title: String(x.name || '').trim(),
        dept: x.department || x.departmentPath || '-',
        category: (Array.isArray(x.categories) ? x.categories.join('/') : String(x.categoryName || '')),
        city: locs || '-',
        date: fmtDate(x.publishTime),
        url: 'https://talent.antgroup.com/off-campus-position?positionId=' + id,
        desc: [x.description, x.requirement].filter(Boolean).join('\n'),
        workYears: years,
        commitment: '社招',
        id,
      });
    }
    if (list.length === 0) break;
    pageIndex++;
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
