// 打分器 v3（两段式：锚点加权平均 + 负向乘法惩罚 + 职责/要求分权）。
// 相对 v2 的三个结构性修复：
//   1) 词表：补「大模型/LLM/AIGC/GPT/具身/VLA」等裸词（v2 里 167 个标题含大模型的岗被判非技术沉底）；
//      英文词加词边界，agent 裸词会被 HTTP "User-Agent" 误伤 → 计数时显式扣除 User-Agent 命中。
//   2) 负向信号从「锚点0参与平均」改为「乘法惩罚」：
//      强负向（销售/行政/策划/运营等，标题命中）→ 总分×0.1（"游戏AI策划"不再拿88分）；
//      弱负向（测试/客服/数据分析等，标题命中）→ 每处×0.85，下限×0.6。
//      与正向词重叠的负向词做扣除（"智能客服"不触发客服负向，"大模型测试"不触发测试负向）。
//   3) 职责/要求分权（解决"加分项一句话=半份JD"）：desc 拆成职责段与要求段，
//      要求段（"熟悉LLM者优先"）信号强度只有职责段的 10%，且不能独立成岗（职责/标题全无命中才算非技术）。
//      爬虫给了 descDuty/descRequire 的用结构化字段（baidu/小红书/vivo/阿里/北森系），
//      其余站按"任职要求|我们期望|加分项"等标记启发式切分。
// 公式：
//   锚点   应用100 / 算法66 / infra33（非技术不再是锚点，改为无技术命中时兜底0分）
//   侧分   = Σ(锚点×该档信号强度×词权重) / Σ(该档信号强度×词权重)   （加权平均，混合岗落在两锚点之间）
//   总分   = 标题×0.6 + 职责描述×0.4（无命中侧不参与、权重归一化），再乘负向惩罚
const fs = require('fs');
const path = require('path');

const ANCHOR = { '应用': 100, '算法': 66, 'infra': 33 };
// 标题词权重
const TITLE_W = { '应用': 3, '算法': 2, 'infra': 1 };
// 描述词权重（标题的一半）
const DESC_W = { '应用': 1.5, '算法': 1, 'infra': 0.5 };
// 职责段每档命中次数上限（防长 JD 灌水）
const DESC_HIT_CAP = 3;
// 要求段每档命中次数上限
const REQ_HIT_CAP = 2;
// 要求段信号强度系数："熟悉大模型者优先" ≠ "负责大模型研发"
const REQ_W = 0.1;
// 标题强负向：直接压到 1/10（纯职能/营销/策划/美术类）。
// 运营 排除"安全运营"（SecOps 是技术岗）；Channel 是渠道商务岗（英文 JD 里 agents=经销商）。
const STRONG_NEG = /销售|售前|市场营销|市场|品牌|公关|商务|渠道|\bChannel\b|行政|财务|会计|法务|人力|管培生|培训生|策划|编导|文案|美术|插画|动画师|原画师|特效师|编辑|记者|(?<!安全)运营|产品经理|\bBD\b/i;
// 标题弱负向：降分但不否决（技术含量存疑的方向词）
const WEAK_NEG = /(?<!智能)客服|(?<!大模型)(?<!AI)测试|运维|\bSRE\b|数据分析|交付|项目经理|实施/i;
// 弱负向每处惩罚、下限
const WEAK_NEG_MULT = 0.85;
const WEAK_NEG_FLOOR = 0.6;
const STRONG_NEG_MULT = 0.1;
// 描述侧信号密度：职责段加权命中数达到该值视为满强度（一个孤立关键词拿不到满锚点分）
const DESC_FULL_STRENGTH = 4;

