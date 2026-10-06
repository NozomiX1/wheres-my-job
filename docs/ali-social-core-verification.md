# 阿里共享社招：控股／国际／云／通义第一方研究

研究日期：2026-10-05 UTC。范围仅既有 `alibaba_social`、`aidc_social`、`aliyun_social`、`tongyi_social`。依据 SPEC v0.27／8.4，先读共享内核、四 wrapper 与历史覆盖审计；**没有调用旧 crawler，没有改实现、注册、前端、公开数据或生产 out，没有生成可晋升成功快照、发布、登录或申请。四 key 的生产资格均仍为 false。** 临时材料统一在 `/tmp/ande-ali-social-core-run/`，浏览器临时 profile 已删除。

## 1. 研究结论与范围

| key | 正常当前入口／品牌 | 本轮广列表研究 | 非生产结论 |
|---|---|---|---|
| `alibaba_social` | 集团招聘导航的「阿里巴巴控股集团」→ `talent-holding.alibaba.com` → 社会招聘 → 查看全部职位 | 原生 total 588；两轮 588 个不同官方 ID，完整 59 页，另各取第60页边界空响应 | 当前中文社会入口的 wide 完整性已取得研究证据；不等于整个阿里公司全集。 |
| `aidc_social` | 「阿里国际数字商业集团」→ `aidc-jobs.alibaba.com`，正常跳到 `/zh/` → 社会招聘 → 查看全部职位／全部职位 | 原生 total 246；两轮 246 个不同官方 ID，完整25页，另各取第26页边界空响应 | 当前中文社会／全部职位入口已研究穷尽；不把独立 Bravo Star、校园、Global Hiring 自动并入。 |
| `aliyun_social` | 导航明确「阿里云」→ `careers.aliyun.com` | **未知**：首次普通 Chrome 导航出现 `Page.navigate` 控制超时，随后本任务 CDP page target 消失、`/json/list` 为空；没有保存源 HTTP／业务／列表响应 | 停止该源，不重试、不调用 Node、更不把它记成空列表、拒绝或完整成功。正常导航链已证实，列表及字段尚未证实。 |
| `tongyi_social` | 导航当前「Token Foundry」→ `careers-tongyi.alibaba.com`；门户介绍 Token Foundry，页脚仍「通义实验室」，保留既有 key | 原生 total63；两轮63个不同官方 ID，完整7页，另各取第8页边界空响应 | 当前中文社会入口已研究穷尽；不是通过改 company／新增登记处理品牌变化。 |

入口证据不是域名猜测：`https://www.alibabagroup.com/en-US/careers` 正常页面的 Join Now 指向 `https://talent.alibaba.com/en/home?lang=en`；该招聘站中文正常首页 `https://talent.alibaba.com/?lang=zh` 实际加载 `https://fc.alibaba.com/0.0.7/default/recruit-page-home.json`，其中上述四品牌和门户链接与 DOM 文字相符。[E1] 只读取共同导航中其它品牌名称／链接，未浏览另一代理的四来源。

控股英文 Professionals 首次正常启动实际为 `group_overseas_official_site`／`en`、total21，**不是**中文 wide588；仅观察其首页10条，不将21或英语入口当全集。转回官网中文导航后才启动本表中文范围。[E2] 所有已扫范围均未添加职业、职能、地点、部门、项目或工作年限筛选；多地、海外及无分类记录全部保留。未用热城市并集、职业分类并集或 count 单值代替分页证明。[E3–E5]

## 2. 实际协议与 channel：列表与详情不能混写

以下都是先观察正常 Chrome 原生启动 XHR，再复用正常匿名 bootstrap／同源公开请求；不是旧内核常量核验。三个列表首请求均 HTTP200、`success:true`，`content` 含 `datas,totalCount,pageSize,currentPage`。[E3–E5]

