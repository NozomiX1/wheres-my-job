// Compatibility entry only. Scope, normal Chrome session and full-result checks live in feishu.js.
// The old R&D/project whitelist and injected SDK implementation are retired.
'use strict';
const path = require('node:path');
const feishu = require('../feishu');
const { loadSites } = require('../../publish');
const source = () => loadSites().find(site => site.key === 'bytedance');
async function fetchAll(options) { return (await feishu.fetchWithChrome(source(), options)).jobs; }
module.exports = { fetchAll };
if (require.main === module) feishu.run([JSON.stringify(source()), path.join(__dirname, '..', '..', 'out', 'bytedance_raw.json')], { log: console.log })
  .then(result => console.log('Complete ByteDance campus: ' + result.total))
  .catch(error => { console.error('ERR ' + error.message); process.exitCode = 1; });
