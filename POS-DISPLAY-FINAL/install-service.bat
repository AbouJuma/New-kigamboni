@echo off
REM Install Customer Display Bridge as Windows Service using NSSM

echo Installing Customer Display Bridge service...

REM Check if NSSM is installed
where nssm >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo NSSM (Non-Sucking Service Manager) is required.
    echo Download from: https://nssm.cc/download.html
    echo Extract nssm.exe to your PATH or this directory.
    pause
    exit /b 1
)

REM Install service
nssm install CustomerDisplayBridge "%CD%\bridge.js"
nssm set CustomerDisplayBridge AppDirectory "%CD%"
nssm set CustomerDisplayBridge DisplayName "Customer Display Bridge"
nssm set CustomerDisplayBridge Description "Bridge for POS customer display communication"
nssm set CustomerDisplayBridge Start SERVICE_AUTO_START

REM Start service
nssm start CustomerDisplayBridge

echo.
echo Service installed and started!
echo.
echo Commands to manage service:
echo   nssm start CustomerDisplayBridge
echo   nssm stop CustomerDisplayBridge
echo   nssm restart CustomerDisplayBridge
echo   nssm remove CustomerDisplayBridge  (to uninstall)
echo.
pause
