#!/usr/bin/env bash
# scripts/fixes/2026-07-06-d1-rebucket/generate-sql.sh
# Regenera los 4 SQL de re-migración a partir del template.
# Re-migración: pub-42bf42f47f554f9791e810e7d0f209d4.r2.dev (cms-news)
#          --> pub-98fc7afcc6f14264b5c779748d7de4b5.r2.dev (bucket real)
# Cada script es idempotente. Si se corre dos veces, la 2da pasada no hace nada.
#
# Uso:
#   bash scripts/fixes/2026-07-06-d1-rebucket/generate-sql.sh
#
# Output:
#   scripts/fixes/2026-07-06-d1-rebucket/cms-{originaux,nuevos,nuevos2,nuevos3}-rebucket.sql
#
# NO TOCA LA DB. Solo genera archivos en disco.

set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
TEMPLATE="$HERE/_template.sql"
DBS=(
  "cms-originaux:news_db_cms_originaux"
  "cms-nuevos:news_db_cms_nuevos"
  "cms-nuevos2:news_db_cms_nuevos2"
  "cms-nuevos3:news_db_cms_nuevos3"
)
# cms-nuevos4 está vacía (0 filas en D1) — no necesita script.
OLD_HOST="https://pub-42bf42f47f554f9791e810e7d0f209d4.r2.dev"
NEW_HOST="https://pub-98fc7afcc6f14264b5c779748d7de4b5.r2.dev"

for entry in "${DBS[@]}"; do
  cms="${entry%%:*}"
  out="$HERE/${cms}-rebucket.sql"
  sed -e "s/__CMS__/${cms}/g" \
      -e "s|__OLD__|${OLD_HOST}|g" \
      -e "s|__NEW__|${NEW_HOST}|g" \
      "$TEMPLATE" > "$out"
  echo "  generado: $out"
done

echo
echo "Listo. NO se ejecutó nada en la DB."
echo "Para aplicar (cuando vos lo apruebes):"
echo "  cd cms-originaux && npx wrangler d1 execute news_db_cms_originaux --remote --file=../scripts/fixes/2026-07-06-d1-rebucket/cms-originaux-rebucket.sql"
