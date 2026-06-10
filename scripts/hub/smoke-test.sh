#!/bin/bash
# scripts/hub/smoke-test.sh — Smoke test del NexoPress Hub
# Correr después del deploy para verificar que todo funciona.

set -e

HUB_URL="${HUB_URL:-https://nexopress-hub.sebastianvernis.workers.dev}"
CMS_URLS=(
  "https://cms-originaux.sebastianvernis.workers.dev"
  "https://cms-nuevos.sebastianvernis.workers.dev"
  "https://cms-nuevos2.sebastianvernis.workers.dev"
  "https://cms-nuevos3.sebastianvernis.workers.dev"
  "https://cms-nuevos4.sebastianvernis.workers.dev"
)

echo "=== NexoPress Hub — Smoke Test ==="
echo ""

# 1. Health check del Hub
echo "1. Health check del Hub..."
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$HUB_URL/api/health")
if [ "$HTTP_CODE" = "200" ]; then
  echo "   ✓ Hub health OK ($HTTP_CODE)"
else
  echo "   ✗ Hub health FAILED ($HTTP_CODE)"
  exit 1
fi

# 2. Health check de los 5 CMSs
echo ""
echo "2. Health check de los CMSs..."
for cms in "${CMS_URLS[@]}"; do
  HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$cms/api/health")
  if [ "$HTTP_CODE" = "200" ]; then
    echo "   ✓ $(basename $cms) OK ($HTTP_CODE)"
  else
    echo "   ✗ $(basename $cms) FAILED ($HTTP_CODE)"
  fi
done

# 3. Test de login (con credenciales de test)
echo ""
echo "3. Test de login..."
if [ -n "$HUB_TEST_EMAIL" ] && [ -n "$HUB_TEST_PASSWORD" ]; then
  RESPONSE=$(curl -s -X POST "$HUB_URL/api/auth/login" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"$HUB_TEST_EMAIL\",\"password\":\"$HUB_TEST_PASSWORD\"}")
  
  if echo "$RESPONSE" | grep -q '"token"'; then
    echo "   ✓ Login OK"
    TOKEN=$(echo "$RESPONSE" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
    echo "   Token: ${TOKEN:0:20}..."
  else
    echo "   ✗ Login FAILED"
    echo "   Response: $RESPONSE"
  fi
else
  echo "   ⊘ Skip (set HUB_TEST_EMAIL y HUB_TEST_PASSWORD para testear)"
fi

# 4. Verificar que los endpoints SEO existen en los CMSs
echo ""
echo "4. Verificar endpoints SEO en CMSs..."
for cms in "${CMS_URLS[@]}"; do
  # Test con un ID inexistente — debería devolver 404, no 500
  HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$cms/api/articles/999999/seo")
  if [ "$HTTP_CODE" = "404" ]; then
    echo "   ✓ $(basename $cms)/api/articles/:id/seo OK (404 como esperado)"
  elif [ "$HTTP_CODE" = "500" ]; then
    echo "   ✗ $(basename $cms)/api/articles/:id/seo ERROR (500)"
  else
    echo "   ? $(basename $cms)/api/articles/:id/seo ($HTTP_CODE)"
  fi
done

# 5. Resumen
echo ""
echo "=== Smoke Test Completado ==="
echo ""
echo "Próximos pasos:"
echo "  1. Entrar a https://nexopress-hub-ui.pages.dev/login"
echo "  2. Loguearse con sebastianvernis@gmail.com"
echo "  3. Crear un artículo de prueba en cms-nuevos4"
echo "  4. Verificar que el panel SEO muestra análisis"
echo "  5. Publicar y verificar OG tags + JSON-LD en el sitio"
echo ""
