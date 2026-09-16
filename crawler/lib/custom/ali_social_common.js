// 阿里系社招通用实现（talent-holding.alibaba.com 阿里集团 / talent.taotian.com 淘天集团）
// 流程（同校招 campus-talent 的鉴权）：
//   ① GET /off-campus/position-list?lang=zh → XSRF-TOKEN/SESSION cookie
//   ② POST /position/search?_csrf=... body {channel:"group_official_site",language:"zh",pageIndex,pageSize:100,...}
// experience {from,to} 为结构化经验下限；positionUrl 为详情相对链接。
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

function fmtDate(v) {
  if (v == null || v === '') return '-';
  const n = Number(v);
  if (Number.isFinite(n) && n > 1e12) return new Date(n).toISOString().slice(0, 10);
  return String(v).slice(0, 10);
}

async function fetchAllFor(host) {
  const g = await fetch(`https://${host}/off-campus/position-list?lang=zh`, { headers: { 'User-Agent': UA } });
  const jar = {};
  for (const c of (g.headers.getSetCookie ? g.headers.getSetCookie() : [])) {
    const kv = c.split(';')[0];
    const i = kv.indexOf('=');
    if (i > 0) jar[kv.slice(0, i).trim()] = kv.slice(i + 1).trim();
  }
  const cookie = Object.entries(jar).map(([k, v]) => k + '=' + v).join('; ');
  const csrf = jar['XSRF-TOKEN'] || '';
  if (!csrf) throw new Error(host + ' 未取到 XSRF-TOKEN');

  const H = {
    'Content-Type': 'application/json',
    'User-Agent': UA,
    'Origin': `https://${host}`,
    'Referer': `https://${host}/off-campus/position-list?lang=zh`,
    'Cookie': cookie,
    'X-XSRF-TOKEN': csrf,
  };
  const jobs = [];
  const seen = new Set();
  // 兜底上限 40 页（4000 岗）
  for (let pageIndex = 1; pageIndex <= 40; pageIndex++) {
    const r = await fetch(`https://${host}/position/search?_csrf=` + encodeURIComponent(csrf), {
      method: 'POST', headers: H,
      body: JSON.stringify({
        channel: 'group_official_site', language: 'zh', batchId: '', categories: '', deptCodes: [],
        key: '', pageIndex, pageSize: 100, regions: '', subCategories: '', shareType: '', shareId: '', myReferralShareCode: '',
      }),
    });
    const j = await r.json();
    if (!j || j.success !== true || !j.content) throw new Error(host + ' position/search fail: ' + JSON.stringify(j).slice(0, 200));
    const list = j.content.datas || [];
    for (const x of list) {
      const id = String(x.id || '');
      if (!id || seen.has(id)) continue;
      seen.add(id);
      // 结构化经验：{from:N,to:M|null}
      let years = '';
      if (x.experience && typeof x.experience === 'object') {
        const from = Number(x.experience.from), to = x.experience.to == null ? null : Number(x.experience.to);
        if (Number.isFinite(from) && from > 0) years = (to != null && Number.isFinite(to) && to > from) ? (from + '-' + to + '年') : (from + '年以上');
      }
      const locs = Array.isArray(x.workLocations) ? x.workLocations.filter(Boolean).join('/') : '-';
      jobs.push({
        title: String(x.name || '').trim(),
        dept: x.department || x.project || '-',
        category: (Array.isArray(x.categories) ? x.categories.join('/') : String(x.categoryName || '')),
        city: locs || '-',
        date: fmtDate(x.publishTime),
        url: `https://${host}` + String(x.positionUrl || `/off-campus/position-detail?positionId=${id}`),
        desc: [x.description, x.requirement].filter(Boolean).join('\n'),
        descDuty: String(x.description || ''),
        descRequire: String(x.requirement || ''),
        workYears: years,
        commitment: '社招',
        id,
      });
    }
    if (list.length < 100) break;
    await new Promise(res => setTimeout(res, 150));
  }
  return jobs;
}

module.exports = { fetchAllFor, UA };
