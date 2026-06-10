# NexoPress Hub Implementation Plan

> **For Hermes:** Use subagent-driven-development to execute task-by-task. Two-stage review per task (spec compliance, then code quality).

**Goal:** Build a unified editorial hub at `hub.sebastianvernis.space` that provides single sign-on across 5 CMS Workers, a TipTap-based article editor with Yoast-style SEO panel, cross-CMS dashboard, and Google News sitemaps. Zero data migration, zero broadcast, editor picks one CMS at a time.

**Architecture:** New Cloudflare Worker `nexopress-hub` (Hono + D1 + KV) acts as SSO broker and proxy. New Cloudflare Pages app at `hub.sebastianvernis.space` (React + Vite + TipTap) is the editor UI. All 5 existing CMSs (`cms-originaux`, `cms-nuevos`, `cms-nuevos2`, `cms-nuevos3`, `cms-nuevos4`) are extended non-destructively with SEO columns, a state machine endpoint, and Hub token validation in their existing auth middleware.

**Tech Stack:** Hono, D1, KV, R2, React, Vite, TipTap, Tailwind, plain JS for SEO utilities (Fernandez-Huerta readability).

**Constraints (HARD):**
- The Hub is a productivity layer, NOT a jail. Every CMS endpoint must remain directly accessible.
- No cross-CMS article creation. One article, one CMS, ever.
- The user has deploy-verdict contract: agent writes code, stops at commit, user deploys and tests in browser.
- Do NOT send user data to external cloud APIs. All Hub logic runs on Cloudflare Workers.
- Existing auth code in 5 CMSs is NOT bit-identical (divergences exist). Touch each one carefully.

**CMS endpoint map (verified):**
| CMS         | Worker URL                                              | Sites  | DB binding      | KV binding    | R2      |
|-------------|---------------------------------------------------------|--------|-----------------|---------------|---------|
| originaux   | cms-originaux.sebastianvernis.workers.dev               | 10     | news_db_cms_originaux | e6ceb0a1... | cms-news |
| nuevos      | cms-nuevos.sebastianvernis.workers.dev                  | 18     | news_db_cms_nuevos    | c90aab3a... | cms-news |
| nuevos2     | cms-nuevos2.sebastianvernis.workers.dev                 | 8      | news_db_cms_nuevos2   | 0d0be368... | cms-news |
| nuevos3     | cms-nuevos3.sebastianvernis.workers.dev                 | 33     | news_db_cms_nuevos3   | (verify)     | cms-news |
| nuevos4     | cms-nuevos4.sebastianvernis.workers.dev                 | 25     | news_db_cms_nuevos4   | (verify)     | cms-news |

**User accounts (verified unique in seed):**
- `sebastianvernis` / `sebastianvernis@gmail.com` / ROL=admin (already exists in all 5 CMSs per AGENTS.md and migrations)
- `Rodrigo` / `rodrigo91230@gmail.com` / ROL=editor (to be created via setup-token flow in all 5 CMSs)

