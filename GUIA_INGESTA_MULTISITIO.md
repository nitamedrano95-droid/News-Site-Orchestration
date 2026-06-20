# GUIA_INGESTA_MULTISITIO.md — Solución Integral de Ingesta para 60 Sitios

## Estado Actual

### Estructura de CMS
| CMS | Sitios | Database |
|-----|--------|----------|
| cms-nuevos | 17 (boominformativo, capitalpress, ...) | news_db_cms_nuevos (D1) |
| cms-nuevos2 | 8 (centronews, noticias123, ...) | news_db_cms_nuevos2 (D1) |
| cms-nuevos3 | 25 (enfoquemexicano, adnmexicano, ...) | news_db_cms_nuevos3 (D1) |
| cms-originaux | 10 (bitacoraurbana, cbnnoticias, ...) | news_db_cms_originaux (D1) |

**Total: 60 sitios**

### Workflow n8n Actual
- **ID:** V8RnXGH4StT0gTiR — "Multi-Site RSS Distributor"
- **Problema:** Solo tiene 4 sites hardcodeados en el código (no coincide con ningún CMS)
- **Sites en workflow:** `radiocinconoticias, tvmexico, bitacoraurbana, pulsorepublicanoticicias`
  - `radiocinconoticias`, `tvmexico`, `bitacoraurbana` → cms-originaux
  - `pulsorepublicanoticicias` → **NO EXISTE** (hay `pulsorepublicanonoticicias` en cms-nuevos3)
- **Flujo actual:**
  1. Schedule trigger cada 30 min
  2. Fetch RSS desde 12 fuentes (LaPoliticaOnline, Jornada, Wired, ElPais, Reforma×3, Proceso, Eleconomista, Expansion, France24, Informador)
  3. Parse & Distribute (Code node con hash rotacional)
  4. Batch Process (splitInBatches de 3 en 3)
  5. Check D1 Duplicate → Skip Duplicates → Insert Article

### Problemas Detectados

1. **Workflow no conecta a ningún CMS** — EI workflow apunta a `D1_ACCOUNT_ID`, `D1_DATABASE_ID` placeholder
2. **Sites incorrectos** — Los 4 sites del workflow no coinciden con la realidad
3. **No hay credenciales configuradas** — Los HTTP nodes para D1 requieren HTTP Header Auth
4. **Tablas inexistentes** — Las tablas `ARTICULOS_SITIO_${SITE}_URLS` no existen en ningún D1 real

---

## Paso 1: Configurar el Workflow de Ingesta (n8n)

### 1.1 Credenciales Cloudflare D1

1. En n8n, crear credential tipo "HTTP Header Auth":
   - **Nombre:** Cloudflare D1 API
   - **Header Name:** Authorization
   - **Header Value:** `Bearer YOUR_CLOUDFLARE_API_TOKEN`

### 1.2 Obtener IDs necesarios

```bash
# Buscar en wrangler.toml de cada CMS:
grep "database_id" cms-nuevos/wrangler.toml
grep "database_id" cms-nuevos2/wrangler.toml
grep "database_id" cms-nuevos3/wrangler.toml
grep "database_id" cms-originaux/wrangler.toml

# Account ID está en el dashboard de Cloudflare o en .env
```

### 1.3 Sites por CMS (reales)

**cms-originaux (10 sitios):**
```
bitacoraurbana, cbnnoticias, centralmexico, mexicoinformado,
nodoinformativo, noticiasobjetivo, radiocinconoticias, reportecentralmx,
tvmexico, verticenoticias
```

**cms-nuevos (17 sitios):**
```
boominformativo, capitalpress, diarioexpress, elpulsomexicano,
enfoquecapital, enfoquedirecto, formulacdmx, mexicantimes,
mexico360noticias, mradio, noticiashorizonte, pulsodiario,
puntoclave, puntonoticias, radarinformativo, reportediario, televisionabc
```

**cms-nuevos2 (8 sitios):**
```
centronews, noticias123, breakingcentermexico, alavistanoticias,
socialmexiconews, tmznews, radioabc, noticiasintegra
```

**cms-nuevos3 (25 sitios):**
```
enfoquemexicano, adnmexicano, pulsorepublicanonoticias, mexicannewsoftheworld,
expresomexicano, mexicodaily, aztecamexiconoticias, elanalisismexicano,
nacionalinstante, mexicoandtheworld, diariomexicano, politicasalvajealminuto,
elobservadorrepublicano, mexicoplus, actualidadsinfronteras, noticiasalinstante,
republicamx, diariomexico, financemarketsmx, monitorrepublicano,
elprofetamexicano, mexicoenresumen, radioredmx, perspectivamexicana, wenewsmexico
```

### 1.4 Tablas D1 por sitio

