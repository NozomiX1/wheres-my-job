#!/bin/sh
# 在本机运行：把代码同步到“root＋systemd”布局的服务器（/opt/ande，见 install.sh；不动 data/ 与采集工作目录）并重启服务。用法：deploy/deploy.sh <ssh别名>
# 必须明确给出主机别名，没有默认值，免得误把这种布局推到别的机器（例如以普通用户跑在 ~/ande 的 VPS 用 update.sh 更新）。
set -e
HOST="${1:?用法：deploy/deploy.sh <ssh别名>（必须明确给出主机）}"
cd "$(dirname "$0")/.."
rsync -az --exclude .git --exclude data --exclude crawler/out --exclude backups --exclude node_modules --exclude .github ./ "$HOST":/opt/ande/
ssh "$HOST" 'sh /opt/ande/deploy/install.sh >/dev/null && systemctl restart ande-server.service && sleep 2 && systemctl is-active ande-server.service'