**Out of scope (explicitly):**
- Broadcasting articles across CMSs (YAGNI per user direction)
- Replacing the existing per-CMS admin UIs (the Hub complements, doesn't replace)
- Migrating `nexopress-portal/` (HTML static, will be deprecated, redirects to Hub)
- WordPress or any PHP/Mysql stack (rejected per prior analysis)

---

## Phase 0: Hub foundation (Worker + D1 + KV)

### Task 0.1: Create Hub Worker skeleton

**Files:**
- Create: `nexopress-hub/wrangler.toml`
- Create: `nexopress-hub/package.json`
- Create: `nexopress-hub/src/index.js`
- Create: `nexopress-hub/src/config.js`

**Steps:**
1. Create `nexopress-hub/wrangler.toml` with:
   - name = "nexopress-hub"
   - main = "src/index.js"
   - compatibility_date = "2026-06-10" (today)
   - nodejs_compat flag enabled
   - Observability enabled
   - D1 binding `DB` → `news_db_nexopress_hub` (id to be assigned by user with `wrangler d1 create`)
   - KV binding `HUB_KV` → `hub_sessions` (id to be assigned)
2. Create `package.json` with dependencies: `hono`, `@cloudflare/workers-types`
3. Create `src/index.js` mounting Hono app on `/api` basePath
4. Create `src/config.js` with `CMS_ENDPOINTS` map of 5 CMS Worker URLs

**Verify:** `wrangler dev` runs without errors. `GET /api/health` returns `{status: 'ok'}`.

### Task 0.2: Create Hub D1 schema

**Files:**
- Create: `nexopress-hub/migrations/001_init.sql`

**Steps:**
1. Migration creates 3 tables:
   - `HUB_USERS` (id, username UNIQUE, email, password_hash, display_name, role, cms_access JSON, active, created_at, last_login)
   - `HUB_SESSIONS` (token PK, user_id, created_at, expires_at, ip)
   - `HUB_AUDIT_LOG` (id, user_id, action, cms, target_id, metadata JSON, ts)
2. Insert `sebastianvernis` as admin (password_hash will be set via setup flow on first login)
3. Insert `Rodrigo` as editor (same)
4. Add indexes: `HUB_SESSIONS.expires_at`, `HUB_AUDIT_LOG.ts`

**Verify:** `wrangler d1 migrations apply news_db_nexopress_hub --local` succeeds. Inspect tables with `wrangler d1 execute --command "SELECT name FROM sqlite_master WHERE type='table'"`.

### Task 0.3: Create Hub auth routes

**Files:**
- Create: `nexopress-hub/src/routes/auth.js`
- Create: `nexopress-hub/src/middleware/auth.js`
- Create: `nexopress-hub/src/utils/crypto.js`

**Steps:**
1. `crypto.js`: SHA-256 hash (matches CMS hash format for consistency), constant-time compare helper
2. `auth.js` middleware: validates `Authorization: Bearer <token>` against `HUB_SESSIONS` table
3. `auth.js` routes:
   - `POST /auth/login` — accepts username/email + password, creates `HUB_SESSIONS` row, returns token
   - `GET /auth/me` — returns current user + cms_access
   - `POST /auth/logout` — deletes session
   - `GET /auth/users` (admin only) — list all hub users

**Verify:** `curl -X POST http://localhost:8787/api/auth/login -d '{"username":"sebastianvernis","password":"dev"}'` returns token (since password_hash is null, dev fallback applies for now per existing pattern in CMSs).

### Task 0.4: Create Hub CMS proxy + cross-CMS aggregator

**Files:**
- Create: `nexopress-hub/src/routes/cms.js`
- Create: `nexopress-hub/src/utils/audit.js`

**Steps:**
1. `audit.js`: helper to write to HUB_AUDIT_LOG
2. `cms.js` routes:
   - `GET /cms` — list of 5 CMSs with health (parallel ping of `/api/health` on each, 5s timeout)
   - `GET /cms/:cms/sites` — proxy to CMS's `/api/sites`
   - `GET /cms/:cms/articles` — proxy to CMS's `/api/articles` with query passthrough
   - `GET /cms/:cms/articles/:id` — proxy
   - `POST /cms/:cms/articles` — proxy (reuses user JWT)
   - `PATCH /cms/:cms/articles/:id` — proxy
   - `DELETE /cms/:cms/articles/:id` — proxy
   - `GET /cms/:cms/stats` — proxy
3. Validate that user.cms_access includes the requested CMS, return 403 if not
4. Log every request to HUB_AUDIT_LOG

**Verify:** `curl -H "Authorization: Bearer $TOKEN" http://localhost:8787/api/cms/originaux/articles?limit=5` returns proxied response.

---

## Phase 1: CMS extensions (5 CMSs, non-destructive)

### Task 1.1: Replicate SEO migration to all 5 CMSs

**Files:**
- Create: `cms-originaux/migrations/002_seo_fields.sql`
- Create: `cms-nuevos/migrations/002_seo_fields.sql`
- Create: `cms-nuevos2/migrations/002_seo_fields.sql`
- Create: `cms-nuevos3/migrations/002_seo_fields.sql`
- Create: `cms-nuevos4/migrations/002_seo_fields.sql`

**Steps (per CMS):**
1. `ALTER TABLE ARTICULOS_CMS ADD COLUMN META_TITLE TEXT;`
2. `ALTER TABLE ARTICULOS_CMS ADD COLUMN META_DESCRIPTION TEXT;`
3. `ALTER TABLE ARTICULOS_CMS ADD COLUMN FOCUS_KEYWORD TEXT;`
4. `ALTER TABLE ARTICULOS_CMS ADD COLUMN TAGS TEXT;` (JSON string)
5. `ALTER TABLE ARTICULOS_CMS ADD COLUMN STATE_HISTORY TEXT;` (JSON array)
6. `ALTER TABLE ARTICULOS_CMS ADD COLUMN READING_SCORE INTEGER;`
7. `ALTER TABLE ARTICULOS_CMS ADD COLUMN READING_ANALYSIS TEXT;` (JSON: per-criterion results)
8. Wrap each ALTER in try/catch (idempotent) and CREATE INDEX IF NOT EXISTS on STATE if needed

**Verify:** Run `wrangler d1 migrations apply <DB> --remote` for each. `wrangler d1 execute --command "PRAGMA table_info(ARTICULOS_CMS)"` shows new columns.

### Task 1.2: Add Rodrigo user to all 5 CMSs (idempotent SQL)

**Files:**
- Create: `scripts/onboarding/seed-rodrigo-cms-originaux.sql`
- Create: `scripts/onboarding/seed-rodrigo-cms-nuevos.sql`
- Create: `scripts/onboarding/seed-rodrigo-cms-nuevos2.sql`
- Create: `scripts/onboarding/seed-rodrigo-cms-nuevos3.sql`
- Create: `scripts/onboarding/seed-rodrigo-cms-nuevos4.sql`

**Steps (per file):**
1. `INSERT OR IGNORE INTO USUARIOS (NOMBRE, EMAIL, ROL, ACTIVO) VALUES ('Rodrigo', 'rodrigo91230@gmail.com', 'editor', 1);`

**Verify:** `wrangler d1 execute --command "SELECT NOMBRE, EMAIL, ROL FROM USUARIOS"` includes Rodrigo.

### Task 1.3: Extend each CMS auth middleware to accept Hub tokens

**Files:**
- Modify: `cms-originaux/src/middleware/auth.js`
- Modify: `cms-nuevos/src/middleware/auth.js`
- Modify: `cms-nuevos2/src/middleware/auth.js`
- Modify: `cms-nuevos3/src/middleware/auth.js`
- Modify: `cms-nuevos4/src/middleware/auth.js`

**Steps (per CMS):**
1. In `checkAuth`, before the existing 3 fallbacks, add Hub token check:
   - Read `HUB_API_URL` from env (e.g., `https://nexopress-hub.sebastianvernis.workers.dev`)
   - If token doesn't match `ADMIN_TOKEN` and isn't a local session, POST to `${HUB_API_URL}/auth/validate-token` with body `{token}`
   - If Hub returns `{valid: true, user: {...}}`, accept the request and attach user info
   - Otherwise, fall through to existing logic
2. Add `HUB_API_URL` to each `wrangler.toml` `[vars]` section
3. Cache Hub validation in KV for 60s to avoid hammering the Hub on every request (key: `hub_validated_<token>`)

**Verify:** With a token issued by Hub, `curl -H "Authorization: Bearer $HUB_TOKEN" https://cms-originaux.sebastianvernis.workers.dev/api/articles?limit=1` returns 200 (same as if user logged in directly to CMS).

### Task 1.4: Add SEO + state endpoints to all 5 CMSs

**Files:**
- Modify: `cms-*/src/routes/articles.js` (append new routes, do not change existing)

**Steps (per CMS, identical content):**
1. Add helper function `getArticleForSeo(id, db)` that fetches from `ARTICULOS_CMS WHERE ID = ?`
2. `GET /articles/:id/seo` — returns:
   - All SEO fields (META_TITLE, META_DESCRIPTION, FOCUS_KEYWORD, TAGS, READING_SCORE, READING_ANALYSIS)
   - Computed `readability` (Fernandez-Huerta) on demand if READING_ANALYSIS is null
   - Computed `focusKeywordAnalysis` (density, in-title, in-first-p, in-subheadings, etc.)
   - Generated `schema` (NewsArticle JSON-LD)
3. `POST /articles/:id/seo` (auth required) — upsert SEO fields
4. `POST /articles/:id/state` (auth required) — body `{state, comment}`; validates transition graph; appends to STATE_HISTORY; updates ESTADO field
5. `GET /articles/:id/history` — returns parsed STATE_HISTORY

**Verify:** Create a test article, POST SEO fields, GET back, verify persisted. Change state draft → in_review, verify history grows.

### Task 1.5: Extend `injectMetaTags` to emit JSON-LD NewsArticle

**Files:**
- Modify: `cms-*/src/utils/html.js` (extend, do not break existing OG injection)

**Steps (per CMS):**
1. In the article-rendering branch (after line 204 in cms-nuevos4, analogous in others), append:
   ```js
   `<script type="application/ld+json">${JSON.stringify(newsArticleSchema(article, site))}</script>`
   ```
2. Helper `newsArticleSchema(article, site)` builds the schema using article's META_TITLE, META_DESCRIPTION, TAGS, FECHA_PUBLICACION
3. Only emit if `article.META_DESCRIPTION` or `article.FOCUS_KEYWORD` is set (avoids noise for n8n-generated articles without SEO fields)

**Verify:** Open an article in browser, view source, confirm `<script type="application/ld+json">` with NewsArticle present. Test with Google Rich Results tool.

---

## Phase 2: Hub frontend (Pages app)

### Task 2.1: Pages project skeleton

**Files:**
- Create: `nexopress-hub-ui/` (new sibling dir at repo root)
- Create: `nexopress-hub-ui/package.json`
- Create: `nexopress-hub-ui/vite.config.js`
- Create: `nexopress-hub-ui/tailwind.config.js`
- Create: `nexopress-hub-ui/index.html`
- Create: `nexopress-hub-ui/src/main.jsx`
- Create: `nexopress-hub-ui/src/App.jsx`

**Steps:**
1. `package.json` deps: react, react-dom, react-router-dom, vite, tailwindcss, @tiptap/react, @tiptap/starter-kit, @tiptap/extension-link, @tiptap/extension-image, @tiptap/extension-placeholder
2. `vite.config.js` with React plugin, build target `esnext`
3. `index.html` minimal mount point
4. `App.jsx` with React Router routes: `/login`, `/`, `/cms/:cms`, `/cms/:cms/articles/:id`, `/cms/:cms/new`

**Verify:** `npm install && npm run dev` opens Vite dev server on :5173 with login route.

### Task 2.2: Login page

**Files:**
- Create: `nexopress-hub-ui/src/pages/Login.jsx`
- Create: `nexopress-hub-ui/src/lib/api.js`
- Create: `nexopress-hub-ui/src/lib/auth.js`

**Steps:**
1. `lib/api.js`: `apiFetch(path, opts)` adds `Authorization: Bearer <token>` from localStorage, base URL from `import.meta.env.VITE_HUB_API`
2. `lib/auth.js`: `login(username, password)`, `logout()`, `getCurrentUser()`, token storage
3. `Login.jsx`: form with username + password, error states, redirect to `/` on success

**Verify:** Manual test: enter `sebastianvernis` / dev password, lands on dashboard. Refresh, stays logged in. Logout clears token.

### Task 2.3: Dashboard (cross-CMS overview)

**Files:**
- Create: `nexopress-hub-ui/src/pages/Dashboard.jsx`
- Create: `nexopress-hub-ui/src/components/CmsCard.jsx`
- Create: `nexopress-hub-ui/src/components/StatPill.jsx`

**Steps:**
1. `Dashboard.jsx` fetches `GET /api/cms` (Hub endpoint from Task 0.4) which returns 5 CMSs with health + per-CMS article counts
2. `CmsCard.jsx` shows one CMS as a card: name, sites count, articles 24h, in-review count, health indicator
3. Clicking card navigates to `/cms/:cms`

**Verify:** Manual: dashboard shows 5 cards, each with green/yellow/red status from real CMS health.

### Task 2.4: CMS detail page + article list

**Files:**
- Create: `nexopress-hub-ui/src/pages/CmsDetail.jsx`
- Create: `nexopress-hub-ui/src/components/ArticleList.jsx`
- Create: `nexopress-hub-ui/src/components/StateBadge.jsx`

**Steps:**
1. `CmsDetail.jsx` fetches `GET /api/cms/:cms/articles?limit=50` and renders table with filters by state
2. `ArticleList.jsx` is the table component, columns: title, state, site, updated_at, actions
3. `StateBadge.jsx` color-codes by state (draft gray, in_review yellow, published green, rejected red, archived)
4. "+ Nuevo artículo" button navigates to `/cms/:cms/new`

**Verify:** Navigate to a CMS, see list of articles from real D1 data.

### Task 2.5: TipTap editor + SEO panel

**Files:**
- Create: `nexopress-hub-ui/src/pages/Editor.jsx`
- Create: `nexopress-hub-ui/src/components/TipTapEditor.jsx`
- Create: `nexopress-hub-ui/src/components/SeoPanel.jsx`
- Create: `nexopress-hub-ui/src/lib/seo.js`
- Create: `nexopress-hub-ui/src/lib/readability.js`

**Steps:**
1. `lib/readability.js`: `analyzeReadability(plainText, locale='es')` implementing Fernandez-Huerta (Flesch adapted for Spanish). Returns `{score, level, issues[]}`.
2. `lib/seo.js`: `analyzeFocusKeyword(article, keyword)` returns `{score, checks[]}`.
3. `lib/seo.js`: `generateNewsArticleSchema(article, site)` returns JSON-LD object.
4. `TipTapEditor.jsx`: StarterKit + Link + Image + Placeholder extensions, output HTML on change
5. `SeoPanel.jsx`: right-side panel with focus keyword input, readability gauge, focus keyword checks list, meta title input, meta description input, SERP preview component, OG preview component, schema preview (collapsible JSON-LD)
6. `Editor.jsx`: 2-column layout (editor left, SEO panel right), top toolbar with Save / Submit for review / Publish, autosave every 30s to localStorage

**Verify:** Open editor, type an article, see readability score update live, see focus keyword checklist update as you type, see SERP preview reflect title/description.

### Task 2.6: Sitemap XML endpoint on Hub

**Files:**
- Create: `nexopress-hub/src/routes/seo.js`

**Steps:**
1. `GET /seo/sitemap/:siteSlug` — fetches articles from all CMSs for that site (using CMS_ENDPOINTS + proxy), filters `state='PUBLICADO' AND publishedAt > now - 48h`, generates Google News compatible XML with `<news:news>` namespace
2. Add to `src/index.js` route mounting
3. Returns `Content-Type: application/xml`

**Verify:** `curl https://nexopress-hub.sebastianvernis.workers.dev/api/seo/sitemap/frenteinformativo` returns valid XML. Validate against Google News sitemap spec.

---

## Phase 3: Verification + docs

### Task 3.1: End-to-end smoke test script

**Files:**
- Create: `scripts/hub/smoke-test.sh`

**Steps:**
1. Bash script that:
   - Logs in to Hub
   - Lists 5 CMSs
   - Picks one CMS, creates a test article via Hub proxy
   - Edits the article, sets SEO fields
   - Changes state draft → in_review → published
   - Fetches sitemap for the article's site
   - Cleans up by deleting the test article
2. Exit code 0 = pass

**Verify:** `bash scripts/hub/smoke-test.sh` exits 0 on a fresh deploy.

### Task 3.2: Deploy runbook

**Files:**
- Create: `docs/guides/nexopress-hub-deploy.md`

**Steps:**
1. Sections: prerequisites, D1 creation command, KV creation command, secret setup, deploy order (Hub first, then 5 CMSs with HUB_API_URL var, then frontend)
2. Rollback procedure
3. Troubleshooting (CORS, token validation caching, schema drift between CMSs)

**Verify:** User can deploy by following the doc alone, without asking questions.

---

## Execution order (critical path)

1. Tasks 0.1 → 0.4 (Hub Worker + D1 + auth + proxy) — **deployable end of phase 0**
2. Tasks 1.1 → 1.2 (migrations, user seed) — **safe to run, no code changes**
3. Tasks 1.3 → 1.5 (CMS auth extension + SEO endpoints + schema injection) — **deploy 5 CMSs in order**
4. Tasks 2.1 → 2.6 (frontend Pages app) — **deploy frontend last**
5. Tasks 3.1 → 3.2 (smoke test + docs)

## What stays out (defer)

- Multilingual Hub UI (es-MX only)
- Audit log visualization in Hub (data captured, no UI yet)
- Sitemap per-site historical view (only current)
- Bulk operations in editor (one article at a time)
- TipTap collaboration / multi-user editing
- Schema.org validation against Google Rich Results in CI

## Key code references (verified, do not lose)

- Auth pattern: `cms-nuevos4/src/routes/auth.js:202-266` (byte-similar in 5 CMSs, but verify each)
- Auth middleware: `cms-nuevos4/src/middleware/auth.js` (KV session check)
- Articles endpoint: `cms-nuevos4/src/routes/articles.js:1-513`
- OG meta injection: `cms-nuevos4/src/utils/html.js:137-220`
- Portal HTML to deprecate: `nexopress-portal/index.html` (35 sites hardcoded, missing cms-nuevos3 and cms-nuevos4)
- Sites config: `cms-nuevos4/src/config.js:99-166` (SITIOS_LIST)
