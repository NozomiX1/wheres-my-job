'use strict';
// 本机兜底采集用：统计各来源岗位数，并对比采集前后。
//   node deploy/data-summary.js count <数据目录> > counts.json
//   node deploy/data-summary.js compare <前.json> <后.json> <来源key>...   打印指定来源与总数的变化；总数少于采集前一半时退出码 1
const fs = require('node:fs');
const path = require('node:path');
const { readPublished } = require('../crawler/publish');

const [mode, ...args] = process.argv.slice(2);
if (mode === 'count') {
  const counts = {};
  for (const job of readPublished(path.join(args[0], 'catalog.js')).jobs) counts[job.sourceKey] = (counts[job.sourceKey] || 0) + 1;
  console.log(JSON.stringify(counts));
} else if (mode === 'compare') {
  const [beforeFile, afterFile, ...keys] = args, before = JSON.parse(fs.readFileSync(beforeFile, 'utf8')), after = JSON.parse(fs.readFileSync(afterFile, 'utf8'));
  const sum = counts => Object.values(counts).reduce((a, b) => a + b, 0), delta = (a, b) => (b - a >= 0 ? '+' : '') + (b - a);
  for (const key of keys) console.log('  ' + key.padEnd(22) + (before[key] ?? 0) + ' → ' + (after[key] ?? 0) + '  (' + delta(before[key] ?? 0, after[key] ?? 0) + ')');
  console.log('  ' + '全部'.padEnd(20) + sum(before) + ' → ' + sum(after) + '  (' + delta(sum(before), sum(after)) + ')');
  if (sum(after) < sum(before) * 0.5) { console.error('采集后的岗位总数少于采集前的一半，拒绝上传'); process.exitCode = 1; }
} else { console.error('用法：data-summary.js count <目录> | compare <前.json> <后.json> <key>...'); process.exitCode = 2; }
