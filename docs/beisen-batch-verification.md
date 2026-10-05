# 北森系统批次核验（v0.26）

**当前：三来源核验/最小共享接入及正常生产候选1,146完成，195离线通过，独立35/35及范围11/11闭合；隔离stage29,395冻结HTTP/file705/0及父独立材料/截图/清理已通过，正常唯一publisher已仅三keys正式本地发布29,395，实际仓库根HTTP/file另68/0小烟测及父三图/当前SHA-mtime/实际清理通过，未提交/部署。** 本批按招聘系统共享实现、按来源key分别证明/验收，不按公司各开一套。唯一链仍是 `update → crawl → 完整snapshot → publish → data/jobs.js → 浏览器匹配`。

## 1. 隔离基线与执行范围

公开28,619；39公司/66key。19个已成功来源20,892的全部规范化事实、metadata、真实成功时间及57份out受保护，不重新采集或发布。四前端/评分与非目标注册对象/key顺序不动，未全站更新/提交/部署。

| 既有key | 历史条数 | 本轮边界 |
|---|---:|---|
| iflytek | 107 | 核官网北森校园广入口、Category渠道、全部批次/职业 |
| iflytek_social | 134 | 核官网北森社会广入口、全部职业及实习 |
| vivo | 129 | 先证校园正常公开协议；确认后同批共享，不凭注释放行 |

初始必核讯飞2源历史241；基线也隔离条件目标vivo校园129，总临时目标370/其他28,249。vivo社招 `vivo_social` 历史5目前独立协议，非本批采集对象。静态限制 `ClassificationOne:[2]` / 蓝极星排除 / 全职常量是历史风险，不当官网实际全量或事实，不用数量差算漏岗率。

先核第一方导航/租户、广入口/范围关系、原生稳定总数/完整分页、所有raw字段及完整JD、真实属性/日期/链接；同协议不共享资格。已有全文不机械详情，合法官网空正文如实保留，未知响应/身份/非法字段仍拒整源。正常HTTP或业务拒绝即停，不登录/申请/绕过验证。

## 2. 当前离线边界检查

保存原166项离线全部通过。新增北森业务状态/ID检查3项：原代码仅拒 `Success:false`，无法拒未知非布尔值、显式非法Code或列表重复/冲突身份，合成红测试2 FAIL/1 PASS保留；最小共享守卫后169项全绿。这些为离线合成风险，不是官网实际失败或来源完整资格。第一方初核同时纠正父最初的ID假设：原生`Id` UUID与`JobAdId`数字是不同字段，可合法共存，不互判冲突；正常详情路由使用UUID。保留初版test及红日志，修为同身份alias冲突断言和两种原字段合法共存对照，再完整回归，未以原假设拒绝生产岗位。新门户仍须独立一手契约、固定profile、完整候选与同版本页面验收后才能发布。

## 3. 三来源核验与最小共享接入

详见[讯飞第一方](beisen-iflytek-verification.md)和[vivo校园第一方](beisen-vivo-verification.md)。讯飞直接多选2–7全扫166、社会1全扫727，与官网无Category893完整原列表逐字段/身份对照，无未分类/未知类别；只取校园2会漏专项46。vivo广253包含秋招138、蓝极星27、日常70/暑期18；原生/扩展各双全扫同ID且所有raw稳定，不从旧仅秋招继承资格。研究候选不直接晋升。

固定3 `beisen-portal-v1`，登记只修改既有三key（vivo custom→beisen，39/66和63非目标/順序不动）。共用原生Code200/TipTypeSuccess/Count/Data/HTTP200、精确页长、UUID和独立数字业务号各唯一、两轮全部raw Map稳定、150ms间隔/15s请求/15分钟子进程（非SLA），不伪装浏览器UA、不为已有全文机械详情。讯飞联合再完整双扫无Category权威列表，核已知类别/所有raw稳定及分区精确，不以类别count并集冒完整，新增/未分类或正文漂移拒源；authority原文随raw scopeWitness保存，不推广限定partial。

