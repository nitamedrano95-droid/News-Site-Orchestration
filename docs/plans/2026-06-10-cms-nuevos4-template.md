# Plan: cms-nuevos4 — Plantilla de sitios + purga de deprecated + consolidación de tablas

**Fecha:** 2026-06-10
**Estado:** Pendiente aprobación usuario
**Alcance:** Solo `cms-nuevos4`. Si funciona, replicamos a los otros 4 CMSs.

## Resumen ejecutivo

1. **Plantilla JSON por sitio** en `data/sites/cms-nuevos4/<slug>.json`
2. **Script generador** que popula la DB y regenera `config.js` desde la plantilla
3. **Migración SQL** que consolida las 25 tablas `ARTICULOS_SITIO_<SLUG>` en 1 sola tabla `ARTICULOS_SITIO` con columna `SITIO_SLUG`
4. **Parche de 30 archivos** para usar la tabla consolidada
5. **Purgar endpoints rotos** (LEGALES, CANALES_EXTERNOS, MENUS_NAVEGACION — las tablas no existen)
6. **Marcar deprecated** el flujo de FUENTES (n8n ya lo reemplazó)

## Auditoría de código deprecated (jun 2026)

### Mantener tal cual (todavía se usan)
- Tabla `FB_TIMERS` — la usa `routes/cron.js:93` para el cron de Facebook
- Tabla `FUENTES` — la usa `cron/rss-ingest.js` (7 ocurrencias) pero ya tiene fallback a hardcoded feeds, así que es opcional
- Tabla `DISTRIBUCION_ARTICULOS` — la usa el flujo de distribución
- `SITIO_DESTINO` / `SITIOS_DESTINO` — campos activos en distribución de artículos

### Reemplazar (deprecated)
- **30 archivos** usan `ARTICULOS_SITIO_${slug.toUpperCase()}` (cms.js, articles.js, facebook.js, revision.js, sites.js, stats.js, cron.js, utils/html.js, cron/facebook.js, cron/rss-ingest.js)
- Razón: la lógica de 1 tabla por sitio no escala, las queries se vuelven O(N) tablas

### Purgar (código roto)
- `routes/sites.js` líneas 49-85: 3 endpoints (`/legals/:id`, `/channels/:id`, `/menus/:id`) que referencian tablas **que no existen en la migration 001**
- Razón: nunca se implementaron, dejar de exponer endpoints rotos

### Marcar deprecated
- `cron/rss-ingest.js` (700-1140): lógica de selección de fuentes por sitio. **n8n lo maneja ahora**. Mantener el código pero marcar como legacy.

## Diseño de la plantilla JSON

```json
{
  "slug": "frenteinformativo",
  "nombre": "Frente Informativo",
  "tagline": "La verdad sin filtros",
  "dominio": "https://www.frenteinformativo.com",
  "dominios_alternativos": [],
  
  "categoria_default": "NACIONAL",
  "categorias_habilitadas": [
    "nacional", "politica", "economia", "seguridad", "mundo",
    "cultura", "tecnologia", "deportes", "entretenimiento"
  ],
  
  "idioma": "es-MX",
  "timezone": "America/Mexico_City",
  "moneda": "MXN",
  
  "logo": {
    "url": null,
    "path_esperado": "logos/frenteinformativo.png"
  },
  
  "tema": {
    "color_primario": "#1e3a8a",
    "color_secundario": "#f97316",
    "template": "default"
  },
  
  "facebook": {
    "activo": false,
    "page_id": null,
    "page_token_secret": null
  },
  
  "fuentes_rss_habilitadas": [
    "infobae", "proceso", "jornada", "reforma", "aristegui", "dw"
  ],
  
  "activo": true,
  "notas": "Sitio de prueba piloto, reemplazó a bitacorainformativa en jun 2026"
}
```

## Estructura de archivos

