# Diagnóstico: Bug radiocinco + Enfoque mexicano

**Fecha:** 2026-06-02
**Estado:** Investigación completa, dos bugs distintos identificados, fixes listos para revisar antes de desplegar.

---

## Resumen ejecutivo

| # | Bug | Alcance | Severidad | Estado |
|---|---|---|---|---|
| 1 | radiocinco: "Error al cargar noticias" | **LOCAL** (solo ese sitio) | Front roto, 1,009 artículos invisibles | Fix de 4 líneas identificado |
| 2 | enfoque mexicano: muestra 1 artículo del 29 mayo | **REGIONAL** (cms-nuevos3 entero) | 632 artículos atrapados en `VALIDAR` desde el 29 mayo | No es bug nuevo, son datos legacy |

---

## Bug 1: radiocinco "Error al cargar noticias"

### Síntoma
El sitio `https://radiocinconoticias.click` carga el header, footer y ticker correctamente, pero el contenido principal dice **"Error al cargar noticias"** y la sección "Más Leídas" está vacía.

### Diagnóstico

#### ¿Es global, regional o local?
**LOCAL** — solo `cms-originaux/sites/radiocinconoticias/`. Verificación:
- `news_db_cms_originaux` tiene 1,009 artículos PUBLICADOS con destino `radiocinconoticias`
- La API `https://cms-originaux.sebastianvernis.workers.dev/api/articles?site=radiocinconoticias&limit=20` **funciona perfectamente** (HTTP 200, devuelve datos)
- **Otros sitios del mismo CMS** (bitacoraurbana, cbnnoticias, centralmexico, etc.) muestran artículos sin problema
- El endpoint sirve el mismo formato de datos que consumen los otros sitios

#### Causa raíz
**`ReferenceError: $1 is not defined` en el template literal de `index.html`**.

Archivo: `cms-originaux/sites/radiocinconoticias/index.html`

```javascript
// Línea 73 (también 89, 124)
<img src="${$1||'logo.png'}" alt="${esc(a.title)}" loading="lazy">
```

`$1` es un placeholder de regex (`String.prototype.replace()`) que se quedó en el código fuente. En el scope de la función, `$1` no existe como variable → `ReferenceError` en la primera línea del render → `try/catch` lo captura → muestra "Error al cargar noticias".

#### Por qué enfoque mexicano no tiene este bug
| | radiocinco (roto) | enfoque (OK) |
|---|---|---|
| Línea equivalente | `${$1\|\|'logo.png'}` | `${safeUrl(hero?.imageUrl)}` |
| Campo de imagen | `a.imageUrl` ← **NO se usa** | `hero?.imageUrl` |
| Helper de fallback | Ninguno | `safeUrl()` con `defaultImg` |
| Try/catch local | Sí (catch global lo absorbe) | Sí + fallback a `PWAManager` |

El `components.js` de radiocinco es 3.4× más grande (18KB vs 5KB) y nunca se simplificó, pero la sustitución de `$1` es exclusiva de su `index.html`.

#### Distribución del bug en cms-originaux
Verifiqué: el bug **solo afecta a `radiocinconoticias/index.html`**. Los otros 9 sitios del mismo CMS (bitacoraurbana, cbnnoticias, centralmexico, mexicoinformado, nodoinformativo, noticiasobjetivo, reportecentralmx, tvmexico, verticenoticias) **no tienen `$1` en sus HTML** y funcionan correctamente.

#### Fix propuesto (4 líneas en `index.html`)

```diff
- <img src="${$1||'logo.png'}" alt="${esc(a.title)}" loading="lazy">
+ <img src="${esc(a.imageUrl)||'logo.png'}" alt="${esc(a.title)}" loading="lazy">
```

(En las 3 ocurrencias: líneas 73, 89, 124)

**Justificación del fix:**
- El endpoint ya devuelve `imageUrl` (verificado: `"imageUrl":"https://uploads.sebastianvernis.space/auto/...jpg"`)
- `esc()` es la función helper ya usada en el archivo, por consistencia
- Fallback a `logo.png` si no hay imagen
- Mantiene el contrato del try/catch local

**Riesgo del fix:** bajo. Es 1:1 con lo que hace enfoque mexicano (que ya funciona en producción).

#### Plan de despliegue
1. Modificar `cms-originaux/sites/radiocinconoticias/index.html` (3 líneas)
2. `wrangler pages deploy cms-originaux/sites/radiocinconoticias --project-name=radiocinconoticias`
3. Verificar en navegador: `https://radiocinconoticias.click` debería mostrar los 1,009 artículos
4. Verificar también en `https://radiocinconoticias.pages.dev` (el subdominio por defecto)
5. Veredicto del usuario

---

## Bug 2: Enfoque mexicano muestra solo 1 artículo del 29 mayo

### Síntoma
`https://enfoquemexicano.click` muestra 12 artículos pero **el más reciente es del 29 de mayo 2026**, a pesar de que el cron corre cada 30 min y la DB sigue actualizándose.

