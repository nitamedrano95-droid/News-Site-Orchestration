#!/bin/bash
set -e

cd "$(dirname "$0")"

WRANGLER="wrangler"
if ! command -v "$WRANGLER" &> /dev/null; then
  echo "wrangler not in PATH, trying bun x..."
  WRANGLER="bun x wrangler"
fi

echo "=== Deploying Health Monitor ==="
echo "Using: $WRANGLER"

echo ""
echo "Installing dependencies..."
bun install

echo ""
echo "Creating resources if needed..."
$WRANGLER kv namespace create "health-monitor" 2>/dev/null && echo "  KV created" || echo "  KV already exists"
$WRANGLER d1 create "health-monitor" 2>/dev/null && echo "  D1 created" || echo "  D1 already exists"

echo ""
echo "Applying migrations..."
$WRANGLER d1 execute health-monitor --file=migrations/000_init.sql --remote 2>/dev/null || echo "  Migration may have already run"

echo ""
echo "Deploying worker..."
$WRANGLER deploy --config wrangler.toml

echo ""
echo "=== Health Monitor deployed! ==="
echo "Dashboard: https://health-monitor.sebastianvernis.workers.dev"
echo "API:       https://health-monitor.sebastianvernis.workers.dev/api/status"
