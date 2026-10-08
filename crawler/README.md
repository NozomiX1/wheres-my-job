# 安得采集工具

原生 CommonJS / Node.js 22+，不调用 LLM/Agent。采集不应按求职者方向删岗，用户关键词排序只在浏览器完成。[现行规格](../SPEC.md) · [阶段结果与覆盖阻塞](../PROCESS.md)

## 唯一流程

```text
sites.json（唯一来源登记）
  → update.js 按注册表串行调用 crawl.js
  → 可发布快照（可用性与完整性分开）
  → publish.js 整理真实字段，完整替换／不完整增量合并
  → ../data/jobs.js 完整事实基线
  → 同publisher派生 ../data/catalog.js + ../data/parts/*.js
  → ../index.html + ../assets/data-loader.js + ../assets/app.js 按查询加载/匹配排序
```

```sh
node crawler/update.js stepfun stepfun_social # 仅明确授权的keys；部分失败返回非零
node crawler/crawl.js stepfun      # 仅采集，不发布
node crawler/publish.js stepfun    # 仅发布该来源已验证的新快照
node crawler/publish.js --reproject huawei # 明确来源的同钟投影修复；复验快照，不重采/伪造新成功时间
node crawler/publish.js --discard-legacy # 独立维护：按用户授权退出初版HTML遗留，不读/发布候选
node crawler/publish.js --rebuild-browser-data # 仅从完整公开基线重建浏览器分片，不采集、不改基线/采集钟
```

无参数的 `update.js` 遍历全部来源，`publish.js` 检查全部来源；日常操作明确keys，不以无参数全站执行代替检查。`run_daily.ps1` 是主入口的薄兼容包装，不另维护名单。没有 HTML 生成器、CSV 聚合、召回切批或个人评分入口。

`--discard-legacy`仅是已授权的初版维护操作，不能与source keys/failedKeys混用，不读候选；只退出精确初版身份及元数据，不按日期/JD空/未知属性删除已核官网岗位，不制造零快照或成功时刻，重复执行为无写入no-op。常规更新按现行SPEC先发布可用数据、披露缺口；完全失败或缺证零保已有可用版本，不回退初版。

批次结果、实际统计、初版退出及验收范围集中在 [PROCESS.md](../PROCESS.md)。下文只说明操作与技术契约；旧来源报告的保初版/未提交是历史，不覆盖现行规格。

## 采集与发布保护

工作文件全部在被 Git 忽略的 `out/`：

| 文件 | 职责 |
|---|---|
| `<key>_raw.json` | 当前候选；无可用结果时恢复旧文件，首次完全失败删除候选 |
| `<key>_snapshot.json` | 可发布快照，含采集时刻、来源覆盖、原证据及complete标志 |
| `<key>_status.json` | 最近尝试、采集时间、available／ready／失败状态及已知问题 |

