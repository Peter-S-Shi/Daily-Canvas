@echo off
setlocal
cd /d "%~dp0"
set "OPEN_FLAG=--open"
if /I "%~1"=="--no-open" set "OPEN_FLAG="

where node >nul 2>nul
if errorlevel 1 (
  if exist "%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe" (
    set "PATH=%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin;%PATH%"
  )
)

where node >nul 2>nul
if errorlevel 1 (
  echo Daily Canvas could not find Node.js.
  echo Install Node.js 20.19 or newer, then run this file again.
  pause
  exit /b 1
)

set "CODEX_PNPM=%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\bin\fallback\pnpm.cmd"
if exist "%CODEX_PNPM%" goto bundled_pnpm

where pnpm >nul 2>nul
if errorlevel 1 (
  echo Daily Canvas could not find pnpm.
  echo Install pnpm, then run this file again.
  pause
  exit /b 1
)

if not exist "node_modules" (
  call pnpm install
  if errorlevel 1 goto install_failed
)
call pnpm dev --host 127.0.0.1 %OPEN_FLAG%
exit /b %errorlevel%

:bundled_pnpm
if not exist "node_modules" (
  call "%CODEX_PNPM%" install
  if errorlevel 1 goto install_failed
)
call "%CODEX_PNPM%" dev --host 127.0.0.1 %OPEN_FLAG%
exit /b %errorlevel%

:install_failed
echo.
echo Dependency installation failed. Check the message above and try again.
pause
exit /b 1