正文两租户实际为D4解五实体后React文本，禁止HTML解析；保字面角括号/英文/换行、真实两栏，即使社会7条两栏相同亦分别保留，不增加description副本或改权重。职能字段按租户分别证明，不混ClassOne/Two；Kind独立、空未知。讯飞星火X渠道未知/计划true，飞星/飞凡校园计划true，大使性质/计划unknown；vivo Category3实习频道88不强推校园或实习性质（56实填全职），蓝极星true27其它null。原Status1只字符串展示，不判可投或下架。官方详情每岗Category路由+Id UUID，数字JobAdId不是链接参数；不让canonical/alias注入事实。日期只用已证PostDate，0001/0未知，不回退ChangeDate/采集钟。

186离线（含原生UI）通过；初native own undefined接受风险3红及夹具把蓝极星算法类猜研发而官方设计类1红（16 PASS/4 FAIL）保日志/initial test，只补文本类型守卫和真实类别预期后全绿。父统一两租户D4据原helper定义，不把纯文本当HTML；调度固定key/origin守卫移到所有ats分支前，已知origin旧string/API大小写也不能退回generic。首轮独立复核1P1/4P2保原报告/反例：default443等价origin退generic、准确profile空snapshot缺native证据、UUID大小写/业务号重复、稳定缺metadata与新JobVideoJd、异常PostDate被generic猜成published。最小修复已落：标准URL hostname锁已知门户但仍精确profile授资格；双轮原生请求body/HTTP/完整封套Data保在snapshot.verification（讯飞四轮含权威全原文）并在crawl/publisher两边重验Count/页长/状态/全raw/分区，缺证0不放行；双身份查重在projection前复验；所有fact字段own/null/types+JobVideoJd未知非空拒源；原生timestamp完整格式/时钟/合法日历+UTC8 PostDateInt日历一致，0001/0未知，绝不让generic date-prefix/epoch分支赋published。新增7持久回归后195/195通过，独立第二轮已领取：R1–R5全部闭合，35/35精确反例及11/11范围反例通过；代理当时完整主套188/188，父后补7持久项实跑195/195，不冒代理已跑195。正常非空/真实原生契约0均完成temp候选→snapshot→唯一publisher证据闭环；字段、Count、scope或完整raw/权威分区不相符均保旧。没有官网、真实out或公开写入，62保护hash/mtime不变及自有fixture已清。代码资格闭合仅允许继续正常重采，仍需同版本冻结页面验收后才正式发布。初schema增verification引出的187PASS/1FAIL预期和新test把atomicWrite误传Object的193PASS/2FAIL工具错误均保日志，只适配schema并新增原生零证据断言/修真实writer API，不删除产品断言。

父已核两研究manifest全部材料hash/大小及原文档（1846+466临时文件、两原文档），20个研究Chrome实际profile/ps/端口清理，无自有常驻资源；已有系统1082 proxy非本任务，不修改或关闭。研究有真实页面和后台成功外连，绝不写外连0。父亲看讯飞星火X长JD、社会非技术代表图及vivo蓝极星Agent JD三张原官网截图。原讯飞研究稿关于消重/实体处理的设计建议已纠正，原文档hash对应稿保于 `/tmp/ande-beisen-research-originals/`，原API/浏览器材料不改。

## 4. 正常候选与同版本冻结

明确三keys正常串行 `runCrawl`，未晋升研究材料、未无参数更新：2026-10-05T13:58:12.945Z–13:58:39.036Z，26.091秒只是实录非SLA。成功166/727/253共1,146，全部原JD可读/日期published/status原码1；45实习、969全职、132未知性质，72人才true/1074未知，渠道300校园/727社会/119未知。原Duty+Require共616,540 UTF-16字符，正文纯文本D4与两独立栏未消重。9份新raw/snapshot/status；iflytek4完整扫描（893权威前后+166本源前后）、其它各2，native请求/HTTP/封套Data完整保verification，snapshot经publisher相同资格复验。

