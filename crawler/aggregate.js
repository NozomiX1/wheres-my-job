// 汇总：读「基线 CSV + 判定结果 out/judge/partial/<key>_*.json + 召回 out/<key>_recall.json」
// 对已判定的公司：用 flash 判定结果（fit=true）重建该公司所有行；未判定的公司：保留基线行。
// 用法：node aggregate.js
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const CSV = path.join(ROOT, '2026秋招_LLM_Agent岗位总表.csv');
const HTML = path.join(ROOT, '2026秋招_LLM_Agent岗位筛选.html');
const OUT_DIR = path.join(__dirname, 'out');
const JUDGE_DIR = path.join(OUT_DIR, 'judge', 'partial');

function parseCSV(text) {
  text = text.replace(/^\uFEFF/, '');
  const rows = []; let row = [], f = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) { if (c === '"') { if (text[i + 1] === '"') { f += '"'; i++; } else q = false; } else f += c; }
    else { if (c === '"') q = true; else if (c === ',') { row.push(f); f = ''; } else if (c === '\n') { row.push(f); rows.push(row); row = []; f = ''; } else if (c !== '\r') f += c; }
  }
  if (f.length || row.length) { row.push(f); rows.push(row); }
  return rows;
}
function esc(x) { x = String(x === undefined || x === null ? '' : x); if (/[",\n]/.test(x)) x = '"' + x.replace(/"/g, '""') + '"'; return x; }
function dateVal(r) { return r.date && r.date !== '-' ? +String(r.date).replace(/-/g, '') : 0; }

const header = ['公司', '类型', '岗位', '部门', '城市', '批次', '发布时间', '投递链接'];
let rows = [];
if (fs.existsSync(CSV)) {
  const parsed = parseCSV(fs.readFileSync(CSV, 'utf8'));
  rows = parsed.slice(1).filter(r => r.length >= 8 && r[2]).map(r => ({ company: r[0], type: r[1], title: r[2], dept: r[3], city: r[4], batch: r[5], date: r[6], url: r[7] }));
}

const registry = JSON.parse(fs.readFileSync(path.join(__dirname, 'sites.json'), 'utf8')).sites;
const keyToCompany = {}, keyToBatch = {};
for (const s of registry) { keyToCompany[s.key] = s.company; keyToBatch[s.key] = s.batch || ''; }

const CACHE_DIR = path.join(OUT_DIR, 'judge_cache');

// 已判定过的公司 = 有缓存 或 有判定批次
const judgedKeys = new Set();
if (fs.existsSync(CACHE_DIR)) for (const f of fs.readdirSync(CACHE_DIR)) if (f.endsWith('.json')) judgedKeys.add(f.replace(/\.json$/, ''));
for (const f of fs.readdirSync(JUDGE_DIR)) if (f.endsWith('.json')) judgedKeys.add(f.replace(/_\d+\.json$/, ''));

const refreshed = [];
for (const key of judgedKeys) {
  const company = keyToCompany[key];
  if (!company) continue;

  const recallFile = path.join(OUT_DIR, key + '_recall.json');
  if (!fs.existsSync(recallFile)) continue;
  let recall = [];
  try { recall = JSON.parse(fs.readFileSync(recallFile, 'utf8')); } catch (e) { continue; }

  // 合并「缓存 + 本次判定批次」，本次判定覆盖缓存
  const verdict = {};
  const cacheFile = path.join(CACHE_DIR, key + '.json');
  if (fs.existsSync(cacheFile)) { try { Object.assign(verdict, JSON.parse(fs.readFileSync(cacheFile, 'utf8'))); } catch (e) {} }
  for (const pf of fs.readdirSync(JUDGE_DIR).filter(x => x.startsWith(key + '_') && x.endsWith('.json'))) {
    let arr;
    try { arr = JSON.parse(fs.readFileSync(path.join(JUDGE_DIR, pf), 'utf8')); } catch (e) { continue; }
    if (!Array.isArray(arr)) continue;
    for (const v of arr) if (v && v.id !== undefined) verdict[String(v.id)] = { fit: !!v.fit, type: v.type, reason: v.reason };
  }

  // 按当前召回顺序回填，只留 fit=true
  const kept = [];
  for (const j of recall) {
    const v = verdict[String(j.id)];
    if (!v || v.fit !== true) continue;
    kept.push({ company, type: v.type === '应用' ? '应用' : '算法', title: j.title, dept: j.dept || '-', city: j.city || '-', batch: keyToBatch[key] || '', date: j.date || '-', url: j.url || '' });
  }

  refreshed.push(company);
  rows = rows.filter(r => r.company !== company);
  rows.push(...kept);
}
// 去重（同一公司多个批次文件只算一次）
const refreshedSet = [];
for (const c of refreshed) if (!refreshedSet.includes(c)) refreshedSet.push(c);

// 排序：公司 → 应用优先 → 发布时间新→旧
rows.sort((a, b) => {
  if (a.company !== b.company) return String(a.company).localeCompare(String(b.company), 'zh');
  const ca = /应用|产品|Agent|评测|部署|数据/.test(a.type) ? 0 : 1, cb = /应用|产品|Agent|评测|部署|数据/.test(b.type) ? 0 : 1;
  if (ca !== cb) return ca - cb;
  return dateVal(b) - dateVal(a);
});

const csv = '\uFEFF' + header.map(esc).join(',') + '\r\n'
  + rows.map(r => [r.company, r.type, r.title, r.dept, r.city, r.batch, r.date, r.url].map(esc).join(',')).join('\r\n') + '\r\n';
fs.writeFileSync(CSV, csv, 'utf8');

spawnSync(process.execPath, [path.join(__dirname, 'build_html.js'), CSV, HTML], { stdio: 'inherit' });
console.log('汇总完成：共 ' + rows.length + ' 行（本次判定刷新：' + (refreshedSet.length ? refreshedSet.join('/') : '无') + '）');
