# Placeholders

El template usa **7 placeholders literales** + 1 host CMS. Todos se sustituyen
atómicamente por `scripts/new-site.mjs` con los valores del `site.config.json`.

## Tabla maestra

| Placeholder | Tipo | Origen en config | Ejemplo | Aparece en |
|---|---|---|---|---|
| `PLACEHOLDER_NAME` | string | `config.name` | `elnuevositio` | title, meta, fetch URLs, RSS, components.js |
| `PLACEHOLDER_TITLE` | string | `config.title` | `El Nuevo Sitio` | <title>, nav, footer, script.js, components.js fallback |
| `PLACEHOLDER_COLOR` | color | `config.theme.primary` | `#1a3a5c` | style.css (--site-primary), preloader en components.js, og theme-color |
| `PLACEHOLDER_SECONDARY` | color | `config.theme.secondary` | `#2d5a87` | style.css (--site-secondary), style-custom.css |
| `PLACEHOLDER_LIGHT` | color | `config.theme.light` | `#e8f4fd` | style-custom.css (hovers, surfaces claras) |
| `PLACEHOLDER_TEXT` | color | `config.theme.text` | `#1a1a1a` | style-custom.css (texto base) |
| `PLACEHOLDER_X` | string | `config.prefix` (3-6 chars) | `enst` | clases CSS, IDs, funciones JS |
| `cms-nuevos3.sebastianvernis.workers.dev` | host | `config.cms.host` | `cms-nuevos4.workers.dev` | components.js (fetch ticker), index.html (fetch articles) |

## Conteo por archivo

```
acerca-de.html: 3
contacto.html: 3
index.html: 4
privacidad.html: 3
terminos.html: 4
components.js: 13
script.js: 2
style.css: 2
style-custom.css: 47
wrangler.toml: 1
articulo/index.html: 1
categoria/index.html: 3
functions/articulo/[slug].js: 1
```

## Por qué `PLACEHOLDER_X` es especial

No es decorativo. Varios sitios del mismo dominio (p. ej.
`cms-nuevos3.sebastianvernis.workers.dev/site-a/` y
`...workers.dev/site-b/`) pueden coexistir. Sin prefijo, las clases `.ticker-viewport`
y `#site-header` colisionan en el DOM global.

Por eso **cada referencia a `PLACEHOLDER_X` se expande a un prefijo único** que
vive en:

- **Clases CSS**: `.PLACEHOLDER_X-ticker`, `.site-header-PLACEHOLDER_X`, `.footer-PLACEHOLDER_X-grid`, `.nav-PLACEHOLDER_X-inner`…
- **IDs**: `ticker-PLACEHOLDER_X-viewport`, `ticker-PLACEHOLDER_X-inner`
- **Funciones JS**: `startPLACEHOLDER_XTicker()`

**Reglas del prefijo**:
- Mínimo 3, máximo 6 caracteres.
- Solo minúsculas `[a-z]`.
- Debe ser único en el namespace del CMS (cada CMS tiene su propio pool).

## Por qué el host del CMS es un placeholder

El template original apuntaba fijo a `cms-nuevos3.sebastianvernis.workers.dev`.
En el limpio, el host viene del config para soportar:

- Migración a un CMS nuevo (`cms-nuevos4.workers.dev`).
- Staging local con un tunnel (`abc123.trycloudflare.com`).
- Multi-CMS donde cada sitio consume un worker distinto.

## Sustitución

`scripts/new-site.mjs` aplica todas las sustituciones en **una pasada**, ordenadas
por longitud descendente (las claves más largas primero) para evitar pisar
nombres. Ejemplo del orden efectivo:

```
PLACEHOLDER_SECONDARY          (20)
PLACEHOLDER_NAME               (15)
PLACEHOLDER_TITLE              (16)
PLACEHOLDER_COLOR              (15)
PLACEHOLDER_LIGHT              (15)
PLACEHOLDER_TEXT               (14)
PLACEHOLDER_X                  (12)
cms-nuevos3.sebastianvernis.workers.dev  (40)
```

> Si renombras un placeholder, el script **no lo va a encontrar** y el sitio
> generado quedará roto. Lee [CUSTOMIZE.md](CUSTOMIZE.md) antes de tocar nada.
