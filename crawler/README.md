# 安得采集工具

原生 CommonJS / Node.js 22+，不调用 LLM。采集不按求职者方向删岗，关键词排序只在浏览器完成。[现行规格](../SPEC.md) · [阶段结果](../PROCESS.md)。总原则：官网数据可信，只保留最低检查（见 [AGENTS.md](../AGENTS.md)）。

## 流程

```text
sites.json（唯一来源登记）
  → update.js 调用 crawl.js（子进程跑适配器；同一官网串行、不同官网并行最多 4 个，开 Chrome 的来源同时只跑 1 个）
  → <key>_snapshot.json（可发布快照）
  → publish.js 规范化并整源替换
  → ../data/catalog.js ＋ ../data/parts/*.js
  → ../server/index.js 读入内存，按查询打分排序，浏览器每次只取一页
```

```sh
node crawler/update.js papegames vivo         # 采集并发布；仅明确授权的 keys，部分失败返回非零
node crawler/update.js --full xiaomi_social   # 强制全量重取详情（默认增量，见下）
node crawler/crawl.js papegames               # 仅采集，不发布
node crawler/publish.js papegames             # 仅发布该来源的新快照
node crawler/publish.js --reproject huawei    # 用已有快照在同一采集时刻重新投影
node crawler/publish.js --accept-shrink=kuaishou   # 确认大幅下架后放行（见下）
```

无参数的 `update.js` 会遍历全部来源，不作日常检查。

## 采集与发布规则

工作文件在被 Git 忽略的 `out/`：`<key>_raw.json`（当前候选）、`<key>_snapshot.json`（可发布快照，含采集时刻与证据）、`<key>_status.json`（最近尝试、状态 ready／failed／unverified、问题记录）、`crawl-issues.jsonl`。

- 采集成功 = 适配器取到至少一个岗位且 `total` 与岗位数一致。失败、列表中途出错、零岗位都不改已发布数据。
- 采集成功即**整源替换**，没取到的岗位下架，不保存历史；新结果少于已发布一半时拒绝，确属下架用 `--accept-shrink=<key>`。新结果某个 JD 字段为空时不抹掉旧的非空 JD。
- 失败的来源保留上次数据和真实采集时间；整体命令仍返回非零。文件用临时文件＋rename 写入；同一来源不要同时跑多个更新。
- `out/` 只是本机快照，不是 Actions runner 的持久存储。

## 增量与日志

- **增量**：`crawl.js` 把该来源已发布且 JD 完整的官网 ID 写进 `out/<key>_known.json`，经环境变量 `ANDE_KNOWN_IDS` 交给适配器（`lib/known.js`）；适配器对这些 ID 跳过详情请求，列表仍完整扫描，所以新增和下架照常识别。详情没取到的岗位发布时沿用旧 JD、性质与计划。已接入：小米三个来源（社招 33 分钟→约 1 分钟）、美团社招与校园（13 分钟→约 1 分钟）、米哈游校园与社招。**华为校园的岗位意向**：官网一个岗位可含多个“岗位意向”（各有自己的职责、要求和地点，候选人先选意向才看到），适配器导出 `expand`，`normalizeJobs` 在发布前把多意向的岗位拆成每个意向一条（标题 `岗位（意向名）`，ID `广告号-意向号`，只有 0 或 1 个意向的保持 `广告号`）；原始快照仍是岗位级，证据校验不变。多意向的岗位增量时不会被跳过（已发布 ID 对不上），每次重取；某一轮没取到详情/意向时，发布会保留它旧的拆分记录（ID 以 `岗位ID-` 开头），不让没有正文的岗位级记录顶替。

腾讯、华为（旧门户）也已接入：它们的 `jdComplete` 恒为 false，所以适配器自己导出 `hasDetail(job)` 作为“已取得详情”的标志（腾讯看 `description`，华为校园看 `description`、社招看 `requirements`；华为详情与列表同文），增量采集和发布合并共用这个标志。**未接入**：Moka 详情模式（发布层要求每岗位带 detailVerified，需另改规则，等批量 Moka 来源进来再做）。发布时若详情没取到而旧版已有详情，整段正文、性质、计划、分类和 jdComplete 都沿用旧值；否则只在新内容某字段为空时补上旧的非空值。定期用 `--full` 刷新一次，避免岗位正文改了却一直沿用旧的。
- **日志**：`update.js` 每次运行写 `out/logs/update-<时间>.log`（含全部子进程输出，每行带 `[来源]` 前缀），并在 `out/logs/runs.jsonl` 为每个来源追加一行（起始时间、秒数、退出码）。采集有问题先看这里，再看 `crawl-issues.jsonl`。
- **并发**：同一官网（取主机名最后两段）串行，不同官网最多 4 路并行，开 Chrome 的来源同时只跑 1 个。

