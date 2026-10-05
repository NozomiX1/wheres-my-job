# 飞书招聘同协议八来源 · v0.24

状态：**八来源完整实采、147离线＋原生UI及同版本冻结HTTP/file 282/0通过，已唯一writer本地发布28,006条；未提交或部署。** 2026-10-05，先同步SPEC，按 MiniMax、商汤、莉莉丝、叠纸游戏四家公司校社八个既有key执行，没有新增/删除key或全站更新。不是股权意义上的「字节系」。

## 1. 来源与实采

| 公司 | 校园来源 | 社会来源 | 本轮来源记录 |
|---|---:|---:|---:|
| MiniMax | `minimax` 100 | `minimax_social` 197 | 297 |
| 商汤 | `sensetime` 151 | `sensetime_social` 86 | 237 |
| 莉莉丝 | `lilith` 82 | `lilith_social` 114 | 196 |
| 叠纸游戏 | `papegames` 40 | `papegames_social` 328 | 368 |
| **合计** | **373** | **725** | **1,098** |

真实生产 `runCrawl` 串行采集八来源，**2026-10-05T09:11:18.769Z—09:12:30.582Z**（北京时间17:11—17:12），全批71.813秒；仅调用采集/成功快照，不生产publish/update。每个来源/门户两次完整扫描，官网明确总数稳定、精确完整页长、唯一字符串posting ID以及全部raw/canonical字段一致；不拿样本、长度、退出0当证明，不把职业分类并集当公司全集。

八个已审查的SaaS门户都使用 `portal_type:6`，由各自website-path区分，所有个人关键词/职业/地点/项目/招聘性质/标签条件为空；字节3/2参数不套用。共享一个客户端，精确固定来源/公司/URL/门户集合，任何未知来源或范围改变不自动放行。普通匿名隔离Chrome **154.0.8037.98** 的同源原生XHR复用官网已有会话/正常客户端；不外注SDK、不手工/逆向签名、不改指纹或TLS、不登录/投递/验证码。所有启动列表响应HTTP/body/业务成功完成后才主动扫描，任何拒绝、失败、短/空页或漂移都失败保基线；finally退出和移除profile。

第一方小样本原始范围/独立详情/renderer/字段证据见 [MiniMax](minimax-verification.md)、[商汤](sensetime-verification.md)、[莉莉丝](lilith-verification.md)、[叠纸](papegames-verification.md)。它们各初核章节是当时历史，不能替代本节后续全采。

## 2. 莉莉丝实际入口迁移与精确去重

初核发现原登记社会入口`index`是「活水平台」，官网正常社会导航为`career`；校园`campus`之外另有公开独立`intern`。先更新SPEC，再隔离正常四门户各完整双扫取关系，生产按同样声明范围重采：

- 校园18＋实习64，posting ID**无交集**，现有`lilith` key登记 `portalPaths:["campus","intern"]`，共82。
- 当前社招career113、旧活水index55，同租户同posting ID**交集54**，标题、原始职责/要求、城市、渠道/性质等身份事实一致；index另有 **`7632158946904099113`**，不能仅改career而静默丢岗。`lilith_social` key登记 `["career","index"]` 联合范围，共114。
- 54个共享posting只收一条、优先career官网URL；index-only仍链接真实index。每岗snapshot保留primary `portalPath` 和每门户 `portalPosts.rawPost`，发布器逐一重算并核查，不按同标题或未经证明的底层job_id合并。
- 同岗位在index的job_category与career的job_function属于不同官网显示投影；不合成新类别、不当冲突JD，完整原字段分别保留。冲突身份/JD或第二门户失败拒绝整源，不将成功第一门户单独发布。
- 校园/实习与社招/活水是明确登记公开门户联合范围，**不宣称公司全球所有网站/后台全集**。范围说明和首次历史退出非下架须随公开source.message/notices保留；这不是沿用字节社招分类部分采集规则，也未新增注册来源。

