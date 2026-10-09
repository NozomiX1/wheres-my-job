# 第三批11源完成度审计（离线一手材料，2026-10-08）

## 边界与结论

审计除雷火外 `tencent,tencent_social,tme,tme_social,jd,jd_social,oppo,oppo_social,netease_huyu,netease_social,vivo_social`。雷火父级另行处理，不重复研究/采集。已读AGENTS、SPEC §4.1–4.3/§5、D07、最新PROCESS、当前六个portal模块及对应测试；检查当前observe/contracts/collections、`crawler/out/*_snapshot.json`及JSON解析的公开数据。**未联网、执行官网JS、逐岗模型阅读JD、运行测试/采集/publisher、改代码/数据/旧报告；只新增本文。**

材料根 **W** = `/Users/nozomi/lab/wheres-my-job-work/third-batch-20261008T071347946Z/`。下文W下相对路径均是本机一手材料；不复制raw/凭据入库，不冒跨runner持久化。**offset是0起始Unicode字符索引**，不是字节/行号。

最有价值的可做项：

- **零新请求可补：**腾讯已得部门分组/方向父标题；OPPO社会155条职能名；网易社会2019全职/571实习及760条官方“极客计划”徽标。是已得事实的投影漏项，不是未证明的额外JD。
- **最小正常请求研究：**京东社会当前加载JS明确定义同筛选 `POST /web/job/job_count`，现有材料未取得其响应。
- **真实公开入口待核：**OPPO `OFFEN-RECRUITMENT` 日常实习；互娱官网明链 `hr.163.com/product.html/game?parentProduct=P8&workType=1`。入口存在不等于已证缺几个岗位，也不能借另一key范围签收。
- **当前没必要再取详情：**TME270份详情全得；OPPO8岗/21方向必要正文全补；vivo代表详情与列表原HTML逐字相同，**没有列表更少的证据**。
- **腾讯Workday整门户停止：**校园89详情、社会305外部额外全文未知；无任何Workday请求建议，不换key/客户端重试。

## 1. 11源状态表

全部11源仍是公开 **available**、snapshot `complete:false`，不冒完成/ready。**L**＝当前renderer所用列表JD字段形状齐备；**D**＝必要详情已得。L/代表相同只证当前形状，不授整源完整性。各列表到下表原生声明边界/短页终点，**都未取得越界空页EOF**；两者分开，不默认为凑EOF再请求。

| key / 唯一岗位 | 当前已证正文形状 | 分页终点与差异 | 明确缺口 / 未知 / 下一步 |
|---|---|---|---|
| `tencent` / 995 | 非listJD；905内部全部有绑定正文（含5模板），外部1份全文已得。 | 10页，末95；count995，到同scope的total边界。 | **已得分组文字投影漏项**§2.1；89外部未知且Workday停。只离线补投影。 |
| `tencent_social` / 2254 | 列表只有Responsibility；D1948内部全得，职责与列表1948/1948相同；1外部全文已绑定。 | 23页，末54；Count2255→2254，唯一2254。 | 305外部额外全文未知；**Workday停，无下一请求**。不为旧Count波动重取内部详情。 |
| `tme` / 146 | 列表只有duty；D146/146有要求，列表duty=详情duty。 | 2页100+46；total146/page_count2。 | 当前两栏结构已取得，无确定未得正文；10/20/30/40四类型俱有。master实际type40，已含4岗。 |
| `tme_social` / 124 | 列表只有duty；D124/124；列表duty=详情duty。 | 2页100+24；total124/page_count2。 | 当前两栏无确定缺口；available不是完成，但也不是重取124详情的理由。 |
| `jd` / 124 | L两栏HTML；9260代表详情两栏逐字等于列表，无已证额外JD。 | pageIndex0/1：100+25槽，重复1；total124→125，唯一124。 | **最新声明差1、具体缺ID未知**。可做一次原空筛选两页扫描处理漂移，不重取124详情。 |
| `jd_social` / 1822 | L：官网展开卡片直接完整渲染列表两栏HTML；未证独立额外JD，URL现仅列表入口。 | 19页，末33；1833槽/11重复/1822唯一，裸数组无total，短页终点。 | **当前JS有尚未取得的count协议**§3.1；先单次count，不猜requirementId深链。 |
| `oppo` / 237 | L：职责/原要求/知识技能/AI/bonus＋文化字典已得；1769代表详情5正文槽均相同。 | 3页100+100+37；total237/pages3。 | 含118应届/97寻梦实习/22博士；**独立日常入口未核**，不能把97实习视作它的覆盖证明。§3.2。 |
| `oppo_social` / 155 | base两栏已有；8有方向岗的21方向两栏列表全空、详情21/21非空，**已全补**；8份base两栏相同。 | 2页100+55；total155/pages2。 | **155职能名可离线补**§2.2；OFFEN独立于SOCIAL，§3.2。不重取8详情或其余147详情求完整。 |
| `netease_huyu` / 89 | L：MF列表展开只用两栏TEXT，89均有。未取得独立详情对照，不冒逐岗相同。 | 102:42、75:5、104:42，各page1/pages1；原lastPage均false，按pages边界结束。 | 当前status1导航三项目已收；**官网日常实习明链待独立核**§3.3，不借网易社会/雷火资格。 |
| `netease_social` / 2646 | L：展开卡片解析列表description/requirement两栏HTML，2646均有；未证额外JD。 | 27页，末50/lastPage:true；2650槽/4重复/2646唯一；total2654→2650。 | **性质/计划已有renderer证据可补**§2.3；最新差4、缺ID未知。只为排查覆盖漂移才单轮列表复采，不逐岗详情。 |
| `vivo_social` / 119 | L单HTML全文job_desc；代表两次详情都=列表469字符，无列表较短证据。 | 2页100+19；total119/page_count2。 | company/group1实际默认，组织全集未知；不改0、不借校园资格。无确定漏JD，无119详情请求建议。 |

