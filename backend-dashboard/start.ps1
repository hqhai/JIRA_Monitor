param([switch]$NoBrowser)
$ErrorActionPreference = 'Stop'
$dashboardRoot = $PSScriptRoot
$dashboardUrl = 'http://127.0.0.1:8765'
$dashboardRunning = $false
try {
    $dashboardState = Invoke-RestMethod "$dashboardUrl/api/state" -TimeoutSec 2
    $dashboardRunning = [bool]$dashboardState.token
} catch { }
if (-not $dashboardRunning) {
    $dashboardData = Join-Path $dashboardRoot 'data'
    New-Item -ItemType Directory -Path $dashboardData -Force | Out-Null
    $dashboardPython = (Get-Command python -ErrorAction Stop).Source
    $dashboardProcess = Start-Process -FilePath $dashboardPython -ArgumentList @('"' + (Join-Path $dashboardRoot 'server.py') + '"', '--port', '8765') -WorkingDirectory $dashboardRoot -WindowStyle Hidden -PassThru -RedirectStandardOutput (Join-Path $dashboardData 'server.log') -RedirectStandardError (Join-Path $dashboardData 'server-error.log')
    $dashboardProcess.Id | Set-Content -LiteralPath (Join-Path $dashboardData 'server.pid')
    for ($attempt = 0; $attempt -lt 30; $attempt++) {
        Start-Sleep -Milliseconds 300
        try { $dashboardState = Invoke-RestMethod "$dashboardUrl/api/state" -TimeoutSec 2; $dashboardRunning = [bool]$dashboardState.token; break } catch { }
    }
    if (-not $dashboardRunning) { throw 'Dashboard không khởi động được. Xem data/server-error.log.' }
}
if (-not $NoBrowser) { Start-Process $dashboardUrl }
Write-Output "Dashboard: $dashboardUrl"
