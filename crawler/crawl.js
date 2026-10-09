// node crawl.js <siteKey>: run one adapter, validate usable data, then promote a snapshot.
// Only individually reviewed registered scopes qualify; unknown custom sources are not run.
'use strict';
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const { loadSites, coverageFor, atomicWrite, normalizeJobs, validTimestamp } = require('./publish');
const moka = require('./lib/moka');
const portals = require('./lib/portals');
const RETRY_PRELOAD = path.join(__dirname, 'lib', 'retry-preload.js');

function adapterCommand(site, rawFile) {
  // 声明了门户身份却没通过核验：不运行。
  const portal = portals.qualified(site);
  if (!portal && portals.requiring(site)) return null;
  if (portal) return { script: portal.script(site), args: [JSON.stringify(site), rawFile], timeout: portal.timeout };
  if (moka.requiresVerification(site) && !moka.verifiedSource(site)) return null;
  if (site.ats === 'moka') return { script: path.join(__dirname, 'lib', 'moka.js'), args: [site.orgId, String(site.siteId), site.site, site.aesIv || 'de7c21ed8d6f50fe', rawFile, ...(site.fetchDetails ? ['--details'] : site.listJD ? ['--list-jd'] : []), ...(site.apiOrigin ? ['--origin=' + site.apiOrigin] : [])], timeout: site.fetchDetails || site.listJD ? 900000 : 180000 };
  return null;
}

function readIfPresent(file) {
  return fs.existsSync(file) ? fs.readFileSync(file) : null;
}

function restore(file, backup) {
  if (backup !== null) fs.writeFileSync(file, backup);
  else if (fs.existsSync(file)) fs.unlinkSync(file);
}

function parseOptional(buffer) {
  try { return buffer === null ? null : JSON.parse(buffer.toString('utf8')); } catch { return null; }
}

// 采集成功 = 适配器取到了至少一个岗位，且 total 与岗位数一致；失败或零岗位一律不改已发布数据。
function validateEnvelope(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw) || !Array.isArray(raw.jobs) || !raw.jobs.length || raw.total !== raw.jobs.length) {
    const error = new Error('Adapter returned no usable jobs or a mismatched total; zero cannot clear existing data');
    error.unverified = true;
    throw error;
  }
  return raw.jobs;
}

