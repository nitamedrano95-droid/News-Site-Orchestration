// scripts/sites/lib/validate.js
// Validador de plantillas JSON de sitios.
// Aplicación estricta con defaults: si un campo falta, se completa con el
// default del schema; si el resultado es inválido, se reporta error.

import { readFileSync, readdirSync, existsSync } from 'node:fs'
import { join, basename } from 'node:path'

// Timezones IANA comunes (subset, ampliables según necesidad)
const COMMON_TIMEZONES = new Set([
  'America/Mexico_City',
  'America/Tijuana',
  'America/Cancun',
  'America/Merida',
  'America/Mazatlan',
  'America/Chihuahua',
  'America/Bogota',
  'America/Buenos_Aires',
  'America/New_York',
  'America/Los_Angeles',
  'UTC',
])

const HEX_RE = /^#[0-9a-fA-F]{6}$/
const LOCALE_RE = /^[a-z]{2}-[A-Z]{2}$/
const SLUG_RE = /^[a-z0-9][a-z0-9-]{1,62}$/

/**
 * Carga el schema default desde _schema.json
 */
export function loadSchema(schemaPath) {
  if (!existsSync(schemaPath)) {
    throw new Error(`Schema no encontrado: ${schemaPath}`)
  }
  return JSON.parse(readFileSync(schemaPath, 'utf8'))
}

/**
 * Carga todos los JSONs de sitios en un directorio
 * (excluye los que empiezan con _)
 */
export function loadSites(sitesDir) {
  const files = readdirSync(sitesDir)
    .filter((f) => f.endsWith('.json') && !f.startsWith('_'))
    .sort()
  return files.map((f) => ({
    filename: f,
    slug: basename(f, '.json'),
    data: JSON.parse(readFileSync(join(sitesDir, f), 'utf8')),
  }))
}

/**
 * Aplica los defaults del schema a un sitio.
 * Devuelve { data, missing } donde `missing` son los campos obligatorios
 * que NO estaban en el JSON original.
 */
export function applyDefaults(siteData, schema) {
  const merged = JSON.parse(JSON.stringify(schema))
  const missing = []

  for (const key of Object.keys(merged)) {
    if (key === '$schema') continue
    if (siteData[key] !== undefined) {
      merged[key] = siteData[key]
    } else {
      missing.push(key)
    }
  }

  // Sobreescribir con cualquier campo extra que el sitio tenga
  for (const key of Object.keys(siteData)) {
    if (!(key in merged)) merged[key] = siteData[key]
  }

  return { data: merged, missing }
}

/**
 * Valida un sitio (con defaults ya aplicados).
 * Devuelve array de errores. Si está vacío, el sitio es válido.
 */
export function validate(site, schema) {
  const errors = []
  const warnings = []
  const d = site.data

  // 1. slug válido
  if (!SLUG_RE.test(d.slug)) {
    errors.push(`slug inválido: "${d.slug}". Solo minúsculas, números y guiones (3-63 chars).`)
  }
  if (d.slug !== site.slug) {
    errors.push(`slug inconsistente: el archivo se llama "${site.slug}.json" pero el slug interno es "${d.slug}".`)
  }

  // 2. nombre no vacío
  if (!d.nombre || d.nombre.trim() === '') {
    errors.push('nombre es obligatorio.')
  }

  // 3. dominio no vacío y bien formado
  if (!d.dominio || d.dominio.trim() === '') {
    errors.push('dominio es obligatorio.')
  } else if (!/^https?:\/\//.test(d.dominio)) {
    errors.push(`dominio debe empezar con http:// o https://. Recibido: "${d.dominio}".`)
  }

  // 4. idioma formato locale
  if (!LOCALE_RE.test(d.idioma)) {
    errors.push(`idioma debe tener formato "xx-XX" (ej: "es-MX"). Recibido: "${d.idioma}".`)
  }

  // 5. timezone IANA
  if (!COMMON_TIMEZONES.has(d.timezone)) {
    warnings.push(`timezone "${d.timezone}" no está en la lista de IANA comunes. Verificá que sea válido.`)
  }

  // 6. facebook coherente
  if (d.facebook && d.facebook.activo) {
    if (!d.facebook.page_id) {
      errors.push('facebook.activo=true requiere facebook.page_id.')
    }
    if (!d.facebook.page_token_secret) {
      errors.push('facebook.activo=true requiere facebook.page_token_secret.')
    }
  }

  // 7. colores hex
  if (d.tema) {
    if (!HEX_RE.test(d.tema.color_primario)) {
      errors.push(`tema.color_primario no es hex válido: "${d.tema.color_primario}".`)
    }
    if (!HEX_RE.test(d.tema.color_secundario)) {
      errors.push(`tema.color_secundario no es hex válido: "${d.tema.color_secundario}".`)
    }
  }

  // 8. logo coherente
  if (d.logo) {
    if (d.logo.url && d.logo.url.trim() !== '' && !/^https?:\/\//.test(d.logo.url)) {
      warnings.push(`logo.url no es una URL absoluta: "${d.logo.url}".`)
    }
  }

  return { errors, warnings }
}

/**
 * Punto de entrada: valida todos los sitios y devuelve un resumen
 */
export function validateAll(sitesDir) {
  const schemaPath = join(sitesDir, '_schema.json')
  const schema = loadSchema(schemaPath)
  const sites = loadSites(sitesDir)

  const results = sites.map((site) => {
    const { data, missing } = applyDefaults(site.data, schema)
    const { errors, warnings } = validate({ ...site, data }, schema)
    return { site, data, errors, warnings, missing }
  })

  const totalErrors = results.reduce((acc, r) => acc + r.errors.length, 0)
  const totalWarnings = results.reduce((acc, r) => acc + r.warnings.length, 0)

  return { results, totalErrors, totalWarnings, sites: results.length }
}
