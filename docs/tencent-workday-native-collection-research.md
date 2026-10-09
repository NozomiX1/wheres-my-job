# 腾讯 Workday：公开列表、原生正文与 S22（2026-10-08）

**本代理仅离线研究**：读取已保存第一方响应／2026.40.17 JS文本，程序检查URL、身份与公开header；不访问官网、不执行官网JS、不采集／发布、不操作Git或out，不模型逐岗读JD。只写本文。目标是剩余Workday正文，不再重复已补的校园标签／bonus工作。

证据根 **W**＝`/Users/nozomi/lab/wheres-my-job-work/third-batch-20261008T071347946Z`；**F**＝`W/followup-20261008T112757164Z`；**D**＝`W/tencent-workday-20261008T162646104Z`。下述新网络事实均来自父级另获授权后的收据，不是本代理联网。核验截至父级新详情观察完成 **16:29:21.085Z**；JS offset均为本机文本0起JavaScript字符串索引。

## 1. S22：第一方只证 permission denied，未证细化原因

- F `tencent-receipt.json` 的 `events[4]`：R108032普通匿名GET于12:22:06.966–12:22:07.743Z返回HTTP403，133字节JSON含 `errorCode:"S22",httpStatus:403,locale:"zh-CN",message:"permission denied",messageParams:{}`及`errorCaseId`。后者只能作为该响应的关联标识，不能解释拒绝原因。`stopped.response:null`是收据未接纳正文，不表示官网没有错误JSON。
- [第一方2026.40.17 JS](https://www.myworkdaycdn.com/wday/asset/candidate-experience-jobs/2026.40.17/cx-jobs.min.js)保存于 F `followup-workday-renderer.{js,json}`。本机脱敏文本SHA256 `ca221c156d15c4b3f2dbd0138faeb730e27876f89bbef6659e4af1916285578e`；全文文本搜索 `S22`、`permission denied`、`errorCaseId`均0命中。offset345098附近只把HTTP401／403归为一般`ACCESS_DENIED`，没有S22原因表。**已读一手材料中无可证的更细原因；不声称已检索所有官方文档。**
- 同bundle的详情请求在HTTP400–599时进入rejected（module29412），rejected统一显示`SITE.Page_Not_Found`（offset492801附近）；所以页面“找不到”文案也不能证明下架。`approot.featureFlags.requireCandidateAccounts:true`不能解释匿名详情拒绝：旧R108129和本轮R108149在相同旗标下均取得`userAuthenticated:false`的正文200。
- W `observe-tencent-continuation-v2-20261008T153427917Z/network.json`的0／25／26号事件分别为R108032 Document200、approot200、官网自身正文GET403。本轮另一个已列出岗位R108149正文200（§2），已排除“整个门户所有详情一律403”的绝对说法；**没有证明旧403因果、R108032恢复或其它岗位必然可得**。不二手猜下架、封IP、UA、Cookie、限频或登录要求，不再请求R108032。

## 2. 公开列表 → 实际href → 详情请求 → 原Tencent身份

第一方入口：[公开列表](https://tencent.wd1.myworkdayjobs.com/zh-CN/Tencent_Careers)。W `observe-tencent-workday-list-20261008T162646104Z/{network,dom,report}.json`：Document／approot200；26号事件`77915.16`为官网原生POST `/wday/cxs/tencent/Tencent_Careers/jobs`，body为`{appliedFacets:{},limit:20,offset:0,searchText:""}`，返回`total:289,jobPostings:20,userAuthenticated:false`。bundle offset511414附近独立对应这个列表协议，**不是正文接口或289条完整采集证据**。

程序对照D `original-workday-refs.json`（306独立原URL／396两源引用，原先305独立URL未得全文）：首20条有**17条完整URL精确相同、18条reqId相同（其中1条完整URL不同）**。其中R106377的本轮`externalPath`无旧`Japan-Tokyo-Business-Tower`段；另R108201／R108205不在原目标集合。不能按289与306数量差推下架，不能按reqId相同改旧链接或新增岗位。

本轮已闭合的一条身份链（不是假设）：

1. 列表`externalPath`＝`/job/Singapore-CapitaSky/AI-Compute-Intern_R108149`；DOM真实href为[locale详情页](https://tencent.wd1.myworkdayjobs.com/zh-CN/Tencent_Careers/job/Singapore-CapitaSky/AI-Compute-Intern_R108149)。父级沿该已观察href另开正常匿名Chrome入口；收据**不证明PC列表卡片的SPA点击已执行**。
2. W `observe-tencent-workday-detail-20261008T162646104Z/network.json`：0／25号事件Document／approot200；26号事件`77979.16`于16:29:18.193Z取得官网自身GET [原生正文URL](https://tencent.wd1.myworkdayjobs.com/wday/cxs/tencent/Tencent_Careers/job/Singapore-CapitaSky/AI-Compute-Intern_R108149) HTTP200，body:null。
3. 原生响应：`userAuthenticated:false`，GUID `779db3e8ad5c1000a680015bf7eb0000`，`jobReqId:R108149`，`jobPostingId:AI-Compute-Intern_R108149`，`jobPostingSiteId: Tencent_Careers`；`externalUrl`精确等于[原Tencent链接](https://tencent.wd1.myworkdayjobs.com/Tencent_Careers/job/Singapore-CapitaSky/AI-Compute-Intern_R108149)，`jobDescription`为5030字符HTML。只数长度／检查结构，不作JD语义判定。
4. D `native-first-detail.json`保此响应及完成钟16:29:21.085Z；D原引用表独立绑定校园／社会两个原字符串PostId均`2107672308637417472`。可以各补同一URL已证全文，但保各自source、原Tencent标题／链接／列表职责，不能合并两源身份。此为新取得材料，不冒已经发布或剩余缺口全部完成。

**JS还证明另一种原生导航形状，不能与上面真实请求混签：** module61267 offset1705764／1712287附近，anchor href使用`/<locale>/<site> + externalPath`；PC click使用完整slug生成`<当前列表route>/details/<slug>`（保现有查询），不携location段。offset1720114的详情加载取route `id/location`，module84788把它们组成`job/[location/]<完整slug>`，module29412／87336再组成`/wday/cxs/<tenant>/<site>/...`。因此PC原生点击可能发**无location段的GET及不同Referer**；不能拿原href反写实际wire，不能只凭reqId或标题绑定。`-数字`posting后缀必须保在slug，reqId仍不含后缀；最终必须核原生GUID／site／完整slug／原externalUrl。

## 3. 新正文200如何接受现有validator：无需伪造header或放宽

`crawler/lib/custom/tencent_workday.js`当前把`request`与`requestFor(原URL)`严格深比较，再核HTTP200、显式匿名、GUID、reqId、完整slug、site、externalUrl及未知额外JD。module87336 offset2487050附近的真实GET factory设置`Accept:application/json`、`Content-Type:application/x-www-form-urlencoded`、`Accept-Language:<locale>`；Referer由正常浏览器产生。官网自身可能使用CSRF，但本项目不复制、生成或落盘这类值。

本次已**离线实证无需改validator**：从`77979.16`仅抽取实际观察的四个公开头 `Accept / Content-Type / Accept-Language / Referer`，header名字按大小写不敏感合并；重复`Accept-Language`／`accept-language`均为`zh-CN`，相同才接受，缺失／冲突则拒绝，不填默认值。保原URL／method／body及原JSON不变。结果与D `native-first-detail.json.evidence`逐字段完全一致，现有`validateDetail`通过；旧成功事件`72537.16`同样通过。

这只是**已观察wire的公开字段投影**，不是声称完整浏览器header只有四项：不复制UA、Cookie、CSRF／token／签名等敏感头，不把`requestFor()`模板冒实际请求，不发新XHR／注入SDK。实际公开头／Referer若改变，原模式应如实失败；若以后确实取得PC原生SPA正文200，只能凭真实导航链另证有限的request/provenance模式，保旧严格模式，不能改收据求绿色、改ID／slug／locale或换客户端重试。正文仍按2026.40.17 HTML renderer保单全文，不造独立职责／要求或猜日期／性质。

## 4. 本轮边界

- 仅补既有`tencent`／`tencent_social`原列表明确链接的Workday正文；observer的`tencent_workday`研究标签不是新增注册source／公司。`similarJobs`、新列表岗位或`hiringOrganization.name`不自动授扩来源、改法律雇主／渠道／属性资格。
- 旧S22／新阶段R108032拒绝及旧`stopped`均保留。父级新授权是独立阶段，不剥旧stop冒连续成功、不通过社会key绕同门户停采；新真实拒绝须立即停相应门户。本文不授权后续网络。
- 本机新200可用证据与可发布快照分开；现`collectSupplemented`拒直接续含stopped的v2，须由父级显式新阶段绑定原base及先得资料，不能只删字段。未来若入链仍唯一`update → crawl → snapshot → publish`，原非空JD／非目标事实及真实资料钟保护，不拿研究完成钟覆盖旧材料钟，不签全集。本文未编码／更新快照／发布／Git／部署。

一手本机定位：F错误事件及`workday-first.json`；F版本JS／取得元数据；W旧两份`observe-followup-workday-campus{,-zh}`与续处理v2网络；W本轮list／detail的network、DOM、report；D原引用表及新正文收据。协议边界另见[现行SPEC §4–5](../SPEC.md#4-岗位事实与更新政策r02r03r20r32)、[Workday validator](../crawler/lib/custom/tencent_workday.js)、[Tencent supplement绑定](../crawler/lib/custom/tencent_portal.js)、[既有native-ui公开字段原则](../crawler/lib/native-ui.js)。本轮只检查相关结构／身份／公开字段与静态调用链，未运行全套测试或线上验收。

## 5. 父级实际采集、补充与本地发布

以下是父级后续实际执行，§1–4代理研究截至16:29的范围不倒改。用户更新AGENTS后明确“然后回过来继续处理腾讯”；只处理两腾讯key的原Workday正文，不授Git/上线、扩公司、登录或伪装。

- 正常匿名公开列表15页共289唯一，所有页total289。当前完整原posting身份匹配旧腾讯285个URL：其中1份此前已得，本轮补284份。公开列表另外4个身份不新增入库；仅完整URL比较未观察的28条中7条是地点段变化，其余21个完整posting未观察。未观察不判下架。
- 首阶段严格取得256份，下一请求R106960-1实际HTTP302，Location为[Workday官方故障页](https://community.workday.com/maintenance-page?d=1&s=1&e=1)，不是403。匿名读取告示明确“service interruption / please check back later”，没有公告恢复时间。保原302及工具停止收据；超过7分钟后同Node正常公开列表健康200，仅取20个未试原链接均200；超过14分钟后原302链接按官方建议一次正常检查200。没有重试任何403、换客户端或无限poll，不把一个维护页推广为整门户始终不可用。
- 7个地点段变化均以**原腾讯URL**正常GET取得200，完整jobPostingId（含后缀）不变，但响应externalUrl指向当前公开地点段。首R107760触发旧`externalUrl binding`本地guard，原失败保留；新增显式`canonical:{url,listing:{request,httpStatus,response}}`，独立核同空筛选POST/页码/公开头、HTTP200/匿名、当前完整externalPath及完整原slug，仍保原GET、原腾讯URL/标题/城市，不按reqId或标题合岗。原无canonical路径不变，缺证/跨tenant/site/locale/后缀变化/未知JD仍拒。
- 当前公开匹配285个原URL全部取得后，首次检查不在Workday列表的原R107662，17:05:56.495Z返回HTTP403、`S22: permission denied`，即停整个门户；此后没有官网请求。旧R108032没有重试，两个明确拒绝的细化原因仍未证。剩21独立URL／23来源引用＝校园3正文、社会20额外全文；两条URL已证拒绝、19条未试。社会剩余岗位均有原列表职责，不冒“没有JD”；也不称剩余绝对无法取得。

新增显式`collectResumed(priorV2,site,{priorCompletedAt,supplements,issues,stopped})`，v3完整嵌原v2与停止收据，独立复验旧和新证据，拒覆盖/重复/跨source/伪停止；旧CLI不会自动续stopped。原资料钟校园12:22:06.608Z、社会11:39:15.916Z嵌入，原腾讯列表未重采。本轮成功材料钟校园**2026-10-08T16:48:02.635Z**、社会**17:05:15.564Z**，不取研究/后续故障/本地发布时刻。

**2026-10-09T03:17:32.616Z**经`runUpdate → runCrawl → snapshot → publish`本地发布，0发布期官网请求；只371条description变化（校园86／社会285），无新岗位，49,882／65有数据来源、39公司／50单位不变，原独立职责/要求/URL/属性等保真。完整性仍available/false，不冒任务已完成。保护49,882旧ID、64非目标source、191非目标out SHA/纳秒mtime、公司及阿里映射；148活动分片全字段/hash/count与canonical相合。canonical115,217,983字节，SHA `a115429f9c5fefb8efad091485e387c4b61a54202c6d44199d9fd761468924ab`，catalog `e32a71fe4a0ea26b45ba62c132f73ed1baf83c8cd35344c42ec1017a63580e41`。

正式Node301请求（299×200、1×302、1×403），START最小446ms、正文重叠0；两个正常Chrome启动自动流量可能并发并已披露/清理。最初默认并发全套测试超时，原日志保留；限制离线测试并发为2后593项585 pass/0 fail/8旧可选回放skip（含本轮真实正文/别名opt-in回放），不是重采求绿。本地HTTP六代表：独立两源全文、原职责、地点别名原href、已恢复维护岗位、重复URL独立身份、仍缺正文提示；整段原文/dirty保旧/50单位首屏无JD预取通过，运行/console/外部请求错误0，自有Chrome/profile/server清理。无file/线上/性能验收，未commit/push，HEAD仍f29e579。

材料D保`before*`、原两Chrome观察指针、`public-workday-collection.json`、`after-health-collection.json`、`original-location-check.json`及collection、`maintenance-*`、`unlisted-original-link.json`、`combined-details.json`、两resumed、`publication*.json`、`timing.json`、`tests-captured-final.log`、`page-smoke.json`及handoff。**后续需要具体决定：现契约遇真实拒绝停整个门户；若要继续检查19条未试原链接，需用户确认改为“某岗位返回S22时只隔离该URL、不重试，其它原链接仍正常匿名检查；若门户入口也拒绝或出现验证仍停门户”，仍不重试已拒URL、不登录或伪装。未确认前不擅自改此边界。**

## 6. 用户明确要求先检查19个未试链接（2026-10-09，仅诊断）

用户随后明确“先检查那19个链接”。本轮只对冻结的19个原URL各做一次正常匿名Node GET，按这次固定排查授权隔离精确S22、不重试该URL；其它HTTP拒绝、非匿名/验证响应仍会停止门户。没有重新请求旧R108032/R107662，也没有换客户端、猜新路径或把这一轮授权推广成生产CLI自动续采规则。

**19/19均返回HTTP403与原生六字段JSON：`errorCode:S22,httpStatus:403,locale:zh-CN,message:permission denied,messageParams:{}`。** 03:39:24.133–03:39:31.063Z共19请求，START最小296ms、正文重叠0。没有取得新JD；本次原目标“检查19条”已完成，Workday正文缺口仍校园3／社会20（21个独立URL），全部已在各自真实阶段观察到权限拒绝，具体原因仍未知，不推下架/必须登录/封IP/限频，也不推个人浏览器一定看不到。

canonical/catalog及全部197个out SHA/纳秒mtime不变，没有采集成功钟、快照或发布更新，没有Git/部署操作。结果与保护收据在W `tencent-workday-check19-20261009T033711886Z/{targets,results,check}.json`及19个单请求记录；`tencent-workday-check19-current.json`指向该目录。旧“19未试”是§5交接当时事实，不倒改旧handoff或失败收据。

## 7. 复查：21条缺口当前公开状态（2026-10-09，仅诊断）

用户明确恢复处理腾讯后，只做合法侦察，未重试任何已拒URL。正常匿名重取两个官方列表：Workday公开列表（POST `/wday/cxs/tencent/Tencent_Careers/jobs`，空筛选、15请求、total288、无拒绝）与腾讯自家列表（校园 POST `searchPosition` 10页、data.count=993；社会 GET `post/Query` 23页、Data.Count=2288；均无拒绝）。

- Workday当前288条postings中，21条缺口的完整slug命中 **0/21**；全部原URL在此前阶段均已观察403/S22（2条早期＋19条逐一），本轮未重试。
- 腾讯自家列表：校园993条仅 **R108032仍在**（1/3）；社会2288条 **17/20仍在**（SourceID=4、IsValid=true，含R108032）。已不在任何当前列表：R107849（校）、R107662（校/社）、R108025-1（社）、R107748-2（社）。
- 结论：21条全文在正常匿名协议下当前不可取得（Workday不再公开列出这些posting，S22与未列出状态一致）；17条仍被腾讯官网列出，按规则保旧、不判下架；4条不再列出也不据此删除。无新正文、无重试、无数据/快照/发布改动。
- 附带现场核对：腾讯列表接口当前为嵌套 `data`/`Data` 结构（校园`data.count/data.positionList`、社会`Data.Count/Data.Posts`），`tencent_portal.business()` 已按该结构解析，契约未变；社会count由10-08的2254增至2288、校园995降至993，属未采集的列表面变化，未发布。

证据 `/tmp/ande-tencent-recon-*.json`（本机临时、不入库）。

### 7.1 内部API与渲染器复核（2026-10-09）

- 腾讯社会`ByPostId`对SourceID=4仍返回HTTP200/Code200及`Data`：17条仍在列的岗位中，5条`Requirement`为真实文本（R105817-1 1225字、R105476-1 799、R104904 819、R104225 875、R103937 1232），12条为17字占位「岗位要求详情请见上方岗位职责内说明」；已不在列表的3条PostId（R108025-1/R107748-2/R107662）返回非200。
- 正常匿名Chrome打开R103937官方详情页（`careers.tencent.com/jobdesc.html?postId=1828316532829085696`）：页面加载Workday嵌入（approot/sidebar 200、job GET 403/S22），DOM实际显示Workday「您搜索的页面不存在。」。内部`ByPostId`虽200，SourceID=4的详情页不渲染内部字段；故内部`Requirement`不是这些外部岗位当前公开展示的正文，按现行renderer契约不并入。若要使用须另行决定并同步SPEC。
- 标题搜索命中的其它岗位不能按标题绑定；结论不变：21条Workday全文在正常匿名协议下不可取得，4条连腾讯列表本身也已移除，17条保旧、不判下架。
