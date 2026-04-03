@echo off
echo Setting up Local POS Display Bridge...
echo This will run on your POS machine and communicate with your PHP server
echo.

REM Check if Node.js is installed on LOCAL machine
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Node.js is not installed on this machine.
    echo Please install Node.js first from: https://nodejs.org/
    echo This needs to run on your POS machine, not the web server.
    pause
    exit /b 1
)

REM Install dependencies
echo Installing local dependencies...
npm install --production
if %errorlevel% neq 0 (
    echo ERROR: Failed to install dependencies.
    pause
    exit /b 1
)

REM Install Windows service
echo Installing Windows service for auto-start...
npm run install-service
if %errorlevel% neq 0 (
    echo WARNING: Service installation may have failed.
    echo You may need to run as Administrator.
    echo You can manually install later with: npm run install-service
)

echo.
echo Local bridge setup complete!
echo.
echo IMPORTANT: This service runs on your POS machine, not the web server.
echo It will communicate with your PHP server at:
echo https://client.ecofieldgroup.com/delight/pos-display-bridge/display-bridge.php
echo.
echo The service will now start automatically when Windows boots.
echo.
echo To uninstall later, run: npm run uninstall-service
echo.
pause
