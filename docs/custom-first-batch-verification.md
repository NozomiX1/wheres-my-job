# 第一执行批 custom 来源核验

本文件为已授权16既有 keys 的共用核验笔记，后续分组由父协调追加；同组/同接口不继承资格。本文仅记录小米研究，不改写 [PROCESS.md](../PROCESS.md) 已有静态分组，不表示已采集成功或已发布。

## 1. 小米：两既有 key 的第一方研究（2026-10-06）

基于 HEAD `c9f774ab557e6bcf330ac5221455798e5d0dc812`，观测 **08:42:03—08:48:55Z**。先完整读 AGENTS、SPEC §4–5、crawler README、两个旧适配器、对应登记和既有核验写法。只新增本文；未调用旧 CLI、修改适配器/登记/pipeline/data/out/PROCESS，未生产晋升、发布、提交、push或部署。材料均在 `/tmp/ande-first-batch-xiaomi-run/`，不是跨 runner 持久证据。

### 1.1 独立结论与实际范围

| key | 原生官网范围 | 本轮结果 | 资格 |
|---|---|---|---|
| `xiaomi` | 探索机会页面「校招」所发 `type=2`，关键词/城市空，不限职业/经验/项目/届次 | total1059、pageTotal106；106个范围内页共1059槽，但只有1057个不同 id/jobId/jobPostId，105/106页两个重复 | **阻塞**：唯一身份与官方总数不一致。停止此 scope；未启动第二轮/越界终点，不去重改总数、不盲重扫。 |
| `xiaomi_social` | 同页面「社招」所发 `type=1`，关键词/城市空 | 独立 total1910、pageTotal191；第187页首次违反唯一身份，已取1870槽、1862个不同 id/jobId/jobPostId | **独立阻塞**：185/187页八个重复。188–191页/越界终点/第二轮均未请求，不因校园失败而预判社招失败。 |

两 key 都未取得合格双完整 raw scan、所有事实稳定性与分页终点，`researchScanComplete:false / productionEligible:false`；HTTP/业务可达、数量、正文样本不是成功钟，不把阻塞写成零岗、官网无招聘、拒绝或已发布。

