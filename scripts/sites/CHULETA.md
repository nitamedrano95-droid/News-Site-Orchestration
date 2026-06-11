# CHULETA — Lógica JS obligatoria y zonas protegidas

**Para:** vos (Sebastian), mientras editás en Open Design / Claude Design.
**Objetivo:** saber de un vistazo qué se puede tocar, qué no, y qué
forma debe tener el código si tocás algo.

---

## 1. La regla de oro

**Una columna = un nombre en el código.** El backend usa MAYÚSCULAS
(`SITIO_SLUG`, `ID_PARAFRASEADO`, `FB_PUBLICADO`). El frontend
(TypeScript/JS) usa camelCase derivado (`sitioSlug`, `idParafraseado`,
`fbPublicado`). Si el parser los mapea distinto, **el bug está en el
parser, no en el campo**.

**No renombrar columnas a mano.** Si necesitás un alias, agregalo en el
parser (`src/utils/seo.js` o donde corresponda), nunca en el SQL.

---

## 2. Tabla consolidada `ARTICULOS_SITIO` (post-migración 004)

**Esquema real (ver `migrations/004_consolidate_sitios.sql`):**

```sql
CREATE TABLE ARTICULOS_SITIO (
  ID              TEXT PRIMARY KEY,    -- UUID generado por crypto.randomUUID()
  SITIO_SLUG      TEXT NOT NULL,       -- lowercase, FK a SITIOS.SLUG
  ID_PARAFRASEADO TEXT NOT NULL,       -- FK a ARTICULOS_PARAFRASEADOS.ID
  FECHA_ASIGNACION TEXT DEFAULT CURRENT_TIMESTAMP,
  FB_PUBLICADO    INTEGER DEFAULT 0,   -- 0 o 1
  FB_FECHA        TEXT,                -- ISO8601 o NULL
  FB_POST_ID      TEXT,                -- ID de Facebook o NULL
  FOREIGN KEY (SITIO_SLUG) REFERENCES SITIOS(SLUG),
  FOREIGN KEY (ID_PARAFRASEADO) REFERENCES ARTICULOS_PARAFRASEADOS(ID)
);
```

**Indexes esperados** (los crea la migración):
- `IDX_ARTICULOS_SITIO_SITIO` (SITIO_SLUG)
- `IDX_ARTICULOS_SITIO_PARA` (ID_PARAFRASEADO)
- `IDX_ARTICULOS_SITIO_FB` (FB_PUBLICADO)

**Las 25 tablas viejas `ARTICULOS_SITIO_<SLUG>` siguen existiendo hasta
que se corra la migración 005** (no escrita todavía, planificada para
30 días post-deploy del refactor). NO escribas a las tablas viejas.
NO borres la migración 005 cuando se cree.

---

## 3. Patrón obligatorio en cada endpoint

### 3.1 SELECT por sitio

```js
// ✅ CORRECTO
const tableName = 'ARTICULOS_SITIO';
const siteSlug  = siteFilter.toLowerCase();
const result = await c.env.DB.prepare(`
  SELECT p.*, s.FB_PUBLICADO, s.FB_FECHA, s.FB_POST_ID
  FROM ${tableName} s
  JOIN ARTICULOS_PARAFRASEADOS p ON s.ID_PARAFRASEADO = p.ID
  WHERE s.SITIO_SLUG = ? AND p.ESTADO = 'PUBLICADO'
`).bind(siteSlug).all();
```

```js
// ❌ INCORRECTO — NO HACER
const tableName = `ARTICULOS_SITIO_${siteSlug.toUpperCase()}`;  // viejo
const result = await c.env.DB.prepare(`
  SELECT * FROM ${tableName} WHERE FB_PUBLICADO = 0
`).all();  // falta filtro por SITIO_SLUG
```

**Por qué:** la tabla vieja tenía un sitio por tabla, no necesitaba
filtro. La nueva tabla tiene 25 sitios mezclados; sin `WHERE
s.SITIO_SLUG = ?` devolvés artículos de los otros 24 sitios.

### 3.2 INSERT de asignación artículo→sitio

```js
// ✅ CORRECTO
const siteId   = crypto.randomUUID();
const tableName = 'ARTICULOS_SITIO';
statements.push(
  c.env.DB.prepare(`
    INSERT INTO ${tableName} (
      ID, SITIO_SLUG, ID_PARAFRASEADO, FECHA_ASIGNACION,
      FB_PUBLICADO, FB_FECHA, FB_POST_ID
    ) VALUES (?, ?, ?, datetime('now'), 0, NULL, NULL)
  `).bind(siteId, siteSlug.toLowerCase(), articleId)
);
```

