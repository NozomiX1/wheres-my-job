# 阿里共享社招：淘天／饿了么／钉钉／夸克第一方研究（v0.27）

研究日期：2026-10-05 UTC。基线 `aefb250`，公开29,395、八目标历史1,002；本代理只负责四个既有key。本文件是**研究记录，不是生产成功快照或发布资格**。未修改适配器、registry、data、生产out、页面或评分，未运行crawler/update/publisher；另外四个阿里来源不在本文证明范围。

全部证据、原始列表、脱敏请求、页面DOM、已加载业务bundle、失败及早稿位于 `/tmp/ande-ali-social-brands-*`。汇总：`validated-evidence.json`；逐文件SHA-256/大小/mtime/截图尺寸：`manifest.json`；清理：`cleanup.json`。这里的短文件名均加此前缀。普通站点URL是第一方出处，材料是实际取得的响应/DOM而非搜索摘要。

## 1. 四源结论

| key（不改登记company） | 本轮正常门户范围 | Chrome原生列表总数 | Node普通匿名双完整扫描 | 研究边界 |
|---|---|---:|---|---|
| `taotian_social`／淘天集团 | `talent.taotian.com` 社会招聘，所有类别／地点，无关键词／项目条件 | 475 | 475／475；五个有数据页＋第六页终点 | 招聘官网根页身份和导航已证；另试 `www.taotian.com` 连接关闭，**未完成该独立公司主站的导航证明** |
| `ele_social`／饿了么 | 品牌官网现为淘宝闪购，仍官方指向 `talent.ele.me` 社会招聘 | 219 | 219／219；三个有数据页＋第四页终点 | 官网明确2025年12月品牌更名；记录关系，不自动重命名key/company |
| `dingtalk_social`／钉钉 | 钉钉品牌官网仍指向 `talent.dingtalk.com`；招聘页当前名称「千问办公」 | 99 | 99／99；一个有数据页＋第二页终点 | 不把招聘页新名称解释为另一个源或整个阿里集团 |
| `quark_social`／夸克 | 夸克官网招聘导航→同origin招聘门户→社会招聘；当前「千问事业部／千问C端事业群」 | 251 | 251／251；三个有数据页＋第四页终点 | 官网门户已覆盖千问APP、夸克、AI硬件、UC、书旗、汇川；**不是仅夸克产品的窄全集**，需显式记录范围迁移，不自动改company或跨源去重 |

共1,044个官方posting身份。`research-candidate.json` 中 `complete:true` 仅指上述当前广列表已穷尽并稳定，不指生产资格，更不把研究时间当生产成功时间。淘天独立公司主站导航缺口、其余源品牌／范围变化由父复核后决定profile；不能以另外三个源成功补足淘天缺口。

## 2. 官网身份及导航链

### 淘天

