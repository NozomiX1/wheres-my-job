# 安得采集工具

原生 CommonJS / Node.js 22+，不调用 LLM/Agent。采集不应按求职者方向删岗，用户关键词排序只在浏览器完成。[现行规格](../SPEC.md) · [阶段结果与覆盖阻塞](../PROCESS.md)

## 唯一流程

```text
sites.json（唯一来源登记）
  → update.js 按注册表串行调用 crawl.js
  → 可发布快照（可用性与完整性分开）
  → publish.js 整理真实字段，整源替换
  → ../data/catalog.js + ../data/parts/（唯一数据：目录＋分片）
  → 同publisher派生 ../data/catalog.js + ../data/parts/*.js
  → ../index.html + ../assets/data-loader.js + ../assets/app.js 按查询加载/匹配排序
```

```sh
node crawler/update.js stepfun stepfun_social # 仅明确授权的keys；部分失败返回非零
node crawler/crawl.js stepfun      # 仅采集，不发布
node crawler/publish.js stepfun    # 仅发布该来源已验证的新快照
node crawler/publish.js --reproject huawei # 明确来源的同钟投影修复；复验快照，不重采/伪造新成功时间
```

无参数的 `update.js` 遍历全部来源，`publish.js` 检查全部来源；日常操作明确keys，不以无参数全站执行代替检查。`run_daily.ps1` 是主入口的薄兼容包装，不另维护名单。没有 HTML 生成器、CSV 聚合、召回切批或个人评分入口。


批次结果、实际统计、初版退出及验收范围集中在 [PROCESS.md](../PROCESS.md)。下文只说明操作与技术契约；旧来源报告的保初版/未提交是历史，不覆盖现行规格。

## 采集与发布保护

工作文件全部在被 Git 忽略的 `out/`：

| 文件 | 职责 |
|---|---|
| `<key>_raw.json` | 当前候选；无可用结果时恢复旧文件，首次完全失败删除候选 |
| `<key>_snapshot.json` | 可发布快照，含采集时刻、来源覆盖、原证据及complete标志 |
| `<key>_status.json` | 最近尝试、采集时间、ready／failed／unverified状态及已知问题 |

- 子进程退出0不单独证明数据可用。采集成功 = 适配器取到至少一个岗位且 total 与岗位数一致（官方 total 另记在证据里）；失败、中途出错、零岗位都不改已发布数据，也不再有「部分结果」。身份／安全链接／已取得字段只做程序基本检查。
- OPPO、腾讯、快手、百川、网易、雷火、百度、蚂蚁、B站、TME、京东、vivo社招、华为、小红书、阿里巴巴校园等15个门户与阿里云仍沿用各自较严的证据合同（输出里的 `complete:false`、`policy:'available'` 管线已不再区分），中途失败时仍会带 `stopped` 证据返回部分结果，由 `crawl.js` 按 `portals.listStopped` 判断：列表阶段出错或触顶就整次不上架，详情阶段出错只记录；按需逐个放宽。
- 美团生产CLI现为单轮列表＋能取得的详情，真实拒绝/请求错误即停止后续请求，但此前可用数据仍可发布；小米社招type1改为单轮列表＋全部详情，列表职责/要求与官网详情逐字一致、详情无额外JD，`jdComplete:true`；保原城市顺序，不用换序当发布阻塞。详情请求用普通匿名Node，不伪造官网产生的signature/CSRF；拒绝即停、保留列表-only。原严格fetchAll/旧source合同用于兼容已有完整快照和离线回归，后续按来源逐步迁移，不为本次重写所有模块。
- 首次完整成功会读取刚写出的文件。显式成功且 `total:0,jobs:[]` 可替换此来源；未知结构、缺列表、错误空数组、提前空页或触顶不是有效空。
- 同一注册范围内的成功快照整源替换该来源（没取到的岗位即下架，不保存历史）；新结果少于已发布一半时拒绝，确属下架用 `--accept-shrink=<key>` 显式放行；完全失败、未接入适配器及元数据不匹配不能晋升。
- 来源范围（接口／渠道／批次等）变化无需特殊迁移，新结果直接整源替换；失败／零岗位不清旧。
- 部分来源可用时只应用这些来源，其他来源保留已有可用版本和真实采集时间；无该版本则暂无数据，不回退初版。整体命令仍返回非零。正常发布无已验证新快照、无 `out/` 或坏基线时不写公开文件；显式同源`--reproject <keys>`允许在scope与真实采集钟相同的已核快照上修复投影/说明，不回退较旧快照，也不把本地重投影冒新采集，原 `index.html` 不受采集影响。
- 文件按临时文件＋rename 写入；同一来源不应同时执行多个更新。失败状态可随其他成功来源发布；如果全部没有有效更新，公开文件不变，失败详情暂看状态文件和命令输出。

`out/` 只是本机可复用快照，不是临时 Actions runner 的持久存储。以后接定时采集时还需落实成功快照持久化和 Pages 发布，不能把 Pages 自动部署当作采集定时器。

## 目前能被流水线验证的适配器