```js
// ❌ INCORRECTO
statements.push(
  c.env.DB.prepare(`
    INSERT INTO ARTICULOS_SITIO_${siteSlug.toUpperCase()} (
      ID, ID_PARAFRASEADO, ...
    ) VALUES (?, ?, ...)
  `).bind(siteId, articleId)  // falta SITIO_SLUG
);
```

**Notas críticas:**
- `SITIO_SLUG` va con `.toLowerCase()` siempre. La FK a `SITIOS.SLUG`
  está en lowercase.
- `ID` se sigue generando con `crypto.randomUUID()`. La PK NO es
  compuesta; es `ID TEXT PRIMARY KEY`.
- El orden de las columnas en el INSERT debe ser: `ID, SITIO_SLUG,
  ID_PARAFRASEADO, FECHA_ASIGNACION, FB_PUBLICADO, FB_FECHA, FB_POST_ID`.

### 3.3 UPDATE de flags FB

```js
// ✅ CORRECTO
await c.env.DB.prepare(`
  UPDATE ARTICULOS_SITIO
  SET FB_PUBLICADO = 1, FB_FECHA = datetime('now'), FB_POST_ID = ?
  WHERE ID = ?
`).bind(fbResult.post_id, siteId).run();
```

```js
// ✅ TAMBIÉN CORRECTO (cualquiera de los dos funciona)
await c.env.DB.prepare(`
  UPDATE ARTICULOS_SITIO
  SET FB_PUBLICADO = 1, FB_FECHA = datetime('now'), FB_POST_ID = ?
  WHERE ID_PARAFRASEADO = ? AND SITIO_SLUG = ?
`).bind(fbResult.post_id, articleId, siteSlug).run();
```

**NO agregar `WHERE SITIO_SLUG = ?` al primer patrón sin cambiar
también el `bind()`.** El UPDATE por `ID` es seguro porque `ID` es PK
único.

### 3.4 SELECT con JOIN a ARTICULOS_PARAFRASEADOS

**El JOIN es siempre el mismo:**
```js
JOIN ARTICULOS_PARAFRASEADOS p ON s.ID_PARAFRASEADO = p.ID
```

**No** `JOIN ARTICULOS_PARAFRASEADOS p ON s.ID = p.ID` (el campo se
llama `ID_PARAFRASEADO` en la nueva tabla, no `ID`).

---

## 4. Zonas protegidas (NO modificar salvo coordinación)

| Archivo | Qué no tocar | Por qué |
|---|---|---|
| `cms-nuevos4/migrations/004_consolidate_sitios.sql` | el bloque `CREATE TABLE ARTICULOS_SITIO` y los INSERTs de sección 3 | ya aplicada a staging. Cambios requieren nueva migración |
| `cms-nuevos4/src/config.js` | el header (líneas 1-13) y los bloques regenerados | generado por el seed. Si lo editás a mano, el próximo `--no-db` lo sobrescribe |
| `cms-nuevos4/wrangler.toml` | los `database_id` y `id` de los bindings | son IDs únicos de Cloudflare por cuenta |
| `data/sites/cms-nuevos4/_schema.json` | los `default` de campos que ya tienen 25 sitios aplicados | cambiar un default no migra los 25 sitios ya escritos |
| `data/sites/cms-nuevos4/<sitio>.json` | el campo `slug` después de aplicar el seed | cambiar el slug crea un sitio nuevo y el viejo queda huérfano |

---

## 5. Zonas modificables con cuidado

| Archivo | Qué podés tocar | Precauciones |
|---|---|---|
| `data/sites/cms-nuevos4/<sitio>.json` | `nombre`, `tagline`, `dominio`, `tema.*`, `categoria_default`, `notas` | `slug` solo si todavía no se aplicó el seed |
| `data/sites/cms-nuevos4/_schema.json` | agregar campos opcionales con `default` seguro | los 25 sitios deben seguir validando con `node scripts/sites/validate-template.js` |
| `cms-nuevos4/src/routes/articles.js` | agregar nuevos endpoints SEO/state | respetar patrón 3.1-3.4 |
| `cms-nuevos4/src/utils/seo.js` | agregar analizadores de readability/keywords | debe exportar las funciones que `articles.js` espera |
| `cms-nuevos4/src/utils/html.js` | meta tags, OG, JSON-LD | `fetchArticlesForHomepage` debe usar el patrón 3.1 |

