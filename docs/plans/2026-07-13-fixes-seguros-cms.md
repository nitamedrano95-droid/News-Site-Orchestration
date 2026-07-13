# Plan: Fixes seguros CMS (SSR roto + normalización D1 + categorías)

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task.

**Goal:** Resolver el bug universal de /articulo/<slug> → 302 en 61 sitios, normalizar SITIO_DESTINO en producción (cms-originaux + cms-nuevos3), y unificar la variante ECONOMÍA/ECONOMIA.

**Architecture:**
- SSR fix: copiar `_shared/article-middleware.js` al publish dir de cada sitio (`<sitio>/functions/_shared/article-middleware.js`), ajustando el import path. Mantener una sola copia maestra por CMS en `cms-XXX/sites/_shared/`.
- D1 normalización: migration SQL idempotente que reescribe SITIO_DESTINO a slug canónico (minúscula, sin acento, sin acentos) usando `LOWER()` y reemplazando variantes conocidas.
- ECONOMÍA unification: migration SQL que convierte CATEGORIA='ECONOMÍA' a 'ECONOMIA' en cms-nuevos3.

**Tech Stack:** Cloudflare Pages (Functions), Cloudflare D1 (SQLite), bash para deploys, wrangler 4.97.

---

## Contexto y diagnóstico (ya hecho)

- 61 sitios con `functions/articulo/[slug].js` cuyo import `../../../_shared/article-middleware.js` apunta FUERA del publish dir.
- SITIO_DESTINO escrito en 3 formatos incompatibles: minúscula multi, MAYÚSCULAS, MAYÚSCULAS con acento (`VÉRTICENOTICIAS`).
- cms-nuevos3 tiene 47 artículos con CATEGORIA='ECONOMÍA' o 'ECONOMIA' mezclados.
- Vertice Noticias: 538 publicados, Finance & Markets MX: 175 publicados. Sub-asignación NO se toca (issue separado, ver `docs/plans/2026-07-13-issue-cron-rss-dedicadas.md`).

---

## Convenciones

- **Commits:** conventional commits en español (`fix:`, `chore:`, `docs:`, `feat:`).
- **Branches:** una sola `fix/2026-07-13-cms-safe-fixes` para todo el plan (commits atómicos por tarea, NO un commit general).
- **No auto-deploy.** El usuario hace `wrangler pages deploy` después de cada commit.
- **Verificación pre-deploy:** `node --check` en cada .js, `git diff` revisado por el controller.
- **Verificación post-deploy:** `curl -sL -o /tmp/x.html -w "%{http_code}\n" <url>` contra el dominio real.

---

## Task 1: Pilot SSR fix — verticenoticias

**Objetivo:** Que `/articulo/<slug-existente>` devuelva 200 con HTML completo (no 302).

**Archivos:**
- Crear: `cms-originaux/sites/verticenoticias/functions/_shared/article-middleware.js` (copia)
- Modificar: `cms-originaux/sites/verticenoticias/functions/articulo/[slug].js` línea 1: cambiar `../../../_shared/article-middleware.js` → `./_shared/article-middleware.js`

**Paso 1: Crear subdir**

```bash
mkdir -p cms-originaux/sites/verticenoticias/functions/_shared
```

**Paso 2: Copiar archivo maestro a publish dir del pilot**

```bash
cp cms-originaux/sites/_shared/article-middleware.js \
   cms-originaux/sites/verticenoticias/functions/_shared/article-middleware.js
```

**Paso 3: Cambiar import en el SSR del pilot**

En `cms-originaux/sites/verticenoticias/functions/articulo/[slug].js`, línea 1:

```js
// ANTES
import { handleArticleRequest } from '../../../_shared/article-middleware.js';

// DESPUÉS
import { handleArticleRequest } from '../_shared/article-middleware.js';
```

(Desde `functions/articulo/[slug].js`, `../_shared/` = `functions/_shared/`. El `_shared` es hermano de `articulo`, no de la raíz del sitio.)

**Paso 4: Validar sintaxis**

```bash
node --check cms-originaux/sites/verticenoticias/functions/_shared/article-middleware.js
node --check cms-originaux/sites/verticenoticias/functions/articulo/[slug].js
```

Esperado: sin output (OK).

**Paso 5: Diff visual**

```bash
git diff --stat cms-originaux/sites/verticenoticias/functions/
git diff cms-originaux/sites/verticenoticias/functions/articulo/[slug].js
```

Esperado: 1 archivo nuevo (`_shared/article-middleware.js`, ~5KB), 1 archivo modificado (1 línea cambiada en `[slug].js`).