## 数据分发（Release）

`.github/workflows/crawl.yml`（定时＋手动）：取回 Release 上的 `data.tar.gz` 当基线 → `update.js`（每周日全量，其余增量；个别来源失败不阻止上传）→ `pack-release.js` 打包并先后上传 `data.tar.gz`、`data-meta.json` → 若有来源超过 36 小时没成功更新（`check-fresh.js`）让运行失败以触发 GitHub 邮件。每天 16:00（北京时间）另有一次补采：`check-fresh.js --retry 18` 选出超过 18 小时没成功更新、且已发布 message 不以“官网拒绝；”开头的来源重跑（这是为了换一台新运行器；`update.js` 把本轮被官网拒绝的来源传给 publish，publish 在其 message 前加这个标记），没有这样的来源就直接结束。标签由仓库变量 `DATA_TAG` 决定（默认 `data-candidate`）；有标签就必须取到基线才继续，否则失败，避免失败的来源凭空消失。工作流只响应定时和手动触发，运行日志是公开的。`deploy/pull.sh` 是消费方：meta 的 sha256 变了才下载，校验后用 `validate-data.js` 检查岗位数不少于现有一半，再改名替换（保留两份旧数据）并重启。公开仓库 60 天无活动时定时任务会被 GitHub 自动停用。

- **腾讯 Workday 详情**：腾讯部分岗位的正文在第三方 Workday 站点。单个岗位返回 403＋`{"errorCode":"S22","message":"permission denied"}`（该岗位匿名不可见，同站其余岗位照常 200）时跳过它、继续下一个并在说明里记数；连续 100 个都是 S22（已下线的岗位常成片出现）或任何其它拒绝（回应读不出、非 S22 的 4xx）仍立即停止。另外，回应是 200 但个别岗位没通过校验（例如回应里的规范网址与列表链接的城市写法不同，如 `UK-London` 对 `United-Kingdom-London`）时也只跳过这一个（说明里记数），连续 20 个才停止；网络错误照旧立即停止。被跳过的岗位沿用已发布的旧正文。

## 失败处理流程

由浅入深，前两层不需要人：
1. **自动**：请求级重试（5 秒、30 秒）→ 整轮结束后补采（5 分钟、15 分钟，官网拒绝除外）→ 仍失败的来源保留已发布的旧数据。
2. **看提醒**：有来源超过 3 天没成功更新，`crawl` 工作流会失败，GitHub 发邮件；运行页的汇总表列出各来源状态。
3. **换时间、换出口再试**：Actions 里手动触发 `crawl`，在 `keys` 里只填失败的来源（可勾选 `full`）。临时的跨境网络问题通常换个时间就好。
4. **本机兜底**：Actions 上一直不行时在本机采集，合并进正式数据：`sh deploy/crawl-local.sh <来源key>...`（必须明确给出 key）。它会先确认 Actions 没在采集，取回 `data` 作基线（取不到就失败），在独立临时目录里只采这些来源，打印采集前后各来源岗位数，确认后先传 `data.tar.gz`、再传 `data-meta.json`；服务器 10 分钟内自动拉取。`ANDE_DRY_RUN=1` 只采集汇总不上传，`ANDE_YES=1` 跳过确认。**同一时间只能有一个写入者**，用它之前先看 Actions 没有在跑。
5. **系统性的问题**才改适配器：先看日志、必要时用隔离浏览器匿名抽样几个岗位页，弄清原因，补测试再推送（例：腾讯 Workday，见 PROCESS.md）。

## 适配器

自研门户统一登记在 `lib/portals.js`（`crawl.js`／`publish.js` 只遍历登记表），模块导出 `requiresVerification／verifiedSource／portalNotice／validateJobs／validateEvidence／normalizeRecord`。新增门户只在登记表加一项，模板见 `lib/custom/_template.js`（默认报未实现，不返回伪造空结果）。