---

## 6. Endpoints del Worker (estado actual post-Commits 1-4)

### Funcionan correctamente (probados en staging)

| Método | Ruta | Auth | Notas |
|---|---|---|---|
| GET | `/api/sites` | no | devuelve 25 sitios con `TAGLINE=null` hasta que corras el seed |
| GET | `/api/sites/stats` | no | usa `SITIOS_LIST` + tabla consolidada |
| GET | `/api/articles?site=<slug>` | no | usa patrón 3.1 |
| GET | `/api/articles?site=<slug>&category=<cat>` | no | igual + filtro CATEGORIA |
| GET | `/api/articles?shuffle=true&site=<slug>` | no | usa `seededShuffle` |
| GET | `/api/articles/timeline?site=<slug>` | no | solo `ES_BREVE = 1` |
| GET | `/api/articles/id/:id` | no | busca en PARA primero, luego CMS |
| GET | `/api/articles/:slug` | no | busca en PARA, luego CMS, luego LEGACY_SLUG |
| GET | `/api/cms/articles` | no | lista borradores de ARTICULOS_CMS |
| GET | `/api/revision/pending` | no | mesa de revisión |
| GET | `/api/stats/dashboard` | **sí** | stats cross-CMS |
| GET | `/api/cron/status` | no | lee `cron_status` de KV |
| GET | `/api/cron/diagnostic` | no | usa patrón 3.1 |
| GET | `/api/cron/test-fb/:slug` | **sí** | test manual de publicación |
| GET | `/api/facebook/monitor` | no | cross-site con `SITIO_SLUG` |
| GET | `/api/facebook/queue` | no | artículos pendientes FB |
| GET | `/api/facebook/debug-tokens` | **sí** | valida tokens FB |
| POST | `/api/facebook/reset-timer/:slug` | **sí** | |
| POST | `/api/facebook/force-publish/:slug` | **sí** | usa patrón 3.3 |
| GET | `/api/facebook/recent-posts/:slug` | **sí** | últimas N horas |
| POST | `/api/facebook/update-post/:slug/:postId` | **sí** | re-scrape OG |
| POST | `/api/facebook/update-recent/:slug` | **sí** | batch update |
| POST | `/api/articles` | **sí** | crea artículo + asigna sitios |
| POST | `/api/articles/bulk` | no | bulk insert |
| PUT | `/api/articles/:id` | **sí** | update + re-asigna sitios |
| DELETE | `/api/articles/:id` | **sí** | borra + cascade |
| POST | `/api/cms/articles` | **sí** | upsert en ARTICULOS_CMS |
| POST | `/api/cms/generate-variations` | **sí** | crea entradas en REVISION_CONTENIDO |
| POST | `/api/cms/publish` | **sí** | publica desde CMS a PARA + SITIO |
| PUT | `/api/revision/:id` | **sí** | edita revisión |
| POST | `/api/revision/approve/:id` | **sí** | aprueba y publica |
| POST | `/api/sites` | **sí** | upsert en SITIOS |
| POST | `/api/cron/ingest` | **sí** | info sobre ingesta RSS |
| POST | `/api/cron/scrape` | no | scraping manual de URLs |

### Endpoints SEO (appended por Commit del Hub, en `articles.js`)

| Método | Ruta | Auth | Notas |
|---|---|---|---|
| GET | `/api/articles/:id/seo` | no | devuelve readability + focus keyword analysis |
| POST | `/api/articles/:id/seo` | **sí** | guarda META_TITLE, META_DESCRIPTION, FOCUS_KEYWORD, TAGS |
| POST | `/api/articles/:id/state` | **sí** | transición de estado (BORRADOR → EN_REVISION → APROBADO → PUBLICADO) |
| GET | `/api/articles/:id/history` | no | historial de cambios de estado |

### Endpoints removidos (Commit 3, devuelven 404)

- ~~`GET /api/sites/legals/:id`~~ — tabla `LEGALES` no existe
- ~~`GET /api/sites/channels/:id`~~ — tabla `CANALES_EXTERNOS` no existe
- ~~`GET /api/sites/menus/:id`~~ — tabla `MENUS_NAVEGACION` no existe

---

## 7. Auth — resumen de cómo funciona

**Login** (`POST /api/auth/login`):
- Acepta `username` o `email` + `password`
- Hash: SHA-256 del password plano (sin salt, sin bcrypt)
- Sesión: UUID v4 guardado en KV bajo `session_<token>`
- Cookie: `auth_token=<uuid>` con `HttpOnly; Secure; SameSite=Strict`

