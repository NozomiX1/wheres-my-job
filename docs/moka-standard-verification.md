# Moka 标准门户 · 月之暗面／智谱初核（v0.25）

**只读研究，不是生产采集／来源晋升／本地发布。** 2026-10-05 北京时间约 18:33–18:45，核验四个已登记公开门户；仅写本文件与 `/tmp/ande-moka-standard-*`。没有运行 `crawl/update/publish`，没有写 `crawler/out/`、注册表、前端或 `data/`，没有登录、申请、验证码操作、忽略 TLS、外注 SDK、修改浏览器指纹。DeepSeek／鹰角不在本笔记范围。

## 结论与资格边界

- 四门户实际通用列表接口均为公开 `POST /api/outer/ats-apply/website/jobs/v2`，原网页默认无关键词／职能／地点／项目／经验条件。HTTP **200**，公开 AES 外壳解密后均 `success:true,code:0`，并有明确 `data.jobStats.total`。
- 为确认同组织校／社门户的包含／重叠关系，只做两轮小规模完整**研究候选**：**93＋106＋23＋135＝357 条**。总数、精确页长、组织、唯一 ID 及全部**保存后的脱敏字段**两轮一致；同公司两个门户均没有官方 ID 重叠。未把主页精选／城市分组数字或首页长度当全量。
- 四门户本次列表已经含 `publishedAt` 和原始完整 HTML `jobDescription`；每源两个可读代表样本的列表／独立详情原 HTML 逐字相同，完整官网 DOM 正文只忽略空白后完全相同。无需为了已有全文机械新增 357 次详情请求。
- **352 条有可读文字，5 条官网本身没有可读正文**：智谱校园 1 条缺字段；智谱社会 3 条缺字段、1 条只有 `<p><br></p>`。五条都另核独立详情和实际 DOM，不补造、不删岗、不称完整可读 JD。
- `publishedAt` 的「发布」含义有本轮真实 DOM 的「发布于／发布日期」及第一方客户端 renderer 双重证据，不是根据 field name 猜测。其他日期语义不映射。
- 尚未授予任何生产资格。父流程仍需复核字段／缺正文保护、共享实现与离线回归、新的严格原字段双扫及安全链验收。**不要直接把这些 `/tmp` 候选晋升**：为避免记录招聘联系方式，部分 JD 邮箱已脱敏；原联系方式部分不在本轮逐字稳定性证明内。

## 1. 官方身份、导航与实际广入口

