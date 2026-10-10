#!/bin/sh
# 采集结束后由 systemd 以 root 调用：只有已发布数据（data/catalog.js）比服务启动时更新才重启服务。
# 一轮里什么都没发布（全部失败、被杀、被跳过）时不重启，避免白白中断。
DATA_FILE="${ANDE_DATA_FILE:-/opt/ande/data/catalog.js}"
PID=$(systemctl show -p MainPID --value ande-server.service)
if [ -z "$PID" ] || [ "$PID" = 0 ] || [ "$DATA_FILE" -nt "/proc/$PID" ]; then
  echo "数据已更新或服务未运行，重启 ande-server"
  systemctl restart ande-server.service
else
  echo "数据没有变化，不重启"
fi