- **单轮采集**（共用 `lib/paginate.js`：任何一页出错或触顶就整次失败；坏记录、total 不符只记入 `issues`，详情尽力获取，403／412／429 立即停详情只用列表文字）：小米（校招、社招、实习）、携程、米哈游、上海AI实验室、七个阿里社招门户、飞书（字节与各 SaaS 门户，需要 Chrome，`CHROME_PATH` 可指定）、北森（讯飞／vivo 校招）、美团（社招／校园）。
- **旧门户**（保留原来较严的证据合同，哪个出问题再放宽）：OPPO、腾讯、快手、百川、网易、雷火、百度、蚂蚁、B站、TME、京东、vivo 社招、华为、小红书、阿里巴巴校园；阿里云社招另有独立资格。它们中途失败时仍带 `stopped` 证据返回部分结果，由 `crawl.js` 用 `portals.listStopped` 判断：列表阶段出错或触顶就整次不上架，详情阶段出错只记录。
- Moka 来源（阶跃、Kimi、智谱、DeepSeek、鹰角等）走各自共享协议模块，细节见对应适配器与测试。

## 发布数据契约

- `data/catalog.js`（目录：来源、公司、通知、分片清单）＋ `data/parts/<sha256>.js`（完整岗位，按来源／公司分组、每片≤1MiB、内容哈希命名）是唯一公开数据。publisher 读取时从分片还原基线，发布后删除不再被引用的旧分片。
- 搜索服务（`server/index.js`）读取这些分片到内存，浏览器只取目录和一页结果，不下载分片，也不请求招聘官网。
- 岗位字段：`id,sourceKey,company,title,category,city,channels,employment,talentPlan,url,duty,requirements,description,jdComplete,sourceStatus`，另有可选的 `employer`（官网给出的业务线，如网易的 productName，显示用）、`department`（官网列表里的部门名，只显示）、`experience` / `education`（官网结构化的经验、学历要求，发布时统一成「3-5年」「本科及以上」，优先于 JD 提取）、`batch`（招聘批次/项目名，用来认「XX届」）、`publishedAt` / `updatedAt`（官网发布、更新日期，适配器把官网的原始时间原样交出，发布时统一按北京时间换成 `YYYY-MM-DD`）、`firstSeen`（本站首次发现日期，发布时写入）。来源上另有 `history`（近 14 天每次发布的新增/减少条数）。ID 为“来源 key＋官方 ID”，不跨来源合并；正文不截断；只承认官网明确给出的事实，未知保持 null；非法协议链接禁用。下架的来源在 `sites.json` 的 `retired` 里列 key，发布时会把它们的岗位和只属于它们的公司从发布数据里去掉。
- 来源状态：`ready` 有数据、`failed` 本次失败、`unverified` 尚未接入、`unavailable` 暂无数据。
- 范围和字段语义只属于登记的入口，不代表公司全球全集。

## 重试与问题记录

- `lib/retry.js`：只对临时性错误重试——网络错误／超时、HTTP 5xx、408，每个请求最多再试 2 次（间隔 5 秒、30 秒）；403／412／429 等其它 4xx、重定向、验证页一律不重试。`crawl.js` 通过 `NODE_OPTIONS=--require=lib/retry-preload.js` 给适配器子进程的全局 fetch 加上该重试；飞书的页面内请求直接用 `withRetry`。子进程把 `[retry] ...` 写到 stderr，`crawl.js` 计数。
- **补采**（`update.js`，命令行默认开启，`--no-retry` 关闭；库调用默认不补采）：主轮结束后，失败且不是官网拒绝的来源再跑一次（等 5 分钟），仍失败再等 15 分钟补最后一次；每次只重跑还没成功的来源，所有结果仍只发布一次。是否“官网拒绝”看该来源失败输出里有没有 4xx（408 除外）、验证页、`refus`／`blocked` 等字样（`REFUSAL`，宁可多判为拒绝）；拒绝当天不补采，次日定时任务照常再试。`runs.jsonl` 每次尝试一行（带 `attempt`，拒绝的带 `refused`），`last-run.json` 另有 `recovered`（补采救回）和 `refused`。
- 记录：采集失败，或成功但有重试、坏记录、total 不符、详情没取全时，`crawl.js` 追加一行 JSON 到 `<outDir>/crawl-issues.jsonl`（`at,key,outcome,error|issues,retries`；`outcome` 为 ready-with-issues／failed／unverified），并写入 `<key>_status.json` 的 `issues` 与 `message`。干净的成功不记录。

## 检查

```sh
node --test tests/*.test.cjs
git diff --check
```

测试使用临时目录和注入的响应，不访问官网。
