# 莉莉丝 · 正常公开来源核验（SPEC v0.24）

本页小样本与旧index登记状态是初核历史；父后续四门户各双全扫证明关系、明确现有key联合范围并本地发布校园82/社114（54同posting重叠已核准、index-only1保留），见[最新关系/采集及发布](feishu-batch-verification.md)。不把下文仅index55当当前全社招。

2026-10-05 的**小样本核验，不是全量采集、成功快照或发布证明**。仅登记来源 `lilith` / `lilith_social`；未改注册表、实现、公开数据或其他项目文件。本轮发现：登记社招 `/index` 不是当前官网导航的社会招聘 `/career/`，不能把 `/index` 的成功当作当前全社招覆盖。

## 1. 实际 source profile 与覆盖边界

| key / 核验入口 | rootURL（实际 API origin） | websitePath / portalType | 官网 website ID / 名称 | 官网显式 count |
|---|---|---|---|---:|
| `lilith` · [campus](https://lilithgames.jobs.feishu.cn/campus) | `https://lilithgames.jobs.feishu.cn` | `campus` / **6** | `7055353811552176391` / 应届生招聘官网 | **18** |
| `lilith_social` · [index](https://lilithgames.jobs.feishu.cn/index) | 同上 | `index` / **6** | `7195814276795353402` / **活水平台** | **55** |
| 导航复核，**不是另一已登记来源** · [career](https://lilithgames.jobs.feishu.cn/career/) | 同上 | `career` / **6** | `7055353811552127239` / 社招官网 | **113** |

这些 rootURL 是网络实际请求的 origin，不是响应中名为 `rootURL` 的字段。API 从 origin 下 `/api/v1/...` 发出，不带 `/campus`、`/index` 或 `/career` 前缀；入口通过 **`website-path` header** 区分。portal6 在这三个入口均真实出现，不能套用字节校招3/社招2，也不能只凭 portal6 判断招聘渠道。

第一方证据：campus DOM/导航 `/tmp/ande-feishu-games-action-1.json`，index DOM `/tmp/ande-feishu-games-action-4.json`，career DOM `/tmp/ande-feishu-games-action-7.json`；对应 HTML 中的 `website_info` 已单独摘取为 `/tmp/ande-feishu-games-websites.json`，原 HTML 为 `...-lilith-1.html`、`...-lilith_social-191.html`、`...-lilith_social-372.html`。实际 request header/body/status 见 `/tmp/ande-feishu-games-request-audit.json`。

### 官网导航并不支持把 index 当全社招

- campus 正常导航明确链接「社会招聘」到 `/career/`、「校园招聘」到 `/campus/`、「实习招聘」到 `/intern/`，首页到 `https://jobs.lilith.com/`；index 页面没有这组导航。`website_info.children_website_info` 也列 campus、career、intern，而 index 的该字段为 null。
- 同轮空条件 count 分别为 index55、career113。两者首页样本共享 posting ID `7690515099362248996`、`7690478486100543785`；**没有枚举两份完整 ID 集合，不证明55全被113包含，也不按标题合并**。网站身份、导航和计数已足以证明不能把两个入口当同一已核验范围。
- index 的具名职业筛选根为技术、艺术、产品、战略；career 为技术、艺术、产品、发行、战略、质量、项目管理、职能，另外展示「启程计划」项目选项。它们是各入口实际可选项，不是公司后台职业全集证明。
- campus 的职业根为技术、艺术、产品、发行、战略、质量、职能；招聘项目选项只有 `7668460715821254922`「2027秋招」。正常请求**不选该项目**。另有独立 intern 导航，故 campus18 不能宣称包含公司全部实习招聘；本轮不请求或接入 intern。
- career 的普通 DOM「校园招聘」链接为 `/campus/`，但旧 `web_ui_config.navigation_bar_items` 中同标签配置到 intern；这处第一方配置与实际渲染有差异，不能仅从其中一块配置推导所有入口。以上 campus 导航结论依据实际可见链接。

**范围结论：** campus 可以核验为「该校园官网无职业/项目选择的公开范围」；index 只能核验为「已登记活水平台的无筛选公开范围」。若父流程改接官网当前社招 career，须明确记载入口范围迁移和身份对账，不能静默改 URL、更不能把 Byte 的限定范围迁移许可外推到莉莉丝。这里没有执行迁移，也没有授予 index/社招发布资格。

## 2. 正常请求、分页与精确计数证据

三入口正常页面均为 `POST /api/v1/search/job/posts`，URL query 与 JSON body 对应，列表第一页实际 body：

```json
{
  "keyword": "", "limit": 10, "offset": 0,
  "job_category_id_list": [], "tag_id_list": [], "location_code_list": [],
  "subject_id_list": [], "recruitment_id_list": [], "portal_type": 6,
  "job_function_id_list": [], "storefront_id_list": [], "portal_entrance": 1
}
```

`subjectIdList:[]`，所有职业、职能、标签、城市、招聘性质、门店条件均空；不能恢复旧 `matchKeyword` 或 `exclude` 个人过滤，也不能把登记 `batch` 当实际查询条件/岗位属性。本轮没有使用这些条件。

页面实际加载 `GET /api/v1/config/job/filters/6`。小探针仅复用已观察的公开业务 URL/JSON/header，在原 Chrome 页面执行普通原生 XMLHttpRequest，改变 limit/offset；没有调用或生成签名、外注 SDK。原网页自身产生的签名参数只做脱敏记录，后续小 XHR 的实际 URL 没有签名参数且正常 HTTP200/code0。不能因此推断以后所有环境都无需官网正常会话。

| websitePath | limit / offset | 返回长度 / count | 原始响应文件（均 `/tmp/ande-feishu-games-` 前缀） |
|---|---|---|---|
| campus | 10 / 0 | 10 / 18 | `lilith-47.json`；重新打开同页 `lilith-1105.json` 仍18 |
| campus | 2 / 10 | 2 / 18 | `lilith-1119.json` |
| campus | 2 / 17 | 1 / 18 | `lilith-1120.json` |
| index | 10 / 0 | 10 / 55 | `lilith_social-239.json` |
| index | 2 / 10 | 2 / 55 | `lilith_social-1123.json` |
| index | 2 / 54 | 1 / 55 | `lilith_social-1124.json` |
| career（导航复核） | 10 / 0 | 10 / 113 | `lilith_social-422.json` |

官网分页器分别显示 campus2页、index6页、career12页；业务 JS 的分页转换是 `offset:(current-1)*limit`（业务脚本 `5615.9cadf6d0.js`）。这是零起点 offset，不是 `page`。API 成功包装为 `code:0,message:"ok",error:null`，显式总数为 **`data.count`**；`data.extra` 是跟踪 JSON **字符串**，不是独立更精确的 total。

两登记入口各仅取得 **13个不同 posting ID 的列表样本**，抽查末位返回1条、count稳定，没有观察到10000触顶；**没有逐页扫完、越界空页验证、全 ID 集合/两轮一致性验证**。18/55 是官网当时显式计数，不能把13条样本或网页页数当完整采集证明。career仅第一页，113也不等于本轮取得113条。

## 3. 两职业详情：列表已经有全文

公开详情正常请求 `GET /api/v1/job/posts/{postingId}?portal_type=6&with_recommend=false`，body 位于 `data.job_post_detail`；页面也只展示「职位描述」「职位要求」等正常详情，不操作「投递」。

| 入口 · posting ID / 官网岗位 | 列表/详情 description、requirement 的 UTF-16 字符数 | 实际具名类别 | 详情 API / DOM capture |
|---|---|---|---|
| campus · [7685306318936918291 · 客户端开发工程师-cocos](https://lilithgames.jobs.feishu.cn/campus/position/7685306318936918291/detail) | 74 / 255 | `job_function.name:前端`，parent技术 | `lilith-114.json` / `action-2.json` |
| campus · [7683433530379127076 · 美宣原画设计师](https://lilithgames.jobs.feishu.cn/campus/position/7683433530379127076/detail) | 118 / 276 | `job_function.name:艺术`，无parent | `lilith-173.json` / `action-3.json` |
| index · [7690515099362248996 · 高级文案策划](https://lilithgames.jobs.feishu.cn/index/position/7690515099362248996/detail) | 215 / 133 | `job_category.name:游戏策划` | `lilith_social-299.json` / `action-5.json` |
| index · [7690478486100543785 · 高级角色概念设计师](https://lilithgames.jobs.feishu.cn/index/position/7690478486100543785/detail) | 131 / 397 | `job_category.name:设计` | `lilith_social-359.json` / `action-6.json` |

四岗的两个原始字段**列表与详情 API 逐字符串完全相同**；两个完整字段均出现于详情 DOM（仅空白规范化核对，不截尾）。角色概念设计师 requirement 自带「职位要求」「作品集要求」标题及说明，不能当噪声删除。见 `/tmp/ande-feishu-games-shapes.json` 的逐岗 equality/DOM/长度记录。

正文是原生纯文本，不是 HTML 片段；保留换行、内部标题、作品集等说明，不截600字、不做HTML解码，不把同一全文重复填入职责/全文造成重复匹配。13条列表样本内 `job_post_info.description/requirement` 均 null，`job_post_object_value_map` 均空，未发现嵌套独立JD。

**正文策略证据：** 这些样本不需要逐岗详情补全文，可优先用独立 `description` / `requirement`；不能据四个样本承诺未来所有记录无额外正文。父流程仍需对实际每条记录验证文本字段与额外独立正文，缺字段/新schema/独立自定义正文不可悄悄丢弃或返回部分成功。

## 4. 完整 observed shape 与字节差异

下面是实际样本契约，不是同系统推定；递归路径/type、各样本原文件、列表13个ID已保存于 `/tmp/ande-feishu-games-shapes-complete.json`。与字节既有 `/tmp/ande-bytedance-campus-official/sample-wide.json` 的逐 key 对比为 `/tmp/ande-feishu-games-byte-shape-diff.json`，没有新增网络访问字节。

### 列表及过滤包装

```text
{ code:number, data:{ job_post_list:Post[], count:number, extra:string },
  message:string, error:null }
Post 所有实际键（21）：
  id, title, sub_title, description, requirement, job_category, city_info,
  recruit_type, publish_time, job_hot_flag, job_subject, code, department_id,
  job_function, job_process_id, recommend_id, city_list, job_post_info,
  storefront_mode, storefront_list, process_type
```

- `id/title/description/requirement/job_process_id` 是字符串；`publish_time/storefront_mode/process_type` 是 number；`city_list` 是对象数组；`recruit_type/job_post_info` 是对象。
- campus 样本 `job_category:null`、**`job_function`具名对象**；index 恰相反，`job_category`具名对象、`job_function:null`。**字节列表只有 job_category 的映射不能直接用于校园入口**。index DOM实际显示的是具名 job_category；不根据标题猜成美术/策划，也不把数字类别ID当名字。
- 官网schema将 `field_type.type:"job_function"` 具名为「职能分类 / Function category」，campus/career的 `visible:true`，index为false。正常业务JS映射 `functionCategory:{...e.job_function,displayName:S(e.job_function)}`，S只读取 `parent.parent.i18n_name,parent.i18n_name,i18n_name`；campus详情DOM确为「技术 - 前端」和「艺术」。因此当前campus profile的category使用具名job_function叶名有第一方renderer＋DOM证明；index用具名job_category叶名。证据 `...-category-schema-proof.json`、`...-category-renderer-proof.json`。本轮没有两字段同时非空的样本，**不证明统一优先级/双显规则**；raw保留两个字段，未来同时具名或可见配置变化应按该入口renderer/DOM再核，不自行拼接新类别。
- 两入口列表 `city_info:null`，地址不能只读字节可用的 city_info；城市使用 `city_list[].name/i18n_name`。`sub_title/job_hot_flag/job_subject/code/department_id/recommend_id/storefront_list` 在本轮列表样本均null。null不是空字符串，更不说明岗位没有项目/计划。
- 具名 `job_category` 对象键为 `id,name,en_name,i18n_name,depth,parent,children`，parent可递归；`job_function` 列表键为 `id,name,en_name,i18n_name,parent_id,index,active_status,biz_create_time,biz_modify_time,parent`。列表 function 的parent可以仅一层或null；这些biz时间是类别元数据，不是岗位日期。
- `recruit_type` 包含 `id,name,en_name,i18n_name,depth,parent,children,active_status,selectability`；parent含对应具名渠道。`city_list[]` 包含 `code,name,en_name,location_type,i18n_name,py_name,mdm_code,node_status`，列表很多附属值为null。
- 本轮字节参考和这两源的21个Post键、53个 `job_post_info` 键**均无新增/缺失**，重要差异是实际null/对象、类别所在字段、城市、项目、code与性质语义，不是换一个URL就可复用字节profile。
- filters 包装同为 `code/data/message/error`；data完整键为 `job_type_list,city_list,recruitment_type_list,job_type_count_map,job_subject_list,city_count_map,job_function_list,tag_list,storefront_list`。`job_type_list:null` 不代表无职业，类别来自 `job_function_list`。campus的subject是上述2027项目，index `job_subject_list:null`；career具名subject为 `7597352729027512618`「启程计划」，都不是请求白名单。

列表 `job_post_info` 的完整53键如下；多数是null占位，不能当详情缺失就机械读它们覆盖顶层全文：

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

实际非空嵌套项主要为 `recruitment_type`、地址 `address_list` 和空 `{}` custom map；地址对象具名到 country/state/city/district，属于地点，不是职业。嵌套 `id/job_id` 在列表均null，不能用它们替代顶层 posting ID。

### 详情包装与 null/缺键差异

```text
{ code:0, data:{ job_post_detail:Detail, recommend_job_post_List:[] },
  message:"ok", error:null }
Detail 两入口共同键（15）：
  id, title, description, requirement, recruit_type, publish_time,
  channel_online_status, job_id, city_list, job_post_info,
  city_info_list_for_delivery, tag_list, storefront_mode, storefront_list, process_type
campus 另有 job_function；index 另有 job_category（每者16键）。
```

详情不是列表的null占位对象复制：未提供的 `sub_title/job_subject/job_process_id/...` 是**缺键**；city/recruit的null附属字段可能省略，`children` 则成为 `[]`。详情 `job_post_info` 仅实际输出12键：`recruitment_type,HighlightList,JobChannelPublishList,job_post_object_value_map,address_list,city_list,correlation_job_list,tag_list,storefront_list,target_major_list,job_post_process_time_list,job_level_id_list`，其中数组为空，custom map为 `{}`。`channel_online_status:1` 仅记录接口原码，不推导聘用状态/名额。

顶层详情 **`job_id` 与 posting `id` 不同**，例如客户端 posting `7685306318936918291` 的 job_id为 `7685306318936738067`，原画 posting `7683433530379127076` 的 job_id为 `7683433530378914084`。列表身份、分页唯一性和详情链接使用字符串 **posting `id`**，不可转为Number，也不按title去重。跨入口关系如需采用底层 job_id，须另作逐记录第一方对账；本轮无完整关系表。

## 5. 招聘属性与日期语义

- campus 样本 `recruit_type.id:"201",name:"正式",en_name:"Regular"`，parent `id:"2",name:"校招"`；渠道校招有具名字段证明，**正式不等于已证明全职**，employment保持null。不能依据batch、标题、实习经历要求或process_type猜性质/人才计划。
- index 两详情 `id:"101",name:"全职",en_name:"Full-time"`，parent `id:"1",name:"社招"`，可据此分别保留社招和全职。入口是活水平台这件事不替代逐岗渠道字段。
- campus列表的 `job_subject:null` 与filters项目选项可同时存在，不能给所有岗位补同一项目。index标题含「启程计划」的列表记录也不会仅由标题获得talentPlan；本轮按岗 **talentPlan:null**，不是false。
- 原始 `publish_time` 是毫秒number，四个莉莉丝详情示例分别为 `1789374911937`、`1788938989387`、`1790587689136`、`1790579207454`。但详情DOM没有带「发布/更新」含义的日期标签。正常业务JS只做 **`time:e.publish_time`** 映射，没有在本轮取得足以证明发布日期/更新日的语义。
- 因此所有这些来源的公开 **date/dateKind均应保持null**；原字段留在raw。不能按字段名、数值合理性或采集时刻标 `published`。证据 `/tmp/ande-feishu-games-business-js.json` 和官网业务脚本 `https://lf-package-cn.feishucdn.com/obj/atsx-throne/hire-fe-prod/portal/saas-career/static/js/5615.9cadf6d0.js`；未研究其安全/签名代码。

## 6. 请求预算、安全及 finally 清理

同一轮四来源的隔离正常 Chrome154 原生CDP，复用 `/tmp/ande-bytedance-cdp.cjs` 的正常Chrome启动/退出辅助，驱动为 `/tmp/ande-feishu-games-probe.cjs`。未使用用户profile，无改UA/指纹、防检测配置、TLS忽略、外注SDK或手工签名；没有登录、投递、填写账号或处理验证码。网页自动读取匿名login_status不等于执行登录。

- 运行时段 **2026-10-05T08:11:29.380Z—08:28:10.748Z**（北京时间16:11—16:28）；实际 CDP `Browser` 为 **Chrome/154.0.8037.98**，不是旧证据版本猜测。
- `lilith`：列表4＋详情2＋filters2＝**8**；`lilith_social`：index列表3＋详情2＋filters1，另官网career导航列表1＋filters1＝**8**。
- 四源合计**列表/详情22次**，把职业/项目filters也保守计入为 **28次职位相关数据请求 ≤40**；两个叠纸来源各6次。metadata另计 **70次**（IP位置28、匿名login_status28、通用字典14；莉莉丝两source各20、叠纸各15），没有主动获取候选人数据。正常HTML/静态资源/遥测另外记录；全部网络事件1125次（Document16次），完整ledger保留，未伪称总HTTP只有28次。
- 未遇HTTP403/405、要求登录才能看JD或可见安全验证；停止规则为遇到其中任一项即停止该source，不重试绕过。网页自己加载验证SDK不代表本轮调用/处理验证码。
- **finally** 已执行 `Browser.close`、等待Chrome退出并删除唯一临时profile：`chromeExited:true,profileRemoved:true`，磁盘复核 `profileExists:false`。profile为 `/var/folders/4q/mhw4nbld15b61smdckdz57wh0000gn/T/ande-bytedance-probe-ZkUC6H`，不是用户浏览器目录。`/tmp/ande-feishu-games-closed.json`、`...-request-audit.json` 保存清理及计数结果。

临时 captures 均为 `/tmp/ande-feishu-games-*`，不是生产raw/snapshot或长期云端存储。已统一移除token/cookie/CSRF/authorization/签名具名值及URL query值；headers从开始只记录业务白名单，不记录Cookie或鉴权头。脱敏报告 `/tmp/ande-feishu-games-redaction-report.json`（608个自动捕获/派生文件处理），没有研究自动加载的安全SDK。永久结论只写本文与 [叠纸核验](papegames-verification.md)。**后续父流程仍需离线回归、严格分页/全ID与字段复扫及范围放行；本轮没有采完任何来源、没有发布或提交。**
