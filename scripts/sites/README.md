# scripts/sites/ — Gestión de plantillas de sitios

Genera y mantiene los sitios de un CMS desde plantillas JSON declarativas.

## Estructura

```
scripts/sites/
├── validate-template.js     # Valida todos los JSONs contra el schema
├── seed-cms-nuevos4.js      # Aplica las plantillas a la DB + regenera config.js
├── lib/
│   ├── validate.js          # Validador puro (sin I/O)
│   ├── sql-builder.js       # Genera SQL idempotente desde sitios validados
│   └── config-writer.js     # Regenera src/config.js del Worker
└── README.md                # Este archivo

data/sites/cms-nuevos4/
├── _schema.json             # Plantilla con todos los defaults
├── _schema.md               # Documentación de cada campo
├── cronicanacionalmx.json   # Un JSON por sitio
├── reportedevanguardia.json
└── ... (25 sitios)
```

## Uso

### 1. Validar las plantillas (sin tocar nada)

```bash
node scripts/sites/validate-template.js
```

Salida esperada:
```
═══════════════════════════════════════════════════════
  Validación de plantillas de sitios — cms-nuevos4
═══════════════════════════════════════════════════════

  Sitios encontrados:   25
  Errores encontrados:  0
  Advertencias:         0
  ...
  ✓ OK — todas las plantillas son válidas
```

### 2. Ver el plan de cambios sin aplicar

```bash
node scripts/sites/seed-cms-nuevos4.js --dry-run
```

### 3. Aplicar a la DB local (--local) y regenerar config.js

```bash
node scripts/sites/seed-cms-nuevos4.js
```

Esto:
- Valida los 25 JSONs
- Genera un archivo SQL temporal en `/tmp/seed-cms-nuevos4.sql`
- Lo ejecuta contra la DB local (`wrangler d1 execute news_db_cms_nuevos4 --local --file ...`)
- Regenera `cms-nuevos4/src/config.js` con SITIOS_LIST, SITE_DOMAIN_MAP, SITES_CONFIG

### 4. Aplicar a la DB de producción (--remote)

```bash
node scripts/sites/seed-cms-nuevos4.js --remote
```

**⚠️ Antes de correr esto:**
1. Haber corrido la migración `004_consolidate_sitios.sql` en producción
2. Haber commiteado los JSONs validados
3. Haber hecho backup con `wrangler d1 export news_db_cms_nuevos4`

### 5. Flags útiles

| Flag | Efecto |
|---|---|
| `--dry-run` | Solo muestra el plan, no aplica nada |
| `--remote` | Aplica a producción (default: local) |
| `--no-db` | Solo regenera config.js, no toca la DB |
| `--no-config` | Solo aplica SQL, no regenera config.js |

## Agregar un sitio nuevo

1. Copiá `_schema.json` a `<slug>.json` (completá `slug`, `nombre`, `dominio`).
2. Corré `node scripts/sites/validate-template.js` (debe pasar).
3. Corré `node scripts/sites/seed-cms-nuevos4.js --dry-run` (revisá el plan).
4. Corré `node scripts/sites/seed-cms-nuevos4.js` (local).
5. Verificá que el sitio aparece en la DB:
   ```bash
   wrangler d1 execute news_db_cms_nuevos4 --local --command "SELECT * FROM SITIOS WHERE SLUG = 'mi-sitio'"
   ```
6. Si todo OK, corré `node scripts/sites/seed-cms-nuevos4.js --remote`.

## Idempotencia

Todos los INSERT usan `ON CONFLICT(SLUG) DO UPDATE` o `INSERT OR IGNORE`.
Correr el script múltiples veces no duplica datos.

## Replicar a otros CMSs

Cuando termines con cms-nuevos4, replicá la estructura a los otros 4:

```bash
# 1. Copiá la estructura
cp -r data/sites/cms-nuevos4/ data/sites/cms-originaux/
cp -r data/sites/cms-nuevos4/ data/sites/cms-nuevos/
cp -r data/sites/cms-nuevos4/ data/sites/cms-nuevos2/
cp -r data/sites/cms-nuevos4/ data/sites/cms-nuevos3/

# 2. Ajustá los slugs/nombres en cada uno

# 3. Replicá el script
cp scripts/sites/seed-cms-nuevos4.js scripts/sites/seed-cms-originaux.js
# editá DB_NAME y CONFIG_PATH
```

## Cambios incompatibles con idempotencia

Si modificás `_schema.json` agregando un campo obligatorio nuevo, los JSONs
existentes van a tener `missing` para ese campo → el script los completa con
el default y los aplica. Si el default no es aceptable, editá el JSON
después de aplicar el default.

## Logs y auditoría

El script no genera log de auditoría. Si necesitás trazabilidad, ejecutá
manualmente antes y después:

```bash
wrangler d1 execute news_db_cms_nuevos4 --remote \
  --command "SELECT slug, nombre, dominio, activo, updated_at FROM SITIOS ORDER BY slug"
```
