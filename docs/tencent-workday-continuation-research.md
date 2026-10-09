# 腾讯两源续处理：离线证据与缺口（2026-10-08）

**仅离线研究。** 已读AGENTS、SPEC §4.1–4.3/§5、D07、PROCESS §27–28、TencentPortal/Workday模块及三份腾讯测试；用Node解析原生JSON、静态源码和canonical，未联网、执行官网JS、运行采集/publisher/浏览器/Git。只新增本文，不改旧报告、代码、数据或out；没有模型逐岗读JD。

审计起点为 **49,882岗／65有数据源**；`data/jobs.js` 113,841,098字节，SHA256 `40b1d60beec8b7958f6f3db68187915ad451c04ab6c27fcd2566b1fcf032885d`，与C最终交接相合。父级用户了解旧Workday403后明确说“继续处理腾讯吧”；父级已另开从开始的正常匿名Chrome作**新授权阶段**检查：同R108032 Document200，官网自身正文GET403，立即停门户（§4）。本文不把旧阶段停止撤销或改签，也不把该URL的403推广为所有URL都拒绝；本阶段已停止，无下一请求建议。

证据根：
- **W**＝`/Users/nozomi/lab/wheres-my-job-work/third-batch-20261008T071347946Z`
- **F**＝`W/followup-20261008T112757164Z`；**C**＝`W/completion-20261008T133155216Z`
- 本机材料不复制入库、不冒跨runner持久化。历史执行见[补缺§6.2](custom-third-batch-followup-research.md#62-腾讯项目实习真实分支与workday分开)、[继续补齐§6](custom-third-batch-completion-audit.md#6-父级继续补齐与本地交付)。

## 1. 程序全量审计：记录数不等于外链数

依据 `crawler/out/{tencent,tencent_social}_snapshot.json` 的 `jobs/verification`；两份verification均v2、`complete:false`，当前模块独立复验均通过。3,249条逐17字段投影与canonical精确比较 **0差异**；每源原PostId字符串唯一，安全链接检查通过，全部 `jdComplete:false`、source为available。

| 项目 | `tencent` 校园 | `tencent_social` 社会 |
|---|---:|---:|
| snapshot＝公开记录 | 995 | 2,254 |
| 原列表页／官方total | 10／995 | 23／2255→2254 |
| 内部记录／已绑定内部正文 | 905／905 | 1,948／1,948 |
| Workday原生引用记录 | 90 | 306 |
| **独立Workday URL** | **90** | **305** |
| 已绑定Workday全文 | 1 | 1（同一份先得材料） |
| 无任何正文 | **89** | **0** |
| 有独立职责／要求／全文 | 905／905／906 | 2254／1948／1949 |
| 真实可用资料完成钟（UTC） | 12:22:06.608Z | 11:39:15.916Z |

全部396条外部引用均为 `tencent.wd1.myworkdayjobs.com/Tencent_Careers/job/...`，现有Workday URL解析规则 **396/396接受**，没有其它外部协议。社会306条外部都有非空列表 `Responsibility`；其余305条是**额外全文未核**，不是305条无JD，更不能把全文伪填独立要求。

URL集合程序结果：**并集306，交集89，校园独有1，社会独有216**。交集89条两源原PostId及原标题均相同，原URL完全相同；两源所有共享PostId也恰为这89条外部记录。保独立source身份，不凭标题合岗。

- 唯一已得全文：原URL [R108129](https://tencent.wd1.myworkdayjobs.com/Tencent_Careers/job/SKorea-Seoul/Tencent-Cloud---Technical-Account-Manager--Korea-_R108129)，两源原PostId均 `2099443063863820288`；Workday GUID `ffd82d1585321000a63e6b0e2c2a0000`。F `workday-first.json`及两源snapshot的 `supplement` 独立绑定；2938字符原HTML只转换为单全文。
- 社会有**一组同URL、不同原PostId**：[R104655-3](https://tencent.wd1.myworkdayjobs.com/Tencent_Careers/job/Japan-Tokyo-Business-Tower/-Associate-Quality-Assurance-Tester_R104655-3)，`1877601288456282112`／`1948689715007979520`；原标题、列表职责并不逐字相同。不能据URL删除其中一个原列表记录；若取得该URL响应，可各自绑定并保各自列表事实。
- 未得全文为 **305个独立URL／394个source记录引用**＝校园89＋社会305，扣88个跨源共享缺口及社会1个同URL重复引用。全URL并集306个reqId也唯一；当前不存在同reqId不同URL，但协议仍须保完整slug，不能只绑reqId。
- 社会305个独立URL中4个无location段、154个带`-数字`posting后缀、11个slug没有标题前缀；校园90个均带location、26个带后缀。现解析器均支持这些**原URL形状**，无须补造标题/地点/ID。

## 2. 非Workday优先补缺：144岗另一份已得附加文字未投影

**父级指出后，本次独立全字段程序复核确认：905内部响应中 `internBonus` 非空395份、`graduateBonus` 非空195份；102份internBonus＋42份graduateBonus未被当前duty/requirements/description任一字段字面包含，按原PostId去重恰为144岗。** 两组无Native ID重叠：102岗 `recruitType:1`，42岗 `recruitType:2`。不是新官网缺口，不能再声称“所有已取得JD字段均已保留”。同一全字段检查中desc/request各274、introduction269、topicDetail/topicRequirement各631份非空，未被任一JD字段包含均0；本次明确漏文收敛于这144份另一bonus。

- 原一手：校园snapshot `jobs[].detail.response.data.{internBonus,graduateBonus,recruitType}`；W `collections/receipt-tencent.json`。例原PostId `1282032033786619904`（type1，未选internBonus73字符）与 `1200791473415778304`（type2，未选graduateBonus98字符）；对应正常原详情API均为 `https://join.qq.com/api/v1/jobDetails/getJobDetailsByPostId?postId=<原PostId>`，不猜岗位或模型解读JD。
- **真实renderer确实按类型选择**：W `contracts/tencent-campus-detail.js` 第5924行，字符offset452713附近 `internBonus !== '' && internBonus !== null && recruitType === 2`，453182附近 `graduateBonus !== '' && graduateBonus !== null && recruitType === 1`；均TEXT渲染，标题取官方 `multilanguageInfo['Bonus']`。当前 `campusSections` 复现了当前页面选中分支，却把另一个真实非空JD附加字段完全舍弃；此前部门块检查只覆盖选中分支，不证明全部已得原文无遗漏。
- **最小离线补法**：原标题、现有“加分项或注意事项”标题及已选段落原序不变，另一原生附加文字以原样TEXT另段保留；不造“实习要求/应届要求”等官网未给的新标题，不把另一分支当当前申请条件或据bonus字段猜性质。职责/要求不改、不拿description另计第四评分字段；只补144个description，原材料/真实钟不刷新，经唯一publisher同钟投影。按SPEC §4.2保全部已得招聘方文字，不需要官网请求或改范围/快照收据。
- Workday顶层 `hiringOrganization.name` 是组织元数据，未添正文合理，不当已证JD漏项。

### 2.1 已修部门／模板正文仍保完整

一手[校园详情JS](https://cdn.multilingualres.hr.tencent.com/joinqq/static2/js/p_zh-cn_post_detail.build.js)在 W `contracts/tencent-campus-detail.{js,json}`：第5617行附近 `handleClick`、5642行 `handlePostDirectionClick`、5876–5905行详情成功分支、5924–5944行TEXT renderer。

程序遍历905份已绑定内部响应：5个项目12模板，**1277部门组／2294部门记录／11方向父组／12子方向**。按renderer分支独立重算职责/要求、逐段检查完整文字及原序，`showTitle/showTxt/name/comment/positionFidName/子title` **未保留块0、两栏差异0**。当前真实 `subDirectionDtos` 非空记录0，不把合成测试的分支当本次取得材料。

- `-2…-6`原负字符串仍绑定列表 `id/position/projectId12/positionFamily/原标题` 与响应 `id/tid/projectId12/recruitType2/title`；`postId:null`仅此已证形状例外。原-2 HTTP200/status0的本地PostId-only guard收据保于v1 base，不能称官网拒绝或全局放宽null。
- 12子方向的 `desc/request/introduction/graduateBonus/internBonus/topicDetail/topicRequirement` 非空数均0；它们提供方向名及部门，并无已得独立子JD被漏投影。不能复制父JD成子岗位、改用子ID探请求。
- **部门组/方向文字未发现新的漏项；另一个bonus的144岗漏文单独见上节。** 还有元数据上下文未按部门/子方向展示：2294部门工作地关联、12子方向工作地/面试城市；但3096个部门工作城市值及21个子方向工作城市值均已出现在所属父岗位 `city`，不是漏采城市或缺职责。若需保这些关联/面试城市，可离线据原字段与官方标题补上下文，不混入独立职责/要求；无须官网请求。组 `title` 非本renderer使用的 `showTitle/showTxt`替代字段，不把所有raw字符串都当漏JD。

### 2.2 其它已得属性漏投影：只凭显式官网标签

[校园列表JS](https://cdn.multilingualres.hr.tencent.com/joinqq/static2/js/p_zh-cn_post.build.js) 第7349行／offset488205，直接把 `item.recruitLabelName.split(' ')[0..2]`作为卡片标签；详情第5924行／offset447982同样直接显示。905内部列表与详情label逐字相同（0差异）。原label五值计数为116／169／286／354／70（依次应届毕业生、应届实习、应届毕业生 青云计划、实习生 青云计划、日常实习，合计995）。因此无需按字段名/数字猜：

| 已得显式事实（995条原列表全量） | 可离线补，当前全null |
|---|---|
| `应届实习`169＋`实习生 青云计划`354＋`日常实习`70 | **593岗employment:internship**（内部518＋外链列表75）；“应届毕业生”不推full-time。 |
| label独立token **`青云计划`**：`应届毕业生 青云计划`286＋`实习生 青云计划`354 | **640岗talentPlan:true**（内部636＋外链列表4）；未显示此token者仍null，不推false。 |

**最小实现建议：仅校园normalizeRecord的既有employment/talentPlan投影＋离线fixture测试，无新字段/fetch。** 按原字符串 `split(' ').slice(0,3)`的可见标签精确匹配、保原badge词序，不用正则包含/重排/标题猜；缺失/非法/未知token保持未知。离线反例覆盖五原label、isQingyun=0但有计划label、应届不推full-time、无计划不推false、社会不继承；全量回放预期593实习/640true，非这些字段与真实钟不变。

`isQingyun`在当前详情renderer只参与项目14/20的**课题正文分支**，不是统一计划徽标开关：631份为1，但另5份 `isQingyun:0`也显式显示“实习生 青云计划”。所以不能用 `isQingyun===1`代替标签事实、用0否认计划，亦不能只因字段名补计划。`techTagName`是官网另显示的技术领域文字，不猜为职能/性质。

还存在**5个模板category漏项**：已绑定supplement响应 `tidName`依次技术/产品/设计/市场/职能，原详情第5880行设置 `_this5.tidName = res.data.data.tidName`并在banner显示；当前normalizeRecord只读 `d?.tidName`，忽略internal supplement的同字段，公开 `-2…-6`category均空。可按同一绑定的internal响应补这5个职类，不用positionFamily数字或岗位标题猜。原SOCIAL职类来自CategoryName，无需改动。上述属性均可零官网请求处理，仍须Native字段/类型/原序复验，不让缺label或未知token获猜测值。

## 3. 已明确的正常入口与协议边界

| 入口／协议 | 已证身份与正文，不得混用 |
|---|---|
| [校园列表](https://join.qq.com/post.html)：POST `https://join.qq.com/api/v1/position/searchPosition` | 默认 `projectMappingIdList:[1,2,104,14,20]`，职业/城市/词空；`status:0,message:""`，`count/positionList`。OA详情GET `https://join.qq.com/api/v1/jobDetails/getJobDetailsByPostId?postId=<原字符串>`；普通postId＋secondary position绑定，模板独立联合绑定；TEXT两栏及附加段落。905内部响应已取得，§2补已得投影，不为旧guard或完整性标签重取。 |
| [社会列表](https://careers.tencent.com/search.html)：GET `https://careers.tencent.com/tencentcareer/api/post/Query` | 默认空筛选、`language=zh-cn,area=cn`；`Code:200,Count/Posts`。仅SourceID1用GET `https://careers.tencent.com/tencentcareer/api/post/ByPostId?postId=<原字符串>&language=zh-cn`，绑定PostId＋RecruitPostId；SourceID4外链不可套内部详情。1948内部详情职责与列表逐字一致，要求及附加TEXT已得。 |
| 原Tencent列表明链 → Workday当前匿名详情 | 原URL中的Tencent tenant/site、location（可无）、完整slug及reqId → GET `/wday/cxs/tencent/Tencent_Careers/job/<原path>`；须HTTP200、显式 `userAuthenticated:false`、GUID格式、`jobReqId/jobPostingId/jobPostingSiteId/externalUrl`全部绑定。Workday原标题可能不同，保Tencent原列表标题；unsafe数值 `id/RecruitPostId`不能顶替字符串PostId/GUID。`jobDescription`按已证HTML renderer保单全文，不猜两栏、日期/性质/实际可投。 |

**明确剩余链接是这些已列出的305个未得Workday URL，不是猜新API或新增source；本阶段新拒绝后保持停止。** 例如校园独有、尚无全文的 [R107849](https://tencent.wd1.myworkdayjobs.com/Tencent_Careers/job/Japan-Tokyo-Business-Tower/Global-Recruitment-Intern_R107849)，原PostId `2080327162589786112`，直接见校园snapshot。它是已存在的公开入口证据，不是当前再请求建议；是否匿名可得不能由旧成功URL或现URL解析器预签。没有当前证据要求重扫两源列表或全取内部详情。

Workday当前实现 `crawler/lib/custom/tencent_workday.js`冻结已观察GET/header；旧Chrome证据有header大小写重复，不能整包复制含敏感头的浏览器请求。若新Chrome实际header、locale路由、externalUrl/slug形状、额外 `videoInfo` 或正文结构不同，须保新公开收据并独立闭合，不能静默改字段求旧validator绿色、补Cookie/伪UA/注入SDK或改ID。当前普通CLI路径是Node传输，不等于已接入新Chrome会话；只复用成功公开响应不意味着继承会话授权。

## 4. 旧403与本阶段正常Chrome再检查分开

父级新阶段一手材料 W `observe-tencent-continuation-v2-20261008T153427917Z/{network,report}.json`：开始15:37:25.960Z，结束15:37:48.878Z；同R108032 `/zh-CN/Tencent_Careers/job/...` Document **HTTP200**，官网自身发出的 `/wday/cxs/tencent/Tencent_Careers/job/...` GET **HTTP403**。report `Necessary HTTP refusal 403`，隔离Chrome/profile已清理；父级确认拒绝即停，无后续重试/换Node。这不取得新正文、不刷新成功钟；89校园空正文/305社会额外全文缺口不变。

首次 W `observe-tencent-continuation-20261008T153427917Z/{network,report}.json`，15:35:03.356–15:35:04.710Z：observer宽匹配`sso`误命中**Associate**路径，Document发送前被本地取消，HTTPresponse不存在，不当官网登录或拒绝。私有helper随后限定auth词为路径完整segment；离线red/green保于 W `tencent-continuation-20261008T153427917Z/navigation-guard-{red,green}.log`，不是官网JS执行或绕验证。两份失败/拒绝各自保留，不改签。

### 4.1 原阶段事实保留

F `tencent-receipt.json` 的唯一真实Workday拒绝：

`GET https://tencent.wd1.myworkdayjobs.com/wday/cxs/tencent/Tencent_Careers/job/Singapore-CapitaSky/Associate-Backend-Engineer_R108032`

开始 **12:22:06.966Z**、完成 **12:22:07.743Z**、HTTP403、正文未解析，原PostId `2092829497043894272`；同证据在校园snapshot `verification.stopped`。此前R108129普通Node成功为 **11:39:15.916Z**，此前匿名Chrome同详情也HTTP200。没有单一根因证据，不归咎Cookie/UA/限频，不解释成岗位下架；旧阶段确实停止，社会仅离线复用成功材料。

现 `collectSupplemented` 会拒绝直接续接 **含stopped的v2**（`a stopped supplemental run requires a newly authorized collection phase`）。新授权阶段须另立收据；本阶段没有成功正文，不能靠剥去stop继续请求。若日后另获明确授权和成功材料，须保原v2/403不动、显式绑定原v1列表及全部先得supplements；不删stop冒旧阶段连续成功、不把换source当无拒绝的新门户。只有实际取得的岗位正文可沿唯一 `update→crawl→snapshot→publish` 链处理；已得正文/非目标事实及真实钟保护，available不升级全集。本文未实施这些改动/发布。

## 5. 一手索引与本次核验范围

- **列表／内部原文**：W `collections/{tencent,tencent_social}.json`、`receipt-*.json`；F `{tencent,tencent_social}-available.json`及`*-receipt.json`；repo两源snapshot。官网[校园列表JS](https://cdn.multilingualres.hr.tencent.com/joinqq/static2/js/p_zh-cn_post.build.js)、[社会列表JS](https://cdn.multilingualres.hr.tencent.com/tencentcareer/static/js/p_zh-cn_search.build.js)、[社会详情JS](https://cdn.multilingualres.hr.tencent.com/tencentcareer/static/js/p_zh-cn_jobdesc.build.js)、[中文locale](https://cdn.multilingualres.hr.tencent.com/careersmlr/JobDesc_zh-cn.js)，本机 W `contracts/tencent-{campus,social}-*`。
- **Workday匿名成功／正常locale导航**：F `workday-first.json`；W `observe-followup-workday-campus{,-zh}/{network,dom,report}.json`。最初locale导航被本地保护挡住不是官网登录/拒绝；`-zh/network.json`保存同源详情GET HTTP200及匿名JSON。
- **HTML renderer**：[2026.40.17官方JS](https://www.myworkdaycdn.com/wday/asset/candidate-experience-jobs/2026.40.17/cx-jobs.min.js)，F `followup-workday-renderer.{js,json}`。文本定位（0起Unicode字符offset）：1711087附近 `61267→U.VY(jobDescription)`及可选videoInfo，492111附近 `19629.Be→99219.LE(text)`，2776029附近 `dangerouslySetInnerHTML`／sanitize。只读文本，未执行bundle。
- **初始baseline／已修投影**：C `handoff.json`、`check-completion-final.json`、`retained-publication.json`；当前 `TencentPortal.normalizeRecord/validateEvidence`、`TencentWorkday.validateDetail`及 `tests/tencent-{portal,supplement,workday}.test.cjs`（本次只读，未跑测试）。

本次完成全两源结构/字段/计数/URL集合及当前投影程序检查；未做新官网成功判断、采集、发布、Git或线上验收。父级本阶段已获正文GET403并停止；优先可做的是§2零新请求的已得正文/标签投影。以上为代理审计当时结论；下节另记父级实际改动与发布，不改签该阶段。

## 6. 父级实际补齐与本地发布

已在`TencentPortal`只按官方首三个空格分隔可见标签补就业/计划，缺/空/未知仍null，应届不推全职、未显示计划不推false，social不继承；recruitLabelName非TEXT类型拒绝身份验证，合法optional不升级为必需字段。5个模板只取已独立绑定internal supplement原tidName，不猜positionFamily。附加正文保当前官方标题及选中段落原序，另一真实非空bonus原样另段保留，不造新要求标题或改两栏。

实际description变更**269岗**：144原先未被任何JD字段包含的段落补齐，另125已有字面相同文字的独立附加字段也保留，不互相去重。593 employment:null→internship、640 talentPlan:null→true、5 category由空补原技术/产品/设计/市场/职能。程序逐17字段检查其余字段/源完全保真；全部905内部已得七个JD字段逐字包含于正文或两栏，内部部门/方向/原标题/官网链接不变。没有新Workday正文成功、没有新岗位数量，不把附加字段/标签当第四评分字段。

首次实际发布后checker识别两件事：269变化而非初始“仅144”预估（独立同文不消重是正确行为）；publisher全空新JD时保**整旧记录**，因此75个已有空正文外部岗的已得实习标签、4个青云真徽标被阻挡。修根因而不是另写数据：仅**显式reproject**放行已证空JD岗位属性，普通partial更新的全空保护仍不变；任何旧非空正文仍逐栏保留。SPEC同步，真实Tencent链fixture红→绿，错误预估/checker日志及中间结果保留，不冒官网故障。此前委托报告“当前全null/0差异”等仍是原审计时事实。

**16:00:52.466Z同钟重投影发布及保护检查完成**，腾讯资料钟仍12:22:06.608Z、社会11:39:15.916Z，原v1/v2证据、原403收据及新Chrome403均保留；197份全部out SHA/纳秒mtime未变，65非目标source、全部49,882岗位/39公司/66登记/50单位、阿里归属保护，147活动片全事实/hash/count等于canonical。发布0官网请求，不重复取995列表/905内部详情，不清空旧正文，也不移除旧stopped来绕禁止自动续跑。

最终**575测试：567 pass／0 fail／8旧可选回放skip**，语法/diff通过。实际本地HTTP腾讯6代表：两种另一bonus、模板职类、实习青云、正文仍空但已有明确实习徽标、非目标社招已有正文；全已得JD/原链接/属性/未知提示/dirty保旧通过，首屏50单位无JD预取、runtime/console/外部请求错误0，隔离Chrome/profile/server清理。初页面driver只滚window/body高度未使sentinel相交，rank52岗未渲染；改为正常`scrollSentinel.scrollIntoView()`后成功，不直接扩state或造全量渲染，不改产品/评分/加载。失败收据留存，不称产品故障或数据丢失。没有file、线上、全站性能或模型语义签收。

新材料工作根`W/tencent-continuation-20261008T153427917Z/`保before、navigation-guard红绿、两次discovery（首次发送前保护误拦、后次真实403）、属性/empty-JD链红绿、publication-check、page-smoke-v4、575测试及handoff。canonical现113,886,538字节，SHA `9366390ebd35354cdb6929c91ed67d8ce1f99730d1b414057bff2046afee5f6e`；catalog `0ee51c4cecff9027d5b11e525473d4fbbf729d3f505e5adfbbfbfdaaf9fb360c`。49,882／65总数不变。**Workday未得305独立URL/394source引用仍阻塞（89校园正文＋305社会额外全文）**，原因未证，不把Document200当正文可得，不以正常Chrome失败宣称全部用户/全部岗位都403。无commit/push/线上验收、阿里云无请求，Git100MiB、存储/加载及首页预载等暂挂边界不变。