**Paso 6: Commit**

```bash
git add cms-originaux/sites/verticenoticias/functions/
git commit -m "fix(ssr): copiar _shared/article-middleware al publish dir de verticenoticias"
```

**Verificación post-deploy (delegada al usuario):**

```bash
wrangler pages deploy . --project-name=verticenoticias --branch=main
# Después:
curl -sI https://verticenoticias.pages.dev/articulo/rosi-wong-actividades-deportivas-tecamac-toda-la-familia
# Esperado: HTTP/2 200 (no 302)
```

---

## Task 2: Replicar fix _shared/ a otros 9 sitios de cms-originaux

**Objetivo:** Aplicar el mismo patrón a los otros 9 sitios: bitacoraurbana, cbnnoticias, centralmexico, mexicoinformado, nodoinformativo, noticiasobjetivo, radiocinconoticias, reportecentralmx, tvmexico.

**Archivos:** 9 × (1 archivo nuevo + 1 línea modificada) = 18 archivos tocados.

**Paso 1: Generar y aplicar cambios en lote (script)**

```bash
for site in bitacoraurbana cbnnoticias centralmexico mexicoinformado nodoinformativo noticiasobjetivo radiocinconoticias reportecentralmx tvmexico; do
  mkdir -p "cms-originaux/sites/$site/functions/_shared"
  cp cms-originaux/sites/_shared/article-middleware.js \
     "cms-originaux/sites/$site/functions/_shared/article-middleware.js"
done
```

**Paso 2: Patch los 9 archivos [slug].js**

Para cada sitio, en `cms-originaux/sites/<site>/functions/articulo/[slug].js`, reemplazar:

```js
import { handleArticleRequest } from '../../../_shared/article-middleware.js';
```

por:

```js
import { handleArticleRequest } from '../_shared/article-middleware.js';
```

**Paso 3: Validar sintaxis de los 10 archivos JS afectados**

```bash
for site in bitacoraurbana cbnnoticias centralmexico mexicoinformado nodoinformativo noticiasobjetivo radiocinconoticias reportecentralmx tvmexico verticenoticias; do
  node --check "cms-originaux/sites/$site/functions/_shared/article-middleware.js"
  node --check "cms-originaux/sites/$site/functions/articulo/[slug].js"
done
```

Esperado: 10 silencios OK.

**Paso 4: Diff stats**

```bash
git diff --stat cms-originaux/sites/
```

Esperado: 10 archivos nuevos (~5KB cada uno) + 10 archivos modificados (1 línea).

**Paso 5: Commit único**

```bash
git add cms-originaux/sites/
git commit -m "fix(ssr): replicar _shared/article-middleware a los 10 sitios de cms-originaux"
```

---

## Task 3: Replicar a cms-nuevos (17 sitios)

**Objetivo:** Mismo patrón para los 17 sitios de cms-nuevos.

**Archivos:** 17 sitios × (1 nuevo + 1 modificado).

**Paso 1: Loop idéntico al Task 2**

```bash
for site in <listar 17 sitios de cms-nuevos>; do
  mkdir -p "cms-nuevos/sites/$site/functions/_shared"
  cp cms-nuevos/sites/_shared/article-middleware.js \
     "cms-nuevos/sites/$site/functions/_shared/article-middleware.js"
  # Patch [slug].js import path
done
```

**Paso 2: Validar**

```bash
for site in <17 sitios>; do
  node --check "cms-nuevos/sites/$site/functions/_shared/article-middleware.js"
  node --check "cms-nuevos/sites/$site/functions/articulo/[slug].js"
done
```

**Paso 3: Commit**

```bash
git add cms-nuevos/sites/
git commit -m "fix(ssr): replicar _shared/article-middleware a los 17 sitios de cms-nuevos"
```

---

## Task 4: Replicar a cms-nuevos2 (9 sitios)

Idéntico al Task 3 con la lista de 9 sitios de cms-nuevos2.

Commit: `fix(ssr): replicar _shared/article-middleware a los 9 sitios de cms-nuevos2`

---

## Task 5: Replicar a cms-nuevos3 (24 sitios)

Idéntico con 24 sitios de cms-nuevos3. (Excluir `cms-nuevos4` que está en rediseño.)

Commit: `fix(ssr): replicar _shared/article-middleware a los 24 sitios de cms-nuevos3`

---

## Task 6: Smoke test integral SSR (post-deploy del usuario)

**Objetivo:** Confirmar que `/articulo/<slug>` devuelve 200 en TODOS los 61 sitios modificados.

**Paso 1: Generar lista de slugs a probar**

