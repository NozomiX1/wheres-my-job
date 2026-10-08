# 第二批官网可用交付（2026-10-07至08，仅本地）

用户授权仅覆盖8个既有key；D07可用先交付，不重采第一批、不扩第三批、不自动commit/push。冻结线上/HEAD `6d3d0617cc96660e8009e30ed1469e5b127a69e3` 的35,609岗/45有数据源后，经同一 `update → crawl → snapshot → publish → canonical/浏览器派生物` 本地新增4,095岗。

**本地39,704岗/53有数据源（37 ready＋16 available）；线上仍35,609/45。** 本批均 `complete:false,verification.policy:'available'`，列表JD可用、额外详情完整性待核验，不冒来源全集、法定雇主或实际可投。39登记公司/66来源不变；阿里共享校园入口独立展示后，页面40单位。

## 1. 数量、真实钟与缺口

| key | 已取得岗位 | 真实资料完成时间UTC | 范围及未取得情况 |
|---|---:|---|---|
| alibaba | 1,083 | 2026-10-07T16:46:17.080Z | 当前应届＋日常/研究实习三批次；未按项目/部门收窄，阿里星共用应届batch，不额外重复采 |
| baichuan | 10 | 2026-10-07T16:38:01.858Z | 正常Chrome首页，官方total18；缺8，后续Node HTTP405停止 |
| bilibili | 411 | 2026-10-07T17:17:19.892Z | 空type广列表，42有效页；应届/实习及项目不筛除 |
| bilibili_social | 479 | 2026-10-07T17:17:39.840Z | 默认社会空筛选，48有效页 |
| ant | 403 | 2026-10-07T17:33:06.288Z | 当前校园广列表，招聘类型/批次均空 |
| ant_social | 1,193 | 2026-10-07T17:34:28.159Z | 当前默认社会列表，地区/类别/业务空筛选 |
| kuaishou | 506 | 2026-10-08T04:40:19.486Z | 当前27届应届＋留用实习两项目（279＋227），不排快Star等标签 |
| kuaishou_social | 10 | 2026-10-07T17:36:13.072Z | 正常Chrome默认C001/socialr无城市筛选首页，官方total1212；缺1202，日常实习另入口未核 |

百川及快手社招复用旧材料，经受控runner进入原有链，不直接写canonical；保原资料钟、原生响应与原始字段，明确未重采。后来Node拒绝不抹之前真实材料，也不授补签名/自动retry资格。自动官网浏览器启动流量可能并发（`automaticWebsiteTrafficMayBeConcurrent:true`），不冒正式串行扫描。

## 2. 正常官网协议与正文

五个新模块在 `crawler/lib/custom/`：`alibaba_portal.js`、`baichuan_portal.js`、`bilibili_portal.js`、`ant_portal.js`、`kuaishou_portal.js`。各key独立冻结公司、ATS、adapter、入口、API及body；调度/快照/发布均复验，删adapter、改key/URI/公司/body不退generic。不继承同ATS或另一来源成功资格。

### 阿里校园

- 入口 `https://campus-talent.alibaba.com/campus/position`；POST `/position/search`，pageIndex从1起/pageSize10/customDeptCode空/channel `campus_group_official_site`/language `zh`。
- 固定已核三batch `100000760001`（应届与阿里星共用）、`100000560002`（日常）、`100000560001`（研究实习）；615岗实习只证性质，不强推校园渠道。
- 正常匿名bootstrap获取真实CSRF/Cookie，仅内存；不造token/UA/签名。原description/requirement按第一方React TEXT分行renderer保全部字面字符/空白/同文两栏；详情样本不冒所有额外正文已核。
- 官方链接 `/campus/position/<id>?deptCodes=`。共享入口跨业务集团，不按部门/标题猜控股或法律雇主；职能内部编号未核，1,083个category保未知。

### 百川

- 原入口 `https://campus.baichuan-inc.com/` 正常跳转 `https://cq6qe6bvfr6.jobs.feishu.cn/646926`，标题「百川智能，欢迎你的加入！」。
- 官网正常Chrome POST `/api/v1/search/job/posts`，空keyword/项目/职能等，limit10/offset0/portal_type6/portal_entrance1，query镜像body；原生code0/job_post_list/count18，首10条有真实两栏JD。
- 官网自动签名仅正常网站自己产生；证据省略签名，未注入SDK或逆向。后来的普通Node unsigned同协议HTTP405已停止，不重开Chrome补页。
- 官方 `/646926/position/<id>/detail`，使用19位字符串id。保原字段，不沿旧卡片正则摘要；详情/额外嵌套正文未核。