`intern`64并不都等于实习：实际63「实习」＋1「正式」，按逐岗字段保留后者性质未知。不能根据入口名称/标题强制类型。四公司各自校社两来源的官方posting ID交集均0；仅说明本轮取得集合，底层job_id/跨公司一般身份关系未全核，不恢复同标题去重。

## 3. 正文与语义

- 列表已有独立职责/要求原生纯文本，完整保留换行/作品集/英文/`List<T>`字面内容，不截600字/强行HTML剥离或实体解码，不复制全文重复匹配。独立详情样本与列表/完整DOM核对通过；未知自定义正文、非重复nested JD或同时具名但不同的两类字段拒来源，须重新核验。
- **1,093份可读已取得JD，5条官网无正文**（商汤校园4＋社招1），全部保留。额外正常详情核查5岗的列表null、详情省略空字段、DOM两段均「--」，`jdComplete:false` 不补造/不删岗。第1次探针误将详情省略字段与列表null做strictEqual而失败；保存早期材料后仅修该null投影比较，不放宽生产列表必须own id/title/description/requirement或两个列表全字段一致门禁。
- 单独职责空5、要求空16均是保留的官网事实；传输完整不等于雇主填写详尽，其他有可读职责的缺要求岗位仍保留全文。
- 招聘属性合计 **261实习＋665明确全职＋172性质未知**；逐岗parent提供373校园/725社招。「正式」或劳务/顾问不猜全职，社招301实习不写死202、不删。
- 职业类别只来自具名 `job_category`（MiniMax/商汤/index）或 `job_function`（莉莉丝campus/intern/career、叠纸）；缺分类不猜标题、不筛选、不计分、不建立统一分类。
- 日期/日期种类及未单独核准的每岗人才计划仍null，原`publish_time/job_subject`保留raw。不能把项目、原标题/宣传、创建/修改时间或采集时间强作可靠日期/人才事实，未知不写false。
- 官网按钮/`channel_online_status`不证明实际接受投递，未申请。暂停/占位不按原码或短正文删除。

## 4. 安全链与隔离验收

复用唯一 `crawl → 完整成功snapshot → publish`；新增仅共享客户端、八条登记、union溯源验证/coverage和原生离线测试，没有框架/运行依赖、八套独立实现、个人职业过滤或UI/评分改造。

- 第一轮新增测试红灯4/5，补门禁/具名job_function后绿；扩八profile、初始多响应失败、联合scope/同ID冲突/alias篡改/第二门户失败/自定义正文等后 **147项离线＋原生UI检查通过**。
- 独立只读复核初版提出index错误scope、多初始响应业务缺口两项；已先同步SPEC、完整关系核验/联合范围及所有启动响应校验修复，复核run2无剩余实质阻塞。历史问题与修复见 `/tmp/ande-feishu-batch-review.md`。
- 父重算1,098全部候选/raw/snapshot/source状态与范围/完成时间，并复验字节/阶跃全部18,944岗位规范化事实与已发布逐项相等；四前端/公开data、四已发布source注册/12份out基线hash/mtime不变，其他58登记和key顺序/39公司/66来源不变。
- 冻结目录 `/var/folders/4q/mhw4nbld15b61smdckdz57wh0000gn/T/ande-feishu-batch-stage-Hba00Z` 用同一个publisher生成候选 **28,006条**；替换八来源历史316，其他26,908及元数据/公司目录精确不变。冻结验收时正式data仍27,224；验收通过后才发布本批，结果见第5节。

本机证据：

