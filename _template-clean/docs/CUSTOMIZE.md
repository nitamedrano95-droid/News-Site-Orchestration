# Qué se puede modificar (y qué no)

## ✅ Modificable con confianza

### CSS — `style.css` y `style-custom.css`

Puedes **agregar** selectores, ajustar valores y refactorizar libremente,
**mientras no renombres**:

- Variables `:root` con prefijo `--site-*` (`--site-primary`, `--site-secondary`,
  `--site-light`, `--site-text`). Son el contrato con el config.
- Clases públicas: `.masonry-wall`, `.masonry-brick`, `.brick-tall|wide|normal`,
  `.news-grid`, `.news-card`, `.article-full`, `.category-page`, `.category-badge`,
  `.section-title`, `.site-header-PLACEHOLDER_X`, `.PLACEHOLDER_X-ticker`,
  `.site-footer-PLACEHOLDER_X`, `.footer-PLACEHOLDER_X-grid`, `.nav-PLACEHOLDER_X-inner`.

`article.css` y `legal.css` son libres salvo por `--site-primary`, que `article-quote`
y `legal-content h1` consumen.

### HTML — páginas legales

`acerca-de.html`, `contacto.html`, `privacidad.html`, `terminos.html`:
puedes cambiar el texto, agregar secciones, ajustar `.legal-page` a tu gusto.
Los 3-4 placeholders por archivo se sustituirán normalmente.

### JS — `components.js`

Puedes editar:

- Texto del ticker (cargado del CMS o fallback).
- Slogan del header.
- Links de redes sociales.
- Categorías en nav y footer (recomendado: regenera el config con el array
  `categories` y parchea las URLs en components.js; o bien agrega una
  función `getCategories()` que devuelva un array — eso sí es trabajo extra).

**No cambies**:

- Línea 3: `const isSubdir = /\/(articulo|categoria|admin)\//.test(path);`
  Si agregas un subdir nuevo, añádelo al regex. Si no, los links `./` vs `../`
  se rompen.
- IDs de inyección: `site-preloader`, `site-header`, `site-footer`. Sin ellos,
  `components.js` no encuentra dónde inyectar.

### JS — `script.js`

Efectos de UI: preloader, click handlers, nav-active, scroll-shadow. Todo
inofensivo. Modifica libremente.

### SW — `sw.js`

El array `STATIC` y la constante `CACHE_NAME` (cambia la versión cuando
agregues/elimines assets para invalidar caches).

### `_redirects`

Agrega o ajusta reglas. Las dos críticas son las de `/api/*` y `/rss.xml`; esas
las regenera el script.

## ⛔ Inmodificable sin entender el contrato

### 1. Los 7 placeholders literales

`PLACEHOLDER_NAME`, `PLACEHOLDER_TITLE`, `PLACEHOLDER_COLOR`, `PLACEHOLDER_SECONDARY`,
`PLACEHOLDER_LIGHT`, `PLACEHOLDER_TEXT`, `PLACEHOLDER_X`.

Renombrarlos rompe `scripts/new-site.mjs` (no los encuentra) y produce un sitio
con tokens sin sustituir que el browser no sabe renderizar.

### 2. El sufijo `PLACEHOLDER_X`

Ver [PLACEHOLDERS.md](PLACEHOLDERS.md#por-qué-placeholder_x-es-especial).
Si lo renombras, las clases/IDs chocan entre sitios del mismo dominio.

### 3. IDs de inyectables

`index.html`, `articulo/index.html`, `categoria/index.html` y las páginas
legales dependen de estos divs:

```html
<div id="site-preloader"><div class="loader"></div></div>  ← solo en index.html
<div id="site-header"></div>
<div id="site-footer"></div>
```

`components.js` busca por `getElementById`. Renómbralos y la inyección se cae.

### 4. Las URLs de fetch hardcodeadas

```js
// components.js
fetch('https://cms-nuevos3.sebastianvernis.workers.dev/api/articles?site=NAME&limit=5')
// index.html
fetch('https://cms-nuevos3.sebastianvernis.workers.dev/api/articles?site=NAME&limit=12')
// articulo/index.html
fetch('https://cms-nuevos3.sebastianvernis.workers.dev/api/articles/' + slug)
// categoria/index.html
fetch('https://cms-nuevos3.sebastianvernis.workers.dev/api/articles?site=NAME&cat=' + cat)
```

El script **ya sustituye** el host del CMS en estos lugares, así que no los
edites a mano. Cambia `config.cms.host` y regenera.

### 5. Functions de Cloudflare Pages

```js
// functions/_middleware.js
import { handleArticleRequest } from "../../_shared/article-middleware.js";
return handleArticleRequest(context, "PLACEHOLDER_NAME");

// functions/articulo/[slug].js
import { handleArticleRequest } from '../../../_shared/article-middleware.js';
return handleArticleRequest(modifiedContext, 'PLACEHOLDER_NAME');
```

- Las rutas `../../_shared/` y `../../../_shared/` son **relativas al CMS, no al
  sitio**. El sitio se despliega asumiendo que el CMS provee ese módulo.
- `handleArticleRequest(ctx, "NAME")` es la firma esperada. Cambiarla rompe
  todas las páginas de artículo a nivel edge.

### 6. `database_id` en `wrangler.toml`

Es el identificador único del D1 en Cloudflare. Apunta a una base existente en
el CMS. Cambiarlo apuntaría a otra DB (o fallaría el deploy). Si necesitas
rotar la base, hazlo en el CMS primero, no aquí.

### 7. El `isSubdir` regex en components.js (línea 3)

Decide si las rutas inyectadas son `./` o `../`. Si agregas un subdirectorio
nuevo (p. ej. `seccion/`), añádelo al regex. Si no, los links se rompen ahí.

## Checklist antes de un cambio grande

- [ ] ¿Cambié algún placeholder literal? → **mal**, revierte.
- [ ] ¿Renombré una clase contractual? → revisa que `index.html`,
      `articulo/`, `categoria/` y `style*.css` coincidan.
- [ ] ¿Agregué un subdirectorio nuevo? → añadelo al `isSubdir` regex.
- [ ] ¿Cambié el host del CMS a mano en lugar de en el config? → revierte y
      regenera con `--config`.
- [ ] ¿Toqué `database_id`? → restáuralo al del CMS.
