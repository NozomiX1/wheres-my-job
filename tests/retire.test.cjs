'use strict';
const test = require('node:test'), a = require('node:assert/strict');
const fs = require('node:fs'), os = require('node:os'), path = require('node:path');
const { publish, readPublished, writeBrowserData } = require('../crawler/publish');

const job = (source, company, n) => ({ id: source + ':' + n, sourceKey: source, company, title: '岗位' + n, city: '', category: '', channels: ['social'], employment: null, talentPlan: null, date: null, dateKind: null, url: 'https://example.test/' + n, duty: '职责', requirements: '', description: '', jdComplete: true, sourceStatus: null });
const src = (key, company) => ({ key, company, status: 'ready', lastSuccess: '2026-10-20T00:00:00.000Z', lastAttempt: '2026-10-20T00:00:00.000Z', message: 'ok', coverage: 'x' });

test('retired sources leave the published data with their jobs and company; others are untouched', t => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ande-retire-')); t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const file = path.join(dir, 'catalog.js');
  writeBrowserData({ version: 1, notices: [], companies: [{ name: '甲', initial: 'J', aliases: [] }, { name: '乙', initial: 'Y', aliases: [] }], sources: [src('a', '甲'), src('b', '乙')], jobs: [job('a', '甲', 1), job('b', '乙', 2)] }, file);
  const r = publish({ sites: [], keys: [], outDir: dir, dataFile: file, retiredKeys: ['a'] });
  a.equal(r.written, true);
  const data = readPublished(file);
  a.deepEqual(data.sources.map(s => s.key), ['b']); a.deepEqual(data.jobs.map(j => j.id), ['b:2']); a.deepEqual(data.companies.map(c => c.name), ['乙']);
  a.equal(publish({ sites: [], keys: [], outDir: dir, dataFile: file, retiredKeys: ['a'] }).written, false, 'nothing left to retire → no rewrite');
});
