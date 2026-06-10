# Esquema de plantilla de sitio — cms-nuevos4

> Documentación de cada campo de `data/sites/cms-nuevos4/<slug>.json`.
> Para ver los defaults, consultá `_schema.json` (es la plantilla vacía).

## Campos obligatorios

| Campo | Tipo | Descripción |
|---|---|---|
| `slug` | string | Identificador único del sitio. Minúsculas, sin espacios, sin acentos. Ej: `frenteinformativo`. Se usa como PK en la tabla `SITIOS`. |
| `nombre` | string | Nombre para mostrar del sitio. Ej: `Frente Informativo`. |
| `dominio` | string (URL) | URL principal del sitio. Ej: `https://www.frenteinformativo.com`. |

## Campos opcionales (con defaults del schema)

| Campo | Default | Descripción |
|---|---|---|
| `tagline` | `""` | Eslogan corto. Ej: `"La verdad sin filtros"`. |
| `dominios_alternativos` | `[]` | Lista de URLs adicionales que apuntan al mismo sitio (aliases). |
| `categoria_default` | `"NACIONAL"` | Categoría asignada si el artículo no tiene una. Debe existir en la tabla `CATEGORIAS`. |
| `categorias_habilitadas` | las 9 default | Lista de slugs de categorías que el sitio puede usar. Las que no estén acá no aparecen en el selector del editor. |
| `idioma` | `"es-MX"` | Locale del sitio. Usado para fechas, números y stopwords del SEO panel. |
| `timezone` | `"America/Mexico_City"` | Zona horaria IANA. Usada para ventana de publicación de Facebook y para ordenar artículos. |
| `moneda` | `"MXN"` | Moneda del sitio. Solo metadato, no se usa actualmente. |
| `logo.url` | `null` | URL completa del logo. Si está vacía, el script esperará un archivo subido a R2 (ver `logo.path_esperado`). |
| `logo.path_esperado` | `""` | Path dentro de R2 donde el logo debería estar. Si `logo.url` es `null`, el script NO falla, solo registra un warning. |
| `tema.color_primario` | `"#1e3a8a"` | Color primario del sitio (hex). Usado en OG tags, header, etc. |
| `tema.color_secundario` | `"#f97316"` | Color secundario (acentos). |
| `tema.template` | `"default"` | Variante de plantilla. Por ahora solo `"default"`. Reservado para futuro. |
| `facebook.activo` | `false` | Si el sitio publica automáticamente a Facebook. |
| `facebook.page_id` | `null` | ID de la página de Facebook. Requerido si `facebook.activo` es `true`. |
| `facebook.page_token_secret` | `null` | Nombre del secret en `wrangler secret put`. Requerido si `facebook.activo` es `true`. |
| `fuentes_rss_habilitadas` | 6 default | Lista de fuentes RSS que el sitio consume. **Deprecated para cms-nuevos4**: el flujo de fuentes se maneja desde n8n. Mantenido solo por compatibilidad. |
| `activo` | `true` | Si el sitio está activo. Los inactivos no aparecen en el selector. |
| `notas` | `""` | Texto libre para documentar el sitio (auditoría, historia, contacto). |

## Reglas de validación

El script `validate-template.js` aplica las siguientes reglas:

1. `slug` debe tener solo minúsculas, números y guiones.
2. `slug` debe coincidir con el nombre del archivo JSON.
3. `nombre` y `dominio` no pueden estar vacíos.
4. `dominio` debe empezar con `http://` o `https://`.
5. `idioma` debe ser un locale válido (formato `xx-XX`).
6. `timezone` debe estar en la base de datos IANA.
7. Si `facebook.activo` es `true`, `page_id` y `page_token_secret` son obligatorios.
8. `color_primario` y `color_secundario` deben ser hex válido.
9. Los slugs en `categorias_habilitadas` deben existir en la tabla `CATEGORIAS` (warning, no error, si la DB aún no tiene las categorías).

## Cómo agregar un sitio nuevo

1. Copiá `_schema.json` a `<nuevo-slug>.json`.
2. Completá `slug`, `nombre`, `dominio` (mínimo).
3. Ajustá colores y categorías si querés.
4. Corré `node scripts/sites/validate-template.js` (debe pasar sin errores).
5. Corré `node scripts/sites/seed-cms-nuevos4.js --dry-run` (debe mostrar lo que va a hacer).
6. Corré `node scripts/sites/seed-cms-nuevos4.js` (aplica los cambios a la DB local).
7. Repetir con `--remote` para producción cuando estés listo.
