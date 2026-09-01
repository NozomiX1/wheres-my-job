// 快手校招：POST https://campus.kuaishou.cn/recruit/campus/e/api/v1/open/positions/simple
// recruitSubProjectCodes=["20271779425607"]（2027应届生）。该子项目下均为全职（positionNatureCode=fulltime）。
// 「快Star」精英计划岗位由 crawl.js 统一按 exclude 规则排除，模块只做抓取+归一化。
// 职类：item.positionCategoryCode（J1001-J1036 子类 / algorithm 等大类），
// 字典 GET /api/v1/dictionary/batch?types=positionCategory（含 children 子类表），映射见 CATEGORY。
const fs = require('fs');
const path = require('path');

const COMPANY = '快手';
const KEY = 'kuaishou';

const SIMPLE = 'https://campus.kuaishou.cn/recruit/campus/e/api/v1/open/positions/simple';
const DICT = 'https://campus.kuaishou.cn/recruit/campus/e/api/v1/dictionary/batch?types=positionCategory';
const SUB = '20271779425607';
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

const sleep = ms => new Promise(r => setTimeout(r, ms));

// 职类字典（静态兜底；运行时优先拉接口，失败用这份）
const CATEGORY_FALLBACK = {
  algorithm: '算法类', engeering: '工程类', tech: '技术类', design: '设计类',
  PM: '项目管理类', sales: '销售类', production: '产品类', operation: '运营类',
  marketing: '市场类', function: '职能类', strategysupport: '战略支持类',
  analysis: '战略分析类', gamePlanning: '游戏类', other: '其他',
  J1001: '机器学习', J1002: '数据科学', J1003: '自然语言处理', J1004: '搜索', J1005: '推荐',
  J1006: '广告', J1007: '计算机视觉', J1008: '计算机图形学', J1009: '视频增强和处理',
  J1010: '音频处理', J1011: '视频编解码', J1012: '网络传输', J1013: '系统架构',
  J1014: '服务端', J1015: '前端', J1016: '客户端', J1017: '测试测开', J1018: '数据研发',
  J1019: '安全', J1020: '系统架构', J1021: '策略产品', J1022: '用户产品C端',
  J1023: '海外产品', J1024: '平台产品B端', J1025: '数据产品', J1026: '产品运营',
  J1027: '客户运营', J1028: '用户运营', J1029: '内容运营', J1030: '策略运营',
  J1031: '渠道运营', J1032: '行业运营', J1033: '社区安全运营', J1034: '内容质量运营',
  J1035: '海外运营', J1036: '业务运营',
};

async function getCategoryMap() {
  try {
    const r = await fetch(DICT, { headers: { 'User-Agent': UA, 'Referer': 'https://campus.kuaishou.cn/' } });
    const j = await r.json();
    const cats = (j.result || j.data || {}).positionCategory || [];
    const map = {};
    for (const c of cats) {
      if (c.code) map[c.code] = c.name;
      for (const ch of (c.children || [])) if (ch.code) map[ch.code] = ch.name;
    }
    return Object.keys(map).length ? map : CATEGORY_FALLBACK;
  } catch (e) { return CATEGORY_FALLBACK; }
}

async function pullPage(pageNum, pageSize) {
  const res = await fetch(SIMPLE, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': UA,
      'Origin': 'https://campus.kuaishou.cn',
      'Referer': 'https://campus.kuaishou.cn/recruit/campus/e/',
      'Accept': 'application/json, text/plain, */*'
    },
    body: JSON.stringify({ recruitSubProjectCodes: [SUB], pageSize, pageNum })
  });
  const j = await res.json();
  if (!j.result) {
    throw new Error('快手接口异常: ' + JSON.stringify(j).slice(0, 200));
  }
  return { total: j.result.total || 0, list: j.result.list || [] };
}

async function fetchAll() {
  const catMap = await getCategoryMap();
  const jobs = [];
  let pageNum = 1, total = 0;
  const pageSize = 100;
  while (true) {
    const { total: t, list } = await pullPage(pageNum, pageSize);
    if (!total) total = t;
    for (const x of list) {
      jobs.push({
        title: String(x.name || '').trim(),
        dept: String(x.departmentName || '-').trim() || '-',
        category: catMap[x.positionCategoryCode] || String(x.positionCategoryCode || ''),
        city: Array.isArray(x.workLocationDicts) ? x.workLocationDicts.map(c => c && c.name).filter(Boolean).join('/') : '-',
        date: String(x.releaseTime || '').slice(0, 10) || '-',
        url: 'https://campus.kuaishou.cn/recruit/campus/e/#/campus/job-info/' + x.id,
        desc: [x.description, x.positionDemand].filter(Boolean).join('\n'),
        commitment: '全职',
        id: String(x.code)
      });
    }
    if (jobs.length >= total) break;
    pageNum++;
    await sleep(150);
  }
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
