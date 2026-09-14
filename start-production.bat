@echo off
chcp 65001 > nul
title VERBA — Produkční Server
echo ================================================================
echo   VERBA — PRODUKČNÍ BĚH (Jazyková platforma)
echo ================================================================
echo.
cd /d "%~dp0"

echo [1/3] Kontroluji zástupce na Ploše...
node scripts/create_desktop_shortcut.cjs

echo.
echo [2/3] Kontroluji a uvolňuji port 3000...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":3000" ^| findstr "LISTENING"') do (
  echo Ukončuji starý proces na portu 3000 (PID %%a)...
  taskkill /F /PID %%a >nul 2>&1
)
timeout /t 1 /nobreak >nul

if not exist ".next" (
  echo Sestavuji produkční balíček poprvé...
  call npm.cmd run build
)

echo.
echo [3/3] Spouštím produkční server VERBA na http://localhost:3000 ...
echo Aplikace je dostupná i pro telefon na stejné Wi-Fi.
echo Otevírám prohlížeč...

start http://localhost:3000

echo.
echo Server běží. Pro zastavení zavřete toto okno nebo stiskněte Ctrl+C.
echo ================================================================
echo.

call npm.cmd run start -- -H 0.0.0.0 -p 3000
pause
