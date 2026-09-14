@echo off
chcp 65001 > nul
title VERBA — Publikace na Firebase Hosting
echo ================================================================
echo   VERBA — PUBLIKACE NA FIREBASE HOSTING (Zero-Data-Loss)
echo   Target: https://verba-learning.web.app (futro-app)
echo ================================================================
echo.
cd /d "%~dp0"
node scripts/deploy_firebase.cjs
echo.
pause
