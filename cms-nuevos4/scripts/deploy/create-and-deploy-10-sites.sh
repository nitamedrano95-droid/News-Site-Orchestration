#!/bin/bash

# Set your Cloudflare API token before running:
# export CLOUDFLARE_API_TOKEN="your_token_here"
if [ -z "$CLOUDFLARE_API_TOKEN" ]; then
    echo "❌ Error: CLOUDFLARE_API_TOKEN not set"
    echo "   Run: export CLOUDFLARE_API_TOKEN=\"your_token_here\""
    exit 1
fi

echo "🚀 CREACIÓN Y DESPLIEGUE DE 10 SITIOS DE NOTICIAS"
echo "=================================================="
echo ""

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
SITES_DIR="${SITES_DIR:-$ROOT_DIR/sites}"

create_and_deploy_site() {
    local site_num=$1
    local project_name=$2
    local site_file="$SITES_DIR/site${site_num}.html"
    
    echo "📦 Sitio $site_num: $project_name"
    
    # Crear directorio temporal
    TEMP_DIR="/tmp/wrangler-deploy-$site_num"
    rm -rf "$TEMP_DIR"
    mkdir -p "$TEMP_DIR"
    
    # Copiar archivo HTML
    cp "$site_file" "$TEMP_DIR/index.html"
    
    # Crear _routes.json
    echo '{"version":1,"include":["/*"],"exclude":[]}' > "$TEMP_DIR/_routes.json"
    
    # Intentar crear el proyecto primero
    echo "   📁 Creando proyecto..."
    wrangler pages project create "$project_name" --production-branch=main 2>&1 | grep -E "(success|Created|already)" || true

    # Desplegar
    echo "   🚀 Desplegando..."
    wrangler pages deploy "$TEMP_DIR" --project-name="$project_name" --branch=master 2>&1 | tail -5
    
    # Limpiar
    rm -rf "$TEMP_DIR"
    
    echo ""
}

# Crear y desplegar los 10 sitios
create_and_deploy_site 1 "cronicanacionalmx"
create_and_deploy_site 2 "reportedevanguardia"
create_and_deploy_site 3 "impactodiariomexico"
create_and_deploy_site 4 "bitacorainformativa"
create_and_deploy_site 5 "visionnacionalnoticias"
create_and_deploy_site 6 "contextomexicano"
create_and_deploy_site 7 "focoinformativomx"
create_and_deploy_site 8 "prensaciudadana"
create_and_deploy_site 9 "diarioglobalmexico"
create_and_deploy_site 10 "sintesisinformativa"
create_and_deploy_site 11 "rutanacionalnoticias"
create_and_deploy_site 12 "codigomexico"
create_and_deploy_site 13 "planacentral"
create_and_deploy_site 14 "horizonteinformativo"
create_and_deploy_site 15 "noticiasdeldiamx"
create_and_deploy_site 16 "radarnacional"
create_and_deploy_site 17 "expresodemexico"
create_and_deploy_site 18 "puntocriticonoticias"
create_and_deploy_site 19 "espectromexicano"
create_and_deploy_site 20 "referenteinformativo"
create_and_deploy_site 21 "diariodelarepublica"
create_and_deploy_site 22 "nexoinformativo"
create_and_deploy_site 23 "sintagmanacional"
create_and_deploy_site 24 "enlacediariomexico"
create_and_deploy_site 25 "frenteinformativo"


echo "=================================================="
echo "✅ PROCESO COMPLETADO"
echo "=================================================="
echo ""
echo "🌐 URLs DE LOS SITIOS:"
echo "   1. https://cronicanacionalmx.pages.dev"
echo "   2. https://reportedevanguardia.pages.dev"
echo "   3. https://impactodiariomexico.pages.dev"
echo "   4. https://bitacorainformativa.pages.dev"
echo "   5. https://visionnacionalnoticias.pages.dev"
echo "   6. https://contextomexicano.pages.dev"
echo "   7. https://focoinformativomx.pages.dev"
echo "   8. https://prensaciudadana.pages.dev"
echo "   9. https://diarioglobalmexico.pages.dev"
echo "   10. https://sintesisinformativa.pages.dev"
echo "   11. https://rutanacionalnoticias.pages.dev"
echo "   12. https://codigomexico.pages.dev"
echo "   13. https://planacentral.pages.dev"
echo "   14. https://horizonteinformativo.pages.dev"
echo "   15. https://noticiasdeldiamx.pages.dev"
echo "   16. https://radarnacional.pages.dev"
echo "   17. https://expresodemexico.pages.dev"
echo "   18. https://puntocriticonoticias.pages.dev"
echo "   19. https://espectromexicano.pages.dev"
echo "   20. https://referenteinformativo.pages.dev"
echo "   21. https://diariodelarepublica.pages.dev"
echo "   22. https://nexoinformativo.pages.dev"
echo "   23. https://sintagmanacional.pages.dev"
echo "   24. https://enlacediariomexico.pages.dev"
echo "   25. https://frenteinformativo.pages.dev"
echo ""
