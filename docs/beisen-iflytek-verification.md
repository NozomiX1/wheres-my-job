# 北森 · 科大讯飞校／社第一方核验（v0.26）

**只读研究；不等于生产采集、来源资格或发布。** 2026-10-05 12:35:39–12:50:25Z（北京时间20:35–20:50），仅写本文件和 `/tmp/ande-beisen-iflytek-*`。未运行生产 `crawl/update/publish`，未写 `crawler/out/`、登记表、实现、前端或公开数据；父已保存28,619隔离基线。研究候选均标 `researchOnly:true,notProductionSnapshot:true`，**不得直接晋升**。无登录、申请、验证码操作、签名／SDK研究、TLS忽略或指纹伪装；只观察正常公开业务请求及正文renderer。

## 1. 核心结论

- 第一方公司官网「加入讯飞」链接北森门户；公开bootstrap确认科大讯飞股份有限公司、租户 **100845 / iflytek**、portal **`6e2235dc-4b88-4698-b96a-5a73c705d8db`**。
- 原 `Category:["2"]` 仅校园普通渠道120，不包含另列的人才项目。按本轮父明确的扩大范围要求，正常多选 **`["2","3","4","5","6","7"]` 两轮完整返回166**，社会 `["1"]` 两轮727；无Category的官网「全部职位」两轮893。联合166与无Category中非社会166，**所有60个raw字段逐岗完全相同**；社会727仅因实际DisplayFields多请求部门，`ClassificationTwo`投影不同，其余raw字段相同。无未分类／未知类别；GUID和数字业务ID的校社交集均0。
- 列表已含完整独立**纯文本** `Duty/Require`。10个跨校园、社会、飞星、飞凡、校园大使、星火X全职／实习样本，列表—正常独立详情原文严格相同；实际DOM完整两段仅忽略空白后相同。无需893次机械详情。
- **官方详情参数用GUID `Id`，不是数字 `JobAdId`。** 本轮两个字段正常共存、含义不同，不能当冲突alias；十条详情均同时核回两个原值。
- 本租户 `ClassificationOne` 是「岗位类别」（职能），**不是批次**；`ClassificationTwo` 是「招聘部门」。`Category`是渠道／项目类别；`Kind`是性质。`PostDate`已由官网「发布」标签和原renderer确认；`ChangeDate`含义仍未知。
- `Kind`空值、不明渠道／人才维度保null。星火X明确是独立全职＋实习人才计划，不能因保存于校园key强推每岗校园；校园大使也不能仅凭名称标实习／人才计划。

可直接交给共享实现设计的资料：**`/tmp/ande-beisen-iflytek-final-profile.json`**；早期版本和修正说明为 `profile-early.json`、`profile-early-v1.json`。它们是建议与证据，不是登记变更或生产放行。

## 2. 第一方身份、导航与范围迁移

第一方URL：

