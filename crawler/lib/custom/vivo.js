// vivo 校招（custom，北森 zhiye 门户，tenantId=612022）
// 站点：hr-campus.vivo.com（社招在 hr.vivo.com，是完全独立的另一套系统，别搞混）。
// 接口：POST https://hr-campus.vivo.com/api/Jobad/GetJobAdPageList（JSON，无需 cookie）
//   {"PageIndex":N,"PageSize":100,"ClassificationOne":["2"],...}
//   ClassificationOne "2" = 秋季校园招聘（其他批次：蓝极星计划=精英项目排除、日常/暑期实习生）。
// 与 beisen.js 的区别：body 用 ClassificationOne（批次）而非 Category 过滤，故独立成 custom 模块。
// 详情是页内抽屉（无独立 URL，点标题/查看详情展开），url 统一指到秋招列表页。
const fs = require('fs');
const path = require('path');

const COMPANY = 'vivo';
const KEY = 'vivo';
const BASE = 'https://hr-campus.vivo.com';
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';
const LIST_URL = BASE + '/jobs?1=%5B%7B%22id%22%3A%222%22%2C%22label%22%3A%22%E7%A7%8B%E5%AD%A3%E6%A0%A1%E5%9B%AD%E6%8B%9B%E8%81%98%22%7D%5D';

async function fetchPage(pageIndex, pageSize) {
  const body = {
    PageIndex: pageIndex, PageSize: pageSize,
    ClassificationOne: ['2'], KeyWords: '', SpecialType: 0, PortalId: '',
    DisplayFields: ['Category', 'LocId', 'HeadCount', 'WorkWeChatQrCode'],
  };
  const r = await fetch(BASE + '/api/Jobad/GetJobAdPageList', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': UA,
      'Origin': BASE,
      'Referer': BASE + '/jobs',
      'Accept': 'application/json, text/plain, */*',
    },
    body: JSON.stringify(body),
  });
  const j = await r.json();
  if (!j || j.Code !== 200 || !Array.isArray(j.Data)) {
    throw new Error('GetJobAdPageList fail: ' + JSON.stringify(j).slice(0, 200));
  }
  return { list: j.Data, total: Number(j.Count) || 0 };
}

async function fetchAll() {
  const PAGE_SIZE = 100;
  const jobs = [];
  let total = 0;
  for (let pageIndex = 0; pageIndex < 20; pageIndex++) {
    const { list, total: t } = await fetchPage(pageIndex, PAGE_SIZE);
    if (!total) total = t;
    for (const d of list) {
      jobs.push({
        title: String(d.JobAdName || '').trim(),
        dept: String(d.Category || '-'),
        city: Array.isArray(d.LocNames) && d.LocNames.length ? d.LocNames.join('/') : '-',
        date: String(d.ChangeDate || d.PostDate || '').slice(0, 10) || '-',
        url: LIST_URL,
        desc: [d.Duty, d.Require].filter(Boolean).join('\n'),
        // 职责/要求分开存，打分器 v3 对要求段降权
        descDuty: String(d.Duty || ''),
        descRequire: String(d.Require || ''),
        commitment: '全职',
        id: String(d.Id || d.JobAdId || ''),
      });
    }
    if (!list.length || jobs.length >= total) break;
    await new Promise(res => setTimeout(res, 100));
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
