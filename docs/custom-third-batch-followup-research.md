# 第三批后续协议研究：雷火公开入口与腾讯项目实习（2026-10-08）

**性质：离线旧捕获复核，另纳入父级提供的新公司官网公开链接收据；不是本研究者新采集、岗位资格授予或发布交付。** 本文仅读取本机一手源码/收据，不执行 JS、不联网、不操作浏览器。唯一新增文件为本文；未改代码、登记、数据、历史报告，不提交、推送或部署。

历史记录见 [custom-third-batch-verification.md](custom-third-batch-verification.md)，不改签其阶段结论。§1–5保留离线研究阶段的结论与未知；§6另记父级随后取得的当前官网材料、实现及交付，不倒改旧收据。阿里云不在本轮范围。

## 1. 结论与证据边界

- **雷火旧 `/select/show` 是登录前停止，不是已证岗位接口 403。** 实际旧网络链为入口 HTTP200 → 用户信息请求 HTTP200/业务 `status:101` → 客户端发起登录导航 → driver 在登录请求实际发送前取消。源码可定位登录拦截，但启动 router 的完整映射仍未知。[LH-OLD, LH-APP]
- 旧 bundle 的后台管理标记不能证明全公司的公众校园招聘都要登录。父级新取得的公司官网首页实际加载 JS 明确链接校园及日常实习两个公开入口，均在 `leihuo.163.com/campus/`，不是管理系统的路由绕过；**本文尚无目的页匿名岗位列表/详情协议及可发布岗位结果**。[LH-PUBLIC]
- **腾讯当前校园列表原生详情导航只用 `postid=item.postId`。** `pid/id/tid` 跳转已注释；不能以缺这三个参数解释本次负 ID 的 `postId:null`，也不能改用旧 API 或子方向 ID 请求求绿。[TX-LIST, TX-DETAIL]
- `-2` 的原详情请求 HTTP200/业务 `status:0`，只是返回 `postId:null`，并非身份字段全空：`id:-2`、`tid:2`、`projectId:12`、原标题均与列表相合。后端同时提供父层职责/要求和 `projectInternDirections`；官方 renderer 按**返回的** `projectId==12` 进入项目实习组合展示，不是客户端从负 ID 合成 JD。[TX-RECEIPT, TX-DETAIL]
- 列表确有 `-2…-6` 五条项目实习记录，但本读收据只闭合了 **`-2` 一条详情**；`-3…-6` 不继承它的详情资格。不能无条件放行 `null`、改请求身份或声称五条详情已经通过。[TX-LIST-DATA, TX-RECEIPT]

## 2. 雷火：管理系统登录链与正常公众入口分开

### 2.1 旧捕获实际发生的请求

`observe-netease-leihuo-select/network.json` 中三个可检索的原请求：[LH-OLD]

| 原 URL / 动作 | 原收据 |
|---|---|
| `https://xiaozhao.leihuo.netease.com/select/show` | 主 Document HTTP200 |
| `https://xiaozhao.leihuo.netease.com/user/query/user_data` | GET，HTTP200；`nativeJSON:{status:101,msg:"该用户未登入,请去登入",data:[]}` |
| `https://xiaozhao.leihuo.netease.com/login?from_url=https://xiaozhao.leihuo.netease.com/select/show` | 后续 Document 导航被取消；`response:null`、`failure.canceled:true`，不是登录页返回拒绝 |

邻接 `dom.json` 保存 `url:/select/show`、`route:"#/"`、标题“雷火校招系统”，正文/链接空；`report.json` 保存 `productionEligible:false`、`researchScanComplete:false`、`apiObserved:false`、`state:"partial-or-blocked"` 及 `Unreviewed/login main Document navigation blocked`。报告的 `apiObserved:false` 不抹掉已记录的用户信息 XHR，也不证明其它公众入口没有岗位 API。

本组网络收据不能签岗位 HTTP403。源码内 `se===403` 是响应封套的权限分支，不等于一次实际 HTTP403；其它非岗位请求的 403 也不能推广成岗位接口拒绝。

### 2.2 可精确定位的客户端门禁；router 未知保留

原 app 过长单行受读取工具限制，使用父级对同一旧文件生成的只读摘录 `leihuo-app-fragments.json`；没有执行 bundle。[LH-APP]

