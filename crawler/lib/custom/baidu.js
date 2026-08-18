// 百度校招：SSR 站。用无头 Chrome --dump-dom 渲染 talent.baidu.com/jobs/list?projectType=1，
// 从页面内联的 window.__INITIAL_DATA__ JSON 里取 listData.listDetailData（第 1 页岗位）。
// projectType=1 = 普通校招（非 AIDU/管培生），commitment 全部为全职。
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const COMPANY = '百度';
const KEY = 'baidu';
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const LIST_URL = 'https://talent.baidu.com/jobs/list?projectType=1';

function dumpDom() {
  const prof = path.join(os.tmpdir(), 'baidu_prof_' + Date.now());
  const r = spawnSync(CHROME, [
    '--headless=new',
    '--dump-dom',
    '--virtual-time-budget=12000',
    '--ignore-certificate-errors',
    '--no-sandbox',
    '--disable-gpu',
    '--disable-dev-shm-usage',
    '--user-data-dir=' + prof,
    LIST_URL
  ], { encoding: 'utf8', timeout: 120000, maxBuffer: 64 * 1024 * 1024 });
  try { fs.rmSync(prof, { recursive: true, force: true }); } catch (e) {}
  if (r.status !== 0 || !r.stdout) {
    throw new Error('Chrome dump 失败: ' + (r.stderr || r.error || '').toString().slice(0, 300));
  }
  return r.stdout;
}

function extractInitialData(html) {
  const i = html.indexOf('__INITIAL_DATA__');
  if (i < 0) throw new Error('未找到 __INITIAL_DATA__');
  const b = html.indexOf('{', i);
  if (b < 0) throw new Error('__INITIAL_DATA__ 后无 JSON');
  // 用花括号配平提取顶层 JSON 对象，避免尾部 "window.prefix=...;undefined" 干扰
  const obj = extractBalanced(html, b);
  if (!obj) throw new Error('__INITIAL_DATA__ JSON 未闭合');
  // 该对象是 JS 字面量，个别字段可能为裸 undefined，转成 null 再 JSON.parse
  const safe = obj.replace(/([:,[])\s*undefined(?=\s*[,}\]])/g, '$1null');
  return JSON.parse(safe);
}

function extractBalanced(str, start) {
  let depth = 0, inStr = false, esc = false;
  for (let i = start; i < str.length; i++) {
    const ch = str[i];
    if (inStr) {
      if (esc) esc = false;
      else if (ch === '\\') esc = true;
      else if (ch === '"') inStr = false;
      continue;
    }
    if (ch === '"') { inStr = true; continue; }
    if (ch === '{') depth++;
    else if (ch === '}') { depth--; if (depth === 0) return str.substring(start, i + 1); }
  }
  return null;
}

async function fetchAll() {
  const html = dumpDom();
  const data = extractInitialData(html);
  const list = (data.listData && data.listData.listDetailData) || [];
  const jobs = list.map(d => {
    const name = String(d.name || '');
    // name 形如 "北京-智能体算法工程师(J101017)"，去掉开头的 "城市-" 前缀
    const title = name.replace(/^[^-]+-/, '');
    return {
      title,
      dept: String(d.orgName || '-'),
      city: String(d.workPlace || '-'),
      date: String(d.publishDate || '').slice(0, 10) || '-',
      url: d.jobId ? ('https://talent.baidu.com/jobs/detail/GRADUATE/' + d.jobId) : '',
      desc: String(d.workContent || ''),
      commitment: '全职',
      id: String(d.postId || d.jobId || '')
    };
  });
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
