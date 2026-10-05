# Moka 特殊来源 · DeepSeek / 鹰角初核（校园＋既有社会源）

**SPEC v0.25，只读研究；未晋升、未生产采集、未发布。** 初轮观测：2026-10-05 18:33–18:47；追加既有社会源核验：19:21–19:28（北京时间；请求时间记录为 UTC，见 §8）。仅本文件写入仓库。没有运行 crawl/update/publish、写 `crawler/out/` 或前端 `data/`、修改代码/注册表、登录、投递或处理验证。

## 分源结论

| 来源 | 本轮事实 | 不能据此声称 |
|---|---|---|
| `deepseek`，`high-flyer / 140576 / social` | DeepSeek 真官网确实指向此站；无条件列表 **37**，30+7，全部 `deptId:2028422`，官网部门目录名称为 **DeepSeek**。列表已有完整公开 HTML 正文。 | 不是 `high-flyer` 整个组织，也不等于幻方所有职位；不是公司全部渠道或逐岗投递可用性验收。 |
| `hypergryph`，旧 custom 校园 `26326` | 官方导航仍指向这个广校园站；无条件列表 **103**，30+30+30+13。覆盖 2027 应届、2028 校招实习及一个无项目岗位，**不是单一 2027 届**。列表 103 条均缺正文，生产取得 JD 必须详情。 | 不是鹰角公司全集；不是 103 份 JD 都已取得，本轮仅独立核对三个代表岗位。 |
| **既有 `hypergryph_social`**，custom 社会 `26325` | §8 追加完整无条件 **353**，30×11+23；353 均已有非空 JD、性质、发布字段。与校园103官方ID无交集；社会实习13与原日常实习13完全对应。 | 两站并集456仅是这两个观测集合，不等于公司所有渠道；仅3个独立详情/DOM样本，不是逐岗详情验收。 |

每个关系扫描均检查了 explicit `data.jobStats.total`、逐页 offset/页长/ID、稳定总数、来源内唯一 ID；完整分页仅指**该站当次列表**。没有逐岗生产收集、详情后全量复扫或持续稳定性承诺。

## 1. DeepSeek：官方链、组织命名与真实范围

### 1.1 官网指向，而不是搜索结果或 ATS 组织名推断

