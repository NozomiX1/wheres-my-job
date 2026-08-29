// 鹰角网络（Moka ATS 自定义域名 jobs.hypergryph.com）
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const BASE = 'https://jobs.hypergryph.com';
const ORG = 'hypergryph';
const SITE_ID = '26326';
const IV = 'de7c21ed8d6f50fe';
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

function decrypt(dataB64, keyStr) {
  const decipher = crypto.createDecipheriv('aes-128-cbc', Buffer.from(keyStr, 'utf8'), Buffer.from(IV, 'utf8'));
  decipher.setAutoPadding(true);
  return JSON.parse(Buffer.concat([decipher.update(Buffer.from(dataB64, 'base64')), decipher.final()]).toString('utf8'));
}

// 列表接口不返回 jobDescription，需按 id 调详情接口 /api/outer/ats-apply/website/job 补 desc
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
    const body = { orgId: ORG, siteId: SITE_ID, limit, offset, needStat: true, jobIdTopList: [], customFields: {}, site: 'campus', locale: 'zh-CN' };
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
  // 逐岗拉详情补 desc（列表不返回描述正文）
  const mapped = [];
  for (const x of all) {
    const desc = await fetchDetail(String(x.id));
    mapped.push({
      title: x.title || '',
      dept: (x.department && x.department.name) || (x.zhineng && x.zhineng.name) || '-',
      city: (x.locations || []).map(l => l.provinceName || l.cityName).filter(Boolean).join('/'),
      date: String(x.createdAt || x.openedAt || '-').slice(0, 10),
      url: `https://jobs.hypergryph.com/campus_apply/hypergryph/26326#/job/${x.id}`,
      desc,
      commitment: x.commitment || '',
      id: String(x.id || '')
    });
    await new Promise(res => setTimeout(res, 120));
  }
  return mapped;
}

module.exports = { fetchAll };

if (require.main === module) {
  fetchAll().then(jobs => {
    const raw = path.join(__dirname, '..', '..', 'out', 'hypergryph_raw.json');
    fs.writeFileSync(raw, JSON.stringify(jobs, null, 2), 'utf8');
    console.log('raw=' + jobs.length);
  }).catch(e => { console.error('ERR ' + e.message); process.exit(1); });
}