| 来源 | 原生中文列表 POST（CSRF 值脱敏） | 原生 bootstrap `channelCodeMap.offCampus`／实际详情请求 channel |
|---|---|---|
| 控股 | `https://talent-holding.alibaba.com/position/search?_csrf=[REDACTED]` | **`kgjt_group_official_site`** |
| 国际 | `https://aidc-jobs.alibaba.com/zh/position/search?_csrf=[REDACTED]&lang=zh` | **`aidc_group_official_site`** |
| 通义 | `https://careers-tongyi.alibaba.com/position/search?_csrf=[REDACTED]` | **`ty_group_official_site`** |

三个实际列表 body 的 `channel` 却均为 **`group_official_site`**；这是原生 list XHR 的观察结果，不表示可把 bootstrap／详情品牌 channel 改成这个常量，也不证明两个 channel 在其它域可互换。必须分别固定 origin、有效 basePath、中文入口、列表原生 body 和本站 bootstrap／详情 channel。[E3–E5,E9–E11]

控股、通义正常 list body：

```json
{"channel":"group_official_site","language":"zh","batchId":"","categories":"","deptCodes":[],"key":"","pageIndex":1,"pageSize":10,"regions":"","subCategories":"","shareType":"","shareId":"","myReferralShareCode":""}
```

国际正常 list body 少三个分享字段，不能凭共享系统补造：

```json
{"channel":"group_official_site","language":"zh","batchId":"","categories":"","deptCodes":[],"key":"","pageIndex":1,"pageSize":10,"regions":"","subCategories":""}
```

原生页码1起、页长10；无显式 order 参数。两轮每条 ID 顺序一致，观测 `modifyTime` 非递增；仅说明本时点实际顺序，不杜撰服务器稳定排序契约。[E6–E8] 普通 bootstrap HTML 自带 `window.__sysconfig.__token__`；首次尝试找 `document.cookie` 中 XSRF 未找到，错误稿保留，随后使用实际已观察 bootstrap token，未更换 UA 或注入 SDK。原生 Chrome XHR 的 `bx-v` 是官网自动加载行为；研究复用请求没有手工签名、调用 SDK 或绕 Baxia。

### 原生 UA Node 一次正常协议核验

三个源分别独立用 Node v25.8.0 的 **fetch 原生默认 UA `node`**，无浏览器 UA／指纹／TLS 模仿：GET 上表中文实际列表入口，正常取得 bootstrap HTML／匿名 Set-Cookie；仅内存保留 cookie 与 token，间隔200ms后 POST 一次**已观察的本站 list body**，带正常同源 Origin／Referer／JSON Content-Type。三个 GET／POST 均 HTTP200、业务成功，分别 total588／246／63、返回10条。没有重试，也没有 Node 全扫／生产候选。材料中的 Cookie、token、CSRF 值均脱敏，完整非敏感 scope body 保留。[E9–E11]

国际原生 UI 导航先请求非 `/zh/` 路径，再自行进行 `/zh/` 导航／请求；其中一条非 `/zh/position/detail` 原生响应为 `success:true,content:null`，不是有效详情。三代表详情最终有效证据均取正常 UI 实际加载的 `/zh/position/detail` 非空响应，前响应／跳转／取消均保留，没有由研究脚本换路重试。[E7]

## 3. 完整分页与原始事实比较

