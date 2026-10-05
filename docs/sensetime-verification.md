# 商汤 · 飞书门户 v0.24 核验

下文初核为历史；父后续双全扫并本地发布校园151/社86，含5条官网空正文的独立详情/DOM核查，最新状态见[八来源采集及发布](feishu-batch-verification.md)。

## 状态与范围

2026-10-05，父流程以正常匿名隔离 Chrome **154.0.8037.98** 核查两个官网入口；本节是小样本范围/字段核验，不是全量成功或发布证明。后续完整采集及本地发布结果另列，未登录/投递/绕过验证/外注SDK/忽略TLS，不接触用户profile。

| key | 实际入口 | website-path | portal_type | 正常官网总数 |
|---|---|---|---:|---:|
| `sensetime` | [校园](https://hr-jobs.sensetime.com/edu) | `edu` | 6 | 151 |
| `sensetime_social` | [社招](https://hr-jobs.sensetime.com/exp)（根路径正常跳转至此） | `exp` | 6 | 86 |

两个页面分别明确标「商汤校园招聘」/「社会招聘」，并提供返回 [商汤招聘首页](https://hr.sensetime.com/) 链接。源完整性仅指这两个登记门户，不宣称所有公司招聘网站/全球入口。默认列表和城市/职能/项目均未选择个人筛选；两个门户同为6，必须保留各自website-path，不能套字节3/2或单凭URL猜每岗渠道。

校园 [官网筛选配置](https://hr-jobs.sensetime.com/api/v1/config/job/filters/6)（website-path:edu）公开三个项目：

- `7654524986392824115`：「无限原力」顶尖人才计划；
- `7659352215651797289`：实习生；
- `7657490082207058226`：27届校园招聘。

旧注册只选第三个项目，并留有排除无限原力的旧备注；现正常校园入口的 `subject_id_list:[]` 不应被旧单项目条件限制。项目存在不证明实际有该项目岗位，不能用151减旧57来声称当年漏94岗。全职业、未挂项目、资深/实习/人才项目均不主动删。

## 正常请求与完整性边界

官网列表 [POST /api/v1/search/job/posts](https://hr-jobs.sensetime.com/api/v1/search/job/posts) 采用普通 XHR、现有官网客户端/匿名会话；本轮同源原生XHR大页正常获得HTTP200/code0，不研究、改写或外注安全SDK，不手工签名。观察非敏感header为 `website-path:edu|exp`、`portal-channel:saas-career`、`portal-platform:pc`、`accept-language:zh-CN`、`env:undefined`，POST content-type 为application/json。CSRF只在内存复用，不记录cookie/token/签名值；留存URL中的安全query被移除/遮盖。

```json
{"keyword":"","limit":10,"offset":0,"job_category_id_list":[],"tag_id_list":[],"location_code_list":[],"subject_id_list":[],"recruitment_id_list":[],"portal_type":6,"job_function_id_list":[],"storefront_id_list":[],"portal_entrance":1}
```

query与POST同范围；正常大页仅将limit改50，取得50条/151与50条/86。响应 `code:0,data:{job_post_list,count,extra}`，count为明确整数。这里仅首50条样本，不宣称终页/全ID/JD全量已对账；后续复用稳定总数、精确页长、唯一官方ID、两个完整扫描以及每岗所有raw/canonical字段一致检查，提前短/空页、触顶、HTTP/业务错误或任何漂移都失败，不写部分候选或伪造complete。

## 正文、类别和招聘属性

两个独立字段 `description` / `requirement` 为换行原生纯文本，不做HTML剥离或实体解码；嵌套job_post_info在已看样本不提供非重复独立JD。完整正文不要求雇主填写详尽；缺要求/符号占位如出现仍按真实缺值保留，不删岗、不补造。

正常独立详情由页面调用 [GET /api/v1/job/posts/{id}](https://hr-jobs.sensetime.com/api/v1/job/posts/7690887161617582399?portal_type=6&with_recommend=false)，实际数据位于 `data.job_post_detail`，推荐岗位不作为详情或全集。四个样本的ID/标题/两份JD原始字符串一致，全部canonical字段一致，独立DOM全文均包含两段（只移除Unicode空白比对）：

| 官网样本 | 官方属性 | 官网具名类别 |
|---|---|---|
| [商务运营实习生-深圳](https://hr-jobs.sensetime.com/edu/position/7690887161617582399/detail) | 校招＋实习 | 商业运营 |
| [客户关系经理（国产芯片方向）](https://hr-jobs.sensetime.com/edu/position/7687533328036366602/detail) | 校招＋「正式」 | 产品运营 |
| [社媒内容运营专员-元萝卜机器人](https://hr-jobs.sensetime.com/exp/position/7689017042351737097/detail) | 社招＋全职 | 品牌 |
| [Sales Manager（Hong Kong）](https://hr-jobs.sensetime.com/exp/position/7683422160660285737/detail) | 社招＋全职 | 互联网 / 电子 / 网游 |

- 渠道按 `recruit_type.parent.name` 的明确校招/社招；性质按真实叶名称，实习/全职可归一化，「正式」不硬映射全职。不能从项目、标题或学历猜。
- 类别只取具名官方字段，已有样本职能链来自 `job_category`，只展示、不参与筛选/分数；不能把Sales样本行业根改写为「销售」，不建立统一分类。
- `publish_time` 原数值存在，但已看列表/详情没有日期显示，日期语义未证明；`date/dateKind:null`，不以采集时间或字段英文名冒充发布日期。
- 本轮尚未对每岗人才项目身份单独立资格，`talentPlan:null`，已挂项目仍保留原rawPost，不写false。
- 独立详情与列表的枚举树节点有children空数组/null等不同投影。初版复核过严地比较整个枚举对象而红灯；保留原材料后核ID/标题/完整JD原字符串及**全部canonical字段**均一致。这没有弱化两个列表扫描之间要求所有raw/canonical字段完全一致的采集门禁。
- 页面投递按钮及接口原码不证明实际接受申请，本轮未操作。

## 本机证据与清理

- `/tmp/ande-feishu-sensetime-probe.{cjs,json,log}`：两来源官网自身默认列表/筛选/DOM导航与请求shape；2次列表+2次过滤配置。
- `/tmp/ande-feishu-sensetime-check.{cjs,json,log}`：两来源正常50页样本与四份独立详情/完整DOM；4次列表（含两次正常50页）+4次详情+2次配置，合计10次职位相关请求。
- `/tmp/ande-feishu-sensetime-sample-check.json`：四份全部canonical/两JD+独立DOM校验通过，记录初版投影差异。

研究合计14次职位相关请求（6列表+4详情+4过滤），其余是官网正常页面/元数据请求，匿名login_status由页面自身产生不是登录操作。全部观测的职位相关请求HTTP200，无拒绝后重试；两会话finally均记录Chrome退出/profile移除。临时证据不是云端持久存储，父后续须核采集版本/hash/清理，再准许本地发布。
