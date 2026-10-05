# 安得 · 现有66来源覆盖审计

审计日期：2026-10-05。依据 SPEC v0.20，审计当时工作树中的注册表、实际调用链、全部注册适配器及共享实现，并回看旧提交 `f114244a3ab45d863cb2eeec591dbf69d564b54d` 的主站生成路径。该提交只是历史参照，不代表未提交工作树。

**历史审计版本边界：**本文件保留v0.20审计时的66源分类、数据数量及代码行为，不滚动改造成“已完成”的全量清单。v0.21字节代码/登记已继续改造，原源码行号只对应审计冻结版本，后续锚点可能不再对齐；最新字节证据、资格及发布状态见[独立核验记录](bytedance-verification.md)。

**本轮只读源码、统计已有数据、回放离线选择逻辑；没有新官网请求、运行采集/更新/生产发布、晋升快照、改注册参数、前端或评分，也没有部署或提交。** 以下是代码与既有第一方证据的审计，不是66个官网的当日在线验收。

## 1. 结论与口径

- **保留当前安全主链，逐源改造，不整套重写。** 已解决的入口发现、解密、正常会话、列表/详情请求是可复用资产；不复用个人职业偏好或不完整成功判断。
- 「可复用」表示已有实现基础适合复用，不表示该来源已获得官网全量/JD/日期/投递可用性证明。「需改造」表示保留请求基础、修实际范围和完整性/字段。「建议局部重写」仅针对无法由现有卡片扫描证明全量及全文的提取路径，不是整套系统或每家公司重建框架。
- **已确认的覆盖缺口、确定的代码筛选行为、可能造成遗漏的风险，是三种不同证据。** 不用历史条数、页数上限、注释、退出0或新旧总数差杜撰实际漏岗数量。
- 39是注册公司数、66是来源数；公司不等于来源。数据中的13,699是记录数，不是全部公司当日在招或跨来源去重后的机会数。当前只有阶跃星辰两来源已有完整分页、详情与第一方核验记录；其359个官方ID不重叠。

| ATS | 来源数 | 可复用 | 需改造 | 建议局部重写 |
|---|---:|---:|---:|---:|
| moka | 7 | 7 | 0 | 0 |
| beisen | 2 | 0 | 2 | 0 |
| feishu | 9 | 0 | 9 | 0 |
| custom | 48 | 0 | 47 | 1 |
| **合计** | **66** | **7** | **58** | **1** |

唯一建议局部重写的来源是百川（`baichuan`）的采集/卡片解析路径。飞书9源共用一个客户端，阿里社招8源共用一个内核，不是分别重写17套。

当前公开记录 **13699**：阶跃星辰359，其他13,340原样历史；356条有可读已取得正文，3条官方符号占位，其他历史正文未补。来源状态 **62历史＋2已核验更新＋2未取得**，后两者为百川校园/上海实验室校园，不等于官网没有招聘。


## 2. 确认了什么，尚未确认什么

### 2.1 一个已确认的入口覆盖缺口

阶跃星辰首轮同轮核验：原校招141903有20条，官网导航94905有128条，原20个官方ID全部包含，新入口多108个ID。它证明**原登记只覆盖小入口**，不是证明原入口翻页漏108条。当前已经改接94905并本地发布，未另收重复来源。证据见[阶跃星辰核验记录](stepfun-verification.md)；本轮只重读既有记录/快照，没有再请求官网。

其他来源有明确代码风险，但本轮没有新的官网集合可对账，**实际少了多少仍未知**。阶跃星辰原公开147条换成359条也不能直接叫「以前漏212条」：历史时点、范围及旧展示筛选均不同。

### 2.2 旧主站确实主动裁掉了岗位，并未完整输出JD

旧每日脚本先运行 `build_score_html.js`，它**直接读raw**生成主站；之后的 `recall.js`/可选 `narrow.js` 是另一条旧判定链。因此不能把召回「每公司200」当成旧主站的采集或展示上限。

旧主站实际代码会：

- 删除实习；按标题删除部分人才计划及职能岗位，并执行注册 `exclude` 正则；校园轨道删除识别出的社招。
- 删除解析到经验下限大于3年的社招岗位；删除旧评分非正数的社招岗位。它们是个人目标下的展示裁剪，不等于请求接口没返回岗位。
- 输出只保留标题/公司/日期/命中词/旧分数等，**没有把正文、职责和要求写入主站数据**。历史导出无JD，不说明每个旧爬虫的raw当时都没JD。

