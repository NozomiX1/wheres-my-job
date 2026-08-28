// 把本次判定结果（out/judge/partial/*.json）写入增量缓存 out/judge_cache/<key>.json
// 缓存结构：{ "<id>": { "hash": "<标题|描述哈希>", "fit": true, "type": "应用", "reason": "..." } }
// 用法：node write_cache.js
const fs = require('fs');
const path = require('path');

const OUT = path.join(__dirname, 'out');
const PARTIAL = path.join(OUT, 'judge', 'partial');
const CACHE = path.join(OUT, 'judge_cache');
fs.mkdirSync(CACHE, { recursive: true });

// 读所有召回，建 id → hash（用于增量判断岗位内容是否变化）
const hashById = {};
for (const f of fs.readdirSync(OUT).filter(f => f.endsWith('_recall.json'))) {
  const key = f.replace(/_recall\.json$/, '');
  let arr = [];
  try { arr = JSON.parse(fs.readFileSync(path.join(OUT, f), 'utf8')); } catch (e) {}
  if (!Array.isArray(arr)) continue;
  const m = hashById[key] || (hashById[key] = {});
  for (const j of arr) if (j && j.id !== undefined) m[String(j.id)] = j.hash || '';
}

const keys = new Set();
for (const f of fs.readdirSync(PARTIAL).filter(f => f.endsWith('.json'))) {
  const key = f.replace(/_\d+\.json$/, '').replace(/_narrow\.json$/, '');
  keys.add(key);
  let arr = [];
  try { arr = JSON.parse(fs.readFileSync(path.join(PARTIAL, f), 'utf8')); } catch (e) { continue; }
  if (!Array.isArray(arr)) continue;

  const cacheFile = path.join(CACHE, key + '.json');
  let cache = {};
  if (fs.existsSync(cacheFile)) { try { cache = JSON.parse(fs.readFileSync(cacheFile, 'utf8')); } catch (e) {} }
  for (const v of arr) {
    if (!v || v.id === undefined) continue;
    const id = String(v.id);
    cache[id] = { hash: (hashById[key] && hashById[key][id]) || '', fit: !!v.fit, type: v.type || '算法', reason: v.reason || '' };
  }
  fs.writeFileSync(cacheFile, JSON.stringify(cache, null, 2), 'utf8');
}
console.log('缓存已更新：' + [...keys].sort().join(', '));
