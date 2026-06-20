#!/bin/bash
# Build del Hub UI React para cada CMS standalone y copia a public/admin.
set -e

REPO_ROOT="/home/sebastianvernis/projects/News-Site-Orchestration"
UI_DIR="$REPO_ROOT/nexopress-hub-ui"
CMS_LIST=(cms-originaux cms-nuevos cms-nuevos2 cms-nuevos3 cms-nuevos4)

cd "$UI_DIR"

for cms in "${CMS_LIST[@]}"; do
  echo "=== Building admin for $cms ==="
  rm -rf "dist-cms/$cms"
  npx vite build --outDir "dist-cms/$cms" --emptyOutDir

  JS_FILE=$(ls dist-cms/$cms/assets/index-*.js | head -1)
  if [ -f "$JS_FILE" ]; then
    sed -i "s/__CMS_ID__/$cms/g" "$JS_FILE"
  fi

  # SPA 404 fallback
  cp "dist-cms/$cms/index.html" "dist-cms/$cms/404.html"

  # Inyectar window.CMS_ID en index.html
  sed -i "s|<head>|<head>\n    <script>window.CMS_ID='$cms';window.API_BASE='https://$cms.sebastianvernis.workers.dev/api';</script>|" "dist-cms/$cms/index.html"
  sed -i "s|<head>|<head>\n    <script>window.CMS_ID='$cms';window.API_BASE='https://$cms.sebastianvernis.workers.dev/api';</script>|" "dist-cms/$cms/404.html"

  ADMIN_DIR="$REPO_ROOT/$cms/public/admin"
  echo "  Copiando build a $ADMIN_DIR"
  rm -rf "$ADMIN_DIR"
  mkdir -p "$ADMIN_DIR"
  cp -a "dist-cms/$cms/." "$ADMIN_DIR/"
done

echo ""
echo "=== Validación post-build ==="
for cms in "${CMS_LIST[@]}"; do
  JS=$(ls "$REPO_ROOT/$cms/public/admin/assets/index-"*.js | head -1)
  echo "--- $cms ---"
  echo "  CMS_ID literal count: $(grep -oc "$cms" "$JS")"
  echo "  Placeholder residual: $(grep -oc '__CMS_ID__' "$JS")"
  echo "  'Publicar ahora': $(grep -oc 'Publicar ahora' "$JS")"
  echo "  'Sitios de publicación': $(grep -oc 'Sitios de publicación' "$JS")"
  echo "  'Facebook': $(grep -oc 'Facebook' "$JS")"
done