- `/tmp/ande-feishu-batch-baseline.json`及独立备份；
- `/tmp/ande-feishu-batch-crawl.{cjs,json,log}`：明确八key串行生产候选，没有publisher；
- `crawler/out/<八key>_{raw,snapshot,status}.json`：Git忽略、仅本机，不是云端持久存储；
- `/tmp/ande-feishu-batch-candidate-check.json`：逐岗重算、字段统计/身份/受保护基线；
- `/tmp/ande-feishu-batch-stage-manifest.json`：五前端/数据文件及四实现文件hash；
- `/tmp/ande-feishu-lilith-ranges.{cjs,json,log}`：原四门户双完整扫描及关系证明；
- `/tmp/ande-feishu-blank-jd-check.{cjs,json,log}`及early记录：五份官网空正文详情/DOM，Chrome退出/profile移除；
- `/tmp/ande-feishu-batch-offline.log`：147项离线；
- `/tmp/ande-feishu-page-report.{md,json}`及48张同前缀真实截图：最终HTTP/file **282 PASS / 0 FAIL**，每协议1,098全部自然row/connected modal全文与raw/public比对、34独立计分/ID排序查询、正负/dirty显式边界、四宽/官网空正文/缺要求/301实习及intern正式未知全部通过。父核五文件及48截图hash、前后mtime、八snapshots版本/cleanup；viewport是模拟，未手机实测。
- 初版279/0遗漏Chrome后台10次IPv6 UDP探路遥测，raw NetLog证明均OS ERR_ADDRESS_UNREACHABLE且无字节，并非proxy阻断；增强完整字节/端点检查。第二版proxy CONNECT socket ECONNRESET为驱动失败，保留5/1和原driver/netlog等，修共享socket错误边界后原279断言全量重跑加3条遥测/驱动回归，最终282/0。页面异常/console/network/page外网均0，后台15个URL/24proxy阻断/10OS路由失败全部明确记录，成功外连0，Chrome/server/proxy/profile清理。不是产品失败，也不删失败材料。

## 5. 本地公开发布

父核同版本冻结验收、原生UI/147离线与受保护基线后，唯一公开writer只执行：

```sh
node crawler/publish.js minimax minimax_social sensetime sensetime_social lilith lilith_social papegames papegames_social
```

- **公开28,006＝字节18,585＋阶跃359＋本批1,098＋其他历史7,964**；八来源316历史退出，其他26,908/source metadata/公司目录逐项不变。注册顺序/39公司/66来源不变，不是全站更新。
- 五文件与冻结页逐字节同hash，四前端始终hash/mtime不变；字节/阶跃四来源配置与12个raw/snapshot/status的hash/mtime不变。`data/jobs.js` SHA256 **`67fae5004a4d548ebaaf984fce32218aaa744d0d8cb1929f7d711855ad334194`**。
- `/tmp/ande-feishu-batch-publish.log`为唯一CLI结果；`/tmp/ande-feishu-batch-final-check.{cjs,json}`父逐项69份JS/CJS语法、Markdown链接、raw/snapshot/覆盖/公开数据/目录隔离及diff检查。
- 真实采集仍为北京时间17:11—17:12，发布或页面验收时间不冒充招聘日期/源成功时间。有限注册门户范围及历史迁移非下架说明保留；失败保护没有通用partial接口。
- 实际仓库路径（非副本）发布后Chrome154 **HTTP/file另11 PASS / 0 FAIL**：初次不自动查、28,006/四公司1,098/八源精确数量/零旧八源legacy、ByteStep18,944/sourceMeta/范围提示、显式四公司自然50→100unique及前批保留；抽原画8.05完整作品集和商汤blank两个实际JD（每协议2岗，不说小烟测再次检完1,098）。
- `/tmp/ande-feishu-live-smoke.{cjs,json,md}`及两真实截图，父逐图核hash/视觉和五文件SHA/mtime before=after；页面异常/console/network/page外网均0，后台8URL/19proxy阻断/4OS UDP路由失败有据且区分，成功外连0。Chrome/server/proxy/profile和端口清理。最初加载守卫在页面未加载时直接读ANDE_DATA为驱动中止，保留initial材料后只修守卫、原断言完整重跑，未改产品或弱化检查。
- 发布后147离线＋原生UI、69份JS/CJS语法、264本地Markdown引用和diff检查再通过，受保护16文件/元数据/目录逐项通过；最终 `/tmp/ande-feishu-batch-final-check.json`保存父复核结果。未提交/部署/配置定时或云端成功快照。
