# NexoPress — Directrices canónicas para agentes de IA

> **Single source of truth** para toda IA que trabaje en este repo
> (Claude Code, Cursor, Continue, Aider, Hermes, etc.). Cualquier otro
> `AGENTS.md` / `CLAUDE.md` / `GEMINI.md` / `QWEN.md` en el repo es un
> duplicado histórico que se conserva solo en `docs/archive/` para
> trazabilidad.

**Última revisión:** 2026-06-10
**Stack activo:** Cloudflare Workers (Hono) + D1 + KV + R2 + Pages ·
Ollama Cloud (paraphrasing + supervision) · n8n (orquestación de ingesta)
**Sitios en producción:** ~96 sitios distribuidos en 5 CMS Workers
**Sitio en rediseño:** `cms-nuevos4` (pendiente nueva plantilla)

---

## 1. Identidad y objetivos del proyecto

**NexoPress** es una plataforma de noticias multi-sitio sobre Cloudflare.
Orquesta ~96 sitios de noticias en español (México) desde un único
panel editorial y un núcleo distribuido.

**Características invariantes (no cambiar sin discusión previa):**
- Cada artículo vive en **un solo CMS** (no hay broadcast entre Workers).
- Cada sitio es un **Cloudflare Pages project** con su propio dominio
  `.pages.dev` o dominio custom.
- El **Hub** (`nexopress-hub`) es una capa de orquestación, **no** un
  reemplazo de los CMS individuales.
- El parafraseo de artículos se hace con **Ollama Cloud** (Kimi K2.6
  flagship, GLM-5.1 supervisora). Branches legacy de OpenRouter/Gemini
  se conservan en el código pero no se usan en flujos activos.
- La publicación a Facebook tiene reglas duras (ver §7).

---

## 2. Arquitectura

### 2.1 Los 5 CMS Workers (datos + API)

| Worker              | Sitios | DB                        | KV              | R2        |
|---------------------|--------|---------------------------|-----------------|-----------|
| `cms-originaux`     | 11     | `news_db_cms_originaux`   | `ARTICLES_KV`   | `cms-news`|
| `cms-nuevos`        | 18     | `news_db_cms_nuevos`      | `ARTICLES_KV`   | `cms-news`|
| `cms-nuevos2`       | 9      | `news_db_cms_nuevos2`     | `ARTICLES_KV`   | `cms-news`|
| `cms-nuevos3`       | 33     | `news_db_cms_nuevos3`     | `ARTICLES_KV`   | `cms-news`|
| `cms-nuevos4`       | 25 (a redefinir) | `news_db_cms_nuevos4` | `ARTICLES_KV` | `cms-news` |

Todos usan el mismo stack: **Hono** + **D1** (SQLite) + **KV** + **R2**.

### 2.2 El Hub (orquestación + SSO)

```
nexopress-hub (Worker)
  ├─ D1: nexopress-hub-db
  │    tablas: hub_users, hub_sessions (en KV), hub_audit_log
  ├─ KV: HUB_KV (sesiones)
  └─ KV: HUB_VALIDATION_CACHE (cache 60s de tokens validados)
```

Funciones:
- SSO por sesión UUID en KV (compatible con los 5 CMS).
- Proxy cross-CMS con validación de `cms_access`.
- Audit log centralizado.
- Sitemap XML Google News compatible.

### 2.3 Frontend del Hub (Pages)

```
nexopress-hub-ui (Cloudflare Pages)
  ├─ React 18 + Vite + TipTap
  ├─ Login → Dashboard cross-CMS → Editor con panel SEO
  └─ URL: https://nexopress-hub-ui.pages.dev
         (luego https://hub.sebastianvernis.space)
```

### 2.4 Sitios (Pages)

