# Fix FB: bug `return` triple + artículo roto de Huauchinango

**Fecha:** 2026-06-02 (~04:55 hora MX, blackout activo)
**Estado:** ✅ Completado y verificado en navegador

---

## TL;DR

Dos fixes aplicados en producción:

1. **A-2 — Bug del `return` triple en `processFBTimer`** (3 archivos): cambiamos `return` por `continue` para que el `for` loop itere los 25+ sitios en lugar de abortar después del primero.
2. **B-1 — Artículo roto de Huauchinango**: reemplazamos el `CONTENIDO` con prompt de Gemini pegado (9,892 chars) por el contenido limpio de su gemelo (1,239 chars).

---

## Fix A-2: Bug `return` triple

### Causa raíz

El `for` loop de `processFBTimer` tenía 3 chequeos consecutivos de `isNighttimeBlackout`. El tercero hacía `return` (aborta el for entero), cuando debería haber sido `continue` (siguiente sitio). Resultado: **solo 1 sitio se procesaba por ciclo** en lugar de 25+.

### Archivos modificados

- `cms-nuevos/src/cron/facebook.js` (líneas 134-147 → 134-141)
- `cms-nuevos2/src/cron/facebook.js` (líneas 130-143 → 130-137)
- `cms-nuevos3/src/cron/facebook.js` (líneas 138-151 → 138-145)

**Diff aplicado (idéntico en los 3 archivos):**
```diff
   for (const siteSlug of SITIOS_LIST) {
-    // Nighttime check for retries
-    if (isNighttimeBlackout(env, siteSlug)) {
-      continue;
-    }
-    // Nighttime blackout check
+    // Nighttime blackout check (skip este sitio, sigue con el siguiente)
     if (isNighttimeBlackout(env, siteSlug)) {
       stats.skipped++;
       continue;
     }
-    // Skip if nighttime
-  if (isNighttimeBlackout(env, siteSlug)) {
-    return { processed: 0, success: 0, failed: 0, skipped: 1 };
-  }
```

Reducción: 12 líneas → 4 líneas (-8 líneas netas por archivo).

### Re-deploys

| CMS | Versión nueva | Estado |
|---|---|---|
| cms-nuevos | `7394dcb7-7b03-4533-9e30-f1d2d45e90da` | ✅ Desplegado |
| cms-nuevos2 | `5b1c9d2e-e346-415d-bc1f-f44df63a91ea` | ✅ Desplegado |
| cms-nuevos3 | `768358c6-2b65-4402-9c10-6b522cf75814` | ✅ Desplegado |

### Impacto esperado

- **cms-nuevos**: 27 sitios ahora procesan en lugar de 1. Cobertura pasa de 13.5 días/ciclo a **1 ciclo cada 30 min del cron** (con el timer de 12h por sitio, son 12h/27 sitios = 27h para cubrir todos una vez).
- **cms-nuevos2**: 18 sitios. Era 9 días/ciclo, ahora es 9 días/18 sitios = 12h para cubrir todos.
- **cms-nuevos3**: 25 sitios. Era 12.5 días/ciclo, ahora es 12.5 días/25 sitios = 12h para cubrir todos.

**Importante:** los timers KV están atascados con la última fecha de publicación de hace 92h. **El primer ciclo del nuevo código NO publicará nada** (todos los sitios tendrán timer activo). **El segundo ciclo (12h después) empezará a publicar**. El usuario restringió los tokens de Facebook, así que las publicaciones fallarán con error de auth hasta que se restauren.

---

## Fix B-1: Artículo roto de Huauchinango

### Síntoma

`https://boominformativo.top/articulo/?slug=captura-de-exdirector-del-hospital-de-huauchinango-evidencia-la-falta-de-proteccion-juridica-y-pone--1778963379087` mostraba el prompt de Gemini pegado (9,892 chars) en lugar del artículo periodístico.

### Causa