function runCrawl(site, { outDir = path.join(__dirname, 'out'), runner = spawnSync, now = () => new Date().toISOString(), log = () => {} } = {}) {
  if (!site || !/^[a-z0-9_]+$/.test(site.key) || typeof site.company !== 'string' || !site.company) throw new Error('Invalid registry source');
  const lastAttempt = now();
  if (!validTimestamp(lastAttempt)) throw new Error('Invalid attempt timestamp');
  fs.mkdirSync(outDir, { recursive: true });
  const rawFile = path.join(outDir, site.key + '_raw.json');
  const snapshotFile = path.join(outDir, site.key + '_snapshot.json');
  const statusFile = path.join(outDir, site.key + '_status.json');
  // Backup BEFORE invoking the child. Remove the raw path so exit-0/no-write cannot reuse it.
  const oldRaw = readIfPresent(rawFile);
  const oldSnapshot = readIfPresent(snapshotFile);
  const previousStatus = parseOptional(readIfPresent(statusFile));
  const previousSnapshot = parseOptional(oldSnapshot);
  const lastSuccess = previousStatus?.key === site.key && validTimestamp(previousStatus.lastSuccess)
    ? previousStatus.lastSuccess
    : previousSnapshot?.key === site.key && validTimestamp(previousSnapshot.completedAt) ? previousSnapshot.completedAt : null;
  const coverage = coverageFor(site);
  let promoted = false, retries = [];
  // 采集有问题就留下记录：追加一行到 out 目录的 crawl-issues.jsonl（失败，或成功但有重试／坏记录／total 不符等）。
  const record = entry => fs.appendFileSync(path.join(outDir, 'crawl-issues.jsonl'), JSON.stringify({ at: lastAttempt, key: site.key, ...entry }) + '\n');
  const saveStatus = (status, message, success = lastSuccess) => {
    const result = { version: 1, key: site.key, status, lastAttempt, lastSuccess: success, message, coverage };
    atomicWrite(statusFile, JSON.stringify(result, null, 2) + '\n');
    record({ outcome: status, error: message, retries: retries.length });
    return { code: status === 'ready' ? 0 : 1, ...result };
  };
  const command = adapterCommand(site, rawFile);
  if (!command) return saveStatus('unverified', '此来源身份或正常采集协议尚未复验；未运行，保留已发布基线');
  try {
    if (oldRaw !== null) fs.unlinkSync(rawFile);
    const env = { ...process.env, NODE_OPTIONS: [process.env.NODE_OPTIONS, '--require=' + RETRY_PRELOAD].filter(Boolean).join(' ') };
    const child = runner(process.execPath, [command.script, ...command.args], { encoding: 'utf8', timeout: command.timeout, env });
    if (child?.stdout) log(child.stdout.trim());
    if (child?.stderr) log(child.stderr.trim());
    retries = String(child?.stderr ?? '').split('\n').filter(line => line.startsWith('[retry]'));
    if (!child || child.error || child.status !== 0 || child.signal) throw new Error('Adapter failed: ' + (child?.error?.message || 'exit=' + child?.status + (child?.signal ? ' signal=' + child.signal : '')));
    if (!fs.existsSync(rawFile)) throw new Error('Adapter did not write new raw data');
    const raw = JSON.parse(fs.readFileSync(rawFile, 'utf8'));
    const jobs = validateEnvelope(raw);
    const portal = portals.qualified(site);
    const validation = portal?.mod.validateEvidence(raw.verification, jobs, site);
    if (portal && portals.listStopped(raw, site)) throw new Error('列表采集中途出错或触顶，数据不全，本次不上架：' + (validation?.issues ?? []).join('；'));
    normalizeJobs(jobs, site, { detailIds: validation?.detailIds });
    const completedAt = now();
    if (!validTimestamp(completedAt) || Date.parse(completedAt) < Date.parse(lastAttempt)) throw new Error('Invalid completion timestamp');
    const snapshot = { version: 1, key: site.key, completedAt, coverage, jobs, ...(portal ? { verification: raw.verification } : {}) };
    atomicWrite(snapshotFile, JSON.stringify(snapshot, null, 2) + '\n');
    promoted = true;
    // Ready metadata identifies this same completed attempt, not the invocation start time.
    const problems = [...(validation?.issues ?? []), ...(retries.length ? ['重试 ' + retries.length + ' 次（' + retries.slice(0, 3).map(line => line.replace('[retry] ', '')).join('、') + '）'] : [])];
    const status = { version: 1, key: site.key, status: 'ready', lastAttempt, lastSuccess: completedAt, message: '已更新：' + jobs.length + ' 个岗位（仅此来源范围）' + problems.map(p => '；' + p).join('') + portals.notices(site).map(n => '；' + n).join(''), ...(problems.length ? { issues: problems } : {}), coverage };
    if (problems.length) record({ outcome: 'ready-with-issues', total: jobs.length, issues: problems, retries: retries.length });
    atomicWrite(statusFile, JSON.stringify(status, null, 2) + '\n');
    return { code: 0, ...status, total: jobs.length };
  } catch (error) {
    restore(rawFile, oldRaw);
    if (promoted) restore(snapshotFile, oldSnapshot);
    return saveStatus(error.unverified ? 'unverified' : 'failed', error.message + '；保留旧 raw、快照及已发布基线');
  }
}

module.exports = { adapterCommand, validateEnvelope, runCrawl };
if (require.main === module) {
  try {
    const key = process.argv[2];
    const sites = loadSites();
    const site = sites.find(item => item.key === key);
    if (!site) throw new Error('Usage: node crawl.js <siteKey>; keys: ' + sites.map(item => item.key).join(', '));
    const result = runCrawl(site, { log: console.log });
    console.log(key + ': ' + result.status + ' — ' + result.message);
    process.exitCode = result.code;
  } catch (error) {
    console.error('ERR ' + error.message);
    process.exitCode = 1;
  }
}
