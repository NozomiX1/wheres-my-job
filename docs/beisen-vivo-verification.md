# vivo 北森校园门户核验（v0.26，只读研究）

**结论：既有 `vivo` 校园门户确为北森公开招聘协议，可作为共享适配器的来源候选；本轮不授予生产资格。** 无筛选公开列表 **253**，包含秋招138、蓝极星27、日常实习70、暑期实习18。原生及扩展显示字段分别严格双全扫，ID与每个原始字段稳定。9个代表岗位独立官方详情/DOM与列表全文一致，生产无需机械逐岗详情。

观测时间：**2026-10-05 12:35:51—12:51:37Z**（北京时间20:35—20:51）；后续本地核验/清理见 manifest 时间。仅本文件写入仓库。未执行 crawl/update/publish、写 `crawler/out/`、修改登记/实现/前端/公开数据；研究材料与profile不能晋升生产。父已保存公开28,619隔离基线，保护19旧成功来源20,892及非目标来源。本任务不复验或采集讯飞。

## 1. 第一方身份链与协议归属

1. [vivo产品官网](https://www.vivo.com/) 页脚「工作机会」明确链接 [hr.vivo.com/home/](https://hr.vivo.com/home/)；官网与招聘首页均显示维沃移动通信有限公司版权。
2. 招聘首页导航「校园招聘」明确链接 [hr-campus.vivo.com](https://hr-campus.vivo.com/)，「社会招聘」链接 [hr.vivo.com/jobs](https://hr.vivo.com/jobs)。不是由相似域名或历史注释推断关系。
3. 校园首页导航「岗位投递」进入 [无筛选 `/jobs`](https://hr-campus.vivo.com/jobs)。公开HTML `BSGlobal` 配置、门户资产URL及实际页面证明：租户 **612022**；页面门户 `903cbcbf-4898-46e1-817c-da522a9752b1`；广列表pageId `532f79ae-5925-4dc4-a5a0-56ff3ba4ad2a`；页脚 **Powered by Beisen**。页面加载北森 `ux-recruitment-portal-2022` 业务组件与beisen/zhiye公开资源。
4. 正常匿名浏览器实际 POST [`/api/Jobad/GetJobAdPageList`](https://hr-campus.vivo.com/api/Jobad/GetJobAdPageList)，与现有 `crawler/lib/beisen.js` 的公开核心列表协议同路径、请求分页/显示字段及 `Code/Count/Data` 封套。独立Node标准fetch也成功；无签名、登录或安全SDK前置条件。

证据：`/tmp/ande-beisen-vivo-nav-dom-0.json`、`portals-dom-{0,1,2}.json`、`portals-body-18.txt`、两个phase manifest及`node-initial.json`。这里及以下省略路径前缀的材料均位于 **`/tmp/ande-beisen-vivo-`**。

**共享协议成立不等于默认条件可共用。** 讯飞所需Category渠道不能照搬到vivo；vivo广列表真实请求没有Category条件。历史custom虽注明北森，仍不能继承它的仅秋招限制、全职常量、日期回退或生产资格。

## 2. 广范围、项目/渠道与迁移

[校园首页](https://hr-campus.vivo.com/) 卡片和[广列表筛选](https://hr-campus.vivo.com/jobs)均给出以下目录。实际正常导航分别捕获对应请求与Count，扩展广列表逐岗项目字段统计完全相符：

| 维度 | 官方字段及值 | 观测数量/语义 |
|---|---|---|
| 招聘项目 | `ClassificationOne:2` 秋季校园招聘 | 138 |
| 招聘项目 | `ClassificationOne:1` 蓝极星计划 | 27 |
| 招聘项目 | `ClassificationOne:7` 日常实习生 | 70 |
| 招聘项目 | `ClassificationOne:8` 暑期实习生 | 18 |
| 招聘类别 | `Category:2` 校园招聘 | 165；招聘渠道，不是职能或全职性质 |
| 招聘类别 | `Category:3` 实习生招聘 | 88；实习招聘渠道，不自动证明校园/社会或用工性质 |
| 职位类别 | `ClassificationTwo` | 营销类、设计类、研发类、供应链类、公共类、产品运营类、市场类 |

目录来自正常 [`GetJobAdSearchConditions`](https://hr-campus.vivo.com/api/Jobad/GetJobAdSearchConditions)，请求 `PageId`及`displayFilters:["ClassificationOne","Category","ClassificationTwo","LocId"]`；返回明确 `Name/Value/Data.Text/Data.Value`，不是从字段名称猜意义。扩展广列表输出的是**中文名称**，不是这些目录数字。

首页[蓝极星·顶尖人才介绍](https://hr-campus.vivo.com/custom/4e9112c4-276c-89d8-094c-71c9b7ce46b7)明确称其为「面向全球高校顶尖技术人才发起的招聘专项」「公司最核心的人才战略方案」。其正常岗位链接 `/campus/jobs?queryId=58c79a4a-b0b7-45c9-8b4f-4bf2ae2a6d4c` 实际发 `Category:["2"],ClassificationOne:[1]`，Count27；不是更广人才全集，也不能用这条链接替换253的广入口。

[产品总经理储备计划公告/FAQ](https://hr-campus.vivo.com/custom/0f85345b-0def-62a6-b4e5-25c44167f025)也存在。没有证明它与具体posting的独立字段关系；当前广列表所有岗位只输出上述四项目。因此**蓝极星项目27可记人才计划true，其他226仍null，不记false**；不根据“秋招”或标题否定人才计划。

**范围迁移：** 既有 `crawler/lib/custom/vivo.js` 写死 `ClassificationOne:["2"]`，登记排蓝极星，并输出全职常量；未来既有key应迁到官网岗位投递的253广范围，不新增key、按个人方向删岗或仅取秋招。首次替换属于历史覆盖迁移，不把历史退出记录称官网下架。253仅指此已核公开门户，不宣称公司全球全集；社会源独立保旧。

## 3. 原生契约与严格双扫

官网 `/jobs` 原样请求（PageIndex从0开始）：

```json
{"PageIndex":0,"PageSize":20,"KeyWords":"","SpecialType":0,"PortalId":"","DisplayFields":["Category","LocId","HeadCount","WorkWeChatQrCode"]}
```

官网**未发送**职业/部门/地点/项目/渠道/关键词条件。`SpecialType:0`、`PortalId:""`是广列表业务参数，不擅自改写。首页卡片统计另用**非空**pagePortalId及四项目/两个招聘类别；不能把首页参数混入 `/jobs`。

只增加公开显示字段、不改变筛选的研究请求：

```json
{"PageIndex":0,"PageSize":20,"KeyWords":"","SpecialType":0,"PortalId":"","DisplayFields":["Category","LocId","HeadCount","WorkWeChatQrCode","ClassificationOne","ClassificationTwo","Kind","PostDate"]}
```

HTTP200，封套实际为 `Code:200,TipType:"Success",Count:253,Data:[...],Total:0`；**`Success`和`success`均不存在**，不可伪造为true；Count是列表总数，Total0不是空列表。必须校验业务Code、拒绝明确false成功标志、要求原生正确shape，不把未知对象/字符串Count当成功。

| 全扫 | UTC时间 | 页面/完整结果 |
|---|---|---|
| 原生第1轮 | 12:39:43.130—12:39:52.809 | 20×12＋13＝253 |
| 原生第2轮 | 12:39:53.511—12:40:02.302 | 同上；全部raw/顺序/ID稳定 |
| 扩展第1轮 | 12:46:17.537—12:46:27.243 | 同上；不缩小项目或类别 |
| 扩展第2轮 | 12:46:27.945—12:46:36.600 | 同上；全部raw/顺序/ID稳定 |

每页保存请求、HTTP、Code、原生Success缺失状态、TipType、Count、Total、页长、全部ID、时间、原始响应字节/hash；每轮检查稳定总数、唯一非空UUID、唯一正整数JobAdId、合法title/LocNames/Duty/Require、无重复页/ID、无提前空页/短页、无越过Count。上限50页而实际13页，不触顶；最后短页13恰好达到Count，不是以短页或“没有更多了”冒充全集。**网站第一页DOM确实显示“没有更多了”，同时API Count253；完整性必须靠API所有页。** 未另猜测隐藏封顶或未登记门户。

两组均同一ID SHA256：`34d23bdac3c88672a5b01205176f4b7bc4d1ac7f3788579bf6a93ca404e38a6b`。

- 原生两轮按UUID排序完整raw SHA256：`353bed3d81c8c9d64f45e794e247b81e0dbeef4241a70e3baccc1cf10a985eaf`。
- 扩展两轮按UUID排序完整raw SHA256：`068a8f5fe8d936e44623471d10bc93b302c55c928ea482d4e06bd7bf4e4682e8`。
- 原生→扩展逐岗只改变 `ClassificationOne/ClassificationTwo/Kind/PostDate/PostDateInt`；所有其他raw键和值完全相同。不是仅对归一化后关键字段做稳定性比较。

证据：`scans-manifest.json`、`expanded-scans-manifest.json`、`scan-r{1,2}-p{0..12}.json`、`expanded-scan-r{1,2}-p{0..12}.json`、完整jobs文件与`fields-proof.json`。

## 4. 字段准则：分维度，保留冲突

| 字段 | 可证明的事实/归一化准则 |
|---|---|
| `Id` / `JobAdId` | 253个唯一UUID与253个唯一正整数；是**不同身份字段**，不可要求相等。官网链接/详情query名虽叫jobAdId，实际传 **Id UUID**；详情同时返回同UUID与对应数字JobAdId。 |
| `JobAdName` | 官方岗位标题。 |
| `LocNames` | 官方工作地点字符串数组；业务renderer对LocId展示 `LocNames.join(",")`，保留海外地点和省市原文，不推断城市。 |
| `Category/CategoryId` | 招聘类别。2校园招聘→campus；3实习生招聘→campus/social维度null，不能从校园域名强推校园。 |
| `ClassificationOne` | 官方招聘项目名称；蓝极星计划→人才true，其余人才null；不用于过滤或猜性质。 |
| `ClassificationTwo` | 官方职位类别中文名→展示职能category；全部已匹配该站七项目录。 |
| `Kind` | 官方业务字段目录 `listsetting_showitem_pc_Kind:"工作性质"`/`Employment Type`。实际值是“全职”“实习”或空，不是数值。**仅Kind映nature：全职198、实习33、未知22。** |
| `PostDate/PostDateInt` | 官方业务字段目录 `PostDate:"发布时间"`/`Posted Time`，可选列表/详情renderer用PostDateInt格式日期＋`lang.publish`，支持有效PostDate→published。 |
| `ChangeDate` | 本轮与PostDate相等，但真实含义未证，不标published/updated、不作为PostDate回退。 |
| `Status:1` | 只观察到原生数值，生命周期含义未证；不由1推“在招/可投递”。 |

**真实冲突而不是错误纠正机会：** Category3的88条中，56条Kind“全职”、32条Kind“实习”；Category2的165条中，142全职、1实习、22空。`33572111…` 标题有“实习”、项目是日常实习生、招聘类别是实习生招聘，但Kind仍全职。必须保官网不同维度，不按标题、项目或渠道把已证Kind改成实习。`259d06ae…`是校园/蓝极星但Kind实习；`ec050c84…`算法标题的职能实际是设计类，照事实保留，不能“纠正”为研发类。

性质/日期字段在**当前默认UI配置未选择展示**，证据是官方可选字段目录及业务renderer，不假称样本页面可见这两个标签。扩展DisplayFields取得事实即可，不为补性质/项目/日期机械逐岗详情。

未增加PostDate显示字段时，原生列表253条均是 `PostDateInt:0,PostDate:"0001-01-01T00:00:00"`，Kind与两个Classification为null；这是显示字段未选，不能当实际日期或“后台无属性”。扩展后253均有有效发布时间；PostDateInt为毫秒，和PostDate的UTC+8本地日期/秒一致。两个PostDate含七位小数秒，不能只接受固定19字符格式；保原始精度，发布日可取可靠官方日期部分。字段缺失/0/0001哨兵留null，不用采集时间替代。

证据：`fields-proof.json`、`profile-final.json`、[公开业务语言目录app包](https://acdn.bstatics.com/ux/ux-recruitment-portal-2022/release/dist/app-4a8bcbf7a04a332d1605.chk.js)、业务字段/日期render模块及正常目录请求。研究早版 `profile-early.json`保留；其Category3性质建议已明确撤回，最终以Kind为准。

## 5. 完整正文是文本，不是HTML

253条Duty及Require均为非空完整字符串，职责/要求天然分开，不把同份全文重复放到两个匹配字段。

官网业务模块 **35993.D4** 的实际处理是依次解码 `&quot; → "`、`&#39; → '`、`&lt; → <`、`&gt; → >`、最后 `&amp; → &`。列表模块 **34934** 将 `(0,bt.D4)(e.data.Duty/Require)` 作为 **React文本children**，独立详情模块 **36868**同样将D4结果传为文本children；正文样式 `white-space:pre-wrap`。不是正文 `dangerouslySetInnerHTML`，不是先解实体再HTML解析。

**准则：等价五实体解码，再走纯文本空白处理；不能对Duty/Require无条件htmlText/剥标签。** Literal `List<T>`或HTML样式文字必须作为文本保留。当前253原文没有`<`或转义实体实例，包含正常原始`&`；处理规则来自明确renderer，不以“样本像纯文本”代替契约。9样本DOM `textContent`与经D4等价处理的列表字符串逐字一致，CMF样本`2D&3D`保留；DOM innerHTML中的转义只是文本节点序列化，不证明输入为HTML。

公开业务来源：列表loader [pc-job-list](https://acdn.bstatics.com/ux/ux-recruitment-portal-2022/release/dist/pc-job-list-5e73bfeb98b6e78d8426.chk.js)；正文模块保存在 `modules-list.json`、`modules-detail.json`、`modules-text-renderer.json`（对应正常加载chunks4934/6868/3524）。仅定位业务正文/字段/链接函数；共打包路由模块含无关分享SDK代码，未研究/执行其签名、SDK或验证逻辑，未请求相关SDK接口。

**空正文：** 本次没有官网空Duty/Require岗位。renderer有空文本不展示章节的条件，但没有真实空岗可核，不能凭此设宽泛“空JD合法”豁免；以后遇缺失/shape变化仍须失败保旧。`jdComplete`是已取得官网全文，不保证招聘方内容详尽。

## 6. 官方深链与9个独立样本

“统一秋招列表页／无独立详情URL”的历史注释不成立。正常**物理点击**实习岗“查看详情”打开：

- CategoryId3：`https://hr-campus.vivo.com/intern/detail?jobAdId={IdUUID}`。
- CategoryId2：`https://hr-campus.vivo.com/campus/detail?jobAdId={IdUUID}`。

业务detailUrl函数使用**CategoryId＋Id UUID**，两条路径在全新匿名profile中直接打开均显示对应官方全文；不需列表路由state、登录或投递。未证明其它未知类别深链，不能自动套模板。

正常详情页自动GET [`GetJobAdInfo`](https://hr-campus.vivo.com/api/JobAd/GetJobAdInfo)，query为UUID、`category=2/3`及 `displayFields:["jobAdName","Duty","Require","Category","LocId","HeadCount","WorkWeChatQrCode"]`。返回Code200、Data岗位对象；Count0是此对象接口封套，**不能把详情和列表shape混用**。浏览器通常自动请求两次同一详情；本轮没有手动盲重试或全253详情。

| UUID（链接可直接打开） | 样本/代表性 | Duty＋Require字符 |
|---|---|---:|
| [33572111-23f9-49bf-a0df-70f0e841ee51](https://hr-campus.vivo.com/intern/detail?jobAdId=33572111-23f9-49bf-a0df-70f0e841ee51) | GNSS，日常实习渠道/Kind全职冲突 | 246＋245 |
| [099b8796-e5d2-46b5-b00f-492c464e188c](https://hr-campus.vivo.com/intern/detail?jobAdId=099b8796-e5d2-46b5-b00f-492c464e188c) | 税务，公共类非技术 | 262＋72 |
| [ec050c84-9ce8-43da-ab56-0005128c1b77](https://hr-campus.vivo.com/campus/detail?jobAdId=ec050c84-9ce8-43da-ab56-0005128c1b77) | 蓝极星Agent，官方设计类/Kind全职 | 803＋482 |
| [611a6cbb-f7d9-425f-adf0-abcc40ae0dae](https://hr-campus.vivo.com/campus/detail?jobAdId=611a6cbb-f7d9-425f-adf0-abcc40ae0dae) | 秋招CMF，含真实原始`&` | 209＋231 |
| [29abda9c-3329-496f-90b5-2b197d99fc23](https://hr-campus.vivo.com/intern/detail?jobAdId=29abda9c-3329-496f-90b5-2b197d99fc23) | 暑期实习/供应链类/Kind实习 | 368＋149 |
| [a0ed7424-a16d-41f9-9a8d-640afd8b71d9](https://hr-campus.vivo.com/intern/detail?jobAdId=a0ed7424-a16d-41f9-9a8d-640afd8b71d9) | 博士暑期实习项目/Kind全职冲突 | 502＋218 |
| [259d06ae-b825-40bf-aca5-1162ce250683](https://hr-campus.vivo.com/campus/detail?jobAdId=259d06ae-b825-40bf-aca5-1162ce250683) | 校园蓝极星/Kind实习 | 849＋530 |
| [56a27068-21eb-4822-866b-7075c06eb8ad](https://hr-campus.vivo.com/campus/detail?jobAdId=56a27068-21eb-4822-866b-7075c06eb8ad) | 蓝极星/Kind空→未知 | 370＋244 |
| [fa864e61-ee1c-46f9-9a39-27979e4f5a7c](https://hr-campus.vivo.com/campus/detail?jobAdId=fa864e61-ee1c-46f9-9a39-27979e4f5a7c) | 交互设计，最长JD1732字 | 1588＋144 |

9份独立详情均与列表的UUID、数字JobAdId、标题、Category/CategoryId、地点、Duty、Require逐字段相等，18段DOM全文逐字一致；仅9个代表，非253份详情验收。`sample-checks.json`包含样本数字ID与每个详情raw文件位置；原始DOM、节点、截图及请求保留在`samples-*`。

## 7. 社会源另套协议，保持历史

官网首页/招聘首页「社会招聘」仍指[hr.vivo.com/jobs](https://hr.vivo.com/jobs)。正常页面仅观察默认第一页，实际 POST [`/api/social/webSite/portal/page`](https://hr.vivo.com/api/social/webSite/portal/page)：`city_code_list:[],company_id:1,group_id:1,user_id:null,job_category_id_list:[],keyword:"",max_results:10,page:1,yoe_list:[],loading:true`。

响应是 **`code:0,success:true,data:[10条],meta:{page:1,total:131,page_count:14,max_results:10}`**，不是校园的Code/Count/Data、分页也从1开始。与原 `crawler/lib/custom/vivo_social.js` 的独立社招部署一致。**未分页、未社源全量采集、未补详情/更新/晋升**；131只是当次官方计数，不声称已取得131。证据`detail-dom-3.json`、`detail-body-26.txt`、`detail-manifest.json`。

## 8. 原材料、失败留存与环境清理

主索引 **`/tmp/ande-beisen-vivo-materials-manifest.json`** 逐文件记录时间、字节与SHA256（不将自身纳入递归hash）。关键文件：

- `profile-early.json`、`profile-final.json`：早期/最终研究profile，**不授予生产资格**。
- `scans-manifest.json`、`expanded-scans-manifest.json`及全部页/raw：严格双扫时间/页统计/原生status/hash。
- `fields-proof.json`、`sample-checks.json`：显示字段无筛选变化、字段/日期和9份详情/DOM对照。
- `nav/portals/detail/deeplink/filters/samples-*-dom/manifest/body`：第一方正常导航、请求、响应与DOM；业务renderer模块与原始public包另存。
- `early-failures.json`：错误路径ENOENT、本地scratch SyntaxError、早期弹窗点击未打开、一次时间小数精度本地assert失败均保留，未掩盖。后者仅修正离线比较精度，无HTTP重试；真实PostDate两条含7位小数。
- `network-cleanup.json`、13份Chrome Default NetLog与每次phase manifest：外连、实际进程/profile/端口及finally清理。

**网络披露不是“零外连”：** 独立Chrome154复用`/tmp/ande-bytedance-cdp.cjs`，临时副本只调整自有profile前缀和启用Default NetLog；未改UA/指纹/TLS、忽略证书或配置新代理。macOS本就启用HTTP/HTTPS系统代理`127.0.0.1:1082`，Chrome正常继承；这是既存环境，不是本任务启动的代理，未修改或关闭。Node25.8标准fetch不启用环境proxy dispatcher，不自设UA/TLS，54次手动列表POST（初核1＋原生26＋扩展初核1＋扩展26）及6次公开业务renderer GET正常完成。

- **页面网络（CDP观察到的主page）：** 3834个HTTP(S)请求尝试，3814有200—399响应。包括vivo站、静态CDN、北森资源，以及官网自动发出的百度统计、italent日志、vivo遥测；并非3814条岗位API。新弹窗未逐一附加CDP，覆盖限制由全browser NetLog补充，不能说CDP就是全部外连。
- **浏览器/自带扩展后台（NetLog，非页面URL且无网页initiator）：** 233次URL请求尝试，217收到HTTP响应头，其中216为200—399，另1次android.clients.google.com为429；16次无响应头，不假称成功。目的域为clients2/accounts/www.google.com、www.gstatic.com、update.googleapis.com、dl.google.com、content-autofill/optimizationguide-pa.googleapis.com、android.clients.google.com。即使设置disable-background-networking，后台仍真实外连；未手动调用/重试这些服务。
- **底层连接：** NetLog记录602次TCP_CONNECT_ATTEMPT begin、593次end且无显式net_error。它只证明实际传输连接（Chrome经既存系统代理），不能冒称直连各远端；URL尝试、HTTP成功及TCP连接数不是同一统计。
- **正常资源失败：** 一个视频请求导航时取消；filters阶段9张图片出现ERR_TUNNEL_CONNECTION_FAILED，未脚本重试图片。岗位列表/详情均正常HTTP200/Code200，无目标ATS业务拒绝；不存在被拒后绕过/盲重试。浏览器自动重复详情/资产请求如实保留。

13次Chrome均在finally `Browser.close`，必要时终止进程并删除profile；临时CDP helper文件均删除。清理后逐个核ps、profile目录及真实debug端口：**63032、63258、63774、63992、64191、64274、64389、64615、64846、65105、65232、65414、49314**，均无占用；自有Chrome/helper进程、profile和运行时helper文件残留均0。没有启动本地server或proxy。材料中的研究脚本是静态证据，不是常驻helper。既存系统proxy继续受保护，不纳入本任务“应杀死”的自有资源。

**后续边界：** 父可据最终profile做最小共享设计/离线验收，但必须经唯一安全链重新取得生产候选、再同版本页面验收；不得直接使用本轮研究raw/manifest发布，不由北森共享或253成功自动放行其它来源。`vivo_social`保旧。
