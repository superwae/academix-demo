# AcademiX build verification - run from the repo root (double-click verify-build.bat)
# Output is written to verify-output.log so Claude can read the results.
$ErrorActionPreference = "Continue"
Set-Location $PSScriptRoot
$log = Join-Path $PSScriptRoot "verify-output.log"
"AcademiX verify run @ $(Get-Date -Format o)" | Out-File $log -Encoding utf8

"`n===== 1/3 FRONTEND typecheck (tsc --noEmit) =====" | Tee-Object -FilePath $log -Append
& npx tsc --noEmit 2>&1 | Tee-Object -FilePath $log -Append
"tsc exit code: $LASTEXITCODE" | Tee-Object -FilePath $log -Append
$tscExit = $LASTEXITCODE

"`n===== 2/3 FRONTEND bundle (vite build) =====" | Tee-Object -FilePath $log -Append
& npx vite build 2>&1 | Tee-Object -FilePath $log -Append
"vite exit code: $LASTEXITCODE" | Tee-Object -FilePath $log -Append
$viteExit = $LASTEXITCODE

"`n===== 3/3 BACKEND (dotnet build) =====" | Tee-Object -FilePath $log -Append
& dotnet build "backend/AcademixLMS.API/AcademixLMS.API.csproj" -nologo -v minimal 2>&1 | Tee-Object -FilePath $log -Append
"dotnet exit code: $LASTEXITCODE" | Tee-Object -FilePath $log -Append
$dotnetExit = $LASTEXITCODE

"`n===== SUMMARY =====" | Tee-Object -FilePath $log -Append
"tsc: $tscExit | vite: $viteExit | dotnet: $dotnetExit" | Tee-Object -FilePath $log -Append
if (($tscExit -eq 0) -and ($viteExit -eq 0) -and ($dotnetExit -eq 0)) {
  "ALL GREEN - OK" | Tee-Object -FilePath $log -Append
} else {
  "FAILURES PRESENT - see sections above" | Tee-Object -FilePath $log -Append
}
Write-Host "`nDone. Results saved to verify-output.log - you can close this window."
