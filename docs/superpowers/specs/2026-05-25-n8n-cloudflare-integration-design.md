# SPEC: Integración n8n Scraper → Cloudflare Workers

**Fecha:** 2026-05-25
**Estado:** Borrador para revisión

---

## 1. Contexto

El pipeline actual de ingesta tiene dos modos:

| Modo | Quién raspado | Quién almacena | Quién publica |
|------|---------------|----------------|---------------|
| **A (Worker)** | Cloudflare Worker (`rss-ingest.js`) | Worker → D1 + R2 | Worker → Facebook API |
| **B (n8n)** | n8n workflow (RSS + Apify) | ¿? | ¿? |

El usuario quiere que **n8n se encargue del scraping** (RSS + HTML + contenido limpio) y que **Cloudflare Workers manejen el almacenamiento (D1 + R2)** y la **publicación a Facebook**.

Esto requiere definir cómo n8n entrega artículos a cada Worker.

---

## 2. Arquitectura Propuesta

```
n8n Workflow                    Cloudflare Worker
─────────────────               ──────────────────
  │                                │
  │ RSS + HTML scraping            │
  │ + content cleaning            │
  │ + deduplicación               │
  │                               │
  │ POST /api/jobs/ingest/:site   │
  │ { articles: [                 │
  │    { title, content,          │
  │      imageUrl, url,           │
  │      category?, pubDate? } ]  │
  │ } ─────────────────────────────▶ Worker recibe artículos ya raspados
  │                               │   1. Sube imageUrl → R2
  │                               │   2. Inserta en D1 ARTICULOS_PARAFRASEADOS
  │                               │   3. Devuelve { success, count, articleIds }
  │◀──────────────────────────────
  │ { success, count, articleIds } │
  │                               │
  │ (opcional) POST /api/jobs/publish-fb/:site
  │ { articleIds? } ──────────────▶ Publica a Facebook
  │◀ { success, fbPostId }        │
```

### Nota crítica: subirlas imágenes primero

n8n no puede subir a R2 directamente ( R2 usa credenciales de Cloudflare). La imagen que n8n pasa en `imageUrl` **debe ser una URL pública accesible** (no `data:image/` encodeada). El Worker la descarga y la sube a R2 internamente. Si la imagen viene como `data:image/` base64, el Worker no puede procesarla — n8n debe enviar URLs públicas válidas.

---

## 3. Endpoints del Worker que n8n usará

### 3.1. Ingesta de artículos raspados

```
POST https://{cms}.sebastianvernis.workers.dev/api/jobs/ingest/{siteSlug}
Authorization: Bearer {ADMIN_TOKEN}
Content-Type: application/json

{
  "articles": [
    {
      "title": "string",
      "content": "string (HTML limpio, > 200 chars)",
      "sourceUrl": "string (URL fuente original — CAMPO CRÍTICO)",
      "imageUrl": "string | null (URL pública de imagen)",
      "category": "string | null (opcional, default NACIONAL)"
    }
  ]
}

Respuesta 200:
{
  "success": true,
  "site": "slug",
  "articlesIngested": N,      // artículos realmente insertados
  "totalReceived": N,         // artículos recibidos en el batch
  "errors": [                 // solo si hay errores de parsing/ejecución
    { "title": "...", "error": "..." }
  ]
}
```

**Comportamiento del Worker:**
- Por cada artículo: verifica `SOURCE_URL` no exista (dedup)
- Si `imageUrl` es URL pública válida: descarga y sube a R2 → nueva URL R2
- Si `imageUrl` es null/inválida: `URL_IMAGEN = NULL`
- Inserta en `ARTICULOS_PARAFRASEADOS`
- Devuelve IDs insertados

### 3.2. Forzar publicación Facebook (opcional, después de ingesta)

```
PUT https://{cms}.sebastianvernis.workers.dev/api/jobs/publish-fb/{siteSlug}
Authorization: Bearer {ADMIN_TOKEN}
Content-Type: application/json

{
  "articleIds": [id1, id2] | null  // null = últimos N
}

Respuesta 200:
{
  "success": true,
  "site": "slug",
  "published": N,
  "fbPostIds": [ fbPostId, ... ]
}
```

Este endpoint ya existe como `processFBTimerForSite` — llama internamente al scraping de artículos si `ESTADO = 'PARA_RASPAR'` y luego publica el último artículo a FB.

---

## 4. Sincronización:缝隙y n8n

### 4.1. Detectar sitio por fuente RSS

Cada fuente RSS tiene `siteSlug` asociado en D1 (`SITIOS` table). El workflow de n8n:

1. Lee fuentes RSS desde tabla n8n o D1
2. Normaliza artículos
3. Agrupa por `siteSlug`
4. Envía batch a `POST /jobs/ingest/{siteSlug}`

### 4.2. Scheduling

Los Workers ya tienen cron jobs que publican a FB cada 17 minutos. Para forzar publicación inmediata después de ingesta:

```
PUT /api/jobs/publish-fb/{siteSlug}  → publishing inmediato
```

### 4.3. Error handling

