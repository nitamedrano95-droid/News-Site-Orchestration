#!/usr/bin/env node
/**
 * fix-missing-site-entries.js
 * Inserta registros faltantes en ARTICULOS_SITIO_* para artículos
 * que existen en ARTICULOS_PARAFRASEADOS pero no en la tabla del sitio.
 *
 * Uso: node fix-missing-site-entries.js [--cms cms_name] [--dry-run] [--site SITIO]
 */

const CMS_DATABASES = {
  originaux: 'news_db_cms_originaux',
  nuevos: 'news_db_cms_nuevos',
  nuevos2: 'news_db_cms_nuevos2',
  nuevos3: 'news_db_cms_nuevos3',
};

// Ejecuta comando D1 vía wrangler
async function execD1(databaseId, sql) {
  const { execSync } = await import('child_process');
  const escapedSql = sql.replace(/'/g, "'\\''");
  const cmd = `npx wrangler d1 execute ${databaseId} --command '${escapedSql}' --remote --yes 2>&1`;
  try {
    const output = execSync(cmd, { encoding: 'utf-8', maxBuffer: 50 * 1024 * 1024 });
    const startIdx = output.indexOf('[');
    const endIdx = output.lastIndexOf(']');
    if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
      const jsonStr = output.substring(startIdx, endIdx + 1);
      const parsed = JSON.parse(jsonStr);
      if (Array.isArray(parsed) && parsed[0]?.results) {
        return { success: true, result: parsed[0].results };
      } else if (!Array.isArray(parsed) && parsed['0']) {
        return { success: true, result: parsed['0'].results };
      } else if (parsed.results) {
        return { success: true, result: parsed.results };
      }
      return { success: false, error: 'Unexpected response', debug: JSON.stringify(parsed).substring(0, 200) };
    }
    return { success: false, error: 'No JSON found', raw: output.substring(0, 300) };
  } catch (e) {
    const output = (e.stdout || e.message || '').toString();
    const startIdx = output.indexOf('[');
    const endIdx = output.lastIndexOf(']');
    if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
      try {
        const jsonStr = output.substring(startIdx, endIdx + 1);
        const parsed = JSON.parse(jsonStr);
        if (parsed.results) {
          return { success: true, result: parsed.results };
        } else if (parsed['0']?.results) {
          return { success: true, result: parsed['0'].results };
        }
      } catch {}
    }
    return { success: false, error: 'Failed to parse', raw: output.substring(0, 300) };
  }
}

