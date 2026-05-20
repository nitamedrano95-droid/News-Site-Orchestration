#!/bin/bash
# ============================================================================
# SCRIPT DE APLICACIÓN DE CORRECCIONES - ARTÍCULOS D1
# CMS Nuevos2
# Fecha: 2026-03-27
# ============================================================================
# Este script aplica las correcciones de forma segura con backup previo
# ============================================================================

set -e  # Detener en caso de error

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuración
DATABASE_NAME="news_db_cms_nuevos2"
BACKUP_DIR="./backups_d1"
CORRECTION_SQL="./scripts/correction/fix_articles_format.sql"
REVIEW_SQL="./scripts/correction/review_manual.sql"

echo -e "${BLUE}╔════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   CORRECCIÓN DE ARTÍCULOS - CMS Nuevos2              ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════╝${NC}"
echo ""

# Función para mostrar ayuda
show_help() {
    echo "Uso: $0 [opción]"
    echo ""
    echo "Opciones:"
    echo "  --dry-run     Solo mostrar cambios sin aplicar (recomendado)"
    echo "  --apply       Aplicar correcciones automáticamente"
    echo "  --backup      Solo crear backup sin aplicar cambios"
    echo "  --verify      Verificar estado actual de la base de datos"
    echo "  --help        Mostrar esta ayuda"
    echo ""
}

# Función para crear backup
create_backup() {
    local timestamp=$(date +"%Y%m%d_%H%M%S")
    local backup_file="${BACKUP_DIR}/backup_articulos_${timestamp}.sql"
    
    echo -e "${YELLOW}📦 Creando backup de la base de datos...${NC}"
    mkdir -p "$BACKUP_DIR"
    
    # Exportar tabla ARTICULOS_PARAFRASEADOS
    npx wrangler d1 execute "$DATABASE_NAME" --remote --command \
      "SELECT * FROM ARTICULOS_PARAFRASEADOS;" --output "$backup_file" 2>/dev/null
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ Backup creado: $backup_file${NC}"
        echo "$backup_file"
    else
        echo -e "${RED}❌ Error al crear backup${NC}"
        exit 1
    fi
}

# Función para verificar estado actual
verify_status() {
    echo -e "${YELLOW}📊 Verificando estado actual de la base de datos...${NC}"
    echo ""
    
    # Total de artículos
    total=$(npx wrangler d1 execute "$DATABASE_NAME" --remote --command \
      "SELECT COUNT(*) as count FROM ARTICULOS_PARAFRASEADOS;" 2>/dev/null | grep -o '[0-9]*' | head -1)
    echo "Total de artículos: $total"
    
    # Sin descripción
    sin_desc=$(npx wrangler d1 execute "$DATABASE_NAME" --remote --command \
      "SELECT COUNT(*) as count FROM ARTICULOS_PARAFRASEADOS WHERE DESCRIPCION_PARAFRASEADA IS NULL OR DESCRIPCION_PARAFRASEADA = '';" 2>/dev/null | grep -o '[0-9]*' | head -1)
    echo -e "${RED}• Sin descripción: $sin_desc${NC}"
    
    # Títulos cortos
    titulos_cortos=$(npx wrangler d1 execute "$DATABASE_NAME" --remote --command \
      "SELECT COUNT(*) as count FROM ARTICULOS_PARAFRASEADOS WHERE LENGTH(TITULO_PARAFRASEADO) < 10;" 2>/dev/null | grep -o '[0-9]*' | head -1)
    echo -e "${RED}• Títulos muy cortos (<10): $titulos_cortos${NC}"
    
    # Títulos largos
    titulos_largos=$(npx wrangler d1 execute "$DATABASE_NAME" --remote --command \
      "SELECT COUNT(*) as count FROM ARTICULOS_PARAFRASEADOS WHERE LENGTH(TITULO_PARAFRASEADO) > 100;" 2>/dev/null | grep -o '[0-9]*' | head -1)
    echo -e "${YELLOW}• Títulos muy largos (>100): $titulos_largos${NC}"
    
    # Espacios dobles
    espacios_dobles=$(npx wrangler d1 execute "$DATABASE_NAME" --remote --command \
      "SELECT COUNT(*) as count FROM ARTICULOS_PARAFRASEADOS WHERE TITULO_PARAFRASEADO LIKE '%  %' OR DESCRIPCION_PARAFRASEADA LIKE '%  %';" 2>/dev/null | grep -o '[0-9]*' | head -1)
    echo -e "${YELLOW}• Con espacios dobles: $espacios_dobles${NC}"
    
    # Con URLs
    con_urls=$(npx wrangler d1 execute "$DATABASE_NAME" --remote --command \
      "SELECT COUNT(*) as count FROM ARTICULOS_PARAFRASEADOS WHERE DESCRIPCION_PARAFRASEADA LIKE '%http%' OR DESCRIPCION_PARAFRASEADA LIKE '%bit.ly%';" 2>/dev/null | grep -o '[0-9]*' | head -1)
    echo -e "${YELLOW}• Con URLs: $con_urls${NC}"
    
    # Con puntos suspensivos
    puntos_susp=$(npx wrangler d1 execute "$DATABASE_NAME" --remote --command \
      "SELECT COUNT(*) as count FROM ARTICULOS_PARAFRASEADOS WHERE DESCRIPCION_PARAFRASEADA LIKE '%...%';" 2>/dev/null | grep -o '[0-9]*' | head -1)
    echo -e "${YELLOW}• Con puntos suspensivos: $puntos_susp${NC}"
    
    # Con separadores //
    separadores=$(npx wrangler d1 execute "$DATABASE_NAME" --remote --command \
      "SELECT COUNT(*) as count FROM ARTICULOS_PARAFRASEADOS WHERE TITULO_PARAFRASEADO LIKE '%//%' OR DESCRIPCION_PARAFRASEADA LIKE '%//%';" 2>/dev/null | grep -o '[0-9]*' | head -1)
    echo -e "${YELLOW}• Con separadores //: $separadores${NC}"
    
    echo ""
}

