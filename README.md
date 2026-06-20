# NexoPress — Plataforma de Noticias Multi-Sitio

> **Estado:** En producción · 5 CMS Workers · ~96 sitios · Editor SEO unificado
> **Última revisión:** 2026-06-17 — ver `docs/status/2026-06-17-status.md` para el detalle de bugs activos.

## Arquitectura (Jun 2026)

### CMS Workers (5 instancias)

| Worker | Sitios | Estado |
|--------|--------|--------|
| `cms-originaux` | 11 | Activo |
| `cms-nuevos` | 18 | Activo |
| `cms-admin-nuevos2` | 9 | Activo (renombrado desde `cms-nuevos2` el 2026-06-17) |
| `cms-nuevos3` | 33 | Activo |
| `cms-nuevos4` | 25 | Activo (en rediseño) |

**Total:** ~96 sitios de noticias

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

- **SSO** — Un solo login para los 5 CMS
- **Editor unificado** — TipTap (bloques) con panel SEO tipo Yoast
- **Dashboard cross-CMS** — Ver estadísticas de todos los CMS en un lugar
- **Workflow editorial** — State machine (Borrador → En revisión → Aprobado → Publicado)

### Features del Editor

1. **Editor TipTap** — Bloques, H1/H2/H3, listas, citas, imágenes
2. **Panel SEO** — Legibilidad Fernandez-Huerta (español) + focus keyword + SERP preview
3. **State machine** — Transiciones validadas con audit log
4. **JSON-LD** — Schema `NewsArticle` inyectado automáticamente en SSR

### URLs

| Componente | URL |
|------------|-----|
| Hub UI | `https://nexopress-hub-ui.pages.dev` |
| Hub API | `https://nexopress-hub.sebastianvernis.workers.dev` |
| CMS-originaux | `https://cms-originaux.sebastianvernis.workers.dev` |
| CMS-nuevos | `https://cms-nuevos.sebastianvernis.workers.dev` |
| CMS-admin-nuevos2 | `https://cms-admin-nuevos2.sebastianvernis.workers.dev` |
| CMS-nuevos3 | `https://cms-nuevos3.sebastianvernis.workers.dev` |
| CMS-nuevos4 | `https://cms-nuevos4.sebastianvernis.workers.dev` |

## Estructura del Repo

```
News-Site-Orchestration/
├── cms-originaux/          # CMS Worker 1 (11 sitios)
├── cms-nuevos/             # CMS Worker 2 (18 sitios)
├── cms-admin-nuevos2/      # CMS Worker 3 (9 sitios, renombrado desde cms-nuevos2/)
├── cms-nuevos3/            # CMS Worker 4 (33 sitios)
├── cms-nuevos4/            # CMS Worker 5 (25 sitios, en rediseño)
├── cms-selector/           # Indexador de sitios
├── nexopress-hub/          # Hub Worker (SSO + API cross-CMS)
├── nexopress-hub-ui/       # Hub Frontend (React + TipTap)
├── nexopress-portal/       # Portal público (a reemplazar)
├── docs/
│   ├── guides/
│   │   ├── nexopress-hub-deploy.md  # Guía de deploy del Hub
│   │   └── ...
│   └── plans/
│       └── 2026-06-10-nexopress-hub.md  # Plan de implementación
├── scripts/
│   └── hub/
│       └── smoke-test.sh   # Smoke test post-deploy
└── AGENTS.md               # Guía para agentes de IA
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
for cms in cms-originaux cms-nuevos cms-admin-nuevos2 cms-nuevos3 cms-nuevos4; do
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

- **RSS feeds:** Infobae, Proceso, Informador, Expansion, Jornada, Reforma, Aristegui, DW
- **Paraphrasing:** Kimi K2.6 (Ollama Cloud)
- **Supervisión:** GLM-5.1 (Ollama Cloud)
- **Frecuencia:** Cada 30 min (yesterday + today)

## Facebook Publishing

- **Frecuencia:** Cada 3 horas por sitio
- **Ventana:** 8-22hs
- **Límite:** 4 posts/día
- **Regla:** No re-publicar, <48h de antigüedad

## Troubleshooting

Ver `docs/guides/nexopress-hub-deploy.md#troubleshooting`

## Contacto

- **Dev:** sebastianvernis@gmail.com
- **Editor:** rodrigo91230@gmail.com

---

**Última actualización:** 2026-06-17
**Versión:** 2.1 (con nuevo Worker `cms-admin-nuevos2`)
**Cambios recientes:** ver `docs/status/2026-06-17-status.md`
