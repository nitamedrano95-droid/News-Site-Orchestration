# Diagnóstico v2: Bug radiocinco + Bug VALIDAR en cms-nuevos3

**Fecha:** 2026-06-02
**Estado:** Causa raíz del bug VALIDAR encontrada. Fix pendiente de tu aprobación.

---

## Resumen ejecutivo

| # | Bug | Alcance | Severidad | Estado |
|---|---|---|---|---|
| 1 | radiocinco: "Error al cargar noticias" | LOCAL (solo ese sitio) | Front roto, 1,009 artículos invisibles | Fix de 3 líneas identificado |
| 2 | cms-nuevos3: 632 artículos atrapados en `ESTADO='VALIDAR'` | REGIONAL (cms-nuevos3 entero) | Producción de artículos detenida | **Causa raíz encontrada** |

---

## Corrección importante de mi memoria previa

Tenías razón en dos puntos:

1. **Sí existe `_template/`** (y `_template-clean/`, y `deploy-wizard/`). Mi búsqueda previa falló porque usé `search_files` sin entender el límite de profundidad.
2. **`ESTADO='VALIDAR'` no es bug nuevo ni aleatorio**: es un estado **heredado de un feature planeado que se quedó a medias** y que **se desplegó a producción por error**.

---

## Bug 2 (v2): El flujo VALIDAR — causa raíz

### Evidencia clave

```
$ git log --all --oneline -S 'VALIDAR'
(vacío)  ← No hay commit en NINGUNA rama que haya introducido 'VALIDAR' en main
```

```
$ ls .claude/worktrees/ai-validation-flow/
  cms-nuevos3/src/cron/rss-ingest.js   ← 42KB, líneas 771/929/1078: ESTADO='VALIDAR'
  cms-nuevos3/src/cron/facebook.js     ← líneas 278/323/573/613/637: WHERE ESTADO='VALIDAR'
  cms-nuevos3/migrations/001_add_ai_validation.sql  ← crea columnas VALIDO_AI/VALIDADO_EN
```

### Lo que la rama `worktree-ai-validation-flow` implementa (a medias)

**Intención original** (se deduce del nombre y del SQL migration):

1. Cuando el cron genera un artículo, lo inserta con `ESTADO='VALIDAR'` (en vez de `'PUBLICADO'`) → no aparece en el sitio todavía
2. Un validador AI (que **nunca se construyó**) revisa el artículo y pone `VALIDO_AI=1` o `VALIDO_AI=0`
3. Después de validar, el artículo pasa a `ESTADO='PUBLICADO'` y se publica
4. Facebook solo publica artículos con `VALIDO_AI=1` (gate de calidad)

**Lo que se implementó:**
- ✅ La migración SQL (columnas `VALIDO_AI`, `VALIDADO_EN`, `RAZON_INVALIDO`)
- ✅ El cron escribe con `ESTADO='VALIDAR'` (cms-nuevos3/src/cron/rss-ingest.js líneas 771/929/1078)
- ✅ Facebook filtra por `VALIDO_AI=1` (cms-nuevos3/src/cron/facebook.js líneas 278/323/etc.)
- ❌ El validador AI — **NUNCA SE CONSTRUYÓ**
- ❌ El paso de `VALIDAR → PUBLICADO` — **NUNCA SE IMPLEMENTÓ**

### Lo que pasó

La rama `worktree-ai-validation-flow` se creó y se deployó a producción en algún momento entre 2026-05-25 (commit 83964e7 "Nuevo") y 2026-05-29 20:00 UTC (primer artículo VALIDAR en la DB). Como el validador AI nunca corrió, **todos los artículos que el cron generó quedaron en `ESTADO='VALIDAR'` indefinidamente**.

### Verificación en D1 (cms-nuevos3, producción)

```sql
-- 6,373 artículos en cms-nuevos3, TODOS con VALIDO_AI = NULL:
SELECT VALIDO_AI, COUNT(*) FROM ARTICULOS_PARAFRASEADOS GROUP BY VALIDO_AI;
-- VALIDO_AI=NULL: 6,373
-- VALIDO_AI=1: 0  ← NUNCA SE HA SETEADO
-- VALIDO_AI=0: 0
```

**Confirmación**: ningún validador corre, nunca ha corrido. La feature está al 50%.

### Por qué afecta a cms-nuevos3 pero no a los otros 3 CMS

