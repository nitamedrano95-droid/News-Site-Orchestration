#!/usr/bin/env node
/**
 * fix-informador-images.js
 *
 * 1. Find all articles from informador.mx source
 * 2. Delete their R2 images
 * 3. Set URL_IMAGEN to NULL in DB (frontend uses logo.png fallback)
 *
 * Usage: node fix-informador-images.js [--dry-run] [--cms CMS_NAME]
 */

const CMS_DATABASES = {
  originaux: 'news_db_cms_originaux',
  nuevos: 'news_db_cms_nuevos',
  nuevos2: 'news_db_cms_nuevos2',
  nuevos3: 'news_db_cms_nuevos3',
};

async function getInformadorArticles(cmsName, dbName) {
  const { execSync } = require('child_process');
  const cmd = `wrangler d1 execute ${dbName} --command "SELECT ID, URL_IMAGEN FROM ARTICULOS_PARAFRASEADOS WHERE SOURCE_URL LIKE '%informador%'" --remote --json`;
  const output = execSync(cmd, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] });
  const result = JSON.parse(output);
  // Wrangler returns an array with one element per statement
  return result[0]?.results || [];
}

async function deleteFromDB(dbName, ids) {
  if (ids.length === 0) return { success: 0 };
  const { execSync } = require('child_process');
  const idsList = ids.map(id => `'${id}'`).join(',');
  const cmd = `wrangler d1 execute ${dbName} --command "UPDATE ARTICULOS_PARAFRASEADOS SET URL_IMAGEN = NULL WHERE ID IN (${idsList})" --remote --json`;
  const output = execSync(cmd, { encoding: 'utf8' });
  return JSON.parse(output);
}

async function deleteR2Images(imageUrls) {
  if (imageUrls.length === 0) return { deleted: 0 };
  const { execSync } = require('child_process');
  // Build a file with URLs to delete
  const fs = require('fs');
  const tempFile = '/tmp/r2-delete-list.txt';
  fs.writeFileSync(tempFile, imageUrls.join('\n'), 'utf8');
  try {
    execSync(`rclone delete cms-news: --include-from=${tempFile} 2>&1`, { stdio: 'pipe' });
    fs.unlinkSync(tempFile);
    return { deleted: imageUrls.length };
  } catch (e) {
    console.log('  R2 delete warning:', e.message);
    fs.unlinkSync(tempFile);
    return { deleted: 0, error: e.message };
  }
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
Usage: node fix-informador-images.js [options]

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
  console.log('  Fix Informador Images');
  console.log('========================================');
  console.log(`Mode: ${dryRun ? 'DRY-RUN' : 'APPLY'}`);
  console.log('========================================');

  const cmsToProcess = targetCms
    ? [[targetCms, CMS_DATABASES[targetCms]]]
    : Object.entries(CMS_DATABASES);

  let totalArticles = 0;
  let totalDeleted = 0;

  for (const [cmsName, dbName] of cmsToProcess) {
    if (!dbName) {
      console.log(`Unknown CMS: ${cmsName}`);
      continue;
    }

    console.log(`\n[${cmsName}] Reading articles...`);
    const articles = await getInformadorArticles(cmsName, dbName);
    console.log(`[${cmsName}] Found ${articles.length} articles from informador.mx`);

    if (articles.length === 0) continue;

    // Collect unique R2 image paths
    const r2Paths = [];
    const ids = [];

    for (const article of articles) {
      if (article.URL_IMAGEN) {
        // Extract R2 key from URL like https://uploads.sebastianvernis.space/auto/xxx.jpg
        const match = article.URL_IMAGEN.match(/\/auto\/(.+)$/);
        if (match) {
          r2Paths.push(`auto/${match[1]}`);
        }
      }
      ids.push(article.ID);
    }

    console.log(`[${cmsName}] Unique R2 images: ${r2Paths.length}`);

    if (dryRun) {
      console.log(`[DRYRUN] ${cmsName}: would set NULL on ${ids.length} articles`);
      console.log(`[DRYRUN] ${cmsName}: would delete ${r2Paths.length} R2 images`);
      console.log(`[DRYRUN] Sample R2 paths: ${r2Paths.slice(0, 3).join(', ')}`);
    } else {
      // Step 1: Update DB
      console.log(`[${cmsName}] Setting URL_IMAGEN = NULL...`);
      const dbResult = await deleteFromDB(dbName, ids);
      console.log(`[${cmsName}] DB updated: ${ids.length} articles`);

      // Step 2: Delete R2 images (in batches of 100)
      console.log(`[${cmsName}] Deleting R2 images...`);
      let deletedCount = 0;
      const batchSize = 100;
      for (let i = 0; i < r2Paths.length; i += batchSize) {
        const batch = r2Paths.slice(i, i + batchSize);
        const result = await deleteR2Images(batch);
        deletedCount += result.deleted;
        console.log(`[${cmsName}] Deleted batch ${Math.floor(i/batchSize)+1}: ${result.deleted} images`);
      }
      console.log(`[${cmsName}] Total R2 deleted: ${deletedCount}`);
      totalDeleted += deletedCount;
    }

    totalArticles += articles.length;
  }

  console.log('========================================');
  console.log(`Total informador articles: ${totalArticles}`);
  if (!dryRun) {
    console.log(`Total R2 images deleted: ${totalDeleted}`);
  }
  console.log('========================================');
}

main().catch(console.error);