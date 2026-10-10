'use strict';
// 美团校园：官网默认校招入口 = 类型1（应届）＋类型2（实习）两个分区，按分区分别分页后合并（同一列表/详情接口见 meituan_portal.js）。
// 宽松策略同社招：单轮、详情尽力而为、差异只记 issues。
const fs = require('node:fs');
const { randomUUID } = require('node:crypto');
const social = require('./meituan_portal');
const { client, paginate, fetchDetails, envelope, listRequest, usable, text } = social.shared;
const PROFILE = { ...structuredClone(social.PROFILE), key: 'meituan', adapter: social.shared.CAMPUS_ADAPTER, track: 'campus', batch: '校招', url: 'https://zhaopin.meituan.com/web/campus' };
PROFILE.body.jobType = [{ code: '1', subCode: [] }, { code: '2', subCode: [] }];
PROFILE.body.page.pageSize = 1000;
const PARTITIONS = ['1', '2'];

const requiresVerification = site => site?.key === 'meituan' || site?.adapter === PROFILE.adapter;
const verifiedSource = site => site?.key === PROFILE.key && site.adapter === PROFILE.adapter;
const portalNotice = site => verifiedSource(site) ? '美团校园仅覆盖官网默认校招1＋2全部应届/实习入口，分类型枚举后按原范围合并；不代表全部招聘渠道。按官网特殊类型保留两栏＋工作城市或六片完整JD，职责/要求用于排序；类型2已证实习，其余性质、计划、职能及可靠官网日期未知，原状态码不证明实际可投性。' : '';
const validateJobs = social.validateJobs;
const validateEvidence = social.validateEvidence;

function normalizeRecord(row, site) {
  if (!verifiedSource(site)) throw new Error('Meituan campus: unverified source identity/scope/mode');
  if (!usable(row)) throw new Error('Meituan campus: missing official id/title');
  // 这些特殊类型只展示两栏＋工作城市，其余展示六片完整JD。
  const short = ['1', '2', '3', '4', '7', '8', '9'].includes(row.jobSpecialCode), sections = short ? [['jobDuty', '岗位职责'], ['jobRequirement', '任职要求']] : social.SECTIONS;
  const cities = (Array.isArray(row.cityList) ? row.cityList : []).map(v => v?.name).filter(Boolean);
  let description = sections.filter(([k]) => text(row[k]) !== '').map(([k, title]) => title + '\n' + row[k]).join('\n\n');
  if (short && cities.length) description += (description ? '\n\n' : '') + '工作城市\n' + cities.join('、');
  return { id: row.jobUnionId, title: row.name, city: cities, category: '', description, duty: text(row.jobDuty), requirements: text(row.jobRequirement), date: null, dateKind: null,
    employment: row.jobType === '2' ? 'internship' : null, talentPlan: null, channels: row.jobType === '2' ? [] : ['campus'], sourceStatus: row.jobStatus ?? null,
    // 旧快照的行都是详情行；新行只有取到详情才算 JD 完整。
    jdComplete: row.detailFetched !== false && sections.some(([k]) => /[\p{L}\p{N}]/u.test(text(row[k]))),
    url: 'https://zhaopin.meituan.com/web/position/detail?jobUnionId=' + encodeURIComponent(row.jobUnionId) + '&jobShareType=1' };
}

async function fetchAll(site, options = {}) {
  if (!verifiedSource(site)) throw new Error('Meituan campus: unverified source identity/scope/mode');
  const get = client(options), rows = new Map(), issues = [];
  let pages = 0;
  for (const jobType of PARTITIONS) {
    const part = await paginate(get, n => listRequest(n, { body: PROFILE.body, jobType }), rows, issues, { maxPages: options.maxPages, label: '类型' + jobType + ' ' });
    pages += part.pages;
  }
  if (options.withDetails !== false) {
    await fetchDetails(get, rows, issues, options.known);
    for (const [id, row] of rows) if (!row.detailFetched) rows.set(id, { ...row, detailFetched: false });
  }
  return envelope(site, rows, issues, { pages });
}

async function run(args, options = {}) {
  if (!Array.isArray(args) || args.length !== 2 || !args[1]) throw new Error('Usage: meituan_campus_portal.js <siteJSON> <outputFile>');
  const site = JSON.parse(args[0]);
  const result = await fetchAll(site, options), out = { key: site.key, api: site.api, mode: 'custom', ...result }, temporary = args[1] + '.tmp-' + randomUUID();
  try { fs.writeFileSync(temporary, JSON.stringify(out, null, 2) + '\n', { flag: 'wx' }); fs.renameSync(temporary, args[1]); } finally { if (fs.existsSync(temporary)) fs.unlinkSync(temporary); }
  return out;
}
module.exports = { PROFILE, verifiedSource, requiresVerification, portalNotice, validateJobs, normalizeRecord, validateEvidence, fetchAll, run };
if (require.main === module) run(process.argv.slice(2)).catch(e => { console.error(e.message); process.exitCode = 1; });
