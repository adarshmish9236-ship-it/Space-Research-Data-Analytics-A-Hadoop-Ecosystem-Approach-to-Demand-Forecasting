@echo off
title Orbitalytics Full-Stack Platform Launcher
echo ==============================================================================
echo                 ORBITALYTICS: FULL-STACK BIG DATA PLATFORM
echo ==============================================================================
echo Starting FastAPI Backend (Port 8000) and React Vite Frontend (Port 5173)...
echo.

start "Orbitalytics Backend (FastAPI)" cmd /k "cd /d %~dp0backend && python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000"
timeout /t 2 /nobreak >nul

start "Orbitalytics Frontend (Vite)" cmd /k "cd /d %~dp0frontend && npm run dev"

echo.
echo Servers launched in separate windows:
echo - Frontend:  http://localhost:5173
echo - Backend:   http://localhost:8000
echo - API Docs:  http://localhost:8000/docs
echo ==============================================================================
