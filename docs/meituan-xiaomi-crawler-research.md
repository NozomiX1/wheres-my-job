# 美团、小米官网招聘爬虫先例调研

## 结论与建议

- **确有公开源码，不必从零猜接口。** 美团现 `getJobList/getJobDetail` 在 JobHunt-CLI 有实现；career-ops 另有现列表接口实现。小米有直接访问公开飞书 ATS 的 JobHunt-CLI 实现，但本轮未找到 `hr.xiaomi.com/website/api/agent/searchJobPage` 的第三方源码。
- **最省事是继续现有匿名 Node 路线，只借鉴请求契约，不安装这些项目。** 美团 `pageSize=30/50/100` 和分应届／实习查询是作者代码中的研究候选，不是已证校园稳定分页办法；没有找到能直接解决同 `refreshTime` 页边界换位的 sort/cursor 或全量证明。
- **小米城市数组的无序比较是待核候选，不是已证修法：** 既有两轮元素集合相同，但本轮未证明城市顺序没有业务优先级含义；可用无序比较辅助诊断，不能擅自改变现行 raw 稳定契约或重排公开事实求通过。飞书路线可作为后续逐 scope 核验参考，不能用 `/campus` 替代 HR `type=2` 的全部人才项目，也不能混同 HR numeric id、jobId、jobPostId。

## 范围与证据等级

- 调研日：2026-10-07；后台调研约 8 分钟（04:46–04:54 UTC），父线程同步核读核心源码，收口后补核证据和措辞。只新增本笔记，未运行爬虫或改采集契约。
- 直接匿名读取仅用 GitHub 原仓库/API/raw；检索摘要中的外卖、店铺、商城、二手文章及非 repo 线索均剔除，不作证据。以下源码实际读取后才列作证据。
- **高可信**指固定提交中的代码行为；**中可信**指作者自述实跑/DevTools 记录，未经本轮官网复验；**无直接证据**不等于无人做过。
- 当前数量、换页与城市漂移来自委托背景，非本轮采集结果；第三方的 “all” 命名、去重及测试通过均不授安得完整发布资格。

## 1. career-ops-hq/career-ops：美团现列表接口

