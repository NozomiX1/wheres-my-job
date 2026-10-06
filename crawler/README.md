# 安得采集工具

原生 CommonJS / Node.js 22+，不调用 LLM/Agent。采集不应按求职者方向删岗，用户关键词排序只在浏览器完成。[产品与当前数据限制](../README.md) · [需求](../SPEC.md)

## 唯一流程

```text
sites.json（39 公司、66 来源：30 校招来源／36 社招来源）
  → update.js 按注册表串行调用 crawl.js
  → 已验证完整成功快照
  → publish.js 整理真实字段、按来源替换数据
  → ../data/jobs.js
  → ../index.html + ../assets/app.js 用户查询时匹配排序
```

```sh
node crawler/update.js             # 所有注册来源；部分失败返回非零
node crawler/update.js stepfun     # 指定 key；可给多个
node crawler/crawl.js stepfun      # 仅采集，不发布
node crawler/publish.js stepfun    # 仅发布该来源已验证的新快照
node crawler/publish.js --discard-legacy # 独立维护：按用户授权退出初版HTML遗留，不读/发布候选
```

无参数的 `publish.js` 检查全部来源。`run_daily.ps1` 是主入口的薄兼容包装，不另维护名单。没有 HTML 生成器、CSV 聚合、召回切批或个人评分入口。

v0.29已按用户明确授权，用唯一publisher的独立 `--discard-legacy` 维护操作清掉初版HTML的6,530条遗留，公开仅23,979条已验证新数据；39公司66来源/out89保留，29成功源岗位事实/metadata/真实成功钟全部不变，37初版来源暂无新快照（含原零岗位两源），不冒官网零或下架。选项不可与source keys/failedKeys混用，不读取候选；只删初版 `legacy-来源key-原序号` 身份，不按日期/JD空/状态或未知属性删官网新岗位，重复执行是无写入no-op。后续正常完整成功直接替换，同scope护栏不变；失败保上次已验证新版本，没有该版本则暂不可用，绝不回退初版。232离线、独立37/37、实际root HTTP/file189/0及父全部3原图/38材料SHA-纳秒mtime/26查询-偏好digest/每协议2真实row-modal/六端口清理通过，不冒全部23,979逐岗全文或手机实机。未重采/全站更新/提交/推送/部署。

以下是各批次当时的验收记录，“保旧初版”已由v0.29政策取代。整理阶段的保护检查为离线验证。此后已真实接入阶跃星辰 `stepfun`（94905 校招入口 128 条）与 `stepfun_social`（94904 社招入口 231 条），逐岗取详情并经全文/字段/浏览器检查后仅发布这两个来源到本地页面。原 141903 的 20 条完全包含于新校招范围，不重复收录；v0.18发布当时其他13,340条岗位及来源状态保持原样。详见[核验记录](../docs/stepfun-verification.md)。v0.18历史成功不赋予其他来源资格；v0.25七个Moka来源已另独立核验，见下文。v0.26北森三源及v0.27七个阿里社招入口已独立在线复验及本地发布，其余未核官网（含阿里云完整性）仍不得自动放行；未部署或配置定时任务。

字节校招完成两轮各150页、7,492个唯一ID及完整职责/要求核验。v0.23按用户明确授权，采用既有两轮核验的11,093个已分类社招候选，迁移为官网九类/75分类ID的限定登记范围，替换该来源3,849历史并本地发布；其余16,131条、其它来源元数据与目录精确不变。全社招未分类/旧类别/树外仍未知，范围迁移不等于官网下架；没有伪称本次采用重新发了HTTP或用采用时刻代替原采集时刻。详见[字节核验记录](../docs/bytedance-verification.md)。

