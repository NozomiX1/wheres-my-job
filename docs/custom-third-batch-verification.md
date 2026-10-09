# 第三批官网协议核验与可用交付（2026-10-08，仅本地）

父级获准执行12个既有key：腾讯/腾讯音乐/京东/OPPO各校社两源，网易互娱、网易社招、网易雷火及vivo社招。冻结基线为40,911岗/53有数据源、39登记公司/66来源对象；阿里校园`unitMemberships`属非目标保护项。**§1–5保留初始阶段离线研究，最终本地交付另见§6；本次没有commit/push/部署授权。** 阿里云不在本批、没有请求。

仅读取父级已经捕获的当前匿名官网页面、原生请求/响应及实际加载的业务JS；未新开网络、浏览器或采集，未改其它文件。正文检查为renderer/字段契约和程序聚合，不做模型逐岗阅读JD、职业/语义分类。旧适配器/旧报告只作线索，不是本轮权威；同公司/同ATS不继承其它key资格。

## 1. 当前入口与原生协议

下表API路径均相对同列官网origin；动态`timestamp/time/timeStamp`保存原请求，不是签名。11个可达来源均有正常unsigned Node、请求页长100的真实列表材料（有后页者已取后页）；100是分页粒度而非岗位总量上限。[TXC–V]