第一方链：正常匿名 Node GET [`opportunities.html`](https://hr.xiaomi.com/website/opportunities.html) HTTP200，页面标题「探索机会 | 小米招聘」，包含全部城市/招聘项目与无关键词广入口；实际页面加载 [`assets/js/jobs.js`](https://hr.xiaomi.com/website/assets/js/jobs.js)，其 `PROJECT_TYPE_MAP` 明确 `社招:1、校招:2、实习:3、顶尖人才:4`，all不发type；共享导航 `chrome.js` 标「小米招聘」、© mi.com，链接小米官网并以「加入我们」进入此页面。[X1]

先按页面默认无type请求第一页，原生 total3533/pageTotal354；**这只是默认第一页，不是3533全集证明**。随后仅核既有type2/type1；没有研究/采集type3/4、海外独立门户、扩登记或擅自迁到另一门户。type2返回的 `campus/futurestar/toptalent/newretailing` 链接与全部岗位原样保留；没有执行旧适配器的URL/标题删岗，也不由这些URL、标题或「顶尖」词标人才计划。登记旧“2027届/排顶尖”不是当前范围事实。[X1–X3]

### 1.2 实际请求与业务封套

官网业务 JS 的页长 **10**、页码从 **1** 开始。研究沿此正常参数，不测试加大页长、排序参数、分类分片或隐藏入口。全部手动官网请求串行、相邻开始间隔至少200ms（370次Node请求实测最小201ms；扫描还在每次完成后再等200ms），15s超时；扫描保护200页。Node fetch默认原生UA，未设置User-Agent、Cookie或Referer、未登录/签名/注入SDK；无HTTP或业务拒绝。[X1–X3]

完整 GET query（**body为null，无POST body**）：

```text
https://hr.xiaomi.com/website/api/agent/searchJobPage?keyword=&cityZhNames=&pageSize=10&pageNum=1&type=2
https://hr.xiaomi.com/website/api/agent/searchJobPage?keyword=&cityZhNames=&pageSize=10&pageNum=1&type=1
```

翻页只改pageNum；默认all第一页仅省略type。范围内原生精确封套：

```text
{code:0,message:"成功",data:{list:[岗位对象...],pageSize:10,pageNum:当前页,pageTotal:106或191,total:1059或1910},traceId:null}
```

已取得页全部HTTP200/code0，total与pageTotal在各自已取范围稳定、metadata页码与请求相等、页长精确；校园前105页10条＋第106页9条，社会已取187页各10条。**页槽数准确仍不豁免重复身份。** 未把官网 JS 的 `total||0/list||[]` 宽松fallback当验证规则，也不造有效零契约。所有原始响应/metadata保留，未剪成规范化岗位。[X2–X3]

观测岗位对象都精确含13字段：`id,title,cityZhNames,levelOneDeptName,description,requirement,expectedJobLevel,publishTime,larkJobCode,type,url,jobId,jobPostId`。id为正整数，jobId/jobPostId为不同的十进制字符串，城市为字符串数组；已取记录expectedJobLevel全null、两正文非空string、publishTime全YYYY-MM-DD。这些仅是**已取范围**的shape，不授未知空正文/新字段演化例外。[X4]

### 1.3 重复的完整身份与总数意义

下表页内位置为**1起**。每对重复的id、jobId、jobPostId、URL与**全部13原raw字段逐字段相同**（含完整职责、要求、日期及城市）；不是同标题不同岗位，也不是可忽略tracking变化。精确原对象与0起index另见X2/X3派生报告，其引用原native页文件。

| scope/id | jobId | jobPostId（URL中的posting身份） | 首次→再次 页:位置 |
|---|---|---|---|
| 校园381202 | 7671523553045236022 | 7671523553045465398 | 105:9 → 106:5 |
| 校园381207 | 7671523344941107506 | 7671523344941287730 | 105:10 → 106:6 |
| 社会1370 | 7493075248146317420 | 7648917194311305481 | 185:1 → 187:3 |
| 社会2174 | 7325623427514548333 | 7325623427514613869 | 185:2 → 187:4 |
| 社会167376 | 7565731307859691802 | 7565731307859806490 | 185:3 → 187:5 |
| 社会364 | 7194835639090741357 | 7194835639090806893 | 185:4 → 187:6 |
| 社会373 | 7497064803702325357 | 7497064803702390893 | 185:5 → 187:7 |
| 社会2448 | 7199454775069540460 | 7199454775069605996 | 185:6 → 187:8 |
| 社会807 | 7199457847846060140 | 7199457847846125676 | 185:7 → 187:9 |
| 社会1329 | 7199457304306335852 | 7199457304306401388 | 185:8 → 187:10 |

校园已拿足1059个声明页槽，但不同posting仅1057，不能据total认全集或把去重后的1057冒新total；社会1910是官网声明数，1862只是已观测唯一集合，后续页及缺失身份未知。没有足够证据证明后端重复原因（排序、合并、并发更新等均未证），不猜服务端算法，也不换scope绕过。

失败稿保留：`draft-route-assumption/`保存第一次研究脚本在第70页遇正常 `newretailing` 链接时因自行假定四条路由而失败的70页原稿。仅修这个**本地工具过窄假设**，重新完整执行校园范围，随后第106页真实重复使唯一身份断言失败；没有削唯一断言。`xiaomi-scan-failure.json`及`scans-failure.json`分别为校园/社会真正身份失败；它们不是HTTP拒绝。[X2–X3,X8]

### 1.4 社招 native JD renderer、字段与日期

分页身份阻塞后，仅沿已返回的三个社招原链接正常匿名隔离Chrome导航；未请求校园详情、申请、登录、验证或扩大来源。真实页面自动GET `/api/v1/job/posts/{jobPostId}`，原生query为 `portal_type=6&with_recommend=false&_signature=[REDACTED]&portal_type=6&with_recommend=false`（重复query确为页面原样）。官网自行加载/签名，研究未调用或逆向签名SDK；只读取业务renderer。三份均HTTP200，封套为 `{code:0,data:{job_post_detail:{...},recommend_job_post_List:[]},message:"ok",error:null}`。详情`id`等于本条jobPostId、`job_id`等于jobId、`code`等于larkJobCode；三种ID不是一个字段。[X5–X6]

| source id / title | jobPostId | 原职责＋要求字符数 | 对照 |
|---|---|---:|---|
| 100 服务产品及市场（非技术） | 7342833451802542188 | 232＋202 | 列表/详情两段逐字符相同，实际 `.jobDetail.textContent` 包含完整两段 |
| 518871 欧洲保险业务经理（慕尼黑，中英长正文） | 7681561028236773659 | 3239＋2085 | 同上，不截600/120字或删海外 |
| 1329 GPU芯片架构师（已观测重复项） | 7199457304306401388 | 259＋221 | 同上；这不是来源最终页样本 |

实际已加载的业务包 `5615.9cadf6d0.js` 把 `description/requirement`分别赋给detail；`async/5677.deef484e.js` 从 `detail.description/requirement`读取Le/je，分别作为React/Skeleton **文本children**放入`.block-content`，不以HTML渲染。其正文CSS是`white-space:pre-line`；不把别处richText组件的HTML实现套到此JD。应保留原文本、换行与内部空白，不HTML剥离、实体解码、摘要或重复复制description。列表卡片虽然只预览120字，API有全文；三个独立详情支持列表已有正文，但**样本不是全源成功，也不授校园 renderer 资格**，无需为此研究机械逐岗详情。[X1,X5–X6]

属性分维度：typeMap证明来源招聘项目标签；正文不能证明所有岗位同性质。三代表原生`recruit_type.name:"全职"/parent.name:"社招"`与实际DOM一致，只证明这三条。聚合列表没有性质/计划/职能/状态字段；`levelOneDeptName`未被本轮renderer用为职能，不按名字造category。全源性质/人才计划/职能/状态仍缺证，不猜全职、无计划或开放。代表原生`channel_online_status:1`只记录原码；DOM投递按钮存在，未点击，不等于投递成功。

**日期语义/日界未证，可靠date/dateKind应仍null**，保raw：官网列表卡片及这三详情不展示可靠日期；字段名不证明发布时间。聚合`publishTime`与原生详情`publish_time`还真实不一致：id100是2026-04-08 vs 1709637567823（数值按毫秒作UTC诊断为2024-03-05）；id1329是2026-05-11 vs 1676254529881（2023-02-13）。id518871恰同日也不能替其它记录证明语义、时区或更新时间。未把任一字段/研究钟回填排序日期。[X5–X6]

### 1.5 原材料索引、复核与清理

以下相对路径均在 `/tmp/ande-first-batch-xiaomi-run/`。`material-manifest.json`列**858项**原生材料、metadata、派生/脚本/失败稿的字节和SHA，并分别标类；派生结论必须回读原native页。没有保存Cookie/会话token、profile或签名值；原响应保真，敏感请求URL脱敏。后续本地验收日志独立存放，不冒原业务材料。

| 引用 | 精确read复核入口 | SHA256（主入口） |
|---|---|---|
| X1 | `001-entry.txt`、`003-jobs-js.txt`、`004-chrome-js.txt`、`005-all-first.txt`、`006-xiaomi-first.txt`、`006-xiaomi_social-first.txt`及对应`.json` | 各文件见manifest |
| X2 | `xiaomi-identity-blocker-detail.json`；原 `scan-xiaomi-r1-p105.txt`、`scan-xiaomi-r1-p106.txt`；其余p001–p106及metadata | `bd66c59cb91dd93c7826cc8d67a44b769e7da15f500388f4a4cb1afe3edf21f6` |
| X3 | `xiaomi_social-identity-blocker-detail.json`；原 `scan-xiaomi_social-r1-p185.txt`、`scan-xiaomi_social-r1-p187.txt`；其余p001–p187及metadata | `da27257e3e2eb616964edde62baa3c386d5da46cf40a91a41d03a1a214270404` |
| X4 | `scope-field-summary.json`、`xiaomi-observed-raw.json`、`xiaomi_social-observed-raw.json`（派生，均false） | 各文件见manifest |
| X5 | `social-sample-comparison.json`；原 `chrome-body-{026,052,078}.txt`、`detail-{100,518871,1329}-{sample,dom}.json`及PNG | `429fad168ad14db8baa2a6f7d1dcc9258f6166ad43fae60de05385ede9319d44` |
| X6 | `renderer-proof.json`（URL、原bundle SHA、字符/字节offset和片段）；原 `chrome-body-{013,023}.txt` | `cb8dad0823a92284b9f4abf5686b5254d26dc7fbf57c8abb8e5b94a16d729104` |
| X7 | `material-manifest.json`；`chrome-materials-final.json`含脱敏原native请求/响应事件 | `91f812de725e91f6b0446ae936280a749e289cab0f949924b2e50be848ca1d4c` |
| X8 | `draft-route-assumption/scans-failure.json`与原70页；`xiaomi-scan-failure.json`、`scans-failure.json` | 各文件见manifest |
| X9 | `chrome-cleanup-after.json`、`network-release.json` | cleanup `ed602531bffed0b8ef44396e37869e338c01f58376b5bf8fb58952cd122445c0` |
| X10 | `protection-before.json`、`protection-after.json` | after `abf25bce408debb3b78a508b74d4021233f2f2aec9cecc30c83689b68c4d48f6` |

三个原图均已实际查看：`detail-100.png` SHA `f01ce1b37137404c319587f94e21349a4deebd71ed4133c43075ab93bb5ed55f`；`detail-518871.png` SHA `96f7294b6a781acaa341b7735b71e551597936d01d2e10b61b122d63f50efcb0`；`detail-1329.png` SHA `937b88c1c001e9920c9bdbc93bc7b5a1dd81375c72ae79bed7be1d3b88b9df6a`。截图是正常匿名JD，长正文完整性用DOM全文核，不冒人工逐岗验收。

仅复用读过的 `/tmp/ande-bytedance-cdp.cjs`，未改helper；一自有Chrome PID27536、port52877、profile `/var/folders/4q/mhw4nbld15b61smdckdz57wh0000gn/T/ande-bytedance-probe-wgZCOd`。Browser.close后PID/profile均无、52877无监听/连接；自有扫描PID27386/27425/27481也已退出。**08:48:55Z已释放官网主动请求权，后续只做本地整理。** CDP主page记录174请求：HTTP200 158、204 14、304 2，无观察到loadingFailure/body-capture-error；含官网自动资源/遥测，不能把页面记录冒整浏览器/主机网络全零。[X9]

保护前后93文件（sites、两个旧适配器、data及89既有out）SHA/size/纳秒mtime一致。未写非目标或PROCESS；本地`analyze.cjs`原native/DOM精确比较与资源/保护断言通过；858项manifest复核零SHA/size差异，本地文档链接及`git diff --check`通过；`node --test tests/*.test.cjs` **232/232通过**（日志`offline-tests.log`，exit0），之后再次核93保护文件仍无变化。两来源继续保未验证状态，不从正常JS/样本/共享飞书实现自造qualification。[X10]

## 2. 百度：两个 scope 的原生业务拒绝（2026-10-06）

本节为六 keys（百度、美团、小红书及各自 social）的串行第一方研究追加，不改写以上小米材料或历史资格。研究基线 HEAD 仍为 `c9f774ab557e6bcf330ac5221455798e5d0dc812`；仅 `/tmp` 研究材料和本文件追加获授权，未调用生产采集/快照/publisher。百度两个 scope **分别阻塞，均不合格**，没有成功钟或有效零。

正常匿名 Node 页面与实际官网 CDN JS 证明 campus 导航 `/jobs/list?search=&recruitType=GRADUATE`、social `/jobs/social-list`；当前 JS 有 `SOCIAL/GRADUATE/INTERN` 标签、空项目/关键词默认值及页长10，但这不是全量或 JD renderer 证明。分别仅一次 POST `https://talent.baidu.com/httservice/getPostListNew`，Content-Type 为 `application/x-www-form-urlencoded;charset=utf-8`：

```text
baidu:        recruitType=GRADUATE&curPage=1&pageSize=10&keyWord=&projectType=
baidu_social: recruitType=SOCIAL&curPage=1&pageSize=10&keyWord=&projectType=
```

`09:03:43.985Z` / `09:03:44.372Z` 均 HTTP200，**原生业务**都是 `{"status":"no-auth","message":"illegal-visit"}`。分别据此停止，不换参数/UA/会话重试、不造 SDK/header/token。原响应与metadata：`/tmp/ande-first-batch-primary-baidu-node/{campus-api-first,social-api-first}.{txt,json}`；两份脱敏正文 SHA256 同为 `1de02fb7e08c0f8b81ec9d3d0b12425e1182a25d503c14e7f21dc7d04aef8c22`。页面/JS 证据在同目录，CDN 主机由真实页面脚本链接证明，不据旧适配器猜枚举。两 key 的 JD、唯一身份、双完整扫描和字段/日期资格仍未证。

失败发现稿保留在 `...-baidu-discovery-v1/`、`...-baidu-discovery-v2/`（前缀均 `/tmp/ande-first-batch-primary`）。v1 把 root→`/jobs/social` 正常302当成未审重定向而工具挂起，**不是官网拒绝**；v2 全页辅助流量未settle及 Cookie Domain误脱敏也是本地工具局限，不是主列表不可用。另存 driver v1/v3原稿；修复为只学习真实 Cookie值、Set-Cookie第一项的cookie值，不学习Domain/Path属性，并加主业务/辅助请求区分与长JSON JD保真离线断言。修复后不网络重试已真正拒绝的百度 scope。两次自有Chrome的exit/profile removal均由各自report确认。

## 3. 美团校招：广默认范围的唯一身份阻塞（2026-10-06）

`meituan` 与 `meituan_social` 正常隔离Chrome分别打开 `/web/campus`、`/web/social`，必要Document及主招聘API正常；页面显示「全部校招职位（571）」/「全部社招职位（2467）」。脚本由原生网络指向官方 `s3.meituan.net/static-prod01/com.sankuai.recruitment.official.website/`，不是泛化发现器 `complete:false` 或辅助analytics导致的拒绝。

当前 `FilterPositionList` JS 与真实 campus POST 同时证明：`jobType:[{code:"1",subCode:[]},{code:"2",subCode:[]}]`，`jobShareType:"1"`；`keywords:""`，`cityList/department/jfJgList/typeCode/specialCode` 均 `[]`；pageNo从1起、pageSize10。是含应届与实习、不限专场/人才计划/届次/地区的页面原生广scope；**不沿旧 `specialCode:["1"]` 狭范围**。当前枚举JS标1「应届」、2「实习」、3「社招」，jobSpecialCode独立标校园/实习/北斗等计划，不能用scope推导所有岗全职或普通计划。官网 `u_query_id/r_query_id` 是业务服务追加的query统计字段，正常Node请求未造这些ID、未设UA/Cookie/Origin/Referer或注入SDK，仍取得 HTTP200、数值 `status:1` / `message:"成功"` 原生封套。

校园 `09:09:26.882—09:09:31.390Z` 首轮到第16页时，native总数571/totalPage58保持不变，但 `jobUnionId:"4694862636"`（商品运营岗）从 **15页第10条→16页第1条** 精确重复；完整25 raw字段逐字段相同，含职责/要求/refreshTime/城市。前15页150条已验唯一，第16页完整10条已保raw；出现首个重复立即停止，未请求17–59页或第二轮、不去重改官方总数、不换排序/分片盲重扫。没有双完整扫描或校园实际JD DOM资格，故 `researchScanComplete:false / productionEligible:false`；社招独立继续核验，不继承此失败。

原材料：`/tmp/ande-first-batch-primary-meituan-discovery-v1/` 的page/network/report、`...-meituan-node/` 的 `filter-js.txt` / `filter-components-js.txt` / `bootstrap-js.txt` / `detail-js.txt` 及metadata、`...-meituan-scans-v1/scan-meituan-r1-p{015,016}.txt` 和其余16页/metadata。`scan-proof.json` SHA256 `1d0dcfaae6a49ba13ed48ffa57516f714c7505f4dd531c963999bdfd2f48251e`；filter JS `1dcc0cb8af7e591236ecf0b5ede448747766a8a932078b3a57a7b62469801384`。扫描工具 `/tmp/ande-first-batch-primary-meituan-scan.cjs` 有可运行 typed封套/页槽/身份/字段反例，研究工具不是生产schema。两个发现Chrome均退出且profile删除；本节时仍持六key官网主动请求权，未释放给另一网络执行者。

## 4. 美团社招：完整双列表与真实额外JD，仍是partial（2026-10-06）

`meituan_social` 独立正常Node取得两轮**完整列表**：每轮2467不同 `jobUnionId`，247个范围内页（末页7条）及248页精确原生终点。全部25 raw列表字段按身份逐字段稳定，官方totalCount2467/totalPage247稳定。原时段 `09:09:47.547—09:10:53.019Z` 与 `09:11:46.614—09:12:52.517Z`。这不是完整JD双扫描，不继承校园唯一身份失败，也不把研究钟当来源成功钟。

原封套 `status:1`（数值）/`message:"成功"`，`data:{list,page,traceId:null}`；page含 `pageNo/pageSize/totalPage/totalCount` 数值，request/echo同页、页长10。**248页原生list为null而非数组**，其page仍精确 `248/10/247/2467`。v1工具错误假定终点必须数组而失败；保原稿后仅增加这项已观测的精确typed-null终点契约，复验首轮248份原native正文/metadata SHA与完整请求，再采第二轮。范围内null/提前空/短页仍拒源，不使用 `list||[]` fallback，不因此授有效零契约。

列表页body与§3所示相同，唯 `jobType:[{code:"3",subCode:[]}]`。正常Node请求只 `Content-Type:application/json` / `Accept:application/json`、native默认UA；无Cookie/token/SDK/签名或造header，省略官网统计ID后照常成功。实际详情协议也是 POST `/api/official/job/getJobDetail`，body `{jobUnionId:"4721183269",jobShareType:"1"}`。正常Node一次与正常匿名隔离Chrome均 HTTP200、同原生业务封套；detail.data是绑定同一十进制**字符串ID**的一条25字段对象，详情不是列表封套。

### 4.1 不能把列表当全文：完整原生反例

`4721183269`（沙特SMB销售运营）列表 `departmentIntro:null`；详情却有 **226字符完整介绍**，且实际DOM清楚在「部门介绍」标题下逐行显示Keeta的使命、成立/拓展与业务全文。完整原生diff同时保整条list与detail，不裁正文：`/tmp/ande-first-batch-primary-meituan-social-details-v2/detail-4721183269-full-native-diff.json`，SHA `3e7f0caa2ea81fcbc118905fb0ff4db9a7f33e874749a6ab1ed3fb67873d4710`。另外差异为city.code、workYear（null→3年）、desc（空string→null）、precedence（null→空string）、firstPostTime（null→毫秒数）、socialRecommendJob（null→true）；不能以列表空值覆盖详情事实。长样本 `4757754732` 还实际出现108字符「具备以下条件优先」，列表该字段null。

当前default `jobShareType:"1"` 社招renderer按以下六片、真实标题及顺序完整显示；只略过已知null/空字段，不略未知新JD：

| raw字段 | 实际visible标题/顺序 |
|---|---|
| departmentIntro | 1 部门介绍 |
| desc | 2 岗位描述 |
| jobDuty | 3 岗位职责 |
| jobRequirement | 4 岗位基本要求 |
| precedence | 5 具备以下条件优先 |
| highLight | 6 岗位亮点 |

renderer `Se` 按 `\n` 切片后放入React **文本children**，CSS `white-space:pre-line`；TEXT保角括号、实体字面、空行及内部空白。jobShareType2/BOLE的HTML desc支路在本scope之外，不能套用。正文必须保全部六片及标题；独立职责/要求仅对应jobDuty/jobRequirement，不把部门/亮点复写进评分栏。当前25-key已审shape之外的字段或已知非renderer字段（如otherInfo）新出现非空JD必须挂起重审，不能宽松吞掉未知额外JD。

三样本 `4721183269` / `4757754732` / 最后页 `1587322460` 的六片详情全文、真实DOM每一行及visible顺序自动精确对照通过，JD总字符829/6031/956。三个原PNG均已实际查看；长正文超viewport部分靠DOM全文检查，不冒截图逐岗全量。详情空值、工作经验、城市原码、首发毫秒值等事实仍需全量详情验证；日期虽见「更新时间」标签，但可用固定日界未证，可靠date/dateKind仍null，不由firstPostTime名字猜发布日期，也不由「社招-正式」猜全职。

### 4.2 可离线接入材料，但尚未ready

父明确选择避免先做4934研究详情再重复生产，先交可审正常协议/renderer并继续其余来源。**`qualifiedResearch:false / fullSourceJDVerified:false / productionEligible:false / realSuccessTime:null`**。尚缺全2467必要详情及全部raw/全文稳定复验；后续正式候选仍须唯一update→crawl→完整snapshot→publish链内的新鲜完整双列表＋所有必要详情/稳定性，任何一条详情失败都不能发布。这不是降低规格或partial发布许可，也未触发生产命令。

| 入口 | SHA256 |
|---|---|
| `/tmp/ande-first-batch-primary-meituan-social-partial-schema.json`（请求/header、typed全shape、raw关系、renderer及剩余门槛） | `26406a9aaddbbe6f5a7ed25edc350b026c10858db6f41c8af9a3a9de11573f82` |
| `...-meituan-social-partial-proof.md`（离线交接说明，不是ready） | 最终manifest列出 |
| `...-meituan-social-scans-v2/scan-proof.json`，完整双列表及原页索引 | `d5cde1028a80e99379fb15e24cd89e34297cf607846893a3aa1ecbcedfcb5986` |
| `...-meituan-social-details-v2/renderer-proof.json`，邻接DOM/network/diff/PNG | `590be1634d98ee72c844a002d575ade488ecfa66575a5aa718368884eea8df1b` |
| `...-meituan-social-renderer-bundle-proof.json`，字符/字节offset、真实片段及原bundle SHA | `7b8b3dfdfbf4aa5cad2d9001171295b37620702b0058c915b65471166ccace99` |
| `...-meituan-node/detail-js.txt`，官网当前detail chunk `9a58a2ed` | `3dad3968406aaece228c8f302fe88c61f65730b444954fdfa024f990b397db61` |

上表省略前缀均 `/tmp/ande-first-batch-primary`。v1 scan/detail失败原稿及两个driver draft保留；第一次详情错误假定列表已全文而发现真实差异，修复工具为保存全raw diff、验证真实六片DOM，而**非放宽正式全文断言**。两详情Chrome已退出/profile删除，token/会话只在内存，未登录、点分享或投递。样本资格不推广全源；校园继续duplicate挂起。

## 5. 小红书：两个正常可达scope独立重复身份（2026-10-06）

正常匿名隔离Chrome分别打开已登记 `/campus/position`、`/social/position`，必要Document HTTP200、原生招聘列表HTTP200/业务成功，DOM分别显示171与847；加载正常官网脚本（含自动安全/验证码资源，但**没有实际挑战/拒绝，未操作验证**）。页面「2027校园招聘」与「社会招聘」的官网导航、主列表和当前JS已审。CDN `fe-static.xhscdn.com/formula-static/ats-website/public/` 由正常Node页面实际script链接＋runtime chunk映射证明，未研究/注入签名SDK。

### 5.1 当前校园项目范围不能冒全校园

校园当前页面实际POST body为 `positionName:"",pageNum:1,pageSize:10,recruitType:"campus",jobProjects:["campus_autumn_27"]`。不是沿旧适配器盲清参数：当前业务chunk137的 `projectCategory:Regular` 与shared search provider会按 `PositionProjectEnum.extMap.category` **强制填入regular项目集合**，真实枚举唯一regular是「2027校园招聘」/`campus_autumn_27`。同官网导航还分列REDstar顶尖校招、Ace顶尖实习生、实习生；对应原枚举类别redstar/ace/intern，不继承本scope资格。本轮既不把171当全校园/全公司，也不猜/清jobProjects或借隐藏路由扩范围。若后续希望替换旧宽校园范围，须另核明确的覆盖迁移，不因接口同名自动覆盖。

社招真实默认body独立为 `positionName:"",pageNum:1,pageSize:10,recruitType:"social"`；没有jobProjects、职位类别或城市筛选。两个scope各一次正常Node POST `/websiterecruit/position/pageQueryPosition`，只JSON Content-Type/Accept、native UA，无Cookie/SDK/造header，均业务数值statusCode200/alertMsg成功。观察的原封套有基础 `statusCode/alertMsg/data` 及官网可出现的 `timestamp/path/success/errorCode/errorMsg` 成功扩展；原样保留，没有把浏览器的重复默认请求当双完整扫描。

### 5.2 原生身份反例与独立停止

| key/本轮真实范围 | 原生声明 | 首个真实重复（页:1起位置） | 本轮结果 |
|---|---|---|---|
| `xiaohongshu` 当前regular2027项目 | total171、totalPage18、pageSize10 | positionId **22491**，`【2027校招】AI数据infra工程师`，**6:10→7:1** | `09:26:21.168—09:26:23.110Z`；前6页60唯一，第7页10条原raw已保。停止，未取8–19页或第二轮；且scope不冒全校园。 |
| `xiaohongshu_social` 默认广社招 | total847、totalPage85、pageSize10 | positionId **17421**，`「电商C端产品」 增长方向-直播策略产品经理`，**8:10→9:1** | `09:26:28.604—09:26:30.968Z`；前8页80唯一，第9页10条原raw已保。独立停止，未取10–86页或第二轮。 |

每对重复的 **全部16原raw字段逐字段相同**，不是同标题不同职位。原生ID是正整数；其余字段包括positionName、amountInNeed、workplaceIds/workplace、publishTime、recruitStatus、duty/qualification、jobType/jobProjectName、direction/directionName、subDirection/subDirectionName、labels。typed页metadata与请求页相等、每已取页10条，声明total/totalPage在各自已取范围稳定；这些不能豁免重复或授全集。未去重改总数、换页长/排序/分类分片盲重扫，不因校园失败预判社招失败。

当前chunk787真实JD renderer把duty/qualification以Vue文本children放入「工作职责」/「任职资格」两段，`whitespace-pre-wrap`；列表卡片CSS只两行预览，API保全文。但重复后未进行两scope实际详情DOM或全部字段/日期资格核验；因此这只是已审JS，不推广为两源JD资格，`publishTime`的字段名/日期形状也不证明日期语义。两key均 `qualifiedResearch:false / researchScanComplete:false / productionEligible:false / realSuccessTime:null`；正常HTTP、官网数量和JS不冒成功或有效零。

材料都在 `/tmp/ande-first-batch-primary-xiaohongshu*`：两 `*-discovery-v1/` 保存完整page/network/report及PNG，`*-node/` 保存页面、main/runtime、shared-model733/shared-business221、campus137/social508/detail787+516、正常Node first POST及相邻metadata；两 `*-scans-v1/` 保完整已取native页。校园 `scan-proof.json` SHA `c58d81f1a8efb7f0834a59ee0b4c106285cead12f2dd431e7430aaf7140889fe`，社招 `f6fa52da187a7b6b5f8dc479155f4172c96594ed13302ac7d19167acdb373190`。重复原页分别 `scan-xiaohongshu-r1-p{006,007}.txt` / `scan-xiaohongshu_social-r1-p{008,009}.txt`。浏览器脱敏曾保守遮住公开asset目录标识，但未改host或JD字段；正常Node页面及CDN材料提供实际完整公开路径，不反向恢复会话值。

## 6. 六key研究结束、请求权释放与保护

**2026-10-06T09:28:27.024Z已释放独占官网主动请求权**，此后本研究执行者只做本机离线整理；没有提前启动其余四组、生产候选/采集/快照/publisher、提交、push或部署。八次自有Chrome各report均确认退出/profile删除，最终逐一复核所有已记录PID不存活、profile不存在、CDP端口无监听或连接；早期百度v1未记资源ID，只引用当时cleanup标志，不伪造PID复核。核的是自有资源，不冒主机/整浏览器外网全零。精确资源、版本、限制与释放时刻在 `/tmp/ande-first-batch-primary-network-release.json`。

六key结论：百度两key真实业务拒绝；美团校园真实重复；美团社会仅完整稳定双列表＋正常详情/renderer partial协议交接、全量JD仍待唯一生产链验证；小红书两scope独立真实重复且当前校园171为2027regular项目而非全校园。**没有合格ready-schema、来源成功快照、真实成功时间或公开数据更新。** 失败原稿保留、不把辅助工具错误当官网拒绝、不把列表/样本当全JD。最终保护、材料清单与离线检查另在下段追加。

最终复核基线inventory **201文件**（含登记、源码、data、89既有out与PROCESS）SHA256/size/纳秒mtime均一致，差异 `[]`；HEAD未变，PROCESS保原已有dirty状态而未改写。`/tmp/ande-first-batch-primary-protection-after.json` SHA `f50cc60d06833c7d64e714065c44e7daa948585a0e14481b396e384a86b5d41e`，全套测试后再核 `...-protection-after-final.json` 仍201/零差异。释放/cleanup材料 SHA `6df26244c8e25629fb5d5f9af66bf1f1d4925bafd541673cddeca8b338c3eb39`；美团partial交接说明 `...-meituan-social-partial-proof.md` SHA `7bebfccaf64034d1822f40f33cd3b852b8335b68fe07f1693a80d8404961620a`。前缀仍 `/tmp/ande-first-batch-primary`。

`node --test tests/*.test.cjs` **232/232通过**（`/tmp/ande-first-batch-primary-offline-tests.log`）；`git diff --check`通过。研究driver语法/离线反例（Cookie属性不学成token、长JSON JD保真、主/辅助请求区分、typed业务/页槽/ID/新增字段）通过；修复后完整离线复验美团496份native列表页、唯一身份及报告raw对象，partial资格false/null与本地Markdown链接检查通过。研究原稿、native值/metadata、DOM/PNG、driver版本与派生报告的字节/SHA索引统一在 `/tmp/ande-first-batch-primary-material-manifest.json`，生成后逐项复读验证；脱敏格式化研究材料不冒生产byte-identical raw replay或跨runner持久证据。统一状态入口 `...-result.json`，没有ready命名或生产晋升。小米§1保持原文；本执行者对仓库仅作本文§2–6追加。

## 7. 华为：正常原生首页与两scope第一页，Node研究请求412后分别停止（2026-10-06）

本执行者获剩余八key独占官网研究权后，按华为→携程→米哈游→上海实验室、校社各自独立的顺序研究；只写自己的 `/tmp/ande-first-batch-special-*`，完整读完本文后仅追加§7–10。未运行旧适配器、update/crawl/snapshot/publish、改源码/登记/data/out/PROCESS、提交、push或部署；父与implementation的并行合法修改另计，不沿用§6的201零差异结论。

正常Node GET `https://career.huawei.com/cn`及首页实际链接的 `/cn/campus-recruitment-job-list`、`/cn/social-recruitment-job-list`均HTTP200。官网业务JS与两个独立匿名Chrome的实际POST共同证明：

```text
POST https://apigw-dgg-b0.huawei.com/api/apig/channelhw/recruitmentPosition/pub/getJobPage?X-HW-ID=app_000000035886
huawei:        {curPage:1,pageSize:10,jobType:"CR"}
huawei_social: {curPage:1,pageSize:10,jobType:"SR"}
```

这是当前列表默认广入口，不从旧代码附加FRESH_GRADUATE、清除未证明渠道或默认人才计划。两份原生浏览器响应均HTTP200，精确 `{status:"SUCCESS",data:{pageVO,result},errors:null}`；校园第一页10条、totalRows101/totalPages11，社会独立10条、424/43。DOM和两个已实际查看的原图分别标「校招职位列表」101、「社招职位列表」424；推荐上传区及Cookie提示未操作。原生 `advertisementId`是已观测的正安全整数，jobId等其它字段不作同义fallback；mainBusiness/jobDesc/jobRequire有原值，但没有详情renderer/全集字段资格。

随后两个scope各自**第一次正常Node业务POST均HTTP412**，正文都是 `The Referer request header is not found or the verification fails.`，各自立即停止，没有第二页、详情、第二轮或换header重试。必须保留请求差异：研究Node驱动有官网公开配置的`x-Referer`，**没有实际HTTP Referer**；正常Chrome却实际发送 `Referer:https://career.huawei.com/`。这是该Node研究请求的真实拒绝，不能泛化为官网不可达、Chrome主业务拒绝或正常全量采集成功；也不能凭公开配置制造签名/token绕过。

两key均 `qualified:false / researchListComplete:false / fullSourceJDVerified:false / productionEligible:false / realSuccessTime:null`。日期、性质、人才计划未获全源资格，不把更新标签、字段名或研究钟填为可靠日期。轻量交接 `/tmp/ande-first-batch-special-huawei-schema-proof.json`；原材料入口：`...-huawei-node/`、两 `...-{huawei,huawei_social}-discovery/main-native.json`及相邻network/DOM/PNG、两 `...-{huawei,huawei_social}-scans/{r1-p001.txt,r1-p001.json,list-proof.json}`。本节省略前缀均 `/tmp/ande-first-batch-special`。

## 8. 携程：两完整稳定列表、当前fromId详情与HTML全文，映射仍partial（2026-10-06）

正常Node访问旧校园入口 `https://campus.ctrip.com/`，实际301指向 `https://careers.ctrip.com/`；后者HTTP200，真实main JS为官方CDN `bd-s.tripcdn.cn/modules/hrteam/careers-trip-new-ares/static/js/main.7d0179b8.js`。首次工具把SPA hash路由误写成pathname，落入首页、未观察到必要列表，不是官网拒绝；保留两个`*-discovery/`失败发现稿。根据当前官网JS的真实路由，改为 `#/campus/jobList`、`#/experienced/jobList`，分别重新完整观察，原稿不覆盖。

两正常原生POST独立证明 `/api/hrrecruit/getJobAd`：校园`condition.category:2`、社会`1`，其余默认关键词/数组筛选空；`pager:{index:"1",size:"10"}`、`head:{language:"zh_CN",version:"1"}`。正常Node保持各自原生body，仅逐页改字符串index，不扩大页长、SDK签名、登录或枚举隐藏入口。成功精确为字符串 `retCode:"201"`、`retMessage:"调用成功"`、`retValue:{total,recruitJobAdList}`及`ResponseStatus.Ack:"Success"/Errors:[]`；不是仅检查data存在。

| key | 两轮完整原生列表 | 原生终点 | 身份/稳定性 |
|---|---|---|---|
| `ctrip` | 每轮56，范围内6页、末页6条 | 第7页精确`[]`，total仍56 | id/jobId/fromId三种非空字符串各自唯一；所有25 raw字段按id逐字段稳定 |
| `ctrip_social` | 每轮489，范围内49页、末页9条 | 第50页精确`[]`，total仍489 | 同样独立通过，不继承校园资格 |

**当前两种公开详情路径都用fromId**：`#/campus/job-detail/<fromId>`、`#/experienced/job-detail/<fromId>`。旧校园jobId路由不能继续沿用；id是公开广告身份，jobId是独立UUID，fromId是当前路由身份，不能fallback混用。四次正常详情导航自动调用的是**同一getJobAd**，原生body只有 `condition:{fromId:[本路由ID]}`、原字符串pager及head，并没有category；返回total1、同一组三ID。当前`418.b2a12697.chunk.js`也明确如此，不猜另一个详情API。

实际详情renderer把 `i.requirements`作为`dangerouslySetInnerHTML.__html`放入`.requires`，标题是「职位描述」；duty不参与此renderer。完整545条都是非空HTML requirements、duty全null，均同25-key shape。校园MJ036670/MJ036639、社会MJ037248/MJ035783四样本的全部JD/三种身份与各自列表完全一致；原HTML长度分别485/2355、621/12399，DOM包含完整HTML转可见文本，不截600字。没有已证明的独立额外JD接口，因此没有机械重放545次相同单ID列表以重复研究。四张原图均实际读过，但都有加载遮罩，**不冒视觉ready或产品页面验收**。

已保存真实差异而非把属性稳定冒完整metadata：Node与Chrome的cityName/kindName（校园）及cityName/jobFamilyGroupName/buName（社会）有英/中文本地化差异，虽然JD/身份逐字符相同，生产仍须证明并保留正常locale协议。kindName「Fresh Graduates/应届校招生」不是全职；jobFamilyGroupName是官网职位类型，Eagle Program不因名字自动成为人才计划。publishDate在当前详情只是无语义标签的日期；可靠date/dateKind仍null，不猜更新时间或日界。

轻量交接 `...-ctrip-schema-proof.json`保持`qualified:false / productionEligible:false`，当前25-key之外的追加JD/业务结构仍须拒绝重审。官网requirements实际上装了完整职位描述，**未证明专门独立任职评分段**，不得按字段名猜分段；完整description和真实独立评分字段的最终契约映射由父处理，本执行者未改评分算法或新增公开schema。证据：两 `...-{ctrip,ctrip_social}-discovery-v2/main-native.json`、两 `...-{ctrip,ctrip_social}-scans/list-proof.json`与全部原页/metadata/field-summary、`...-ctrip-renderer-proof.json`、`...-ctrip-node/{detail-js.txt,detail-renderer-snippets.json,locale-snippets.json}`及四详情目录。研究钟不是来源成功钟，没有公开数据更新。

## 9. 米哈游：双完整列表与必要六片TEXT详情，未收全源JD（2026-10-06）

两正常NodeDocument均HTTP200；真实入口为 `https://jobs.mihoyo.com/#/campus/position`、`#/position`，当前主包`umi.6f1adbea.js`及正常页面实际加载的业务chunk同时证明原生范围。两个匿名Chrome分别捕获 `POST https://ats.openout.mihoyo.com/ats-portal/v1/job/list`，默认body为 `pageNo:1,pageSize:10,channelDetailIds:[1],hireType:1/0`，没有关键词/地区/项目/性质筛选。**[1]是已证明的必要scope，不清空，也不把返回行里的[1,2]冒另一个来源资格。** 官网自行加载资源/SDK，研究未注入、调用登录/验证或制造授权值。

精确成功封套是 `{code:0,message:"",traceId:"",data:{list,pageNo,pageSize,total},success:true,error:false}`；数值code、布尔success/error、原生page echo及数据shape各自验证，不沿旧适配器只检查data。正常Node使用当前公开Release-Tag `v26.9.0-260805`/current-request、Origin/Referer与中文locale，后续原生详情XHR也独立保存相同公开header；没有Authorization、UA伪装或会话token落盘。

校园260、社会674，各取得两轮完整唯一列表，**全部13原row字段逐字段稳定**。当前业务终点很具体：校园第27页/社会第69页均成功封套、echo原页/页长、`list:[]`、**原生total:0**；所有范围内页的源total仍分别260/674。第一次工具错误把越界页total0当范围内total漂移；保存原false proof与全部原页，不盲重试拒绝。仅修这项已观测的精确typed EOF，完整离线复核原第一轮所有页，再各取一轮全新完整第二轮；范围内total/身份/早空/未知shape断言没有放宽，也不把越界0授有效零契约。

列表没有完整JD，详情确实必要。当前真实路由按native字符串id构造 `#/campus/position/<id>`、`#/position/<id>`；正常导航自动POST `/v1/job/info`，body `{id:<字符串>,channelDetailIds:[1],hireType:1/0}`。四样本校园7672（实习）/8938（全职）、社会9596（第三方编制）/9528（全职），原生详情id、hireType、channelIDs及**所有列表字段**与列表完全一致；详情status1，不能吞transport/HTTP/business/shape/identity错误为空JD。

当前实际加载 `3597.f97af0e5.async.js`的renderer是React**文本children**，按六片及原visible顺序，仅在值非空时显示：

| 原字段 | 官网标题 |
|---|---|
| jobSummary | 岗位摘要 |
| description | 工作职责 |
| jobRequire | 任职要求 |
| addition | 加分项 |
| deliveryInstructions | 投递说明 |
| objectName | 面向对象 |

四样本全部六字段都是string，合法空片与正文错误分开；每个实际非空片都在原DOM逐字符完整出现，四张原PNG已实际查看。不能仅保description/jobRequire而丢加分/投递说明/受众；TEXT不HTML剥离、实体解码或截长，原空白/换行保留。本轮per-slot computed CSS匹配为空，**不宣称某个CSS white-space值**，TEXT性质由实际renderer及literal DOM证明。公开完整description应一次保全部实际六片；独立duty/requirements仍对应官网「工作职责/任职要求」，不将其它片复写成评分段。

列表jobNature直接在官网显示：校园有全职/实习，社会还含第三方编制/其他；后两者不默认全职。projectName是当前招聘项目，校园实习生专项/2027届秋招与社会泛「社会招聘」各保原值，不能按标题猜人才计划；详情受众与正文即使有届次差异也原样保，不猜毕业日期或修事实。未见可证明的岗位日期字段，可靠date/dateKind保持null。

**`qualified:false / fullSourceJDVerified:false / productionEligible:false`**：260+674条中仅四条详情样本，剩余930条未收，样本不冒全源JD或metadata资格；为避免研究后生产重复全量详情，本轮只交协议/renderer。正式候选仍须唯一生产链内新鲜完整来源及全部必要详情/稳定性，不因partial而发布。交接 `...-mihoyo-schema-proof.json`；原材料两`*-discovery/main-native.json`、两`*-scans/list-proof.json`（保false原稿）、两`*-scans-v2/list-proof.json`、四详情目录、`...-mihoyo-renderer-proof.json`及`...-mihoyo-node/`当前原bundle/真实offset片段，前缀仍`/tmp/ande-first-batch-special`。

## 10. 上海AI实验室：原生游标双穷尽、TEXT/SSR和真实optional槽，研究结束

两个正常Node入口 `https://www.shlab.org.cn/joinus/campus`、`/joinus/social`独立HTTP200。当前页面实际引用`2025_recruit_search.js?b7ea7d7dad03bfede5b5`，DOM data-mode与原生XHR分别证明 campus/social；真实默认GET `/api/getJobList` 的参数是 mode、jobFunction/location/jobType/subject/keyword空、初始page_token空、**limit7**，不是旧页长10。直接校园入口subject为空，包含全部四招聘项目；官网radio切换可能自动设置subject7619221867426433326，**不把那条狭切换请求冒本轮广范围，也不擅自清已证明筛选**。

### 10.1 没有官方total，不伪造计数

成功精确 `{errno:0,errmsg:"ok",data:...}`。研究文字初稿误写空串；独立接入复核98份原响应后纠正，旧稿保留 `/tmp/ande-first-batch-verification-before-errmsg-fix.md`，不改原native材料，严格业务合同只认已观察的 `"ok"`。非终点data精确有 `has_more:true,items:[...],page_token:<非空string>`；空页仍more、游标缺失/不推进/循环、重复publication id、页数触顶或业务/HTTP错误都不能完整。真实终点data却是 `{has_more:false,items:[末页...]}`，**page_token字段省略**，不是空string/null，也没有total。

| key | 每轮游标穷尽 | 两轮结果 |
|---|---|---|
| `shlab` | 27页，末页2条且has_more:false | 每轮184不同public id；全部raw row事实按id逐字段稳定 |
| `shlab_social` | 22页，末页2条且has_more:false | 每轮149不同public id；独立同样稳定 |

184/149只是**原生游标终点后唯一集合的派生计数**，不是官网声明total。研究工具当时将分页selector脱敏、不落原值；这不是登录credential证明，也不授正式证据重演资格。接入确认公开cursor不是身份/会话凭证，后续正式verification必须保存实际公开cursor/requestURL/HTTP/native response以复演双链，不能拿本轮脱敏研究pages替代。研究每页独立`*-pagination.json`在断言前保存原字段是否存在、type、length、SHA256以及实际请求cursor SHA，证明推进/终点与raw关联，不存会话凭证。第一次校园工具误要求终点cursor、社会工具误要求requirement总存在而失败；原页/false proof均保留。证明当前精确EOF及下述合法optional后，修工具完整重跑两source各两轮，没有削唯一身份或把未知类型fallback为空。

### 10.2 公共身份、两段原生TEXT及合法省略

publication `id`与内部`job_id`都是**不同的十进制字符串**，不能转Number或互作fallback。当前页面真实链接 `/joinus/detail/<id>?mode=campus/social&...`，正常详情SSR的URL、同id申请href（只读、不点击）、原标题、other_info及完整JD对照绑定本条，不猜隐藏路由。详情业务JS只载入「热招职位」辅助列表，不再读另一个JD API。

列表333条description非空string，331条requirement非空string、两条省略。独立审查复算664个正文槽：标签/字符引用形状均0，16槽有普通 `&`（R&D、IEEE S&P等）。当前SSR只证明普通TEXT/LF→BR，不授任意markup/entity字符串转义合同。原离线List<T>/实体放行断言越过证据，保留旧模块 `/tmp/ande-shlab-before-markup-guard.js`、旧测试 `/tmp/ande-shlab-before-markup-guard.test.cjs`；接入新增未证标签/注释/声明/字符引用形状整源拒绝，不删岗、不改raw、不盲剥HTML，保普通amp、数值比较、同文、空白/符号和已证省略。React TEXT来源不继承此限制。普通详情SSR在「岗位职责/岗位要求」conbox显示对应两字段，把原TEXT换行转BR；mounted DOM会折叠连续空格，BR空行仍保留。四样本校园实习7690957950969940260/正式7688552196196436262、社会7688999843491334427/7535362154582575406全部通过**原TEXT→SSR BR转LF逐字符相同→完整DOM**比较；1490字符校园样本保空行，不截600。原图四张均实际看过，viewport主要是大标题/属性；完整正文用DOM核，**不冒全篇视觉/手机或产品站点验收**。

社会7535362154582575406、7446231036575648039的requirement原生字段确实省略。正常官网前者详情**没有独立「岗位要求」区**，完整职责与「职位要求」真在description内；这是成功岗位对象的已证明optional空槽，不是吞详情错误。保完整description，不凭文字标题再猜拆独立评分段；null/number、未知追加JD字段/visible段、异常业务仍拒绝。研究的literal API/SSR保真与观察到的DOM空白折叠区别明确；第一次误用htmlText丢空行、第二次误假定hydrated textContent保双空格的本地比较稿和反例均留在`...-shlab-renderer-comparison-v{1,2}-failure.json`及失败脚本，修工具后四样本全部重新完整验证，未改产品断言或源码。

属性独立：job_function.name.zh_cn是官网岗位类别/通道；JobType/job_type实为行业分类，不误当性质/技术职能。job_recruitment_type当前校园实习/正式（Intern/Regular）、社会全职（Full-time），「正式」不凭惯例推全职工时。subject.name.zh_cn当前校园2027届实习生招聘/常规校园招聘/日常实习生（非应届）/星启计划，保官网招聘项目原义，不按标题造计划；社会无该项目。updatedAtShow及create_time/modify_time保raw，详情/列表日期无语义标签，可靠date/dateKind仍null。

交接 `...-shlab-schema-proof.json`、`...-shlab-renderer-proof.json`、两`*-scans-v2/{list-proof.json,field-summary.json}`及全部原页/独立分页shape、两`*-discovery/main-native.json`、四详情DOM/原图、`...-shlab-node/`普通SSR及真实JS。仍 `qualified:false / fullSourceJDVerified:false / productionEligible:false`，不将四样本推广为全部live详情/日期/计划或发布资格；本研究没有候选快照/公开岗位写入。

### 10.3 八key请求权释放、资源与离线保护

**2026-10-06T10:26:55.941Z已明确release独占官网请求权**；此后本执行者只有本机整理/检查，没有第二/第三批请求。476次手动Node请求开始间隔实测最小246ms，全部15s超时，HTTP200共473、校园携程301一次、华为412两次；Chrome只正常匿名导航和读取网站原生XHR/DOM，自动资源/遥测可并发，不伪UA/指纹/TLS、登录、验证、投递或注入SDK。原JSON/JS/HTML安全脱敏格式化材料不冒上游byte-identical replay、完整主机网络捕获或跨runner持久存储。

22次自有Chrome各report报exit/profile removal，并在release时**独立逐一核PID不存在、profile不存在、CDP端口无监听/连接、没有该profile子进程**。helper实际profile是系统临时`ande-bytedance-probe-*`，记录真实路径而非假称special前缀；用户Chrome5195仍在、没有信号/操作。`...-network-release.json`保存完整资源及释放证据，`...-request-statistics.json`保存精确请求统计，`...-helper-dependencies.json`保存只读复用helper/Node版本。

离线mock真实研究scanner的24个业务拒绝/未知shape/echo/重复/typed-has_more/早空反例全部拒绝、官网请求零，见`...-offline-guards.{cjs,json}`；这不是生产adapter验证。当前并行实现版本`node --test tests/*.test.cjs` **247/247通过**（`...-offline-tests.log`），不把项目测试冒八key生产资格。`git diff --check`、本文本地链接/§1–6前缀完整性及最终材料SHA/size另按最终审计文件核，未做产品浏览器验收。

基线仍`/tmp/ande-first-custom-batch-before.json`的201项SHA/size/纳秒mtime；审计明确列父/implementation允许改动，**不再声称201全不变**。本执行者仅改本文§7–10；data/jobs.js、89既有out及PROCESS的91保护项在本轮审计与基线一致，保已有PROCESS dirty状态；HEAD不变。最终逐项差异/保护证据在`...-protection-after-final.json`，§1–6字节前缀SHA在`...-verification-prefix.json`，全部原稿/派生/driver/脚本/DOM/原PNG清单在`...-material-manifest.json`，统一入口`...-result.json`（以上省略前缀仍`/tmp/ande-first-batch-special`）。这些是研究报告，不是提交、部署、后续系统授权或成功钟。

## 11. 后续正式采集与五源本地发布（独立于以上研究资格）

以上§1–10及其 `qualified:false` 是当时研究收据，不改签为生产成功。后续唯一链分别进行必要全文/两轮全raw采集；阶段和边界见 [PROCESS §9](../PROCESS.md#9-第一批16来源研究与原生候选采集结束公开验收未结束)。

| 来源key | 原生完整候选数 | 真实completedAt（2026-10-06 UTC） | 本轮公开 |
|---|---:|---|---|
| ctrip | 56 | 13:28:07.951Z | 是 |
| ctrip_social | 489 | 13:28:38.614Z | 否，20条双语/组合标题的derived分栏尚未与独立投影一致 |
| mihoyo | 260 | 13:31:49.444Z | 是 |
| mihoyo_social | 674 | 13:39:35.069Z | 是 |
| shlab | 184 | 13:40:27.335Z | 是，仅双cursor穷尽派生数量、无官方total |
| shlab_social | 149 | 13:41:14.442Z | 是，仅双cursor穷尽派生数量、无官方total |

六源2,272次原生响应、全部双列表/raw稳定，米哈游934条全部必要详情双取，上海公开cursor/两终点原样可复演。美团社会唯一正式采集第162页total2467→2466即整源失败，无详情/成功快照，未重试；其它九源仍分别受§1–10访问/身份/scope阻塞。本批没有有效零，不据研究恢复退役初版。

正式全量审计发现携程社招30439707 malformed font属性泄漏，持久红例后共享HTML状态扫描修、空正文/quoted `>`/实体单遍/回溯边缘重验，原native/snapshot/status/真实钟不改。多方向30439771无法证分栏时完整正文回退，不误将后续职责继承要求；原错误stage/工具草稿及旧P2报告均保留。上述修复不因此给整个携程社会授公开字段资格。

五源1,323岗全部17字段独立全量投影精确一致；同冻结版本实际HTTP/file **370项**通过，全部新岗真实行/弹窗及评分/词频、各43组查询、每源≥2真实鼠标JD、dirty/示例/恢复/目录、旧非目标及自然50→100。父读4张原PNG，其余22仅SHA，CSS窄屏不冒手机、全JD人工或全量PC性能。导航前空dialog/Fetch关闭竞态及外层240秒工具超时均保稿，修工具后完整HTTP/file重验，不削断言。最终自有Chrome/profile/server/proxy/端口清理；页面外部请求/异常/console error零，背景proxy拒绝及OS失败IPv6 UDP单列，不冒主机网络零。

通过者仅sole publisher写根，23,979→**25,302**，29→**34成功来源**，原39公司/66登记/旧29岗位事实、metadata、成功钟及89原out保护。根public5逐byte等于已实际验收冻结版，数据对象重新载入及2,525pin/递归inventory复核；不是新根浏览器访问。publisher code1只因美团failed metadata，五源成功。最终whole **284/284**、85脚本语法、本地Markdown路径及diff检查通过。

本机入口 `/tmp/ande-first-batch-six-production-result.json`、`/tmp/ande-six-production-review-results.json`、`/tmp/ande-first-batch-five-page-parent-receipt.json`、`/tmp/ande-first-batch-page-run-WXX4w3/report.json`、`/tmp/ande-first-batch-five-root-publication.json`、`/tmp/ande-first-batch-five-root-light-recheck.json`；材料/out未入库、不冒永久runner存储。未提交、推送、部署或启动第二/第三批。

## 12. 六入口有限修复补证（2026-10-07）

仅用户指定华为／美团／小米及各自social；新基线25,302／34，不覆盖§11已公开五源，不改签旧研究／失败报告。本轮无新来源发布，阶段结论见 [PROCESS §10](../PROCESS.md#10-华为美团小米六入口的有限修复2026-10-07)。材料前缀 `/tmp/ande-three-source-fix-iRBLsb/`，仍仅本机。

1. **华为正常请求**：旧412指出真正Referer缺失；仅补 `Referer:https://career.huawei.com/`，保旧正常headers／CR或SR默认body，两首POST200／SUCCESS。新增 `huawei_http.js`只实现匿名transport，不进入adapter dispatch、不写complete／raw／snapshot；仓库helper再次真实验证total101／424首屏各10。公开JS bootstrap的CSRF可以空，值只内存；首次helper误拒空值是本地工具错误，保 `final-normal-check.log`，持久红例修后fresh材料重验，不说官网拒绝。`huawei-referer-result.json`及`huawei-repo-transport-result.json`绑定这些观测。
2. **华为必要JD**：真实详情URL `/cn/job-details?advertisementId=<id>`，官网POST `getRecruitmentPositionDetail`及按其jobId的 `getPositionIntentionList`。首社样本42336直接有职责／要求；首校36384返回4个意向，每方向有独立HTML职责／要求，列表“请您详见岗位意向”不是全文。Vue详情使用innerHTML及官网转换函数，不继承React TEXT。`huawei*-renderer-location.json`定位真实network／DOM／PNG与资源清理；两源全集及全部意向仍未接入，不授资格。
3. **美团社会一次正式失败与实现修正**：`meituan-result.json`、`meituan-native/`记录247列表响应（246页2459唯一＋typed-null EOF）、1803详情，2050 HTTP200；结束04:16:07.051Z，无生产成功钟。2682118682的详情 `otherInfo:"暂无"`、列表null触发本地未知非空guard。官网六片选择器未显示该field，正常Chrome当前完整DOM亦无该占位；`meituan-placeholder-browser.json`定位证据，父读原图。最小红绿只准**详情精确字符串“暂无”**或null，列表仍只null，允许已证null→占位；原raw保存并继续双轮逐字段稳定，任意新内容仍拒，不造JD。1803已取详情回溯通过但不能因此重签当次失败为成功、补部分快照或发布。
4. **美团校园排序反馈**：`meituan-pagination/comparison.json`保存正常默认1＋2 body及1／15／16／15／16页。总数571稳定，两个相邻页每轮20唯一且合并原身份集合一致；4694862636与4697313567（同refreshTime1786961006000）互换页边界。尚无官网稳定排序选择器，不编参数、改total或去重获资格。
5. **小米新双全列表**：旧扫描参数与官网JS相符；`pagination-probes-result.json`复查旧重复边界稳定。`xiaomi-full-diagnostic-result.json`及两`*-full/`绑定完整正常请求／HTTP／native页：校1059双全唯一及全raw稳定；社1909双全唯一，但`xiaomi-social-facts-drift.json`有55条`cityZhNames`顺序不同、元素集合相同，其它字段一致。保原顺序和严格raw稳定，不排序数组求绿；这是新诊断，不是source成功快照／页面资格，校园后续仍需正文接入及验收。

没有提交、push、部署、扩批或重抓已公开成功来源。仅美团社会最近attempt status改变；原公开岗位／metadata／成功钟保留。

## 13. 小米校招正式交付与美团有限续轮（2026-10-07）

本节不改签旧轮；实际新增1059、公开26361／35，见 [PROCESS §11](../PROCESS.md#11-小米美团下一轮小米校招已交付2026-10-07)。本机材料前缀 `/tmp/ande-xiaomi-meituan-next-e1Tizu/`。

1. **完整正文更正**：四校园URL路径真实Chrome两栏TEXT与HR列表相同，但toptalent 190749另有 `job_post_info.job_post_object_value_map["7595885661741271302"]`；DOM“职位信息/课题名称及内容”必须保全。最初列表-only候选归档 `invalid-list-only-attempt/`、撤销source成功资格，未发布。缺公开website-path的Node虽code0却map空，并非完整；`native-headers-location.json`及`detail-minimal-native-headers-probe.json`证明实际公开website-path/中文语言/Referer的普通匿名请求恢复与原Chrome**整native response一致**，无注入SDK/签名/UA/Cookie。
2. **正式全量与独立投影**：`xiaomi-details-attempt-v4/`一次修正后正式运行，214列表＋2118必要详情；原native字节/headers/HTTP/business、3身份、逐页total/EOF、全部14 raw与详情双稳，161课题保真。真实成功钟06:41:50.985Z，不能取driver结束51.673Z。`independent-xiaomi-v3.cjs`先构造expected再比较actual，`expected-xiaomi-jobs.json`及`independent-xiaomi-final-audit.json`1059×17零差异；原v1/v2及两次不合格/工具失败原稿未改签。
3. **页面与根**：`xiaomi-complete-v3-page-freeze.json`绑定2332 native材料及17字段；实际HTTP/file `/tmp/ande-first-batch-page-run-KSOXWu/`240全过，全部1059真实连接row/modal全文/分数/词频自动核验及真实鼠标样本。22图父读4，余仅SHA，非手机/全量PC性能/人工全集。CRLF只按标准HTML输入预处理修DOM期望，公开raw/17字段/评分不变；Fetch关闭按session排空，完整重跑两协议。两失败材料保留。`xiaomi-page-parent-receipt.json`与`xiaomi-root-publication.json`确认solepublisher根发布等验收stage、原25302岗及34源metadata/钟/out保护。
4. **美团正式失败仍失败**：`meituan-attempt/`本轮仅一次fresh，2484 HTTP200/business1；2459完整唯一列表/EOF后2237详情停于2936400656 `otherInfo:""`，不是官网拒绝。`meituan-empty-otherInfo-location.json`正常Chrome/原图及既有六片renderer证其不增加JD；新增精确空串合法反例，list仍onlynull，任意未知文本/空格/类型及raw双漂移仍拒。已取2237详情重新normalize通过，不补剩余222或第二轮、不造raw/snapshot/expected成功。独立 `meituan-attempt/independent-meituan-failed-receipt.json`拒当次并核26361／35根字节/mtime与小米成功钟不变。
5. **有限候选而非资格**：`meituan-campus-bounded/result.json`7请求证明官网接受分类型，应届194/实习377与默认571计数相加，抽查应届15/16两轮稳定；未证完整等价集合/双全raw/必要JD，不继承社会adapter或宣称修复全集。`independent-xiaomi-city-order-note.md`仅证明原序join展示及旧55成员相同，不证明没有主要/优先城市；保持严格有序稳定，不改SPEC或排序数组求绿。

未新增依赖、扩来源、重抓原成功源、提交、push或部署；原接口可达/本地实现未闭合和完整成功分别报告。

## 14. 继续授权：美团校园571正式交付（2026-10-07）

新本机材料 `/tmp/ande-meituan-continue-pY4JKw/`。公开**26932／36**，新增571，与此前小米共1630；39公司/66登记不变。原13节和失败审稿未改签。

- 社会 `meituan-result`本轮2707响应：2459全列表/全部详情完，第二轮total2458，拒整源不循环重试。校园 `campus-attempt/`10响应在type1第8/9页重复拒绝，15/16两页样本稳定未冒全集。
- `campus-large-page-one-probe.json`正常匿名Node仅改pageSize1000，原1＋2无筛选返回571完整唯一/原total571/pageTotal1。`campus-large-page-attempt/`新冻结契约一次正式：1152响应=默认1＋2前后两完整571行bound＋双轮各两区页/EOF/571必要详情。原生jobType绑定当前区、跨区唯一；全部25原字段/全部正文双稳，union等默认原total且全部默认行绑定，不是计数加和冒scope。分页超过1000仍须完整穷尽并触顶拒绝，不是固定条数截断。
- 一手renderer：`campus-renderer-locations.json`正常应届/实习两详情及父看PNG；原网站同detail bundle的formatData.MX按jobSpecialCode 1/2/3/4/7/8/9选“岗位职责/任职要求/工作城市”，其它如6选六片；cities按原序顿号join，真实null不生成标题。项目ID/名称及详情全部部门原码不推断plan/date/category；类型2employment实习、channels空；标题/完整TEXT/同文/标签保持原规则，城市不充jdComplete。`campus-nullcity-location.json`正常4697281262列表/detail同null及原DOM/PNG无城市栏，保留岗而非删除例外。
- `independent-meituan-campus-audit-v2.cjs`全1152native之后独立生成expected，actual最后比；`expected-meituan-jobs.json`及`independent-meituan-final-audit.json`571×17=9707比较零差异。v1错误把串行间隔解释为响应后额外冷却；`parent-pacing-tool-error.md`保原失败，只修两硬条件request starts>=200ms且无重叠、零容差，136反例与全量重审通过，最小251ms；无产品/raw/评分/钟改动。
- `meituan-campus-complete-page-freeze.json` SHA `573f0376928ebeb6b6cc76bedd2f1869e5480000a680118568a7c89603581247`，真实HTTP/file `/tmp/ande-first-batch-page-run-8gvX1u/`224全过：全571连接row/modal、评分/词频、dirty/示例/恢复/目录/非目标保护及自然50→100。30截图父实际读4，余只SHA；窄CSS非手机/人工全集/全量PC性能。自有资源全清理，无页面外网/runtime/console错误，不冒主机零网络。
- `meituan-page-parent-receipt.json`与`meituan-root-publication.json`确认唯一publisher只写meituan，26932/36根等验收stage，原26361岗/35源metadata、单位目录、其它out与成功钟原样。真实成功钟**09:18:46.170Z**，不能取driver09:18:46.914Z或发布/审计钟。

没有扩来源、重抓成功源、提交、push或部署；小米城市顺序合同未放宽，美团社会不具新成功资格。

## 15. D07下五来源可用交付（2026-10-07，仅本地）

现行SPEC §4.3替代上文双轮/分栏语义完整门槛；历史稿不改签。用户授权携程社招→华为→小红书，本地经唯一publisher新增489＋101＋423＋170＋841＝2,024，当前33,324/43；未commit/push，新资料未部署，线上仍31,300/38。真实钟、数量及验证范围见 [PROCESS §17](../PROCESS.md#17-携程社招华为小红书本地交付2026-10-07)。

- 携程社招沿原2026-10-06完整native/snapshot，仅修公开投影：全HTML正文保留、独立职责/要求留空、全文计分回退，不把单一原生requirements当语义要求或按20个ID猜分栏。没有重采/改原钟。
- 华为新固定CR/SR profile与正常匿名Referer transport接唯一链；按totalPages停止列表，复用本轮列表续取524详情＋524岗位意向响应。广告ID与jobId绑定、全部方向标题/HTML正文/两栏按原顺序保留；source与JD完整性仍未知，未从项目/年限推性质/计划/日期。官方SR total424中的37178标题null未收录，缺口明确；空详情/空意向不能抹列表已取得文字。
- 小红书校园只2027regular/campus_autumn_27，社招默认无筛选，页长10、原生成功/页码/实际request绑定。重复页继续到EOF，校园171槽→170唯一、社会847槽→841唯一，不冒全集。两栏Vue TEXT保原空白/实体/同文，3个社会岗只符号占位仍保留；详情未核验，不声称已确定少文字。jobType社会具名类别有官方“职位类别”筛选/卡片renderer证据，不与详情positionType混用；recruitStatus仅原接口码，不证明实际可投。
- 335离线测试及diff通过；基本全量程序检查、非目标31,300岗/61源/116旧out保护、98分片逐字段保真通过；本地HTTP抽6个JD/查询/官网链接通过，资源清理。没有逐岗模型阅读/旧全量oracle/新增来源线上或全量性能验收。材料 `/tmp/ande-ctrip-huawei-xhs-HeZYzU/`；源级资格仅这五key，不扩百度或下一批。