v0.24按同协议批次只采集并本地发布MiniMax/商汤/莉莉丝/叠纸八source，正常门户portal6、无个人条件、每门户严格双全扫；共1,098替换316条历史，其余26,908及来源元数据/目录不变。莉莉丝既有校园key联合campus+intern，社会key联合career+index活水平台，按同租户同postingID及身份/原JD事实一致合并54条，保留index-only。5个官网无正文保留false，其他1,093可读，scope/非下架说明常驻，不说公司全球全集。详见[八来源核验记录](../docs/feishu-batch-verification.md)。未全站更新/提交/部署。

v0.25同Moka协议七个既有来源（含确认后的鹰角校/社）已完整采集和本地发布：月之暗面93/106、智谱23/135、DeepSeek37、鹰角103/353，共850替换237历史，其他27,769与元数据/目录精确不变。845可读/5官网空正文，813发布日期/37未知、性质40未知、pause22保留；不按职业/标题删岗或扩大公司全集。166离线及同版本真实HTTP/file397/0通过，详见[Moka批次记录](../docs/moka-batch-verification.md)。未全站更新/提交/部署，阶跃/飞书不重采或发布。

v0.26北森三既有来源按共享协议正常采集/本地发布：讯飞非社会六频道联合166/社会727、vivo校园广全项目253，共1,146替换370历史，其他28,249及已成功19来源20,892事实/metadata/57out不动。1,146原JD/发布日期有第一方证据，含一条两栏仅`1`诚实保留；vivo社会5历史另套协议不收编。195离线/独立35+11闭合/同版本HTTP/file705/0及父三图/hash/清理通过，公开29,395。详见[北森批次](../docs/beisen-batch-verification.md)，实际仓库根HTTP/file另68/0小烟测与父三图/当前hash-mtime/实际清理通过，仅每协议3JD及自然50→100。未全站更新/提交/部署。

v0.27阿里共享社招八既有key分别取证，七个中文无个人条件广入口正常串行两扫588/475/219/246/63/99/251共1,941（原真实完成2026-10-05T18:07:43.762Z—18:09:30.683Z），替827历史，本地公开30,509，其它28,568/旧22成功22,038/metadata及66保护out不变；阿里云原生total677早空及page metadata矛盾，保175历史，不采500/677或热门城市partial；校园296保护。225离线/独立1,610反例闭合/同版本HTTP-file963/0恢复交付和父图/hash-纳秒mtime/清理通过，唯一publisher仅七keys替换，实际root另143/0小烟测与父全部3图/78材料/106库存/真实清理通过（每协议仅3独立native JD及自然50→100，不冒第二次全1,941）。原研究不晋升、真实成功钟不以烟测/发布时刻代替。详见[阿里批次记录](../docs/ali-social-batch-verification.md)。本批未全站更新/提交/推送/部署；此前至v0.26结果已有本地提交aefb250。

[v0.20的66来源覆盖审计](../docs/source-coverage-audit.md)已完成：当时7可复用、58需改造、1建议局部重写；逐源记录实际条件、分页/失败、正文和身份。它保留历史版本，静态风险不冒充官网证明，当前改造及状态以独立核验记录为准。

## 采集与发布保护

工作文件全部在被 Git 忽略的 `out/`：

| 文件 | 职责 |
|---|---|
| `<key>_raw.json` | 当前候选；失败或未证实完整时恢复旧文件，首次失败删除候选 |
| `<key>_snapshot.json` | 完整成功后才晋升的 raw 快照，含完成时刻和来源覆盖标识 |
| `<key>_status.json` | 最近尝试、上次成功、失败／未验证／ready 状态及原因 |