- 控股默认实际58个满页＋第59页8条，588不同 ID；第51页仍正常返回10条，**本次原生页长10中文范围没有观测到“约500条”的历史注释封顶**。第60页为空，原生 total变0，不能要求越界空页也维持588。[E6]
- 国际24个满页＋第25页6条；通义6个满页＋第7页3条。各正常范围内每页 total 分别稳定246／63；第26／8页越界为空、total0。每轮唯一 ID 数精确等于正常范围官方 total，没有缺 ID、重复页、提前短页或缺页。[E7,E8]
- 两轮全 raw 保留，按官方 `id` 配对；588／246／63各源的增加、减少、顺序变化均0。**并非 raw 所有字段稳定**：每条 `trackId` 和 `positionUrl` 均改变；其它所有原生字段逐字段相等。[E6–E8]
- 精确例外投影：仅去除独立 `trackId`；逐条解析两轮 `positionUrl`，先核 official origin、无凭据／fragment、path精确 `/off-campus/position-detail`、`positionId` 精确等于本条官方 ID、完整 query keyset 精确为 `positionId,track_id`，且 `track_id` 精确等于该条独立 `trackId`。仅删这个已证明动态的 query 项，**保留 URL origin/path/真实 ID/其它全部 query 与所有其它 raw 字段**；三源每条规范后 URL 和完整原生事实均相等，URL／track对应／事实不一致数均0。没有整字段忽略 `positionUrl`。[E6–E8]
- 动态跟踪例外不是凭字段名：已正常加载的业务 bundle 从 URL读 `track_id`，把它作为独立 `trackId` 与 `positionId` 一起传给收藏／投递逻辑；详情数据读取使用本站 channel、language、`id`，不以 tracking 项作为岗位身份。页面分享 URL也由 origin＋pathname＋`positionId` 生成。两轮相同岗位的 tracking 项变化而该独立详情身份不变；这里只将其解释为官网入口／请求归因跟踪，不猜服务端算法。**仅阅读 renderer，没有执行收藏／投递逻辑。** 逐源业务 bundle 文件、SHA、字节 offset／片段见 `*-renderer-proof.json`，不是签名 SDK 逆向。[E12]

无需城市或分类分片，因此不对 `/region/hot` 作完整地域字典主张，也不要求它覆盖海外／多地／未分类才能证明本次不分片 wide。三个 raw 中无分类的145／22／6条均保留。[E6–E8]

## 4. 全文、类别、日期与未知属性

各源3个代表均从 raw 官方 `positionUrl` 正常导航到 DOM，取得真实 `/position/detail` JSON；9条的 list `description`／`requirement` 分别与独立详情**逐字符相等**，完整详情两段均出现在实际页面可见 DOM 文本中。不是仅核标题／段落前缀。[E6–E8；每条原生响应、DOM、截图的路径／SHA见 E13]

| 来源 | 代表官方 ID／取样覆盖 |
|---|---|
| 控股 | `100022920010` AI红队；`100042580002` 资金核算实习生／非技术；`100018720013` 末页附近高级薪酬福利／8年经验 |
| 国际 | `100023775003` 大模型算法／长尾；`100046800001` 销售首条；`100023735012` 最末条物流采购 |
| 通义 | `100009980051` 多模态交互算法；`100046200005` 业务HRG非技术；`7000033602` 最末条视觉语言算法 |

renderer 证据逐源独立：控股／通义实际加载 `https://g.alicdn.com/platform/new-careers-portal/2.0.4/{subsidiary,vendors}.min.js`；国际加载 `https://g.alicdn.com/aidc-cpo-fe/new-careers-portal/2.0.96/{subsidiary,vendors}.min.js`。业务组件将 description／requirement 作为 `blockInfoList.value`，其实际组件 `renderBlockInfo` 直接 React child 渲染 `e.value`，非 `dangerouslySetInnerHTML`。原生 DOM正文块 computed `white-space:pre-wrap`；三个完整 raw 的正文均无 HTML标签／常见HTML实体特征。**应按官网纯文本保留换行，不实体解码／剥标签猜 JD；9条对照支持列表已有全部正文，不机械逐岗详情。** 原 bundle、片段、DOM 原值仍可复核。[E12,E13]

- 官网类别来自实际 `categories` 标签数组，可原样保留；不得因为 `categoryName:null` 就删无分类岗位，也不从标题猜类别。列表 department／project与三代表详情部门分别保留，不把详情样例部门推广给全源。[E6–E8]
- `modifyTime` 在实际 list／detail renderer 明确连到「更新于／Updated on」；DOM日期一致。因此更新日期语义已证明。`publishTime` 当前有值，但不能从字段名或与 modifyTime相近推定可靠发布日期；**publishedAt仍未知/null，不拿更新时间冒发布日期**。[E12,E13]
- 三源 raw 的 `positionType/status/batchName` 均null，代表详情 status／positionType／channels／categoryName／batchName仍null。实际社会招聘入口证明来源渠道，但**不证明岗位一律全职、人才计划不存在、状态必然开放或申请必成功**。控股实习样例正文明确在校生及至少3个月实习，必须保留，不能被“社招”常量排除；全职性质／计划属性缺证时各自未知。[E6–E8,E13]
- 三源代表有未禁用的「投递简历」／国际「应聘该职位」按钮，但未勾协议、未点击、未登录／申请；按钮存在与接口 status／可投成功分别记载，不互相推断。零经验显示「应届毕业生」也不是校园渠道证明。[E13]

