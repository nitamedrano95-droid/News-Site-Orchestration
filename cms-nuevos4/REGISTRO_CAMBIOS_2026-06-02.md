# Registro de Cambios - CMS Nuevos3
**Fecha:** 2 de junio de 2026
**Proyecto:** News-Site-Orchestration / cms-nuevos3

---

## Resumen de Cambios

### 1. Error de Sintaxis JavaScript - Triple Quote (`'''`)

**Problema:** Los archivos `articulo/index.html` de varios sitios contenían literales de string inválidos con triple comilla simple (`'''`) en lugar de vacío (`''`).

**Error en consola:**
```
Uncaught SyntaxError: '' string literal contains an unescaped line break
```

**Sitios afectados (18):**
- noticiasalinstante, nacionalinstante, politicasalvajealminuto, mexicoplus
- diariomexicano, pulsorepublicanonoticias, elanalisismexicano, perspectivamexicana
- mexicoenresumen, diariomexico, elprofetamexicano, monitorrepublicano
- republicamx, aztecamexiconoticias, wenewsmexico, elobservadorrepublicano, radioredmx

**Solución:** Script Python que reemplazó `'''` → `''` en todos los archivos.

---

### 2. Error D1 Database - `no such table: ARTICULOS_PARAFRASEADOS`

**Problema:** El middleware de SEO intentaba consultar la tabla `ARTICULOS_PARAFRASEADOS` pero:
- La tabla existe en la base de datos `news_db_cms_nuevos3` (ID: `18583adc-e878-4e0d-929d-62000fa1d81c`)
- Los bindings D1 en Cloudflare Pages no estaban siendo reconocidos
- Error específico: `D1_ERROR: no such table: ARTICULOS_PARAFRASEADOS`

**Arquitectura involucrada:**
- Worker: `cms-nuevos3` (wrangler.toml principal)
- Base de datos: `news_db_cms_nuevos3` (134MB, 50 tablas)
- Sites: 25 sitios estáticos en Cloudflare Pages
- Middleware: `_shared/article-middleware.js`

---

### 3. Actualización del Middleware de SEO

**Archivo modificado:** `sites/_shared/article-middleware.js`

**Cambios implementados:**

#### A) Logging detallado para debugging
```javascript
console.log(`[OG MIDDLEWARE] ${siteSlug}: Processing ${url.pathname}?${url.search}`);
console.log(`[RESOLVE] Starting query for slug: ${slug}`);
console.log(`[API FALLBACK] Fetching article from API: ${slug}`);
```

#### B) Mecanismo de fallback a API
Si D1 no está disponible o no encuentra el artículo, ahora hace fallback llamando directamente a la API del Worker:

```javascript
// Try D1 first
if (env.DB) {
  const { article: dbArticle } = await resolveArticleBySlug(env.DB, requestedSlug);
  article = dbArticle;
}

// Fallback to API if no article found
if (!article) {
  article = await fetchArticleFromAPI(requestedSlug);
}
```

#### C) Función fetchArticleFromAPI
```javascript
async function fetchArticleFromAPI(slug) {
  const API_BASE = 'https://cms-nuevos3.sebastianvernis.workers.dev';
  const res = await fetch(`${API_BASE}/api/articles/${encodeURIComponent(slug)}`);
  // Retorna objeto con { title, desc, image, canonical_slug, para_id }
}
```

#### D) Mejor manejo del UPDATE de tracking
El UPDATE a la tabla `ARTICULOS_SITIO_*` ahora solo se ejecuta si `env.DB` está disponible:
```javascript
if (env.DB) {
  const tableName = `ARTICULOS_SITIO_${siteSlug.toUpperCase()}`;
  await env.DB.prepare(`UPDATE ${tableName} ...`).bind(...).run();
}
```

---

### 4. Redeploy de Todos los Sitios

**Sitios desplegados:** 25 sitios

**Configuración de wrangler.toml (cada sitio):**
```toml
name = "nombre-sitio"
pages_build_output_dir = "."
compatibility_date = "2024-01-01"

[[d1_databases]]
binding = "DB"
database_name = "news_db_cms_nuevos3"
database_id = "18583adc-e878-4e0d-929d-62000fa1d81c"
```

