# 安得

安得岗位千万件，<br>
大庇天下寒士俱欢颜。

免费、源码公开的公司官网岗位收集器，面向所有职业。按自己的关键词排序，查看招聘方提供的完整JD，再前往官网申请；不替用户判断岗位质量或录取概率。

[GitHub](https://github.com/NozomiX1/wheres-my-job)（在线服务内测中，GitHub Pages 静态版已下线；可按下文自行部署）

## 使用

1. 选择招聘单位和招聘类型，或保持全部。
2. 逐个添加优先词/降权词，点击「查找岗位」；两组都空也可浏览。
3. 连续浏览结果、查看JD，通过官网链接申请。

关键词只排序，零分和负分岗位仍保留。条件仅保存在当前浏览器，编辑或恢复设置不会自动查询；没有默认职业词或账号同步。

**覆盖尚未完善：**只代表各登记官网入口的公开列表，不是公司全球招聘全集；官网没有提供的字段、空正文如实留空。每个招聘单位旁显示岗位数和数据更新日期（多个来源取最早的一天），页脚显示全站最近更新日期。阶段结果与待办见 [PROCESS.md](PROCESS.md)。

数据为 `data/catalog.js` ＋ `data/parts/`（单文件≤1MB），采集成功即整源替换、不保存历史。**数据不在仓库里**（已被 Git 忽略）：自行部署时先用下文的 `node crawler/update.js <来源key>` 采集生成，再启动服务；线上服务器按「服务器部署」一节每天自动增量采集。测试用的抽样小数据在 `tests/fixtures/data/`。

## 自行部署（快速开始）

仓库只有代码，**不含岗位数据**；自己部署分三步：

1. 安装 **Node.js 22+**。涉及飞书系、快手、百川的来源还需要 Chrome（用 `CHROME_PATH` 指定；Linux 下以 root 或在 Ubuntu 24.04 普通用户运行时需 `--no-sandbox`，可参考 `deploy/install.sh` 里的包装脚本）。
2. 采集你要的来源（来源 key 见 `crawler/sites.json`，**只填明确要采的 key**），首次是全量，之后同样命令即增量：`node crawler/update.js vivo baidu stepfun`。
3. 启动服务并打开 `http://localhost:8000`：`PORT=8000 node server/index.js`。

要长期运行并每天自动更新，用下文「服务器部署」里的 systemd 配置。

## 本地查看与检查

页面由搜索服务提供：先有数据（`data/`），再运行 `PORT=8000 node server/index.js`，浏览器打开 `http://localhost:8000`。页面无框架、无构建/运行依赖；服务、采集工具与离线检查需 **Node.js 22+**。

```sh
node --test tests/*.test.cjs
git diff --check
```

## 更新数据

仅更新已明确授权的来源keys，例如：

```sh
node crawler/update.js stepfun stepfun_social
```

它沿唯一采集/验证/发布链更新 `data/catalog.js` 与 `data/parts/`，不重建HTML。无参数update会遍历全部登记来源，勿作为日常检查；部分失败返回非零；失败的来源保留上次数据，采集成功的来源整源替换。

适配器资格、Chrome环境、快照与分步命令见 [crawler/README.md](crawler/README.md)。

## 服务器部署

`deploy/` 是在 Ubuntu 服务器上常驻运行的配置（systemd）：`ande-server.service` 常驻搜索服务；`ande-crawl.timer` 每天 06:30 增量采集，`ande-crawl-full.timer` 每周日 03:00 全量重取详情，采集结束后若数据有更新就自动重启服务加载（`deploy/reload.sh`；失败的来源保留上次数据，整轮没发布则不重启）；采集前会备份 `data/`（保留 7 份）。首次在服务器上运行 `deploy/install.sh`（建 `ande` 用户、安装并启用单元），之后在本机用 `deploy/deploy.sh [ssh别名]` 同步代码并重启服务。采集并发默认 4，服务器上设为 2（`ANDE_CONCURRENCY`）以适应 1.6G 内存。查看状态：`/api/health`（数据更新时间、最近一次采集结果）、`journalctl -u ande-server`、`crawler/out/logs/`。

## 文档与代码入口

| 文件 | 职责 |
|---|---|
| [SPEC.md](SPEC.md) | 现行产品行为、数据政策、整体架构与验收标准 |
| [DECISIONS.md](DECISIONS.md) | 重要选择的背景与取舍 |
| [PROCESS.md](PROCESS.md) | 阶段结果、阻塞与核验证据入口 |
| [AGENTS.md](AGENTS.md) | 编码agent的阅读、维护与执行指引 |
| [CONTEXT.md](CONTEXT.md) | 领域用语 |
| [crawler/README.md](crawler/README.md) | 采集工具操作与适配器契约 |

`index.html` / `assets/` 是原生界面与浏览器排序，`data/catalog.js`＋`data/parts/` 是公开数据，`crawler/sites.json` 是唯一来源登记，`crawler/` 实现安全采集/发布，`tests/` 提供无依赖离线检查。`docs/license-notes.md` 是许可选择前的历史参考；来源核验与研究记录已清理，需要时查 Git 历史，不替代当前SPEC。

## 使用许可（禁止商用）

本项目免费分享招聘信息。源码仅允许用于个人学习、求职及其他非商业用途；可在此范围内使用、修改和免费分享。

**禁止商用及收费变现**，包括出售本项目或其修改版本、提供收费服务、会员订阅等。更名或修改代码不解除上述限制。

复制、修改或分享时，请保留原作者署名、项目来源及本说明。

本说明仅适用于本项目有权许可的代码；第三方代码及官网招聘内容仍遵循各自的权利和许可。本项目不以 OSI 开源许可作承诺。