跨源仅按第一方 `id`／原链接记录关系：本次完整的控股588、国际246、通义63两两官方ID交集均0；阿里云未知、不纳入比较。**不按标题合并、不按共同“阿里集团”部门／company去重，不外推整个平台 ID 全局契约。**[E14]

## 5. 失败稿、执行限制与真实外网记录

失败材料不删：`010.json.error.json` 是定位“查看全部职位”的 DOM selector错误；`012.json.error.json` 是错误猜cookie取CSRF、尚未发list；`alibaba-two-wide-scans-eval.json` 是已取齐588后错误要求越界第60页total仍588的首稿，返回 false；后稿只修“范围内total稳定、越界空响应允许total0”，再重新两轮完整扫。`analyze-first-null-draft.mjs` 保留国际选中非 `/zh/` 空content的分析早稿，最终报告使用已正常加载的 `/zh/` 非空原生详情；阿里云首次target丢失错误见 E15。不把上述失败写成成功。[E13,E15]

追加同源列表每轮串行，单请求 `AbortSignal.timeout(15000)`，间隔200ms；各来源在15分钟内收敛，不探任意非法页长／密集地域组合。**执行偏差明确保留**：早期已加载公开导航 config 复用曾并行且重复请求两URL；通义一次Node协议核验与Chrome扫同时启动，跨helper没有统一150ms节流。本研究不作为可晋升候选或生产节流合规证明；后续共享实现须单source统一串行限速，再进行自己的严格完整候选双扫。原生页面自动资源／SDK telemetry为正常浏览器行为，没有为了“全零”修改或阻断。[E8,E11,E16]

持久化快照合并的 `(CDP requestId,URL)` 共2181条，HTTP200 1925、206 4、304 12、404 4、未保存HTTP状态236；其中16条有实际 loadingFailure（9条未观察到HTTP状态，7条观察到HTTP后仍有失败／取消事件），另227条无最终status且无失败事件；不能把未知都算失败或都算成功。404是英语页面的 `undefined/null` 图片资源；失败包括正常页面的内部losvc连接失败、导航／Lumos stream取消，**不是 source list的业务拒绝**。国际首页自带Lumos在正常mount时自动发起查询进度stream，研究未点击或提交聊天／申请。Chrome原生日志另有GCM401、DEPRECATED_ENDPOINT／QUOTA_EXCEEDED和DNS错误；不将background写全零。显式全扫请求另有完整响应bundle。阿里云target丢失部分未落网络事件，必须保unknown。[E16]

## 6. 证据索引、代表图与实际清理

所有相对材料路径均解析到 `/tmp/ande-ali-social-core-run/`。原生业务响应／脱敏request metadata／DOM／截图的完整hash清单是 `material-manifest.json`（192项）；它**只hash非敏感原业务证据**，不把cookie、profile、脚本、派生分析或cleanup文件冒充原响应。下面派生报告hash单列用于复算与父复核，报告引用到每条原材料；临时路径不是永久云存储。[E13]

