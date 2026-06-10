// scripts/sites/lib/config-writer.js
// Regenera el archivo src/config.js del CMS desde la lista de sitios
// validados. Conserva todas las constantes que no son del template
// (LOG_PREFIXES, ALLOWED_ORIGINS_base, SESSION_TTL, etc.) y solo
// sobreescribe SITIOS_LIST, SITE_DOMAIN_MAP, SITES_CONFIG.
//
// Estrategia: lee el archivo actual, reemplaza solo los 3 bloques
// regenerados, escribe de vuelta. Idempotente.

import { readFileSync, writeFileSync, existsSync } from 'node:fs'

/**
 * Detecta los marcadores de bloque en el config.js actual.
 * Si no los encuentra, los agrega al final.
 */
function detectBlocks(content) {
  const markers = {
    listStart: '// SITIOS_LIST — GENERADO POR scripts/sites/seed-cms-nuevos4.js — INICIO',
    listEnd:   '// SITIOS_LIST — FIN',
    mapStart:  '// SITE_DOMAIN_MAP — GENERADO — INICIO',
    mapEnd:    '// SITE_DOMAIN_MAP — FIN',
    cfgStart:  '// SITES_CONFIG — GENERADO — INICIO',
    cfgEnd:    '// SITES_CONFIG — FIN',
    origStart: '// ORIGIN_ALLOWED — GENERADO — INICIO',
    origEnd:   '// ORIGIN_ALLOWED — FIN',
  }
  return markers
}

/**
 * Regenera los 3 bloques de config.js con los sitios validados.
 * Devuelve el string completo del nuevo config.js.
 *
 * Si los marcadores existen, reemplaza el bloque.
 * Si no existen, los agrega al final (antes del export default).
 */
export function regenerateConfig(configPath, sites) {
  if (!existsSync(configPath)) {
    throw new Error(`config.js no encontrado en ${configPath}`)
  }
  const original = readFileSync(configPath, 'utf8')
  const m = detectBlocks(original)
  const activeSites = sites.filter((s) => s.data.activo)

  // Construir los 4 bloques
  const listBlock = buildListBlock(activeSites, m)
  const mapBlock  = buildMapBlock(activeSites, m)
  const cfgBlock  = buildConfigBlock(activeSites, m)
  const origBlock = buildOriginBlock(activeSites, m)

  let result = original

  // Reemplazar/agregar cada bloque
  result = replaceOrAppend(result, m.listStart, m.listEnd, listBlock)
  result = replaceOrAppend(result, m.mapStart,  m.mapEnd,  mapBlock)
  result = replaceOrAppend(result, m.cfgStart,  m.cfgEnd,  cfgBlock)
  result = replaceOrAppend(result, m.origStart, m.origEnd, origBlock)

  return result
}

function buildListBlock(sites, m) {
  const slugs = sites.map((s) => s.data.slug).sort()
  return [
    m.listStart,
    `// Regenerado: ${new Date().toISOString()}`,
    `// Total sitios: ${slugs.length}`,
    'export const SITIOS_LIST = [',
    ...slugs.map((s) => `  '${s}',`),
    '];',
    m.listEnd,
  ].join('\n')
}

function buildMapBlock(sites, m) {
  const entries = sites
    .map((s) => `  ${s.data.slug}: ${JSON.stringify(s.data.dominio)},`)
    .sort()
  return [
    m.mapStart,
    `// Regenerado: ${new Date().toISOString()}`,
    'export const SITE_DOMAIN_MAP = {',
    ...entries,
    '};',
    m.mapEnd,
  ].join('\n')
}

function buildConfigBlock(sites, m) {
  const entries = sites
    .map((s) => {
      const d = s.data
      return `  ${d.slug}: { nombre: ${JSON.stringify(d.nombre)}, tagline: ${JSON.stringify(d.tagline || '')}, dominio: ${JSON.stringify(d.dominio)} },`
    })
    .sort()
  return [
    m.cfgStart,
    `// Regenerado: ${new Date().toISOString()}`,
    'export const SITES_CONFIG = {',
    ...entries,
    '};',
    m.cfgEnd,
  ].join('\n')
}

function buildOriginBlock(sites, m) {
  const urls = sites
    .map((s) => s.data.dominio.replace(/\/$/, ''))  // sin trailing slash
    .flatMap((u) => [u, `https://www.${u.replace(/^https?:\/\/(www\.)?/, '')}`])
  const domains = [...new Set(urls)].sort()
  return [
    m.origStart,
    `// Regenerado: ${new Date().toISOString()}`,
    `// ${domains.length} dominios únicos`,
    '// NOTA: este bloque se agrega al final de ALLOWED_ORIGINS existente.',
    '// Dominios de los sitios:',
    ...domains.map((d) => `//   - ${d}`),
    m.origEnd,
  ].join('\n')
}

/**
 * Si el bloque existe entre startMarker y endMarker, lo reemplaza.
 * Si no, lo agrega antes del `export default` final.
 */
function replaceOrAppend(content, startMarker, endMarker, newBlock) {
  const startIdx = content.indexOf(startMarker)
  const endIdx   = content.indexOf(endMarker)

  if (startIdx >= 0 && endIdx > startIdx) {
    // Reemplazar bloque existente
    const before = content.slice(0, startIdx)
    const after  = content.slice(endIdx + endMarker.length)
    return before + newBlock + after
  }

  // Bloque no existe: insertar antes del último `export default` o al final
  const exportDefaultIdx = content.lastIndexOf('export default')
  if (exportDefaultIdx >= 0) {
    return (
      content.slice(0, exportDefaultIdx) +
      '\n' + newBlock + '\n\n' +
      content.slice(exportDefaultIdx)
    )
  }
  return content + '\n\n' + newBlock
}

/**
 * Escribe el config.js regenerado.
 * Si `dryRun` es true, NO escribe, solo retorna el contenido.
 */
export function writeConfig(configPath, newContent, { dryRun = false } = {}) {
  if (dryRun) {
    return { written: false, content: newContent }
  }
  writeFileSync(configPath, newContent, 'utf8')
  return { written: true, content: newContent }
}