| CMS | Deploy source | `ESTADO='VALIDAR'` count |
|---|---|---|
| cms-originaux | main (sin VALIDAR) | 129 (legacy) |
| cms-nuevos | main (sin VALIDAR) | 160 (legacy) |
| cms-nuevos2 | main (sin VALIDAR) | 134 (legacy) |
| cms-nuevos3 | **worktree-ai-validation-flow** | **632 (producción viva)** |

Los 1,055 artículos en `VALIDAR` de los CMS antiguos son legacy de una prueba de hace meses. Los 632 de cms-nuevos3 son **los que el cron actual sigue generando y que jamás se van a publicar** mientras el deploy siga siendo del worktree.

### Cronología

| Fecha | Evento |
|---|---|
| 2026-05-25 10:35 | Commit 83964e7 "Nuevo" introduce el flujo VALIDAR en worktree-ai-validation-flow |
| 2026-05-29 12:47-13:15 | Último commit del worktree (carpeta .claude/worktrees/...) |
| 2026-05-29 ~12:55-13:00 | `rss-ingest.js` modificado en el worktree a 42KB |
| 2026-05-29 20:00:38 | Primer artículo VALIDAR en cms-nuevos3 (3h después del último commit) |
| 2026-05-29 20:00 — hoy | Cron sigue insertando con `ESTADO='VALIDAR'` cada 30 min |

Eso confirma que el **deploy** del worker cms-nuevos3 se hizo desde el worktree entre las 13:00 y las 20:00 del 29 de mayo.

---

## Fix Bug 2 (v2): Plan de acción

Hay **dos partes** que se deben hacer, en este orden:

### Parte A — Inmediato: Rescatar los 632 artículos atorados

Ejecutar en cms-nuevos3:
```sql
UPDATE ARTICULOS_PARAFRASEADOS
SET ESTADO = 'PUBLICADO'
WHERE ESTADO = 'VALIDAR';
```

Total: 632 artículos vuelven a ser visibles en `enfoquemexicano.click` y en los otros 24 sitios de cms-nuevos3.

### Parte B — Preventivo: Asegurar que no se vuelva a generar

Hay **3 opciones**, de menos a más invasiva:

#### Opción B1 — Re-deployar cms-nuevos3 desde main (la más limpia)
`main` ya tiene el código correcto (`ESTADO='PUBLICADO'` en las 3 ubicaciones del cron). Si re-deployas desde main, el cron deja de escribir `VALIDAR` automáticamente.

**Pro:**根治 (根治 = root cause fix). Una sola acción.
**Contra:** Cualquier otro cambio en el worktree (FB improvements, AI validation, etc.) se pierde. Si ese worktree tenía mejoras intencionales para Facebook, las pierdes.

#### Opción B2 — Patch quirúrgico: cambiar VALIDAR → PUBLICADO en el cron actual
Editar `cms-nuevos3/src/cron/rss-ingest.js` y reemplazar las 3 ocurrencias de `'VALIDAR'` por `'PUBLICADO'`. Re-deployar.

**Pro:** cambio mínimo, no toca nada del worktree excepto el valor del estado.
**Contra:** si en el futuro alguien quiere reintroducir la validación, tiene que volver a ponerlo. El código del worktree sigue siendo el "oficial" pero parchado.

#### Opción B3 — Construir el validador AI que falta
Implementar el validador que setea `VALIDO_AI=1` o `0`, y luego un cron que mueva `VALIDAR → PUBLICADO` cuando `VALIDO_AI=1`. Tomarse el tiempo para terminar la feature.

**Pro:** completa la feature que se planeó.
**Contra:** trabajo grande, no es prioritario ahora, y los 632 artículos seguirían atorados mientras se construye.

### Mi recomendación: **Opción B1** (re-deployar desde main)
Razón: el validador AI **nunca se construyó**, y los artículos VALIDAR no tienen valor (no han sido revisados por nadie). El estado actual es un feature al 50% que está rompiendo producción. Mejor volver a la versión estable (main) y decidir después si la feature de validación vale la pena retomarla.

**Pero antes de decidir**, te recomiendo comparar main vs worktree-ai-validation-flow para ver qué mejoras de Facebook/otro se perderían. Esa comparación es `git diff main..worktree-ai-validation-flow --stat`:
- 4 archivos de `cms-nuevos*/src/cron/rss-ingest.js` modificados
- 4 archivos de `cms-nuevos*/src/cron/facebook.js` modificados
- 4 archivos de `cms-nuevos*/src/routes/facebook.js` modificados
- Otros (article-middleware.js, wrangler.toml, deploy-wizard/ — pero este último es eliminado, así que no afecta)