// 三档正向关键词。Agent 单独处理（词边界 + 扣除 User-Agent）。
const TIERS = [
  {
    name: '应用',
    kw: /智能体|Agentic|Harness|\bRAG\b|LLM应用|大模型应用|AI应用|游戏AI|智能NPC|AI队友|AI剧情|多智能体|聊天机器人|对话机器人|智能客服|数字人|智能助手|AI助手|AI搜索|智能问答|AI测试|大模型测试|模型评测|大模型评测|数字员工/gi
  },
  {
    name: '算法',
    kw: /算法|研究员|Scientist|Researcher|预训练|后训练|微调|\bSFT\b|\bRLHF\b|强化学习|多模态|\bNLP\b|生成式|计算机视觉|语音识别|语音合成|视频生成|图像生成|推荐算法|广告算法|World Model|世界模型|\bLLMs?\b|大模型|\bGPT\b|AIGC|具身|\bVLA\b|基座模型|\bscaling\b/gi
  },
  {
    name: 'infra',
    kw: /训练框架|推理框架|推理优化|推理加速|训练系统|推理系统|\bInfra\b|Infrastructure|MaaS|大模型平台|高性能计算|高性能网络|算力|\bCUDA\b|\bGPU\b|算子|数据链路|编译器|分布式训练|分布式推理|训练平台|推理平台|训练推理|推理引擎|KVCache|向量数据库|向量检索|推理服务/gi
  }
];

// 游戏公司额外应用信号（计入应用档命中）
const GAME_APP_KW = /游戏AI|智能NPC|游戏Agent|AI队友|AI剧情/i;

// agent 计数：词边界匹配 Agents?，扣除 HTTP User-Agent 误伤
function agentHits(text) {
  const t = text || '';
  const all = (t.match(/\b[Aa]gents?\b/g) || []).length;
  const ua = (t.match(/[Uu]ser[-\s]?[Aa]gents?/g) || []).length;
  return Math.max(0, all - ua);
}

function hits(text, re) {
  const m = (text || '').match(re);
  return m ? m.length : 0;
}

// 收集命中的关键词（供网页展示，让分数可解释）
function collectWords(text, into) {
  const t = text || '';
  for (const tier of TIERS) {
    for (const m of t.matchAll(tier.kw)) {
      const w = m[0];
      into[w] = (into[w] || 0) + 1;
    }
  }
  const agents = (t.match(/\b[Aa]gents?\b/g) || []).length;
  const ua = (t.match(/[Uu]ser[-\s]?[Aa]gents?/g) || []).length;
  if (agents > ua) into['Agent'] = (into['Agent'] || 0) + (agents - ua);
}

// 统计一段文本各档命中次数（应用档含 agent 与游戏词加成，可带 cap）
function tierHits(text, cap) {
  const t = text || '';
  const out = {};
  for (const tier of TIERS) {
    let n = hits(t, tier.kw);
    if (tier.name === '应用') {
      n += agentHits(t);
      if (GAME_APP_KW.test(t)) n += hits(t, GAME_APP_KW);
    }
    out[tier.name] = cap ? Math.min(n, cap) : n;
  }
  return out;
}

// 一段文本的方向分：锚点加权平均。hasHit = 三档任一命中。
function textScore(text, weights, cap) {
  const h = tierHits(text, cap);
  let num = 0, den = 0;
  for (const tier of TIERS) {
    const w = weights[tier.name] || 0;
    num += ANCHOR[tier.name] * h[tier.name] * w;
    den += h[tier.name] * w;
  }
  const hasHit = den > 0;
  return { score: hasHit ? num / den : 0, hits: h, hasHit };
}

// desc 的职责/要求切分：优先用爬虫给的结构化字段，否则按标记启发式切。
// 团队介绍段（组织级 boilerplate，如字节"团队介绍：…面向人与agent协作…"）降到要求段同权重，
// 只有真正的职责段才算数——否则所有 AI 组织的普通研发岗都会吃满应用分。
const REQUIRE_SPLIT = /(任职要求|任职资格|岗位要求|工作要求|职位要求|基本要求|我们期望|我们希望|你将需要|你需要|要求[：:]|加分项|[Pp]referred|[Rr]equirements?|[Qq]ualifications?)/;
const INTRO_SPLIT = /(团队介绍|团队简介|部门介绍)[：:]/;
const DUTY_START = /(工作职责|岗位职责|职责描述|你将负责|职位职责|工作内容)[：:]?|\n\s*1[、.．]|\s{2}1[、.．]/;

