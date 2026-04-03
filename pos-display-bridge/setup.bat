@echo off
echo Installing POS Display Bridge Service...
echo.

REM Check if Node.js is installed
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Node.js is not installed. Please install Node.js first.
    echo Download from: https://nodejs.org/
    pause
    exit /b 1
)

REM Install dependencies
echo Installing dependencies...
npm install
if %errorlevel% neq 0 (
    echo ERROR: Failed to install dependencies.
    pause
    exit /b 1
)

REM Create .env file if it doesn't exist
if not exist .env (
    echo Creating configuration file...
    copy .env.example .env
    echo Configuration file created. You can edit .env to customize settings.
)

REM Install Windows service
echo Installing Windows service...
npm run install-service
if %errorlevel% neq 0 (
    echo WARNING: Service installation may have failed. You may need to run as Administrator.
    echo You can manually install the service later with: npm run install-service
)

echo.
echo Installation complete!
echo.
echo The POS Display Bridge service should now be running.
echo You can test it by visiting: http://localhost:3000
echo.
echo To uninstall the service later, run: npm run uninstall-service
echo.
pause
