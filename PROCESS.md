# 安得 · 过程记录

记录实际范围、动作、结果、验证边界与遗留问题，不作为现行规则或自动执行授权。规则见 [SPEC.md](SPEC.md)，选择原因见 [DECISIONS.md](DECISIONS.md)。阶段结束追加简短结果和证据指针；详细日志留在原核验报告，不重复粘贴到规格/README。

## 1. 本地交付快照：v0.29，已保存至34e59e8

以下统计属于这次交付时点，不是长期规格；后续数量/状态以 [data/jobs.js](data/jobs.js)和 [crawler/sites.json](crawler/sites.json)为准。

- 本地岗位 **23,979**，全部来自29个已成功来源；初版HTML剩余 **6,530** 条已退出，`legacy:false`。
- 保留39家公司、66个来源登记（校30/社36），前端39个平铺招聘单位。其余37个来源暂无已验证新数据，不是官网零岗位；来源登记不等于全部已接入。
- 29个已成功来源的岗位全部事实、元数据及真实成功时刻保持；本机89个out文件保留，不随退出操作重新采集。
- 当前限制：字节社招仅九类/75分类ID限定范围；阿里云全集仍未证明；其它未核来源、一般跨来源去重、持久快照、定时采集、Pages更新、国内访问与真实全量PC性能尚未完成。
- 截至v0.26成果保存为本地提交 **aefb250**；阿里接入、单位展示及初版退出保存为 **34e59e8**（`feat: 接入阿里社招并清理初版遗留数据`）。提交前232项离线测试、76份JS语法、286条本地Markdown路径和diff检查通过。未推送或部署，不保证在线页面为本地版本。
- 旧核验文档的「保留初版」「未提交」是当时状态：初版保留政策已由v0.29取代，提交状态以Git历史为准；不改写旧报告或宣称旧字节版本已验新版。

## 2. 改造与来源接入

### 2.1 产品与页面收口（至v0.16）

从个人AI/Agent职业榜单转为通用岗位收集器。通过原型确认白底黑灰、两行slogan、常驻A–Z目录、逐词标签、显式查询、本机恢复和连续浏览；撤回过早固定两行标签槽，恢复自然布局。硬排除改为降权，旧个人三档/锚点/职业惩罚退役；完整旧词汇只作为85/37手动示例。

正式入口迁入原生index.html，初版13,487条真实记录迁入独立数据作为当时的临时基线；没有官ID的使用迁移身份，不冒官方日期或完整JD。随后断引用删除召回/收窄/Agent判定、个人评分和多个HTML生成器，建立唯一安全采集/发布链。v0.16补官网职能类别和逐词频次，只展示、不改变得分或删岗。原型已退役；这不是一次全官网采集或全量性能验收。

### 2.2 66来源静态审计（v0.20）

按39公司/66来源读实际执行代码和已有证据，记录职业/项目/经验过滤、封顶/分页、吞详情及字段/身份风险。结论为7可复用、58改造、1必要时局部重写（百川提取），不等于这些来源已通过官网验收。

回看原主站生成链，确认实习/部分职能、人才项目、社招经验>3及非正分曾被主动删除，正文未输出；召回链200上限不套用于主站。该轮只读审计、未批量采集或发布。证据：[逐来源审计](docs/source-coverage-audit.md)。

### 2.3 正常采集与本地替换

执行按已证明的共享协议批次推进，资格与替换按key独立。下表总数是**各批发布当时**的公开数据，仍可能包含后来退出的初版记录；不能当作当前在招规模。

