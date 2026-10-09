// Sole production writer: usable/complete source snapshots -> ../data/jobs.js.
// Never evaluates the baseline JavaScript, writes HTML, filters jobs or guesses coverage.
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { isDeepStrictEqual } = require('node:util');
const { createHash } = require('node:crypto');
const { normalizeJD } = require('./lib/jd-text');
const feishu = require('./lib/feishu');
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
const OUT_DIR = path.join(__dirname, 'out');
const DATA_FILE = path.join(__dirname, '..', 'data', 'jobs.js');
const JOB_FIELDS = ['id', 'sourceKey', 'company', 'title', 'city', 'category', 'channels', 'employment', 'talentPlan', 'date', 'dateKind', 'url', 'duty', 'requirements', 'description', 'jdComplete', 'sourceStatus'];

function loadSites() {
  return JSON.parse(fs.readFileSync(path.join(__dirname, 'sites.json'), 'utf8')).sites;
}

function coverageFor(site) {
  // Include original scope parameters/descriptions, not a claim of whole-company coverage.
  const keys = ['key', 'ats', 'orgId', 'siteId', 'site', 'api', 'apiOrigin', 'url', 'category', 'track', 'batch', 'body', 'query', 'origin', 'detailApi', 'dictionaryApi', 'dailyApi', 'headers', 'aid', 'websitePath', 'subjectIdList', 'plain', 'matchKeyword', 'note', 'fetchDetails', 'listJD', 'adapter', 'portalType', 'portalPaths', 'categoryRootIds', 'categoryGroups', 'categoryTreeHash'];
  if (site.ats === 'moka') keys.push('linkTemplate');
  const scope = {};
  for (const key of keys.sort()) if (site[key] !== undefined) scope[key] = site[key];
  if (site.ats === 'beisen' && scope.category === undefined) scope.category = ['2'];
  return 'registry-v1:' + JSON.stringify(scope);
}

function atomicWrite(file, content) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const temp = file + '.' + process.pid + '.tmp';
  try {
    fs.writeFileSync(temp, content, 'utf8');
    fs.renameSync(temp, file);
  } finally {
    if (fs.existsSync(temp)) fs.unlinkSync(temp);
  }
}

function text(value, field) {
  if (value == null) return '';
  if (typeof value !== 'string') throw new Error('Invalid text field: ' + field);
  return value;
}

function first(job, fields) {
  for (const field of fields) if (job[field] != null && job[field] !== '') return job[field];
  return null;
}

function joinText(job, fields) {
  return [...new Set(fields.map(field => text(job[field], field)).filter(value => value.trim()))].join('\n');
}

function cityText(value) {
  if (value == null) return '';
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) return value.map(cityText).filter(Boolean).join('/');
  if (typeof value === 'object') {
    const fields = ['name', 'cityName', 'city', 'provinceName', 'country']; // Some official overseas locations name only a country.
    for (const field of fields) if (value[field] != null) text(value[field], 'city.' + field);
    const name = first(value, fields);
    if (name !== null) return name;
  }
  throw new Error('Invalid city field');
}

function categoryNames(value, field) {
  return (Array.isArray(value) ? value : [value]).flatMap(label => {
    if (label == null || typeof label === 'number') return [];
    if (typeof label === 'object' && !Array.isArray(label)) {
      if (Object.hasOwn(label, 'name')) label = text(label.name, field + '.name');
      else if (Object.keys(label).every(key => key === 'id')) return [];
    }
    if (typeof label !== 'string') throw new Error('Invalid category field: ' + field);
    const name = label.trim();
    return name && !Number.isFinite(Number(name)) ? [name] : [];
  });
}

function normalizeDate(value) {
  if (value == null || value === '' || value === '-') return null;
  if (typeof value !== 'string' && typeof value !== 'number') throw new Error('Invalid date field');
  const str = String(value).trim();
  const match = str.match(/^(\d{4}-\d{2}-\d{2})(?:$|[T\s])/);
  if (match) {
    const date = new Date(match[1] + 'T00:00:00Z');
    if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== match[1]) throw new Error('Invalid calendar date');
    return match[1];
  }
  // Official timestamps only; never use the crawl clock as a publication date.
  if (/^\d{10}(?:\d{3})?$/.test(str)) {
    const date = new Date(Number(str) * (str.length === 10 ? 1000 : 1));
    if (Number.isFinite(date.getTime())) return date.toISOString().slice(0, 10);
  }
  return null; // Unsupported date text has unknown semantics, not a fabricated date.
}

function safeUrl(value) {
  if (!value) return '';
  try {
    const url = new URL(value);
    return ['http:', 'https:'].includes(url.protocol) && !url.username && !url.password ? url.href : '';
  } catch { return ''; }
}

function buildUrl(site, id) {
  if (site.linkTemplate) {
    const values = { id, orgId: site.orgId || '', siteId: site.siteId ?? '', site: site.site || '' };
    return safeUrl(site.linkTemplate.replace(/\{(id|orgId|siteId|site)\}/g, (_, key) => encodeURIComponent(values[key])));
  }
  if (site.ats === 'moka' && site.orgId && Number.isSafeInteger(Number(site.siteId)) && Number(site.siteId) > 0 && ['campus', 'social'].includes(site.site)) return safeUrl(`https://app.mokahr.com/${site.site}-recruitment/${encodeURIComponent(site.orgId)}/${encodeURIComponent(site.siteId)}#/job/${encodeURIComponent(id)}`);
  return '';
}