- 子进程退出0不单独证明数据可用。计数须与实际唯一jobs一致，身份/安全链接/已取得字段通过程序基本检查；官方total另保在原生证据。`complete:true`为完整路径；`complete:false,verification.policy:'available'`为可用路径，允许单轮/重复页/total变化/缺详情，记录问题后发布，不冒全集或伪空。
- 可用路径当前接入美团社招、小米社招、华为校/社招、小红书校/社招及百度校/社招，不自动放行其它未接入入口。crawl/publisher复验正常HTTP/业务、登记scope与jobs/native绑定；按官方ID合并重复，无安全身份的记录跳过并记录，不因非关键metadata拒整源。`available`与`ready`分开展示；不完整增量保留未取得者和已有非空JD（独立职责/要求/全文分别保护），不能清旧或判下架。
- 美团生产CLI现为单轮列表＋能取得的详情，真实拒绝/请求错误即停止后续请求，但此前可用数据仍可发布；小米社招type1先收列表两栏、`jdComplete:false`并提示“已收录列表JD，详情正文完整性待核验”，保原城市顺序，不用换序当发布阻塞。原严格fetchAll/旧source合同用于兼容已有完整快照和离线回归，后续按来源逐步迁移，不为本次重写所有模块。
- 首次完整成功会读取刚写出的文件。显式成功且 `total:0,jobs:[]` 可替换此来源；未知结构、缺列表、错误空数组、提前空页或触顶不是有效空。
- 同一注册范围内可发布快照才可应用。完整路径替换，可用路径增量合并；完全失败、未接入适配器及元数据不匹配不能晋升。
- 已验证发布后如果接口／渠道／批次等范围改变，拒绝自动替换；需另行明确迁移策略，不能据此判原范围岗位下架。初版HTML未复验遗留已按授权退出，首次新快照正常应用，不把初版退出说成已核验下架。
- 部分来源可用时只应用这些来源，其他来源保留已有可用版本和真实采集时间；无该版本则暂无数据，不回退初版。整体命令仍返回非零。正常发布无已验证新快照、无 `out/` 或坏基线时不写公开文件；显式同源`--reproject <keys>`允许在scope与真实采集钟相同的已核快照上修复投影/说明，不回退较旧快照，也不把本地重投影冒新采集；显式独立 `--discard-legacy` 仅为初版维护例外，不是伪空快照资格，原 `index.html` 不受采集影响。
- 文件按临时文件＋rename 写入；同一来源不应同时执行多个更新。失败状态可随其他成功来源发布；如果全部没有有效更新，公开文件不变，失败详情暂看状态文件和命令输出。

`out/` 只是本机可复用快照，不是临时 Actions runner 的持久存储。以后接定时采集时还需落实成功快照持久化和 Pages 发布，不能把 Pages 自动部署当作采集定时器。

## 目前能被流水线验证的适配器

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

**阿里共享社招（custom中7来源）**：固定七既有key的`ali-social-portal-v1` profile，精确公司/中文社会入口/API/origin/body与模式，八known门户中Cloud仍不qualified；无效/相对/非string声明URI、改key删mode/换ATS亦不得退generic取得资格。三core用已正常Node证明的canonical bootstrap，四brands仅允许已证同origin/path去lang302；正常匿名cookie/CSRF只内存复用，Node原生UA，不伪浏览器指纹/TLS，不登录/申请或盲重试。所有主动请求串行间隔≥200ms、15s超时/15分钟子进程、200页安全触顶拒。

原生业务精确`success/errorCode/errorMsg/content`四keys和content精确`datas/totalCount/pageSize/currentPage`四keys，未知封套追加/缺字段/业务失败/早空/页长或metadata不匹配整源拒。完整两scan每页原request/httpStatus/response随raw与snapshot.verification穿透，在crawl/publisher独立复验（含真零及缺证零保护）。取足后越界空终点total0不用于早空归零；全native raw逐ID稳定且jobs绑定首扫，动态例外仅已证trackId和URL的具体track_id，先逐条核官方origin/path/ID/唯一query，其余URL/所有事实仍比较。列表已有全文不机械逐岗详情；职责/要求普通React TEXT独立，只CRLF规范和外trim，不解实体/HTML/压内部空白/消重或增description副本，合法空/null/符号诚实保留，缺字段/非法类型不享空值例外。原categories/workLocations数组全以`/`展示；社会入口只证social，性质/计划/原状态未知。modifyTime仅已证浏览器local更新，未证source唯一日界，raw时间保真/public date-dateKind null，不猜UTC8或publishTime、无新增schema。品牌连续性/跨产品范围与首次历史迁移公开提示，不改目录/标题筛窄/通义合源，不称集团全球全集或退出历史为下架。

**custom（44 来源登记）**：除上述阿里共享社招，第一批既有来源已接入五个独立官网协议模块：`meituan_portal`（社招；`meituan_campus_portal`共享其原生解析、按官网1＋2分类型枚举校园）、`ctrip_portal`、`mihoyo_portal`、`shlab_portal`（这三者各自校/社两key）、`xiaomi_portal`（校招完整路径＋社招可用路径）。固定profile只授已核协议/scope的执行入口，不授完整成功：fresh HTTP/原生业务、全部身份/字段/JD、双完整扫描及全raw绑定须通过crawl与publisher两边复验；失败不落partial候选，未证有效零先拒。未接入口及阿里云仍不继承同公司/同系统资格。旧custom请求/解密/个人方向备注不作当前证据，不能盲加complete或继续旧筛选链。