**2026-10-09 起，小米（三入口）、携程、米哈游、上海AI实验室、七个常规阿里社招门户、飞书（字节与各SaaS门户）、北森（讯飞/vivo）及美团（社招/校园）为单轮采集，列表中途失败或触顶即整次失败（抛错，不发布部分结果；分页循环见 `lib/paginate.js`）**：岗位只需官网ID、标题、可打开的官网链接；未知字段、total不符、坏记录只记入`issues`，详情尽力获取（403/412/429立即停详情，只用列表文字）。下文这些来源里涉及「两轮」「逐字稳定」「未知字段拒整源」「complete／available」的描述是历史契约，以此处为准。**零岗位不能清旧数据**（`validateJobs`拒空）。阿里云（Cloud）的独立证据合同未改动。所有自研门户由 [`lib/portals.js`](lib/portals.js) 登记，`crawl.js`/`publish.js` 只遍历该表；新增门户在那里加一项，适配器须导出`requiresVerification/verifiedSource/portalNotice/validateJobs/validateEvidence/normalizeRecord`，并由`tests/portals-registry.test.cjs`检查。

**Moka（9 来源）**：阶跃两个既有详情模式＋v0.25分别核验的七个固定`moka-portal-v1`来源；共享AES/正文/分页，不继承同系统资格。七个固定keys在调度/空snapshot归一化前核key/company/org/siteId/site/url、取得模式及受约束origin，删除模式标记不能退回宽松路径。

六个`listJD:true`来源两轮完整列表核HTTP200、原生jobStats.total/org、明确成功业务状态、页长/唯一ID/组织及所有raw字段稳定，不为已有全文逐岗请求；非法外封套或解密内层状态不被另一层成功掩盖。官网可选正文缺失/空/符号保留false，未知结构/total fallback不是空正文例外。只用具名原生职能、字符串性质、地点数组与一手证实的publishedAt，非原生alias/canonical字段不供事实。DeepSeek严格140576及官方部门2028422，不扩大high-flyer，37条列表日期/性质缺失保持未知。

鹰角两源实际API origin`https://jobs.hypergryph.com`和官网链接固定，校园26326 `fetchDetails:true/listJD:false`需要103份串行详情，社会26325列表已有全文；两key不跨源联合。新门户每请求至少150ms、15s超时、200页安全触顶拒绝、子进程15分钟（非SLA）；末尾列表核原字段不漂移，任何后续失败/冲突不写部分raw。CLI仅既有共享入口可用`--list-jd`或`--details`及受约束`--origin=...`，正常update/crawl从登记传参，不另做发布链。

阶跃星辰两个来源保持原site94905/94904及fetchDetails模式，现校招已完全包含原141903，不并行重收。本轮仅回归其既有359条规范化事实及36旧out保护，不重新采集/发布阶跃或飞书；其他新门户不得只翻模式flag自动放行。

**北森（3 来源）**：固定 `iflytek`/`iflytek_social`/`vivo` 的 `beisen-portal-v1` 精确profile，在调度和空快照前核身份/URL/scope/mode；标准URL识别已知真实hostname的大小写/default443等拼写，不让删mode/改key退generic取得资格。旧string函数仅离线兼容，不放行这两个真实门户。

严格HTTP200/Code200/TipTypeSuccess/原生Count/Data，串行>=150ms/15s超时/15分钟子进程、50页触顶拒绝，Node原生UA及redirect:error；两完整列表所有raw按UUID核稳定，不为列表已有全文逐岗请求。讯飞2–7联合还需首末无Category全门户双扫、已知类别且与选源原raw精确分区，未分类/新增频道或原文漂移均拒源；权威社会727不重复塞入iflytek166。实际请求body/HTTP/完整native response.Data保存snapshot.verification，crawl/publisher两边复验原封套/Count/页长/全raw/权威分区，缺证的准确profile伪空也不得清旧。真正两轮已证0可单源替换。

UUID Id与数字JobAdId是不同字段；全源双唯一性在投影前也复验，UUID大小写等价查重，raw保真/publicID小写。固定原生metadata要求own且区分空/null与缺字段/非法类型，JobVideoJd未知非空拒源。两租户正文D4五实体单遍解码→普通文本，不HTML解析或重复解码，职责/要求同文也分别保留，不加description副本；官方空/符号诚实false，但不豁免缺total/字段或未知业务。各租户职能独立核：讯飞ClassOne职能/ClassTwo部门，vivoClassOne项目/ClassTwo职能；Kind才映性质、Category映渠道且实习频道不强推校园/性质。0001/0日期未知，完整原生PostDate及合法日历须与已证UTC8 PostDateInt同日后映published，不走generic epoch/date-prefix，不回退ChangeDate/采集钟。范围与首次历史迁移提示随公开展示，不称公司全球全集或退出历史为下架。

**飞书（10 来源）**：共享 `lib/feishu.js` 仅放行字节校园/限定社招及v0.24逐源审查的四公司八个SaaS profile，严格固定adapter/key/company/url/websitePath/portalType/空项目/门户集合等，不依赖可复制的verified布尔。正常隔离Chrome观察全部同scope启动列表，HTTP/body/业务全部成功才扫描，失败粘滞；内存复用官网普通header/匿名CSRF，不记录token、不外注/逆向签名SDK、不改指纹或TLS、不登录/申请/操作验证。字节此前fetch传输保留，SaaS沿自身普通原生XHR和已加载官方会话。

