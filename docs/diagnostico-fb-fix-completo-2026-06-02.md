# Diagnóstico completo: bug de Facebook publicación

**Fecha:** 2026-06-02
**Estado:** Diagnóstico completo. Pendiente tu OK para aplicar fix.

---

## TL;DR

1. **El bug "artículos no se publican >48h"** no existe como tal. Lo que pasa es:
   - El `for` loop en `processFBTimer` tiene un **`return` triple que aborta después del primer sitio** (en cms-nuevos, cms-nuevos2, cms-nuevos3).
   - El cron publica 1 sitio por ciclo, los demás esperan 12h.
   - Hay 35 sitios en cms-nuevos3, y solo 5,202/67,121 (7.8%) están publicados.
   - En cms-originaux el código está limpio y publica bien (19.8%).

2. **El artículo roto de Huauchinango** es **el único** con prompt de IA pegado. Está en cms-nuevos/boominformativo, 17 días sin publicarse en FB (el bug `return` lo dejó esperando).

3. **Hay blackout horario** (22:00-08:00 hora México). El cron no publica en esa ventana. Ahora son las 04:55 hora MX.

---

## 1. Bug del `return` triple (afecta a 3 CMS)

**Archivos:**
- `cms-nuevos/src/cron/facebook.js` línea 146
- `cms-nuevos2/src/cron/facebook.js` línea 142
- `cms-nuevos3/src/cron/facebook.js` línea 150
- `cms-originaux/src/cron/facebook.js` (NO TIENE el bug — está limpio)

**Patrón del bug:**
```javascript
for (const siteSlug of SITIOS_LIST) {
    if (isNighttimeBlackout(env, siteSlug)) {   // 1ra vez
      continue;  // ⚠️ continue sin stats
    }
    if (isNighttimeBlackout(env, siteSlug)) {   // 2da vez (duplicado)
      stats.skipped++;
      continue;
    }
  if (isNighttimeBlackout(env, siteSlug)) {     // 3ra vez (¡return!)
    return { processed: 0, success: 0, failed: 0, skipped: 1 };  // 🐛 ABORTA EL FOR
  }
  // ... solo procesa 1 sitio por ciclo
}
```

**Impacto por CMS:**

| CMS | Sitios | Procesados/ciclo | Días para cubrir todos |
|---|---|---|---|
| cms-originaux | 10 | 10 (código limpio) | 1 día |
| cms-nuevos | 27 | 1 (bug) | 13.5 días |
| cms-nuevos2 | 18 | 1 (bug) | 9 días |
| cms-nuevos3 | 25 | 1 (bug) | 12.5 días |

---

## 2. Estado real de las 4 DBs

| DB | Sitios | Asignados | Publicados | Pendientes | % | Última publicación |
|---|---|---|---|---|---|---|
| cms-originaux | 10 | 11,485 | 2,271 | 9,214 | 19.8% | 2026-06-02 10:30:55 (hace 25 min) |
| cms-nuevos | 27 | 11,145 | 1,782 | 9,363 | 16.0% | 2026-05-29 ~20:00 (hace 92h) |
| cms-nuevos2 | 18 | 5,261 | 793 | 4,468 | 15.1% | (similar) |
| cms-nuevos3 | 25 | 67,121 | 5,202 | 61,919 | 7.8% | 2026-05-29 ~14:00 (hace 92h) |
| **TOTAL** | **80** | **95,012** | **10,048** | **84,964** | **10.6%** | |

---

## 3. El artículo roto de Huauchinango

**ID:** `1a9348ab-a68c-404e-a98f-6c868d049ffe`
**Título:** "Captura de exdirector del Hospital de Huauchinango evidencia la falta de protección jurídica y pone en riesgo al gremio médico"
**Sitio:** `boominformativo` (cms-nuevos)
**Autor:** `Redacción CMS` (insertado manualmente, NO por Ollama)
**Longitud:** 9,892 chars (vs ~1,200 de un artículo normal)
**FECHA_PUBLICACION:** 2026-05-16T20:29:39.272Z (hace 17 días)
**ESTADO:** PUBLICADO
**FB_PUBLICADO:** 0 (NUNCA publicado en FB, mi nota anterior estaba mal)
**URL_IMAGEN:** SÍ existe
**SLUG:** `captura-de-exdirector-del-hospital-de-huauchinango-evidencia-la-falta-de-proteccion-juridica-y-pone--1778963379087`

**Contexto:** Hay 6 artículos sobre el mismo tema en cms-nuevos. El de `boominformativo` (ID 1a9348ab) es el **primero de 3 intentos** para ese sitio. Salió mal. Los 2 intentos siguientes (dac80af7, f681a978) salieron bien. Es un **error humano de copy-paste del prompt de Gemini**, no un bug del sistema.

