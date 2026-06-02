# Troubleshooting

Bugs conocidos y cómo diagnosticarlos. Agrupados por síntoma.

## El sitio se ve sin colores / fondo blanco

**Causa**: los placeholders no se sustituyeron. Buscar `#1a3a5c` o `#000` en
`<style>` — si no, `--site-primary` quedó literal como `PLACEHOLDER_COLOR`.

**Fix**: regenerar con `--config` y verificar que el config tenga
`theme.primary` válido.

## El ticker no avanza / se desborda

**Causa**: el viewport del ticker no tiene `overflow: hidden` o el `inner` no
está duplicado.

**Fix**: revisar `.PLACEHOLDER_X-ticker` y `ticker-PLACEHOLDER_X-viewport` en
`style-custom.css`. La animación JS vive en `startPLACEHOLDER_XTicker()` y
asume `inner.scrollWidth / 2` como loop point — necesita el contenido duplicado.

## Las páginas de artículo se ven sin OG tags en Facebook Debugger

**Causa**: las functions no se desplegaron o el `_middleware.js` no está
corriendo.

**Diagnóstico**:
```bash
curl -s https://mi-sitio.pages.dev/articulo/?slug=test \
  | grep '<meta property="og:title"'
```
Si no aparece `og:title` con contenido, el SSR no funcionó.

**Fix**:
- Verificar que `functions/_middleware.js` y `functions/articulo/[slug].js`
  están en la raíz del sitio.
- Verificar que `wrangler.toml` tiene `pages_build_output_dir = "."`.
- Verificar que el CMS tiene `_shared/article-middleware.js`.

## `ReferenceError: base is not defined`

**Causa**: en `components.js` se referencia `base` fuera de la IIFE.

**Fix**: bug histórico del template original. Ya está parcheado en este
template limpio — `base` está declarado dentro del closure. Si reaparece
después de un edit manual, revisar que `injectTicker`, `injectHeader` y
`injectFooter` se llamen desde dentro de la IIFE.

## `TypeError: Cannot read properties of undefined (reading 'excerpt')`

**Causa**: el endpoint de la API cambió y devuelve un shape distinto al que
`index.html` espera.

**Fix**: comparar la respuesta del CMS con lo que espera el front:
```bash
curl 'https://cms-nuevos3.sebastianvernis.workers.dev/api/articles?site=test&limit=1' | jq
```
Campos esperados: `articles[].title`, `articles[].slug`, `articles[].imageUrl`,
`articles[].category`, `articles[].excerpt`.

## El sitio generado en deploy tiene prefijos que colisionan con otro

**Causa**: dos sitios del mismo dominio comparten `prefix`.

**Fix**: cambiar `prefix` en el config y regenerar. Cada sitio en el mismo
`cms.host` debe tener un prefijo distinto. Sugerencia: las primeras 3-4 letras
del slug (`elnuevositio` → `elnu`).

## RSS no se ve

**Diagnóstico**:
```bash
curl -I https://mi-sitio.pages.dev/rss.xml
```

Si devuelve 404, `_redirects` no tiene la regla. Si devuelve 502/503, el
endpoint `/api/rss/{name}` del CMS falla.

**Fix**: verificar que `_redirects` tenga:
```
/rss.xml  /api/rss/{name}  200
```
Esto lo regenera el script automáticamente, así que editarlo a mano es
desaconsejado.

## El log muestra `database_id` inválido en el deploy

**Causa**: el script regeneró `wrangler.toml` con un placeholder para
`database_id` (es `REPLACE_WITH_CMS_D1_ID` por seguridad — no conocemos el ID
del D1 de tu CMS).

**Fix**: editar `wrangler.toml` en el sitio generado y poner el `database_id`
correcto. Es el mismo ID para todos los sitios de un CMS dado.

## El sitio queda en blanco con error 500

**Diagnóstico**: en el dashboard de Cloudflare Pages → Logs, buscar la causa.

Causas comunes:
- `functions/_middleware.js` con sintaxis rota → revisar con `node -c`.
- `wrangler.toml` con TOML malformado → `taplo lint` o un validator.
- `_shared/article-middleware.js` ausente en el CMS.

## El preloader no desaparece

**Causa**: `components.js` no se carga o el evento `load` no dispara.

**Diagnóstico**:
```js
// en consola del browser
typeof injectPreloader
// debería ser 'undefined' (IIFE) o no fallar al cargar components.js
```

**Fix**: verificar que `<script src="components.js" defer>` está antes de
`</body>` y que el archivo se sirve con el MIME correcto (Pages lo hace solo).

## `index.html` no muestra artículos

**Causa**: el fetch a la API falla. Ver `Network` en DevTools.

**Diagnóstico en consola**:
```js
fetch('https://TU_CMS_HOST/api/articles?site=TU_NAME&limit=12')
  .then(r => r.json())
  .then(d => console.log(d.articles?.length))
```

**Fix**: si devuelve error CORS, el CMS necesita el header `Access-Control-Allow-Origin`
adecuado. Si devuelve 404, `cms.host` o `name` están mal.

---

## Diagnóstico rápido: checklist de 30s

Antes de abrir un ticket, verifica:

1. ¿Los placeholders se sustituyeron? `grep -rn PLACEHOLDER_ ../sites/mi-sitio/`
   debe devolver 0 resultados.
2. ¿Los logos existen? `ls ../sites/mi-sitio/*.png`
3. ¿La API responde? `curl https://{cms.host}/api/articles?site={name}&limit=1`
4. ¿El `_redirects` apunta al CMS correcto? `cat ../sites/mi-sitio/_redirects`
5. ¿El `wrangler.toml` tiene un `database_id` válido (no `REPLACE_WITH_…`)?
