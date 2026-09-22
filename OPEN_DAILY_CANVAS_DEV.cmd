@echo off
setlocal EnableExtensions EnableDelayedExpansion
title Daily Canvas - desktop development
cd /d "%~dp0"

rem Starts the Tauri desktop shell in development mode with the authoritative
rem Windows toolchain: Visual Studio Build Tools x64 MSVC + stable-x86_64-pc-windows-msvc.
rem Written without goto labels so it also parses correctly with LF line endings.
rem Inside ( ) blocks, paths use !VAR!: "Program Files (x86)" would otherwise close the block.

echo Daily Canvas - desktop development
echo.

set "VSWHERE=%ProgramFiles(x86)%\Microsoft Visual Studio\Installer\vswhere.exe"
if not exist "%VSWHERE%" (
  echo [missing] Visual Studio Build Tools are not installed.
  echo Install Visual Studio 2022 Build Tools with the "Desktop development with C++" workload,
  echo including the x64 MSVC toolset and a Windows SDK, then run this file again.
  echo.
  pause
  exit /b 1
)

set "VSINSTALL="
for /f "usebackq tokens=*" %%i in (`"!VSWHERE!" -latest -products * -requires Microsoft.VisualStudio.Component.VC.Tools.x86.x64 -property installationPath`) do set "VSINSTALL=%%i"
if not defined VSINSTALL (
  echo [missing] No Visual Studio installation includes the x64 MSVC toolset.
  echo Open Visual Studio Installer, modify Build Tools, and add "MSVC v143 - VS 2022 C++ x64/x86 build tools".
  echo.
  pause
  exit /b 1
)

set "VCVARS=%VSINSTALL%\VC\Auxiliary\Build\vcvars64.bat"
if not exist "%VCVARS%" (
  echo [missing] vcvars64.bat was not found under !VSINSTALL!
  echo Repair the Visual Studio Build Tools installation, then run this file again.
  echo.
  pause
  exit /b 1
)

rem vcvars64.bat's own helper scripts call vswhere.exe without a path.
set "PATH=%PATH%;%ProgramFiles(x86)%\Microsoft Visual Studio\Installer"
call "%VCVARS%" >nul
where cl.exe >nul 2>nul
if errorlevel 1 (
  echo [failed] The x64 MSVC developer environment could not be loaded from:
  echo   !VCVARS!
  echo.
  pause
  exit /b 1
)
if not defined WindowsSdkDir (
  echo [missing] No Windows SDK was found for the MSVC toolset.
  echo Open Visual Studio Installer, modify Build Tools, and add a Windows 10 or 11 SDK.
  echo.
  pause
  exit /b 1
)
echo MSVC environment : %VSINSTALL%

set "RUSTUP_TOOLCHAIN=stable-x86_64-pc-windows-msvc"
where rustup >nul 2>nul
if errorlevel 1 (
  echo [missing] rustup was not found. Install Rust from https://rustup.rs and run this file again.
  echo.
  pause
  exit /b 1
)
rustc -vV 2>nul | findstr /c:"host: x86_64-pc-windows-msvc" >nul
if errorlevel 1 (
  echo [missing] The Rust toolchain stable-x86_64-pc-windows-msvc is not installed.
  echo Run:  rustup toolchain install stable-x86_64-pc-windows-msvc
  echo.
  pause
  exit /b 1
)
echo Rust toolchain   : %RUSTUP_TOOLCHAIN%

set "CODEX_NODE=%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin"
set "CODEX_PNPM=%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\bin\fallback"
where node >nul 2>nul
if errorlevel 1 if exist "%CODEX_NODE%\node.exe" set "PATH=%CODEX_NODE%;%PATH%"
where node >nul 2>nul
if errorlevel 1 (
  echo [missing] Node.js 20.19 or newer was not found. Install Node.js and run this file again.
  echo.
  pause
  exit /b 1
)
where pnpm >nul 2>nul
if errorlevel 1 if exist "%CODEX_PNPM%\pnpm.cmd" set "PATH=%CODEX_PNPM%;%PATH%"
where pnpm >nul 2>nul
if errorlevel 1 (
  echo [missing] pnpm was not found. Install it with:  npm install -g pnpm
  echo.
  pause
  exit /b 1
)

if not exist "node_modules" (
  echo Installing dependencies...
  call pnpm install
  if not "!ERRORLEVEL!"=="0" (
    echo [failed] pnpm install did not complete.
    echo.
    pause
    exit /b 1
  )
)

echo.
echo Starting the Daily Canvas desktop window. The first build can take several minutes.
echo Close the Daily Canvas window, or press Ctrl+C here, to stop.
echo.
call pnpm desktop:dev
rem "if errorlevel 1" misses negative exit codes, which is how an abnormal stop surfaces.
set "DEV_EXIT=!ERRORLEVEL!"
if not "!DEV_EXIT!"=="0" (
  echo.
  echo [failed] The desktop development session ended with exit code !DEV_EXIT!. See the output above.
  echo.
  pause
  exit /b 1
)
exit /b 0
