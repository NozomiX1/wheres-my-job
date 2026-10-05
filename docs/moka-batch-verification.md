# Moka 系统批次核验（v0.25）

**当前：850条通过完整采集、166离线、397/0冻结页面验收，七来源已正式本地发布；未提交或部署。** 用户要求继续Moka系列，按招聘系统批次共享实现、逐来源证明和放行，不按公司另开实现。公开现28,619＝本批850＋其他27,769；仅替换七源237历史记录，页面/评分与其他来源不改。

## 1. 七个既有来源与范围

| key | 公司／官网门户 | 旧历史记录 | 完整新候选 | 正文可读 |
|---|---|---:|---:|---:|
| kimi | 月之暗面，moonshot/148507/campus | 10 | 93 | 93 |
| kimi_social | 月之暗面，moonshot/148506/social | 60 | 106 | 106 |
| zhipu | 智谱，zphz/148984/campus | 9 | 23 | 22 |
| zhipu_social | 智谱，zphz/148983/social | 64 | 135 | 131 |
| deepseek | DeepSeek，high-flyer/140576/social，官方部门2028422 | 29 | 37 | 37 |
| hypergryph | 鹰角网络，hypergryph/26326/campus | 59 | 103 | 103 |
| hypergryph_social | 鹰角网络，hypergryph/26325/social | 6 | 353 | 353 |
| **合计** | **不是公司全球所有渠道全集** | **237** | **850** | **845** |

初始计划列五个剩余Moka登记来源及待确认的鹰角校园，保存六目标231历史／其他27,775基线。父复读注册表发现鹰角社会`hypergryph_social`**本来已经登记且实际同Moka协议**，追加为同系统第7目标并先独立核验，纠正初稿「未登记」说法；没有新增公司／第67来源。扩展后旧目标237／其他27,769，仍39公司／66来源，59个非目标来源登记对象、顺序及已发布事实保持。

