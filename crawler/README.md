# 招聘岗位爬虫 + 打分排序 工具箱（可复用）

把「逐个反爬」沉淀成一套可复用的工具。核心思路：**脚本爬取全量 → 打分器排序（应用 > 算法 > infra > 非技术）→ 网页展示**。

> **当前方案（v2，打分器）**：`crawl.js` 抓全量 → `score.js` 锚点加权打分 → `build_score_html.js` 生成得分降序网页。
> **旧方案（flash 逐岗读判，暂缓）**：脚本保留（`recall.js` / `split_batches.js` / `write_cache.js` / `aggregate.js` / `narrow.js`），见下文「flash 判定（暂缓）」章节。

## 打分算法（score.js）

给每个岗位算「应用相关度得分」，四档锚点：**应用100 / 算法66 / infra33 / 非技术0**。

- 标题分 = 加权锚点平均：`Σ(锚点×命中次数×词权重) / Σ(命中次数×词权重)`
  - 词权重（标题）：应用3 / 算法2 / infra1 / 非技术1
- 描述分 = 同公式，词权重折半，命中次数上限 3（防长 JD 灌水）
- 总分 = 标题分 × 0.6 + 描述分 × 0.4
- 混合岗（如「算法工程师-AI Agent」）因同时命中应用+算法，分数自然落在两锚点之间
- 非技术词（产品经理/运营/美术/测试…）作为负向信号（锚点0）拉低分数

## 流水线总览（当前）

```
阶段① 抓取（纯脚本，计划任务每天自动跑）
  crawl.js  →  out/<key>_raw.json           全量原始岗

阶段② 打分 + 网页（纯脚本）
  score.js           打分器（锚点加权）
  build_score_html.js  读 raw 全量打分 → 生成 index.html（得分降序）
```

### 旧流水线（flash，暂缓）

```
阶段① 抓取+召回
  crawl.js → recall.js → split_batches.js
阶段② flash 判定（agent，harness workflow，非全自动）
阶段③ 汇总
  write_cache.js → aggregate.js → 重建 CSV + HTML
```

## 目录结构

```
crawler/
├── sites.json           # 站点注册表（31 家：ATS 类型 + 接口参数 + 排除项 + 批次）
├── crawl.js             # 阶段①：node crawl.js <key>  拉全量 → out/<key>_raw.json
├── score.js             # 打分器（锚点加权：应用100/算法66/infra33/非技术0）
├── build_score_html.js  # 阶段②：读 raw 全量打分 → 生成 ../index.html（得分降序）
├── recall.js            # 旧方案：宽召回 + 硬排除 + 排序 + 200上限 → out/<key>_recall.json
├── split_batches.js     # 旧方案：切批（增量，只切需重判的）→ out/batches/<key>_NNN.json
├── write_cache.js       # 旧方案：判定写入增量缓存 out/judge_cache/<key>.json
├── merge_judge.js       # 旧方案：口径放宽时「只增不减」合并
├── narrow.js            # 旧方案：窄过滤（收窄到应用研发）
├── aggregate.js         # 旧方案：缓存+判定 → 重建 CSV + HTML
├── build_html.js        # 旧方案：CSV → 可排序/筛选 HTML
├── run_daily.ps1        # 阶段① 全量脚本（计划任务调用）
├── lib/
│   ├── cdp_capture.js   # 通用逆向：抓包(请求/响应/body)+dump DOM，找未知站接口
│   ├── moka.js          # Moka ATS（AES 解密 + 翻页）
│   ├── feishu.js        # 飞书/字节 ATS（acrawler 签名 + 翻页，支持 plain 模式）
│   ├── beisen.js        # 北森 ATS
│   ├── filter.js        # 共享筛选：关键词 + 硬排除（实习/社招/精英/职能）+ 分类
│   └── custom/          # 18 个自建站模块（见「custom 模块契约」）
└── out/
    ├── <key>_raw.json           # 全量
    ├── <key>_recall.json        # 宽召回候选（含 hash）
    ├── batches/<key>_NNN.json   # 待判定批次（每批 ≤20）
    ├── judge/partial/<key>_NNN.json  # flash 判定结果（瞬态）
    └── judge_cache/<key>.json   # 增量缓存（durable，判定唯一真相源）
```

## 快速上手（阶段①，脚本）

```powershell
cd C:\Users\fengxi01\Desktop\jobs\crawler
node crawl.js kimi        # 抓月之暗面全量 → out/kimi_raw.json
node recall.js kimi       # 宽召回 → out/kimi_recall.json
node split_batches.js kimi 20   # 切批 → out/batches/kimi_000.json
```

