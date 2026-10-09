// node crawl.js <siteKey>: run one adapter, validate usable data, then promote a snapshot.
// Only individually reviewed registered scopes qualify; unknown custom sources are not run.
'use strict';
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const { loadSites, coverageFor, atomicWrite, normalizeJobs, validTimestamp } = require('./publish');
const { verifiedSource, classifiedScope, portalNotice, CLASSIFIED_NOTICE } = require('./lib/feishu');
const moka = require('./lib/moka');
const beisen = require('./lib/beisen');
const ali = require('./lib/custom/ali_social_common');
const meituan = require('./lib/custom/meituan_portal');
const meituanCampus = require('./lib/custom/meituan_campus_portal');
const ctrip = require('./lib/custom/ctrip_portal');
const mihoyo = require('./lib/custom/mihoyo_portal');
const shlab = require('./lib/custom/shlab_portal');
const xiaomi = require('./lib/custom/xiaomi_portal');
const availablePortals = [require('./lib/custom/huawei_portal'), require('./lib/custom/xiaohongshu_portal'), require('./lib/custom/baidu_portal'), require('./lib/custom/alibaba_portal'), require('./lib/custom/baichuan_portal'), require('./lib/custom/bilibili_portal'), require('./lib/custom/ant_portal'), require('./lib/custom/kuaishou_portal'), require('./lib/custom/tencent_portal'), require('./lib/custom/tme_portal'), require('./lib/custom/jd_portal'), require('./lib/custom/oppo_portal'), require('./lib/custom/leihuo_portal'), require('./lib/custom/netease_portal'), require('./lib/custom/vivo_social_portal')];

