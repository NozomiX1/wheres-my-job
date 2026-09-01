// 携程集团校招（custom）
// 接口：POST https://careers.ctrip.com/api/hrrecruit/getJobAd（JSON，无需 cookie）
//   {"condition":{...,"category":2},"pager":{"index":"N","size":"100"},"head":{"language":"zh_CN","version":"1"}}
// category=2 = 校招（campus.ctrip.com 的列表走的就是这个接口，size 可一次拉全量）。
// JD 在 requirements 字段（HTML），需去标签；cityName 为英文需映射中文。
// 详情路由（SPA hash）：#/campus/job-detail/:jobId（jobId 是 UUID）。
const fs = require('fs');
const path = require('path');

const COMPANY = '携程集团';
const KEY = 'ctrip';
const BASE = 'https://careers.ctrip.com';
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

// 常见城市英文 → 中文（未命中原样保留）
const CITY_MAP = {
  Shanghai: '上海', Beijing: '北京', Guangzhou: '广州', Shenzhen: '深圳',
  Hangzhou: '杭州', Nanjing: '南京', Chengdu: '成都', Wuhan: '武汉',
  Xiamen: '厦门', Qingdao: '青岛', Dalian: '大连', 'Xi\'an': '西安',
  Jinan: '济南', Guilin: '桂林', Taiyuan: '太原', Zhengzhou: '郑州',
  Shenyang: '沈阳', Chongqing: '重庆', Suzhou: '苏州', Tianjin: '天津',
  Changsha: '长沙', Hefei: '合肥', Fuzhou: '福州', Kunming: '昆明',
};

// HTML 片段 → 纯文本
function html2text(s) {
  return String(s || '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

async function fetchPage(index) {
  const body = {
    condition: { fromId: [], keyword: '', kind: [], country: [], city: [], bucode: [], jobFamilyCode: [], jobFamilyGroupCode: [], category: 2 },
    pager: { index: String(index), size: '100' },
    head: { language: 'zh_CN', version: '1' },
  };
  const r = await fetch(BASE + '/api/hrrecruit/getJobAd', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': UA,
      'Origin': 'https://campus.ctrip.com',
      'Referer': 'https://campus.ctrip.com/',
      'Accept': 'application/json, text/plain, */*',
    },
    body: JSON.stringify(body),
  });
  const j = await r.json();
  const v = j && j.retValue;
  if (j == null || j.retCode !== '201' || !v || !Array.isArray(v.recruitJobAdList)) {
    throw new Error('getJobAd fail: ' + JSON.stringify(j).slice(0, 200));
  }
  return { list: v.recruitJobAdList, total: Number(v.total) || 0 };
}

async function fetchAll() {
  const jobs = [];
  let total = 0;
  for (let index = 1; index <= 20; index++) {
    const { list, total: t } = await fetchPage(index);
    if (!total) total = t;
    for (const d of list) {
      const cityName = String(d.cityName || '').trim();
      jobs.push({
        title: String(d.jobTitle || '').trim(),
        dept: String(d.jobFamilyGroupName || d.buName || '-'),
        city: CITY_MAP[cityName] || cityName || '-',
        date: String(d.publishDate || '').slice(0, 10) || '-',
        url: d.jobId ? ('https://campus.ctrip.com/#/campus/job-detail/' + d.jobId) : '',
        desc: [html2text(d.duty), html2text(d.requirements)].filter(Boolean).join('\n'),
        commitment: '全职',
        id: String(d.id || ''),
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