31 家全部接入。`node crawl.js <key>` 即可复跑任意一家；四类 ATS（moka/beisen/feishu/custom）都已在 `crawl.js` 里调度。

## 阶段② flash 判定（给未来 agent 的操作手册）

> 关键：flash 只在 harness 里能调（走 workflow 工具派子代理），普通 Node 脚本调不了。所以阶段②由 **agent** 执行，不在计划任务里。

### 调 flash 的正确姿势
- 在 harness 的 **workflow** 工具里，用 `agent(prompt, { model: 'deepseek-v4-flash' })` 派子代理。
- **不要带 `provider`**（实测带 `Comaker` 会返回 null；只给 `model:'deepseek-v4-flash'` 即可）。
- 子代理有 `read`/`write` 工具，能直接读批次文件、写判定结果文件。

### 判定工作流脚本模板
```js
// workflow 工具：meta 见工具参数；args 传 { companies:[{key,n},...] }
const base = 'C:\\Users\\fengxi01\\Desktop\\jobs\\crawler\\out\\batches\\';
const outBase = 'C:\\Users\\fengxi01\\Desktop\\jobs\\crawler\\out\\judge\\partial\\';
const batches = [];
for (const c of args.companies) for (let i = 0; i < c.n; i++) batches.push(c.key + '_' + String(i).padStart(3, '0'));

function prompt(batch) {
  const file = base + batch + '.json', outFile = outBase + batch + '.json';
  return `你是校招岗位筛选助手。按三步做：
1. 用 read 读取文件 ${file}（JSON 数组，每项含 id/title/dept/city/date/url/desc）。
2. 对【每一个】岗位逐条判断是否符合口径（见下「判定口径」）。
3. 用 write 把结果写成 JSON 数组写到 ${outFile}，每项 {"id":"<id>","fit":true或false,"type":"应用或算法","reason":"一句话理由"}（fit=false 时 type 填 "算法"）。
完成后只回一行：OK N条 fit=M。`;
}

const results = [];
const WAVE = 18;   // 每波并发 18 个子代理，多波串行，避免撞并发上限
for (let i = 0; i < batches.length; i += WAVE) {
  const r = await parallel(batches.slice(i, i + WAVE).map(b => async () => {
    const out = await agent(prompt(b), { model: 'deepseek-v4-flash' });
    return { b, reply: out === null ? 'FAILED' : String(out).slice(0, 120) };
  }));
  results.push(...r);
}
return results;   // 检查哪些 reply=FAILED，单独重跑
```

### 判定口径（写死在 prompt 里，逐条判断）
- 目标：**2027届校招全职**，方向为「LLM/大模型算法」「Agent 应用 / LLM 应用」或「游戏 AI / 游戏 Agent / 智能 NPC」。
- type 分类：
  - Agent开发/LLM应用/大模型平台/评测/部署/数据/产品/AI Infra → `应用`；
  - 大模型算法/预训练后训练微调/多模态/生成式/NLP/语音图像视频生成/强化学习(LLM方向) → `算法`；
  - 游戏 AI / 游戏 Agent / 智能 NPC（LLM/NPC 对话、AI 队友、AI 剧情、游戏智能体等）→ `应用`（明确是游戏 AI 模型/算法研发则 `算法`）。
- 不符合（`fit=false`）：推荐/搜广推/广告算法、传统CV、风控、非大模型机器人、与 LLM 无关的纯前后端/运维/测试/数据分析、纯传统算法、AIGC美术/设计（纯美术岗，非 AI 应用）等。
- 只依据 title + desc 判断，不臆测；每条都要有结论。

### 失败重跑
- 偶发单批 `FAILED`：单独再派一个子代理跑该批即可。
- **字节跳动批次若 desc 全空**（CDP 只抓到标题），flash 可能反复失败——改用「标题内联进 prompt + schema 返回」的方式重判（见下例），再把结果手动写到对应 partial 文件：

```js
const schema = { type:'object', properties:{ verdicts:{ type:'array', items:{ type:'object',
  properties:{ id:{type:'string'}, fit:{type:'boolean'}, type:{type:'string'}, reason:{type:'string'} },
  required:['id','fit'] } } }, required:['verdicts'] };
const r = await agent(`你是校招岗位筛选助手。以下是岗位列表（每行 "id | 标题"，无描述，按标题判断）：
<id1> | <标题1>
...
逐条判断（口径同上）。严格返回 {"verdicts":[{"id":"...","fit":true或false,"type":"应用或算法","reason":"..."}]}`,
  { model: 'deepseek-v4-flash', schema });
```

