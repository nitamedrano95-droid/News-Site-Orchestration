// scripts/sites/lib/sql-builder.js
// Genera las sentencias SQL de INSERT/UPDATE a partir de los sitios validados.
// Es idempotente: usa INSERT OR IGNORE + ON CONFLICT para re-ejecución segura.

/**
 * Construye el SQL para INSERT OR IGNORE de un sitio en la tabla SITIOS.
 * Solo incluye los campos que la migración 004 agregó.
 */
export function buildInsertSitioSQL(site) {
  const s = site.data
  return {
    sql: `
      INSERT INTO SITIOS (
        SLUG, NOMBRE, TAGLINE, DOMINIO,
        COLOR_PRIMARIO, COLOR_SECUNDARIO,
        CATEGORIA_DEFAULT, IDIOMA, TIMEZONE, MONEDA,
        LOGO_URL, TEMPLATE,
        FACEBOOK_ACTIVO, FACEBOOK_PAGE_ID, FACEBOOK_PAGE_TOKEN,
        ACTIVO, NOTAS
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(SLUG) DO UPDATE SET
        NOMBRE               = excluded.NOMBRE,
        TAGLINE              = excluded.TAGLINE,
        DOMINIO              = excluded.DOMINIO,
        COLOR_PRIMARIO       = excluded.COLOR_PRIMARIO,
        COLOR_SECUNDARIO     = excluded.COLOR_SECUNDARIO,
        CATEGORIA_DEFAULT    = excluded.CATEGORIA_DEFAULT,
        IDIOMA               = excluded.IDIOMA,
        TIMEZONE             = excluded.TIMEZONE,
        MONEDA               = excluded.MONEDA,
        LOGO_URL             = excluded.LOGO_URL,
        TEMPLATE             = excluded.TEMPLATE,
        FACEBOOK_ACTIVO      = excluded.FACEBOOK_ACTIVO,
        FACEBOOK_PAGE_ID     = excluded.FACEBOOK_PAGE_ID,
        FACEBOOK_PAGE_TOKEN  = excluded.FACEBOOK_PAGE_TOKEN,
        ACTIVO               = excluded.ACTIVO,
        NOTAS                = excluded.NOTAS;
    `,
    bindings: [
      s.slug,
      s.nombre,
      s.tagline || null,
      s.dominio,
      s.tema?.color_primario || '#1e3a8a',
      s.tema?.color_secundario || '#f97316',
      s.categoria_default || 'NACIONAL',
      s.idioma || 'es-MX',
      s.timezone || 'America/Mexico_City',
      s.moneda || 'MXN',
      s.logo?.url || null,
      s.tema?.template || 'default',
      s.facebook?.activo ? 1 : 0,
      s.facebook?.page_id || null,
      s.facebook?.page_token_secret || null,
      s.activo ? 1 : 0,
      s.notas || null,
    ],
  }
}

/**
 * Construye el SQL para INSERT OR IGNORE en FB_TIMERS (entrada vacía).
 */
export function buildInsertFBTimerSQL(slug) {
  return {
    sql: `INSERT OR IGNORE INTO FB_TIMERS (SITE_SLUG) VALUES (?);`,
    bindings: [slug],
  }
}

/**
 * Construye el SQL para INSERT OR IGNORE en CATEGORIAS adicionales
 * que el sitio declara y no están en la lista default.
 * Por ahora solo verifica — el script podría expandir la tabla CATEGORIAS
 * automáticamente si se quisiera.
 */
export function buildCheckCategoriasSQL(site) {
  const cats = site.data.categorias_habilitadas || []
  if (cats.length === 0) return null
  // Placeholders: ?, ?, ?
  const placeholders = cats.map(() => '?').join(',')
  return {
    sql: `
      SELECT SLUG FROM CATEGORIAS WHERE SLUG IN (${placeholders});
    `,
    bindings: cats,
  }
}