- 子进程退出 0 **不等于成功**。必须写出新的 `{complete:true,total:N,jobs:[...]}`，计数一致，每条身份和字段合法；不复用旧 raw 来“证明”新成功。
- 首次完整成功会读取刚写出的文件。显式成功且 `total:0,jobs:[]` 可替换此来源；未知结构、缺列表、错误空数组、提前空页或触顶不是有效空。
- 同一注册范围内的新成功快照才可替换旧来源。未发布的旧成功、最新失败、未验证适配器及元数据不匹配不能晋升。
- 已验证发布后如果接口／渠道／批次等范围改变，拒绝自动替换；需另行明确迁移策略，不能据此判原范围岗位下架。初版HTML未复验遗留已按授权退出，首次新快照正常应用，不把初版退出说成已核验下架。
- 部分成功时只替换成功来源，其他来源仅保留上次已验证的新版本和真实成功时间；无该版本则暂无数据，不回退初版。整体命令仍返回非零。正常发布无已验证新快照、无 `out/` 或坏基线时不写公开文件；显式独立 `--discard-legacy` 仅为初版维护例外，不是伪空快照资格，原 `index.html` 不受采集影响。
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

**custom（44 来源）**：上述七个阿里社招为独立固定资格，其余37仍unverified、主入口不执行/不替换公开岗位，阿里云也不继承同协议成功。未核者保留旧站点请求/解密基础，仍可能有限定方向/届次/计划及混合字段，不能盲加complete。旧字节custom文件仅是调用新共享实现的薄兼容入口，单独生成的raw仍须走crawl快照/publish护栏，不是第二套发布。

部分 custom 需要 Chrome/CDP，历史路径偏 Windows、`CHROME_PATH` 支持也尚不统一。不要假定这轮整理已经解决各来源运行环境。

## 发布数据契约

`../data/jobs.js` 为静态脚本：`globalThis.ANDE_DATA = <JSON>;`，文件及 Pages 直接可用，不做动态招聘请求。

- 顶层：`version,legacy,notices,companies,sources,jobs`；目录来源独立于当前关键词结果。来源覆盖/数据缺失必须保留提示；初版遗留已退出，`legacy:false` 不意味着全部公司或来源已经接入。
- 公司：`name,initial,aliases`；来源：`key,company,status,lastSuccess,lastAttempt,message,coverage`。成功时间是实际完成时刻，未知用 null，不拿旧页面展示日期补齐。
- 岗位：`id,sourceKey,company,title,category,city,channels,employment,talentPlan,date,dateKind,url,duty,requirements,description,jdComplete,sourceStatus`。旧 schema-1 记录可缺 category/sourceStatus，保留来源时不为它们补写字段。
- 新 ID 为“来源 key＋官方 ID”；同标题不合并，无 ID 或重复官方 ID 拒绝整个来源，不静默跳过。跨来源去重仍待验证，不以名字相同自动合并。
- 正文保留完整可得文字、职责及要求，不截 600 字。已核验的 Moka 列表HTML或必要详情经 `lib/jd-text.js` 去真实标签、解码实体、保留段落，仅按明确标题分职责/要求；不能判断则全文留 description，分段时 description 为空，不重复计正文。字节的description/requirement本来就是纯文本，保留内部空白及字面 `List<T>`/实体，不复用HTML剥离。`jdComplete` 表示可靠取得完整非占位正文，不限于单独详情API，不承诺招聘方描述详尽；未证实的来源仍为 false。
- 只承认明确事实，未知性质/人才计划保持 null。实习不因所在列表就一律算校招；属性未知在页面保守纳入，不误标官网事实。地点对象仅提供国家名时保留该国家名，不虚构城市；非法字段类型仍拒绝整来源。
- 阶跃星辰及v0.25 Moka来源的 `publishedAt` 已分别由第一方「发布日期」渲染器/正常DOM证明，对应 `dateKind:published`；本批813条有值、DeepSeek37列表缺值仍null，不回退 createdAt/openedAt/updatedAt。v0.26北森三固定profile的原生PostDate/Int已证明published并严格同日日历验证，共1,146已知日期，0001/0未知不回填；其他来源未核验日期语义时 `dateKind:null`，不排序为已知发布时间。抓取时间不是岗位日期。
- `sourceStatus` 为已核验列表/详情接口原状态码或 null；非 open 仅安全展示，不计分、不筛选、不当下架、不自动禁用官网链接。已观测的 pause 岗位仍在官网列表，实际可投未通过提交验证。
- 保留来源已明确的官网职能类别名 `category` 仅展示。当前接规范 `category`、Moka `zhineng`、飞书具名 `job_category`/已核验 `job_function`（只缺前者时回退）及已规范的 `jobFunction`；支持文字、具名对象及同层名称数组，去重后用 `/` 连接，不猜标题/部门。北森 `Category` 是渠道不映为职能；v0.26三固定profile已分别证明讯飞`ClassificationOne`职能（ClassTwo部门）、vivo`ClassificationTwo`职能（ClassOne项目），仅这三源按原生字段投影，其余未核验的同名字段不继承资格；缺失/只有内部编号时为空。兼容旧公开记录缺 category，不回补历史类别，不改变来源发布资格或启用未复验适配器。旧分数、档位、经验惩罚或个人方向参数仍不输出，整理不按职业/经验等删岗。
- 浏览器按当前匹配文字（标题、职责或正文回退、要求）逐词显示实际出现次数，字面、大小写不敏感、非重叠计数；类别不参与词频。次数不是计分倍率，也不是新增同分排序键，得分仍每词每字段一次。
- 仅用真实字段或已登记官方链接模板；非法协议禁用。不能把旧输出缺 JD、缺链接或缺日期改造成模拟内容。

