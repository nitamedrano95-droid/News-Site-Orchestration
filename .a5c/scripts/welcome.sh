#!/usr/bin/env bash
# NexoPress session welcome screen
set -euo pipefail

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo " NexoPress — Multi-CMS Orchestration Platform"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Git status
BRANCH=$(git branch --show-current 2>/dev/null || echo "unknown")
AHEAD=$(git rev-list --count @{u}..HEAD 2>/dev/null || echo "?")
BEHIND=$(git rev-list --count HEAD..@{u} 2>/dev/null || echo "?")
DIRTY=$(git status --porcelain 2>/dev/null | wc -l | tr -d ' ')

echo "Git: $BRANCH  [+$AHEAD/-$BEHIND upstream] $([ "$DIRTY" -gt 0 ] && echo "| $DIRTY unstaged changes" || echo "| clean")"
echo ""

# Last 3 commits
echo "Recent commits:"
git log --oneline -3 2>/dev/null | sed 's/^/  /' || true
echo ""

# CMS fleet summary
echo "CMS Fleet:"
echo "  cms-originaux  (11 sites)  cms-nuevos    (18 sites)"
echo "  cms-nuevos2    (9 sites)   cms-nuevos3   (33 sites)"
echo "  cms-nuevos4    (25 sites — redesign in progress)"
echo ""

# Action hints
if [ "$DIRTY" -gt 0 ]; then
  echo "! Uncommitted changes — review with: git diff"
fi
if [ "$BRANCH" != "main" ] && [ "$BRANCH" != "unknown" ]; then
  echo "! On branch '$BRANCH' — remember: no auto-deploy, user does final wrangler deploy"
fi

echo ""
echo "Tips: wrangler tail --name <worker> | wrangler d1 execute <db> --remote --command 'SELECT...'"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
