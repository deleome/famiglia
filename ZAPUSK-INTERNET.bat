@echo off
chcp 65001 >nul
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo.
  echo   Node.js NOT FOUND.
  echo   1. Install it from https://nodejs.org  - green LTS button
  echo   2. Restart the computer
  echo   3. Run this file again
  echo.
  pause
  exit /b
)
start "" http://localhost:3001/table
node server.js --internet
pause
