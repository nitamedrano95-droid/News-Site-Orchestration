#!/usr/bin/env node
/**
 * sync-fb-publicado-from-sitios.js
 * Sincroniza ARTICULOS_PARAFRASEADOS.FB_PUBLICADO = 1 para todos los
 * artículos que tienen una asignación en CUALQUIER ARTICULOS_SITIO_*.
 *
 * Por qué existe: n8n inserta en ARTICULOS_SITIO_* directamente pero
 * olvida marcar FB_PUBLICADO = 1 en la general. Esto regenera el gap
 * cada vez que se ejecuta el workflow de ingesta.
 *
 * Idempotente: usar el WHERE FB_PUBLICADO=0 OR NULL evita writes
 * innecesarios. FB_FECHA se preserva con COALESCE si ya existía.
 *
 * Uso:
 *   node sync-fb-publicado-from-sitios.js                 # todos los CMS
 *   node sync-fb-publicado-from-sitios.js --cms nuevos3  # un CMS
 *   node sync-fb-publicado-from-sitios.js --dry-run       # no escribe
 *
 * Cron sugerido (en n8n, después del workflow de ingest):
 *   0 * * * *  (cada hora)
 */

const CMS_DATABASES = {
  originaux: 'news_db_cms_originaux',
  nuevos:    'news_db_cms_nuevos',
  nuevos2:   'news_db_cms_nuevos2',
  nuevos3:   'news_db_cms_nuevos3',
};

const args = process.argv.slice(2);
const getArg = (name) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : null;
};
const hasFlag = (name) => args.includes(name);

const onlyCms = getArg('--cms');
const dryRun = hasFlag('--dry-run');

// Ejecuta comando D1 vía wrangler
async function execD1(databaseName, sql) {
  const { execSync } = await import('child_process');
  const escapedSql = sql.replace(/'/g, "'\\''");
  const cmd = `npx wrangler d1 execute ${databaseName} --command '${escapedSql}' --remote --yes 2>&1`;
  try {
    const output = execSync(cmd, { encoding: 'utf-8', maxBuffer: 50 * 1024 * 1024 });
    const startIdx = output.indexOf('[');
    const endIdx = output.lastIndexOf(']');
    if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
      const jsonStr = output.substring(startIdx, endIdx + 1);
      const parsed = JSON.parse(jsonStr);
      if (Array.isArray(parsed) && parsed[0]?.results) {
        return { success: true, result: parsed[0].results, meta: parsed[0].meta };
      }
      return { success: false, error: 'Unexpected response', debug: JSON.stringify(parsed).substring(0, 200) };
    }
    return { success: false, error: 'No JSON found', raw: output.substring(0, 300) };
  } catch (e) {
    const output = (e.stdout || e.message || '').toString();
    return { success: false, error: output.substring(0, 500) };
  }
}

async function getSitiosTables(databaseName) {
  const r = await execD1(databaseName,
    "SELECT name FROM sqlite_master WHERE type='table' AND name LIKE 'ARTICULOS_SITIO_%' ORDER BY name;"
  );
  if (!r.success) return [];
  return r.result.map((row) => row.name);
}

async function syncCms(cmsKey, dbName) {
  console.log(`\n─── ${cmsKey} (${dbName}) ${dryRun ? '[DRY-RUN]' : ''} ───`);

  const tablas = await getSitiosTables(dbName);
  if (tablas.length === 0) {
    console.log('  ⊘ Sin tablas ARTICULOS_SITIO_*, skip');
    return { cms: cmsKey, affected: 0, skipped: true };
  }
  console.log(`  Tablas de sitio: ${tablas.length}`);

  // Defensa: NO tocar filas referenciadas con FB_FECHA real
  // EXISTS con cada tabla de sitio
  const existsClauses = tablas
    .map((t, i) => `EXISTS (SELECT 1 FROM ${t} s${i} WHERE s${i}.ID_PARAFRASEADO = ARTICULOS_PARAFRASEADOS.ID)`)
    .join(' OR ');

  const verb = dryRun ? 'COUNT candidatos' : 'UPDATE';
  const sql = dryRun
    ? `SELECT COUNT(DISTINCT ID) as c
       FROM ARTICULOS_PARAFRASEADOS
       WHERE SITIO_DESTINO IS NOT NULL AND SITIO_DESTINO != ''
         AND (FB_PUBLICADO = 0 OR FB_PUBLICADO IS NULL)
         AND (${existsClauses});`
    : `UPDATE ARTICULOS_PARAFRASEADOS
       SET FB_PUBLICADO = 1,
           FB_FECHA = COALESCE(FB_FECHA, datetime('now'))
       WHERE SITIO_DESTINO IS NOT NULL AND SITIO_DESTINO != ''
         AND (FB_PUBLICADO = 0 OR FB_PUBLICADO IS NULL)
         AND (${existsClauses});`;

  const r = await execD1(dbName, sql);
  if (!r.success) {
    console.log(`  ✗ Error: ${r.error}`);
    return { cms: cmsKey, affected: 0, error: r.error };
  }

  if (dryRun) {
    const count = r.result[0]?.c || 0;
    console.log(`  → Candidatos a actualizar: ${count}`);
    return { cms: cmsKey, affected: count, dryRun: true };
  } else {
    const changes = r.meta?.changes || 0;
    console.log(`  ✓ FB_PUBLICADO marcados: ${changes}`);
    return { cms: cmsKey, affected: changes };
  }
}

async function main() {
  const targets = onlyCms
    ? Object.entries(CMS_DATABASES).filter(([k]) => k === onlyCms)
    : Object.entries(CMS_DATABASES);

  if (targets.length === 0) {
    console.error(`✗ CMS "${onlyCms}" no existe. Opciones: ${Object.keys(CMS_DATABASES).join(', ')}`);
    process.exit(1);
  }

  console.log('═══════════════════════════════════════════════════════════════');
  console.log(` sync-fb-publicado-from-sitios.js ${dryRun ? '[DRY-RUN]' : ''}`);
  console.log('═══════════════════════════════════════════════════════════════');

  const results = [];
  for (const [key, dbName] of targets) {
    results.push(await syncCms(key, dbName));
  }

  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log(' RESUMEN');
  console.log('═══════════════════════════════════════════════════════════════');
  let total = 0;
  for (const r of results) {
    if (r.error) {
      console.log(`  ${r.cms.padEnd(14)}  ✗ ERROR`);
    } else if (r.skipped) {
      console.log(`  ${r.cms.padEnd(14)}  ⊘ SKIP`);
    } else {
      console.log(`  ${r.cms.padEnd(14)}  ${r.affected > 0 ? '✓' : '·'}  ${r.affected}`);
      total += r.affected;
    }
  }
  console.log(`  ${'TOTAL'.padEnd(14)}     ${total}`);
  console.log('');
}

main().catch((e) => {
  console.error('Fatal:', e);
  process.exit(1);
});
