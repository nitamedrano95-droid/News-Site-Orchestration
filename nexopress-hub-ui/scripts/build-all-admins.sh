#!/bin/bash
# Build del Hub UI React para cada CMS standalone y copia a public/admin.
#
# Estrategia de inyección de CMS_ID (en orden de prioridad en runtime):
#  1. window.CMS_ID      ← inyectado por este script en <head>
#  2. import.meta.env.VITE_CMS_ID ← reemplazado por Vite con variable de
#                                   entorno VITE_CMS_ID al hacer build
#  3. Fallback ''         ← evita el placeholder literal (causa 404s)
#
# Vite reemplaza automáticamente cualquier referencia a
# `import.meta.env.VITE_CMS_ID` en compile time cuando esa variable está
# definida en el ambiente, por lo que el bundle final contiene el ID
# hardcodeado como red de seguridad si la inyección de window.CMS_ID
# falla.
set -euo pipefail

REPO_ROOT="/home/sebastianvernis/projects/News-Site-Orchestration"
UI_DIR="$REPO_ROOT/nexopress-hub-ui"
CMS_LIST=(cms-originaux cms-nuevos cms-nuevos2 cms-nuevos3 cms-nuevos4)

cd "$UI_DIR"

BUILD_FAILED=0

for cms in "${CMS_LIST[@]}"; do
  echo "=== Building admin for $cms ==="
  rm -rf "dist-cms/$cms"
  if ! VITE_CMS_ID="$cms" npx vite build \
        --outDir "dist-cms/$cms" \
        --emptyOutDir; then
    echo "  X Vite build falló para $cms"
    BUILD_FAILED=1
    continue
  fi

  JS_FILE=$(ls dist-cms/$cms/assets/index-*.js | head -1)
  if [ ! -f "$JS_FILE" ]; then
    echo "  X No se encontró el bundle JS en dist-cms/$cms/assets/"
    BUILD_FAILED=1
    continue
  fi

  # Red de seguridad: por si quedó un literal (formato __CMS_ID__)
  # embebido en el bundle (comentarios, strings estáticos, etc.), lo
  # reemplazamos aquí también.
  if grep -q "__CMS_ID__" "$JS_FILE"; then
    echo "  -> sed del placeholder CMS_ID -> $cms (red de seguridad)"
    sed -i "s/__CMS_ID__/$cms/g" "$JS_FILE"
  fi

  # SPA 404 fallback
  cp "dist-cms/$cms/index.html" "dist-cms/$cms/404.html"

  # Inyectar window.CMS_ID y window.API_BASE en index.html y 404.html
  for html in "dist-cms/$cms/index.html" "dist-cms/$cms/404.html"; do
    if [ ! -f "$html" ]; then continue; fi
    # Quita cualquier inyección previa para no duplicar el <script>
    sed -i '/<script>window\.CMS_ID=/d' "$html"
    sed -i "s|<head>|<head>\n    <script>window.CMS_ID='$cms';window.API_BASE='https://$cms.sebastianvernis.workers.dev/api';</script>|" "$html"
  done

  ADMIN_DIR="$REPO_ROOT/$cms/public/admin"
  echo "  Copiando build a $ADMIN_DIR"
  rm -rf "$ADMIN_DIR"
  mkdir -p "$ADMIN_DIR"
  cp -a "dist-cms/$cms/." "$ADMIN_DIR/"
done

echo ""
echo "=== Validación post-build ==="
VALIDATION_FAILED=0
for cms in "${CMS_LIST[@]}"; do
  JS=$(ls "$REPO_ROOT/$cms/public/admin/assets/index-"*.js 2>/dev/null | head -1)
  HTML="$REPO_ROOT/$cms/public/admin/index.html"
  echo "--- $cms ---"
  if [ ! -f "$JS" ]; then
    echo "  X Falta el bundle JS"
    VALIDATION_FAILED=1
    continue
  fi
  PLACEHOLDER=$(grep -oc '__CMS_ID__' "$JS" || true)
  INLINE=$(grep -c 'window.CMS_ID' "$HTML" || true)
  EMBEDDED=$(grep -oc "VITE_CMS_ID:\"$cms\"" "$JS" || true)
  echo "  Placeholder residual: $PLACEHOLDER (debe ser 0)"
  echo "  window.CMS_ID en HTML: $INLINE (debe ser >= 1)"
  echo "  VITE_CMS_ID embebido: $EMBEDDED (debe ser >= 1)"
  if [ "$PLACEHOLDER" -ne 0 ] || [ "$INLINE" -lt 1 ] || [ "$EMBEDDED" -lt 1 ]; then
    echo "  X Validación FALLÓ para $cms"
    VALIDATION_FAILED=1
  else
    echo "  OK"
  fi
done

if [ "$BUILD_FAILED" -ne 0 ] || [ "$VALIDATION_FAILED" -ne 0 ]; then
  echo ""
  echo "X Build con errores. NO hacer deploy hasta corregir."
  exit 1
fi

echo ""
echo "Todos los admin builds pasaron validación."