Cada sitio tiene su tabla en el D1 de su CMS:
- cms-originaux → tabla: `ARTICULOS_SITIO_${SLUG}_URLS`
- cms-nuevos → tabla: `ARTICULOS_SITIO_${SLUG}_URLS`
- cms-nuevos2 → tabla: `ARTICULOS_SITIO_${SLUG}_URLS`
- cms-nuevos3 → tabla: `ARTICULOS_SITIO_${SLUG}_URLS`

**Esquema de tabla:**
```sql
CREATE TABLE ARTICULOS_SITIO_${SLUG}_URLS (
  ID TEXT PRIMARY KEY,
  ID_PARAFRASEADO TEXT,
  FECHA_ASIGNACION TEXT,
  FB_PUBLICADO INTEGER DEFAULT 0,
  FB_FECHA TEXT,
  FB_POST_ID TEXT
);
```

---

## Paso 2: Solución de Ingesta Inmediata (Manual)

Dado que el sistema automatizado no funciona, usaremos el Worker API de cada CMS directamente.

### API Base de cada CMS
```
cms-originaux:  https://news-api.sebastianvernis.workers.dev/api
cms-nuevos:     https://cms-nuevos.sebastianvernis.workers.dev/api
cms-nuevos2:    https://cms-nuevos2.sebastianvernis.workers.dev/api
cms-nuevos3:    https://cms-nuevos3.sebastianvernis.workers.dev/api
```

### Endpoints de ingestión
- `POST /cron/ingest` — Ingesta RSS automática
- `POST /cron/ingest/:site` — Ingesta para sitio específico
- `GET /articles?site={slug}` — Ver artículos publicados

### 2.1 Script de Ingesta Manual por CMS

Para cada CMS, ejecutar la ingesta forzando RSS:

```bash
# cms-originaux
curl -X POST "https://news-api.sebastianvernis.workers.dev/api/cron/ingest?force=true" \
  -H "Authorization: Bearer admin-token"

# cms-nuevos
curl -X POST "https://cms-nuevos.sebastianvernis.workers.dev/api/cron/ingest?force=true" \
  -H "Authorization: Bearer admin-token"

# cms-nuevos2
curl -X POST "https://cms-nuevos2.sebastianvernis.workers.dev/api/cron/ingest?force=true" \
  -H "Authorization: Bearer admin-token"

# cms-nuevos3
curl -X POST "https://cms-nuevos3.sebastianvernis.workers.dev/api/cron/ingest?force=true" \
  -H "Authorization: Bearer admin-token"
```

---

## Paso 3: Publicación a Facebook (10 min entre sitios)

### 3.1 Estructura de tokens Facebook

Cada sitio tiene en D1 su `FACEBOOK_PAGE_TOKEN` y `FACEBOOK_PAGE_ID` en la tabla `SITIOS`.

### 3.2 Script de publicación Facebook

```python
# publish_facebook.py — Publica 1 artículo por sitio cada 10 min
import requests, time

TOKEN = "17f616e5c86c4988d2f6a6955ba9a98bc3c7ddda4c3557286ba3b80f8aa76291"
BASE_URL = "https://news-api.sebastianvernis.workers.dev/api"

SITIOS_60 = [
  # cms-originaux (10)
  'bitacoraurbana', 'cbnnoticias', 'centralmexico', 'mexicoinformado',
  'nodoinformativo', 'noticiasobjetivo', 'radiocinconoticias', 'reportecentralmx',
  'tvmexico', 'verticenoticias',
  # cms-nuevos (17)
  'boominformativo', 'capitalpress', 'diarioexpress', 'elpulsomexicano',
  'enfoquecapital', 'enfoquedirecto', 'formulacdmx', 'mexicantimes',
  'mexico360noticias', 'mradio', 'noticiashorizonte', 'pulsodiario',
  'puntoclave', 'puntonoticias', 'radarinformativo', 'reportediario', 'televisionabc',
  # cms-nuevos2 (8)
  'centronews', 'noticias123', 'breakingcentermexico', 'alavistanoticias',
  'socialmexiconews', 'tmznews', 'radioabc', 'noticiasintegra',
  # cms-nuevos3 (25)
  'enfoquemexicano', 'adnmexicano', 'pulsorepublicanonoticias', 'mexicannewsoftheworld',
  'expresomexicano', 'mexicodaily', 'aztecamexiconoticias', 'elanalisismexicano',
  'nacionalinstante', 'mexicoandtheworld', 'diariomexicano', 'politicasalvajealminuto',
  'elobservadorrepublicano', 'mexicoplus', 'actualidadsinfronteras', 'noticiasalinstante',
  'republicamx', 'diariomexico', 'financemarketsmx', 'monitorrepublicano',
  'elprofetamexicano', 'mexicoenresumen', 'radioredmx', 'perspectivamexicana', 'wenewsmexico'
]

def publish(site_slug):
    url = f"{BASE_URL}/facebook/force-publish/{site_slug}"
    r = requests.post(url, headers={"Authorization": f"Bearer {TOKEN}"}, timeout=30)
    return r.json()

for sitio in SITIOS_60:
    result = publish(sitio)
    print(f"✓ {sitio}: {result}")
    time.sleep(600)  # 10 minutos entre cada sitio
```

