# Estructura del template

## Visión general

`template/` es un sitio estático con Cloudflare Pages Functions. El front consume
artículos desde un worker del CMS vía `/api/*` (proxy en `_redirects`). El binding
D1 vive en el CMS; este template no toca la base de datos.

```
                ┌──────────────────────────────┐
                │   Visitante (browser)         │
                └─────────────┬────────────────┘
                              │
            ┌─────────────────┼─────────────────┐
            │                 │                 │
        index.html       articulo/...     categoria/...
            │                 │                 │
            └─────────────────┼─────────────────┘
                              │  fetch('/api/articles?...')
                              ▼
            ┌──────────────────────────────────────┐
            │   _redirects  →  cms-*.workers.dev   │
            └──────────────────────────────────────┘
                              │
                              ▼
            ┌──────────────────────────────────────┐
            │   CMS Worker + D1 binding            │
            │   (externo a este template)          │
            └──────────────────────────────────────┘
```

## Archivos uno por uno

### HTML — páginas renderizadas en el cliente

| Archivo | Qué hace | Notas |
|---|---|---|
| `index.html` | Homepage. Llama `/api/articles?site=NAME&limit=12` y renderiza `.masonry-wall` con forma cíclica (tall/wide/normal). | Las clases `brick-tall/wide/normal` viven en `style.css`. |
| `articulo/index.html` | Página de artículo. Lee `?slug=` y hace fetch a `/api/articles/{slug}`. Inyecta OG tags vía DOM IDs (`og-title`, `og-desc`, etc.). | El SSR parcial lo hace `functions/articulo/[slug].js` para que Facebook/Twitter vean los OG tags sin ejecutar JS. |
| `categoria/index.html` | Listado por categoría. Lee `?cat=nacional|politica|economia` y filtra. | `category-page`, `category-badge` en `style.css`. |
| `acerca-de.html`, `contacto.html`, `privacidad.html`, `terminos.html` | Páginas legales/estáticas. | Estilo en `legal.css`. Contienen placeholders. |

### CSS — sistema de tokens

| Archivo | Rol | Notas |
|---|---|---|
| `style.css` | Sistema base: `:root` con tokens, masonry, news-card, category-page, article-full. | Las variables `--site-primary` y `--site-secondary` **vienen del config** y se sustituyen. |
| `style-custom.css` | Ajustes por sitio: ticker, header, footer con clases prefijadas (`{prefix}-ticker`, `{prefix}-header`, etc.). | **47 placeholders** — los más sensibles. Ver [PLACEHOLDERS.md](PLACEHOLDERS.md). |
| `article.css` | Estilo de la página de artículo (article-quote, article-body, etc.). | Usa `--site-primary` para quotes. |
| `legal.css` | Estilo de páginas legales. | Usa `--site-primary` para h1. |

### JS — inyección en cliente

| Archivo | Qué inyecta | Notas |
|---|---|---|
| `components.js` | Preloader, ticker, header, footer. Detecta subdirs (`/articulo/`, `/categoria/`, `/admin/`) para ajustar rutas. | Si agregas un subdir, actualiza el regex en línea 3. |
| `script.js` | Efectos: preloader, click en cards, nav-active por ruta, scroll-shadow en header. | Inofensivo; se puede editar libremente. |
| `sw.js` | Service Worker. Cache estático + runtime cache GET. | Cambia `CACHE_NAME` cuando cambien los assets. |

### Cloudflare Pages

| Archivo | Rol |
|---|---|
| `wrangler.toml` | Nombre del proyecto (== `config.name`). El `database_name` se deriva del host del CMS, **no** del sitio. |
| `_redirects` | Proxy `/api/*` al CMS, RSS a `/api/rss/{name}`. Se regenera en cada build del sitio. |
| `functions/_middleware.js` | Middleware global. Solo intercepta `/articulo`; delega a `handleArticleRequest(ctx, "NAME")`. |
| `functions/articulo/[slug].js` | Construye la request al middleware con `?slug=…` en el search. |

> **CRÍTICO**: las functions importan `../../_shared/article-middleware.js` o
> `../../../_shared/article-middleware.js` **desde el CMS**, no desde el sitio.
> El sitio no debe contener ese archivo.

## Lo que NO está en el template

- **El módulo `article-middleware.js`** — vive en `cms-nuevos3/_shared/`. Se
  importa por ruta relativa. Si lo renombras o lo mueves, todas las páginas
  de artículo se rompen.
- **La base D1** — `database_id` apunta a un D1 existente en el CMS. El sitio
  no crea ni migra la base.
- **Los logos** — se copian después de generar el sitio.
- **El worker del CMS** — se despliega por separado.
