#!/bin/bash
set -e

echo "=== Deploying cms-nuevos3 ==="
cd "$(dirname "$0")"

npm install

wrangler deploy --config wrangler.toml

echo "--- Deploying Admin UI to Pages ---"
wrangler pages deploy public/admin --project-name=cms-admin-nuevos3 --branch=main --commit-dirty=true

echo "=== cms-nuevos3 deployed ==="
echo "Worker API: https://cms-nuevos3.sebastianvernis.workers.dev"
echo "Admin UI:   https://cms-admin-nuevos3.pages.dev"