历史证据：[每日脚本47–59行](https://github.com/NozomiX1/wheres-my-job/blob/f114244a3ab45d863cb2eeec591dbf69d564b54d/crawler/run_daily.ps1#L47-L59)、[主站硬排除60–73行](https://github.com/NozomiX1/wheres-my-job/blob/f114244a3ab45d863cb2eeec591dbf69d564b54d/crawler/build_score_html.js#L60-L73)、[社招零分门89–93行](https://github.com/NozomiX1/wheres-my-job/blob/f114244a3ab45d863cb2eeec591dbf69d564b54d/crawler/build_score_html.js#L89-L93)、[输出字段94–113行](https://github.com/NozomiX1/wheres-my-job/blob/f114244a3ab45d863cb2eeec591dbf69d564b54d/crawler/build_score_html.js#L94-L113)。旧调度器还仅在运行前已有raw时读取候选，首次成功会被误报「未拿到数据」：[旧crawl57–60行](https://github.com/NozomiX1/wheres-my-job/blob/f114244a3ab45d863cb2eeec591dbf69d564b54d/crawler/crawl.js#L57-L60)。这些链已退役；当前[新鲜候选/完整信封/回滚](../crawler/crawl.js#L28-L84)不依赖旧筛选。

本轮以虚拟只读FS回放旧主站实际选择循环：6个fixture里，实习、财务、人才计划、经验5年以上和零分社招5种输入均被拒，正常输入保留。评分输出刻意stub，仅验证选择门，不评价旧评分器或计算历史损失。另复现 `exclude:"(无)"` 会作为匹配「无」的真实正则误删「算法工程师（无锡）」；这是确定的条件行为，不是已观测历史岗位损失数。

### 2.3 现存爬虫仍有真正的删岗与窄范围

这些custom当前被安全主链跳过，问题不会因本轮审计改变公开数据；但不能直接接回生产：

- 字节校招实际请求带15项职能ID列表及固定subject，不是注册注释所称的纯关键词搜索：[真实请求69行](../crawler/lib/custom/bytedance.js#L69)。只证实条件被发送，未实测其现行筛选/范围及具体漏岗数量。
- OPPO校招只保留 `Graduate/doctor`，其他返回项直接跳过；请求仍传项目30，与顶部「未按项目过滤」文字不一致：[请求24行](../crawler/lib/custom/oppo.js#L24)、[白名单42行](../crawler/lib/custom/oppo.js#L42)。未知类别不能为了全量目标继续直接删除。
- 小米校招对 `toptalent/futurestar` URL或「顶尖」开头标题直接删除：[匹配26–29行](../crawler/lib/custom/xiaomi.js#L26-L29)、[continue40行](../crawler/lib/custom/xiaomi.js#L40)。后续需保留岗位，不从这套标题启发式反过来伪造人才计划事实。
- 阿里、腾讯、华为、快手、美团、网易、百度、vivo等有实际批次/项目/类别/性质选择器。需按官网逐源核对广入口；**不盲删校招/社招等必要渠道参数或北森Category**，也不把注册 `batch` 文案本身当成运行中的过滤。

## 3. 当前安全主链与共享整改项

1. **当前主链只调Moka7/北森2，飞书9/custom48不执行。** [调度9–12行及61行](../crawler/crawl.js#L9-L61)、[发布ATS资格228行](../crawler/publish.js#L228)。9个可调度来源不等于9个已做完整官网复验；Moka其他5源和北森2源仍需范围/全文/日期等实际核验。它们可能通过列表完整性校验而仍缺JD，不能把两者混为一谈。
2. **注册备注不等于实际调用。** custom使用各自常量，不读取注册 `body`；`exclude/matchKeyword` 不在当前安全链执行删岗。`lib/filter.js` 的个人筛选helper也没有当前采集/前端/测试调用。全局「说明」的一公司一条、旧build排实习等文字陈旧；以实际注册与实现为准。范围签名仍包含 `batch/note/matchKeyword` 等：[coverageFor17–21行](../crawler/publish.js#L17-L21)，不要顺手改来源备注后自动解释为下架。
3. **共享飞书需要一次改造，9来源逐一复验。** 当前客户端未严格验证HTTP/业务成功、列表/总数/身份；缺字段可回退空，非JSON错误可输出部分结果，启动失败退出0；投影没有独立 `requirement`，且没有统一超时/finally清理。保留已知正常请求基础，补完整结果/正文与生命周期，不把裸 `{total,n,all}` 改个flag就放行：[33行](../crawler/lib/feishu.js#L33)、[65–96行](../crawler/lib/feishu.js#L65-L96)、[未守护main99行](../crawler/lib/feishu.js#L99)。字段遗漏风险需对官网真实响应核对，不能只靠字段名宣称具体正文已丢多少。
4. **阿里社招8品牌共用一个内核，不能把城市分片当全量证明。** 热门城市字典不保证穷尽，失败退回默认全量片也不证明解除服务端深页限制；每片20页/空页终止，未核并集唯一ID与稳定总数，缺ID静默跳过：[探测/分片45–58行](../crawler/lib/custom/ali_social_common.js#L45-L58)、[norm64–66行](../crawler/lib/custom/ali_social_common.js#L64-L66)、[遍历92–105行](../crawler/lib/custom/ali_social_common.js#L92-L105)。注释里的约500条深度限制是线索，不是本轮在线发现。共享修复一次、每品牌范围分别核验；跨品牌重复也不能凭标题合并。
5. **上限触顶必须失败，不是成功返回部分。** 多个custom到固定页数/游标次数会直接返回数组；部分缺total以0结束首页，部分正total下空页会无限请求，重复页可假达累计数。逐源表记录不同终止方式，不把它们统称为「都漏最后一页」。Moka/北森的现有保护则会拒绝提前结束/触顶：[Moka66–73行](../crawler/lib/moka.js#L66-L73)、[北森30–37行](../crawler/lib/beisen.js#L30-L37)。更大Moka详情源的150ms串行间隔与180s子进程预算也需实测后调整，超时是安全失败，不是已证明当前截断。
6. **详情失败、身份和字段语义分别核验。** 腾讯校园、米哈游、鹰角等存在详情失败留空；腾讯社招当前只输出Responsibility，未请求详情要求。很多模块强制全职/社招、把原始类别码当名、`String(undefined)`伪装非空ID、身份与详情链接用不同字段，或丢真实职能类别。后续先校验原官方ID再转换，不静默跳过，不靠统一normalizer猜字段含义。
7. **复用JD纯文本能力，但不能硬称完整。** 已有[jd-text](../crawler/lib/jd-text.js)可保真正文、明确标题分段；新接入源尽量直接保留官网独立职责/要求字段及其他正文，避免合并后丢结构/重复计数。列表有description不代表全文，性质/日期/计划/状态缺失仍未知。`safeUrl`只证合法无凭据HTTP(S)，不证明站点官方所有权或可投，需沿来源核对链接。pause不自动下架，抓取时间不当发布日期。

## 4. 逐源清单

按v0.20注册顺序列齐66个key。表中条数/状态是审计开始时本地公开数据，不是今日官网数量；`0/未取得`更不等于官网零岗位。所有源码证据为当时工作树1起始行。

- **Moka共性**：严格稳定total/完整分页；只有阶跃星辰2源启用详情+末尾重扫ID集合；另外5源有现成详情实现可复用但尚待各自官网验证。
- **北森共性**：稳定Count/严格分页可复用；详情全文、HTML转换/别名重复、可靠日期/职能/Kind语义及请求超时待补。
- **飞书共性**：全部跳过；共享整改见上，登记入口/header/subject仅作为恢复旧CLI的核验线索，不是当前正在执行的参数。
- **custom共性**：全部跳过、裸数组不具发布资格；共同需要原始身份/字段验证、完整结束证明、有效空证据、可靠正文及完整信封。表内突出各源差异，不重复这组共同缺口。

| 来源 · 公司 | 本地记录/状态 | 建议 | 范围/入口 | 逐源风险及最小方向 | 实现证据 |
|---|---:|---|---|---|---|
| `bytedance` · 字节跳动 | 1211 / 历史 | 需改造 | 校园接口；15项职业ID白名单+固定subject单项目，关键词为空。 | 实传职业/项目条件，官网覆盖待核；缺data/list回退空，短页即停，count逐页覆盖且不校验稳定/唯一ID；JD仅列表description/requirement，全文待证。 | [bytedance.js:69](../crawler/lib/custom/bytedance.js#L69) · [bytedance.js:73](../crawler/lib/custom/bytedance.js#L73) · [bytedance.js:90](../crawler/lib/custom/bytedance.js#L90) |
| `sensetime` · 商汤 | 57 / 历史 | 需改造 | 未执行；登记路径edu、subject 7657490082207058226，旧CLI会把subject入请求。 | 共享飞书改造：NO_TARGET退出0、错误JSON可变空/部分，独立requirement未投影；缺严格完整结束及finally。登记路径/aid不算官网复验。该subject范围须查广入口。 | [sites.json:5](../crawler/sites.json#L5) · [feishu.js:72](../crawler/lib/feishu.js#L72) · [feishu.js:89](../crawler/lib/feishu.js#L89) |
| `minimax` · MiniMax | 26 / 历史 | 需改造 | 未执行；登记路径379481、subject 空，旧CLI会把subject入请求。 | 共享飞书改造：NO_TARGET退出0、错误JSON可变空/部分，独立requirement未投影；缺严格完整结束及finally。登记路径/aid不算官网复验。 | [sites.json:6](../crawler/sites.json#L6) · [feishu.js:72](../crawler/lib/feishu.js#L72) · [feishu.js:89](../crawler/lib/feishu.js#L89) |
| `lilith` · 莉莉丝 | 21 / 历史 | 需改造 | 未执行；登记路径campus、subject 空，旧CLI会把subject入请求。 | 共享飞书改造：NO_TARGET退出0、错误JSON可变空/部分，独立requirement未投影；缺严格完整结束及finally。登记路径/aid不算官网复验。 | [sites.json:7](../crawler/sites.json#L7) · [feishu.js:72](../crawler/lib/feishu.js#L72) · [feishu.js:89](../crawler/lib/feishu.js#L89) |
| `papegames` · 叠纸游戏 | 32 / 历史 | 需改造 | 未执行；登记路径campus、subject 空，旧CLI会把subject入请求。 | 共享飞书改造：NO_TARGET退出0、错误JSON可变空/部分，独立requirement未投影；缺严格完整结束及finally。登记路径/aid不算官网复验。 | [sites.json:8](../crawler/sites.json#L8) · [feishu.js:72](../crawler/lib/feishu.js#L72) · [feishu.js:89](../crawler/lib/feishu.js#L89) |
| `kimi` · 月之暗面 | 10 / 历史 | 可复用 | moonshot/148507 · campus；关键词/职能/项目条件空，batch文案不入请求。 | 目前仅列表模式：现成详情/纯文本/末尾ID重扫可复用；先核验广入口、正文/日期/类型，不由稳定total宣称全公司。180s预算需实测。 | [moka.js:61](../crawler/lib/moka.js#L61) · [moka.js:88](../crawler/lib/moka.js#L88) · [moka.js:108](../crawler/lib/moka.js#L108) |
| `zhipu` · 智谱 | 9 / 历史 | 可复用 | zphz/148984 · campus；关键词/职能/项目条件空，batch文案不入请求。 | 目前仅列表模式：现成详情/纯文本/末尾ID重扫可复用；先核验广入口、正文/日期/类型，不由稳定total宣称全公司。180s预算需实测。 | [moka.js:61](../crawler/lib/moka.js#L61) · [moka.js:88](../crawler/lib/moka.js#L88) · [moka.js:108](../crawler/lib/moka.js#L108) |
| `deepseek` · DeepSeek | 29 / 历史 | 可复用 | high-flyer/140576 · social；关键词/职能/项目条件空，batch文案不入请求。 | 目前仅列表模式：现成详情/纯文本/末尾ID重扫可复用；先核验广入口、正文/日期/类型，不由稳定total宣称全公司。180s预算需实测。另核对high-flyer组织与DeepSeek品牌对应。 | [moka.js:61](../crawler/lib/moka.js#L61) · [moka.js:88](../crawler/lib/moka.js#L88) · [moka.js:108](../crawler/lib/moka.js#L108) |
| `stepfun` · 阶跃星辰 | 128 / 已核验更新 | 可复用 | step/94905 · campus；关键词/职能/项目条件空，batch文案不入请求。 | 此前128条/逐岗详情已核验；旧20条入口包含于新范围，不重复收录。保留官方符号占位及未知人才计划。 | [moka.js:61](../crawler/lib/moka.js#L61) · [moka.js:88](../crawler/lib/moka.js#L88) · [moka.js:108](../crawler/lib/moka.js#L108) |
| `hypergryph` · 鹰角网络 | 59 / 历史 | 需改造 | Moka自定义域名，siteId26326/site校园；无职业或关键词筛选。 | 缺加密外壳直接结束并返回部分；短页终止、不读total；逐岗详情异常或缺外壳变空JD。复用官方请求/解密，修失败与完整性。 | [hypergryph.js:38](../crawler/lib/custom/hypergryph.js#L38) · [hypergryph.js:45](../crawler/lib/custom/hypergryph.js#L45) · [hypergryph.js:27](../crawler/lib/custom/hypergryph.js#L27) |
| `iflytek` · 科大讯飞 | 107 / 历史 | 需改造 | iflytek.zhiye · Category=[2]；保留渠道，非职能分类；SpecialType0待核。 | 稳定Count/分页/触顶拒绝可复用；缺请求abort与详情/ID终态复核；正文别名重复、Kind/职能/日期语义待核，不用抓取时间补日期。 | [beisen.js:19](../crawler/lib/beisen.js#L19) · [beisen.js:30](../crawler/lib/beisen.js#L30) · [publish.js:122](../crawler/publish.js#L122) |
| `alibaba` · 阿里巴巴 | 296 / 历史 | 需改造 | 固定batchId100000760001+校园channel；实际size100，非注册size10。 | 保留cookie/XSRF；首个真值total锁定、短页即停，total缺失0可使非空首页结束；列表正文分存，modifyTime优先；未执行阿里星exclude。 | [alibaba.js:63](../crawler/lib/custom/alibaba.js#L63) · [alibaba.js:68](../crawler/lib/custom/alibaba.js#L68) · [alibaba.js:74](../crawler/lib/custom/alibaba.js#L74) |
| `tencent` · 腾讯 | 105 / 历史 | 需改造 | projectMappingIdList=[1]；城市/职族/关键词空，无本地人才计划排除。 | count逐页覆盖，短页/缺count0可提前停；详情异常返回null，Workday也用同postId详情而只改外链；postId/id候选与详情身份需证。 | [tencent.js:30](../crawler/lib/custom/tencent.js#L30) · [tencent.js:68](../crawler/lib/custom/tencent.js#L68) · [tencent.js:84](../crawler/lib/custom/tencent.js#L84) |
| `tme` · 腾讯音乐 | 31 / 历史 | 需改造 | uc-job/list仅传page；无职业/项目/job_type请求筛选，未删返回项。 | job_type20/30→实习、40→社招、其余→全职，枚举/维度待核；page_count缺失默认1、空项即停；正文仅读duty。 | [tme.js:21](../crawler/lib/custom/tme.js#L21) · [tme.js:35](../crawler/lib/custom/tme.js#L35) · [tme.js:52](../crawler/lib/custom/tme.js#L52) |
| `jd` · 京东 | 105 / 历史 | 需改造 | 校园position/page固定type=present；名称/计划/方向/城市/部门条件空。 | success真但body/items缺失可成功空；首个total锁定，短页或total0提前停；publishId供ID/链接，JD仅列表workContent/qualification。 | [jd.js:9](../crawler/lib/custom/jd.js#L9) · [jd.js:52](../crawler/lib/custom/jd.js#L52) · [jd.js:70](../crawler/lib/custom/jd.js#L70) |
| `huawei` · 华为 | 67 / 历史 | 需改造 | 官方网关JSON固定jobType=CR、recruitmentType=FRESH_GRADUATE。 | result缺失空、total缺失0；仅累计数达total才停，正total下空页可无限翻；广告ID供链接，JD合mainBusiness/jobDesc/jobRequire，全职常量。 | [huawei.js:29](../crawler/lib/custom/huawei.js#L29) · [huawei.js:35](../crawler/lib/custom/huawei.js#L35) · [huawei.js:57](../crawler/lib/custom/huawei.js#L57) |
| `oppo` · OPPO | 133 / 历史 | 需改造 | body实传idRecruitProject30；仅留recruitmentType=Graduate/doctor。 | 头注释称不按项目但实际传30；类型白名单删其他岗位；用过滤后jobs对未过滤total，短页停、缺total0提前停；应最小去删岗并保原性质。 | [oppo.js:24](../crawler/lib/custom/oppo.js#L24) · [oppo.js:42](../crawler/lib/custom/oppo.js#L42) · [oppo.js:54](../crawler/lib/custom/oppo.js#L54) |
| `xiaomi` · 小米 | 830 / 历史 | 需改造 | GET固定type2、关键词/城市空；本地URL或标题识别顶尖项目并删除。 | isTopTalent匹配toptalent/futurestar或标题顶尖后continue；过滤后数量对未过滤total，短页停且total0提前停；须保留人才计划而非删除。 | [xiaomi.js:15](../crawler/lib/custom/xiaomi.js#L15) · [xiaomi.js:40](../crawler/lib/custom/xiaomi.js#L40) · [xiaomi.js:52](../crawler/lib/custom/xiaomi.js#L52) |
| `ant` · 蚂蚁集团 | 63 / 历史 | 需改造 | 校园channel、size10、pageIndex0起；未传职业/批次限制，未删实习。 | 拉至空页、不读total；递增后&gt;200静默停（最多201页），Map同ID后值覆盖；注释称分页不稳定仅是待证线索，不能把去重数当完整证明。 | [ant.js:39](../crawler/lib/custom/ant.js#L39) · [ant.js:59](../crawler/lib/custom/ant.js#L59) · [ant.js:66](../crawler/lib/custom/ant.js#L66) |
| `meituan` · 美团 | 100 / 历史 | 需改造 | jobShareType1+jobType代码1+specialCode[1]；职业/城市/关键词空。 | 请求实带jobType/specialCode条件，范围待核，非仅exclude注释；只验证data/list，totalPage缺失默认1且逐页覆盖，空页提前停；应核验并最小放宽特别项目。 | [meituan.js:40](../crawler/lib/custom/meituan.js#L40) · [meituan.js:44](../crawler/lib/custom/meituan.js#L44) · [meituan.js:51](../crawler/lib/custom/meituan.js#L51) |
| `kuaishou` · 快手 | 179 / 历史 | 需改造 | 固定recruitSubProjectCodes=[20271779425607]；未请求性质过滤或排快Star。 | list/total缺失回退空/0；仅累计达total停，正total空页可无限翻；岗位ID用code、链接用id需核验；职类字典失败静态fallback。 | [kuaishou.js:60](../crawler/lib/custom/kuaishou.js#L60) · [kuaishou.js:66](../crawler/lib/custom/kuaishou.js#L66) · [kuaishou.js:84](../crawler/lib/custom/kuaishou.js#L84) |
| `mihoyo` · 米哈游 | 105 / 历史 | 需改造 | 列表/详情均channelDetailIds[1]+hireType1；实际有逐岗job/info和链接。 | 最多40页静默触顶；短页或非零total达标停；详情异常/缺data转空JD；jobNature缺失默认全职。旧无详情/仅summary注释不符实际。 | [mihoyo.js:32](../crawler/lib/custom/mihoyo.js#L32) · [mihoyo.js:44](../crawler/lib/custom/mihoyo.js#L44) · [mihoyo.js:58](../crawler/lib/custom/mihoyo.js#L58) |
| `netease_huyu` · 网易互娱 | 40 / 历史 | 需改造 | GET固定projectId102，size100/currentPage；无职业/关键词过滤。 | total逐页覆盖，list缺失回退空，短页或total0可提前停；JD仅列表；positionTypeName放dept未出category，updateTime不应冒充发布时间。 | [netease_huyu.js:27](../crawler/lib/custom/netease_huyu.js#L27) · [netease_huyu.js:31](../crawler/lib/custom/netease_huyu.js#L31) · [netease_huyu.js:41](../crawler/lib/custom/netease_huyu.js#L41) |
| `netease_leihuo` · 网易雷火 | 61 / 历史 | 需改造 | GET固定project_id77、空job_name、size200；未删任何返回类型。 | count逐页覆盖；last_page任意真值、空列表或缺total0可提前停；type_name缺失默认全职；ID取ehr_job_id/job_code、URL官网原值，关联待证。 | [netease_leihuo.js:19](../crawler/lib/custom/netease_leihuo.js#L19) · [netease_leihuo.js:26](../crawler/lib/custom/netease_leihuo.js#L26) · [netease_leihuo.js:38](../crawler/lib/custom/netease_leihuo.js#L38) |
| `baidu` · 百度 | 128 / 历史 | 需改造 | 官方表单recruitType=GRADUATE+projectType1、空keyWord，size20。 | 最多30页静默停，缺total0可首页停；按postId/jobId去重但链接只用jobId，空ID可能合并；标题无条件去首个横杠前缀；列表JD已分存。 | [baidu.js:16](../crawler/lib/custom/baidu.js#L16) · [baidu.js:40](../crawler/lib/custom/baidu.js#L40) · [baidu.js:47](../crawler/lib/custom/baidu.js#L47) |
| `xiaohongshu` · 小红书 | 179 / 历史 | 需改造 | JSON recruitType=campus、positionName空；无职业/项目或实习/REDstar删除。 | 最多50页静默触顶；空页或缺total0提前停，无总数稳定/ID去重；JD列表duty/qualification已分存，但性质一律全职会误标混合入口。 | [xiaohongshu.js:24](../crawler/lib/custom/xiaohongshu.js#L24) · [xiaohongshu.js:37](../crawler/lib/custom/xiaohongshu.js#L37) · [xiaohongshu.js:52](../crawler/lib/custom/xiaohongshu.js#L52) |
| `ctrip` · 携程集团 | 49 / 历史 | 需改造 | condition.category2、其余职业/城市/关键词空；pager索引及size为字符串。 | 最多20页静默停、total0可首页停；ID用d.id、链接用jobId需证；列表HTML窄转换漏块分隔/实体保真，优先局部复用htmlText而非重写请求。 | [ctrip.js:26](../crawler/lib/custom/ctrip.js#L26) · [ctrip.js:40](../crawler/lib/custom/ctrip.js#L40) · [ctrip.js:77](../crawler/lib/custom/ctrip.js#L77) |
| `bilibili` · B站 | 74 / 历史 | 需改造 | 每页官方CSRF后POST校园positionList，仅pageSize200/pageNum。 | 首页pages锁定且封顶30，缺pages默认1/total0可提前停，后续页数不校验；仅读positionDescription，positionTypeName缺失默认全职。 | [bilibili.js:46](../crawler/lib/custom/bilibili.js#L46) · [bilibili.js:61](../crawler/lib/custom/bilibili.js#L61) · [bilibili.js:70](../crawler/lib/custom/bilibili.js#L70) |
| `vivo` · vivo | 129 / 历史 | 需改造 | 北森独立校园域，ClassificationOne[2]+SpecialType0；非Category筛选。 | 0起最多20页静默停，Count0可首页停；列表Duty/Require已分存但抽屉全文待证；URL全指同批次列表，Category仅dept、性质全职常量。 | [vivo.js:20](../crawler/lib/custom/vivo.js#L20) · [vivo.js:45](../crawler/lib/custom/vivo.js#L45) · [vivo.js:54](../crawler/lib/custom/vivo.js#L54) |
| `baichuan` · 百川智能 | 0 / 未取得 | 建议局部重写 | 仅官方校园首页重定向+单次Chrome dump DOM；无分页/详情协议。 | 局部重写采集/解析边界：数字ID/属性顺序regex及卡片首个div正文不可靠，非零卡片就成功，无法证明全量；保留官方入口/正常会话，非整个模块替换。 | [baichuan.js:49](../crawler/lib/custom/baichuan.js#L49) · [baichuan.js:56](../crawler/lib/custom/baichuan.js#L56) · [baichuan.js:87](../crawler/lib/custom/baichuan.js#L87) |
| `shlab` · 上海AI实验室 | 0 / 未取得 | 需改造 | mode=campus；职业/地点/性质/项目/关键词全空，limit10游标分页。 | 最多100次静默停；has_more真但缺token/空items仍成功结束，未防重复token；JD仅列表，性质缺失默认实习；不能由旧注释宣称官网全职0正常。 | [shlab.js:15](../crawler/lib/custom/shlab.js#L15) · [shlab.js:36](../crawler/lib/custom/shlab.js#L36) · [shlab.js:50](../crawler/lib/custom/shlab.js#L50) |
| `kimi_social` · 月之暗面 | 60 / 历史 | 可复用 | moonshot/148506 · social；关键词/职能/项目条件空，batch文案不入请求。 | 目前仅列表模式：现成详情/纯文本/末尾ID重扫可复用；先核验广入口、正文/日期/类型，不由稳定total宣称全公司。180s预算需实测。 | [moka.js:61](../crawler/lib/moka.js#L61) · [moka.js:88](../crawler/lib/moka.js#L88) · [moka.js:108](../crawler/lib/moka.js#L108) |
| `zhipu_social` · 智谱 | 64 / 历史 | 可复用 | zphz/148983 · social；关键词/职能/项目条件空，batch文案不入请求。 | 目前仅列表模式：现成详情/纯文本/末尾ID重扫可复用；先核验广入口、正文/日期/类型，不由稳定total宣称全公司。180s预算需实测。 | [moka.js:61](../crawler/lib/moka.js#L61) · [moka.js:88](../crawler/lib/moka.js#L88) · [moka.js:108](../crawler/lib/moka.js#L108) |
| `stepfun_social` · 阶跃星辰 | 231 / 已核验更新 | 可复用 | step/94904 · social；关键词/职能/项目条件空，batch文案不入请求。 | 此前231条/逐岗详情已核验，与校招ID无重叠；pause12仍保留，完整传输不保证招聘方填写详尽或实际可投。 | [moka.js:61](../crawler/lib/moka.js#L61) · [moka.js:88](../crawler/lib/moka.js#L88) · [moka.js:108](../crawler/lib/moka.js#L108) |
| `minimax_social` · MiniMax | 128 / 历史 | 需改造 | 未执行；登记路径index、subject 空，旧CLI会把subject入请求。 | 共享飞书改造：NO_TARGET退出0、错误JSON可变空/部分，独立requirement未投影；缺严格完整结束及finally。登记路径/aid不算官网复验。 | [sites.json:42](../crawler/sites.json#L42) · [feishu.js:72](../crawler/lib/feishu.js#L72) · [feishu.js:89](../crawler/lib/feishu.js#L89) |
| `bytedance_social` · 字节跳动 | 3849 / 历史 | 需改造 | 未执行；登记路径society、subject 空，旧CLI会把subject入请求。 | 共享飞书改造：只投影description，不保独立requirement；稳定总数/ID及完整结束缺证明。注册约1400条注释不是本轮证实的上限。 | [sites.json:43](../crawler/sites.json#L43) · [feishu.js:72](../crawler/lib/feishu.js#L72) · [feishu.js:89](../crawler/lib/feishu.js#L89) |
| `mihoyo_social` · 米哈游 | 142 / 历史 | 需改造 | hireType=0、channelDetailIds=[1]；未按职业、性质、经验或计划筛岗。 | 50条/页、最多40页；首个总数锁定，短页可提前结束且触顶不报错。详情异常吞掉后输出空JD；ID可空，详情hash链接直接拼ID。 | [mihoyo_social.js:35](../crawler/lib/custom/mihoyo_social.js#L35) · [mihoyo_social.js:44](../crawler/lib/custom/mihoyo_social.js#L44) · [mihoyo_social.js:62](../crawler/lib/custom/mihoyo_social.js#L62) |
| `baidu_social` · 百度 | 609 / 历史 | 需改造 | recruitType=SOCIAL，keyWord/projectType为空；无经验或职业限制。 | 20条/页、最多200页；总数缺失归零可首屏停，空页/触顶不校验，首个总数不复核。postId身份与jobId链接需核对；标题首个连字符前文字被删。 | [baidu_social.js:39](../crawler/lib/custom/baidu_social.js#L39) · [baidu_social.js:45](../crawler/lib/custom/baidu_social.js#L45) · [baidu_social.js:63](../crawler/lib/custom/baidu_social.js#L63) |
| `meituan_social` · 美团 | 131 / 历史 | 需改造 | jobShareType=2；职业、城市、部门、jobType/typeCode/specialCode均空。 | 100条/页；totalPage每页改写、缺失按1页，空页可提前结束，无ID去重/总数复核。jobUnionId缺失会生成字符串undefined；JD仅拼列表职责要求。 | [meituan_social.js:50](../crawler/lib/custom/meituan_social.js#L50) · [meituan_social.js:64](../crawler/lib/custom/meituan_social.js#L64) · [meituan_social.js:67](../crawler/lib/custom/meituan_social.js#L67) |
| `xiaomi_social` · 小米 | 243 / 历史 | 需改造 | type=1，keyword/cityZhNames为空；无职业、性质、经验或计划限制。 | 100条/页；首个总数锁定，缺失归零可首屏停，短页可提前结束且未验证列表数组/唯一ID。ID缺失会变undefined；未输出类别，列表JD职责要求未分字段。 | [xiaomi_social.js:23](../crawler/lib/custom/xiaomi_social.js#L23) · [xiaomi_social.js:42](../crawler/lib/custom/xiaomi_social.js#L42) · [xiaomi_social.js:45](../crawler/lib/custom/xiaomi_social.js#L45) |
| `tencent_social` · 腾讯 | 589 / 历史 | 需改造 | Query的地区、业务群、产品、职业、属性、关键词均空；经验仅输出。 | 100条/页；短页可在Count未满足时结束，首个总数锁定、同数换ID亦未检测。仅保留Responsibility，未取详情/任职要求；四次重试不等于业务成功证明。 | [tencent_social.js:24](../crawler/lib/custom/tencent_social.js#L24) · [tencent_social.js:54](../crawler/lib/custom/tencent_social.js#L54) · [tencent_social.js:61](../crawler/lib/custom/tencent_social.js#L61) |
| `iflytek_social` · 科大讯飞 | 134 / 历史 | 需改造 | iflytek.zhiye · Category=[1]；保留渠道，非职能分类；SpecialType0待核。 | 稳定Count/分页/触顶拒绝可复用；缺请求abort与详情/ID终态复核；正文别名重复、Kind/职能/日期语义待核，不用抓取时间补日期。 | [beisen.js:19](../crawler/lib/beisen.js#L19) · [beisen.js:30](../crawler/lib/beisen.js#L30) · [publish.js:122](../crawler/publish.js#L122) |
| `sensetime_social` · 商汤 | 42 / 历史 | 需改造 | 未执行；登记路径exp、subject 空，旧CLI会把subject入请求。 | 共享飞书改造：NO_TARGET退出0、错误JSON可变空/部分，独立requirement未投影；缺严格完整结束及finally。登记路径/aid不算官网复验。 | [sites.json:50](../crawler/sites.json#L50) · [feishu.js:72](../crawler/lib/feishu.js#L72) · [feishu.js:89](../crawler/lib/feishu.js#L89) |
| `lilith_social` · 莉莉丝 | 1 / 历史 | 需改造 | 未执行；登记路径index、subject 空，旧CLI会把subject入请求。 | 共享飞书改造：NO_TARGET退出0、错误JSON可变空/部分，独立requirement未投影；缺严格完整结束及finally。登记路径/aid不算官网复验。 | [sites.json:51](../crawler/sites.json#L51) · [feishu.js:72](../crawler/lib/feishu.js#L72) · [feishu.js:89](../crawler/lib/feishu.js#L89) |
| `hypergryph_social` · 鹰角网络 | 6 / 历史 | 需改造 | siteId=26325、site=social，customFields为空；不执行注册表AI关键词。 | offset每次加50、短页即停；缺少加密字段静默结束，无stat/ID复核。详情异常吞掉为空JD；ID可空，hash链接直接拼ID；日期取createdAt/openedAt。 | [hypergryph_social.js:32](../crawler/lib/custom/hypergryph_social.js#L32) · [hypergryph_social.js:39](../crawler/lib/custom/hypergryph_social.js#L39) · [hypergryph_social.js:46](../crawler/lib/custom/hypergryph_social.js#L46) |
| `xiaohongshu_social` · 小红书 | 340 / 历史 | 需改造 | recruitType=social、positionName为空；jobProjectName只是输出部门元数据。 | 100条/页、最多50页；总数缺失归零可首屏停，首个总数锁定，空页/触顶无完整性判定。ID可空且不去重；列表职责要求已保留，全文仍待验证。 | [xiaohongshu_social.js:36](../crawler/lib/custom/xiaohongshu_social.js#L36) · [xiaohongshu_social.js:42](../crawler/lib/custom/xiaohongshu_social.js#L42) · [xiaohongshu_social.js:54](../crawler/lib/custom/xiaohongshu_social.js#L54) |
| `ctrip_social` · 携程集团 | 78 / 历史 | 需改造 | category=1是社招渠道；kind/城市/事业部/职族及关键词为空。 | 100条/页、最多30页；总数缺失归零可首屏停，空页/触顶不核验且总数不复核。身份用id、详情路由用fromId；HTML转文仅覆盖部分段落/实体。 | [ctrip_social.js:63](../crawler/lib/custom/ctrip_social.js#L63) · [ctrip_social.js:74](../crawler/lib/custom/ctrip_social.js#L74) · [ctrip_social.js:80](../crawler/lib/custom/ctrip_social.js#L80) |
| `shlab_social` · 上海AI实验室 | 111 / 历史 | 需改造 | mode=social；jobFunction/location/jobType/subject/keyword均空。 | token分页10条、最多100次；has_more或token缺失即停，has_more=true但空页也停，未防token循环/触顶。items缺失当空；只取create_time，不作已核验发布日期。 | [shlab_social.js:35](../crawler/lib/custom/shlab_social.js#L35) · [shlab_social.js:53](../crawler/lib/custom/shlab_social.js#L53) · [shlab_social.js:54](../crawler/lib/custom/shlab_social.js#L54) |
| `kuaishou_social` · 快手 | 528 / 历史 | 需改造 | recruitProject=socialr且positionNatureCode=C001；性质范围待核验，经验不筛。 | 100条/页仅按累计数达total停止：缺总数可首屏停，提前空页可死循环，重复页可假达标；总数不复核。字典失败输出类别码；ID可退code但链接只用id。 | [kuaishou_social.js:58](../crawler/lib/custom/kuaishou_social.js#L58) · [kuaishou_social.js:81](../crawler/lib/custom/kuaishou_social.js#L81) · [kuaishou_social.js:91](../crawler/lib/custom/kuaishou_social.js#L91) |
| `jd_social` · 京东 | 214 / 历史 | 需改造 | form的城市/职业/部门数组及jobSearch均空；生成的标题搜索链接不是采集筛选。 | 100条/页、最多60页；短页即停、无total，触顶/重复页无失败。缺ID或标题静默丢岗；链接仅搜索前30字符，非唯一详情，JD正文未截断。 | [jd_social.js:39](../crawler/lib/custom/jd_social.js#L39) · [jd_social.js:43](../crawler/lib/custom/jd_social.js#L43) · [jd_social.js:53](../crawler/lib/custom/jd_social.js#L53) |
| `ant_social` · 蚂蚁集团 | 415 / 历史 | 需改造 | social端点、channel=group_official_site；关键词/地区/职类/业务群等均空。 | 10条/页、最多400页，仅空页终止；无total/触顶/重复页进展判定，缺ID静默跳过。experience零/未知信息弱化；列表JD职责要求未分字段。 | [ant_social.js:35](../crawler/lib/custom/ant_social.js#L35) · [ant_social.js:45](../crawler/lib/custom/ant_social.js#L45) · [ant_social.js:67](../crawler/lib/custom/ant_social.js#L67) |
| `huawei_social` · 华为 | 40 / 历史 | 需改造 | jobType=SR、recruitmentType=[]；无职业、workYear、性质或计划限制。 | 100条/页仅按累计数达total停止：缺总数可首屏停，提前空页可死循环，重复页可假达标，首个总数锁定。缺advertisementId变undefined；JD仅列表字段。 | [huawei_social.js:35](../crawler/lib/custom/huawei_social.js#L35) · [huawei_social.js:57](../crawler/lib/custom/huawei_social.js#L57) · [huawei_social.js:60](../crawler/lib/custom/huawei_social.js#L60) |
| `vivo_social` · vivo | 5 / 历史 | 需改造 | company_id/group_id均1，组织范围未证全；职业/城市/yoe_list及关键词均空。 | 100条/页、最多40页，短页即停无total，触顶/重复页无失败；缺ID静默跳过。链接仅标题前20字搜索；仅job_desc，经验零/未知弱化，时间戳单位待核。 | [vivo_social.js:24](../crawler/lib/custom/vivo_social.js#L24) · [vivo_social.js:41](../crawler/lib/custom/vivo_social.js#L41) · [vivo_social.js:58](../crawler/lib/custom/vivo_social.js#L58) |
| `bilibili_social` · B站 | 91 / 历史 | 需改造 | workTypeList/positionTypeList=[3]、recruitType=0；性质收窄待核，职业等为空。 | 100条/页、最多60页；pages每页改写并钳制，缺失按1页；提前空页、触顶/total变化不判失败，无ID去重。仅positionDescription，性质与渠道未拆。 | [bilibili_social.js:48](../crawler/lib/custom/bilibili_social.js#L48) · [bilibili_social.js:65](../crawler/lib/custom/bilibili_social.js#L65) · [bilibili_social.js:74](../crawler/lib/custom/bilibili_social.js#L74) |
| `tme_social` · 腾讯音乐 | 19 / 历史 | 需改造 | job_class等职业/城市/部门/关键词均空，按is_recommend排序；性质仅输出。 | 100条/页、最多40页，实际短页即停而非注释所称空页；无total/触顶/重复页判定，推荐排序稳定性待核。缺ID跳过；JD仅duty，要求可能未取。 | [tme_social.js:26](../crawler/lib/custom/tme_social.js#L26) · [tme_social.js:53](../crawler/lib/custom/tme_social.js#L53) · [tme_social.js:58](../crawler/lib/custom/tme_social.js#L58) |
| `netease_social` · 网易 | 228 / 历史 | 需改造 | 请求仅currentPage/pageSize；不执行实习/经验删岗，“覆盖全集团”未核验。 | 100条/页、最多40页；pages动态钳制、缺失按1页，取到的total未使用，空页/触顶不核验；缺ID跳过。取updateTime，异常可抛错；日期展示语义及性质未核验。 | [netease_social.js:28](../crawler/lib/custom/netease_social.js#L28) · [netease_social.js:43](../crawler/lib/custom/netease_social.js#L43) · [netease_social.js:54](../crawler/lib/custom/netease_social.js#L54) |
| `papegames_social` · 叠纸游戏 | 9 / 历史 | 需改造 | 未执行；登记路径social、subject 空，旧CLI会把subject入请求。 | 共享飞书改造：NO_TARGET退出0、错误JSON可变空/部分，独立requirement未投影；缺严格完整结束及finally。登记路径/aid不算官网复验。 | [sites.json:64](../crawler/sites.json#L64) · [feishu.js:72](../crawler/lib/feishu.js#L72) · [feishu.js:89](../crawler/lib/feishu.js#L89) |
| `oppo_social` · OPPO | 27 / 历史 | 需改造 | recruitTypeList=[SOCIAL-RECRUITMENT]；职业/城市/关键词为空，经验仅输出。 | 100条/页、最多20页；pages动态钳制、缺失按1页，total被忽略，空页/触顶不核验。positionId身份与jobNo路由需核对；类别本地映射失败时输出枚举码。 | [oppo_social.js:44](../crawler/lib/custom/oppo_social.js#L44) · [oppo_social.js:56](../crawler/lib/custom/oppo_social.js#L56) · [oppo_social.js:59](../crawler/lib/custom/oppo_social.js#L59) |
| `alibaba_social` · 阿里巴巴 | 284 / 历史 | 需改造 | HOST=talent-holding.alibaba.com；group_official_site，职业/批次空，城市分片。 | 共核：totalCount&gt;450才用热门城市；字典不保穷尽，失败退全量也不保覆盖。每片最多20页、空datas即停，未核总数与唯一ID并集/变动；缺ID静默丢弃。 | [alibaba_social.js:10](../crawler/lib/custom/alibaba_social.js#L10) · [ali_social_common.js:57](../crawler/lib/custom/ali_social_common.js#L57) · [ali_social_common.js:92](../crawler/lib/custom/ali_social_common.js#L92) |
| `taotian_social` · 淘天集团 | 193 / 历史 | 需改造 | HOST=talent.taotian.com；group_official_site，职业/批次空，城市分片。 | 共核：totalCount&gt;450才用热门城市；字典不保穷尽，失败退全量也不保覆盖。每片最多20页、空datas即停，未核总数与唯一ID并集/变动；缺ID静默丢弃。 | [taotian_social.js:10](../crawler/lib/custom/taotian_social.js#L10) · [ali_social_common.js:57](../crawler/lib/custom/ali_social_common.js#L57) · [ali_social_common.js:92](../crawler/lib/custom/ali_social_common.js#L92) |
| `ele_social` · 饿了么 | 23 / 历史 | 需改造 | HOST=talent.ele.me；group_official_site，职业/批次空，城市分片。 | 共核：totalCount&gt;450才用热门城市；字典不保穷尽，失败退全量也不保覆盖。每片最多20页、空datas即停，未核总数与唯一ID并集/变动；缺ID静默丢弃。 | [ele_social.js:10](../crawler/lib/custom/ele_social.js#L10) · [ali_social_common.js:57](../crawler/lib/custom/ali_social_common.js#L57) · [ali_social_common.js:92](../crawler/lib/custom/ali_social_common.js#L92) |
| `aidc_social` · 阿里国际 | 87 / 历史 | 需改造 | HOST=aidc-jobs.alibaba.com；group_official_site，职业/批次空，城市分片。 | 共核：totalCount&gt;450才用热门城市；字典不保穷尽，失败退全量也不保覆盖。每片最多20页、空datas即停，未核总数与唯一ID并集/变动；缺ID静默丢弃。 | [aidc_social.js:10](../crawler/lib/custom/aidc_social.js#L10) · [ali_social_common.js:57](../crawler/lib/custom/ali_social_common.js#L57) · [ali_social_common.js:92](../crawler/lib/custom/ali_social_common.js#L92) |
| `aliyun_social` · 阿里云 | 175 / 历史 | 需改造 | HOST=careers.aliyun.com；group_official_site，职业/批次空，城市分片。 | 共核：totalCount&gt;450才用热门城市；字典不保穷尽，失败退全量也不保覆盖。每片最多20页、空datas即停，未核总数与唯一ID并集/变动；缺ID静默丢弃。 | [aliyun_social.js:10](../crawler/lib/custom/aliyun_social.js#L10) · [ali_social_common.js:57](../crawler/lib/custom/ali_social_common.js#L57) · [ali_social_common.js:92](../crawler/lib/custom/ali_social_common.js#L92) |
| `tongyi_social` · 通义 | 63 / 历史 | 需改造 | HOST=careers-tongyi.alibaba.com；group_official_site，职业/批次空，城市分片。 | 共核：totalCount&gt;450才用热门城市；字典不保穷尽，失败退全量也不保覆盖。每片最多20页、空datas即停，未核总数与唯一ID并集/变动；缺ID静默丢弃。 | [tongyi_social.js:10](../crawler/lib/custom/tongyi_social.js#L10) · [ali_social_common.js:57](../crawler/lib/custom/ali_social_common.js#L57) · [ali_social_common.js:92](../crawler/lib/custom/ali_social_common.js#L92) |
| `dingtalk_social` · 钉钉 | 41 / 历史 | 需改造 | HOST=talent.dingtalk.com；group_official_site，职业/批次空，城市分片。 | 共核：totalCount&gt;450才用热门城市；字典不保穷尽，失败退全量也不保覆盖。每片最多20页、空datas即停，未核总数与唯一ID并集/变动；缺ID静默丢弃。 | [dingtalk_social.js:10](../crawler/lib/custom/dingtalk_social.js#L10) · [ali_social_common.js:57](../crawler/lib/custom/ali_social_common.js#L57) · [ali_social_common.js:92](../crawler/lib/custom/ali_social_common.js#L92) |
| `quark_social` · 夸克 | 136 / 历史 | 需改造 | HOST=talent.quark.cn；group_official_site，职业/批次空，城市分片。 | 共核：totalCount&gt;450才用热门城市；字典不保穷尽，失败退全量也不保覆盖。每片最多20页、空datas即停，未核总数与唯一ID并集/变动；缺ID静默丢弃。 | [quark_social.js:10](../crawler/lib/custom/quark_social.js#L10) · [ali_social_common.js:57](../crawler/lib/custom/ali_social_common.js#L57) · [ali_social_common.js:92](../crawler/lib/custom/ali_social_common.js#L92) |

## 5. 下一轮执行顺序（尚未在本轮实施）

1. **优先字节跳动校招＋社招。** 目前本地历史共5,060条、尚无正文；先按官网正常入口核对无职业/不必要项目条件的请求与完整分页，保留必要渠道，修共享飞书及字节客户端响应/生命周期/正文与身份验证。列表确实含全部职责/要求时不机械加逐岗详情；需要详情时逐岗取全。先离线fixture、再真实候选/官网核对，再单公司发布。不能因接回字节就同时放行其余8个飞书源。
2. **低改造成本：剩余Moka5源。** 月之暗面/智谱的校园和社招、DeepSeek可复用阶跃星辰已验证能力；逐个确认组织/导航广入口、完整正文、日期和类型，测量请求总耗时再决定180s预算。不是只翻fetchDetails开关就认定全职业或完整JD。
3. **按共享实现推进飞书、阿里八源与北森/鹰角。** 优先解决会影响多个来源的共享完整性和正文问题；保留各站正常请求差异。鹰角虽登记custom但协议类似Moka，vivo校园虽登记custom但响应类似北森，不能把custom48个一概当48种完全不同系统；确认真实协议后复用，不先改ats绕过资格。
4. **其余custom逐源改造，百川再换提取路径。** 对小米/OPPO等已确认代码删除先准备不删岗fixture，核验项目/性质的官方语义；其它来源按风险与真实可遍历性推进。百川优先查当前官网列表/详情协议，若可共用飞书则复用；若之后能证明DOM可穷尽并取全文，也可改造现有实现，静态分类不是强制重写。

所有后续修复都留在 **update→crawl→完整成功快照→publish→静态data→浏览器排序**。无官方总数的游标/分片源要取得可信穷尽证据再定义total，不能用已抓长度盲造官方总数或complete；失败/触顶/范围未核验仍保基线。首次历史接入与已验证范围迁移分开，跨来源只按证明过的官方身份关系去重，不能按同标题删除。评分与示例词不承担采集删岗。

## 6. 审计检查与版本边界

- 核对 **66/66 key恰好一次**，39公司，30校园来源/36社招来源；18公共ATS＋22custom校园＋26custom社招，全列齐。所有逐源结论均有当前实际实现引用，997处完整/精简引用的路径与1起始行有效；分类计数7/58/1一致。引用存在检查不等于单靠脚本证明每条语义，共享与关键差异已人工回看。
- 原生UI检查、101项流水线/详情/正文离线检查全部通过；测试用临时目录/注入响应，不访问官网。本轮未改生产代码，因此不拿旧浏览器报告冒充新的页面或官网验收。
- 审计前后 **65个前端/数据/注册表/采集实现文件的SHA256和mtime均不变**。公开data保持 `ef45ddcaad01f2b354d33430d1340570e558c17a6f1523f3b1a22350ce3db9a8`，仍13,699条；未执行生产publish/update/crawl。
- 研究分三组后台只读审计，父流程核对共享链、旧主站、范围集合和逐源精简表，已收取全部结果。临时证据 `/tmp/ande-source-audit-{ats,campus,social}.md/json`、`/tmp/ande-source-audit-{campus,social}-brief.json`、`/tmp/ande-source-audit-old-gates.json`、`/tmp/ande-source-audit-tests.log` 和冻结清单 `/tmp/ande-source-audit-baseline.json`。它们不等于持久云端或CI存储；本文件是仓库内结论。
