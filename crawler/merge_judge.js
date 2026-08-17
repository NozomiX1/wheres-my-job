// 口径放宽时的「只增不减」合并：旧缓存 fit=true 的岗位一律保留，新判定只用来新增（游戏 AI/NPC 等）。
// 规则：final.fit = 旧缓存.fit(true) OR 新判定.fit(true)；type/reason 优先取新判定，否则取旧缓存。
// 用法：node merge_judge.js   （在重新判定之后、write_cache 之前用，避免 flash 随机性误砍已收录岗位）
const fs = require('fs');
const path = require('path');

const OUT = path.join(__dirname, 'out');
const PARTIAL = path.join(OUT, 'judge', 'partial');
const CACHE = path.join(OUT, 'judge_cache');

const keys = new Set();
if (fs.existsSync(CACHE)) for (const f of fs.readdirSync(CACHE)) if (f.endsWith('.json')) keys.add(f.replace(/\.json$/, ''));
for (const f of fs.readdirSync(PARTIAL)) if (f.endsWith('.json')) keys.add(f.replace(/_\d+\.json$/, ''));

for (const key of keys) {
  const cf = path.join(CACHE, key + '.json');
  let old = {};
  if (fs.existsSync(cf)) { try { old = JSON.parse(fs.readFileSync(cf, 'utf8')); } catch (e) {} }

  const fresh = {};
  for (const pf of fs.readdirSync(PARTIAL).filter(x => x.startsWith(key + '_') && x.endsWith('.json'))) {
    let arr;
    try { arr = JSON.parse(fs.readFileSync(path.join(PARTIAL, pf), 'utf8')); } catch (e) { continue; }
    if (!Array.isArray(arr)) continue;
    for (const v of arr) if (v && v.id !== undefined) fresh[String(v.id)] = v;
  }

  const merged = {};
  const allIds = new Set([...Object.keys(old), ...Object.keys(fresh)]);
  for (const id of allIds) {
    const o = old[id] || {};
    const n = fresh[id] || {};
    if (n.fit === true) {
      merged[id] = { hash: o.hash || n.hash || '', fit: true, type: n.type === '应用' ? '应用' : '算法', reason: n.reason || '' };
    } else if (o.fit === true) {
      merged[id] = { hash: o.hash || '', fit: true, type: o.type === '应用' ? '应用' : '算法', reason: o.reason || '' };
    } else {
      merged[id] = { hash: o.hash || '', fit: false, type: '算法', reason: n.reason || o.reason || '' };
    }
  }
  fs.writeFileSync(cf, JSON.stringify(merged, null, 2), 'utf8');
}
console.log('合并完成（只增不减）：' + [...keys].sort().join(', '));