function normalizeJobs(rawJobs, site, { available = false, detailIds } = {}) {
  if (!site || !/^[a-z0-9_]+$/.test(site.key) || typeof site.company !== 'string' || !site.company) throw new Error('Invalid registry source');
  if (!Array.isArray(rawJobs)) throw new Error('Jobs must be an array');
  const newAvailablePortal = availablePortals.find(portal => portal.requiresVerification(site));
  if (newAvailablePortal && !newAvailablePortal.verifiedSource(site)) throw new Error('Portal identity/scope has not been verified');
  if (newAvailablePortal) newAvailablePortal.validateJobs(rawJobs, site);
  const newCtripPortal = ctrip.requiresVerification(site);
  if (newCtripPortal && !ctrip.verifiedSource(site)) throw new Error('Ctrip portal identity/scope/mode has not been verified');
  if (newCtripPortal) ctrip.validateJobs(rawJobs, site);
  const newMihoyoPortal = mihoyo.requiresVerification(site);
  if (newMihoyoPortal && !mihoyo.verifiedSource(site)) throw new Error('Mihoyo portal identity/scope/mode has not been verified');
  if (newMihoyoPortal) mihoyo.validateJobs(rawJobs, site);
  const newShlabPortal = shlab.requiresVerification(site);
  if (newShlabPortal && !shlab.verifiedSource(site)) throw new Error('SHLAB portal identity/scope/mode has not been verified');
  if (newShlabPortal) shlab.validateJobs(rawJobs, site);
  const newXiaomiPortal = xiaomi.requiresVerification(site);
  if (newXiaomiPortal && !xiaomi.verifiedSource(site)) throw new Error('Xiaomi portal identity/scope/mode has not been verified');
  if (newXiaomiPortal) xiaomi.validateJobs(rawJobs, site);
  const newDirectJD = newAvailablePortal || newCtripPortal || newMihoyoPortal || newShlabPortal || newXiaomiPortal || meituan.requiresVerification(site) || ali.availableSource(site);
  const newMeituanCampus = meituanCampus.requiresVerification(site);
  if (newMeituanCampus && !meituanCampus.verifiedSource(site)) throw new Error('Meituan campus identity/scope/mode has not been verified');
  if (newMeituanCampus) meituanCampus.validateJobs(rawJobs, site);
  const newMeituanPortal = meituan.requiresVerification(site) && !newMeituanCampus;
  if (newMeituanPortal && !meituan.verifiedSource(site)) throw new Error('Meituan portal identity/scope/mode has not been verified');
  if (newMeituanPortal) meituan.validateJobs(rawJobs, site, { available });
  const newAliPortal = ali.requiresVerification(site);
  if (newAliPortal && !ali.verifiedSource(site) && !ali.availableSource(site)) throw new Error('Ali social portal identity/scope/mode has not been verified');
  if (newAliPortal) ali.validateJobs(rawJobs, site);
  const newMokaPortal = moka.requiresVerification(site);
  if (newMokaPortal && !moka.verifiedSource(site)) throw new Error('Moka portal identity/scope/mode has not been verified');
  const newBeisenPortal = beisen.requiresVerification(site);
  if (newBeisenPortal && !beisen.verifiedSource(site)) throw new Error('Beisen portal identity/scope/mode has not been verified');
  if (newBeisenPortal) beisen.validateJobs(rawJobs, site);
  const titleFields = site.ats === 'beisen' ? ['JobAdName', 'JobName', 'name', 'title'] : site.ats === 'moka' ? ['name', 'jobTitle', 'title'] : ['title', 'name', 'jobTitle'];
  const cityFields = site.ats === 'beisen' ? ['LocNames', 'WorkLocationName', 'workPlaceName', 'city'] : site.ats === 'moka' ? ['locations', 'cityList', 'city'] : ['city', 'cities', 'city_list', 'locations'];
  const detailedMoka = site.ats === 'moka' && site.fetchDetails === true;
  const fullMoka = detailedMoka || site.ats === 'moka' && site.listJD === true;
  const dateFields = fullMoka ? ['publishedAt'] : site.ats === 'beisen' ? ['PostDate', 'PublishTime', 'publishTime', 'date'] : site.ats === 'moka' ? ['createdAt', 'openedAt', 'publishTime', 'date'] : ['date', 'publish', 'publish_time'];
  const categoryFields = site.ats === 'moka' ? ['category', 'zhineng'] : site.ats === 'feishu' ? ['category', 'job_category', 'jobFunction'] : ['category'];
  const descriptionFields = ['description', 'desc', 'jobDescription', 'job_description', 'JobDescription', 'summary', 'jobSummary'];
  const dutyFields = ['duty', 'descDuty', 'Duty', 'Responsibility', 'workContent', 'jobDuty'];
  const requireFields = ['requirements', 'requirement', 'descRequire', 'Require', 'Requirement', 'jobRequire', 'qualification', 'workRequire', 'positionDemand', 'serviceCondition'];
  if (site.ats === 'beisen') dutyFields.push('jobDescription', 'description');
  const seen = new Set();
  return rawJobs.map((job, index) => {
    try {
      if (!job || typeof job !== 'object' || Array.isArray(job)) throw new Error('Invalid job object');
      if (newAvailablePortal) job = newAvailablePortal.normalizeRecord(job, site);
      if (newCtripPortal) job = ctrip.normalizeRecord(job, site);
      if (newMihoyoPortal) job = mihoyo.normalizeRecord(job, site);
      if (newShlabPortal) job = shlab.normalizeRecord(job, site);
      if (newXiaomiPortal) job = xiaomi.normalizeRecord(job, site);
      if (newMeituanPortal) job = meituan.normalizeRecord(job, site, { available, detailIds });
      if (newMeituanCampus) job = meituanCampus.normalizeRecord(job, site);
      if (newAliPortal) job = ali.normalizeRecord(job, site);
      if (newBeisenPortal) job = beisen.normalizeRecord(job, site);
      if (newMokaPortal) {
        moka.validateListJob(job, site.orgId, site.siteId);
        // Only proven native fields may supply public facts; ignore unverified aliases/canonical claims.
        const fields = ['id', 'orgId', 'title', 'locations', 'zhineng', 'commitment', 'jobDescription', 'publishedAt', 'status', 'detailVerified', 'listJDVerified', 'deptId'];
        job = Object.fromEntries(fields.filter(field => Object.hasOwn(job, field)).map(field => [field, job[field]]));
      }
      if (feishu.verifiedSource(site)) {
        const verified = feishu.normalizeRecord(job, site);
        for (const [field, value] of Object.entries(verified)) if (JSON.stringify(job[field]) !== JSON.stringify(value)) throw new Error('Feishu normalized facts do not match the full raw post: ' + field);
        job = verified;
      }
      const idFields = ['id', 'Id', 'JobAdId', 'jobAdId', 'PostId', 'positionId'];
      for (const field of idFields) if (job[field] != null && !(typeof job[field] === 'string' || (Number.isSafeInteger(job[field]) && job[field] >= 0))) throw new Error('Invalid official id');
      const rawId = first(job, idFields);
      const officialId = rawId == null ? '' : String(rawId).trim();
      if (!officialId) throw new Error('Missing official id');
      const id = site.key + ':' + officialId;
      if (seen.has(id)) throw new Error('Duplicate official id');
      seen.add(id);
      for (const field of titleFields) text(job[field], field);
      const nativeTitle = text(first(job, titleFields), 'title');
      const title = newXiaomiPortal || newAvailablePortal || ali.availableSource(site) ? nativeTitle : nativeTitle.trim();
      if (!title.trim()) throw new Error('Missing title');
      for (const field of cityFields) cityText(job[field]);
      for (const field of dateFields) normalizeDate(job[field]);
      if (fullMoka && job.publishedAt != null && typeof job.publishedAt !== 'string') throw new Error('Invalid publishedAt field');
      const date = normalizeDate(first(job, dateFields));
      if (job.dateKind != null && !['published', 'updated'].includes(job.dateKind)) throw new Error('Invalid dateKind');
      const commitment = first(job, ['commitment', 'Commitment', 'Kind', 'recruitType', 'recruit_type']);
      if (commitment != null && typeof commitment !== 'string' && !Number.isSafeInteger(commitment) && !(typeof commitment === 'object' && typeof commitment.name === 'string')) throw new Error('Invalid employment field');
      const kind = typeof commitment === 'object' && commitment ? commitment.name : commitment;
      let employment = job.employment ?? null;
      if (employment !== null && !['internship', 'full-time'].includes(employment)) throw new Error('Invalid employment');
      if (employment === null) {
        if (['internship', '实习', '实习生'].includes(kind)) employment = 'internship';
        if (['full-time', '全职'].includes(kind)) employment = 'full-time';
      }
      if (job.talentPlan != null && typeof job.talentPlan !== 'boolean') throw new Error('Invalid talentPlan');
      if (job.jdComplete != null && typeof job.jdComplete !== 'boolean') throw new Error('Invalid jdComplete');
      if (detailedMoka && (job.detailVerified !== true || typeof job.jobDescription !== 'string')) throw new Error('Moka detail was not verified for this job');
      if (site.ats === 'moka' && site.listJD === true && (!Object.hasOwn(job, 'listJDVerified') || job.listJDVerified !== true)) throw new Error('Moka full list JD was not verified');
      const jd = fullMoka ? normalizeJD(job.jobDescription) : null;
      const sourceStatus = (fullMoka ? job.status : job.sourceStatus) ?? null;
      if (sourceStatus !== null && (typeof sourceStatus !== 'string' || !sourceStatus.trim())) throw new Error('Invalid sourceStatus');
      if (job.channels != null && (!Array.isArray(job.channels) || job.channels.some(c => !['campus', 'social'].includes(c)))) throw new Error('Invalid channels');
      const channels = [...new Set(job.channels || [])];
      for (const field of ['recruitType', 'recruitParent']) {
        const value = job[field];
        if (value == null) continue;
        text(value, field);
        if (['校招', '校园招聘', '应届生'].includes(value) && employment !== 'internship') channels.push('campus');
        if (['社招', '社会招聘'].includes(value)) channels.push('social');
      }
      if (!channels.length) {
        if (site.ats === 'moka' && site.site === 'social') channels.push('social');
        if (site.ats === 'moka' && site.site === 'campus' && (fullMoka || employment !== 'internship')) channels.push('campus');
        if (site.ats === 'beisen' && (site.category || ['2']).length === 1) {
          if ((site.category || ['2'])[0] === '1') channels.push('social');
          if ((site.category || ['2'])[0] === '2' && employment !== 'internship') channels.push('campus');
        }
      }
      const urlFields = ['url', 'PostURL', 'jobUrl'];
      for (const field of urlFields) text(job[field], field);
      return {
        id, sourceKey: site.key, company: site.company, title, city: cityText(first(job, cityFields)),
        category: [...new Set(categoryFields.flatMap(field => categoryNames(job[field], field)))].join('/'),
        channels: [...new Set(channels)], employment, talentPlan: job.talentPlan ?? null,
        date, dateKind: date ? (fullMoka ? 'published' : job.dateKind ?? null) : null,
        url: safeUrl(first(job, urlFields)) || buildUrl(site, officialId),
        duty: jd ? jd.duty : newDirectJD ? text(job.duty, 'duty') : joinText(job, dutyFields), requirements: jd ? jd.requirements : newDirectJD ? text(job.requirements, 'requirements') : joinText(job, requireFields), description: jd ? jd.description : newDirectJD ? text(job.description, 'description') : joinText(job, descriptionFields),
        jdComplete: jd ? jd.hasContent : job.jdComplete === true, sourceStatus
      };
    } catch (error) {
      throw new Error(site.key + ' job[' + index + ']: ' + error.message);
    }
  });
}

