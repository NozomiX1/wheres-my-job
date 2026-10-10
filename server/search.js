'use strict';
// 快速检索：按词缓存“哪些岗位的哪几段文本含该词”（每词一个 Uint8Array），一次查询只做整数累加与排序。
// 打分、排序规则与 assets/rank.js 的 collect 完全一致（tests/server.test.cjs 对照），只是不再逐岗逐词做子串查找。
const WEIGHTS = [300, 100, 35]; // 标题、职责、要求，单位为百分之一分，须与 rank.js 一致
const POINTS = Array.from({ length: 8 }, (_, mask) => WEIGHTS.reduce((sum, w, bit) => sum + (mask & (1 << bit) ? w : 0), 0));

function createIndex(jobs, rank, { maxTerms = 1500 } = {}) {
  const n = jobs.length, cache = new Map(); // 词（小写）→ 每个岗位的命中位（1 标题｜2 职责｜4 要求）；Map 顺序即最近使用顺序
  // 同分时的次序（可靠日期降序 → 单位名 → ID）只依赖岗位本身，加载时一次排好，查询时直接比名次。
  const tie = new Int32Array(n);
  jobs.map((_, i) => i).sort((a, b) => rank.compare({ job: jobs[a], value: 0 }, { job: jobs[b], value: 0 })).forEach((i, place) => { tie[i] = place; });

  function masks(term) {
    let m = cache.get(term);
    if (m) { cache.delete(term); cache.set(term, m); return m; }
    m = new Uint8Array(n);
    for (let i = 0; i < n; i++) { const f = jobs[i].__lc; m[i] = (f[0].includes(term) ? 1 : 0) | (f[1].includes(term) ? 2 : 0) | (f[2].includes(term) ? 4 : 0); }
    cache.set(term, m);
    if (cache.size > maxTerms) cache.delete(cache.keys().next().value);
    return m;
  }

  // 返回 { total, matched, penalized, rows:[{job,value,matched,downranked}] }（rows 只含请求的一页）
  function query({ words = [], lowered = [], selected = new Set(), recruitment = 'all', offset = 0, limit = 50 }) {
    const idx = [];
    for (let i = 0; i < n; i++) if (rank.selects(jobs[i], selected) && rank.matchesRecruitment(jobs[i], recruitment)) idx.push(i);
    const pos = new Int32Array(n), neg = new Int32Array(n), wm = words.map(w => masks(w.toLowerCase())), lm = lowered.map(w => masks(w.toLowerCase()));
    for (const m of wm) for (const i of idx) pos[i] += POINTS[m[i]];
    for (const m of lm) for (const i of idx) neg[i] += POINTS[m[i]];
    let matched = 0, penalized = 0;
    for (const i of idx) { if (pos[i]) matched++; if (neg[i]) penalized++; }
    idx.sort((a, b) => (pos[b] - neg[b]) - (pos[a] - neg[a]) || tie[a] - tie[b]);
    const rows = idx.slice(offset, offset + limit).map(i => ({
      job: jobs[i], value: (pos[i] - neg[i]) / 100,
      matched: words.filter((_, k) => wm[k][i]), downranked: lowered.filter((_, k) => lm[k][i])
    }));
    return { total: idx.length, matched, penalized, rows };
  }

  // 预先算好一批常用词（分批让出事件循环，不阻塞正在处理的请求）。
  async function warm(terms) {
    let k = 0;
    for (const term of new Set(terms.map(t => t.toLowerCase()))) { masks(term); if (++k % 8 === 0) await new Promise(resolve => setImmediate(resolve)); }
  }
  return { query, warm, size: () => cache.size };
}

module.exports = { createIndex };
