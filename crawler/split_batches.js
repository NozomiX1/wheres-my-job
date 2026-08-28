// 把 out/<key>_recall.json 切成 out/batches/<key>_NNN.json（每批 BATCH 条），供 flash 判定子代理按批读取。
// 增量：默认跳过「缓存中 hash 未变」的岗位（只切需要重判的）；--full 强制全量重切。
// 用法：node split_batches.js <siteKey> [batchSize] [--full]
const fs = require('fs');
const path = require('path');
const KEY = process.argv[2];
const SIZE = parseInt(process.argv[3] || '20', 10);
const FULL = process.argv.includes('--full');
if (!KEY) { console.log('用法: node split_batches.js <siteKey> [batchSize] [--full]'); process.exit(1); }

// 窄过滤优先：存在 out/<key>_narrow.json 时用窄集切批，否则回退全量召回
let src = path.join(__dirname, 'out', KEY + '_narrow.json');
if (!fs.existsSync(src)) src = path.join(__dirname, 'out', KEY + '_recall.json');
if (!fs.existsSync(src)) { console.log('无召回文件，先 node recall.js ' + KEY); process.exit(1); }
const dir = path.join(__dirname, 'out', 'batches');
fs.mkdirSync(dir, { recursive: true });

// 清除旧批次 + 旧判定批次（本次会重新生成；缓存不受影响，aggregate 读缓存兜底）
// 注意：narrow 生成的 partial/<key>_narrow.json（fit=false）要保留，供 write_cache 覆盖旧缓存
for (const old of fs.readdirSync(dir)) if (old.startsWith(KEY + '_') && old.endsWith('.json')) fs.unlinkSync(path.join(dir, old));
const partialDir = path.join(__dirname, 'out', 'judge', 'partial');
if (fs.existsSync(partialDir)) {
  for (const old of fs.readdirSync(partialDir)) {
    if (old.startsWith(KEY + '_') && old.endsWith('.json') && !old.endsWith('_narrow.json')) fs.unlinkSync(path.join(partialDir, old));
  }
}

let jobs = JSON.parse(fs.readFileSync(src, 'utf8'));

if (!FULL) {
  const cacheFile = path.join(__dirname, 'out', 'judge_cache', KEY + '.json');
  if (fs.existsSync(cacheFile)) {
    let cache = {};
    try { cache = JSON.parse(fs.readFileSync(cacheFile, 'utf8')); } catch (e) {}
    let skipped = 0;
    jobs = jobs.filter(j => {
      const c = cache[String(j.id)];
      if (c && c.hash === j.hash) { skipped++; return false; }
      return true;
    });
    console.log('增量：跳过已判定 ' + skipped + ' 条，待判定 ' + jobs.length + ' 条');
  }
}

let n = 0;
for (let i = 0; i < jobs.length; i += SIZE) {
  const name = KEY + '_' + String(n).padStart(3, '0') + '.json';
  fs.writeFileSync(path.join(dir, name), JSON.stringify(jobs.slice(i, i + SIZE)), 'utf8');
  n++;
}
console.log('切成 ' + n + ' 批（每批 ≤' + SIZE + ' 条）');