```
News-Site-Orchestration/
├── data/
│   └── sites/
│       └── cms-nuevos4/
│           ├── _schema.json          (plantilla vacía con todos los campos default)
│           ├── _schema.md            (documentación de cada campo)
│           ├── frenteinformativo.json
│           ├── cronicanacionalmx.json
│           └── ... (25 archivos)
│
├── scripts/
│   └── sites/
│       ├── README.md                 (cómo usar)
│       ├── seed-cms-nuevos4.js       (lee JSONs, popula DB + regenera config.js)
│       ├── validate-template.js      (valida JSONs contra _schema.json)
│       └── lib/
│           ├── validate.js
│           ├── sql-builder.js
│           └── config-writer.js
│
├── cms-nuevos4/
│   ├── migrations/
│   │   ├── 001_init_nuevos4.sql
│   │   ├── 002_seo_fields.sql
│   │   ├── 003_seed_rodrigo.sql
│   │   └── 004_consolidate_sitios.sql    (NUEVO)
│   └── src/
│       └── config.js                 (regenerado por el script)
```

## Migración SQL 004

```sql
-- 004_consolidate_sitios.sql
-- Agrega columnas temáticas a SITIOS + consolida 25 tablas en 1

-- 1) Ampliar SITIOS con campos del tema
ALTER TABLE SITIOS ADD COLUMN COLOR_PRIMARIO TEXT DEFAULT '#1e3a8a';
ALTER TABLE SITIOS ADD COLUMN COLOR_SECUNDARIO TEXT DEFAULT '#f97316';
ALTER TABLE SITIOS ADD COLUMN CATEGORIA_DEFAULT TEXT DEFAULT 'NACIONAL';
ALTER TABLE SITIOS ADD COLUMN IDIOMA TEXT DEFAULT 'es-MX';
ALTER TABLE SITIOS ADD COLUMN TIMEZONE TEXT DEFAULT 'America/Mexico_City';
ALTER TABLE SITIOS ADD COLUMN LOGO_URL TEXT;
ALTER TABLE SITIOS ADD COLUMN TEMPLATE TEXT DEFAULT 'default';
ALTER TABLE SITIOS ADD COLUMN ACTIVO INTEGER DEFAULT 1;
ALTER TABLE SITIOS ADD COLUMN NOTAS TEXT;

-- 2) Crear tabla consolidada
CREATE TABLE IF NOT EXISTS ARTICULOS_SITIO (
  ID TEXT PRIMARY KEY,
  SITIO_SLUG TEXT NOT NULL,
  ID_PARAFRASEADO TEXT NOT NULL,
  FECHA_ASIGNACION TEXT DEFAULT CURRENT_TIMESTAMP,
  FB_PUBLICADO INTEGER DEFAULT 0,
  FB_FECHA TEXT,
  FB_POST_ID TEXT,
  FOREIGN KEY (SITIO_SLUG) REFERENCES SITIOS(SLUG),
  FOREIGN KEY (ID_PARAFRASEADO) REFERENCES ARTICULOS_PARAFRASEADOS(ID)
);

CREATE INDEX IF NOT EXISTS idx_articulos_sitio_slug ON ARTICULOS_SITIO(SITIO_SLUG);
CREATE INDEX IF NOT EXISTS idx_articulos_sitio_parafraseado ON ARTICULOS_SITIO(ID_PARAFRASEADO);
CREATE INDEX IF NOT EXISTS idx_articulos_sitio_fb ON ARTICULOS_SITIO(FB_PUBLICADO);

-- 3) Migrar datos de las 25 tablas viejas a la nueva
INSERT OR IGNORE INTO ARTICULOS_SITIO
  (ID, SITIO_SLUG, ID_PARAFRASEADO, FECHA_ASIGNACION, FB_PUBLICADO, FB_FECHA, FB_POST_ID)
SELECT
  ID, '<SITIO>', ID_PARAFRASEADO, FECHA_ASIGNACION, FB_PUBLICADO, FB_FECHA, FB_POST_ID
FROM ARTICULOS_SITIO_<SITIO>;

-- Repetir para cada uno de los 25 sitios
```

> **Nota de seguridad:** la migración NO dropea las 25 tablas viejas. Quedan
> como respaldo por 30 días. Si todo funciona, una migración posterior
> (`005_drop_legacy_tables.sql`) las elimina.

## Parches a aplicar (30 archivos)

