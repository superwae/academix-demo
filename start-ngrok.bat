@echo off
cd /d "%~dp0"
set PORT=%~1
if "%PORT%"=="" set PORT=5173
echo AcademiX ngrok - tunneling frontend port %PORT%
echo Make sure: 1) Backend is running  2) Frontend (npm run dev) is running  3) You have set your ngrok authtoken (see NGROK.md)
echo If you see Postgres "Server is up and running", you are on the WRONG port.
echo.
if "%PORT%"=="5173" (
  ngrok start web --config ngrok.yml
) else (
  ngrok http %PORT% --config ngrok.yml
)
pause