仅唯一publisher写隔离stage `/var/folders/4q/mhw4nbld15b61smdckdz57wh0000gn/T/ande-beisen-batch-stage-wiyPjm`，总29,395，1,146替换370；其它28,249事实/metadata/目录、19旧成功20,892及57out、63非目标登记/顺序精确不变。两公司查询包含vivo_social独立历史5（1,151），不将其丢弃或混进新N；正式公开仍28,619及四前端/评分/hash/mtime保持原。冻结HTTP/file705/0验收及父核已通过，未申请/提交/部署/后续系统。

## 5. 冻结705/0与父独立核验

Chrome154 HTTP/file各显式两公司自然50→100→…→1,151（本批1,146+保护vivo社会历史5），逐新ID真实connected row/open modal核全部职责/要求原文/字段/链接，原生D4普通TEXT独立审计2292字段，每协议39独立查询及3/1/.35/词频>8/负零分/同分日期/dirty边界，四viewport1440/1280/390/320无横溢；非实机。全部234截图SHA/尺寸保存，代理親看22，父另親看蓝极星设计类390、官网两栏仅1的320、星火X完整尾1280三图；不是每条岗位人工视觉。

**取得完整原字段不保证招聘方填写详尽**：真实售前咨询经理 `iflytek_social:61a16756-1535-48c8-aa46-98e1633b767a` 两栏仅字面`1`，均保留、官网可读标志true，不造blank/补正文/删岗；该词各独立栏1+.35=1.35，频次2只是显示。原616,540字符解五实体/CRLF/外trim后615,652字符。接口status1仅显示码，实际申请/公司全集仍未验证。

页面runtime/console/失败网络/外网0；Chrome后台17URL、proxy27阻断、OS UDP14(-109)分别披露，成功外连0。实际31socket发10,283/收47,816,470字节全为127.0.0.1 HTTP/proxy，不泛称网络0。父核stage5/root5/impl5/newout9/protected57当前SHA/纳秒mtime、全repo100文件及manifest、两协议native/liveDOM材料SHA/1,151唯一IDs、全部234 PNG；当前profile/ps及HTTP55698/proxy55699/CDP55700实际均ECONNREFUSED，无残留。

保首次103PASS/1FAIL（工具漏选实际数字1）、下一619/0但视觉未终定、最终705/0三个完整run材料。后者追加tail settlement和官网按钮截图位置强断言后完整重跑，不是产品缺陷或删断言。报告后置字段名拼写工具错误及父`steps`误读（实际`batches`）均保原材料，只修读取字段后完整重跑材料/当前版本/cleanup；最终705浏览器断言未削弱。

仅冻结stage结论，正式本地发布与实际根小烟测仍需后续独立步骤，不能把冻结/本地验收叫上线。

## 6. 正常唯一publisher本地发布

```sh
node crawler/publish.js iflytek iflytek_social vivo
```

输出按原注册顺序 `Published sources: iflytek, vivo, iflytek_social`。1,146替换370，公开29,395，其它28,249与来源metadata/目录精确不变；19旧成功20,892、57out、63非目标登记/顺序和四前端/评分hash-mtime保持。全局legacy7,357、本批目标legacy0，vivo社会历史5仍保护。公开五文件与最终冻结stage同字节，data SHA256 `12d1cacb9d861149a7849a4c677ed388cd2a0e7b50b71440c251a09f33443481`。成功时间保持真实13:58:22.420Z/27.372Z/39.036Z，不拿14:53发布/烟测钟回填。

实际根HTTP/file另68/0小烟测通过，不能把冻结705/0当实际发布路径再次全量验收；未全站更新/提交/部署，未自动开阿里或其它系统。

## 7. 实际仓库根发布后小烟测与父终核

实际root/servedRoot均 `/Users/nozomi/lab/wheres-my-job`，HTTP `http://127.0.0.1:61049` 和 `file:///Users/nozomi/lab/wheres-my-job/index.html`：68PASS/0FAIL。公开29,395/本批1,146/目标legacy0；显式两公司1,151含保护vivo社会历史5，直接对原backup核其他28,249及旧20,892/metadata/目录不变。初始无预填/无自动查询，两公司空词自然50→100保留原50、得分—；**每协议仅3真实JD**（星火X7长正文尾+未知渠道、vivo GNSS实习标题但Kind全职+未知渠道、讯飞社会两栏仅字面1），核全部两栏/事实/官网UUID href不点击，非再次全1,146验收。