- 固定版本 `3be1cdf033d54e977c9770441122c9e7cf3c823f`，提交日期 **2026-10-06T22:29:53Z**；[仓内 MIT 许可][ML]。源码及 mock 测试均实读；**实现证据高，当前全量完整性未证**。
- [meituan.mjs L27–99][M1]：POST `getJobList`，分页必须嵌套 `page:{pageNo,pageSize:100}`；`jobShareType:'1'`，固定 `jobType:[{code:'3',subCode:[]}]`，其它过滤数组为空，空关键词为默认值。**只实现社招，不是校园 1+2。**
- [L118–183][M2]：默认每关键词最多 30 页、URL Map 去重、依据 `data.page.totalCount` 结束；400ms 间隔，空页最多追加两次退避请求。中途异常或空页仍返回已有部分结果；未核逐页 total 稳定、最终唯一数等于 total 或双扫集合一致；没有排序/cursor 参数。
- [L91–97][M1] 只从列表取 `jobDuty/jobRequirement` 等，且 `.slice(0,4000)`；**无 `getJobDetail` 请求，不能照搬成完整 JD**。本项目拒绝即停、失败不发布的规则也不允许照搬其保部分结果/盲重试。
- [作者 PR #1818][MP] 创建于 **2026-07-12**，自述 “Verified live 2026-07”、约 2300 岗及曾遇中途空页；“像限流”只是作者解释，不是官网已证原因。PR 自述测试通过；[测试 L118–243][MT] 实为 mocked ctx，涵盖分页、空页重试、关键词去重、封顶与失败保部分，**不证明官网全量**。

## 2. Enzoding/JobHunt-CLI：美团详情、小米飞书 ATS

- 固定版本 `f098e01c6d9a4d41a791e218787568ccc636588d`，提交日期 **2026-09-03T14:17:22Z**；[package.json L106][JL] 声明 MIT，但该固定版本完整 tree 未见 LICENSE/LICENCE 文件、GitHub repo API 的 license 为 null；复用源码前应补核授权，不能冒已核完整许可文本。
- [作者能力矩阵 L17–22][JV] 记录两站 **2026-07-19** DevTools 渠道验证；是作者运行/观察记录（中可信），不是本轮独立官网验证。

### 美团

- [utils.js L10–52][JMH] 默认 pageSize 10、代码上限 30；社/校/实习分别 jobType **3/1/2**，校招只查 1，实习另查 2，不等于当前官网校园默认 1+2；含硬编码 Chrome UA，**不照搬**。
- [L280–317][JM] 使用现 `getJobList` 与 `getJobDetail`；详情 POST body 为 `{jobUnionId,jobShareType:'1'}`；列表保留 totalCount/totalPage/pageNo/pageSize。无 sort/cursor 参数。
- [index.js L50–78][JMA] 的 `all` 更新 totalPage、按类型+身份去重，短页/空页/页数终点即停；**不核 total 漂移、漏岗、双扫或重复边界**。`all` 不逐岗调详情；[utils.js L229–278][JMJ] 正文只输出 jobDuty/jobRequirement，不能据此证明官网其它正文片段齐全。

### 小米

- [utils.js L4–80][JXH] 指向 **xiaomi.jobs.f.mioffice.cn**，默认 limit 10、上限 100；`website-path` 请求头区分 **index/campus/internship**，三者 portal_type 都是 6。包含硬编码 Chrome UA；仅参考原生参数，不照搬伪装请求头。
- [L284–326][JX] 列表 POST `/api/v1/search/job/posts`，body 含 `offset/limit/keyword`、空过滤数组、`portal_type:6`、`portal_entrance:1`；详情 GET `/api/v1/job/posts/<id>?portal_type=6&with_recommend=false`，读 `data.job_post_detail`。**这是实际小米 ATS 源码，不是通用飞书代码猜测。**
- [L240–280][JXC] 取 `description/requirement`，城市 `city_list` 按原顺序 join，不排序；未处理 HR `cityZhNames`。ATS `id` 不能凭同为数字便映射成 HR id/jobId，需另证 jobPostId 对应关系。
- [index.js L50–78][JXA] 的 `all` 使用 offset、seen 和短页终点；[utils.js L303–312][JX] 返回的 `total` **只是本页 list.length，不是官网总数**。没有双扫集合、动态 total 或分页重复专项保证。
- [smoke-xiaomi-api.js L1–24][JXS] 只检查关键词前 5 岗、一个详情、城市过滤和空关键词前 30 岗；它是可运行检查源码，不是全量运行日志，本轮未执行。未证 `toptalent/futurestar/newretailing` 等项目覆盖，所以不可替换现 HR scope。

## 3. hunhunzhang/Campus-Jobs-Scraper：美团校园分类型先例

- 固定版本 `ab1c42ffa320a8bee5596f5d41d8b8ee59a6ea64`，匿名 GitHub commit API 实核日期 **2026-03-04T04:30:54Z**；repo license metadata 为 null，本轮未取得许可文本。父线程下载、双方实际读源码；**代码证据高，当前运行及全量完整性未证**。
- [meituan_crawler.py L19–70][CP1] 实际是 requests 直接 POST 现 `getJobList`，pageSize **50**，依次查 jobType **1+subCode[1,3,7]**、**2+subCode[1,3,6]**；不是当前校园空 subCode 全范围。虽 [README][CR] 泛讲 Playwright，不能据此说该美团文件必须启动浏览器；代码硬编码 Chrome UA，仍不能照搬。
- [L72–132、L193–197][CP2] 每岗请求 `getJobDetail`（body 只有 jobUnionId），异常返回 `{}`；仅提 jobDuty/jobRequirement 并正则剥 HTML，未证完整正文。按累计条数/当页 total 与短页结束，无身份去重、total 稳定或双扫验证；中断仍 save Excel。**未读取/核验作者 Excel 产物，不将它冒全量运行证据。**
- 有价值的候选是分别分页应届/实习，后续授权时核空 subCode、两集合并与官网 1+2 scope 等价；不能照抄固定子类过滤，也不能声称拆类型已解决同 refreshTime 边界问题。

## 4. he-yufeng/FindJobs-Agent：确有旧代码，不是当前捷径

- 固定版本 `591fe6b451db98fe0bebb8f92a7b9902b0fd6079`，提交日期 **2026-10-06T08:50:30Z**；[仓内 MIT 许可][FL]。
- 实读 [job_crawler.py 美团 L308–355][FM]：旧 `/api/recruitment/v2/jobs`，limit 50/offset；[小米 L520–569][FX]：旧 `/api/position/list`，pageNum/pageSize 50，空页或 total 终止。**代码存在证据高，历史成功/现接口适用性未证**。
- [作者 README L155–173][FR] 明说小米等适配器按 **2023 年接口**编写、目前返回为空；美团实际路线改走 Selenium。故不能把近期 repo 提交日期冒接口近期可用，也不照搬其浏览器路线。
- career-ops 的[通用飞书适配器 L66–74、L151–193][GF]只接受字节域及 `.jobs.feishu.cn`，不接受小米 `.mioffice.cn`；还伪装 UA、截 JD、失败保部分。它有 offset/limit 参考，但**不算独立小米实现或同 scope 证明**。

## 当前问题：可做与没有直接解

| 问题（委托背景） | 实质判断 |
| --- | --- |
| 美团校园 571；15/16 页相邻合并两次均为同 20 岗，两个同 refreshTime 岗换位 | 只证明该窗口集合相同，不证明整源；比较全量身份/事实集合而非页内顺序。仍须核 total、唯一身份及完整 JD；去重不能掩盖缺口。30/100 可列后续授权实验，但本轮未找到稳定排序/cursor 修法。 |
| 美团社招 2459，1803 详情因本地 otherInfo='暂无' guard 失败且已修 | 属本地契约过窄，不是官网拒绝；JobHunt 给出现详情请求先例，但两项目均不能证明其它 JD 片段完整。无需为此引入浏览器、登录或反爬工具链。 |
| 小米校 1059 双扫稳定；社 1909 唯一且 55 条仅城市顺序漂移 | 元素集合相同不等于已证顺序无含义；无序比较可作待核候选，本轮未找到第三方专项实现或据此放宽稳定契约。旧重复本次未复现，不能拿旧故障继续宣称当前抓不了。 |
| 想用小米飞书直接抓来提速 | 确有源码和详情路线，但仅三个入口，不授 HR type=1/2 全覆盖；要逐入口、身份关系、正文及分页终点另核，不能自动切换来源。 |

## 执行边界

- 后台调研自报检索工具服务端计数 **9 次 search、4 次 open_page**；父线程工具另确认 **7 次 search、2 次 open_page**，不采用搜索摘要自报的其它计数。相关代码通过正常匿名 GitHub raw/API GET 实读；父线程核读核心文件、第三个校园项目及其固定 commit/date。自有临时材料在 `/tmp/ande-mt-xm-public-research-qrlpE9/` 与 `/tmp/ande-mt-xm-public-parent-jSxKwD/`，不入库。
- 仅新增本 Markdown；**未改代码、data、out，未请求任何招聘官网/API、未采集岗位、未执行第三方代码、未启动浏览器或其它 agent；未登录、使用私有 token 或伪造 UA/指纹/TLS；未提交、推送或部署。**

[M1]: https://github.com/career-ops-hq/career-ops/blob/3be1cdf033d54e977c9770441122c9e7cf3c823f/providers/meituan.mjs#L27-L99
[M2]: https://github.com/career-ops-hq/career-ops/blob/3be1cdf033d54e977c9770441122c9e7cf3c823f/providers/meituan.mjs#L118-L183
[MT]: https://github.com/career-ops-hq/career-ops/blob/3be1cdf033d54e977c9770441122c9e7cf3c823f/tests/providers/meituan.test.mjs#L118-L243
[MP]: https://github.com/career-ops-hq/career-ops/pull/1818
[ML]: https://github.com/career-ops-hq/career-ops/blob/3be1cdf033d54e977c9770441122c9e7cf3c823f/LICENSE
[JM]: https://github.com/Enzoding/JobHunt-CLI/blob/f098e01c6d9a4d41a791e218787568ccc636588d/src/sites/meituan/utils.js#L280-L317
[JMH]: https://github.com/Enzoding/JobHunt-CLI/blob/f098e01c6d9a4d41a791e218787568ccc636588d/src/sites/meituan/utils.js#L10-L52
[JMJ]: https://github.com/Enzoding/JobHunt-CLI/blob/f098e01c6d9a4d41a791e218787568ccc636588d/src/sites/meituan/utils.js#L229-L278
[JMA]: https://github.com/Enzoding/JobHunt-CLI/blob/f098e01c6d9a4d41a791e218787568ccc636588d/src/sites/meituan/index.js#L50-L78
[JX]: https://github.com/Enzoding/JobHunt-CLI/blob/f098e01c6d9a4d41a791e218787568ccc636588d/src/sites/xiaomi/utils.js#L284-L326
[JXH]: https://github.com/Enzoding/JobHunt-CLI/blob/f098e01c6d9a4d41a791e218787568ccc636588d/src/sites/xiaomi/utils.js#L4-L80
[JXC]: https://github.com/Enzoding/JobHunt-CLI/blob/f098e01c6d9a4d41a791e218787568ccc636588d/src/sites/xiaomi/utils.js#L240-L280
[JXA]: https://github.com/Enzoding/JobHunt-CLI/blob/f098e01c6d9a4d41a791e218787568ccc636588d/src/sites/xiaomi/index.js#L50-L78
[JXS]: https://github.com/Enzoding/JobHunt-CLI/blob/f098e01c6d9a4d41a791e218787568ccc636588d/scripts/smoke-xiaomi-api.js#L1-L24
[JV]: https://github.com/Enzoding/JobHunt-CLI/blob/f098e01c6d9a4d41a791e218787568ccc636588d/docs/RECRUITMENT_NATURES.md#L17-L22
[JL]: https://github.com/Enzoding/JobHunt-CLI/blob/f098e01c6d9a4d41a791e218787568ccc636588d/package.json#L106
[FM]: https://github.com/he-yufeng/FindJobs-Agent/blob/591fe6b451db98fe0bebb8f92a7b9902b0fd6079/findjobs/job_crawler.py#L308-L355
[FX]: https://github.com/he-yufeng/FindJobs-Agent/blob/591fe6b451db98fe0bebb8f92a7b9902b0fd6079/findjobs/job_crawler.py#L520-L569
[FR]: https://github.com/he-yufeng/FindJobs-Agent/blob/591fe6b451db98fe0bebb8f92a7b9902b0fd6079/README_CN.md#L155-L173
[FL]: https://github.com/he-yufeng/FindJobs-Agent/blob/591fe6b451db98fe0bebb8f92a7b9902b0fd6079/LICENSE
[GF]: https://github.com/career-ops-hq/career-ops/blob/3be1cdf033d54e977c9770441122c9e7cf3c823f/providers/feishu-jobs.mjs#L66-L193
[CP1]: https://github.com/hunhunzhang/Campus-Jobs-Scraper/blob/ab1c42ffa320a8bee5596f5d41d8b8ee59a6ea64/meituan_crawler.py#L19-L70
[CP2]: https://github.com/hunhunzhang/Campus-Jobs-Scraper/blob/ab1c42ffa320a8bee5596f5d41d8b8ee59a6ea64/meituan_crawler.py#L72-L197
[CR]: https://github.com/hunhunzhang/Campus-Jobs-Scraper/blob/ab1c42ffa320a8bee5596f5d41d8b8ee59a6ea64/README.md