Cada sitio es un Pages project con:
- `index.html` (homepage con masonry de artículos)
- `articulo/index.html` + función SSR (`functions/articulo/[[slug]].js`)
- `categoria/index.html`
- `style.css` + `style-custom.css` (colores, logos)
- `wrangler.toml` con binding a su D1
- `robots.txt`, `favicon.png`, `sw.js`

El archivo compartido `_shared/article-middleware.js` se reutiliza
para inyectar OG tags y JSON-LD en todos los sitios.

---

## 3. Estructura del repo

```
News-Site-Orchestration/
├── cms-originaux/              # CMS Worker 1 (11 sitios)
├── cms-nuevos/                 # CMS Worker 2 (18 sitios)
├── cms-nuevos2/                # CMS Worker 3 (9 sitios)
├── cms-nuevos3/                # CMS Worker 4 (33 sitios)
├── cms-nuevos4/                # CMS Worker 5 (25 sitios, en rediseño)
├── cms-selector/               # Indexador de sitios (legacy, conservado)
│
├── nexopress-hub/              # Worker del Hub (orquestación + SSO)
├── nexopress-hub-ui/           # Frontend del Hub (React + TipTap)
├── nexopress-portal/           # Portal unificado legacy
│
├── docs/                       # Esta normativa + guías operativas
│   ├── AGENTS.md               # ← este archivo (single source of truth)
│   ├── CONTRIBUTING.md         # Convenciones de código
│   ├── ARCHITECTURE.md         # Diagramas
│   ├── API_REFERENCE.md        # Endpoints del Worker
│   ├── guides/                 # Guías operativas por tema
│   ├── plans/                  # Planes de implementación
│   ├── analysis/               # Reportes de análisis
│   ├── history/                # Snapshots históricos
│   └── archive/                # Documentos obsoletos (no tocar)
│
├── scripts/                    # Scripts de mantenimiento
│   ├── fixes/                  # Correcciones puntuales
│   ├── data-migration/         # Migraciones masivas
│   ├── cms-internal/           # Mantenimiento de plataforma
│   ├── deploy/                 # Deploys alternativos
│   ├── n8n/                    # Workflows n8n como código
│   ├── hub/                    # Scripts del Hub (smoke-test, etc.)
│   └── README.md               # Índice de scripts
│
├── tools/                      # Herramientas Python (paraphrase, RSS)
├── tests/                      # Tests automatizados
├── designs/                    # Mockups y design tokens
├── _template/                  # Plantilla para nuevos sitios
│
├── AGENTS.md                   # Symlink → docs/AGENTS.md
├── CLAUDE.md                   # Symlink → docs/AGENTS.md
├── CONTRIBUTING.md             # Symlink → docs/CONTRIBUTING.md
├── README.md                   # Punto de entrada principal
└── ARCHITECTURE.md             # Symlink → docs/ARCHITECTURE.md
```

---

## 4. Convenciones de código

### 4.1 JavaScript (Workers + scripts)

- **Indentación:** 2 espacios
- **Nombres:** `camelCase` para variables/funciones, `PascalCase` para
  clases, `UPPER_SNAKE_CASE` para constantes
- **Strings:** template literals cuando hay interpolación
- **Imports:** ES modules (`import { x } from './y.js'`)
- **Estilo de comillas:** simple quotes por defecto, backticks para
  template literals
- **Funciones puras siempre que sea posible**
- **Nunca** hardcodear secrets — usar `wrangler secret put` o
  variables de entorno de `[vars]` en `wrangler.toml`

### 4.2 Python (tools/ y scripts/)

- **Indentación:** 4 espacios
- **Nombres:** `snake_case`
- **Type hints** en funciones nuevas
- **Docstrings** en funciones públicas (estilo Google)
- **Estructura mínima de script:**
  ```python
  #!/usr/bin/env python3
  """Descripción corta del script."""
  import argparse
  from pathlib import Path

  def main():
      parser = argparse.ArgumentParser()
      parser.add_argument('--input', required=True)
      args = parser.parse_args()
      # lógica
      print("✓ Hecho")

  if __name__ == '__main__':
      main()
  ```