实际烟测用TITLE词显式查询；literal1只编辑草稿/保存不提交，保持已查询TITLE分3.00及旧JD，dirty不污染。这里不把该截图叫字面1的1.35/频次2测试；冻结705已独立验证后者但不重复计作烟测。

页面runtime/console/失败网络/外网0，后台9URL、proxy19本地拒、OS UDP6失败、成功外连0；实际23socket发8,301/收47,816,094字节全部loopback，不能泛记网络0。root5/impl5/target9/protected57共76产品文件SHA+纳秒mtime前后及当前精确不变；正常docs收尾排除。代理亲看3PNG及后置5守卫，父另已亲看全部3原图并实际核SHA/尺寸/receipt材料当前SHA-mtime/实际root及HTTP61049/proxy61050/CDP61051均ECONNREFUSED、privateprofile不存在/ps无残留。

原两工具失败保报告/脚本/图片：第一版漏公司caption合法“覆盖待完善”后缀，第二版局部`type`变量遮蔽输入helper，均只修工具并两协议完整重跑，保dirty/native/count/警示/URL与三指定截图守卫，不削产品断言或动产品。最终68/0和父终核材料独立于冻结705保留。

## 8. 临时材料

- `/tmp/ande-beisen-batch-baseline.{cjs,json}`，备份目录见JSON `backup`；root五文件/实现/登记/保护out的hash、mtime及原scope保存。
- `/tmp/ande-beisen-batch-offline-baseline.log`（166）；`/tmp/ande-beisen-core-red.log`（合成2 FAIL/1 PASS）、`core-green.log`（169）。
- 讯飞与vivo第一方研究材料分别使用 `/tmp/ande-beisen-iflytek-*` / `ande-beisen-vivo-*`；最终profile/manifest/cleanup已领取并父核1846+466材料及20实际profile/ps/ports。`/tmp/ande-beisen-research-parent-check.json`、原研究稿备份 `/tmp/ande-beisen-research-originals/`。
- 代码首/次复核 `/tmp/ande-beisen-batch-review.{md,json}`、`review-run2.{md,json,cjs}`（35/35）及 `review-scope.{cjs,json}`（11/11）；原风险/反例/日志全留。
- `/tmp/ande-beisen-evidence-fixed-green.log`及 `/tmp/ande-beisen-batch-postpublish-tests.log`（195/195）；初undefined/类别预期/schema/atomicWriter夹具失败日志保留。
- `/tmp/ande-beisen-batch-crawl-final.log`、`crawl-iflytek-iflytek_social-vivo.json`、`stage.{cjs,log}`、`stage-manifest.json`、`candidate-check.json`、`publish.log`；9真实raw/snapshot/status仅本机被Git忽略。
- `/tmp/ande-beisen-page-report.{md,json}`（705/0）、`page-representative-screenshots.{md,json}`、`page-parent-check.{cjs,json,log}`、`page-parent-initial-error.md`；三个run全日志/脚本/截图与最终234图/native/liveDOM/NetLog/cleanup保留。
- `/tmp/ande-beisen-live-smoke.report.{md,json}`（68/0）、`live-smoke.driver.cjs`、`live-smoke.final-receipt.json`、`live-smoke-parent-check.{cjs,json,log}`及三run/后置5守卫/3图；父实际親看与当前76文件/receipt/真实端口复核记录。
- `/tmp/ande-beisen-batch-final-check.{cjs,json}`、`frozen-final-check.json`、`static-check.{cjs,json,log}`：正式公开29,395/目标1,146/其他28,249/legacy7,357及195离线、73语法/280本地Markdown路径/`git diff --check`，不冒在线链接/anchor/性能验收。

研究候选不直接晋升生产。临时材料不承诺长期持久化；本轮不实施Actions/Pages/定时/国内访问或全站性能。
