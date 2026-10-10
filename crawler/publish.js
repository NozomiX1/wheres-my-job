// Sole production writer: usable/complete source snapshots -> ../data/catalog.js + data/parts/.
// Never evaluates the baseline JavaScript, writes HTML, filters jobs or guesses coverage.
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { isDeepStrictEqual } = require('node:util');
const { createHash } = require('node:crypto');
const { normalizeJD } = require('./lib/jd-text');
const moka = require('./lib/moka');
const portals = require('./lib/portals');
const OUT_DIR = path.join(__dirname, 'out');
const DATA_FILE = path.join(__dirname, '..', 'data', 'catalog.js');
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

function normalizeJobs(rawJobs, site, { detailIds } = {}) {
  if (!site || !/^[a-z0-9_]+$/.test(site.key) || typeof site.company !== 'string' || !site.company) throw new Error('Invalid registry source');
  if (!Array.isArray(rawJobs)) throw new Error('Jobs must be an array');
  const portal = portals.requiring(site);
  if (portal && !portal.qualifies(site)) throw new Error(portal.unverified);
  if (portal) portal.mod.validateJobs(rawJobs, site);
  const newDirectJD = portal?.directJD(site);
  const newMokaPortal = moka.requiresVerification(site);
  if (newMokaPortal && !moka.verifiedSource(site)) throw new Error('Moka portal identity/scope/mode has not been verified');
  const titleFields = site.ats === 'moka' ? ['name', 'jobTitle', 'title'] : ['title', 'name', 'jobTitle'];
  const cityFields = site.ats === 'moka' ? ['locations', 'cityList', 'city'] : ['city', 'cities', 'city_list', 'locations'];
  const detailedMoka = site.ats === 'moka' && site.fetchDetails === true;
  const fullMoka = detailedMoka || site.ats === 'moka' && site.listJD === true;
  const dateFields = fullMoka ? ['publishedAt'] : site.ats === 'moka' ? ['createdAt', 'openedAt', 'publishTime', 'date'] : ['date', 'publish', 'publish_time'];
  const categoryFields = site.ats === 'moka' ? ['category', 'zhineng'] : ['category'];
  const descriptionFields = ['description', 'desc', 'jobDescription', 'job_description', 'JobDescription', 'summary', 'jobSummary'];
  const dutyFields = ['duty', 'descDuty', 'Duty', 'Responsibility', 'workContent', 'jobDuty'];
  const requireFields = ['requirements', 'requirement', 'descRequire', 'Require', 'Requirement', 'jobRequire', 'qualification', 'workRequire', 'positionDemand', 'serviceCondition'];
  const seen = new Set();
  return rawJobs.map((job, index) => {
    try {
      if (!job || typeof job !== 'object' || Array.isArray(job)) throw new Error('Invalid job object');
      if (portal) job = portal.mod.normalizeRecord(job, site, ...(portal.passOptions ? [{ detailIds }] : []));
      if (newMokaPortal) {
        moka.validateListJob(job, site.orgId, site.siteId);
        // Only proven native fields may supply public facts; ignore unverified aliases/canonical claims.
        const fields = ['id', 'orgId', 'title', 'locations', 'zhineng', 'commitment', 'jobDescription', 'publishedAt', 'status', 'detailVerified', 'listJDVerified', 'deptId'];
        job = Object.fromEntries(fields.filter(field => Object.hasOwn(job, field)).map(field => [field, job[field]]));
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
      const title = portal?.rawTitle(site) ? nativeTitle : nativeTitle.trim();
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

// 增量采集用：该来源已发布且 JD 完整的官网岗位 ID（只读该来源的分片）。适配器据此跳过已有详情的岗位。
function knownIds(key, file = DATA_FILE, hasDetail = job => job.jdComplete) {
  if (!fs.existsSync(file)) return [];
  const match = fs.readFileSync(file, 'utf8').match(/^\s*globalThis\.ANDE_DATA\s*=\s*([\s\S]*?);?\s*$/);
  const parts = match ? JSON.parse(match[1]).parts : null;
  if (!Array.isArray(parts)) return [];
  const prefix = key + ':', ids = [];
  for (const part of parts.filter(part => part.sourceKey === key)) {
    const text = fs.readFileSync(path.join(path.dirname(file), part.file), 'utf8');
    for (const job of JSON.parse(text.slice(text.indexOf('] = ') + 4).replace(/;\s*$/, ''))) if (hasDetail(job) && job.id.startsWith(prefix)) ids.push(job.id.slice(prefix.length));
  }
  return ids;
}

function validTimestamp(value) {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(value) && Number.isFinite(Date.parse(value));
}

function readPublished(file) {
  if (!fs.existsSync(file)) return { version: 1, notices: [], companies: [], sources: [], jobs: [] };
  const content = fs.readFileSync(file, 'utf8');
  const match = content.match(/^\s*globalThis\.ANDE_DATA\s*=\s*([\s\S]*?);?\s*$/);
  if (!match) throw new Error('Baseline must be globalThis.ANDE_DATA = <JSON>;');
  const data = JSON.parse(match[1]);
  // 数据只存一份：catalog.js（目录）＋ parts/（正文分片）。读取时把分片还原成完整 jobs。
  if (Object.hasOwn(data, 'parts')) {
    if (!Array.isArray(data.parts) || data.jobs?.length) throw new Error('Invalid browser catalog');
    data.jobs = [];
    for (const part of data.parts) {
      const text = fs.readFileSync(path.join(path.dirname(file), part.file), 'utf8');
      const chunk = JSON.parse(text.slice(text.indexOf('] = ') + 4).replace(/;\s*$/, ''));
      if (!Array.isArray(chunk) || chunk.length !== part.count) throw new Error('Browser part count mismatch: ' + part.file);
      for (const job of chunk) data.jobs.push(job);
    }
    delete data.parts;
  }
  if (data.version !== 1 || !Array.isArray(data.notices) || data.notices.some(n => typeof n !== 'string') || !Array.isArray(data.companies) || !Array.isArray(data.sources) || !Array.isArray(data.jobs)) throw new Error('Invalid baseline schema');
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

// 写 catalogFile（目录）和同级 parts/（按来源/单位切分的正文分片，内容哈希命名，先写分片后换目录）。
function writeBrowserData(data, catalogFile, { maxBytes = 1024 * 1024 } = {}) {
  if (!Number.isSafeInteger(maxBytes) || maxBytes < 1) throw new Error('Invalid browser part size');
  const directory = path.dirname(catalogFile), groups = new Map(), parts = [];
  fs.mkdirSync(path.join(directory, 'parts'), { recursive: true });
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
  atomicWrite(catalogFile, 'globalThis.ANDE_DATA = ' + JSON.stringify(catalog).replace(/</g, '\\u003c') + ';\n');
  // 不保存历史：目录换成新的之后，删除不再被引用的旧分片。
  const live = new Set(parts.map(part => path.basename(part.file)));
  for (const name of fs.readdirSync(path.join(directory, 'parts'))) if (/^[a-f0-9]{64}\.js$/.test(name) && !live.has(name)) fs.unlinkSync(path.join(directory, 'parts', name));
  return catalog;
}

function validateSnapshot(snapshot, status, site) {
  const coverage = coverageFor(site);
  const portal = portals.qualified(site);
  if (site.ats !== 'moka' && !portal) throw new Error('Adapter has not been verified');
  if (!status || status.version !== 1 || status.key !== site.key || !['ready', 'available'].includes(status.status) || // 'available' only appears in snapshots written before 2026-10-09
    typeof status.message !== 'string' || status.coverage !== coverage) throw new Error('Source is not ready for this registry coverage');
  if (!snapshot || snapshot.version !== 1 || snapshot.key !== site.key || snapshot.coverage !== coverage || !validTimestamp(snapshot.completedAt) || snapshot.completedAt !== status.lastSuccess || !validTimestamp(status.lastAttempt) || Date.parse(status.lastAttempt) > Date.parse(snapshot.completedAt)) throw new Error('Snapshot metadata does not match the successful attempt');
  const required = portals.requiring(site);
  const validation = required?.mod.validateEvidence(snapshot.verification, snapshot.jobs, site);
  return normalizeJobs(snapshot.jobs, site, { detailIds: validation?.detailIds });
}

function publish({ outDir = OUT_DIR, dataFile = DATA_FILE, sites = loadSites(), reproject = false, keys = reproject ? [] : sites.map(s => s.key), failedKeys = [], acceptShrink = [] } = {}) {
  const baseline = readPublished(dataFile);
  if (typeof reproject !== 'boolean' || reproject && !keys.length) throw new Error('Reprojection requires explicit source keys');
  const selected = new Set(keys);
  const failed = new Set(failedKeys);
  if (keys.some(key => !sites.some(s => s.key === key))) throw new Error('Unknown source key');
  const sources = new Map(baseline.sources.map(source => [source.key, { ...source }]));
  const replacements = new Map(), unitMemberships = { ...baseline.unitMemberships };
  const errors = [];
  for (const site of sites) {
    if (!selected.has(site.key)) continue;
    const previous = sources.get(site.key);
    let status;
    try {
      const statusFile = path.join(outDir, site.key + '_status.json');
      if (!fs.existsSync(statusFile)) throw new Error('Missing source status; keeping published baseline');
      status = JSON.parse(fs.readFileSync(statusFile, 'utf8'));
      if (failed.has(site.key)) throw new Error('本轮 crawl 子进程失败或未验证，保留已发布基线');
      const snapshot = JSON.parse(fs.readFileSync(path.join(outDir, site.key + '_snapshot.json'), 'utf8'));
      let jobs = validateSnapshot(snapshot, status, site);
      // 整源替换：这次取到的就是该来源现在的全部岗位。新内容里为空的正文字段不抹掉旧的非空正文（详情没取到时）。
      const old = new Map(baseline.jobs.filter(j => j.sourceKey === site.key).map(j => [j.id, j]));
      const hasDetail = portals.qualified(site)?.mod.hasDetail ?? (job => job.jdComplete); // 与增量采集共用“已有详情”的判断
      jobs = jobs.map(job => {
        const o = old.get(job.id);
        if (!o) return job;
        // 旧版 JD 完整而这次不完整（增量跳过或详情没取到）：整段正文沿用旧值（详情通常比列表更全）；
        // 否则只在新内容某字段为空时补上旧的非空值。两种情况下，详情带出的性质/计划/分类也沿用旧值。
        const jd = ['duty', 'requirements', 'description'], jdLost = hasDetail(o) && !hasDetail(job);
        const restored = jd.filter(field => o[field].trim() && (jdLost || !job[field].trim()));
        const kept = jdLost || restored.length ? ['employment', 'talentPlan', 'category'].filter(field => (job[field] == null || job[field] === '') && o[field] != null && o[field] !== '') : [];
        return restored.length || kept.length || jdLost ? { ...job, ...Object.fromEntries([...restored, ...kept].map(field => [field, o[field]])), jdComplete: job.jdComplete || o.jdComplete } : job;
      });
      // 防护：新结果少于旧数据一半，多半是被截断，拒绝替换（确属下架需显式 acceptShrink）。
      if (old.size && jobs.length < old.size / 2 && !acceptShrink.includes(site.key)) throw new Error('New result has ' + jobs.length + ' jobs, fewer than half of the ' + old.size + ' published; keeping published data');
      if (previous?.company && previous.company !== site.company) throw new Error('Source company changed; explicit migration required');
      if (previous?.lastSuccess && (Date.parse(previous.lastSuccess) > Date.parse(snapshot.completedAt) || Date.parse(previous.lastSuccess) === Date.parse(snapshot.completedAt) && !reproject)) continue;
      const memberships = portals.qualified(site)?.mod.unitMemberships;
      if (memberships) Object.assign(unitMemberships, memberships(snapshot.jobs, site));
      replacements.set(site.key, jobs);
      sources.set(site.key, { key: site.key, company: site.company, status: 'ready', lastSuccess: snapshot.completedAt, lastAttempt: status.lastAttempt, message: (status.message || '已更新（仅此来源范围）') + (moka.portalNotice(site) ? '；' + moka.portalNotice(site) : '') + portals.notices(site).filter(n => !status.message.includes(n)).map(n => '；' + n).join(''), coverage: snapshot.coverage });
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
  if (!replacements.size) return { code: 1, written: false, updated: [], errors };
  const jobs = baseline.jobs.filter(job => !replacements.has(job.sourceKey)).map(job => Object.fromEntries(JOB_FIELDS.filter(field => Object.hasOwn(job, field)).map(field => [field, job[field]])));
  for (const replacement of replacements.values()) jobs.push(...replacement);
  const companies = baseline.companies.map(company => ({ name: company.name, initial: company.initial, aliases: company.aliases }));
  for (const source of sources.values()) if (!companies.some(company => company.name === source.company)) {
    companies.push({ name: source.company, initial: /^[a-z]/i.test(source.company) ? source.company[0].toUpperCase() : '#', aliases: [] });
  }
  const notices = ['数据范围以各注册来源的渠道、批次及接口参数为准；注册来源不等于公司全量，跨来源机会暂不合并。'];
  if ([...sources.values()].some(source => source.lastSuccess && source.coverage?.includes('"adapter":"moka-portal-v1"'))) notices.push(moka.PORTAL_NOTICE);
  // 门户来源通知：先按门户分组（pass 1，按 rank），再按站点逐个（pass 2）。只统计已有成功快照且 coverage 匹配的来源。
  const hasNotice = (portal, site) => {
    const source = sources.get(site.key);
    return source?.lastSuccess && (portal.noticeMode === 'exact' ? source.coverage === coverageFor(site) : source.coverage?.includes('"adapter":"' + portal.adapter + '"')) && portal.mod.portalNotice(site);
  };
  for (const portal of portals.portals.filter(p => p.noticePass === 1).sort((a, b) => a.rank - b.rank)) {
    if (portal.groupNotice && [...sources.values()].some(source => source.lastSuccess && source.coverage?.includes('"adapter":"' + portal.adapter + '"'))) notices.push(portal.groupNotice);
    for (const site of sites) if (hasNotice(portal, site)) notices.push(portal.mod.portalNotice(site));
  }
  for (const site of sites) {
    if (!sources.get(site.key)?.lastSuccess) continue;
    for (const portal of portals.portals) if (portal.noticePass === 2 && hasNotice(portal, site)) notices.push(portal.mod.portalNotice(site));
  }
  if (jobs.some(job => !job.jdComplete || ![job.duty, job.requirements, job.description].some(value => value.trim()))) notices.push('部分岗位缺少 JD 或正文完整性尚未验证；匹配分仅基于已有文字，请前往官网查看完整信息。');
  if (jobs.some(job => job.sourceStatus && job.sourceStatus !== 'open')) notices.push('部分岗位的官网接口状态非 open，条目中已标明；实际招聘及投递可用性请以官网为准。');
  if ([...sources.values()].some(source => source.status !== 'ready')) notices.push('部分来源尚未取得数据；更新失败时保留已有可用版本，没有则暂不可用，不表示官网无岗位；详情见来源状态。');
  const jobIds = new Set(jobs.map(job => job.id));
  const memberships = Object.fromEntries(Object.entries(unitMemberships).filter(([id]) => jobIds.has(id)));
  const data = { version: 1, notices, companies, sources: [...sources.values()], jobs, ...(Object.keys(memberships).length ? { unitMemberships: memberships } : {}) };
  writeBrowserData(data, dataFile);
  return { code: errors.length ? 1 : 0, written: true, updated: [...replacements.keys()], errors, data };
}

module.exports = { knownIds, loadSites, coverageFor, atomicWrite, normalizeJobs, normalizeDate, safeUrl, validTimestamp, readPublished, writeBrowserData, validateSnapshot, publish };
if (require.main === module) {
  try {
    const keys = process.argv.slice(2);
    const reproject = keys[0] === '--reproject';
    const shrink = keys.filter(k => k.startsWith('--accept-shrink=')).flatMap(k => k.slice(16).split(',')), names = keys.filter(k => !k.startsWith('--accept-shrink='));
    const result = publish(reproject ? { keys: names.slice(1), reproject: true, acceptShrink: shrink } : names.length ? { keys: names, acceptShrink: shrink } : { acceptShrink: shrink });
    console.log(result.written ? 'Published sources: ' + result.updated.join(', ') : 'No verified updates; published data unchanged');
    for (const error of result.errors) console.error(error);
    process.exitCode = result.code;
  } catch (error) {
    console.error('ERR ' + error.message);
    process.exitCode = 1;
  }
}