---

## Paso 4: Fix del Problema de Imágenes Blank

### Causa del problema
Los artículos se están publicando sin imagen o con URL de imagen inválida (`logo.png`, `fallback`, etc.)

### Solución: Verificar que `uploadToR2` suba las imágenes correctamente

La función `uploadToR2` en `src/utils/html.js`:
```javascript
export const uploadToR2 = async (url, env) => {
  const res = await fetchWithRetry(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
  const contentType = res.headers.get('content-type') || 'image/jpeg';
  if (!contentType.startsWith('image/')) return null;
  const buffer = await res.arrayBuffer();
  const key = `auto/${crypto.randomUUID()}.jpg`;
  await env.UPLOADS.put(key, buffer, { httpMetadata: { contentType } });
  return `https://uploads.sebastianvernis.space/${key}`;
};
```

### Verificación de imágenes en artículos

Antes de publicar, verificar que el artículo tenga `URL_IMAGEN` válido:
```sql
SELECT ID, TITULO_PARAFRASEADO, URL_IMAGEN
FROM ARTICULOS_PARAFRASEADOS
WHERE ESTADO = 'PUBLICADO'
  AND (URL_IMAGEN IS NULL OR URL_IMAGEN = '' OR URL_IMAGEN LIKE '%logo.png' OR URL_IMAGEN LIKE '%fallback%')
```

### Si la imagen no es válida, el artículo NO debe publicarse a Facebook

En `src/cron/facebook.js`, línea 149-158 ya filtra:
```javascript
AND p.URL_IMAGEN IS NOT NULL
AND p.URL_IMAGEN != ''
AND p.URL_IMAGEN NOT LIKE '%logo.png'
AND p.URL_IMAGEN NOT LIKE '%fallback%'
```

---

## Paso 5: Workflow n8n Corregido (Cómo debería verse)

### Estructura de 4 workflows (uno por CMS)

Cada workflow necesita:
1. **Schedule Trigger** — cada 30 min
2. **HTTP Request** para cada fuente RSS del CMS
3. **Code Node** — Parse RSS + Hash distribution + D1 insert
4. **D1 API calls** — Check duplicate + Insert

### Sites por workflow

**Workflow 1 (cms-originaux) — 10 sitios:**
→ `bitacoraurbana, cbnnoticias, centralmexico, mexicoinformado, nodoinformativo, noticiasobjetivo, radiocinconoticias, reportecentralmx, tvmexico, verticenoticias`

**Workflow 2 (cms-nuevos) — 17 sitios:**
→ `boominformativo, capitalpress, diarioexpress, elpulsomexicano, enfoquecapital, enfoquedirecto, formulacdmx, mexicantimes, mexico360noticias, mradio, noticiashorizonte, pulsodiario, puntoclave, puntonoticias, radarinformativo, reportediario, televisionabc`

**Workflow 3 (cms-nuevos2) — 8 sitios:**
→ `centronews, noticias123, breakingcentermexico, alavistanoticias, socialmexiconews, tmznews, radioabc, noticiasintegra`

**Workflow 4 (cms-nuevos3) — 25 sitios:**
→ `enfoquemexicano, adnmexicano, pulsorepublicanonoticias, mexicannewsoftheworld, expresomexicano, mexicodaily, aztecamexiconoticias, elanalisismexicano, nacionalinstante, mexicoandtheworld, diariomexicano, politicasalvajealminuto, elobservadorrepublicano, mexicoplus, actualidadsinfronteras, noticiasalinstante, republicamx, diariomexico, financemarketsmx, monitorrepublicano, elprofetamexicano, mexicoenresumen, radioredmx, perspectivamexicana, wenewsmexico`

---

## Resumen de Acciones Inmediatas

1. **Ejecutar ingesta forzada** en los 4 CMS Workers
2. **Verificar artículos** tienen imagen válida en R2
3. **Publicar a Facebook** sitio por sitio, 10 min de gap
4. **Actualizar workflow n8n** para que tenga los sites correctos
5. **Configurar credenciales D1** en n8n

---

## Comandos de Verificación

```bash
# Ver estado de ingesta en un CMS
curl "https://news-api.sebastianvernis.workers.dev/api/cron/status"

# Ver artículos publicados sin imagen
curl "https://news-api.sebastianvernis.workers.dev/api/articles?limit=50&site=radiocinconoticias" | jq '.articles[] | select(.imageUrl == null or .imageUrl == "")'

# Ver último artículo publicado
curl "https://news-api.sebastianvernis.workers.dev/api/articles?site=radiocinconoticias&limit=1" | jq '.[0]'
```