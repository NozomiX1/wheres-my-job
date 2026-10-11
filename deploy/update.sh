#!/bin/sh
# 在部署目录里更新代码：git pull --ff-only；只有这次更新碰到服务启动时读入的文件（server/、assets/rank.js、assets/example-words.js、crawler/）才重启，
# 只改了前端页面（index.html、assets/ 的其它文件，服务每次请求都从磁盘读）、文档或测试就不重启。数据更新不在这里，由 pull.sh 负责。
# 环境变量：ANDE_ROOT（部署目录，默认本脚本的上一级）、ANDE_RESTART_CMD（需要重启时执行的命令；不设则只提示）。
# 例（普通用户 VPS）：ssh vps 'ANDE_RESTART_CMD=$HOME/ande-restart.sh ~/ande/deploy/update.sh'
HERE=$(cd "$(dirname "$0")" && pwd)
cd "${ANDE_ROOT:-$HERE/..}" || exit 1
OLD=$(git rev-parse HEAD) || exit 1
git pull -q --ff-only || { echo "git pull --ff-only 失败（本地有改动或分叉），没有更新" >&2; exit 1; }
NEW=$(git rev-parse HEAD)
[ "$OLD" = "$NEW" ] && { echo "已是最新（$(git rev-parse --short HEAD)）"; exit 0; }
echo "已更新 $(git rev-parse --short "$OLD") → $(git rev-parse --short "$NEW")"
if git diff --name-only "$OLD" "$NEW" | grep -qE '^(server/|assets/rank\.js$|assets/example-words\.js$|crawler/)'; then
  if [ -n "$ANDE_RESTART_CMD" ]; then echo "服务端文件有变化，重启服务"; sh -c "$ANDE_RESTART_CMD"
  else echo "服务端文件有变化，需要重启服务才生效（可设置 ANDE_RESTART_CMD）"; fi
else echo "只改了前端页面、文档或测试，不需要重启"; fi
