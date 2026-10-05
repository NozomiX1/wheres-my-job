# 阶跃星辰 · 首轮真实采集与核验

## v0.18 · 本地接入与发布（2026-10-05，北京时间）

已完成更广校招来源接入、逐岗详情、纯文本整理和**本地发布**。未登录、提交申请、绕过验证、运行全站更新、部署或提交代码。

- `sites.json` 沿用两个 key：`stepfun` 改接 94905、`stepfun_social` 仍为 94904，仅这两个开启 `fetchDetails:true`。原 141903 的 20 条全部被新校招范围包含，不另加重复来源，目录仍为 39 公司/66 来源。
- 两个来源重新完整收齐 **128＋231＝359 条**，全部官方 ID 无跨源重叠；逐岗详情取得后再扫完整列表，总数与 ID 集合不变才生成成功快照。校招完成时刻 `2026-10-04T16:31:38.676Z`，社招 `2026-10-04T16:33:42.832Z`；分别约 67s/124s，仅此次现场耗时，不作 SLA。
- 359 份完整原始描述转为纯文本，**311 份按明确标题分段、48 份全文回退**；职责/要求和全文不重复保存为匹配字段。独立浏览器 DOMParser 对所有 raw HTML 比较正文（仅忽略空白），全文无遗漏。
- 356 条有可读正文；3 条官方只给 `。`、`/`、`-`，保留并显示占位提示。完整传输不保证招聘方填写详尽，极短但真实的文字也不删除。
- 359 条类别、性质和详情 `publishedAt` 均保留，日期明确映射为「发布」；不把 createdAt/openedAt/updatedAt 改标签。校园来源实习带来源渠道，社招来源实习不因此变校园；人才计划仍未知。全职 312、实习 47。
- `sourceStatus` 保留接口原码；`pause` 12 条仍公开可见，列表/JD原码提示，官网链接保留，不据此隐藏/判下架或证明可投。状态不参与评分/词频。历史记录可缺该字段，不为保留来源补写键。
- 唯一 writer 执行 `node crawler/publish.js stepfun stepfun_social`：仅替换该公司的 147 条旧记录；现在 **13,699＝359 新记录＋13,340 原样历史记录**。其他岗位（包括可选字段是否存在）、来源状态和公司目录逐项完全相同。首次历史迁移不将旧记录消失统称已核验下架。
- `data/jobs.js` SHA-256 为 `ef45ddcaad01f2b354d33430d1340570e558c17a6f1523f3b1a22350ce3db9a8`，与预发布完整 **48/48 Chrome 检查**的冻结副本逐字节一致；新校园 94905 的已知与新增岗位链接另经真实官网浏览器确认可公开打开、正文和详情完全一致。
- 原生 UI 检查、**26 项流水线＋61 项详情＋14 项正文离线检查**全部通过。两个初版父测试误把 fixture 的 orgId/错误文案写死，修正断言后重跑全部通过，无产品失败；不将旧报告当本轮验收。
- 用同样手动 85/37 示例词对这 359 条比较：只有标题时净分 7 种，完整正文时 141 种，范围 `-14.05～22.45`；公式、权重、字段 once 及同分顺序没有改变。这只是该示例与当前来源的观测，不是通用排序质量证明。

本轮临时证据：`/tmp/ande-stepfun-page-report.{md,json}`、`/tmp/ande-stepfun-page-*.png`、`/tmp/ande-stepfun-new-campus-links.md`、`/tmp/ande-stepfun-publish.log`。前端/data 五文件的发布后 hash 与冻结副本一致；实际仓库 file/HTTP 的发布后冒烟 **4/4 PASS**（`/tmp/ande-stepfun-live-smoke.{md,json}`），再确认 13,699/359 范围、真实 JD/次数/类别/日期/状态。外网/页面异常 0，隔离 Chrome/profile/server 已清理；无模拟岗位写入公开文件、无点击申请行为。

## v0.17 · 首轮观测记录（2026-10-04，北京时间）

