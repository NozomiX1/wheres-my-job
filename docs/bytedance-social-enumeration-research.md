# 字节社招：普通公开客户端枚举协议独立核查

## 结论

**本次没有找到已证明可穷尽整个社招来源的公开枚举协议。默认列表的 10000 边界不是旧探针漏传参数造成的假象：直接让官网自己的客户端发请求，也在 `offset=10000` 返回空。** 这证明当次默认协议的外部行为，不是对所有入口、所有条件或后端实现的普遍定理。

有两项重要补充：

1. **`offset=9990, limit=10` 正常返回 10 条。** 父流程的 `offset=9999, limit=10` 空页不能解释为“第 10000 条不存在”；它跨过了 10000 窗口。结果与 `offset + limit` 窗口限制相容，但尚不能证明具体后端实现。
2. **PC 客户端确实另有 `1e4` 分页上限。** API 本次也返回 `count=10000`；不能把问题仅归因于页面显示截断。

分类等筛选使用的是真正职位列表协议，可以分别分页读取分区，而非只取得 facet 数字；但仍缺少“筛选分区覆盖全部公开社招”的证据。旧的 `4871 + 6222 = 11093` 不能升级为已测量的全源唯一 ID 总数。

## 方法、预算与捕获证据

- 复用 `/tmp/ande-bytedance-cdp.cjs` 的原生 Node/CDP 操作模式，在自己的 `/tmp/ande-social-enumerator-profile-*` 临时目录启动实际 Google Chrome；未接触用户 Chrome profile。
- 实际浏览器：`Chrome/154.0.8037.98`。匿名访问普通官网，没有登录、投递、验证码操作、外部 SDK 注入、签名生成/研究或安全控制绕过。
- **没有直接重放职位 API。** 四次导航由官网自身已加载客户端构造请求。共观察到 **12 个职位相关 API 请求：8 个列表请求、4 个过滤配置请求**；每个导航的列表请求自然发生两次。只取首页/末页小样本，没有全量采集。
- 另以原生 Node GET 获取公开 HTML、robots、三个常见 sitemap 路径及下列业务 JS。移动端只检查公开 HTML/业务组件，**未仿造移动 UA 或指纹，未作 H5 API 运行时验证**。
- `finally` 清理证据为 `chromeExited:true, profileRemoved:true`；后续检查未剩余自己的 profile 目录。
- 机器时钟记录的浏览器捕获区间：`2026-10-05T06:21:21.600Z` 至 `2026-10-05T06:21:30.142Z`。这是捕获环境时间，不是官网发布时间。

独立证据文件：

| 文件 | 内容 |
|---|---|
| `/tmp/ande-social-enumerator-browser-evidence.json` | 官方客户端真实 URL 的非敏感 query、POST 正文、HTTP/业务状态、样本 ID、DOM、清理结果；不保存 cookie、CSRF 或签名值 |
| `/tmp/ande-social-enumerator-primary-evidence.json` | 业务 JS first-party URL、SHA-256、精确片段与零起点 UTF-16 字符位置；query/body 一致性检查 |
| `/tmp/ande-social-enumerator-entrances.json` | 移动入口/常见 sitemap 的状态、HTML 引用的脚本与链接 |
| `/tmp/ande-social-enumerator-enumeration-endpoint-candidates.json` | 在检查过的列表相关业务 bundle 中查找职位列表/详情路径的结果；不是全站 endpoint 不存在证明 |

旧材料只作历史证据复核：`/tmp/ande-bytedance-social-completeness.md`、其 JS/过滤/schema 片段、`/tmp/ande-bytedance-social-evidence/scope-partitions.json`，以及父流程新 `/tmp/ande-social-scope-probe.json`。没有重复父流程的单空格、`101`、`102` 探针。

## 1. 官方列表参数与 query/POST 是否一致

主要 first-party 业务 JS：

