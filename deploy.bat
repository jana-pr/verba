@echo off
chcp 65001 > nul
title VERBA — Nasazení a aktualizace
echo ================================================================
echo   VERBA — NASAZENÍ A AKTUALIZACE APLIKACE (Zero-Data-Loss)
echo ================================================================
echo.
cd /d "%~dp0"
node scripts/deploy.cjs
echo.
pause
