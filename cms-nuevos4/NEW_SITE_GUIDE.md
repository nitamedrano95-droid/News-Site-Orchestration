# NexoPress — Creación y Gestión de Nuevos Sitios (cms-nuevos3)

## Arquitectura General

```
cms-nuevos3/
├── workers/                    # Cloudflare Workers (CMS backend)
│   └── src/
├── sites/                      # Cloudflare Pages (sitios frontend)
│   └── {nombre-sitio}/         # Un directorio por sitio
└── _shared/
    ├── article-middleware.js   # OG tags + SEO (reutilizado por todos)
    └── *.png                   # Logos de cada sitio
```

Cada sitio es un **Cloudflare Pages project** con:
- Generador estático en `index.html` (inline JS que consume la API del Worker)
- Componentes injected via `components.js` (ticker, header, footer)
- Funciones server-side en `functions/` para artículo dinámico (`/articulo/?slug=X`)
- Base de datos D1 (compartida entre Worker y Pages via binding)

---

## Estructura de Archivos por Sitio

```
{nombre-sitio}/
├── index.html              # Homepage — genera masonry de artículos
├── style.css               # Estilos base (masonry, categoría, etc.)
├── style-custom.css        # Colores, ticker, header, footer del sitio
├── components.js           # Inyección de ticker/header/footer/preloader
├── script.js               # JS auxiliar (NAV active, sticky shadow, etc.)
├── sw.js                   # Service Worker (caché offline)
├── favicon.png             # Icono del sitio
├── logo-header.png         # Logo para ticker (generalmente con fondo blanco)
├── logo.png                # Logo general
├── logo-footer.png         # Logo para footer
├── robots.txt              # SEO
├── wrangler.toml           # Binding D1 para el artículo dinámico
├── _redirects              # Redirecciones (opcional)
├── acerca-de.html          # Página informativa
├── contacto.html
├── privacidad.html
├── categoria/
│   └── index.html          # Página de categoría ?cat=X
├── articulo/
│   └── index.html          # Página de artículo individual
├── functions/
│   ├── api.js              # API endpoint (opcional)
│   ├── _middleware.js      #Middleware OG tags para /articulo
│   └── articulo/
│       └── [slug].js       # Función serverless para artículo
└── admin/                   # Panel admin (opcional)
```

---

## Paso a Paso — Crear un Nuevo Sitio

### 1. Variables Previas

Definir antes de empezar:

| Variable | Ejemplo | Notas |
|---|---|---|
| `SITE_NAME` | `elnuevositio` | Minúsculas, sin espacios ni tildes |
| `SITE_TITLE` | `El Nuevo Sitio` | Título legible para el sitio |
| `PRIMARY_COLOR` | `#1a3a5c` | Color principal (header, ticker, acentos) |
| `SECONDARY_COLOR` | `#2d5a87` | Color secundario |
| `LIGHT_COLOR` | `#e8f4fd` | Color claro para tags/fondos |
| `TEXT_COLOR` | `#1a1a1a` | Color de texto principal |
| `SITE_SLUG` | `elnuevositio` | Igual a SITE_NAME — se pasa a la API y D1 |

### 2. Crear Directorio

```bash
mkdir -p cms-nuevos3/sites/$SITE_NAME/{categoria,articulo,functions/articulo,admin}
```

### 3. Copiar Plantilla Base

Copiar desde un sitio existente (ej: `diariomexicano`) como punto de partida:

```bash
cp -r cms-nuevos3/sites/diariomexicano/* cms-nuevos3/sites/$SITE_NAME/
# Limpiar archivos únicos que no aplican
rm cms-nuevos3/sites/$SITE_NAME/diariomexicano.png  # logo específico anterior
```

### 4. Modificar `wrangler.toml`

```toml
name = "SITE_NAME"
pages_build_output_dir = "."
compatibility_date = "2024-01-01"

[[d1_databases]]
binding = "DB"
database_name = "news_db_cms_nuevos3"
database_id = "18583adc-e878-4e0d-929d-62000fa1d81c"  # Fijo — mismo para todos
```

### 5. Modificar `functions/_middleware.js`