Patrón universal:
```js
// ANTES
const tableName = `ARTICULOS_SITIO_${siteSlug.toUpperCase()}`;
await c.env.DB.prepare(`SELECT ... FROM ${tableName} WHERE ...`).run();

// DESPUÉS
await c.env.DB.prepare(
  `SELECT ... FROM ARTICULOS_SITIO WHERE SITIO_SLUG = ?`
).bind(siteSlug).run();
```

Cambio mecánico, sin lógica nueva.

## Purgar endpoints rotos

`cms-nuevos4/src/routes/sites.js`:
- Eliminar endpoint `GET /legals/:id` (línea 49-59)
- Eliminar endpoint `GET /channels/:id` (línea 61-72)
- Eliminar endpoint `GET /menus/:id` (línea 74-85)
- Razón: las tablas no existen, los endpoints devuelven 500

## Orden de commits (3 commits, cada uno verificable)

### Commit 1: Migración + script generador
- `cms-nuevos4/migrations/004_consolidate_sitios.sql` (nueva)
- `data/sites/cms-nuevos4/_schema.json` (nueva)
- `data/sites/cms-nuevos4/_schema.md` (nueva)
- `data/sites/cms-nuevos4/*.json` (25 archivos, uno por sitio)
- `scripts/sites/seed-cms-nuevos4.js` (nueva)
- `scripts/sites/validate-template.js` (nueva)
- `scripts/sites/lib/*.js` (nuevas)
- `scripts/sites/README.md` (nueva)

**Verificación:** correr `node scripts/sites/validate-template.js` (debe pasar sin errores).

### Commit 2: Tabla consolidada + 30 parches
- Modifica los 30 archivos que usan `ARTICULOS_SITIO_<SLUG>` → `ARTICULOS_SITIO WHERE SITIO_SLUG = ?`
- **NO deployable** hasta que la migración se corra

**Verificación:** grep no debe encontrar más `ARTICULOS_SITIO_\${` en el código.

### Commit 3: Purgar endpoints rotos + marcar deprecated
- `routes/sites.js`: eliminar 3 endpoints rotos
- `cron/rss-ingest.js`: marcar sección de FUENTES como deprecated con banner

**Verificación:** `grep "LEGALES\|CANALES_EXTERNOS\|MENUS_NAVEGACION"` no debe encontrar referencias activas.

## Despliegue (post-aprobación del usuario)

1. Commit 1 → usuario revisa
2. Usuario corre: `wrangler d1 execute news_db_cms_nuevos4 --remote --file migrations/004_consolidate_sitios.sql`
3. Commit 2 → usuario revisa + deploy manual
4. Commit 3 → usuario revisa + deploy manual
5. Smoke test: crear artículo, verificar que aparece en ARTICULOS_SITIO con SITIO_SLUG correcto

## Riesgos identificados

| Riesgo | Mitigación |
|---|---|
| La migración deja datos huérfanos si FK falla | La nueva tabla usa INSERT OR IGNORE, no falla |
| Los 30 parches rompen queries existentes | Smoke test end-to-end antes de cerrar la Fase 0 |
| El script generador sobreescribe cambios manuales a `config.js` | El script solo agrega, no remueve. Los cambios manuales se preservan si se commitean antes |
| Las 25 tablas viejas quedan y crecen | Se dropean en migración 005 (después del periodo de gracia) |

## Próximos pasos (después de Fase 0)

1. Replicar a los 4 CMSs restantes (cms-originaux, cms-nuevos, cms-nuevos2, cms-nuevos3)
2. Adaptar la plantilla para que el editor TipTap consuma los colores del sitio
3. Generar sitios en Pages desde la misma plantilla (1 proyecto Pages multi-sitio)
4. Script de validación continua en CI: `node scripts/sites/validate-template.js` como pre-commit hook

## Decisiones por defecto (esperando feedback del usuario)

1. **Validación de plantilla:** estricta con defaults
2. **Logo:** solo declarado en JSON, upload manual
3. **Categorías habilitadas:** declaradas en JSON, sin filtrar endpoint todavía
4. **Migración 005 (drop tablas viejas):** se hace después de 30 días de gracia
