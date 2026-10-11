'use strict';
// 列出超过 N 小时（默认 72）没有成功更新的来源；有则退出码 1。用法：node crawler/check-fresh.js [小时] [catalog.js 路径]
const path = require('node:path');
const { readPublished } = require('./publish');

function stale(sources, hours, now = Date.now()) {
  return sources.filter(s => !s.lastSuccess || now - Date.parse(s.lastSuccess) > hours * 3600000).map(s => s.key);
}

module.exports = { stale };
if (require.main === module) {
  const hours = Number(process.argv[2]) || 72, file = process.argv[3] || path.join(__dirname, '..', 'data', 'catalog.js');
  const old = stale(readPublished(file).sources, hours);
  console.log(old.length ? '超过 ' + hours + ' 小时没有成功更新的来源：' + old.join(', ') : '所有来源都在 ' + hours + ' 小时内更新过');
  process.exitCode = old.length ? 1 : 0;
}