### 4.3 SQL (D1 migrations)

- **Nombres de tabla:** `MAYÚSCULAS_CON_GUIONES_BAJOS` (e.g.
  `ARTICULOS_CMS`, `USUARIOS`, `HUB_USERS`)
- **Nombres de columna:** `MAYÚSCULAS_CON_GUIONES_BAJOS` (e.g.
  `META_TITLE`, `FOCUS_KEYWORD`)
- **Siempre** usar `CREATE TABLE IF NOT EXISTS` y
  `CREATE INDEX IF NOT EXISTS` para idempotencia
- **Migraciones aditivas** solo (`ALTER TABLE ADD COLUMN`), nunca
  destructivas sin backup previo
- **Comentarios** al inicio con descripción + fecha

### 4.4 HTML/CSS/JS en sitios

- HTML semántico (`<header>`, `<main>`, `<article>`, `<aside>`)
- CSS mobile-first, breakpoints en 768px y 1024px
- JS vanilla, sin frameworks pesados en sitios (reactividad con
  eventos o Alpine.js si hace falta)
- **Español de México formal** en todo copy visible (tuteo neutro,
  sin voseo, sin regionalismos)

### 4.5 Idioma de la UI

- **Todo copy visible en español de México** (tuteo, sin "vos", sin
  regionalismos como "che", "güey", "chido", "neta", "ahorita")
- **Léxico neutro** entendible en todo México
- **Términos técnicos en inglés** son aceptables en comentarios de
  código y nombres de variables (convención universal)
- **Términos como "tuit" (no "tweet"), "correo electrónico" (no
  "email")** en UI visible
- **Fechas y números** con `es-MX` locale

---

## 5. Reglas críticas de datos y auth

### 5.1 Autenticación

- **Patrón de sesión:** UUID aleatorio en KV bajo `session_<token>` o
  `hub_session_<token>`
- **Hash de passwords:** SHA-256 con `constantTimeEqual` (NO usar
  bcrypt ni argon2 — limita runtime del Worker)
- **Provisioning:** nuevos usuarios se crean con
  `PASSWORD_SETUP_TOKEN_HASH`, **nunca** con password inicial
- **Nunca** loguear ni committear passwords, tokens o hashes
- **Credenciales** de admin/editor: tratar como `[REDACTED]` en
  cualquier output que vaya a logs o memoria compartida

### 5.2 SSO Hub

- El Hub emite tokens UUID
- Los 5 CMSs validan tokens con fallback: primero KV local, luego
  cache HUB_VALIDATION_CACHE (60s), luego request a `HUB_API_URL`
- El campo `cms_access` en `hub_users` es JSON array con los IDs de
  CMS permitidos para ese usuario
- Auditoría obligatoria en `hub_audit_log` para login, logout,
  create_user, create_article, change_state

### 5.3 Reglas de Facebook (duro, no negociable)

- Ventana de publicación: **8 a 22 hs** hora local del sitio
- Frecuencia: cada **3 horas** por sitio
- Máximo **4 posts/día** por sitio
- **No re-publicar** el mismo artículo
- Solo artículos de **últimas 48 horas**

---

## 6. Reglas de privacidad y cloud

- **Preferir Ollama local (localhost:11434)** antes que cloud APIs
- **No enviar datos personales** a APIs externas sin aprobación
  explícita del usuario
- **No descargar** `.deb`, binarios, firmwares con `wget`/`curl`
  sin antes pedir "necesito descargar X, ¿procedo?"
- **Cloudflare (Workers, D1, KV, R2, Pages)** sí — es la infra propia
  del usuario, no es "cloud de terceros"
- **Ollama Cloud** (kimi-k2.6, glm-5.1) aceptable para features que
  Ollama local no cubre, con aprobación

---

## 7. Workflow de cambios

