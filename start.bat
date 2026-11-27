@echo off
echo ========================================================
echo Starting FlashAI Universal AI Learning Platform...
echo ========================================================

:: Free port 8000 if already occupied
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :8000 ^| findstr LISTENING') do (
    echo Freeing port 8000 (PID %%a)...
    taskkill /F /PID %%a >nul 2>&1
)

:: Free port 5173 if already occupied
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :5173 ^| findstr LISTENING') do (
    echo Freeing port 5173 (PID %%a)...
    taskkill /F /PID %%a >nul 2>&1
)

echo Starting FastAPI Backend Server on port 8000...
start "FlashAI Backend" cmd /k "cd server && .\venv\Scripts\activate && uvicorn main:app --reload --port 8000"

timeout /t 3 /nobreak >nul

echo Starting Vite Frontend on port 5173...
start "FlashAI Frontend" cmd /k "npm run dev"

timeout /t 3 /nobreak >nul

echo Opening browser at http://localhost:5173...
start http://localhost:5173

echo ========================================================
echo FlashAI is now running!
echo Backend:  http://localhost:8000
echo Frontend: http://localhost:5173
echo ========================================================
pause
