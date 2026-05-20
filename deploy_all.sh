#!/bin/bash
set -e

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║       DESPLIEGUE COMPLETO - WORKERS + CMS + SITES            ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

echo "═══════════════════════════════════════════════════════════════════"
echo "PASO 1: Desplegar Workers CMS + Admin UI"
echo "═══════════════════════════════════════════════════════════════════"
echo ""

echo "🔧 Desplegando cms-originaux..."
cd cms-originaux && ./deploy.sh
./scripts/deploy/deploy_all_sites.sh && cd ..
cd src && wrangler deploy && cd /home/sebastianvernis/ProyectosActivos/cloudflare-news-project/


echo ""
echo "🔧 Desplegando cms-nuevos..."
cd cms-nuevos && ./deploy.sh 
./scripts/deploy/deploy_all_sites.sh && cd ..
cd src && wrangler deploy && cd /home/sebastianvernis/ProyectosActivos/cloudflare-news-project/

echo ""
echo "🔧 Desplegando cms-nuevos2..."
cd cms-nuevos2 && ./deploy.sh 
./scripts/deploy/deploy_all_sites.sh && cd ..
cd src && wrangler deploy && cd /home/sebastianvernis/ProyectosActivos/cloudflare-news-project/

echo ""
echo "🔧 Desplegando cms-nuevos3..."
cd cms-nuevos3 
./scripts/deploy/deploy_all_sites.sh && cd ..
wrangler deploy && cd 

echo ""
echo "═══════════════════════════════════════════════════════════════════"
echo "PASO 2: Desplegar Health Monitor"
echo "═══════════════════════════════════════════════════════════════════"
echo ""
echo "🔧 Desplegando health-monitor..."
cd health-monitor && ./deploy.sh && cd ..

echo ""
echo "═══════════════════════════════════════════════════════════════════"
echo "✅ DESPLIEGUE COMPLETADO"
echo "═══════════════════════════════════════════════════════════════════"
echo ""
echo "📊 Resumen:"
echo "   • 4 Workers CMS desplegados (con Admin UI)"
echo "   • 1 Health Monitor Worker desplegado"
echo "   • $DEPLOYED/$((DEPLOYED + FAILED)) sitios frontend desplegados"
if [ $FAILED -gt 0 ]; then
  echo "   • $FAILED sitios con errores"
fi
echo ""
echo "🌐 Workers:"
echo "   • cms-originaux:  https://cms-originaux.sebastianvernis.workers.dev"
echo "   • cms-nuevos:     https://cms-nuevos.sebastianvernis.workers.dev"
echo "   • cms-nuevos2:    https://cms-nuevos2.sebastianvernis.workers.dev"
echo "   • cms-nuevos3:    https://cms-nuevos3.sebastianvernis.workers.dev"
echo "   • health-monitor: https://health-monitor.sebastianvernis.workers.dev"
echo ""
echo "🖥️  Admin UIs:"
echo "   • https://cms-admin-originaux.pages.dev"
echo "   • https://cms-admin-nuevos.pages.dev"
echo "   • https://cms-admin-nuevos2.pages.dev"
echo "   • https://cms-admin-nuevos3.pages.dev"