function splitDesc(job) {
  if (job.descDuty != null || job.descRequire != null) {
    return { intro: '', duty: String(job.descDuty || ''), require: String(job.descRequire || '') };
  }
  const desc = String(job.desc || job.description || '');
  let duty = desc, require = '';
  const m = desc.match(REQUIRE_SPLIT);
  if (m) { duty = desc.slice(0, m.index); require = desc.slice(m.index); }
  // 团队介绍段单独摘出（降权用）
  let intro = '';
  const im = duty.match(INTRO_SPLIT);
  if (im) {
    const after = im.index + im[0].length;
    const dm = duty.slice(after).match(DUTY_START);
    const cut = dm ? after + dm.index : duty.length;
    intro = duty.slice(im.index, cut);
    duty = duty.slice(cut);
  }
  return { intro, duty, require };
}

// 弱负向命中数（扣除与正向短语重叠的部分）
function weakNegHits(title) {
  const t = title || '';
  const neg = (t.match(new RegExp(WEAK_NEG.source, 'gi')) || []).length;
  return neg;
}

// 主标题（负向判定用）：去掉 " - 部门/团队" 后缀，避免后缀里的
// "创意与品牌"之类团队名误杀真岗位（如 "AIGC算法工程师 - 国际化广告创意与品牌"）。
function coreTitle(title) {
  return String(title || '').split(/\s+[-—–]\s+|[-—–]\s+/)[0];
}

// 官方职位类别判定（各 ATS 自带的 job_category/职能/职位类别字段，比关键词猜可靠）。
// 有官方类别时由它定"技术/非技术"门（覆盖关键词强负向）；没有则回退关键词。
// 类别词同时并入标题文本参与档位匹配（小红书的"大模型"、B站的"AI类"这类方向标签直接生效）。
const CAT_TECH = /技术|研发|算法|工程|开发|安全|测试|数据|风控|引擎|大模型|AIGC|全栈|后端|前端|客户端|端点|多媒体|模型|研究|通信|\bAI\b|\bBI\b|Tech|Develop/i;
const CAT_NONTECH = /产品|运营|职能|市场|营销|销售|设计|美术|内容|策划|商务|文创|人力|行政|财务|法务|采购|综合|管培|项目|公关|编辑|直播|客服|Product|Marketing|Content|Operational|Operations|Service|HR/i;
function categoryIsTech(cat) {
  if (!cat) return null;
  if (CAT_TECH.test(cat)) return true;
  if (CAT_NONTECH.test(cat)) return false;
  return null;
}

