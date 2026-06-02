# Diagnóstico: Publicación de Facebook

**Fecha:** 2026-06-02
**Estado:** Diagnóstico completo. Script de corrección listo en `scripts/fb_full_fix.py` (dry-run exitoso). Pendiente tu OK para ejecutar en real.

---

## TL;DR

La publicación a Facebook **no está completamente rota**, pero hay 3 problemas que están limitando el rendimiento:

1. **Bug en `processFBTimer` de cms-nuevos3** (línea 150): un `return` aborta el loop después del primer sitio, en lugar de `continue`. Resultado: solo 1 de 25 sitios procesa por ciclo.
2. **cms-nuevos3 sin publicaciones desde 2026-05-29 ~14:00** (hace 92 horas). El bug VALIDAR + cambios del worktree rompieron el flujo.
3. **Hora local de blackout**: ahora son las 04:55 hora México. El cron no publica entre 22:00 y 08:00 local. Esto es por diseño.

---

## Estado real de las 4 DBs

| DB | Sitios | Asignados | FB_PUBLICADO=1 | Pendientes | % Publicado |
|---|---|---|---|---|---|
| cms-originaux | 10 | 11,485 | 2,271 | 9,214 | 19.8% |
| cms-nuevos | 27 | 11,145 | 1,782 | 9,363 | 16.0% |
| cms-nuevos2 | 18 | 5,261 | 793 | 4,468 | 15.1% |
| **cms-nuevos3** | **35** | **67,121** | **5,202** | **61,919** | **7.8%** |
| **TOTAL** | **90** | **95,012** | **10,048** | **84,964** | **10.6%** |

**Total de sitios:** 90 (no 60 como decía mi memoria). cms-nuevos3 tiene 35 sitios con la DB más cargada.

**Última publicación real en cms-nuevos3:** 2026-05-29 14:01-17:03 (hace 92h). El bug VALIDAR + cambios del worktree rompieron el flujo.

---

## Causas raíz identificadas

### 1. Bug del `return` en processFBTimer (cms-nuevos3)

**Archivo:** `cms-nuevos3/src/cron/facebook.js` líneas 138-151

```javascript
for (const siteSlug of SITIOS_LIST) {
    // Nighttime check for retries
    if (isNighttimeBlackout(env, siteSlug)) {
      continue;  // ⚠️ Línea 141: continue sin stats
    }
    if (isNighttimeBlackout(env, siteSlug)) {
      stats.skipped++;  // ⚠️ Línea 145: continue con stats
      continue;
    }
  if (isNighttimeBlackout(env, siteSlug)) {
    return { processed: 0, success: 0, failed: 0, skipped: 1 };  // 🐛 Línea 150: ABORTA EL FOR
  }
  // ... solo procesa 1 sitio
}
```

**Impacto:** de los 25 sitios en `SITIOS_LIST`, solo 1 se procesa por ciclo del cron. Los otros 24 esperan 25 ciclos (12.5 horas cada uno = 12.5 días para que el último publique). Esto explica por qué `cms-nuevos3` tiene 5,202 publicados vs 67,121 asignados (7.8%).

**Fix:** cambiar el `return` por `continue`. De 12 líneas a 4.

### 2. cms-nuevos3 sin publicaciones desde el 2026-05-29

**Causa:** el deploy que hice del worktree `ai-validation-flow` cambió el cron para que filtrara por `ESTADO='VALIDAR' AND VALIDO_AI=1`. Como `VALIDO_AI=1` nunca se seteaba (el validador IA no se construyó), el cron no procesaba nada. El deploy de hoy desde main corrigió esto, pero **la query del `for` loop sigue rota**.

**Estado actual:** cms-nuevos3 está re-deployado desde main. El `for` loop sigue teniendo el bug del `return`.

### 3. Blackout horario

**Código:** `isNighttimeBlackout` retorna `true` si la hora local es < 8 o >= 22.

**Hora actual:** 04:55 hora México (10:55 UTC). Estamos en blackout.

**Próxima ventana de publicación:** 08:00 hora México (14:00 UTC).

---

## Script de corrección: `scripts/fb_full_fix.py`

**Dry-run ya exitoso.** Hace lo siguiente:

1. **Diagnóstico de las 4 DBs** (output en este documento)
2. **Fix bug `return` → `continue`** en `cms-nuevos3/src/cron/facebook.js` (12 líneas a 4)
3. **Reset FB_TIMERS** en cms-originaux, cms-nuevos, cms-nuevos2 (UPDATE a 0)
4. **Force publish**: ejecuta `/api/cron/run-fb-timer` en los 4 CMS
5. **Verificación final**: consulta `/api/cron/status` en los 4 CMS

**Cambios en producción al ejecutar:**

| Acción | Impacto | Reversible |
|---|---|---|
| Modificar `cms-nuevos3/src/cron/facebook.js` | Bajo (4 líneas) | Sí (git revert) |
| UPDATE FB_TIMERS en 3 DBs | Bajo (solo resetea timestamps) | Sí (no se puede deshacer, pero es cosmético) |
| Forzar cron manualmente | Medio (puede publicar 1-4 artículos reales en FB) | No (pero es lo que queremos) |

---

## Plan de ejecución (cuando me digas OK)

1. ✅ Diagnóstico (ya hecho)
2. ✅ Crear script con dry-run exitoso (ya hecho)
3. ⏸️ **Tu OK** para ejecutar en real
4. Ejecutar `python3 scripts/fb_full_fix.py` (sin `--dry-run`)
5. Re-deployar cms-nuevos3 con el fix del bug: `cd cms-nuevos3 && wrangler deploy`
6. Esperar al próximo ciclo (08:00 hora MX = 14:00 UTC) o forzar manualmente
7. Verificar que ahora `processed >= 1` y `success >= 1` en cms-nuevos3

---

## Lo que NO arreglo con este script

- **Las 92 horas de cola acumulada**: aunque reseteemos los timers, el cron publica 1 artículo por sitio cada 12h. Para cms-nuevos3 con 25 sitios, limpiar la cola tomaría 12.5 días siguiendo el ritmo normal.
- **El `isNighttimeBlackout`**: ahora son las 04:55 hora MX, no se publica hasta las 08:00. Esto es por diseño (evita publicar de madrugada).
- **Los artículos sin imagen**: ~1,030 artículos en cms-nuevos3 tienen `URL_IMAGEN` vacío. Esos quedan excluidos del flujo de FB por el filtro `p.URL_IMAGEN IS NOT NULL`. El script no los regenera.
- **Los 423 artículos en `ESTADO='VALIDAR'`** de los otros 3 CMS (legacy): no los toco (no son urgentes, el cron actual escribe `PUBLICADO`).

---

## Hallazgos colaterales

- **SITIOS_LIST en cms-nuevos3 tiene 25 sitios**, pero la DB tiene 35 tablas `ARTICULOS_SITIO_*`. Los 10 sitios faltantes son los de cms-originaux (bitacoraurbana, cbnnoticias, etc.). Esos no se procesan en cms-nuevos3 — son de otro CMS.
- **cms-originaux publica bien** (última 2026-06-02 10:30:55, hace 25 min). Su timer es 6h, no 12h, por eso el status dice `timer(3/3)`.
- **Los 3 CMS que usan `FB_TIMERS` DB** (cms-originaux, cms-nuevos, cms-nuevos2) tienen 10/17/8 rows. La tabla `FB_TIMERS` en cms-nuevos3 está vacía porque cms-nuevos3 usa KV namespace, no DB.

---

## Archivos creados

- `scripts/fb_full_fix.py` (10.9 KB) — script completo con dry-run
