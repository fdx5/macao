$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
Set-Location -LiteralPath $projectRoot
if (-not (Test-Path -LiteralPath (Join-Path $projectRoot 'node_modules'))) { npm ci; if ($LASTEXITCODE -ne 0) { throw 'npm ci failed' } }
node scripts/local-setup.mjs
if (-not (Test-Path -LiteralPath (Join-Path $projectRoot 'dist/index.html'))) { npm run build; if ($LASTEXITCODE -ne 0) { throw 'Build failed' } }
$ready = $false
try { $health = Invoke-RestMethod -Uri 'http://localhost:3001/api/health' -TimeoutSec 2; $ready = $health.ok -eq $true -and $health.service -eq 'our-macao' } catch {}
if (-not $ready) {
    $nodePath = (Get-Command node).Source
    $serverProcess = Start-Process -FilePath $nodePath -ArgumentList 'server/index.mjs' -WorkingDirectory $projectRoot -WindowStyle Hidden -RedirectStandardOutput (Join-Path $projectRoot 'storage/server.log') -RedirectStandardError (Join-Path $projectRoot 'storage/server-error.log') -PassThru
    $serverProcess.Id | Set-Content -LiteralPath (Join-Path $projectRoot 'storage/server.pid')
    for ($attempt = 0; $attempt -lt 20; $attempt++) {
        Start-Sleep -Milliseconds 300
        try { $health = Invoke-RestMethod -Uri 'http://localhost:3001/api/health' -TimeoutSec 2; if ($health.ok -and $health.service -eq 'our-macao') { $ready = $true; break } } catch {}
    }
}
if (-not $ready) { throw 'Local server did not start. Read storage/server-error.log.' }
Write-Host 'Macao: http://localhost:3001'
Write-Host 'Family access code:'
Get-Content -LiteralPath (Join-Path $projectRoot 'storage/local-access-code.txt')
Start-Process 'http://localhost:3001'
