#!/bin/bash
# nexopress-hub-ui/scripts/build-all-admins.sh
# Build del Hub UI React para cada CMS y copia a public/admin de cada proyecto.
set -e

REPO_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
UI_DIR="$REPO_ROOT/nexopress-hub-ui"
CMS_LIST=(cms-originaux cms-nuevos cms-nuevos2 cms-nuevos3 cms-nuevos4)

cd "$UI_DIR"

for cms in "${CMS_LIST[@]}"; do
  echo "=== Building admin for $cms ==="
  rm -rf "dist-cms/$cms"
  VITE_CMS_ID="$cms" npm run build -- --outDir "dist-cms/$cms"

  # Reemplaza el placeholder __CMS_ID__ por el CMS real en el bundle JS
  JS_FILE="$(ls dist-cms/$cms/assets/index-*.js | head -1)"
  if [ -f "$JS_FILE" ]; then
    sed -i "s/__CMS_ID__/$cms/g" "$JS_FILE"
  fi

  # Opcional: inyecta window.CMS_ID en index.html como fallback/legibilidad
  sed -i "s|<head>|<head>\\n    <script>window.CMS_ID='$cms';window.API_BASE='https://$cms.sebastianvernis.workers.dev/api';</script>|" "dist-cms/$cms/index.html"

  CMS_DIR="$REPO_ROOT/$cms"
  ADMIN_DIR="$CMS_DIR/public/admin"

  if [ -d "$ADMIN_DIR" ]; then
    BACKUP_DIR="$CMS_DIR/public/admin-vanilla-backup"
    echo "  Backup admin vanilla → $BACKUP_DIR"
    rm -rf "$BACKUP_DIR"
    cp -a "$ADMIN_DIR" "$BACKUP_DIR"

    echo "  Reemplazando $ADMIN_DIR con build de Hub UI"
    rm -rf "$ADMIN_DIR"
    mkdir -p "$ADMIN_DIR"
    cp -a "dist-cms/$cms/." "$ADMIN_DIR/"
  else
    echo "  ERROR: no existe $ADMIN_DIR"
    exit 1
  fi
done

echo "=== Listo ==="
echo "Builds en: $UI_DIR/dist-cms/"
echo "Admins reemplazados en public/admin de cada CMS"