### 7.1 Ramas y commits

```bash
# Branch por feature/fix
git checkout -b feature/nombre-corto
git checkout -b fix/descripcion-corta

# Commits descriptivos (conventional commits)
git commit -m "feat: agregar endpoint de sitemap XML"
git commit -m "fix: corregir URL de imagen en OG tags"
git commit -m "docs: actualizar AGENTS.md con stack Ollama"
git commit -m "refactor: extraer parser de OG tags a utils"
```

Tipos: `feat`, `fix`, `docs`, `refactor`, `test`, `chore`, `perf`.

### 7.2 Antes de commitear

- `gitnexus_detect_changes()` para verificar scope
- Si tocás una función: `gitnexus_impact({target: "nombre", direction: "upstream"})`
- Correr tests si existen
- Si es UI: smoke test en navegador
- Si es SQL: verificar idempotencia

### 7.3 Deploy

- **El usuario es quien hace deploy y da veredicto final.**
- El agente diagnostica, parchea localmente, commitea.
- **No auto-deploy** incluso si el cambio es obviamente seguro.
- Después del deploy: `wrangler tail --name <worker>` para ver logs.

---

## 8. Reglas específicas para el Hub

### 8.1 Compatibilidad con los 5 CMSs

- El Hub **nunca** modifica el schema de los CMSs sin migraciones
  explícitas.
- Las extensiones (auth middleware, endpoints `/seo`, `/state`)
  son **aditivas** — no rompen los endpoints existentes.
- El binding `HUB_VALIDATION_CACHE` debe existir en los 5
  `wrangler.toml` de los CMSs.
- La variable `HUB_API_URL` debe apuntar al Worker del Hub en los
  5 CMSs.

### 8.2 Editor TipTap (frontend del Hub)

- **Replicar herramientas del editor actual de los CMSs:**
  - Subir imagen (R2)
  - YouTube / X (Twitter) / Instagram embeds
  - 2 / 3 columnas
  - Tablas
  - Blockquote, code, listas
  - Link
- **Extras editoriales del Hub:**
  - Drop cap (letra capital)
  - Pull quote (cita destacada)
  - Callouts (info / alerta / dato / consejo)
  - Modo enfoque
  - Atajos de teclado (Ctrl+B/I/U/K/S/Z)
  - Contador de palabras y tiempo de lectura en vivo
- **Panel SEO (Yoast-like):**
  - Legibilidad Fernández-Huerta (español)
  - Análisis de palabra clave objetivo
  - Vista previa en Google (SERP preview)
  - Schema JSON-LD NewsArticle inyectado en SSR

### 8.3 Español de México (UI)

Todo copy visible del Hub debe ser:
- **Tuteo neutro** ("Empieza a escribir", "Guarda el artículo")
- **Sin voseo** (nada de "empezá", "guardá", "insertá")
- **Sin regionalismos** rioplatenses (nada de "che", "pibe", "boludo")
- **Sin regionalismos** mexicanos coloquiales en UI formal (nada de
  "güey", "chido", "neta", "ahorita", "órale")
- **Léxico neutro** que se entienda en todo México
- **Tooltips informativos** en cada herramienta del editor
  (descripción breve + atajo de teclado cuando aplique)

---

## 9. Reglas de migración

### 9.1 SQL idempotente

Toda migración nueva DEBE ser idempotente:
- `CREATE TABLE IF NOT EXISTS`
- `CREATE INDEX IF NOT EXISTS`
- `ALTER TABLE ... ADD COLUMN` (D1 no soporta `IF NOT EXISTS`
  en ALTER, usar patrón con `PRAGMA table_info` para verificar)
- `INSERT OR IGNORE` para seeds

### 9.2 Antes de mergear migración

1. Backup de la DB (`wrangler d1 export`)
2. Test local con `--local` primero
3. Test en `--remote` solo después de que `--local` pase
4. Documentar el cambio en `docs/migrations/<fecha>-<nombre>.md`