### B站

- 当前 `https://jobs.bilibili.com/campus/positions` / `/social/positions`；POST `/api/campus/position/positionList` / `/api/srs/position/positionList`。
- GET `/api/auth/v1/csrf/token` code0/data字符串，真实动态X-CSRF只内存。第一方公开X-UserType2/X-AppKey `ops.ehr-api.auth`/X-Channel campus或social；不登录/伪UA。token响应data字符串显式脱敏，不落原值。
- pageNum从1起/pageSize10/空词及type、部门、地点、项目等；校园recruitType null，社会0。type可选就不填；校园广列表411，不沿旧实习/全职筛选。
- positionDescription官网innerHTML，共享htmlText保全部单字段全文；duty/requirements独立分栏未知留空，不猜职责/要求、不删标题城市/编号。按原positionTypeName精确映“实习”/“全职”，未知保留。
- 数字id官方复数路径 `/campus/positions/<id>` / `/social/positions/<id>`，不是旧hash单数路由。

### 蚂蚁

- 当前广入口 `https://talent.antgroup.com/campus-full-list` / `/off-campus`；API origin `https://hrcareersweb.antgroup.com`，POST `/api/campus/position/search` / `/api/social/position/search`。
- 正常匿名bootstrap后unsigned Node POST已成功，不自造/附query ctoken。pageIndex从1起/pageSize10/language `zh`；校园channel `campus_group_official_site`，regions/subCategories/bgCode空、recruitType/batchIds空。
- 原生success true，errorCode/errorMsg可为 `success`/`成功` 或null/null；content是数组，totalCount/pageSize/currentPage在顶层，不沿旧zh_CN/0起分页。
- 第一方TEXT两栏description/requirement保原字符；可见非空teamDescription形状未核时逐岗跳过并披露（本次未因此漏岗），不添第四评分字段或猜分栏。
- 官方 `/campus-position?positionId=<id>` / `/off-campus-position?positionId=<id>`；不由Plan A等标题推人才属性、法律雇主或可靠日期。

### 快手

- 校园 `https://campus.kuaishou.cn/recruit/campus/e/#/campus/jobs`；POST同base的 `api/v1/open/positions/simple`，两个当前recruitSubProjectCodes `20271779425607` / `20271772783534` 联合、pageNum1起/pageSize10。普通Node正常JSON Content-Type/Origin/Referer，无签名/伪UA。
- 同源公开字典核项目、职能、地点及性质；全字典仅存verification一次，每岗绑定所需原生条目，不重复整份字典。fulltime/全职、intern/实习精确映性质；兼职、inactive类别不删，未知不猜。227留用实习不推校园渠道。
- 社招 `https://zhaopin.kuaishou.cn/recruit/e/#/official/social/`；GET同base API，默认pageNum1/pageSize10/positionNatureCode C001/recruitProject socialr，不加domestic城市限制。用第一条无城市筛选的正常Chrome原生列表及字典；workLocations null按官方renderer的workLocationsCode查字典，不静态猜城市。
- 同首页普通unsigned Node返回HTTP200/code:-1/message「系统错误」/result null，立即停止；不猜HMAC/封禁原因、不生成Sign/HMAC/SDK或再请求。C001未有本次性质字典证明，employment null。
- 数字id是真实详情身份，MD5 code不是替代ID且社招可null。官方 `#/campus/job-info/<id>` / `#/official/social/job-info/<id>`；description/positionDemand由pre字面渲染，不HTML/entity解码。
- 证据保正常Chrome实际公开JSON协商Accept头；仅支持该已观察值及普通NodeJSON值，不捏造原请求，也不开放额外身份/签名头。

## 3. 修正、检查与保护