每门户两轮全量校验HTTP/code、稳定总数、精确完整页长、唯一ID和全部原始字段/JD一致；500页保护、提前短/空、漂移或count>=10000拒整源。至少150ms间隔，普通源（含门户联合）子进程15分钟、字节限定社招20分钟预算。字节此前实际346/605秒、此次八源71.813秒均不是SLA。正文独立纯文本，不截断、HTML剥离或解码尖括号；发布再从rawPost逐字段重算。莉莉丝固定portalPaths先每门户完整，再核同ID核心事实/原JD，只对已证明同posting重叠合并、优先career，保留各alias；冲突或后门户失败整源不写，coverage含门户集合，scope及非下架提示常驻。

字节社招真实portal_type为2（校园3；其他SaaS8源6），默认count10000及分页空仍不能证明全集。限定profile固定九根/75个分类ID和原树hash，前后核树，每片同样严格双扫，跨片重复ID拒绝；coverage含root/groups/treeHash。complete只表示此限定范围，source.message/notices持续披露范围及迁移。增删、更名、迁叶或parent变化都拒绝，不能自动清空/扩范围。原partial候选仍false，不直接当全源成功；v0.23按明确授权派生限定envelope经runCrawl/publish，不放宽已验证覆盖变化拒绝。8源新资格独立逐源核验，不是继承字节成功或全站授权。

**阿里共享社招（custom中7来源）**：固定七既有key的`ali-social-portal-v1` profile，精确公司/中文社会入口/API/origin/body与模式，八known门户中Cloud仍无完整v1资格，另有下述独立可用资格；无效/相对/非string声明URI、改key删mode/换ATS亦不得退generic取得资格。三core用已正常Node证明的canonical bootstrap，四brands仅允许已证同origin/path去lang302；正常匿名cookie/CSRF只内存复用，Node原生UA，不伪浏览器指纹/TLS，不登录/申请或盲重试。所有主动请求串行间隔≥200ms、15s超时/15分钟子进程、200页安全触顶拒。

原生业务精确`success/errorCode/errorMsg/content`四keys和content精确`datas/totalCount/pageSize/currentPage`四keys，未知封套追加/缺字段/业务失败/早空/页长或metadata不匹配整源拒。完整两scan每页原request/httpStatus/response随raw与snapshot.verification穿透，在crawl/publisher独立复验（含真零及缺证零保护）。取足后越界空终点total0不用于早空归零；全native raw逐ID稳定且jobs绑定首扫，动态例外仅已证trackId和URL的具体track_id，先逐条核官方origin/path/ID/唯一query，其余URL/所有事实仍比较。列表已有全文不机械逐岗详情；职责/要求普通React TEXT独立，只CRLF规范和外trim，不解实体/HTML/压内部空白/消重或增description副本，合法空/null/符号诚实保留，缺字段/非法类型不享空值例外。原categories/workLocations数组全以`/`展示；社会入口只证social，性质/计划/原状态未知。modifyTime仅已证浏览器local更新，未证source唯一日界，raw时间保真/public date-dateKind null，不猜UTC8或publishTime、无新增schema。品牌连续性/跨产品范围与首次历史迁移公开提示，不改目录/标题筛窄/通义合源，不称集团全球全集或退出历史为下架。

**阿里云社招（独立available）**：`ali_social_common.availableSource(site)`仅放行精确`aliyun_social`公司/ATS/adapter/URI/channel/body；Cloud profile仍`qualified:false`，七源完整v1及双扫/10页长metadata规则不变，不借同公司/ATS或删mode降级generic。Cloud正常匿名bootstrap仅允许已观察同origin/path去lang302；Cookie/CSRF纯内存，包含旧/新敏感Cookie值的响应不能落盘，真实拒绝立即停源、不自动重试或切客户端。串行START≥200ms（sleep后while重核）、请求含正文15s、来源900s、最多200页；先所得非零真实partial可经唯一链发布，不授缺证零/complete/ready。

Cloud v2严格保存请求10/真实页码及响应固定500/1、原total/重复/早空/停止；两栏直接React TEXT，标题/内部空白/CRLF/独立同文保留，日期/性质/计划未知，详情完整性不冒true。未知非空追加JD（包括原生duty/requirements aliases）拒该记录并披露，不静默吞文。显式`collectCloudSupplemented(baseV2,site,{baseCompletedAt,categoryEvidence,regionEvidence,regionSearchEvidence,scans,issues,stopped})`生成v3，嵌完整旧证/钟，只追加未得Native ID，旧500所有raw/文字/URL保留。类别根＋原序子码、hot地点、More地点搜索及两官方菜单词各有自身原生协议/字典证据；仅为原空筛选范围的子查询，不反推单岗属性。列表/category/hot channel为`group_official_site`，More搜索/bootstrap/detail为`aliyun_group_official_site`，不互换；补收新页≤200，partial可发布，默认CLI仍新取v2、不自动续旧v3。目前669对官方670差1，完整性仍未知；实际钟/保护/限额与材料见阿里云续处理§7。