- [6384.fbae5535.js](https://lf-package-cn.feishucdn.com/obj/atsx-throne/hire-fe-prod/portal/mainland/static/js/6384.fbae5535.js)：API 映射约 25414，列表 request mapper 42645 起。
- [460.00163b48.js](https://lf-package-cn.feishucdn.com/obj/atsx-throne/hire-fe-prod/portal/mainland/static/js/460.00163b48.js)：PC 列表组件、URL 状态与分页器。

**职位枚举 URL 是 POST `https://jobs.bytedance.com/api/v1/search/job/posts`。** `GET /api/v1/job/posts/{id}` 是已知 ID 的详情，不负责发现全部 ID。`GET /api/v1/config/job/filters/2` 是筛选配置，不能当职位列表。

列表 mapper 明确使用 `offset = (current - 1) * limit`，不是页号型 offset。官网 URL 的状态字段与 API 对应关系为：

| 官网 URL 状态 | API 字段 |
|---|---|
| `keywords` | `keyword` |
| `current`, `limit` | `offset`, `limit` |
| `category` | `job_category_id_list` |
| `location` | `location_code_list` |
| `project` | `subject_id_list` |
| `type` | `recruitment_id_list`（存在旧类型名称到 ID 的转换） |
| `functionCategory` | `job_function_id_list` |
| `tag` | `tag_id_list` |
| 列表内部 `storeFrontListString` | `storefront_id_list` |

`portal_type` 来自该入口的客户端配置；本次社招为 `2`。POST 入口附加字段 **`portal_entrance` 在共享请求拦截器中注入 `data`，之后才构造列表 URL query**，不是仅放在 header 或仅放在 query；普通 PC 为 `1`，枚举常量 H5 为 `2`。源码位置约 292281，枚举约 78300；精确片段以独立 JSON 为准。

本次所有真实列表请求的正文都具有以下字段（只有 `limit/offset` 随导航变化）：

```json
{"keyword":"","limit":10,"offset":0,"job_category_id_list":[],"tag_id_list":[],"location_code_list":[],"subject_id_list":[],"recruitment_id_list":[],"portal_type":2,"job_function_id_list":[],"storefront_id_list":[],"portal_entrance":1}
```

query **包含同一组字段**：数字变字符串、数组变逗号连接字符串、空数组变空字符串；逐字段检查全部一致。正常 query 还存在官方自己附加的签名字段，本研究未保存其值、未研究其实现。

捕获 header 的正常非敏感范围为 `website-path:society`、`Portal-Channel:office`、`Portal-Platform:pc`、`accept-language:zh-CN`、`Content-Type:application/json`。注意公开路由虽叫 `/experienced`，实际 website-path 是 **`society`**。

### 是否漏了能够分页的字段？

- mapper 的 `job_hot_flag` 设为 `undefined`，正常正文/query 都不发送它；不是忘传。
- mapper 还有可选 `job_post_id_list`。源码约 159443 表明它仅用于明确 `site=doubao` 且已有推荐 ID 的特殊子集场景，普通社招返回 `undefined`。**它不提供 ID 发现能力，不能作为全源枚举器。** 本研究未使用该场景。
- 没有在这个列表 mapper 中找到 `cursor`、`search_after`、排序方向、按发布时间/ID 范围分页的参数。PC 状态变化中虽有 `time`，实际列表 mapper 没有将其转换成时间过滤。
- 真实响应 `data` 只有 `job_post_list/count/extra`。非空页的 `extra` 是 `fe_tracking`，包含 `log_id/query_length/total`，本次 `total` 仍为 10000；没有发现独立真实总数或续页 cursor。
- 因此，**旧生产 helper 的普通字段集合与本次实际 PC 请求相符**。本次没有发现足以解释空页的缺失字段或 query/body 注入位置错误。

## 2. 不经 API 重放的边界验证

正常 first-party 导航：

| 普通官网 URL | 官网实际 API 参数 | HTTP / code | count | 列表长度 |
|---|---|---|---:|---:|
| [默认列表](https://jobs.bytedance.com/experienced/position) | `offset=0, limit=10` | 200 / 0 | 10000 | 10 |
| [第 1000 页](https://jobs.bytedance.com/experienced/position?current=1000&limit=10) | `offset=9990, limit=10` | 200 / 0 | 10000 | 10 |
| [第 1001 页](https://jobs.bytedance.com/experienced/position?current=1001&limit=10) | `offset=10000, limit=10` | 200 / 0 | 10000 | 0 |
| [单条页大小的边界](https://jobs.bytedance.com/experienced/position?current=10001&limit=1) | `offset=10000, limit=1` | 200 / 0 | 10000 | 0 |

每行的两个自然请求结果一致。第 1000 页样本首/末 ID 为 `7458103375306524946` / `7457370293973043464`。越界两页 DOM 同时显示“开启新的工作（10000）”和“暂无职位，请尝试其他搜索条件…”。这是接口成功空结果，不是认证/验证码错误。

[PC 业务组件](https://lf-package-cn.feishucdn.com/obj/atsx-throne/hire-fe-prod/portal/mainland/static/js/460.00163b48.js) 87335 明确定义 `wt=1e4`，分页器使用 `total:Math.min(r,wt)`；当原始 count 大于上限时标题才格式化为 `10000+`。本次原始 API count 本身恰为 10000。

**边界说明：** 父流程另观察到 `offset=9999, limit=10` 返回空。本次新增的是恰好结束于 10000 的成功页；两者只能说明跨界的请求应谨慎处理，不能断言已证明某种搜索引擎或某个服务端配置。也不应把成功第 1000 页误当全源恰好 10000 的证据。

## 3. 哪些是真正列表协议，哪些只是数字

| 正常入口/方式 | 能否返回职位记录 | 全源穷尽资格 |
|---|---|---|
| 默认社招 POST 列表 | 能，本次实测 | 当次在 10000 边界失败；不合格 |
| 分类、城市、项目、类型、职能、标签、门店筛选后的同一列表 | 能；mapper 与旧普通 UI 捕获确立 | 可用于有范围证明的子集分页；所有分区覆盖全部社招尚未证明 |
| 已知 ID 的公开详情 | 能返回一条详情 | 不负责枚举 ID |
| 社招 landing 的 `/api/v1/search/job_post/count` | 只有 facet count map | 不能替代职位列表或独立社招总数 |
| `/api/v1/config/job/filters/2` | 过滤树、facet map | 不是职位 ID 清单 |
| 公开移动端列表 | 业务代码确立同一列表服务、30 条分页 | H5 运行时边界未知；没有发现独立 cursor/全量列表接口 |
| SEO HTML / 常见 sitemap | 本次未发现 ID 索引 | 未找到可用全源索引 |

旧 landing facet 的 first-party 实现是 [async/7585.1756d250.js](https://lf-package-cn.feishucdn.com/obj/atsx-throne/hire-fe-prod/portal/mainland/static/js/async/7585.1756d250.js)，`website_id/job_type_id_list/job_function_id_list/job_post_subject_id_list/city_code_list` 与列表的字段名、招聘范围不同。它返回四个 count map，没有 aggregate 或 job ID list；不能把 facet 18585 或模板 fallback `/atsx/api/portal/job_post/count/search` 当新的可枚举职位接口。本次没有请求该 fallback。

分类分区的剩余缺口仍是未分类、旧分类/树外记录，及任何不被当前过滤树覆盖的公开职位。显示 schema 的 `required:true` 只在公开显示配置中找到，不能证明全部历史职位的服务端创建约束。项目/城市/标签正向筛选也没有提供“缺失值补集”分支；多城市尤其不能把 facet 值简单相加。

## 4. 移动端：真实列表组件，而非仅 facet

正常公开 HTML 入口存在：

- [https://jobs.bytedance.com/experienced/m/position](https://jobs.bytedance.com/experienced/m/position) — Node GET 200。
- [https://jobs.bytedance.com/experienced/m/position/list](https://jobs.bytedance.com/experienced/m/position/list) — Node GET 200。

主要 first-party 组件：

1. [mobile.dae4e980.js](https://lf-package-cn.feishucdn.com/obj/atsx-throne/hire-fe-prod/portal/mainland/static/js/mobile.dae4e980.js)，约 62403 / 66795：`/position`、`/position/list` 加载 module 92443。
2. [async/2443.20ee60e1.js](https://lf-package-cn.feishucdn.com/obj/atsx-throne/hire-fe-prod/portal/mainland/static/js/async/2443.20ee60e1.js)：module 92443 使用普通列表组件 17129，没有传入另一个枚举 API。
3. [async/4482.9a5c35e6.js](https://lf-package-cn.feishucdn.com/obj/atsx-throne/hire-fe-prod/portal/mainland/static/js/async/4482.9a5c35e6.js)，约 3508–5000：首次 `current=1`，继续加载 `current+1`，调用共享 `9425.G2`，固定 `limit:30`；追加 `list`，以 `count > list.length` 决定是否继续。该共享服务就是上述 `/api/v1/search/job/posts` mapper。

这是**真正的移动无限列表**，不是 landing facet。没有新 cursor 协议。组件支持可注入 `getPositionListApi` 是复用接口，不意味着正常社招已经配置了新的 URL。

**明确未知：** H5 使用 `portal_entrance=2` 和移动平台配置；本次没有在真实移动环境验证其返回 count、边界或是否与 PC 完全相同。因此不能声称已实测移动端也封顶，亦不能声称其可跨越 10000。普通客户端会按设备判断重定向 PC/H5；未为了跑 H5 修改设备识别或安全 SDK。

## 5. SEO / sitemap

- [robots.txt](https://jobs.bytedance.com/robots.txt) 返回 200：允许 `/experienced`、`/society`、`/campus`、`/en`、`/jp`，禁止 `/referral`；**没有 Sitemap 指令**。
- [sitemap.xml](https://jobs.bytedance.com/sitemap.xml)、[sitemap_index.xml](https://jobs.bytedance.com/sitemap_index.xml)、[sitemap.txt](https://jobs.bytedance.com/sitemap.txt) 本次均为 404。
- 普通 PC 与两个移动列表 HTML 中，没有找到职位详情 ID 链接索引、预载 `job_post_list` 或 `JobPosting` JSON-LD 列表。配置/宣传链接不是全源职位索引。

这是这些具体入口的阴性证据，**不是“整个官网任何位置都没有 sitemap”或“搜索引擎没有详情页”的证明**。未把第三方搜索索引、详情 URL 猜号或其它公司的 Feishu endpoint 当作完整性证据。

## 交给父流程的安全判断

- 不需要为本次默认边界失败修补缺失普通参数；应保留默认 `count>=10000` 的完整性拒绝，不发布所谓“全量 10000 条”。
- 正向过滤后的真实列表可以作为后续分区采集协议，但应先取得分区覆盖证明，不能只用 facet 和 schema 宣称全社招完整。
- 本次没有发现可优先通报的、已正常验证跨越 10000 的全源协议。剩余可公开验证的问题是 **真实 H5 平台的入口 2 行为**、官网是否另行公开了全源 ID 索引，以及过滤树覆盖所有公开记录的 first-party 保证；它们目前均未知。
- 本任务未更改项目实现、采集生产数据或重新解释职位日期/“正式”的全职含义。


## 本轮后续：H5 运行时小样本核验

**新增结论：官网 H5 客户端确实自行发送 `portal_entrance=2`，同时使用 `portal_type=2`、`website-path:society`、`Portal-Platform:h5`。但本次 H5 列表收到 HTTP 405，已停止，未获得成功 count，也没有发出 offset=10000 边界请求。H5 是否封顶或可跨越 10000 仍未知。** 405 不能当成空列表、count=0 或完整性证据。

### 环境与路径

- 实际仍为桌面 `Chrome/154.0.8037.98`，独立临时 profile；**不是实际 Android 手机**。按本轮授权使用 Chrome DevTools 标准设备预览/CDP Emulation。
- 首先仅设置 `412×915` viewport、`deviceScaleFactor=2.625`、`mobile:true`，不改变原生桌面 UA，访问 [普通 H5 路由](https://jobs.bytedance.com/experienced/m/position)。官网自行导向 `https://jobs.bytedance.com/experienced/position`；实际请求仍是 PC 入口 1，正常返回 `count=10000`、10 条。
- 随后使用标准设备预览的 Android 13 / Pixel 7 / Chrome 154 Mobile UA 与 `Linux armv8l` 平台预览，访问 [H5 列表路由](https://jobs.bytedance.com/experienced/m/position/list)。页面留在该公开 H5 路由，标题为“职位列表 - 加入字节跳动”，实际发出 H5 scope 的请求。
- 精确 Emulation 方法/参数保存在证据 JSON；没有改 webdriver、安全 SDK、TLS、签名实现或浏览器安全/防检测 flags，没有注入外部 SDK。

### 官网客户端实际请求

全部请求来自官网自身页面初始化，本轮未直接重放 API、没有手动拼 `portal_entrance=2`。H5 普通主列表的 query 与 POST 正文字段一致：

```json
{"keyword":"","limit":30,"offset":0,"job_category_id_list":[],"tag_id_list":[],"location_code_list":[],"subject_id_list":[],"recruitment_id_list":[],"portal_type":2,"job_function_id_list":[],"storefront_id_list":[],"portal_entrance":2}
```

| 阶段 | 实际请求 | 结果 |
|---|---|---|
| 窄 viewport、原生桌面 UA | PC 列表两次，`entrance=1, limit=10, offset=0` | 均 HTTP 200 / code 0 / count 10000 / 10 条 |
| 同上 | PC 过滤配置一次 | HTTP 200 / code 0 |
| 标准设备预览 | H5 过滤配置一次，`Portal-Platform:h5` | HTTP 200 / code 0；仍不是职位枚举清单 |
| 标准设备预览 | H5 主列表两次，`entrance=2, limit=30, offset=0` | 均 HTTP 405；无成功业务 JSON/count |
| 标准设备预览 | 一个额外官网初始化列表请求，`limit=3` | HTTP 405；具体见下面的参数异常 |

额外的 `limit=3` 请求也来自官网：query 的 `offset` 为 `NaN`，JSON 正文为 `offset:null`，且没有 `keyword`。这与此前读取的 [async/9550.903c94df.js](https://lf-package-cn.feishucdn.com/obj/atsx-throne/hire-fe-prod/portal/mainland/static/js/async/9550.903c94df.js) 约 48767 的初始化调用 `G2({limit:3,offset:0})`、共享 mapper 实际读取 `current` 相容。**该旁支不能替代普通主列表参数；主列表自己的 offset=0 参数正常。** 不足以判断 405 的原因，更不能推断修复这项旁支便可解除 H5 限制。

### 停止条件、证据与仍未知

- 收到首个职位 HTTP 405 时立即设置停止状态并调用 `Page.stopLoading`，不尝试处理验证码、登录或改变安全控制。表中的其它 H5 请求是该次官网启动已自然并发/重复发出的请求，不是另行手工重试。
- 可见 H5 DOM 最终只有“社招 / 取消 / 职位类别 / 工作地点 / 暂无职位”，**没有捕获到显式验证码 UI**；405 响应未取得可解析的业务 JSON。拒绝原因未知，不能声称已证明是验证码或设备模拟识别。
- 为准备仅调用既有公开列表业务服务，曾通过 CDP 在 `6384` 的业务函数 `M` 短暂停点并保留函数引用；仅观察普通业务参数，没有调试签名/安全 SDK。因为 405，**没有执行该引用、没有发出任何 offset=10000 请求**。
- 本轮额外实际发送 **7 个职位相关 API 请求（5 列表、2 过滤配置）**，低于 12 个预算；到此停止，不消耗剩余预算尝试改变拒绝结果。无全量采集、无生产实现变更。
- 独立证据：`/tmp/ande-social-enumerator-h5-browser-evidence.json`；可复核脚本：`/tmp/ande-social-enumerator-h5-probe.cjs`。机器捕获时间 `2026-10-05T06:36:22.391Z`—`2026-10-05T06:36:29.079Z`。不保存 cookie、CSRF 或签名值。
- `finally` 清理记录：`chromeExited:true, profileRemoved:true`。

本节把原报告的“H5 入口 2 是否真实使用”从静态推断升级为运行时观测；**没有把“H5 count/10000 边界未知”升级成否定结论**。原有 sitemap、PC 边界和全源分区覆盖的证据边界全部保留。