本批四协议正常匿名Node、串行至少200ms/15s超时，触顶拒整源；美团/米哈游必要详情采用40分钟有界子进程，携程/上海15分钟（非SLA）。美团六片、米哈游六片为实际TEXT renderer，完整正文一次显示，独立职责/要求原字段计分；其它真实正文不另造评分字段。携程原生requirements是完整HTML职位描述，复用已核HTML转换，fromId构官网详情链接，不机械重复列表已有全文。社招双语/组合标题的分栏语义未核验，先保完整正文、独立职责/要求留空，匹配使用全文回退；不按岗位ID猜分栏。上海使用原生has_more和推进游标双穷尽，无官方total；`countKind:cursor-exhaustion`标明derived唯一记录数，保公开分页cursor原值以重演request链（非会话凭证），两条已证requirement省略与非法null/未知JD严格区分；当前SSR只证普通TEXT/LF→BR，未证markup/字符引用正文形状整源拒绝，不盲剥HTML（普通amp/数值比较仍保真）。scope的origin/detailApi/headers亦绑定coverage；源级语义/原始字段证据见 [第一批核验记录](../docs/custom-first-batch-verification.md)，成功/失败及实际数量以数据/Git和PROCESS为准。旧字节custom仅是共享实现的兼容入口，不另发布。

`custom/huawei_portal.js`接入固定CR/SR默认广列表及详情/岗位意向；复用`huawei_http.js`的正常匿名transport（真实Referer、公开bootstrap CSRF仅内存可为空、原生UA、串行200ms/15s、拒绝后锁存停止）。按官网声明的末页停止，不为可用发布强求越界EOF。全部意向按原顺序保留真实标题/HTML正文及独立两栏；未取得者不造JD，额外正文完整性与日期/性质/人才计划仍未知。仅可用资格，不冒完整成功。显式`huawei_portal.js <siteJSON> <rawFile> --resume-details=<snapshot>`可复用同源已核列表续取正文，经正常crawl/publisher复验，记录未重采列表，默认更新不自动复用旧列表。

`custom/xiaohongshu_portal.js`接入官网页长10的默认社招与校园regular `campus_autumn_27`项目；校园不冒全校园/REDstar/Ace/独立实习范围。单轮继续重复页至空页或安全上限，按positionId去重并记录官方total/实际唯一数；正常Node无token/伪UA。原生duty/qualification按TEXT保全部空白/实体字面/同文，列表JD先可用，未核详情不能称确定缺段落；日期/性质/人才计划未知，公开接口状态不证明可投。原始成功页及停止请求留在verification，不因重复或覆盖缺口清旧。

`custom/baidu_portal.js`接入官网默认GRADUATE＋INTERN校园列表及SOCIAL社招列表，空关键词/项目、页长10，不沿用旧projectType1/排AIDU或职业筛选。正常Node原生UA，仅真实Referer及表单Content-Type，无Cookie/登录/签名；单轮串行200ms/15s、每类型200页/进程15分钟保护，按原生pages末页停，拒绝即停整个来源且不重试。保完整原生列表/请求证据，按postId去重并绑定取得类型；postId与jobId独立，官网详情链接用postId，原标题（城市前缀/岗位编号）及React TEXT两栏不改写。INTERN只证实习、渠道不推校园；其它性质/计划/日期/状态未知，列表JD先可用、详情正文完整性待核验，不冒全集/ready。失败或无可用记录不能清旧，旧百度脚本不再进入生产链。

第二批8个既有key接入五个独立可用模块：`alibaba_portal`、`baichuan_portal`、`bilibili_portal`（校/社）、`ant_portal`（校/社）、`kuaishou_portal`（校/社）。精确冻结各source profile，不能删adapter/改key、公司、URI或body降级generic；只授`complete:false,verification.policy:available`，不继承同ATS或另一source的成功资格。串行请求开始间隔≥200ms、完整读取后再下一请求、15s单请求/15分钟来源预算、最多200页，真实拒绝停止无自动retry；同scope不完整更新保旧岗位及逐栏非空JD。匿名CSRF/Cookie只在内存，不伪UA/签名/ctoken/HMAC，不为列表JD机械追加详情。