**custom（44 来源登记）**：除上述阿里共享社招，第一批既有来源已接入五个独立官网协议模块：`meituan_portal`（社招；`meituan_campus_portal`共享其原生解析、按官网1＋2分类型枚举校园）、`ctrip_portal`、`mihoyo_portal`、`shlab_portal`（这三者各自校/社两key）、`xiaomi_portal`（校招完整路径＋社招可用路径）。固定profile只授已核协议/scope的执行入口，不授完整成功：fresh HTTP/原生业务、全部身份/字段/JD、双完整扫描及全raw绑定须通过crawl与publisher两边复验；失败不落partial候选，未证有效零先拒。未接入口不继承同公司/同系统资格；阿里云只凭自身独立可用契约放行。旧custom请求/解密/个人方向备注不作当前证据，不能盲加complete或继续旧筛选链。

本批四协议正常匿名Node、串行至少200ms/15s超时，触顶拒整源；美团/米哈游必要详情采用40分钟有界子进程，携程/上海15分钟（非SLA）。美团六片、米哈游六片为实际TEXT renderer，完整正文一次显示，独立职责/要求原字段计分；其它真实正文不另造评分字段。携程原生requirements是完整HTML职位描述，复用已核HTML转换，fromId构官网详情链接，不机械重复列表已有全文。社招双语/组合标题的分栏语义未核验，先保完整正文、独立职责/要求留空，匹配使用全文回退；不按岗位ID猜分栏。上海使用原生has_more和推进游标双穷尽，无官方total；`countKind:cursor-exhaustion`标明derived唯一记录数，保公开分页cursor原值以重演request链（非会话凭证），两条已证requirement省略与非法null/未知JD严格区分；当前SSR只证普通TEXT/LF→BR，未证markup/字符引用正文形状整源拒绝，不盲剥HTML（普通amp/数值比较仍保真）。scope的origin/detailApi/headers亦绑定coverage；源级语义/原始字段证据见 第一批核验记录，成功/失败及实际数量以数据/Git和PROCESS为准。旧字节custom仅是共享实现的兼容入口，不另发布。

`custom/huawei_portal.js`接入固定CR/SR默认广列表及详情/岗位意向；复用`huawei_http.js`的正常匿名transport（真实Referer、公开bootstrap CSRF仅内存可为空、原生UA、串行200ms/15s、拒绝后锁存停止）。按官网声明的末页停止，不为可用发布强求越界EOF。全部意向按原顺序保留真实标题/HTML正文及独立两栏；未取得者不造JD，额外正文完整性与日期/性质/人才计划仍未知。仅可用资格，不冒完整成功。显式`huawei_portal.js <siteJSON> <rawFile> --resume-details=<snapshot>`可复用同源已核列表续取正文，经正常crawl/publisher复验，记录未重采列表，默认更新不自动复用旧列表。

`custom/xiaohongshu_portal.js`接入官网页长10的默认社招与校园regular `campus_autumn_27`项目；校园regular之外另按官方标签点击独立注册三入口：`xiaohongshu_redstar`（red_star_27，页长100）、`xiaohongshu_ace`（top_intern_program，页长100）、`xiaohongshu_intern`（madang_trainee/other_project，页长10），各入口独立证据、不互相继承，不冒其它校园范围。单轮继续重复页至空页或安全上限，按positionId去重并记录官方total/实际唯一数；正常Node无token/伪UA。原生duty/qualification按TEXT保全部空白/实体字面/同文，列表JD先可用，未核详情不能称确定缺段落；日期/性质/人才计划未知，公开接口状态不证明可投。原始成功页及停止请求留在verification，不因重复或覆盖缺口清旧。

`custom/baidu_portal.js`接入官网默认GRADUATE＋INTERN校园列表及SOCIAL社招列表，空关键词/项目、页长10，不沿用旧projectType1/排AIDU或职业筛选。正常Node原生UA，仅真实Referer及表单Content-Type，无Cookie/登录/签名；单轮串行200ms/15s、每类型200页/进程15分钟保护，按原生pages末页停，拒绝即停整个来源且不重试。保完整原生列表/请求证据，按postId去重并绑定取得类型；postId与jobId独立，官网详情链接用postId，原标题（城市前缀/岗位编号）及React TEXT两栏不改写。INTERN只证实习、渠道不推校园；其它性质/计划/日期/状态未知，列表JD先可用、详情正文完整性待核验，不冒全集/ready。详情页SSR `detailData.postInfo` 抽样20+20与列表`workContent/serviceCondition`逐字一致、无额外JD字段；未据此改`complete`/`jdComplete`，详情认证仍待。失败或无可用记录不能清旧，旧百度脚本不再进入生产链。

第二批8个既有key接入五个独立可用模块：`alibaba_portal`、`baichuan_portal`、`bilibili_portal`（校/社）、`ant_portal`（校/社）、`kuaishou_portal`（校/社）。精确冻结各source profile，不能删adapter/改key、公司、URI或body降级generic；只授`complete:false,verification.policy:available`，不继承同ATS或另一source的成功资格。串行请求开始间隔≥200ms、完整读取后再下一请求、15s单请求/15分钟来源预算、最多200页，真实拒绝停止无自动retry；同scope不完整更新保旧岗位及逐栏非空JD。匿名CSRF/Cookie只在内存，不伪UA/签名/ctoken/HMAC，不为列表JD机械追加详情。

