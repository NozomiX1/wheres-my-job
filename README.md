# 2026 秋招 · LLM/Agent 岗位筛选

自动抓取 27 家公司校招岗位，用 **flash 模型逐岗读判**（不是关键字命中），筛出「LLM 算法 / Agent·LLM 应用」方向的校招全职岗位。

> 🌐 **在线预览**：https://nozomix1.github.io/wheres-my-job/

## 产出（直接看这两个）

| 文件 | 说明 |
|---|---|
| `2026秋招_LLM_Agent岗位总表.csv` | 汇总表：公司 / 类型 / 岗位 / 部门 / 城市 / 批次 / 发布时间 / 投递链接 |
| `index.html`（在线版） | 网页版，可搜索 / 筛选 / 排序，已部署 GitHub Pages：https://nozomix1.github.io/wheres-my-job/ |
| `2026秋招_LLM_Agent岗位筛选.html` | 本地同名副本，与 `index.html` 内容一致 |

- 口径：**2027届校招全职**；方向 = LLM/大模型算法 或 Agent/LLM 应用；**应用优先**。
- 排除：实习、社招（DeepSeek 无校招、按特例保留）、精英计划（阿里星/AIDU/天才少年/北斗 等）、纯职能营销岗。
- 类型分「应用 / 算法」两档；批次栏标实习/社招，DeepSeek 标「社招(无校招批次)」。

## 流水线（三段式）

```
① 抓取+召回（纯脚本，计划任务每天自动跑）
   crawl.js → recall.js → split_batches.js
② flash 判定（agent 派 deepseek-v4-flash 子代理逐岗读判，非全自动）
③ 汇总（纯脚本）
   write_cache.js → aggregate.js → 重建 CSV + HTML
```

增量：判定结果按「岗位 id + 内容哈希」缓存，每天只重新判定新增/变化的岗位。

## 目录

```
.
├── README.md                    ← 本文件（项目总览）
├── index.html                   ← GitHub Pages 在线版（与筛选页同内容）
├── 2026秋招_LLM_Agent岗位总表.csv
├── 2026秋招_LLM_Agent岗位筛选.html
└── crawler/                     ← 工具（含全部脚本、站点注册表、数据、缓存）
    └── README.md                ← 技术手册：怎么跑、flash 怎么调、怎么加新公司
```

## 怎么刷新

技术细节、命令、判定口径、flash 调用姿势，全部在 [`crawler/README.md`](crawler/README.md)。简要版：

```powershell
# 阶段①：抓取 + 召回 + 切批（计划任务 LLMJobsDailyRefresh 每天 08:00 自动跑，也可手动）
cd crawler
pwsh -File run_daily.ps1

# 阶段②：由 agent 派 flash 子代理判定 out/batches/ 下所有批次（见 crawler/README.md）

# 阶段③：汇总
node write_cache.js
node aggregate.js
```