async function fixSiteEntries(dbName, siteSlug = null, dryRun = false) {
  console.log(`\n========== ${dbName} ==========`);

  // 1. Obtener sitios activos (SITIOS_LIST)
  const sitesResult = await execD1(dbName, "SELECT slug, nombre FROM SITIOS WHERE activo = 1");
  if (!sitesResult.success || !sitesResult.result?.length) {
    console.log('No se encontraron sitios activos');
    return { success: 0, failed: 0 };
  }

  const sites = sitesResult.result.map(s => s.SLUG);
  console.log(`Sitios activos: ${sites.join(', ')}`);

  let totalFixed = 0;

  for (const site of sites) {
    if (siteSlug && site !== siteSlug) continue;

    const tableName = `ARTICULOS_SITIO_${site.toUpperCase()}`;

    // Verificar que la tabla existe
    const tableCheck = await execD1(dbName, `SELECT name FROM sqlite_master WHERE type='table' AND name='${tableName}'`);
    if (!tableCheck.success || !tableCheck.result?.length) {
      console.log(`  Tabla ${tableName} no existe, saltando`);
      continue;
    }

    // 2. Encontrar artículos en PARAFRASEADOS con SITIO_DESTINO que matchea este sitio
    // pero sin registro en ARTICULOS_SITIO_{site}
    const query = `
      SELECT p.ID, p.TITULO_PARAFRASEADO, p.SITIO_DESTINO
      FROM ARTICULOS_PARAFRASEADOS p
      WHERE p.ESTADO = 'PUBLICADO'
        AND (p.SITIO_DESTINO = '${site}' OR p.SITIOS_DESTINO LIKE '%${site}%')
        AND NOT EXISTS (
          SELECT 1 FROM ${tableName} s WHERE s.ID_PARAFRASEADO = p.ID
        )
      LIMIT 200
    `;

    const missingResult = await execD1(dbName, query);

    if (!missingResult.success) {
      console.log(`  Error consultando ${site}: ${missingResult.error}`);
      continue;
    }

    const missing = missingResult.result || [];
    if (missing.length === 0) {
      console.log(`  ${site}: sin entradas faltantes`);
      continue;
    }

    console.log(`  ${site}: ${missing.length} entradas faltantes en ${tableName}`);

    if (dryRun) {
      for (const m of missing) {
        console.log(`    [DRYRUN] Insertaría: ${m.ID} - ${(m.TITULO_PARAFRASEADO || '').substring(0, 50)}...`);
      }
    } else {
      let inserted = 0;
      let errors = 0;

      for (const m of missing) {
        const siteId = crypto.randomUUID();
        const insertSql = `
          INSERT INTO ${tableName} (ID, ID_PARAFRASEADO, FECHA_ASIGNACION, FB_PUBLICADO, FB_FECHA, FB_POST_ID)
          VALUES ('${siteId}', '${m.ID}', datetime('now'), 0, NULL, NULL)
        `;

        try {
          const result = await execD1(dbName, insertSql);
          if (result.success) {
            inserted++;
          } else {
            errors++;
            console.log(`    Error insertando ${m.ID}: ${result.error}`);
          }
        } catch (e) {
          errors++;
          console.log(`    Exception ${m.ID}: ${e.message}`);
        }
      }

      console.log(`    Insertados: ${inserted}, Errores: ${errors}`);
      totalFixed += inserted;
    }
  }

  return { success: totalFixed, failed: 0 };
}

async function main() {
  const args = process.argv.slice(2);
  let cmsToProcess = null;
  let dryRun = false;
  let targetSite = null;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--cms' && args[i + 1]) {
      cmsToProcess = args[i + 1];
      i++;
    } else if (args[i] === '--dry-run') {
      dryRun = true;
    } else if (args[i] === '--site' && args[i + 1]) {
      targetSite = args[i + 1];
      i++;
    } else if (args[i] === '--help') {
      console.log(`
Usage: node fix-missing-site-entries.js [options]

Options:
  --cms NAME   Procesar solo el CMS: originaux, nuevos, nuevos2, nuevos3
  --site NAME  Procesar solo el sitio (slug)
  --dry-run    No hacer cambios, solo mostrar qué se haría
  --help       Mostrar esta ayuda
      `);
      process.exit(0);
    }
  }

  console.log('========================================');
  console.log('  Fix Missing Site Table Entries');
  console.log('========================================');
  console.log(`CMS: ${cmsToProcess || 'todos'} | Site: ${targetSite || 'todos'} | Dry-run: ${dryRun}`);
  console.log('========================================');

  const cmsList = cmsToProcess ? [cmsToProcess] : Object.keys(CMS_DATABASES);
  const totals = { success: 0, failed: 0 };

  for (const cms of cmsList) {
    const dbName = CMS_DATABASES[cms];
    if (!dbName) {
      console.error(`CMS desconocido: ${cms}`);
      continue;
    }
    try {
      const result = await fixSiteEntries(dbName, targetSite, dryRun);
      totals.success += result.success;
      totals.failed += result.failed;
    } catch (e) {
      console.error(`Error procesando ${cms}: ${e.message}`);
    }
  }

  console.log('\n========================================');
  console.log('  RESUMEN');
  console.log('========================================');
  console.log(`Total insertados: ${totals.success}`);
  console.log(`Total fallidos: ${totals.failed}`);
  console.log('========================================');
}

main().catch(console.error);