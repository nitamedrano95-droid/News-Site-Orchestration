# Facebook Image Upload — Blob vs URL

**Fecha de captura:** 2026-06-02
**Origen:** `worktree-ai-validation-flow/cms-nuevos3/src/cron/facebook.js` líneas 49-82
**Estado:** NO integrado en producción. Documentado para referencia futura.

---

## Contexto

En el worker de Facebook (`cms-nuevos*/src/cron/facebook.js`), cuando se publica un
artículo en una página de Facebook, hay que subir la imagen asociada.

Hay dos formas de hacerlo:

### Método 1 (main, actual en producción) — Pasar URL a Facebook
```javascript
const photoForm = new FormData();
photoForm.append('access_token', token);
photoForm.append('published', 'false');
photoForm.append('url', article.URL_IMAGEN);

const photoRes = await fetch(
  `https://graph.facebook.com/v19.0/${site.FACEBOOK_PAGE_ID}/photos`,
  { method: 'POST', body: photoForm }
);
```

Facebook recibe la URL, la descarga por su cuenta, y la sube.

**Problema conocido:** Facebook a veces **no puede acceder a la URL** (especialmente
si está en R2 detrás de un custom domain con rate limiting, o si la URL tiene
caracteres que FB no acepta, o si FB tiene un problema de red regional). El síntoma es
que la imagen queda vacía o el post falla con un error tipo:
```
{"error":{"message":"(#100) The URL fetched does not match the OG URL..."}}
```

### Método 2 (worktree-ai-validation-flow) — Descargar localmente y subir como blob
```javascript
const imgRes = await fetchWithTimeout(article.URL_IMAGEN, {
  headers: { 'User-Agent': 'Mozilla/5.0' }
}, 10000);  // 10s timeout

if (imgRes.ok) {
  const imgBlob = await imgRes.blob();
  const photoForm = new FormData();
  photoForm.append('access_token', token);
  photoForm.append('published', 'false');
  photoForm.append('source', imgBlob, 'image.jpg');  // <-- 'source' en vez de 'url'

  const photoRes = await fetch(
    `https://graph.facebook.com/v19.0/${site.FACEBOOK_PAGE_ID}/photos`,
    { method: 'POST', body: photoForm }
  );
  // ...
}
```

**Cómo funciona:** El Worker descarga la imagen con su propio `fetch` (User-Agent
normal de navegador, timeout 10s), la convierte en `Blob`, y la sube directamente a
Facebook como archivo multipart (`source` en vez de `url`).

**Ventajas:**
- ✅ Evita el problema de Facebook no pudiendo acceder a la URL
- ✅ Timeout explícito (10s) — si R2 está lento, el Worker falla limpio en vez de
   esperar indefinidamente
- ✅ User-Agent de navegador puede ayudar si la URL está protegida contra bots
- ✅ Se puede loguear el tamaño del blob descargado para debugging

**Desventajas:**
- ⚠️ El Worker paga el ancho de banda de descargar la imagen (no es problema en
   Cloudflare, sale gratis del mismo PoP)
- ⚠️ Si la imagen es muy grande (>5MB), el Blob en memoria puede ser pesado
- ⚠️ Si la URL devuelve 404 o 403, el Worker no publica (antes, Facebook también
   fallaba pero con un mensaje de error distinto)

---

## Cuándo integrar este método

**Cuándo SÍ vale la pena:**
- Si después de un deploy hay reportes de posts de Facebook sin imagen
- Si los logs muestran errores tipo "URL fetched does not match" o "Could not fetch"
- Si la página de Facebook tiene problemas con rate limiting al descargar de R2

**Cuándo NO vale la pena:**
- Si el método actual (URL) está funcionando (la mayoría de los casos)
- Si R2 está sirviendo imágenes rápido y sin problemas

---

## Cómo portarlo (si decides aplicarlo)

Si en el futuro quieres aplicar este cambio, el diff es ~20 líneas en
`cms-nuevos*/src/cron/facebook.js`:

```diff
- console.log(`[FB] Uploading image via URL: ${article.URL_IMAGEN.substring(0, 60)}...`);
- const photoForm = new FormData();
- photoForm.append('access_token', token);
- photoForm.append('published', 'false');
- photoForm.append('url', article.URL_IMAGEN);
- const photoRes = await fetch(
-   `https://graph.facebook.com/v19.0/${site.FACEBOOK_PAGE_ID}/photos`,
-   { method: 'POST', body: photoForm }
- );
+ console.log(`[FB] Fetching image: ${article.URL_IMAGEN.substring(0, 60)}...`);
+ const imgRes = await fetchWithTimeout(article.URL_IMAGEN, {
+   headers: { 'User-Agent': 'Mozilla/5.0' }
+ }, 10000);
+ if (imgRes.ok) {
+   const imgBlob = await imgRes.blob();
+   const photoForm = new FormData();
+   photoForm.append('access_token', token);
+   photoForm.append('published', 'false');
+   photoForm.append('source', imgBlob, 'image.jpg');
+   const photoRes = await fetch(
+     `https://graph.facebook.com/v19.0/${site.FACEBOOK_PAGE_ID}/photos`,
+     { method: 'POST', body: photoForm }
+   );
+   // ... resto del manejo de respuesta igual
+ }
```

**Helper `fetchWithTimeout`** que el worktree asume existente — buscar en
`utils/` o crearlo:
```javascript
async function fetchWithTimeout(url, options, ms) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), ms);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}
```

---

## Por qué NO se integró

- La rama `worktree-ai-validation-flow` que lo contenía fue eliminada el 2026-06-02.
- La única motivación del worktree (validación con IA de artículos) nunca se
  construyó. Mantener el worktree activo rompía producción.
- El método actual (URL) está documentado arriba y es funcional.

**Si en el futuro alguien ve problemas de imágenes en Facebook, este es el
primer lugar donde buscar.**
