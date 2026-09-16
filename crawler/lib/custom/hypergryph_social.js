// 鹰角网络社招（Moka ATS 自定义域名 jobs.hypergryph.com）
// 校招 siteId 26326（campus_apply），社招 siteId 26325（social-recruitment，由 302 解析）。
// 列表接口不返回 jobDescription，需按 id 调详情接口 /api/outer/ats-apply/website/job 补 desc。
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const BASE = 'https://jobs.hypergryph.com';
const ORG = 'hypergryph';
const SITE_ID = '26325';
const IV = 'de7c21ed8d6f50fe';
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

function decrypt(dataB64, keyStr) {
  const decipher = crypto.createDecipheriv('aes-128-cbc', Buffer.from(keyStr, 'utf8'), Buffer.from(IV, 'utf8'));
  decipher.setAutoPadding(true);
  return JSON.parse(Buffer.concat([decipher.update(Buffer.from(dataB64, 'base64')), decipher.final()]).toString('utf8'));
}

async function fetchDetail(jobId) {
  try {
    const r = await fetch(BASE + '/api/outer/ats-apply/website/job', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'User-Agent': UA, 'Origin': BASE, 'Referer': BASE + '/' },
      body: JSON.stringify({ orgId: ORG, jobId, siteId: Number(SITE_ID), locale: 'zh-CN' })
    });
    const j = await r.json();
    if (!j.data || !j.necromancer) return '';
    const dec = decrypt(j.data, j.necromancer);
    const d = dec.data || dec;
    return d.jobDescription || '';
  } catch (e) { return ''; }
}

async function fetchAll() {
  const all = [];
  let offset = 0; const limit = 50;
  while (true) {
    const body = { orgId: ORG, siteId: SITE_ID, limit, offset, needStat: true, jobIdTopList: [], customFields: {}, site: 'social', locale: 'zh-CN' };
    const r = await fetch(BASE + '/api/outer/ats-apply/website/jobs/v2', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'User-Agent': UA, 'Origin': BASE, 'Referer': BASE + '/' },
      body: JSON.stringify(body)
    });
    const j = await r.json();
    if (!j.data || !j.necromancer) break;
    const dec = decrypt(j.data, j.necromancer);
    const data = (dec.data || dec);
    const jobs = data.jobs || data.list || [];
    all.push(...jobs);
    if (jobs.length < limit) break;
    offset += limit;
    await new Promise(res => setTimeout(res, 200));
  }
  // 逐岗拉详情补 desc（限并发 4）
  const descs = new Array(all.length);
  let idx = 0;
  async function worker() {
    while (idx < all.length) {
      const i = idx++;
      descs[i] = await fetchDetail(String(all[i].id));
      await new Promise(res => setTimeout(res, 80));
    }
  }
  await Promise.all(Array.from({ length: 4 }, () => worker()));
  return all.map((x, i) => ({
    title: x.title || '',
    dept: (x.department && x.department.name) || (x.zhineng && x.zhineng.name) || '-',
    city: (x.locations || []).map(l => l.provinceName || l.cityName).filter(Boolean).join('/'),
    date: String(x.createdAt || x.openedAt || '-').slice(0, 10),
    url: `https://jobs.hypergryph.com/social-recruitment/hypergryph/26325#/job/${x.id}`,
    desc: descs[i] || '',
    commitment: x.commitment || '社招',
    id: String(x.id || '')
  }));
}

module.exports = { fetchAll };

if (require.main === module) {
  fetchAll().then(jobs => {
    const raw = path.join(__dirname, '..', '..', 'out', 'hypergryph_social_raw.json');
    fs.writeFileSync(raw, JSON.stringify(jobs, null, 2), 'utf8');
    console.log('raw=' + jobs.length);
  }).catch(e => { console.error('ERR ' + e.message); process.exit(1); });
}