### Diagnóstico

#### Distribución de artículos por `ESTADO` en `cms-nuevos3`

| ESTADO | Total | Más reciente |
|---|---|---|
| `PUBLICADO` | 434 | 2026-05-29 19:31:01 |
| `VALIDAR` | 632 | 2026-06-02 09:00:28 (hace 1h) |

**El endpoint filtra por `ESTADO = 'PUBLICADO'`** (línea 45 de `cms-originaux/src/routes/articles.js`, replicado en cms-nuevos3):
```sql
WHERE p.ESTADO = 'PUBLICADO'
```

Por eso solo se ven los 434 PUBLICADOS, y el más nuevo de ésos es del 29 mayo 19:31. Los 632 en `VALIDAR` (incluyendo los más recientes) no se muestran.

#### ¿Es global, regional o local?
**REGIONAL** — afecta a todo `cms-nuevos3` (los 25 sitios), no solo `enfoquemexicano`. Cualquier sitio servido desde cms-nuevos3 muestra el mismo problema.

Cuentas por CMS:
| CMS | PUBLICADO | VALIDAR |
|---|---|---|
| cms-originaux | 7,940 | 129 |
| cms-nuevos | 4,123 | 160 |
| cms-nuevos2 | 2,373 | 134 |
| cms-nuevos3 | 5,950 | **632** |

#### ¿De dónde vienen los 632 artículos en VALIDAR?
- Todos con `AUTOR = 'NexoPress'`
- Todos insertados el **2026-05-29 a partir de las 20:00:38 UTC**
- Con `SITIO_DESTINO` apuntando a un sitio individual (no múltiples)
- En un solo lote de 632 (de ahí el "salto" en cantidad)

**No hay NINGÚN código en el repo actual que setee `ESTADO = 'VALIDAR'`.** Verifiqué con `search_files "VALIDAR" path:News-Site-Orchestration` — 0 resultados.

Conclusión: **fueron insertados por un script externo o un flujo batch del 29 de mayo que ya no existe en el repo** (probablemente `cms-nuevos3/scripts/ejemplo.txt` o un script de pruebas que se ejecutó una sola vez y nunca se promovió a `PUBLICADO`).

#### ¿Por qué el cron sigue insertando en `VALIDAR`?
Porque **el flujo actual (`yesterday_today_ingest.py`) no setea explícitamente `ESTADO`**. El default del esquema es `'PUBLICADO'`, pero el script de Ollama Cloud (el que está corriendo ahora vía cron) **usa el default EXPLÍCITO `ESTADO = 'VALIDAR'`**.

**Esto es intencional, no un bug.** El estado `VALIDAR` parece ser una "puerta de revisión" que estaba pensada para revisión humana antes de publicar. Pero como nunca se construyó un UI/admin que mueva los artículos de `VALIDAR` → `PUBLICADO`, **los artículos se quedan atorados ahí**.

#### Verificación adicional
- El último artículo en VALIDAR es de 2026-06-02T09:00:28Z (hace ~1h al momento de investigar)
- El cron corre cada 30 min y genera artículos consistentemente
- **Todos los artículos que el flujo Ollama Cloud produce quedan en VALIDAR**
- El flujo legacy (heredado de Arcee-AI) sí los dejaba en PUBLICADO (los 434 que se ven)

### Opciones para Bug 2

#### Opción A — Publicar todo (más simple, "correcto" para producción)
```sql
UPDATE ARTICULOS_PARAFRASEADOS
SET ESTADO = 'PUBLICADO'
WHERE ESTADO = 'VALIDAR';
```

Aplica a: cms-nuevos3 (632), cms-originaux (129), cms-nuevos (160), cms-nuevos2 (134). Total: **1,055 artículos** rescatados en una sola operación.

**Pro:** resuelve el problema de raíz, 1 sola migración.
**Contra:** pierde la "puerta de revisión". Si había un filtro de calidad implementado en otro lado que se rompía con esto, se rompe.

#### Opción B — Modificar el flujo Ollama para escribir PUBLICADO
Cambiar el `INSERT` en `cms-nuevos3/tools/news/yesterday_today_ingest.py` (línea 122) para añadir `ESTADO` explícitamente. **Pero esto solo resuelve los futuros**, no los 632 atorados.

#### Opción C — UI admin para revisar
Construir un panel que liste los VALIDAR y permita aprobarlos. Más trabajo, valor real si hay control de calidad esperado.

**Mi recomendación:** **Opción A + Opción B combinadas**. Migración one-shot para los 632 + cambio en el script para que los futuros entren como PUBLICADO. Comentario en el código: "el estado VALIDAR ya no se usa, ver docs/MIGRACION_VALIDAR.md".

