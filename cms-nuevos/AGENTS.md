# NexoPress CMS — Agent Guide

## Overview

NexoPress is a **Cloudflare Workers** application (Hono framework) that manages 17 Spanish-language news sites. It ingests news via RSS → paraphrases with AI → distributes to per-site databases → publishes to Facebook on a timer.

**Deploy target**: `cms-nuevos.sebastianvernis.workers.dev`
**Admin UI**: `cms-admin-nuevos.pages.dev` (static, deployed from `public/admin/`)
**Database**: Cloudflare D1 (`news_db_cms_nuevos`)
**KV**: `ARTICLES_KV` namespace (caching, session storage, Facebook timers)
**Storage**: R2 bucket `cms-news` (image uploads)

---

## Essential Commands

```bash
# Deploy worker + admin UI
bash deploy.sh

# Deploy worker only
wrangler deploy --config wrangler.toml

# Deploy admin UI to Pages
wrangler pages deploy public/admin --project-name=cms-admin-nuevos --branch=main

# Run tests
node --test tests/*.test.cjs

# Apply migrations to D1
wrangler d1 execute news_db_cms_nuevos --file=migrations/000_init_tables.sql --local

# Check D1 data (remote)
wrangler d1 execute news_db_cms_nuevos --command="SELECT * FROM ARTICULOS_PARAFRASEADOS LIMIT 5" --remote

# Inspect KV
wrangler kv:key list --namespace-id=c90aab3a89054141933a28d232e87b6c
wrangler kv:key get --namespace-id=c90aab3a89054141933a28d232e87b6c cron_status
```

---

## Architecture

### Worker Entry (`src/index.js`)
- All paths starting with `/api` → Hono app (route handlers)
- All other paths → `injectMetaTags()` for OG tag injection on article pages
- Cron trigger (`*/30 * * * *`) → `runMasterCron()`

### Route Structure (all under `/api`)
| Route | File | Purpose |
|-------|------|---------|
| `/api/articles` | `routes/articles.js` | List/fetch published articles |
| `/api/cms/*` | `routes/cms.js` | Draft management + direct publish |
| `/api/revision/*` | `routes/revision.js` | Review queue + approval |
| `/api/facebook/*` | `routes/facebook.js` | FB monitoring + force publish |
| `/api/rss/*` | `routes/rss.js` | RSS feeds per site |
| `/api/sites/*` | `routes/sites.js` | Site config + per-site stats |
| `/api/ticker` | `routes/ticker.js` | Ticker data endpoint |
| `/api/cron/*` | `routes/cron.js` | Manual cron trigger |

### Data Flow
1. **RSS Ingest** (`cron/rss-ingest.js`): fetches RSS → scrapes article → cleans HTML → AI paraphrases → inserts into `ARTICULOS_PARAFRASEADOS`
2. **Distribution** (`routes/cms.js` `/publish`): creates rows in each `ARTICULOS_SITIO_{SLUG}` table (SLUG is **uppercase** in SQL)
3. **Facebook Timer** (`cron/facebook.js`): every 6h per site → picks oldest unpublished article → posts to Facebook page → marks `FB_PUBLICADO=1`
4. **Cron** (`cron/master.js`): runs every 30 min → RSS ingest → FB timer → ticker update → saves status to KV

---

## Database Schema

### Core Tables
- **`ARTICULOS_PARAFRASEADOS`** — central article repository; all published paraphrased articles go here
- **`ARTICULOS_CMS`** — CMS drafts with states `BORRADOR` / `PUBLICADO`
- **`REVISION_CONTENIDO`** — review queue; states `PENDIENTE` / `CORREGIDO` / `APROBADO`
- **`SITIOS`** — site configuration (slug, name, domain, FB credentials)
- **`TICKER_HEADLINES`** / **`TICKER_FINANCIALS`** — ticker data
- **`LEGALES`** / **`CANALES_EXTERNOS`** / **`MENUS_NAVEGACION`** — site metadata

### Per-Site Article Tables
Pattern: `ARTICULOS_SITIO_{SLUG}` where SLUG = site identifier **uppercased** (e.g., `ARTICULOS_SITIO_BOOMINFORMATIVO`)

Each row: `ID, ID_PARAFRASEADO, FECHA_ASIGNACION, FB_PUBLICADO, FB_FECHA, FB_POST_ID`

The 17 sites (from `SITIOS_LIST` in config):
```
boominformativo, capitalpress, diarioexpress, elpulsomexicano,
enfoquecapital, enfoquedirecto, formulacdmx, mexicantimes,
mexico360noticias, mradio, noticiashorizonte, pulsodiario,
puntoclave, puntonoticias, radarinformativo, reportediario, televisionabc
```

---

## Key Patterns & Gotchas

### Slug Generation (`articleSlugify`)
Strips media prefixes (La Jornada:, Milenio:, Excélsior:, etc.) before slugifying. This means the same title from different sources produces the same slug, which is intentional for deduplication.

