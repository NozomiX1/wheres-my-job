'use strict';
const test = require('node:test'), assert = require('node:assert/strict'), path = require('node:path');
const { adapterCommand } = require('../crawler/crawl');
const { loadSites, normalizeJobs, validateSnapshot, coverageFor } = require('../crawler/publish');
const keys = ['tencent', 'tencent_social', 'tme', 'tme_social', 'jd', 'jd_social', 'oppo', 'oppo_social', 'netease_huyu', 'netease_social', 'vivo_social', 'netease_leihuo'];
test('third-batch sources independently qualify available snapshots; exact scope cannot downgrade or claim completeness', () => {
  const sites = loadSites();
  for (const key of keys) {
    const site = sites.find(s => s.key === key), file = site.adapter.replace('-portal-v1', '_portal.js').replaceAll('-', '_');
    const portal = require('../crawler/lib/custom/' + file);
    assert(portal.verifiedSource(site), key + ' fixed registry identity');
    const command = adapterCommand(site, '/tmp/unused-third-batch-raw.json');
    assert.equal(path.basename(command.script), file); assert.equal(command.timeout, 900000);
    for (const change of [{ adapter: undefined }, { ats: 'moka' }, { company: '未核单位' }, { key: 'future_unknown' }, { body: { ...site.body, pageSize: 999 } }]) {
      const bad = { ...site, ...change }; if (Object.hasOwn(change, 'adapter')) delete bad.adapter;
      assert.equal(adapterCommand(bad, '/tmp/unused-third-batch-raw.json'), null, key + ' blocks downgrade');
      assert.throws(() => normalizeJobs([], bad), /identity|verified|scope/);
    }
    if (site.query) assert(coverageFor(site).includes('"query":'), 'GET query belongs in scope identity');
    if (site.dictionaryApi) assert(coverageFor(site).includes('"dictionaryApi":'), 'visible supplemental protocol belongs in scope identity');
    if (site.dailyApi) assert(coverageFor(site).includes('"dailyApi":'), 'independent daily API belongs in scope identity');
  }
  const cloud = sites.find(s => s.key === 'aliyun_social');
  assert.equal(require('../crawler/lib/custom/ali_social_common').availableSource(cloud), true);
  assert.equal(path.basename(adapterCommand(cloud, '/tmp/unused-third-batch-raw.json').script), 'ali_social_common.js');
  assert.equal(sites.find(s => s.key === 'netease_huyu').company, '网易互娱');
});