阿里校园取已核三个批次（应届＋日常/研究实习，阿里星不额外重复采）；B站不填可选type，两栏未知的HTML职位描述保单字段全文；蚂蚁用当前广列表空招聘类型/批次，无自造ctoken；快手校园覆盖官网字典全部12个项目（含往届仍在列项目，经 extendCoverage 保旧扩增 506→714）、原生字典及数字id详情路由。阿里/百川/蚂蚁/快手按第一方TEXT renderer保全部原字符，不沿旧职业/项目排除。百川及快手社招在用户另行授权后已通过正常官网原生翻页继续取得数据；生产CLI直接选择`lib/native-ui.js`隔离Chrome传输，不先发unsigned Node请求再自动换浏览器重试。只观察官网自身请求和点击原生下一页，复用已有CDP类，不注入SDK/生成签名/修改UA或复制会话；Cookie等敏感头只留内存，证据仅保必要公开头/成功岗位响应，百川URL只去除敏感signature，保实际动态分页Referer并严格绑定空筛选/页码。官网首页/字典自动流量可能并发；后续逐页点击≥200ms、正文队列无重叠，15s响应/900s来源/200页保护，拒绝停止、此前可用页保留。百川校园列表后另按官网详情GET `/api/v1/job/posts/<id>?portal_type=6&with_recommend=false`补全部18条详情；普通匿名Node不含页面signature/CSRF，按官网renderer组合“职位描述/职位要求/职位信息·部门”，详情无额外JD；详情拒绝或任一未过验证时保留列表-only并披露。

快手官网自动补`workLocationCode=domestic`，新可用证据固定version3/`native-ui-default-domestic`，保实际参数，不冒无城市列表或海外等价；登记目标scope不变，明确局部已取得范围、不完整增量保旧。旧version2无城市资料仍可独立复验；校园Node路径不变。百川及快手社招旧unsigned路径仅供显式注入fetchImpl回归，历史405/code:-1的单一根因仍未证明。快手日常实习另入口未核，性质不推全职。真实数量/资料钟及本轮材料复用发布见第二批核验§6，不把发布时刻冒采集完成钟。

第三批11个既有key接入六个独立可用模块：`tencent_portal`、`tme_portal`、`jd_portal`、`oppo_portal`（各校/社两源）、`netease_portal`（网易社会＋网易互娱）、`vivo_social_portal`。各key独立冻结公司/ATS/adapter/URI/当前广列表参数及补充接口；GET `query`与OPPO文化`dictionaryApi`也进入scope身份，删除adapter/改公司或body不能降级generic；后续雷火取得独立`leihuo_portal`资格；阿里云另按上述独立available契约接入。正式请求串行START间隔≥200ms、正文读完才下一次，15s请求/900s来源/200页保护，只授available，不因数量吻合升complete。真实拒绝停源不重试；身份guard另记，不冒HTTP/业务拒绝，已得可用资料经唯一链发布时复用真实资料钟。

腾讯按安全字符串PostId/postId（含负ID）绑定内外部入口；OA/SourceID1内部详情与外部链接独立绑定。后续只在已证明的project12、`-2…-6`、原列表id/position/职类/原标题与原响应id/tid/project/recruitType全部相合时接受null postId，不改原ID，也不全局放宽；历史v1 guard收据仍保留。`tencent_workday`仅授官网列表实际链接的Tencent tenant/site正常匿名GET、原externalUrl/slug/reqId/GUID绑定及单HTML全文，不造独立两栏。v2补充证据嵌原v1列表/详情，可复用稀疏已得响应，未请求者保未知；CLI正常全量取得后也补外部详情，HTTP拒绝停源无retry。一份Workday成功材料分别绑定两个独立列表，后续403停止同门户，不自动换source key或浏览器再请求。用户了解拒绝后另行明确继续腾讯，新授权阶段从开始正常Chrome检查：Document200、官网自身正文API仍403，即停，未取得额外全文/刷新成功钟；不是旧阶段的自动fallback。随后只按已得校园显式recruitLabelName前三可见token标593实习/640青云true（应届不推全职，其余计划未知），按已绑定internal supplement取5个tidName职类；另保全部非空bonus原文，独立同文不互消重。空JD已证属性可显式同钟reproject，普通partial全空保护及逐栏旧正文保护仍在。见腾讯续处理§6。后续明确新授权的`collectResumed(priorV2,site,{priorCompletedAt,supplements,issues,stopped})`生成v3，嵌完整旧v2/旧停止及真实钟，仅补未得正文，不自动恢复CLI；新旧证据与Native绑定均独立复验。Workday可选`canonical:{url,listing:{request,httpStatus,response}}`只接纳由同空筛选匿名公开列表证明的地点段变化，完整原posting slug/reqId/site/GUID、原GET与原腾讯公开链接不改；缺证或其它身份变化仍拒。当前本地已补校园86／社会285条全文，剩校园3／社会20；公开285个匹配原链接均已得，新旧真实S22收据保留。见Workday补齐§5。TME校园空type保四类，两源取必要详情；京东校园publishId、社会requirementId独立，社会真实链接仅列表入口而非唯一详情。OPPO校园补一次真实文化字典，社会仅补8个方向岗位详情；所有已得原两栏、额外正文及方向保留，不自造方向编号/城市标题。网易互娱公司仍为“网易互娱”，只取当前导航102/75/104，不借社招或雷火资格；vivo社会M字符串job_id与显示H码分开，单HTML全文不猜两栏，也不继承校园北森资格；组织范围已做有界诊断：company_id 0–10/20/50/100/200/999/1000/10000仅1有岗、group_id 1–10不改变结果、官网无组织筛选/字典。各源TEXT/HTML按独立renderer证据转换；原城市重复/空槽/顺序、标题、字面字符和已得正文不删减。实际数量、钟、缺口与HTTP页面范围见第三批核验§6。