**Búsqueda exhaustiva:** `CONTENIDO LIKE '%Conversación con Gemini%'` solo encuentra 1 resultado en las 4 DBs. Es un caso aislado, no un patrón masivo.

---

## 4. Por qué el artículo roto lleva 17 días sin publicarse en FB

El bug `return` en cms-nuevos + el orden `ORDER BY s.FECHA_ASIGNACION ASC` significa que `boominformativo` debería ser uno de los primeros en procesarse (su FECHA_ASIGNACION es 2026-05-16 20:29, de las más antiguas en cms-nuevos). Pero:

1. El `return` en línea 146 aborta el for después del primer sitio
2. Ese "primer sitio" varía según el orden de SITIOS_LIST en `cms-nuevos/src/config.js`
3. Los ciclos se "pierden" en el primer sitio

**Cálculo:** si el primer sitio se procesa cada 12h, y hay 27 sitios en SITIOS_LIST, `boominformativo` esperaría 27 ciclos = **13.5 días** en el peor caso. Hoy son 17 días, así que **el primer sitio también está atascado**.

---

## 5. Plan de fix

### Paso A — Fix bug `return` → `continue` (cms-nuevos, cms-nuevos2, cms-nuevos3)

**3 archivos, 3 patches idénticos.** Cambio:
```diff
- // Nighttime check for retries
- if (isNighttimeBlackout(env, siteSlug)) {
-   continue;
- }
- // Nighttime blackout check
- if (isNighttimeBlackout(env, siteSlug)) {
-   stats.skipped++;
-   continue;
- }
- // Skip if nighttime
- if (isNighttimeBlackout(env, siteSlug)) {
-   return { processed: 0, success: 0, failed: 0, skipped: 1 };
- }
+ // Nighttime blackout check
+ if (isNighttimeBlackout(env, siteSlug)) {
+   stats.skipped++;
+   continue;
+ }
```

Reducción: 12 líneas → 4 líneas (8 líneas netas menos por archivo).

### Paso B — Re-deploy de los 3 CMS

```bash
cd cms-nuevos && wrangler deploy
cd cms-nuevos2 && wrangler deploy
cd cms-nuevos3 && wrangler deploy
```

### Paso C — Fix del artículo roto

Reemplazar el `CONTENIDO` del artículo `1a9348ab` con el contenido limpio de su gemelo `f681a978` (1,239 chars). Conserva URL, slug, FB_POST_ID (no hay), e indexación.

```sql
UPDATE ARTICULOS_PARAFRASEADOS
SET CONTENIDO = (SELECT CONTENIDO FROM ARTICULOS_PARAFRASEADOS WHERE ID = 'f681a978-b307-465a-8721-1204bc7dfafe')
WHERE ID = '1a9348ab-a68c-404e-a98f-6c868d049ffe';
```

### Paso D (opcional) — Borrar los duplicados

`boominformativo` tiene 3 artículos con el mismo título (1 roto + 2 limpios). El más viejo es el roto (1778963379087). El script podría borrar los duplicados y dejar solo el más reciente, pero eso requiere decisión de tu parte.

---

## Cambios totales a producción

| Acción | Impacto | Reversible |
|---|---|---|
| Modificar 3 archivos (cms.js de cron de FB) | Bajo (8 líneas netas menos por archivo) | Sí (git revert) |
| Re-deploy 3 workers | Bajo (sustituye versión actual) | Sí |
| UPDATE 1 fila en D1 (cms-nuevos) | Bajo (1 artículo) | No (pero se puede re-insertar si se necesita) |

---

## Lo que NO arreglo

- Los 84,964 artículos pendientes en las 4 DBs (no se van a publicar instantáneamente; el ritmo normal de 1 sitio cada 12h = semanas)
- El blackout horario (es por diseño, evita publicar de madrugada)
- Los 423 artículos legacy en `ESTADO='VALIDAR'` de los otros 3 CMS
- Los 1,030 artículos sin imagen en cms-nuevos3 (excluidos del flujo de FB por el filtro `URL_IMAGEN IS NOT NULL`)

---

## Pregunta para tu decisión

1. **¿Procedo con el fix del bug `return` (3 archivos) + re-deploy de los 3 CMS?**
2. **¿Procedo con el fix del artículo roto (UPDATE contenido)?**
3. **¿Borro los 2 duplicados limpios de boominformativo (`dac80af7`, `f681a978`) o los dejo?**
4. **¿O prefieres ver primero los diffs exactos línea por línea antes de aprobar?**

Tu veredicto final después de cada deploy.
