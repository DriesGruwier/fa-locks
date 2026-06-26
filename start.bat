@echo off
echo.
echo  FA WMS/WCS Locks - lokale server
echo  ================================
echo.

:: Probeer poort 8080
python -m http.server 8080 2>nul
if %errorlevel% equ 0 goto :started

:: Probeer poort 9000
python -m http.server 9000 2>nul
if %errorlevel% equ 0 goto :started

:: Probeer poort 5500
python -m http.server 5500 2>nul

:started
echo Server gestart.
pause
