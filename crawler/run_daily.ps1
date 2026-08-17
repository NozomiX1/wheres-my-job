# 每日刷新（阶段①，纯脚本）：抓取全量 → 宽召回 → 增量切批。
# 由 Windows 计划任务调用，也可手动执行：pwsh -File run_daily.ps1
# 阶段②（flash 判定）+ 阶段③（汇总）由 agent 执行，见 README.md「每日流程」。
$ErrorActionPreference = 'Continue'
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $root

# 全部 27 个站点 key（moka/beisen/custom 纯 HTTP 快；feishu 需无头 Chrome，约 30-60s/站）
$siteKeys = @(
  'kimi','zhipu','deepseek','stepfun','hypergryph','iflytek',          # moka/beisen
  'bytedance','sensetime','minimax','lilith','papegames',              # feishu
  'alibaba','tencent','tme','jd','huawei','oppo','xiaomi','ant',       # custom
  'meituan','kuaishou','mihoyo','netease_huyu','netease_leihuo',       # custom
  'baidu','baichuan','shlab'                                           # custom
)

$logDir = Join-Path $root 'log'
New-Item -ItemType Directory -Force -Path $logDir | Out-Null
$stamp = Get-Date -Format 'yyyy-MM-dd_HHmmss'
$log = Join-Path $logDir "daily_$stamp.log"
Start-Transcript -Path $log | Out-Null

Write-Output "[$stamp] 开始每日刷新（抓取 + 召回 + 增量切批）"

# 1) 抓取全量
foreach ($k in $siteKeys) {
  Write-Output "---- crawl $k ----"
  node (Join-Path $root 'crawl.js') $k
  if ($LASTEXITCODE -ne 0) { Write-Output "!! $k 抓取失败 (exit $LASTEXITCODE)，沿用旧 raw" }
}

# 2) 宽召回（≤200/公司）
foreach ($k in $siteKeys) {
  Write-Output "---- recall $k ----"
  node (Join-Path $root 'recall.js') $k
  if ($LASTEXITCODE -ne 0) { Write-Output "!! $k 召回失败 (exit $LASTEXITCODE)" }
}

# 3) 增量切批（只切「缓存里没有 / 内容已变」的岗位）
foreach ($k in $siteKeys) {
  Write-Output "---- split $k ----"
  node (Join-Path $root 'split_batches.js') $k 20
}

Write-Output "[$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')] 阶段①完成：新岗位已切批到 out\batches\，等待 agent 执行 flash 判定（阶段②）"
Write-Output "后续：agent 跑判定工作流 -> node write_cache.js -> node aggregate.js"
Stop-Transcript | Out-Null