- B站尾页原生pages按实际size重算：校园尾1条给411页，社尾9条给54页。初次各多请求一个空页（HTTP200/code0），随后本地shape guard停止；**不是官网业务拒绝**。先红例，修为页码×请求页长与total判断末页，离线重建原42/48页证据，岗位不变、成功钟不变、无新官网请求。旧备份/错误日志保留；首次工具缺reproject被同钟保护拒绝，随后显式维护模式通过。
- 实际HTTP首抽查发现校园共享入口没有目录按钮（null.click）；这是实际目录映射缺口，不冒采集失败。修为有catalog part/岗位时独立展示校园入口；原「阿里巴巴」偏好仍仅控股，不自动扩大或查询。旧目录失败收据保留。
- 全量程序基本检查：4,095新增标题/JD/城市非空，安全链接及全局ID唯一；全部snapshot/native及17字段投影匹配。无模型逐岗阅读/语义判断；未核详情不称已证明缺段。
- 原35,609岗、58非目标source对象、39公司目录、137既有非目标out SHA及纳秒mtime保护。114活动片hash/count/全部字段等canonical，旧hash片保留。
- 正式Node四批419请求（B站含两多余请求）：阿里110/最小start282ms，B站96/233ms，蚂蚁161/483ms，快手52/336ms，正文读取重叠0；15s单请求、900s来源预算、200页保护，无auto retry。
- 410/410离线测试、语法及diff通过。实际本地HTTP五展示单位全部必要片到齐后查询，8源JD＋阿里实习9代表，完整已得文字/原标题/官网href与noopener/noreferrer/未核提示通过；首屏40单位无JD预取，页面外网/runtime/console错误0。
- 页面代码变更后另一次file基本烟测仅阿里校园/实习通过；不冒file全量、逐岗人工JD、线上新版本或全站性能。自有Chrome/profile/server已清理，未动用户Chrome。

## 4. 材料与后续边界

本机 `/tmp/ande-second-batch-Ghxbqi/`：before-data.js/before.json、生产network/log、百川/快手社招复用脚本收据、bilibili-before-repair/及repair日志、delivery-check.json、tests-final.log、page-smoke-*.json。官网观察目录 `/tmp/ande-first-batch-special-second-*` 保公有脱敏network/dom/report；Cookie/CSRF/signature不落原值，HTML/凭据响应不持久化。raw、backup、日志与临时材料不入库，不冒跨runner持久存储。

最终canonical SHA `3704ea35584d573f4103730f1cc5787a5936ed8273602f224978f0c12b44b833`；catalog SHA `8a763b2ed634b5d0f50f912206caf3c851fe0e4507cc09a976829d91a44ba850`。

**未commit/push/部署，线上仍第一批版本。** 百川缺8、快手社招缺1202及其它覆盖/额外正文/属性后补；不为补全绕签名或重试。第三批13源、性能、快照持久化与08:00定时均继续后置，需后续授权。

## 5. 后续：官网集团归类及拒绝诊断（2026-10-08）

用户要求校园按对应集团展示。现有circleNames与官网renderer足以核15官方单位；1,015单归属/68多归属，无需重采。publisher同钟重投影生成顶层可选unitMemberships（原生名称数组），part附原生unitCounts；公司/来源仍阿里巴巴/alibaba，17字段不扩，不复制职位/全文或另起发布链。前端单岗多单位取并集、JD展示全部归属，集团目录同时含相应校/社招；仅明确控股集团/国际集团短名兼容，不把千问/Token Foundry等猜成通义、钉钉。未知归属才入口兜底；当前没有未知，目录改50展示单位，39登记公司/66来源不变。各校园集团计数可重叠：阿里云217、淘天214、控股170、Token Foundry150、国际112、虎鲸95、灵犀83、千问事业部58、千问办公55、高德33、平头哥30、淘宝闪购19、盒马17、阿里健康14、飞猪10；全站仍39,704岗。

413测试及本地HTTP六组查询（含淘天＋云去重）、多集团JD/完整文本/安全链接/dirty，file一次基本烟测通过；首屏50单位无JD预取，页面外网/runtime/console错误0、自有资源清理。全部39,704岗位按ID事实、66source/39公司对象、161out SHA/nsmtime及成功钟不变，114片/归属绑定通过。新canonical SHA `a4ca49b23f9f90b07267be4e00876112b85912589d62c0e29900654a8402e605`；材料`/tmp/ande-ali-groups-mfufEW/`。§3–4的40单位/410测试及旧SHA为当时历史结果，非本次新验收。