function adapterCommand(site, rawFile) {
  for (const portal of availablePortals) if (portal.requiresVerification(site) && !portal.verifiedSource(site)) return null;
  const availablePortal = availablePortals.find(portal => portal.verifiedSource(site));
  if (availablePortal) return { script: path.join(__dirname, 'lib', 'custom', site.adapter.replace('-portal-v1', '_portal.js').replaceAll('-', '_')), args: [JSON.stringify(site), rawFile], timeout: 900000 };
  if (ali.requiresVerification(site) && !ali.verifiedSource(site) && !ali.availableSource(site)) return null;
  if (meituan.requiresVerification(site) && !meituan.verifiedSource(site) && !meituanCampus.verifiedSource(site)) return null;
  if (meituanCampus.requiresVerification(site) && !meituanCampus.verifiedSource(site)) return null;
  if (ctrip.requiresVerification(site) && !ctrip.verifiedSource(site)) return null;
  if (mihoyo.requiresVerification(site) && !mihoyo.verifiedSource(site)) return null;
  if (shlab.requiresVerification(site) && !shlab.verifiedSource(site)) return null;
  if (xiaomi.requiresVerification(site) && !xiaomi.verifiedSource(site)) return null;
  if (moka.requiresVerification(site) && !moka.verifiedSource(site)) return null;
  if (beisen.requiresVerification(site) && !beisen.verifiedSource(site)) return null;
  if (site.ats === 'moka') return { script: path.join(__dirname, 'lib', 'moka.js'), args: [site.orgId, String(site.siteId), site.site, site.aesIv || 'de7c21ed8d6f50fe', rawFile, ...(site.fetchDetails ? ['--details'] : site.listJD ? ['--list-jd'] : []), ...(site.apiOrigin ? ['--origin=' + site.apiOrigin] : [])], timeout: site.fetchDetails || site.listJD ? 900000 : 180000 };
  if (site.ats === 'beisen') return { script: path.join(__dirname, 'lib', 'beisen.js'), args: beisen.verifiedSource(site) ? [JSON.stringify(site), rawFile] : [site.api, (site.category || ['2']).join(','), rawFile], timeout: beisen.verifiedSource(site) ? 900000 : 180000 };
  if (ali.verifiedSource(site) || ali.availableSource(site)) return { script: path.join(__dirname, 'lib', 'custom', 'ali_social_common.js'), args: [JSON.stringify(site), rawFile], timeout: 900000 };
  if (meituanCampus.verifiedSource(site)) return { script: path.join(__dirname, 'lib', 'custom', 'meituan_campus_portal.js'), args: [JSON.stringify(site), rawFile], timeout: 900000 };
  if (meituan.verifiedSource(site)) return { script: path.join(__dirname, 'lib', 'custom', 'meituan_portal.js'), args: [JSON.stringify(site), rawFile], timeout: 2400000 };
  if (ctrip.verifiedSource(site)) return { script: path.join(__dirname, 'lib', 'custom', 'ctrip_portal.js'), args: [JSON.stringify(site), rawFile], timeout: 900000 };
  if (mihoyo.verifiedSource(site)) return { script: path.join(__dirname, 'lib', 'custom', 'mihoyo_portal.js'), args: [JSON.stringify(site), rawFile], timeout: 2400000 };
  if (shlab.verifiedSource(site)) return { script: path.join(__dirname, 'lib', 'custom', 'shlab_portal.js'), args: [JSON.stringify(site), rawFile], timeout: 900000 };
  if (xiaomi.verifiedSource(site)) return { script: path.join(__dirname, 'lib', 'custom', 'xiaomi_portal.js'), args: [JSON.stringify(site), rawFile], timeout: 2400000 };
  if (verifiedSource(site)) return { script: path.join(__dirname, 'lib', 'feishu.js'), args: [JSON.stringify(site), rawFile], timeout: classifiedScope(site) ? 1200000 : 900000 };
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

function validateEnvelope(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw) || !(raw.complete === true || raw.complete === false && raw.verification?.policy === 'available' && raw.jobs?.length > 0) || !Number.isSafeInteger(raw.total) || raw.total < 0 || !Array.isArray(raw.jobs) || raw.total !== raw.jobs.length) {
    const error = new Error('Adapter did not prove a complete result with an explicit matching total');
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
    : previousSnapshot?.key === site.key && previousSnapshot.complete === true && validTimestamp(previousSnapshot.completedAt) ? previousSnapshot.completedAt : null;
  const coverage = coverageFor(site);
  let promoted = false;
  const saveStatus = (status, message, success = lastSuccess) => {
    const result = { version: 1, key: site.key, status, lastAttempt, lastSuccess: success, message, coverage };
    atomicWrite(statusFile, JSON.stringify(result, null, 2) + '\n');
    return { code: status === 'ready' ? 0 : 1, ...result };
  };
  const command = adapterCommand(site, rawFile);
  if (!command) return saveStatus('unverified', '此来源身份或正常采集协议尚未复验；未运行，保留已发布基线');
  try {
    if (oldRaw !== null) fs.unlinkSync(rawFile);
    const child = runner(process.execPath, [command.script, ...command.args], { encoding: 'utf8', timeout: command.timeout });
    if (child?.stdout) log(child.stdout.trim());
    if (child?.stderr) log(child.stderr.trim());
    if (!child || child.error || child.status !== 0 || child.signal) throw new Error('Adapter failed: ' + (child?.error?.message || 'exit=' + child?.status + (child?.signal ? ' signal=' + child.signal : '')));
    if (!fs.existsSync(rawFile)) throw new Error('Adapter did not write new raw data');
    const raw = JSON.parse(fs.readFileSync(rawFile, 'utf8'));
    const jobs = validateEnvelope(raw);
    const available = raw.complete === false;
    if (raw.verification?.policy === 'available' && !available) throw new Error('Available data cannot claim verified completeness');
    const availablePortal = availablePortals.find(portal => portal.verifiedSource(site));
    if ((availablePortal || ali.availableSource(site)) && !available) throw new Error('This source only qualifies available data, not verified completeness');
    if (available && !availablePortal && !ali.availableSource(site) && !meituan.verifiedSource(site) && site.key !== xiaomi.SOCIAL_PROFILE.key) throw new Error('Available publication is not supported by this source');
    let validation;
    if (availablePortal) validation = availablePortal.validateEvidence(raw.verification, jobs, site);
    if (beisen.verifiedSource(site)) beisen.validateEvidence(raw.verification, jobs, site);
    if (ali.verifiedSource(site) || ali.availableSource(site)) validation = ali.validateEvidence(raw.verification, jobs, site);
    if (meituan.verifiedSource(site)) validation = meituan.validateEvidence(raw.verification, jobs, site);
    if (meituanCampus.verifiedSource(site)) meituanCampus.validateEvidence(raw.verification, jobs, site);
    if (ctrip.verifiedSource(site)) ctrip.validateEvidence(raw.verification, jobs, site);
    if (mihoyo.verifiedSource(site)) mihoyo.validateEvidence(raw.verification, jobs, site);
    if (shlab.verifiedSource(site)) shlab.validateEvidence(raw.verification, jobs, site);
    if (xiaomi.verifiedSource(site)) validation = xiaomi.validateEvidence(raw.verification, jobs, site);
    normalizeJobs(jobs, site, { available, detailIds: validation?.detailIds });
    const completedAt = now();
    if (!validTimestamp(completedAt) || Date.parse(completedAt) < Date.parse(lastAttempt)) throw new Error('Invalid completion timestamp');
    const snapshot = { version: 1, key: site.key, complete: raw.complete, completedAt, coverage, jobs, ...(beisen.verifiedSource(site) || ali.verifiedSource(site) || ali.availableSource(site) || meituan.verifiedSource(site) || meituanCampus.verifiedSource(site) || ctrip.verifiedSource(site) || mihoyo.verifiedSource(site) || shlab.verifiedSource(site) || xiaomi.verifiedSource(site) || availablePortal ? { verification: raw.verification } : {}) };
    atomicWrite(snapshotFile, JSON.stringify(snapshot, null, 2) + '\n');
    promoted = true;
    // Ready metadata identifies this same completed attempt, not the invocation start time.
    const status = { version: 1, key: site.key, status: available ? 'available' : 'ready', lastAttempt, lastSuccess: completedAt, message: (available ? '可用岗位已更新，来源完整性未验证：' : '已验证完整来源快照：') + jobs.length + ' 个岗位（仅此来源范围）' + (available && validation?.issues.length ? '；' + validation.issues.join('；') : '') + (classifiedScope(site) ? '；' + CLASSIFIED_NOTICE : '') + (portalNotice(site) ? '；' + portalNotice(site) : '') + (beisen.portalNotice(site) ? '；' + beisen.portalNotice(site) : '') + (ali.portalNotice(site) ? '；' + ali.portalNotice(site) : '') + (meituan.portalNotice(site) ? '；' + meituan.portalNotice(site) : '') + (meituanCampus.portalNotice(site) ? '；' + meituanCampus.portalNotice(site) : '') + (ctrip.portalNotice(site) ? '；' + ctrip.portalNotice(site) : '') + (mihoyo.portalNotice(site) ? '；' + mihoyo.portalNotice(site) : '') + (shlab.portalNotice(site) ? '；' + shlab.portalNotice(site) : '') + (xiaomi.portalNotice(site) ? '；' + xiaomi.portalNotice(site) : '') + (availablePortal ? '；' + availablePortal.portalNotice(site) : ''), coverage };
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
