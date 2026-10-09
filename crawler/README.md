# 安得采集工具

原生 CommonJS / Node.js 22+，不调用 LLM。采集不按求职者方向删岗，关键词排序只在浏览器完成。[现行规格](../SPEC.md) · [阶段结果](../PROCESS.md)。总原则：官网数据可信，只保留最低检查（见 [AGENTS.md](../AGENTS.md)）。

## 流程

```text
sites.json（唯一来源登记）
  → update.js 按 key 串行调用 crawl.js（子进程跑适配器）
  → <key>_snapshot.json（可发布快照）
  → publish.js 规范化并整源替换
  → ../data/catalog.js ＋ ../data/parts/*.js
  → ../index.html ＋ assets/ 浏览器按查询并发加载分片并排序
```

```sh
node crawler/update.js papegames vivo         # 采集并发布；仅明确授权的 keys，部分失败返回非零
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

## 适配器

自研门户统一登记在 `lib/portals.js`（`crawl.js`／`publish.js` 只遍历登记表），模块导出 `requiresVerification／verifiedSource／portalNotice／validateJobs／validateEvidence／normalizeRecord`。新增门户只在登记表加一项，模板见 `lib/custom/_template.js`（默认报未实现，不返回伪造空结果）。

- **单轮采集**（共用 `lib/paginate.js`：任何一页出错或触顶就整次失败；坏记录、total 不符只记入 `issues`，详情尽力获取，403／412／429 立即停详情只用列表文字）：小米（校招、社招、实习）、携程、米哈游、上海AI实验室、七个阿里社招门户、飞书（字节与各 SaaS 门户，需要 Chrome，`CHROME_PATH` 可指定）、北森（讯飞／vivo 校招）、美团（社招／校园）。
- **旧门户**（保留原来较严的证据合同，哪个出问题再放宽）：OPPO、腾讯、快手、百川、网易、雷火、百度、蚂蚁、B站、TME、京东、vivo 社招、华为、小红书、阿里巴巴校园；阿里云社招另有独立资格。它们中途失败时仍带 `stopped` 证据返回部分结果，由 `crawl.js` 用 `portals.listStopped` 判断：列表阶段出错或触顶就整次不上架，详情阶段出错只记录。
- Moka 来源（阶跃、Kimi、智谱、DeepSeek、鹰角等）走各自共享协议模块，细节见对应适配器与测试。

## 发布数据契约

- `data/catalog.js`（目录：来源、公司、通知、分片清单）＋ `data/parts/<sha256>.js`（完整岗位，按来源／公司分组、每片≤1MiB、内容哈希命名）是唯一公开数据。publisher 读取时从分片还原基线，发布后删除不再被引用的旧分片。
- 浏览器按所选单位（不选即全部）并发加载所需分片（最多 12 个同时，单分片 30 秒超时，失败不自动重试，再次查询只补失败的），不请求招聘官网。
- 岗位字段：`id,sourceKey,company,title,category,city,channels,employment,talentPlan,date,dateKind,url,duty,requirements,description,jdComplete,sourceStatus`。ID 为“来源 key＋官方 ID”，不跨来源合并；正文不截断；只承认官网明确给出的事实，未知保持 null；非法协议链接禁用。
- 来源状态：`ready` 有数据、`failed` 本次失败、`unverified` 尚未接入、`unavailable` 暂无数据。
- 范围和字段语义只属于登记的入口，不代表公司全球全集。

## 重试与问题记录

- `lib/retry.js`：只对临时性错误重试——网络错误／超时、HTTP 5xx、408，每个请求最多再试 2 次（间隔 1 秒、3 秒）；403／412／429 等其它 4xx、重定向、验证页一律不重试。`crawl.js` 通过 `NODE_OPTIONS=--require=lib/retry-preload.js` 给适配器子进程的全局 fetch 加上该重试；飞书的页面内请求直接用 `withRetry`。子进程把 `[retry] ...` 写到 stderr，`crawl.js` 计数。
- 记录：采集失败，或成功但有重试、坏记录、total 不符、详情没取全时，`crawl.js` 追加一行 JSON 到 `<outDir>/crawl-issues.jsonl`（`at,key,outcome,error|issues,retries`；`outcome` 为 ready-with-issues／failed／unverified），并写入 `<key>_status.json` 的 `issues` 与 `message`。干净的成功不记录。

## 检查

```sh
node --test tests/*.test.cjs
git diff --check
```

测试使用临时目录和注入的响应，不访问官网。