两拒绝源已继续离线对照，未新发官网请求。百川Chrome与Node公开query/body/Referer相同，官网自动signature有无及Origin/Accept/初始化同时不同；快手query/Referer相同，Accept/初始化不同。已脱敏捕获白名单未保Cookie/CSRF/Sign头，不能推断原请求没有这些头；静态组件仅引用API wrapper，不证明当前HMAC要求。四个待证伪方向为官网安全中间件、公开头协商、匿名初始化及瞬时服务/边缘差异，现证据不能单因归属。离线命令`node /tmp/ande-second-batch-Ghxbqi/offline-refusal-diagnosis/replay.cjs --assert-node-success`准确按旧拒绝退出1，不带参数证据检查退出0；仅保存响应回放，不是线上复现或原因已修。缺8/1202不变，尚未重试、补签名或改变已有素材时点。

## 6. 用户另行授权后：官网原生翻页跑通（2026-10-08，仅本地）

用户“继续攻克百川和快手”授权后，只用自有匿名Chrome打开官网、点击其原生下一页；没有再次探测unsigned Node、复制会话、修改UA、注入SDK或自行生成签名。正常网页路线已成功，**历史Node拒绝的单一根因仍未查明**，不是单变量因果对照。

| 来源 | 本轮实际取得 | 真实完成时间UTC | 证据与缺口 |
|---|---:|---|---|
| 百川校园 | 18 | 2026-10-08T06:07:35.736Z | 两页10＋8，code0/count18；本入口列表数吻合，详情/其它门户未核，不冒complete |
| 快手社招 | 1,209 | 2026-10-08T06:23:16.620Z | 官网默认国内121页，total1211→1210、重复ID1次；实际唯一数少于最新total1，未证明无城市/海外范围等价 |

百川第二页Referer随官网URL加入current=2/limit=10及空UI筛选。原strict guard拒绝该真实请求，离线红例后仅放行严格绑定页码/空条件的已观察Referer；不改写成固定入口或放行城市/关键词筛选。URL省略官网自行生成的敏感signature，正文、原生请求体及非敏感query保真。

快手启动自动请求无城市首页、随后domestic首页，二者total相同不证明范围等价；官网mount/update自动补国内，未找到可保持无城市的分页或海外入口。新version3/`native-ui-default-domestic`仅绑定实际domestic请求，不能作为校园/其它城市资格；登记目标scope不变，明确已取得局部范围，可用增量保旧。保实际浏览器Accept、原生数字id/字典及TEXT两栏；不删经验/职能或按标题猜属性。

生产CLI现在直接选择共用`lib/native-ui.js`（复用既有CDP类）的原生点击传输，不先Node失败再自动换浏览器；15s响应、900s来源、最多200页、拒绝锁存/无重试、串行读取正文。官网首页/字典自动流量可能并发，明确`automaticWebsiteTrafficMayBeConcurrent:true`；本轮后续120次快手点击最小选中列表start761ms、正文读取重叠0，百川两页start间隔138396ms。实际采集使用本机UI驱动，新增生产collector通过离线假CDP测试；未为测试它而重采同批列表。

复用上述本轮真实材料，经受控runner进入唯一update→crawl→snapshot→publisher链，保真实完成钟；本地39,704→**40,911岗/53有数据源**，净增1,207（百川8＋快手社招1,199），第二批累计新增5,302。两源仍available/complete:false；全部原岗位ID保留，39,684非目标岗位/64source对象、39公司、阿里unitMemberships及155非目标out SHA/纳秒mtime不变；新增无空标题/JD/城市，链接安全，116活动片与canonical逐字段/hash/count相符。

436/436离线测试、语法/diff通过；本地实际HTTP首屏50单位无JD预取，百川新增1及快手社招新增/末页2代表，完整单位查询（百川18、快手校＋社1715）/已得全文/安全官网链接/未核提示通过，页面外网/runtime/console错误0、自有Chrome/profile/server清理。无页面代码变更，不追加file烟测；非线上/性能/逐岗语义验收。

材料`/tmp/ande-two-portals-YP2JeR/`含before、正常UI脱敏pages/dictionary/report、red/green、prepare/publish、check-v2、tests-final及page-smoke收据；首checker将分片路径/hash脚本形式读错，修工具后通过，旧check.log保留，不冒站点失败。临时控制DOM的按钮markup字段已删除，未保存HTML响应或凭据。canonical SHA `587d24b071933c4513e51195cff46d4a2cd7190d98371667cb83362e07eea9bd`。raw/日志/临时材料不入库；**未commit/push/部署，线上仍35,609/45**。第三批、首次查询优化、持久化/定时继续后置。
