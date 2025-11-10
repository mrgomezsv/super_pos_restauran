@echo off
echo ========================================
echo    SUPER POS - Sistema de Punto de Ventas
echo ========================================
echo.

set "SCRIPT_DIR=%~dp0"
for %%I in ("%SCRIPT_DIR%..") do set "BACKEND_DIR=%%~fI"
for %%I in ("%BACKEND_DIR%\..") do set "ROOT_DIR=%%~fI"
set "FRONT_DIR=%ROOT_DIR%\front"

echo Iniciando backend FastAPI...
start "Backend" cmd /k "cd /d ""%BACKEND_DIR%"" && python start.py"

echo Esperando 3 segundos para que el backend inicie...
timeout /t 3 /nobreak > nul

echo Iniciando frontend Angular...
start "Frontend" cmd /k "cd /d ""%FRONT_DIR%"" && npm start"

echo.
echo ========================================
echo Sistema iniciado correctamente!
echo.
echo Backend: http://localhost:3000
echo Frontend: http://localhost:4200
echo.
echo Usuarios de prueba:
echo   Admin: admin / admin123
echo   Cajero: cajero1 / cajero123
echo ========================================
echo.
pause
