#!/bin/bash

# Script de restauración de base de datos para Super POS
# Autor: Super POS Team
# Fecha: $(date)

set -e  # Salir si hay algún error

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
BACKEND_DIR="${ROOT_DIR}/backend"
BACKUP_ROOT="${BACKEND_DIR}/backups"

echo "========================================"
echo "   SUPER POS - Restauración de BD"
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

# Función para listar backups disponibles
list_backups() {
    BACKUP_DIR="$BACKUP_ROOT"
    
    if [ ! -d "$BACKUP_DIR" ]; then
        log_error "No existe el directorio de backups"
        exit 1
    fi
    
    BACKUP_FILES=($(ls -t "$BACKUP_DIR"/superpos_backup_*.db 2>/dev/null))
    
    if [ ${#BACKUP_FILES[@]} -eq 0 ]; then
        log_error "No se encontraron backups en el directorio $BACKUP_DIR"
        exit 1
    fi
    
    echo "Backups disponibles:"
    echo "==================="
    
    for i in "${!BACKUP_FILES[@]}"; do
        BACKUP_FILE="${BACKUP_FILES[$i]}"
        BACKUP_NAME=$(basename "$BACKUP_FILE")
        BACKUP_DATE=$(stat -f "%Sm" -t "%Y-%m-%d %H:%M:%S" "$BACKUP_FILE" 2>/dev/null || stat -c "%y" "$BACKUP_FILE" 2>/dev/null | cut -d' ' -f1-2)
        BACKUP_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
        
        echo "$((i+1)). $BACKUP_NAME"
        echo "   Fecha: $BACKUP_DATE"
        echo "   Tamaño: $BACKUP_SIZE"
        echo
    done
    
    return ${#BACKUP_FILES[@]}
}

# Función para restaurar backup específico
restore_backup() {
    local backup_file="$1"
    
    if [ ! -f "$backup_file" ]; then
        log_error "El archivo de backup no existe: $backup_file"
        exit 1
    fi
    
    log_info "Restaurando backup: $backup_file"
    
    # Hacer backup de la BD actual si existe
    if [ -f "$BACKEND_DIR/superpos.db" ]; then
        CURRENT_BACKUP="${BACKUP_ROOT}/superpos_current_$(date +%Y%m%d_%H%M%S).db"
        mkdir -p "$BACKUP_ROOT"
        cp "$BACKEND_DIR/superpos.db" "$CURRENT_BACKUP"
        log_info "Backup de BD actual creado: $CURRENT_BACKUP"
    fi
    
    # Restaurar el backup
    cp "$backup_file" "$BACKEND_DIR/superpos.db"
    
    if [ $? -eq 0 ]; then
        log_success "Backup restaurado exitosamente"
        
        # Verificar que la BD restaurada sea válida
        if [ -f "$BACKEND_DIR/superpos.db" ]; then
            DB_SIZE=$(stat -f "%z" "$BACKEND_DIR/superpos.db" 2>/dev/null || stat -c "%s" "$BACKEND_DIR/superpos.db" 2>/dev/null)
            if [ "$DB_SIZE" -gt 0 ]; then
                log_success "Base de datos restaurada y validada correctamente"
            else
                log_error "La base de datos restaurada está vacía o corrupta"
                exit 1
            fi
        else
            log_error "Error: La base de datos no se restauró correctamente"
            exit 1
        fi
    else
        log_error "Error al restaurar el backup"
        exit 1
    fi
}

# Función para restaurar backup interactivo
restore_interactive() {
    list_backups
    local backup_count=$?
    
    if [ $backup_count -eq 0 ]; then
        exit 1
    fi
    
    echo
    read -p "Seleccione el número del backup a restaurar (1-$backup_count): " selection
    
    # Validar selección
    if ! [[ "$selection" =~ ^[0-9]+$ ]] || [ "$selection" -lt 1 ] || [ "$selection" -gt $backup_count ]; then
        log_error "Selección inválida"
        exit 1
    fi
    
    # Obtener el archivo seleccionado
    BACKUP_DIR="backups"
    BACKUP_FILES=($(ls -t "$BACKUP_DIR"/superpos_backup_*.db))
    SELECTED_BACKUP="${BACKUP_FILES[$((selection-1))]}"
    
    echo
    log_warning "ADVERTENCIA: Esta operación reemplazará la base de datos actual"
    read -p "¿Está seguro de que desea continuar? (s/N): " confirm
    
    if [[ "$confirm" =~ ^[Ss]$ ]]; then
        restore_backup "$SELECTED_BACKUP"
    else
        log_info "Operación cancelada"
        exit 0
    fi
}

# Función para restaurar backup por nombre de archivo
restore_by_filename() {
    local filename="$1"
    
    if [ -z "$filename" ]; then
        log_error "Debe especificar el nombre del archivo de backup"
        exit 1
    fi
    
    # Buscar el archivo en el directorio de backups
    BACKUP_FILE=""
    
    if [ -f "${BACKUP_ROOT}/$filename" ]; then
        BACKUP_FILE="${BACKUP_ROOT}/$filename"
    elif [ -f "$filename" ]; then
        BACKUP_FILE="$filename"
    else
        log_error "No se encontró el archivo de backup: $filename"
        echo
        echo "Archivos disponibles en el directorio ${BACKUP_ROOT}:"
        ls -la "${BACKUP_ROOT}/" 2>/dev/null || echo "No hay directorio de backups"
        exit 1
    fi
    
    restore_backup "$BACKUP_FILE"
}

# Función para mostrar ayuda
show_help() {
    echo "Uso: $0 [OPCIÓN] [ARCHIVO]"
    echo
    echo "Opciones:"
    echo "  (sin opciones)  - Modo interactivo para seleccionar backup"
    echo "  -f ARCHIVO      - Restaurar backup específico por nombre"
    echo "  -l              - Listar backups disponibles"
    echo "  -h, --help      - Mostrar esta ayuda"
    echo
    echo "Ejemplos:"
    echo "  $0                                    # Modo interactivo"
    echo "  $0 -f superpos_backup_20240101_120000.db"
    echo "  $0 -l                                 # Listar backups"
    echo
    echo "Notas:"
    echo "  - Se creará automáticamente un backup de la BD actual antes de restaurar"
    echo "  - Los backups se almacenan en el directorio 'backend/backups/'"
    echo "  - La BD actual se respalda con el prefijo 'superpos_current_'"
}

# Función para listar backups y salir
list_only() {
    list_backups
    exit 0
}

# Procesar argumentos
case "${1:-interactive}" in
    "-f"|"--file")
        if [ -z "$2" ]; then
            log_error "Debe especificar el nombre del archivo de backup"
            show_help
            exit 1
        fi
        restore_by_filename "$2"
        ;;
    "-l"|"--list")
        list_only
        ;;
    "-h"|"--help"|"help")
        show_help
        ;;
    "interactive"|"")
        restore_interactive
        ;;
    *)
        # Si no es una opción reconocida, tratar como nombre de archivo
        restore_by_filename "$1"
        ;;
esac

echo
log_success "Restauración completada exitosamente!"
echo
echo "Para verificar que todo funciona correctamente:"
echo "  1. Inicie el backend: cd backend && python3 start.py"
echo "  2. Verifique que no hay errores en el log"
echo "  3. Acceda a http://localhost:3000/docs para ver la API"
echo
