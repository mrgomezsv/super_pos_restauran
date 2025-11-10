#!/bin/bash

echo "========================================"
echo "   SUPER POS - Sistema de Punto de Ventas"
echo "========================================"
echo

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
BACKEND_DIR="${ROOT_DIR}/backend"
FRONT_DIR="${ROOT_DIR}/front"

echo "Iniciando backend FastAPI..."
gnome-terminal --title="Backend" -- bash -c "cd \"$BACKEND_DIR\" && python start.py; exec bash" &

echo "Esperando 3 segundos para que el backend inicie..."
sleep 3

echo "Iniciando frontend Angular..."
gnome-terminal --title="Frontend" -- bash -c "cd \"$FRONT_DIR\" && npm start; exec bash" &

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

