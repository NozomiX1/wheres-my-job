'use strict';
// 单轮分页的通用循环（自研门户适配器共用）。
// fetchPage(n) → { rows, total?, done? }：取第 n 页的原始行；total 是官网声明的总数，done 表示已到末页。
// 列表任何一页出错（重试之后仍出错）或触顶都直接抛错：列表没取全就整次失败，不发布部分结果。
// 坏记录（缺ID/标题）和 total 不符只记入 issues，不算失败。
async function paginate(fetchPage, { maxPages = 400, idOf, usable = () => true, issues = [], rows = new Map(), label = '' }) {
  let total = null, skipped = 0, pages = 0, ended = false;
  for (let n = 1; n <= maxPages && !ended; n++) {
    const page = await fetchPage(n);
    pages++;
    if (Number.isSafeInteger(page.total) && page.total > 0) total = page.total; // 终点页常返回 0，不是官方 total
    for (const row of page.rows) { if (usable(row)) rows.set(idOf(row), row); else skipped++; }
    ended = Boolean(page.done) || !page.rows.length || total !== null && rows.size + skipped >= total;
  }
  if (!ended) throw new Error(label + 'pagination limit reached');
  if (skipped) issues.push(label + '列表中 ' + skipped + ' 条缺ID/标题，未收录');
  if (total !== null && total !== rows.size) issues.push(label + '官方total ' + total + '；实际唯一岗位 ' + rows.size);
  return { rows, total, pages };
}

module.exports = { paginate };
