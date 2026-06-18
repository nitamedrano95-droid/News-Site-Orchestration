#!/usr/bin/env bash
set -euo pipefail

# Build individual del editor standalone para cada CMS
# Salida: build/<cms>/

cd "$(dirname "$0")/.."

CMS_LIST=(
  "cms-originaux:https://cms-originaux.sebastianvernis.workers.dev/api"
  "cms-nuevos:https://cms-nuevos.sebastianvernis.workers.dev/api"
  "cms-nuevos2:https://cms-nuevos2.sebastianvernis.workers.dev/api"
  "cms-nuevos3:https://cms-nuevos3.sebastianvernis.workers.dev/api"
  "cms-nuevos4:https://cms-nuevos4.sebastianvernis.workers.dev/api"
)

rm -rf build
mkdir -p build

for entry in "${CMS_LIST[@]}"; do
  cms="${entry%%:*}"
  api="${entry##*:}"
  echo "🔨 Building $cms -> $api"
  VITE_CMS_ID="$cms" VITE_API_BASE="$api" npm run build -- --outDir "build/$cms" --emptyOutDir
  # Ensure SPA fallback for /editor/:id deep links on Pages
  cp "build/$cms/index.html" "build/$cms/404.html" 2>/dev/null || true
done

echo "✅ Todos los builds listos en build/"
