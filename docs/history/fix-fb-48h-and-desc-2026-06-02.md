# Ajuste final de filtros FB: 48h + orden DESC

**Fecha:** 2026-06-02
**Estado:** ✅ Aplicado y re-deployado

---

## Spec del usuario (confirmada)

1. Cron toma el más reciente pendiente
2. Filtra solo `FB_PUBLICADO = 0`
3. Filtra solo artículos con **<48h** desde asignación (frescura)
4. **No** re-publica, **no** resetea `FB_PUBLICADO`
5. Si el más reciente no cumple, no se intenta el siguiente (no hay cascada)

---

## Cambios

### 1. Filtro de edad: 30 días → 48 horas

| Archivo | Antes | Después |
|---|---|---|
| cms-nuevos/facebook.js | 1× `-30 days` | 2× `-48 hours` (processFBTimer + processFBTimerForSite) |
| cms-nuevos2/facebook.js | 2× `-30 days` | 2× `-48 hours` |
| cms-nuevos3/facebook.js | 2× `-30 days` | 2× `-48 hours` |

Nota: en cms-nuevos, `processFBTimerForSite` no tenía filtro de edad. Se lo agregué para mantener consistencia con la spec.

### 2. ORDER BY: ASC → DESC en cms-nuevos2

cms-nuevos2 tenía `ORDER BY s.FECHA_ASIGNACION ASC` (más viejo primero). Cambiado a `DESC` (más reciente primero) en 2 lugares. cms-nuevos y cms-nuevos3 ya estaban en DESC.

### 3. Sin cascada (confirmado por el usuario)

> "Por lógica, si el primer más reciente no tiene menos de 48 horas, el siguiente tampoco. Pero esa es solo una validación para garantizar que el contenido sea fresco en facebook y no se publiquen artículos desfasados."

El usuario confirmó que la "cascada" que describió antes no aplica — la query con filtro <48h + FB_PUBLICADO=0 ya hace el trabajo. No se implementa loop de reintentos.

---

## Verificación final

| Regla | cms-nuevos | cms-nuevos2 | cms-nuevos3 |
|---|---|---|---|
| `-48 hours` | 2 ✅ | 2 ✅ | 2 ✅ |
| `-30 days` (debe ser 0) | 0 ✅ | 0 ✅ | 0 ✅ |
| `ORDER BY DESC` | 2 ✅ | 2 ✅ | 2 ✅ |
| `ORDER BY ASC` (debe ser 0) | 0 ✅ | 0 ✅ | 0 ✅ |
| `re-publicando` (debe ser 0) | 0 ✅ | 0 ✅ | 0 ✅ |
| `SET FB_PUBLICADO = 0` (debe ser 0) | 0 ✅ | 0 ✅ | 0 ✅ |
| `WHERE FB_PUBLICADO = 1` (debe ser 0) | 0 ✅ | 0 ✅ | 0 ✅ |
| `node -c` | exit 0 ✅ | exit 0 ✅ | exit 0 ✅ |

---

## Re-deploys

| CMS | Versión |
|---|---|
| cms-nuevos | `0a840e33-98d8-4d61-acf9-5c3a344f1110` |
| cms-nuevos2 | `ba19daf8-60ff-4111-837a-4dd931734107` |
| cms-nuevos3 | `41cd7486-02c8-490a-8838-0e091045afb7` |

---

## Lógica final en producción

```sql
SELECT
  s.ID as SITIO_ID,
  s.ID_PARAFRASEADO,
  p.TITULO_PARAFRASEADO as TITULO,
  p.SLUG,
  p.URL_IMAGEN
FROM ARTICULOS_SITIO_<SITIO> s
JOIN ARTICULOS_PARAFRASEADOS p ON s.ID_PARAFRASEADO = p.ID
WHERE s.FB_PUBLICADO = 0
  AND s.FECHA_ASIGNACION >= datetime('now', '-48 hours')   -- <-- NUEVO: solo frescos
  AND p.URL_IMAGEN IS NOT NULL
  AND p.URL_IMAGEN != ''
  AND p.URL_IMAGEN NOT LIKE '%logo.png'
  AND p.URL_IMAGEN NOT LIKE '%fallback%'
  AND p.SLUG IS NOT NULL
  AND p.SLUG != ''
ORDER BY s.FECHA_ASIGNACION DESC                            -- <-- más reciente primero
LIMIT 1
```

- Toma el más reciente de los pendientes
- Solo si tiene <48h de antigüedad (fresco)
- Si no hay, skip
- Sin reintentos, sin cascada, sin re-publicar
- Al publicar: `UPDATE ... SET FB_PUBLICADO = 1, FB_FECHA = ..., FB_POST_ID = ?` (ya existía, intacto)
