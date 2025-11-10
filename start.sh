#!/bin/bash

echo "========================================"
echo "   SUPER POS - Sistema de Punto de Ventas"
echo "========================================"
echo

echo "Iniciando backend FastAPI..."
gnome-terminal --title="Backend" -- bash -c "cd backend && python start.py; exec bash" &

echo "Esperando 3 segundos para que el backend inicie..."
sleep 3

echo "Iniciando frontend Angular..."
gnome-terminal --title="Frontend" -- bash -c "cd front && npm start; exec bash" &

echo
echo "========================================"
echo "Sistema iniciado correctamente!"
echo
echo "Backend: http://localhost:3000"
echo "Frontend: http://localhost:4200"
echo
echo "Usuarios de prueba:"
echo "  Admin: admin / admin123"
echo "  Cajero: cajero1 / cajero123"
echo "========================================"
echo

# Hacer el script ejecutable
chmod +x start.sh
