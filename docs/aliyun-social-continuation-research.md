# 阿里云社招续处理：当前一手协议与补齐边界

2026-10-09 UTC。§1–6保留前期离线研究时点；§7追加父级实际执行、结果与未完成目标。仅 `aliyun_social` 离线研究；官网网络由父级独占。本代理只解析已保存 JSON、读取业务 JS 文本，不执行厂商 bundle，不请求官网、不运行采集/发布、不动生产 out/Git/公开数据，仅写本文。旧 [核心研究 §7](ali-social-core-verification.md#7-阿里云-run2驱动修后唯一正常重跑追加保留-run1-原稿) 是历史材料，不授本轮资格。

## 1. 先纠正状态与结论

- 旧“500/1”是 JSON `content.pageSize:500,currentPage:1`，**不是 HTTP500**。旧 total677、第51页提前空均是 HTTP200、`success:true`；覆盖不足，不是官网拒绝。
- 本轮首次 `?lang=zh` Document 正常302到无 lang 地址；私有导航 guard 在新地址发送前拦住，不能记官网拒绝。第二次以已经观察到的 canonical `https://careers.aliyun.com/off-campus/position-list` 正常 GET200，原生列表 POST200、业务成功、`totalCount:670,datas.length:10,pageSize:500,currentPage:1`，`apiObserved:true`。最终 DOM 地址带 `?lang=zh`，不改变上述 Document 收据。[N0,N1]
- 父级另用正常匿名 Node 已保存 pageIndex1/50/51 的响应：分别10/10/0条，三者 HTTP200、业务成功、total670、响应500/1。**本报告看到的是边界探针，不是500个唯一岗位或670全集。** [P]
- 当前目标仍是补齐这一中文空筛选公开社招范围；不把 A Star、管培生、校园或 Global Hiring 自动合入。当前 `scopeComplete:false`；本离线研究本身不生成候选或授 `available`（研究资格仍 false）。父级最新决定可先独立接入可用增量，再继续补670目标；即使随后经唯一链取得 `available:true`，也不等于全集或原目标完成。

## 2. 页码、页长、计数：远端分页，响应 metadata 不是 UI 页码

当前实际加载业务资源是 Cloud 自己的 `aliyun-new-careers-portal/0.0.1`，不能继承其它阿里门户 renderer。当前匿名 JSON body 为：[N1 `/26/request/body/value`]

```json
{"channel":"group_official_site","language":"zh","batchId":"","categories":"","deptCodes":[],"key":"","pageIndex":1,"pageSize":10,"regions":"","subCategories":"","shareType":"","shareId":"","myReferralShareCode":""}
```

当前文本可追到完整调用链：[R]

| 位置（UTF-8 字节区间，0起、右端不含） | 实际行为 |
|---|---|
| R `492382–494337`：`Hs`/`OffCampusPosition` 状态与 `V` | 请求状态默认 `pageIndex:1,pageSize:10`；每次条件改变调用 `Is.p({...u,shareType,shareId,myReferralShareCode})`，不是预取全部后前端 slice。响应 `e.datas` 直接存为当前页。 |
| R `494337–494933` | 类别 JSON `code/name/categories` 转为原生 Tree 根/子节点；不是按岗位标题生成类别。 |
| R `504559–505001`：pagination | `current:p` 的 p 来自**请求状态** pageIndex，下一页只改请求 pageIndex。`PaginationDate=Math.ceil(e.totalCount/A)`，A 是前端固定10，再以 `total:10*P` 交给原生分页组件。DOM 因而显示 `1/67`。 |
| R `97286–97880`：`FR4QU...` API 模块 | `Is.p` 对应正常 `POST /position/search`；category/list、region/hot 走同一列表 channel 函数。 |
| R `41145` 起（字符 offset）：request wrapper | HTTP200 后读取 `success/errorMsg/errorCode/content`；成功返回 **content 本身**。这里没有把500条 slice 为10、修改 total 或 metadata。 |

**判断：**此页面逐页发远端请求，并没有把 `currentPage:1,pageSize:500` 当作 UI 当前页/页长；它也不把 total 截到500。page51空已经在原 API JSON 中，不能归因于 UI 隐藏后177/170条。结合旧/新边界，协议表现与“远端最多可翻的500窗口”一致；**尚无服务端实现证据，不能断言内部一定先查询500再切页、硬上限永久为500或哪些条件可解除。** metadata 500/1 是保留的原事实，不能擅自重写为10/51，也不能要求它必须回显请求。

`totalCount` 的已证语义只到“**该次筛选响应报告的岗位计数**”：同一个值用于页面「在招职位共670个岗位」及页数。当前前端没有另行按唯一ID计算它、按 open 状态重计或解释其去重/后台窗口算法。故670不是取得量，不是法律雇主全集、可投成功数，也不能单凭“唯一数恰等670”签完整；须结合请求范围、每片取得、身份、重复与覆盖证据。[N1 DOM `text`；P；R 上表]

### 列表与 bootstrap/detail channel 必须分开

R 字符 `135421–135562`（字节 `136751–136892`）的 `C(e)` 读取 `window.__sysconfig.channelCodeMap[e]`；R 字符 `137293–137556`（字节 `138623–138886`）的 `F(e)` 则把中文 offCampus 列表固定为 **`group_official_site`**，英文为另一 channel。R API 模块 `/position/detail` 使用前者 `o.f`，列表/category/hot 使用后者 `o.k`。旧本站实际 bootstrap 与三个详情请求给出的 offCampus 为 **`aliyun_group_official_site`**；这不是可互换的别名。[R；H1–H3；H4 `channelCodeMap`]

不得换 channel 求数量、猜未观察接口，亦不得用英文/其它品牌门户作中文默认范围的补证。当前 API 38个原字段含 `isLingYang`：新 page1十条全 false，page50十条全 true，不是全部null；它是原生事实，不是删岗条件或法律雇主证明。[P `/pages/{0,1}/response/content/datas`]

## 3. 正常公开筛选及至多两个可验证方案

### 已证控件，不把热门字典当全集

- PC 空筛选入口只有关键词、职位类别、工作地点、清除和页码；这个 `Hs` 组件没有排序控件、排序请求字段或页长选择器。清除恢复 `key/categories/subCategories/regions/batchId` 为空、`deptCodes:[]`、page1/10；空关键词仍走同一 search 请求。组件中的关键词高亮只改变展示 name/workLocations，不产生新全集来源。不能把全bundle中其它页面的 `.sort` 当社招排序协议。[R 字符 `468245–483700`；清除字节 `498378–499605`；N1 DOM]
- 类别选择必须点**复选框**，不是仅点“技术类”文字/展开箭头。父保存的文字点击材料没有新的 position/search，不能称筛选已生效。[N2]
- 原生 Tree 使用 `selectable:false,checkable:true`；当前 vendors 默认 `checkStrictly:false,checkedStrategy:"all"`，勾根节点会向子节点传播。业务 `onCheck` 从 `checkedNodesPositions.pos` 找根类别，将根 code 放 `categories`，从子选中 keys 中移除根 code，再把余下子 code 放 `subCategories`，回 page1。**只勾“技术类”根复选框应由官方 UI 自己生成130及其18个子码；不能仅发送手造 `categories:"130"` 冒原生操作。** [R 字节 `498378–499605`；V 字节 `3374288–3376079`,`3383359–3383458`]
- 新 category/list 是9根、101个子节点，均有明确 code/name；但返回字典并未声明每个岗位必须归入其中。当前岗位 `categories:null` 是展示字段缺值，**既不能证明它必为未分类，也不能证明它已属于某个索引分类**。子类“其它”（180）只是综合类下一个具名分类，不是“无分类”补集。[N1 `/22/nativeJSON/content`；P]

| 根类别 | 官网 code | 子节点数 |
|---|---:|---:|
| 技术类 | 130 | 18 |
| 产品类 | 97 | 4 |
| 运营类 | 103 | 20 |
| 设计类 | 112 | 5 |
| 数据类 | 143 | 3 |
| 市场拓展 | 124 | 6 |
| 销售类 | 152 | 16 |
| 综合类 | 157 | 12 |
| 客服类 | 117 | 17 |

- region/hot 只给杭州/北京/上海/广州/深圳/成都/重庆/南京/武汉/中国香港10个热点。`+更多` 是 `showSearch` 下拉，`onSearch` debounce800ms 后调用正常业务 `/region/search`，body `{key:输入}`；业务文本用 **bootstrap/detail channel 函数**，不是hot的列表channel函数。当前资料没有其一次真实请求/完整地域响应；按词查地点不是穷尽地域字典，也未提供“不限/无地点”补集。[N1 `/23/nativeJSON/content`；R 字节 `500144–501092`]
- 多地岗位可跨地域查询重复；海外、不限/空地点、无分类未有强制分区证据。现有地点/类别 controls 没有已证补集或“不选某类”协议。**热门城市并集、9分类并集、关键词品牌并集都不能预先声称全集。**

### 有界方案（父级网络验证；本代理未执行）

1. **清除＋原生下一页边界验证。** 从正常中文空筛选页面清除，再用原生页码到50/51，保存实际 POST/JSON/DOM。已得 Node 探针可支持协议诊断，原生 UI 用来核它是否也显示67页却在51空；空页仍total670则保覆盖缺口，不改页长、排序或channel反复尝试。本方案能核边界，不能补后170条。
2. **九根类别原生复选框的有界补收。** 先清除，勾一个根的复选框，等待并保存官网自动请求，核该根所有子码如何写入；再在空关键词/无地区/无其它限制下，逐个9根独立完整翻可得页，以官方ID合并新增，保所有默认已得岗。若某根本身仍超过窗口，只沿**已可见且有官网code的该根子复选框**作下一层分片，不无限猜组合。各片保其原生total/空页/重复；字典前后核变动，不能只求计数相加。正常 UI 全勾9根与“清除”的计数/ID关系可以检查，但仅相同total、仅分片union达到670、或类别显示null，都不足以消除未分类/树外范围疑问。若无法闭合，仍写已补数量与具体缺口、`scopeComplete:false`，继续原目标而非以partial收尾。

关键词空值只恢复默认范围，不是另一穷尽方案；官网“瓴羊/诚云科技”入口是关键词查询，不保证标题品牌词覆盖每条岗位。地点 More 即使正常搜出海外选项，也只能证明这些选项可选，不能冒完整分区。本轮不建议增加其它猜测渠道/接口/排序。

## 4. JD renderer：普通 TEXT，而非 HTML 清洗

当前中文社招详情 `Hd` 从 URL `positionId` 调 `Is.c({id:e.toString()})`，响应存 `dataSource:d`，实际主正文调用 `Vu/Uu({dataSource:d})`；`similarPositions` 单独交给推荐岗位组件，不是本岗额外JD。[R 字节 `587561–588890`,`597874–597959`]

`Uu`（R 字节 `557171–558791`）确切配置：

```text
basicInfoList: 所属部门 / 学历 / 工作年限
blockInfoList:
  职位描述 → t.description ?? ""
  职位要求 → t.requirement ?? ""
```

它把配置交给 module `aWBEr5an/hFUqvb7BTQU4Q==`；当前 vendors `renderBlockInfo`（V 字节 `3399007–3399482`）逐块实际调用：

```js
m.default.createElement("div", {className:"main block-info"}, e.value)
```

**不使用 `dangerouslySetInnerHTML`、HTML parser 或实体解码，也未做摘要/截断/内部空白折叠。** 因而 `<T>`、`&lt;`、`&amp;`、内部换行/空格属于值本身，应按TEXT保留。不能因为其它列表组件对标题/地点使用 `dangerouslySetInnerHTML` 就把两栏JD改为HTML。description是此入口的“职位描述”独立栏，requirement是独立“职位要求”；不把两者合并再伪填全文/职责，不消除两栏同文。[R；V]

历史本站一手100015743004详情 JSON 与 DOM `blocks[0/1].textContent` 两栏可程序逐字符相等，`blocks[].whiteSpace:"pre-wrap"`；DOM `innerHTML` 中的 `&amp;` 是原文本 `&` 经React转义，不意味着须对API文本再解实体。[H3,H4] **pre-wrap 是历史实测；本轮列表 DOM `blocks:[]`，没有新详情 computed style 实测，不冒新浏览器详情验收。** 另两代表旧详情与旧列表/DOM相等是历史抽样，不代替本轮全岗字段检查。

当前这条中文主renderer未读取第三个JD字段；职位推荐、申请须知、登录/投递流程及申请问题不是本岗JD。当前观测原生38字段与上述两栏支持最小TEXT解析；但新响应出现未知额外非空JD字段/结构，仍须记录并重新核renderer契约，不能靠旧“空/null正文例外”吞掉。非空bool `isLingYang` 已实际观察，不能误当未知JD/要求null；空/null合法性与缺字段/非法类型仍分别检查。`modifyTime` 明确渲为「更新于」，未证明source唯一日界或publishTime发布日期语义，不以采集钟/猜UTC8补日期。[R 主renderer与 API；P]

## 5. 品牌、身份、链接：不推法律雇主/可投

- 历史集团官方导航配置 `https://fc.alibaba.com/0.0.7/default/recruit-page-home.json` 的 `body.mainCompanies.businessList[0]` 明确 `title:"阿里云",link:"http://careers.aliyun.com"`。当前正常 HTTPS 页标题「阿里云社会招聘」，footer链向阿里云官网/集团招聘官网；这证明入口品牌连续，不证明每岗法律雇主。[H5；N1 DOM]
- 当前业务社招首页公开文字「关联公司瓴羊职位」「查看诚云科技职位」，处理器只去同门户 `/off-campus/position-list?search=瓴羊`/`?search=诚云科技`（R 字节 `488584–489136`）。默认新首页已有“诚云科技”原生岗位，新page50含 `isLingYang:true`；不能按标题/flag把关联岗位排掉或自动改登记公司。社会入口只证来源渠道，不把全职、计划false、open状态或法律归属补造。[P；R]
- 正常列表点击**直接 `window.open(e.positionUrl)`**（R 字符 `477960–478208`附近）；当前原生 positionUrl 为相对 `/off-campus/position-detail?positionId=…&track_id=…`，不是要求“原始必须绝对URL”。应以已证本站origin安全解析，绑定无凭据/fragment、精确detail path、`positionId===String(id)`、列表 `track_id===trackId` 与允许query；保原始相对值在证据，公开链接保官方意义，不整字段丢tracking或把GP展示码冒id。当前探针20个链接均可如此绑定；不是全源或跨源ID唯一性证明。[P]
- 主详情以 positionId/id读数据，tracking另进收藏/投递归因，分享URL由origin/path/positionId构造；只读代码，未执行收藏/申请。历史100015743004详情原生id与独立GP code也不同。[R `Hd`、`Ju`；H3]
- 按钮存在/未禁用、页面「在招」计数、列表status:null，都不证明实际可投。研究不登录、勾须知、点击申请或验证真实投递。

## 6. 可复核材料索引（本机，不冒持久快照）

路径别名：

- **W** `/Users/nozomi/lab/wheres-my-job-work/third-batch-20261008T071347946Z`
- **D** `W/aliyun-continuation-20261009T035048447Z`
- **N0** `W/observe-aliyun-continuation-20261009T035048447Z/{network,report}.json`：network `/1/redirect` 为旧入口302；report是private guard停止/API未发/清理事实。
- **N1** `W/observe-aliyun-continuation-canonical-20261009T035048447Z/{network,dom,report}.json`：network `/0` Document200，`/11,/12` 两业务bundle200，`/22` category/list，`/23` region/hot，`/26` position/search（CSRF脱敏）。report清理 `chromeExited/profileRemoved:true`。
- **N2** `W/observe-aliyun-category-20261009T035048447Z/{network,dom,report}.json`：类别文字点击未证新search。
- **P** `D/normal-probes.json` 的 `pages[0..2]`；独立收据 `002-aliyun-normal-probe-1.json`,`003-aliyun-normal-probe-50.json`,`004-aliyun-normal-probe-51.json`。bootstrap收据 `001-aliyun-bootstrap-canonical.json`。
- **R** `D/aliyun-current-renderer.js`；原URL `https://g.alicdn.com/platform/aliyun-new-careers-portal/0.0.1/aliyun.min.js`；HTTP收据 `D/001-aliyun-current-renderer.json`。
- **V** `D/aliyun-current-vendors.js`；原URL `https://g.alicdn.com/platform/aliyun-new-careers-portal/0.0.1/vendors.min.js`；HTTP收据 `D/002-aliyun-current-vendors.json`。

R/V offset指**当前落盘脱敏文本**，不是HTTP bytes或历史bundle offset。Python字符offset特注明；其余为0起UTF-8字节区间。当前文本SHA256分别：

```text
R 18a7a6ce5c9f51f20440dd672ec427021031ecebd2b6479ac2728a45dbc43096
V f599631899e3a1811a0662c34f6ddcfb6f7dbcf3b9a24f07ba43fb6023c503d1
N1/network.json 04a14d75e989b0b8b126c1c46ca73bb22bd53b2d6b1dddb2f4a5fbe6d2fc6a3e
P fb495c4914aaddbe147fe67e776cf2f0aafc5dcf1703d61b06a0c6b07c3ca8fe
```

历史原生材料从归档 **A** `/Users/nozomi/lab/wheres-my-job-archive/tmp-20261008T070143Z/ande-tmp.tar.gz` 流式按成员读入内存；未解整包、未写额外文件：

| 引用 | A内精确成员（正常 POST `https://careers.aliyun.com/position/detail?_csrf=[REDACTED]` 的content或对应DOM） |
|---|---|
| H1 | `ande-ali-social-cloud-run2/aliyun-detail-100005043007-body-5677.345.json` |
| H2 | `ande-ali-social-cloud-run2/aliyun-detail-100002983003-body-5677.441.json` |
| H3 | `ande-ali-social-cloud-run2/aliyun-detail-100015743004-body-5677.538.json`，SHA `241a97643a03877965833abcad932c31ce86c8c4c3ce3e82d09788ac8be19770` |
| H4 | `ande-ali-social-cloud-run2/aliyun-detail-100015743004-dom.json`，`blocks[]`与`channelCodeMap`；SHA `d425db1fc4209aa789cf55f583b12169e1c5519060f86773bbb37f418ebf81a5` |
| H5 | `ande-ali-social-core-run/alibaba-zh-nav-config-eval.json`，上述官网config URL/HTTP200/body |

旧 `aliyun-detail-comparison.json` 与 `aliyun-renderer-proof.json` 只辅助定位；正文语义来自本轮R/V及所读历史原生content/DOM，不把旧报告结论当本轮资格。截至上述离线研究时点，父级后续采集/发布尚未完成；后续真实执行见下节，旧观察/失败收据不倒改。

## 7. 父级实际采集、独立可用接入与残差（2026-10-09）

### 7.1 授权及默认500

用户“那我们再次尝试处理它吧”仅恢复阿里云正常匿名研究/采集和现有唯一链本地接入；腾讯、存储/加载、Git/部署继续挂起。冻结49,882岗/65有数据源及197非目标out SHA/纳秒mtime；不恢复退出的175条初版遗留。

正常隔离Chrome原生默认请求与精确中文广body相等。类别文字只展开、错误地点checkbox祖先及canonical发送前guard是工具问题，不是官网拒绝。本轮正常Node/自有Chrome没有HTTP或业务拒绝，不登录/操作验证/伪装或注入厂商签名；匿名CSRF/Cookie仅内存，材料脱敏。Cloud自己的当前业务JS文本直接证明两栏React TEXT，不执行bundle，也不借七源renderer资格。

默认51页取得500唯一岗，官方total670，第51页HTTP200/success但空，metadata固定500/1。独立`availableSource(site)`授Cloud精确available路径，profile仍不qualified；七源完整v1/双扫/页长metadata不变，Cloud不能冒ready/complete或缺证零。500岗在唯一update→crawl→可发布snapshot→publish链本地先发布，49,882→50,382，真实资料钟`2026-10-09T04:13:28.820Z`；缺口未因此结束。

### 7.2 正规子筛选补169，仍差1

实际正常Chrome通过Tree复选框分别证明9类别根及其原序101子码、10热门地点的真实请求；Node前后字典相同。各根报告总数353/43/15/4/3/105/15/39/0，合577；hot地点为杭州454/北京270/上海123/广州27/深圳88/成都19/重庆5/南京9/武汉8/中国香港1，多地交叠不求和冒全集。另按可见关键词输入＋Enter证明官网菜单词“瓴羊”（23）/“诚云科技”（56）。这些只是默认广范围子查询，不反推单岗类别/性质/法律雇主。

前9类＋10hot＋瓴羊共189页，默认500与这些材料并集669；诚云7页无新增，补收累计196。More正常搜索西安证明独立`POST /region/search`、body `{channel:'aliyun_group_official_site',language:'zh',key:'西安'}`、code610100；真正列表仍`group_official_site`、regions610100。清空More输入响应[]不是全地域字典。西安2页11唯一、全部已在669中，未发送第3页。除西安无越界空终点外，各子扫描到空，slots/unique等自身total、片内无重复；并集不能据此签完整。

另有同正常匿名空筛选pageSize500/1000各一次有界粒度诊断，均返回500条/metadata500/1/total670；不纳可用协议、不换channel/身份或客户端。**补收阶段正式列表请求200＝196可用页＋2粒度诊断＋2西安页，达到保护后停止官网网络，未自动开新阶段绕限额。** v3嵌198可用新页，另完整嵌默认51页。全阶段Node收据269请求＝267×200＋2×302，其中列表254＝默认51＋边界探针3＋补收200；最小START200ms、正文重叠0。Chrome官网自动流量另披露，可能并发，不混入Node串行计数。

669条跨材料除具体tracking外无raw事实冲突；boolean isLingYang为646false/23true，只是raw事实。9类别之外已观察92岗，不推其未分类或所属雇主。**默认官方total670与实际并集669仍差1，缺失身份及原因未定位。** 未证明远端500窗口实现、计数误差/动态变动、分类/地域索引关系、最后1下架或需要登录；不得复制已得ID凑数。用户随后“继续”，父级仅离线扫描385份本轮JSON，共10,853个原生行出现（含正常UI/探针/粒度诊断及重复证据）；所有保存响应的Native ID并集同样669，无已观察但未合入候选的ID。可排除这些已保存材料漏合并，不能证明未记录响应或未知第670条。原补齐/完整性目标仍未完成，继续网络须明确下一阶段具体正常动作与有界预算，不自动重开本阶段。

### 7.3 v3及唯一链本地结果

`collectCloudSupplemented(baseV2,site,{baseCompletedAt,categoryEvidence,regionEvidence,regionSearchEvidence,scans,issues,stopped})`只v2→v3一次；各独立dictionary/request/status/业务/ID/URL/raw复验，新页合计≤200，允许真实partial，始终available。类别/hot与More独立channel协议不互授资格，两固定菜单词仅改key。嵌旧证据/停止/500资料钟；**base-first/new-only**只追加169，不覆盖原500的raw字段、原标题/两栏/metadata/原URL。默认CLI仍新收v2、不自动读旧out续采；七源旧v1不变。

`2026-10-09T05:09:26.526Z`唯一链本地发布：50,382→**50,551**，66个有数据源＝37ready＋29available；阿里云669，成功资料钟`2026-10-09T04:57:16.455Z`，不是发布钟。0发布期官网请求；逐字段保护旧500、49,882非目标岗、65非目标source、197非目标out SHA/纳秒mtime及39公司/阿里unitMemberships。岗位date/dateKind未知、两独立TEXT字面/空白保真，`jdComplete:false,complete:false`；数量差1写入source issue，不冒实际可投/全部JD核完。

当前canonical117,191,579字节，SHA `77d4f62c52fe0b1cc3835900f846550c15895714d29a6546d22993865a321032`；catalog SHA `0c01325761e099d3cb7d17fda0ae94b176063f5fc7b2cd2c2b9800881e7d4dbe`。**150活动分片**逐字段/hash/count与50,551 canonical相等；148是Cloud前历史，不沿用。HTTP显示单位阿里云886＝独立社会669＋原阿里校园归属217，886结果完整ID集合相等，不合source或复制机会。

### 7.4 回归、安全复核与页面边界

只读复核发现两个静态反例，现有669未观察到相应泄漏/丢文：Cookie轮换后旧发送值可能从jar消失而被响应回显；原生非空duty/requirements曾借client alias白名单绕过额外JD检查。最小修复仅Cloud：敏感Cookie旧/新值历史纯内存，响应含任一值则不落正文；原生非空额外JD alias拒记录并披露，null/空字符串不造文字，七源旧行为不变。两项离线回归先红后绿；669 jobs及证据2171个datas槽均无非空额外两alias，不改生产资料/钟。

核心59/59通过；最终全套**622＝614pass/0fail/8旧可选skip**，并发2、70.48秒，启用真实Workday capture仅离线复验，没有腾讯网络。旧620项的过时“Cloud零dispatch”断言失败收据保留，按新独立available/禁止complete修正；不是官网故障。首次活动片checker未初始化ANDE_CHUNKS、保护checker误把登记对象当数组、把详情metadata误套列表合同，均为离线工具错误，原日志另保；分别修工具后通过，没有官网拒绝/重采或改公开数据求绿。当前首条100015423004详情标题/两栏与列表逐字相等，差异仅tracking及所属部门metadata；该详情合同不借列表门禁自动授资格，不以单代表推全源JD完整。

本地HTTP六项检查涉及**5个不同岗位**：原500、新169首尾、字面TEXT、多地/海外；第1和第5是同ID的不同检查。标题/独立两栏/已得全文、原官网链接、dirty保旧、首屏无JD预取通过；外部请求/runtime/console错误0，Chrome/profile/server均清理。只证HTTP上述范围，不冒file、线上、全集、全站性能或语义验收。

本轮仅本地，未commit/push/部署，HEAD仍f29e579。Git普通单文件100MiB无损处理及查询性能/预载未擅改；腾讯21URL的正文缺口仍挂起，不把本轮Cloud可用成果冒其完成。

### 7.5 实际材料索引

仍用§6的D（本节称A）目录：

- 冻结/默认：`before.json/before-data.js`、`normal-probes.json/paging-red.log`、`default-collection.json`、`field-shapes.json`、`default-publication.json/default-publication-check.json`。
- 原生UI：`category-native-ui.json/location-native-ui.json`及`observe-check-*`；菜单词`observe-keyword-lingyang/observe-keyword-chengyun/`，More为`observe-more-select-xian/`；工具失败日志及清理report保留。
- 补收：`filter-collection.json/filter-counts.json`、`chengyun-collection.json`、`reported-size-500.json/page-size-1000.json`、`xian-collection.json`、`combined-facts-shapes.json`。
- v3/唯一链：`supplemented-candidate.json`、`publish-supplemented.cjs`（**已执行，不重跑**）、`supplemented-publication.json/supplemented-publication-check.json`、`publish-supplemented.log`。
- 验收：`tests-full.log`旧失败、`tests-full-final.log`首次612pass、`review-guards-red/green.log`、`tests-full-reviewed.log`最终614pass、`page-smoke.json`、`final-data-check.json`、`offline-union-audit.json/offline-union-audit-list-validated.json`、`audit-observed-union.cjs`、`final-protection-check.json/final-static-check.json`、`final-check-initial-driver-error.log/final-protection-driver-schema-error.log`及最终handoff。收据不是临时runner持久存储或未来自动访问授权。