- Worker responde con `{ success: false, error: "..." }` si:
  - Token inválido → 401
  - Sitio no encontrado → 404
  - Artículos con formato inválido → 400
  - Falla al subir imagen a R2 → se inserta con `URL_IMAGEN = NULL` (no falla todo el batch)
  - D1 error → 500

n8n debe hacer retry con backoff en caso de 5xx.

---

## 5. Formato de artículos que n8n debe enviar

El Worker (`processPreScrapedArticle`) espera **exactamente** estos campos:

```typescript
interface PreScrapedArticle {
  title: string;         // ✓ Requerido
  content: string;      // ✓ Requerido, > 200 chars
  sourceUrl: string;    // ✓ Requerido — URL fuente original (NO "url")
  imageUrl?: string;    // Recomendado — URL pública de imagen (NO data:image/)
  category?: string;
}
```

| Campo | Requerido | Notas |
|-------|-----------|-------|
| title | ✅ | Texto del título |
| content | ✅ | HTML limpio, > 200 chars después de cleaning |
| **sourceUrl** | ✅ | URL fuente original (el Worker busca duplicados por este campo) |
| imageUrl | Recomendado | URL pública. Si falla upload a R2 o es null → **artículo se ignora** |
| category | Opcional | Valor por defecto: `NACIONAL` |

**Errores comunes que ignoran artículos silenciosamente:**

| Causa | Síntoma |
|-------|---------|
| `content.length < 200` | Artículo skippeado sin error en respuesta |
| `sourceUrl` ya existe en D1 | Artículo deduplicado, no se inserta |
| `uploadToR2(imageUrl)` falla | Artículo skippeado con warning en logs del Worker |
| `imageUrl` es null o inválida | Artículo skippeado — "Skip: No valid image" |

**Campo `sourceUrl` (no `url`):** El Worker hace `const { title, content, imageUrl, sourceUrl, category } = article`. Si mandas `url` en vez de `sourceUrl`, el artículo se inserta sin dedup funcional y puede duplicarse.

---

## 6. Approcini possibili

### Approccio A (raccomandato): Batch POST

n8n agrupa artículos por sitio y hace **1 POST por sitio** con todos los artículos en un batch. El Worker procesa en loop, hace dedup, sube imágenes y guarda en D1.

**Pro:** few HTTP calls, simple.
**Contro:** si el batch es muy grande (>100), implica más tiempo de procesamiento en el Worker.

### Approccio B: Un article per POST

Cada artículo se envía individualmente. El Worker procesa uno por uno — duplicados se skipped.

**Pro:** fácil de debugging, retry granular.
**Contro:** many HTTP calls, más overhead.

### Approccio C: Mixed

Batch pequeño (< 20 artículos) = un POST. Batch grande = chunks de 20.

**Pro:** bilanciato.
**Contro:** complejidad adicional.

---

## 7. Recomendación

**Usar Approccio A (Batch POST)** con chunks de máximo 50 artículos por llamada, agrupados por `siteSlug`. n8n puede leer las fuentes RSS, rasparlas, y hacer 1 llamada por CMS worker por ciclo de scheduling.

El Worker ya tiene la lógica de `processPreScrapedArticle` implementing questo pattern.

---

## 8. Roadmap de implementación

1. **Auditoría de consistencia**: Verificar que `processPreScrapedArticle` exista y tenga la misma signature en los 4 CMS workers (cms-originaux, cms-nuevos, cms-nuevos2, cms-nuevos3)
2. **Test del endpoint**: Hacer POST manual con 1 artículo y verificar que aparece en D1
3. **Configurar n8n workflow** "RSS Feed Cleaner" para llamar `POST /jobs/ingest/{siteSlug}` con los artículos raspados y contenido limpio
4. **Test punto a punto**: RSS → n8n cleaning → Worker ingest → D1 → FB publish
5. **Monitoreo**: agregar logs en el Worker para distinguir artículos que vienen de n8n vs scraping interno (tag en logs o en D1)

---

**Silent skips (no error field en response, artículo no se inserta):**

- `content.length < 200` después de cleaning → "Skip: Content too short or missing"
- `sourceUrl` ya existe en D1 → "Skip: Duplicate article"
- `uploadToR2(imageUrl)` falla → "Skip: No valid image" (en logs del Worker)
- `imageUrl` es null/inválida → "Skip: No valid image"

El tally real viene en `articlesIngested` en la respuesta HTTP. Para ver skips hay que revisar los logs del Worker (no viene en la response). Para diagnóstico, hacer GET del artículo por `sourceUrl` después.

---

## 9. Validación

Antes de implementar, verificar:

- [ ] `processPreScrapedArticle` en los 4 CMS workers — ¿misma signature?
- [ ] `imageUrl`=null → ¿se skippea o se inserta con `URL_IMAGEN=NULL`?
- [ ] ¿Cuántos artículos por batch es razonable? (50? 100?)
- [ ] ¿El deduplicado por `SOURCE_URL` funciona correctamente?
- [ ] ¿Workers cms-nuevos, cms-nuevos2, cms-nuevos3 tienen el mismo código?
