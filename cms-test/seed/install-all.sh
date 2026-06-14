#!/usr/bin/env bash
# install-all.sh — Instala deps en cada uno de los 6 workers
set -e
ROOT=/home/sebastianvernis/projects/News-Site-Orchestration/cms-test/workers

for w in cms-originaux-test cms-nuevos-test cms-nuevos2-test cms-nuevos3-test cms-nuevos4-test nexopress-hub-test; do
  echo "─── $w ───"
  cd $ROOT/$w
  if [ ! -f package.json ]; then
    echo "  ⚠ no package.json, skip"
    continue
  fi
  npm install --silent 2>&1 | tail -3
done
echo "Done."
