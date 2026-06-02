# Corrección: Eliminar lógica de re-publicación en cron FB

**Fecha:** 2026-06-02
**Reglas del usuario (estrictas):**
1. ❌ **PROHIBIDO** re-publicar artículos
2. ❌ **PROHIBIDO** resetear `FB_PUBLICADO` de 1 a 0

---

## Causa

En la sesión anterior, agregué un bloque de "fallback" en `processFBTimer` de cms-nuevos/nuevos2/nuevos3 que, cuando no había artículos con `FB_PUBLICADO=0`, buscaba el más reciente con `FB_PUBLICADO=1` y lo **reseteaba a 0** para re-publicarlo. Eso violaba las dos reglas del usuario.

El subagente lo eliminó de los 3 archivos.

---

## Cambios

**6 bloques eliminados** (2 por archivo, uno en `processFBTimer` y otro en `processFBTimerForSite`):

| Archivo | Bloque 1 (processFBTimer) | Bloque 2 (processFBTimerForSite) |
|---|---|---|
| `cms-nuevos/src/cron/facebook.js` | 33 líneas eliminadas | 29 líneas eliminadas |
| `cms-nuevos2/src/cron/facebook.js` | 33 líneas eliminadas | 33 líneas eliminadas |
| `cms-nuevos3/src/cron/facebook.js` | 33 líneas eliminadas | 33 líneas eliminadas |

Cada bloque contenía:
- Comentario `// Fallback: si no hay pendientes, tomar el más reciente YA PUBLICADO (re-publicar)...`
- `if (!article) { article = await env.DB.prepare(SELECT ... WHERE s.FB_PUBLICADO = 1 ...).first() }`
- `if (article) { UPDATE ... SET FB_PUBLICADO = 0 ... ; console.log('re-publicando...') }`

---

## Verificación post-fix

| Regla | Búsqueda | Resultado |
|---|---|---|
| ❌ Cero `re-publicando` | `grep -c re-publicando` | **0** en los 3 archivos |
| ❌ Cero `SET FB_PUBLICADO = 0` | `grep -c "SET FB_PUBLICADO = 0"` | **0** en los 3 archivos |
| ❌ Cero `WHERE FB_PUBLICADO = 1` | `grep -c "WHERE.*FB_PUBLICADO = 1"` | **0** en los 3 archivos |
| ✅ Mantener `WHERE FB_PUBLICADO = 0` | `grep -c "WHERE s.FB_PUBLICADO = 0"` | **2** en los 3 archivos (intacto) |
| ✅ `ORDER BY DESC` | `grep -c "ORDER BY s.FECHA_ASIGNACION DESC"` | **2** en los 3 archivos (intacto) |
| ✅ `FB_INTERVAL_MS = 3.5h` | `grep "const FB_INTERVAL_MS"` | **OK** en los 3 |
| ✅ Sintaxis | `node -c archivo` | **exit 0** en los 3 |

---

## Lo que quedó intacto (cumple las reglas)

- Solo el `if (!article) { console.log('skipped'); continue/return stats; }` que avanza al siguiente sitio (sin re-publicar)
- La query original con `WHERE s.FB_PUBLICADO = 0` (toma el más reciente **pendiente**, sin re-publicar)
- El `ORDER BY s.FECHA_ASIGNACION DESC LIMIT 1` (selección del más reciente entre los pendientes)
- El `UPDATE ... SET FB_PUBLICADO = 1, FB_FECHA = ..., FB_POST_ID = ?` que marca como publicado **tras un publish exitoso** (no toca un artículo ya publicado)

---

## Re-deploys

| CMS | Versión |
|---|---|
| cms-nuevos | `b8bde67f-05ec-490c-a26b-9c0a87f38d10` |
| cms-nuevos2 | `da1af83f-8770-4450-8474-d03b8cb95220` |
| cms-nuevos3 | `81cea69d-fbe6-4194-a816-4f89a0afe0f2` |

---

## Búsqueda en otras rutas (B)

También verifiqué que `cms.js`, `routes/cron.js`, `routes/facebook.js`, `routes/stats.js` no tengan ninguna ruta que resetee `FB_PUBLICADO`. Confirmado: **no hay otros resets en todo el código de los 3 CMS**.
