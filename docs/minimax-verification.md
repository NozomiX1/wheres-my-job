# MiniMax · v0.24 第一方只读核验

本页为16:25—16:29初核的历史状态；父随后完整双扫并本地发布校园100/社197，当前最新结果见[八来源采集及发布](feishu-batch-verification.md)。下文「未采集/放行」仅指初核阶段。

## 状态与边界

**仅完成官网范围、请求形状和少量 JD 样本核验；没有完整采集、来源放行或发布。** 父代理仍须审查证据、schema、清理记录，再逐源决定后续操作。未运行生产 `crawl/update/publish`，未写 `crawler/out/` 或公开数据；本代理在仓库内仅新增本文件。

- 观测时间：2026-10-05 16:25–16:29（北京时间；原始证据使用 UTC）。前一研究代理的模型服务 `fetch failed` 不属于官网拒绝，也不作为本轮官网观测。
- 仅使用 `/tmp/ande-bytedance-cdp.cjs` 的 `open/sleep`，4 个临时隔离、匿名 Chrome 会话，实际版本均为 **Chrome/154.0.8037.98**。未碰用户 profile，未修改指纹、忽略 TLS、注入外部 SDK、研究/生成安全签名。
- 未点击登录、投递或验证码。官网自行发出的匿名 `login_status` 检查不是登录操作；顶部「登录」和详情「投递」按钮不是阅读 JD 的门槛，也不证明实际可投。
- 两源合计 **12 次职位数据请求**：每源 3 次列表＋3 次独立详情。其余为官网自身页面/配置请求；记录到的第一方 `/api/v1/` 请求共 78 次，均 HTTP 200。未观测到第一方 403/405、强制登录或验证界面，没有拒绝后重试/绕过。
- 只读取得校招、社招各前两页（各 20 个不同 ID），发现阶段另各读过一次重复第一页；即 60 条列表传输记录、40 个不同列表样本、6 次详情核对。**100/197 是官网报告的 total，不是本轮收齐数量。** 未读终页，未执行全量或完整结束复核。

## 1. 官网导航与范围

第一方页面同时提供两个招聘入口；不是根据注册表 `batch` 或岗位标题猜渠道。