1. [DeepSeek 真官网](https://www.deepseek.com/) 标题为「DeepSeek | 深度求索」；「加入我们」「岗位详情」均指向 [talent.deepseek.com](https://talent.deepseek.com/)。版权主体为「杭州深度求索人工智能基础技术研究有限公司」。
2. talent 页面标题「DeepSeek 招聘」，列出 **34 个不同官方岗位链接**，全部指向 [`high-flyer/140576`](https://app.mokahr.com/social-recruitment/high-flyer/140576) 的具体 `#/job/<UUID>`。34 是页面链接数，页面没有 explicit API total，不冒充独立完整来源。
3. Moka 公开页面初始化配置 `window.TurboApply.data` 的白名单身份字段为：
   - `org.id:"high-flyer"`，`org.name/displayName:"幻方&DeepSeek"`；
   - `org.siteId:140576`，`org.type:"social"`，`org.siteName/customTitle:"DeepSeek招聘"`；
   - `mode:"social"`，`siteId:"140576"`，`aesIv:"de7c21ed8d6f50fe"`。
4. 该站普通部门接口 [`jobs/departments/flat`](https://app.mokahr.com/api/outer/ats-apply/website/jobs/departments/flat) 与 `structure` 均给 `2028422 → DeepSeek`；完整 37 条列表全部这个 `deptId`。三个独立详情的 `department` 和 `departments` 也直接给出 `DeepSeek`，并非由技术标题猜公司。

**组织空间不是公司身份。** [幻方官网](https://www.high-flyer.cn/) 自称幻方量化，介绍 AI 投资对冲基金；[它的「加入我们」](https://www.high-flyer.cn/join/) 指向另一个 [`high-flyer/4604`](https://app.mokahr.com/apply/high-flyer/4604#/jobs/?keyword=&_k=tclq96) 站。该普通旧版 `website/jobs` 请求 `limit:15,offset:0,siteId:4604,orgId:"high-flyer",site:"social",needStat:true`，explicit total **3**、实际 3 个唯一 ID、`deptId:60243`，标题为量化策略研究员、深度学习科学家/研究员（杭州）、资深开发工程师（杭州）；与 140576 的 37 个 ID 无重叠。

这是不同官网品牌/招聘站及部门边界的直接证据，**不能把 4604 或 org 下其他幻方岗归给 DeepSeek**。本轮没有公司股权/法律实体关系研究，也没有枚举 `high-flyer` 全组织所有站点；共享 ATS org 不证明同一公司或毫无关联。

### 1.2 新 talent 导航与原登记 140576 的关系

无条件 140576 列表 explicit total **37**，分页 **30/7**。talent 的 34 个链接 ID 全部在这 37 条中。多出的三个旧 ID 为：

- `40447266-bdbb-4728-8db4-ed1435408026`，Agent Harness 研究员（实习/全职）；
- `54f386a9-913b-4626-9bf4-e1709b62fcda`，Agent Harness 产品经理；
- `ec402ff5-47fe-4e32-820c-b04884fca585`，Agent Harness 研发工程师（全职/实习）。

三个**列表已有的完整正文**均为「投递 Agent Harness 团队的职位请移步【新链接】」，链接到同站 [Agent Harness 团队 `8d40c764…`](https://app.mokahr.com/social-recruitment/high-flyer/140576#/job/8d40c764-d2b2-49b1-826c-e3f2adb75c01)。研究员旧链接另经独立详情和正常 DOM 核对，HTML 逐字相等。

因此这次差异有官方“旧岗位指向新岗位”证据；但旧三岗仍在默认列表、`status:"open"`。**不静默删掉旧三岗、不把 34 冒充新的完整来源、不擅自按标题/跳转合并 ID。** 是否折叠重定向机会属于后续显式口径，不是此次批准的注册变化。

## 2. 鹰角：广校园站与届次/日常实习导航

[公司官网](https://www.hypergryph.com/) 的「加入我们」指向 [career.hypergryph.com](https://career.hypergryph.com/)；招聘官网导航「校园招聘」仍指向 [旧自定义域 26326](https://jobs.hypergryph.com/campus_apply/hypergryph/26326#/)，「社会招聘」指向 [26325](https://jobs.hypergryph.com/apply/hypergryph/26325/#/jobs)。

校园公开初始化身份为 `org.id:"hypergryph"`，`name:"上海鹰角网络科技有限公司"`，`displayName:"鹰角网络"`，`siteId:26326`，`type:"camp"`，`siteName:"系统默认校园招聘门户"`，`customTitle:"鹰角网络校园招聘"`，`mode:"campus"`。不是只含某一届次的专门 site。

首页普通「立即投递」链接还明确指向 [Moka 域的同一校园站无条件列表](https://app.mokahr.com/campus-recruitment/hypergryph/26326?locale=zh-CN#/jobs)。顶部三个公开导航短链的真实落点：

| 官方短链 | 真实落点/请求条件 | explicit total；穷尽分页 |
|---|---|---|
| [2027 届应届生](https://app.mokahr.com/su/nE0wU) | 同一 campus `26326`，`projectFolderIds:["100124272"]`；项目「秋招2027届应届生」 | **58**；30/28 |
| [2028 届校招实习生](https://app.mokahr.com/su/nTLy8) | 同一 campus `26326`，`projectFolderIds:["100120340"]`；项目「秋招2028届校招实习生」 | **44**；30/14 |
| [日常实习](https://app.mokahr.com/su/b8lZs) | **social `26325`**，`commitments:["实习"]`；不是校园同站，也不是新届次 site | **13**；13 |

完整 ID 关系：58 与 44 无交集，两者均完整包含于校园无条件 103；并集 102，遗漏的是 [数据产品 `688db8c0…`](https://jobs.hypergryph.com/campus_apply/hypergryph/26326#/job/688db8c0-0b97-45d4-b644-7ef5d3c32c6f)，其列表和详情均无 `projectFolder`。日常实习 13 的 ID 与校园 103 无交集。上述关系有所有页 IDs 支撑，不靠总数相加猜包含关系。

校园无条件结果的 `commitment` 为 **全职 59 / 实习 44**；不是「2027届校招103」，也不能由“实习”二字把 social 26325 的日常实习改成校园来源。103 内还有不同部门 ID，不能用部门筛选删掉官方站内机会。

**注册事实更正：26325 原本就是既有 `hypergryph_social`，不是未登记候选。** 复读 `crawler/sites.json` 确认 `track:"social",ats:"custom"`、API 为 `jobs.hypergryph.com/.../jobs/v2`、body 指明 `siteId 26325 + site:social`，目录仍 **39 公司/66 来源**。初轮确实只核了无条件第一页：explicit total **353**、页长 **30**，当时没有穷尽或证明校园/社会全站交集；这是保留的历史观测，不是当前完成情况。此前“候选/另注册社会源”的措辞是研究遗漏，非注册表事实；本次按父复核追加为同一 Moka 批次第7目标，完整后续核验见 §8。不新增来源、不淘汰原 scope，公司所有渠道全集仍 unknown。

## 3. 当前官方列表/详情协议，而非先改 ATS 再试

### 3.1 无条件 jobs/v2

| 源页面 | 实际捕获的 POST origin 与路径 | 默认无条件请求 |
|---|---|---|
| DeepSeek 140576 `#/jobs` | [`https://app.mokahr.com/api/outer/ats-apply/website/jobs/v2`](https://app.mokahr.com/api/outer/ats-apply/website/jobs/v2) | `orgId:"high-flyer",siteId:"140576",limit:30,offset:0,needStat:true,jobIdTopList:[],customFields:{},site:"social",locale:"zh-CN"` |
| 鹰角 custom campus 26326 `#/jobs` | [`https://jobs.hypergryph.com/api/outer/ats-apply/website/jobs/v2`](https://jobs.hypergryph.com/api/outer/ats-apply/website/jobs/v2) | `orgId:"hypergryph",siteId:"26326",limit:30,offset:0,needStat:true,jobIdTopList:[],customFields:{},site:"campus",locale:"zh-CN"` |

没有非空职业、项目、部门、经验、关键词等条件。初始浏览器原样发出这些请求；研究分页只复用它们，改变 offset，保留页长 30。额外手动协议分页 POST 合计 **6 次**（DeepSeek 1、校园 3、2027 项目 1、2028 项目 1），没有逐岗抓取全量详情。

两源 HTTP 200 的公开 AES 外壳均为 `{data:<base64 string>,necromancer:<key string>}`。直接调用当前 `crawler/lib/moka.js` 的 `decryptAes(data,necromancer,"de7c21ed8d6f50fe")`，得到 `code:0,success:true,data:{jobStats:{orgId,total},jobs:[...]}`，与 `extractJobs` 所要求的 explicit total 形状成立。解密不是安全 SDK 逆向：这是公开业务封套；[官方业务客户端](https://static-ats.mokahr.com/recruitment-web-client/javascripts/recruitmentWeb-20260921-1936-e040c-release.js) 的 `we/Pe` 函数本来就使用 `necromancer`、页面 `aesIv`、CBC/PKCS7。

**共享 Moka 核心协议成立，但 origin 是来源事实。** 初轮所读通用 `moka.js` 硬编码 `app.mokahr.com`，旧鹰角 custom 使用 `jobs.hypergryph.com`。不能因为解密成功就先改 `ats` 或把自定义域请求偷偷发到另一个域。

### 3.2 独立详情与域名证据

正常页面直接打开 `#/job/<UUID>`，浏览器匿名发 POST `website/job`：

```json
{"orgId":"<org>","jobId":"<UUID>","siteId":140576或26326,"locale":"zh-CN"}
```

- DeepSeek 的三个样本实际向 `https://app.mokahr.com/api/outer/ats-apply/website/job` 请求。
- 鹰角三个 **custom 域正常页面**实际向 `https://jobs.hypergryph.com/api/outer/ats-apply/website/job` 请求，不是仅爬虫代码注释的猜测。
- 因首页本来公开链接到 app 同站，再独立打开 [app 域角色模型样本](https://app.mokahr.com/campus-recruitment/hypergryph/26326#/job/241fe7d3-488e-4a76-a217-c5477f5b686d)，真实请求 origin 为 `app.mokahr.com`；与 custom 域样本的保留公开详情字段逐项相等、DOM 正文一致。**这只证明一个样本双域一致，未证明两个域整个 103 列表/全详情长期可互换。**

详情也是相同 AES 外壳，解密后 `data` 是一个对象，不是 jobs 数组。保留公开字段形状：字符串 `id/orgId/title/jobDescription/publishedAt/status/commitment`；`zhineng:{id?,name}`；`locations:[{id,cityId?,cityName?,provinceName?,country,countryDescription?}]`；`department:{id,name}`、`departments:[...]`；可选 `projectFolder:{id,name}`。

## 4. 正文、类别、性质、地点与状态

每源三个代表样本均由**独立详情请求**取得，另核正常页面正文节点；`job-description-VvfEUGocNE` 的 `innerHTML` 与详情 HTML 逐字相等，DOM 全文比较只忽略空白。官网测量 shadow 节点也重复完整正文，不把重复节点当两份 JD。

| 官方样本 | 直接归属及字段事实 | 正文事实 |
|---|---|---|
| [DeepSeek 研发基础设施](https://app.mokahr.com/social-recruitment/high-flyer/140576#/job/a63f2346-b672-4c48-af43-0a64bfe97a41) | `department/departments:DeepSeek`；职能 AI核心系统研发；全职；北京/杭州 | 列表、详情、正常 DOM HTML 逐字相等 |
| [DeepSeek 法务团队](https://app.mokahr.com/social-recruitment/high-flyer/140576#/job/7dfbdfc9-d61f-481e-ab19-954c10b8f763) | `DeepSeek`；职能法务团队；全职；杭州 | 同上，非技术岗没有剔除 |
| [DeepSeek 旧 Agent 研究员](https://app.mokahr.com/social-recruitment/high-flyer/140576#/job/40447266-bdbb-4728-8db4-ed1435408026) | `DeepSeek`；职能其它；官方 `commitment:"全职"`，标题却有“实习/全职” | 完整公开正文只有转新链接提示，不能补造实质 JD/按标题改性质 |
| [鹰角角色模型](https://jobs.hypergryph.com/campus_apply/hypergryph/26326#/job/241fe7d3-488e-4a76-a217-c5477f5b686d) | 鹰角；美术表现类；全职；上海；2027 项目 | 列表无 JD；详情/DOM 全文一致 |
| [鹰角声音设计师（实习）](https://jobs.hypergryph.com/campus_apply/hypergryph/26326#/job/e3c71634-ce09-46a9-a4aa-6b3d20736092) | 鹰角；产品策划类；实习；上海；2028 项目 | 列表无 JD；详情/DOM 全文一致 |
| [鹰角数据产品](https://jobs.hypergryph.com/campus_apply/hypergryph/26326#/job/688db8c0-0b97-45d4-b644-7ef5d3c32c6f) | 详情 `department:鹰角`，`departments:[社区产品]`；列表 `deptId:1941297`；列表职能「其它」/详情「其他」均无职能 ID；`locations:[]`；无项目；官方性质全职 | JD 要求在读、能稳定实习，和性质字段不一致；忠实保留，不替招聘方纠正 |

- DeepSeek **37/37** 列表有字符串 HTML `jobDescription`，**0/37** 有 `publishedAt`，**0/37** 有 `commitment`。不能把三个详情样本的全职/日期填到其余岗位；列表已有 JD，不应为同一正文给每岗额外发详情。
- 鹰角校园 **0/103** 列表有 `jobDescription/publishedAt`；**103/103** 有 `commitment`、职能对象、地点数组。数据产品的数组确实为空，不造“上海”；缺职能 ID 不等于缺公开职能名称。校园生产若要求每岗正文，详情是必要步骤，本次没有做。
- 两源所收齐列表 `status` 均为 `open`（37/103），样本详情同码；这不是已验证可以投递，也不是其他状态的隐藏规则。没有点击申请或提交任何表单。
- 原 custom 使用 `createdAt || openedAt` 的日期口径，以及仅空页/短页停止、详情异常吞掉返回空串的做法，不是此次核验认可的发布契约。

## 5. 发布日期的真正客户端契约

不是凭字段名或样本日期碰巧相等：[同一第一方公开业务 bundle](https://static-ats.mokahr.com/recruitment-web-client/javascripts/recruitmentWeb-20260921-1936-e040c-release.js) 有明确业务绑定：

- 详情字段字典 `PUBLISH_AT: i18n("发布日期")`；`case "publishedAt"` 使用 `formatDate(currentJob.publishedAt)`。
- 标题 renderer 读取 `job.publishedAt`，字段配置包含 `publishedAt` 才输出 `"发布于 {0}"`；列表 renderer 也直接绑定 `publishedAt → "发布于 {0}"`。
- 两个核验站的公开 list/header/info 显示配置**没有启用 publishedAt**，所以 DeepSeek/校园当前页面未显示发布日期。样本详情确有该字段，例如研发基础设施 `2026-08-28T15:41:41`、角色模型 `2026-08-13T11:11:58`，它们的 `createdAt/openedAt/updatedAt` 是不同值，不改标签冒充发布。
- 鹰角 social 26325 的页面实际显示「发布于 …」，其公开配置启用 `publishedAt`，普通列表也返回它。这不使 campus 26326 自动获得相同列表字段。

可以证实 **publishedAt 是官方可选“发布”渲染输入**；没有字段的岗位仍必须保留日期未知。此处字符串没有时区偏移，本轮未证明服务器时区/精确瞬时时间，也不把 update/create/open 字段当同义替代。

## 6. 未知与父代理下一步最小改法

1. **DeepSeek 保持 140576 scope。** 不换成 talent 34 的静态展示、不过滤职业、不扩张整个 `high-flyer`。列表正文直接复用；缺日期/性质保持未知，不能为正文统一开 `fetchDetails:true` 给 37 岗多请求。若下一阶段要求逐岗补元数据，需要先明确额外请求预算与口径。三个官方转链接旧 ID 保留原事实，不静默删除/去重。
2. **鹰角可考虑复用严格 Moka 核心，但本轮不改 ATS。** 生产实现最小边界是明确允许的 API origin、source org/site/track、explicit-total 分页，以及列表缺 JD 才必取详情；自定义域可通过一个受约束 origin 参数复用，不复制另一份宽松分页/解密代码。迁移到 app origin 若要宣称整个来源等价，还缺双域无条件完整列表/ID 核验，不能由一个样本外推。
3. **登记范围不能标成单一届次。** 26326 是广校园103；2027/2028 是同站项目筛选，日常实习是**既有 `hypergryph_social` / 26325** 的实习过滤，社会源本就在本次同协议 Moka 批次范围，**不需另注册或把公司拆到未来批次**。若选择窄项目仍须显式批准；公司所有渠道全集继续 unknown。无项目数据产品不能因为不在届次并集中消失。
4. **后续生产验收仍欠：** 鹰角 103 份必要详情、每岗字段/纯文本正文、详情后列表复扫、完整缺失/状态口径；DeepSeek 列表全文的逐条规范化与转链接 stub 展示。当前样本通过不替代这些步骤；不生成可发布快照、不把“列表收齐”当全部 JD 或公司全集。

## 7. 临时证据、隐私与清理

全部临时材料仅在 `/tmp/ande-moka-special-*`：

- `summary.json`：官方链、身份、scope、每页 ID、关系差集、字段 schema 和完整公开样本；
- `identity.json` / `schema.json` / `samples.json`：可单独审阅的白名单身份、字段形状与七次公开详情样本（六个不同岗位＋鹰角一例双域）；
- `*-capture.json`、`*-evidence.json`：页面链接/HTTP origin/正常 request body/AES 成功形状；`*-normalbody.{html,txt}`、`*-page.{html,txt}`：正常页面全文与 DOM；
- `client.js` / `client-snippets.json`：真实公开业务 bundle、日期/AES 契约定位；没有研究或修改安全 SDK；
- `cleanup.json`：**初轮25/25** 次隔离 Chrome/profile `finally` 清理，`chromeExited:true,profileRemoved:true`，总 `cleanup:true`；追加6/6及合计31/31见 §8。`sha256.json` 是更新后的全部文件及本说明 hash；旧manifest另存 `sha256-early.json`，初轮说明原文另存 `doc-early.md`。

使用正常原生 CDP/Node stdlib，复用 `/tmp/ande-bytedance-cdp.cjs` 的隔离启动/关闭逻辑，仅 profile 前缀换为本任务命名；Chrome **154.0.8037.98**，未覆盖真实 UA（原生 `HeadlessChrome/154.0.0.0`）、TLS、指纹或注入外部脚本。未出现源 HTTP 403/429、拒绝响应或验证页面；发现阶段记录到 **14 个 ERR_TUNNEL_CONNECTION_FAILED / 5 个 ERR_ABORTED** 资源事件，未定位它们的所有资源 URL，不宣称“外网异常零”。相关官网页面和目标列表/详情均正常 200，未替换端点绕过或重试这些失败资源。后续若源拒绝仍须停源。

保留完整公开 JD/正文和规范字段；联系方式、ATS 非公开控制值、项目设置/creator IDs、telemetry 与内联脚本已排除，**不是未删减的私有配置转储**。临时证据不承诺长期持久保存。

关键 SHA-256：

| 文件 | SHA-256 |
|---|---|
| `/tmp/ande-moka-special-client.js` | `18c8a417056a1a75fa3113e341dee51a8c04b3aa4494c35904cd83df2bd2a69d` |
| `/tmp/ande-moka-special-summary.json` | `de89ca9e525d907c44a4c502b423bc1b502ab738b10dea411b71c6aa22bd3f37` |
| `/tmp/ande-moka-special-deepseek-scan-evidence.json` | `e38a31772badaf5900206ac463046202fb300a91a4206721e6d643235f62c534` |
| `/tmp/ande-moka-special-hypergryph-scan-evidence.json` | `e2fa1d05b1cb64c4537be31809973fe5bb7c4df604a64e52340f857758e3c73e` |


## 8. 后续核验：既有 hypergryph_social 纳入同批第7目标

### 8.1 注册事实与此次只读范围

父复核指出初轮遗漏后，重新完整读取 `crawler/sites.json` 及 `crawler/lib/custom/hypergryph_social.js`，确认 **hypergryph_social 已存在**：`company:"鹰角网络",track:"social",ats:"custom"`，API 为 `POST https://jobs.hypergryph.com/api/outer/ats-apply/website/jobs/v2`，body 说明 `siteId 26325 + site:social`。旧实现的“列表无JD”注释以及每岗详情补正文，与此次真实公开协议不符，不能继续当作来源契约。

仍为 **39公司/66来源**，没有新增或修改注册，也不将同协议既有社会源拆到下一批。初轮“仅捕获353总数、首页30条”仍保留在 `hypergryph-social-default-capture.json`；此次材料使用 `social-followup-*` 新后缀，不把初轮第一页重新标成完整。

官方来源继续是 [鹰角招聘官网社会导航](https://career.hypergryph.com/) → [jobs.hypergryph.com / 26325 无条件列表](https://jobs.hypergryph.com/apply/hypergryph/26325/#/jobs)。公开身份 `orgId:"hypergryph"`，公司名「上海鹰角网络科技有限公司」，`siteName:"系统默认社会招聘门户"`，`type/mode:"social"`，页面title「职位投递」。该站包含不同部门、生态子公司和实习，不按职业、部门或历史 `matchKeyword` 缩窄。

### 8.2 353 条完整列表与全部字段形状

2026-10-05 **19:21**（北京时间）正常匿名浏览器先捕获原样第一页，随后只复用同一 API/body，改变 offset，页长保持30：

```json
{"orgId":"hypergryph","siteId":"26325","limit":30,"offset":0,"needStat":true,"jobIdTopList":[],"customFields":{},"site":"social","locale":"zh-CN"}
```

没有关键词、职能、项目、部门、性质或经验条件。12页 offset 为 **0,30,60,90,120,150,180,210,240,270,300,330**，页长 **30×11＋23**，每页 explicit `jobStats.total:353,orgId:"hypergryph"`，所有岗位均严格同org、非空字符串官方ID，收齐353且ID唯一。总数/页长/所有IDs保存在 `social-followup-scan-evidence.json`。手动额外分页POST **11次**；只取3个独立代表详情，不机械给353岗追加请求。

外壳、IV与 §3 相同，复用 `moka.decryptAes` 成功得到 `code:0,success:true`；所有目标列表/详情 HTTP200。本次所有**21个观察到的列表顶层字段**的presence/type如下，具体逐字段计数另见 `social-followup-schema.json`：

| 字段 | presence/type |
|---|---|
| `id,orgId,title,commitment,jobDescription,createdAt,openedAt,updatedAt,publishedAt,status` | 每字段 **353/353 string** |
| `attributeId,deptId,hireMode` | 每字段 **353/353 number** |
| `campusSites,locations` | 每字段 **353/353 array** |
| `zhineng,applicantLimitCheck` | 每字段 **353/353 object**；投递限制对象不用于岗位正文/匹配 |
| `showIsCampus` | **353/353 boolean** |
| `prior` | **298 number / 55 absent** |
| `multiLocale` | **224 string / 129 absent** |
| `closedAt` | **99 string / 254 absent**；语义未核定，不据此隐藏官方列表岗位或改日期标签 |

职能353条均有 `zhineng.id:number,name:string`。地点353条数组均有1–2项，共354项；每项 `id/cityId/provinceId:number`、`cityName/provinceName/country:string`。性质 **全职340、实习13**，原状态 **open348、pause5**。保留pause；未点击申请，不能据原码/按钮证明可投。一个pause岗位标题为PM实习生但官方性质是全职，不按标题“纠正”字段。

**353/353 列表已有非空字符串HTML正文，无缺正文/空字符串。** 另用隔离Chrome、纯本地原生DOMParser对353份公开列表HTML检查正文：353份均有非空文本，忽略空白的长度111–1643；没有额外官网请求。此检查仅说明源提供了可读全文，不保证招聘方写得详尽或353份都已独立详情比对。生产正文应直接使用 `listJD`，旧custom的逐岗详情补JD/并发4不必要。

### 8.3 三个独立详情＋正常DOM：非技术、实习、生态子公司

普通官网详情页面实际均向 [`jobs.hypergryph.com/api/outer/ats-apply/website/job`](https://jobs.hypergryph.com/api/outer/ats-apply/website/job) 发POST，body为 `orgId:"hypergryph",jobId:<UUID>,siteId:26325,locale:"zh-CN"`；不是把custom域详情静默发到app域。

| 样本官网链接 | 类别/性质/地点 | 官方publishedAt；正常页面日期 |
|---|---|---|
| [法务BP](https://jobs.hypergryph.com/apply/hypergryph/26325/#/job/fa55d3c7-d96b-4b22-914f-821d3cab0dbf) | 职能综合类；全职；上海 | `2026-08-31T16:58:08`；「发布于2026-08-31」 |
| [海外市场实习生（韩语方向）](https://jobs.hypergryph.com/apply/hypergryph/26325/#/job/ac03c582-9713-475d-aad4-cda07b9800b3) | 发行市场类；实习；上海 | `2026-09-23T12:05:02`；「发布于2026-09-23」 |
| [灯光合成艺术家（生态子公司）](https://jobs.hypergryph.com/apply/hypergryph/26325/#/job/c6a9c5b5-6a7e-4e9a-8fe3-aa2541e16e04) | 美术表现类；全职；江苏·苏州 | `2026-09-24T17:59:09`；「发布于2026-09-24」 |

三例全部列表JD＝独立详情JD＝正常页面正文节点 `innerHTML` **逐字相等**；DOM全文比较仅忽略空白。`id/orgId/title/commitment/zhineng/publishedAt/status` 也逐项与列表一致。样本原状态均open，不把这3例外推为pause详情或353逐岗详情验收。

详情 `department` 给根部门鹰角，但 `departments` 可以是法务/制作中心等子部门，不能用根部门字段覆写实际子部门。详情locations加 `countryDescription` 却没有列表里的 `cityName/provinceId`，不是严格同形对象；生产直接保留完整列表地点，不机械用样本详情覆盖。

日期契约不仅是数值巧合：本次页面实际加载 [同版本第一方业务客户端](https://static-ats.mokahr.com/recruitment-web-client/javascripts/recruitmentWeb-20260921-1936-e040c-release.js)，再次匿名捕获完整文件，SHA仍为 `18c8a417…bd2a69d`；§5的 `publishedAt → 发布于/发布日期 → formatDate` renderer绑定仍适用。26325公开list/header配置明确启用publishedAt，普通列表353条都返回该字段，三例详情及可见日期独立支持同一契约。可靠映射为 **dateField:publishedAt / dateKind:published**；不使用created/opened/updated替代，时区仍unknown。

### 8.4 与校园、日常实习的真实ID关系

复用 **18:39** 取得的校园26326完整103集合，与此次 **19:21** 社会26325完整353集合比较官方ID：**交集0、并集456**。这是两个具体观测集合的来源并集，未同步重新扫描校园，不宣称始终无交集或公司所有渠道全集。

复用 **18:40** 日常实习导航的13个ID，与社会无条件列表中 `commitment:"实习"` 的13个ID比较，**集合完全相等**。对应13条的 `title/orgId/jobDescription/commitment/publishedAt/status/zhineng/locations` 也逐项相等。因此日常实习是既有社会源的一组筛选结果，不另注册第67源、不重复计数、不改成校园；其ID与校园仍无交集。

### 8.5 给父的最小真实profile建议

同一个已登记key，本次第7目标，不另做公司切分：

```json
{
  "key":"hypergryph_social",
  "apiOrigin":"https://jobs.hypergryph.com",
  "orgId":"hypergryph","siteId":26325,"site":"social",
  "aesIv":"de7c21ed8d6f50fe",
  "bodyPolicy":"listJD",
  "dateField":"publishedAt","dateKind":"published",
  "linkTemplate":"https://jobs.hypergryph.com/apply/hypergryph/26325/#/job/{id}"
}
```

这些是**建议的来源事实/策略**，不是声称当前adapter已经实现的参数API。本源生产无需逐岗详情；严格explicit-total分页，直接使用列表正文、职能/性质/地点/发布字段/原状态，无职业/项目/关键词过滤，pause与缺失字段忠实保留。共享严格Moka实现支持这个受约束origin即可；校园26326与社会26325的正文策略不同，不能一刀切开启fetchDetails或套旧custom“列表没JD”的注释。所有字段规范化/成功快照/发布仍归父后续生产验收，本代理未执行。

### 8.6 新证据、拒绝与清理

新材料均为 `/tmp/ande-moka-special-social-followup-*`：`summary.json`、`scan-evidence.json`、`schema.json`、`samples.json`、三组 `detail-*-{evidence.json,normalbody.html,normalbody.txt}`、`body-audit-evidence.json`、`client-evidence.json`/`client.js`、`cleanup.json`。来源正文保留完整；非公开ATS控制值、联系人、telemetry密钥/查询参数等排除。

**没有目标HTTP/业务拒绝，无停源事件**；若出现仍应停止该来源，不换端点。本次定位到7个 `sentry-fe.mokahr.com/api/98/envelope/` 的 `ERR_TUNNEL_CONNECTION_FAILED` telemetry事件，目标网页/列表/详情均200，未重试、处理验证或绕过。纯本地正文审计没有外网请求。

新增 **6/6** 次隔离Chrome/profile finally清理（列表1、普通详情3、本地DOM审计1、公开业务客户端1），均Chrome154.0.8037.98；合计 **31/31 cleanup=true**，没有遗留本任务profile。未改变UA/TLS/指纹、未注入外部脚本/研究安全SDK、未登录或投递；未写生产代码/注册/out/data。

旧manifest不可变保留为 `sha256-early.json`（初轮说明原文见 `doc-early.md`）；当前所有材料及更新说明的hash在 `sha256.json`。本次关键SHA：

| 后续材料 | SHA-256 |
|---|---|
| `social-followup-summary.json` | `525ed40eb3b139d55cf2349740f4ff376eb7d8720f60bd680a8ff673f119da36` |
| `social-followup-scan-evidence.json` | `dc0784d537a6f330e4edafccee6485d5fd69660ff62d82096b6ca561d57f0408` |
| `social-followup-schema.json` | `4be9e7fe6c0fff6bab9264ddc91731f463ca5f75500f957319b09c51bb165cf1` |
| `social-followup-samples.json` | `8cdef3803c11a74c12b023ddf41e1713cac25b84fc22c8b03ad426d1210592c0` |
