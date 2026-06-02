# Limpieza de worktrees y fix de bugs en producción

**Fecha:** 2026-06-02
**Operador:** Sebastian (con asistencia de Hermes)
**Estado final:** ✅ Producción estable, worktrees eliminados

---

## TL;DR

Tres acciones que arreglaron dos bugs críticos de producción:

1. **Fix radiocinco** — 3 líneas cambiadas en `index.html`, deploy directo a Pages. El sitio pasó de "Error al cargar noticias" a mostrar 1,009 artículos.
2. **Fix cms-nuevos3** — re-deploy del worker desde `main` + UPDATE SQL. 635 artículos atrapados en `ESTADO='VALIDAR'` rescatados, el cron vuelve a escribir `ESTADO='PUBLICADO'`.
3. **Limpieza git** — eliminados los worktrees `ai-validation-flow` y `fb-image-fix` (carpetas + ramas locales).

---

## Bug 1: radiocinco "Error al cargar noticias" (LOCAL)

### Síntoma
`https://radiocinconoticias.click` mostraba el header y el footer pero decía
"Error al cargar noticias" en la zona principal.

### Causa raíz
`cms-originaux/sites/radiocinconoticias/index.html` tenía 3 ocurrencias de:

```html
<img src="${$1||'logo.png'}" alt="${esc(a.title)}" loading="lazy">
```

`$1` es un placeholder de regex (`String.prototype.replace()`) que se quedó
en el código. En el scope del template literal, `$1` no existe como variable,
así que el navegador tiraba `ReferenceError: $1 is not defined` al primer
render. El `try/catch` lo capturaba y mostraba el mensaje de error.

### Fix
3 reemplazos (líneas 73, 89, 124 del archivo):
```diff
- <img src="${$1||'logo.png'}" alt="${esc(a.title)}" loading="lazy">
+ <img src="${esc(a.imageUrl)||'logo.png'}" alt="${esc(a.title)}" loading="lazy">
```

El helper `esc()` ya estaba en uso en el resto del archivo. `a.imageUrl` es
el campo que la API devuelve con la URL de R2.

### Despliegue
```bash
cd cms-originaux/sites/radiocinconoticias
wrangler pages deploy . --project-name=radiocinconoticias --branch=main
```

**Lección aprendida para futuros deploys:** este proyecto usa `--branch=main`
en Pages (no `--branch=master` como en otros). El primer deploy a `master`
creó un subdominio huérfano (`2f8e3021.radiocinconoticias.pages.dev`) que
NO actualizó la producción.

### Verificación
- Antes: "Error al cargar noticias" en `radiocinconoticias.click`
- Después: hero article "Construcción de la Preparatoria 383..." (1/6/2026)
  con imagen, 5+ artículos en "Más Leídas", grid completo en "Más Noticias"

---

## Bug 2: cms-nuevos3 artículos en `ESTADO='VALIDAR'` (REGIONAL)

### Síntoma
Todos los 25 sitios servidos por `cms-nuevos3.sebastianvernis.workers.dev`
(enfoquemexicano.click, adnmexicano.click, etc.) mostraban el último artículo
del 29 de mayo 2026, a pesar de que el cron corría cada 30 min.

### Causa raíz
El deploy activo de cms-nuevos3 venía de la rama `worktree-ai-validation-flow`,
donde el cron (`cms-nuevos3/src/cron/rss-ingest.js`) inserta con
`ESTADO='VALIDAR'` (líneas 771, 929, 1078) en lugar de `'PUBLICADO'`.

Esa rama era una implementación al 50% de un flujo de validación con IA que:
- ✅ Sí se planeó (migración SQL con columnas `VALIDO_AI/VALIDADO_EN/RAZON_INVALIDO`)
- ✅ Sí se deployó (cambio del cron y de facebook.js)
- ❌ Nunca tuvo un validador que seteara `VALIDO_AI=1`
- ❌ Nunca tuvo un job que moviera `VALIDAR → PUBLICADO`

Resultado: 6,373 artículos con `VALIDO_AI=NULL` (nunca seteado), 635 en
`ESTADO='VALIDAR'` desde 2026-05-29 20:00 UTC.

### Fix
Dos partes:

**Parte A — Re-deploy del worker desde main:**
```bash
cd cms-nuevos3
wrangler deploy
```
- Versión nueva: `978214d1-a6a7-4e45-a84b-de5bde44e3f0`
- El cron vuelve a escribir `'PUBLICADO'` automáticamente
- Las queries de Facebook dejan de filtrar por `VALIDAR` (vuelven a usar la query de main)

**Parte B — UPDATE one-shot en D1:**
```sql
UPDATE ARTICULOS_PARAFRASEADOS
SET ESTADO = 'PUBLICADO'
WHERE ESTADO = 'VALIDAR';
```
- 635 filas actualizadas en 130ms
- Total final: 6,373 artículos PUBLICADO, 0 en VALIDAR