## 增量缓存（省钱的精髓）

- `recall.js` 给每条候选打 `hash = md5(title + '|' + desc前600字)`。
- `split_batches.js` 默认**跳过「缓存里 hash 未变」的岗位**，只切需要重判的（`--full` 强制全量重切）。它会顺带清掉旧的 batches 和 partial。
- `write_cache.js` 把本次判定写入 `out/judge_cache/<key>.json`（`{ "<id>": {hash, fit, type, reason} }`）。
- `aggregate.js` 读 **缓存 + 本次判定批次**（批次覆盖缓存）→ 只留 `fit=true` → 重建 CSV + HTML。缓存是判定唯一真相源，partial 是瞬态的。

于是每天只有「新增 / 内容变化」的岗位需要重新 flash 判定，其余复用缓存。

### 口径变更（放宽）时怎么重判

口径只会**放宽**（例如把「游戏 AI / 智能 NPC」也收进来），不会变严。flash 有随机性，全量重判会让无关岗位也跟着抖动（误砍已收录的岗）。所以放宽口径的正确姿势是「只增不减」：

```powershell
# ① 全量重切（强制）
node split_batches.js <key> 20 --full    # 31 家都跑一遍

# ② agent 用【新口径】跑判定工作流，覆盖 out/judge/partial/

# ③ 合并：旧缓存 fit=true 一律保留，新判定只用来追加 fit=true
node merge_judge.js

# ④ 清空 partial（已并入缓存，避免 aggregate 用旧批次覆盖）+ 重建
Remove-Item out\judge\partial\*.json -Force
node aggregate.js
```

> 注意：flash 子代理偶尔会把结果写成 `xxx_pretty.json` / `_xxx_pretty.json` 之类错名文件（而不是 prompt 指定的精确路径）。收尾时清掉这些 `*pretty*` 副本即可；正确文件都在，只是多了份冗余。

## 每日流程（完整）

```powershell
# ① 计划任务 LLMJobsDailyRefresh 每天 08:00 自动跑（抓取+召回+切批）：
#    crawl.js ×27 → recall.js ×27 → split_batches.js ×27，日志 log/daily_*.log
# ② agent（harness）跑上节「判定工作流」，判定 out/batches/ 下所有批次
# ③ 收尾脚本：
node write_cache.js     # 判定并入缓存
node aggregate.js       # 重建 CSV + HTML
```

计划任务管理：

```powershell
Get-ScheduledTask LLMJobsDailyRefresh
Start-ScheduledTask LLMJobsDailyRefresh   # 手动触发一次
Set-ScheduledTask -TaskName LLMJobsDailyRefresh -Trigger (New-ScheduledTaskTrigger -Daily -At 09:00)
Unregister-ScheduledTask LLMJobsDailyRefresh
```

## 给一家【新公司】加爬虫

### 第 0 步：判断它用哪个 ATS
打开校招页 F12 → Network，看职位列表请求的域名：
- `app.mokahr.com/.../jobs/v2` → **Moka**（见 ①）
- `*.jobs.feishu.cn` / `jobs.bytedance.com` / `hr-jobs.sensetime.com` → **飞书/字节**（见 ②）
- `*.zhiye.com` → **北森**（见 ③）
- 其它自建 → **custom**（见 ④）

### ① Moka 站
1. 从页面找 `orgId` / `siteId` / `site`(campus|social)；解密 IV 从页面 init-data 的 `aesIv` 取（多数是全局 `de7c21ed8d6f50fe`）。
2. `sites.json` 加一条 `{"ats":"moka","orgId":...,"siteId":...,"site":"campus","aesIv":...}`。
3. `node crawl.js <key>`。加密响应会自动 AES-128-CBC 解密并翻页拉全量。

### ② 飞书/字节站
1. `lib/cdp_capture.js <岗位列表页URL> cap_xxx`，从输出找 `/api/v1/search/job/posts` 的 `portal_type`、`subject_id_list`，以及 acrawler 的 `aid`（页面里搜 `byted_acrawler.init({aid:...})`）。
2. `sites.json` 加 `{"ats":"feishu","url":...,"aid":...,"websitePath":"campus","subjectIdList":[...]}`。
3. `node crawl.js <key>`。脚本在无头 Chrome 里注入 acrawler、签名后翻页（普通 Node fetch 会被 405，必须走页面内签名）。

