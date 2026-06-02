#!/usr/bin/env node
/**
 * re-download-images.js v2
 * Re-descarga imágenes desde SOURCE_URL y las sube a R2
 * Usa: wrangler para D1 + fetch al Worker upload endpoint
 *
 * Uso: node re-download-images.js [--days 7] [--cms name] [--dry-run]
 */

import { writeFileSync, readFileSync } from 'fs';

// Config
const R2_BUCKET = 'cms-news';
const UPLOADS_BASE = 'https://uploads.sebastianvernis.space';
const WORKER_URLS = {
  originaux: 'https://cms-originaux.sebastianvernis.workers.dev',
  nuevos: 'https://cms-nuevos.sebastianvernis.workers.dev',
  nuevos2: 'https://cms-nuevos2.sebastianvernis.workers.dev',
  nuevos3: 'https://cms-nuevos3.sebastianvernis.workers.dev',
};

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
      // Wrangler returns: [{"results": [...], "success": true}] when rows returned
      // or {"0": {"results": [...]}} for some other cases
      let data;
      if (Array.isArray(parsed) && parsed[0]?.results) {
        // Normal case: array with one element containing results array
        data = parsed[0];
        return { success: true, result: data.results };
      } else if (!Array.isArray(parsed) && parsed['0']) {
        data = parsed['0'];
        return { success: true, result: data.results };
      } else if (parsed.results) {
        return { success: true, result: parsed.results };
      }
      return { success: false, error: 'Unexpected response format', debug: JSON.stringify(parsed).substring(0, 200) };
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
        let data;
        if (Array.isArray(parsed) && parsed[0]?.['0']) {
          data = parsed[0]['0'];
        } else if (!Array.isArray(parsed) && parsed['0']) {
          data = parsed['0'];
        } else if (parsed.results) {
          data = parsed;
        } else {
          return { success: false, error: 'Unexpected response format' };
        }
        return { success: true, result: data.results };
      } catch { /* continue */ }
    }
    return { success: false, error: 'Failed to parse', raw: output.substring(0, 300) };
  }
}

// Descarga imagen
async function downloadImage(url) {
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
    });

    if (!res.ok) return null;

    const contentType = res.headers.get('content-type') || 'image/jpeg';
    if (!contentType.startsWith('image/')) {
      return null;
    }

    return { buffer: Buffer.from(await res.arrayBuffer()), contentType };
  } catch {
    return null;
  }
}

