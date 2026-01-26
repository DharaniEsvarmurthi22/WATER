Param(
    [int]$FrontendPort = 3000
)

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
$frontendDir = Join-Path $scriptDir 'frontend'

if (-not (Test-Path $frontendDir)) {
    Write-Error "Frontend folder not found at $frontendDir"
    exit 1
}

Push-Location $frontendDir

$python = Get-Command python -ErrorAction SilentlyContinue
if (-not $python) {
    Write-Error "Python not found. Please install Python 3 or run a static server manually (e.g. 'python -m http.server 3000' inside the frontend folder)."
    Pop-Location
    exit 1
}

Write-Host "Starting Python http.server on port $FrontendPort (background process)"
Start-Process -FilePath $python.Source -ArgumentList "-m", "http.server", "$FrontendPort"

Pop-Location

Write-Host "Frontend serving at http://localhost:$FrontendPort"
Write-Host "To serve functions locally, run in another terminal: supabase functions serve ingest-device"