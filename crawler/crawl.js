// 站点爬取调度器（阶段①）：node crawl.js <siteKey>
// 读 sites.json，按 ats 类型调用对应 lib 拉全量岗位，写入 out/<key>_raw.json。
// 筛选/判定不在这里（见 recall.js → flash 判定 → aggregate.js）。
const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const KEY = process.argv[2];
if (!KEY) { console.log('用法: node crawl.js <siteKey>  （key 见 sites.json）'); process.exit(1); }

const registry = JSON.parse(fs.readFileSync(path.join(__dirname, 'sites.json'), 'utf8')).sites;
const site = registry.find(s => s.key === KEY);
if (!site) { console.log('未找到站点 ' + KEY + '，可用 key：' + registry.map(s => s.key).join(', ')); process.exit(1); }

const OUT_DIR = path.join(__dirname, 'out');
fs.mkdirSync(OUT_DIR, { recursive: true });
const rawFile = path.join(OUT_DIR, KEY + '_raw.json');

function runLib(script, args, timeout = 180000) {
  const r = spawnSync('node', [path.join(__dirname, 'lib', script), ...args], { encoding: 'utf8', timeout });
  if (r.stdout) console.log(r.stdout.trim().slice(0, 600));
  if (r.stderr) console.log('[stderr] ' + r.stderr.trim().slice(0, 400));
  return r.status === 0;
}

// ---- 拉原始数据 ----
if (site.ats === 'moka') {
  runLib('moka.js', [site.orgId, String(site.siteId), site.site, site.aesIv || 'de7c21ed8d6f50fe', rawFile]);
} else if (site.ats === 'beisen') {
  runLib('beisen.js', [site.api, (site.category || ['2']).join(','), rawFile]);
} else if (site.ats === 'feishu') {
  const subjects = (site.subjectIdList || []).join(',');
  runLib('feishu.js', [site.url, rawFile.replace(/\.json$/, ''), String(site.aid || 1943), site.websitePath || 'campus', subjects, site.plain ? 'plain' : ''], 600000);
} else if (site.ats === 'custom') {
  const mod = path.join(__dirname, 'lib', 'custom', KEY + '.js');
  if (!fs.existsSync(mod)) { console.log('【custom】模块缺失 ' + mod + '，配方：' + site.api + ' / ' + (site.body || '')); process.exit(0); }
  const r = spawnSync('node', [mod], { encoding: 'utf8', timeout: 300000 });
  if (r.stdout) console.log(r.stdout.trim().slice(0, 500));
  if (r.stderr) console.log('[stderr] ' + r.stderr.trim().slice(0, 500));
} else {
  console.log('未知 ats: ' + site.ats);
  process.exit(0);
}

// ---- 校验 raw（0 条视为失败，保留基线旧数据）----
let raw = null;
if (fs.existsSync(rawFile)) { try { raw = JSON.parse(fs.readFileSync(rawFile, 'utf8')); } catch (e) {} }
if (!raw) { console.log('未拿到数据'); process.exit(1); }
const jobs = Array.isArray(raw) ? raw : (raw.all || raw.list || raw.jobs || []);
if (!jobs.length) { console.log('未拿到数据(0 条，视为失败保留基线)'); process.exit(1); }
console.log('已抓取 ' + jobs.length + ' 条 -> ' + rawFile);
