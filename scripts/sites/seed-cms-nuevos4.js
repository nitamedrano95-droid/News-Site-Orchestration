#!/usr/bin/env node
// scripts/sites/seed-cms-nuevos4.js
// Aplica las plantillas JSON a la DB del CMS cms-nuevos4 y regenera
// src/config.js. Modo --dry-run muestra lo que haría sin aplicar.
//
// Uso:
//   node scripts/sites/seed-cms-nuevos4.js                 # local (--local)
//   node scripts/sites/seed-cms-nuevos4.js --remote        # producción
//   node scripts/sites/seed-cms-nuevos4.js --dry-run       # solo mostrar
//   node scripts/sites/seed-cms-nuevos4.js --no-config     # solo DB
//   node scripts/sites/seed-cms-nuevos4.js --no-db         # solo config.js

import { execSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import { writeFileSync } from 'node:fs'

const __filename = fileURLToPath(import.meta.url)
const __dirname  = dirname(__filename)

import { validateAll } from './lib/validate.js'
import {
  buildInsertSitioSQL,
  buildInsertFBTimerSQL,
  buildCheckCategoriasSQL,
} from './lib/sql-builder.js'
import { regenerateConfig, writeConfig } from './lib/config-writer.js'

// ── Args ───────────────────────────────────────────────────────────
const args = process.argv.slice(2)
const opts = {
  remote:  args.includes('--remote'),
  dryRun:  args.includes('--dry-run'),
  noDb:    args.includes('--no-db'),
  noConfig:args.includes('--no-config'),
}

// ── Paths ──────────────────────────────────────────────────────────
const SITES_DIR    = resolve(__dirname, '../../data/sites/cms-nuevos4')
const CONFIG_PATH  = resolve(__dirname, '../../cms-nuevos4/src/config.js')
const DB_NAME      = 'news_db_cms_nuevos4'

// ── Validate ───────────────────────────────────────────────────────
console.log('')
console.log('═══════════════════════════════════════════════════════')
console.log('  Seed de sitios — cms-nuevos4')
console.log('═══════════════════════════════════════════════════════')
console.log('')

const { results, totalErrors, totalWarnings, sites } = validateAll(SITES_DIR)
console.log(`  Plantillas encontradas:  ${sites}`)
console.log(`  Errores:                 ${totalErrors}`)
console.log(`  Advertencias:            ${totalWarnings}`)
console.log('')

if (totalErrors > 0) {
  console.log('  ✗ FALLÓ — corregí los errores y volvé a correr:')
  for (const r of results) {
    for (const e of r.errors) {
      console.log(`      [${r.site.slug}] ${e}`)
    }
  }
  process.exit(1)
}

// ── Plan ───────────────────────────────────────────────────────────
const plan = []
for (const r of results) {
  const d = r.data
  if (!d.activo) {
    plan.push(`  ⊘ ${d.slug} (inactivo, no se aplica)`)
    continue
  }
  if (!opts.noDb) {
    const sit = buildInsertSitioSQL(r)
    const fb  = buildInsertFBTimerSQL(d.slug)
    const cat = buildCheckCategoriasSQL(r)
    plan.push(`  + SITIOS: ${d.slug}`)
    plan.push(`  + FB_TIMERS: ${d.slug}`)
    if (cat) plan.push(`  ~ CHECK CATEGORIAS: ${cat.bindings.length} categorías`)
  }
  if (!opts.noConfig) {
    plan.push(`  ~ config.js: ${d.slug}`)
  }
}

console.log('  Plan:')
console.log(plan.join('\n'))
console.log('')

if (opts.dryRun) {
  console.log('  ⊘ --dry-run activo, no se aplicaron cambios')
  process.exit(0)
}

// ── Apply via wrangler ─────────────────────────────────────────────
const env = opts.remote ? '--remote' : '--local'
const target = opts.remote ? 'PRODUCCIÓN' : 'LOCAL'

if (!opts.noDb) {
  console.log(`  Aplicando SQL a DB ${target} (${env})...`)
  // Concatenar todos los INSERT en un solo archivo
  const sqlLines = ['BEGIN TRANSACTION;']
  for (const r of results) {
    if (!r.data.activo) continue
    const sit = buildInsertSitioSQL(r)
    const fb  = buildInsertFBTimerSQL(r.data.slug)
    sqlLines.push(sit.sql.replace(/;\s*$/, ';'))
    sqlLines.push(fb.sql.replace(/;\s*$/, ';'))
  }
  sqlLines.push('COMMIT;')
  const sqlPath = '/tmp/seed-cms-nuevos4.sql'
  writeFileSync(sqlPath, sqlLines.join('\n\n'), 'utf8')

  const cmd = `wrangler d1 execute ${DB_NAME} ${env} --file ${sqlPath}`
  console.log(`  $ ${cmd}`)
  try {
    execSync(cmd, { stdio: 'inherit' })
    console.log(`  ✓ DB actualizada (${target})`)
  } catch (e) {
    console.log(`  ✗ Error al aplicar SQL: ${e.message}`)
    process.exit(1)
  }
}

// ── Regenerar config.js ───────────────────────────────────────────
if (!opts.noConfig) {
  console.log('  Regenerando src/config.js...')
  const newContent = regenerateConfig(CONFIG_PATH, results)
  const result = writeConfig(CONFIG_PATH, newContent, { dryRun: opts.dryRun })
  if (result.written) {
    console.log('  ✓ config.js actualizado')
  } else {
    console.log('  ⊘ config.js no escrito (dry-run)')
  }
}

console.log('')
console.log('  ✓ Listo')
console.log('')
