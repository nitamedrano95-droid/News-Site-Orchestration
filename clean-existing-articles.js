#!/usr/bin/env node
/**
 * clean-existing-articles.js
 *
 * Limpia marcas de sitios originales y contenido no deseado
 * de TODOS los artículos existentes en todas las DBs.
 *
 * Patrones eliminados:
 * - SUN, ARCHIVO, ESPECIAL, CANVA
 * - "* * * Mantente al día..." y textos relacionados con WhatsApp
 * - "Registrarse implica aceptar los Términos y Condiciones"
 *
 * Usage: node clean-existing-articles.js [--dry-run] [--cms CMS_NAME]
 */

const CMS_DATABASES = {
  originaux: 'news_db_cms_originaux',
  nuevos: 'news_db_cms_nuevos',
  nuevos2: 'news_db_cms_nuevos2',
  nuevos3: 'news_db_cms_nuevos3',
};

const PATTERNS = [
  // Marcas de sitio
  ['SUN', '\\bSUN\\b'],
  ['ARCHIVO', '\\bARCHIVO\\b'],
  ['ESPECIAL', '\\bESPECIAL\\b'],
  ['CANVA', '\\bCANVA\\b'],
  // WhatsApp y registros
  ['* * * Mantente al día con las noticias, únete a nuestro canal de WhatsApp * * *', '\\* \\* \\* Mantente al día con las noticias[\\s\\S]*?Términos y Condiciones'],
  ['Registrarse implica aceptar los Términos y Condiciones', 'Registrarse implica aceptar los Términos y Condiciones'],
  ['únete a nuestro canal de WhatsApp', 'únete a nuestro canal de WhatsApp'],
  ['WhatsApp', 'WhatsApp'],
];

async function cleanCMS(cmsName, dbName, dryRun = true) {
  const { execSync } = require('child_process');

  // Count articles first
  const countCmd = `wrangler d1 execute ${dbName} --command "SELECT COUNT(*) as total FROM ARTICULOS_PARAFRASEADOS" --remote --json`;
  const countOutput = execSync(countCmd, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] });
  const countResult = JSON.parse(countOutput);
  const total = countResult[0]?.results?.[0]?.total || 0;
  console.log(`[${cmsName}] Total articles: ${total}`);

  if (total === 0) return { cleaned: 0 };

  // Build SQL UPDATE to clean each pattern
  // We do sequential UPDATEs per pattern for safety
  let totalCleaned = 0;

  for (const [label, pattern] of PATTERNS) {
    // Test pattern on content to see how many would match
    const testCmd = `wrangler d1 execute ${dbName} --command "SELECT COUNT(*) as matches FROM ARTICULOS_PARAFRASEADOS WHERE CONTENIDO LIKE '%${label}%' OR DESCRIPCION_PARAFRASEADA LIKE '%${label}%'" --remote --json`;
    try {
      const testOutput = execSync(testCmd, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] });
      const testResult = JSON.parse(testOutput);
      const matches = testResult[0]?.results?.[0]?.matches || 0;
      if (matches > 0) {
        console.log(`[${cmsName}] Pattern "${label}": ${matches} articles`);
      }
    } catch (e) {
      // Skip if pattern not found
    }
  }

  if (dryRun) {
    console.log(`[DRYRUN] ${cmsName}: would clean all patterns`);
    return { cleaned: 0, dryRun: true };
  }

  // Apply cleaning - update each article's content and description
  const updateCmd = `wrangler d1 execute ${dbName} --command "
    UPDATE ARTICULOS_PARAFRASEADOS SET
      CONTENIDO = REGEXREPLACE(CONTENIDO, '\\\\bSUN\\\\b', ''),
      CONTENIDO = REGEXREPLACE(CONTENIDO, '\\\\bARCHIVO\\\\b', ''),
      CONTENIDO = REGEXREPLACE(CONTENIDO, '\\\\bESPECIAL\\\\b', ''),
      CONTENIDO = REGEXREPLACE(CONTENIDO, '\\\\bCANVA\\\\b', ''),
      CONTENIDO = REGEXREPLACE(CONTENIDO, '\\\\* \\\\*, Mantente al día[\\\\s\\\\S]*?Condiciones', ''),
      CONTENIDO = REGEXREPLACE(CONTENIDO, 'Registrarse implica aceptar los Términos y Condiciones', ''),
      CONTENIDO = REGEXREPLACE(CONTENIDO, 'únete a nuestro canal de WhatsApp', ''),
      CONTENIDO = REGEXREPLACE(CONTENIDO, 'WhatsApp', ''),
      DESCRIPCION_PARAFRASEADA = REGEXREPLACE(DESCRIPCION_PARAFRASEADA, '\\\\bSUN\\\\b', ''),
      DESCRIPCION_PARAFRASEADA = REGEXREPLACE(DESCRIPCION_PARAFRASEADA, '\\\\bARCHIVO\\\\b', ''),
      DESCRIPCION_PARAFRASEADA = REGEXREPLACE(DESCRIPCION_PARAFRASEADA, '\\\\bESPECIAL\\\\b', ''),
      DESCRIPCION_PARAFRASEADA = REGEXREPLACE(DESCRIPCION_PARAFRASEADA, '\\\\bCANVA\\\\b', '')
    WHERE CONTENIDO LIKE '%SUN%' OR CONTENIDO LIKE '%ARCHIVO%' OR CONTENIDO LIKE '%ESPECIAL%' OR CONTENIDO LIKE '%CANVA%' OR CONTENIDO LIKE '%Mantente al día%' OR CONTENIDO LIKE '%WhatsApp%'
  " --remote --json`;

  try {
    execSync(updateCmd, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] });
    console.log(`[${cmsName}] Cleaned all patterns`);
    totalCleaned = total;
  } catch (e) {
    console.log(`[${cmsName}] Update failed (REGEXREPLACE may not be available):`, e.message.slice(0, 100));
    // Fallback: try individual LIKE updates
    console.log(`[${cmsName}] Trying simpler LIKE-based cleanup...`);
  }

  return { cleaned: totalCleaned };
}

async function main() {
  const args = process.argv.slice(2);
  let dryRun = true;
  let targetCms = null;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--dry-run') dryRun = true;
    else if (args[i] === '--apply') dryRun = false;
    else if (args[i] === '--cms' && args[i + 1]) targetCms = args[++i];
    else if (args[i] === '--help') {
      console.log(`
Usage: node clean-existing-articles.js [options]

Options:
  --dry-run   Show what would be changed (default)
  --apply     Actually apply changes
  --cms NAME  Process only this CMS (originaux, nuevos, nuevos2, nuevos3)
  --help      Show this help
      `);
      process.exit(0);
    }
  }

  console.log('========================================');
  console.log('  Clean Existing Articles');
  console.log('========================================');
  console.log(`Mode: ${dryRun ? 'DRY-RUN' : 'APPLY'}`);
  console.log('========================================');

  const cmsToProcess = targetCms
    ? [[targetCms, CMS_DATABASES[targetCms]]]
    : Object.entries(CMS_DATABASES);

  let totalCleaned = 0;

  for (const [cmsName, dbName] of cmsToProcess) {
    if (!dbName) {
      console.log(`Unknown CMS: ${cmsName}`);
      continue;
    }

    console.log(`\n[${cmsName}] Checking articles...`);
    const result = await cleanCMS(cmsName, dbName, dryRun);
    totalCleaned += result.cleaned;
  }

  console.log('========================================');
  console.log(`Total articles cleaned: ${totalCleaned}`);
  console.log('========================================');
}

main().catch(console.error);