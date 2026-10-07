'use strict';
// Offline native examples exercise the real single chain, not live completeness.
const a = require('node:assert/strict'), fs = require('node:fs'), os = require('node:os'), path = require('node:path');
const { runCrawl, adapterCommand } = require('../crawler/crawl');
const { publish, readPublished, normalizeJobs, validateSnapshot } = require('../crawler/publish');
module.exports = async function checkChain(t, site, candidate, corrupt, timeout) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ande-custom-chain-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const dataFile = path.join(dir, 'jobs.js'), key = site.key;
  const normalized = normalizeJobs(candidate.jobs, site);
  const protectedJob = { ...normalized[0], id: 'previous-fixture:root', sourceKey: 'previous-fixture' };
  const protectedSource = { key: 'previous-fixture', company: site.company, status: 'ready', lastAttempt: '2026-09-01T00:00:00.000Z', lastSuccess: '2026-09-01T00:00:00.000Z', message: 'original fixture metadata', coverage: 'fixture-v1' };
  const baseline = { version: 1, legacy: false, notices: [], companies: [{ name: site.company, initial: '#', aliases: [] }], sources: [protectedSource], jobs: [protectedJob] };
  fs.writeFileSync(dataFile, 'globalThis.ANDE_DATA = ' + JSON.stringify(baseline) + ';\n');
  const command = adapterCommand(site, path.join(dir, 'candidate.json'));
  a.ok(command); a.equal(command.timeout, timeout); a.deepEqual(JSON.parse(command.args[0]), site);
  const runner = envelope => (_, args) => { fs.writeFileSync(args.at(-1), JSON.stringify(envelope)); return { status: 0 }; };
  const first = await runCrawl(site, { outDir: dir, runner: runner(candidate), now: () => '2026-10-06T12:00:00.000Z', log: () => {} });
  a.equal(first.code, 0, first.message);
  const snapFile = path.join(dir, key + '_snapshot.json'), rawFile = path.join(dir, key + '_raw.json');
  const snapshot = JSON.parse(fs.readFileSync(snapFile, 'utf8'));
  a.deepEqual(snapshot.verification, candidate.verification); a.deepEqual(snapshot.jobs, candidate.jobs);
  a.equal(snapshot.completedAt, first.lastSuccess);
  a.deepEqual(validateSnapshot(snapshot, first, site), normalized);
  const result = publish({ outDir: dir, dataFile, sites: [site], keys: [key] });
  a.equal(result.code, 0); a.equal(result.written, true); a.deepEqual(result.updated, [key]);
  const published = readPublished(dataFile);
  a.deepEqual(published.jobs.filter(j => j.sourceKey === key), normalized);
  a.deepEqual(published.jobs.find(j => j.id === protectedJob.id), protectedJob);
  a.deepEqual(published.sources.find(s => s.key === protectedSource.key), protectedSource);
  a.equal(published.sources.find(s => s.key === key).lastSuccess, snapshot.completedAt);
  for (const delta of [{ adapter: undefined }, { ats: 'moka' }, { key: 'alias', adapter: undefined }, { body: { ...site.body, keyword: 'AI' } }, { api: null }]) {
    const invalid = { ...structuredClone(site), ...delta };
    a.equal(adapterCommand(invalid, rawFile), null); a.throws(() => normalizeJobs([], invalid));
  }
  const bad = structuredClone(candidate); corrupt(bad);
  a.throws(() => validateSnapshot({ ...structuredClone(snapshot), jobs: bad.jobs, verification: bad.verification }, first, site));
  const rawBytes = fs.readFileSync(rawFile), snapBytes = fs.readFileSync(snapFile), publicBytes = fs.readFileSync(dataFile);
  const failed = await runCrawl(site, { outDir: dir, runner: runner(bad), now: () => '2026-10-06T12:01:00.000Z', log: () => {} });
  a.equal(failed.code, 1); a.equal(failed.lastSuccess, first.lastSuccess);
  a.deepEqual(fs.readFileSync(rawFile), rawBytes); a.deepEqual(fs.readFileSync(snapFile), snapBytes);
  const rejected = publish({ outDir: dir, dataFile, sites: [site], keys: [key], failedKeys: [key] });
  a.equal(rejected.code, 1); a.equal(rejected.written, false); a.deepEqual(rejected.updated, []);
  a.deepEqual(fs.readFileSync(dataFile), publicBytes);
};
