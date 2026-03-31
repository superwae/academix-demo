# Start ngrok for AcademiX FRONTEND only (default port 5173).
# This is the ONLY tunnel you need - /api is proxied by Vite to the backend.
# Usage: .\start-ngrok.ps1 [port]   e.g. .\start-ngrok.ps1 5175
Set-Location $PSScriptRoot

$port = if ($args[0]) { $args[0] } else { 5173 }

Write-Host "AcademiX ngrok - tunneling frontend port $port" -ForegroundColor Cyan
Write-Host "  Prerequisites: 1) Backend running (dotnet run in backend). 2) Frontend running (npm run dev). 3) Your ngrok authtoken set (see NGROK.md)." -ForegroundColor Gray
Write-Host "  If you see 'Postgres - Server is up and running', you are on the WRONG URL or wrong port." -ForegroundColor Yellow
Write-Host ""

if ($port -eq 5173) {
  ngrok start web --config ngrok.yml
} else {
  ngrok http $port --config ngrok.yml
}
