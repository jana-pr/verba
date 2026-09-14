@echo off
chcp 65001 > nul
title VERBA — Publikace a aktualizace
echo ================================================================
echo   VERBA — PUBLIKACE A AKTUALIZACE APLIKACE
echo ================================================================
echo.
cd /d "%~dp0"
call deploy.bat
