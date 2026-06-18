#!/bin/bash
set -e

echo "=== Deploying cms-nuevos4 ==="
cd "$(dirname "$0")"

npm install

wrangler deploy --config wrangler.toml

echo "--- Deploying Admin UI to Pages ---"
wrangler pages deploy public/admin --project-name=cms-admin-nuevos4 --branch=main --commit-dirty=true

echo "=== cms-nuevos4 deployed ==="
echo "Worker API: https://cms-nuevos4.sebastianvernis.workers.dev"
echo "Admin UI:   https://cms-admin-nuevos4.pages.dev"
