// 阿里巴巴集团社招（talent-holding.alibaba.com）
const fs = require('fs');
const path = require('path');
const { fetchAllFor } = require('./ali_social_common');

const COMPANY = '阿里巴巴';
const KEY = 'alibaba_social';
const HOST = 'talent-holding.alibaba.com';

async function fetchAll() { return fetchAllFor(HOST); }

module.exports = { fetchAll, COMPANY, KEY };

if (require.main === module) {
  fetchAll().then(jobs => {
    const raw = path.join(__dirname, '..', '..', 'out', KEY + '_raw.json');
    fs.writeFileSync(raw, JSON.stringify(jobs, null, 2), 'utf8');
    console.log('raw=' + jobs.length);
  }).catch(e => { console.error('ERR ' + e.message); process.exit(1); });
}
