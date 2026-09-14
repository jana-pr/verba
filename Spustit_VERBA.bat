@echo off
chcp 65001 > nul
title VERBA — Jazyková platforma
echo ================================================================
echo   VERBA — SPOUŠTĚNÍ APLIKACE (Firebase Cloud)
echo   Online adresa: https://verba-learning.web.app
echo ================================================================
echo.
cd /d "%~dp0"

echo [1/2] Aktualizuji zástupce na Ploše Windows...
node scripts/create_desktop_shortcut.cjs

echo.
echo [2/2] Otevírám aplikaci VERBA...
start https://verba-learning.web.app

echo.
echo Aplikace byla úspěšně otevřena v prohlížeči.
timeout /t 3 >nul