# Función para aplicar correcciones
apply_corrections() {
    echo -e "${YELLOW}🔧 Aplicando correcciones...${NC}"
    echo ""
    
    # Verificar que el archivo SQL existe
    if [ ! -f "$CORRECTION_SQL" ]; then
        echo -e "${RED}❌ No se encuentra el archivo de correcciones: $CORRECTION_SQL${NC}"
        exit 1
    fi
    
    # Aplicar el script SQL
    echo -e "${BLUE}📝 Ejecutando script de correcciones...${NC}"
    npx wrangler d1 execute "$DATABASE_NAME" --remote --file "$CORRECTION_SQL"
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ Correcciones aplicadas exitosamente${NC}"
    else
        echo -e "${RED}❌ Error al aplicar correcciones${NC}"
        exit 1
    fi
    
    echo ""
    echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${GREEN}✅ PROCESO COMPLETADO${NC}"
    echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    echo -e "${YELLOW}📌 Nota: Algunos artículos requieren revisión manual.${NC}"
    echo -e "${YELLOW}   Ejecuta el script review_manual.sql para más detalles.${NC}"
    echo ""
}

# ============================================================================
# MAIN
# ============================================================================

# Verificar argumentos
if [ $# -eq 0 ]; then
    show_help
    exit 0
fi

case "$1" in
    --dry-run)
        echo -e "${YELLOW}🔍 MODO DRY-RUN: Solo mostrando información${NC}"
        echo ""
        verify_status
        echo -e "${BLUE}ℹ️  Para aplicar correcciones, usa: $0 --apply${NC}"
        ;;
    
    --apply)
        echo -e "${RED}⚠️  ADVERTENCIA: Esta acción modificará la base de datos${NC}"
        echo ""
        read -p "¿Estás seguro de continuar? (escribe 'SI' para confirmar): " confirm
        if [ "$confirm" != "SI" ]; then
            echo -e "${YELLOW}Operación cancelada${NC}"
            exit 0
        fi
        
        create_backup
        verify_status
        echo ""
        apply_corrections
        verify_status
        ;;
    
    --backup)
        create_backup
        ;;
    
    --verify)
        verify_status
        ;;
    
    --help)
        show_help
        ;;
    
    *)
        echo -e "${RED}❌ Opción no válida${NC}"
        show_help
        exit 1
        ;;
esac

exit 0