| 阶段 | 实际范围与新岗位 | 替换初版/旧范围 | 发布当时总数 | 核验记录 |
|---|---|---:|---:|---|
| v0.17–0.18 阶跃星辰 | 校94905共128、社94904共231；更广校入口包含旧141903的20条，不重复收录 | 147 | 13,699 | [阶跃](docs/stepfun-verification.md) |
| v0.21 字节校园 | 无职业/项目条件，双扫7,492，独立职责/要求保真 | 1,211 | 19,980 | [字节](docs/bytedance-verification.md) |
| v0.22–0.23 字节限定社招 | 两轮已分类候选11,093；明确授权九类/75ID限定范围迁移，采用原候选与真实采集钟，不假称采用时重新请求 | 3,849 | 27,224 | [限定发布](docs/bytedance-verification.md#7-v023按明确授权迁移限定范围并本地发布) |
| v0.24 飞书八来源 | MiniMax100/197、商汤151/86、莉莉丝82/114、叠纸40/328，共1,098 | 316 | 28,006 | [飞书批次](docs/feishu-batch-verification.md) |
| v0.25 Moka七来源 | 月之暗面93/106、智谱23/135、DeepSeek37、鹰角103/353，共850 | 237 | 28,619 | [Moka批次](docs/moka-batch-verification.md) |
| v0.26 北森三来源 | 讯飞非社会六频道联合166、社会727、vivo校园全项目253，共1,146 | 370 | 29,395 | [北森批次](docs/beisen-batch-verification.md) |
| v0.27 阿里七社招来源 | 控股588、淘天475、饿了么219、国际246、通义63、钉钉99、夸克251，共1,941；不运行未获全集资格的阿里云 | 827 | 30,509 | [阿里批次](docs/ali-social-batch-verification.md) |

各批仅明确目标keys走唯一publisher，保护非目标事实、元数据、真实成功时刻和已有out，不全站更新。以上已正常采集来源不是公司全球全集，初次旧范围退出也不称官网下架。v0.29退掉剩余初版后，上述新岗位合计23,979。

## 3. 重要发现、阻塞与修复

- **阶跃详情与状态：**逐岗取详情后末尾复核，311分栏/48全文回退，其中3条官方符号正文诚实保留；12条pause仍公开列出，未提交申请证明可投。校入口广范围与发布日期有第一方证据。
- **字节全社招仍阻塞：**原PC窗口count10,000，正常类别并集超过该下界，越界空和facet不证明穷尽；H5正常主列表HTTP405即停。限定范围单独获授权，树新增/改名/迁叶/parent矛盾拒自动更新，未分类/树外/旧类别仍未知。见[枚举研究](docs/bytedance-social-enumeration-research.md)。
- **莉莉丝入口与重叠：**校园campus+intern联合；社会career+旧index活水，核同posting/身份/原JD后合并54条共享记录，保留index-only，不按标题删。商汤5条官方无正文保留。详见[莉莉丝](docs/lilith-verification.md)及[飞书批次](docs/feishu-batch-verification.md)。
- **Moka模式与空正文：**六源列表已有全文，鹰角校园103必须详情后末尾列表核原字段；另确认鹰角社招原已登记，纠正早期「未登记」研究说法。DeepSeek只核官网对应140576/部门2028422，不扩幻方。智谱5条官网无正文合法保留；组织/mode/origin及AES内外业务状态绕过风险闭合，实际生产候选另正常重采。详见[Moka标准](docs/moka-standard-verification.md)、[特殊来源](docs/moka-special-verification.md)。
- **北森字段与证据：**讯飞本源与无Category全门户权威精确分区，UUID/数字号分别唯一；两租户D4单遍解码后TEXT、两栏同文保留，原两栏仅`1`也不补造。渠道/项目/职能逐租户区分，不用vivo实习标题或频道覆盖原全职事实。空快照缺证、URI等价/降级、身份重复、缺metadata/额外JD和日期形状风险经独立反例及持久回归闭合。详见[讯飞](docs/beisen-iflytek-verification.md)、[vivo](docs/beisen-vivo-verification.md)。
- **阿里云访问成功不授全集：**原CDP target丢失缺HTTP业务证据，只能unknown；自有socket-close/pending缺陷用fixture修复，原target丢失原因仍未知。一次普通重跑取得原生total677，但第51页早空、返回currentPage1/pageSize500与请求矛盾，不能发布500/677或热门城市partial。旧175在v0.27曾保留，v0.29仅按初版退出，不获得新成功资格。详见[核心研究](docs/ali-social-core-verification.md)。
- **阿里七源正文与日期：**职责/要求为普通React TEXT，只CRLF/外trim，不HTML/实体解码、压内部空白或消重。modifyTime仅证浏览器local更新，没有source唯一日界，public date/dateKind保null。品牌连续性、千问跨产品及通义门户关系公开说明，不猜法律雇主或合源。畸形URI退generic/忽略未知业务封套两项P2修复并回归，七源正常生产钟保持2026-10-05T18:07:43.762Z—18:09:30.683Z，不晋升研究钟。详见[品牌研究](docs/ali-social-brands-verification.md)及[阿里批次](docs/ali-social-batch-verification.md)。

## 4. 招聘单位与初版退出（v0.28–0.29）

### v0.28：先做展示投影

用户明确不要阿里系父组。原笼统「阿里巴巴」884拆为控股588与临时待核296；淘天等仍平铺。仅改目录/标签/结果/JD与偏好兼容，不改raw公司、来源、ID、岗位事实或采集钟。旧选择恢复两项、不自动查询/写存储。同分按展示单位/ID，JD本来含单位文字时仍能正常计分。

225离线及实际HTTP/file159/0轻量验收通过；父亲看3原PNG、复核20组独立查询digest/6个真实row-modal及材料/资源清理。该阶段40展示项/30,509岗位与临时待核政策仅为历史，不是当前目录。

### v0.29：明确退出初版未复验资料

用户随后允许抛弃初版HTML旧岗位，并确认此后新采集核验通过直接应用。唯一publisher独立 `--discard-legacy` 维护操作退出精确初版身份6,530条，公开30,509→23,979；不读候选、不重采、不伪零、不生成成功钟。包括阿里校园296、阿里云175、vivo社会5；37个未有新数据的初版来源转暂不可用/coverage null（含原零岗位来源），登记与out保留。

保护全部29个新来源岗位事实、source metadata/真实时间和公司对象，不按空JD/未知属性/较早日期删新记录。移除临时待核目录，39项平铺；旧阿里巴巴只恢复控股，失效/未知非空选择以可删除标签保范围零或剩余有效并集，不静默变全部、不自动查询/写存储。独立审查发现两项P2（百川/上海AI实验室零岗位初版metadata漏退出、未知偏好扩大范围），最小修复、反例保留。

验证：232离线、独立37/37闭合；实际root HTTP/file189/0，父亲看3原图、核38材料及26组查询/偏好digest，每协议2个真实row/modal，所有目标外产品文件/out与六端口清理通过。它是**轻量验收**，不是23,979逐岗全文或手机实机；自然50→100原ID仍唯一connected，原element对象因innerHTML重建detached，不冒旧DOM对象保留。

本机原材料入口：`/tmp/ande-initial-legacy-review-v2.md`、`/tmp/ande-initial-legacy-parent-check.json`、`/tmp/ande-initial-legacy-final-check.json`；持久回归为 [初版退出测试](tests/initial-legacy.test.cjs)及[页面测试](tests/app.test.cjs)。终核发现两忽略DS_Store元数据额外变化，责任进程未知，单独披露、不还原制造不变、不改历史UI收据；非目标产品/out保护通过。

## 5. 验收范围与原始材料

- 各批冻结完整页面检查与实际root小烟测不同：阶跃48/4、字节校园86/6、字节限定社招136/8、飞书282/11、Moka397/51、北森705/68、阿里963/143；详见各批报告。阿里963覆盖每协议2,237真实行/modal，其中1,941独立native全文；实际root143仅每协议3JD。不能把样本烟测写成第二次全量验收。
- 自动DOM全文比对不等于人工逐岗视觉，CSS viewport不等于手机实机。原图实际看过的范围、版本/SHA/必要纳秒mtime与真实自有profile/进程/端口清理分别记录在原报告。
- driver/fixture/reader/交付会话失败不当官网拒绝或产品失败：原稿保留，修工具后按实际范围重跑/复核，不削产品断言。阿里交付中断是读取已落盘963报告后只读恢复，没有重复采集或伪造报告已签署状态。
- 正常官网研究/生产采集确有外连。离线页面窗口中页面外部请求为零，不代表Chrome后台/整主机网络为零：后台尝试、代理拒绝、OS UDP失败及实际字节/成功连接分层披露。v0.29页面external/runtime错误为零，后台URL19、proxy拒50、20次UDP/directsocket探测均OS -109且无UDP字节，成功外连零；字节socket仅loopback。不能把同批探测的两种事件加倍计数。
- `/tmp/`报告、截图、backup、日志及本机out没有随Git提交保存，路径不是跨环境永久证据；材料丢失时应标明无法复核，不能只凭文字或合成fixture宣称新的官网成功/覆盖。仓库保留核验文档与持久反例测试，新的来源资格仍需正常第一方取证和同版本验收。
- 本次整理前完整SPEC/README及当时长日志可用本地 `git show 34e59e8:SPEC.md` / `git show 34e59e8:README.md` 查阅；该提交未推送，不声称远程链接已可访问。不另复制一份同样长的归档文档。
- 早期M1 Pro模拟中文JD估算为5万/10万约221/441MiB、匹配排序230/470ms、对象堆155/309MiB，5万解析约140ms；不含下载/DOM、仅6词、非当前算法或真实性能/SLA。压缩30%/带宽20Mbps也只是网络量级假设，不作为上线承诺。

## 6. 已记录的后续方向（尚未执行）

按飞书→Moka→北森→阿里共享社招→其它实际协议组→上线收尾的既有路线，前四组的已核范围已本地发布；下一阶段是其余custom按真实协议分组，不按公司建立重复实现。阿里云与字节全社招覆盖阻塞仍独立保留，不自动重采或放行。

后续依次完善未核来源及官方跨来源身份关系，用真实全量PC数据测性能，落实成功快照跨runner持久化，再接北京时间08:00触发、Pages与国内访问验收。规划不是采集、提交、推送或部署授权；具体范围以用户当次授权为准。

## 7. 文档重组（本次，仅文档）

新增DECISIONS/PROCESS/AGENTS三个文件，把SPEC从约109KB收敛到约17KB现行规则/整体架构，README改为简短入口并精确保留许可原文；采集README去掉重复批次流水，保留操作、发布与适配器契约。完整旧SPEC留在34e59e8的Git历史，原来源研究报告不改签。

独立只读审查后补回跨组同词提示、JD分数拆解和首版筛选边界，修正阻塞者状态与阶跃符号正文计数歧义。规则迁移/本地路径及相关锚点、232项离线测试通过；代码、公开数据、来源登记及89out保持原字节/时间。未重新采集、发布数据、启动浏览器或重做旧189页面验收。验收时未提交；随后用户另行授权仅本地Git提交，提交结果以Git历史为准，未推送或部署。

## 8. 剩余来源候选分组（基于c9f774a，仅静态分析）

用户本轮仅授权先分组。按登记与公开来源真实成功记录核出37个尚无已验证新数据的key；只读分析对应旧代码，不访问官网、不改采集实现/登记、不运行update或publisher。下列是**源码候选**，不是已证明的当前官网协议、scope或发布资格，也不是26套新实现的计划；官网核验后可以合并或拆分候选。旧注释、伪浏览器UA、字段名及相似JSON封套不作第一方证明。

### 8.1 同接口候选：8对、16来源

各对旧实现的method、API origin/path、分页及主要岗位字段相同或相近，可优先共同核验、复用扫描/字段处理；两渠道仍分别取证，不能跨对硬并成一个系统。

| 候选对与源码入口 | 明确keys | 源码共用点与主要待核差异 |
|---|---|---|
| [小米](crawler/lib/custom/xiaomi.js) | `xiaomi`、`xiaomi_social` | 同GET `hr.xiaomi.com/website/api/agent/searchJobPage`，type2/1，`data.total/list`；校园实际删除顶尖/未来星线索岗位，须保全部返回项而不据标题猜人才计划。 |
| [百度](crawler/lib/custom/baidu.js) | `baidu`、`baidu_social` | 同POST表单 `talent.baidu.com/httservice/getPostListNew`，GRADUATE/SOCIAL；校园projectType1范围、postId/jobId关系、原标题及分页上限分别待核。 |
| [美团](crawler/lib/custom/meituan.js) | `meituan`、`meituan_social` | 同POST JSON `zhaopin.meituan.com/api/official/job/getJobList`，jobShareType1/2，嵌套page；校园jobType/specialCode实际收窄，不能当广入口。 |
| [小红书](crawler/lib/custom/xiaohongshu.js) | `xiaohongshu`、`xiaohongshu_social` | 同POST JSON `job.xiaohongshu.com/websiterecruit/position/pageQueryPosition`，campus/social，`data.list/total`；校园性质/项目范围及duty/qualification全文待核。 |
| [华为](crawler/lib/custom/huawei.js) | `huawei`、`huawei_social` | 同POST官网网关getJobPage及网关头，CR/SR，`pageVO.totalRows/result`；正常匿名访问、FRESH_GRADUATE条件和三段JD独立待核。 |
| [携程](crawler/lib/custom/ctrip.js) | `ctrip`、`ctrip_social` | 同POST `careers.ctrip.com/api/hrrecruit/getJobAd`，category2/1，字符串pager；Origin、id/jobId/fromId及详情路由不同，列表HTML解释须看真实renderer。 |
| [米哈游](crawler/lib/custom/mihoyo.js) | `mihoyo`、`mihoyo_social` | 同POST list/info，hireType1/0、channelDetailIds[1]；实际两源均有详情，旧注释不符；详情吞错为空、固定版本头与渠道范围须闭合。 |
| [上海AI实验室](crawler/lib/custom/shlab.js) | `shlab`、`shlab_social` | 同GET `www.shlab.org.cn/api/getJobList`，campus/social、page_token游标；须证明has_more/终点/游标进展，无原生总数不能拿已抓长度盲造全集。 |

### 8.2 近缘接口候选：3对、6来源

只先共研明确重复的会话、字段或接口族；method、scope、分页起点或会话不同的部分不强行统一。

| 候选对与源码入口 | 明确keys | 共研依据与必须保留的差异 |
|---|---|---|
| [蚂蚁](crawler/lib/custom/ant.js) | `ant`、`ant_social` | 同host的campus/social position/search、`success/content`数组及相近JD字段；校园0起/社会1起，channel/language不同，社会旧自造ctoken不是正常匿名会话证明。 |
| [B站](crawler/lib/custom/bilibili.js) | `bilibili`、`bilibili_social` | 同CSRF取得端点、头及`data.list/total/pages`；campus/srs列表与Origin不同，社会两组类型条件是否收窄待核，完整JD不能只凭positionDescription字段名。 |
| [快手](crawler/lib/custom/kuaishou.js) | `kuaishou`、`kuaishou_social` | 相近positions/simple与职类字典、`result.total/list`；校园POST/社会GET且host/路径不同，子项目/性质条件不同；旧社会本地逆向HMAC不直接沿用，先证明官网正常匿名流程，拒绝即停。 |

### 8.3 暂按独立协议核验：15来源（含阿里云暂挂）

表中同行只便于排队，**不是共享协议组**。其中14来源待核，阿里云1来源保留既有阻塞；也不因公司名将腾讯、京东、OPPO或网易的不同入口合成一个客户端。

| 排队包与源码入口 | 独立keys | 独立处理依据 / 复用待核线索 |
|---|---|---|
| [腾讯](crawler/lib/custom/tencent.js) | `tencent`、`tencent_social` | 校园join.qq.com POST+详情；社会careers.tencent.com GET Query，业务封套/JD不同；校园项目及Workday身份、社会完整要求分别证明。 |
| [腾讯音乐](crawler/lib/custom/tme.js) | `tme`、`tme_social` | GET uc-job/list的page_count与POST job/list协议不同；分页、混合渠道/性质、推荐排序及完整要求分别待核。 |
| [京东](crawler/lib/custom/jd.js) | `jd`、`jd_social` | 校园JSON POST的body.items/totalNumber与社会表单POST裸数组不同；校园type=present范围、社会总数/终点及真实岗位深链待核。 |
| [OPPO](crawler/lib/custom/oppo.js) | `oppo`、`oppo_social` | careers与career为不同部署；pageNew和queryPositionList的业务码类型/字段不同。校园固定项目且实际删非Graduate/doctor；社会positionId/jobNo关系待核。 |
| [网易三入口](crawler/lib/custom/netease_huyu.js) | `netease_huyu`、`netease_leihuo`、`netease_social` | 互娱getJobList、雷火apply/job/list/show、社会queryPage为三套域/封套/分页；不能用品牌推集团全集或跨源重叠。 |
| [vivo社会](crawler/lib/custom/vivo_social.js) | `vivo_social` | hr.vivo.com社会page，与已核校园北森不同；company_id/group_id组织范围、无总数分页、搜索链接与唯一岗位身份待核。 |
| [阿里校园](crawler/lib/custom/alibaba.js) | `alibaba` | /position/search及XSRF/content.datas有复用阿里共享模块的线索，但独立host、batch/channel/scope须新证；不继承七社招资格，也不猜控股归属。 |
| [百川](crawler/lib/custom/baichuan.js) | `baichuan` | 旧单次dump-dom/卡片正则不证全集；类名/链接及旧注释有飞书线索，优先核是否可复用现有飞书，而非先写新DOM采集器。 |
| [阿里云：暂挂](crawler/lib/custom/aliyun_social.js) | `aliyun_social` | 已引用阿里共享实现，但当前未qualified；原生677、第51页早空及返回500/1元数据矛盾仍阻塞，不重抓或以其它七源补证。 |

### 8.4 建议队列与本轮边界

建议先小米→百度→美团→小红书，再华为/携程/米哈游，再B站/蚂蚁/上海AI实验室/快手及其它独立入口；这是按当前源码复用与风险排队，不是已测官网成本。阿里校园/百川先查既有适配器复用线索，避免重复实现；阿里云暂挂，字节全社招是已成功限定来源的独立覆盖阻塞，不在这37个新接入key中。

若后续另获整轮授权，可并行只读代码分析/离线准备，官网请求串行限频、共享修改和正式发布统一协调；按明确keys推进，通过者独立验收/发布，阻塞者记录后继续。无须逐公司重复问“继续”，但新增来源/公司、已验证覆盖迁移、新产品取舍及提交/推送/部署仍须确认。本轮不把该建议当整轮执行授权。

分组覆盖检查为37/37、无重复、没有混入29个已成功来源；本地链接/diff检查及232项离线测试通过。交付checker首错为误认测试汇总前缀，保留原日志，仅修日志读取后完整重验，非产品测试失败。只追加本节，原PROCESS历史段、其它登记/代码/公开数据及89out的字节、size和纳秒mtime保持；未启动浏览器/服务、新官网研究或采集/发布，未提交/推送/部署。

## 9. 第一批16来源：研究与原生候选采集结束，公开验收未结束

用户另行授权执行第一批8对/16既有key，只本地发布验收通过者；没有授权第二、第三批、提交、推送或部署。不重抓原29成功来源，不新增公司/来源，不恢复初版。详细逐源研究见 [第一批核验](docs/custom-first-batch-verification.md)。

- 十源本轮阻塞：小米两源、美团校园、小红书两源均出现原生重复身份；百度两源 HTTP200 业务 `no-auth/illegal-visit`；华为两源正常Node首POST HTTP412，真实Referer差异尚未闭合，不冒全官网拒绝。美团社会研究双列表/三详情不是成功；唯一正式候选第162页 total2467→2466即整源失败，未详情、未重试、没有成功快照/成功钟。
- 四个共享协议最小接入唯一链：美团社会、携程、米哈游、上海；逐key绑定实际scope/HTTP/业务/全raw/身份/终点，必要详情失败整源拒。携程fromId路线及完整HTML、米哈游六TEXT片段、上海普通TEXT/optional requirement与公开cursor分别取证；上海markup/字符引用未知形状不盲归一，穷尽数量不冒官方total。
- 六源一次正式原生候选完成，共1,812条：携程56/489、米哈游260/674、上海184/149。2,272次正常原生响应全HTTP200、两轮全部列表/raw稳定；米哈游934条必要详情各取两轮，上海双游标推进/终点复演成立。真实完成钟为2026-10-06 UTC：13:28:07.951、13:28:38.614、13:31:49.444、13:39:35.069、13:40:27.335、13:41:14.442。所有采集进程退出、官网主动请求权释放；不是采集SLA。
- `collectionCode:0`；候选publisher批次code1仅因既有美团失败metadata，不因此重抓六源。非公开候选为25,791条，根公开仍23,979条；39公司/66登记、原29来源事实/metadata/成功钟及原89out保护。原生ready/数量及研究记录不代替完整字段投影/页面验收。
- 新JD表示保完整description并存精确独立职责/要求，页面全文单次显示、原3/1/0.35匹配/词频不加第四字段；真实标题不冒空正文。独立生产审查查出携程30439707异常引号字体属性洩入正文，新增原生形状及空正文反例、共享HTML属性状态扫描修复；regex草稿发现未闭合属性指数回溯后弃稿，不削断言。复杂多方向30439771分栏边界未证，改整岗完整正文回退而不让后续职责误继承要求；raw/snapshot/真实钟均不改，不重采。
- 修复只由sole publisher对不可变23,979基线重投影新的非公开候选；原错误候选/工具错误/版本均保留。最新284项离线测试通过。但独立投影仍发现携程社会20条的英文组合标题/双语分栏与生产derived字段不一致，**尚未收口该source字段资格，也未执行本批实际HTTP/file页面验收或根公开发布**。不能以完整description、其它五源或移植normalizer的oracle冒此处通过。

本机材料入口：`/tmp/ande-first-batch-six-production-result.json`、`/tmp/ande-six-production-review-report.md`、`/tmp/ande-six-production-review-repaired-report.md`、`/tmp/ande-first-batch-stage-repaired-v3-publication.json`、`/tmp/ande-first-batch-projection-v3-diagnostic.json`。这些/tmp与out未入库、不冒永久证据；来源核验、原生采集、canonical验收、页面验收及公开发布分别记录。下一步先独立闭合分栏/投影，再冻结实际页面输入；不自动扩到下一批。

### 五源先行验收与本地发布

携程社会489条仍挂起独立分栏投影，不牵连其它五源。携程校园56、米哈游校园260/社会674、上海校园184/社会149，合计**1,323**条，全部17字段与独立原生投影精确一致；五源原生完整性/真实钟及美团真实failed metadata分别绑定，未移植normalizer作oracle。原23,979基线经唯一publisher建立独立25,302候选，候选/根不复制发布。

- 同冻结public5实际HTTP/file验收**370项**通过：全部1,323新岗连接行/真实弹窗全文、评分/词频、各43组查询，每源至少2个真实鼠标JD、39单位目录、dirty/示例/恢复、旧非目标及自然50→100。1280/1440 PC与390/320 CSS，不冒真手机、全JD人工阅读或全量PC性能。父实际读4张原PNG（桌面结果、完整英文尾部、上海真实同文两栏、320 CSS），其余22张仅SHA核验。
- 页面工具错误保稿：导航前layout读取不存在dialog→最小optional-open修；240秒外层工具超时不是产品拒绝，残留自有profile在ps确认无人使用后清理并完整重跑；关闭target时Fetch handler竞态→关闭前禁Fetch后同冻结数据全HTTP/file重验。未削产品断言、不改签前三稿。最终浏览器资源/端口/profile清理，未动用户Chrome。
- 页面外部请求/运行异常/console error为0；Chrome背景请求由自有proxy拒绝，IPv6 UDP路由探测OS失败、非proxy拒绝，所有观测字节归loopback；不宣称主机零网络。
- 页面验收后仅五源经sole publisher写根：**25,302岗位、34成功来源、39公司、66登记**。code1仅既有美团失败metadata，五源均成功；原29来源全部岗位/metadata/真实成功钟保持，携程社会未公开。根public5与已实际HTTP/file验收冻结版逐字节一致、数据对象重新载入通过，2,525材料pin及递归inventories保护通过；此根轻量复核不是另一次根浏览器访问。

最终材料：`/tmp/ande-first-batch-five-page-parent-receipt.json`、`/tmp/ande-first-batch-page-run-WXX4w3/report.json`、`/tmp/ande-first-batch-five-root-publication.json`、`/tmp/ande-first-batch-five-root-light-recheck.json`。本批16来源中5已本地公开，10原生/访问阻塞及携程社会1投影挂起；仍无有效零、不重试求通过。未提交、推送、部署或启动第二/第三批；持久化/定时/国内访问/真实全量性能仍后续。

## 10. 华为、美团、小米六入口的有限修复（2026-10-07）

用户授权执行此前六入口修复方案。先冻结当前 **25,302岗／34成功来源**，不重抓成功34源、不扩批；本轮**没有新增发布**。

- 华为：真正HTTP `Referer`缺失已复现并修正，两scope首请求均200／SUCCESS，首屏官方total101／424。新增正常匿名请求模块 `crawler/lib/custom/huawei_http.js`及反例，只是transport，**未注册完整adapter或授来源资格**。公开bootstrap允许真实空CSRF；本地误拒空值的失败稿保留，红例修后真实两scope通过。详情发现校园正文须取全部岗位意向（首样本4方向），不能把列表占位当全文；两源全量JD／分页接入仍未完成。
- 美团社会：唯一fresh正式尝试以本次total2459通过完整唯一列表及终点，取到1803必要详情后，本地guard拒详情2682118682的 `otherInfo:"暂无"`；2050响应均HTTP200。正常Chrome／官方六片renderer证其不显示为JD，精确占位修正并回溯1803详情通过；任意其它非空值、列表非null及全raw漂移仍拒。**当次仍失败，未补造快照、恢复部分详情或再完整重试**。
- 美团校园：15／16页两次合并集合20岗一致，4694862636与4697313567在相同refreshTime下互换边界，单页次序不稳；无已证官方稳定排序参数，不客户端去重冒全集。
- 小米：官网参数复核无误；两旧重复边界复查均无重复。新双全列表中校园1059唯一且全raw稳定；社会两轮各1909唯一，55岗城市数组只顺序漂移（集合未变）。**仅诊断列表，不是正式完整成功快照；校园JD接入／页面验收尚缺，社会未削raw稳定保护**。

原材料及失败稿在本机 `/tmp/ande-three-source-fix-iRBLsb/`。三自有Chrome已退出、profile清理，父实际读华为两图及美团一图；样本不冒全集或本地产品验收。未提交、推送或部署；后续可从已证请求／原生事实继续接入，不把上述未完成项称为网站不可爬。

## 11. 小米、美团下一轮：小米校招已交付（2026-10-07）

本轮授权范围仅小米、美团既有入口；冻结25,302／34，不重抓成功源。**实际新增公开1,059岗，现26,361岗／35成功来源；39公司／66登记不变。**

- 小米校招：新增最小 `xiaomi_portal` 接入唯一链，覆盖HR type=2无筛选全部岗位，包括785 campus、2 futurestar、161 toptalent、111 newretailing。旧“2027届/排顶尖”登记筛选退出，不扩type=3/4。最初列表-only候选被独立审查发现遗漏课题正文，已归档撤销，未发布。正常详情须真实公开website-path；缺它会code0却静默丢课题，不能只看可达。正确普通headers与官网原native逐字相同，无UA/签名/SDK/登录绕行。
- 修正后一次完整正式采集06:07:41.025—06:41:50.985Z：两轮各107列表页（含空EOF）及1059全部必要详情，共2332响应。三身份、total/页长/终点、全部14 raw/详情双稳；独立1059×17字段差异0。161课题正文按真实标题顺序保全，不新增评分字段；原首尾空白保留，日期/性质/计划/职能仍未推断。
- 真实冻结HTTP/file页面240断言全过，包括1059全部连接row/modal、评分/词频、dirty/恢复/示例及50→100；22原图父看4，其它仅SHA，CSS窄屏不是手机或全量PC性能。保留两次工具失败：HTML输入流CRLF→LF仅修DOM期望，不改native/公开字段；Fetch关闭竞态改为按session先排空，再禁用/关target，不吞活动错误。根只经publisher写入，与验收stage等字节；真实成功钟仍06:41:50.985Z。
- 美团社会：修上轮“暂无”后，本轮仅一次fresh尝试07:00:58.318—07:13:01.518Z；2459唯一完整列表通过，2237详情后2936400656的otherInfo精确空串被本地过窄guard拒绝，2484响应均HTTP200/business1。正常官网DOM复核及精确空串红绿修正、全部已取详情回溯通过；**当次仍失败，缺222详情及第二轮，无raw/snapshot/新增公开，不再循环全扫或拼接部分材料。**
- 美团校园仅7次有界正常查询：默认1＋2共571，应届1为194、实习2为377，计数相加一致；应届15/16页两轮样本无重复且稳定。这不是严格全集等价/全raw/全JD资格，未接入发布。小米社会城市顺序只显示join/集合相同仍不证明无主次，本轮不改稳定合同或重扫求绿。

本机证据 `/tmp/ande-xiaomi-meituan-next-e1Tizu/`；原稿、失败、Native、独立收据和各freeze均保留。自有Chrome/server/proxy/CDP/profile已清理；未提交、push或部署。

## 12. 用户“继续”后的美团校园交付（2026-10-07）

新授权冻结26,361／35，未重抓成功源；**实际新增571岗，现26,932／36，39公司／66登记不变。两轮连同小米共新增1,630。**

- 美团社会只一次新fresh：本地空串guard修后2459全部必要详情完成，第二轮首屏官方total为2458，2707 HTTP200/business1；真实count漂移拒当次，不再重扫求绿/拼部分详情。
- 校园先证官网并列1＋2多选；原分类型pageSize10正式在应届8／9页跨页重复，10响应后停。正常API有界probe证明pageSize1000返回571槽/571唯一/原total571/pageTotal1，不改筛选、total或去重。新固定分页契约仍穷尽typed-null EOF/触顶拒绝，不把1000当采集上限或未来自动调大。
- 修正分页后一次完整正式1152响应：两轮各194应届＋377实习的全部列表/EOF及全部必要详情，默认1＋2前后571完整行绑定union；25 raw/全JD双稳、跨分区唯一。校园原项目/部门必须取详情；按原特殊类型的两栏＋工作城市/六片renderer保标题/同文/顺序，类型2只证实习、渠道未知；4697281262合法城市null原样保、隐藏城市栏，不拿城市充JD完整。
- 独立136反例及571×17比较零差异。原时间守卫额外要求“响应后冷却200ms”，误拒两例199ms；只修工具为请求start间隔>=200ms且无重叠，零容差，全量最小251ms，保旧失败并完整重审，不改raw/源码/钟。真实来源成功钟09:18:46.170Z，不取driver结束46.914Z。
- HTTP/file224全部通过，571实际连接row/modal全文/评分/词频及既有交互保护；30图父看4，其它SHA。自有Chrome/server/proxy/CDP/profile全清理，页面零外网不冒主机零网络，CSS非手机/全量性能。父签新收据，solepublisher只更新meituan；根等已验收stage，原26361岗/35源metadata及out/钟原样。

证据 `/tmp/ande-meituan-continue-pY4JKw/`，旧失败原稿不改签。小米社招仍未证明城市无主次，不放宽；未扩批、提交、push或部署。

## 13. 改为先上线、后完善（2026-10-07）

用户明确允许接口漏项、部分正文与覆盖待补，要求真实可用数据先上线，已知问题记录后修；不再用双轮一致/数小时深度验收阻塞交付。SPEC §4.3、AGENTS及D07同步替代旧门槛，旧审稿不改签，真实性/安全/唯一publisher/非目标保护保留。

现有26,932岗先部署到现成GitHub Pages；社招可用数据的宽松发布路径接着补，不让采集接口改动再次挡住站点上线。当前实现的严格来源gate尚未全部迁移，不能仅因文档改变便声称社招已发布。

已按本次上线授权提交/推送 `a0c52e5`，GitHub Pages构建built且commit一致。线上 `https://feng7.cn/wheres-my-job/`（原GitHub Pages入口跳转此处）首页/app/data均HTTP200；本次部署含26,932岗/36源。线上整文件字节核对60秒超时，未冒新线上全量浏览器验收或性能已达标；数据体积/加载性能和社招补入记录后修，不阻塞现有版本上线。部署收据 `/tmp/ande-online-release-a0c52e5.json`。

## 14. 可用优先落到社招：新增4,368岗（2026-10-07）

只处理已授权美团/小米社招，复用既有第一轮正常官网材料，无新招聘API请求、无双轮重扫、无模型逐岗读JD。经同一update→crawl→snapshot→publisher链本地发布美团2459＋小米1909，**26,932→31,300，已有数据来源36→38（36 ready＋2 available）**；39公司/66登记不变。

新增`complete:false,verification.policy:available`可用路径、来源状态available，与完整资格分开。程序检查原HTTP/业务/登记scope、安全身份/链接、实际唯一数量与已有文字绑定；重复按官方ID处理，total变化/详情缺失记录，原scope非目标及缺证零保护保留。publisher不完整更新增量并入、不把未取到者删掉、空正文不覆盖已有可用JD。生产美团改为单轮及能取得的详情，真实拒绝即停不retry；小米社招type1列表先展示，不排序城市数组或猜主次。旧完整路径仍用于既有36来源/离线兼容，其余模块按机会逐步迁移。

美团用原247列表/EOF＋2459详情，第二轮首页2459→2458只作为已知问题，不擅删任何岗；2459完整正文保真实六片。小米用原192响应/1909唯一ID，职责/要求全部非空，额外详情未补所以全部jdComplete:false并提示。资料时点取原响应记录美团07:44:32.405Z、小米04:25:39.448Z，不冒本次新采集钟；旧失败原稿未改签。

基础全量程序检查：重复ID/非法链接均0，原26,932岗位及非目标source metadata/目录相同，113个非目标out的SHA与mtime原样。308项离线回归通过；实际本地HTTP仅抽3岗（双语介绍、列表两栏、6070字长正文），查询/row/modal全文/官网安全链接/完整性提示通过，非全量/非file/非新线上全量验收，自有Chrome/profile/server已清理。已修“缺详情但有正文被误称官网空白”的提示。

本机材料 `/tmp/ande-social-available-1XuAin/`：原基线、原失败out备份、新可用envelope、publication-result、delivery-check、page-smoke；这些不是跨runner持久化。社招额外正文补齐、加载性能、持久快照/定时仍是后续修复，不阻本次上线。

**实际部署**：`8248f9be9ae523e93504a7c71c97713f9cade45e`已commit/push main，Pages build精确built/error null；https://feng7.cn/wheres-my-job/ 线上app逐字节等本地，数据头两源均available且计数2459/1909。此次只下载数据头，不声称整文件SHA一致。GitHub提示数据67.76MB超过推荐50MB但push成功。

**线上浏览器抽样未通过，待修不冒绿**：自有Chrome等待查询UI约120秒超时，没有JD样本完成；后续8秒观察显示首页/CSS/词表200，data/app脚本尚未收到响应，ANDE_DATA未定义，未见运行期异常。Node对相同未加参数URL首字节200（app约1415ms、data约153ms），因此尚不能把根因定成文件大小/脚本计算或官网拒绝。两次自有Chrome/profile均清理，资料为`online-check.json`、`page-smoke-online.json`、`online-load-diagnose.json`。本地3岗实际页面通过与线上build/数据资源交付分别记录；线上查询/JD完整加载仍待确认，优先作为后续性能/传输问题处理。

## 15. 白屏根因修复与本地验证（2026-10-07，仅本地）

用户也复现打不开，明确禁止每次修复就push。确认首页空容器被第一个defer全量JD脚本阻塞：整库约68MB/gzip19MB，HTTP200首块不证明完成；只替换该依赖为89字节合成数据、其余线上资源不变时0.908秒出现界面。不是采集失败或岗位丢失；底层网络慢的具体节点仍未定位，不冒修好了网络。

同一publisher新增派生传输：保完整`data/jobs.js`，约77KiB的catalog先显示39单位/66来源与真实数量，91个约1MiB的hash正文分片仅在显式查询时按单位完整加载。全部所需分片成功后才提交冻结条件/更新结果；故障保旧、手动再查重试，等待期间的草稿不污染提交条件，重置/新查询使旧响应失效。仍保全部17字段/3-1-0.35评分；全站查询仍要全部正文，不承诺线上秒开或减少全范围字节。辅助示例缺失不挡首页，超时迟到回调不污染缓存，等待中打开的旧JD在查询成功时同步评分并保滚动位置。

本地真实HTTP故意封锁canonical且扣住最后正文分片：首屏132ms、没有任何正文请求，目录可操作；分片未齐不出部分查询，注入503保持旧结果/分数/JD，显式重试通过；抽美团双语全文/小米列表两栏及官网链接，全范围31,300唯一岗查询完成。file相邻目录做一次基本查询/JD烟测通过。318/318离线测试通过；所有31,300原字段逐字程序对比相同，canonical SHA/size/nsmtime、source/公司/notice及119个既有out的size/nsmtime保持。自有Chrome/profile/server已清，非线上性能验证。

本机材料 `/tmp/ande-local-loading-fix/`（before/data-check、browser-smoke报告、tests-final）；诊断原稿 `/tmp/ande-white-screen-diagnosis.json`。只修改本地代码/派生文件与必要文档，HEAD仍d79de09，**未commit/push/部署，线上仍是旧加载方式**；可直接打开本地index.html测试，目录时ANDE_DATA.jobs为空是按需加载而非岗位丢失。

## 16. 首屏修复部署、首次下载待办与第一批现状（2026-10-07）

用户后续明确确认push，已一次提交/推送`5b37aedd8dce82f718b3885946896f4b99391e6e`，Pages built且commit相同；这是§15本地验证之后的新授权/交付，不改历史记录。原白屏复现线上已转绿：冷首屏约1.3秒显示目录，无整库/正文首屏请求。小米社招1909查询及一条JD/官网链接通过，但整个首次查询约44秒；美团样本在测试等待期限内未完成，未冒通过。自有Chrome/profile清理，材料`/tmp/ande-local-loading-fix/release-5b37aed.json`及`online-smoke-5b37aed.json`。

**性能待办先记录，采集工作优先**：首次查询仍下载整个所选单位的完整JD分片后再按招聘类型/关键词匹配；当前小米5片/2968条、美团14片/3030条，本机gzip估算约1.37MB/2.83MB，串行请求。原匹配排序函数本机Node测试约22–26ms，不含网络、脚本解析/DOM，不能冒线上分段计时或直接认定具体网络节点。用户体验的44秒仍属于查询慢，首屏恢复不等于查询性能修复；同页面已成功加载的分片可复用。待评估搜索必需完整匹配文字与额外JD正文分离、按实际范围减少传输，不能截断匹配文字/改评分/用部分结果冒全集。现暂停此项实现，不新增push，先处理爬取。

按当前canonical复核，第一批8公司/16来源中**9已发布，共7,321岗（7 ready＋2 available），7未发布**；全站31,300/38有数据来源（36 ready＋2 available），39公司/66登记。小米校1059/社1909，美团校园含实习571/社2459，携程校56，米哈游校260/社674，上海AI实验室校184/社149。美团社招覆盖变化已记、小米社招额外详情待补，不重新追求旧双轮门槛。

剩余7：携程社招本地489完整候选/全文，20分栏语义待核（原ready钟2026-10-06T13:28:38.614Z），未公开，可优先保真实全文/不猜分栏接发布；华为校/社正常transport已通，岗位意向/正文及adapter发布待完成；小红书校/社重复页/范围及正文接入待补，可先明确有限可用范围；百度校/社此前真实`no-auth/illegal-visit`拒绝，不绕访问限制。建议从携程社招→华为→小红书继续，小米详情后补；本轮仅记录/复核，未启动新官网请求、采集、发布、commit或push。

## 17. 携程社招→华为→小红书本地交付（2026-10-07）

用户明确授权按此顺序继续，保护31,300/38现行基线；没有后续提交/push授权。本轮经唯一crawl/snapshot/publisher链**本地新增2,024岗：33,324岗／43有数据来源（37 ready＋6 available）**，39单位/66登记不变；线上仍为5b37aed的31,300/38，不能把本地写入冒已部署。

| 来源 | 本地新增 | 实际资料完成时间（UTC） | 边界/待补 |
|---|---:|---|---|
| ctrip_social | 489 ready | 2026-10-06T13:28:38.614Z | 复用原完整候选，未重采；原生requirements为单一HTML全文，社招双语/组合标题的分栏未核，保完整正文、独立两栏空、全文匹配回退，不按20个ID猜分栏 |
| huawei | 101 available | 2026-10-07T14:35:56.641Z | 官网默认CR；已取101详情＋101岗位意向响应，全部方向按原顺序/真实标题保留；额外正文完整性仍未核 |
| huawei_social | 423 available | 2026-10-07T14:40:56.185Z | 默认SR，官方total424；37178原生jobName为空，暂未收录，不造标题；已取423详情＋423岗位意向响应 |
| xiaohongshu | 170 available | 2026-10-07T14:48:21.194Z | 仅官网2027 regular项目campus_autumn_27，不冒REDstar/Ace/独立实习或全校园；total171，重复身份1次，唯一170；列表JD已收，详情正文完整性待核验 |
| xiaohongshu_social | 841 available | 2026-10-07T14:48:43.822Z | 默认无筛选社招；total847，重复身份6次，唯一841；保原TEXT两栏，3岗仅符号占位，不删岗、不冒完整JD；详情正文完整性待核验 |

华为首次列表取得101/424后，采集器不必要的越界页触发transport业务/shape检查停止，未进入详情；原轮及58请求时序保留，失败正文未保存，不能据此断言封禁/精确EOF形状。持久红例后按原生totalPages末页停；显式复用刚取得列表续取正文（没有再扫列表），1,050请求含两次匿名bootstrap＋524详情＋524意向，保各次真实完成钟。正常Referer、CSRF仅内存、原生UA、无登录/投递/操作验证或绕过。小红书105正常POST含两源EOF，无第二轮，重复页继续至终点再按官方ID去重，数量差诚实记录而非冒全集。

新增两协议模块及四固定profile接入available资格，旧入口不因同系统继承成功。只读边界复核发现并用持久红绿关闭两处保旧问题：不完整更新的独立JD栏为空时应逐栏保旧；华为空详情/空意向不能抹已取得列表文字或只用生成标题冒正文。另将范围说明改为不按项目删岗，不从CR/SR猜实习/人才属性。本轮实际语料没有这两种正文丢失，修复不改已有524岗事实。显式publisher `--reproject <keys>`可同scope/同真实钟重投影；此次仅离线复验并修华为说明，无新请求、岗位及原钟不变，不以重投影制造新成功。

**验证**：335/335离线测试、语法及diff检查通过。程序全量基本检查新增2,024岗标题/安全官网链接/官方ID无非法或重复，空城市/正文/符号数量见收据；原31,300岗事实、61非目标source对象、39目录及116既有非目标out SHA/纳秒mtime精确不变。当前98有效分片/33,324岗全部字段与canonical逐字程序一致，旧hash保留。实际请求开始最小间隔245ms，无正文读取重叠；HTTP200不替代业务/正文/页面验收。没有模型逐岗读JD或双轮审稿仪式。

本地实际HTTP抽6条：携程30439707、华为36384四意向/42336、小红书两入口代表及13602斜杠占位；首页仅目录、各单位完整查询数量、全部已取得JD文字、官网href及安全rel/提示通过，运行错误/页面外部请求0，自有Chrome/profile/server已清。未改页面代码，不重复file烟测；新增资料未push，不能声称新来源线上页面/首次查询性能通过。第一批现为14/16来源、9,345岗，剩百度两源仍无数据/此前真实拒绝，不新增请求；小米1,909列表JD可用，详情完整性未核验不等于已证明缺某段正文。首次下载性能待办仍暂停实现。

本机材料`/tmp/ande-ctrip-huawei-xhs-HeZYzU/`：before、原采集/续取日志与时序、huawei-list-seed与同钟重投影收据、delivery-check.json、all-tests-final.log、page-smoke-*.json；仅本机，不冒跨runner持久保存。HEAD仍5b37aed，未commit/push/部署。

## 18. 本批提交/push授权（2026-10-07）

用户在§17本地交付后明确确认“可以提交，然后push”，现按此授权一次提交/推送本批代码、33,324岗数据及派生物。提交前再次335/335测试、diff检查、98分片/33,324岗逐字段保真通过，远端main仍5b37aed且为HEAD祖先；不重采、不改资料成功钟、不实现暂停的下载优化。§17的未提交/线上旧数量是授权前历史状态；具体提交号、Pages结果及线上抽样另存本机发布收据，不预先称部署/页面已通过。

## 19. 百度拒绝原因有限诊断（2026-10-07）

用户要求“找一下原因”，并指出初版似乎可采。基线HEAD/线上已为c23f59d、33,324/43：§18授权后已push、Pages精确built，线上目录与本地一致，新增五源/三个单位查询JD抽样通过（非全站性能验收）；收据`/tmp/ande-ctrip-huawei-xhs-HeZYzU/release-c23f59d.json`。

初版百度API实现已经带官网Referer/Origin，但旧128/609仅遗留展示数，缺对应成功raw/HTTP材料，不用旧页面冒当次采集成功。本轮正常匿名Node无伪UA/Cookie/登录/SDK，仅补真实Referer，原10月6日form与页长10的社/校首页分别返回HTTP200/ok、10条、声明total1653/159。最后仅去掉刚成功社招请求的Referer，复现HTTP200＋no-auth/illegal-visit，立刻停止后续请求。已确认当前缺Referer触发拒绝，正常协议可以取首页；10月6日未保存完整请求头，不追认其精确遗漏或改签历史失败。详见[来源记录§16](docs/custom-first-batch-verification.md#16-百度有限诊断正常referer恢复列表2026-10-07)。

仅3次POST、开始间隔最小317ms/无正文重叠，离线真实解析边界红/绿回放通过；无自有浏览器/服务遗留。canonical/catalog字节和纳秒mtime、131既有out均不变，未执行update/crawl/publish或全量采集，未改源码/成功钟/公开数据。第一批正式交付仍14/16来源；已解除“首页正常匿名协议不可取”的阻塞，不冒百度全量或JD完整性资格。材料`/tmp/ande-baidu-diagnosis-VM7Jkj/`仅本机；本轮两份结果文档未提交/push，不沿用§18授权。

## 20. 百度校/社可用交付，第一批16源收尾（2026-10-07，仅本地）

用户授权在正常协议原因查明后继续推进百度两源。保护§19的33,324/43基线，不重采其它来源/扩下一批/自动push。新`baidu_portal.js`固定profile接唯一update→crawl→snapshot→publisher链；正常原生Node UA、真实官网Referer，无Cookie/登录/伪UA/签名SDK。校园GRADUATE应届＋INTERN实习均空关键词/项目，不沿用旧projectType1或排AIDU；社招默认SOCIAL无筛选。原生pages末页停、单轮，不以额外EOF/双稳审稿阻塞可用交付。

| key | 本地可用数量 | 真实资料完成时间UTC | 范围/完整性 |
|---|---:|---|---|
| baidu | 632 available | 2026-10-07T15:48:05.874Z | 应届159＋实习473，各等本轮原生total/唯一数；包含官网列出的各项目，不推人才属性；列表两栏已收，详情正文完整性待核验 |
| baidu_social | 1,653 available | 2026-10-07T15:48:53.086Z | 默认SOCIAL，等本轮原生total/唯一数；列表两栏已收，详情正文完整性待核验 |

新增**2,285岗**，本地**35,609/45（37 ready＋8 available）**，39单位/66登记不变；第一批**16/16来源、8/8家公司、11,630岗（8 ready＋8 available）**完成可用交付，不冒全部正文/全球范围完整验收。官网postId与jobId为独立UUID，按已核前端postId链接，保原标题的城市前缀/编号及React TEXT职责/要求全部字符；日期/人才计划/其它性质未知。未用旧128/609遗留补缺或把接口状态冒实际可投。

346/346离线测试、语法与diff通过；逐字段snapshot/native绑定及全量基本检查无新增标题/JD两栏/城市空值、非法链接或重复ID。230正式POST全部HTTP200/ok，开始间隔最小253ms、正文读取重叠0；另一次有限INTERN首屏probe不冒正式成功钟。原33,324岗、64非目标source对象、39单位目录及131既有out SHA/纳秒mtime精确不变；当前102分片hash/计数/全字段等canonical，旧片保留。实际本地HTTP抽应届/实习/社招三个JD，百度完整单位2,285查询、原全文/标题/官网href与安全rel/未知完整性提示通过，首页只目录、页面外网/runtime/console错误0，自有Chrome/profile/server清理。未改页面代码，不重复file，不冒线上/逐岗语义/全站性能。

材料`/tmp/ande-baidu-delivery-Dqt7wQ/`：before、intern-first、production.log、230原生body/时序、delivery-check.json、tests-after-publish.log、page-smoke-*.json；仅本机，不入库或冒跨runner快照。HEAD仍c23f59d，线上仍33,324/43，本批新增代码/数据/文档未提交、push或部署，首次查询下载优化仍暂停。

用户随后确认第一批按可用交付收尾，剩余正文完整性、覆盖及属性核验等边角问题留待以后回补，不继续以此阻塞或反复打磨第一批。该确认不包含提交/push或自动启动下一批授权。

## 21. 百度交付及第一批收尾提交/push授权（2026-10-07）

用户随后明确要求“提交和push吧”，本次仅提交/推送百度适配器、唯一链接入、2,285新岗位/派生物及必要诊断与收尾记录，不重采、不启动下一批或补边角。提交前再次346/346测试、diff及35,609/45/102片hash/count检查通过，canonical SHA与§20验证结果一致，HEAD/origin main同为c23f59d。§19–20的未提交/线上旧数量为当时历史状态；具体Git提交、Pages结果及百度代表岗位线上抽样另存本机发布收据，不预先称页面已通过。

## 22. 第二批8源可用交付（2026-10-07至08，仅本地）

§21授权后已提交/push `6d3d0617cc96660e8009e30ed1469e5b127a69e3`，Pages精确built；线上catalog与本地35,609/45/102片逐字相同，冷首屏1936ms，百度三代表JD及2,285全单位查询通过。首次查询37,881ms，不冒全站性能修复；收据`/tmp/ande-baidu-delivery-Dqt7wQ/release-6d3d061.json`。用户随后“开始吧／继续”仅授权第二批8既有key，本轮不继承push授权、不扩第三批、不回补第一批边角，首次查询优化继续暂停。

冻结**35,609岗/45源**后，阿里校园1,083、百川10、B站校411/社479、蚂蚁校403/社1,193、快手校506/社10，经唯一update→crawl→snapshot→publisher链本地新增**4,095岗**。现**39,704岗/53有数据源（37 ready＋16 available）**，第二批8/8均available、`complete:false`，并非八源完整成功或全球全集；详细协议、真实钟与缺口见[第二批记录](docs/custom-second-batch-verification.md)。

- 百川普通Node HTTP405后停止，复用此前正常官网Chrome10/total18；快手社招同首页普通unsigned Node HTTP200/code:-1“系统错误”后停止，复用此前正常Chrome10/total1212及字典。保原完成钟16:38:01.858Z／17:36:13.072Z，不新开浏览器补页、不补签名或猜拒绝原因。自动官网启动流量可能并发，不冒正式串行扫描。
- B站初次尾页pages按实际size重算，误多请求各一个空页；它们HTTP200/code0，是本地形状/终点判断问题而非官网拒绝。红绿修正以页码×请求页长及total判断末页，离线重新绑定原42/48有效页、同钟重投影，岗位全部不变且无新官网请求；首次维护工具遗漏reproject被时钟保护拒绝，原失败稿保留。
- 本地HTTP抽查暴露阿里校园已入库但目录仅映控股、无法选择校园入口。补独立「阿里校园招聘入口」，不改原公司/JD、控股归属或旧偏好范围；39公司/66登记不变，页面展示单位39→40。回归覆盖首屏仅catalog parts时新入口可选、旧阿里偏好仍仅控股，不自动查询。
- 全量程序基本检查：4,095新增无空标题/JD/城市、非法链接或重复ID，全部snapshot/native及17字段投影绑定；阿里校园职能1,083未知保空。原35,609岗位、58非目标source对象及137既有非目标out SHA/纳秒mtime不变；114活动分片hash/count/全部字段等canonical，旧片保留。四次正式Node批次共419请求，最小开始间隔282/233/483/336ms、正文读取重叠0（B站含上述两次多余请求）。
- **410/410**离线测试、语法与diff检查通过。最终实际本地HTTP查询五个展示单位全部岗位，抽8源JD＋阿里实习（9代表）；原全文/标题/安全官网链接/完整性提示通过，首屏40单位无JD预取，页面外网/runtime/console错误0。因页面代码变更，另一次file基本烟测仅阿里校园/实习通过，不作file全量或线上验收。自有Chrome/profile/server清理，未动用户Chrome。

本机材料`/tmp/ande-second-batch-Ghxbqi/`含before、各生产/复用/修正日志、delivery-check.json、tests-final.log、page-smoke-*.json；原失败与工具错误不改签，raw/临时材料不入库、不冒跨runner持久化。**HEAD及线上仍6d3d061／35,609/45，本批未提交、push或部署**。百川缺8、快手社招缺1202及各额外正文/属性完整性留后补；第三批仍无执行授权。

## 23. 阿里校园按官网集团归类，及两拒绝源继续离线诊断（2026-10-08，仅本地）

用户明确要求阿里校园放对应集团。已有原生circleNames及第一方renderer已证15个官方业务单位；1,015单归属、68多归属、0未知。由sole publisher显式`--reproject alibaba`同scope/同真实钟生成可选unitMemberships和part.unitCounts，多归属在各单位可见、多选及全站只计一次；岗位17字段、来源key、公司原品牌、JD/标题/链接均不改。控股集团/国际集团只做已明确的展示名兼容，Token Foundry/千问等不凭标题合到通义、钉钉等旧品牌。归属未知才留校园入口；旧校园入口选择若失效仍保标签，不静默扩大。集团目录可同时包含校/社招，查询仍显式提交。

本地仍39,704/53，39登记公司/66源不变、50展示单位；阿里集团计数含多归属：阿里云217、淘天214、控股170、国际112等，共享岗位不计为新机会。按ID检查全部39,704岗及66source对象/39公司目录不变、161既有out SHA/纳秒mtime不变，真实钟仍2026-10-07T16:46:17.080Z；114活动片/全字段及原生归属绑定通过。checker首误要求全局数组位置相同，而publisher会重排目标来源；两次工具运行分别超时/进程137，资源终止的精确原因未测。改按官方ID比事实后通过，旧日志保留，不冒岗位丢失或重采。

413/413离线回归、语法/diff通过；实际本地HTTP冷首屏50单位无JD预取，淘天/阿里云/控股/国际/Token Foundry及淘天＋云并集完整ID检查、代表多集团JD/原全文/官网链接/dirty保旧通过，file仅淘天一次基本烟测。页面外网/runtime/console错误0，自有Chrome/profile/server清理，非新线上或全站性能验收。材料`/tmp/ande-ali-groups-mfufEW/`：before、red/green、reproject、check.json、tests-final-v2.log、smoke-http/file-*.json。

百川/快手社招此前只做到官网首页成功及一次普通Node拒绝后停止，没有因果查明。本轮继续对保存证据离线红例比对：百川公开query/body/Referer一致，但Chrome有官网自动signature，Origin/Accept等亦不同；快手query/Referer一致但Accept及匿名初始化不同。白名单已丢弃Cookie/CSRF/Sign等敏感头，不能由缺字段证明实际不存在；现有静态组件不足以证明当前HMAC要求。多变量/单次样本不能归因签名、请求头、会话或瞬时路由，根因仍未解决。`/tmp/ande-second-batch-Ghxbqi/offline-refusal-diagnosis/replay.cjs --assert-node-success`按旧响应退出1；不带参数确认历史成功/拒绝证据退出0，非新的HTTP因果对照。本轮未重试任何官网接口/开官网Chrome，不逆向/生成签名或造token；缺口10/18及10/1212不变。

未commit/push/部署，HEAD/线上仍6d3d061／35,609/45；本次归类与诊断不授第三批、签名绕过或自动重试资格。

## 24. 百川/快手社招原生翻页继续交付（2026-10-08，仅本地）

用户另行授权“继续攻克百川和快手”。改走正常匿名Chrome官网自身下一页，不再重试unsigned Node/注入SDK/生成签名/伪UA；网页路线已跑通，不把它称作历史405/code:-1单一根因已证。百川2页18岗（原10），真实钟06:07:35.736Z；快手社招默认国内121页1209唯一岗（原10），真实钟06:23:16.620Z，total1211→1210/重复ID1次/比最新total少1，未证明无城市/海外等价。

新增共用native-ui传输复用已有CDP类，生产CLI直接选官网原生分页，不先失败再自动fallback；百川严格保/绑定原生动态Referer与空UI条件，快手新v3模式保domestic真实参数、宽登记目标scope不变/可用增量保旧。真实拒绝停止、15s/900s/200页、串行正文；官网启动自动流量可能并发明确披露。实际捕获本机驱动经受控runner复用到唯一链，保资料真实钟，不再重采求测试通过；共用生产collector做离线假CDP回归。

本地39,704→**40,911/53**，净增1207，第二批累计5302；百川18及快手社招1209仍available/complete:false。保全部旧ID、39,684非目标岗位/64source、39公司、阿里归属及155既有非目标out SHA/纳秒mtime；新增基本质量、116活动片/hash/count/全字段通过。436测试/语法/diff及本地HTTP三代表新增/末页JD与单位查询通过；首屏50单位无JD预取、外网/runtime/console错误0，自有资源清理。未改页面代码，无新file验收；首checker路径/hash误读已修，旧失败材料保留。

细节见[第二批记录§6](docs/custom-second-batch-verification.md#6-用户另行授权后官网原生翻页跑通2026-10-08仅本地)，材料`/tmp/ande-two-portals-YP2JeR/`。未commit/push/部署，HEAD/线上仍6d3d061／35,609/45；第三批、性能、持久化及定时均未启动。

## 25. 第二批、集团归类及正常网页分页获授权提交/push（2026-10-08）

用户明确“提交并push吧”，授权将§22–24的代码、规范、公开数据及同publisher派生物提交至main并推送origin；不继承第三批或新采集授权，不调整Pages配置/域名、LFS或数据架构。raw/out、日志、backup及临时浏览器材料不入库。

提交前重跑436/436离线测试、diff及现行数据/保旧检查：40,911岗/53有数据来源、116活动片，39公司/66登记来源/50展示单位；阿里多归属不复制岗位，百川18/快手社招1209仍available、覆盖与JD完整性待补，真实采集钟不变。保护39,684非目标岗位/64source及155非目标out SHA/纳秒mtime，归属映射不变；不重复采集或把Git推送冒新采集/线上验收。远端提交/Pages状态与线上版本单独确认，本机回执续存`/tmp/ande-two-portals-YP2JeR/`；§22–24的“仅本地”及旧线上统计保留为当时历史。
