@echo off
echo ========================================
echo    SUPER POS - Sistema de Punto de Ventas
echo ========================================
echo.

echo Iniciando backend FastAPI...
start "Backend" cmd /k "cd backend && python start.py"

echo Esperando 3 segundos para que el backend inicie...
timeout /t 3 /nobreak > nul

echo Iniciando frontend Angular...
start "Frontend" cmd /k "cd front && npm start"

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