- [登记招聘官网根页](https://talent.taotian.com/) HTTP200、标题「淘天集团招聘官网」，DOM含淘宝天猫业务／淘天版权和正常「社会招聘」导航。实际点击后为 `/off-campus/home?lang=zh`。证据：`taotian-home-{network,dom}.json`、`taotian-home-response-1.txt`、`taotian-social-navigation-{network,dom}.json`。
- 社招首页正常加载第一方配置 `https://fc.alibaba.com/0.0.4/60001/subsidiary-social-main-page.json`，当前生效 `posSearchType.bottomBtnLink` 是 `https://talent.taotian.com/off-campus/position-list?lang=zh&search=`。证据：`taotian-list-home-response-22.txt`。随后正常Chrome打开该无关键词广路由，保存 `taotian-real-list-*`。
- 初次访问 `https://www.taotian.com/` 得 `net::ERR_CONNECTION_CLOSED`；截图及失败原样保留 `taotian-brand-*`。没有换UA／指纹／TLS重试。招聘官网自身根页导航和身份成功与这个公司主站失败分别披露，不写成全链都成功。
- 根页宣传「5000+ JOBS」不是本轮列表原生总数，更不是全集计数。

### 饿了么／淘宝闪购

- [原品牌官网](https://www.ele.me/) 正常跳转至 [淘宝闪购官网](https://taobaoshangou.ele.me/)。实际DOM「加入我们」「招聘官网」都链接 `https://talent.ele.me/`；证据：`ele-brand-{network,dom}.json`、`ele-brand-response-2.txt`。
- [招聘官网根页](https://talent.ele.me/) 正常HTTP200、标题「淘宝闪购招聘官网」，正文明确：**「自2025年12月起，‘饿了么’品牌更名为‘淘宝闪购’」**，版权主体上海拉扎斯信息科技有限公司。证据：`ele-home-dom.json`、正常加载配置 `ele-home-response-22.txt`（`60003/subsidiary-main-page.json`）。网站根页地址仍是 `talent.ele.me/?lang=zh`，不是擅自迁到另一个招聘origin。
- 实际「社会招聘」导航→`/off-campus/home?lang=zh`；生效第一方首页配置的「查看全部职位」目标为同origin `/off-campus/position-list?lang=zh&search=`，不是首页四职业入口之一。证据：`ele-social-navigation-dom.json`、`ele-list-home-response-23.txt`、`ele-real-list-*`。

### 钉钉

- [钉钉品牌官网](https://www.dingtalk.com/) HTTP200。实际DOM「社会招聘」与「加入我们」均指向 `https://talent.dingtalk.com/off-campus/home?lang=zh&spm=...`；证据：`dingtalk-brand-dom.json`、`dingtalk-brand-response-30.txt`（正常官网页脚片段）。
- [社招首页](https://talent.dingtalk.com/off-campus/home) HTTP200，标题「千问办公社会招聘」、页脚「Powered by 钉钉」。正常加载 `80279/subsidiary-common.json` 和 `subsidiary-social-main-page.json`，当前生效的查看全部职位目标为**同origin无关键词**列表。证据：`dingtalk-home-*`、`dingtalk-social-navigation-response-28.txt`。
- 配置其它未生效结构还含holding关键词链接，不拿它替代当前生效入口；未研究／请求holding招聘官网。列表和三详情仍全部是 `talent.dingtalk.com`。

### 夸克

- [夸克品牌官网](https://www.quark.cn/) HTTP200；实际招聘图片链接为 `https://talent.quark.cn/campus/home?lang=zh`。证据：`quark-brand-dom.json` 和正常HTML `quark-brand-response-1.txt`。
- [该招聘门户](https://talent.quark.cn/campus/home?lang=zh) 自称「千问事业部校园招聘」，业务介绍逐项列出千问APP、夸克、AI硬件、UC、书旗、超级汇川。其正常导航确有「社会招聘」；点击后同origin `/off-campus/home?lang=zh`。证据：`quark-campus-home-dom.json`、`quark-social-navigation-*`。本轮**没有采集校园列表／扩大到校园key**。
- 社招首页以图片入口而非文字按钮链接当前广列表。正常加载 `80256/subsidiary-social-main-page.json` 的生效 `pageStruc[0].picType.hasLink=true`、`link=https://talent.quark.cn/off-campus/position-list?lang=zh`；证据：`quark-list-home-response-22.txt`。`subsidiary-common.json` 的投递须知也自称千问事业部，见 `quark-list-home-response-21.txt`。
- 此关系只证明当前既有官网门户身份和范围，不证明与 `tongyi_social` 同一岗位源。不得凭千问名称／`isTongyi:false` 猜跨源关系或按标题去重。

## 3. 实际列表协议与普通Node可用性

**先Chrome观察，后Node请求；没有运行旧适配器。** 四个站本轮正常列表启动XHR逐源保存，不能把历史 `group_official_site` 注释当证据。当前实际列表XHR恰好都用 `channel:"group_official_site"`；详情则各有品牌channel，二者不能混同。

| source | Chrome实际 `/position/search` 请求／响应材料 | 正常详情实际channel |
|---|---|---|
| 淘天 | `taotian-real-list-network.json` seq49／`taotian-real-list-response-49.txt` | `cdc_group_official_site` |
| 淘宝闪购 | `ele-real-list-network.json` seq51／`ele-real-list-response-51.txt` | `ele_group_official_site` |
| 钉钉 | `dingtalk-real-list-network.json` seq52／`dingtalk-real-list-response-52.txt` | `ding_group_official_site` |
| 夸克门户 | `quark-real-list-network.json` seq43／`quark-real-list-response-43.txt` | `Quark_group_official_site`（大小写原样） |

```json
{"channel":"group_official_site","language":"zh","batchId":"","categories":"","deptCodes":[],"key":"","pageIndex":1,"pageSize":10,"regions":"","subCategories":"","shareType":"","shareId":"","myReferralShareCode":""}
```

- 同origin `POST /position/search?_csrf=[REDACTED]`；Chrome实际头及完整body在各 `real-list-network.json`。HTTP200、业务 `success:true`；原响应 `content={datas,totalCount,pageSize,currentPage}`。没有把失败／未响应解释为0。
- 列表正常自动加载 `POST /category/list` 和 `/region/hot`，body均为实际 `channel/language`。UI真实条件是关键词、职业类别（含子类）、地点（含更多搜索）；完整控件DOM保存 `*-filters-dom.json`，字典原响应在各 `real-list-response-*`。未设置经验、职能、关键词、实习／人才限制。
- 「更多」实际打开地点combobox，空输入显示「无选项」，本次打开未触发新的业务XHR；如要用城市分区，不能把这个空UI或 `/region/hot` 当完整地点字典。此次广列表直接穷尽，**不依赖任何城市／职业分区**，也未尝试硬凑类别map。
- 临时脚本 `native-scan.cjs` 使用Node v25.8.0标准fetch默认UA，**没有设置浏览器UA**；独立普通匿名GET bootstrap，正常 `XSRF-TOKEN`／session cookie仅内存复用，随后同originCookie、`X-XSRF-TOKEN`、Content-Type、Origin、Referer和 `_csrf` 的普通协议。每个脚本主动请求至少200ms起始间隔、15s超时；没有登录、提交、注入SDK、验证码／Baxia／TLS／指纹绕过。
- 四站GET `...?lang=zh` 都正常302至**同origin同path删除lang的语言规范路由**，继而HTTP200并正常POST列表。第一版手动redirect脚本误把这个普通302记为终止，保留 `*-native-first-*` 和 `*-research-first-candidate.json`；根据已观察的Chrome同路由正常跳转，显式仅允许这一语言规范跳转，不是被拒后改UA重试。
- 双扫描全部列表HTTP200、`success:true`，页码页长原响应逐页与请求核对；证据：`*-native-network.json`、`*-native-response-*.txt`、`*-native-round-{1,2}.json`。生产共享普通Node协议在这四origin已研究验证可用；仍须父走正常唯一链重新生产采集，不晋升研究材料。

## 4. 原生总数、穷尽、身份及全部字段稳定性

| source | 两轮有数据页（pageSize100） | 明确末页后探针 | 双扫去已证明动态项的全部字段SHA-256 |
|---|---|---|---|
| 淘天 | 100+100+100+100+75＝475 | page6，datas空／totalCount0／currentPage6 | `8da6442d6a96289b574104ae7cc7f3f1f8dea9783fcd441c88e566d610dda4ff` |
| 淘宝闪购 | 100+100+19＝219 | page4，空／0／4 | `87af159c985982991631803d60243f389a48bbd6c955540f5b93b1939395b84c` |
| 钉钉 | 99 | page2，空／0／2 | `a191d59c6bd13cbfd083216201f9d591df2cfc3d913919975049b759caee611f` |
| 夸克门户 | 100+100+51＝251 | page4，空／0／4 | `2d69ba7c94ca2049b24930506bc573a25454cb34bda2c58f3214f9be2fb0f855` |

- 所有有数据页原生总数分别保持475／219／99／251；页码页长回显准确；每轮id唯一、identity计数严格等于原生总数，未发现早空、重复ID、数据页Count漂移或本轮深度cap。**本次均低于500，不能据此证明超过500时无cap。** 不继承旧热门城市并集、20页限或「约500」注释。
- 官方本轮终点约定：完整取足原生总数后额外页同时返回空和 `totalCount:0`。这是越界页响应，不是源总数变成0。早稿严格count检查对此误报「Native total changed」，全部保存 `*-native-endcount-draft-*`／`*-research-endcount-draft-candidate.json`；修正只在已取足原生总数的明确空终点接受0，数据页变化仍拒绝。
- 双扫**原始字节并不稳定**：四源每一个posting的 `trackId` 和 `positionUrl` 都变化，475／219／99／251次；除这两个字段外所有raw字段原值均相等。
- 每岗两轮都验证：`new URL(positionUrl, officialOrigin)` 的origin严格是自己官网、path严格 `/off-campus/position-detail`、无fragment/userinfo，query键严格仅 `positionId,track_id`；`positionId===String(raw.id)`、`track_id===raw.trackId`。两轮id／origin／path／其余query（positionId）全一致，只有跟踪query值变化。
- 比较按官方 `id` 对账，只删除顶层 `trackId` 和 **`positionUrl` 中具体 `track_id` query**；保留URL其余部分后比较整个raw对象，未整体忽略URL，未忽略日期／状态／正文／类别／其它事实。逐岗链接校验和diff计数在 `validated-evidence.json`，可重跑 `node /tmp/ande-ali-social-brands-validate.cjs`。实际业务bundle也只把 `track_id` 作为跟踪入参；详情API按id取岗，见 `renderer-focused.json`、`renderer-snippets.json`。
- 原API链接、page详情route和detailAPI身份互证，不能把研究比较用的去tracking链接叫官网canonical/alias，不能注入虚构canonical关系。没做跨source标题去重。

## 5. 正文、详情、职能及属性

四源列表已含**完整纯文本**独立 `description/requirement`。全量1,044岗两字段都是合法非空string，无空/null/symbol正文，也无非法shape；无需逐岗机械详情。本轮各三实际代表＋淘天角括号补充，共13个真实详情。

### 第一方renderer证明TEXT，不是HTML

每源正常加载同版本第一方 `https://g.alicdn.com/platform/new-careers-portal/2.0.4/subsidiary.min.js` 和 `vendors.min.js`，其各自network记录、原bundle均保留，不用其它源成功授予资格。

- `subsidiary.min.js` 社招Details把完整 `description/requirement` 放入 `blockInfoList[].value`，没有取首段、substring或600截断。
- `vendors.min.js` 实际模块 `aWBEr5an/hFUqvb7BTQU4Q==` 的 `renderBlockInfo` 是 React `createElement("div", {className:"main block-info"}, e.value)`；**非 dangerouslySetInnerHTML**。证据：`renderer-focused.json`（原已加载bundle+offset）及每源真实 `.block-info` 页面DOM。
- 淘天 `100046420001` 的官方要求含 `>>>...<<<`，实际DOM仍完整保留，HTML节点显示转义角括号，computed `whiteSpace:pre-wrap`；证据：`taotian-angle-blocks.json`、`taotian-angle-text-{dom,network}.json`、截图。不能按HTML strip-tags吞掉角括号。全量还保留原换行/空白/作品文字；未添加邮箱、作品要求或删改特殊字符。

### 每源三实际代表

下列id均是官方detailroute `https://<自己的origin>/off-campus/position-detail?positionId=<id>` 的实际原列表链接（另含动态track_id），三条API／DOM完整对照见 `*-representatives.json` 和 `*-detail-<id>-{network,dom,renderer-dom}.json`。

| source | id及用途 | description／requirement字符数 |
|---|---|---|
| 淘天 | `100034620002` 长Agent JD／类别null；`100010280020` 官网「技术类-开发」；`100046420006` 采购／部门「天猫校园」但招聘属性null | 908/1107；250/216；205/245 |
| 淘宝闪购 | `100032680003` 长非技术商家运营；`5000014320` AI开发；`5000041716` 物流发展／类别null、要求保留公开作品 | 873/695；747/446；596/498 |
| 钉钉 | `100040840001` 长AI开发JD；`100039680005` 品牌策略营销；`100034280001` 日本零售运营／官方地点东京 | 1328/1034；357/308；580/193 |
| 夸克门户 | `100017540002` 长Agentic算法；`100014880001` 非技术海外漫剧发行；`100021600005` 压缩推理／类别null | 1063/592；924/604；258/195 |

12个代表均：HTTP200／success:true、detail返回id正确、detail职责和要求与列表逐字符完全相等、页面body含完整两段（不是仅抽样首段）。长JD组合最大：淘天2015、淘宝闪购1568、钉钉2362、夸克1655字符。页面截图只是有限viewport，全文证明来自API＋完整DOM，不虚称单张图能显示所有尾段。

### 字段语义和未知维度

- **职能**：实际社招列表renderer将 `categories` 显示在更新日期与地点之间，详情亦在头部显示原值。合法数组保留所有项；官方null分别472/475、63/219、8/99、29/251。多个null代表已实际详情和DOM确认不显示类别；不可由职位标题补造。
- **招聘性质／计划**：所有列表 `positionType/categoryName/categoryType/batchName/batchId/channels/status` 都为null，三详情也各自确认null。不能从off-campus路由、投递按钮、标题「天猫校园」、工作年限或岗位名猜正式/实习/人才计划，未知分别保null；渠道只能记录官网当前社会招聘**入口范围**，不得将请求 `channel` 当逐岗招聘性质。
- **实习／人才**：当前社招全量raw没有可确认的非null性质／计划字段。本轮不宣称「没有实习或人才岗」，不按标题过滤，也不伪造此类代表。已实际看到淘天导航「顶尖人才T-Star」以及夸克校园首页「日常实习生」「阿里星/C-Star」，只是独立入口存在，未把校园或另一项目入口加到社招全集。
- **部门**：列表 `department/project` 全null；代表detail确有部门值（淘天集团、天猫校园、淘宝闪购、阿里集团）。不以三个样本的detail部门回填其余岗，更不能把「阿里集团」叫本source公司身份。列表已有正文不为部门未知机械追加所有详情。
- **日期**：正常社招列表和详情renderer都明确将 **`modifyTime`** 放在「更新于」标签旁，证据offset232155／267067及真实DOM。可以证明官网更新时间；**`publishTime` 没有本轮正常社招页面／文档明确发布语义，publishedAt应保持null**，不是因为名字像发布、数值常与modifyTime差1秒或同日就认定。bundle还存在未用的其它旧组件publishTime，不能拿它为当前社招renderer授语义。
- **状态**：实际raw/detail `status:null`；是否在当前列表只能作为本次观察，不把它注入官方ACTIVE枚举。没有官方下架确认；更广范围／品牌变化导致的历史退出不得叫官网下架。

## 6. 失败、早稿及环境清理

- 公司主站 `www.taotian.com` 连接关闭；其它三品牌官网和四招聘列表/代表详情真实成功。正常Chrome页面还自动请求了成功的官网配置/图像/视频/CDN/遥测，**并非全零失败**：夸克官网自动探测的Chrome扩展商店HTTP403、淘宝闪购官网自动 `/undefined` HTTP404、部分第一方可选配置404，以及导航/停止页面后的媒体ERR_ABORTED。完整URL和结果在 `browser-network-outcomes.json`，不冒充招聘API拒绝或岗位0。
- 所保存页面Network窗口统计：3,273条请求记录；HTTP200×2,832、206×37、304×10、403×1、404×6；ERR_ABORTED×41、ERR_CONNECTION_CLOSED×1；384条记录未捕获terminal status或failure（包括跳转前记录和停止前未完成资源，不能称成功或0）。状态和failure计数可重叠。这是**页面CDP观测窗口**，非整个Chrome所有系统后台网络的穷尽审计。
- UI自动请求本身会并行；研究脚本主动请求是串行≥200ms、15s超时。没有主动反复请求拒绝资源／扩展商店／可选404。初稿元素定位失败、地点控件观察脚本语法早稿、302误判及终点count误判均保留，不把脚本错误当官网失败；没有用这些早稿candidate晋升。
- 最终落盘去值审计涵盖cookie/token/CSRF及URLencoded遥测；HTML `__token__`／编码遥测早稿遗漏已统一脱敏，保留业务scope/body其余字段。最终材料不含该会话值；审计与哈希在clean/manifest中。会话profile只临时用于正常匿名浏览，已删除；没有保存登录凭据。
- 自有普通headed Chrome `154.0.8037.98`，PID4509，独立profile `/tmp/ande-ali-social-brands-profile-1d3tDZ`，实际CDP端口**65526**。正常Browser.close后实际ps无该profile的剩余进程、fs profile不存在、65526连接/监听为空、再次HTTP连接失败，证据 `cleanup.json`。无自建HTTP代理／持久helper进程，未触碰已有1082代理／用户Chrome／另代理进程。
- 父仍须亲看代表图、核验manifest哈希和实际清理，并独立决定最小实现、scope迁移及正式唯一链。本文不提前宣布八key或本四key生产验收成功。
