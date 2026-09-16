// 夸克社招（talent.quark.cn，阿里系同构平台，共享 ali_social_common.js）
const fs = require('fs');
const path = require('path');
const { fetchAllFor } = require('./ali_social_common');

const COMPANY = '夸克';
const KEY = 'quark_social';
const HOST = 'talent.quark.cn';

async function fetchAll() { return fetchAllFor(HOST); }

module.exports = { fetchAll, COMPANY, KEY };

if (require.main === module) {
  fetchAll().then(jobs => {
    const raw = path.join(__dirname, '..', '..', 'out', KEY + '_raw.json');
    fs.writeFileSync(raw, JSON.stringify(jobs, null, 2), 'utf8');
    console.log('raw=' + jobs.length);
  }).catch(e => { console.error('ERR ' + e.message); process.exit(1); });
}