function validTimestamp(value) {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(value) && Number.isFinite(Date.parse(value));
}

function readPublished(file) {
  if (!fs.existsSync(file)) return { version: 1, legacy: false, notices: [], companies: [], sources: [], jobs: [] };
  const content = fs.readFileSync(file, 'utf8');
  const match = content.match(/^\s*globalThis\.ANDE_DATA\s*=\s*([\s\S]*?);?\s*$/);
  if (!match) throw new Error('Baseline must be globalThis.ANDE_DATA = <JSON>;');
  const data = JSON.parse(match[1]);
  if (Object.hasOwn(data, 'parts')) throw new Error('Browser catalog is not a canonical jobs baseline');
  if (data.version !== 1 || typeof data.legacy !== 'boolean' || !Array.isArray(data.notices) || data.notices.some(n => typeof n !== 'string') || !Array.isArray(data.companies) || !Array.isArray(data.sources) || !Array.isArray(data.jobs)) throw new Error('Invalid baseline schema');
  const names = new Set(), keys = new Set(), ids = new Set();
  for (const company of data.companies) {
    if (!company || typeof company.name !== 'string' || !company.name || typeof company.initial !== 'string' || !(typeof company.aliases === 'string' || (Array.isArray(company.aliases) && company.aliases.every(a => typeof a === 'string'))) || names.has(company.name)) throw new Error('Invalid baseline company');
    names.add(company.name);
  }
  for (const source of data.sources) {
    if (!source || typeof source.key !== 'string' || !source.key || keys.has(source.key) || typeof source.company !== 'string' || typeof source.status !== 'string' || typeof source.message !== 'string' || (source.coverage != null && typeof source.coverage !== 'string')) throw new Error('Invalid baseline source');
    for (const field of ['lastSuccess', 'lastAttempt']) if (source[field] !== null && !validTimestamp(source[field])) throw new Error('Invalid baseline source timestamp');
    keys.add(source.key);
  }
  for (const job of data.jobs) {
    if (!job || JOB_FIELDS.some(field => !['category', 'sourceStatus'].includes(field) && !Object.hasOwn(job, field)) || !job.id || ids.has(job.id) || !keys.has(job.sourceKey) || !names.has(job.company)) throw new Error('Invalid baseline job identity');
    // Optional display fields may be absent in old schema-1 data; do not add keys to retained jobs.
    if (Object.hasOwn(job, 'category') && typeof job.category !== 'string') throw new Error('Invalid baseline category');
    if (job.sourceStatus != null && (typeof job.sourceStatus !== 'string' || !job.sourceStatus.trim())) throw new Error('Invalid baseline sourceStatus');
    for (const field of ['id', 'sourceKey', 'company', 'title', 'city', 'url', 'duty', 'requirements', 'description']) if (typeof job[field] !== 'string') throw new Error('Invalid baseline job text');
    if (!job.title.trim() || !Array.isArray(job.channels) || job.channels.some(c => !['campus', 'social'].includes(c)) || ![null, 'internship', 'full-time'].includes(job.employment) || ![null, true, false].includes(job.talentPlan) || typeof job.jdComplete !== 'boolean' || ![null, 'published', 'updated'].includes(job.dateKind) || (job.date !== null && (!/^\d{4}-\d{2}-\d{2}$/.test(job.date) || normalizeDate(job.date) !== job.date))) throw new Error('Invalid baseline job metadata');
    if (job.url && !safeUrl(job.url)) throw new Error('Unsafe baseline job URL');
    ids.add(job.id);
  }
  if (Object.hasOwn(data, 'unitMemberships')) {
    const memberships = data.unitMemberships, byId = new Map(data.jobs.map(job => [job.id, job]));
    if (!memberships || typeof memberships !== 'object' || Array.isArray(memberships)) throw new Error('Invalid baseline unit memberships');
    for (const [id, names] of Object.entries(memberships)) if (byId.get(id)?.sourceKey !== 'alibaba' || !Array.isArray(names) || !names.length || names.some(name => typeof name !== 'string' || !name.trim()) || new Set(names).size !== names.length) throw new Error('Invalid baseline unit membership identity/names');
  }
  return data;
}

