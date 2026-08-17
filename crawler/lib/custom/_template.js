// ============================================================
// custom 站点模块契约（复制此文件改成 <key>.js）
//
// 职责：拉取该站「校招全职」全量岗位 → 归一化成统一结构 → 写入 out/<key>_raw.json
// 硬排除（实习/社招/精英）与 LLM/Agent 判定在 recall.js + flash 阶段做，模块只负责「抓 + 归一化」。
//
// 归一化后的每个岗位对象必须是：
//   { title, dept, city, date, url, desc, commitment, id }
//   title      : 岗位名（字符串）
//   dept       : 部门/事业群（字符串，无则 '-'）
//   city       : 城市（多城用 '/' 连接，如 "北京/上海"）
//   date       : 发布时间 'YYYY-MM-DD'（无则 '-'）
//   url        : 岗位详情/投递链接（无则 ''）
//   desc       : 岗位描述原文（用于 flash 判定读岗，无则 ''）
//   commitment : '全职' / '实习' / '社招' 等（供 isIntern/isSocial 判断）
//   id         : 岗位唯一 id（字符串，可选）
//
// 运行方式：node lib/custom/<key>.js   → 写 out/<key>_raw.json 并打印 "raw=N"
// ============================================================
const fs = require('fs');
const path = require('path');

const COMPANY = '公司名';
const KEY = 'sitekey';

async function fetchAll() {
  // TODO: 用 node fetch 拉全量（含翻页），返回归一化后的岗位数组
  // 提示：接口 URL/请求体/字段名见 sites.json（api/body 字段）；未知站先用 lib/cdp_capture.js 抓包定位接口
  const jobs = [];
  // ... 翻页抓取 + 归一化 push({ title, dept, city, date, url, desc, commitment, id })
  return jobs;
}

module.exports = { fetchAll, COMPANY, KEY };

if (require.main === module) {
  fetchAll().then(jobs => {
    const raw = path.join(__dirname, '..', '..', 'out', KEY + '_raw.json');
    fs.writeFileSync(raw, JSON.stringify(jobs, null, 2), 'utf8');
    console.log('raw=' + jobs.length);
  }).catch(e => { console.error('ERR ' + e.message); process.exit(1); });
}