`custom/leihuo_portal.js`是独立来源资格，不继承`netease_portal`。正常公司官网→校园热招菜单闭合应届project77页长10、日常P4/workType1页长12两个当前协议；原登记管理系统的登录门禁不代表公众校园必须登录。两栏均按当前独立innerHTML renderer分别转换（不是只凭`_s`判TEXT），保原标题、Native ID/URI、已得伏羲机器人等部门记录，不猜法律雇主或时间戳日期。两接口ID域若碰撞保首次并报告后者未应用，不造复合ID或合错正文；当前180条无碰撞。固定query及dailyApi进入scope，串行START唤醒重核≥200ms、15s请求/正文、900s全源、总200页保护；拒绝停全源、不跳另一入口重试，partial可发布、缺证零不能清旧。后续沿同一当前router正常匿名验证research68与intern73：研究4页40、暑期当前0，新增精确四入口profile并显式保旧扩增；旧两入口profile仅保其精确历史资格，不借旧profile授新项目。共享Position两栏HTML绑定原ehr_project_id/原URI，22页220唯一；单项目有效零不清整源。不同入口截止日期不替代当前列表或可投验证。见补缺记录§6及继续补齐审计与执行。

继续补齐时，`oppo_portal`新增精确SOCIAL＋OFFEN两渠道profile：旧SOC页长100/155＋已得8方向保原v2证据和钟；v3独立绑定日常页长10/10岗、其原OFFEN URI及JOB-TYPE字典，类别只按实际dictValue→dictName，不复制岗位或把实习推校/社渠道。CLI依次正常SOC/必要详情、OFFEN、职能字典，任一拒绝停全源；原校园culture与旧v2资格不变。`jd_portal`社招补独立同空筛选`job_count`证据，新v3保1838原槽/1828唯一/10重复，数字0或数差不清旧/冒完整，旧v2仍有效；正常CLI先计数再列表，拒绝无retry。腾讯同钟投影补完整已得showTitle/showTxt/父方向文字，网易社会用官网严格workType枚举及极客计划徽标补性质/计划，其它未知不猜。网易另有显式`collectRetained(newV1,priorV1,site,priorCompletedAt)`：v2独立验证同社会精确scope的两份原列表，仅追加新列表未观察的旧Native ID，嵌旧真实钟且不覆盖新记录/冒全集；正常fetch仍v1，不自动读取out。实际旧3岗原workType0全职已得，按此保钟复用补齐，而不是以未观察推测属性或换旧钟为新采集。互娱日常原href P8/workType1单独正常观察/2页159记录，与网易本次广列表逐原生ID及全部raw完全相同，不另复制或改归属；不能仅因同ATS、名称或workType数值判覆盖。当前JD渲染器字段已齐且代表详情无差异者不机械重取全部详情，仍不因count或抽样签ready。

美团详情已证 `otherInfo:"暂无"`与精确空字符串 `""`仅作为原生占位/空值保存，不添JD；其它非空值（含空格字符串）仍拒，列表仍须null，双轮完整raw稳定要求不变。

美团校园新profile为官网默认1＋2、空subCode/其它筛选，不再旧2027/排LongCat/北斗。正常原生API已证pageSize=1000可返回571完整唯一岗位及原total/pageTotal；仅改变分页粒度，不改变范围。仍严格分页直至typed-null EOF，不把1000当总数上限；未来超过1000或跨页再漂移仍拒，不自动调大或重扫求绿。官网并列多选机制下，两轮分别完整枚举1应届、2实习，原生jobType逐条绑定分区、跨区身份唯一；每区total/满页/typed-null EOF/全部必要详情，两轮全部raw稳定。默认1＋2前后总数须等完整唯一union，默认首屏原生每岗亦绑定union；不据7页样本或简单194＋377求资格，任一不等/漂移/早短/必要详情失败拒整源。校园详情已证列表空项目/部门须补原生项目ID/名称及全部部门，保持完整raw；4697281262的列表与详情cityList同null、官网隐藏城市栏为合法未知，不生成工作城市标题或猜城市；不推断计划/日期/职能。官网按jobSpecialCode的已证两栏＋工作城市或六片renderer保原标题/同文/顺序，city不充jdComplete；原类型2实习，类型1性质未知。校园资格独立于社会，仍经唯一crawl→snapshot→publisher→data链。

