@echo off
title Clave 1001 Bridge
cd /d "%~dp0.."
if not exist config.json (
  echo Copie config.example.json a config.json y configurelo.
  pause
  exit /b 1
)
if not exist node_modules (
  echo Instalando dependencias...
  call npm install
)
node src\server.js
pause
