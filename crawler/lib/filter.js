// 共享筛选/分类工具（可被 CLI 或 runner 复用）
// 目标口径：2027届校招全职，LLM/大模型算法 + Agent应用/LLM应用，排除实习/社招/精英计划。

// 宽关键词（候选集，标题级，宁可多抓不漏）
const KW = /大模型|智能体|Agent|agent|AIGC|算法|AI|LLM|NLP|多模态|生成式|对话|应用|推理|NPC|语音|强化学习|机器学习|预训练|后训练|RAG|具身|内容生成|工具链|Agentic|VLM|世界模型/i;

// 核心 LLM/Agent 关键词（命中判定：标题 + 岗位描述 都要看，避免「推荐算法/CV/机器人/测试」这类非 LLM 岗混入）
const CORE_KW = /大模型|LLM|语言模型|预训练|后训练|微调|SFT|RLHF|多模态|生成式|AIGC|VLM|世界模型|语音大模型|视频生成|图像生成|智能体|\bagents?\b|Agentic|\bRAG\b|Harness|NLP|自然语言|认知大模型|星火|对话系统|具身智能大模型|模型训练|模型推理|模型评测|大模型安全/i;

// 应用类特征（用户算法一般，优先应用）
const APP_KW = /应用|Agent开发|Agent平台|智能体|产品经理|产品|测试|策略|后端|全栈|平台|工具|运营|Builder|Coding|Harness|解决方案|评测|Infra|推理系统|训练系统|架构|安全攻防|数据|MaaS/i;

// 精英计划关键词（人才计划，按口径排除）。
// 注意：StepStar=阶跃校招品牌、星耀=百川校招品牌，不在此列。
const ELITE_KW = /阿里星|A\s?Star|AIDU|青云计划|快Star|TGT|技术大咖|LongCat|顶尖人才|天才少年|Top\s?Talent|π天才|蚂蚁星|无限原力|北斗计划/i;

// 明显非研发/非AI岗位（营销/职能类即使描述带 AIGC 也不是目标岗）
const NOISE_KW = /品牌经理|市场|销售|客服|行政|人力资源|HR|财务|会计|采购|法务|政府事务|商务|公关|编导|直播运营|审核/i;
function isNoise(title) { return NOISE_KW.test(title || ''); }

function isElite(title) { return ELITE_KW.test(title || ''); }
function matchAI(text) { return CORE_KW.test(text || ''); }

// 标题级 AI/算法「迹象」：描述只作佐证，标题需先有迹象、描述再确认核心词（避免「后端工程师 JD 顺带提大模型」这类边角岗混入）
const TITLE_SIGNAL = /算法|AI|Agent|智能|大模型|模型|多模态|AIGC|生成|NLP|语音|图像|视频|LLM|推理|训练|预训练|具身/i;
function matchTight(title, desc) {
  const t = title || '', d = desc || '';
  if (CORE_KW.test(t)) return true;                    // 标题直接命中核心词 → 通过
  return TITLE_SIGNAL.test(t) && CORE_KW.test(d);      // 标题有迹象 + 描述确认 → 通过
}

function classifyType(title) { return APP_KW.test(title || '') ? '应用' : '算法'; }

// 从对象里按多个候选键取值（不同 ATS 字段名不同）
function pick(obj, keys, dft) {
  if (obj == null) return dft;
  for (const k of (keys || [])) {
    if (obj[k] !== undefined && obj[k] !== null && obj[k] !== '') return obj[k];
  }
  return dft;
}

// 归一化一个岗位对象 → 统一结构 {title, type, dept, city, batch, date, url, raw}
// fields: 传入的字段映射（见各 ATS 客户端的用法）
function normalize(job, fields) {
  const f = fields || {};
  const title = String(pick(job, f.title || ['title', 'name', 'jobTitle', 'positionName', 'job_name'], '')).trim();
  let dept = pick(job, f.dept || ['department'], null);
  if (dept && typeof dept === 'object') dept = dept.name || dept.title || '';
  dept = dept || pick(job, f.deptText || ['deptName'], '') || '-';
  let city = pick(job, f.city || ['locations', 'cityList', 'workLocations', 'addressDetailList', 'city_info'], null);
  if (Array.isArray(city)) city = city.map(c => c.name || c.cityName || c.city || c).filter(Boolean).join('/');
  if (city && typeof city === 'object') city = city.name || '';
  city = city || pick(job, f.cityText || ['workPlaceName', 'cityName'], '-');
  const date = pick(job, f.date || ['publishTime', 'publish_time', 'createdAt', 'openedAt', 'updateTime'], '-');
  const url = pick(job, f.url || [], '') || '';
  const commit = pick(job, f.commitment || ['commitment', 'jobNature', 'recruitType'], '');
  const recruitParent = pick(job, f.recruitParent || [], '');
  const batch = pick(job, f.batch || ['projectName', 'batchName'], '');
  return { title, type: classifyType(title), dept: String(dept), city: String(city), date: String(date && date.slice ? date.slice(0, 10) : date), url: String(url), commit: String(commit), recruitParent: String(recruitParent), batch: String(batch), raw: job };
}

// 判断是否实习/社招（飞书/字节 recruit_type 结构：{name:"全职"/"实习", parent:{name:"校招"/"社招"/"实习"}}）
function isIntern(job) {
  const rt = job && (job.recruit_type || job.recruitType);
  if (rt && typeof rt === 'object') {
    if (rt.name && /实习/.test(rt.name)) return true;
    if (rt.parent && /实习/.test(rt.parent.name)) return true;
  }
  if (rt && typeof rt === 'string' && /实习/.test(rt)) return true;
  const rp = job && job.recruitParent;
  if (rp && typeof rp === 'string' && /实习/.test(rp)) return true;
  const c = (job && (job.commitment || job.jobNature)) || '';
  if (/实习|Intern/i.test(c)) return true;
  const t = (job && (job.title || job.name || job.jobTitle || job.job_name)) || '';
  return /实习|Intern/i.test(t);
}
function isSocial(job) {
  const rt = job && (job.recruit_type || job.recruitType);
  if (rt && typeof rt === 'object') {
    if (rt.parent && /社招|Experienced/i.test(rt.parent.name)) return true;
  }
  if (rt && typeof rt === 'string' && /社招/.test(rt)) return true;
  const rp = job && job.recruitParent;
  if (rp && typeof rp === 'string' && /社招|Experienced/i.test(rp)) return true;
  const c = (job && (job.commitment || job.jobNature)) || '';
  if (/社招|Experienced/i.test(c)) return true;
  const t = (job && (job.title || job.name || job.jobTitle || job.job_name)) || '';
  return /社招/.test(t);
}

module.exports = { KW, CORE_KW, APP_KW, ELITE_KW, NOISE_KW, TITLE_SIGNAL, isElite, isNoise, matchAI, matchTight, classifyType, pick, normalize, isIntern, isSocial };
