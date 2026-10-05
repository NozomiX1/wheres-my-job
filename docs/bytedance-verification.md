# 字节跳动 · 校招与社招来源核验

依据 SPEC v0.23。2026-10-05，仅处理 `bytedance` / `bytedance_social`；不全站采集、不登录/投递、不绕过验证、不部署或提交。校园7,492已本地发布；用户进一步明确接受社招11,093个已分类岗位，并淘汰该来源3,849旧记录：社招已迁移为九类/75分类ID的限定登记范围并仅本地发布。全社招未分类/旧类别/树外覆盖仍未知，不把范围迁移当官网下架。v0.21/v0.22过程保留为历史，当前结果见第7节。

## 1. 官网范围与旧代码差异

- 校园官网 [首页](https://jobs.bytedance.com/campus)、[无筛选职位页](https://jobs.bytedance.com/campus/position)的正常POST为 `/api/v1/search/job/posts`，`portal_type:3`、`portal_entrance:1`、`website-path:campus`；职业、地点、招聘性质、项目、职能、标签等数组与关键词均为空。
- 同一正常匿名会话中，官网/接口无筛选 count=**7,492**；用原15项职能ID＋单项目条件、只取第一页样本的 count=**1,231**。这证实实际请求范围受限，**不是历史迁移的1,211与当前7,492相减所得“漏岗数”**。历史时点和旧主站筛选不同，未取得同轮全部ID集合前不推算旧漏岗数量。
- 官方校园列表明确包含正式、实习，普通校园项目、前沿技术/Seed人才项目、日常实习、ByteIntern；职业包括研发、运营、产品、职能/支持、设计、销售、市场、游戏策划。新请求保留必要校招portal，解除个人职业/单项目条件，包含这些返回项，不从标题删计划、实习或年限。
- [社招首页](https://jobs.bytedance.com/experienced)导航的[所有职位](https://jobs.bytedance.com/experienced/position)实际为 **portal_type:2、website-path:society**；旧共享脚本硬编码6不能代表当前社招请求。其它条件为空；正式性质与社招父渠道不同。
- 两入口不是公司全球其它招聘网站的全集；页脚还链接全球/Seed等站点，未枚举其它域名。本轮保持39家公司/66个key，只迁移校招登记到共享飞书实现；注册ATS计数变为 Moka7 / 北森2 / 飞书10 / custom47。

## 2. v0.21 社招封顶核验（历史；v0.22结果见第6节）

- 无筛选UI/API count=**10,000**。正常选择研发根及其子类，count=**4,871**；正常选择官网树中其它根/子类，count=**6,222**。分类计数给出超过封顶的 **11,093下界线索**，不是经过全部唯一ID对账的全源总数。
- 父流程另在正常会话用原接口、原空条件、portal2进行3个单条分页探针：offset0返回1条、count10000；**offset10000/11093均返回0条、count仍10000**。分页空不等于官网已穷尽，不能在10000条处宣布成功。
- 官方9个根类为研发、运营、产品、职能/支持、销售、设计、市场、游戏策划、教研教学。但未分类岗位是否存在、树是否穷尽、全社招精确总数未知，不能把穷举九类自动等同于全源。
- `/api/v1/config/job/filters/2` 的统计不是明确社招范围：研发分桶9025与社招研发4871不同。社招首页正常 `/api/v1/search/job_post/count` 的body有官网ID及空facet条件，没有portal/招聘渠道；仅返回分桶map，没有aggregate/未分类总数。18585等于7492＋11093只是数值关系，不能替代范围/全集证明；公开schema的 `required:true` 也不是全后台发岗校验的证明。
- **v0.21结束时社招未获完整资格，保留3,849条历史记录。** 不能强加complete、把9类并集长度冒充官方总数、无限加页数，或拿校招成功为社招背书。正常分类查询不属于验证码绕过，但也尚未提供完整性依据；未实施社招全量分页/成功快照或发布。

## 3. JD与字段证据

当前官网普通页面的列表已经返回独立 `description` / `requirement`。下列5个公开详情的正文与对应列表均完整一致，不登录/申请：

| 入口 | 官方ID · 岗位 | 核对 |
|---|---|---|
| 校园 | [7667878785178552629 · XR系统应用开发工程师 - 移动OS](https://jobs.bytedance.com/campus/position/7667878785178552629/detail) | description和requirement都完整出现在详情DOM |
| 校园 | [7641803345097148677 · 广告大模型训练/推理优化实习生-广告架构与工程](https://jobs.bytedance.com/campus/position/7641803345097148677/detail) | 同上，包含ByteIntern及团队介绍 |
| 校园 | [7325027700371589385 · 财务BP实习生](https://jobs.bytedance.com/campus/position/7325027700371589385/detail) | 同上，非研发、日常实习，不被过滤 |
| 社招 | [7685227405894519045 · 异构计算与Token效能架构师 - TikTok研发](https://jobs.bytedance.com/experienced/position/7685227405894519045/detail) | 列表=详情API=DOM textContent；858/794字符 |
| 社招 | [7668212567291070773 · 国际化To B业务法务](https://jobs.bytedance.com/experienced/position/7668212567291070773/detail) | 列表=详情API=DOM textContent；366/230字符 |

- 页面分别渲染“职位描述”及“职位要求”，不是列表卡片可见描述的截取。它们是**原生纯文本字段**；保留空行、内部空格及字面 `List<T>` / `vector<float>` / `&amp;` 等，不能套HTML去标签/实体解码误删文字。职责存duty、要求存requirements，description回退空，不把正文重复计分；仅统一CRLF和边界空白，不截600字。
- `job_category.name` 与官网职业筛选/详情一致；保留实际叶名，根类无父也合法，不猜统一类别。`city_list` 为实际地点名；不提供城市筛选。
- `recruit_type.parent.name` 的校招/社招决定渠道；叶名实习明确性质。叶名**正式/Regular不能由社招或字段名就推成全职时长**，缺充分语义时employment:null；原始正式标记保留于rawPost，非未知false。
- `job_subject` 是项目，不自动等于人才计划；即使保留全部人才项目岗位，未取得明确按岗计划事实时talentPlan:null，保守进入人才计划入口。
- `publish_time` 存在但详情未显示带语义的日期；官方JS只是映射 `time:e.publish_time`，不能由拼写认定发布时间。公开date/dateKind:null，原字段保留在rawPost；不用抓取时间代替。
- 完整传输不保证招聘方填写详尽；空/符号保留、jdComplete:false，短但真实文本保留。其它独立嵌套正文如果出现则拒绝整源待核，不悄悄丢。

## 4. v0.21实现与安全边界（当前限定社招增量见第7节）

- [feishu.js](../crawler/lib/feishu.js)统一正常隔离Chrome会话、严格分页与正文；旧[字节custom入口](../crawler/lib/custom/bytedance.js)仅作薄兼容包装，不再保留职业/项目过滤、重复SDK或第二套抓取循环。
- 当前官网 `window.byted_acrawler` / `window.csrfToken` 不存在；旧强注SDK思路不直接恢复。观察官网自身普通请求，仅在内存复用它的匿名CSRF和正常header，同源fetch可正常200；不保存cookies/签名/token，不另注SDK、不改指纹或TLS安全。
- Node22+原生WebSocket/Chrome，自动平台路径或CHROME_PATH；临时profile、端口0、启动/HTTP/协议超时，SIGTERM/SIGINT以及finally退出/删除profile。每请求间隔至少150ms，串行；校招子进程预算15分钟不套用旧5分钟/180秒，不承诺任务SLA。
- 两轮完整扫描验证HTTP200、业务code0、显式稳定count、全页长度/ID唯一及总数、正文/原字段逐岗相同；重排但集合和字段相同允许。提前空/短页、重复、计数/ID/正文变化、触顶或count>=10000都失败，不输出部分成功。
- 只精确匹配已审查校园key/company/adapter/url/websitePath/portalType/空subject的profile可调度/发布；社招和其它8个飞书及47custom仍跳过。覆盖签名包含adapter及portalType，旧裸数组/窄范围不满足新范围；归一化再次从rawPost核对canonical字段，篡改/丢要求拒整源。
- 公开数据仍只有publish一个writer，失败由crawl回滚，来源分别获资格。校园首次历史替换不是已验证同范围下架；社招封顶失败不清空。页面、评分公式/词频/日期同分规则不改。

## 5. v0.21过程检查与结果（已本地发布校招）

- 旧真实分页表达式注入一个岗位、明确total2：校/社都返回1条作为成功，社招还省略requirement。最小回放只替换正常会话/网络层，不复活旧生产链；证据 `/tmp/ande-bytedance-legacy-repro.json`。
- 父流程首次50条正文检查误把空行规范化当文字遗漏，改为非空白逐字核对后通过；随后按第一方原生纯文本协议取消HTML转换，从根本上保留空行与代码字面量。这是检查假设修正，不是官网内容缺失。
- 独立25项新客户端离线回归覆盖早停、少字段、有效空、两次全扫、身份/字段变化、封顶、原生纯文本保真与原子失败保留；流水线另覆盖限定资格、canonical/raw对应及其它数据逐项不变。最终127项离线及原生UI均通过。

- 校招采集完成 **2026-10-05T05:28:38.194Z**，一次运行346秒；两轮各150页，最终页42条，合计7,492唯一ID。raw/snapshot岗位数组一致，全部7492的两字段可靠取得、可读JD；58种真实叶类别，七个官方项目全部保留。2,332正式仅原码保留，5,160实习明确；原始sub_title均空、无独立嵌套JD。采集前后实现hash一致，结束后无隔离Chrome/profile残留。随后补必需字段own/undefined防御，父流程对所有实际JSON岗位重新校验，与此前canonical逐项一致，没有以弱校验或重编造数据放行。
- 冻结候选 **19,980条**、字节公司范围11,341（新校7,492＋历史社3,849），Chrome154 HTTP/file **86/86**：全量14,984个字段用原生DOM文本逐一对照5,181,211 UTF-16字符，无HTML/截断/重复损失；50→100→150自然加载，空词/85+37示例/强降权ID范围一致，四宽无溢出，真实财务与正式样例标签/全文/词频/分数一致。正文之外的metadata不计分；未知日期/人才事实不造。截图和五文件hash已由父流程复核。
- 验收过程两项harness/环境警告透明保留：初次Chrome唤起系统Updater，不宣称该外部进程流量受CDP控制；最终只用该隔离Chrome的禁调度flag及localhost代理，没有改宿主服务。另一次立即连续滚动因哨兵未离开视口超时，最终驱动等待真实退出/再入，不降低50增量或范围断言。最终网页异常/错误/外网请求0，Chrome后台10次请求被代理拒绝，成功外部连接0，server/Chrome/profile清理、冻结hash不变。
- 生产唯一writer执行 **`node crawler/publish.js bytedance`**。只替换校园历史1,211条，公开文件成为 **19,980＝字节校7,492＋阶跃星辰359＋历史12,129**；其余12,488条（字节社3,849＋其他公司8,639）、其它来源元数据/目录/可选字段存在性精确不变。旧社链接ID与新校ID无字面交集，但这不是当前社集合全集/跨源关系证明；不按标题去重。
- 公开数据逐字节等于86项冻结版本，SHA256 **`f00184726108b75b9f45963da4d4c2042dbd9540fe19d3d74d94f692746c6e73`**；HTML/app/CSS/示例四文件hash和mtime完全不变。只本地发布，不部署、提交或配置定时。持久快照、社全源、其他来源与真实下载/解析性能仍待完成。

- 实际仓库发布后另做HTTP/file **6/6冒烟**（1280）：新profile空态不自动查，字节11,341范围、50→100自然加载、真实财务/正式两份完整JD与事实标签；五生产文件hash/mtime不变，网页runtime/console/network错误0、页面外网尝试0，Chrome后台8次被代理拒绝、连接全为loopback；Chrome/server/profile全部清理。父流程核对报告、真实截图与公开hash，不拿冻结页替代实际路径验收。
- 67份JS/CJS语法、242个本地Markdown引用、diff检查通过；原生UI及127项离线在发布后再次通过。新增回归的第一次红灯是必需id/title允许继承，已先红后补own/undefined边界并对所有实际岗位重算核对；不是掩盖源码错误或删掉失败断言。

最终离线/冻结/实际页面材料：`/tmp/ande-bytedance-{final-check,published-check,candidate-check,cross-source-links}.json`、`/tmp/ande-bytedance-postpublish-tests.log`、`/tmp/ande-bytedance-page-acceptance.{md,json}`、`/tmp/ande-bytedance-live-smoke.{md,json}`及相同前缀截图。它们不是长期云端存储。

原始过程材料（仅临时本机，不是云端持久快照）：
`/tmp/ande-bytedance-campus-official/`、`/tmp/ande-bytedance-social-evidence/`、`/tmp/ande-bytedance-social-official.md`、`/tmp/ande-bytedance-social-completeness-evidence/`、`/tmp/ande-bytedance-social-completeness.md`、`/tmp/ande-bytedance-social-offset-evidence.json`、`/tmp/ande-bytedance-campus-crawl.log`。
备份/冻结清单：`/tmp/ande-bytedance-baseline.json`；实际文件目录以其backup字段为准。子流程早期报告“Chrome141”为笔误，重查二进制/CDP均为154.0.8037.98；不拿笔误版本作为同版证据。

## 6. v0.22社招继续执行：分类候选已收齐，全集仍阻塞

用户授权继续社招后，先同步SPEC，再正常匿名核验及采集。没有解除生产资格、修改注册/适配器、晋升成功快照或发布社招。

### 6.1 真实候选与字段核对

- 依据官网当次 `filters/2` 九个根及全部子节点，使用官网实际可选择的两组条件：研发（含根与15个子节点），及另外八根和其全部子节点。关键词/地点/项目/招聘性质/职能/标签/门店仍为空，portal2、PC入口1不变。这只是分页分片，不是个人职业筛选；**仍未证明没有未分类/旧类别/树外岗位**。
- **2026-10-05T06:25:42.531Z–06:35:47.879Z**（605.348秒）：研发两轮各98页，4,871条；其他类别两轮各125页，6,222条。每分片HTTP/业务状态、稳定总数、完整页、唯一ID及两轮原始字段逐岗一致，前后类别树一致；两分片官方ID无交集。实际取得 **11,093个唯一已分类ID**，不再只是计数相加的下界线索；但**不是已证明的全社招总数**。
- 原始字段再次归一化与canonical逐字段一致：11,093份可读职责/要求，合计5,802,941个UTF-16字符；全部官网社招渠道。原始性质11,090「正式」＋3「劳务/顾问」，都没有已核验的全职/实习语义，因此employment仍null；date/dateKind及talentPlan也均未知。没有按标题/年限/职位类别删岗或编造事实。
- 分类构成为研发4,871、运营2,582、产品1,843、职能/支持715、销售573、设计270、市场192、游戏策划46、教研教学1。与已发布校园7,492个官方ID无交集；这只证明这两个已取得集合，不代替未知社招全集的跨来源关系。
- 候选保存在本机被Git忽略的 **`crawler/out/bytedance_social_classified_candidate_20261005.json`**，顶层 **`complete:false`**，明确标明未证明全源覆盖；SHA256 `d74abb92913baea8659c31f27949af2ead1e944e17d595f4ff45cfae3bc7ab9a`。它不是成功snapshot、没有ready状态、生产发布器不会自动使用，不是CI/云端持久存储。各分片自己的complete只证明该分片，不能向上提升为全源complete。

### 6.2 缺失参数、H5与类别契约的独立核验

- [普通客户端独立研究](bytedance-social-enumeration-research.md)直接让官网自身客户端请求：offset9990/limit10返回10条，而offset10000返回空，query/POST参数一致，portal_entrance在正文注入后进入query。PC分页器另有明确1e4上限；不存在本轮已发现的“补一个遗漏普通字段即可全量”修复。父探针跨界offset9999/limit10空不表示第10000条不存在。
- 普通设备预览确实触发H5入口2，正常主列表offset0/limit30收到HTTP405，立即停止。原因及H5 count/边界未知，不能把拒绝当空岗位、全量或宣称移动端也已证实封顶。没有安全SDK改造、验证码操作、登录或外部SDK注入；Chrome/profile已清理。
- 官网普通搜索单空格仍count10000；官网自身客户端搜索 `*` 返回count14，不能当作全匹配语法。初版关键词捕获驱动过早取响应正文产生CDP读取错误，修为等待loadingFinished后重跑，两次自然请求的HTTP200/code0/count一致；早期材料保留，不把驱动错误当产品/官网错误，也不弱化断言。
- 飞书官方[新建职位](https://open.feishu.cn/document/server-docs/hire-v1/recruitment-related-configuration/job/combined_create.md)确实把 `job_type_id` 标为必填并定义非法类别错误，但同页说明必填以租户字段设置为准；字节实际配置、旧岗位/类别停用的关联处理、当前官网树的全集覆盖均未获证明。不能把官网显示schema或跨租户创建文档升格为字节全部存量岗位保证。开放API的 `job_category_id` 是序列，不能与匿名官网同名字面字段混用。
- 官方[类别目录](https://open.feishu.cn/document/ukTMukTMukTM/uMzM1YjLzMTN24yMzUjN/hire-v1/job_type/list.md)及[职位列表](https://open.feishu.cn/document/ukTMukTMukTM/uMzM1YjLzMTN24yMzUjN/hire-v1/job/list.md)有认证分页，但需要雇主租户/用户令牌，不是匿名招聘官网全集接口；未调用、不索取或绕过雇主权限。已查普通sitemap均404，没有取得可信全源ID索引。

### 6.3 发布边界及后续选择

- 父流程复核全部11,093个原始/归一化岗位、分片唯一性/范围、类别树、候选hash与清理；`validateEnvelope`拒绝该partial候选，社招 `verifiedSource:false` / `adapterCommand:null` 仍成立。**127项离线测试及原生UI检查通过**，67份JS/CJS语法、245个本地Markdown引用及diff检查通过；不冒充新的官网全源或页面新数据验收。
- 本轮9个受保护生产文件（页面四文件、公开数据、登记、Feishu、crawl、publish）SHA256及mtime全部不变；公开仍 **19,980条**，其中社招历史3,849不变，公开hash仍 `f00184726108b75b9f45963da4d4c2042dbd9540fe19d3d74d94f692746c6e73`。只有文档及隔离本机候选/证据新增；未部署或提交。
- 当前阻塞是**全源覆盖证明**，不是正文抓取或翻页实现。按现有“完整来源成功才能替换”规则不能发布这些候选。若先向用户提供已核验的已分类岗位，需要另获明确授权把发布规则扩展为“保留未匹配历史、只补充已验证事实、明确partial状态、绝不据此判下架”；本轮没有擅自实施此规则变更。否则继续保留基线，等待可信全集/分片覆盖证据。

复核材料：`/tmp/ande-social-{start-boundaries,candidate-check,final-check,scope-probe,keyword-probe}.json`、`/tmp/ande-social-partition-candidate.{cjs,json,log}`、`/tmp/ande-social-offline-tests.log`；类别契约研究 `/tmp/ande-social-category-proof.md` 及 `/tmp/ande-social-category-research/`。这些临时材料不是长期云端存储；持久结论以本文及枚举研究为准。

## 7. v0.23按明确授权迁移限定范围并本地发布

### 7.1 用户授权与范围语义

用户明确接受既有11,093条并淘汰旧数据。本次**仅替换bytedance_social的3,849条历史**，不是全站删除历史，也不是上一轮建议的只增补。登记范围现在明确是2026-10-05核验的九类及子类、共75个分类ID；每个分片完整和并集完整只证明这个范围，**不证明全社招或公司全集**。未分类/旧类/树外仍未知，旧历史退出是获授权的范围迁移，不称官网已下架。

注册仍39公司/66key、ATS Moka7/北森2/飞书10/custom47；只有社招这一项登记变更，另65项和key顺序精确不变。来源status=ready只表示已完成登记限定范围更新，公开全局notices及source.message都明确限制，不依赖仅日志/本文说明。

### 7.2 最小共享改造与未来失败保护

- 共享[Feishu客户端](../crawler/lib/feishu.js)新增限定profile `bytedance-classified-v1`，精确key/company/域名/portal2/society/空项目及固定根/组签名，不能复制verified布尔取得资格。校园profile保持无职业/项目条件；其余8个飞书及47custom没有获得资格。
- 九根/两片75ID配置SHA为 `333ca426bd2302987db9888b152201467fceff86e13e46167b2553cff23e5e4b`；原官方树 `SHA256(JSON.stringify(job_type_list))` 为 `55e22846974c635e8827276c12e68bf09a551dc5995fdaed61f76593cde3a9ed`，均固定核验。覆盖签名含categoryRootIds、categoryGroups和categoryTreeHash，不把它们当个人方向筛选。
- 正常匿名Chrome前后GET官网树；树签名/根与分片集合任一变化就失败，不能自动扩缩范围。每片串行复用双扫、HTTP/业务状态、稳定显式总数、完整页、唯一ID及全部raw/JD字段一致；逐响应核每条categoryID属于**该片**。跨片重复ID失败，不按标题去重或静默丢记录；已取得重复标题1,538组仍保留。
- 注册限定范围的total取两片明确官网总数的和，在片内/跨片唯一ID证明后使用；不是拿自抓长度造无筛选官网total。每片count>=10000、触顶/提前空短、变化、失败或不明确空均保基线。允许的有效空也必须原审查树及两片双扫都成功。至少150ms间隔，社招20分钟、校招15分钟进程预算，不承诺SLA。
- 独立复核发现初版只固定扁平ID集合：运行前叶跨其它根迁移/根更名/parent矛盾而本轮稳定时，会错误接受有效空。三项内存反例先复现，随后加入原树hash及[真实结构fixture](../tests/fixtures/bytedance-category-tree.json)；复跑均在首次filter、**0次职位请求**时拒绝。没有以绿测试掩盖该缺口，旧假分组fixture已移除。
- 唯一[crawl链](../crawler/crawl.js)与[publish护栏](../crawler/publish.js)保留：未验证/失败/旧重复快照、raw/canonical不符或已验证覆盖变化仍拒绝，没有宽泛迁移豁免、部分源发布开关或第二writer。固定树原字段/序列化变化也保守失败，需重新核验；不擅自弱化为只验长度。

### 7.3 采用既有候选，不伪装新HTTP采集

原`bytedance_social_classified_candidate_20261005.json`顶层仍**complete:false**、SHA仍 `d74abb92913baea8659c31f27949af2ead1e944e17d595f4ff45cfae3bc7ab9a`，未知全集说明没有改写。它不能直接通过通用validateEnvelope。

本次唯一手动采用脚本先固定整artifact hash、前后树/树签名、两片范围及官方总数、全11,093身份/raw/canonical/正文和真实时刻，再为**新明确登记的限定范围**派生complete envelope。通过runCrawl正常验证/回滚/晋升，不直接手写成功snapshot或公开jobs；runner明确输出“采用此前核验候选，无新HTTP”。`originCandidateSha256`与限定范围说明留在raw。

成功快照/状态保留真实采集起止 **06:25:42.531Z–06:35:47.879Z**（2026-10-05），不改为本次采用或发布时刻。岗位date/dateKind依然null；talentPlan/null及employment未知不造。11,090正式/3劳务顾问的原码保留raw，不擅标全职、实习或人才计划。

生产文件：`crawler/out/bytedance_social_{raw,snapshot,status}.json`。complete只指snapshot.coverage中的固定分类范围；本机out仍被Git忽略，不是CI/云端持久存储。原全入口partial候选保留作为证据，不会自动被发布器使用。

### 7.4 验收与实际本地发布

- **135项离线＋原生UI**通过；新回归覆盖精确profile、树变化/HTTP/业务/shape、分片边界/封顶/重复ID、有效空、仅社历史迁移/他源保留及其它来源后来更新仍保留范围notice。初次pipeline新fixture缺少字节公司目录导致baseline身份拒绝，修正fixture后全绿，没有放松产品baseline验证。
- 冻结真实27,224条，Chrome154 HTTP/file **136/136**：Byte18585、SOC11093/CAMPUS7492，示例及强降权不减ID，50→100→150unique，dirty/JD稳定；异构计算与Token及ToB法务完整DOM正文/类别/未知属性/逐词次数及独立3/1/.35分数一致；三份官方劳务/顾问实际纳入，不从标题猜性质；1280/1440/390/320无溢出，Escape零位移。未重复遍历22,186个SOC字段DOM，父/独立审查已逐条证明raw传输与归一化；页面独立核对真实样本全文，不把原生纯文本当HTML。
- 浏览器初版两项驱动假设错误保留并透明修正：不能强制强降权后仍有零分（此数据18,585条全部负分仍保留）；localhost代理HTTP502使NetLog end_error=null不等于外网成功。最终网页console/runtime/失败网络/外网尝试0，Chrome后台13次被代理阻断、成功外连0；Chrome/server/proxy/profile清理，五文件与冻结hash一致。父复核实际报告、桌面限制notice/法务JD/320px Token截图与清理，不盲信PASS。
- 唯一writer执行 **`node crawler/publish.js bytedance_social`**，**2026-10-05T07:46:54.087Z**父核对落盘：只替换旧社3,849为11,093；公开 **27,224＝字节校7,492＋限定社11,093＋阶跃359＋其它8,280历史**。其余**16,131条**、其它来源metadata/公司目录/可选字段存在性精确不变，四前端文件hash/mtime完全不变；旧legacy-bytedance_social记录0。没有改页面布局/评分或部署/提交。
- 实际仓库发布后 HTTP/file 另 **8/8冒烟**：初次不查、27,224/Byte18,585/SOC11,093及旧社0、范围限制、50→100unique、法务完整JD/未知属性/独立8.70分一致；五文件hash/mtime未变，网页异常/错误/失败网络/外网尝试0，Chrome后台8次被本地代理阻断、成功外连0。父复核实际路径报告、两份同hash截图和清理，Chrome/server/proxy/profile均已退出/删除。
- 发布后135离线及原生UI再次通过，68份JS/CJS语法、250个本地Markdown引用及diff检查通过。
- 公开data与冻结副本逐字节相同，SHA256 **`eb3ad3ba2857b875f650d3ec87740e7bd1d90c86daf8c811be9a4ed50daf897f`**。全社招/其它来源全集、持久快照、自动更新/部署及真实全量下载性能仍待完成。

材料：`/tmp/ande-social-adopt-{baseline,candidate-check,published-check}.json`、`/tmp/ande-social-adopt-candidate.cjs`、`/tmp/ande-social-adopt-review.md`、`/tmp/ande-social-adopt-tree-drift-repro.{cjs,json}`、`/tmp/ande-social-adopt-tests.log`、`/tmp/ande-social-adopt-publish.log`、`/tmp/ande-social-stage-manifest.json`、`/tmp/ande-social-page-report.{md,json}`及同前缀截图；最终 `/tmp/ande-social-adopt-final-check.json`、`/tmp/ande-social-adopt-final-tests.log`、`/tmp/ande-social-live-smoke.{md,json}`及两张实际路径截图。这些本机材料不是长期云端存储。