// Same publisher, derived transport only: never change the canonical facts or clocks.
function writeBrowserData(data, dataFile, { maxBytes = 1024 * 1024 } = {}) {
  if (!Number.isSafeInteger(maxBytes) || maxBytes < 1) throw new Error('Invalid browser part size');
  const directory = path.dirname(dataFile), groups = new Map(), parts = [];
  for (const job of data.jobs) {
    const key = JSON.stringify([job.sourceKey, job.company]);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(job);
  }
  for (const jobs of groups.values()) {
    let texts = [], bytes = 2;
    const flush = () => {
      if (!texts.length) return;
      const payload = '[' + texts.join(',') + ']', id = createHash('sha256').update(payload).digest('hex');
      const file = 'parts/' + id + '.js', target = path.join(directory, file);
      const content = 'globalThis.ANDE_CHUNKS[' + JSON.stringify(id) + '] = ' + payload + ';\n';
      if (!fs.existsSync(target) || fs.readFileSync(target, 'utf8') !== content) atomicWrite(target, content);
      const descriptor = { id, file, sourceKey: jobs[0].sourceKey, company: jobs[0].company, count: texts.length, bytes: Buffer.byteLength(content) };
      if (jobs[0].sourceKey === 'alibaba' && data.unitMemberships) {
        const counts = new Map();
        for (const job of JSON.parse(payload)) for (const name of data.unitMemberships[job.id] || ['阿里校园招聘入口']) counts.set(name, (counts.get(name) || 0) + 1);
        descriptor.unitCounts = Object.fromEntries(counts);
      }
      parts.push(descriptor);
      texts = []; bytes = 2;
    };
    for (const job of jobs) {
      const text = JSON.stringify(job).replace(/</g, '\\u003c'), size = Buffer.byteLength(text) + 1;
      if (texts.length && bytes + size > maxBytes) flush();
      texts.push(text); bytes += size; // One unusually long JD stays intact, never truncated.
    }
    flush();
  }
  const catalog = { ...data, jobs: [], parts };
  atomicWrite(path.join(directory, 'catalog.js'), 'globalThis.ANDE_DATA = ' + JSON.stringify(catalog).replace(/</g, '\\u003c') + ';\n');
  return catalog; // Old hash-named parts stay valid for already-open/cached catalogs.
}

