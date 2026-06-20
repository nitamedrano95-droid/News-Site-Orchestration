#!/usr/bin/env bash
# deploy_distribucion.sh
# Aplica migraciones + despliega los 4 CMS workers con distribución shuffle/anti-colisión
set -e

echo "============================================"
echo " Migrando schema de distribución a D1s"
echo "============================================"

# Migrar en cada D1
for db in "news_db_cms_nuevos" "news_db_cms_nuevos2" "news_db_cms_nuevos3"; do
  echo ">>> $db"
  npx wrangler d1 execute "$db" --remote --file=docs/migrations/schema_distribucion.sql
done

# cms-originaux usa news_api_db
echo ">>> news_api_db"
npx wrangler d1 execute news_api_db --remote --file=docs/migrations/schema_distribucion.sql

echo ""
echo "============================================"
echo " Desplegando CMS workers"
echo "============================================"

for cms in cms-originaux cms-nuevos cms-nuevos2 cms-nuevos3; do
  echo ">>> Desplegando $cms"
  cd "$cms"
  npx wrangler deploy
  cd ..
done

echo ""
echo "============================================"
echo " Verificando endpoints"
echo "============================================"
export NO_PROXY='*'
TOKEN="17f616e5c86c4988d2f6a6955ba9a98bc3c7ddda4c3557286ba3b80f8aa76291"

for cms in "news-api" "cms-nuevos" "cms-nuevos2" "cms-nuevos3"; do
  URL="https://${cms}.sebastianvernis.workers.dev/api/jobs/ingest/global"
  echo -n ">>> $cms /ingest/global: "
  curl -s -o /dev/null -w "%{http_code}" \
    -X POST "$URL" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"articles":[],"fuente":"test"}'
  echo ""
done