---

## 10. Comandos útiles

### 10.1 Workers

```bash
# Deploy
wrangler deploy

# Logs en vivo
wrangler tail --name <worker-name>

# D1 — ejecutar SQL
wrangler d1 execute <db-name> --remote --file migrations/xxx.sql
wrangler d1 execute <db-name> --remote --command "SELECT * FROM users LIMIT 5"

# D1 — local dev
wrangler d1 execute <db-name> --local --file migrations/xxx.sql

# KV
wrangler kv:namespace create <NAME>
wrangler kv:key put --binding=<BINDING> "key" "value"

# Secrets
wrangler secret put <SECRET_NAME>
```

### 10.2 Pages

```bash
# Deploy frontend
cd <pages-project>
npm run build
wrangler pages deploy dist --project-name=<project>
```

### 10.3 GitNexus

```bash
npx gitnexus analyze          # re-indexar
npx gitnexus status           # freshness check
npx gitnexus wiki             # generar docs
```

### 10.4 Local dev

```bash
# Worker
cd cms-nuevos4
npm run dev

# Frontend del Hub
cd nexopress-hub-ui
npm run dev   # http://localhost:3000 con proxy a localhost:8787
```

---

## 11. Debugging y troubleshooting

### 11.1 Endpoints que no responden

```bash
# Health checks
curl https://cms-nuevos4.sebastianvernis.workers.dev/api/health
curl https://nexopress-hub.sebastianvernis.workers.dev/api/health

# Logs
wrangler tail --name cms-nuevos4
wrangler tail --name nexopress-hub
```

### 11.2 Login falla en el Hub

1. Verificar `localStorage.getItem('hub_token')` en el browser
2. Verificar que el user existe en D1 del Hub:
   `wrangler d1 execute nexopress-hub-db --remote --command "SELECT * FROM hub_users"`
3. Verificar CORS: el origin debe estar en `ALLOWED_ORIGINS`
4. Ver logs: `wrangler tail --name nexopress-hub`

### 11.3 Artículo no se ve en el sitio

1. Verificar que el artículo existe en la D1 del CMS
2. Verificar que el `slug` está correcto
3. Verificar que el estado es `published` (no `draft` o `in_review`)
4. Verificar el JSON-LD en SSR: view-source del artículo
5. Test con `curl https://cms-X.sebastianvernis.workers.dev/api/articles/<id>`

### 11.4 gpt-oss + think:false

**Quirk conocido:** OpenAI `gpt-oss:20b` y `gpt-oss:120b` en Ollama
Cloud tienen un bug con `think: false` + `num_predict` bajo: queman
todo el budget en tokens internos y devuelven `content: ""`.

**Workaround:** usar modelos flagship `:cloud` (Kimi K2.6, GLM-5.1,
DeepSeek V4 Pro) que respetan `think: false` correctamente.

---

## 12. Privacidad, secretos y compliance

### 12.1 Archivos que NO se commitean

- `.dev.vars`
- `.env`
- `data/` (datos generados, logs)
- `node_modules/`
- `.wrangler/`
- Cualquier archivo con tokens, API keys, passwords

### 12.2 Manejo de credenciales en código

- **Nunca** hardcodear en código fuente
- Usar `wrangler secret put` para producción
- Usar `.dev.vars` para desarrollo local
- Tratar como `[REDACTED]` en cualquier output que vaya a logs o
  memoria compartida
- Si el usuario te dicta credenciales, **ofrecer guardarlas en un
  gestor de secretos**, no en memoria ni en archivos planos

### 12.3 Auditoría

- El Hub lleva log de toda acción sensible (login, create_user,
  create_article, change_state, cross-cms access)
- Consultar: `wrangler d1 execute nexopress-hub-db --remote --command
  "SELECT * FROM hub_audit_log ORDER BY ts DESC LIMIT 50"`

