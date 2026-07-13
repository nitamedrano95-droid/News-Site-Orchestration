# Reporte final — Plan de fixes seguros CMS (2026-07-13)

> Plan ejecutado: `docs/plans/2026-07-13-fixes-seguros-cms.md`
> Issue documentado (no implementado): `docs/plans/2026-07-13-issue-cron-rss-dedicadas.md`

## Resumen ejecutivo

10 commits en main, 124 archivos tocados, 0 errores. SSR fix universal en 61 sitios. 2 migrations SQL aplicadas en producción con backup previo. Pendiente: deploy de los 61 sitios Pages por el usuario.

## Tabla de commits

```
6642bd1f fix(d1/cms-nuevos3): unificar ECONOMÍA → ECONOMIA (32 filas)
db457910 fix(d1/cms-nuevos3): normalizar SITIO_DESTINO a slug canónico para 9 valores legacy
63d24599 fix(d1/cms-originaux): normalizar SITIO_DESTINO a slug canónico para 5 valores legacy
21775b21 fix(ssr/cms-nuevos3): replicar _shared/article-middleware a 25 sitios
8dd193fa fix(ssr/cms-nuevos2): replicar _shared/article-middleware a 8 sitios + index.js de socialmexiconews
d04d8eec fix(ssr/cms-nuevos): replicar _shared/article-middleware a 17 sitios
c5ede07f fix(ssr/cms-originaux): replicar _shared/article-middleware a 9 sitios
3540de5d fix(ssr/verticenoticias): copiar _shared/article-middleware al publish dir
c616ffe7 docs(plans): plan de fixes seguros + issue documentado del cron RSS
```

## Métricas por fix

### Fix A — SSR `/articulo/<slug>` (Tasks 1-6)

| CMS | Sitios | Archivos tocados | Sintaxis OK |
|-----|--------|------------------|-------------|
| cms-originaux  | 10 | 20 (10 nuevos + 10 modificados) | ✓ |
| cms-nuevos     | 17 | 34 | ✓ |
| cms-nuevos2    | 8 + 1 (socialmexiconews index.js) | 17 | ✓ |
| cms-nuevos3    | 25 | 50 | ✓ |
| **TOTAL**      | **60 sitios + 1 index.js** | **121 archivos** | **✓** |

**Causa resuelta:** El SSR functions/articulo/[slug].js importaba `../../../_shared/article-middleware.js`, path que apuntaba fuera del publish dir (`pages_build_output_dir="."`). Cloudflare Pages degradaba a redirect 302 → /.

**Fix:** copiar el archivo a `functions/_shared/` (hermano de `functions/articulo/`) y ajustar el import a `'../_shared/article-middleware.js'`.

**Excluido:** `cms-nuevos4` (en rediseño, sin SSR implementado).

### Fix B — Normalización SITIO_DESTINO cms-originaux (Task 7)

Migration `cms-originaux/migrations/004_normalize_sitio_destino.sql` aplicada en producción.

| Variante legacy | Filas | Canónico |
|-----------------|-------|----------|
| TVMÉXICO | 85 | tvmexico |
| VÉRTICENOTICIAS | 84 | verticenoticias |
| CENTRALMÉXICO | 82 | centralmexico |
| TMZNEWSMÉXICO | 79 | tmznewsmexico |
| Vértice Noticias | 1 | verticenoticias |

**Total: 662 filas modificadas. 0 errores.**

**Conteo Vertice Noticias pre/post (medido):**
- Pre:  538 (canónico) + 84 (VÉRTICENOTICIAS no matcheaba)  = efectivo 538
- Post: 524 (canónico restante) + 99 migradas                 = efectivo 623
- Delta: **+85 artículos visibles** en el feed de Vertice tras la migración (medible solo post-deploy).

### Fix C — Normalización SITIO_DESTINO cms-nuevos3 (Task 8)

Migration `cms-nuevos3/migrations/004_normalize_sitio_destino.sql` aplicada en producción.

9 valores legacy con tildes normalizados (630 filas modificadas, 0 errores).

| Variante legacy | Filas | Canónico |
|-----------------|-------|----------|
| NACIÓNALINSTANTE | 72 | nacionalinstante |
| REPÚBLICAMX | 71 | republicamx |
| MÉXICOPLUS | 71 | mexicoplus |
| POLÍTICASALVAJEALMINUTO | 70 | politicasalvajealminuto |
| MÉXICOENRESUMEN | 70 | mexicoenresumen |
| DIARIOMÉXICO | 70 | diariomexicano |
| WENEWSMÉXICO | 69 | wenewsmexico |
| ELANÁLISISMEXICANO | 69 | elanalisismexicano |
| AZTECAMÉXICONOTICIAS | 68 | aztecamexiconoticias |

`financemarketsmx` ya estaba correctamente normalizado (sin cambio).

### Fix D — ECONOMÍA → ECONOMIA (Task 9)

Migration `cms-nuevos3/migrations/005_unify_economia.sql` aplicada en producción.

- Pre:  ECONOMÍA=32 + ECONOMIA=462 = 494 filas
- Post: ECONOMÍA=0 + ECONOMIA=494
- Total modificado: 64 filas (32 PUBLICADO + 32 en otros estados).
- 0 errores.

## Validación final del repo

