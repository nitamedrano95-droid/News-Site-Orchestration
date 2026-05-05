# Project Summary

## Overall Goal
Multi-site Spanish news CMS platform running on Cloudflare Workers (Hono framework), managing 63+ news websites across 5 CMS instances: cms-nuevos3 (25 sitios, principal), cms-nuevos (18), cms-nuevos2 (9), cms-originaux (11), y cms-selector (frontend estático). Implementa OAuth Facebook, RSS ingestion, y multi-site content management con D1 SQLite.

## Key Knowledge

- **Project Root:** `/home/sebastianvernis/ProyectosActivos/cloudflare-news-project`
- **Tech Stack:** Cloudflare Workers, Hono framework, Wrangler, D1 SQLite, KV, R2, AI Binding
- **CMS Instances & Sites:**
  | CMS | Sitios | Worker | Estado |
  |-----|--------|--------|--------|
  | cms-nuevos3 | 25 | cms-nuevos3 | Desplegado ✓ |
  | cms-nuevos | 18 | — | Desarrollo |
  | cms-nuevos2 | 9 | — | Desarrollo |
  | cms-originaux | 11 | — | Desarrollo |
  | cms-selector | — | — | Frontend estático |

- **cms-nuevos3 Resources:** 
  - D1 Database: `news_db_cms_nuevos3`
  - KV Namespace: `ARTICLES_KV` 
  - R2 Bucket: `cms-news`
  - AI Binding: Activo

- **Core Directories (cada CMS con src/):**
  - `src/config.js` — Configuración de sitios (dominios, tagline)
  - `src/routes/` — Endpoints: articles, auth, categories, cms, facebook, rss, sites, stats, ticker, weather
  - `src/cron/` — Tareas programadas: facebook, master, rss-ingest, ticker
  - `sites/{siteId}/` — Archivos por sitio (admin, public)

- **Deployment:** `wrangler.toml` en cada CMS con wrangler deploy
- **Development:** `npm run dev` (local), `npm run deploy` (producción)

## Recent Actions

- **2026-04-24 22:44** — Project summary actualizado con estado real de 5 CMS instances
- **Commit 568fba8** — Mejorado RSS feed fallback logic con explicit empty check
- **Commit 342a052** — Facebook OAuth: activar fallback a feeds legacy cuando FUENTES vacía (cms-nuevos, cms-nuevos2, cms-originaux)
- **Commit d25749f** — Nuevo (commit message indeterminado)
- **cms-nuevos3 deployado** con 25 sitios mexicanos en producción (news_db_cms_nuevos3)
- **Facebook OAuth implementado** en routes y cron de 3 CMS con `/oauth/start`, `/oauth/callback`, `/oauth/start-all`
- **Cambios sin commitear:**
  - `cms-nuevos|nuevos2|originaux/src/routes/facebook.js` (M)
  - `cms-nuevos|nuevos2|originaux/src/cron/facebook.js` (M)
  - Múltiples `oauth-authorize-all.html` en `sites/*/admin/` (sin trackear)
  - Directorio `cms-nuevos3/` (nuevo, requiere `git add`)

## Current Plan (Pending Tasks)

### Fase 1: Consolidación de cambios en git
1. [TODO] **Commit cms-nuevos3** — `git add cms-nuevos3/` y commit (25 sitios + wrangler.toml + config + migrations)
2. [TODO] **Commit Facebook OAuth changes** — 6 archivos modificados en cms-nuevos|nuevos2|originaux (cron + routes)
3. [TODO] **Add oauth-authorize-all.html** — Trackear archivos admin html generados en cada sitio

### Fase 2: Facebook Integration (en progreso)
- [DONE] OAuth endpoints `/oauth/start`, `/oauth/callback`, `/oauth/start-all` implementados en 3 CMS
- [DONE] D1 migration `FACEBOOK_PAGE_TOKEN` en 3 CMS
- [DONE] Secrets `FB_APP_ID`, `FB_APP_SECRET` configurados en Cloudflare
- [TODO] Mapeo de 25 sitios cms-nuevos3 a Facebook Pages (extraer page tokens)
- [TODO] Validar long-lived tokens con Graph API
- [TODO] Bulk insert en tabla SITIOS con FACEBOOK_ACTIVO=1

### Fase 3: Testing & Validation
- [TODO] Test OAuth flow end-to-end en cms-nuevos3
- [TODO] Verificar que rss-ingest usa page token para mejorar feed quality
- [TODO] Validar que fallback a feeds legacy funciona cuando FB_PAGE_TOKEN vacío

**25 Sitios en cms-nuevos3:**
actualidadsinfronteras, adnmexicano, aztecamexiconoticias, diariomexicano, diariomexico, elanalisismexicano, elobservadorrepublicano, elprofetamexicano, enfoquemexicano, expresomexicano, financemarketsmx, mexicannewsoftheworld, mexicoandtheworld, mexicodaily, mexicoenresumen, mexicoplus, monitorrepublicano, nacionalinstante, noticiasalinstante, perspectivamexicana, politicasalvajealminuto, pulsorepublicanonoticias, radioredmx, republicamx, wenewsmexico

---

## Summary Metadata
**Update time**: 2026-04-24T20:15:00Z
**Updated by**: Claude Code (plan mode)
**Changes**: Updated structure, deployment status, pending tasks, and site counts across 5 CMS instances 
