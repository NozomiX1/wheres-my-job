// Single entrypoint: registry -> serial crawl children -> one publish. No scoring/HTML/LLM.
// Usage: node crawler/update.js [key ...] (no arguments selects every registry source).
'use strict';
const { spawnSync } = require('node:child_process');
const path = require('node:path');
const { loadSites, publish } = require('./publish');

function runUpdate(keys = [], { sites = loadSites(), runner = spawnSync, publisher = publish, outDir, dataFile, log = () => {} } = {}) {
  const selected = [...new Set(keys.length ? keys.flatMap(key => key.split(',').filter(Boolean)) : sites.map(site => site.key))];
  for (const key of selected) if (!sites.some(site => site.key === key)) throw new Error('Unknown source key: ' + key);
  const attempts = [];
  for (const key of selected) {
    log('crawl ' + key);
    try {
      const child = runner(process.execPath, [path.join(__dirname, 'crawl.js'), key], { stdio: 'inherit' });
      const code = child && !child.error && !child.signal && child.status === 0 ? 0 : 1;
      attempts.push({ key, code });
      if (code) log(key + ': crawl failed/unverified; keeping source baseline');
    } catch (error) {
      attempts.push({ key, code: 1 });
      log(key + ': ' + error.message);
    }
  }
  // Even after a partial failure, publish the verified sources and preserve the others.
  let publication;
  try { publication = publisher({ sites, keys: selected, failedKeys: attempts.filter(attempt => attempt.code).map(attempt => attempt.key), outDir, dataFile }); }
  catch (error) { publication = { code: 1, written: false, updated: [], errors: [error.message] }; }
  return { code: attempts.some(attempt => attempt.code) || publication.code ? 1 : 0, attempts, publication };
}

module.exports = { runUpdate };
if (require.main === module) {
  try {
    const result = runUpdate(process.argv.slice(2), { log: console.log });
    console.log(result.publication.written ? 'Published sources: ' + result.publication.updated.join(', ') : 'No verified updates; published data unchanged');
    for (const error of result.publication.errors || []) console.error(error);
    process.exitCode = result.code;
  } catch (error) {
    console.error('ERR ' + error.message);
    process.exitCode = 1;
  }
}
