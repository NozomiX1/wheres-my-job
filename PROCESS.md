# 安得 · 过程记录

只记录当前状态、已知缺口和待办，不作为现行规则或授权。规则见 [SPEC.md](SPEC.md)，选择原因见 [DECISIONS.md](DECISIONS.md)，采集与部署细节见 [crawler/README.md](crawler/README.md) 和 [README.md](README.md)。逐步的过程、验证数字和踩过的坑写在提交信息里，需要时 `git log`；更早的批次记录见 `git log -- PROCESS.md`。数量与状态以线上数据和 Git 为准。

## 当前状态（2026-10-22）

- **数据**：线上 104 个来源、约 6.5 万岗位（`https://wheresjob.cn/api/health`）。数据（`data/`）不在仓库里，只在服务器上，测试用抽样小数据在 `tests/fixtures/data/`。来源范围与取舍见 D19、D24；宇树、拼多多明确不做，往届岗位不按届别下架（D24、D26）。
- **采集（D14）**：GitHub Actions 的 `crawl` 工作流（每天北京时间 06:30 增量、周日 03:00 全量、16:00 补采过时来源，也可手动指定来源 `gh workflow run crawl -f keys="…"`），以 Release 标签 `data` 为基线并把结果传回；失败处理见 [crawler/README.md](crawler/README.md)「失败处理流程」。定时触发已正常运行；GitHub 的定时会延迟（观察到一次晚约 2 小时）。
- **查询（D14）**：与他人共用的海外 VPS（洛杉矶），`https://wheresjob.cn` 经机器管理者的 Caddy 回落，服务只监听本机 8000，靠 crontab 保活（崩溃后最多 1 分钟恢复，不用 systemd）。`deploy/pull.sh` 每 10 分钟从 Release 拉新数据、校验后换上并重启。**更新代码**：`ssh vps 'ANDE_RESTART_CMD=$HOME/ande-restart.sh ~/ande/deploy/update.sh'`（`git pull --ff-only`，只在服务端文件变了才重启）。日志 `~/ande-server.log`、`~/ande-pull.log`，没有轮转。国内个人备案不允许招聘信息，故不备案。
- **本机兜底采集**：Actions 反复失败时用 `sh deploy/crawl-local.sh <来源key>...`（先 `ANDE_DRY_RUN=1` 干跑，`ANDE_YES=1` 免确认上传）。只在国内小来源 `kimi` 上真跑过；没试过需要 Chrome 的来源。
- **访问统计（D17）**：VPS 的 `~/ande-run.sh` 设了 `ANDE_ACCESS_LOG`；看统计 `ssh vps 'node ~/ande/deploy/access-stats.js'`。线上拿不到访客真实 IP，人数看「独立浏览器」。
- **阿里云旧机器**：已退款释放；最后的数据与日志备份在用户本机 `~/ande-aliyun-backup/`。
- **要记住的坑**：shell 脚本里 `$VAR` 后面紧跟全角字符会被 macOS 的 sh 当成变量名的一部分，要写成 `${VAR}`；飞书系页面首个列表请求在 CSRF 令牌就绪前会得 405，是页面自己的握手，不是拦截，适配器以页面随后的成功重发为准；Chrome 在 root 或 Ubuntu 24.04 普通用户下都要 `--no-sandbox`；Node 22 下入口模块与 `native-ui` 的循环引用要等模块加载完再运行；腾讯 Workday 上已下线的岗位匿名请求返回 `403 S22 permission denied`，是岗位不可见而不是拦截，适配器逐个跳过。

## 已知缺口

- VPS 与他人共用、可用内存约 0.9G：6.5 万岗服务约 300MB，岗位涨到约 10 万前需换独占机器，或把 JD 原文放磁盘、内存只留搜索用的小写文本。
- 搜索服务单线程，并发查询排队；目前只在单人使用下测过。
- 少数岗位官网自己没有 JD（商汤、智谱、腾讯各几个），页面按「官网暂无 JD」展示，不是漏采。
- 华为某岗位在官网撤掉全部意向后，旧的拆分记录会留到该岗位下架。
- Moka 来源在 GitHub 运行器上出现过一次集中 `ETIMEDOUT`（2026-10-21 晚，21 个来源失败，旧来源保留旧数据，新来源当时无数据）；下一轮增量全部恢复，原因未查明，再出现时再看是否换采集方式。
- 滴滴社招本地与线上数量差来自官网下架，不是漏采。

## 待办

1. **外部 fork 的批量来源**（暂缓）：北森通用路径恢复（约 1300 个）、Wecruit 适配器（约 170 个）、Moka 详情模式需先放宽发布层的 detailVerified 检查；先试点再分批，放量前先确认服务内存。
2. 简历/语义匹配只是可能的方向，暂不做（D26）。

**观察项**：Actions 的跨境链路偶发不稳（哔哩哔哩校招、小米、饿了么、小红书有超时／DNS 重试，靠补采救回）；旧门户（OPPO、网易等）按需放宽证据合同。
