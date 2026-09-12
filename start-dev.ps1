# Orbitalytics Full-Stack Platform PowerShell Launcher
Write-Host "==============================================================================" -ForegroundColor Cyan
Write-Host "                ORBITALYTICS: FULL-STACK BIG DATA PLATFORM" -ForegroundColor Cyan
Write-Host "==============================================================================" -ForegroundColor Cyan
Write-Host "Launching FastAPI Backend (Port 8000) and React Vite Frontend (Port 5173)..." -ForegroundColor Yellow

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path

# Start Backend
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$scriptDir\backend'; python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000"

Start-Sleep -Seconds 2

# Start Frontend
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$scriptDir\frontend'; npm run dev"

Write-Host "`nServers launched in synchronized terminals:" -ForegroundColor Green
Write-Host " - Frontend:  http://localhost:5173" -ForegroundColor Green
Write-Host " - Backend:   http://localhost:8000" -ForegroundColor Green
Write-Host " - API Docs:  http://localhost:8000/docs" -ForegroundColor Green
Write-Host "==============================================================================" -ForegroundColor Cyan