阿里校园取已核三个批次（应届＋日常/研究实习，阿里星不额外重复采）；B站不填可选type，两栏未知的HTML职位描述保单字段全文；蚂蚁用当前广列表空招聘类型/批次，无自造ctoken；快手校园取27届应届＋留用实习两个已核项目、原生字典及数字id详情路由。阿里/百川/蚂蚁/快手按第一方TEXT renderer保全部原字符，不沿旧职业/项目排除。百川及快手社招在用户另行授权后已通过正常官网原生翻页继续取得数据；生产CLI直接选择`lib/native-ui.js`隔离Chrome传输，不先发unsigned Node请求再自动换浏览器重试。只观察官网自身请求和点击原生下一页，复用已有CDP类，不注入SDK/生成签名/修改UA或复制会话；Cookie等敏感头只留内存，证据仅保必要公开头/成功岗位响应，百川URL只去除敏感signature，保实际动态分页Referer并严格绑定空筛选/页码。官网首页/字典自动流量可能并发；后续逐页点击≥200ms、正文队列无重叠，15s响应/900s来源/200页保护，拒绝停止、此前可用页保留。

快手官网自动补`workLocationCode=domestic`，新可用证据固定version3/`native-ui-default-domestic`，保实际参数，不冒无城市列表或海外等价；登记目标scope不变，明确局部已取得范围、不完整增量保旧。旧version2无城市资料仍可独立复验；校园Node路径不变。百川及快手社招旧unsigned路径仅供显式注入fetchImpl回归，历史405/code:-1的单一根因仍未证明。快手日常实习另入口未核，性质不推全职。真实数量/资料钟及本轮材料复用发布见[第二批核验](../docs/custom-second-batch-verification.md)§6，不把发布时刻冒采集完成钟。

美团详情已证 `otherInfo:"暂无"`与精确空字符串 `""`仅作为原生占位/空值保存，不添JD；其它非空值（含空格字符串）仍拒，列表仍须null，双轮完整raw稳定要求不变。

美团校园新profile为官网默认1＋2、空subCode/其它筛选，不再旧2027/排LongCat/北斗。正常原生API已证pageSize=1000可返回571完整唯一岗位及原total/pageTotal；仅改变分页粒度，不改变范围。仍严格分页直至typed-null EOF，不把1000当总数上限；未来超过1000或跨页再漂移仍拒，不自动调大或重扫求绿。官网并列多选机制下，两轮分别完整枚举1应届、2实习，原生jobType逐条绑定分区、跨区身份唯一；每区total/满页/typed-null EOF/全部必要详情，两轮全部raw稳定。默认1＋2前后总数须等完整唯一union，默认首屏原生每岗亦绑定union；不据7页样本或简单194＋377求资格，任一不等/漂移/早短/必要详情失败拒整源。校园详情已证列表空项目/部门须补原生项目ID/名称及全部部门，保持完整raw；4697281262的列表与详情cityList同null、官网隐藏城市栏为合法未知，不生成工作城市标题或猜城市；不推断计划/日期/职能。官网按jobSpecialCode的已证两栏＋工作城市或六片renderer保原标题/同文/顺序，city不充jdComplete；原类型2实习，类型1性质未知。校园资格独立于社会，仍经唯一crawl→snapshot→publisher→data链。

