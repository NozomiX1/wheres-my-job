// 阿里系社招通用实现（同构平台：
//   talent-holding.alibaba.com 阿里集团 / talent.taotian.com 淘天 / talent.ele.me 饿了么 /
//   aidc-jobs.alibaba.com 阿里国际 / careers.aliyun.com 阿里云 / careers-tongyi.alibaba.com 通义 /
//   talent.dingtalk.com 钉钉 / talent.quark.cn 夸克）
// 流程（同校招 campus-talent 的鉴权）：
//   ① GET /off-campus/position-list?lang=zh → XSRF-TOKEN/SESSION cookie
//   ② POST /position/search?_csrf=... body {channel:"group_official_site",language:"zh",pageIndex,pageSize,...}
// 注意：该平台翻页深度封顶约 500 条（阿里云 totalCount 693 只能翻 5 页），categories 过滤在部分站无效，
//   故用「城市分片」：POST /region/hot 拿城市字典，按 regions=code 逐城拉全（每城 < 500），再加一片全量兜底。
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
  const search = (body) => fetch(`https://${host}/position/search?_csrf=` + encodeURIComponent(csrf), {
    method: 'POST', headers: H, body: JSON.stringify(body),
  }).then(r => r.json());

  // 首页探总数，决定是否需要城市分片（深度封顶约 500）
  const probe = await search({ channel: 'group_official_site', language: 'zh', batchId: '', categories: '', deptCodes: [], key: '', pageIndex: 1, pageSize: 10, regions: '', subCategories: '', shareType: '', shareId: '', myReferralShareCode: '' });
  if (!probe || probe.success !== true || !probe.content) throw new Error(host + ' position/search fail: ' + JSON.stringify(probe).slice(0, 200));
  const totalCount = Number(probe.content.totalCount) || 0;

  // 城市字典（region/hot）；失败或总量小时退化为单片区
  let shards = [''];
  if (totalCount > 450) {
    try {
      const rj = await fetch(`https://${host}/region/hot?_csrf=` + encodeURIComponent(csrf), {
        method: 'POST', headers: H, body: JSON.stringify({ channel: 'group_official_site', language: 'zh' }),
      }).then(r => r.json());
      const codes = ((rj && rj.content) || []).map(c => c.code).filter(Boolean);
      if (codes.length) shards = codes.concat(['']);   // 末尾补一片全量，兜底热门城市之外的岗
    } catch (e) { /* 退化全量 */ }
  }

  const jobs = [];
  const seen = new Set();
  const norm = (x) => {
    const id = String(x.id || '');
    if (!id || seen.has(id)) return null;
    seen.add(id);
    // 结构化经验：{from:N,to:M|null}
    let years = '';
    if (x.experience && typeof x.experience === 'object') {
      const from = Number(x.experience.from), to = x.experience.to == null ? null : Number(x.experience.to);
      if (Number.isFinite(from) && from > 0) years = (to != null && Number.isFinite(to) && to > from) ? (from + '-' + to + '年') : (from + '年以上');
    }
    const locs = Array.isArray(x.workLocations) ? x.workLocations.filter(Boolean).join('/') : '-';
    return {
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
    };
  };

  for (const region of shards) {
    // 每片兜底上限 20 页（2000 岗）
    for (let pageIndex = 1; pageIndex <= 20; pageIndex++) {
      const j = await search({
        channel: 'group_official_site', language: 'zh', batchId: '', categories: '', deptCodes: [],
        key: '', pageIndex, pageSize: 100, regions: region, subCategories: '', shareType: '', shareId: '', myReferralShareCode: '',
      });
      if (!j || j.success !== true || !j.content) throw new Error(host + ' position/search fail: ' + JSON.stringify(j).slice(0, 200));
      const list = j.content.datas || [];
      for (const x of list) { const n = norm(x); if (n) jobs.push(n); }
      if (list.length === 0) break;
      await new Promise(res => setTimeout(res, 120));
    }
    await new Promise(res => setTimeout(res, 80));
  }
  return jobs;
}

module.exports = { fetchAllFor, UA };