第一方证据分别见[标准四门户](moka-standard-verification.md)、[DeepSeek／鹰角及社招补核](moka-special-verification.md#8-后续核验既有-hypergryph_social-纳入同批第7目标)。这些研究材料不是生产快照；标准四源研究JD内邮箱曾脱敏，**不可直接晋升**，生产已经重新采集原文并逐字段双扫。公开招聘正文原有邮箱、英文、作品集等保留，不从研究脱敏文本回填。

- 只用各登记门户默认无关键词／职能／项目／部门／经验条件的广列表。旧「2027届」批次／`matchKeyword`文案不是实际范围证据；校园并不限单一届次。
- DeepSeek真官网→talent→140576导航、所有37条`deptId:2028422`及官方部门名称关系成立。不扩整个`high-flyer`，不把幻方官网4604的3条归入DeepSeek。保留3条官方原正文转新链接旧岗，不静默按标题／链接提示合并或删掉。
- 鹰角校园无项目条件103＝2027项目58＋2028项目44＋无项目数据产品1；只用项目并集会漏掉无项目岗位。社会353包含日常实习13和生态子公司；日常实习13为社会源子集，不冒充校园，不另加来源。
- 本次取得集合内，月之暗面、智谱、鹰角各校／社官方ID交集均0。官方身份关系才可用于去重，不按同标题删岗；一般跨来源溯源与合并仍在后续收尾阶段。
- 首次替换历史基线属于已说明的范围迁移；旧记录退出**不解释为已核验官网下架**。不以数量差计算旧代码漏岗率，不推广字节限定partial授权。

## 2. 最小共享改造与资格

继续唯一安全链：`runCrawl → Moka完整envelope → snapshot/status → 唯一publish → data/jobs.js → 原页面匹配`。没有第二条发布链、运行依赖、66份实现、职业筛选或评分／前端改动。

- `crawler/lib/moka.js`固定七个已分别核验的`key/company/orgId/siteId/site/url`及正文模式，`moka-portal-v1`。固定key即使删除`adapter/listJD/apiOrigin`也不能退回宽松路径；调度与快照归一化使用同一资格检查，空数组也必须先核来源。
- 6源列表有完整HTML，`listJD`进行两轮完整分页，严格原生`jobStats.total/orgId`、HTTP200、解密后`code:0/success:true`、每页长度、唯一官方ID／组织及所有原字段一致；不以ID/总数相同代替全文稳定，不逐岗请求已有正文。
- 鹰角校园列表没有正文，复用既有串行详情模式取得103份原HTML、身份／性质／职能／地点／状态／`publishedAt`；原列表末尾完整重扫及全部原字段一致。详情身份或共有性质／状态冲突、后续失败拒整源，不吞异常写空正文。
- 鹰角两源使用实际官网`https://jobs.hypergryph.com` API origin和真实自定义域详情链接，不凭一个样本把整个来源换到`app.mokahr.com`；origin／正文模式／链接边界进入coverage。两源只差门户及实际正文策略，不复制协议。
- 新门户每请求至少150ms间隔、单请求15s超时、子进程15分钟边界；安全分页上限200页，触顶拒绝，非官网终点或性能SLA。新门户使用Node原生UA，不为接口伪装浏览器；阶跃旧传输和快照事实保持。
- 原字段只按已证明类型使用：`commitment`字符串、`zhineng`具名对象、`locations`数组；未知顶层形状拒源，子字段复用已有验证。仅证明过的原生字段可供公开事实，不让未核`name/category/employment/channels/talentPlan/url`覆盖正文或字段。
- 官网可选`jobDescription`缺失／null／空HTML按已经实测的原renderer契约诚实为空，不补「暂无」作为正文；非法非文本字段、未知total／业务状态不享受空正文例外。日期只用一手renderer与DOM证实的`publishedAt`，不回退create/open/update或采集时间。

## 3. 独立复核与修复材料

首次内部离线复核指出2项P1、2项P2，均为**合成代码反例，不是官网实际错误**：删模式绕资格、缺原生total由fallback补零、外封套非法success被解密覆盖、元数据shape漂移被解释成事实。对应最小守卫已修复；原红报告／反例保留，原6组反例修后全绿，另加持久回归保护。

初始新列表正文模式7项测试先红，最小实现后绿色；第一方研究发现四个真实JD属性缺失，修正最初「必须拥有字符串属性」假设为实测可选字段契约，保留非法形状／业务／身份断言与初版材料，没有为通过删除官网空岗位。旧候选单独保留；最终代码完整重跑七来源，不拿修复前材料冒同版本生产成功。

最终`node --test tests/*.test.cjs` **166项通过（包含原生UI逻辑）**，Step/Feishu原fixture与359阶跃规范化事实回归精确不变。独立run2复核四项闭合，原六组及新增五组全绿，七源77个反向配置（包括匹配元数据的伪造空快照）不调度/不发布；59注册、41保护文件及20,042旧规范化事实精确不变，不代替真实页面验收。

父额外发现解密内层`Success`也须拒未知值，补一行守卫后再次完整采集七源。独立run3证实修前AES内层可漏、修后拒绝；同时指出新持久test误用明文而实际命中outer守卫，保原test再改为真实AES内层、原四值及合法true对照都保留，完整166重跑。这是测试fixture修正，不是官网实际失败；生产实现/冻结版本不因最后修正test变化。独立run4已领取：同一当前持久test在VM仅删inner guard时红（Missing expected rejection）、原guard时绿，四非法值及合法true对照都保留，166/166和diff通过。无该项剩余阻塞。

## 4. 最终生产候选与字段统计

唯一`runCrawl`明确七keys串行执行，未调用publisher改正式data。完成区间：**2026-10-05T11:51:05.198Z–11:52:23.356Z**（北京时间19:51–19:52），78.158秒，仅本轮观测不是SLA；鹰角校园必要详情阶段55.115秒。补inner业务守卫前的11:38–11:40候选与stage单独保留，不作为本次最终生产版本。

- **850条**：校园219、社会631；166明确实习、644全职、40性质未知（DeepSeek37、智谱3）；人才计划850均null，不按「管培生／专家招募」标题标计划。
- **845份可读正文／5份官网无正文**（智谱校园1／社会4），已分别用独立详情和正常DOM核：4条缺属性、1条仅`<p><br></p>`。保留`jdComplete:false`；其余「完整」仅指取得官网所提供全文，不保证招聘方填写详尽。
- **813个可靠发布日期，DeepSeek37日期未知**；DeepSeek列表缺性质，不能将三个详情样本的全职／时间填到其余岗位或为已有正文机械额外请求。
- **pause22**原码保留，不等同下架或不接受申请；`closedAt`也不用于删掉官方列表岗位，申请按钮不证明提交会成功。未申请／登录。
- 7源原HTML总**631,500 UTF-16字符**，不截600字、不去英文／作品集／非技术段。职责和要求仅明确标题分段，否则完整正文回退；关键词仍只排序，3/1/0.35，词频仅展示。
- Kimi体验运营实习生官网`commitment:全职`、鹰角无项目数据产品正文要求实习但官网全职、智谱兼职／其它等都按原字段保留，不按标题纠正或删岗。

父已重算全部raw/snapshot/status/coverage与规范化事实。12个先前已发布来源20,042条全部逐项仍与公开数据相等，36个out文件hash/mtime不变；59非目标注册对象／key顺序／公司目录保持。经冻结验收后仅七keys正式本地发布，公开**28,619**；其他27,769、source metadata和公司目录与发布前精确不变，剩余7,727历史。公开五文件与通过验收的冻结副本同字节。

## 5. 同版本冻结验收与仅七来源本地发布

最终stage `ande-moka-batch-stage-YwmV5S` 的Chrome154 HTTP/file **397 PASS／0 FAIL**；每协议真实自然50→100→…→850、每ID真实connected row与逐岗open modal全文/类别/性质/状态/日期/官网href核对。另原生DOMParser独立对850完整原HTML全文/分段与公开文本核对，只允许约定heading及布局空白，不截首段/字符、不抹标点；不是850岗逐张人工视觉审阅。

每协议46组独立查询，3/1/.35每字段一次、正负零分/同词相消/日期序/逐词非重叠仅展示/>8词/dirty与显式查询边界均通过。1440/1280/390/320无横溢，JD/Escape位置稳定，viewport模拟不冒实机。74张截图hash/尺寸全核；代理实际看12张，父另看DeepSeek英文1440、无项目数据产品320、智谱blank390三张代表图。

页面异常/console/失败网络/页面外网均0；Chrome后台16URL尝试、26次proxy阻断、12次OS IPv6 UDP路由失败分开披露，成功外连0。Chrome/helpers/profile/server/proxy/实际端口已清理。stage5/生产5/实现5/目标out21/保护out36 SHA及mtime不变。首次空HTML夹具把`<p><br></p>`误当空字符串、静态中止阶段清理断言错误，保5PASS/2FAIL及原脚本/报告/hash，只修驱动边界后原断言完整重跑397/0，不删产品断言。

父领取报告，独立核manifest、74图/两协议850证据hash、46查询/协议及实际ps/profile/端口；父检查器最初把queries对象当数组，保initial脚本后仅修Object.keys计数，原46断言及全版本守卫完整通过。这是父材料检查fixture错误，不是产品失败。

只执行正常唯一writer：

```sh
node crawler/publish.js kimi kimi_social zhipu zhipu_social deepseek hypergryph hypergryph_social
```

**850替换237，公开28,619；其他27,769／59登记／公司目录／12旧来源20,042事实精确不变。** 四前端hash/mtime、36旧out、21本批候选及5实现版本保持，公开5文件SHA与冻结相同；data SHA `af08ce8337b4ff75d02594bf3f09471bf4f8d1181e1a27bab09d1a2248f22b3b`。失败者保旧原则未放宽，本批七源全部通过才共同发布；未全站更新、提交、部署或自动开北森。

实际仓库根 `/Users/nozomi/lab/wheres-my-job` HTTP/file发布后另 **51 PASS／0 FAIL** 小烟测：实际28619/七源850/目标legacy0、保原27,769与20,042/sourceMeta/notices、首次不查询、显选四公司空词850和自然50→100均通过。每协议只核3个真实JD（DeepSeek完整英文未知属性、智谱blank、鹰角韩语社会实习及完整尾段/官网href），不声称第二次全850验收。

实际五文件/5实现/21目标out/36旧成功out hash与mtime前后不变。页面错误/失败请求/页面外网0；后台9URL尝试、20proxy阻断、7OS UDP路由失败分别记录，成功外连0。首次驱动无错误。Chrome/helpers/profile及实际server/proxy端口清理。父领取51/0，独立核实际root/servedRoot、全部版本hash/mtime、3图hash并亲看全部3图、ps/profile/实际端口；未额外采集或修改生产。最终166离线、70语法/本地Markdown路径及diff检查另复跑，详见final-check材料。

## 6. 临时证据位置

- `/tmp/ande-moka-batch-baseline.json`／`extended-baseline.json`；备份目录见其中`backup`，前者六目标原材料不覆盖。
- `/tmp/ande-moka-standard-manifest.json`：118份第一方标准门户研究材料；7/7 Chrome/profile清理。
- `/tmp/ande-moka-special-sha256.json`及`sha256-early.json`：115份特殊来源／社招补核材料；初25＋后6＝31/31清理，保早期说明和manifest，不隐瞒研究telemetry错误。
- `/tmp/ande-moka-batch-review.{md,json}`、`review-repro.cjs`、`review-repro-fixed.log`及修后报告；只temp fixture，无官网或真实out副作用。
- `/tmp/ande-moka-list-jd-red.log`／`initial-contract.test.cjs`、后续离线日志；最终166项日志`ande-moka-batch-offline-final.log`，保164旧日志。
- `/tmp/ande-moka-batch-crawl-final.log`及七key合名`.json`；`crawler/out/<key>_{raw,snapshot,status}.json`仍Git忽略，仅本机成功候选，不是Actions持久化。
- `/tmp/ande-moka-batch-early-candidates/`保修复前六源raw/snapshot/status；`before-inner-guard-candidates/`及`stage-manifest-before-inner-guard.json`保前一轮850/旧stage；未发布，不复写早期记录。
- `/tmp/ande-moka-batch-candidate-check.json`、`stage-manifest.json`及最终stage；`/tmp/ande-moka-page-report.{md,json}`、`page-driver.cjs`、`page-run-2026-10-05T11-54-56-907Z-*`共397/0及74截图、初始失败和repair/postverify材料。
- `/tmp/ande-moka-batch-parent-acceptance-check.{cjs,json}`（保initial检查器）、`publish.log`、`final-check.{cjs,json}`；实际根路径`/tmp/ande-moka-live-smoke.report.{md,json}`、`live-smoke.driver.cjs`及`run-2026-10-05T12-11-16-403Z.*`（51/0、3图和postverify）、父`live-smoke-parent-check.json`。

临时证据不承诺长期持久保存；hash不能替代官网范围证明。持久快照、定时、Pages／国内访问及真实全量PC下载／内存／性能仍在后续系统路线之后，不以本轮冒充完成。