```javascript
import { handleArticleRequest } from "../../_shared/article-middleware.js";

export async function onRequest(context) {
  const { pathname } = new URL(context.request.url);
  if (!pathname.startsWith("/articulo")) {
    return await context.next();
  }
  return handleArticleRequest(context, "SITE_NAME");
}
```

### 6. Modificar `functions/articulo/[slug].js`

```javascript
import { handleArticleRequest } from '../../../_shared/article-middleware.js';

export async function onRequest(context) {
  const { params } = context;
  const slug = params.slug;
  const url = new URL(context.request.url);
  url.searchParams.set('slug', slug);
  const modifiedRequest = new Request(url, {
    method: context.request.method,
    headers: context.request.headers,
    body: context.request.body
  });
  const modifiedContext = { ...context, request: modifiedRequest };
  return handleArticleRequest(modifiedContext, 'SITE_NAME');
}
```

### 7. Modificar `index.html`

**CRÍTICO — Errores comunes que rompen los artículos:**

```html
<!-- title -->
<title>SITE_TITLE - News</title>

<!-- meta theme-color debe ser PRIMARY_COLOR -->
<meta name="theme-color" content="#1a3a5c">

<!-- El inline script DEBE usar './logo-header.png' (no base + ...) -->
<!-- Y DEBE usar a.excerpt (no a.desc) -->
<script>
(async function(){
    const apiUrl = 'https://cms-nuevos3.sebastianvernis.workers.dev/api/articles?site=SITE_NAME&limit=12';
    let articles = [];
    try {
        const res = await fetch(apiUrl);
        if(!res.ok) throw new Error('Network');
        const data = await res.json();
        articles = data.articles || [];
    } catch(e) {
        if (window.PWAManager) articles = await PWAManager.getLocalArticles();
    }
    if(!articles?.length) return;
    const container = document.querySelector('.main-content');
    if(container) {
        container.innerHTML = '<div class="masonry-wall">' + articles.map((a, i) => {
            const shape = i % 3 === 0 ? 'tall' : i % 3 === 1 ? 'wide' : 'normal';
            const dims = i % 3 === 0 ? '400x600' : i % 3 === 1 ? '600x300' : '400x400';
            const descLen = i % 3 === 0 ? 200 : 80;
            return '<a href="/articulo/?slug=' + encodeURIComponent(a.slug) + '" class="masonry-brick brick-' + shape + '">' +
                '<div class="brick-img"><img src="' + (a.imageUrl || './logo-header.png') + '" alt="' + a.title + '"></div>' +
                '<div class="brick-body"><span class="brick-cat">' + (a.category || 'Noticias') + '</span>' +
                '<h3>' + a.title + '</h3><p>' + (a.excerpt ? a.excerpt.substring(0, descLen) + '...' : '') + '</p></div></a>';
        }).join('') + '</div>';
    }
})();
</script>
```

**Errores a evitar absolutamente:**
- ❌ `base + 'logo-header.png'` → ReferenceError (base no existe en ese scope)
- ❌ `a.desc` → undefined (la API devuelve `excerpt`, no `desc`)
- ❌ `a.imageUrl || base + 'logo-header.png'` → falla en producción

### 8. Modificar `components.js`

El archivo `components.js` inyecta: preloader, ticker, header, footer. Adaptar:

**Patrón correcto del ticker:**