function validateSnapshot(snapshot, status, site) {
  const coverage = coverageFor(site);
  const available = snapshot?.complete === false && snapshot.verification?.policy === 'available';
  const availablePortal = availablePortals.find(portal => portal.verifiedSource(site));
  if ((availablePortal || ali.availableSource(site)) && !available) throw new Error('This source only qualifies available data, not verified completeness');
  if (snapshot?.verification?.policy === 'available' && !available) throw new Error('Available data cannot claim verified completeness');
  if (available && !availablePortal && !ali.availableSource(site) && !meituan.verifiedSource(site) && !isDeepStrictEqual(site, xiaomi.SOCIAL_PROFILE)) throw new Error('Available publication is not supported by this source');
  if (!['moka', 'beisen'].includes(site.ats) && !feishu.verifiedSource(site) && !ali.verifiedSource(site) && !ali.availableSource(site) && !meituan.verifiedSource(site) && !meituanCampus.verifiedSource(site) && !ctrip.verifiedSource(site) && !mihoyo.verifiedSource(site) && !shlab.verifiedSource(site) && !xiaomi.verifiedSource(site) && !availablePortal) throw new Error('Adapter has not been verified for completeness');
  if (!status || status.version !== 1 || status.key !== site.key || status.status !== (available ? 'available' : 'ready') || typeof status.message !== 'string' || status.coverage !== coverage) throw new Error('Source is not ready for this registry coverage');
  if (!snapshot || snapshot.version !== 1 || snapshot.key !== site.key || snapshot.complete !== (available ? false : true) || snapshot.coverage !== coverage || !validTimestamp(snapshot.completedAt) || snapshot.completedAt !== status.lastSuccess || !validTimestamp(status.lastAttempt) || Date.parse(status.lastAttempt) > Date.parse(snapshot.completedAt)) throw new Error('Snapshot metadata does not match the successful attempt');
  if (beisen.requiresVerification(site)) beisen.validateEvidence(snapshot.verification, snapshot.jobs, site);
  if (ali.requiresVerification(site)) ali.validateEvidence(snapshot.verification, snapshot.jobs, site);
  let validation;
  if (availablePortal) validation = availablePortal.validateEvidence(snapshot.verification, snapshot.jobs, site);
  if (meituan.requiresVerification(site) && !meituanCampus.verifiedSource(site)) validation = meituan.validateEvidence(snapshot.verification, snapshot.jobs, site);
  if (meituanCampus.requiresVerification(site)) meituanCampus.validateEvidence(snapshot.verification, snapshot.jobs, site);
  if (ctrip.requiresVerification(site)) ctrip.validateEvidence(snapshot.verification, snapshot.jobs, site);
  if (mihoyo.requiresVerification(site)) mihoyo.validateEvidence(snapshot.verification, snapshot.jobs, site);
  if (shlab.requiresVerification(site)) shlab.validateEvidence(snapshot.verification, snapshot.jobs, site);
  if (xiaomi.requiresVerification(site)) validation = xiaomi.validateEvidence(snapshot.verification, snapshot.jobs, site);
  return normalizeJobs(snapshot.jobs, site, { available, detailIds: validation?.detailIds });
}