`custom/xiaomi_portal.js`的原完整路径保持已核HR `type=2`校招无筛选全集（含campus/futurestar/toptalent/newretailing链接），不沿用旧“2027届/排顶尖”过滤；社会不继承资格。`xiaomi_intern`按官网`type=3`独立严格双轮＋全部详情认证（列表571、发布570，URL限topintern|internship，原生标“实习”按 detail recruit_type 标 employment；详情允许已证“热招/简历缺岗”徒标，未知徒标拒）；`type=4`经探测172条全部落在type2＋type3并集内，不单独注册。正常匿名Node原生UA、200ms/15s、200页保护/40分钟有界子进程，双完整列表逐页原生total/页长、三独立身份、越界空EOF及全部13字段稳定；每轮全部必要详情以正常匿名GET、官网真实公开website-path/中文语言/Referer取得（无注入签名/SDK；缺website-path会静默丢课题字段，不能只看code0），身份/两栏与列表绑定、完整raw双稳，证据穿透crawl/publisher复验，未证有效零拒绝。官网React TEXT的description/requirement保全部空白/实体字面/同文重复；详情已证额外“课题名称及内容”按真实标题/顺序补入完整description，不添第四评分字段，未知额外JD拒整源。列表没有该额外字段，不能当完整JD；初版列表-only候选撤销，非旧成功保留。聚合接口未提供的职能/性质/计划/状态及日期保持未知，校园城市原数组顺序仍严格比较。首次完整通过且本地页面验收后才发布。

部分 custom 需要 Chrome/CDP，历史路径偏 Windows、`CHROME_PATH` 支持也尚不统一。不要假定这轮整理已经解决各来源运行环境。

## 发布数据契约

`../data/catalog.js`（轻量目录）＋`../data/parts/*.js`（按单位/来源分片的完整正文）是唯一公开数据；publisher读取时把分片还原成完整岗位，发布后删除不再被引用的旧分片（不保存历史）。浏览器同HTTP/file可用，不动态请求招聘官网。

全部分片单个≤1MB、目录约190KB，均远小于GitHub单文件限制，可直接入库部署。

同一publisher按真实company/sourceKey和约1MiB切分完整岗位为hash命名的`data/parts/*.js`，单个超长JD不截断；分片不代表查询或岗位上限。`catalog.js`复用全部来源/公司/notice元数据，jobs为空、parts含id/file/sourceKey/company/count/bytes，首屏目录数量从parts统计，不把尚未下载当零岗位。先写所有分片再替换catalog，旧hash文件保留供缓存/已打开页面，不自动清旧。

查询时按所选显示单位加载完整所需分片，未选单位仍需全部；顺序加载、缓存/inflight去重、30秒单分片超时，无自动retry。全部完成才提交冻结条件/更新结果；失败保旧，用户再次查询才重试，重置/后发查询使旧请求结果失效。所有原17字段/JD保真，未知已选单位不静默变全部。全站查询仍有全量下载成本，不承诺线上秒开。每次发布重写目录与分片；目录或分片缺失/损坏时读取基线失败，不写公开数据。