**Check** (`middleware/auth.js`):
```js
export async function checkAuth(c) {
  const token = c.req.header('Authorization')?.replace('Bearer ', '')
                || getCookie(c.req, 'auth_token');
  if (!token) return false;
  const session = await c.env.ARTICLES_KV.get(`session_${token}`);
  if (!session) return false;
  c.set('user', JSON.parse(session));
  return true;
}
```

**Password reset** (nuevo flujo Hub, no en código legacy):
- User se crea con `PASSWORD_SETUP_TOKEN_HASH` (token UUID hasheado en SHA-256)
- Link de setup: `https://hub.sebastianvernis.space/setup?token=<uuid>&email=<email>`
- El usuario setea su password, el token se borra

**⚠️ Importante:** el hash SHA-256 simple es conocido. Para producción
real habría que migrar a bcrypt/argon2, pero está fuera del scope de
este refactor.

---

## 8. Flujos que NO se deben romper

| Flujo | Trigger | Pasa por | Riesgo si tocás |
|---|---|---|---|
| Ingesta RSS | cron cada 30 min o manual | `cron/rss-ingest.js` → `processPreScrapedArticle` → `ARTICULOS_PARAFRASEADOS` + `ARTICULOS_SITIO` | `processPreScrapedArticle` insert; debe usar patrón 3.2 |
| Publicación FB | cron cada 30 min o manual | `cron/facebook.js` → `processFBTimer` → `publishToFBIndividual` → UPDATE FB_PUBLICADO | `processFBTimer` SELECT; debe usar patrón 3.1 |
| Mesa de revisión | POST `/api/cms/publish` o editor | `routes/revision.js` → INSERT en `ARTICULOS_SITIO` | `revision.js` línea 98; debe usar patrón 3.2 |
| SEO Hub | editor o API | `routes/articles.js` (extendido en Hub) → UPDATE en `ARTICULOS_CMS` | NO toca `ARTICULOS_SITIO` |
| Homepage SSR | GET `/` desde Pages | `utils/html.js` → `fetchArticlesForHomepage` → JOIN con `ARTICULOS_PARAFRASEADOS` | `fetchArticlesForHomepage` debe usar patrón 3.1 |

---

## 9. Resumen de IDs en este proyecto

| Recurso | Valor | Notas |
|---|---|---|
| Account staging | `cf8a5985e0acb5ebd3683786a4d5bea2` | chispakimnueve@gmail.com |
| Worker cms-nuevos4 | `https://cms-nuevos4.chispakimnueve.workers.dev` | última versión `a47fbb52-dba4-42b8-90da-d1faecfe4feb` |
| D1 staging | `news_db_cms_nuevos4` | id `3230c0c3-c1ac-4a90-b827-675222b1b878` |
| KV staging | `ARTICLES_KV_NUEVOS4` | id `88a7e6ac68aa4baea053dac4a4227fd1` |
| R2 staging | `cms-news` | bucket compartido con otros CMSs |
| D1 Hub (vacía) | `nexopress-hub-db` | id `c93d0936-fdac-41bd-85de-3f20dc1f9c1f` |
| KV Hub (no usado) | `HUB_VALIDATION_CACHE` | id `7030997a462f4cde99fc30a8bd44b97c` |
| KV legacy | `SUM_KV` | id `4c0b300c9e0140a69a3f05398a7ccc7d` |

---

## 10. Comandos rápidos de verificación

```bash
# ¿Cuántos sitios hay cargados?
cd cms-nuevos4
wrangler d1 execute news_db_cms_nuevos4 --remote --command \
  "SELECT COUNT(*) FROM SITIOS"

# ¿Cuántos artículos en cada sitio?
wrangler d1 execute news_db_cms_nuevos4 --remote --command \
  "SELECT SITIO_SLUG, COUNT(*) FROM ARTICULOS_SITIO GROUP BY SITIO_SLUG ORDER BY SITIO_SLUG"

# ¿Hay datos huérfanos en las tablas viejas?
wrangler d1 execute news_db_cms_nuevos4 --remote --command \
  "SELECT name FROM sqlite_master WHERE type='table' AND name LIKE 'ARTICULOS_SITIO_%' ORDER BY name"

# ¿Sigue activa la config nueva?
curl -s https://cms-nuevos4.chispakimnueve.workers.dev/api/sites | jq 'length'
# Esperado: 25
```