function publish({ outDir = OUT_DIR, dataFile = DATA_FILE, sites = loadSites(), discardLegacy = false, reproject = false, keys = discardLegacy || reproject ? [] : sites.map(s => s.key), failedKeys = [], extendCoverage = {} } = {}) {
  const baseline = readPublished(dataFile);
  if (typeof reproject !== 'boolean' || reproject && (!keys.length || discardLegacy)) throw new Error('Reprojection requires explicit source keys and cannot retire legacy data');
  if (typeof discardLegacy !== 'boolean' || discardLegacy && (keys.length || failedKeys.length)) throw new Error('Legacy retirement must be explicit and separate from source publication');
  // Only IDs minted by the initial HTML migration, never official sourceKey:ID records.
  const retired = new Set();
  if (discardLegacy) for (const job of baseline.jobs) {
    if (!job.id.startsWith('legacy-')) continue;
    const prefix = 'legacy-' + job.sourceKey + '-';
    if (!job.id.startsWith(prefix) || !/^\d+$/.test(job.id.slice(prefix.length)) || baseline.sources.find(s => s.key === job.sourceKey)?.lastSuccess !== null) throw new Error('Initial HTML legacy identity/provenance mismatch');
    retired.add(job.id);
  }
  const selected = new Set(keys);
  const failed = new Set(failedKeys);
  if (keys.some(key => !sites.some(s => s.key === key))) throw new Error('Unknown source key');
  if (!extendCoverage || typeof extendCoverage !== 'object' || Array.isArray(extendCoverage) || Object.keys(extendCoverage).some(key => !selected.has(key) || typeof extendCoverage[key] !== 'string' || !extendCoverage[key].startsWith('registry-v1:')) || Object.keys(extendCoverage).length && (discardLegacy || reproject)) throw new Error('Scope extension requires explicit selected keys and expected old coverage; cannot retire or reproject');
  const sources = new Map(baseline.sources.map(source => [source.key, { ...source }]));
  const initialSources = discardLegacy ? baseline.sources.filter(s => s.lastSuccess === null && (s.status === 'legacy' || s.coverage === '历史个人筛选范围，待全量化')) : [];
  for (const { key } of initialSources) {
    const source = sources.get(key);
    source.status = 'unavailable';
    source.coverage = null;
    source.message = '初版HTML遗留岗位已按用户授权退出；尚未取得已验证的新快照，不表示官网无岗位或已下架';
  }
  const replacements = new Map(), unitMemberships = { ...baseline.unitMemberships };
  const errors = [];
  for (const site of sites) {
    if (!selected.has(site.key)) continue;
    const availablePortal = availablePortals.find(portal => portal.verifiedSource(site));
    const previous = sources.get(site.key);
    let status;
    try {
      const statusFile = path.join(outDir, site.key + '_status.json');
      if (!fs.existsSync(statusFile)) throw new Error('Missing source status; keeping published baseline');
      status = JSON.parse(fs.readFileSync(statusFile, 'utf8'));
      if (failed.has(site.key)) throw new Error('本轮 crawl 子进程失败或未验证，保留已发布基线');
      const snapshot = JSON.parse(fs.readFileSync(path.join(outDir, site.key + '_snapshot.json'), 'utf8'));
      let jobs = validateSnapshot(snapshot, status, site);
      if (snapshot.complete === false) {
        const merged = new Map(baseline.jobs.filter(j => j.sourceKey === site.key).map(j => [j.id, j]));
        for (const job of jobs) {
          const old = merged.get(job.id);
          // A failed/missing detail must not erase a previously usable JD.
          merged.set(job.id, old && !reproject && ![job.duty, job.requirements, job.description].some(v => v.trim()) ? old : {
            ...job, ...Object.fromEntries(['duty', 'requirements', 'description'].filter(field => old && old[field].trim() && !job[field].trim()).map(field => [field, old[field]]))
          });
        }
        jobs = [...merged.values()];
      }
      if (previous?.company && previous.company !== site.company) throw new Error('Source company changed; explicit migration required');
      // Ordinary updates remain strict. An operator-bound extension may only merge usable
      // partial data into the exact expected baseline; omissions still cannot imply removal.
      const coverageChanged = !!previous?.lastSuccess && previous.coverage !== snapshot.coverage;
      if (coverageChanged && (snapshot.complete !== false || !Object.hasOwn(extendCoverage, site.key) || extendCoverage[site.key] !== previous.coverage)) throw new Error('Published coverage changed; explicit migration required');
      if (Object.hasOwn(extendCoverage, site.key) && !coverageChanged) throw new Error('Scope extension does not match a changed published baseline');
      if (previous?.lastSuccess && (Date.parse(previous.lastSuccess) > Date.parse(snapshot.completedAt) || Date.parse(previous.lastSuccess) === Date.parse(snapshot.completedAt) && !reproject)) continue;
      if (availablePortal?.unitMemberships) Object.assign(unitMemberships, availablePortal.unitMemberships(snapshot.jobs, site));
      replacements.set(site.key, jobs);
      sources.set(site.key, { key: site.key, company: site.company, status: snapshot.complete === false ? 'available' : 'ready', lastSuccess: snapshot.completedAt, lastAttempt: status.lastAttempt, message: (status.message || '已验证完整来源快照（仅此来源范围）') + (feishu.classifiedScope(site) && !status.message.includes(feishu.CLASSIFIED_NOTICE) ? '；' + feishu.CLASSIFIED_NOTICE : '') + (feishu.portalNotice(site) && !status.message.includes(feishu.portalNotice(site)) ? '；' + feishu.portalNotice(site) : '') + (moka.portalNotice(site) ? '；' + moka.portalNotice(site) : '') + (beisen.portalNotice(site) && !status.message.includes(beisen.portalNotice(site)) ? '；' + beisen.portalNotice(site) : '') + (ali.portalNotice(site) && !status.message.includes(ali.portalNotice(site)) ? '；' + ali.portalNotice(site) : '') + (meituan.portalNotice(site) && !status.message.includes(meituan.portalNotice(site)) ? '；' + meituan.portalNotice(site) : '') + (meituanCampus.portalNotice(site) && !status.message.includes(meituanCampus.portalNotice(site)) ? '；' + meituanCampus.portalNotice(site) : '') + (ctrip.portalNotice(site) && !status.message.includes(ctrip.portalNotice(site)) ? '；' + ctrip.portalNotice(site) : '') + (mihoyo.portalNotice(site) && !status.message.includes(mihoyo.portalNotice(site)) ? '；' + mihoyo.portalNotice(site) : '') + (shlab.portalNotice(site) && !status.message.includes(shlab.portalNotice(site)) ? '；' + shlab.portalNotice(site) : '') + (xiaomi.portalNotice(site) && !status.message.includes(xiaomi.portalNotice(site)) ? '；' + xiaomi.portalNotice(site) : '') + (availablePortal && !status.message.includes(availablePortal.portalNotice(site)) ? '；' + availablePortal.portalNotice(site) : '') + (coverageChanged ? '；显式保旧扩增覆盖，原范围已发布岗位仍保留，不表示下架' : ''), coverage: snapshot.coverage });
    } catch (error) {
      errors.push(site.key + ': ' + error.message);
      const validStatus = status && status.key === site.key && ['failed', 'unverified'].includes(status.status);
      sources.set(site.key, {
        key: site.key, company: previous?.company || site.company,
        status: validStatus ? status.status : failed.has(site.key) ? 'failed' : status ? 'unverified' : 'unavailable',
        lastSuccess: previous?.lastSuccess ?? null,
        lastAttempt: status?.key === site.key && validTimestamp(status.lastAttempt) ? status.lastAttempt : previous?.lastAttempt ?? null,
        message: validStatus && typeof status.message === 'string' ? status.message : error.message,
        coverage: previous?.coverage ?? null
      });
    }
  }
  // The sole explicit exception is retirement of the initial HTML migration, not a zero snapshot.
  const retirementChanged = discardLegacy && (retired.size || baseline.legacy || initialSources.length);
  if (!replacements.size && !retirementChanged) return { code: discardLegacy ? 0 : 1, written: false, updated: [], discardedLegacy: 0, errors };
  const retained = baseline.jobs.filter(job => !replacements.has(job.sourceKey) && !retired.has(job.id));
  const jobs = discardLegacy ? retained : retained.map(job => Object.fromEntries(JOB_FIELDS.filter(field => Object.hasOwn(job, field)).map(field => [field, job[field]])));
  for (const replacement of replacements.values()) jobs.push(...replacement);
  const companies = baseline.companies.map(company => ({ name: company.name, initial: company.initial, aliases: company.aliases }));
  for (const source of sources.values()) if (!companies.some(company => company.name === source.company)) {
    companies.push({ name: source.company, initial: /^[a-z]/i.test(source.company) ? source.company[0].toUpperCase() : '#', aliases: [] });
  }
  const legacy = !discardLegacy && baseline.legacy && [...sources.values()].some(source => source.lastSuccess == null);
  const notices = ['数据范围以各注册来源的渠道、批次及接口参数为准；注册来源不等于公司全量，跨来源机会暂不合并。'];
  if ([...sources.values()].some(source => source.key === 'bytedance_social' && source.coverage?.includes('"adapter":"bytedance-classified-v1"'))) notices.push(feishu.CLASSIFIED_NOTICE);
  for (const key of ['lilith', 'lilith_social']) {
    const source = sources.get(key), site = sites.find(s => s.key === key);
    if (source?.lastSuccess && source.coverage?.includes('"portalPaths":') && feishu.portalNotice(site)) notices.push(feishu.portalNotice(site));
  }
  if ([...sources.values()].some(source => source.lastSuccess && source.coverage?.includes('"adapter":"moka-portal-v1"'))) notices.push(moka.PORTAL_NOTICE);
  if ([...sources.values()].some(source => source.lastSuccess && source.coverage?.includes('"adapter":"beisen-portal-v1"'))) notices.push(beisen.PORTAL_NOTICE);
  if ([...sources.values()].some(source => source.lastSuccess && source.coverage?.includes('"adapter":"ali-social-portal-v1"'))) {
    notices.push(ali.PORTAL_NOTICE);
    for (const site of sites) if (sources.get(site.key)?.lastSuccess && sources.get(site.key)?.coverage?.includes('"adapter":"ali-social-portal-v1"') && ali.portalNotice(site)) notices.push(ali.portalNotice(site));
  }
  for (const site of sites) if (sources.get(site.key)?.lastSuccess && sources.get(site.key)?.coverage?.includes('"adapter":"meituan-portal-v1"') && meituan.portalNotice(site)) notices.push(meituan.portalNotice(site));
  for (const site of sites) if (sources.get(site.key)?.lastSuccess && sources.get(site.key)?.coverage===coverageFor(site) && meituanCampus.portalNotice(site)) notices.push(meituanCampus.portalNotice(site));
  for (const site of sites) {
    const coverage = sources.get(site.key)?.coverage || '';
    if (!sources.get(site.key)?.lastSuccess) continue;
    if (coverage.includes('"adapter":"ctrip-portal-v1"') && ctrip.portalNotice(site)) notices.push(ctrip.portalNotice(site));
    if (coverage.includes('"adapter":"mihoyo-portal-v1"') && mihoyo.portalNotice(site)) notices.push(mihoyo.portalNotice(site));
    if (coverage.includes('"adapter":"shlab-portal-v1"') && shlab.portalNotice(site)) notices.push(shlab.portalNotice(site));
    if (coverage.includes('"adapter":"xiaomi-hr-v1"') && xiaomi.portalNotice(site)) notices.push(xiaomi.portalNotice(site));
    for (const portal of availablePortals) if (coverage === coverageFor(site) && portal.portalNotice(site)) notices.push(portal.portalNotice(site));
  }
  if (legacy) notices.push('仍含历史个人筛选基线，不是全量来源快照；历史采集时刻及当前在招状态未经核验。');
  if (jobs.some(job => !job.jdComplete || ![job.duty, job.requirements, job.description].some(value => value.trim()))) notices.push('部分岗位缺少 JD 或正文完整性尚未验证；匹配分仅基于已有文字，请前往官网查看完整信息。');
  if (jobs.some(job => job.sourceStatus && job.sourceStatus !== 'open')) notices.push('部分岗位的官网接口状态非 open，条目中已标明；实际招聘及投递可用性请以官网为准。');
  if (!legacy) notices.push('初版HTML遗留岗位不再保留；仅展示重新取得的官网岗位，可用性与完整性分别标注，首次退出不代表官网下架。');
  if ([...sources.values()].some(source => source.status === 'available')) notices.push('部分来源先发布可用岗位，尚未验证完整覆盖；缺项和采集期间变化见来源状态，不完整更新保留已有可用岗位，数量不代表官网当前在招全集。');
  if ([...sources.values()].some(source => source.status !== 'ready')) notices.push(legacy ? '部分来源失败、缺失或尚未验证，保留其已发布基线；详情见来源状态。' : '部分来源尚未取得数据；更新失败时保留已有可用版本，没有则暂不可用，不表示官网无岗位；详情见来源状态。');
  const jobIds = new Set(jobs.map(job => job.id));
  const memberships = Object.fromEntries(Object.entries(unitMemberships).filter(([id]) => jobIds.has(id)));
  const data = { version: 1, legacy, notices, companies, sources: [...sources.values()], jobs, ...(Object.keys(memberships).length ? { unitMemberships: memberships } : {}) };
  atomicWrite(dataFile, 'globalThis.ANDE_DATA = ' + JSON.stringify(data).replace(/</g, '\\u003c') + ';\n');
  writeBrowserData(data, dataFile);
  return { code: errors.length ? 1 : 0, written: true, updated: [...replacements.keys()], discardedLegacy: retired.size, errors, data };
}