Para cada sitio, tomar el slug más reciente de su D1.

**Paso 2: Bucle curl**

```bash
for url in <61 urls>; do
  code=$(curl -sL -o /dev/null -w "%{http_code}" "$url")
  if [ "$code" != "200" ]; then echo "FAIL $code $url"; fi
done
```

Esperado: 0 FAIL.

---

## Task 7: Normalización SITIO_DESTINO en cms-originaux

**Objetivo:** Que TODAS las filas de `ARTICULOS_PARAFRASEADOS` tengan SITIO_DESTINO en formato canónico (slug minúscula, sin acento). Tras esto, la query `LIKE '%,verticenoticias,%'` matchea todos los registros de Vertice.

**Archivo:** `cms-originaux/migrations/004_normalize_sitio_destino.sql` (nuevo).

**Paso 1: Backup**

```bash
wrangler d1 export news_db_cms_originaux --remote --output=backups/pre_normalize_originaux_2026-07-13.sql
```

Esperado: archivo con timestamp en `backups/`.

**Paso 2: Crear migration**

```sql
-- Normalizar SITIO_DESTINO a slug canónico: minúscula, sin acentos.
-- Patrón actual: mezclan MAYÚSCULAS, minúsculas, y MAYÚSCULAS con acentos
-- (ej: VÉRTICENOTICIAS, VÉRTICE NOTICIAS, verticenoticias).

-- Idempotente: solo actualiza si hay variantes no canónicas.

-- 1. Quitar acentos comunes en SITIO_DESTINO (versión uppercase legacy)
UPDATE ARTICULOS_PARAFRASEADOS
SET SITIO_DESTINO = REPLACE(REPLACE(REPLACE(SITIO_DESTINO,
  'É','E'),'Ó','O'),'Í','I')
WHERE SITIO_DESTINO GLOB '*[ÁÉÍÓÚÑ]*';

-- 2. Minúsculas
UPDATE ARTICULOS_PARAFRASEADOS
SET SITIO_DESTINO = LOWER(SITIO_DESTINO)
WHERE SITIO_DESTINO != LOWER(SITIO_DESTINO);

-- 3. Reemplazar variantes históricas con slug canónico
-- (lista extensible si aparecen más)
UPDATE ARTICULOS_PARAFRASEADOS
SET SITIO_DESTINO = REPLACE(SITIO_DESTINO, 'vertice noticias', 'verticenoticias')
WHERE SITIO_DESTINO LIKE '%vertice noticias%';

UPDATE ARTICULOS_PARAFRASEADOS
SET SITIO_DESTINO = REPLACE(SITIO_DESTINO, 'verticenoticias', 'verticenoticias')
WHERE SITIO_DESTINO LIKE '%verticenoticias%';

-- Repetir para otros sitios con tildes conocidos (chequear contra config.js SITIOS_LIST)
-- (cms-originaux sitios sin tildes: solo verticenoticias)

-- 4. Limpiar dobles comas/espacios que pudieran haber quedado
UPDATE ARTICULOS_PARAFRASEADOS
SET SITIO_DESTINO = TRIM(REPLACE(REPLACE(SITIO_DESTINO, ',,', ','), ' ,', ','))
WHERE SITIO_DESTINO LIKE '%,,%' OR SITIO_DESTINO LIKE '% ,%';
```

**Paso 3: Probar en --local primero**

```bash
wrangler d1 execute news_db_cms_originaux --local --file cms-originaux/migrations/004_normalize_sitio_destino.sql
```

Esperado: success, sin errores.

**Paso 4: Diff de conteos antes/después**

```bash
wrangler d1 execute news_db_cms_originaux --remote --json --command "
SELECT COUNT(*) as n FROM ARTICULOS_PARAFRASEADOS WHERE ESTADO='PUBLICADO' AND (',' || SITIO_DESTINO || ',') LIKE '%,verticenoticias,%'
" | tee /tmp/before.json
```

Después de aplicar la migration, comparar:

```bash
wrangler d1 execute news_db_cms_originaux --remote --json --command "
SELECT COUNT(*) as n FROM ARTICULOS_PARAFRASEADOS WHERE ESTADO='PUBLICADO' AND (',' || SITIO_DESTINO || ',') LIKE '%,verticenoticias,%'
" | tee /tmp/after.json
diff /tmp/before.json /tmp/after.json
```

Esperado: el `after.n` debe ser **mayor o igual** al `before.n` (la normalización solo agrega filas al filtro que antes fallaban).

**Paso 5: Aplicar en --remote (con OK explícito del usuario)**

