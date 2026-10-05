# Thin compatibility entrypoint; the registry in sites.json is the sole site list.
# Usage: pwsh -File crawler/run_daily.ps1 [key ...]
$ErrorActionPreference = 'Stop'
& node (Join-Path $PSScriptRoot 'update.js') @args
exit $LASTEXITCODE