- 模块 `39421` 生产 `f="//xiaozhao.leihuo.netease.com"`；登录地址为 `G=f+"/login?from_url="+window.location.href`，`G` 以 `ZE` 导出。
- 实例 axios 的 response interceptor 从封套读取 `se=Ee.status||Ee.code`。普通路径收到 `101` 会保存登录前 URL、设置 `window.location.href=G` 并 reject。`403` 则显示无权限提示；确认提示后才走登录导航。这是 **response interceptor**，不能改称已经查明的 router `beforeEach`。
- 另一个全局 axios interceptor 检查 `n.data.status==101`，保存前 URL，再创建指向 `It.ZE` 的 `_self` 链接并点击。两处均有特殊路径例外；例外不是匿名岗位入口的资格证据，也不用于绕过门禁。

短源码摘录（不同位置分列，省略无关分支；不含会话材料）：

```js
// 模块 85591：保存导航地址，不是保存会话 token
const o="link-before-login";
function D(){window.sessionStorage.setItem(o,window.location.href)}

// 模块 39421：response interceptor 的 101 分支
if(se===101)return p()?Promise.reject({code:se,message:"\u672A\u767B\u5F55"})
  :((0,u.Y)(),window.location.href=G,
    Promise.reject({code:se,message:"\u672A\u767B\u5F55"}));
// 同模块登录地址
G=f+"/login?from_url="+window.location.href
```

定位：摘录中 `window.location` 命中 offset `4059009/4059131` 包含模块 `85591`，`4059965` 包含生产域名，`4061123/4062335` 包含 `101/403` 分支，`/login` offset `4063605` 包含地址定义。offset 是原 JS 字符串索引，不是行号或字节位置。

启动摘录 offset `4465079` 显示 `H8=i(10286)`，独立运行的普通分支在 `(0,H8.i)().then(...)` 后才 `_t()` 挂载 Vue；`_t` 中创建 `xt(...)` router。**模块 `10286` 的内部实现及完整 `xt` route records/guard 未在本次可读摘录中闭合，不将其实名签作某个 getUserData 函数，也不推断 `/select/show` 的具体客户端路由映射。** 网络中的用户信息请求及登录前停已独立成立，无需为此继续钻旧后台路由。

同摘录 offset `4425473` 明确含 `measurement:"recruit_management_background"`，以及 `myFilter/myReview/myInterview/myIntern/myAssessment` 等后台页面标记。内含筛简历/评审等路由或 API 字符串，不是公众招聘列表协议，更不是采集授权。

### 2.3 公司官网实际公开的校园/实习链接

父级新收据：`https://leihuo.163.com/` HTTP200，标题“网易雷火事业群 - 纯粹热爱，火力全开”；完成钟 `2026-10-08T11:39:16.021Z`。该首页 `scripts` 实际列出下面的 `index_523c5760.js`，随后父级取得 HTTP200 的该 JS，provenance 为 `Script src from normal company homepage`，完成钟 `2026-10-08T11:40:40.936Z`。[LH-PUBLIC]

其 `+E5O` 模块（`src/components/nav-list.vue`）在“加入我们”下真正渲染 `<a href>`：

```js
// index_523c5760.js 的校园、实习导航：原生成 renderer 的短摘录
n("a",{attrs:{href:"https://leihuo.163.com/campus/#/",target:"__blank"}},[e._v("校园招聘")])
n("a",{attrs:{href:"https://leihuo.163.com/campus/#/dailyIntern",target:"__blank"}},[e._v("日常实习")])
```

这两条可以作为正常公开导航的入口线索，不是猜路径、旧 API 替换或后台登录绕过。它们与 `xiaozhao.leihuo.netease.com/select/show` 的后台系统证据必须分开；旧入口登录不能推为这两个公众入口也必须登录。

同导航还明示“社会招聘” `https://leihuo.163.com/jobs/#/join`；本文仅记录邻接证据，**不扩大本源校园/实习范围、不新增或授予社会来源资格**。目的校园页能否匿名加载真实岗位、具体列表/详情协议及身份绑定仍待父级正常导航的独立收据；不提前签收其结果。

## 3. 腾讯校园：负 ID 怎样绑定官方项目实习分支

