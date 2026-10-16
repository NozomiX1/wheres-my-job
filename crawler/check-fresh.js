'use strict';
// 列出超过 N 小时（默认 72）没有成功更新的来源；有则退出码 1。用法：node crawler/check-fresh.js [小时] [catalog.js 路径]
// 下午补采用：node crawler/check-fresh.js --retry <小时> [catalog.js 路径] 只打印该补采的来源 key（空格分隔），退出码恒为 0。
const path = require('node:path');
const { readPublished, REFUSED_MARK } = require('./publish');

function stale(sources, hours, now = Date.now()) {
  return sources.filter(s => !s.lastSuccess || now - Date.parse(s.lastSuccess) > hours * 3600000).map(s => s.key);
}

// 该补采的来源：过时、且最后一次失败不是官网拒绝（拒绝当天不重试，publish 会在 message 前加“官网拒绝；”）。
function retryable(sources, hours, now = Date.now()) {
  const late = new Set(stale(sources, hours, now));
  return sources.filter(s => late.has(s.key) && !String(s.message).startsWith(REFUSED_MARK)).map(s => s.key);
}

module.exports = { stale, retryable };
if (require.main === module && process.argv[2] === '--retry') {
  console.log(retryable(readPublished(process.argv[4] || path.join(__dirname, '..', 'data', 'catalog.js')).sources, Number(process.argv[3]) || 18).join(' '));
} else if (require.main === module) {
  const hours = Number(process.argv[2]) || 72, file = process.argv[3] || path.join(__dirname, '..', 'data', 'catalog.js');
  const old = stale(readPublished(file).sources, hours);
  console.log(old.length ? '超过 ' + hours + ' 小时没有成功更新的来源：' + old.join(', ') : '所有来源都在 ' + hours + ' 小时内更新过');
  process.exitCode = old.length ? 1 : 0;
}