// Extrae og:image de una URL
async function extractOgImage(sourceUrl) {
  try {
    const res = await fetch(sourceUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml',
      },
    });

    if (!res.ok) return null;

    const html = await res.text();

    // OG Image
    let match = html.match(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i);
    if (match) return match[1];

    match = html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:image["']/i);
    if (match) return match[1];

    // Twitter image
    match = html.match(/<meta[^>]*name=["']twitter:image["'][^>]*content=["']([^"']+)["']/i);
    if (match) return match[1];

    return null;
  } catch {
    return null;
  }
}

// Sube imagen al Worker (usa el endpoint /api/upload)
async function uploadViaWorker(workerUrl, imageBuffer, contentType, filename = 'image.jpg') {
  try {
    const formData = new FormData();
    const blob = new Blob([imageBuffer], { type: contentType });
    formData.append('file', blob, filename);

    const res = await fetch(`${workerUrl}/api/upload`, {
      method: 'POST',
      body: formData,
    });

    if (!res.ok) {
      console.log(`  Upload failed: ${res.status}`);
      return null;
    }

    const data = await res.json();
    return data.url;
  } catch (e) {
    console.log(`  Upload error: ${e.message}`);
    return null;
  }
}

// Procesa un CMS
async function processCMS(cmsName, days = 7, dryRun = false) {
  const dbId = CMS_DATABASES[cmsName];
  const workerUrl = WORKER_URLS[cmsName];

  if (!dbId || !workerUrl) {
    console.error(`CMS desconocido: ${cmsName}`);
    return { success: 0, failed: 0, error: 'unknown_cms' };
  }

  console.log(`\n========== ${cmsName.toUpperCase()} (últimos ${days} días) ==========`);
  if (dryRun) console.log('[MODO DRY-RUN - Sin cambios]\n');

  // 1. Obtener artículos
  const query = `
    SELECT ID, TITULO_PARAFRASEADO, URL_IMAGEN, SOURCE_URL, FECHA_PUBLICACION
    FROM ARTICULOS_PARAFRASEADOS
    WHERE ESTADO = 'PUBLICADO'
      AND FECHA_PUBLICACION >= datetime('now', '-${days} days')
      AND SOURCE_URL IS NOT NULL
      AND SOURCE_URL != ''
    ORDER BY FECHA_PUBLICACION DESC
  `;

  console.log('Consultando artículos...');
  const result = await execD1(dbId, query);

  if (!result.success || !result.result) {
    console.log('No se encontraron artículos o error en consulta:', result.error || 'unknown');
    return { success: 0, failed: 0, error: result.error || 'no_results' };
  }

  const articles = result.result;
  console.log(`Encontrados ${articles.length} artículos`);

  if (articles.length === 0) {
    return { success: 0, failed: 0 };
  }

  // 2. Procesar
  let success = 0;
  let failed = 0;
  const batchSize = 5; // Reducido para evitar sobrecarga

  for (let i = 0; i < articles.length; i += batchSize) {
    const batch = articles.slice(i, i + batchSize);
    console.log(`\nLote ${Math.floor(i / batchSize) + 1}/${Math.ceil(articles.length / batchSize)}`);

    const promises = batch.map(async (article) => {
      const { ID, SOURCE_URL } = article;

      // Extraer imagen del source
      const imageUrl = await extractOgImage(SOURCE_URL);
      if (!imageUrl) {
        return { id: ID, success: false, reason: 'no_og_image' };
      }

      // Descargar imagen
      const imageData = await downloadImage(imageUrl);
      if (!imageData) {
        return { id: ID, success: false, reason: 'download_failed' };
      }

      if (dryRun) {
        console.log(`  [DRYRUN] ${ID}: ${imageUrl.substring(0, 60)}...`);
        return { id: ID, success: true, newUrl: '[dry-run]' };
      }

      // Subir a R2 vía Worker
      const filename = `${crypto.randomUUID()}.jpg`;
      const newUrl = await uploadViaWorker(workerUrl, imageData.buffer, imageData.contentType, filename);

      if (!newUrl) {
        return { id: ID, success: false, reason: 'upload_failed' };
      }

      return { id: ID, success: true, newUrl };
    });

    const results = await Promise.all(promises);

    for (const r of results) {
      if (r.success) {
        success++;

        if (!dryRun) {
          // Actualizar D1
          const updateQuery = `UPDATE ARTICULOS_PARAFRASEADOS SET URL_IMAGEN = '${r.newUrl}' WHERE ID = '${r.id}'`;
          try {
            await execD1(dbId, updateQuery);
          } catch (e) {
            console.log(`  Error actualizando ${r.id}: ${e.message}`);
          }
        }
      } else {
        failed++;
        if (r.reason !== 'no_og_image') {
          console.log(`  Falló ${r.id}: ${r.reason}`);
        }
      }
    }

    console.log(`Progreso: ${Math.min(i + batchSize, articles.length)}/${articles.length} | OK: ${success} | Fail: ${failed}`);

    // Pausa entre lotes
    if (i + batchSize < articles.length && !dryRun) {
      await new Promise(r => setTimeout(r, 500));
    }
  }

  console.log(`\nResumen ${cmsName}: ${success} OK, ${failed} fallidos`);
  return { success, failed };
}

// Main
async function main() {
  const args = process.argv.slice(2);

  let days = 7;
  let cmsToProcess = null;
  let dryRun = false;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--days' && args[i + 1]) {
      days = parseInt(args[i + 1]);
      i++;
    } else if (args[i] === '--cms' && args[i + 1]) {
      cmsToProcess = args[i + 1];
      i++;
    } else if (args[i] === '--dry-run') {
      dryRun = true;
    } else if (args[i] === '--help') {
      console.log(`
Usage: node re-download-images.js [options]

Options:
  --days N     Procesar artículos de los últimos N días (default: 7)
  --cms NAME   Procesar solo el CMS: originaux, nuevos, nuevos2, nuevos3
  --dry-run    No hacer cambios, solo mostrar qué se haría
  --help       Mostrar esta ayuda
      `);
      process.exit(0);
    }
  }

  console.log('========================================');
  console.log('  Re-descarga de imágenes para NexoPress');
  console.log('========================================');
  console.log(`Días: ${days} | CMS: ${cmsToProcess || 'todos'} | Dry-run: ${dryRun}`);
  console.log('========================================');

  const cmsList = cmsToProcess ? [cmsToProcess] : Object.keys(CMS_DATABASES);
  const totals = { success: 0, failed: 0 };

  for (const cms of cmsList) {
    try {
      const result = await processCMS(cms, days, dryRun);
      if (result.error) {
        console.error(`Error en ${cms}: ${result.error}`);
      } else {
        totals.success += result.success;
        totals.failed += result.failed;
      }
    } catch (e) {
      console.error(`Error procesando ${cms}: ${e.message}`);
    }
  }

  console.log('\n========================================');
  console.log('  RESUMEN GENERAL');
  console.log('========================================');
  console.log(`Total OK: ${totals.success}`);
  console.log(`Total Fallidos: ${totals.failed}`);
  console.log('========================================');
}

main().catch(console.error);