`custom/xiaomi_portal.js`的原完整路径保持已核HR `type=2`校招无筛选全集（含campus/futurestar/toptalent/newretailing链接），不沿用旧“2027届/排顶尖”过滤；社会/type=3/4不继承资格。正常匿名Node原生UA、200ms/15s、200页保护/40分钟有界子进程，双完整列表逐页原生total/页长、三独立身份、越界空EOF及全部13字段稳定；每轮全部必要详情以正常匿名GET、官网真实公开website-path/中文语言/Referer取得（无注入签名/SDK；缺website-path会静默丢课题字段，不能只看code0），身份/两栏与列表绑定、完整raw双稳，证据穿透crawl/publisher复验，未证有效零拒绝。官网React TEXT的description/requirement保全部空白/实体字面/同文重复；详情已证额外“课题名称及内容”按真实标题/顺序补入完整description，不添第四评分字段，未知额外JD拒整源。列表没有该额外字段，不能当完整JD；初版列表-only候选撤销，非旧成功保留。聚合接口未提供的职能/性质/计划/状态及日期保持未知，校园城市原数组顺序仍严格比较。首次完整通过且本地页面验收后才发布。

部分 custom 需要 Chrome/CDP，历史路径偏 Windows、`CHROME_PATH` 支持也尚不统一。不要假定这轮整理已经解决各来源运行环境。

## 发布数据契约

`../data/jobs.js`仍为完整canonical静态脚本：`globalThis.ANDE_DATA = <JSON>;`，用于程序读取/更新保旧，不再是首页阻塞脚本。浏览器同HTTP/file可用，不动态请求招聘官网。

同一publisher按真实company/sourceKey和约1MiB切分完整岗位为hash命名的`data/parts/*.js`，单个超长JD不截断；分片不代表查询或岗位上限。`catalog.js`复用全部来源/公司/notice元数据，jobs为空、parts含id/file/sourceKey/company/count/bytes，首屏目录数量从parts统计，不把尚未下载当零岗位。先写所有分片再替换catalog，旧hash文件保留供缓存/已打开页面，不自动清旧。

查询时按所选显示单位加载完整所需分片，未选单位仍需全部；顺序加载、缓存/inflight去重、30秒单分片超时，无自动retry。全部完成才提交冻结条件/更新结果；失败保旧，用户再次查询才重试，重置/后发查询使旧请求结果失效。所有原17字段/JD保真，未知已选单位不静默变全部。全站查询仍有全量下载成本，不承诺线上秒开。正常publisher有新可用数据时一并派生；仅改传输实现用显式rebuild维护，缺/坏canonical拒绝且不能拿catalog作更新基线。

