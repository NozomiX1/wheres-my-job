'use strict';
// 增量采集：crawl.js 把该来源已发布且 JD 完整的官网岗位 ID 写入文件，经 ANDE_KNOWN_IDS 交给适配器；
// 适配器对这些岗位跳过详情请求（列表仍每次完整扫描，所以新增/下架照常识别）。没有该变量（或 --full）就是空集合。
const fs = require('node:fs');
function knownIds() {
  try { return new Set(JSON.parse(fs.readFileSync(process.env.ANDE_KNOWN_IDS, 'utf8')).map(String)); } catch { return new Set(); }
}
module.exports = { knownIds };
