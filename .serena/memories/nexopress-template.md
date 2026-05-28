# NexoPress Template

## Estructura
- `index.html` — Homepage masonry (usa `./logo-header.png` y `a.excerpt`)
- `style.css` — Base (masonry, category, article)
- `style-custom.css` — Colores + ticker/header/footer (reemplazar PLACEHOLDER_ con valores)
- `components.js` — Inyección preloader/ticker/header/footer (reemplazar X con prefijo único)
- `script.js` — JS auxiliar
- `sw.js` — Service Worker
- `wrangler.toml` — Binding D1
- `_redirects` — Proxy al worker
- `robots.txt` — SEO

## Placeholders a reemplazar
- `PLACEHOLDER_NAME` → nombre del sitio (minúsculas)
- `PLACEHOLDER_TITLE` → Título legible
- `PLACEHOLDER_COLOR` → Color primario (#xxxxxx)
- `PLACEHOLDER_SECONDARY` → Color secundario
- `PLACEHOLDER_LIGHT` → Color claro
- `PLACEHOLDER_TEXT` → Color de texto
- `PLACEHOLDER_X` → Prefijo único (ej: dmxo, dmex, obsr, etc.)

## Errores críticos
- NO usar `base + 'logo-header.png'` → `./logo-header.png`
- NO usar `a.desc` → `a.excerpt`
- Ticker debe usar viewport/inner con `beforebegin`