### 3.1 五条真实列表身份与当前 click handler

`collections/tencent.json` 的末页 `data.positionList`，约第 15240–15324 行：[TX-LIST-DATA]

| 列表 `postId`（原字符串） | `id / position` | `positionFamily` | `projectId` | `positionTitle` |
|---|---:|---:|---:|---|
| `"-2"` | -2 / -2 | 2 | 12 | 项目实习生-技术 |
| `"-3"` | -3 / -3 | 3 | 12 | 项目实习生-产品 |
| `"-4"` | -4 / -4 | 4 | 12 | 项目实习生-设计 |
| `"-5"` | -5 / -5 | 5 | 12 | 项目实习生-市场 |
| `"-6"` | -6 / -6 | 6 | 12 | 项目实习生-职能 |

五条均为 `positionSource:"oa"`、`positionUrl:null`、`projectName:"项目实习生"`、`recruitLabelName:"日常实习"`。它们是列表原值，不是为了探测而生成的负数。

当前列表 Vue renderer 对卡片传入：

```js
_vm.handleToDetail(item.positionSource,item.projectId,
  item.position,item.positionFamily,item.positionUrl,item)
```

但当前 handler 的 OA 分支实际仅使用 `item.postId`：[TX-LIST]

```js
handleToDetail: function handleToDetail(positionSource, pid, id, tid, url, item) {
  // 其它日志代码略
  if (positionSource === 'oa') {
    // window.open(`post_detail.html?pid=${pid}&id=${id}&tid=${tid}`, '_blank')
    window.open('post_detail.html?postid=' + item.postId, '_blank');
  }
  // 非 OA 分支略
}
```

因此五条按当前官方 handler 生成的详情入口分别为 `https://join.qq.com/post_detail.html?postid=-2` 至 `?postid=-6`；这是**源码导航契约＋已取得列表**的结论，不声称本研究逐条点击了五个页面。

详情 `created` 读取 `windowGlobal.getQueryString('postid')`。仅当 `postid` 缺失且 `id/pid` 同时存在时才进入兼容旧简历/海报的转换分支；当前负字符串 `"-2"` 非空，不进入该分支。随后直接调用 `getJobDetailsByPostId(_this5.postId)`。[TX-DETAIL]

API wrapper（列表 bundle 约第 8767–8780 行）：

```js
var getJobDetailsByPostId = function getJobDetailsByPostId(postId) {
  return Object(__WEBPACK_IMPORTED_MODULE_0__common_myaxios__["a" /* default */])({
    url: '/api/v1/jobDetails/getJobDetailsByPostId',
    method: 'GET',
    params: { postId: postId }
  });
};
```

旁边名为 `getJobDetailsByPidAndId(postId)` 的 helper 实际也请求同一 PostId URL/参数，旧名字和测试域名注释不构成另一套参数资格。共享 `openJobDetail` 的 `jobdesc.html` 字符串也不能替代本页实际 click handler。

### 3.2 原 `-2` 收据：HTTP/业务成功，postId null 但复合身份不空

原请求完整 URL（时间戳为既有原请求值，不新构造）：[TX-RECEIPT]

`GET https://join.qq.com/api/v1/jobDetails/getJobDetailsByPostId?timestamp=1791449672411&postId=-2`

`Referer: https://join.qq.com/post_detail.html?postid=-2`；开始 `2026-10-08T08:54:32.565Z`，完成 `2026-10-08T08:54:32.606Z`。收据短摘录（只取相关原字段）：

```json
{
  "httpStatus": 200,
  "status": 0,
  "message": "",
  "data": {
    "postId": null,
    "id": -2,
    "tid": 2,
    "tidName": "技术",
    "title": "项目实习生-技术",
    "projectId": 12,
    "projectName": "项目实习生",
    "recruitType": 2,
    "recruitLabelName": "日常实习"
  }
}
```

原响应已有非空字符串 `data.desc` 和 `data.request`；不是 renderer 临时填出的两栏。`data.projectInternDirections` 有“软件开发类”“安全技术类”两组。第一组中的原子方向记录另有 `postId:"1216426561818062848"`、`id:267`、`title:"项目实习生-全栈开发"`，但其 `desc/request:null`；不能拿这个正 ID 替换父层 `-2` 身份或伪称其独立 JD 已取得。

