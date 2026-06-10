#!/usr/bin/env node
// scripts/sites/validate-template.js
// Valida todos los JSONs de data/sites/cms-nuevos4/.
// Sale con código 0 si todo OK, código 1 si hay errores.

import { fileURLToPath } from 'node:url'
import { dirname, join, resolve } from 'node:path'
import { validateAll } from './lib/validate.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname  = dirname(__filename)
const SITES_DIR  = resolve(__dirname, '../../data/sites/cms-nuevos4')

const { results, totalErrors, totalWarnings, sites } = validateAll(SITES_DIR)

console.log('')
console.log('═══════════════════════════════════════════════════════')
console.log('  Validación de plantillas de sitios — cms-nuevos4')
console.log('═══════════════════════════════════════════════════════')
console.log('')
console.log(`  Sitios encontrados:   ${sites}`)
console.log(`  Errores encontrados:  ${totalErrors}`)
console.log(`  Advertencias:         ${totalWarnings}`)
console.log('')

for (const r of results) {
  const icon = r.errors.length === 0 ? '✓' : '✗'
  console.log(`  ${icon} ${r.site.slug.padEnd(28)} ${r.data.nombre}`)
  for (const e of r.errors) {
    console.log(`      ERROR: ${e}`)
  }
  for (const w of r.warnings) {
    console.log(`      WARN:  ${w}`)
  }
  if (r.missing.length > 0) {
    console.log(`      INFO:  Aplicados ${r.missing.length} defaults del schema`)
  }
}

console.log('')
if (totalErrors > 0) {
  console.log('  ✗ FALLÓ — corregí los errores y volvé a correr')
  process.exit(1)
} else {
  console.log('  ✓ OK — todas las plantillas son válidas')
  process.exit(0)
}
