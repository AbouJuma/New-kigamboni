@echo off
REM Install Customer Display Bridge as Windows Service on LOCAL MACHINE
REM This will run the bridge automatically when Windows starts

echo Installing Customer Display Bridge service on local machine...

REM Check if running as administrator
net session >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo Please run this as Administrator!
    pause
    exit /b 1
)

REM Check if NSSM is installed
where nssm >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo Downloading NSSM (Non-Sucking Service Manager)...
    powershell -Command "Invoke-WebRequest -Uri 'https://nssm.cc/release/nssm-2.24.zip' -OutFile 'nssm.zip'"
    powershell -Command "Expand-Archive 'nssm.zip' -DestinationPath '.'"
    del nssm.zip
    echo NSSM downloaded and extracted.
)

REM Get current directory
set SERVICE_DIR=%~dp0

REM Install service
nssm install CustomerDisplayBridge "node.exe" "%SERVICE_DIR%bridge.js"
nssm set CustomerDisplayBridge AppDirectory "%SERVICE_DIR%"
nssm set CustomerDisplayBridge DisplayName "Customer Display Bridge"
nssm set CustomerDisplayBridge Description "Bridge for POS customer display communication"
nssm set CustomerDisplayBridge Start SERVICE_AUTO_START
nssm set CustomerDisplayBridge AppEnvironmentExtra "NODE_ENV=production"

REM Start service
nssm start CustomerDisplayBridge

echo.
echo ========================================
echo Service installed and started!
echo ========================================
echo.
echo The bridge will now:
echo - Start automatically when Windows boots
echo - Run continuously in the background
echo - Auto-restart if it crashes
echo.
echo Commands to manage service:
echo   nssm start CustomerDisplayBridge
echo   nssm stop CustomerDisplayBridge
echo   nssm restart CustomerDisplayBridge
echo   nssm status CustomerDisplayBridge
echo   nssm remove CustomerDisplayBridge  (to uninstall)
echo.
echo To view logs: services.msc -> Find CustomerDisplayBridge -> Right-click -> Properties -> Log on
echo.
pause