| 引用 | 材料路径 | SHA256 |
|---|---|---|
| E1 | `alibaba-zh-nav-config-eval.json` | `acdb7898c5227e2f29c710d0d1658b621ffa560d9757771e8ea89e9c610c853c` |
| E2 | `alibaba-social-click-dom.json`／相邻network及原生body | 逐文件见E13 manifest |
| E3 | `alibaba-wide-startup-dom.json`／相邻network及rawbody | `90d1dd4c0a0d1d02e21cb1af62f24c865ed1314ff4002b6dc1abe012d4160bb6` |
| E4 | `aidc-wide-startup-dom.json`／相邻network及rawbody | `eeff4260bccf3fb553aa4719303ffad0bb71d6b272283fa67d9fa9dac807b920` |
| E5 | `tongyi-wide-startup-dom.json`／相邻network及rawbody | `93a4fe2d454da3cda9615f8e5bdf1b3f6bf2b8e9d56b7e4d47461275301a713b` |
| E6 | `alibaba-two-wide-scans-corrected-eval.json` | `9d6bead9bce5ac04dc745f1d979b504367e35459190bd80f920c240cf424aeb4` |
| E6派生 | `alibaba-final-analysis.json` | `6b0de7145a5745aa43a3af9b0dab4f49bcf2c9cc704088e8cab7b0ef6d1c46e7` |
| E7 | `aidc-two-wide-scans-eval.json` | `1a328fb696a2b61e9b330e6a91a77affbec19d9499ef22877183d9ec75f215aa` |
| E7派生 | `aidc-final-analysis.json` | `82e2397fb680e4444d24743dc3c51d1ed9ee832e9cb98b9bea50959caf19a9e2` |
| E8 | `tongyi-two-wide-scans-eval.json` | `27cc1c41c04a2a618739fe4f0c16ffb98f725a29be966f674e7d4095cc52a81d` |
| E8派生 | `tongyi-final-analysis.json` | `de70b0624ae219c13fc636684da7097119c8233fdd705900bad2d42d0f879ef3` |
| E9 | `alibaba-node-once.json`／bootstrap与list响应原文 | `61241fe79309dba59feaad114278638f709d054a97bbab131cf82b1cac692204` |
| E10 | `aidc-node-once.json`／bootstrap与list响应原文 | `1b400f802f719ba1a74410cc5329e4662a99213d77462270084fad1749c63133` |
| E11 | `tongyi-node-once.json`／bootstrap与list响应原文 | `d165ca762c56ea55da0ce1d65ae1290ca23a628df91c47c881214ac83b9c4136` |
| E12 | `alibaba-renderer-proof.json`／`aidc-renderer-proof.json`／`tongyi-renderer-proof.json`，内含原bundle路径、URL可由network核及原SHA/offset；DOM `*-detail-dom-renderer-eval.json` | 三个片段报告SHA依次 `c5fe55198740101d76347102fb4ec3b56691a3c7d16239d4664103ca9affc8e9`／`7d7ca27eb9fc16bd34eddc393f801296fa95141aa0e3a7015259f6e6de92a5e0`／`a67b15eeba884d6d7904a5df8f88715bcb093c86e6b72a5045f7a5310b9ae3b0` |
| E13 | `material-manifest.json`；9代表 `*-detail-官方ID-{dom,network}.json`／对应body和PNG | manifest SHA `f15a5431ebac21582be718e9ae2bb583ff5c60fc68f09e0986c7b629e6dee578` |
| E14派生 | `cross-source-official-identity.json` | `f97b868a6085367522a1b9b14472c023a4ed27f2e0bf70790d910ecca5683228` |
| E15运行失败 | `028.json.error.json`；`chrome-after-target-loss.json`／`new-target-after-loss.json`／`target-loss-*.txt` | 控制错误SHA `0e8a569189a22bda7e11463f40107ae29c9aab9cf9b9fe6515a4dc2d7d0b7bac` |
| E16派生 | `page-network-observation-statistics.json`／对应原network／`chrome.log` | 统计SHA `aab99c9d000b9332d3b5f682d54077dc9945d89bc737fd5817113d2983741d43` |

父代表图（本代理已亲看，正常匿名页面，非验证码／登录截图）：

- `alibaba-detail-100042580002.png`，2880×1550，SHA `9bea0f0c8d0b27d02b8bd255554006d24a8108582290f3d9df6b3ecd6c7ea286`。
- `aidc-detail-100046800001.png`，2880×1550，SHA `e5339b108dd39a4e7ca84eb668f188c65205f3f020587b6f8161a4a981c7cf3f`。
- `tongyi-detail-100046200005.png`，2880×1556，SHA `9454e64f13d397b76b0c92517cc2bd92d23c47f095329762d544f238ad418b20`。

