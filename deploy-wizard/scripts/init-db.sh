#!/usr/bin/env bash
# init-db.sh — Initialize SQLite databases for all CMS instances
# Runs migrations from each CMS's migrations/ directory using sqlite3 CLI.
# Safe to re-run: migrations use CREATE TABLE IF NOT EXISTS guards.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WIZARD_DIR="$(dirname "$SCRIPT_DIR")"
REPO_DIR="$(dirname "$WIZARD_DIR")"
DATA_DIR="$WIZARD_DIR/data"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

info()    { echo -e "${CYAN}[init-db]${NC} $*"; }
success() { echo -e "${GREEN}[init-db]${NC} $*"; }
warn()    { echo -e "${YELLOW}[init-db]${NC} $*"; }
error()   { echo -e "${RED}[init-db]${NC} $*" >&2; }

CMS_LIST=(cms-originaux cms-nuevos cms-nuevos2 cms-nuevos3)

# ── Pre-flight checks ────────────────────────────────────────────────────────

if ! command -v sqlite3 &>/dev/null; then
  warn "sqlite3 CLI not found. Attempting to run migrations inside Docker containers instead."
  USE_DOCKER=true
else
  USE_DOCKER=false
fi

# ── Create data directories ───────────────────────────────────────────────────

info "Creating data directories under $DATA_DIR..."
for cms in "${CMS_LIST[@]}"; do
  mkdir -p "$DATA_DIR/$cms"
  success "  $DATA_DIR/$cms"
done

# ── Run migrations ────────────────────────────────────────────────────────────

for cms in "${CMS_LIST[@]}"; do
  info "Initializing database for $cms..."

  DB_FILE="$DATA_DIR/$cms/cms.db"
  MIGRATIONS_DIR="$REPO_DIR/$cms/migrations"

  if [ ! -d "$MIGRATIONS_DIR" ]; then
    warn "  No migrations directory found at $MIGRATIONS_DIR, skipping $cms."
    continue
  fi

  SQL_FILES=$(find "$MIGRATIONS_DIR" -name "*.sql" | sort)
  if [ -z "$SQL_FILES" ]; then
    warn "  No .sql files found in $MIGRATIONS_DIR, skipping $cms."
    continue
  fi

  if [ "$USE_DOCKER" = true ]; then
    # Run migrations via the adapter's built-in migration runner
    info "  Running migrations via Docker for $cms..."
    if docker compose -f "$WIZARD_DIR/docker-compose.yml" exec -T "$cms" \
        node -e "import('./adapter.js').then(m => m.runMigrations()).then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); })" 2>&1; then
      success "  Migrations applied for $cms via Docker."
    else
      warn "  Docker migration attempt failed for $cms. Try: docker compose exec $cms node -e \"import('./adapter.js').then(m=>m.runMigrations())\""
    fi
  else
    # Create tracking table
    sqlite3 "$DB_FILE" "CREATE TABLE IF NOT EXISTS _migrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      filename TEXT UNIQUE NOT NULL,
      applied_at TEXT DEFAULT CURRENT_TIMESTAMP
    );"

    while IFS= read -r sql_file; do
      filename="$(basename "$sql_file")"
      already_applied=$(sqlite3 "$DB_FILE" "SELECT COUNT(*) FROM _migrations WHERE filename='$filename';")

      if [ "$already_applied" -gt 0 ]; then
        info "  Skipping (already applied): $filename"
        continue
      fi

      info "  Applying: $filename"
      if sqlite3 "$DB_FILE" < "$sql_file" 2>&1; then
        sqlite3 "$DB_FILE" "INSERT OR IGNORE INTO _migrations (filename) VALUES ('$filename');"
        success "  Applied: $filename"
      else
        warn "  Error applying $filename (non-fatal, may already exist)."
        sqlite3 "$DB_FILE" "INSERT OR IGNORE INTO _migrations (filename) VALUES ('$filename');" 2>/dev/null || true
      fi
    done <<< "$SQL_FILES"

    success "Migrations complete for $cms → $DB_FILE"
  fi
done

echo ""
success "All databases initialized."
info "Database files:"
for cms in "${CMS_LIST[@]}"; do
  DB_FILE="$DATA_DIR/$cms/cms.db"
  if [ -f "$DB_FILE" ]; then
    SIZE=$(du -sh "$DB_FILE" | cut -f1)
    success "  $DB_FILE ($SIZE)"
  else
    warn "  $DATA_DIR/$cms/cms.db (not created yet)"
  fi
done
