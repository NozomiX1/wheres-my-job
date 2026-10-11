#!/bin/sh
# 从 GitHub Release 取最新数据并上线：meta 没变就什么都不做；下载后校验 sha256 与内容，通过才替换，替换后重启服务。适合放进 crontab（每 10 分钟）。
# 环境变量：ANDE_DATA_REPO（默认 NozomiX1/wheres-my-job）、ANDE_DATA_TAG（默认 data）、ANDE_BASE_URL（覆盖下载地址前缀，测试用）、
#          ANDE_ROOT（部署目录，默认本脚本的上一级）、ANDE_RESTART_CMD（替换后执行的重启命令；不设则在有 ande-server 单元时 systemctl 重启，否则只提示）。
HERE=$(cd "$(dirname "$0")" && pwd)
ROOT=${ANDE_ROOT:-$HERE/..}
REPO=${ANDE_DATA_REPO:-NozomiX1/wheres-my-job}
TAG=${ANDE_DATA_TAG:-data}
BASE=${ANDE_BASE_URL:-https://github.com/$REPO/releases/download/$TAG}
cd "$ROOT" || exit 1

# 同一时刻只跑一个（不依赖 flock，macOS 也能跑）；锁目录超过 1 小时视为遗留。
LOCK=${TMPDIR:-/tmp}/ande-pull-$(id -u).lock
[ -d "$LOCK" ] && [ -n "$(find "$LOCK" -maxdepth 0 -mmin +60 2>/dev/null)" ] && rmdir "$LOCK" 2>/dev/null
mkdir "$LOCK" 2>/dev/null || { echo "另一次拉取正在进行，跳过"; exit 0; }
WORK=$(mktemp -d "$ROOT/.pull.XXXXXX") # 与 data/ 同一文件系统，替换时是改名而不是复制
trap 'rm -rf "$WORK"; rmdir "$LOCK" 2>/dev/null' EXIT

curl -fsSL --max-time 30 -o "$WORK/meta.json" "$BASE/data-meta.json" || { echo "取不到 data-meta.json（还没发布，或网络问题），跳过"; exit 0; }
field() { node -e "console.log(JSON.parse(require('fs').readFileSync('$WORK/meta.json','utf8'))['$1'] ?? '')"; }
SHA=$(field sha256); JOBS=$(field jobs)
[ -n "$SHA" ] || { echo "meta 里没有 sha256，放弃"; exit 1; }
[ "$SHA" = "$(cat .release-sha 2>/dev/null)" ] && exit 0 # 没有新数据

echo "发现新数据：$JOBS 个岗位（sha256 ${SHA%"${SHA#????????}"}…），下载中"
curl -fsSL --max-time 900 -o "$WORK/data.tar.gz" "$BASE/data.tar.gz" || { echo "下载失败，稍后重试"; exit 1; }
GOT=$(node -e "console.log(require('crypto').createHash('sha256').update(require('fs').readFileSync('$WORK/data.tar.gz')).digest('hex'))")
[ "$GOT" = "$SHA" ] || { echo "sha256 不符（下载不完整或被改动），放弃"; exit 1; }
mkdir "$WORK/x" && tar -xzf "$WORK/data.tar.gz" -C "$WORK/x" || { echo "解压失败"; exit 1; }
node --max-old-space-size=450 "$HERE/validate-data.js" "$WORK/x/data" "$ROOT/data" || exit 1

# 保留最近两份旧数据（data.prev.1 最新），再换上新数据。
rm -rf data.prev.2; [ -d data.prev.1 ] && mv data.prev.1 data.prev.2; [ -d data ] && mv data data.prev.1
mv "$WORK/x/data" data && echo "$SHA" > .release-sha
echo "已上线新数据：$JOBS 个岗位"

if [ -n "$ANDE_RESTART_CMD" ]; then sh -c "$ANDE_RESTART_CMD"
elif command -v systemctl >/dev/null 2>&1 && systemctl cat ande-server.service >/dev/null 2>&1; then systemctl restart ande-server.service || sudo -n systemctl restart ande-server.service
else echo "请重启服务以加载新数据（或设置 ANDE_RESTART_CMD）"; fi
