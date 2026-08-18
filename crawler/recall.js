// 召回：读 out/<key>_raw.json → 归一化 → 硬排除(实习/社招/精英/职能) → 宽召回 → 按相关度排序 → 每公司≤200
// 用法：node recall.js <siteKey>
// 产出 out/<key>_recall.json：[{id,title,dept,city,date,url,desc}]，desc 截断到 600 字仅供 flash 判定，不进最终表。
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { isIntern, isSocial, isElite, isNoise, pick, CORE_KW, TITLE_SIGNAL } = require('./lib/filter');

const KEY = process.argv[2];
if (!KEY) { console.log('用法: node recall.js <siteKey>'); process.exit(1); }
const registry = JSON.parse(fs.readFileSync(path.join(__dirname, 'sites.json'), 'utf8')).sites;
const site = registry.find(s => s.key === KEY);
if (!site) { console.log('未找到站点 ' + KEY + '，可用：' + registry.map(s => s.key).join(', ')); process.exit(1); }

const OUT_DIR = path.join(__dirname, 'out');
const rawFile = path.join(OUT_DIR, KEY + '_raw.json');
if (!fs.existsSync(rawFile)) { console.log('无 raw 数据，先 node crawl.js ' + KEY); process.exit(1); }
let raw = JSON.parse(fs.readFileSync(rawFile, 'utf8'));
const jobs = Array.isArray(raw) ? raw : (raw.all || raw.list || raw.jobs || []);

const fieldMaps = {
  feishu: { title: ['title'], city: ['cities'], date: ['publish'], commitment: ['recruitType'], recruitParent: ['recruitParent'], dept: ['subject', 'category'], desc: ['description', 'jobDescription'] },
  moka: { title: ['name', 'jobTitle', 'title'], dept: ['department'], city: ['locations', 'cityList'], date: ['createdAt', 'openedAt', 'publishTime'], commitment: ['commitment'], desc: ['jobDescription', 'description'] },
  beisen: { title: ['JobAdName', 'JobName', 'name', 'title'], dept: ['ClassificationOne', 'Org'], city: ['LocNames', 'WorkLocationName', 'workPlaceName', 'city'], date: ['PostDate', 'PublishTime', 'publishTime'], commitment: ['Kind', 'Commitment', 'commitment'], desc: ['Duty', 'jobDescription', 'description'] },
  custom: { title: ['title'], dept: ['dept'], city: ['city'], date: ['date'], commitment: ['commitment'], desc: ['desc'] }
};
const fm = fieldMaps[site.ats] || fieldMaps.custom;

function buildUrl(site, id) {
  if (site.linkTemplate) {
    return site.linkTemplate.replace(/\{id\}/g, id || '').replace(/\{orgId\}/g, site.orgId || '').replace(/\{siteId\}/g, String(site.siteId || '')).replace(/\{site\}/g, site.site || '');
  }
  if (site.ats === 'moka') return `https://app.mokahr.com/${site.site}-recruitment/${site.orgId}/${site.siteId}#/job/${id || ''}`;
  return '';
}

// 宽召回网：尽量不放过「疑似 AI/算法/大模型/技术」的岗位（判定交给 flash，这里只做候选集）
const RECALL_KW = /算法|AI|Agent|智能|大模型|模型|多模态|AIGC|生成|NLP|LLM|语音|图像|视频|自然语言|预训练|微调|SFT|RLHF|推理|训练|机器学习|深度学习|强化学习|对话|机器人|具身|数据|研发|开发|工程师|产品|技术|应用|Infra|MaaS|平台|工具|评测|部署|Harness|RAG|世界模型/i;
const CAP = 200;

const extra = new RegExp(site.exclude || '(?!)', 'i');
const recalled = [];
for (const j of jobs) {
  const title = String(pick(j, fm.title, '')).trim();
  if (!title) continue;
  let desc = pick(j, fm.desc, '');
  if (desc && typeof desc === 'object') desc = '';
  desc = String(desc || '');
  // 硬排除（确定性规则，无需 flash）
  if (isIntern(j) || isSocial(j)) continue;
  if (isElite(title) || isNoise(title) || extra.test(title)) continue;
  // 宽召回
  if (!RECALL_KW.test(title + ' ' + desc)) continue;

  let dept = pick(j, fm.dept, '-');
  if (dept && typeof dept === 'object') dept = dept.name || dept.title || '';
  let city = pick(j, fm.city, '-');
  if (Array.isArray(city)) city = city.map(c => (c && typeof c === 'object') ? (c.provinceName || c.name || c.cityName || c.city) : c).filter(Boolean).join('/');
  const rawDate = pick(j, fm.date, '-');
  let date = String(rawDate || '-').slice(0, 10);
  if (rawDate && Number.isFinite(Number(rawDate)) && Number(rawDate) > 1e12) date = new Date(Number(rawDate) + 8 * 3600 * 1000).toISOString().slice(0, 10);
  const id = String(pick(j, ['id', 'Id', 'JobAdId', 'jobAdId'], ''));
  const url = String(pick(j, ['url'], '') || '') || buildUrl(site, id);

  let score = 0;
  if (CORE_KW.test(title)) score += 100;      // 标题直接命中核心词
  if (TITLE_SIGNAL.test(title)) score += 40;  // 标题有 AI/算法迹象
  if (CORE_KW.test(desc)) score += 10;        // 描述命中核心词

  const trimmed = desc.slice(0, 600);
  const hash = crypto.createHash('md5').update(title + '|' + trimmed).digest('hex').slice(0, 12);
  recalled.push({ id, title, dept: String(dept || '-'), city: String(city || '-'), date, url, desc: trimmed, hash, score });
}
recalled.sort((a, b) => (b.score - a.score) || (String(b.date).localeCompare(String(a.date))));
const before = recalled.length;
const capped = recalled.slice(0, CAP).map(r => ({ id: r.id, title: r.title, dept: r.dept, city: r.city, date: r.date, url: r.url, desc: r.desc, hash: r.hash }));

fs.writeFileSync(path.join(OUT_DIR, KEY + '_recall.json'), JSON.stringify(capped, null, 2), 'utf8');
console.log('召回 ' + capped.length + '（原始候选 ' + before + ' / 全量 ' + jobs.length + '，上限 ' + CAP + '）');
