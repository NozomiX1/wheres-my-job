#!/bin/sh
# 在服务器上以 root 运行：建专用用户、安装并启用 systemd 单元。可重复运行。
set -e
cd "$(dirname "$0")/.."
id ande >/dev/null 2>&1 || useradd --system --create-home --shell /usr/sbin/nologin ande
chmod +x deploy/crawl.sh
# 代码归 root、只读；ande 只能写数据、采集工作目录和备份。
find /opt/ande \( -path /opt/ande/data -o -path /opt/ande/backups -o -path /opt/ande/crawler/out \) -prune -o -exec chown root:root {} +
mkdir -p data crawler/out backups
chown -R ande:ande data crawler/out backups
cp deploy/*.service deploy/*.timer /etc/systemd/system/
systemctl daemon-reload
systemctl enable --now ande-server.service ande-crawl.timer ande-crawl-full.timer
systemctl --no-pager list-timers 'ande-*'