- 顶层：`version,legacy,notices,companies,sources,jobs`，可选`unitMemberships`为岗位ID→官网明确单位名称数组（当前仅阿里校园）。publisher从已核原生circleNames生成，不改17岗位字段/来源身份/采集钟；不完整更新保留未取得岗位及缺新归属者的已有映射。catalog保映射，阿里分片附`unitCounts`（各原生单位在该片的唯一岗位数，可重叠；无归属计入口兜底），查询加载与所选单位相关的全部必要片后才按岗位取并集，同ID不复制；普通旧分片保持原接口。目录来源独立于当前关键词结果。来源覆盖/数据缺失必须保留提示；初版遗留已退出，`legacy:false` 不意味着全部公司或来源已经接入。
- 公司：`name,initial,aliases`；来源：`key,company,status,lastSuccess,lastAttempt,message,coverage`。`available`代表可用但完整性待补，`ready`代表原完整核验版本；时间是资料实际采集时刻，旧材料按新政策恢复发布须公开说明，不冒本次新采集或拿恢复/发布时间补钟。
- 岗位：`id,sourceKey,company,title,category,city,channels,employment,talentPlan,date,dateKind,url,duty,requirements,description,jdComplete,sourceStatus`。旧 schema-1 记录可缺 category/sourceStatus，保留来源时不为它们补写字段。
- 新ID为“来源key＋官方ID”，同标题不合并。可用路径按官方ID处理重复，无法安全确定身份的记录不发布并记录；旧完整路径仍要求唯一身份。跨来源去重仍待验证，不以名字相同自动合并。
- 正文保留完整可得文字、职责及要求，不截 600 字。已证官网完整正文 `description` 可与独立 `duty/requirements` 并存：页面优先一次显示完整正文，否则显示独立两栏；计分/词频仍只匹配标题、职责（缺失回退完整正文）、要求，不另计第四字段，不用全文伪填独立栏。已核验的 Moka 列表HTML或必要详情经 `lib/jd-text.js` 去真实标签、解码实体、保留段落，仅按明确标题分职责/要求；不能判断则全文留 description，分段时 description 为空，不重复计正文。字节的description/requirement本来就是纯文本，保留内部空白及字面 `List<T>`/实体，不复用HTML剥离。`jdComplete` 表示可靠取得完整非占位正文，不限于单独详情API，不承诺招聘方描述详尽；未证实的来源仍为 false。
- 只承认明确事实，未知性质/人才计划保持 null。实习不因所在列表就一律算校招；属性未知在页面保守纳入，不误标官网事实。地点对象仅提供国家名时保留该国家名，不虚构城市；非法字段类型仍拒绝整来源。
- 阶跃星辰及v0.25 Moka来源的 `publishedAt` 已分别由第一方「发布日期」渲染器/正常DOM证明，对应 `dateKind:published`；本批813条有值、DeepSeek37列表缺值仍null，不回退 createdAt/openedAt/updatedAt。v0.26北森三固定profile的原生PostDate/Int已证明published并严格同日日历验证，共1,146已知日期，0001/0未知不回填；其他来源未核验日期语义时 `dateKind:null`，不排序为已知发布时间。抓取时间不是岗位日期。
- `sourceStatus` 为已核验列表/详情接口原状态码或 null；非 open 仅安全展示，不计分、不筛选、不当下架、不自动禁用官网链接。已观测的 pause 岗位仍在官网列表，实际可投未通过提交验证。
- 保留来源已明确的官网职能类别名 `category` 仅展示。当前接规范 `category`、Moka `zhineng`、飞书具名 `job_category`/已核验 `job_function`（只缺前者时回退）及已规范的 `jobFunction`；支持文字、具名对象及同层名称数组，去重后用 `/` 连接，不猜标题/部门。北森 `Category` 是渠道不映为职能；v0.26三固定profile已分别证明讯飞`ClassificationOne`职能（ClassTwo部门）、vivo`ClassificationTwo`职能（ClassOne项目），仅这三源按原生字段投影，其余未核验的同名字段不继承资格；缺失/只有内部编号时为空。兼容旧公开记录缺 category，不回补历史类别，不改变来源发布资格或启用未复验适配器。旧分数、档位、经验惩罚或个人方向参数仍不输出，整理不按职业/经验等删岗。
- 浏览器按当前匹配文字（标题、职责或正文回退、要求）逐词显示实际出现次数，字面、大小写不敏感、非重叠计数；类别不参与词频。次数不是计分倍率，也不是新增同分排序键，得分仍每词每字段一次。
- 仅用真实字段或已登记官方链接模板；非法协议禁用。不能把旧输出缺 JD、缺链接或缺日期改造成模拟内容。

范围、字段语义及成功资格只属于已核验注册入口，不代表全公司全球所有来源；字段如“正式”、劳务/顾问及渠道不能自动互推性质，原字段留在rawPost。当前统计和迁移结果见 [PROCESS.md](../PROCESS.md)，实际值以公开数据为准。

## 增加或复验来源

以 `sites.json` 为唯一注册表；同公司可有多个渠道来源，职能限制与官方渠道／性质／人才计划不是一回事，不能盲删 `Category` 或批次参数。

先针对公开官方 API 写离线响应/分页/失败检查，确认完整范围和详情正文，再加入安全入口的 adapter dispatch 与发布资格。custom 模板见 `lib/custom/_template.js`，默认会报未实现，不会返回伪造空结果。不要把未知适配器的 raw 数量或退出码当作完整性证明。

```sh
node --test tests/*.test.cjs
git diff --check
```

检查使用临时目录、注入子进程/响应，不访问官网。阶跃星辰、字节校园、v0.24四公司八源及v0.25七Moka来源及v0.26北森三源、v0.27七阿里社招分别做真实采集/官网/同版本页面核对；字节社招只证明限定范围、全源仍未知，其余尚未核验来源可用性、鉴权过期、完整 JD 和真实全量性能仍需逐源实测，不用这些离线检查冒充在线验收。