**实际资源清理**：自有Chrome主PID4439／port9417及自有Node driver；profile `/tmp/ande-ali-social-core-profile`。先记录实际process后代、TCP连接，再正常 Browser.close，检查并只终止仍存活的自有PID，删除profile。`cleanup-after.json` 证明已知自有PID无剩余、profile不存在、9417无监听也无连接；1082非本任务监听保留，未杀父或另一代理资源。清理前／后运行证据SHA分别 `d60552a2c695e656e55c3a74b28c94fb81babe33926d98d087d918e51bec4c21`／`4db6f3167da05ea96e9f0a4bb7ad2b67b1bd675a3dcb8695e4e5a2a39c298363`，独立于原业务manifest。

**后续边界**：父亲看证据／hash／清理终核之后可决定最小共享adapter研究结果如何落实现。三个已穷尽源不应因阿里云未知一并阻塞；本材料本身仍不可晋升、不可替换历史。阿里云的首次正常导航未知须独立处理，不继承同协议资格；公开29,395及八源历史1002／其余保护基线均由父复核，不由研究数量差推断下架。


## 7. 阿里云 run2：驱动修后唯一正常重跑（追加，保留 run1 原稿）

**本节是阿里云最新研究结论；第1节“未知”行仅保留 run1 的历史工具证据缺口，不是永久官网安全阻塞。** 原文 SHA `2d77a013968300da5a9de8da505bbe8f1dcb28ffb05c2e235c53194be86e21e4` 的逐字副本在 `/tmp/ande-ali-social-cloud-driver-diagnosis.original-doc-2d77a013.md`。run1所读原稿、原manifest/hash均未改；本节没有复访另外七来源。

### 7.1 有界诊断：证明驱动错误，不杜撰丢target的触发原因

先读 diagnosing-bugs skill，运行实际旧CDP类的最小离线fixture：`node /tmp/ande-ali-social-cloud-driver-diagnosis.regression.mjs`。模拟 Page.navigate 中socket关闭，旧驱动仍留pending，等待20000ms后输出同一 `CDP timeout Page.navigate`，断言退出1。旧类没有 `onclose`／Inspector detach/crash处理，始终复用一次选中的page socket，并且仅成功snapshot才保存network，因而能把真实session丢失隐藏为泛化超时、丢失失败时网络材料。这是**已复现的驱动根因**。[D1]

只改自有/tmp驱动：socket关闭立即拒绝并清空pending、拒绝后续stale session，加入Inspector与浏览器Target生命周期事件、持续脱敏network落盘，CDP控制超时15s。相同fixture加载修后类退出0。旧Chrome PID4439及9417监听当时仍存活，且可创建新blank target；原单线程队列唯一close为之后的038，不能在028/029等待中提前运行。**但最初target为何消失仍未知**：renderer／窗口退出、外部close或Chrome helper问题没有足够事件证据。日志里的sandbox错误及Chrome小版本变化不构成已证明crash／升级根因；无原官网HTTP、验证码或业务拒绝，绝不写HTTP0或官网拒绝。[D1]

### 7.2 唯一新普通Chrome：访问正常，覆盖却真实受阻

run2仅一个普通隔离headed Chrome，原生154.0.8037.98，无UA／TLS／指纹修改；沿run1已核集团招聘导航的 `https://careers.aliyun.com` 正常进入「社会招聘→查看全部职位」：`https://careers.aliyun.com/off-campus/position-list?lang=zh`。本次没有重现驱动错误、登录／验证拦截或source list拒绝。[D2]

