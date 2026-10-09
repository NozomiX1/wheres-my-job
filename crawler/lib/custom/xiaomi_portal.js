'use strict';
const { paginate } = require('../paginate');
// 小米 HR 门户（hr.xiaomi.com）：校招 type=2、社招 type=1、实习 type=3 共用同一套列表/详情接口。
// 宽松策略：单轮采集；只保证岗位有官网ID、标题和官网链接；缺详情、total 不符、少数坏记录只记 issues，不挡整源。
const fs = require('node:fs');
const ORIGIN = 'https://hr.xiaomi.com', API = ORIGIN + '/website/api/agent/searchJobPage', DETAIL_API = 'https://xiaomi.jobs.f.mioffice.cn/api/v1/job/posts';
const PROFILE = Object.freeze({ key: 'xiaomi', company: '小米', ats: 'custom', adapter: 'xiaomi-hr-v1', origin: ORIGIN, api: API, url: ORIGIN + '/website/opportunities.html?project=%E6%A0%A1%E6%8B%9B', track: 'campus', detailApi: DETAIL_API, fetchDetails: true, body: Object.freeze({ keyword: '', cityZhNames: '', pageSize: 10, type: 2 }) });
const SOCIAL_PROFILE = Object.freeze({ ...PROFILE, key: 'xiaomi_social', track: 'social', url: ORIGIN + '/website/opportunities.html?project=%E7%A4%BE%E6%8B%9B', fetchDetails: false, body: Object.freeze({ ...PROFILE.body, type: 1 }) });
// 官网探索机会页项目映射：实习=3。
const INTERN_PROFILE = Object.freeze({ ...PROFILE, key: 'xiaomi_intern', url: ORIGIN + '/website/opportunities.html?project=%E5%AE%9E%E4%B9%A0', body: Object.freeze({ ...PROFILE.body, type: 3 }) });
const PROFILES = { xiaomi: PROFILE, xiaomi_social: SOCIAL_PROFILE, xiaomi_intern: INTERN_PROFILE };
const MAX_PAGES = 400, TOPIC_KEY = '7595885661741271302';
const NOTICES = {
  xiaomi: '小米校招覆盖探索机会入口type=2的无关键词/城市筛选列表（含其顶尖应届、新零售等项目），不等于公司全球或独立实习入口全集；性质、人才计划、职能和日期未知。',
  xiaomi_social: '小米社招只覆盖HR type=1无关键词/城市筛选入口，完整性未验证，不冒公司全球全集。城市按原序展示，不推断主次；性质、计划、职能及日期未知。',
  xiaomi_intern: '小米实习仅覆盖官网探索机会实习项目（HR type=3）无关键词/城市筛选列表；原生标实习，不代表公司全球或其它入口全集，人才计划及日期未知。'
};

const requiresVerification = site => site?.adapter === PROFILE.adapter || Object.hasOwn(PROFILES, site?.key);
const verifiedSource = site => site?.adapter === PROFILE.adapter && PROFILES[site.key]?.body.type === site.body?.type;
const portalNotice = site => verifiedSource(site) ? NOTICES[site.key] : '';
const typeOf = site => PROFILES[site.key].body.type;

function listRequest(pageNum, site) {
  const query = new URLSearchParams({ keyword: '', cityZhNames: '', pageSize: '10', pageNum: String(pageNum), type: String(typeOf(site)) });
  return { url: API + '?' + query, headers: { Accept: 'application/json' } };
}
function detailRequest(job) {
  return { url: DETAIL_API + '/' + job.jobPostId + '?portal_type=6&with_recommend=false', headers: { Accept: 'application/json', 'website-path': new URL(job.url).pathname.split('/')[1], 'accept-language': 'zh-CN', Referer: job.url } };
}
// 只要求能确定官网身份、标题和链接；缺这些的记录不发布。
function usable(job) {
  return job && Number.isSafeInteger(job.id) && job.id > 0 && typeof job.title === 'string' && job.title.trim() &&
    typeof job.url === 'string' && /^https:\/\//.test(job.url) && typeof job.jobPostId === 'string' && job.jobPostId;
}
const detailOf = job => (job.detail?.response ?? job.detail)?.data?.job_post_detail ?? null;

