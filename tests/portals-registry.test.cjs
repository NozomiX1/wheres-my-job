'use strict';
const test = require('node:test'), a = require('node:assert/strict');
const { portals, requiring, qualified } = require('../crawler/lib/portals');
const { loadSites } = require('../crawler/publish');
const METHODS = ['requiresVerification', 'verifiedSource', 'portalNotice', 'validateJobs', 'validateEvidence', 'normalizeRecord'];

test('every registered portal exports the full adapter interface', () => {
  for (const p of portals) for (const m of METHODS) a.equal(typeof p.mod[m], 'function', p.unverified + ': ' + m);
});

test('each registry site is claimed by at most one portal, and a claimed site qualifies', () => {
  for (const site of loadSites()) {
    const claims = portals.filter(p => p.mod.requiresVerification(site));
    // meituan 的 requiresVerification 同时覆盖校园站点，校园由排在前面的 meituanCampus 处理。
    const owners = claims.filter(p => p.qualifies(site));
    a.ok(owners.length <= 1, site.key + ' qualified by ' + owners.length + ' portals');
    if (claims.length) a.ok(qualified(site), site.key + ' requires a portal but none qualifies');
    a.equal(requiring(site), claims[0]);
  }
});