| keys / 当前官方入口 | 已证默认范围与列表协议 | HTTP200之外的原生成功/分页 | 身份与链接 |
|---|---|---|---|
| `tencent` · [join.qq.com/post.html](https://join.qq.com/post.html) | POST `/api/v1/position/searchPosition`；`projectMappingIdList:[1,2,104,14,20]`，其余职业/城市/词空；`workCountryType:0` | `status:0,message:""`，`data.count/positionList`；pageIndex从1起 | `postId`十进制字符串（包括负值），不转Number；内部`post_detail.html?postid=`，外部用原`positionUrl`。[TXC] |
| `tencent_social` · [careers.tencent.com/search.html](https://careers.tencent.com/search.html) | GET `/tencentcareer/api/post/Query`；`language:zh-cn,area:cn`及空筛选 | `Code:200,Data.Count/Posts`；pageIndex从1起 | 原字符串`PostId`，不是`Id/RecruitPostId`；保原`PostURL`，内部SourceID1与外部入口分开。[TXS] |
| `tme` / `tme_social` · [校园列表](https://join.tencentmusic.com/campus/post/) / [社会入口](https://join.tencentmusic.com/social/) | POST `/api/uc-job/list` / `/api/job/list`；校园`type:""`包含10应届/20实习/30日常实习/40技术大咖；社会空筛选、`order_by:is_recommend` | 字符串`code:"200",msg:"操作完成"`；`items/_meta`含total_count/page_count/current_page/page_size；page从1起、ss100 | 字符串`id`；`/{campus或social}/post-details/?id=`；详情GET `/api/{uc-job或job}/info?id=…&time=…`。[TM] |
| `jd` · [campus.jd.com/#/jobs](https://campus.jd.com/#/jobs) | POST `/api/wx/position/page?type=present`；空plan/职能/城市/部门/词，不排TGT/实习 | `success:true,body.items/totalNumber`；pageIndex从0起 | `publishId`是发布/详情身份，不能用内部reqId或社招requirementId替代；`/#/details?id=`。[JD] |
| `jd_social` · [官方社会列表](https://zhaopin.jd.com/web/job/job_info_list/3) | 表单POST `/web/job/job_list`；城市/类别/部门JSON数组空、jobSearch空 | 原生响应直接数组，**没有官方total或统一业务code**；字符串pageIndex从1起，短页停止 | `requirementId`，不是positionId/id；目前官网链接为真实列表入口，**不是唯一岗位URL**，不猜详情模板。[JD] |
| `oppo` · [careers.oppo.com校园列表](https://careers.oppo.com/university/oppo/campus/post) | POST `/openapi/position/pageNew`；projectList/positionTypeList/城市/词空，不沿旧project30/Graduate白名单 | 数值`code:0,msg:"success"`；records/current/size/total/pages，pageNum从1起 | `idProjPosition`；原入口追加`/<id>`，不混用idRecruitPosition/projectPositionId。[OP] |
| `oppo_social` · [career.oppo.com社会列表](https://career.oppo.com/official/oppo/recruitment/post?recruitType=SOCIAL-RECRUITMENT) | POST `/ats-candidate-api/open-api/position/queryPositionList`；保必要`recruitTypeList:["SOCIAL-RECRUITMENT"]`，其它空 | 字符串`code:"0",msg:"success"`；list/pageNum/pageSize/total/pages，total/pages可为原字符串 | 字符串`positionId`，不是jobNo/jobCode；原入口路径追加`/<positionId>`并保recruitType。[OP] |
| `netease_huyu` · [campus.game.163.com](https://campus.game.163.com/) | 当前`status:1`公开导航链接102/75/104，逐项目GET `/api/campuspc/position/getJobList`；不把无id默认104冒应届全集 | `code:200,msg:null,rel:true,subCode:null`；data.list/total/pages/lastPage；currentPage从1起 | 安全整数`id`＋原projectId；`/app/detail/index?id=…&projectId=…`；不是旧项目名单授权。[NH] |
| `netease_social` · [hr.163.com/job-list.html](https://hr.163.com/job-list.html) | POST `/api/hr163/position/queryPage`；仅currentPage/pageSize，未加职业/经验条件 | `code:200,msg:null,subCode:null`；data.list/total/pages/lastPage，currentPage从1起 | 安全整数`id`；`/job-detail.html?id=`，不与互娱/雷火合源。[NS] |
| `vivo_social` · [hr.vivo.com/jobs](https://hr.vivo.com/jobs) | POST `/api/social/webSite/portal/page`；`company_id/group_id:1,user_id:null`，城市/职能/经验/词空 | `code:0,message:"success",success:true`；data数组/meta.total/page_count/page/max_results，page从1起 | `job_id:M…`，不是`job_code:H…`；官网`/job-detail?_irjid=…`，有原类别ID时附`_irjc`。[V] |

腾讯校园JS证明默认必须传全部二级mappingId；不能凭“无筛选”清掉必要参数。腾讯社会`area=cn`是实际官网默认范围，不删除它冒全球。OPPO两入口、网易三入口、vivo社会与既有校园系统均独立；vivo组织1/1不证明集团全球覆盖。网易互娱导航102为应届、75/104为精英实习；queryOpenList还返回其它项目，不据后台open名单扩本批公开导航范围。[TXC,TXS,OP,NH,V]

## 2. 正文renderer及属性边界

- **腾讯校/社、TME校/社、OPPO校/社、网易互娱为TEXT**：Vue文本节点/React children，不剥角括号、不解实体字面、不压内部空白或截正文。列表卡片预览不是API正文长度上限。[TXC,TXS,TM,OP,NH]
- 腾讯校园详情按原分支保岗位/课题两栏、介绍、加分项/注意事项、部门介绍、实习及细分方向；社会保Responsibility/Requirement及Introduction/ImportantItem/PostLightItem/DepartmentIntroduction。当前社会中文locale缺部门介绍标题，不自造标题。内部详情必须绑定原postId及第二身份；外部岗位不能套内部详情契约。[TXC,TXS]
- TME列表有duty，详情才给requirement；两栏按LF分行后文本渲染。空type的四个job_type原枚举全部保留，技术大咖不排除，也不仅凭名称改人才计划。[TM]
- OPPO校园正文包括positionDesc、`knowledgeSkill || positionRequire`、AI能力、bonusItem及独立文化字典；保已取得的独立原要求，不用全文伪填职责/要求。社会列表8个岗位有jobDirectionList，但列表方向槽不等于完整方向JD；详情实际含方向正文，按原方向顺序/名称/城市保留。[OP]
- **京东校/社为独立两栏HTML**：校园workContent/qualification先LF→BR再innerHTML；社会逐行包P后插入HTML。**网易社会两栏由第一方HTML parser渲染**，不能继承互娱TEXT；只按真实HTML规则转完整文本。[JD,NS]
- **vivo社会job_desc是单字段HTML全文**（cardList.job_desc赋innerHTML），只保完整description；独立duty/requirements未知留空，不按字段内文字猜分栏。[V]
- 职能仅按原具名字段投影；渠道、性质、计划、状态与日期分维度。只使用已证原枚举/导航事实（如明确实习或原work_nature_descr全职）；其它保守未知，不从标题、经验、发布字段名、青云/技术大咖/人才标志推性质/计划/可靠日期，不验证真实投递，也不推法定雇主。目录/归属不因品牌联想改写。[各原生响应、对应模块]

## 3. 已有材料的程序汇总与明确缺口

以下是`collections/*.json`原生列表按官方身份的**阶段汇总，不是最终规范化/发布数、complete资格或公司全集**；完整性仍待核，父级后续收据优先。

| key | 已取页 / 唯一原生身份 | 已知差异或详情情况 |
|---|---:|---|
| tencent_social | 23 / 2,254 | total2255→2254；SourceID1内部1,948条正常GET详情已取得；外部306条仅原列表职责/官网链接，未冒完整JD |
| tencent | 10 / 995 | 905内部＋90Workday；901次详情GET中900条绑定应用；最后请求`postId=-2`返回HTTP200/status0/message空但postId为null，被本地身份guard停止，余5内部＋90外部详情未应用 |
| tme_social / tme | 各2 / 124、146 | 两源分别124/146条详情已取得；校园41应届＋54实习＋47日常实习＋4技术大咖，仅原枚举程序计数 |
| jd | 2 / 124 | 原125页槽、重复1；total124→125，最新声明比唯一数多1 |
| jd_social | 19 / 1,822 | 原1833页槽、重复11；无官方total，不能称1822官网总量 |
| oppo / oppo_social | 3、2 / 237、155 | 单轮列表数吻合；文化字典和方向正文补充仍以父级完成回执为准 |
| netease_huyu | 3 / 89 | 当前导航三项目102:42、75:5、104:42，各一页；不推广未登记/其它项目 |
| netease_social | 27 / 2,646 | 原2650页槽、重复4；total2654→2650，最新声明比唯一数多4 |
| vivo_social | 2 / 119 | 本组织列表total119吻合，不证明组织/全球覆盖或详情正文完整性 |

**腾讯`-2`不是HTTP/业务拒绝**，只证明该正常响应不满足身份绑定；不猜负ID、后台状态或会话的单一因果根因，不改ID绕过、不重试求绿。腾讯19位字符串ID与负字符串可安全保真；无关未使用的原数值字段不能替代官方身份。[`collections/available-tencent.json`、`receipt-tencent.json`]

**OPPO补充仍在父级执行**：独立当前GET `/openapi/system/dictionary/queryList?code=CULTURAL_COMPATIBILITY`及一个已知方向详情已保`node-first/oppo-{culture,direction}-first.json`；只续取已知8个jobDirectionList岗位中的剩7个GET `/ats-candidate-api/open-api/position/queryPosition?positionId=…`，不是全155条机械取详情。已取得方向原文非空，方向合计/最终应用数量与完成钟待父级收据，不提前签收。[OP]

**`netease_leihuo`暂阻塞、没有岗位API资格**：官网根入口导向`/select/show`；已发现的[HTTPS/select/show](https://xiaozhao.leihuo.netease.com/select/show)主Document正常HTTP200后自动导航`/login?from_url=…`，driver在实际发送登录GET前拦截。没有HTTP403或岗位API拒绝证据；不登录、不绕过、不猜旧API补数据。早期根导航拦截及后续select观察分别保留。[LH]

## 4. 可用政策、真实钟与实现定位

按[SPEC §4.3](../SPEC.md#43-完整性与替换)/D07，基本真实性、身份、安全链接及已取得正文通过即可进入唯一`update → crawl → snapshot → publish → data`链；缺详情/重复/total波动不是整源拒绝门槛。本批模块仅授`complete:false,verification.policy:'available'`，不授ready/全集；不完整增量更新保未取得的旧岗及已有非空正文，失败/缺证零不清旧，雷火不牵连其它可用来源。

资料时刻依据`node-first/*.json.completedAt`、列表`collections/*.json.finishedAt`及详情`receipt-*.json.completedAt`的实际收据；复用seed/离线重演必须复用来源原钟，不能写研究整理、publish/replay的now。尤其互娱三页全复用原收据，OPPO补充完成钟尚待父级，不提前指定最后成功时刻。

当前实现定位：`crawler/lib/custom/{tencent,tme,jd,oppo,netease,vivo_social}_portal.js`及六份`tests/*-portal.test.cjs`，冻结各自profile并绑定HTTP/原生封套、范围/请求、jobs/native及详情身份；普通Node不伪UA/签名/Cookie，串行限频、超时/安全上限、拒绝即停无自动retry。它们是实现/离线反例入口，**源码存在或测试通过不代替本轮发布/页面验收**；本稿未运行生产链或代签父级验收。

## 5. 一手证据索引（只列公有URL，不复制raw/HTML/token/JD）

所有本机相对路径均在`/Users/nozomi/lab/wheres-my-job-work/third-batch-20261008T071347946Z/`。`observe-*/network.json`是实际加载URL→`scripts/*.js`的manifest，邻接`report.json/dom.json`为观察收据；`contracts/*.json`及`contracts/huyu/manifest.json`另记URL/HTTP/时间，均是本机证据，不冒Git内raw或跨runner持久快照。

- **TXC**：`observe-tencent{,-detail}/`、`node-first/tencent.json`、`collections/tencent.json`及`receipt-tencent.json`；当前加载[校园列表JS](https://cdn.multilingualres.hr.tencent.com/joinqq/static2/js/p_zh-cn_post.build.js)/[详情JS](https://cdn.multilingualres.hr.tencent.com/joinqq/static2/js/p_zh-cn_post_detail.build.js)，本机`contracts/tencent-campus-{post,detail}.{js,json}`。
- **TXS**：`observe-tencent-social{,-detail}/`、`node-first/tencent_social.json`、`collections/tencent_social.json`及`receipt-tencent_social.json`；[列表JS](https://cdn.multilingualres.hr.tencent.com/tencentcareer/static/js/p_zh-cn_search.build.js)/[详情JS](https://cdn.multilingualres.hr.tencent.com/tencentcareer/static/js/p_zh-cn_jobdesc.build.js)/[中文locale](https://cdn.multilingualres.hr.tencent.com/careersmlr/JobDesc_zh-cn.js)，对应`contracts/tencent-social-*`。
- **TM**：`observe-tme-list-slash/`、`observe-tme{,-social}-detail/`及两源node-first/collections/receipt；加载[业务bundle](https://join.tencentmusic.com/_nuxt/styles.52578d8.js)保两详情TEXT renderer，[app配置](https://join.tencentmusic.com/_nuxt/app.1ea185a.js)保API；本机详情观察`scripts/004.js、005.js`，路径尾斜杠以真实官网为准。
- **JD**：`observe-jd-list/`、`observe-jd-detail/`、`observe-jd-social/`及两源node-first/collections；当前[校园JS](https://storage.360buyimg.com/public.wechat.resume/web/official/20260902001311/umi.js)存`contracts/jd-umi.{js,json}`；社会[列表业务JS](https://zhaopin.jd.com/zhaopin/js/job-info-index.js)存`observe-jd-social/scripts/005.js`。
- **OP**：`observe-oppo-list/`、`observe-oppo{,-social}-detail/`及两源node-first/collections；校园[详情renderer](https://careers.oppo.com/assets/js/index-CSQ_mflu.js)/[字典wrapper](https://careers.oppo.com/assets/js/util-commons-CkFgh149.js)，社会[详情renderer](https://career.oppo.com/assets/js/index-BNQoLuvQ.js)；本机详情`scripts/008.js`，文化wrapper校园`scripts/005.js`；补充原请求收据见§3。
- **NH**：`observe-netease-huyu/`的当前[公开导航API](https://campus.game.163.com/api/content/web/game-campus/nav)、`observe-netease-huyu-{102,75,104}/`、`node-first/netease_huyu-*.json`、`collections/netease_huyu.json`；已加载[MF正文renderer](https://campus.163.com/static/js/4732.e84f337c.chunk.js)，对应`contracts/huyu/huyu-mf-25.js`及manifest。
- **NS**：`observe-netease-social/`、`node-first/netease_social.json`、`collections/netease_social.json`；当前[列表组件](https://hr.163.com/static/js/34.e3c060e4.chunk.js)/[HTML parser](https://hr.163.com/static/js/3.ba6411eb.chunk.js)，本机`scripts/009.js、007.js`。
- **V**：`observe-vivo-social/`、`node-first/vivo_social.json`、`collections/vivo_social.json`；[正文组件](https://hr.vivo.com/assets/useJobsRecommend.950eb900.js)/[路由query映射](https://hr.vivo.com/assets/mock.625f6998.js)，本机`scripts/006.js、004.js`；字段job_id与job_code按原native分开。
- **LH**：`observe-netease-leihuo{,-select}/{network,report,dom}.json`保根跳转、200主Document及登录前拦截；没有API正文，不拿发现窗口未观察到API或工具拦截冒官网拒绝。

初始阶段尚待父级签收的数量、保护与页面结果，已在以下§6另行补签；不改签原阶段观察和失败材料。raw、日志、backup与临时浏览器材料不入库。

## 6. 父级最终本地可用交付

已将11个精确profile登记到原39公司/66来源注册表，经受控`runUpdate → runCrawl → snapshot → publish → canonical/catalog/parts`唯一链应用已取得材料，不直接写岗位基线，不再次请求官网。发布钟`2026-10-08T09:26:30.542Z`不是资料钟；每源`lastSuccess`均沿用真实收据完成时刻：

| key | 本地岗位 | 真实采集完成 UTC |
|---|---:|---|
| tencent_social | 2,254 | 2026-10-08T08:51:31.503Z |
| tencent | 995 | 2026-10-08T08:54:32.606Z |
| tme_social | 124 | 2026-10-08T08:35:03.413Z |
| tme | 146 | 2026-10-08T08:35:32.777Z |
| jd | 124 | 2026-10-08T08:19:22.190Z |
| jd_social | 1,822 | 2026-10-08T08:19:29.526Z |
| oppo | 237 | 2026-10-08T08:37:28.574Z |
| oppo_social | 155 | 2026-10-08T09:04:31.161Z |
| netease_huyu | 89 | 2026-10-08T08:08:49.074Z |
| netease_social | 2,646 | 2026-10-08T08:19:35.585Z |
| vivo_social | 119 | 2026-10-08T08:19:36.020Z |

**40,911→49,622岗，净增8,711；53→64个有数据来源（37 ready＋27 available）**。第三批11源均`complete:false`、每岗`jdComplete:false`，数字相合不升级ready。OPPO文化一次成功材料及8方向岗位详情已绑定应用（首个seed＋7新请求），列表base、原方向名/城市及全部已得正文保留。腾讯校园905内部中900取得绑定正文，负ID`-2`的身份guard停止后保995列表；5负ID＋90Workday共95岗正文未知，不丢岗或造JD。社会306外部入口保列表正文/原官网链接，不冒外部详情已核。雷火继续暂挂、没有可发布岗位，阿里云未请求。

全量程序检查保全部40,911旧岗位逐字段、55非目标source元数据、39公司、阿里归属及**全部161既有out SHA/纳秒mtime**。新岗17字段、安全链接、非空标题、唯一身份、native逐字段投影及95空正文保守标注通过；146活动片的payload hash/来源/数量/全部事实等于canonical，catalog首屏jobs为空。canonical SHA256为`98641967a698cd407bd3992dc0debe89d0cec8a24e8ba111cee32731faff1c39`，catalog为`a8647255926fc89bb44eb7ecd6f34ecbe75d57b6750d67422cf4965b03bd5578`。

离线测试503项：495 passed/0 failed/8旧可选本机证据回放skipped；语法/diff检查通过。本地实际HTTP抽17条代表（11源、TME四类型、腾讯课题分支/外部空JD、OPPO方向），50单位首屏不预取JD，单位完整查询/原标题/全部已得正文/原官网href/安全rel/未知提示及dirty保旧结果通过；页面运行/console/外部请求错误0，自有Chrome/profile/server已清。页面代码未改，不加file全量或线上性能签收，也不做模型逐岗语义审阅。

两个旧测试假设随登记修正：vivo社招现在由自己的模块取得资格而非校园北森；互娱公司仍为登记的“网易互娱”，不能把同值当错误公司。原失败日志保留。首checker误读不存在的source.count、首页面checker对空JD错套“正文完整性尚未核验”提示均为工具错误；修工具后的v2通过，不冒产品/官网故障。

**限频收据后审发现偏差**：腾讯社/校、TME社/校的详情START最小实测199ms，分别13/4/1/1个相邻间隔低于200ms；正文重叠0，OPPO续7请求最小201ms。原因是一次sleep后直接发送、定时器可提前1ms唤醒，不能把配置200写成历史实测达标。六个新生产模块及私有research helper已改为唤醒后复核START时差，不在慢正文结束后盲加200ms；注入提前1ms的离线反例旧门禁红2项、当前门禁绿，全套仍503项495 passed/8 skipped。原事件/资料钟不改，不为补限频收据重采或重试；本批仍只签基本真实可用及页面交付，不签历史每间隔全部≥200ms。

证据另存统一工作目录的`publication.json`、`check-third.json`、`page-smoke-v2.json`、`timing-audit.json`、`timer-red.log`、`tests-final.log`及相应日志。**本轮没有提交/push/线上验收**；上一版f29e579最后已查询到Pages building不等于本批上线。当前canonical已达**113,297,231字节（约108.05MiB）**，超过GitHub普通Git单文件100MiB限制；即使payload去空白仍113,297,056字节，不能靠JSON格式解决。后续提交前须另行决定无损存储处理，不删岗/JD、不擅改LFS/域名/部署架构。首次查询性能、定时/持久化及额外正文/属性缺口继续后置。

## 7. 后续补缺（不改签§1–6，2026-10-08，仅本地）

用户暂挂数据问题，确认先处理雷火与腾讯。雷火沿公司官网明确公开校园入口独立取得应届63＋日常实习117＝180，新增`leihuo_portal`；旧管理系统登录不再推广成公众校园须登录，研究/其它入口待核。两栏实际HTML renderer、ID/URI/独立scope已闭合，不借网易同ATS资格。

腾讯-2…-6项目12模板真实详情均按原id/tid/项目/原标题绑定，原PostId-only guard失败收据保留；一份已取得Workday全文分别绑定两个明确引用它的原校园/社会列表。下一正常Workday请求HTTP403，停止该门户，不换key/客户端或重试；校园89正文/社会305额外全文仍未知，未取不当缺失或下架。

唯一链本地更新为**49,802岗／65有数据源（37 ready＋28 available）**，第三批12源都有可用版本，累计新增8,891，不等于完整性全部完成。三新资料钟为腾讯校园12:22:06.608Z、社会11:39:15.916Z（复用真实取得钟）、雷火12:34:25.940Z；12:43:55.402Z发布不冒采集。

保全部49,622旧岗位、63非目标source、阿里归属及188非目标out SHA/纳秒mtime；只七旧岗补JD字段、加180雷火岗，147片事实/hash/count等于canonical。新增正式START最小200/201ms、正文无重叠，旧199ms不倒签。最终530测试522 pass/0 fail/8 skip；HTTP7代表已得JD/原链接/未知提示/dirty保旧通过。验收发现并最小修复JD展示：全文不包含的独立旧职责/要求也显示，原评分与加载不改；§6“页面未改”仍是当时事实。没有commit/push/线上验收，阿里云未请求，存储/加载及首页预载建议暂挂未实现。

详见[后续协议与交付记录§6](custom-third-batch-followup-research.md#6-父级后续执行与本地可用交付)，统一work子目录`followup-20261008T112757164Z/`保新增原生材料/clock/拒绝/失败与最终检查。当前canonical113,625,137字节，仅记录普通Git100MiB限制，不删岗/JD或擅改架构。

## 8. 继续补齐明确缺口（不改签§1–7，2026-10-08，仅本地）

最新用户要求继续尽可能完成，不能把D07可用先发布当免做后补。实际补雷火研究68/4页40与暑期73/当前有效零，独立验证四入口profile后保旧扩增220；OPPO真实OFFEN日常10岗与原155无ID碰撞，保原SOC材料/方向/旧钟，v3独立绑定日常实习/未知校社渠道及JOB-TYPE字典。互娱日常P8/workType1/159岗实际公开请求取得，与网易这次广列表逐Native ID及完整raw完全相同，不复制到互娱校园key或猜公司归属。

按具体差异有限复核京东校园125（新增1）、社会1838参考count/1838槽/1828唯一/10重复（新增15、旧9未取得保留，共1837），网易2660槽/2657唯一/3重复（新增14、旧3未取得保留，共2660）。到原生终点后不无限求total相合或判旧岗下架。腾讯905内部已得详情补部门/方向分组showTitle/showTxt/父/子标题，同钟不冒重采；OPPO原155只补category，网易社会严格按官网workType/极客真徽标补就业/计划，不把派遣推全职或0推talentfalse，不借互娱同ATS语义。

**当前本地49,882／65有数据源，第三批累计8,971**；净增80＝雷火40＋OPPO10＋京东校1/社15＋网易14，保全部49,802旧岗、60非目标source、182非重写out SHA/纳秒mtime、39公司/66登记/50单位/阿里归属，147片全字段/hash/count一致。原资料钟嵌证据，发布不冒采集；普通update仍拒scope改变，只雷火/OPPO按明确key/精确预期旧coverage接受新profile/partial保旧扩增，其它范围不变。

一手详情和验收收据见[继续补齐审计与父级执行§6](custom-third-batch-completion-audit.md#6-父级继续补齐与本地交付)及PROCESS§28。当前各明确入口可用不等于全球/可投全集；仍为available/complete false/jdComplete false。Workday真实403门户继续停止、校园89正文/社会305额外全文未知，未请求阿里云；存储/加载、定时/持久化和上线仍另项，未commit/push或线上验收。

最终又按独立旧v1真实列表保钟复用网易未观察的78335/78336/78339，补已得全职事实，而非猜本次在招；只三employment变更，source最新钟仍13:58:55.598Z、旧钟08:19:35.585Z嵌证据，0新请求。最终网易2027全职/577实习/56未知、765人才true；571测试563 pass/8 skip/0 fail，HTTP13代表和保旧/60 source/182 out/147片检查通过。canonical最终113,841,098字节；初发和最终收据各保，详见上链§6.5，不把保旧后数量同total冒完整性。
