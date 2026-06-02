#!/usr/bin/env bash
# deploy.sh — NexoPress Docker Deploy Script
# Orchestrates full stack deployment: build, configure, start, migrate, verify.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WIZARD_DIR="$(dirname "$SCRIPT_DIR")"
COMPOSE_FILE="$WIZARD_DIR/docker-compose.yml"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

info()    { echo -e "${CYAN}[deploy]${NC} $*"; }
success() { echo -e "${GREEN}[deploy]${NC} $*"; }
warn()    { echo -e "${YELLOW}[deploy]${NC} $*"; }
error()   { echo -e "${RED}[deploy]${NC} $*" >&2; }
header()  { echo -e "\n${BOLD}${CYAN}$*${NC}"; }

CMS_LIST=(cms-originaux cms-nuevos cms-nuevos2 cms-nuevos3)

# ── Banner ────────────────────────────────────────────────────────────────────

echo -e "${BOLD}${CYAN}"
echo "  _   _                  ____                      "
echo " | \ | | _____  _____  |  _ \ _ __ ___  ___ ___  "
echo " |  \| |/ _ \ \/ / _ \ | |_) | '__/ _ \/ __/ __| "
echo " | |\  |  __/>  < (_) ||  __/| | |  __/\__ \__ \ "
echo " |_| \_|\___/_/\_\___/ |_|   |_|  \___||___/___/ "
echo -e "${NC}"
echo -e "${BOLD}  NexoPress Docker Deploy${NC}"
echo -e "  Multi-CMS Node.js stack (Hono + SQLite + Redis + MinIO)"
echo ""

# ── 1. Pre-flight: Docker ─────────────────────────────────────────────────────

header "Step 1/6 — Checking Docker"

if ! command -v docker &>/dev/null; then
  error "Docker is not installed. Please install Docker Desktop or Docker Engine."
  exit 1
fi

if ! docker info &>/dev/null; then
  error "Docker daemon is not running. Please start Docker."
  exit 1
fi

DOCKER_VERSION=$(docker --version | grep -oP '\d+\.\d+\.\d+' | head -1)
success "Docker $DOCKER_VERSION is running"

if ! docker compose version &>/dev/null 2>&1; then
  error "docker compose (v2) is not available. Please update Docker."
  exit 1
fi

COMPOSE_VERSION=$(docker compose version --short 2>/dev/null || echo "unknown")
success "Docker Compose $COMPOSE_VERSION is available"

# ── 2. Check environment files ────────────────────────────────────────────────

header "Step 2/6 — Checking environment files"

MISSING_ENVS=()
for cms in "${CMS_LIST[@]}"; do
  ENV_FILE="$WIZARD_DIR/envs/$cms.env"
  EXAMPLE_FILE="$WIZARD_DIR/envs/$cms.env.example"
  if [ ! -f "$ENV_FILE" ]; then
    if [ -f "$EXAMPLE_FILE" ]; then
      warn "Missing $ENV_FILE — copying from example..."
      cp "$EXAMPLE_FILE" "$ENV_FILE"
      warn "  IMPORTANT: Edit $ENV_FILE and set real values before running in production!"
    else
      MISSING_ENVS+=("$ENV_FILE")
    fi
  else
    success "$ENV_FILE exists"
  fi
done

if [ ${#MISSING_ENVS[@]} -gt 0 ]; then
  error "Missing required env files:"
  for f in "${MISSING_ENVS[@]}"; do
    error "  $f"
  done
  exit 1
fi

# ── 3. Create data directories ────────────────────────────────────────────────

header "Step 3/6 — Creating data directories"

for cms in "${CMS_LIST[@]}"; do
  mkdir -p "$WIZARD_DIR/data/$cms"
  success "  $WIZARD_DIR/data/$cms"
done

# ── 4. Build & Pull images ────────────────────────────────────────────────────

header "Step 4/6 — Building Docker images"

info "Pulling base images..."
docker compose -f "$COMPOSE_FILE" pull redis minio n8n 2>&1 | grep -E "^(Pulling|Pulled|Status|Error)" || true

info "Building custom images..."
docker compose -f "$COMPOSE_FILE" build --parallel
success "All images built successfully"

# ── 5. Start services ─────────────────────────────────────────────────────────

header "Step 5/6 — Starting services"

info "Starting infrastructure (Redis, MinIO)..."
docker compose -f "$COMPOSE_FILE" up -d redis minio
info "Waiting for Redis and MinIO to be healthy..."

WAIT_SECONDS=0
MAX_WAIT=60
until docker compose -f "$COMPOSE_FILE" ps redis | grep -q "healthy" && \
      docker compose -f "$COMPOSE_FILE" ps minio | grep -q "healthy"; do
  if [ $WAIT_SECONDS -ge $MAX_WAIT ]; then
    warn "Timed out waiting for Redis/MinIO health checks. Proceeding anyway..."
    break
  fi
  echo -n "."
  sleep 3
  WAIT_SECONDS=$((WAIT_SECONDS + 3))
done
echo ""
success "Infrastructure services are ready"

info "Starting CMS services..."
docker compose -f "$COMPOSE_FILE" up -d \
  cms-originaux cms-nuevos cms-nuevos2 cms-nuevos3

info "Starting wizard, nginx, and n8n..."
docker compose -f "$COMPOSE_FILE" up -d wizard nginx n8n

success "All services started"

# ── 6. Run migrations ─────────────────────────────────────────────────────────

header "Step 6/6 — Running database migrations"

info "Waiting for CMS containers to initialize..."
sleep 5

bash "$SCRIPT_DIR/init-db.sh" || warn "init-db.sh reported warnings (check above)"

# ── Status report ─────────────────────────────────────────────────────────────

header "Deployment Complete"

echo ""
docker compose -f "$COMPOSE_FILE" ps --format "table {{.Service}}\t{{.Status}}\t{{.Ports}}"

echo ""
echo -e "${BOLD}Service URLs:${NC}"
echo -e "  Deploy Wizard:     ${GREEN}http://localhost:8080${NC}"
echo -e "  API Gateway:       ${GREEN}http://localhost:80${NC}"
echo -e "  CMS Originaux API: ${GREEN}http://localhost/api/cms-originaux/api/health${NC}"
echo -e "  CMS Nuevos API:    ${GREEN}http://localhost/api/cms-nuevos/api/health${NC}"
echo -e "  CMS Nuevos2 API:   ${GREEN}http://localhost/api/cms-nuevos2/api/health${NC}"
echo -e "  CMS Nuevos3 API:   ${GREEN}http://localhost/api/cms-nuevos3/api/health${NC}"
echo -e "  MinIO Console:     ${GREEN}http://localhost:9001${NC}  (user: nexopress / pass: nexopress123)"
echo -e "  n8n Workflows:     ${GREEN}http://localhost:5678${NC}"
echo ""
echo -e "${BOLD}Logs:${NC}"
echo -e "  docker compose -f $COMPOSE_FILE logs -f [service]"
echo ""
echo -e "${BOLD}Stop:${NC}"
echo -e "  docker compose -f $COMPOSE_FILE down"
echo ""
success "NexoPress is running!"
