#!/bin/bash
# fix_facebook_links.sh — Actualiza posts recientes de todos los sitios CMS Nuevos
# Uso: ./fix_facebook_links.sh [horas]
# Default: 72 horas (3 días)

HOURS=${1:-72}
TOKEN="17f616e5c86c4988d2f6a6955ba9a98bc3c7ddda4c3557286ba3b80f8aa76291"
BASE_URL="https://cms-nuevos.sebastianvernis.workers.dev/api/facebook"

SITIOS=(
  "boominformativo" "capitalpress" "diarioexpress" "elpulsomexicano"
  "enfoquecapital" "enfoquedirecto" "formulacdmx" "mexicantimes"
  "mexico360noticias" "mradio" "noticiashorizonte" "pulsodiario"
  "puntoclave" "puntonoticias" "radarinformativo" "reportediario"
  "televisionabc"
)

echo "============================================================"
echo " FIX FACEBOOK LINKS — CMS Nuevos (${#SITIOS[@]} sitios)"
echo " Rango: últimas ${HOURS} horas"
echo "============================================================"
echo ""

TOTAL_UPDATED=0
TOTAL_FAILED=0

for sitio in "${SITIOS[@]}"; do
  printf "📌 %-25s → " "$sitio"

  result=$(curl -s -X POST "${BASE_URL}/update-recent/${sitio}?hours=${HOURS}" \
    -H "Authorization: Bearer ${TOKEN}")

  success=$(echo "$result" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('success','false'))" 2>/dev/null)
  updated=$(echo "$result" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('results',{}).get('updated',0))" 2>/dev/null)
  failed=$(echo "$result" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('results',{}).get('failed',0))" 2>/dev/null)

  if [ "$success" = "True" ]; then
    echo "✅ ${updated} updated, ${failed} failed"
    TOTAL_UPDATED=$((TOTAL_UPDATED + updated))
    TOTAL_FAILED=$((TOTAL_FAILED + failed))
  else
    error_msg=$(echo "$result" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('error','unknown'))" 2>/dev/null)
    echo "⚠️  ${error_msg}"
  fi

  # Delay entre sitios para evitar rate limiting
  sleep 1
done

echo ""
echo "============================================================"
echo " TOTAL: ${TOTAL_UPDATED} posts updated, ${TOTAL_FAILED} failed"
echo "============================================================"