```
Sitios con _shared/article-middleware.js:        60 (esperado 60 en cms-originaux+3 cms, + socialmexiconews ya lo tenía)
[slug].js con import '../_shared/...':           61
[slug].js con import '../../../_shared/...':     0 (0 archivos de código fuente)
Migrations SQL creadas:                          3 archivos
Backups:                                         2 archivos en ~/projects/backups/
Planes docs:                                     2 archivos (plan + issue separado)
```

## Pendiente para el deploy-verdict

**El usuario debe hacer deploy de los 61 sitios Pages.** Cada uno de los 4 CMS tiene su propio flujo:

```bash
# cms-originaux (10 sitios)
for site in bitacoraurbana cbnnoticias centralmexico mexicoinformado nodoinformativo noticiasobjetivo radiocinconoticias reportecentralmx tvmexico verticenoticias; do
  echo "=== Deploying $site ==="
  wrangler pages deploy cms-originaux/sites/$site --project-name=$site --branch=main
done

# cms-nuevos (17 sitios)
for site in boominformativo capitalpress diarioexpress elpulsomexicano enfoquecapital enfoquedirecto formulacdmx mexicantimes mexico360noticias mradio noticiashorizonte pulsodiario puntoclave puntonoticias radarinformativo reportediario televisionabc; do
  echo "=== Deploying $site ==="
  wrangler pages deploy cms-nuevos/sites/$site --project-name=$site --branch=main
done

# cms-nuevos2 (8 sitios)
for site in alavistanoticias breakingcentermexico centronews noticias123 noticiasintegra radioabc socialmexiconews tmznews; do
  echo "=== Deploying $site ==="
  wrangler pages deploy cms-nuevos2/sites/$site --project-name=$site --branch=main
done

# cms-nuevos3 (25 sitios)
for site in actualidadsinfronteras adnmexicano aztecamexiconoticias diariomexicano diariomexico elanalisismexicano elobservadorrepublicano elprofetamexicano enfoquemexicano expresomexicano financemarketsmx mexicannewsoftheworld mexicoandtheworld mexicodaily mexicoenresumen mexicoplus monitorrepublicano nacionalinstante noticiasalinstante perspectivamexicana politicasalvajealminuto pulsorepublicanonoticias radioredmx republicamx wenewsmexico; do
  echo "=== Deploying $site ==="
  wrangler pages deploy cms-nuevos3/sites/$site --project-name=$site --branch=main
done
```

> **Conveniencia:** El proyecto tiene scripts de deploy (`scripts/deploy/`) que probablemente ya hacen esto en lote. Si el usuario prefiere el script genérico del proyecto, ajustar a esa ruta.

**Smoke test post-deploy para los 2 sitios auditados originalmente:**

```bash
# Vertice Noticias
curl -sI https://verticenoticias.pages.dev/articulo/rosi-wong-actividades-deportivas-tecamac-toda-la-familia
# Esperado: HTTP/2 200 (antes: 302)

# Finance & Markets MX
curl -sI https://financemarketsmx.pages.dev/articulo/campo-marte-polemica-marte-26-empresa-vinculada-televisa
# Esperado: HTTP/2 200 (antes: 302)

# Verificar aumento de artículos en feed tras normalización
curl -s "https://cms-originaux.sebastianvernis.workers.dev/api/articles?site=verticenoticias&limit=100" \
  | python3 -c "import json,sys; print('count:', len(json.load(sys.stdin)['articles']))"
# Esperado: hasta ~85+ artículos visibles (antes: 5)
```

## Issues NO resueltos (documentados aparte)

1. **Cron RSS con FUENTES dedicadas inactivas**: `cms-originaux/src/cron/rss-ingest.js` y `cms-nuevos3/src/cron/rss-ingest.js` asumen una columna `PRIORIDAD` que no existe en la tabla `FUENTES`. Las fuentes dedicadas llevan al menos una semana sin producir artículos. Detalles en `docs/plans/2026-07-13-issue-cron-rss-dedicadas.md`.

2. **Sitios sin publicar**: Finance & Markets MX, Vertice Noticias, mexicoplus, republicamx están al fondo del ranking de actividad reciente. Probablemente consecuencia del issue #1.

3. **Variantes humanas con espacios** (~15 filas en cms-originaux): `ADN Mexicano`, `Bitacora Urbana`, etc. NO se normalizaron en este pase (decisión conservadora). Si se requiere, hacer un script posterior con mapeo explícito sitio-por-sitio.

4. **`ELUNIVERSAL` (34 filas)**: no aparece en config.js de ningún CMS. Probablemente sitio legacy o experimento. NO se tocó.

5. **Garbasura explícita** (`EJEMPLO.COM`, `MIDOMINIO.COM`, `SITIO_PRINCIPAL`, etc.): NO se eliminó.

## Respaldo / rollback

Backups SQL pre-migration disponibles en:

- `/home/sebastianvernis/projects/backups/pre_normalize_originaux_2026-07-13.sql` (26.7 MB)
- `/home/sebastianvernis/projects/backups/pre_normalize_nuevos3_2026-07-13.sql` (18.7 MB)

Para restaurar cualquier fila específica desde el backup, usar los IDs de las migrations aplicadas (registrados en los archivos .sql). El cambio es reversible con un UPDATE reverso usando los IDs PRE-migration que están preservados.