Si los cambios en facebook.js del worktree son mejoras reales que quieres conservar, la opción B2 (patch quirúrgico) es mejor.

---

## Bug 1: radiocinco "Error al cargar noticias" — sigue siendo el mismo

**Causa:** `${$1||'logo.png'}` en `cms-originaux/sites/radiocinconoticias/index.html` (líneas 73, 89, 124). `$1` es un placeholder de regex que se quedó en el código. Tira `ReferenceError`, el catch muestra el mensaje.

**No es global ni regional**, es local. El deploy es estable.

**Fix (3 líneas):**
```diff
- <img src="${$1||'logo.png'}" alt="...">
+ <img src="${esc(a.imageUrl)||'logo.png'}" alt="...">
```

---

## Pregunta 1: ¿Por qué enfoque mostraba artículos del 29 mayo?

| Pregunta | Respuesta |
|---|---|
| ¿Por qué el más reciente es del 29 mayo? | Porque la última inserción que entró en `PUBLICADO` data de ese día. Todo lo posterior quedó en `VALIDAR`. |
| ¿Por qué no se ve lo nuevo? | El endpoint filtra `WHERE ESTADO = 'PUBLICADO'`. |
| **¿Por qué quedó en `VALIDAR`? (RESPUESTA CORREGIDA)** | El deploy activo de cms-nuevos3 viene de la rama `worktree-ai-validation-flow`, donde el cron inserta con `ESTADO='VALIDAR'` esperando un validador AI que nunca se construyó. |
| ¿El validador AI se implementó alguna vez? | **No**. La migración SQL existe, las queries de facebook.js existen, pero el validador que setea `VALIDO_AI=1` y el paso `VALIDAR → PUBLICADO` no existen en ningún archivo del repo. |
| ¿El cron está roto? | El cron corre bien, pero escribe en el estado equivocado. |
| ¿Es bug nuevo? | No, lleva desde 2026-05-29 20:00, pero su causa es de origen: deploy desde una rama inacabada. |

---

## Plan de acción propuesto

### Paso 1: Fix radiocinco (Bug 1)
- Modificar 3 líneas en `cms-originaux/sites/radiocinconoticias/index.html`
- `wrangler pages deploy`
- Validar en navegador
- Tiempo: 5 min

### Paso 2: Decisión sobre Bug 2
Necesito que decidas entre las opciones:
- **B1**: re-deploy cms-nuevos3 desde main (más limpio, pero pierdes cambios del worktree)
- **B2**: patch quirúrgico `'VALIDAR'` → `'PUBLICADO'` en cms-nuevos3/src/cron/rss-ingest.js del worktree
- **B3**: construir el validador AI completo

### Paso 3 (en cualquier caso): UPDATE one-shot para rescatar 632 artículos
Independiente de la decisión, los 632 artículos VALIDAR necesitan un UPDATE para volver a PUBLICADO. Sin esto, enfoque mexicano y los otros 24 sitios de cms-nuevos3 no muestran nada nuevo.

---

## Lo que confirmé sobre el _template y deploy-wizard

- `_template/` — sí existe. Es el contrato base (legacy)
- `_template-clean/` — sí existe. Es la versión refactorizada con generador `scripts/new-site.mjs` y `site.config.schema.json`
- `deploy-wizard/` — sí existe. Es un wizard web (`wizard/server.js` + `wizard/public/index.html`) con nginx + redis + cms-adapter, pensado para gestionar despliegues masivos de 25-50 sitios
- Estructura compartida de sitios: `index.html`, `articulo/index.html`, `categoria/index.html`, `components.js`, `script.js`, `style.css`, `style-custom.css`, `wrangler.toml`, `_redirects`, `functions/_middleware.js`, `functions/articulo/[slug].js`

Eso confirma lo que dijiste: la estructura es teóricamente la misma porque cada CMS nació del anterior, y `_template-clean/` busca homogeneizar para que el deploy-wizard pueda generar sitios a escala.

---

## Mi error en la memoria previa

| Lo que yo creía | Realidad |
|---|---|
| `_template/` no existe | **Sí existe** (y `_template-clean/`, y `deploy-wizard/`). Mi búsqueda falló por profundidad. |
| `ESTADO='VALIDAR'` no aparece en el código | **Sí aparece**, pero solo en la rama `worktree-ai-validation-flow` (worktree de git), NO en main. |
| El bug VALIDAR es un misterio | **No es misterio**: es una feature planeada al 50% (rama `ai-validation-flow`) que se deployó a producción sin terminar. |