- [科大讯飞公司官网](https://www.iflytek.com/)：「加入讯飞」实际href为 [iflytek.zhiye.com](https://iflytek.zhiye.com/)。门户页脚同公司品牌并链接回公司官网。
- [校园首页](https://iflytek.zhiye.com/campus)／[校园普通职位](https://iflytek.zhiye.com/campus/jobs)、[社会首页](https://iflytek.zhiye.com/social)／[社会职位](https://iflytek.zhiye.com/social/jobs)。
- [全部职位](https://iflytek.zhiye.com/jobs)：官网BSGlobal.Pages明确配置「全部职位列表」，正常公开页面自行发出不带Category的列表请求；不是凭空猜API参数。**不是声称中文主导航有直接「全部职位」按钮**。

`company/tenant/campus/social-landing.{json,png}`、各 `*-jobs-landing.{json,png}` 保存完整DOM、实际链接、页面标题和截图；`bootstrap.json`保存原BSGlobal。它的 `tenantInfo.Id:100845,Name:"iflytek",Alias:"科大讯飞股份有限公司"` 与导航／公司站双向身份证据一致，不只依赖旧登记。

| 原类别 | 第一方页面与人群事实 | 本次Count／性质 | 建议channel／talentPlan |
|---|---|---|---|
| 1 社会招聘 | [社会职位](https://iflytek.zhiye.com/social/jobs)，无地点／职能／部门条件 | 727，全职727 | social／null |
| 2 校园招聘 | [校园职位](https://iflytek.zhiye.com/campus/jobs)，页面说明2027届；实际body没有batch／届次条件 | 120，全职14、空Kind106 | campus／null |
| 3 实习生入口 | [飞YOUNG实习生](https://iflytek.zhiye.com/intern/jobs)，官方说明2027届留用实习已结束、引导看校园正式岗 | 0 | 本次无岗位可逐岗确认；保留入口，**不把code3一律当校园**，未来非零需复验性质／项目契约 |
| 4 飞星计划 | 校园主导航及首页链接 [飞星计划](https://iflytek.zhiye.com/4/jobs)；明确针对国内外顶尖高校**应届硕博**的招聘专项 | 11，全职8、空Kind3 | campus／true |
| 5 飞凡计划 | 同校园导航链接 [飞凡计划](https://iflytek.zhiye.com/5/jobs)；明确「战略级**校园人才招募和培养项目**」「全球优秀应届毕业生」 | 3，全职3 | campus／true |
| 6 校园大使 | 实习生下拉导航的 [校园大使](https://iflytek.zhiye.com/6/jobs)；唯一完整JD明确27届及以后本科生／研究生／博士生 | 1，空Kind | campus／null；不猜用工性质，不把大使自动改成人才计划 |
| 7 星火X顶尖AI人才计划 | 独立顶级导航 [星火X课题方向](https://iflytek.zhiye.com/7/jobs)；明确面向全球AI顶尖青年人才，**覆盖全职和实习生招聘**，不是写校园渠道 | 31，全职19、实习12 | **null／true**，按每岗Kind保性质，不由key／标题强推渠道 |

官网首页部分旧宣传仍写2026春招，实际校园列表说明2027届；不能用宣传或登记 `batch:"2027届校招"` 证明请求只覆盖某届。首页社会城市模块数字可跨地点，不相加当唯一总数。

**迁移边界：** 建议既有 `iflytek` 从单Category2扩大为六个明确公开非社会入口联合166；不新增key、不重复保存全部893。`iflytek_social`保持Category1社会727。联合范围包含渠道未知的星火X，并非「166条都为校园」或公司全球／后台全集。46个项目机会不在原Category2中，不能继续以120冒充全部职业／项目；历史校107／社134是旧覆盖迁移材料，不证明仍在招或已经下架。父后续生产验收、登记／scope说明和发布另行执行。

## 3. 原生请求、响应与投影

列表接口：[POST `/api/Jobad/GetJobAdPageList`](https://iflytek.zhiye.com/api/Jobad/GetJobAdPageList)。官网普通列表默认 `PageSize:20,PageIndex:0`；本研究只把PageSize改为100，使用普通同源浏览器fetch，无额外headers／cookie／SDK调用。

广联合建议body：

```json
{
  "PageIndex": 0,
  "PageSize": 100,
  "Category": ["2", "3", "4", "5", "6", "7"],
  "KeyWords": "",
  "SpecialType": 0,
  "PortalId": "",
  "DisplayFields": ["Category", "Kind", "LocId", "PostDate", "ClassificationOne", "WorkWeChatQrCode"]
}
```

社会只改 `Category:["1"]`，且**按原社会页面**在DisplayFields的ClassificationOne后增加ClassificationTwo。无Category的广见证body是普通六字段body**省略Category**，不是清空必要渠道的生产建议。原body／response定位：`lists-response-109.txt`（校）、225（社）、343（实习）、466（飞星）、587（飞凡）、708（星火X）、829（大使）、955（全部）；请求URL和body都在 `lists-report.json`。

- `Category`：由各官网请求和搜索条件「招聘类别」逐项绑定，不是职能筛选；只有社会1／普通校园2是明确校社渠道，其余是单独项目／入口。
- `SpecialType:0`：默认「全部职位」的正常模式，页面另有热招等精选模块；未选热招／长期／奖励条件。没有研究其它值的SDK或私有协议，不猜全部数值枚举。
- `PortalId:""`：**所有广列表实际如此**。首页社会计数模块则传上述portal UUID、PageSize1、DisplayFields仅Category，同一社会Count727；它不是完整列表。UUID归属由BSGlobal确认，不擅自填入广列表或解释为另一个租户。
- `DisplayFields`：公开元数据显示投影，不是职业／项目筛选。首页同一社会首岗仅请求Category时，Duty／Require仍全文，但Kind／分类null、LocNames空、PostDate为`0001-01-01T00:00:00`、PostDateInt0；广列表相同GUID正常得到全职／地点／日期／职能。部门额外字段使727个社会岗有ClassificationTwo；全部／联合不请求部门时为null。这种**未显示投影不证明业务上没有部门**，不要因此额外逐岗详情。

本次原生列表形状：

```json
{"Code":200,"Message":"operation success","MoreMessage":"","TipType":"Success","Count":166,"ReturnUrl":null,"Data":["完整岗位对象"],"Total":0}
```

`Success/success`在原生响应中均**没有**，不是必须捏造true。**Count是实际页面总数；Total恒0，不能当主总数或与Count做alias等同。** 正常详情／搜索条件又是 `Code:200,Message:"operation success",MoreMessage:null,TipType:null,Count:0,Total:0`；不能把列表的TipTypeSuccess或数组Data契约套给它们。源码原始业务客户端也以Code200判断、用Count分页；片段 `client-list-request-pagination.js`。

### 严格未知shape建议（未在本研究实施）

固定source／tenant／API／Category集合／DisplayFields／正文模式；HTTP200、own Code200、own合法Count及数组Data、精确页长、唯一原生ID、两轮全部raw稳定缺一不可。显式出现的Success/success非true或失败Code拒源，不能把缺Code／错误对象／Total0／退出0降级成功；无需要求Message永远非null。已知可空元数据保null；未知非空JD字段／正文别名冲突／非法类型／身份错配应拒源、复验，而非忽略新正文或产半份。Kind陌生**字符串**性质仍null且原值保留，不由标题猜；非法非字符串shape另拒源。类别树／新增或null类别影响scope，须重新证明范围，不能静默落出六类。零岗须同样证明，不把业务拒绝当零。

## 4. 双完整分页、稳定性与非封顶证据

| 独立扫描 | 每轮页长（100） | Count、GUID／数字ID唯一数 | 两轮按GUID排序、递归对象键排序的全部raw SHA-256 |
|---|---|---:|---|
| 原Category2 | 100 / 20 | 120 | `b0707f5e92cc8da85a1b4fd7650f1c17ceb428a1ac4a817802c81bf5eb4d9329` |
| 社会Category1 | 100×7 / 27 | 727 | `ac8132b6b333447d8b117ada81e39726e663de7bfd9ecaccdbf4856af78ba1f9` |
| 无Category全部 | 100×8 / 93 | 893 | `7b089fe018454f3f9525ffe522523ea198b83aa47d8b33dd94c7ce7f09329e40` |
| **多选Category2–7联合** | **100 / 66** | **166** | `ceeaae917bda7dc20645493a49a03b7df12155b2608973b63df35a376a9a17c7` |

- 原校／社会／无Category各两轮于 **12:41:45.320–12:42:05.039Z**；广联合两轮 **12:45:34.114–12:45:35.896Z**。每页HTTP200、Code200、TipTypeSuccess、Count同源稳定，长度等于 `min(100,Count-PageIndex*100)`；无早空／短页／重复ID。**包括原邮箱在内全部raw原文未脱敏**，不只是canonical／标题／ID相同。
- 联合是直接服务器多选查询，不是分类count相加或title去重。166与无Category的非社会集合**逐字段完全相同**；社会和无Category只差上述部门投影。原校120也完整包含于联合。
- 无Category实际类别分布：社会727＋普通校园120＋飞星11＋飞凡3＋大使1＋星火X31＝893；Category3为0，无缺CategoryId、null、未知类别或其它类别。原官网全部搜索条件只列当前有岗的1/2/4/5/6/7，额外实习入口3由导航及明确零列表另证。
- 社会与原校园、扩大联合的**GUID与数字JobAdId交集均0**；全部893的两种ID也各自唯一。不能按标题或跨租户ID推通用去重。
- 完成后正常请求联合page2、社会page8、全部page9均HTTP200／Code200、原Count不变／Data空。两轮完整集合、原UI总数、边界、无Category与官方枚举的交叉证据共同证明**本次公开门户当前范围无观察到封顶／漏未分类**；不是仅因Count小于某阈值或程序退出0而声称完整，更不保证后台未公开机会。

原材料：`*-round<N>-page<M>.json`同时保存请求、HTTP状态、完整响应文本和逐页起止时间；`*-candidate-round<N>.json`保全部raw；`scan-report.json,supplement-report.json,raw-comparison.json,relationships.json`保各页长度／Count／hash／精确关系。

## 5. 身份、全文、日期与十个独立样本

### 真实链接与独立详情协议

官网列表原点击handler被普通DOM `.click()`触发，CDP `Page.windowOpen`记录 `.../campus/detail?jobAdId=f5f072c2-be0f-4a3e-9e68-08cc5bd85fe1`。该调用 `userGesture:false`，**没有加载新的详情tab，不伪称鼠标popup已经成功**；随后正常直接导航到该GUID链接，页面与业务详情均成功，十样本相同口径。

[第一方详情接口](https://iflytek.zhiye.com/api/JobAd/GetJobAdInfo)是页面自己发出的正常GET：

```text
/api/JobAd/GetJobAdInfo?jobAdId=<Id GUID>&category=2
  &displayFields=["jobAdName","Duty","Require","Category","Kind","LocId","PostDate","WorkWeChatQrCode"]
```

实际原网页另加正常缓存timestamp；未调用投递／收藏接口。星火X详情显示项额外包含Degree、ClassificationTwo。网页自己每岗发2–3次GetJobAdInfo，本轮保存**28份**正常详情响应；不是研究主动重试／机械取全量。28份均HTTP200／Code200；Data为单岗位对象、TipType:null，与列表不同。

GUID `Id`是上述URL／GetJobAdInfo身份；数字 `JobAdId`是另一个业务引用，保raw但不能替换URL，也不能要求二者字面一致。链接路由按每岗CategoryId：1 social、2 campus、3 intern、4/5/6/7各数字路径，不能把扩大联合所有项目仍硬拼campus/detail。

| 类别／覆盖理由 | GUID（即官网链接参数）／另一个数字业务ID |
|---|---|
| 普通校园算法／英文框架与加分项 | [f5f072c2-be0f-4a3e-9e68-08cc5bd85fe1](https://iflytek.zhiye.com/campus/detail?jobAdId=f5f072c2-be0f-4a3e-9e68-08cc5bd85fe1) / 190842455 |
| 普通校园非技术、明确全职 | [79e6862b-579e-4d1f-92e2-3eed400e9464](https://iflytek.zhiye.com/campus/detail?jobAdId=79e6862b-579e-4d1f-92e2-3eed400e9464) / 190842323 |
| 社会政府公共事务、爱博智能部门 | [69810347-e80d-46ef-b9b2-0f86ca2701d5](https://iflytek.zhiye.com/social/detail?jobAdId=69810347-e80d-46ef-b9b2-0f86ca2701d5) / 190861893 |
| 社会模型出海运营、较多英文／API术语 | [dd1bf441-8e52-4915-b149-4b8c71ba4e59](https://iflytek.zhiye.com/social/detail?jobAdId=dd1bf441-8e52-4915-b149-4b8c71ba4e59) / 190849626 |
| 社会长JD（2163字符，两段各有内嵌职责／要求） | [0e0c90f0-5862-48aa-bc84-1a6aa548a3f3](https://iflytek.zhiye.com/social/detail?jobAdId=0e0c90f0-5862-48aa-bc84-1a6aa548a3f3) / 190840378 |
| 飞星专项、标题特殊括号 | [247b87c5-020b-458b-8c39-66a85dd04c5f](https://iflytek.zhiye.com/4/detail?jobAdId=247b87c5-020b-458b-8c39-66a85dd04c5f) / 190832627 |
| 飞凡领导者项目 | [71aea93a-7e2d-4471-8912-1056c6949383](https://iflytek.zhiye.com/5/detail?jobAdId=71aea93a-7e2d-4471-8912-1056c6949383) / 190836304 |
| 星火X实习、长课题／价值／英文技术段落 | [d9b04685-72b3-4fd3-b108-94189876ccc3](https://iflytek.zhiye.com/7/detail?jobAdId=d9b04685-72b3-4fd3-b108-94189876ccc3) / 190866132 |
| 星火X全职、2623字符课题／价值／要求 | [131125df-5f9c-4a89-8373-95ba8c267ca2](https://iflytek.zhiye.com/7/detail?jobAdId=131125df-5f9c-4a89-8373-95ba8c267ca2) / 190865145 |
| 校园大使、空Kind | [093eeb37-5c9c-43e8-8801-1ae9ce9c204d](https://iflytek.zhiye.com/6/detail?jobAdId=093eeb37-5c9c-43e8-8801-1ae9ce9c204d) / 190827646 |

### 正文是纯文本，不能htmlText

第一方[详情业务renderer](https://acdn.bstatics.com/ux/ux-recruitment-portal-2022/release/dist/6868-b3974eeb02939eeadf32.chk.js)构造普通React文本children：

```js
i.createElement(P, null, i.createElement(O, null, (0,q.D4)(qt("Duty"))));
// Require用相同普通文本结构；O的样式white-space:pre-wrap
```

实际两个 `STDutyItem`节点没有任何子element，文字包含完整原段落／英文；**不是dangerouslySetInnerHTML、不是HTML富文本**。十份已保存实际document.outerHTML再由离线DOMParser提取两段全文（没有再次访问官网），与列表及28份详情逐段完全核对；`dom-comparison.json`为10/10完整断言。正文比较只忽略空白，列表—详情原字符串则严格等同。

893条均own字符串Duty／Require、两段均可读，无空正文、HTML标签／尖括号／HTML实体样本。不能因此说以后不会有 `List<T>`：生产须按已证D4仅依次解码五个实体后保留纯文本字面内容，不机械HTML剥离／反复实体解码，不截600字符、删加分项／课题价值／英文，不把同文再复制到全文匹配。**社会7条Duty与Require原字符串完全相同**，原raw保真；父按既定3/1/0.35独立字段规则保留官网实际填写的两栏，不额外复制到description，也不因相同文字删掉任一原生栏。这纠正研究稿“整段消重只算一次”建议，未改评分。上述长JD样本虽两段头部相似但全文不同，不能合并丢尾段。

详情正文之后的「集团统一招聘流程」是页面固定说明，非新增每岗JD字段；导航、投递按钮和页脚也不混入匹配。正文传输完整不保证雇主填写充分。

**可选空JD边界：** renderer确实按内容可选显示Duty／Require，但本次没有可验证的缺字段／空HTML岗位。可合法保留已明确契约的空字符串、标jdComplete:false并提示，不补「暂无」为招聘正文、不删机会；**本研究没有真实空岗位，不证明任意缺字段/null/未知shape也完整成功**。父固定profile依据可选文本renderer仅允许own Duty/Require为string或null，空/符号诚实false；缺正文属性、非文本或未知业务/Count仍拒整源，不能用可选空值豁免完整性。新空／缺字段案例需按固定profile验证，必要时独立详情／DOM复验后才放行。

### 字段语义与日期

- `JobAdName`标题、J编号后缀全部保留；`LocNames`原字符串数组是列表／详情工作地点，可含多城市、省市合串／全国，不从JD猜行政级别。
- 60字段中ClassificationOne校园联合166全有；社会142具名、**585为null**，全部保留，不能用部门／标题补职能。`bootstrap.CustomTypes`明确type1「岗位类别」、type2「招聘部门」；官网 `/api/Jobad/GetJobAdSearchConditions`同时绑定Value到同名标签。材料 `lists-response-111/229/959.txt`。
- Kind官网直接显示「全职／实习」，空值未知；合计全职771、实习12、未知110。联合为全职44／实习12／未知110，不根据渠道或JD中「实习」字样强改。
- 所有893条PostDate均有效非占位；十样本DOM各显示 `YYYY-MM-DD 发布`。第一方[列表renderer](https://acdn.bstatics.com/ux/ux-recruitment-portal-2022/release/dist/4934-1cbcf82f07bd91deec12.chk.js)以 `data.PostDateInt`格式化日期并拼publish标签；`client-list-date-renderer.js`保绑定，原实际PostDate与日期一致。因此建议 **PostDate日历日／dateKind:published**，不假定无时区字符串是UTC。
- PostDate与ChangeDate本轮恰巧893条全相同，**不证明ChangeDate是官网更新时间**；不回退created／change／采集时间。未请求日期的首页返回0001占位不能当真实发布时间。EndTime及其它日期未获语义证明。
- 所有列表Status数值1，详情样本同值且公开展示正文／投递按钮；可保 `sourceStatus:"1"`，**不猜可投成功、未暂停或下架**，没有申请测试。状态变化不能自行删除仍公开列出的岗位。

### 全部观察raw字段（60个）

`field-profiles.json`记录每源own／类型／原枚举，并保字段缺失与null之别；只统计，不自动将配置送前端。

- string（11）：`Id,PostDate,EndTime,JobAdName,Category,CategoryId,Duty,Require,Kind,Channel4SequenceNumber,ChangeDate`。
- number（8）：`HeadCount,JobAdId,PostDateInt,EndTimeInt,OrgId,Status,AllowRepeatDeliverCount,RepeatDeliverCount`。
- array（1）：`LocNames`。
- string或null（2）：`ClassificationOne,ClassificationTwo`。
- boolean（11）：`FavoritesStatus,Channel4IsHot,Channel4IsLong,Channel4HasReward,IsCollect,IsDelivered,Channel4IsAllowCampusRecommend,Channel4IsAllowExternalRecommend,InnerChannelIsTop,IsAllowRepeatDeliverSameJob,IsShowReward`。
- 本次列表均null（27）：`Org,LocId,Salary,Classification3,Classification4,Classification5,Classification6,Station,Channel4ExMicroRecommendScore,Channel4ExMicroRecommendReward,Channel4RewardDescription,SubmissionLimit,BelongStoreId,Degree,YearsOfWorking,WorkTime,Insurance,Welfare,WorkWeChatQrCode,Channel4CampusReward,Channel4CampusScore,Channel4CampusRewardDescription,Channel4ExternalReward,Channel4ExternalScore,Channel4ExternalRewardDescription,JobVideoJd,DetailAddress`。

某字段本次投影null不保证业务不存在；申请／奖励／推荐配置不当职能／人才项目／性质。未知保raw事实与null，不由字段名猜。

## 6. 时间、请求数、失败与网络口径

研究活动请求统计（不是生产性能SLA）：

| 会话 | UTC起止 | CDP页面请求 | iflytek API / 其中主列表 / 详情 |
|---|---|---:|---:|
| 官网／入口观察 | 12:35:39–12:36:30 | 560 | 11 / 1 / 0 |
| 八个正常列表页面 | 12:37:40–12:39:19 | 970 | 74 / 8 / 0 |
| 原校／社／全部双扫 | 12:41:38–12:42:05 | 160 | 49 / 39 / 0 |
| 广联合／边界／十详情 | 12:45:25–12:46:44 | 1,299 | 75 / 8 / 28 |
| 离线DOM三次（两次研究断言修正） | 12:49:24–12:50:25 | 0 | 0 / 0 / 0 |
| **合计** | | **2,989** | **209 / 56 / 28** |

209包括正常网站自身通用设置／筛选／计数等，不全是主动列表；主列表56含网站原生首页／第一页、38个原校社全部双扫页、4个多选联合页和3个边界。没有用数量或HTTP退出0替代完整性判断。

原早期失败均保留，不隐去：

1. 本地bootstrap提取误用第一个分号切JSON，截到字符串内分号，SyntaxError；不涉及新HTTP。改为正常页面读取BSGlobal。
2. 离线详情断言误沿用列表TipTypeSuccess，真实详情为null；保 `early-dom-comparison.json`／script／log／NetLog，改端点契约后重跑。
3. 离线DOM初selector误以为Duty和Require有两种class；官网实际两个节点同为STDutyItem，原断言2!=1；保 `early2-*`，修两段顺序并完整重跑10样本，未弱化为首段或API自证API。

没有岗位API HTTP／业务拒绝；最初首页7次video `ERR_ABORTED`是换页面取消媒体（原HTTP206），不是岗位缺页。部分重定向／导航离开后响应body无法再由CDP读，记录captureError，不伪称已存字节；目标主列表／28份详情原文全部存齐。

**网络与proxy分开记录：** Chrome没有新设proxy参数，但实际macOS系统HTTP／HTTPS proxy均 `127.0.0.1:1082`，环境变量一致，正常请求远端IP也为127.0.0.1；这是已有代理，不归本研究所有，未更改或关闭。`system-proxy.txt`、每会话process参数和NetLog保据。

- 页面正常外网包括科大讯飞／北森业务、`acdn.bstatics.com`、`portal-oss.zhiye.com`、`italent.cn`资源／遥测，以及公司首页的讯飞／百度统计；2,989计数含75个data内联请求、重定向和OPTIONS。逐origin／status、异常、请求URL见 `network-summary.json`和原report。没有声称页面零外网或只有API。
- Chrome后台另观察 **140个REQUEST_ALIVE HTTP(S) source**（23/27/22/53/5/5/5），**116个有HTTP200响应头**，合计记录到 **1,712,846字节URL_REQUEST_JOB_BYTES_READ**；包括Google time/checkin/update/component/optimization/autofill。**存在成功后台联网，不是阻断测试，不能写成功外连0。** 网站之外一次未被主页面CDP覆盖的百度统计结束请求也单独列otherTarget，未冒归为招聘API。
- NetLog还记录 **53次UDP_CONNECT -109（ERR_ADDRESS_UNREACHABLE）**，逐source的地址／事件保留；是OS路由失败，不是代理拒绝。后台Google注册自身曾出现429，与岗位来源业务拒绝不同，未由研究主动重试／绕过。其它取消／DNS／缓存错误也按原事件记录，不能把`--disable-background-networking`当完全无后台证据。

NetLog为浏览器实际原日志，只核网络尝试，不研究签名SDK、设备指纹或相关遥测内容。匿名页面正常加载的其它脚本没有被调用／外注／替换。

## 7. 原始材料与清理

所有临时文件共同前缀 **`/tmp/ande-beisen-iflytek-`**；无需脱敏，raw岗位JD中的邮箱原文保真，报告不摘抄无关个人信息。没有抓取候选人／简历／投递记录。完整文件清单、时间、大小与SHA-256在 **`/tmp/ande-beisen-iflytek-manifest.json`**，其中包含本Markdown hash；manifest自身不循环hash。材料用途：

| 原材料组 | 内容 |
|---|---|
| `company/tenant/campus/social-landing.*`、`*-jobs-landing.*`、`bootstrap.json` | 公司导航、租户、各项目与全部入口、完整实际HTML／文字／截图 |
| `observe/lists/supplement-response-*.txt`及对应report | 网站自身响应完整传输正文、请求body／URL／时间／status；正常加载的业务客户端原字节 |
| `*-round<N>-page<M>.json`、`*-candidate-round<N>.json` | 原120、社会727、全部893、直接广联合166的双全扫，完整原响应和raw；不得晋升 |
| `*-boundary.json,relationships.json,raw-comparison.json,field-profiles.json` | 真实边界／Count、两种身份关系、全部raw稳定与字段类型统计 |
| `sample-<GUID>.{json,png},dom-comparison.json` | 十个实际详情完整DOM、列表raw、截图及28份原API逐字段证明 |
| `client-detail-text-{renderer,style}.js,client-list-date-renderer.js,client-list-request-pagination.js` | 本轮网页自身业务renderer／日期／分页绑定片段；完整原JS另保response材料 |
| `profile-early*.json,final-profile.json` | 早期资料／修正及最终固定profile设计建议，不是资格 |
| `netlog-*.json,early*-netlog-offline-dom.json,network-summary.json,system-proxy.txt` | 页面、已有proxy与浏览器后台三类实际网络证据，含早期材料 |
| `early-failures.json,early*-dom-comparison.json,*.cjs,*.log,cleanup.json` | 本地探针／早期失败／最终断言／实际环境清理 |

版本：**Chrome/154.0.8037.98，Node v25.8.0**。复用既有 `/tmp/ande-bytedance-cdp.cjs` 的CDP/open/sleep标准库实现，独立复制至本前缀，仅修改临时profile命名并追加NetLog参数；没有修改原helper。使用macOS Chrome原生headless UA，未伪装Windows／TLS。所有7会话均finally `Browser.close`、关闭CDP、必要信号退出和profile删除，内部报告均 `chromeExited:true,profileRemoved:true`。

最终另以 **fs.existsSync／ps／实际lsof端口**复核，不只相信cleanup布尔值：

| PID | 实际调试端口 | 临时profile尾名 | 复核 |
|---:|---:|---|---|
| 97409 | 62946 | bj9RPd | process不存在／端口不监听／profile不存在 |
| 97724 | 63504 | E4tVjI | 同上 |
| 97979 | 64067 | W8ZfwU | 同上 |
| 98439 | 64695 | FtKzEv | 同上 |
| 98852 | 65382 | ogtpnz | 同上（早期断言） |
| 98914 | 65526 | 2ZcZiT | 同上（早期断言） |
| 99028 | 49236 | GjUcpI | 同上 |

全路径为各report中的 `ande-beisen-iflytek-profile-*`；`ps axww`本前缀Chrome过滤空。未启动本地HTTP server／新proxy，已有1082代理不清理；未触碰父或其它代理浏览器。原临时证据保留，已删除的仅运行profile。父已在改注前核1846临时材料及原研究文档SHA、7profile/ps/实际端口，并保原稿于 `/tmp/ande-beisen-research-originals/beisen-iflytek-verification.md`（原manifest文档hash指这份原稿）。正文D4的五实体定义在原 `lists-response-132.txt`，与正文调用一致；后续补记仅纠正设计建议，不替换第一方原材料。

候选不自动放行；父仍须固定范围、最小共享实现、离线与新的生产原字段双扫、安全链／同版本页面验收，再决定本地发布。