以下保留首次验证事实，**不是当前文件状态**：该轮没有发布；后续 `out/stepfun_*` 已由 v0.18 更广来源及详情快照替换，旧 raw 另有临时备份 `/tmp/ande-stepfun-pre-details-VgBjHS/out/`。本机 `crawler/out/` 被 Git 忽略，不等于 CI/云端持久保存。

### 范围与数量

| 官方来源 | 范围事实 | 完整分页结果 | 保存位置 |
|---|---|---:|---|
| [原登记校招入口 141903](https://app.mokahr.com/campus-recruitment/step/141903) | `stepfun`，较小校招来源 | 20；1 页 | `crawler/out/stepfun_{raw,snapshot,status}.json` |
| [登记社招入口 94904](https://app.mokahr.com/social-recruitment/step/94904) | `stepfun_social` | 231；50/50/50/50/31 | `crawler/out/stepfun_social_{raw,snapshot,status}.json` |
| [社招官网导航指向的校招入口 94905](https://app.mokahr.com/campus-recruitment/step/94905) | 新发现、更广的校招来源，尚未登记/晋升 | 128；50/50/28 | `crawler/out/stepfun_campus_navigation_candidate.json` |

- 各次请求的总数稳定，计数与收齐的记录数一致，每个来源内部官方 ID 唯一；原登记两源的首次采集分别于北京时间 23:31、23:45 完成（社招首次字段检查失败，修复后重抓）。导航入口候选于 23:59 完成。
- 原 20 条校招官方 ID **全部包含于 128 条**之中；新校招与社招无官方 ID 重叠。三入口合计 379 条来源记录，按同一 Moka 组织 `step` 的官方 ID 去重为 **359 个机会**，不是 379 个不同岗位。
- 128 校招＋231 社招的 359 条中，官网 `commitment` 为全职 312、实习 47；职能名称均可从原始 `zhineng.name` 取得。财务、人力、运营、销售、工程等均保留，没有职业或经验删岗。
- 未自动修改 `sites.json`：现有注册表仍是 39 公司、66 来源。94905 仅候选，没有可发布 status/snapshot；不能拿“已发现候选”当作已接入或已发布。下一轮需要明确更广校招来源与原小范围来源的关系及去重，再调整注册范围。
- 这些数字说明本次观测的来源结果，**不保证每个岗位仍实际接受申请，也不宣称枚举了公司所有可能渠道**。

## 分页与官网范围

第一方 POST 接口：`https://app.mokahr.com/api/outer/ats-apply/website/jobs/v2`。

官网默认请求以 `orgId:"step"`、`siteId`、`site:"campus"|"social"` 指定来源，`limit:30,offset:0,needStat:true,jobIdTopList:[],customFields:{},locale:"zh-CN"`；响应为解密后的 `data:{jobStats:{total},jobs:[...]}`。爬虫每页 50，无非空关键词、职能、部门、项目、经验等筛选。

独立浏览器核对：141903 默认页面显示 `20 结果`，全部 20 个 ID/描述与 raw 一致；94904 显示 `231 结果`，默认首页 30 个 ID/描述与 raw 前 30 条一致。社招完整五页由采集器另行收齐。94905 的只读第一页核对返回总数 128，之后用同一分页实现收齐三页，没有把第一页 30 条冒充全量。

## JD、类别、性质及地点

官网实际 POST 详情接口：`https://app.mokahr.com/api/outer/ats-apply/website/job`，请求为 `{"orgId":"step","jobId":"<官方 UUID>","siteId":141903或94904,"locale":"zh-CN"}`。

独立浏览器直接打开以下官网链接，无须登录即可取得正文：

- [校招实习样本](https://app.mokahr.com/campus-recruitment/step/141903#/job/ddfda00c-140a-4ada-be2b-51bd29b0bd46)
- [社招正常样本](https://app.mokahr.com/social-recruitment/step/94904#/job/2cdc77b5-1a47-451f-b329-957613e72793)
- [memory算法](https://app.mokahr.com/social-recruitment/step/94904#/job/1b693500-0ecf-4c48-aa8a-2cf5655c3ba5)
- [整机工艺](https://app.mokahr.com/social-recruitment/step/94904#/job/4441274d-00a9-4fa9-a29d-6d060836553f)
- [海外API销售](https://app.mokahr.com/social-recruitment/step/94904#/job/2a7301fa-a3ba-4a81-b2a0-a7b84610c8df)

五个样本的列表 `jobDescription`、独立详情接口及页面正文 HTML **逐字一致**，不是只有摘要。另一个 [Pre train Data基建工程师](https://app.mokahr.com/social-recruitment/step/94904#/job/846ba690-df4f-4974-b3cc-4141f4f18895) 的 raw、官网列表与页面 HTML 也一致；该次列表缓存导航未再发独立详情请求。

- 359 条均有字符串 `jobDescription`，但有 3 条官方正文只为 `。`、`/`、`-`；还有一些极短描述。不能把“接口有字段”解释成“每条都有实质完整 JD”，也不能补造或删掉这些岗位。
- 官方“职能类型”来自 `zhineng.name`，“职位性质”来自 `commitment`；`category2Id`、部门或渠道不代替职能名称。列表/详情元数据并不保证完全一致：例如整机工艺列表名称为「其它」，详情为「其他」。
- 海外API销售原始地点为 `[{country:"美国",id:808318}]`，没有城市。官网展示「美国」。首次社招因此被严格城市解析拒绝，已最小修复为国家名回退，仍拒绝非法类型、不虚构城市、不跳过整条岗位。
- 渠道、实习性质和人才计划不同；人才计划字段仍未知，不从 Stepstar 等标题自动猜测。
- 本轮保留的是原始 HTML。**纯文本转换、明确职责/要求分段及逐条 JD 完整性标记尚未实现**；规范化候选仍 `jdComplete:false`，不能将已知 HTML 原样当最终可阅读/匹配正文发布。

## 暂停状态与日期

社招接口包含 `open:219,pause:12`。官网默认列表可见 `pause` 的技术品牌运营，关键词查询可见 `pause` 的整机工艺，其详情页也可公开打开、显示申请按钮。没有提交申请；不能由按钮推定实际可投，也不能把 `pause` 直接当下架后删除。暂停状态的保留/展示口径需在发布前落实。

本次检查的列表与详情页未显示发布/更新时间。详情接口额外提供 `publishedAt`；[官方公开客户端源码](https://static-ats.mokahr.com/recruitment-web-client/javascripts/recruitmentWeb-20260921-1936-e040c-release.js) 的可选「发布日期」渲染器使用 `publishedAt`，不是 `createdAt`/`openedAt`。当前页面配置未启用该展示，列表原始数据没有此字段。

- 不能将目前 raw 的 `createdAt`、`openedAt`、`updatedAt` 冒充已核验官网日期。
- 日期仍 `dateKind:null`；若要支持可靠发布日期，下一轮须从详情逐条取得 `publishedAt`，同步来源映射与检查，而不是直接给旧日期改标签。

## v0.17 当时的后续事项（已由 v0.18 执行）

1. 修正登记校招覆盖，避免只保留 20 条小范围入口；保留官方 ID 和来源溯源，解决重叠，不按标题去重。
2. 整理原始 JD 为完整可阅读正文，依据明确标题分职责/要求，不重复计算全文；官方占位描述保持缺失事实。
3. 明确暂停岗位及可靠日期字段处理，再在安全链中发布这家公司；其他公司基线保持原状，评分暂不调整。

本轮原生 UI 检查与 **24/24 离线流水线检查**通过；新增国家名回退检查先失败后通过，并重跑真实 231 条社招成功。正式 `index.html`、`data/jobs.js` 的 hash 和 mtime 均未改变，没有部署或提交。

临时证据：`/tmp/ande-stepfun-official-report.md`、`/tmp/ande-stepfun-official-{evidence,list-evidence}/`，含真实官网截图、请求形状、描述逐字比较及浏览器清理记录；`/tmp/ande-stepfun-social-pages.json`、`/tmp/ande-stepfun-campus-navigation-summary.json` 记录分页/重叠。临时证据并非持久存储承诺。
