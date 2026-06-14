# Sincronizar FB_PUBLICADO desde n8n

**Problema:** n8n inserta artículos en `ARTICULOS_PARAFRASEADOS` y
`ARTICULOS_SITIO_*` directamente, pero **no marca**
`ARTICULOS_PARAFRASEADOS.FB_PUBLICADO = 1` después de poblar el
sitio. Esto regenera el gap entre "artículo en sitio" y "artículo
marcado como publicado" cada vez que corre el workflow.

**Síntoma:** consultas tipo
```sql
SELECT COUNT(*) FROM ARTICULOS_PARAFRASEADOS WHERE FB_PUBLICADO = 1
```
subestiman la cantidad de artículos efectivamente publicados.

---

## Solución recomendada (HTTP directo, sin wrangler)

Como el flujo de n8n hace POST directo a la D1 HTTP API, esta es
la variante lista para pegar. **Idempotente** (no rompe corridas
repetidas), parametrizada (sin SQL injection):

**Endpoint:**
```
POST https://api.cloudflare.com/client/v4/accounts/{account_id}/d1/database/{db_id}/query
```

**Headers:**
```
Authorization: Bearer {cf_api_token}
Content-Type: application/json
```

**Body (JSON) — ejecución por artículo con `paraId` dinámico:**
```json
{
  "sql": "UPDATE ARTICULOS_PARAFRASEADOS SET FB_PUBLICADO = 1, FB_FECHA = COALESCE(FB_FECHA, datetime('now')) WHERE ID = ?1 AND SITIO_DESTINO IS NOT NULL AND SITIO_DESTINO != '' AND (FB_PUBLICADO = 0 OR FB_PUBLICADO IS NULL)",
  "params": ["{{$json.paraId}}"]
}
```

> D1 HTTP API usa **posicionales con `?N`** (`?1`, `?2`, ...) o
> `?` anónimos. El placeholder `{{$json.paraId}}` es la
> notación de n8n para la variable que viene del nodo
> anterior (el que hizo el INSERT). Si tu nodo expone el ID
> bajo otro nombre, ajustá.

**Versión batch (un solo POST para múltiples artículos):**
```json
{
  "sql": "UPDATE ARTICULOS_PARAFRASEADOS SET FB_PUBLICADO = 1, FB_FECHA = COALESCE(FB_FECHA, datetime('now')) WHERE ID IN (SELECT ID_ARTICULO FROM _batch_temp)",
  "params": []
}
```
Para batch grande (>500 artículos) usá el endpoint `/query` con
modo bulk o acumulá con un nodo Loop en n8n.

**Mapeo CMS → database_id** (de `wrangler.toml` de cada uno):

| CMS         | database_id                            |
|-------------|----------------------------------------|
| originaux   | f9012ebc-7a9d-4b93-81d9-4eac600c40d2   |
| nuevos      | f96cb9d4-5627-4d1c-9eff-467a6e0ae757   |
| nuevos2     | e3d0d028-fd76-4d7e-ae02-d2a928692bb8   |
| nuevos3     | 18583adc-e878-4e0d-929d-62000fa1d81c   |
| nuevos4     | (ver `cms-nuevos4/wrangler.toml`)      |

> `account_id` y `api_token` no van en este archivo. Usá
> variables de entorno / credentials store de n8n.

**Por qué este `WHERE`:**
- `ID = ?1`: marca solo el artículo que acabás de insertar
- `SITIO_DESTINO IS NOT NULL`: no toca huérfanos
- `FB_PUBLICADO = 0 OR NULL`: idempotente (no actualiza filas
  ya marcadas)

---

## Solución alternativa: red de seguridad (cron)

Si no querés tocar el workflow n8n, existe un script
**idempotente** que hace lo mismo para todos los CMS:

```bash
node scripts/fixes/sync-fb-publicado-from-sitios.js
```

Con flags:
- `--cms <nombre>`: solo un CMS (originaux, nuevos, nuevos2, nuevos3)
- `--dry-run`: solo cuenta, no escribe
- (sin flags): aplica a los 4 CMS

**Cuándo correrlo:**
- En cron hourly: `0 * * * * cd /path/to/News-Site-Orchestration && node scripts/fixes/sync-fb-publicado-from-sitios.js`
- Manualmente después de un ciclo grande de ingest

**Por qué es seguro correrlo cada hora:**
- El `WHERE` filtra `FB_PUBLICADO = 0 OR NULL`, así que solo toca
  filas no marcadas.
- `COALESCE(FB_FECHA, datetime('now'))` preserva fechas reales si
  existían.
- La defensa `EXISTS` sobre las 25 tablas de sitio no está en este
  script (asume que si está en la general, está en algún sitio —
  ver el script completo para el modo auditable).

---

## Diagnóstico rápido

Ver cuántos artículos no están marcados y deberían estarlo:

```bash
export CLOUDFLARE_ACCOUNT_ID=<id>
npx wrangler d1 execute news_db_cms_<nombre> --remote --command "
  SELECT COUNT(*) as pendientes
  FROM ARTICULOS_PARAFRASEADOS
  WHERE FB_PUBLICADO = 0 OR FB_PUBLICADO IS NULL;
"
```

Si el número crece después de cada ciclo de n8n, el workflow
olvidó marcar FB_PUBLICADO. Aplicar la solución recomendada.

---

## Historia

- **2026-06-13**: gap de 24,671 artículos detectado y corregido
  manualmente con UPDATE masivo en los 4 CMS. 522 huérfanos
  adicionales eliminados (SITIO_DESTINO NULL/vacío sin match en
  sitio).
- **2026-06-13**: script `sync-fb-publicado-from-sitios.js` creado
  para evitar reaparición del gap.
