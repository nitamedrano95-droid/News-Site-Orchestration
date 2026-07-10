#!/usr/bin/env bash
# scripts/fixes/2026-07-06-d1-rebucket/backup.sh
# Backup de las 4 DBs D1 con datos, antes de aplicar la re-migración.
# NO TOCA NADA. Solo exporta.
#
# Uso:
#   bash scripts/fixes/2026-07-06-d1-rebucket/backup.sh
#
# Output:
#   /home/sebastianvernis/backups/d1-pre-rebucket-$(date +%Y%m%d-%H%M%S)/
#     news_db_cms_originaux.sql
#     news_db_cms_nuevos.sql
#     news_db_cms_nuevos2.sql
#     news_db_cms_nuevos3.sql
#
# Si el backup de 2026-07-04 sigue disponible, podés usarlo y saltearte este.
# Si no, este script es tu rollback.

set -euo pipefail
TS="$(date +%Y%m%d-%H%M%S)"
DEST="/home/sebastianvernis/backups/d1-pre-rebucket-${TS}"
mkdir -p "$DEST"

DBS=(
  "cms-originaux:news_db_cms_originaux"
  "cms-nuevos:news_db_cms_nuevos"
  "cms-nuevos2:news_db_cms_nuevos2"
  "cms-nuevos3:news_db_cms_nuevos3"
)
# cms-nuevos4 está vacía; backup es trivial, lo dejo para no romper el patrón.

for entry in "${DBS[@]}"; do
  cms="${entry%%:*}"
  db="${entry##*:}"
  out="$DEST/${db}.sql"
  echo "  exportando $db -> $out"
  ( cd "/home/sebastianvernis/projects/News-Site-Orchestration/${cms}" \
    && npx wrangler d1 export "$db" --remote --output "$out" )
done

echo
echo "Backup completo en: $DEST"
ls -la "$DEST"
