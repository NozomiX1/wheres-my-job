// 淘天集团社招（talent.taotian.com，淘宝天猫）
const fs = require('fs');
const path = require('path');
const { fetchAllFor } = require('./ali_social_common');

const COMPANY = '淘天集团';
const KEY = 'taotian_social';
const HOST = 'talent.taotian.com';

async function fetchAll() { return fetchAllFor(HOST); }

module.exports = { fetchAll, COMPANY, KEY };

if (require.main === module) {
  fetchAll().then(jobs => {
    const raw = path.join(__dirname, '..', '..', 'out', KEY + '_raw.json');
    fs.writeFileSync(raw, JSON.stringify(jobs, null, 2), 'utf8');
    console.log('raw=' + jobs.length);
  }).catch(e => { console.error('ERR ' + e.message); process.exit(1); });
}