### ③ 北森站
1. `cdp_capture.js` 找 `GetJobAdPageList` 接口，确认 `Category`（校园招聘通常是 `["2"]`）。
2. `sites.json` 加 `{"ats":"beisen","api":"https://xxx.zhiye.com/api/Jobad/GetJobAdPageList","category":["2"]}`。
3. `node crawl.js <key>`（纯 JSON，直接翻页）。

### ④ 自建站（custom）
统一契约见 `lib/custom/_template.js`：

```js
// lib/custom/<key>.js
async function fetchAll() {            // 翻页拉全量 + 归一化
  return [{ title, dept, city, date, url, desc, commitment, id }];
}
module.exports = { fetchAll };
// 作为 CLI 运行时：写入 out/<key>_raw.json 并打印 raw=N
```

新增自建站步骤：
1. `node lib/cdp_capture.js <职位列表页URL> cap_xxx` 抓出列表接口的 URL/请求体/请求头。
2. 复制 `_template.js` 写成 `lib/custom/<key>.js`，实现 `fetchAll()`。
3. `sites.json` 加 `{"ats":"custom", ...}`，`node crawl.js <key>` 验证。
4. 把 key 加进 `run_daily.ps1` 的 `$siteKeys`。

接口归一化字段约定：`date` 用 `YYYY-MM-DD`；`desc` 务必带岗位描述原文（flash 判定靠标题+描述读岗，漏了会漏判）；`commitment` 用 `全职/实习/社招`。

## 召回/硬排除口径（lib/filter.js，阶段①）

- **宽召回 `RECALL_KW`**（recall.js 内）：尽量不放过「疑似 AI/算法/大模型/技术」的岗，判定交给 flash。
- **硬排除**（recall.js 内，确定性规则不用 flash）：实习（`isIntern`）、社招（`isSocial`）、精英计划（`isElite` + 每站 `sites.json.exclude`）、职能/营销岗（`isNoise`）。
- **排序**：标题核心词(100) > 标题迹象(40) > 描述核心词(10) > 时间新；每公司截前 200。

## 已知特殊站点
- **字节跳动**：全量分页过大且逐页签名过慢，改用「关键词搜索 + CDP 抓页面自身签名响应」(`lib/custom/bytedance.js`)。部分岗位 desc 为空（见上「失败重跑」）。
- **MiniMax**：`plain` 模式（页面无 acrawler），签名校验偶发收紧时抓取失败→`crawl.js` exit 1→无 raw→recall 为 0→保留基线旧数据。
- **鹰角网络**：Moka ATS 但用自定义域名 `jobs.hypergryph.com`，单独走 `lib/custom/hypergryph.js`。
- **华为**：JD 是占位符（"详见岗位意向"），flash 只能按标题判（如「AI Infra工程师」）。
- **莉莉丝/叠纸/米哈游/网易/鹰角**：游戏公司，收「游戏 AI / 智能 NPC / 游戏 Agent」为应用类；纯美术/客户端/服务器开发仍不收。
- **DeepSeek**：无校招、只有社招（`batch` 标「社招(无校招批次)」），按特例保留，不剔除。

## HTML 筛选页 + GitHub Pages 部署

`node build_html.js`（或 `aggregate.js` 会自动调用）生成 `../2026秋招_LLM_Agent岗位筛选.html`——单文件、自包含（数据内嵌）、无外部依赖：

- 全局搜索 + 公司/类别/批次下拉筛选 + 「只看应用类」开关 + 重置；
- 点表头排序（默认应用类优先、发布时间新→旧）；
- 实习/社招带红黄角标提醒，投递链接新标签打开。

部署到 GitHub Pages：把该 HTML 放进仓库，`Settings → Pages → Deploy from a branch` 即可；放根目录并改名 `index.html` 则直接以站点首页访问。每次 `aggregate.js` 后 HTML 同步更新，`git push` 即可发布。

## 环境依赖
- Node.js ≥ 18（自带 fetch + WebSocket）。
- 无头 Chrome（默认 `C:\Program Files\Google\Chrome\Application\chrome.exe`，可用环境变量 `CHROME_PATH` 覆盖）。
- 无需 npm 依赖。Windows 下 curl 别用（schannel 证书问题），统一用 Node fetch / Chrome。

## 产出

- `../2026秋招_LLM_Agent岗位总表.csv` —— 汇总表（公司/类型/岗位/部门/城市/批次/发布时间/投递链接）。
- `../2026秋招_LLM_Agent岗位筛选.html` —— 可筛选/排序网页版（GitHub Pages 用）。
- 每公司判定明细（含 flash 的 `reason`）在 `out/judge_cache/<key>.json`。
