// 快手社招：GET https://zhaopin.kuaishou.cn/recruit/e/api/v1/open/positions/simple
//   ?pageNum=N&pageSize=100&positionNatureCode=C001&recruitProject=socialr
// 需带 sign/signTimestamp 头：sign = HMAC-SHA256(ts + canonicalQuery + salt, salt)，
//   盐 = 652f962a-0575-4575-98d2-f04e2291bee2（从页面 sinature.ts 逆向，已验证一致）。
// workExperienceCode 为结构化经验字典（1不限/2应届/3一年以下/4=1-3年/5=3-5年/6=5-10年/7十年以上），
// 直接输出中文标签到 workYears 供 build 的年限过滤用。
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const COMPANY = '快手';
const KEY = 'kuaishou_social';
const SIMPLE = 'https://zhaopin.kuaishou.cn/recruit/e/api/v1/open/positions/simple';
const DICT = 'https://zhaopin.kuaishou.cn/recruit/e/api/v1/dictionary/batch?types=positionCategory';
const SALT = '652f962a-0575-4575-98d2-f04e2291bee2';
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

const EXP_MAP = { 1: '经验不限', 2: '应届毕业生', 3: '1年以下', 4: '1-3年', 5: '3-5年', 6: '5-10年', 7: '10年以上' };

// 与页面 sinature.ts 一致的 canonicalQuery：keys 排序，多值 sort 后逗号连接，encodeURIComponent、%20→+
function canonQuery(q) {
  if (!q || Object.keys(q).length === 0) return '';
  const out = [];
  Object.keys(q).sort().forEach(k => {
    let v = q[k];
    if (!Array.isArray(v)) v = [v];
    const r = v.filter(x => x !== null && x !== undefined && x !== '').sort();
    if (r.length > 0) out.push(k + '=' + r.map(x => encodeURIComponent(x).replace(/%20/g, '+')).join(','));
  });
  return out.join('&');
}

function signedHeaders(query) {
  const ts = String(Date.now());
  const msg = ts + canonQuery(query) + SALT;
  const sign = crypto.createHmac('sha256', SALT).update(msg, 'utf8').digest('hex');
  return { sign, signTimestamp: ts };
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function getCategoryMap() {
  try {
    const { sign, signTimestamp } = signedHeaders({});
    const r = await fetch(DICT, { headers: { 'User-Agent': UA, 'Referer': 'https://zhaopin.kuaishou.cn/recruit/e/', sign, signTimestamp } });
    const j = await r.json();
    const cats = (j.result || {}).positionCategory || [];
    const map = {};
    for (const c of cats) {
      if (c.code) map[c.code] = c.name;
      for (const ch of (c.children || [])) if (ch.code) map[ch.code] = ch.name;
    }
    return map;
  } catch (e) { return {}; }
}

async function pullPage(pageNum, pageSize) {
  const query = { pageNum: String(pageNum), pageSize: String(pageSize), positionNatureCode: 'C001', recruitProject: 'socialr' };
  const { sign, signTimestamp } = signedHeaders(query);
  const qs = new URLSearchParams(query).toString();
  const res = await fetch(SIMPLE + '?' + qs, {
    headers: { 'User-Agent': UA, 'Origin': 'https://zhaopin.kuaishou.cn', 'Referer': 'https://zhaopin.kuaishou.cn/recruit/e/', 'Accept': 'application/json, text/plain, */*', sign, signTimestamp },
  });
  const j = await res.json();
  if (!j.result) throw new Error('快手社招接口异常: ' + JSON.stringify(j).slice(0, 200));
  return { total: j.result.total || 0, list: j.result.list || [] };
}

async function fetchAll() {
  const catMap = await getCategoryMap();
  const jobs = [];
  let pageNum = 1, total = 0;
  const pageSize = 100;
  while (true) {
    const { total: t, list } = await pullPage(pageNum, pageSize);
    if (!total) total = t;
    for (const x of list) {
      jobs.push({
        title: String(x.name || '').trim(),
        dept: String(x.departmentName || x.departmentCode || '-').trim() || '-',
        category: catMap[x.positionCategoryCode] || String(x.positionCategoryCode || ''),
        city: Array.isArray(x.workLocations) ? x.workLocations.map(c => c && c.name).filter(Boolean).join('/') : '-',
        date: String(x.releaseTime || '').slice(0, 10) || '-',
        url: 'https://zhaopin.kuaishou.cn/recruit/e/#/official/social/job-info/' + x.id,
        desc: [x.description, x.positionDemand].filter(Boolean).join('\n'),
        workYears: EXP_MAP[x.workExperienceCode] || '',
        commitment: '社招',
        id: String(x.id || x.code || ''),
      });
    }
    if (jobs.length >= total) break;
    pageNum++;
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
