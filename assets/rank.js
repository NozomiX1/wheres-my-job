'use strict';
// 打分、排序与招聘单位归属：浏览器和服务端共用，只此一份。
// 浏览器：全局 ANDE_RANK(data) 返回函数集合；Node：require('./rank.js')(data)。data 是目录（含 unitMemberships）。
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory;
  else root.ANDE_RANK = factory;
})(typeof globalThis !== 'undefined' ? globalThis : this, function createRank(DATA) {
  // Display units only: keep source identity, raw company and all job facts untouched.
  const ALIBABA_UNITS = ['阿里巴巴控股'];
  const UNIT_ALIASES = { '阿里巴巴控股集团': '阿里巴巴控股', '阿里国际数字商业集团': '阿里国际' };
  function unitNames(item) {
    const key = item.sourceKey || item.key;
    if (key === 'alibaba') {
      const names = item.unitCounts ? Object.keys(item.unitCounts) : item.id ? DATA.unitMemberships?.[item.id] : null;
      if (names?.length) return [...new Set(names.map(name => UNIT_ALIASES[name] || name))];
    }
    if (item.company !== '阿里巴巴') return [item.company];
    return [key === 'alibaba_social' ? ALIBABA_UNITS[0] : key === 'alibaba' ? '阿里校园招聘入口' : item.company];
  }
  const unitName = item => unitNames(item).join(' / ');

  // 服务端可预先把三段小写文本放进 job.__lc，避免每次查询重复转换。
  const matchFields = job => job.__lc || [job.title || '', job.duty || job.description || '', job.requirements || ''].map(text => text.toLowerCase());
  // Display actual literal occurrences only when rendering; scoring still counts each field once.
  function hitText(job, word) {
    const term = word.toLowerCase();
    const count = matchFields(job).reduce((total, field) => total + (term ? field.split(term).length - 1 : 0), 0);
    return word + (count > 1 ? ' × ' + count : '');
  }
  function score(job, query) {
    const fields = matchFields(job);
    // Downranking temporarily mirrors positive weights for this demo; final strength is not settled.
    // Integer hundredths keep equal contributions exactly cancelled, including tie ordering.
    const hits = words => words.map(word => ({ word, points: fields.reduce((sum, field, i) => sum + (field.includes(word.toLowerCase()) ? [300, 100, 35][i] : 0), 0) })).filter(hit => hit.points);
    const positiveHits = hits(query.words || []), negativeHits = hits(query.lowered || []);
    const sum = hits => hits.reduce((total, hit) => total + hit.points, 0);
    const positive = sum(positiveHits), penalty = sum(negativeHits);
    return { job, value: (positive - penalty) / 100, positive: positive / 100, penalty: penalty / 100, matched: positiveHits.map(hit => hit.word), downranked: negativeHits.map(hit => hit.word) };
  }
  // Unknown dimensions stay in the relevant scopes; scopes are not exclusive categories.
  function matchesRecruitment(job, type) {
    if (type === 'all') return true;
    if (type === 'campus' || type === 'social') return !job.channels?.length || job.channels.includes(type);
    if (type === 'internship') return job.employment == null || job.employment === 'internship';
    if (type === 'talent') return job.talentPlan !== false;
    return false;
  }
  function reliableDate(job) {
    const d = job.date;
    return ['published', 'updated'].includes(job.dateKind) && /^\d{4}-\d{2}-\d{2}$/.test(d || '') && !Number.isNaN(Date.parse(d)) && new Date(d).toISOString().slice(0, 10) === d ? d : '';
  }
  // 分数 → 可靠日期 → 单位名 → ID，ID 兜底使到达顺序无关。
  // 服务端可预先把可靠日期和单位名放进 job.__date / job.__unit，排序时不再重复解析。
  const collator = new Intl.Collator('zh'), dateOf = job => job.__date ?? reliableDate(job), unitOf = job => job.__unit ?? unitName(job);
  const compare = (a, b) => b.value - a.value || dateOf(b.job).localeCompare(dateOf(a.job)) || collator.compare(unitOf(a.job), unitOf(b.job)) || a.job.id.localeCompare(b.job.id);
  const selects = (job, selected) => !selected.size || unitNames(job).some(name => selected.has(name));

  return { ALIBABA_UNITS, UNIT_ALIASES, unitNames, unitName, matchFields, hitText, score, matchesRecruitment, reliableDate, compare, selects };
});