| key | 第一方起点与组织／门户 | 原站身份与正常广列表 | 原站第一页 / explicit total |
|---|---|---|---:|
| `kimi` | [校园 moonshot/148507](https://app.mokahr.com/campus-recruitment/moonshot/148507) | 标题「Kimi校园招聘」；关于我们明确月之暗面＝Moonshot AI、Kimi 为其产品；页脚北京月之暗面科技有限公司。首页「其他职位／查看更多职位」指向 [同门户 `#/jobs/`](https://app.mokahr.com/campus-recruitment/moonshot/148507#/jobs/)。 | 30 / **93** |
| `kimi_social` | [社会 moonshot/148506](https://app.mokahr.com/social-recruitment/moonshot/148506) | 标题「Kimi社会招聘」，同品牌、法人说明；「查看更多职位」指向 [同门户 `#/jobs/`](https://app.mokahr.com/social-recruitment/moonshot/148506#/jobs/)。 | 30 / **106** |
| `zhipu` | [校园 zphz/148984](https://app.mokahr.com/campus-recruitment/zphz/148984) | 标题「北京智谱华章科技股份有限公司 - 校园招聘」，页脚同公司并链接公司官网；「查看更多职位」指向 [同门户 `#/jobs/`](https://app.mokahr.com/campus-recruitment/zphz/148984#/jobs/)。 | 23 / **23** |
| `zhipu_social` | [社会 zphz/148983](https://app.mokahr.com/social-recruitment/zphz/148983) | 标题／页脚为北京智谱华章科技股份有限公司；正文「公司官网」为 [zhipuai.cn](https://www.zhipuai.cn/)。主导航「职位列表」为 [同门户 `#/jobs`](https://app.mokahr.com/social-recruitment/zphz/148983#/jobs)。 | 30 / **135** |

各页标题、链接、空搜索框、正文与截图保存在 `<key>-landing.{json,png}`、`<key>-jobs-page.{json,png}`，统一临时前缀为 `/tmp/ande-moka-standard-`。列表每条 `orgId` 均与上表一致；品牌关系同时依据原页面文字，不仅依据注册表旧备注。

### 月之暗面短链不是新来源

- 校园页「社招职位」的 [官方短链 phmkug](https://app.mokahr.com/su/phmkug) 正常跳转至 `https://app.mokahr.com/apply/moonshot/148506`，页面仍是「Kimi社会招聘」。
- 社会页「校招&实习职位」的 [官方短链 gblcus](https://app.mokahr.com/su/gblcus) 正常跳转至原校园 `moonshot/148507`，标题仍为「Kimi校园招聘」。跟踪 query 的值不记录。
- 对 [官方 `apply` 别名广列表](https://app.mokahr.com/apply/moonshot/148506#/jobs/) 仅补捕获原生第一页：同 `orgId:"moonshot",siteId:"148506",site:"social"`，HTTP 200／解密 `success:true,code:0`／total 106，前 30 个 ID 和全部脱敏保存字段与已登记社招页一致。
- 这是官网同组织、同 siteId、同 mode 的导航别名，不是自动扩大到新 siteId；别名没有另做全扫，不重复计为 106 个新机会。证据：`samples-report.json` 的短链记录、`alias-text-report.json` 的原生请求和比较。

### 智谱没有证明需要迁移来源

校园默认全列表同时保留「27届校招」「26届春招」「日常实习」和行政实习，不是仅 2027 单届。`batch:"2027届校招"` 是旧注册文案，**实际请求没有 batch／project 参数**，不能把它当覆盖边界。

社会页另有「内部推荐」指向 [recommendation-recruitment/zphz/148985](https://app.mokahr.com/recommendation-recruitment/zphz/148985)。该入口没有访问、没有登录，不自动联合到已登记公开校／社渠道。社会首页「北京市47／杭州7／上海5／深圳5／厦门4／成都1／其他74」是地点分组而非唯一岗位总数；多地点岗位可跨组，不把相加的 143 当全源总数，使用实际广列表 explicit total 135。

**范围主张仅限上述四个登记公开门户的默认列表，不主张两家公司全球／全部可能招聘渠道。** 未发现需自动改 siteId 的更广独立门户，未改注册表。

## 2. 实际默认 POST、响应与客户端出处

第一方 [列表接口](https://app.mokahr.com/api/outer/ats-apply/website/jobs/v2)，由四个官网 `#/jobs/` 自己发出的请求体：

```json
{
  "orgId": "moonshot",
  "siteId": "148507",
  "limit": 30,
  "offset": 0,
  "needStat": true,
  "jobIdTopList": [],
  "customFields": {},
  "site": "campus",
  "locale": "zh-CN"
}
```

四门户仅替换 `orgId/siteId/site` 为上表组合。**原站 siteId 在列表 body 是字符串，详情是数字。** 关键词、职能、地点、项目、部门、rank、经验、批次等默认不传非空值；`jobIdTopList:[]`、`customFields:{}` 不包含个人筛选。不是旧 crawler body 的逐字段抄写；原 body 见 `<key>-default-list.json` 的 `request.body`。

- 外壳为 `{data:"<密文>",necromancer:"<公开密钥>"}`，无业务 code 本身不代表成功。复用仓库 `moka.decryptAes` 的 AES-128-CBC，IV `de7c21ed8d6f50fe`，解密结果明确为 `{code:0,codeType:0,msg:"成功",success:true,data:{jobStats:{orgId,total},jobs:[...]}}`。
- 未调用任何申请接口；未保存请求 headers／cookie／CSRF／私有联系方式。保存解密后的公开岗位响应及原传输 SHA-256，不保存会话凭据。解密公开客户端返回的数据不是注入签名／SDK 或绕过验证。
- 首次打开四站根首页，真实请求其实是 `jobs/module`，用于精选／城市模块；随后沿已观察的「查看更多／职位列表」进入 `#/jobs/`，才捕获 `jobs/v2`。初始 20 秒等待 `v2` 未出现是**研究脚本等待目标不适用于根首页**，不是接口拒绝／零岗位，更不据此宣布成功。初始观察只做一次，未盲重试该目标。

本轮各站实际加载同一个[第一方客户端](https://static-ats.mokahr.com/recruitment-web-client/javascripts/recruitmentWeb-20260921-1936-e040c-release.js)。完整 JS 保存为 `official-client.js`，相关原字节片段为：

- `client-list-request.js`：普通 `jobs/v2` endpoint、`needStat:!0` 和 `locale`；对应大文件字符位置约 4,039,300。
- `client-renderer-date.js`：职位信息 label 与日期／类别／性质 renderer；详见第 5 节。
- `client-employment-enum.js`：性质原枚举；字符位置约 357,424。

网页自己加载的安全／监控脚本未被替换、调用或外注。本轮没有出现验证码／HTTP 拒绝／失败业务码；若出现应停止该 source，不能沿用已有首页冒称完整。

## 3. 两轮研究候选的覆盖证明

为核同组织双门户是否相互包含，保留校／社集合而非凭标题猜关系。第一轮复用原网页已捕获的默认第一页，只续取后页；第二轮从 offset 0 完整取同 body。页间至少 250ms，没有分类／关键词分片，没有逐岗机械详情。

| source | 两轮稳定 explicit total | 每轮精确页长（limit 30） | 独立官方 ID | 原状态（全部保留） |
|---|---:|---|---:|---|
| `kimi` | 93 | 30 / 30 / 30 / 3 | 93 | open 82 / pause 11 |
| `kimi_social` | 106 | 30 / 30 / 30 / 16 | 106 | open 105 / pause 1 |
| `zhipu` | 23 | 23 | 23 | open 23 |
| `zhipu_social` | 135 | 30 / 30 / 30 / 30 / 15 | 135 | open 130 / pause 5 |

- 每页 total 均相同；页长等于 `min(limit,total-offset)`；累计恰等 total；内部无重复 ID、无组织错配。第二轮与第一轮 ID 集合及保存的所有脱敏字段一致，没有只比较标题／ID 而忽略 JD。
- 月之暗面校／社官方 ID 交集 **0**，智谱校／社交集 **0**。本次观察合计 357 个不同 `orgId＋id`；不跨 org 仅按 UUID 或同标题合并。
- 第一轮续页使用新隔离浏览器 `about:blank` 的普通浏览器 fetch；接口正常允许匿名 CORS，未覆盖 Origin／UA／cookie／CSRF。第二轮在已正常打开的 `https://app.mokahr.com` 页面同源 fetch。同源正文与 first-page 原网页 POST 是另外捕获的事实，**不把匿名续页说成网页自动翻页**。
- 原网页四第一页捕获于约 10:35Z；第一轮后页完成 10:37:23–10:37:26Z，第二轮 10:41:13–10:41:24Z。都是真实研究时间，不作为生产 lastSuccess，也不是性能 SLA。

证据：`<key>-default-list.json`、`<key>-scan{1,2}-offset<N>.json`、`<key>-candidate-scan{1,2}.json`、`scan{1,2}-report.json`、`relationships.json`。候选显式带 `researchOnly:true,notProductionSnapshot:true`，不具备安全链的成功快照资格。

`sanitized-candidate-comparison.json` 对对象键递归排序、保留数组顺序，以 SHA-256 比较两轮保存岗位；两轮相同的 hash：

| key | 脱敏岗位字段集合 SHA-256（不是生产 raw hash） |
|---|---|
| kimi | `d002ec9e24b94c8d194a94ef4d1835a6c9d52249e32f3b24b95f6cce80c2278a` |
| kimi_social | `57ab618abfde96cfba6c6b526c8eaf138602b1aafc2f4b5397152e54a1fe126c` |
| zhipu | `7afdc9c860a914d727a2ad1a9f8d218d5a8e59b036eda5a4fea4fedcfbdb2522` |
| zhipu_social | `38b48355076fc71b118379058df40f72bc940e1c10af135181fa4a4738968e8a` |

**严格限制：** Kimi 部分 JD 中官网招聘邮箱在写盘前替换为 `[redacted-email]`；涉及邮箱的原字符不能由此证明两轮逐字相同。所有未脱敏保存的岗位事实均一致，但本轮不是可直接晋升的原文全量验收。主页别名的比较也使用同样口径，不隐瞒初次未脱敏比较与保存版比较的差异。

## 4. JD、代表样本与官网缺正文

独立[详情接口](https://app.mokahr.com/api/outer/ats-apply/website/job) 是直接打开官方 `#/job/<id>` 页面后自己发出的 `POST`：

```json
{"orgId":"moonshot","jobId":"569f5aad-3f68-41ba-ab5d-720e4148bda7","siteId":148507,"locale":"zh-CN"}
```

以下 **8 个可读样本**均 HTTP 200、解密 `success:true,code:0`，ID／orgId 严格一致；列表与独立详情 `jobDescription` **原 HTML 完全相同**。本轮没有截取前 600 字或只比较首段：

| source | 两个直接官网样本 | 调查要点 |
|---|---|---|
| kimi | [体验运营实习生（体验分析方向）](https://app.mokahr.com/campus-recruitment/moonshot/148507#/job/569f5aad-3f68-41ba-ab5d-720e4148bda7)；[编导／制片实习生](https://app.mokahr.com/campus-recruitment/moonshot/148507#/job/fade7234-e9ab-47bd-9844-401b8fedbf01) | 非技术岗位保留；前者标题／正文说实习，但官网性质字段和 DOM 都写「全职」，不按标题改字段。后者列表／详情 `pause` 仍公开展示正文及申请按钮，不提交申请，不推成可投或下架。 |
| kimi_social | [国际化合规](https://app.mokahr.com/social-recruitment/moonshot/148506#/job/40fec52e-b90f-40b8-9e57-2ff74fb86710)；[资深后端研发工程师](https://app.mokahr.com/social-recruitment/moonshot/148506#/job/245994ba-9e07-4b0e-b42d-cd4da42771e0) | 合规、3年以上经验和资深技术均保留；JD 包含定位、职责、要求、加分与工作地点，不因经验方向删段／删岗。 |
| zhipu | [AI Native 设计实习生（日常实习）](https://app.mokahr.com/campus-recruitment/zphz/148984#/job/4e5243c1-bee1-45d7-bf54-e79fadcbce4e)；[27届校招 GLM-Code Agent算法工程师](https://app.mokahr.com/campus-recruitment/zphz/148984#/job/124aa3c6-e4a8-4e7d-a63b-ec8b915611a8) | 设计／日常实习和算法校招的全文均在列表。职能列表「其它」、详情／DOM「其他」有文字差异，不能因此认为岗位或 JD 不同，也不靠部门猜职能。 |
| zhipu_social | [金融行业研究（兼职合作）](https://app.mokahr.com/social-recruitment/zphz/148983#/job/95e6dd33-9fbe-48dd-ae8c-f75ce7026efd)；[资深前端开发工程师](https://app.mokahr.com/social-recruitment/zphz/148983#/job/53fcccb6-ce43-451a-aa2c-4020ef6c6c04) | 非技术／兼职／3年以上与资深技术均保留；金融样本连「合作条件」末尾远程／北京／珠海说明也完全保留。 |

### DOM 比较方法与限制

保存了各样本的原始 API HTML、独立详情公开字段、**现场 `document.body.innerText`**、浏览器解析 HTML 得到的完整正文和截图：`<key>-sample-<id>.{json,png}`。

初始 `[class*="jobDescription"]` selector 没匹配到编译后的 CSS-module 类，报告 `descriptionNodes:[]`；**没有伪称通过 innerHTML 比较**。无需重发同样详情：从已保存的现场 DOM 全文中，按独立行「职位描述」到「职位信息」截取整个正文，与同场浏览器解析的列表 HTML `textContent` 比较，仅忽略空白，8/8 完全相同。方法和每段完整实际 DOM 正文见 `dom-comparison.json`。这是实际 DOM 全文核对，不是只用 API 自证 API。

### 五条无可读正文：逐个独立详情／DOM 已证实

| source | 官网 ID／链接 | 官方列表、独立详情与 DOM |
|---|---|---|
| zhipu | [1a5da7c6-87f9-416d-a3ff-87b0196f8ccf](https://app.mokahr.com/campus-recruitment/zphz/148984#/job/1a5da7c6-87f9-416d-a3ff-87b0196f8ccf) · 27届校招-后训练算法工程师（working agent方向） | 列表／详情都**缺** `jobDescription`，DOM 职位描述「暂无」。 |
| zhipu_social | [30992752-922d-4e6e-922e-35491e6d31d6](https://app.mokahr.com/social-recruitment/zphz/148983#/job/30992752-922d-4e6e-922e-35491e6d31d6) · HR实习生 | 列表／详情缺字段，DOM「暂无」。 |
| zhipu_social | [1138a66f-2dc4-4212-ac21-2a1f2678a3f2](https://app.mokahr.com/social-recruitment/zphz/148983#/job/1138a66f-2dc4-4212-ac21-2a1f2678a3f2) · 渠道销售 | 列表／详情缺字段，DOM「暂无」。 |
| zhipu_social | [4076030b-d5a1-4980-905f-337f09648c5b](https://app.mokahr.com/social-recruitment/zphz/148983#/job/4076030b-d5a1-4980-905f-337f09648c5b) · 实习生 | 列表／详情缺字段，DOM「暂无」；官网性质却为「全职」，不根据标题擅改。 |
| zhipu_social | [52dfee73-f04c-44cf-895d-1eb5f1451fd9](https://app.mokahr.com/social-recruitment/zphz/148983#/job/52dfee73-f04c-44cf-895d-1eb5f1451fd9) · 渠道销售 | 列表／详情 HTML 都为 `<p><br></p>`，DOM 正文空白；与上一同标题不同 ID 的机会不能合并。 |

4 个缺字段案例见 `samples-report.json`／`dom-comparison.json`；HTML 空白案例单独见 `placeholder-report.json` 与同命名样本文件。共取 **13 个独立详情**（8代表＋5异常），不是每岗详情模式。

对已有列表 HTML 使用离线浏览器 DOMParser 检查了全部 357 条，没有再逐条请求原官网。结果：kimi **93/93** 可读、kimi_social **106/106**、zhipu **22/23**、zhipu_social **131/135**，共 **352/357**。最短可读正文分别约 147／133／234／201 字符（脱敏后 `textContent.trim().length`）；不是长度门槛，不据短文删岗，也不承诺招聘方填写详尽。证据 `alias-text-report.json`、`<key>-domparser-text.json`。

## 5. 字段、原枚举与日期语义

### 实际性质、职能与保留范围

| source | 全部岗位实际 commitment | 可得职能 `zhineng.name` |
|---|---|---|
| kimi | 实习74／全职19 | 市场类/Marketing&BD、职能类/Corporate Functions、产品类/Product、运营类/Operation、技术类/Technical、设计类/Design、算法类/AI、其它 |
| kimi_social | 全职106 | 上述各类，另管理类/Manage；也有其它 |
| zhipu | 全职11／实习11／其它1 | 其它、算法研究 |
| zhipu_social | 全职109／实习24／兼职1／其它1 | 其它、工程研发、职能专业、商务序列、算法研究、产品项目方案 |

原客户端性质枚举 `[(i18nMark)("全职"),(i18nMark)("兼职"),(i18nMark)("实习"),(i18nMark)("其它")]`，最后一个 display label 为「其他」；详情 renderer `COMMITMENT:"职位性质"`／`value:T._(a.commitment)`。这是原字段事实，不把「其它」硬改全职，不把「兼职」删除或冒称实习。若目标 schema 不支持兼职，保留机会和原事实，未知维度需如实处理。

校园渠道≠实习性质。智谱社会确有 24 个 `实习`；例如默认列表的 `【校招/实习】多模态训练数据算法工程师` 为 `commitment:"其它"`，仍在社会门户，不能按标题删除或擅改官方性质。月之暗面校园完整列表还含「增长团队管培生」「HR管培生」「Kimi Agent Eval 专家招募（金融/审计方向）」；均保留，**没有结构化人才计划／项目／批次字段，不据这些标题标 `talentPlan:true`**。四源人才计划维度仍未知。

`zhineng` 为 `{id?,name}`，明确「职能类型」renderer 使用名称，不用 `deptId`／department／`category2Id` 替代。列表「其它」与详情「其他」的细微差异原样记录；本轮列表模式有足够独立类别事实，不需要为了统一这个标签逐岗取详情。

地点 `locations` 是数组：本次出现中国的 `{id,country,provinceId,provinceName,cityId,cityName}`，其中 `cityName` 可是海淀区／黄浦区／上城区／浦东新区／双流区等区级名称；按原值保留，不伪造行政级别。Kimi社会另有**仅国家名**的美国／新加坡对象，无 city：采用已有国家回退，不把这类岗位当坏数据跳过。`[]` 是官网未明确结构化地点，不用 JD 自行填城市；详情地点还可能多 `countryDescription` 或少 `provinceId`，不能说元数据全部逐字相同。详情渲染器调用 `formatLocationListToShortStr({locations:a.locations,...})`。

### 发布日期有一手明确映射

本轮 357 条列表均有字符串 `publishedAt`，8 代表＋5无正文样本的详情同字段与列表相同，真实 DOM 同时显示「发布于 YYYY-MM-DD」及职位信息「发布日期」。

[本轮第一方客户端](https://static-ats.mokahr.com/recruitment-web-client/javascripts/recruitmentWeb-20260921-1936-e040c-release.js) 在 **同一 renderer** 中：

```js
D = { /* ... */ PUBLISH_AT:T._("发布日期") /* ... */ };
// a = e.currentJob
case "publishedAt":
  t.push({name:D.PUBLISH_AT,value:(0,b.formatDate)(a.publishedAt)});
  break;
```

原片段 `client-renderer-date.js` 对应主文件字符范围 `[191760,196260)`，label 在约 192080，字段 switch 在此片段末尾；另外 header 直接取 `n.publishedAt` 并渲染 `"发布于 {0}"`。截取和完整 JS 均有文件 hash；不是引用阶跃旧结论代替本轮客户端证据。

可映射 `dateKind:published`，只取本轮已证实的 `publishedAt`。`createdAt/openedAt/updatedAt/closedAt` 及详情 `finishedAt` **未获此日期标签证明，不回退**。原 timestamp 没有显式时区，不冒充 UTC 精度；日期显示应遵循官方提供的日历日期。

状态原码见第 3 节。`pause` 样本确实可公开打开；`open`／申请按钮也不证明提交会成功。原码保留、非 open 不自动筛掉；没有申请行为，不推测下架或可投。

### 列表全部观测公开字段（并集 23 个）

这是本次四门户响应字段清单，不是整个 Moka 系统所有可能字段承诺。`<key>-field-profile.json` 逐源记录 presence／type／枚举；字段缺失与 null 不混淆。

| 字段 | 实际类型与处理证据 |
|---|---|
| `id`, `orgId`, `title` | string；官方身份／组织／完整标题 |
| `jobDescription` | string 或字段缺失；HTML 原正文，5异常口径见第4节 |
| `commitment` | string；全职／实习／兼职／其它，已由原 renderer 确认性质 |
| `zhineng` | object `{name:string,id?:number}`；官方职能名称 |
| `locations` | array；原地点对象或空数组，国家回退与区名事实见上文 |
| `status` | string；实际 open／pause，不解释成自动下架 |
| `publishedAt` | string；已核发布日期 |
| `createdAt`, `openedAt`, `updatedAt`, `closedAt` | string；前三者普遍有，closedAt 部分有；不拿字段名当发布／更新时间语义证明 |
| `campusSites` | array；本次均为空，不当招聘性质或项目 |
| `applicantLimitCheck` | object；匿名公开投递限制配置，观测键 `duration/isSetting/remainder/total`（可缺）；不是采申请记录、不用于删岗 |
| `deptId`, `attributeId` | number；部门／优先图标等内部引用，语义不能替代职能／性质 |
| `hireMode` | number；本次校园全部2、社会全部1；只是观测，渠道以实际注册门户／原site证明，不独立推未知枚举 |
| `prior` | number；有值为1，可能缺；官网「急」图标相关，不筛掉其他岗位 |
| `showIsCampus` | boolean；列表全部false，但代表详情为true，明显不能单独当岗位校／社事实 |
| `multiLocale` | string；JSON文本如 `{"mainLocale":"zh-CN","secondLocale":""}`，可缺，不擅自跨语言补字段 |
| `category2Id` | string；部分存在，例如1.1.1／1.2.2；renderer另标「职位类别」，不能替代已具名职能 |
| `salaryUnit` | number；只在本次智谱校园列表普遍出现，不能由数字猜单位／薪资 |

### 独立详情全部观测字段（并集 53 个）

除列表共有字段外，详情还返回招聘管理配置；不因为公开接口返回它们就全部投放前端，也不把流程／推荐设置当岗位性质／人才项目。类型与安全样本见 `detail-field-profile.json`。以下清单覆盖本次 13 个样本的所有键（列表特有 `applicantLimitCheck/deptId/closedAt` 不一定存在于详情）：

- string：`id,orgId,title,status,jobDescription,commitment,createdAt,openedAt,updatedAt,publishedAt,finishedAt,createMethod,category2Id,multiLocale,jobContactWorkWechatQRCode`。正文可缺；联系二维码本次为空，联系方式不采集／展示。
- object：`department`（id/name）、`customFields`（本次是空「第三方职位ID」配置）、`recommendationReason,zhineng`。
- array：`aimFields,campusSiteGroupByCity,campusSites,departments,jobIntentions,jobRankIds,locDepCampusList,locations`。
- boolean：`isShowRecommendSite,showCampusSites,showIsCampus`。
- number：`aiCurrentAccuracy,aiThresholdAccuracy,attributeId,autoArchiveTalentPoolId,autoDistribution,autoFilterThreshold,departmentId,deptParentId,hireMode,maxSalary,minSalary,number,pipelineId,postRequestResult,prior,recommendAccessTimes,recommendShareTimes,recommendationBonus,salaryUnit,shmInterview,shmNextInterview,useHeadhunter,virtual`。

未知字段保持原性质，不由名字猜「人才计划」「全职」「发布日期」。生产端应只取已证明的岗位公开字段；研究不会申请、获取简历、联系人或候选人信息。

## 6. 给共享实现的 source profiles／阻塞

结构化资料：`/tmp/ande-moka-standard-sourceprofiles.json`，固定四个 key／org／siteId／site／官网URL，记录真实 body、字段 profile、第一页与分页、性质／状态、正文异常／日期一手依据和范围限制。关系单独为 `relationships.json`。

本轮已能独立支持：四个固定公开门户、空个人筛选、严格 list v2 total／ID／组织、现有列表完整HTML、官网具名职能／性质、列表 `publishedAt` 的发布标签及保留原状态。**不建议直接把四个来源统一翻为 `fetchDetails:true`**：已有全文不需要逐岗详情，且当前 `moka.fetchAll` 详情路径要求字符串 JD，会把智谱四个官方缺字段拒成整源失败。

剩余放行条件由父流程执行：

1. 最小共享 profile 明确以上固定来源身份及 list-fulltext/date 的证据，不能继承阶跃或「同Moka」资格；注册表参数／旧 batch 文案如何澄清由父统一处理。
2. 缺字段与空HTML的已证实官方无正文应保留机会并 `jdComplete:false`，不能补「暂无」作为招聘正文、跳过坏岗或称352/357都是完整；未知响应／请求失败仍拒源。
3. 支持列表已经提供可靠日期／状态的路径，不为了日期再取所有详情；原字段／身份／分页漂移要拒源。正文用既有 `jd-text`，不截断、不凭经验／职业删岗。
4. 生产候选重新遵守安全链的原始字段稳定性与覆盖保护；此次小双扫仅研究关系，脱敏候选不可拿去覆盖数据。首次迁移旧历史少见的记录不能叫已核验下架。
5. 没有 HTTP／业务拒绝阻塞；实际阻塞是现有资格／字段语义尚未接入，以及官方无正文需要真实处理。最终是否放行、发布均未在本研究执行。

## 7. 浏览器、清理与证据 hash

- 原生隔离 Chrome，经原生 CDP `Browser` version 实测 **Chrome/154.0.8037.98**。原生 UA 为 `HeadlessChrome/154.0.0.0`／macOS 默认值，未改为其他浏览器或指纹；Node `v25.8.0`，无新运行依赖。
- 复用 `/tmp/ande-bytedance-cdp.cjs` 的 `{open,sleep}`；其创建的临时 profile 命名 `ande-bytedance-probe-*`，所有本研究会话在 `finally` 关闭浏览器并删除 profile。7个会话的报告均 `cleanup:{chromeExited:true,profileRemoved:true}`：`initial-report.json,jobs-report.json,scan1-report.json,samples-report.json,scan2-report.json,alias-text-report.json,placeholder-report.json`。没有遗留后台 Chrome／profile。
- 各响应、默认 body、解密结果、完整HTML／DOM文字／截图、客户端原片段、双扫与字段统计仅在 `/tmp/ande-moka-standard-*`；repo 持久笔记只有本文件。未记录 cookie／CSRF／私有联系详情；JD 内邮件地址也已脱敏，短链跟踪 query 值省略。
- 文件 SHA-256 汇总在 `/tmp/ande-moka-standard-manifest.json`；它也包含本 Markdown 的 byte hash、客户端 hash 和每个候选／样本／脚本的 hash。临时证据不承诺持久保存，hash 不代替官网范围／时间证明。