```javascript
function injectTicker() {
    const el = document.getElementById('site-header');
    if (!el) return;
    const now = new Date();
    const timeStr = now.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
    el.insertAdjacentHTML('beforebegin', '<div class="X-ticker">' +
        '<div class="ticker-X-left"><div class="ticker-X-logo"><img src="' + base + 'logo-header.png" alt="SITE_NAME"></div></div>' +
        '<div class="ticker-X-viewport" id="ticker-X-viewport"><div class="ticker-X-inner" id="ticker-X-inner"><span class="ticker-loading">Cargando...</span></div></div>' +
        '<div class="ticker-X-right"><div class="ticker-X-time">' + timeStr + '</div>' +
        '<div class="ticker-X-social"><a href="..."><i class="fab fa-twitter"></i></a><a href="..."><i class="fab fa-facebook-f"></i></a></div></div>' +
    '</div>');
    fetchTicker();
}

async function fetchTicker() {
    const inner = document.getElementById('ticker-X-inner');
    if (!inner) return;
    try {
        const res = await fetch('https://cms-nuevos3.sebastianvernis.workers.dev/api/articles?site=SITE_NAME&limit=5');
        if (!res.ok) throw new Error('Network');
        const data = await res.json();
        const articles = data.articles || [];
        if (!articles.length) { inner.innerHTML = '<span>Sin noticias</span>'; return; }
        const items = articles.map(a => '<a href="/articulo/?slug=' + encodeURIComponent(a.slug) + '" class="ticker-X-item">' + a.title + '</a>').join('<span class="ticker-X-sep">•</span>');
        inner.innerHTML = items + items;  // Duplicado para loop infinito
        startXTicker();
    } catch(e) {
        inner.innerHTML = '<span>SITE_TITLE • Tu fuente de noticias</span>';
        startXTicker();
    }
}

function startXTicker() {
    const inner = document.getElementById('ticker-X-inner');
    const viewport = document.getElementById('ticker-X-viewport');
    if (!inner || !viewport) return;
    let pos = 0;
    const speed = 0.8;
    const halfWidth = inner.scrollWidth / 2;
    function tick() {
        pos -= speed;
        if (pos <= -halfWidth) pos = 0;
        inner.style.transform = 'translateX(' + pos + 'px)';
        requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
}
```

**NUNCA usar:**
- ❌ `insertAdjacentHTML('afterend', ...)` — debe ser `'beforebegin'`
- ❌ `setInterval` para animación — usar `requestAnimationFrame`
- ❌ Track/label internos sin viewport contenedor — causa overflow

### 9. Modificar `style-custom.css`

Agregarブロック de ticker/header/footer al final del archivo:

```css
/* ===== SITE_NAME TICKER ===== */
.X-ticker {
  display: flex;
  align-items: center;
  background: linear-gradient(135deg, #1a3a5c 0%, #2d5a87 100%);
  color: #fff;
  height: 44px;
  overflow: hidden;
}
.ticker-X-left { display: flex; align-items: center; flex-shrink: 0; }
.ticker-X-logo {
  display: flex;
  align-items: center;
  padding: 0 12px;
  height: 100%;
  background: #fff;
  flex-shrink: 0;
}
.ticker-X-logo img { height: 28px; width: auto; object-fit: contain; }
.ticker-X-viewport { flex: 1; overflow: hidden; white-space: nowrap; position: relative; }
.ticker-X-inner { display: inline-block; white-space: nowrap; }
.ticker-X-item {
  color: rgba(255,255,255,0.9);
  text-decoration: none;
  font-size: 0.8em;
  padding: 0 16px;
  white-space: nowrap;
  transition: color 0.3s;
}
.ticker-X-item:hover { color: #fff; }
.ticker-X-sep { color: #accent; padding: 0 4px; }
.ticker-loading { color: rgba(255,255,255,0.5); font-size: 0.8em; font-style: italic; }
.ticker-X-right { display: flex; align-items: center; gap: 12px; flex-shrink: 0; padding: 0 12px; }
.ticker-X-time {
  background: #LIGHT_COLOR;
  color: #PRIMARY_COLOR;
  font-weight: 800;
  font-size: 0.7em;
  padding: 4px 10px;
  border-radius: 4px;
  letter-spacing: 1px;
}
.ticker-X-social { display: flex; gap: 8px; }
.ticker-X-social a {
  color: rgba(255,255,255,0.7);
  text-decoration: none;
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  transition: all 0.3s;
  font-size: 0.85em;
}
.ticker-X-social a:hover { color: #fff; background: rgba(255,255,255,0.15); }

/* ===== SITE_NAME HEADER ===== */
.site-header-X {
  background: linear-gradient(135deg, #PRIMARY_COLOR 0%, #SECONDARY_COLOR 100%);
  padding: 0;
}
.header-X-nav { padding: 0 24px; }
.nav-X-inner {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  height: 48px;
}
.nav-X-link {
  color: rgba(255,255,255,0.85);
  text-decoration: none;
  font-weight: 600;
  font-size: 0.8em;
  letter-spacing: 0.5px;
  padding: 6px 14px;
  border-radius: 4px;
  transition: all 0.3s;
  white-space: nowrap;
}
.nav-X-link:hover { color: #fff; background: rgba(255,255,255,0.15); }
.nav-X-link.active { background: rgba(255,255,255,0.2); color: #fff; }

/* ===== SITE_NAME FOOTER ===== */
.site-footer-X {
  background: #PRIMARY_COLOR;
  padding: 36px 20px 20px;
  margin-top: 60px;
}
.footer-X-inner { max-width: 800px; margin: 0 auto; }
.footer-X-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 32px;
  max-width: 480px;
  margin: 0 auto 20px;
}
.footer-X-col { text-align: center; }
.footer-X-title {
  font-size: 0.7em;
  font-weight: 800;
  letter-spacing: 2px;
  text-transform: uppercase;
  color: #LIGHT_COLOR;
  margin-bottom: 12px;
  padding-bottom: 8px;
  border-bottom: 2px solid #SECONDARY_COLOR;
  display: inline-block;
}
.footer-X-list { list-style: none; display: flex; flex-direction: column; gap: 8px; }
.footer-X-list li a { color: rgba(255,255,255,0.7); text-decoration: none; font-size: 0.85em; transition: color 0.3s; }
.footer-X-list li a:hover { color: #LIGHT_COLOR; }
.footer-X-bottom {
  border-top: 1px solid rgba(255,255,255,0.1);
  padding-top: 14px;
  text-align: center;
  font-size: 0.75em;
  color: rgba(255,255,255,0.45);
}

/* ===== MOBILE ===== */
@media (max-width: 768px) {
  .footer-X-grid { grid-template-columns: 1fr; }
  .nav-X-inner { overflow-x: auto; }
}
```

