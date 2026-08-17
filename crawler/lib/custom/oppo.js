// OPPO 校招：POST https://careers.oppo.com/openapi/position/pageNew
// 接口未按 idRecruitProject 过滤，返回全部校招岗位（应届生/博士生/实习），
// 本模块只保留「校招全职」（recruitmentType = Graduate 应届生 / doctor 博士生），剔除实习。
const fs = require('fs');
const path = require('path');

const COMPANY = 'OPPO';
const KEY = 'oppo';

const BASE = 'https://careers.oppo.com/openapi/position/pageNew';
const H = {
  'Content-Type': 'application/json',
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124 Safari/537.36',
  'Origin': 'https://careers.oppo.com',
  'Referer': 'https://careers.oppo.com/university/oppo/campus/'
};

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function pullPage(pageNum, pageSize) {
  const res = await fetch(BASE, {
    method: 'POST',
    headers: H,
    body: JSON.stringify({ pageNum, pageSize, idRecruitProject: 30 })
  });
  const j = await res.json();
  if (!j || j.code !== 0 || !j.data) {
    throw new Error('OPPO 接口异常: ' + JSON.stringify(j).slice(0, 200));
  }
  return { total: j.data.total || 0, records: j.data.records || [] };
}

async function fetchAll() {
  const jobs = [];
  let pageNum = 1, total = 0;
  const pageSize = 100;
  while (true) {
    const { total: t, records } = await pullPage(pageNum, pageSize);
    if (!total) total = t;
    for (const x of records) {
      // 只保留校招全职：应届生(Graduate) + 博士生(doctor)，剔除实习生(Intern)
      if (x.recruitmentType !== 'Graduate' && x.recruitmentType !== 'doctor') continue;
      jobs.push({
        title: String(x.positionName || '').trim(),
        dept: '-',
        city: String(x.workCityName || '').replace(/,/g, '/').trim() || '-',
        date: String(x.releaseTime || '').slice(0, 10) || '-',
        url: 'https://careers.oppo.com/university/oppo/campus/post/' + x.idRecruitPosition,
        desc: [x.positionDesc, x.positionRequire].filter(Boolean).join('\n'),
        commitment: '全职',
        id: String(x.idRecruitPosition)
      });
    }
    if (records.length < pageSize || jobs.length >= total) break;
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