// 给单条岗位打分。job 可带 descDuty/descRequire（结构化职责/要求）与 category（官方职位类别）。
function scoreJob(job, opts) {
  const title = job.title || '';
  const cat = String(job.category || '').trim();
  const { intro, duty, require: req } = splitDesc(job);

  // 官方类别并入标题文本（仅用于档位命中，不参与负向判定）
  const titleText = cat ? title + ' ' + cat : title;
  const ts = textScore(titleText, TITLE_W, 0);
  const dsDuty = textScore(duty, DESC_W, DESC_HIT_CAP);
  const dsReq = textScore(req, DESC_W, REQ_HIT_CAP);
  const dsIntro = textScore(intro, DESC_W, DESC_HIT_CAP);

  // 描述侧 = 职责段 + 要求段×0.1 + 团队介绍段×0.1；
  // 要求段/介绍段单独命中不算"该岗是技术岗"（防加分项、组织级 boilerplate 独立成岗）
  const descH = {};
  let descHasTech = false;
  for (const tier of TIERS) {
    descH[tier.name] = (dsDuty.hits[tier.name] || 0)
      + (dsReq.hits[tier.name] || 0) * REQ_W
      + (dsIntro.hits[tier.name] || 0) * REQ_W;
    if ((dsDuty.hits[tier.name] || 0) > 0) descHasTech = true;
  }
  let descNum = 0, descDen = 0;
  for (const tier of TIERS) {
    const w = DESC_W[tier.name] || 0;
    descNum += ANCHOR[tier.name] * descH[tier.name] * w;
    descDen += descH[tier.name] * w;
  }
  let descScore = descDen > 0 ? descNum / descDen : 0;

  // 描述侧信号密度因子：孤零零一个关键词（可能是顺带一提）不该拿满锚点分。
  // 加权命中数（仅职责段）达到 DESC_FULL_STRENGTH 视为满强度。
  let dutyWeighted = 0;
  for (const tier of TIERS) dutyWeighted += (dsDuty.hits[tier.name] || 0) * (DESC_W[tier.name] || 0);
  const sf = Math.min(1, dutyWeighted / DESC_FULL_STRENGTH);
  descScore *= sf;

  // 两侧加权（无命中侧不参与、权重归一化）
  let total = 0, wsum = 0;
  if (ts.hasHit) { total += ts.score * 0.6; wsum += 0.6; }
  if (descHasTech && descDen > 0) { total += descScore * 0.4; wsum += 0.4; }
  total = wsum > 0 ? total / wsum : 0;

  // 技术门：有官方类别以其为准（类别=非技术 → 视同强负向；类别=技术 → 免关键词强负向），
  // 无官方类别回退主标题关键词判定
  const catIsTech = categoryIsTech(cat);
  const strongNeg = catIsTech === false ? true : (catIsTech === true ? false : STRONG_NEG.test(coreTitle(title)));
  if (strongNeg) total *= STRONG_NEG_MULT;
  // 标题弱负向（只看主标题）：每处×0.85，下限×0.6
  const wn = weakNegHits(coreTitle(title));
  if (wn > 0 && !strongNeg) total *= Math.max(WEAK_NEG_FLOOR, Math.pow(WEAK_NEG_MULT, wn));

  // 档位标签描述的是岗位方向：标题没命中时从描述侧继承（否则"AI安全工程师 - 豆包手机助手"
  // 这类标题无档词但 JD 全是 Agent 的岗会被标成"非技术"，跟 100 分自相矛盾）；
  // 描述侧标签同样只认职责段命中（要求段 0.1 权重的"了解LLM者优先"不配定档）
  const titleTier = strongNeg ? '非技术' : (ts.hasHit ? bestTier(ts.hits, TITLE_W) : (descHasTech ? bestTier(descH, DESC_W) : '非技术'));
  const descTier = descHasTech ? bestTier(descH, DESC_W) : '非技术';

  // 信号强度（同分排序键）：标题+职责段的加权命中数
  let strength = 0;
  for (const tier of TIERS) strength += (ts.hits[tier.name] || 0) * (TITLE_W[tier.name] || 0);
  for (const tier of TIERS) strength += (dsDuty.hits[tier.name] || 0) * (DESC_W[tier.name] || 0);

  // 命中词（标题+职责段，展示用）
  const wordsInto = {};
  collectWords(titleText, wordsInto);
  collectWords(duty, wordsInto);
  const words = Object.entries(wordsInto)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([w, n]) => w + (n > 1 ? '×' + n : ''));

  return {
    total: Math.round(total * 10) / 10,
    titleScore: Math.round(ts.score * 10) / 10,
    descScore: Math.round(descScore * 10) / 10,
    titleTier,
    descTier,
    strength: Math.round(strength * 10) / 10,
    words,
    titleHits: ts.hits,
    descHits: descH
  };
}

function bestTier(hits, weights) {
  let best = '非技术', bestVal = -1;
  for (const tier of TIERS) {
    const v = (hits[tier.name] || 0) * (weights[tier.name] || 0);
    if (v > bestVal) { bestVal = v; best = tier.name; }
  }
  return best;
}

function isGameCompany(key) {
  return /hypergryph|lilith|papegames|mihoyo|netease|tme/i.test(key || '');
}

module.exports = { scoreJob, isGameCompany, ANCHOR, TIERS };

if (require.main === module) {
  const KEY = process.argv[2];
  if (!KEY) { console.log('用法: node score.js <siteKey>'); process.exit(1); }
  const src = path.join(__dirname, 'out', KEY + '_recall.json');
  if (!fs.existsSync(src)) { console.log('无召回文件 ' + src); process.exit(1); }
  const jobs = JSON.parse(fs.readFileSync(src, 'utf8'));
  const isGame = isGameCompany(KEY);
  const scored = jobs.map(j => ({ job: j, s: scoreJob(j, { isGame }) }));
  scored.sort((a, b) => b.s.total - a.s.total);
  for (const { job, s } of scored) {
    console.log(`${s.total}\t[${s.titleTier}/${s.descTier}]\t${job.title}\t标题${s.titleScore} 描述${s.descScore}`);
  }
}
