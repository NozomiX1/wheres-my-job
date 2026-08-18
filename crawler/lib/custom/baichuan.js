// 百川智能校招：SSR 站（飞书 ATS tenant=646926）。用无头 Chrome --dump-dom 渲染
// https://campus.baichuan-inc.com/，从渲染后的岗位卡片 DOM 解析 title/城市/承诺/职能/描述。
// 卡片结构：<a data-id=".." href="/646926/position/<id>/detail"> ... </a>
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const COMPANY = '百川智能';
const KEY = 'baichuan';
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const CAMPUS_URL = 'https://campus.baichuan-inc.com/';
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

function dumpDom() {
  const prof = path.join(os.tmpdir(), 'baichuan_prof_' + Date.now());
  const r = spawnSync(CHROME, [
    '--headless=new',
    '--dump-dom',
    '--virtual-time-budget=14000',
    '--ignore-certificate-errors',
    '--no-sandbox',
    '--disable-gpu',
    '--disable-dev-shm-usage',
    '--user-data-dir=' + prof,
    CAMPUS_URL
  ], { encoding: 'utf8', timeout: 120000, maxBuffer: 64 * 1024 * 1024 });
  try { fs.rmSync(prof, { recursive: true, force: true }); } catch (e) {}
  if (r.status !== 0 || !r.stdout) {
    throw new Error('Chrome dump 失败: ' + (r.stderr || r.error || '').toString().slice(0, 300));
  }
  return r.stdout;
}

function stripTags(s) {
  return String(s || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

function mapCommitment(c) {
  if (!c) return '全职';
  if (/正式|全职|校招/.test(c)) return '全职';
  if (/实习/.test(c)) return '实习';
  if (/社招/.test(c)) return '社招';
  return c;
}

function parseCards(html, base) {
  const jobs = [];
  const re = /<a\s+data-id="(\d+)"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/g;
  let m;
  while ((m = re.exec(html))) {
    const id = m[1];
    const href = m[2];
    const block = m[3];
    const title = stripTags((block.match(/positionItem-title-text">([\s\S]*?)<\/span>/) || [])[1]);
    const desc = stripTags((block.match(/positionItem-jobDesc">([\s\S]*?)<\/div>/) || [])[1]);
    // subTitle 内含 <div class="lineDevider"> 子节点，取到 jobDesc 之前为止，避免被第一个 </div> 截断
    const sub = (block.match(/positionItem-subTitle">([\s\S]*?)(?=<div class="jobDesc)/) || [])[1] || '';
    const spans = [];
    const spRe = /<span(?:\s[^>]*)?>([\s\S]*?)<\/span>/g;
    let sm;
    while ((sm = spRe.exec(sub))) spans.push(stripTags(sm[1]));
    const city = spans[0] || '-';
    const commitment = mapCommitment(spans[1]);
    const func = spans[2] || '';
    const url = href.startsWith('http') ? href : (base + href);
    jobs.push({
      title,
      dept: func || '-',
      city,
      date: '-',
      url,
      desc,
      commitment,
      id
    });
  }
  return jobs;
}

async function resolveBase() {
  // campus.baichuan-inc.com 会重定向到飞书域名并把 /position/{id}/detail 路径丢掉，需直接用飞书域名
  const r = await fetch(CAMPUS_URL, { headers: { 'User-Agent': UA }, redirect: 'follow' });
  return new URL(r.url).origin;
}

async function fetchAll() {
  const base = await resolveBase();
  const html = dumpDom();
  const jobs = parseCards(html, base);
  if (!jobs.length) throw new Error('未解析到百川岗位卡片');
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