- 原生startup list：POST `https://careers.aliyun.com/position/search?_csrf=[REDACTED]`，HTTP200、`success:true`、**官方total677**、datas10。真实body与第2节控股／通义列出的完整body相同，包括 `channel:"group_official_site"`、language zh、pageIndex1/pageSize10、全部职业／地点／部门／批次／分享条件空。bootstrap `channelCodeMap.offCampus` 及三个真实详情POST却均为 **`aliyun_group_official_site`**，需独立固定，不能凭其它源继承。[D2,D5,D6]
- 默认原生metadata异常不能被吞掉：startup返回 `content.currentPage:1,pageSize:500`，**不等于请求的pageSize10**；第50页请求pageIndex50/pageSize10返回10条，但metadata仍1／500；第51页同范围请求返回**空datas，total仍677，HTTP200／业务成功，metadata仍1／500**。[D3,D4]
- 这是当日正常默认wide访问的500边界／截断表现，不是拒绝，也不是官方零岗。只保存首页10＋第50页10，共20个不同官方ID；**没有逐页收齐前500，更没有取得677全集**。因此未启动两轮“完整wide”，不拿20或500冒成功、不改页长盲绕、不尝试其它channel／新入口。[D3,D4,D7]
- 正常UI「+ 更多」只打开可搜索地点控件，当时显示“无选项”，未提供完整地域字典；初始 `/region/hot` 仍只是热门地点。尚无未分类／海外／多地／None归属及过滤精确作用的全覆盖证明；不做城市盲扫或分片并集complete。首页另有瓴羊／诚云入口，本次wide确有它们的原生岗位，但不另扩入口／另注册公司。A Star／管培生／校园／Global Hiring也未自动纳入。[D2,D8]

**阿里云最新 `scopeComplete:false`／`productionEligible:false` 的原因是这次真实覆盖矛盾；不再是run1驱动异常造成的访问未知。** 677只是官方count，不是可晋升候选数量；保历史，不采用字节限定迁移政策，不阻塞同批其它已独立足够完整的来源。

### 7.3 正常Node一次／3详情／renderer（均不构成完整候选）

所有Chrome主动工作完成后才执行一次原生默认UA的Node匿名协议，未与Chrome主动fetch／导航并行：GET实际中文列表入口，从正常HTML取得CSRF／匿名cookie，仅内存保留，200ms后POST已观察list body；GET／POST均HTTP200、业务成功、total677、datas10，metadata仍1／500。无重试、无伪装浏览器UA、无SDK签名注入。此证据只证明正常唯一协议可达，**不解除wide截断**。[D5]

三代表：`100005043007` 解决方案架构师、`100002983003` AI销售、`100015743004` 第50页瓴羊高级财务BP／10年以上经验。均正常原链接导航，真实 `/position/detail` HTTP200／业务成功；list独立职责／要求与详情逐字符相等，实际DOM `.block-info.textContent` 两段也各自逐字符相等、computed `white-space:pre-wrap`。[D6]

阿里云实际正常加载的是另一业务bundle：`https://g.alicdn.com/platform/aliyun-new-careers-portal/0.0.1/aliyun.min.js`／`vendors.min.js`，不是把前三源renderer结论照搬。只读取已正常加载的业务renderer（一次正常公开静态资源复用），业务组件description／requirement→blockInfoList.value，实际vendor renderBlockInfo直接React child `e.value`；因此代表JD按纯文本原换行，不解码实体／剥标签。renderer及DOM明确modifyTime→「更新于」，发布日期仍未知/null。代表category/status/positionType/channels/batchName多为null，不猜类别／全职／人才计划／开放状态；按钮未禁用仅为DOM事实，未勾协议或点击投递。[D6,D9]

20个观测list链接逐条验证官方origin `https://careers.aliyun.com`、path `/off-campus/position-detail`、positionId等于官方ID、query keyset仅positionId/track_id且后者等于独立trackId，无凭据／fragment。首页Chrome与随后Node10条完整raw按官方ID比较，仅trackId／positionUrl变化；仍需按第3节的精确tracking例外投影保留URL其余组成和全部其它facts，**该首页比较不是两轮完整全集扫描**。阿里云全集跨来源身份交集仍未知，不按标题或共同部门去重。[D7,D9]

### 7.4 run2独立材料／失败原稿／清理