---

## 13. Antes de pedir aprobación final al usuario

El usuario tiene un **contrato de deploy-verdict**:

> "Los testeos se realizan con despliegue directo a producción y
> validación en navegador, yo doy veredicto final."

**El agente:**
1. Diagnostica
2. Parchea localmente
3. Commitea
4. **Para y espera veredicto** — no auto-deploya, incluso si el
   cambio es obviamente seguro
5. Si el cambio toca datos, DBs, secretos: pedir confirmación
   explícita ANTES de commitear

---

## 14. Referencias

- `docs/CONTRIBUTING.md` — convenciones de contribución humana
- `docs/ARCHITECTURE.md` — diagramas del sistema
- `docs/API_REFERENCE.md` — endpoints del Worker
- `docs/guides/` — guías operativas (crear sitio, deploy, etc.)
- `docs/plans/` — planes de implementación aprobados
- `docs/migrations/` — registro de migraciones SQL
- `README.md` (raíz) — punto de entrada principal

<!-- gitnexus:start -->
# GitNexus — Code Intelligence

This project is indexed by GitNexus as **News-Site-Orchestration** (25975 symbols, 43599 relationships, 300 execution flows). Use the GitNexus MCP tools to understand code, assess impact, and navigate safely.

> Index stale? Run `node .gitnexus/run.cjs analyze` from the project root — it auto-selects an available runner. No `.gitnexus/run.cjs` yet? `npx gitnexus analyze` (npm 11 crash → `npm i -g gitnexus`; #1939).

## Always Do

- **MUST run impact analysis before editing any symbol.** Before modifying a function, class, or method, run `impact({target: "symbolName", direction: "upstream"})` and report the blast radius (direct callers, affected processes, risk level) to the user.
- **MUST run `detect_changes()` before committing** to verify your changes only affect expected symbols and execution flows. For regression review, compare against the default branch: `detect_changes({scope: "compare", base_ref: "main"})`.
- **MUST warn the user** if impact analysis returns HIGH or CRITICAL risk before proceeding with edits.
- When exploring unfamiliar code, use `query({query: "concept"})` to find execution flows instead of grepping. It returns process-grouped results ranked by relevance.
- When you need full context on a specific symbol — callers, callees, which execution flows it participates in — use `context({name: "symbolName"})`.

## Never Do

- NEVER edit a function, class, or method without first running `impact` on it.
- NEVER ignore HIGH or CRITICAL risk warnings from impact analysis.
- NEVER rename symbols with find-and-replace — use `rename` which understands the call graph.
- NEVER commit changes without running `detect_changes()` to check affected scope.

## Resources

| Resource | Use for |
|----------|---------|
| `gitnexus://repo/News-Site-Orchestration/context` | Codebase overview, check index freshness |
| `gitnexus://repo/News-Site-Orchestration/clusters` | All functional areas |
| `gitnexus://repo/News-Site-Orchestration/processes` | All execution flows |
| `gitnexus://repo/News-Site-Orchestration/process/{name}` | Step-by-step execution trace |

## CLI

| Task | Read this skill file |
|------|---------------------|
| Understand architecture / "How does X work?" | `.claude/skills/gitnexus/gitnexus-exploring/SKILL.md` |
| Blast radius / "What breaks if I change X?" | `.claude/skills/gitnexus/gitnexus-impact-analysis/SKILL.md` |
| Trace bugs / "Why is X failing?" | `.claude/skills/gitnexus/gitnexus-debugging/SKILL.md` |
| Rename / extract / split / refactor | `.claude/skills/gitnexus/gitnexus-refactoring/SKILL.md` |
| Tools, resources, schema reference | `.claude/skills/gitnexus/gitnexus-guide/SKILL.md` |
| Index, status, clean, wiki CLI commands | `.claude/skills/gitnexus/gitnexus-cli/SKILL.md` |

<!-- gitnexus:end -->