### 10. Agregar Logo a `_shared/`

```bash
cp logo-header.png cms-nuevos3/sites/_shared/SITE_NAME.png
```

### 11. Subir a Cloudflare Pages

```bash
cd cms-nuevos3/sites/$SITE_NAME
npx wrangler pages deploy . --project-name=$SITE_NAME --branch=master
```

---

## Checklist de Errores Comunes

| Problema | Causa | Solución |
|---|---|---|
| Artículos no cargan | `a.imageUrl \|\| base + 'logo-header.png'` — `base` undefined | Usar `'./logo-header.png'` |
| Artículos sin descripción | `a.desc` en vez de `a.excerpt` | Cambiar a `a.excerpt` |
| Ticker se encima del logo/derecha | Falta viewport con `overflow:hidden` | Estructura viewport/inner |
| Ticker no hace loop | Solo un set de items, falta duplicar | `inner.innerHTML = items + items` |
| "Cargando..." eterno | ID mal puesto (`ticker-X-track` vs `ticker-X-inner`) | Asegurar IDs consistentes |
| Logo blanco invisible | `filter: brightness(0) invert(1)` aplicado a logo sobre fondo blanco | Quitar el filtro |
| Nav descentrado | Falta `justify-content: center` en `.nav-X-inner` | Agregar al CSS |

---

## API del Worker

El Worker `cms-nuevos3.sebastianvernis.workers.dev` expone:

```
GET /api/articles?site={SITE_SLUG}&limit={N}
```

Respuesta:
```json
{
  "articles": [
    {
      "id": 123,
      "slug": "titulo-del-articulo",
      "title": "Título del Artículo",
      "excerpt": "Descripción breve del artículo...",
      "imageUrl": "https://...",
      "category": "Nacional",
      "publishedAt": "2026-05-23T12:00:00Z"
    }
  ]
}
```

**NUNCA usar** `desc` — la API solo devuelve `excerpt`.

---

## Base de Datos D1

Todos los sitios comparten la misma base `news_db_cms_nuevos3`. La tabla de artículos por sitio sigue el patrón `ARTICULOS_SITIO_{SITE_NAME_UPPER}`.

El middleware en `functions/_middleware.js` actualiza automáticamente `WEB_URL` y `WEB_FECHA` cuando alguien visita un artículo.

---

## Registro de Sitios en el Worker

Para que un nuevo sitio sea reconocido por el Worker, necesita existir en la tabla de configuración del CMS (D1). Consultar la documentación del Worker cms-nuevos3 para agregar el sitio a la tabla de sites activos.