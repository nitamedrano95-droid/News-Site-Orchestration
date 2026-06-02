# Scripts de Mantenimiento

Esta carpeta contiene scripts one-off y utilidades de mantenimiento del repo
NexoPress. **No** incluye los scripts de runtime de los CMS (esos viven en
`cms-*/tools/news/` y `cms-*/scripts/`).

Los scripts aquí están organizados por intención. Si vienes a buscar algo, mira
primero el nombre de la subcarpeta.

---

## `fixes/` — Correcciones puntuales

Cada script es un parche histórico que se aplicó una vez y se conserva
como referencia. **No los ejecutes a ciegas**: revisa primero qué hacen y en
qué commit/fecha se usaron.

| Script | Descripción |
|---|---|
| `clean-existing-articles.js` | Limpia marcas de sitio en artículos ya publicados |
| `fix-empty-images.js` | Corrige artículos con imágenes vacías en la DB |
| `fix-informador-images.js` | Patch específico para imágenes de El Informador |
| `fix-missing-site-entries.js` | Inserta entradas faltantes en `SITIOS` para sitios desplegados sin registro |
| `fix-spacing-cms-nuevos3.py` | Fix de spacing en cms-nuevos3 (v1) |
| `fix-spacing-cms-nuevos3-v2.py` | Fix de spacing en cms-nuevos3 (v2 — supersede a v1) |
| `fix_cms_nuevos3_pages.py` | Corrige referencias CSS/JS faltantes en páginas de cms-nuevos3 |
| `fix_missing_scriptjs.py` | Inserta `script.js` donde falta en sitios cms-nuevos3 |
| `re-download-images.js` | Re-descarga imágenes que fallaron en el upload a R2 |
| `unify-index-rendering.js` | Unifica el render del `index.html` entre sites (originaux/nuevos/nuevos2/nuevos3) |

## `data-migration/` — Migraciones masivas de datos

Scripts que se corrieron una vez para poblar/transformar la DB D1 o el
conjunto de sitios. Útiles solo si necesitas **re-crear desde cero** una
generación de CMS.

| Script | Descripción |
|---|---|
| `assign_loaders.py` | Asigna loaders CSS únicos a todos los sitios de todas las generaciones |
| `create_cms_nuevos3_categories.py` | Genera páginas dinámicas de categorías para los 25 sitios de cms-nuevos3 |
| `sync_cms_nuevos3.py` | Sincroniza cms-nuevos3 con los estándares de cms-originaux |
| `validate_cms_nuevos3.py` | Validación final de cms-nuevos3 después de la sincronización |

## `cms-internal/` — Mantenimiento de la plataforma

| Script | Descripción |
|---|---|
| `transform_layouts.py` | Transforma todos los sitios cms-nuevos3 con layouts únicos |
| `update_logos.py` | Actualiza `components.js` para usar imágenes de logo en headers/footers |
| `update_tokens_from_csv.py` | Actualiza tokens de Facebook en Cloudflare Secrets desde un CSV |

## `design/` — Assets y tooling de diseño

| Script | Descripción |
|---|---|
| `palettebuilder.jsx` | Componente React con las 50 paletas de colores de sitios (referencia visual) |

## `deploy/` — Scripts de despliegue alternativos

| Script | Descripción |
|---|---|
| `deploymentworker2.sh` | Setup de tokens ADMIN para los Workers. ⚠️ **Contiene un token hardcodeado en la línea 8 y rutas absolutas (`/home/sebastianvernis/ProyectosActivos/...`)** que no aplican en este entorno. Úsalo solo como referencia, no lo ejecutes directamente. |

## `n8n/` — Workflows n8n definidos como código

Estos archivos usan `@n8n/workflow-sdk` y definen workflows que se importan
en una instancia n8n. No se ejecutan desde aquí.

| Script | Descripción |
|---|---|
| `n8n-article-cleaner-service.js` | Webhook on-demand: recibe artículo "sucio" (title, html, url, imageUrl) y devuelve JSON limpio sin ads/scripts/marcas/copyright |
| `n8n-rss-cleaner-workflow.js` | Cron 30min: lee feeds RSS, extrae contenido completo, limpia, filtra por calidad → output JSON batch |
| `n8n-section-scraper-workflow.js` | Cron 30min: para sitios SIN RSS (ej: El Universal). Scrapea página de sección, sigue links, limpia y devuelve output estructurado |

## `legacy-css/` — Hojas de estilo históricas

CSS que se aplicó puntualmente a cada generación de CMS y se conserva
como referencia. **No** se incluye en builds activos.

| Script | Descripción |
|---|---|
| `improve_spacing.css` | Mejoras de spacing y bordes |
| `improvements-cms-nuevos.css` | Mejoras de article cards para cms-nuevos |
| `improvements-cms-nuevos2.css` | Mejoras de article cards para cms-nuevos2 |
| `improvements-cms-nuevos3.css` | Mejoras de article cards para cms-nuevos3 |
| `improvements-cms-originaux.css` | Mejoras de article cards para cms-originaux |

## Convenciones

- **Nomenclatura**: `fix-*` (corrección puntual), `update-*` (actualización masiva), `validate-*` (verificación), `sync-*` (sincronización entre generaciones), `create-*` (generación desde cero).
- **Rutas absolutas**: la mayoría asumen `/home/sebastianvernis/ProyectosActivos/cloudflare-news-project/...` (ruta histórica). Si tu repo vive en otra ruta, edita o exporta `BASE_DIR` antes de ejecutar.
- **Idempotencia**: los scripts de `fixes/` están pensados para correr una vez. Si los corres dos veces, pueden generar duplicados o errores benignos.
- **Bitácora**: si haces un fix nuevo, agrégalo a esta tabla y commitea README + script en el mismo PR.