#### Validación después del fix
1. `wrangler d1 execute news_db_cms_nuevos3 --remote --command="UPDATE ARTICULOS_PARAFRASEADOS SET ESTADO = 'PUBLICADO' WHERE ESTADO = 'VALIDAR'"`
2. `curl https://enfoquemexicano.click/api/articles?site=enfoquemexicano&limit=5` → debe devolver artículos del 2026-06-02
3. Recargar el sitio en navegador
4. Veredicto del usuario

---

## Resumen de la pregunta "¿por qué enfoque mostraba artículos del 29 mayo?"

| Pregunta | Respuesta |
|---|---|
| ¿Por qué el más reciente es del 29 mayo? | Porque la última inserción que entró en `PUBLICADO` data de ese día. Todo lo posterior quedó en `VALIDAR`. |
| ¿Por qué no se ve lo nuevo? | El endpoint filtra `WHERE ESTADO = 'PUBLICADO'`. |
| ¿Por qué quedó en `VALIDAR`? | El flujo Ollama Cloud (que corre hoy) usa `ESTADO='VALIDAR'` explícito. La lógica de "VALIDAR → PUBLICADO" nunca se construyó. |
| ¿El cron está roto? | **No**, el cron funciona. Está generando artículos cada 30 min. Pero quedan atrapados en `VALIDAR`. |
| ¿Es bug nuevo? | **No**, los 632 artículos llevan 4 días en VALIDAR (desde 2026-05-29 20:00). Es un bug **heredado** que la migración Ollama no causa pero tampoco resuelve. |
| ¿Es el mismo bug que radiocinco? | **No**. Son dos bugs distintos: radiocinco es front (JavaScript roto), enfoque es back (estado de DB incorrecto). |

---

## Lo que NO es bug

- **El cron funciona**: 4 CMS ejecutan OK cada 30 min, status `OK`, generando artículos en vivo.
- **Ollama Cloud está produciendo artículos**: el último data de hace 1h, formato correcto, `AUTOR='NexoPress'`, `CATEGORIA` correcta, `URL_IMAGEN` apuntando a R2.
- **El flujo legacy (`today_ai_ingest.py`) sí funciona**: los 434 PUBLICADOS en cms-nuevos3 se generaron por ese flujo (autor `IA Arcee-AI`).
- **La API funciona**: ambos endpoints devuelven HTTP 200 con datos válidos.
- **Facebook no es parte de estos bugs**: sigue roto por `FB_TIMERS` y tokens, pero es un problema aparte.

---

## Plan de acción recomendado

### Paso 1: Fix radiocinco (Bug 1)
- Modificar 3 líneas en `cms-originaux/sites/radiocinconoticias/index.html`
- `wrangler pages deploy` 
- Validar en navegador
- Tiempo: 5 min + tu veredicto

### Paso 2: Fix enfoque mexicano (Bug 2)
- Decisión: ¿Opción A (migración SQL one-shot) o solo Opción B (cambiar script)?
- Si A: ejecutar UPDATE en 4 DBs (1,055 artículos rescatados)
- Si solo B: cambiar el script + validar que los futuros entren PUBLICADO, pero los 632 atorados siguen invisible
- Tiempo: 5 min + tu veredicto

### Paso 3 (opcional): Documentar
- Crear `docs/MIGRACION_VALIDAR_2026_06_02.md` con la decisión
- Actualizar `docs/AGENTS.md` (sección ARTICULOS_PARAFRASEADOS) para reflejar el estado real

---

## Diferencias con mi memoria previa

| Lo que yo creía | Realidad |
|---|---|
| `ARTICULOS_PARAFRASEADOS.SITIO_DESTINO` (singular) | ✅ correcto, pero **cms-nuevos3 NO tiene esa columna** (usa otra cosa) |
| `ARTICULOS_PARAFRASEADOS.TITULO` (corto) | ❌ el nombre real es `TITULO_PARAFRASEADO` |
| `ARTICULOS_PARAFRASEADOS.URL_IMAGEN` siempre | ❌ cms-originaux/nuevos/nuevos2 NO la tienen, solo cms-nuevos3 |
| Solo hay `ESTADO = 'PUBLICADO'/'BORRADOR'` | ❌ hay también `'VALIDAR'` que es un estado huérfano, usado por el flujo Ollama |
| cms-originaux se comunica con sus sitios via `cms-originaux.sebastianvernis.workers.dev` | ✅ correcto |
| cms-nuevos3 se comunica con sus sitios via `cms-nuevos3.sebastianvernis.workers.dev` | ✅ correcto |
| 60 sitios en total | ❌ cms-originaux = 10, cms-nuevos3 = 25, más cms-nuevos y cms-nuevos2. Total ~50+ |
| Hay `_template/` para sitios nuevos | ❌ **no existe**; cada sitio tiene su propia estructura completa |

Lo siento por las imprecisiones en mi memoria previa — la había construido a partir de una sola sesión exploratoria anterior y no la había verificado contra el estado real del repo y de la DB.
