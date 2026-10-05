// Custom adapter template. Existing custom adapters remain unverified and are not
// automatically executed by crawl.js until source-specific completeness is reviewed.
// Collect every occupation/experience/plan in the declared official source scope.
// Never truncate JD, silently skip a failed detail/page, or mark a capped list complete.
// On HTTP/auth/shape/count/pagination failure: throw BEFORE writing any candidate.
// Success contract: {complete:true,total:<proven count>,jobs:[...]}; total=0 needs
// an authoritative successful response, not a missing list or swallowed exception.
// Jobs need official id/title, full available duty/requirements/description and URL.
// Keep unknown dateKind/employment/talentPlan unknown; preserve channel parameters.
// Changing registry coverage after a verified publication requires explicit migration.
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const COMPANY = '公司名';
const KEY = 'sitekey';

async function fetchAll() {
  // Implement and test source-specific pagination, count and full-detail proof first.
  // Do not turn this placeholder into an apparently valid empty result.
  throw new Error('Source adapter not implemented or verified');
}

module.exports = { fetchAll, COMPANY, KEY };
if (require.main === module) {
  fetchAll().then(envelope => {
    const out = path.join(__dirname, '..', '..', 'out');
    fs.mkdirSync(out, { recursive: true });
    fs.writeFileSync(path.join(out, KEY + '_raw.json'), JSON.stringify(envelope, null, 2) + '\n');
  }).catch(error => { console.error('ERR ' + error.message); process.exitCode = 1; });
}
