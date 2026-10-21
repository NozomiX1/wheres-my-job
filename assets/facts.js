'use strict';
// 岗位类型与从 JD 提取的要点（浏览器、服务端共用，只此一份）。
// recruitKind：每个岗位只落到一类（intern 实习 / campus 校招 / social 社招 / null 无法判断，只出现在「全部」）。
// jobFacts：卡片上展示的要点，宁缺毋滥——写法含糊、同一岗位有多种说法时不显示。
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.ANDE_FACTS = factory();
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  const DIGITS = { 一: 1, 二: 2, 两: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9, 十: 10 };
  const num = s => /^\d+$/.test(s) ? Number(s) : s === '十' ? 10 : s.length === 2 && s[0] === '十' ? 10 + DIGITS[s[1]] : s.length === 2 && s[1] === '十' ? DIGITS[s[0]] * 10 : DIGITS[s];
  const N = '[0-9一二三四五六七八九十两]{1,3}';

  // ---- 类型 ----
  const INTERN_TITLE = /实习|\bintern(?:s|ship)?\b/i;
  const MIXED_TITLE = /全职|FTE|社招|[/／]\s*(?:校招|应届)|(?:校招|应届)\s*[/／]/i; // 「实习/全职」「【校招/实习】」这类同时写了几种，不按标题判
  const GRAD_TOKEN = /(?:20)?\d{2}\s*届/;
  const EXP_PATTERN = new RegExp('(?<![近前过去最近内约])(' + N + ')\\s*(?:[-–~至到]\\s*(' + N + '))?\\s*年(?:及)?(?:以上|\\+|[^，,。；;\\n\\s]{0,6}?(?:经验|经历))|(?:至少|不少于|不低于)\\s*(' + N + ')\\s*年|(\\d+)\\s*\\+?\\s*years?', 'gi');
  const body = job => (job.requirements || '') + '\n' + (job.description || '') + '\n' + (job.duty || '');

  // 证据由强到弱：官网明确给的（性质、渠道）→ 标题里的实习/届 → 渠道未知时才看 JD（有「XX届」→ 校招，有年限要求 → 社招）。
  function recruitKind(job) {
    const title = job.title || '', channels = job.channels || [];
    if (job.employment === 'internship') return 'intern';
    if (INTERN_TITLE.test(title) && !MIXED_TITLE.test(title)) return 'intern';
    if (GRAD_TOKEN.test(title)) return 'campus';
    if (channels.includes('campus') && !channels.includes('social')) return 'campus';
    if (channels.includes('social') && !channels.includes('campus')) return 'social';
    const text = body(job);
    if (GRAD_TOKEN.test(text)) return 'campus';
    if (experience(job.requirements || text)) return 'social';
    return null;
  }

  // ---- 要点 ----
  function experience(text) {
    if (/经验不限|不限经验/.test(text)) return '经验不限';
    let best = null; // 同一岗位写了几条年限时取下限最高的（各条都要满足）
    for (const m of text.matchAll(EXP_PATTERN)) {
      const lo = m[4] ? Number(m[4]) : num(m[1] ?? m[3]), hi = m[2] ? num(m[2]) : null;
      if (!Number.isFinite(lo) || lo < 0 || lo > 20 || hi != null && (!Number.isFinite(hi) || hi <= lo || hi > 30)) continue;
      if (/优先|加分|更佳|尤佳/.test(text.slice(m.index + m[0].length).split(/[，,。；;\n]/)[0].slice(0, 40))) continue; // 「1年以上…经验优先」是软要求
      if (!best || lo > best.lo) best = { lo, hi };
    }
    return best ? (best.hi ? best.lo + '-' + best.hi + '年' : best.lo + '年以上') : '';
  }
  const LEVEL = { 大专: 1, 专科: 1, 本科: 2, 硕士: 3, 研究生: 3, 博士: 4 };
  function degree(text) {
    const found = [];
    for (const m of text.matchAll(/(博士|硕士|研究生|本科|大专|专科)(?:研究生)?(及以上|以上|或以上)?(学历|学位)?(及以上|以上)?/g)) {
      const before = text.slice(Math.max(0, m.index - 8), m.index), after = text.slice(m.index + m[0].length, m.index + m[0].length + 4);
      if (/^[\s，,、]?(?:优先|加分|更佳|尤佳|者优先)/.test(after)) continue; // 「硕士优先」不是要求
      if (!m[2] && !m[3] && !m[4] && !/(学历|学位)[:：]?\s*$/.test(before)) continue; // 只有「本科」两个字、没有以上/学历字样的不算
      found.push({ level: LEVEL[m[1]], name: m[1] === '研究生' ? '硕士' : m[1] === '专科' ? '大专' : m[1], up: Boolean(m[2] || m[4]) });
    }
    if (!found.length) return '';
    const lowest = found.reduce((x, y) => y.level < x.level ? y : x);
    return lowest.name + (lowest.up ? '及以上' : '');
  }
  function graduation(job) {
    const text = (job.title || '') + '\n' + body(job), years = new Set();
    for (const m of text.matchAll(/(?:20)?(\d{2})\s*[-~—至到、/]\s*(?:20)?(\d{2})\s*届/g)) for (let y = Number(m[1]); y <= Number(m[2]) && y - m[1] < 6; y++) years.add(y);
    for (const m of text.matchAll(/(?:20)?(\d{2})\s*届/g)) years.add(Number(m[1]));
    const list = [...years].filter(y => y >= 20 && y <= 40).sort((a, b) => a - b);
    return !list.length || list.length > 4 ? '' : list.length === 1 ? list[0] + '届' : list[0] + '-' + list.at(-1) + '届';
  }
  function internMonths(text) {
    let max = 0; // 几处都写了最短时长时取最长的
    for (const m of text.matchAll(/(?:实习|到岗)[^。\n；;]{0,10}?(?:至少|不少于|不低于|不短于|≥)\s*(\d{1,2})\s*个月|(\d{1,2})\s*个月(?:及)?以上/g)) { const n = Number(m[1] ?? m[2]); if (n >= 1 && n <= 12) max = Math.max(max, n); }
    return max ? '至少' + max + '个月' : '';
  }

  // 展示顺序：届别 / 经验 → 学历 → 实习时长。
  function jobFacts(job, kind = recruitKind(job)) {
    const text = body(job), out = [];
    if (kind === 'campus' || kind === 'intern') { const g = graduation(job); if (g) out.push(g); }
    if (kind === 'social') { const e = experience(job.requirements || text); if (e) out.push(e); }
    const d = degree(job.requirements || text); if (d) out.push(d);
    if (kind === 'intern') { const m = internMonths(text); if (m) out.push(m); }
    return out;
  }

  return { recruitKind, jobFacts };
});
