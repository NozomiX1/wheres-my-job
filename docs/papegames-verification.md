# 叠纸游戏 · 正常公开来源核验（SPEC v0.24）

本页小样本为初核历史；父后续完整双扫并本地发布校园40/社328，source key保持papegames拼写，当前最新验收结果见[八来源采集及发布](feishu-batch-verification.md)。

2026-10-05 的**小样本协议/字段核验，不是全量采集、成功快照或发布证明**。实际 key 固定为 `papegames` / `papegames_social`，不是 `papergames`；未修改注册表、实现、公开数据或其他项目文件。

## 1. 实际 source profile、官网导航与范围

| key | 登记首页 → 正常职位页 | rootURL（实际 API origin） | websitePath / portalType | 官网 website ID / 名称 | 官网显式 count |
|---|---|---|---|---|---:|
| `papegames` | [campus](https://career.papegames.com/campus) → [/campus/position/list](https://career.papegames.com/campus/position/list) | `https://career.papegames.com` | `campus` / **6** | `7125309073834281230` / 校招官网 | **40** |
| `papegames_social` | [social](https://career.papegames.com/social) → [/social/position/list](https://career.papegames.com/social/position/list) | 同上 | `social` / **6** | `7125309073834232078` / 社招官网（中），英文含 Greater China | **328** |

- 两登记首页都是官网业务介绍/导航页，本轮其本身**不发职位列表请求**。可见「校招职位」「社招职位」链接才打开正常飞书职位页，不能在首页看到品牌宣传就认定有列表，更不能擅自改成别的公司域名或 `papergames` key。
- 校招首页链接社会招聘 `/social`；社招首页链接校园招聘 `/campus/`，是两条已登记官网入口，没有在本轮导航发现应合并进来的第三个职位来源。社招官网名明确含「中 / Greater China」，**不声称覆盖公司全球其它入口/后台全集**。
- API实际从 origin下 `/api/v1/...` 发出，不带 `/campus` 或 `/social` 前缀，以 **`website-path` header** 区分。这里的 rootURL来自实际URL，不是响应名为rootURL的字段。两者实际 portal6，不能套字节campus3/society2。
- 校招具名职业筛选根：技术研发类、美术类、策划类、动画CG类、市场运营类、音频类、职能支持类；项目选项为 `7674934501051943195`「游戏编剧实习」、`7667093166210763044`「2027校园招聘（秋季）」。正常列表请求**两项目都不选**，第一页已同时出现两项目记录，既包含正式也包含实习。
- 社招具名职业筛选根：技术研发类、美术类、策划类、动画CG类、市场运营类、质量管理类、平台类、IP开发类、音频类、项管类、职能支持类；`job_subject_list:null`。无项目选项不等于已证明没有人才项目。第一页已含社招渠道实习，不可按入口删除实习。

**可信scope：** 各官网当前无职业、项目、性质、关键词选择的公开列表范围；不是只研发、只2027秋招、只某游戏项目。职业树是第一方可选项，不当作后台强制分类/全集证明。本轮未枚举完整岗位，尚未给予任何完整采集/发布资格。

证据：官网首页 DOM `/tmp/ande-feishu-games-action-8.json`、`...-action-12.json`；正常职位页 DOM `...-action-9.json`、`...-action-13.json`；HTML `...-papegames-531.html`、`...-papegames_social-864.html`；摘取 `website_info` 的 `...-websites.json`；filters原响应 `...-papegames-581.json`、`...-papegames_social-918.json`。

## 2. 正常请求、分页及显式总数

两入口官网实际 `POST /api/v1/search/job/posts`，URL query和body对应；第一页正常JSON如下：

```json
{
  "keyword": "", "limit": 10, "offset": 0,
  "job_category_id_list": [], "tag_id_list": [], "location_code_list": [],
  "subject_id_list": [], "recruitment_id_list": [], "portal_type": 6,
  "job_function_id_list": [], "storefront_id_list": [], "portal_entrance": 1
}
```

profile中的 `subjectIdList:[]`。不得把注册 `batch` 当筛选/岗位属性，也不恢复个人 `matchKeyword/exclude` 过滤。响应HTTP200、`code:0,message:"ok",error:null`，列表位于 `data.job_post_list`，精确官方计数来自 **`data.count`**，不是 `total` 或 length。

| source | limit / offset | 返回长度 / count | 原始响应文件（`/tmp/ande-feishu-games-` 前缀） |
|---|---|---|---|
| papegames | 10 / 0 | 10 / 40 | `papegames-580.json` |
| papegames | 2 / 10 | 2 / 40 | `papegames-1050.json` |
| papegames | 2 / 39 | 1 / 40 | `papegames-1051.json` |
| papegames_social | 10 / 0 | 10 / 328 | `papegames_social-917.json` |
| papegames_social | 2 / 10 | 2 / 328 | `papegames_social-1046.json` |
| papegames_social | 2 / 327 | 1 / 328 | `papegames_social-1047.json` |

页面分别显示4页/33页。正常业务JS将页码转换为 `offset:(current-1)*limit`，即零起点offset。后两个请求仅为原Chrome页内普通原生XHR小探针，用已观察的同origin业务路径/JSON/website-path，改变limit/offset；没有注入SDK、手动签名或调用安全接口。它们没有签名参数，实际正常200/code0；官网自己的原始自动请求签名值已脱敏，不分析签名实现，也不据此承诺未来所有环境都无需正常会话。

**各source仅13个不同列表posting ID样本**，count在首段、下一段和末位稳定，末位返回1条，未观察到10000触顶。但没有逐页扫完/越界空页/两轮全ID及字段复验，不能把官网40/328、样本13条或页码当采集完成证明。也不能将两个source的计数相加当跨入口唯一岗位数。

## 3. 不同职业详情核对与正文策略

正常公开详情为 `GET /api/v1/job/posts/{postingId}?portal_type=6&with_recommend=false`；data包含 `job_post_detail`。每source两种真实不同职业：校招HR/美术，社招技术平台/投资职能。不操作任何投递/登录。

| 入口 · posting ID / 官网岗位 | description / requirement UTF-16字符数 | 具名官网类别 | 详情API / DOM capture |
|---|---|---|---|
| campus · [7688946223290485055 · 招聘HR](https://career.papegames.com/campus/position/7688946223290485055/detail) | 142 / 112 | `job_function.name:职能支持类` | `papegames-648.json` / `action-10.json` |
| campus · [7676311024710355250 · 3D特效实习生](https://career.papegames.com/campus/position/7676311024710355250/detail) | 181 / 340 | `job_function.name:美术类` | `papegames-705.json` / `action-11.json` |
| social · [7687498950078023963 · 游戏运维SRE](https://career.papegames.com/social/position/7687498950078023963/detail) | 330 / 307 | `job_function.name:平台类` | `papegames_social-976.json` / `action-14.json` |
| social · [7688250514622990633 · 投资研究](https://career.papegames.com/social/position/7688250514622990633/detail) | 249 / 219 | `job_function.name:职能支持类` | `papegames_social-1030.json` / `action-15.json` |

四岗两独立字段**列表与详情API逐字符串完全一致**，两个完整字段均出现在正常详情DOM（仅空白规范化比较，不裁切）。校招美术的第8条「投递时请附带unity特效作品」保留，不能当表单噪声丢弃；SRE包含第7条AIOps职责、第8条责任感要求，未截尾。逐岗 equality/长度/DOM证据在 `/tmp/ande-feishu-games-shapes.json`。

文本为原生纯文本，保留换行、内部标题、英文/工具名/作品说明，不套HTML去标签或解码，不截600字。职责/要求分开用于匹配，不另复制同一全文重复计分。两个source各13条列表的 `job_post_info.description/requirement:null`，`job_post_object_value_map:{}`，未发现另藏独立正文。

**无需机械逐岗详情补JD：** 样本支持共享客户端优先采用列表已有全文。但未来每条候选仍需验证正文字段/独立嵌套文本，未知schema或额外正文不得静默省略、返回部分成功。小样本不替代全源正文检查。

## 4. 实际完整 observed shape：不能直接套字节类别字段

递归路径/type、原始文件、13个样本ID及招聘类型保存在 `/tmp/ande-feishu-games-shapes-complete.json`。下面记录本轮实际键和值形态，不把它升级为未来字段永远不变的承诺；字节既有参考是 `/tmp/ande-bytedance-campus-official/sample-wide.json`，对比保存为 `...-byte-shape-diff.json`，本轮没有新增字节请求。

```text
列表：
{ code:number, data:{ job_post_list:Post[], count:number, extra:string },
  message:string, error:null }
Post的21个完整键：
  id, title, sub_title, description, requirement, job_category, city_info,
  recruit_type, publish_time, job_hot_flag, job_subject, code, department_id,
  job_function, job_process_id, recommend_id, city_list, job_post_info,
  storefront_mode, storefront_list, process_type
```

- `id/title/description/requirement/job_process_id` 为字符串，`publish_time/storefront_mode/process_type` 为number，`recruit_type/job_post_info` 为对象，`city_list` 为对象数组。
- **两个source的 `job_category:null`，实际类别在具名 `job_function` 对象**。HR、特效、SRE、投资的官网DOM与该字段名一致；不可用字节的单一 `job_category.name` 映射导致丢类别，也不可从岗位title/游戏项目猜职业。
- 官网 `job_schema_info.predefined` 对 `field_type.type:"job_function"` 定义具名「职能分类 / Function category」、`visible:true`。正常业务JS映射 `functionCategory:{...e.job_function,displayName:S(e.job_function)}`，S按具名 `parent.parent.i18n_name / parent.i18n_name / i18n_name` 构成显示数组；与DOM是同一事实，不是猜分类。证据 `...-category-schema-proof.json`、`...-category-renderer-proof.json`、`...-business-js.json`、业务脚本 `5615.9cadf6d0.js`。
- 本轮只有function具名、category为空的样本，**没有二者同时具名的证据**，不据此规定未来必须合并/同时展示二者。当前叠纸profile的公开category应取具名job_function叶名，原始两个字段完整保留；若未来二者都非空/可见配置改变，须按官网renderer/DOM重新核对，不能统一拼接成新类别。
- `job_function` 列表完整键为 `id,name,en_name,i18n_name,parent_id,index,active_status,biz_create_time,biz_modify_time,parent`；本轮叠纸叶项没有parent链（null）。详情仅输出具名 `id,name,en_name,i18n_name`，不带列表null占位字段。biz时间属于职能元数据，不能当岗位日期。
- `city_info:null`，可用城市来自 `city_list[].name/i18n_name`，不能只套字节city_info；city对象完整键 `code,name,en_name,location_type,i18n_name,py_name,mdm_code,node_status`。
- campus的 `job_subject` 为对象，完整键 `id,name,limit_count,active_status,subject_group_info`，name为 `zh_cn/en_us/i18n` 名称对象；两项目均实际返回。social的 `job_subject:null`。`sub_title/job_hot_flag/code/department_id/recommend_id/storefront_list` 本轮均null。不可用empty/unknown当false。
- `recruit_type` 的具名对象键为 `id,name,en_name,i18n_name,depth,parent,children,active_status,selectability`，parent递归。叶type不只有字节「正式/实习」那组ID，实际社招实习 **301**，不能写死202才算实习。
- 与字节参考的21个Post键、下面53个 `job_post_info` 键**无新增/缺失**，但字段值形态不同：字节具名job_category、城市city_info、项目与code；叠纸具名job_function、city_info/code为空，社招job_subject为空，性质名称/ID也不同。不能把同schema当同语义/同profile。

列表嵌套 `job_post_info` 的完整53个键：

```text
id, job_id, title, sub_title, address_id, address, city, education, experience,
description, requirement, min_salary, max_salary, currency, head_count, crator_id,
expiry_time, progress, department_id, job_type, recruitment_type, job_process_time,
job_in_charge_user_id, biz_create_time, HighlightList, JobChannelPublishList,
required_degree, never_expiry, job_hot_flag, subject, sequence, min_level, max_level,
job_post_object_value_map, code, job_active_status, job_process_type, biz_modify_time,
job_function, job_process, job_process_id, job_category, address_list, city_list,
correlation_job_list, tag_list, department, job_storefront_mode, storefront_list,
target_major_list, schema, job_post_process_time_list, job_level_id_list
```

主要实际值为具名 `recruitment_type`、带country/state/city/district的 `address_list` 以及空custom map，其余大量字段null。不从null占位补薪资/经验/日期，不用嵌套null描述覆盖顶层全文。

filters完整data键：`job_type_list,city_list,recruitment_type_list,job_type_count_map,job_subject_list,city_count_map,job_function_list,tag_list,storefront_list`。`job_type_list/job_type_count_map/city_count_map/tag_list` 可为null；职业树在 `job_function_list`，项目在 `job_subject_list`。`data.extra` 是跟踪JSON字符串，不把跟踪总数当另一全集保证。

```text
详情：
{ code:0, data:{ job_post_detail:Detail, recommend_job_post_List:[] },
  message:"ok", error:null }
两个source的16个共同Detail键：
  id, title, description, requirement, recruit_type, publish_time,
  channel_online_status, job_function, job_id, city_list, job_post_info,
  city_info_list_for_delivery, tag_list, storefront_mode, storefront_list, process_type
campus另有job_subject（17键）；social缺该键（16键）。
```

详情很多列表null字段变成**缺键**，如 `job_category/sub_title/city_info/job_process_id/...`；recruit children成为 `[]`，city附属字段实值和列表null占位也不同。详情 `job_post_info` 仅实际输出12键：`recruitment_type,HighlightList,JobChannelPublishList,job_post_object_value_map,address_list,city_list,correlation_job_list,tag_list,storefront_list,target_major_list,job_post_process_time_list,job_level_id_list`，数组为空，map为 `{}`。不要把缺键解析为字段非法，除非它是该source所需事实/正文。

身份严格用顶层字符串 **posting `id`**，它与详情顶层 **`job_id`** 不同：HR `7688946223290485055` → job_id `7688946223290337599`；特效 `7676311024710355250` → `7676311024710224178`；SRE `7687498950078023963` → `7687498950077860123`；投资 `7688250514622990633` → `7688250514622859561`。分页/链接按posting ID，不转Number、不按title去重。跨校社底层身份关系未完整枚举；有job_id也不能凭相同标题合并。`channel_online_status:1` 仅保留接口原码，本轮不推导招聘名额/聘用状态。

## 5. 招聘语义和未知日期

| 实际字段事实 | 本轮可信映射 | 不能推定 |
|---|---|---|
| 校招HR：leaf `201 正式 / Regular`；parent `2 校招 / Campus` | 渠道校招 | 正式未经独立语义证明为全职，employment:null |
| 校招特效、编剧：leaf `202 实习 / Intern`；parent `2 校招` | 校招＋实习 | 不由title或batch判断 |
| 社招SRE、投资：leaf `101 全职 / Full-time`；parent `1 社招 / Experienced` | 社招＋全职 | 不外推整个入口全职 |
| 社招列表场景原画 `7689011673374066987`：leaf **`301 实习 / Internship`**；parent `1 社招` | 社招＋实习，DOM列表也显示「社招实习」 | 不因社招入口移除实习；不写死202 |
| job_subject为两个具名招聘项目 | 保留原始项目事实，不加项目筛选 | 不把2027/游戏编剧项目自动当人才计划 |

所有未明确人才计划事实保留 **talentPlan:null**，不是false；首页培养宣传如「阿叠创作营/NOVA训练营」也不能据此标每一岗位为人才计划。`process_type` 样本campus2/social1是原字段，不用它代替具名recruit_type。

四详情 `publish_time` 为毫秒number：HR `1790222509573`、特效 `1787280615269`、SRE `1789885437153`、投资 `1790060553308`。本轮详情DOM没有「发布日期/更新时间」标签，正常业务JS只映射 **`time:e.publish_time`**，未取得发布/更新语义证明。**date/dateKind应保持null**，原数字留在raw；不由字段名、合理时间或本轮采集时刻标成published。业务JS证据 `...-business-js.json`，未研究安全SDK。

## 6. 请求数、安全与 finally

同一轮使用隔离正常Chrome、原生CDP；复用 `/tmp/ande-bytedance-cdp.cjs`，驱动 `/tmp/ande-feishu-games-probe.cjs`。不碰用户profile、不登录/投递或处理验证码，不外注SDK/生成签名、不忽略TLS，不修改UA/指纹、防检测配置。网页自己自动读取匿名login_status、自动加载验证SDK不等于本轮执行登录/处理验证。

- 真实版本 **Chrome/154.0.8037.98**，时段 **2026-10-05T08:11:29.380Z—08:28:10.748Z**（北京时间16:11—16:28）。
- `papegames`：列表3＋详情2＋filter1＝**6次**；`papegames_social` 同样 **6次**。两首页无职位列表请求。
- 四来源含莉莉丝官网导航复核合计**列表/详情22次，计入filters为28次 ≤40**。metadata另计 **70次**（IP位置28、匿名login_status28、通用字典14；叠纸两source各15、莉莉丝各20），没有主动获取候选人数据。正常HTML/静态资源/遥测另外记录；全部network事件1125次、Document16次。精确分项见 `/tmp/ande-feishu-games-request-audit.json`、完整ledger `...-state.json`。
- 本轮无HTTP403/405、详情必须登录或可见安全验证；遇其中任一项即停该source，不重试/绕过。
- **finally已执行退出与删除临时profile**：`chromeExited:true,profileRemoved:true`，磁盘检查 `profileExists:false`。唯一临时目录 `/var/folders/4q/mhw4nbld15b61smdckdz57wh0000gn/T/ande-bytedance-probe-ZkUC6H` 已删除；证据 `...-closed.json`、`...-request-audit.json`。
- captures均为 `/tmp/ande-feishu-games-*`，仅临时第一方证据，不是生产raw/snapshot或长期云端存储。已统一去除token/cookie/CSRF/authorization/签名具名值及URL query值，headers从开始仅保存业务白名单，不保存Cookie/鉴权头；报告 `...-redaction-report.json`（608个自动捕获/派生文件处理）。这里只读取正常业务JS/网站schema；自动脚本捕获不等于对安全SDK研究。

**结论：** 两叠纸source的普通入口、空条件profile、官网计数/offset/身份、具名job_function、混合招聘性质及列表全文样本已核验；完整分页/两轮全字段与ID、跨入口完整关系和日期语义仍未证明。父流程仍需逐source完整性验收和放行，不能因本轮两详情通过就认定采完或发布。[莉莉丝同轮核验](lilith-verification.md)另记录其index/career范围不一致；本轮没有改实现/注册、生产crawl/update/publish或部署/提交。
