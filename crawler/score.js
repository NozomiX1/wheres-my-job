// 打分器 v2（锚点加权）：给岗位算"方向分"，实现 应用 > 算法 > infra > 非技术 的排序。
// 公式：
//   锚点值  应用100 / 算法66 / infra33 / 非技术0
//   词权重  标题：应用3 / 算法2 / infra1 / 非技术1
//   标题分 = Σ(锚点×该档信号强度) / Σ(该档信号强度)   （加权平均，混合岗自然落在两锚点之间）
//   描述分 = 同公式，但词权重折半，且每档命中次数上限 3（防长 JD 灌水）
//   总分   = 标题分 × 0.6 + 描述分 × 0.4
//   命中次数不进入主分，仅作为同分排序键（tiebreak）
const fs = require('fs');
const path = require('path');

// 锚点值（非技术是兜底档：前三档都不命中才算非技术）
const ANCHOR = { '应用': 100, '算法': 66, 'infra': 33, '非技术': 0 };
// 标题词权重
const TITLE_W = { '应用': 3, '算法': 2, 'infra': 1, '非技术': 1 };
// 描述词权重（标题的一半）
const DESC_W = { '应用': 1.5, '算法': 1, 'infra': 0.5, '非技术': 0.5 };
// 描述每档命中次数上限（防长 JD 灌水）
const DESC_HIT_CAP = 3;

// 四档关键词（非技术作为负向信号：命中即拉低分，锚点0）
const TIERS = [
  {
    name: '应用',
    kw: /Agent|agent|智能体|Agentic|Harness|LLM应用|大模型应用|AI应用|游戏AI|智能NPC|游戏Agent|AI队友|AI剧情|RAG|多智能体|聊天机器人|AI Coding|AICoding|智能助手|AI助手/i
  },
  {
    name: '算法',
    kw: /算法|研究员|Scientist|Researcher|预训练|后训练|微调|SFT|RLHF|强化学习|多模态|NLP|生成式|计算机视觉|语音识别|语音合成|视频生成|图像生成|推荐算法|广告算法|World Model|世界模型/i
  },
  {
    name: 'infra',
    kw: /训练框架|推理框架|推理优化|推理加速|训练系统|推理系统|Infra|MaaS|大模型平台|高性能计算|高性能网络|算力|CUDA|GPU|算子|数据链路|编译器|分布式训练|分布式推理|AI Infra/i
  },
  {
    name: '非技术',
    kw: /产品经理|产品|运营|营销|销售|市场|品牌|解决方案|售前|交付|策划|商务|客户|客服|编辑|美术|设计师|文案|测试|运维|SRE|数据分析|审计|财务|HR|人力资源|行政|管培生/i
  }
];

// 游戏公司额外应用信号（计入应用档命中）
const GAME_APP_KW = /游戏AI|智能NPC|游戏Agent|AI队友|AI剧情/i;

function hits(text, re) {
  const m = (text || '').match(re);
  return m ? m.length : 0;
}

// 统计一段文本四档的命中次数（可带 cap 上限）
function tierHits(text, cap) {
  const t = text || '';
  const out = {};
  for (const tier of TIERS) {
    let n = hits(t, tier.kw);
    if (tier.name === '应用' && isGameHint(t)) n += hits(t, GAME_APP_KW);
    out[tier.name] = cap ? Math.min(n, cap) : n;
  }
  return out;
}

function isGameHint(text) {
  return GAME_APP_KW.test(text || '');
}

// 计算一段文本的方向分（加权锚点平均）。
// 四档都参与加权（非技术锚点0，作为负向信号拉低分数）；
// hasHit 只看前三档是否命中（非技术词命中不算"技术命中"）。
function textScore(text, weights, cap) {
  const h = tierHits(text, cap);
  let num = 0, den = 0;
  for (const tier of TIERS) {
    const w = weights[tier.name] || 0;
    num += ANCHOR[tier.name] * h[tier.name] * w;
    den += h[tier.name] * w;
  }
  const techHit = (h['应用'] > 0) || (h['算法'] > 0) || (h['infra'] > 0);
  const hasHit = den > 0;
  return { score: hasHit ? num / den : 0, hits: h, hasHit: techHit };
}

// 给单条岗位打分
function scoreJob(job, opts) {
  const isGame = !!(opts && opts.isGame);
  const title = job.title || '';
  const desc = job.desc || job.description || '';

  const ts = textScore(title, TITLE_W, 0);
  const ds = textScore(desc, DESC_W, DESC_HIT_CAP);

  const titleHit = ts.hasHit;
  const descHit = ds.hasHit;

  // 总分固定：标题×0.6 + 描述×0.4（缺失侧记 0 分）
  const total = ts.score * 0.6 + ds.score * 0.4;

  // 双 tag：标题/描述各自按命中档判定，未命中前三档 → 该侧兜底"非技术"
  const titleTier = titleHit ? bestTier(ts.hits, TITLE_W) : '非技术';
  const descTier = descHit ? bestTier(ds.hits, DESC_W) : '非技术';

  return {
    total: Math.round(total * 10) / 10,
    titleScore: Math.round(ts.score * 10) / 10,
    descScore: Math.round(ds.score * 10) / 10,
    titleTier,
    descTier,
    titleHits: ts.hits,
    descHits: ds.hits
  };
}

function bestTier(hits, weights) {
  let best = null, bestVal = -1;
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