**Sitios:**
| Sitio | Dominio Pages |
|-------|---------------|
| actualidadsinfronteras | actualidadsinfronteras.pages.dev |
| adnmexicano | adnmexicano.pages.dev |
| aztecamexiconoticias | aztecamexiconoticias.pages.dev |
| diariomexicano | diariomexicano.pages.dev |
| diariomexico | diariomexico.pages.dev |
| elanalisismexicano | elanalisismexicano.pages.dev |
| elobservadorrepublicano | elobservadorrepublicano.pages.dev |
| elprofetamexicano | elprofetamexicano.pages.dev |
| enfoquemexicano | enfoquemexicano.pages.dev |
| expresomexicano | expresomexicano.pages.dev |
| financemarketsmx | financemarketsmx.pages.dev |
| mexicannewsoftheworld | mexicannewsoftheworld.pages.dev |
| mexicoandtheworld | mexicoandtheworld.pages.dev |
| mexicodaily | mexicodaily.pages.dev |
| mexicoenresumen | mexicoenresumen.pages.dev |
| mexicoplus | mexicoplus.pages.dev |
| monitorrepublicano | monitorrepublicano.pages.dev |
| nacionalinstante | nacionalinstante.pages.dev |
| noticiasalinstante | noticiasalinstante.pages.dev |
| perspectivamexicana | perspectivamexicana.pages.dev |
| politicasalvajealminuto | politicasalvajealminuto.pages.dev |
| pulsorepublicanonoticias | pulsorepublicanonoticias.pages.dev |
| radioredmx | radioredmx.pages.dev |
| republicamx | republicamx.pages.dev |
| wenewsmexico | wenewsmexico.pages.dev |

---

### 5. Corrección de Rama de Despliegue

**Nota importante:** Los sitios deben desplegarse a la rama `main` (no `production`) para que funcione correctamente con el sistema de preview/producción de Cloudflare Pages.

---

## Arquitectura del Sistema

```
┌─────────────────────────────────────────────────────────────────┐
│                      Cloudflare Pages                            │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐          │
│  │   Site 1    │    │   Site 2    │    │   Site N    │          │
│  │  functions/ │    │  functions/ │    │  functions/ │          │
│  │ _middleware │    │ _middleware │    │ _middleware │          │
│  └──────┬──────┘    └──────┬──────┘    └──────┬──────┘          │
│         │                  │                  │                 │
│         └──────────────────┼──────────────────┘                 │
│                            ↓                                     │
│               ┌────────────────────────┐                        │
│               │  article-middleware.js │                        │
│               │  (shared/_shared/)     │                        │
│               └───────────┬────────────┘                        │
│                           │                                      │
│              ┌────────────┴────────────┐                         │
│              │                         │                         │
│              ↓                         ↓                         │
│    ┌─────────────────┐    ┌─────────────────────┐              │
│    │   D1 Database   │    │   Worker API Fallback│              │
│    │ news_db_cms_nuevos3│   │ cms-nuevos3.workers│              │
│    └─────────────────┘    └─────────────────────┘              │
└─────────────────────────────────────────────────────────────────┘
```

---

## Archivos Modificados

| Archivo | Cambio |
|---------|--------|
| `sites/_shared/article-middleware.js` | Agregado logging, API fallback, mejor manejo de errores |
| `sites/*/articulo/index.html` (18 archivos) | Corregido `'''` → `''` |
| `sites/aztecamexiconoticias/functions/_middleware.js` | Agregado header diagnóstico (temporal) |

---

## Notas para Producción

1. **D1 Binding:** Aunque el wrangler.toml tiene el binding `DB`, en algunos casos fue necesario verificar manualmente en el dashboard de Cloudflare Pages que el binding esté correctamente configurado en Settings → Functions → D1 Databases.

2. **Rama main:** Para producción, siempre desplegar a la rama `main`, no a `production`.

3. **Logging:** El middleware tiene console.log que se pueden ver en los logs de Cloudflare Pages si hay errores.

---

## Comandos Útiles

```bash
# Ver tablas en D1
npx wrangler d1 execute news_db_cms_nuevos3 --command="SELECT name FROM sqlite_master WHERE type='table'" --remote

# Verificar artículo existe
npx wrangler d1 execute news_db_cms_nuevos3 --command="SELECT SLUG, TITULO_PARAFRASEADO FROM ARTICULOS_PARAFRASEADOS WHERE SLUG LIKE '%comala%'" --remote

# Redeploy sitio
cd sites/nombre-sitio && npx wrangler pages deploy . --project-name="nombre-sitio" --branch=main --commit-dirty=true --skip-caching
```