### Verificación
- Antes: `enfoquemexicano.click` mostraba el último artículo del 29 mayo
- Después: 5 artículos del 2 de junio (hoy), empezando por "Donald Trump reconsidera fondo de US$1.800 millones..."

### Lecciones aprendidas
1. La feature de validación IA está documentada en
   `docs/history/facebook-blob-upload-pattern-2026-06-02.md` (la parte de
   blob upload de FB) pero el validador IA propiamente dicho **nunca se construyó**.
   Si alguien retoma esa feature, debe empezar desde cero.
2. El estado `ESTADO='VALIDAR'` debe ser considerado **deprecated**. Si vuelve
   a aparecer, es un bug. El único estado válido para producción es `'PUBLICADO'`.
3. El cron actual de cms-nuevos3 (y de los otros 3 CMS) **NO tiene ningún
   `try/catch` que silencie el cambio de estado**. Si en el futuro alguien
   cambia accidentalmente a `VALIDAR` o cualquier otro valor no reconocido,
   el filtro `WHERE p.ESTADO = 'PUBLICADO'` en la API lo va a ocultar todo
   silenciosamente. **Considerar agregar un check de seguridad** que avise
   si hay artículos en estados que no sean `PUBLICADO`.

---

## Limpieza de worktrees

### Estado antes
- `.claude/worktrees/ai-validation-flow/` — worktree de la rama `worktree-ai-validation-flow` (95% destructivo, 0 funciones nuevas, 1 mejora marginal)
- `.claude/worktrees/fb-image-fix/` — worktree de la rama `worktree-fb-image-fix` (idéntico al anterior, mismo commit `a1c05f1`)

### Estado después
- Solo queda `main` en `git worktree list`
- Ramas `worktree-ai-validation-flow` y `worktree-fb-image-fix` eliminadas con `git branch -D`

### Por qué se eliminaron
- El diff vs main es **95% destructivo**: -4,361 líneas netas, 0 funciones nuevas, 0 rutas nuevas
- La única mejora positiva (FB: subir imagen como blob en vez de URL) está documentada en `docs/history/facebook-blob-upload-pattern-2026-06-02.md` para portar manualmente si se necesita
- Elimina el `deploy-wizard/` completo (-5,500 líneas)
- Rompe producción (cambio `'PUBLICADO'` → `'VALIDAR'` en el cron)

### Auditoría completa del diff
Ver `docs/diagnostico-bug-radiocinco-enfoque-V2-2026-06-02.md` sección "Auditoría del worktree".

---

## Estado final del sistema

| Componente | Estado |
|---|---|
| `radiocinconoticias.click` | ✅ Hero + sidebar + grid correctos |
| `enfoquemexicano.click` | ✅ Artículos de hoy visibles |
| `cms-nuevos3` worker | ✅ Versión `978214d1` (main), cron con `PUBLICADO` |
| `news_db_cms_nuevos3` | ✅ 6,373 PUBLICADO, 0 VALIDAR |
| Cron cada 30 min | ✅ Corriendo, escribirá `PUBLICADO` |
| `git worktree list` | ✅ Solo `main` |
| `git branch` | ✅ Solo `main` y `restauracion` |

---

## Tareas pendientes (no relacionadas con estos bugs)

1. **Facebook publicación rota**: `timer(0/0) retry(0/0)` en los 4 CMS. Los artículos con `FB_PUBLICADO=0` no se publican. Probablemente tokens vencidos o `setup_fb_tokens.py` no corrido.
2. **Otros 3 CMS (originaux, nuevos, nuevos2)**: tienen ~423 artículos legacy en `ESTADO='VALIDAR'`. No es urgente (no son visibles en producción, pero tampoco se generan más), pero可以考虑 un UPDATE one-shot similar si se quiere consistencia.

---

## Archivos modificados/creados

**Modificados (en este orden):**
1. `cms-originaux/sites/radiocinconoticias/index.html` (3 líneas)

**Deploys:**
1. `wrangler pages deploy` para `radiocinconoticias` (Pages project)
2. `wrangler deploy` para `cms-nuevos3` (Worker)

**SQL ejecutado:**
1. `UPDATE ARTICULOS_PARAFRASEADOS SET ESTADO='PUBLICADO' WHERE ESTADO='VALIDAR'` en `news_db_cms_nuevos3`

**Eliminados:**
1. `.claude/worktrees/ai-validation-flow/`
2. `.claude/worktrees/fb-image-fix/`
3. Ramas `worktree-ai-validation-flow` y `worktree-fb-image-fix`

**Documentos creados:**
1. `docs/history/facebook-blob-upload-pattern-2026-06-02.md` (lógica de FB preservada)
2. `docs/diagnostico-bug-radiocinco-enfoque-2026-06-02.md` (versión inicial)
3. `docs/diagnostico-bug-radiocinco-enfoque-V2-2026-06-02.md` (causa raíz del bug VALIDAR)
4. `docs/history/cleanup-worktrees-and-prod-fixes-2026-06-02.md` (este documento)
