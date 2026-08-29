// 窄过滤（阶段①的可选收窄步骤）：读 out/<key>_recall.json，只砍「标题明确属于」算法/infra/非研发的岗。
// 设计哲学：只做强信号排除，标题模糊的一律放行给 flash（flash 才是最终裁决）。
// 产出：
//   out/<key>_narrow.json                    保留岗（透传原字段，供 split_batches 切批）
//   out/judge/partial/<key>_narrow.json      被砍岗 → fit=false（write_cache 会置 cache 为 false，避免旧 fit=true 泄漏）
// 用法：node narrow.js <siteKey>
const fs = require('fs');
const path = require('path');

const KEY = process.argv[2];
if (!KEY) { console.log('用法: node narrow.js <siteKey>'); process.exit(1); }

const OUT_DIR = path.join(__dirname, 'out');
const src = path.join(OUT_DIR, KEY + '_recall.json');
if (!fs.existsSync(src)) { console.log('无召回文件，先 node recall.js ' + KEY); process.exit(1); }
const jobs = JSON.parse(fs.readFileSync(src, 'utf8'));

// ---- 砍词（标题级强信号，命中即砍）----
// 算法类：预训练/后训练/微调/RL/多模态/NLP/生成式/视觉/推荐/语音图像视频生成/研究岗
const CUT_ALGO = /算法|研究员|预训练|后训练|微调|SFT|RLHF|\bRL\b|强化学习|多模态|NLP|自然语言|生成式|深度学习|机器学习|计算机视觉|推荐算法|推荐系统|广告算法|搜广推|风控|Post-Training|Pretrain|Algorithm|Researcher|Scientist|语音识别|语音合成|视频生成|图像生成/i;
// infra 类：训练/推理系统、AI Infra、MaaS、平台基建、算力、算子、数据链路、评测、部署
const CUT_INFRA = /训练框架|推理框架|推理优化|推理加速|训练系统|推理系统|Infra|MaaS|大模型平台|高性能计算|高性能网络|算力|存储|CUDA|GPU|算子|数据链路|评测|部署|编译器/i;
// 非研发：产品/运营/营销/销售/市场/设计/美术/内容等（只收研发类应用岗）
const CUT_NONDEV = /产品经理|产品|运营|营销|销售|市场|品牌|解决方案|售前|交付|策划|商务|客户|客服|编辑|美术|设计师|文案/i;
// 应用方向豁免：标题带这些词时，不因「算法/研究员」砍掉（游戏 AI Agent/智能 NPC/Harness 归应用，优先于算法字样）
const AGENT_EXEMPT = /Agent|智能体|NPC|Harness|Agentic/i;

function cutReason(title) {
  const t = title || '';
  // 应用豁免：Agent/智能体/NPC/Harness 岗 → 放行给 flash（infra/非研发仍砍）
  if (AGENT_EXEMPT.test(t)) {
    if (CUT_INFRA.test(t)) return 'infra类';
    if (CUT_NONDEV.test(t)) return '非研发类';
    return '';
  }
  if (CUT_ALGO.test(t)) return '算法类';
  if (CUT_INFRA.test(t)) return 'infra类';
  if (CUT_NONDEV.test(t)) return '非研发类';
  return '';
}

const keep = [];
const cut = [];
for (const j of jobs) {
  const why = cutReason(j.title);
  if (why) cut.push({ id: String(j.id), fit: false, type: '应用', reason: '窄过滤: ' + why + '（标题命中）' });
  else keep.push(j);
}

// 保留岗透传给 split_batches
fs.writeFileSync(path.join(OUT_DIR, KEY + '_narrow.json'), JSON.stringify(keep, null, 2), 'utf8');
// 被砍岗写入 partial（fit=false），让 write_cache 覆盖旧 cache
const partialDir = path.join(OUT_DIR, 'judge', 'partial');
fs.mkdirSync(partialDir, { recursive: true });
fs.writeFileSync(path.join(partialDir, KEY + '_narrow.json'), JSON.stringify(cut, null, 2), 'utf8');

console.log('窄过滤 ' + KEY + '：总 ' + jobs.length + ' → 保留 ' + keep.length + '（交 flash）/ 砍 ' + cut.length + '（fit=false）');
