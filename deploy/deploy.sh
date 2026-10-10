#!/bin/sh
# 在本机运行：把代码同步到服务器（不动 data/ 与采集工作目录）并重启服务。用法：deploy/deploy.sh [ssh别名，默认 myserver]
set -e
HOST="${1:-myserver}"
cd "$(dirname "$0")/.."
rsync -az --exclude .git --exclude data --exclude crawler/out --exclude backups --exclude node_modules --exclude .github ./ "$HOST":/opt/ande/
ssh "$HOST" 'sh /opt/ande/deploy/install.sh >/dev/null && systemctl restart ande-server.service && sleep 2 && systemctl is-active ande-server.service'