module.exports = { loadSites, coverageFor, atomicWrite, normalizeJobs, normalizeDate, safeUrl, validTimestamp, readPublished, writeBrowserData, validateSnapshot, publish };
if (require.main === module) {
  try {
    const keys = process.argv.slice(2);
    if (keys.length === 1 && keys[0] === '--rebuild-browser-data') {
      if (!fs.existsSync(DATA_FILE)) throw new Error('Missing canonical data; cannot rebuild browser artifacts');
      const catalog = writeBrowserData(readPublished(DATA_FILE), DATA_FILE);
      console.log('Rebuilt browser catalog and ' + catalog.parts.length + ' parts; canonical data unchanged');
      process.exit(0);
    }
    const discardLegacy = keys.length === 1 && keys[0] === '--discard-legacy';
    const reproject = keys[0] === '--reproject';
    const result = publish(discardLegacy ? { discardLegacy: true } : reproject ? { keys: keys.slice(1), reproject: true } : keys.length ? { keys } : {});
    console.log(discardLegacy ? `Discarded initial HTML legacy jobs: ${result.discardedLegacy}; ${result.written ? 'published' : 'already retired, data unchanged'}` : result.written ? 'Published sources: ' + result.updated.join(', ') : 'No verified updates; published data unchanged');
    for (const error of result.errors) console.error(error);
    process.exitCode = result.code;
  } catch (error) {
    console.error('ERR ' + error.message);
    process.exitCode = 1;
  }
}