`receipt-tencent.json` 尾部及 `available-tencent.json.verification.stopped` 都保存该成功响应和本地停止原因。历史适配器的 `Tencent: detail PostId identity` 停止是**本地通用身份 guard 不适配此响应形状**，不是腾讯拒绝，也不是岗位消失。后端为什么内部选择 null 没有服务端源码可证；可证的是它仍返回与当前列表绑定的父层项目/职类/原标题和真实正文，不应把“postId 空”扩大为“整个身份空”。

### 3.3 官方 renderer 是后端项目数据的组合展示，不是负 ID 合成器

当前详情 success 分支（约第 5876–5905 行）：[TX-DETAIL]

```js
_this5.detaliData = res.data.data;
_this5.tidName = res.data.data.tidName;
_this5.isProjectIntern = res.data.data.projectId == 12 ? true : false;
// 中间细分方向分支略
if (_this5.isProjectIntern) {
  var subProject = res.data.data.projectInternDirections[0].subProjectInterns[0];
  _this5.internPostId = subProject.id;
  _this5.newIntentionBGDList = subProject.intentionBGDList;
  _this5.internRecruitCityList = subProject.recruitCityList;
  _this5.internWorkCityList = subProject.workCityList;
  _this5.post_frist_name = subProject.title;
}
```

这里的判断是**详情响应 `projectId==12`**，不是 `postId<0`，也不是从 URL `pid=12` 推出：源码还留有注释 `// this.isProjectIntern = this.pid == 12 ? true : false`，但它未执行。

生成的 Vue template 约第 5924 行起直接文本渲染 `detaliData.title/desc/request`；课题正文替代只属于项目 `14/20` 且 `isQingyun===1`，与项目 12 不同。项目实习方向/部门/地点通过返回的 `projectInternDirections[].subProjectInterns[]` 展示；选择方向的 handler 更新这些选择字段，不创造父层 JD，也不把父请求身份改为子方向 ID。

所以 `-2` 的闭合链是：**列表原 `postId:"-2"`/`position:-2`/职类2/项目12 → 当前 click/query 保持 `-2` → 成功原响应 `id:-2`/`tid:2`/项目12/原标题 → renderer 的后端项目12分支 → 后端父层正文与方向展示。** 不能单凭 bundle 里出现数字12或后台项目名单，推广到任意负数、任意 null 或其它来源。

### 3.4 后续身份规则所需的最小证据，不在本文应用 guard

若父级调整通用身份检查，必须将这个**明确列表绑定的项目实习父层形状**与普通 PostId 详情分开，至少同时验证：

1. 请求 `postId` 仍是当前正常列表原字符串；列表 `positionSource:"oa"`、`projectId:12`，原 `postId` 与 `position` 确实相合；不是生成负数或替换 ID。
2. HTTP200/业务 `status:0`；响应 `projectId` 与列表同为12，`id` 与原列表 `position`、请求负身份相合，`tid` 与原 `positionFamily` 相合；原标题/项目名应与列表相合，而非靠模型语义判定。
3. `postId:null` 只在这个已证明的响应形状中解释；非此分支仍保普通 PostId 绑定，不能全局允许 null。`projectInternDirections` 的实际结构和展示字段须保原值，子方向不顶替父身份；普通19位 ID 继续按原字符串保真。
4. 正文仅保真实 `desc/request` 与已返回附加字段；没有的字段保缺项，不用其它岗位、另一职类或前端合成填空。

这是研究得到的**分支绑定要求**，不是已改/已跑的 guard，不授 `complete`。现有材料仅 `-2` 满足可核的详情身份链；另外四条的真实详情响应及后续 guard 验证仍未知，不因同属项目12就补签，也不为取得绿色结果改变请求 ID。

## 4. 可定位一手索引

下列本机相对路径均基于：

`/Users/nozomi/lab/wheres-my-job-work/third-batch-20261008T071347946Z/`

这些材料留在工作目录，不复制 raw、日志或会话到仓库；本机路径不冒跨 runner 持久存储。行号是辅助定位，另给可检索的精确字符串。