```bash
wrangler d1 execute news_db_cms_originaux --remote --file cms-originaux/migrations/004_normalize_sitio_destino.sql
```

**Paso 6: Commit**

```bash
git add cms-originaux/migrations/004_normalize_sitio_destino.sql
git commit -m "fix(d1): agregar migration para normalizar SITIO_DESTINO en cms-originaux"
```

---

## Task 8: Normalización SITIO_DESTINO en cms-nuevos3

Idéntico al Task 7, con la lista de sitios con tildes de cms-nuevos3 (revisar `cms-nuevos3/src/config.js` SITIOS_LIST: mexicoplus, etc.).

**Archivo:** `cms-nuevos3/migrations/004_normalize_sitio_destino.sql`.

Commit: `fix(d1): agregar migration para normalizar SITIO_DESTINO en cms-nuevos3`

---

## Task 9: Unificar ECONOMÍA → ECONOMIA en cms-nuevos3

**Objetivo:** Eliminar la doble variante. 47 artículos → 32 pasan a ECONOMIA.

**Archivo:** `cms-nuevos3/migrations/005_unify_economia.sql`.

**Paso 1: Backup**

```bash
wrangler d1 export news_db_cms_nuevos3 --remote --output=backups/pre_unify_economia_2026-07-13.sql
```

**Paso 2: Crear migration idempotente**

```sql
-- Unificar ECONOMÍA (con tilde) a ECONOMIA (sin tilde)
-- Solo afecta ARTICULOS_PARAFRASEADOS y ARTICULOS_CMS si existe.

UPDATE ARTICULOS_PARAFRASEADOS
SET CATEGORIA = 'ECONOMIA'
WHERE CATEGORIA = 'ECONOMÍA';

-- Si existe la tabla:
UPDATE ARTICULOS_CMS
SET CATEGORIA = 'ECONOMIA'
WHERE CATEGORIA = 'ECONOMÍA';
```

**Paso 3: Aplicar en local, después remote (con OK del usuario)**

```bash
wrangler d1 execute news_db_cms_nuevos3 --local --file cms-nuevos3/migrations/005_unify_economia.sql
wrangler d1 execute news_db_cms_nuevos3 --remote --file cms-nuevos3/migrations/005_unify_economia.sql
```

**Paso 4: Verificar**

```bash
wrangler d1 execute news_db_cms_nuevos3 --remote --json --command "
SELECT CATEGORIA, COUNT(*) as n FROM ARTICULOS_PARAFRASEADOS WHERE ESTADO='PUBLICADO' GROUP BY CATEGORIA ORDER BY n DESC
" | head -20
```

Esperado: ya no aparece 'ECONOMÍA', solo 'ECONOMIA' con 47.

**Paso 5: Commit**

```bash
git add cms-nuevos3/migrations/005_unify_economia.sql
git commit -m "fix(d1): unificar ECONOMÍA → ECONOMIA en cms-nuevos3"
```

---

## Task 10: Smoke test integral + reporte final

**Objetivo:** Confirmar todos los fixes en producción.

**Paso 1: Validar SSR en los 61 sitios**

```bash
for site in <lista de 61>; do
  slug=$(<último slug de $site>)
  code=$(curl -sL -o /dev/null -w "%{http_code}" "https://$site.pages.dev/articulo/$slug")
  [ "$code" = "200" ] || echo "FAIL $code $site/$slug"
done
```

Esperado: 0 FAIL.

**Paso 2: Validar feeds después de normalización**

```bash
for slug in verticenoticias financemarketsmx; do
  count=$(curl -s "https://cms-originaux.sebastianvernis.workers.dev/api/articles?site=$slug&limit=1" \
    | python3 -c "import json,sys; print(len(json.load(sys.stdin)['articles']))")
  echo "$slug feed OK count=$count"
done
```

**Paso 3: Reporte al usuario**

Generar resumen con:
- Commits creados (10)
- Archivos tocados (61 funciones + 2 migrations SQL)
- Conteo de artículos por sitio (antes/después de normalización)
- Estado del SSR (200 vs 302)
- Issues pendientes (cron RSS, ver `docs/plans/2026-07-13-issue-cron-rss-dedicadas.md`)

---

## Notas de seguridad

1. **Backup obligatorio** antes de cada migration (Tasks 7-9).
2. **--local primero, --remote después** con OK del usuario.
3. **Diff antes de commit** (ancla: search for any cambio en código fuera del scope).
4. **NO wrangler deploy.** El usuario hace deploy y da veredicto.
5. **Idempotencia.** Las migrations usan `WHERE` que solo afecta filas no canónicas, y `UPDATE ... WHERE` que no duplica trabajo.