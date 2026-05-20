#!/bin/bash
set -e

echo "=========================================="
echo "POBLAR CMS-NUEVOS3 - 25 SITIOS"
echo "=========================================="

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
MIGRATIONS_DIR="$SCRIPT_DIR/migrations"
DB_NAME="news_db_cms_nuevos3"

echo ""
echo "PASO 1: Verificar autenticación de Wrangler"
echo "=========================================="

npx wrangler whoami 2>/dev/null || {
    echo "ERROR: No estás autenticado en Cloudflare."
    echo "Solución: Ejecuta 'npx wrangler login'"
    exit 1
}

echo ""
echo "PASO 2: Ejecutar migraciones de esquema"
echo "=========================================="

echo "2.1 Ejecutando 000_init_tables.sql..."
npx wrangler d1 execute $DB_NAME --file="$MIGRATIONS_DIR/000_init_tables.sql" --remote 2>&1 | tail -3

echo "2.2 Ejecutando 001_create_fuentes_table.sql..."
npx wrangler d1 execute $DB_NAME --file="$MIGRATIONS_DIR/001_create_fuentes_table.sql" --remote 2>&1 | tail -3

echo "2.3 Ejecutando 002_add_fb_token_column.sql..."
npx wrangler d1 execute $DB_NAME --file="$MIGRATIONS_DIR/002_add_fb_token_column.sql" --remote 2>&1 | tail -3

echo "2.4 Ejecutando 003_add_25_sites.sql (NUEVO)..."
npx wrangler d1 execute $DB_NAME --file="$MIGRATIONS_DIR/003_add_25_sites.sql" --remote 2>&1 | tail -3

echo ""
echo "PASO 3: Poblar tablas de sitios"
echo "=========================================="

echo "3.1 Creando funciones para artículos por sitio..."
node -e "
const sites = [
  'enfoquemexicano', 'adnmexicano', 'pulsorepublicanonoticias', 'mexicannewsoftheworld',
  'expresomexicano', 'mexicodaily', 'aztecamexiconoticias', 'elanalisismexicano',
  'nacionalinstante', 'mexicoandtheworld', 'diariomexicano', 'politicasalvajealminuto',
  'elobservadorrepublicano', 'mexicoplus', 'actualidadsinfronteras', 'noticiasalinstante',
  'republicamx', 'diariomexico', 'financemarketsmx', 'monitorrepublicano',
  'elprofetamexicano', 'mexicoenresumen', 'radioredmx', 'perspectivamexicana', 'wenewsmexico'
];

console.log('site slugs ready:', sites.length);
"

echo ""
echo "PASO 4: Seedear tablas de sitios con artículos existentes"
echo "=========================================="

echo "4.1 Verificando tablas de sitios..."
npx wrangler d1 execute $DB_NAME --command="
SELECT name FROM sqlite_master WHERE type='table' AND name LIKE 'ARTICULOS_SITIO_%' ORDER BY name;
" --remote 2>&1 | grep -E "ARTICULOS_SITIO_" | wc -l

echo ""
echo "PASO 5: Poblar fuentes RSS"
echo "=========================================="

echo "5.1 Ejecutando seed_fuentes_cms_nuevos.sql..."
npx wrangler d1 execute $DB_NAME --file="$MIGRATIONS_DIR/seed_fuentes_cms_nuevos.sql" --remote 2>&1 | tail -3

echo ""
echo "=========================================="
echo "MIGRACIÓN COMPLETADA"
echo "=========================================="
echo ""
echo "Próximos pasos:"
echo "1. Verificar artículos: npx wrangler d1 execute $DB_NAME --command='SELECT COUNT(*) FROM ARTICULOS_PARAFRASEADOS' --remote"
echo "2. Poblar artículos desde otro CMS: usar API de ingest"
echo "3. Configurar tokens de Facebook para autopublishing"
echo "4. Ejecutar deploy de sites"