| 标记 | 官方原 URL / 本机文件与定位 |
|---|---|
| **LH-OLD** | `https://xiaozhao.leihuo.netease.com/select/show`；`observe-netease-leihuo-select/{network,dom,report}.json`。network 搜 `/user/query/user_data`、`/login?from_url=`；dom 搜 `"route": "#/"`；report 搜 `Unreviewed/login main Document navigation blocked`。 |
| **LH-APP** | [旧 app JS](https://xiaozhao.leihuo.netease.com/static/js/app.2698dd92e8e9a7447feb.js)；`observe-netease-leihuo-select/scripts/006.js`；可读同源摘录 `followup-20261008T112757164Z/leihuo-app-fragments.json`。SHA256 `f5305c18eeda0d756d7f070e3172d737f2a39d0ba359b6b335546da8fda73714`。搜索 `39421:function`、`link-before-login`、`se===101`、`G=f+"/login?from_url="`、`measurement:"recruit_management_background"`；offset 见 §2.2。旧网络/DOM 的 script 列表证明该 app 实际加载。 |
| **LH-PUBLIC** | [公司官网](https://leihuo.163.com/)；`followup-20261008T112757164Z/leihuo-company-home.json`。实际 script src 为 [公开首页 JS](https://leihuo.res.netease.com/pc/gw/202404241408100/keep_origin/js/index_523c5760.js)；同目录 `followup-leihuo-public-index.{js,json}`。JS 第1行、模块 `+E5O`，搜 `src/components/nav-list.vue`、`command:"school"`、三个原 href；链接段约字符串索引3652附近。两份 JSON 的 URL、HTTP、完成钟及 provenance 分开保存，不把新首页收据回签旧07时观察。 |
| **TX-LIST** | [当前校园列表 JS](https://cdn.multilingualres.hr.tencent.com/joinqq/static2/js/p_zh-cn_post.build.js)；`contracts/tencent-campus-post.{js,json}`。provenance 是当前匿名官方 Document 实际加载公有 JS；HTTP200、825738 bytes。JS 第6928行起搜 `handleToDetail: function`、`window.open('post_detail.html?postid=' + item.postId`；第7349行卡片 renderer 搜 `_vm.handleToDetail(item.positionSource`；第8767行起搜 `getJobDetailsByPidAndId`、`getJobDetailsByPostId`。 |
| **TX-DETAIL** | [当前校园详情 JS](https://cdn.multilingualres.hr.tencent.com/joinqq/static2/js/p_zh-cn_post_detail.build.js)；`contracts/tencent-campus-detail.{js,json}`。provenance 是当前匿名官方详情 Document 实际加载公有 JS；HTTP200、790388 bytes。第5835行起搜 `getQueryString('postid')`；第5876行起搜 `getJobDetailsByPostId`、`res.data.data.projectId == 12`；第5900行附近搜 `projectInternDirections[0].subProjectInterns[0]`；第5924行起 renderer 搜 `_vm.detaliData.desc`、`_vm.detaliData.request`、`_vm.detaliData.projectInternDirections`；方向 handler 搜 `handlePostDirectionClick`。既有 `observe-tencent-detail/network.json` 的 Document 是正 ID 详情观察，不当作五条负 ID 的实际浏览器点击。 |
| **TX-LIST-DATA** | `https://join.qq.com/api/v1/position/searchPosition` 的既有原生列表；`collections/tencent.json` 末页约第15240–15324行。搜 `"postId": "-2"` 至 `"-6"`，检查同一对象的 `position/positionFamily/projectId/positionSource`。 |
| **TX-RECEIPT** | §3.2 的原 `getJobDetailsByPostId?...&postId=-2` URL；`collections/receipt-tencent.json`，第103913行附近 `label:"detail-tencent-00901"` 至尾部，搜索 `"id": -2`、`"projectId": 12`、`"projectInternDirections"`。同响应另保 `collections/available-tencent.json`，约第223964行 `verification.stopped`。receipt 尾部 `issues` 记录本地 `Tencent: detail PostId identity`；没有 -3…-6 的详情成功回执。 |

## 5. 收尾状态

已完成上述只读定位与字段/renderer分支复核；没有运行命令、测试、官网请求、真实投递或生产链。本文只记录当前可证的公开导航和 `-2` 的后端原生身份形状。雷火公众校园实际列表/详情、腾讯其余四条负身份详情及父级后续实现/发布结果均未在本节验收；未知保持未知，不拖延其它已可用来源，也不冒新岗位交付。

## 6. 父级后续执行与本地可用交付

用户确认“对，先处理这些”：回第三批雷火/腾讯补缺，数据存储与加载暂挂；不登录、改ID、绕验证、拒绝后换客户端重试，不提交/push。以下结果晚于§1–5，是父级正常匿名Node/自有隔离Chrome的材料与程序检查，不把离线代理研究冒作真实采集。

### 6.1 雷火：从公司公开导航闭合两个热招入口

公司官网的真实校园href进入`https://leihuo.163.com/campus/#/`，当前菜单为27届应届`#/full`及日常实习`#/dailyIntern`，不继续管理系统登录。原页面实际加载的[校园主JS](https://leihuo.res.netease.com/pc/zt/20210128200730/js/index_efdc55c4.js)、[应届chunk](https://leihuo.res.netease.com/pc/zt/20210128200730/js/leihuoFull_19b212b1.js)、[日常chunk](https://leihuo.res.netease.com/pc/zt/20210128200730/js/dailyIntern_34342d05.js)分别保存provenance；正常页面与普通Node均HTTP200，未登录或复制会话。

| 公开入口 | 实际正常GET空筛选协议 | 已取得 |
|---|---|---:|
| 27届应届 | `https://xiaozhao.leihuo.netease.com/api/apply/job/list/show?job_name=&page_size=10&page_number=1&project_id=77`；`status:200/msg:success`，`last_page/pages_count/count_number/apply_job_list` | 7页／63 |
| 日常实习 | `https://xiaozhao.leihuo.netease.com/api/new/v3/normal_intern/job/list?currentPage=1&pageSize=12&parentProduct=P4&workType=1`；`code:200/msg:success`，`list/pages/total` | 10页／117 |

17页180条Native ID唯一，无重复/跨接口ID碰撞或total漂移；15次正式续页＋两份已取得首响应复用，不重复请求首屏或追加双轮稳定。资料完成`2026-10-08T12:34:25.940Z`。两接口虽ID域独立，当前只有安全原生字符串ehr_job_id/安全整数id转字符串，URL也独立绑定；不拿同值跨域合正文、不造复合ID，未来碰撞记录未应用并保首次。官网应届job_detail_url用原值，日常href按实际renderer的`//hr.163.com/job-detail.html?id=<id>&lang=zh`解析。

**正文类型纠正：**父级起初只截到`_s`而误称应届TEXT；完整当前renderer实际是`domProps.innerHTML`，应届`job_description/job_requirement`与日常`description/requirement`均按HTML独立转换，保全部所得文字，不猜分栏。部门中的雷火/伏羲机器人都保留，不推法律雇主；性质仅按全职/实习字面标签，日期及人才计划未知。`leihuo_portal`新增独立profile，原网易模块只移交该adapter，不借同ATS资格；query与dailyApi进入scope，删adapter/改ATS/公司/URI仍不能降级。仅当前两个热招入口可用，研究及其它独立实习入口待核，不授全集或ready。

### 6.2 腾讯：项目实习真实分支与Workday分开

正常当前浏览器`https://join.qq.com/post_detail.html?postid=-2`证明原URL/请求无需参数补造且进入官方项目12分支。原`-2`成功响应复用，`-3…-6`另经四次普通Node原ID请求取得HTTP200/status0。绑定同时要求已列出的五个原负字符串、列表id/position、project12、职类与响应id/tid/project12/recruitType2/原标题相合；普通PostId绑定仍严格，不能无条件允许null。保父层职责/要求、全部已得方向标题与部门TEXT，不复制子方向成岗位或改原身份；程序检查这五条子方向其它JD字段均空，不靠模型逐岗语义判断。历史PostId-only guard及其停止事件不改签，新v2补充证据嵌入原v1列表/900详情与旧guard收据。

Workday从官网原positionUrl正常导航；最初自动locale主文档重定向被观察器挡住，是本地导航保护，不冒登录/拒绝。沿已观察的正常`zh-CN`路由取得匿名详情HTTP200，正式普通Node同协议也200：

`GET https://tencent.wd1.myworkdayjobs.com/wday/cxs/tencent/Tencent_Careers/job/SKorea-Seoul/Tencent-Cloud---Technical-Account-Manager--Korea-_R108129`

没有伪UA、会话复制或签名。`tencent_workday`绑定原官方externalUrl、完整jobPostingId slug、jobReqId、GUID、Tencent tenant/site及`userAuthenticated:false`。实际加载的[2026.40.17 renderer](https://www.myworkdaycdn.com/wday/asset/candidate-experience-jobs/2026.40.17/cx-jobs.min.js)闭合`61267 → 19629.VY → 99219.LE → sanitized innerHTML`，jobDescription为单HTML全文，不猜独立职责/要求。第一份正文实际取得钟`2026-10-08T11:39:15.916Z`；校园及社会原列表均明确链接同一URL且PostId相同，各自独立Native绑定，社会不新增请求、不拿复用或发布时刻刷新资料钟。

下一个正常Node请求`.../job/Singapore-CapitaSky/Associate-Backend-Engineer_R108032`收到**HTTP403**，是新真实拒绝收据；立即停该Workday门户，不再用社会key或浏览器请求，不推根因是Cookie/限频/UA，也不改签先前成功或虚构官网无JD。腾讯校园本轮四次新成功内文＋一次403，发布六个补充岗位（五模板＋一Workday），最新可用材料钟`2026-10-08T12:22:06.608Z`沿末次成功响应，拒绝不冒新成功钟。校园95空正文→89仍未取得；社会另绑定一份先得全文，305外部额外全文仍未知、列表职责和真实官网链接保留。`complete:false/jdComplete:false`保持，不称完整或实际可投。

### 6.3 唯一链、显示修复与验证范围

三源材料经`runUpdate → runCrawl → snapshot → publish → canonical/catalog/parts`唯一链本地应用，重演0官网请求；发布`2026-10-08T12:43:55.402Z`不是采集钟。**49,622→49,802岗，64→65有数据来源（37 ready＋28 available）**；第三批12源现都有可用版本，累计新增8,891，但范围/额外正文工作未全部完成。39公司、66登记来源、50单位不变，147活动片。

程序全量检查保护49,622旧岗位、63非目标source、阿里归属及188非目标out SHA/纳秒mtime；只七条旧记录补JD字段，其它事实及已有非空栏不变。180新岗17字段、Native投影、安全URI/身份、全部147片payload SHA/count/公司/来源/事实等于canonical。正式新事件最小START：腾讯200ms、雷火201ms，正文重叠0；先前第三批19次199ms仍保旧收据，不倒签。

HTTP验收发现新组合形状的显示缺口：已有独立列表职责与新全文不同，页面只显示description会隐藏原列表文字。`assets/app.js`仅改JD展示：优先全文一次，未被其字面包含的独立职责/要求也完整显示；两栏同文不互相去重，评分/词频/查询/加载均未改。既有全文包含两栏时仍不重复展示。实测旧逻辑红、修后绿；一个旧test偶然依赖雷火零岗目录提示也改成明确空数据fixture，不把真实有数据单位标空。

最终530项离线检查：522 pass／0 fail／8旧可选回放skip；语法/diff通过。本地HTTP七代表（雷火应届/实习、两模板、校园/社会同Workday、仍空的校园Workday）全已得字段/原标题/安全官网链接/未知提示及dirty保旧通过，50单位首屏仍不预取JD，runtime/console/外部请求错误0，自有Chrome/profile/server清理。首显示失败及checker数组引用误判字段差异材料保留；checker修为deep equal后全量绿。无file全量、线上、全站性能或模型逐岗语义签收。

证据在统一work下`followup-20261008T112757164Z/`：before-data/before/out备份、leihuo-captured、三源available/receipt、publication/check-followup/page-smoke-v2、测试/失败日志。当前canonical SHA256 `b24526d904498fc7bd32c0ed7cdc837700ac20852623158cb3d8f26bf3af3c15`，catalog `72a65c4598bf10bb25034944af48f414f19ddef98d1f88af939277c6cf6ba58c`。raw/日志/凭据不入Git。没有commit/push/线上验收；HEAD仍f29e579。数据存储/加载、首页后台预载只是暂挂方向，没有新架构决策或实现；canonical现113,625,137字节，不删JD凑100MiB。
