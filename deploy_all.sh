#!/bin/bash
# deploy_all.sh — Despliega los 5 Workers CMS + todos los sitios Pages
# Uso: bash deploy_all.sh [--workers-only | --sites-only | --cms <nombre>]

ROOT="$(cd "$(dirname "$0")" && pwd)"

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
RESET='\033[0m'

WORKERS_ONLY=false
SITES_ONLY=false
FILTER_CMS=""

for arg in "$@"; do
  case $arg in
    --workers-only) WORKERS_ONLY=true ;;
    --sites-only)   SITES_ONLY=true ;;
    --cms)          shift; FILTER_CMS="$1" ;;
  esac
done

# Mapa: cms → directorio de sitios
declare -A SITES_DIR
SITES_DIR[cms-originaux]="sites"
SITES_DIR[cms-nuevos]="sites"
SITES_DIR[cms-nuevos2]="sites"
SITES_DIR[cms-nuevos3]="sites"
SITES_DIR[cms-nuevos4]="public"

CMS_LIST=(cms-originaux cms-nuevos cms-nuevos2 cms-nuevos3 cms-nuevos4)

WORKER_OK=0
WORKER_FAIL=0
SITE_OK=0
SITE_FAIL=0

echo ""
echo -e "${BLUE}╔══════════════════════════════════════════════════════╗${RESET}"
echo -e "${BLUE}║   NEXOPRESS — Deploy completo (Workers + Sites)     ║${RESET}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════╝${RESET}"
echo ""

for cms in "${CMS_LIST[@]}"; do
  [ -n "$FILTER_CMS" ] && [ "$FILTER_CMS" != "$cms" ] && continue

  CMS_DIR="$ROOT/$cms"
  if [ ! -d "$CMS_DIR" ]; then
    echo -e "${YELLOW}⚠  $cms: directorio no encontrado, saltando${RESET}"
    continue
  fi

  # ── Worker ────────────────────────────────────────────────────
  if [ "$SITES_ONLY" = false ]; then
    echo -e "${BLUE}━━━ Worker: $cms ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}"
    (
      cd "$CMS_DIR"
      npm install --silent
      wrangler deploy --config wrangler.toml
      wrangler pages deploy "public/admin" \
        --project-name="cms-admin-${cms#cms-}" \
        --branch=main --commit-dirty=true
    ) && {
      echo -e "${GREEN}✓ $cms Worker + Admin desplegados${RESET}"
      WORKER_OK=$((WORKER_OK + 1))
    } || {
      echo -e "${RED}✗ $cms Worker falló${RESET}"
      WORKER_FAIL=$((WORKER_FAIL + 1))
    }
    echo ""
  fi

  # ── Sitios Pages ──────────────────────────────────────────────
  if [ "$WORKERS_ONLY" = false ]; then
    SDIR="${SITES_DIR[$cms]}"
    FULL_SDIR="$CMS_DIR/$SDIR"

    if [ ! -d "$FULL_SDIR" ]; then
      echo -e "${YELLOW}⚠  $cms/$SDIR no encontrado, saltando sitios${RESET}"
      continue
    fi

    echo -e "${BLUE}━━━ Sitios Pages: $cms ($SDIR/) ━━━━━━━━━━━━━━━━━━━━━━━━${RESET}"

    for site_dir in "$FULL_SDIR"/*/; do
      [ -d "$site_dir" ] || continue
      site=$(basename "$site_dir")

      # Saltar admin y backups
      [[ "$site" == admin* ]] && continue
      [[ "$site" == *backup* ]] && continue
      [[ "$site" == _* ]] && continue

      # Debe tener index.html
      [ -f "$site_dir/index.html" ] || continue

      printf "  %-30s " "$site"
      if (cd "$site_dir" && wrangler pages deploy "." \
            --project-name "$site" \
            --branch main 2>&1 | tail -1); then
        echo -e "${GREEN}✓${RESET}"
        SITE_OK=$((SITE_OK + 1))
      else
        echo -e "${RED}✗${RESET}"
        SITE_FAIL=$((SITE_FAIL + 1))
      fi
      sleep 1
    done
    echo ""
  fi
done

# ── Resumen ───────────────────────────────────────────────────────
echo -e "${BLUE}╔══════════════════════════════════════════════════════╗${RESET}"
echo -e "${BLUE}║                  Resumen del deploy                 ║${RESET}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════╝${RESET}"
[ "$SITES_ONLY" = false ]   && echo -e "  Workers:  ${GREEN}$WORKER_OK OK${RESET}  ${RED}$WORKER_FAIL error(es)${RESET}"
[ "$WORKERS_ONLY" = false ] && echo -e "  Sitios:   ${GREEN}$SITE_OK OK${RESET}   ${RED}$SITE_FAIL error(es)${RESET}"
echo ""
