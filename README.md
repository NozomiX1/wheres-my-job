# 2026 秋招 · LLM/Agent 岗位筛选

自动抓取 31 家公司校招岗位，用**打分器**（锚点加权：应用 > 算法 > infra > 非技术）给全量岗位排序，按得分降序展示。

> 🌐 **在线预览**：https://nozomix1.github.io/wheres-my-job/

## 产出（直接看这两个）

| 文件 | 说明 |
|---|---|
| `index.html`（在线版） | 网页版，全量岗位按应用相关度得分降序，可搜索 / 筛选，已部署 GitHub Pages |
| `2026秋招_LLM_Agent岗位筛选.html` | 本地同名副本，与 `index.html` 内容一致 |

- 口径：**2027届校招全职**；方向 = LLM/大模型算法 或 Agent/LLM 应用；**应用优先**。
- 排除：实习、社招、精英计划（阿里星/AIDU/天才少年/北斗 等）、纯职能营销岗。
- 岗位按「应用相关度得分」降序展示，得分 = 锚点加权（应用100 / 算法66 / infra33 / 非技术0）。

## 流水线（两段式）

```
① 抓取（纯脚本，计划任务每天自动跑）
   crawl.js ×27 → out/<key>_raw.json 全量原始岗
② 打分+网页（纯脚本）
   score.js（锚点加权打分）→ build_score_html.js → 重建 index.html
```

> 说明：flash 逐岗读判方案暂缓（脚本保留在 `crawler/`，见 `split_batches.js` / `write_cache.js` / `aggregate.js`），当前用打分器排序替代。

## 目录

```
.
├── README.md                    ← 本文件（项目总览）
├── index.html                   ← GitHub Pages 在线版（得分降序）
├── 2026秋招_LLM_Agent岗位筛选.html
└── crawler/                     ← 工具（含全部脚本、站点注册表、数据、缓存）
    ├── crawl.js                 ← 阶段①：拉全量 → out/<key>_raw.json
    ├── score.js                 ← 打分器（锚点加权）
    ├── build_score_html.js      ← 阶段②：打分 + 生成网页
    └── README.md                ← 技术手册
```

## 怎么刷新

```powershell
cd crawler

# ① 抓取全量（计划任务 LLMJobsDailyRefresh 每天 08:00 自动跑，也可手动）
pwsh -File run_daily.ps1

# ② 打分 + 重建网页
node build_score_html.js
```

技术细节、打分算法、怎么加新公司，见 [`crawler/README.md`](crawler/README.md)。
