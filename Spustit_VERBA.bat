@echo off
chcp 65001 > nul
title VERBA
echo ================================================================
echo   VERBA — SPOUŠTĚNÍ APLIKACE
echo ================================================================
echo.
cd /d "%~dp0"
call start-production.bat
