# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

<!-- gitnexus:start -->
## GitNexus — Code Intelligence

This project is indexed by GitNexus as **cloudflare-news-project** (13951 symbols, 29969 relationships, 300 execution flows). Use the GitNexus MCP tools to understand code, assess impact, and navigate safely.

> If any GitNexus tool warns the index is stale, run `npx gitnexus analyze` in terminal first.

### Always Do

- **MUST run impact analysis before editing any symbol.** Before modifying a function, class, or method, run `gitnexus_impact({target: "symbolName", direction: "upstream"})` and report the blast radius (direct callers, affected processes, risk level) to the user.
- **MUST run `gitnexus_detect_changes()` before committing** to verify your changes only affect expected symbols and execution flows.
- **MUST warn the user** if impact analysis returns HIGH or CRITICAL risk before proceeding with edits.
- When exploring unfamiliar code, use `gitnexus_query({query: "concept"})` to find execution flows instead of grepping. It returns process-grouped results ranked by relevance.
- When you need full context on a specific symbol — callers, callees, which execution flows it participates in — use `gitnexus_context({name: "symbolName"})`.

### When Debugging

1. `gitnexus_query({query: "<error or symptom>"})` — find execution flows related to the issue
2. `gitnexus_context({name: "<suspect function>"})` — see all callers, callees, and process participation
3. `READ gitnexus://repo/cloudflare-news-project/process/{processName}` — trace the full execution flow step by step
4. For regressions: `gitnexus_detect_changes({scope: "compare", base_ref: "main"})` — see what your branch changed

### Self-Check Before Finishing

Before completing any code modification task, verify:
1. `gitnexus_impact` was run for all modified symbols
2. No HIGH/CRITICAL risk warnings were ignored
3. `gitnexus_detect_changes()` confirms changes match expected scope
4. All d=1 (WILL BREAK) dependents were updated

<!-- gitnexus:end -->

## Project Overview

NexoPress is a multi-site news publication system on Cloudflare Workers/Pages managing 60 independent news sites across 4 CMS backends (cms-originaux, cms-nuevos, cms-nuevos2, cms-nuevos3).

- **Portal**: https://nexopress.sebastianvernis.space (entry point to all CMS)
- **Backend**: 4 independent Cloudflare Workers (Hono framework), one per CMS
- **Frontend**: 60 Cloudflare Pages static sites
- **Storage**: D1 (SQLite per CMS), KV (per CMS), R2 (shared images)
- **AI**: OpenRouter (Gemini 2.0 Flash) for article paraphrasing

## Commands

### Worker Development
```bash
# Local dev (per CMS)
cd cms-originaux && wrangler dev --config wrangler.toml
cd cms-nuevos && wrangler dev --config wrangler.toml
cd cms-nuevos2 && wrangler dev --config wrangler.toml
cd cms-nuevos3 && wrangler dev --config wrangler.toml
```

### Worker Deployment
```bash
cd cms-originaux && wrangler deploy --config wrangler.toml
cd cms-nuevos && wrangler deploy --config wrangler.toml
cd cms-nuevos2 && wrangler deploy --config wrangler.toml
cd cms-nuevos3 && wrangler deploy --config wrangler.toml
```

### Pages Deployment (per site)
```bash
cd cms-originaux/sites/[sitio] && wrangler pages deploy . --project-name=[sitio] --branch=master
```

### Database Queries (remote)
```bash
wrangler d1 execute news_db_cms_originaux --command "SELECT COUNT(*) FROM ARTICULOS_PARAFRASEADOS" --remote
wrangler d1 execute news_db_cms_nuevos --command "SELECT COUNT(*) FROM ARTICULOS_PARAFRASEADOS" --remote
```

### Logs
```bash
wrangler tail --name cms-originaux
wrangler tail --name cms-nuevos
```

### System Status
```bash
curl -s https://cms-originaux.sebastianvernis.workers.dev/api/cron/status
curl -s https://cms-originaux.sebastianvernis.workers.dev/api/facebook/monitor
```

## Architecture

Each CMS variant (originaux, nuevos, nuevos2, nuevos3) is a self-contained Worker with:
- **src/index.js** — Worker entry point (Hono router)
- **src/routes/** — API route handlers
- **src/middleware/** — Auth, CORS, OG tags
- **src/cron/** — Scheduled tasks (ingest, Facebook publish)
- **sites/** — Cloudflare Pages sites (static frontend per site)
- **tools/** — Python scripts (news-publisher, AI paraphrase)
- **public/admin/** — SPA dashboard (vanilla JS)

Key execution flow: RSS/Atom ingest → Normalize → AI Paraphrase → Publish to site → Facebook auto-post (every 3 hours).

## GitNexus CLI
- Re-index: `npx gitnexus analyze`
- Check freshness: `npx gitnexus status`