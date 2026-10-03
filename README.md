# NexoPress — Plataforma de Noticias Multi-Sitio

> **Estado:** En producción · 5 CMS Workers · 92 sitios · Editor SEO unificado
> **Última revisión:** 2026-10-02 — conteos de sitios y nombres de worker verificados contra el árbol.

## Arquitectura (Jun 2026)

### CMS Workers (5 instancias)

| Worker | Sitios | Estado |
|--------|--------|--------|
| `cms-originaux` | 11 | Activo |
| `cms-nuevos` | 18 | Activo |
| `cms-nuevos2` | 9 | Activo |
| `cms-nuevos3` | 26 | Activo |
| `cms-nuevos4` | 28 | Activo (en rediseño) |

**Total:** 92 sitios de noticias

> **Nota sobre los sitios:** `cms-nuevos4` guarda sus sitios en `public/` en lugar de
> `sites/` como los otros cuatro. `deploy_all.sh` lo tiene como caso especial.
> Conteo = directorios de sitio en disco.

### Stack Tecnológico

- **Cloudflare Workers** (Hono JS) — API + SSR
- **Cloudflare D1** (SQLite) — Base de datos
- **Cloudflare R2** — Almacenamiento de imágenes
- **Cloudflare KV** — Caché + sesiones
- **Cloudflare Pages** — Frontends estáticos (Next.js 14)
- **Ollama Cloud** — Paraphrasing (Kimi K2.6) + supervisión (GLM-5.1)

## NexoPress Hub (Panel Editorial Unificado)

### Qué es

El **NexoPress Hub** es un panel editorial centralizado que permite:

- **SSO** — Un login compartido hacia los 5 CMS (token opaco en `localStorage`,
  no JWT con refresh)
- **Editor unificado** — TipTap (bloques) con panel SEO tipo Yoast
- **Dashboard cross-CMS** — Ver estadísticas de todos los CMS en un lugar

### Features del Editor

1. **Editor TipTap** — Bloques, H1/H2/H3, listas, citas, imágenes
2. **Panel SEO** — Legibilidad Fernandez-Huerta (español) + focus keyword + SERP preview
3. **JSON-LD** — Schema `NewsArticle` inyectado automáticamente en SSR

> **Pendiente:** no existe state machine editorial (Borrador → En revisión →
> Aprobado → Publicado). Hoy el estado de publicación es un flag en la base y el
> Hub solo guarda estado de UI. Ver `Editor.jsx:416`.

### URLs

| Componente | URL |
|------------|-----|
| Hub UI | `https://nexopress-hub-ui.pages.dev` |
| Hub API | `https://nexopress-hub.sebastianvernis.workers.dev` |
| CMS-originaux | `https://cms-originaux.sebastianvernis.workers.dev` |
| CMS-nuevos | `https://cms-nuevos.sebastianvernis.workers.dev` |
| CMS-nuevos2 | `https://cms-nuevos2.sebastianvernis.workers.dev` |
| CMS-nuevos3 | `https://cms-nuevos3.sebastianvernis.workers.dev` |
| CMS-nuevos4 | `https://cms-nuevos4.sebastianvernis.workers.dev` |

## Estructura del Repo

```
News-Site-Orchestration/
├── cms-originaux/          # CMS Worker 1 (11 sitios)
├── cms-nuevos/             # CMS Worker 2 (18 sitios)
├── cms-nuevos2/            # CMS Worker 3 (9 sitios)
├── cms-nuevos3/            # CMS Worker 4 (26 sitios)
├── cms-nuevos4/            # CMS Worker 5 (28 sitios, en rediseño, usa public/)
├── d1-rest2/               # Worker agregador cross-CMS (endpoints /insert, /batch-insert, /query)
├── nexopress-hub-ui/       # Hub Frontend (React + TipTap)
├── nexopress-portal/       # Portal público (a reemplazar)
├── packages/
│   └── site-builder/       # CLI para crear/validar sitios
├── docs/
│   ├── guides/
│   │   ├── nexopress-hub-deploy.md  # Guía de deploy del Hub
│   │   └── ...
│   └── plans/
│       └── 2026-06-10-nexopress-hub.md  # Plan de implementación
├── scripts/
│   └── hub/
│       └── smoke-test.sh   # Smoke test post-deploy
├── AGENTS.md               # Guía para agentes de IA (symlink a docs/AGENTS.md)
└── ARCHITECTURE.md         # Arquitectura (symlink a docs/ARCHITECTURE.md)

> El worker `nexopress-hub` (API del Hub) se despliega como proyecto propio desde
> Cloudflare, no vive en este repo. `deploy_all.sh` despliega los 5 CMS.
```

## Deploy del Hub

Ver `docs/guides/nexopress-hub-deploy.md` para instrucciones completas.

**Resumen rápido:**

```bash
# 1. Crear recursos
wrangler d1 create nexopress-hub-db
wrangler kv:namespace create HUB_KV
wrangler kv:namespace create HUB_VALIDATION_CACHE

# 2. Configurar wrangler.toml con los IDs

# 3. Deployar Worker
cd nexopress-hub
wrangler deploy

# 4. Migrar DB
wrangler d1 execute nexopress-hub-db --file migrations/001_init.sql

# 5. Migrar los 5 CMSs
for cms in cms-originaux cms-nuevos cms-nuevos2 cms-nuevos3 cms-nuevos4; do
  cd $cms
  wrangler d1 execute <DB_NAME> --file migrations/002_seo_fields.sql
  wrangler d1 execute <DB_NAME> --file migrations/003_seed_rodrigo.sql
  cd ..
done

# 6. Deployar frontend
cd nexopress-hub-ui
npm install
npm run build
wrangler pages deploy dist --project-name=nexopress-hub-ui

# 7. Smoke test
./scripts/hub/smoke-test.sh
```

## Usuarios

| Usuario | Email | Rol | CMSs |
|---------|-------|-----|------|
| sebastianvernis | sebastianvernis@gmail.com | Admin | Los 5 |
| Rodrigo | rodrigo91230@gmail.com | Editor | Los 5 |

## Ingesta de Noticias

- **Orquestación:** n8n self-hosted. Los crons de ingesta de los Workers están
  **deshabilitados** (`wrangler.toml`, línea `crons` comentada en los 5 CMS).
  n8n hace el scrapeo y escribe vía HTTP contra `d1-rest2` (`/insert`,
  `/batch-insert`, `/query`); el CMS solo post-procesa (paraphrasing + imagen).
- **Fuentes RSS:** Jornada, Informador, Proceso, Expansión, El País, Reforma,
  La Política Online, France24, El Economista (ver `INGESTA_MULTISITIO.py:64-90`)
- **Paraphrasing:** Kimi K2.6 (Ollama Cloud)
- **Supervisión:** GLM-5.1 (Ollama Cloud)

## Facebook Publishing

- **Orquestación:** n8n self-hosted (ver `docs/guides/n8n-fb-publicado-sync.md`)
- **Rotación de tokens:** cada 48 h, vía workflow de n8n sobre una data table
- **Estado en BD:** columna `FB_PUBLICADO` en `ARTICULOS_PARAFRASEADOS`

## Troubleshooting

Ver `docs/guides/nexopress-hub-deploy.md#troubleshooting`

## Contacto

- **Dev:** sebastianvernis@gmail.com
- **Editor:** rodrigo91230@gmail.com

---

**Última actualización:** 2026-10-02
**Cambios recientes:** conteo de sitios, nombre real del worker `cms-nuevos2`,
estructura de carpetas, y sección de ingesta/publicación alineada con n8n.
