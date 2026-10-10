#!/bin/sh
# 采集一轮：先给当前数据做备份（保留最近 7 份），再增量更新全部来源；加 --full 则强制重取所有详情。
# 由 systemd 定时器调用（deploy/ande-crawl*.timer），也可手动运行：sudo -u ande /opt/ande/deploy/crawl.sh [--full]
cd "$(dirname "$0")/.." || exit 1
exec 9>/tmp/ande-crawl.lock
flock -n 9 || { echo "另一轮采集正在运行，本次跳过"; exit 1; }
mkdir -p backups
tar -czf "backups/data-$(date +%F-%H%M).tar.gz" data
ls -1t backups/data-*.tar.gz | tail -n +8 | xargs -r rm -f
exec node crawler/update.js "$@"
