// Moka ATS 客户端（校招/社招通用）：拉全量岗位列表并 AES-128-CBC 解密。
// 适用：app.mokahr.com/campus-recruitment/<orgId>/<siteId>（月之暗面/智谱/阶跃/DeepSeek/鹰角 等大量公司用 Moka）。
// 用法：node moka.js <orgId> <siteId> <site> <aesIv> <outfile>
//   site: campus | social
//   aesIv: 解密 IV。Moka 全局常量通常是 "de7c21ed8d6f50fe"（部分站点自定义，从页面 init-data 的 aesIv 取）。
const crypto = require('crypto');
const fs = require('fs');

const [orgId, siteId, site, aesIv, outfile] = process.argv.slice(2);
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

function decryptAes(enc, key, iv) {
  const decipher = crypto.createDecipheriv('aes-128-cbc', Buffer.from(key, 'utf8'), Buffer.from(iv, 'utf8'));
  decipher.setAutoPadding(true); // PKCS7
  return Buffer.concat([decipher.update(Buffer.from(enc, 'base64')), decipher.final()]).toString('utf8');
}

function extractJobs(decrypted) {
  let parsed;
  try { parsed = JSON.parse(decrypted); } catch (e) { parsed = { __raw: decrypted }; }
  if (Array.isArray(parsed)) return { jobs: parsed, total: parsed.length };
  const d = parsed.data || parsed;
  const jobs = d.jobs || d.list || d.job_post_list || (Array.isArray(d) ? d : []);
  const total = (d.jobStats && d.jobStats.total) || d.total || d.count || jobs.length;
  return { jobs: Array.isArray(jobs) ? jobs : [], total };
}

async function post(path, body) {
  const r = await fetch('https://app.mokahr.com' + path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'User-Agent': UA, 'Origin': 'https://app.mokahr.com', 'Referer': 'https://app.mokahr.com/' },
    body: JSON.stringify(body)
  });
  return { status: r.status, txt: await r.text() };
}

(async () => {
  const LIMIT = 50;
  const all = [];
  let offset = 0, total = 0;
  while (true) {
    const body = {
      orgId, siteId: Number(siteId), limit: LIMIT, offset, needStat: true,
      keyword: '', zhinengIds: [], projectFolderIds: [], departmentIds: [],
      campusSiteIds: [], jobRankIds: [], experiences: [], customFields: {}, site
    };
    const res = await post('/api/outer/ats-apply/website/jobs/v2', body);
    if (res.status !== 200) { console.log('STATUS ' + res.status + ' ' + res.txt.slice(0, 200)); break; }
    let dec;
    try {
      const p = JSON.parse(res.txt);
      if (p.data && typeof p.data === 'string' && p.necromancer) dec = decryptAes(p.data, p.necromancer, aesIv);
      else dec = res.txt; // 未加密，直接用原文
    } catch (e) { dec = res.txt; }
    const { jobs, total: t } = extractJobs(dec);
    all.push(...jobs);
    if (t) total = t;
    offset += LIMIT;
    if (jobs.length < LIMIT) break;
    if (total && all.length >= total) break;
  }
  fs.writeFileSync(outfile, JSON.stringify(all, null, 2), 'utf8');
  console.log('DONE total=' + total + ' fetched=' + all.length + ' -> ' + outfile);
})().catch(e => { console.log('ERR ' + e.message); process.exit(1); });
