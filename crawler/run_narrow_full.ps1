# 临时脚本：本次收窄口径全流程的阶段①（crawl → recall → narrow → split --full）
# 用完即删，不进 run_daily.ps1（那是宽口径，$NARROW 默认关）。
$ErrorActionPreference = 'Continue'
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $root

$siteKeys = @(
  'kimi','zhipu','deepseek','stepfun','hypergryph','iflytek',
  'bytedance','sensetime','minimax','lilith','papegames',
  'alibaba','tencent','tme','jd','huawei','oppo','xiaomi','ant',
  'meituan','kuaishou','mihoyo','netease_huyu','netease_leihuo',
  'baidu','baichuan','shlab'
)

$logDir = Join-Path $root 'log'
New-Item -ItemType Directory -Force -Path $logDir | Out-Null
$stamp = Get-Date -Format 'yyyy-MM-dd_HHmmss'
$log = Join-Path $logDir "narrow_full_$stamp.log"
Start-Transcript -Path $log | Out-Null
Write-Output "[$stamp] 收窄口径阶段①开始（crawl + recall + narrow + split --full）"

# 1) 抓取全量（失败沿用旧 raw）
foreach ($k in $siteKeys) {
  Write-Output "---- crawl $k ----"
  node (Join-Path $root 'crawl.js') $k
  if ($LASTEXITCODE -ne 0) { Write-Output "!! $k 抓取失败 (exit $LASTEXITCODE)，沿用旧 raw" }
}

# 2) 宽召回
foreach ($k in $siteKeys) {
  Write-Output "---- recall $k ----"
  node (Join-Path $root 'recall.js') $k
  if ($LASTEXITCODE -ne 0) { Write-Output "!! $k 召回失败 (exit $LASTEXITCODE)" }
}

# 2.5) 窄过滤
foreach ($k in $siteKeys) {
  Write-Output "---- narrow $k ----"
  node (Join-Path $root 'narrow.js') $k
  if ($LASTEXITCODE -ne 0) { Write-Output "!! $k 窄过滤失败 (exit $LASTEXITCODE)" }
}

# 3) 全量切批（口径变严必须 --full 全量重切）
foreach ($k in $siteKeys) {
  Write-Output "---- split --full $k ----"
  node (Join-Path $root 'split_batches.js') $k 20 --full
}

Write-Output "[$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')] 阶段①完成，待 flash 判定"
Stop-Transcript | Out-Null
