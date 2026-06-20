---
name: welcome
description: NexoPress session welcome screen. Invoke at the start of every session to show project health, recent git activity, CMS fleet status, and suggested actions. Trigger: session start, or when user says "status", "what's up", "resumen", "qué hay", or asks for a project overview.
---

# NexoPress Welcome Screen

## Session Start Script

Run `.a5c/scripts/welcome.sh` and display the output.

## What to Show

### Header
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 NexoPress — Multi-CMS Orchestration Platform
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### Git Status (compact)
- Current branch + commits ahead/behind main
- Last 3 commits (hash + message)
- Uncommitted changes count

### CMS Fleet (5 workers)
| Worker | Sites | Status |
|--------|-------|--------|
| cms-originaux | 11 | check wrangler.toml |
| cms-nuevos | 18 | check wrangler.toml |
| cms-nuevos2 | 9 | check wrangler.toml |
| cms-nuevos3 | 33 | check wrangler.toml |
| cms-nuevos4 | 25 (redesign) | check wrangler.toml |

### Quick Health
```bash
# Run health checks
curl -s https://cms-nuevos4.sebastianvernis.workers.dev/api/health | jq .status
```

### Suggested Actions
Based on git state:
- If uncommitted changes: "You have unstaged changes — review with `git diff`"
- If on feature branch: "Working on [branch] — remember no auto-deploy, user does final verify"
- If cms-nuevos4 mentioned in recent commits: "cms-nuevos4 redesign in progress"
- Always: "Run `wrangler tail --name <worker>` to watch live logs"

### Reminders
- No auto-deploy: diagnose, patch, commit. User does `wrangler deploy`.
- D1 migrations must be idempotent (`CREATE TABLE IF NOT EXISTS`)
- Facebook rules: 8-22hs local time, 3h cadence, max 4/day/site
- Paraphrasing: Kimi K2.6 flagship + GLM-5.1 supervisor (not gpt-oss)