- 顶层：`version,notices,companies,sources,jobs`，可选`unitMemberships`为岗位ID→官网明确单位名称数组（当前仅阿里校园）。publisher从已核原生circleNames生成，不改17岗位字段/来源身份/采集钟；岗位消失则其映射一并移除，新内容缺归属的岗位保留旧映射。catalog保映射，阿里分片附`unitCounts`（各原生单位在该片的唯一岗位数，可重叠；无归属计入口兜底），查询加载与所选单位相关的全部必要片后才按岗位取并集，同ID不复制；普通旧分片保持原接口。目录来源独立于当前关键词结果。来源覆盖/数据缺失必须保留提示；初版遗留已退出，`legacy:false` 不意味着全部公司或来源已经接入。
- 公司：`name,initial,aliases`；来源：`key,company,status,lastSuccess,lastAttempt,message,coverage`。`ready`为有数据，`failed`为本次失败，`unverified`为尚未接入，`unavailable`为暂无数据；时间是资料实际采集时刻，旧材料按新政策恢复发布须公开说明，不冒本次新采集或拿恢复/发布时间补钟。
- 岗位：`id,sourceKey,company,title,category,city,channels,employment,talentPlan,date,dateKind,url,duty,requirements,description,jdComplete,sourceStatus`。旧 schema-1 记录可缺 category/sourceStatus，保留来源时不为它们补写字段。
- 新ID为“来源key＋官方ID”，同标题不合并。可用路径按官方ID处理重复，无法安全确定身份的记录不发布并记录；旧完整路径仍要求唯一身份。跨来源去重仍待验证，不以名字相同自动合并。
- 正文保留完整可得文字、职责及要求，不截 600 字。已证官网完整正文 `description` 可与独立 `duty/requirements` 并存：页面优先一次显示完整正文；任何未被全文字面包含的独立职责/要求也必须完整显示，不能因有description就隐藏旧列表文字，独立同文两栏不互相消重；计分/词频仍只匹配标题、职责（缺失回退完整正文）、要求，不另计第四字段，不用全文伪填独立栏。已核验的 Moka 列表HTML或必要详情经 `lib/jd-text.js` 去真实标签、解码实体、保留段落，仅按明确标题分职责/要求；不能判断则全文留 description，分段时 description 为空，不重复计正文。字节的description/requirement本来就是纯文本，保留内部空白及字面 `List<T>`/实体，不复用HTML剥离。`jdComplete` 表示可靠取得完整非占位正文，不限于单独详情API，不承诺招聘方描述详尽；未证实的来源仍为 false。
- 只承认明确事实，未知性质/人才计划保持 null。实习不因所在列表就一律算校招；属性未知在页面保守纳入，不误标官网事实。地点对象仅提供国家名时保留该国家名，不虚构城市；非法字段类型仍拒绝整来源。
- 阶跃星辰及v0.25 Moka来源的 `publishedAt` 已分别由第一方「发布日期」渲染器/正常DOM证明，对应 `dateKind:published`；本批813条有值、DeepSeek37列表缺值仍null，不回退 createdAt/openedAt/updatedAt。v0.26北森三固定profile的原生PostDate/Int已证明published并严格同日日历验证，共1,146已知日期，0001/0未知不回填；其他来源未核验日期语义时 `dateKind:null`，不排序为已知发布时间。抓取时间不是岗位日期。
- `sourceStatus` 为已核验列表/详情接口原状态码或 null；非 open 仅安全展示，不计分、不筛选、不当下架、不自动禁用官网链接。已观测的 pause 岗位仍在官网列表，实际可投未通过提交验证。
- 保留来源已明确的官网职能类别名 `category` 仅展示。当前接规范 `category`、Moka `zhineng`、飞书具名 `job_category`/已核验 `job_function`（只缺前者时回退）及已规范的 `jobFunction`；支持文字、具名对象及同层名称数组，去重后用 `/` 连接，不猜标题/部门。北森 `Category` 是渠道不映为职能；v0.26三固定profile已分别证明讯飞`ClassificationOne`职能（ClassTwo部门）、vivo`ClassificationTwo`职能（ClassOne项目），仅这三源按原生字段投影，其余未核验的同名字段不继承资格；缺失/只有内部编号时为空。兼容旧公开记录缺 category，不回补历史类别，不改变来源发布资格或启用未复验适配器。旧分数、档位、经验惩罚或个人方向参数仍不输出，整理不按职业/经验等删岗。
- 浏览器按当前匹配文字（标题、职责或正文回退、要求）逐词显示实际出现次数，字面、大小写不敏感、非重叠计数；类别不参与词频。次数不是计分倍率，也不是新增同分排序键，得分仍每词每字段一次。
- 仅用真实字段或已登记官方链接模板；非法协议禁用。不能把旧输出缺 JD、缺链接或缺日期改造成模拟内容。

范围、字段语义及成功资格只属于已核验注册入口，不代表全公司全球所有来源；字段如“正式”、劳务/顾问及渠道不能自动互推性质，原字段留在rawPost。当前统计和迁移结果见 [PROCESS.md](../PROCESS.md)，实际值以公开数据为准。

## 增加或复验来源

以 `sites.json` 为唯一注册表；同公司可有多个渠道来源，职能限制与官方渠道／性质／人才计划不是一回事，不能盲删 `Category` 或批次参数。

先针对当前公开官方协议写离线响应/分页/失败检查，确认独立来源身份、实际范围/安全链接及已取得正文，再加入安全入口的adapter dispatch与可用发布资格；范围或额外JD未完全核验时披露缺口，不以此阻塞可用资料。custom 模板见 `lib/custom/_template.js`，默认会报未实现，不会返回伪造空结果。不要把未知适配器的 raw 数量或退出码当作完整性证明。

```sh
node --test tests/*.test.cjs
git diff --check
```

检查使用临时目录、注入子进程/响应，不访问官网。阶跃星辰、字节校园、v0.24四公司八源及v0.25七Moka来源及v0.26北森三源、v0.27七阿里社招分别做真实采集/官网/同版本页面核对；字节社招只证明限定范围、全源仍未知，其余尚未核验来源可用性、鉴权过期、完整 JD 和真实全量性能仍需逐源实测，不用这些离线检查冒充在线验收。

## 重试与问题记录

- `lib/retry.js`：只对临时性错误重试——网络错误／超时、HTTP 5xx、408，每个请求最多再试2次（间隔1秒、3秒）；403／412／429 等其它 4xx、重定向、验证页一律不重试。`crawl.js` 启动适配器子进程时通过 `NODE_OPTIONS=--require=lib/retry-preload.js` 给全局 fetch 加上该重试，所有适配器自动生效；飞书的页面内请求单独套用同一函数。重试时子进程向 stderr 打印 `[retry] ...`，由 `crawl.js` 计数。
- 记录：采集失败，或成功但有重试／坏记录／total不符／详情没取全时，`crawl.js` 追加一行 JSON 到 `<outDir>/crawl-issues.jsonl`（`at,key,outcome,error|issues,retries`；`outcome` 为 ready-with-issues／failed／unverified），同时写入 `<key>_status.json` 的 `issues` 与 `message`。干净的成功不记录。该文件在被忽略的 `crawler/out/` 下，仅本机。