run2主动请求串行间隔≥200ms，fetch／CDP命令15s timeout；正常页面自己的自动资源保持原样，不假称所有背景请求都串行。首次外网导航 `16:51:07.148Z`，Node一次 `16:57:11.961Z`，实际清理 `17:00:27Z`，来源研究在15min内收敛。持久化native事件442条：HTTP200 374、206 4、304 4、未观测HTTP60；其中一个已200的视频fetch随后 `ERR_ABORTED`，另60个无最终status／失败事件。Chrome日志另有GCM等背景错误，不能写全零；公开CDN过期签名auth_key与cookie/token/CSRF值均脱敏后才最终hash。[D7]

原/修fixture、诊断材料统一 `/tmp/ande-ali-social-cloud-driver-diagnosis.*`；新原生材料／脚本／JSON／截图／独立manifest／cleanup统一 `/tmp/ande-ali-social-cloud-run2/`。旧稿不覆盖，旧manifest仍为第6节hash。下面相对路径均指run2根，business manifest只hash非敏感原业务证据；派生诊断／分析与cleanup单列，不冒充原响应。

| 引用 | 材料 | SHA256 |
|---|---|---|
| D1诊断 | `/tmp/ande-ali-social-cloud-driver-diagnosis.md`；同前缀final.json内列原材料、fixture及root cause | `27b16886e8ed6cb2b16313b73054f17b1a1fc26491fcace98cd7410a0943a3f8`；final `8c74c621ba4dade788d08e1dae1d4bf2656e383ea60a08ad8d4f871534b148cd` |
| D2 | `aliyun-wide-startup-dom.json`／相邻network及真实body | `730cd7f60c2caabecfbf1631657a7b96aecbea6be0553dae66af148fbf2f018e` |
| D3 | `aliyun-deep-probe51-eval.json` | `9c333e2e93429ca56f47f6f8ea9cd0c4337d8df104e9c2237b7f061e7ec5865b` |
| D4 | `aliyun-deep-boundary50-eval.json` | `8d16b62575c29f4033a38dd7fde01f55c0e81eef267a9b8ba337aeee7f3798e4` |
| D5 | `aliyun-node-once.json`／bootstrap HTML与list JSON | `de1323383df5b3f5c2149e9e78f6ada66526c9e041195984402f8c1f919584d0` |
| D6派生对照 | `aliyun-detail-comparison.json`；内含3原响应/DOM路径，manifest列其原SHA | `3ea326893a9cc928e39421f2e4985aa5195efe7b4288a00f0eed740de15902ee` |
| D7派生分析 | `aliyun-run2-analysis.json`；对应原native-network-events.ndjson／chrome.log | `66acabad8850c21a11edd53a1c26d52eb504bdb0d44c5470a50ef03a781ae50d` |
| D8 | `aliyun-location-more-native-dom.json`／相邻network | `1c26a858c0a05786b1a4edea41525a0cbc76f325a5e762d212124a3fa8f70a8f` |
| D9 renderer片段 | `aliyun-renderer-proof.json`，内含已载URL、原bundle路径/hash及offset | `d548828390d04ea82f0e89d9aeed22e4660d66af382309fa0d8f3fafa44a5039` |
| D10原业务清单 | `material-manifest.json`，63项复核0 hash差异，scope complete仍false | `6df6ea7f42c20284b00b11448cec87394a5392af38e5af983d5f929b9a808fc2` |

新增代表图已亲看：`aliyun-detail-100015743004.png`，2880×1550，SHA `2b2a0aeb135941899d0e72c9a2b46cbe1b4c12ff62556bff1b80849ef77efc94`（正常匿名财务JD，不是验证／登录截图；全文以完整DOM核验，不以视口是否能容纳全文判定）。

实际清理：自有Chrome PID5662／Node driver PID5694及其记录的后代；Browser.close后只清理自有残留，profile `/tmp/ande-ali-social-cloud-run2-profile`删除，9427无监听／连接，profile进程搜索再次为空；1082非本任务监听保留。独立 `cleanup-before.json` SHA `9000a8d7ad70416786721987d31fcd529d38afa48b370556d5b6c91cce2574f5`／`cleanup-after.json` SHA `8699e2818f342ea0d6f3cbde74b8ce1dff43ce858da0ab1f048f662bff75bace`。仅追加本研究文档，仍未生成生产候选／资格、注册／实现／前端／公开数据／生产out变更。