分页证据：W `collections/<key>.json.pages`；最终已应用正文/补充：repo `crawler/out/<key>_snapshot.json.jobs/verification`；腾讯新证据另在W `followup-20261008T112757164Z/`。离线程序将这11源8711条snapshot按当前模块投影与公开字段比较：**0差异**；只有腾讯校园89空正文，全11源仍 `jdComplete:false`。0差异仅证“公开数据忠于现投影”，不能证明投影没漏官方字段。

## 2. 明确缺口：已得原生字段可以离线补，不改源钟

### 2.1 腾讯校园：部门组及方向父标题丢失

[当前校园详情JS](https://cdn.multilingualres.hr.tencent.com/joinqq/static2/js/p_zh-cn_post_detail.build.js)，W `contracts/tencent-campus-detail.js`：

```js
// offset452806：项目12方向父组，邻接另显示projectItem.title
_vm._s(item.positionFidName)
// offset454250 / 454290：部门组tab；项目12newIntentionBGDList分支也显示
_vm._s(item.showTitle)
_vm._s(item.showTxt)
```

当前 `crawler/lib/custom/tencent_portal.js` 的 `departments()`只保departmentList.name/comment；项目12只加子方向title及部门正文，不保上述父组/组文字。

程序统计已得905内部详情：**1277部门组**都有showTitle/showTxt；对应公开description中分别有 **1071/1268组的字符串未出现**。字段分组结构均未投影，字面碰巧出现在其它段落不等于保了绑定。五模板 `-2…-6`共11方向父组，10个父组名字未出现在description；12个子方向title已有，不需重补子正文。

已得可独立绑定的例子：repo `crawler/out/tencent_snapshot.json`首岗 **PostId1282707398326592512** → 原正常 `/api/v1/jobDetails/getJobDetailsByPostId?…&postId=1282707398326592512` → 部门组id953、`showTitle:"CDG"`（snapshot offset3212/约第70行）。五模板材料在同snapshot.supplement及W `followup-20261008T112757164Z/tencent-available.json`，仍按原id/tid/project12绑定，不改父ID/复制子岗位。

**可做：**同钟补真实父标题、部门/工作地组上下文及原序；职责/要求沿原两栏，不把这些metadata添入计分字段。这是已显示事实/上下文漏字，**没有新发现职责/要求正文缺段**；无需任何腾讯请求。

### 2.2 OPPO社会155条官方职能名未投影

[正常公开字典API](https://career.oppo.com/ats-candidate-api/open-api/enum/dictionaries?dictTypes=JOB-TYPE)已HTTP200/`code:"0",msg:"success"`：W `observe-oppo-social/network.json`对象10（0起始），`dictValue:"SOFTWARE"` offset11755。详情观察也取得相同字典。

[当前utility JS](https://career.oppo.com/assets/js/util-commons-D4qyPm8L.js)，W `observe-oppo-social/scripts/005.js` offset **16911**，原renderer明确按字典值查名字：

```js
e.jobList.find(c=>c.dictValue===e.info.jobType)?.dictName
```

[当前列表JS](https://career.oppo.com/assets/js/index-DttznKbS.js)，W `observe-oppo-social/scripts/008.js` offset **21284**：`await me({dictTypes:"JOB-TYPE"})`。不是把英文jobType按经验翻译。

155条positionId原jobType全部在字典内，0未知码：SOFTWARE57→软件类，MARKETING36→市场营销类，PRODUCT36→产品及运营类，HARDWARE9→硬件类，DESIGN5→设计类，TEST4→测试类，FUNCTION4→职能类，OTHER3→其他，DATA1→大数据类。现模块固定社会 `category:''`，公开155条全空。

**可做：**将已得字典URL/HTTP/业务/收据绑定社会source及jobType，按dictName同钟补category；不改原标题/JD/分数，不继承另一部署字典。无需再取字典，仍经唯一publisher，不能直接写公开数据。

### 2.3 网易社会：工作类型/“极客计划”已由官网renderer证明

不能凭字段名/数字推事实；这里有当前第一方显示链：

[commons JS](https://hr.163.com/static/js/commons.c65656b8.chunk.js)，W `observe-netease-social/scripts/003.js` offset **25330**，模块`0vM+`工作类型枚举：

```js
[{id:"0",en_name:"Full time",name:"\u5168\u804c"},
 {id:"1",en_name:"Internship",name:"\u5b9e\u4e60"},
 {id:"2",en_name:"Dispatch",name:"\u6d3e\u9063"}]
```

同文件offset **1336134**：`uJMD.j`函数g按 `r.id===e`映真实name/en_name。[列表组件](https://hr.163.com/static/js/34.e3c060e4.chunk.js)，W `observe-netease-social/scripts/009.js` offset **59036**：`m=Object(l.j)(t.workType,e)`供card显示。

原生字符串"0"2019岗、"1"571岗、"2"56岗；当前公开employment全null。**可补2019 full-time/571 internship**；56派遣不在现性质枚举中硬塞full-time，不从实习推校园渠道。

同列表组件offset **59420** `geekPassionateTalentFlag:!!t.geekPassionateTalentFlag` → offset **2506** `I.a({isGeek:A})` → offset **37810** img `alt:"\u6781\u5ba2\u8ba1\u5212"`（极客计划），只有真值显示。原生1有 **760**岗，0有1886，公开talentPlan全null；例Native id59977，原 `https://hr.163.com/job-detail.html?id=59977`。

**可做：**760个官网明确计划徽标映true；0只证该徽标没显示，不替其它计划做false证明，可继续null。原始字段就在repo `crawler/out/netease_social_snapshot.json.jobs[].post`；无需取详情。这补的是已明示性质/计划，不是额外JD；旧报告“当时未证明”不改签，源资料钟不刷新。

## 3. 只能继续研究：已公开观察的下一请求，不能预签新scope成功

### 3.1 京东社会count协议（优先单请求）

[当前实际加载job-info-index.js](https://zhaopin.jd.com/zhaopin/js/job-info-index.js)，W `observe-jd-social/scripts/005.js` offset **5515**（另一个分页分支8414）：

```js
jQuery.ajax({type:"POST",url:"/web/job/job_count",
  data:{workCityJson:workCityJson,jobTypeJson:jobTypeJson,
        jobSearch:jobSearch,depTypeJson:depTypeJson},
  success:function(data){$('#totalJobCount').val(data);totalCount=data;…}})
```

同文件offset10624列表POST使用同四筛选。现network只有job_allparams/hotWords/job_list，collections无count响应。因此是 **“列表无total、门户count协议尚未取”**，不是官网没有计数协议。

下一请求：正常匿名 **`POST https://zhaopin.jd.com/web/job/job_count`**，原jQuery表单协议 `workCityJson=[]&jobTypeJson=[]&jobSearch=&depTypeJson=[]`、真实社会列表Referer。不登录/申请。count响应类型/业务契约尚未知，HTTP200不提前签有效总数；较晚count也不能单独证明旧scan缺具体ID/岗位下架。

只有出现当前scope确定覆盖差异才单轮原空筛选scan，以requirementId求集合。末页已33条，不默认先加第20页空EOF或重扫19页，也不猜positionId/id详情模板。

### 3.2 OPPO日常入口确实存在；校园已收97实习不证明覆盖它

不是旧代码推scope：

- [当前校园列表业务JS](https://careers.oppo.com/assets/js/index-BDTU0hdA.js)，W `observe-oppo-list/scripts/008.js` offset **2793**：`h.push({path:"/recruitment/post",query:{recruitType:"OFFEN-RECRUITMENT"}})`，对应“面向全体在校生 / 日常实习生”点击。**这是官网实际点击路由，不冒DOM已有字面a.href。**
- [当前社会列表JS](https://career.oppo.com/assets/js/index-DttznKbS.js)，W `observe-oppo-social/scripts/008.js` offset **10553**：`label:"日常实习生",value:"OFFEN-RECRUITMENT"`；offset **22865**将query.recruitType原值纳入recruitTypeList；offset **17415** `await Re({pageNum:l.value,pageSize:$.value,…,recruitTypeList:h.value,shareId:I.value})`。
- [当前utility](https://career.oppo.com/assets/js/util-commons-D4qyPm8L.js)，W `observe-oppo-social/scripts/005.js` offset **14267**：POST `/ats-candidate-api/open-api/position/queryPositionList`；SOCIAL正常请求已得。社会router [oppo-o3ljzhYn.js](https://career.oppo.com/assets/js/oppo-o3ljzhYn.js)，W `scripts/001.js` offset15019绑定`official/oppo`，不在校园origin盲猜同API。

**校园实际已得范围：**W `observe-oppo-list/network.json`的正常 **`GET https://careers.oppo.com/openapi/position/project/list`** HTTP200/code0明确列三项目：29“2027届寻梦实习招聘”/Intern；30“2027届应届生校园招聘”/Graduate；31“2027届博士生招聘”/doctor。最终237列表恰为29:97、30:118、31:22（repo oppo_snapshot原projectId/projectName/recruitmentType）。

所以当前校园default pageNew确实已覆盖**寻梦实习97条**；但OFFEN是另一个部署queryPositionList的明确渠道，**没有材料证明这97条等于/包含OFFEN日常集合，也没有OFFEN响应证明缺多少岗**。不能以“都有实习”合scope或称全部日常已收。

最保守下一步：正常公开导航 **`https://career.oppo.com/official/oppo/recruitment/post?recruitType=OFFEN-RECRUITMENT`**，观察官网实际默认请求。当前JS已明确支持同queryPositionList空城市/职能/词/shareId、`recruitTypeList:["OFFEN-RECRUITMENT"]`的正常POST；分页参数沿官网实际请求。**公开客户端协议存在，但该渠道HTTP/封套/岗位响应尚未取得。**

若取得数据，独立绑定positionId、官网链接、必要方向详情及范围；须明确既有key的覆盖迁移/保旧，不能默换SOCIAL或借237/155资格发布。官网关闭/拒绝就停，不探其它参数/重试。

### 3.3 互娱官网日常实习原href；不能从雷火P4推P8 API

W `observe-netease-huyu/dom.json` offset **1583**，文字“网易互娱日常实习生招聘”，真实href：**`https://hr.163.com/product.html/game?parentProduct=P8&workType=1`**。

[布局JS](https://campus.game.163.com/layouts__index.async.js)，W `observe-netease-huyu/scripts/004.js` offset **15023**同href；[热招项目JS](https://campus.game.163.com/4106.async.js)，W `scripts/020.js` offset **16820**：`key:"full-intern-huyu",name:"日常实习生",link:…parentProduct=P8&workType=1`。是当前公开导航，不是后台open项目名单。

[当前game-campus/nav](https://campus.game.163.com/api/content/web/game-campus/nav)的status1应届/精英项目确为102/75/104，已收；独立日常href不在这三项目scope。**下一请求仅建议正常导航完整原href，观察实际协议/独立范围**，不凭雷火P4构一个P8 API。

网易社会广列表虽已有571个workType1，但原product如P008与门户parentProduct=P8是不同字段；不能凭名称/数值近似给互娱日常签完整覆盖。须正常官方字典/组织层级及原生ID集合关系，再决定已有跨源覆盖/重叠，不复制同岗或改互娱归属。

### 3.4 有限覆盖复核，而非全详情重采

- **JD校园差1：**已观察 `POST https://campus.jd.com/api/wx/position/page?type=present`，pageSize100/pageIndex0，parameter五项原空；若声明第二页再取index1。以publishId和旧124集合比较，一次scan后仍漂移就记录保旧，不循环求漂亮total。
- **网易社会差4：**仅为排查该具体覆盖差异，按已观察 `POST https://hr.163.com/api/hr163/position/queryPage` 原 `{currentPage:1,pageSize:100}`单轮至原生末页，用原安全整数id比较。不能单看新count/重末页就定缺ID，也不为ready无限扫27页。
- 其它已到原生终点、没有确定漏ID/额外JD字段的来源不重采；100是分页粒度，不是岗位封顶。

## 4. 已证listJD完整形状／必要详情已穷尽，不能“jdComplete=false即补全详情”

以下是字段/结构程序对照，没有模型逐岗读JD；未抽样也不是实际缺正文：

| 独立证据 | 原生身份 / 官方API / 本机材料 | 实际结果与renderer短证据 |
|---|---|---|
| **vivo代表（重点）** | job_id **M2027632186654519297**，显示codeH8644Q不能替ID。`POST https://hr.vivo.com/api/social/webSite/portal/job/detail`原body `{job_id:"M2027632186654519297"}`；W `observe-vivo-social-detail/network.json`对象12/14，job_desc offset406595；列表在 `crawler/out/vivo_social_snapshot.json`。 | 两次HTTP200/code0/success:true的 **job_desc均469字符，与列表逐字相同**；详情新增字段0，只有列表collect_flag在详情省略。**没有extra正文、没有列表更少证据。** [当前useJobsRecommend](https://hr.vivo.com/assets/useJobsRecommend.950eb900.js) / W `scripts/006.js` offset452880：`n.innerHTML=e.cardList.job_desc`。单HTML全文不猜两栏。未推广为119岗详情都对过。 |
| 京东校园代表 | publishId9260/reqId2474；`POST https://campus.jd.com/api/wx/position/detail/9260`原body `{id:"9260"}`；W `observe-jd-detail/network.json`对象12，publishId offset12240。 | workContent131/qualification176字符、requirementVoList40项均与列表相同。详情新增keys为交付/计划/收藏等，未证extraJD。[当前umi](https://storage.360buyimg.com/public.wechat.resume/web/official/20260902001311/umi.js) / W `contracts/jd-umi.js` offset1161067/1161373只渲染两栏HTML。 |
| OPPO校园代表 | idProjPosition1769/idRecruitPosition1769；`GET https://careers.oppo.com/openapi/position/detail?id=1769`；W `observe-oppo-detail/network.json`对象10，positionDesc offset11101。 | 职责205/原要求208/知识技能233/AI65/bonus null逐字/值相同。全237的projectPositionDesc/Require/Name均=已保字段，无独立漏字。 [详情renderer](https://careers.oppo.com/assets/js/index-CSQ_mflu.js) / W `scripts/008.js` offset10505列五片；文化wrapper `scripts/005.js` offset4601选status1 itemName，现投影一致。 |
| OPPO社会全部必要方向 | repo `crawler/out/oppo_social_snapshot.json`8个positionId→8对应queryPosition详情，方向jobId仍绑定父ID。原补充在W `collections/available-oppo_social.json`及 `receipt-oppo_social.json`。 | **21列表方向jobDuty/workRequire均空，21详情两栏均非空，现description全保；8份base两栏与列表相同。** 可证明列表少方向正文，但这个缺口已补完，不再报告“仍待取”。 |
| TME两独立scope | repo `crawler/out/{tme,tme_social}_snapshot.json`及W `collections/available-{tme,tme_social}.json`，string id；uc-job/info与job/info分别绑定。 | D146/124全得requirement；duty270/270逐字等于列表。[styles bundle](https://join.tencentmusic.com/_nuxt/styles.52578d8.js) / W `observe-tme-detail/scripts/004.js` offset307157/323598：`data.duty.split("\n")`及`data.requirement.split("\n")`，TEXT两栏，无第三JD槽；offset417898 master按钮实际`/campus/post?type=40`，广列表已有4岗。 |
| 互娱当前列表形状 | 安全整数id＋projectId102/75/104；repo netease_huyu_snapshot。 | [当前MF正文组件](https://campus.163.com/static/js/4732.e84f337c.chunk.js) / W `contracts/huyu/huyu-mf-25.js` offset14450–15300只读取positionDescription/positionRequirement并React children显示；89份两栏俱有。无独立详情对照，不冒额外JD已核，也没有真实第三正文缺失证据。 |
| 网易社会、京东社会列表形状 | 网易id；京东requirementId，不能混positionId。 | W `observe-netease-social/scripts/009.js` offset2780–3300：原desc/requirement交HTML parser；W `observe-jd-social/scripts/005.js` offset11110/11515：列表workContent/qualification逐行包P插HTML。两源全部记录俱有原两栏；未发现已观察的第三正文需要逐岗取。 |

**当前未发现“已得但未应用的独立extra职责/要求正文”需要新增采集。** 所能直接指出的新漏项是§2的官方显示事实；OPPO方向/文化、TME要求与已得Workday全文已经应用。不能把jdComplete:false统一叫漏正文，亦不能用代表相等宣布整源完成。

## 5. 门户拒绝与停止无意义重采

腾讯Workday真实HTTP403保于W `followup-20261008T112757164Z/tencent-receipt.json`和 `tencent-available.json.verification.stopped`，repo tencent_snapshot也嵌该停止证据。先前成功全文各自绑定两个源，不抹去；其余校园89/社会305保持未知，不当官网无JD/下架。**整门户继续停，无请求、换key/客户端、locale或重试建议。**

可以停止本轮重复采集的条件：页面到原生声明终点；当前renderer所需JD字段已得且投影保字；必要详情/字典已补；仅剩“其它详情可能还有内容”的未证明担忧。此时留未知，不升ready、不逐岗请求求确定。只有renderer明确使用未得字段、代表详情出现真实差异、明确ID/分页覆盖问题或公开入口未覆盖，才做对应最小补缺。

各scope独立：腾讯mapping/area=cn保留；TME校社两API不混；JD保type=present及两ID域；OPPO两部署/SOCIAL/OFFEN不合源；互娱三项目不借社会/雷火；vivo社会company/group1不借校园北森、不改0。未知日期日界、其它计划、法律雇主和实际可投性不凭字段名补猜。

§2修复须绑定现有一手材料、经唯一publisher同钟投影；**不刷新source.lastSuccess**。§3是新协议/范围研究，不自动取得发布资格；不完整保旧，不因total漂移清旧。available可用交付不等于第三批完整完成，历史报告不改签。

§1–5收尾：字段统计/投影比对是只读Node/Python程序；代理未执行测试、采集、浏览器、发布、提交/推送/部署，仅新增本文。下面另记父级随后的真实执行，不把建议冒取得收据。

## 6. 父级继续补齐与本地交付

用户要求“继续，尽可能的完成，别给我交一个半成品”，又确认“继续”。先前把可用交付当收尾不充分；本阶段针对明确新入口/数量差异/投影漏项执行，不登录/伪装/改ID，不请求已403的Workday，不动存储、加载、阿里云、commit/push或线上。

### 6.1 新入口和有限复核

- **雷火研究68／暑期73**：当前router `/research`、`/intern`普通Chrome导航均200/匿名成功API。研究40／4页、暑期有效零／1页；普通Node三续页成功，复用首屏及原17页，共22页220唯一。两新chunk实际载入`Position`，主JSoffset9419/9557的独立innerHTML两栏与route/store项目闭合，不凭 `_s`猜TEXT。旧研究截止26年2月与当前仍列40分开保留，不按日期删岗或冒可投。
- **OPPO日常OFFEN**：沿当前官网完整公开href正常导航，pageSize10、code字符串0、total字符串10/pages1取得10岗；普通Node同协议一次也200，不把页长10当封顶。与原155社会ID无碰撞，无日常方向待补。v3嵌原SOC v2/8详情和09:04:31.161Z；日常按原positionId/type/正确OFFEN URI独立绑定，所有JD保留。明确“日常实习生招聘”只标internship，校/社渠道未知[]。当前JOB-TYPE字典按真实renderer映165岗职能，校园culture不变。旧profile不授新scope；正常CLI依次SOC/必要详情→OFFEN→字典，拒绝停全源。
- **互娱日常P8/workType1**：官网完整原href页面明确“网易游戏（互娱）”，实际为`hr.163.com/api/hr163/position/queryPage`的P8/workType字符串1；普通Node100粒度两页取得159。随后与网易新无筛选广列表**159/159原生ID及全部raw完全相同**，不借同ATS/名字或相似产品码签覆盖；由同一网易来源保留，不重复复制159岗或猜法律雇主。首屏Native id78226在旧列表没有，是本轮有限复采的具体动机。
- **京东校园**：原scope两页125唯一，旧124全在，新增9380；12旧岗城市按本次Native数组原序更新，不排序/去重/抹旧正文。
- **京东社会**：同空筛选count协议HTTP200/原数字1838；单次原scope19页1838槽、10重复、1828唯一，新增15、旧9本轮未取仍保，共1837。新v3严格绑定原count请求/响应，不把参考数当唯一在招全集；重复除身份无关的`id`外事实一致，官网用requirementId/positionId申请绑定，身份不换。到短页后不循环扫到数字“好看”。
- **网易社会**：原广列表单次27页，2660槽、3重复、2657唯一，新增14、旧3未取保留，公开2660。真实原文要求/标题各一条更新；未取得的京东9＋网易3不判下架。不为列表已有两栏重取2657详情。

### 6.2 已得文字、属性与真实钟

腾讯905已得内部校园详情补1277部门组`showTitle/showTxt`和11父方向组/12子方向的官方TEXT上下文；职责/要求/标题/身份不变。905个description变化不是新采集，源钟仍**12:22:06.608Z**，腾讯out三文件SHA/mtime不变，旧guard及Workday403保留。

网易仅当前社会profile按官网严格字符串workType0/1标全职/实习，派遣不推全职。14:23首次发布2024全职＋577实习＋59未知（含3保旧，后续见§6.5）；765岗按官方“极客计划”真徽标标talentPlan:true，其余null，不由0推非所有人才计划。互娱不继承该社招语义。OPPO原155只补category，其它17字段逐项不变；新10岗实习不改评分、日期或人才计划。

| 材料 | 真完成钟（UTC，2026-10-08） |
|---|---|
| 雷火新增公开项目 | 13:38:02.424Z |
| 京东校园列表 | 13:58:46.078Z |
| 网易广列表 | 13:58:55.598Z |
| 京东社会列表，含先得count | 14:00:40.646Z |
| OPPO日常普通Node | 14:06:16.176Z |

原社会155、字典、腾讯列表/详情各保原材料钟，不取合并/复用/审计时刻；`14:23:35.376Z`发布不冒新采集。

### 6.3 唯一链与验证

雷火/OPPO只做本轮明确继续授权下的**保旧扩增**：publisher `extendCoverage`按key绑定预期旧coverage，复验新精确profile及Native材料，仅允许`complete:false`增量，保旧180/155。普通update仍拒自动scope改变；错误旧scope、公司改变、未选key、与reproject/discard混用拒绝。五新材料沿`runUpdate→runCrawl→snapshot→publish`，再仅腾讯同钟`--reproject`，发布重演**0官网请求**，无第二写链。

**49,802→49,882／65有数据源**（37 ready＋28 available），净增80＝雷火40＋OPPO10＋京东校1/社15＋网易14，第三批累计8,971。保全部49,802旧岗、60非目标source、182非本次重写out SHA/纳秒mtime、39公司/66登记/50单位及阿里归属；147活动片全事实/hash/count等于canonical。实际普通Node57请求（含两份renderer）START最小200ms、正文重叠0；官网自动启动流量可能并发，历史19次199ms不倒签。工具require缺`.cjs`及测试fixture误读ID原日志保留。

最终565测试：557 pass／0 fail／8旧可选回放skip。实际本地HTTP12代表涵盖研究/日常、腾讯分组/模板、OPPO方向/日常、网易性质/计划/新互娱日常ID、京东两新增及Workday仍空岗；原标题/全部已得JD/原官网href/安全rel、属性提示及dirty保旧通过。50单位首屏不预取JD/canonical，runtime/console/外部请求错误0，自有Chrome/profile/server清理。没有file全量、线上/全站性能或模型逐岗JD语义签收。

### 6.4 仍受阻与交接

已执行上述明确可做项，不把available当完成。TME270必要详情、OPPO21方向及已证listJD形状不机械重取；其它额外内容未证不是“官网确定没有”。来源仍available/complete false/jdComplete false，不冒公司全球或实际可投全集。**仍明确未取得的是Workday89校园正文＋305社会额外全文；真实403后无再请求、换key/浏览器或重试。**未知可靠日期、其它属性/未证独立范围保未知，阿里云未请求，定时/持久化/上线不是本次完成项。

统一材料在W `completion-20261008T133155216Z/`：before-data/before/out备份、列表/count/OPPO/雷火素材、publication/check-completion/page-smoke、565测试及失败日志；新观察在W `observe-completion-*`。canonical113,840,733字节，SHA256 `a2840cb2d40c29382c57fcc49961d1054320ac8753ecbb9865d931a7fe12cf2f`；catalog `ca2891979aea6a8cb73d7f5603f07d4df4f07f69f2e8dcae53336e145c19fd9b`。仅本地、HEAD仍f29e579，未commit/push/线上验收；存储/加载暂挂，未改LFS/Pages/域名或架构。

### 6.5 最终再核：保留旧岗的已得性质也补齐

最终检查发现78335/78336/78339虽然本次未观察，旧真实列表已明确workType字符串0，不能把“未取得新记录”当“旧事实没有”。新增网易社会限定的v2显式复用`collectRetained(baseV1,priorV1,site,priorCompletedAt)`，两份同精确scope各自完全验证，按Native ID仅补新列表未观察的旧岗、保新顺序/正文，嵌旧08:19:35.585Z；默认fetch仍v1，不自动读取历史。错scope/钟/原文、额外jobs、未取得基线不能借旧证据当拒绝后的fallback；不会因保旧后数字碰巧同total升级完整性。

唯一链同钟reproject于**15:01:45.699Z**完成，源最新资料钟仍13:58:55.598Z，**0新官网请求**。只3旧记录employment从null补全职，其它全部49,879记录与首次发布逐字段完全相同；当前网易2027全职＋577实习＋56未知，765人才true仍不变。首次私有脚本漏同钟reproject显式标志，publisher跳过旧钟返回非零、canonical SHA完全不变，补标志后成功；保原失败日志，不冒官网拒绝/重采。

最终**571测试＝563 pass／0 fail／8 skip**，追加旧保岗全职标签的HTTP代表共13条通过，自有资源清理、错误/外部请求0。最终程序再验全部保旧/60非目标source/182 out纳秒mtime/147片、17字段及Native投影通过；新节点请求仍57/START最小200ms/正文重叠0。canonical**113,841,098字节**，SHA `40b1d60beec8b7958f6f3db68187915ad451c04ab6c27fcd2566b1fcf032885d`，catalog `8451b36676ce85400633cf0380bed7fa80c8bee101d5e5576861cfb5b6dfb60a`。49,882/65、Workday阻塞、无Git/线上、存储/加载暂挂边界不变。C保`retained-publication.json`、`check-completion-final.json`、`page-smoke-final.json`、`tests-retained-final.log`和父级`handoff.json`，首次结果/失败仍保留。