### Auth Middleware (`middleware/auth.js`)
- Returns `true` if: Bearer token matches `ADMIN_TOKEN` env var, OR session exists in KV at `session_{token}`, OR `ADMIN_TOKEN` is **not configured** (open fallback).
- When adding new authenticated endpoints, always use `if (!await checkAuth(c)) return c.json({error:'Unauthorized'},401)`

### Facebook Timer Details (`cron/facebook.js`)
- Interval: 6 hours between posts per site (21600000 ms)
- KV key: `last_fb_post_{siteSlug}` (e.g., `last_fb_post_boominformativo`)
- Respects `FB_PUBLICADO=0` and `FECHA_ASIGNACION >= now '-3 days'`
- Skips articles with `logo.png` or `fallback` in image URL
- Falls back to re-publishing old articles if no pending articles

### Article Resolution Priority (articles.js + shared middleware)
1. Exact SLUG match in `ARTICULOS_PARAFRASEADOS`
2. Exact SLUG match in `ARTICULOS_CMS` (only if `ESTADO='PUBLICADO'`)
3. Legacy slug match in either table
4. Generated slug comparison (for articles with `SLUG IS NULL`)

### CMS Publish (`routes/cms.js`)
- If slug already exists in `ARTICULOS_PARAFRASEADOS`, it **updates** existing row instead of inserting (avoids duplicates)
- Retry loop with up to 3 attempts for UNIQUE constraint failures

### Article Image Filtering
Multiple places filter out `logo.png` and fallback images:
- `FB_PUBLICADO=0 AND p.URL_IMAGEN NOT LIKE '%logo.png%' AND p.URL_IMAGEN NOT LIKE '%fallback%'`
- Always ensure articles have valid images before Facebook publishing

### Site Static Structure (`sites/{slug}/`)
Each of the 17 sites is a static Cloudflare Pages site with:
- `functions/_middleware.js` — attaches DB binding via `setupArticleMiddleware()`
- `functions/api.js` — serves articles from `ARTICULOS_SITIO_{SLUG}` + joins to `ARTICULOS_PARAFRASEADOS`
- `functions/articulo/[slug].js` — serves article pages
- `_middleware.js` uses `resolveArticleBySlug()` which checks `ARTICULOS_PARAFRASEADOS` → `ARTICULOS_CMS` → `LEGACY_SLUG`

### CORS Configuration (`config.js`)
ALLOWED_ORIGINS includes: www domains, non-www domains, pages.dev domains, and localhost variants. Origin matching allows any `.workers.dev` and `.pages.dev` suffix.

### KV Caching
- `rss:{site}` — cached RSS feeds (TTL 30 min)
- `last_fb_post_{site}` — Facebook post timer timestamps
- `session_{token}` — auth sessions
- `cron_status` — last cron run result

---

## Naming Conventions

- Database columns: `SCREAMING_SNAKE_CASE` (e.g., `TITULO_PARAFRASEADO`, `FB_PUBLICADO`)
- Site slugs: `lowercase` (e.g., `boominformativo`, `capitalpress`)
- Per-site SQL tables: `ARTICULOS_SITIO_{UPPERCASE_SLUG}` (e.g., `ARTICULOS_SITIO_CAPITALPRESS`)
- Route modules: lowercase with dashes (e.g., `routes/articles.js`)
- Utility functions: camelCase exports from `utils/helpers.js`
- KV keys: `snake_case` with prefixes (e.g., `last_fb_post_boominformativo`)

---

## Testing Patterns

Tests use Node.js built-in `node:test` module. Test helper at `tests/helpers.cjs` provides `read()`, `exists()`, `list()`, `resolvePath()` for file system access in tests.

Key test file: `tests/article-flow-noticiasobjetivo.test.cjs` — validates slug generation, URL construction, SQL query structure, and OG tag building for the article flow.

---

## Utilities & Scripts

- **`scripts/deploy/deploy.sh`** — primary deploy script
- **`scripts/utilities/serve-admin.js`** / **`serve-local.js`** — local dev servers
- **`scripts/utilities/seed_db.py`** — database seeding
- **`tools/news/`** — news ingestion pipeline tools (RSS, paraphrasing, AI synthesis)
- **`tools/api/`** — API clients (NewsAPI, Gemini, hybrid paraphrasing)
- **`tools/site/`** — site generation and layout tools

Many scripts have `--help` flags and support `--source`, `--query`, `--count` filters.

---

## Environment Variables (Secrets)

Set via `wrangler secret put` or Cloudflare dashboard:
- `ADMIN_TOKEN` — master auth token
- `TELEGRAM_BOT_TOKEN` / `TELEGRAM_CHAT_ID` — notification bot
- `NEWSAPI_KEY` — NewsAPI.org key for headlines
- `FB_PAGE_TOKEN_{SITE}` — per-site FB page access tokens

KV bindings and D1/R2/AI bindings are configured in `wrangler.toml` and available as `env.DB`, `env.ARTICLES_KV`, `env.UPLOADS`, `env.AI` in all route handlers and cron functions.