El `2026-05-16 20:29:39` se intentó publicar el mismo tema en `boominformativo`. El **primer intento** (`1a9348ab`) salió con el prompt completo de Gemini pegado. Los intentos 2 y 3 (mismo día, 1 min después cada uno) salieron limpios. Es un error humano de copy-paste.

### Fix aplicado

```sql
UPDATE ARTICULOS_PARAFRASEADOS
SET CONTENIDO = (SELECT CONTENIDO FROM ARTICULOS_PARAFRASEADOS WHERE ID = 'f681a978-b307-465a-8721-1204bc7dfafe'),
    LONGITUD = 1239
WHERE ID = '1a9348ab-a68c-404e-a98f-6c868d049ffe';
```

- **1 fila actualizada** en 0.42ms
- **Longitud:** 9,892 → 1,239 chars
- **ID del artículo roto:** `1a9348ab-a68c-404e-a98f-6c868d049ffe`
- **ID del gemelo limpio:** `f681a978-b307-465a-8721-1204bc7dfafe`

### Verificación en navegador

- ✅ El artículo ahora muestra 4 párrafos sobre la captura de Maximino "N", exdirector del Hospital General de Huauchinango
- ✅ Menciona el gremio médico en riesgo
- ✅ NO aparece "Conversación con Gemini"
- ✅ NO aparece "respetando longuitud"
- ✅ NO aparece "cuatro versiones"

### Limitación encontrada (no crítica)

La `URL_IMAGEN` del artículo (`38b75514-7aa1-4776-8d94-8b7bd4f005b4.jpg`) devuelve **404** (la imagen ya no existe en R2). Por eso el front muestra el logo del sitio como fallback. Es un problema separado de R2 (limpieza de archivos huérfanos), no del fix de hoy.

---

## Estado final de los tokens de Facebook

El usuario restringió los tokens de Facebook antes de este fix. **El cron de FB seguirá corriendo** y **intentará publicar**, pero **fallará con error de auth** hasta que se restauren los tokens.

Cuando se restauren:
1. Los timers KV están atascados en fecha 2026-05-29. Habría que **resetearlos** para que el cron publique inmediatamente.
2. El fix A-2 hace que el cron ahora itere todos los sitios, no solo el primero.
3. La cola de **84,964 artículos pendientes** empezará a procesarse, pero respetando el timer de 12h por sitio.

---

## Pendientes (no críticos, no urgentes)

1. **boominformativo tiene 2 duplicados** del mismo tema (`dac80af7`, `f681a978`) con el mismo título. Decisión de tu parte si se borran.
2. **423 artículos legacy en `ESTADO='VALIDAR'`** repartidos en cms-originaux (129), cms-nuevos (160), cms-nuevos2 (134). No se generan más, pero siguen ahí. UPDATE one-shot si quieres consistencia.
3. **1,030 artículos sin imagen** en cms-nuevos3 excluidos del flujo de FB.
4. **84,964 artículos pendientes en 4 DBs** (no urgentes, el cron los procesará con ritmo normal).

---

## Archivos modificados/creados

**Modificados:**
1. `cms-nuevos/src/cron/facebook.js` (12 → 4 líneas)
2. `cms-nuevos2/src/cron/facebook.js` (12 → 4 líneas)
3. `cms-nuevos3/src/cron/facebook.js` (12 → 4 líneas)

**Deploys:**
- `wrangler deploy` para cms-nuevos
- `wrangler deploy` para cms-nuevos2
- `wrangler deploy` para cms-nuevos3

**SQL ejecutado:**
- `UPDATE ARTICULOS_PARAFRASEADOS SET CONTENIDO=..., LONGITUD=1239 WHERE ID='1a9348ab...'` en `news_db_cms_nuevos`

**Documentos creados:**
1. `docs/diagnostico-fb-publicacion-2026-06-02.md` (estado inicial con script fb_full_fix.py)
2. `docs/diagnostico-fb-fix-completo-2026-06-02.md` (causa raíz del bug)
3. `docs/history/fix-fb-return-y-huauchinango-2026-06-02.md` (este documento)