v0.27当时公开文件 **30,509条**（v0.29已清理初版6,530，当前为23,979）：字节校7,492＋限定社11,093＋阶跃星辰359＋v0.24四公司八源1,098＋v0.25七Moka源850＋v0.26北森三源1,146＋v0.27七阿里社招源1,941＋其余6,530历史记录。v0.27仅七source历史827迁移、其它28,568及22旧成功22,038事实/metadata/真实时刻精确不动，Cloud175/阿里校园296仍历史未知。v0.26仅三源历史370退出、其他28,249及19旧成功20,892不动；v0.25仅七源历史237退出、其他27,769不动；v0.24当时仅八源历史316退出、其他26,908不动；字节社旧3,849已于v0.23按授权淘汰。字节校已知实习5,160、“正式”2,332；社原性质11,090正式＋3劳务/顾问，未核验全职/实习语义不硬映射。校/社渠道按真实父类别，date/dateKind及人才计划事实仍未知，原字段存rawPost。不回补未知或按标题删除，不把历史首次迁移少见的记录叫已核验下架。仅当前这些注册入口通过，不代表全公司全球所有来源。

## 增加或复验来源

以 `sites.json` 为唯一注册表；同公司可有多个渠道来源，职能限制与官方渠道／性质／人才计划不是一回事，不能盲删 `Category` 或批次参数。

先针对公开官方 API 写离线响应/分页/失败检查，确认完整范围和详情正文，再加入安全入口的 adapter dispatch 与发布资格。custom 模板见 `lib/custom/_template.js`，默认会报未实现，不会返回伪造空结果。不要把未知适配器的 raw 数量或退出码当作完整性证明。

```sh
node tests/pipeline.test.cjs
node tests/feishu.test.cjs
node tests/feishu-classified.test.cjs
node tests/feishu-portals.test.cjs
node tests/app.test.cjs
node tests/moka-details.test.cjs
node tests/moka-list-jd.test.cjs
node tests/beisen.test.cjs
node tests/beisen-portals.test.cjs
node tests/beisen-evidence.test.cjs
node tests/ali-social.test.cjs
node tests/ali-social-evidence.test.cjs
node tests/initial-legacy.test.cjs
node tests/jd-text.test.cjs
```

检查使用临时目录、注入子进程/响应，不访问官网。阶跃星辰、字节校园、v0.24四公司八源及v0.25七Moka来源及v0.26北森三源、v0.27七阿里社招分别做真实采集/官网/同版本页面核对；字节社招只证明限定范围、全源仍未知，其余尚未核验来源可用性、鉴权过期、完整 JD 和真实全量性能仍需逐源实测，不用这些离线检查冒充在线验收。
