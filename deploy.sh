#!/bin/bash

# Script de despliegue para Super POS
# Autor: Super POS Team
# Fecha: $(date)

set -e  # Salir si hay algún error

echo "========================================"
echo "   SUPER POS - Script de Despliegue"
echo "========================================"
echo

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Función para mostrar mensajes con color
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Función para hacer backup de la base de datos
backup_database() {
    log_info "Realizando backup de la base de datos..."
    
    if [ -f "backend/superpos.db" ]; then
        BACKUP_DIR="backups"
        TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
        BACKUP_FILE="${BACKUP_DIR}/superpos_backup_${TIMESTAMP}.db"
        
        # Crear directorio de backups si no existe
        mkdir -p "$BACKUP_DIR"
        
        # Copiar la base de datos
        cp "backend/superpos.db" "$BACKUP_FILE"
        
        if [ $? -eq 0 ]; then
            log_success "Backup creado exitosamente: $BACKUP_FILE"
            
            # Mantener solo los últimos 10 backups
            cd "$BACKUP_DIR"
            ls -t superpos_backup_*.db | tail -n +11 | xargs -r rm -f
            cd ..
        else
            log_error "Error al crear backup de la base de datos"
            exit 1
        fi
    else
        log_warning "No se encontró la base de datos, omitiendo backup"
    fi
}

# Función para verificar dependencias
check_dependencies() {
    log_info "Verificando dependencias..."
    
    # Verificar Python
    if ! command -v python3 &> /dev/null; then
        log_error "Python3 no está instalado"
        exit 1
    fi
    
    # Verificar Node.js
    if ! command -v node &> /dev/null; then
        log_error "Node.js no está instalado"
        exit 1
    fi
    
    # Verificar npm
    if ! command -v npm &> /dev/null; then
        log_error "npm no está instalado"
        exit 1
    fi
    
    log_success "Todas las dependencias están instaladas"
}

# Función para instalar dependencias del backend
install_backend_dependencies() {
    log_info "Instalando dependencias del backend..."
    
    cd backend
    
    if [ -f "requirements.txt" ]; then
        pip3 install -r requirements.txt
        if [ $? -eq 0 ]; then
            log_success "Dependencias del backend instaladas correctamente"
        else
            log_error "Error instalando dependencias del backend"
            exit 1
        fi
    else
        log_error "No se encontró requirements.txt en el backend"
        exit 1
    fi
    
    cd ..
}

# Función para instalar dependencias del frontend
install_frontend_dependencies() {
    log_info "Instalando dependencias del frontend..."
    
    if [ -f "front/package.json" ]; then
        pushd front > /dev/null
        npm install
        if [ $? -eq 0 ]; then
            log_success "Dependencias del frontend instaladas correctamente"
        else
            log_error "Error instalando dependencias del frontend"
            exit 1
        fi
        popd > /dev/null
    else
        log_error "No se encontró package.json del frontend (front/package.json)"
        exit 1
    fi
}

# Función para construir el frontend
build_frontend() {
    log_info "Construyendo el frontend para producción..."
    
    pushd front > /dev/null
    npm run build
    if [ $? -eq 0 ]; then
        log_success "Frontend construido correctamente"
    else
        log_error "Error construyendo el frontend"
        exit 1
    fi
    popd > /dev/null
}

# Función para inicializar la base de datos
init_database() {
    log_info "Inicializando base de datos..."
    
    cd backend
    
    if [ -f "init_db.py" ]; then
        python3 init_db.py
        if [ $? -eq 0 ]; then
            log_success "Base de datos inicializada correctamente"
        else
            log_error "Error inicializando la base de datos"
            exit 1
        fi
    else
        log_error "No se encontró init_db.py"
        exit 1
    fi
    
    cd ..
}

# Función para verificar que el sistema esté funcionando
health_check() {
    log_info "Verificando estado del sistema..."
    
    # Verificar que el backend esté corriendo
    if curl -s http://localhost:3000/health > /dev/null; then
        log_success "Backend está funcionando correctamente"
    else
        log_warning "Backend no está respondiendo en el puerto 3000"
    fi
    
    # Verificar que el frontend esté construido
    if [ -d "front/dist/super-pos" ]; then
        log_success "Frontend está construido correctamente"
    else
        log_warning "Frontend no está construido"
    fi
}

# Función principal de despliegue
deploy() {
    log_info "Iniciando proceso de despliegue..."
    
    # 1. Verificar dependencias
    check_dependencies
    
    # 2. Hacer backup de la base de datos
    backup_database
    
    # 3. Instalar dependencias del backend
    install_backend_dependencies
    
    # 4. Instalar dependencias del frontend
    install_frontend_dependencies
    
    # 5. Construir el frontend
    build_frontend
    
    # 6. Inicializar la base de datos (si es necesario)
    if [ ! -f "backend/superpos.db" ]; then
        init_database
    fi
    
    # 7. Verificar estado del sistema
    health_check
    
    log_success "Despliegue completado exitosamente!"
    echo
    echo "========================================"
    echo "   SISTEMA LISTO PARA USAR"
    echo "========================================"
    echo
    echo "Para iniciar el sistema:"
    echo "  Backend:  cd backend && python3 start.py"
    echo "  Frontend: cd front && npm start"
    echo
    echo "URLs del sistema:"
    echo "  Frontend: http://localhost:4200"
    echo "  Backend:  http://localhost:3000"
    echo "  API Docs: http://localhost:3000/docs"
    echo
}

# Función para restaurar base de datos
restore_db() {
    log_info "Función de restauración de base de datos..."
    
    BACKUP_DIR="backups"
    
    if [ ! -d "$BACKUP_DIR" ]; then
        log_error "No existe el directorio de backups"
        exit 1
    fi
    
    # Listar backups disponibles
    echo "Backups disponibles:"
    ls -la "$BACKUP_DIR"/superpos_backup_*.db 2>/dev/null || {
        log_error "No se encontraron backups"
        exit 1
    }
    
    echo
    echo "Para restaurar un backup específico, ejecute:"
    echo "  cp backups/superpos_backup_YYYYMMDD_HHMMSS.db backend/superpos.db"
}

# Función para mostrar ayuda
show_help() {
    echo "Uso: $0 [COMANDO]"
    echo
    echo "Comandos disponibles:"
    echo "  deploy     - Realizar despliegue completo del sistema"
    echo "  backup     - Solo hacer backup de la base de datos"
    echo "  restore    - Mostrar opciones de restauración"
    echo "  help       - Mostrar esta ayuda"
    echo
    echo "Ejemplos:"
    echo "  $0 deploy"
    echo "  $0 backup"
    echo "  $0 restore"
}

# Procesar argumentos
case "${1:-deploy}" in
    "deploy")
        deploy
        ;;
    "backup")
        backup_database
        ;;
    "restore")
        restore_db
        ;;
    "help"|"-h"|"--help")
        show_help
        ;;
    *)
        log_error "Comando no reconocido: $1"
        show_help
        exit 1
        ;;
esac