function validateJobs(jobs) {
  if (!Array.isArray(jobs) || !jobs.length) throw new Error('Xiaomi: invalid jobs or effective zero; zero cannot clear existing data');
  return true;
}
// 不再回放校验原始证据；仅返回采集时记录的 issues 供状态说明使用。
function validateEvidence(evidence) {
  return { issues: Array.isArray(evidence?.issues) ? evidence.issues : [] };
}
function normalizeRecord(job, site) {
  const social = site.key === 'xiaomi_social', d = detailOf(job);
  const duty = job.description ?? d?.description ?? '', requirements = job.requirement ?? d?.requirement ?? '';
  const topic = d?.job_post_info?.job_post_object_value_map?.[TOPIC_KEY];
  const topicText = typeof topic === 'string' ? topic : '';
  const description = topicText ? '职位描述\n' + duty + '\n\n职位要求\n' + requirements + '\n\n职位信息\n课题名称及内容：\n' + topicText : '';
  return {
    id: String(job.id), title: job.title, city: (job.cityZhNames || []).join('/'), category: '', channels: [social ? 'social' : 'campus'],
    employment: site.key === 'xiaomi_intern' && d?.recruit_type?.name === '实习' ? 'internship' : null,
    talentPlan: null, date: null, dateKind: null, sourceStatus: null, url: job.url, duty, requirements, description,
    jdComplete: Boolean(d) && (social || /[\p{L}\p{N}]/u.test(duty + requirements + topicText))
  };
}

async function run(site, options = {}) {
  if (!verifiedSource(site)) throw new Error('Xiaomi: unknown source key/scope');
  const { fetchImpl = globalThis.fetch, sleep = ms => new Promise(r => setTimeout(r, ms)), maxPages = MAX_PAGES, withDetails = true } = options;
  let first = true;
  async function get({ url, headers }) {
    if (!first) await sleep(200);
    first = false;
    const res = await fetchImpl(url, { method: 'GET', headers, redirect: 'error', signal: AbortSignal.timeout(15000) });
    if (res.status !== 200) { const e = new Error('Xiaomi: native HTTP ' + res.status); e.http = res.status; throw e; }
    return res.json();
  }
  const issues = [];
  const { rows: byId, pages } = await paginate(async n => {
    const json = await get(listRequest(n, site));
    if (json.code !== 0 || !Array.isArray(json.data?.list)) throw new Error('Xiaomi: native business refusal on page ' + n);
    return { rows: json.data.list, total: json.data.total };
  }, { maxPages, idOf: job => job.id, usable, issues });
  const jobs = [...byId.values()];
  if (!jobs.length) throw new Error('Xiaomi: no usable records; zero cannot clear existing data');

  // 详情尽力而为：官网拒绝(403/412/429)立即停止详情，其它单条失败跳过，连续5次失败也停止。
  if (withDetails) {
    let got = 0, failed = 0, streak = 0;
    for (const job of jobs) {
      try {
        const json = await get(detailRequest(job));
        if (json.code !== 0 || !json.data?.job_post_detail) throw new Error('Xiaomi: detail business refusal');
        job.detail = json; got++; streak = 0;
      } catch (error) {
        failed++; streak++;
        if ([403, 412, 429].includes(error.http) || streak >= 5) { issues.push('详情请求停止：' + error.message); break; }
      }
    }
    if (got < jobs.length) issues.push('详情取得 ' + got + '/' + jobs.length + '，其余仅有列表职责/要求');
  }
  return { total: jobs.length, jobs, issues, verification: { key: site.key, api: API, pages, issues } };
}

module.exports = { PROFILE, SOCIAL_PROFILE, INTERN_PROFILE, requiresVerification, verifiedSource, portalNotice, validateJobs, validateEvidence, normalizeRecord, run };
if (require.main === module) (async () => {
  const [siteJSON, rawFile] = process.argv.slice(2); if (!siteJSON || !rawFile) throw new Error('Usage: node xiaomi_portal.js <siteJSON> <rawFile>');
  const result = await run(JSON.parse(siteJSON)), temp = rawFile + '.tmp-' + process.pid;
  try { fs.writeFileSync(temp, JSON.stringify(result, null, 2) + '\n', { flag: 'wx' }); fs.renameSync(temp, rawFile); } finally { if (fs.existsSync(temp)) fs.unlinkSync(temp); }
  console.log('DONE fetched=' + result.total);
})().catch(error => { console.error('ERR ' + error.message); process.exitCode = 1; });
