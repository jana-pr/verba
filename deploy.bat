@echo off
chcp 65001 > nul
title VERBA — Publikace a aktualizace
echo ================================================================
echo   VERBA — NASAZENÍ A AKTUALIZACE NA FIREBASE HOSTING
echo   Target: https://verba-learning.web.app (futro-app)
echo ================================================================
echo.
cd /d "%~dp0"
node scripts/deploy_firebase.cjs
echo.
pause
