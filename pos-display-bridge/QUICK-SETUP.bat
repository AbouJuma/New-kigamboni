@echo off
echo ======================================
echo SIMPLE POS DISPLAY SETUP
echo ======================================
echo.

REM Check Node.js
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Node.js not found!
    echo Please install from: https://nodejs.org/
    pause
    exit /b 1
)

echo ✅ Node.js found
echo.
echo Installing dependencies...
npm install serialport
if %errorlevel% neq 0 (
    echo ❌ Installation failed
    pause
    exit /b 1
)

echo.
echo ✅ Installation complete!
echo.
echo ======================================
echo NEXT STEPS:
echo ======================================
echo.
echo 1. Find your COM port:
echo    - Open Device Manager
echo    - Look under "Ports (COM ^& LPT)"
echo    - Note the COM port number (e.g., COM3)
echo.
echo 2. Test the display:
echo    npm run test
echo.
echo 3. Start the service:
echo    npm start
echo.
echo 4. Your POS will connect to:
echo    http://localhost:3000
echo.
echo ======================================
pause