| 项目 | `minimax` | `minimax_social` |
|---|---|---|
| 授权/观测入口 `siteurl`（即注册 `url`） | [校园入口](https://vrfi1sk8a0.jobs.feishu.cn/379481/) | [社招根入口](https://vrfi1sk8a0.jobs.feishu.cn/) |
| 正常落地 URL | `https://vrfi1sk8a0.jobs.feishu.cn/379481/` | `https://vrfi1sk8a0.jobs.feishu.cn/index` |
| 官网导航链接 | 「MiniMax校园招聘」→ `/379481/`；「MiniMax社招」→ `/index/` | 「职位」→ `/index/`；「MiniMax校招」→ `/379481/` |
| 实际 `website-path` header / `websitePath` | 字符串 `379481` | 字符串 `index` |
| 实际 `portal_type` / `portalType` | **6** | **6** |
| 默认 `subject_id_list` / `subjectIdList` | `[]` | `[]` |
| `linkTemplate`（由真实列表 href 和独立详情导航核验） | `https://vrfi1sk8a0.jobs.feishu.cn/379481/position/{id}/detail` | `https://vrfi1sk8a0.jobs.feishu.cn/index/position/{id}/detail` |
| 默认 DOM total / API `data.count` | 100 | 197 |

两个入口均为无关键词、无职业、无地点、无招聘项目、无招聘类型、无标签筛选的默认列表。**两源不能用 `portalType=3/2` 区分，实际都是 6，必须同时核验 `website-path` 与官网入口。** `siteurl` 在本表是入口地址，不是本轮发现了一个同名 API 字段/header。

官网 [filters/6](https://vrfi1sk8a0.jobs.feishu.cn/api/v1/config/job/filters/6) 在各自 `website-path` 下提供不同项目和根招聘类型：

| 入口 | 官方 `job_subject_list` ID | 官方项目名 |
|---|---|---|
| 校园 | `7572193079274801454` | 2028届实习生招聘 |
| 校园 | `7495675705720965415` | 2027届校园招聘 |
| 校园 | `7496820276634634537` | MiniMax Top Talent人才计划 |
| 校园 | `7352753013591755047` | 日常实习 |
| 社招 | `7624113060585097510` | 外包 |
| 社招 | `7572197660413888811` | 大模型业务 |
| 社招 | `7572195851801561382` | 大模型研发 |
| 社招 | `7470820142395623692` | 大模型算法 |
| 社招 | `7497174408915142938` | 大模型系统 |

因此校园入口不是单独「2027届」项目；不能继续以登记 `batch` 限定，不能按旧 `exclude:"Top Talent"` 缩窄官网广范围。空项目过滤也保留未挂项目的公开样本，如校园 `7683070096784918830`、`7683006429335570697` 的 `job_subject:null`。项目选项存在不等于本轮已读到每个项目的岗位；没有单独枚举 Top Talent 或外包岗位。

校园过滤器显示研发、运营、产品/策划/项目、市场、设计、职能/支持；社招还包含销售、金融/投资等。实际默认样本含技术、HR、品牌、税务、行政、投资合作，证明不是预先按 AI/算法职业收窄。过滤器 `job_type_list` 多为 depth=2、`children:null`，部分名称对应不同 ID/父行业；**不把这份展示列表当完整分类树，也不以分类树白名单漏掉行业层级或未分类岗位。**

来源：`/tmp/ande-feishu-minimax-{campus,social}-discover.json` 的 `dom.links`、默认列表和 filters 响应；`*-verify.json` 的 `steps[home/page2]`；`*-home.png`、`*-page2.png`。

## 2. 正常列表请求、分页与响应

实际页面请求 [第一方列表 API](https://vrfi1sk8a0.jobs.feishu.cn/api/v1/search/job/posts)：

```text
POST /api/v1/search/job/posts
```

第一页 JSON POST body，两源完全相同：

```json
{
  "keyword": "",
  "limit": 10,
  "offset": 0,
  "job_category_id_list": [],
  "tag_id_list": [],
  "location_code_list": [],
  "subject_id_list": [],
  "recruitment_id_list": [],
  "portal_type": 6,
  "job_function_id_list": [],
  "storefront_id_list": [],
  "portal_entrance": 1
}
```

同一请求 URL 的可留存业务 query 为：

```text
keyword=&limit=10&offset=0&job_category_id_list=&tag_id_list=&location_code_list=&subject_id_list=&recruitment_id_list=&portal_type=6&job_function_id_list=&storefront_id_list=&portal_entrance=1
```

普通页面自身 header 的非敏感部分：`website-path:379481|index`、`portal-channel:saas-career`、`portal-platform:pc`、`accept-language:zh-CN`、`env:undefined`（实际字符串），POST 另有 `content-type:application/json`。证据只保留这份白名单；认证、安全 query/header 不落盘，不提供脱离官方匿名会话的签名方案。旧注册 `aid:1658` 与「需 acrawler 签名」说明不是本轮范围证据；本轮未研究它们，也没有据此调用外部安全 SDK。

通过官网分页「2」正常点击，页面变为带 `current=2&limit=10` 的地址，API 的 query 和 body 都只将 `offset` 改为 10：

| 入口 | 首次发现页 | 复访第一页 | 官网第二页 |
|---|---|---|---|
| 校园 | `offset:0,limit:10` → 10 条 / total 100 | 10 / 100 | `offset:10,limit:10` → 10 / 100 |
| 社招 | `offset:0,limit:10` → 10 条 / total 197 | 10 / 197 | `offset:10,limit:10` → 10 / 197 |

响应外层为 `{code:0,data:{job_post_list:[...],count:<integer>,extra:...},message:"ok",error:null}`。没有以 `jobs.length` 猜 total。两页内各 20 个 ID 不重复；仅证明观测窗口这几页的 count 一致，不证明全 ID 集合、终页或跨源无重叠。**仅核验默认 limit=10；没有试探 50 的支持/上限，不能把共享代码的 50 当官网已核验事实。**

来源：`*-verify.json` 的 `requests`、`responses`、`page2Clicked:true`；请求/计数摘要在 `*-verify-summary.json`、`*-crosscheck.json`。

## 3. 独立详情 API、完整 JD 与 DOM 核对

直接导航真实列表 href，由官网自身发出：

```text
GET /api/v1/job/posts/{id}?portal_type=6&portal_type=6
```

上式是移除非白名单 query 后保留的业务参数，重复 `portal_type` 是本轮正常客户端实际观测，未自行补造。header 范围仍分别为 `website-path:379481|index`。响应是 `{code:0,data:{job_post_detail:{...},recommend_job_post_List:...},...}`；不能误把推荐岗位当主详情/全量列表。6 次均 HTTP 200、`code:0`，每次是独立页面加载产生的详情 API，不是仅沿用列表缓存。

| 入口 / 官方性质 | 独立详情官网样本 | `description` / `requirement` 长度 |
|---|---|---:|
| 校园 / 实习 | [AI 招聘实习生（职能方向）](https://vrfi1sk8a0.jobs.feishu.cn/379481/position/7690521998430832959/detail) | 1005 / 420 |
| 校园 / 实习 | [Agent前端工程师实习-海螺&minimax design](https://vrfi1sk8a0.jobs.feishu.cn/379481/position/7686409262847822123/detail) | 106 / 265 |
| 校园 / 正式 | [Global Marketing](https://vrfi1sk8a0.jobs.feishu.cn/379481/position/7684113173146798372/detail) | 1219 / 754 |
| 社招 / 全职 | [全球 AI 商业化策略与生态合作](https://vrfi1sk8a0.jobs.feishu.cn/index/position/7690522726238636329/detail) | 636 / 689 |
| 社招 / 全职 | [高级税务经理](https://vrfi1sk8a0.jobs.feishu.cn/index/position/7690512850229872906/detail) | 404 / 253 |
| 社招 / 全职 | [Research Lead, Large Language Models](https://vrfi1sk8a0.jobs.feishu.cn/index/position/7687134817943472447/detail) | 1553 / 1229 |

长度为 JS 字符串 `.length`，不是字数。六份列表与独立详情的两字段分别 **逐字相等**；独立详情 DOM 的完整 `body.innerText` 各包含两字段全文（比较仅移除 Unicode 空白）。不是只比开头/摘要。DOM 显示「职位描述」「职位要求」两段；截图辅助观察，长 JD 的全段证明来自完整 DOM 文本，不把单屏截图当全文。

- 40 个列表样本的顶层两字段为换行纯文本或 `null`，未发现 HTML 标签；无需对这些字段强行 HTML 解码/去标签，也不能重复追加同一原文。
- 列表 `job_post_info` 是独立嵌套对象，包含 `description/requirement` 等许多 schema 字段，但 **40/40 的嵌套 JD 均为 `null`**。详情嵌套对象提供 `recruitment_type` 和若干空数组，六份没有额外 `description/requirement`。本轮没有发现独立 nested JD，也没有把嵌套缺值当摘要/正文来源。
- 社招 `7686033283003812102`、`7686030333406054683` 的列表 `requirement:null`，同时有可读 `description`。这是第一方缺值事实，不补造要求、不自动删岗；这两个不是本轮六份独立详情样本。
- `city_list` 提供命名城市对象；例如商业化样本完整 5 个地点为上海/中国香港/北京/新加坡/旧金山。列表 DOM 可缩写为「等 5 个城市」，不能只保存可见前三个。

来源：`*-verify.json` 保存原始列表/独立详情与对应 DOM；`*-crosscheck.json` 保存逐字段结果、全文 hash 和嵌套 schema；`*-detail-<id>.png` 为六张截图。

## 4. 招聘父子枚举、类别与日期（保守语义）

`filters.data.recruitment_type_list` 在校园范围仅返回根 `2/校招/Campus`，社招范围仅返回根 `1/社招/Experienced`，`children:null`，不是完整招聘性质枚举。实际列表和独立详情的 `recruit_type.parent`/`job_post_info.recruitment_type.parent` 提供以下已观测父子关系：

| 官方父 ID / 名称 | 已观测子 ID / 名称 / 英文 | 可保守归一化 |
|---|---|---|
| `2` / 校招 | `202` / 实习 / Intern | channel=`campus`；employment=`internship` |
| `2` / 校招 | `201` / 正式 / Regular | channel=`campus`；employment=`null`，**不强映射全职** |
| `1` / 社招 | `101` / 全职 / Full-time | channel=`social`；employment=`full-time` |

这是已观测枚举，不声明公司只支持这三种子类。社招过滤器的「外包」是招聘项目，不能直接拿项目名替代每岗招聘性质。校园含日常实习、不同届次和人才项目，不给实习强行补全职、不从届次标题更改父渠道。

本轮 **40/40 列表的顶层 `job_function` 和嵌套 `job_post_info.job_function` 均为 `null`**，两源 filters 的 `job_function_list:[]`。独立详情职业行实际显示「研发 - 前端开发」「市场 - 品牌」「市场 - 高级市场职位」「研发 - 算法」，分别对应真实 `job_category` 父链；HR/税务样本显示「互联网 / 电子 / 网游」，也对应其 `job_category`，不是从标题推断的职能。本轮 MiniMax 的官网显示以这些类别字段为据；**没有具名 `job_function` 样本，不能由本轮证明未来具名时的显示优先级，更不能据字段英文名通用于其他来源。**

类别只依据 `job_category` 原字段及父链，不从岗位标题猜：如前端样本 leaf「前端开发」、父「研发」、根「互联网 / 电子 / 网游」；营销样本 leaf「品牌」、父「市场」；高级税务经理实际类别为根行业「互联网 / 电子 / 网游」，不能擅自改为「财务/税务」。当前共享 `normalizePost` 仅取 leaf `.name`，和官网可能显示的父职能组合不同；若后续改善显示，须保留真实字段关系，不能把分类展示树强当范围过滤。

列表与详情有 `publish_time` 整数（例如校园 HR 为 `1790589453535`、社招税务为 `1790587210007`）；本轮所有已看列表/详情 DOM **没有显示发布/更新时间**。未研究日期渲染业务源码来证明实际字段语义，所以保留 raw 数值，归一化 `date:null,dateKind:null`；不单凭字段英文名或量级宣称可靠「发布日期」，不采用 `biz_create_time/biz_modify_time/job_process_time` 冒充发布日期。

详情 `channel_online_status:1` 只保留接口原码；本轮没有验证该枚举与投递状态的对应关系，不能由状态/按钮推定可投或下架。

## 5. 与当前共享 Feishu 代码的接入差异

对本轮 40 个样本只离线调用了 [现有 `normalizePost`](../crawler/lib/feishu.js)，未调用生产 transport 或 writer：40 条均可规范化；校园 16 实习＋4 性质未知（正式），社招 20 全职；渠道分别 campus/social；日期均未知。这是样本兼容性检查，不是采集成功快照。

父代理后续需单独审查的事项：

1. transport/来源门禁不能继续只认 ByteDance origin 和 `portalType=3/2`；MiniMax 两源实测为同 origin、`portalType:6`、不同 `websitePath`。必须逐源固定已核验入口、path、空筛选、链接模板，不把 `aid`/旧注释当范围证明。
2. 不沿用旧 `batch/exclude` 做职业/项目删岗；校园空 `subjectIdList` 必须覆盖上述更广入口及未挂项目岗位。只发现项目选项仍不等于已采集该项目。
3. 当前顶层职责＋要求的纯文本路径适合这批样本；`null` 要求须允许且明确保留缺失，nested JD 若以后出现非重复正文，仍需重新核验，不能静默丢弃/重复拼接。
4. 不改「正式→未知性质」「日期未知」的保守处理。岗位类别照真实字段，不推断职业；`job_subject` 是项目元数据，不能以标题推断人才计划或届次。
5. 分页成功条件、全 ID/JD 前后复核和逐源放行尚未执行；默认 `limit=10` 已核验，较大 page size 未核验。本文件不授权或宣称 source complete、迁移下架、上线或发布。

## 6. 临时证据、离线复验与清理

所有浏览器证据均位于 `/tmp/ande-feishu-minimax-*`，不承诺临时目录持久保存。

- `campus-discover.json` / `social-discover.json`：两源首次默认列表、过滤配置、官网导航、版本和 finally。
- `campus-verify.json` / `social-verify.json`：正常第二页、3＋3 独立详情 API、完整 DOM 文本、非敏感请求白名单、版本、临时 profile/PID 和 finally。
- `summary.json`：供父代理读取的严格单一 JSON，包含范围 profile、JD/枚举/类别结论、请求数和 cleanup。
- `crosscheck.json`：两页 count/ID、六份全文一致性/hash、顶层/嵌套 schema、40 条离线 normalizer 结果。
- `campus/social-home.png`、`campus/social-page2.png`、`campus/social-detail-<id>.png`：实际 Chrome 页面截图。
- `cleanup.json`：复核后两次主核验 Chrome PID 已不存在、临时 profile 实际不存在；4 次会话的各自原始 JSON 均记录 `chromeExited:true,profileRemoved:true`。首次发现两次依 helper finally 记录，不伪称另存了其 PID/profile 独立复核。
- `evidence-index.json`：文件大小/hash 索引、请求计数和清理摘要；`discover.cjs`、`verify.cjs` 为本轮临时探针，**未经新的授权/预算不要重跑在线脚本**。

无需联网的复验命令：

```sh
node /tmp/ande-feishu-minimax-check.cjs
```

本轮结果见 `check.log`：两范围、4 个主要列表页、40 个不同列表样本、6 份独立详情 API/DOM 全文、12 次职位数据请求和4次 finally 均通过。请求 URL 仅保存列出的业务 query 白名单，header 仅保存非敏感白名单；cookie/token/签名未落盘，未读取安全 SDK 源码。
