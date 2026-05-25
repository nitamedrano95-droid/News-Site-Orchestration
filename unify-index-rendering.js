#!/usr/bin/env node
/**
 * unify-index-rendering.js
 *
 * Replaces inline article rendering in index.html files with a unified approach.
 * - Sorts articles: non-weather first, weather at bottom
 * - Uses site logo for weather articles
 * - Consistent HTML structure across all CMS backends
 *
 * Usage: node unify-index-rendering.js [--dry-run] [--cms CMS_NAME] [--site SITE_SLUG]
 */

const CMS_DATABASES = {
  originaux: 'news_db_cms_originaux',
  nuevos: 'news_db_cms_nuevos',
  nuevos2: 'news_db_cms_nuevos2',
  nuevos3: 'news_db_cms_nuevos3',
};

const SITE_CMS_MAP = {
  // originaux
  bitacoraurbana: 'originaux',
  cbnnoticias: 'originaux',
  centralmexico: 'originaux',
  mexicoinformado: 'originaux',
  nodoinformativo: 'originaux',
  noticiasobjetivo: 'originaux',
  radiocinconoticias: 'originaux',
  reportecentralmx: 'originaux',
  tvmexico: 'originaux',
  verticenoticias: 'originaux',
  // nuevos
  boominformativo: 'nuevos',
  capitalpress: 'nuevos',
  diarioexpress: 'nuevos',
  elpulsomexicano: 'nuevos',
  enfoquecapital: 'nuevos',
  enfoquedirecto: 'nuevos',
  formulacdmx: 'nuevos',
  mexicantimes: 'nuevos',
  mexico360noticias: 'nuevos',
  mradio: 'nuevos',
  noticiashorizonte: 'nuevos',
  pulsodiario: 'nuevos',
  puntoclave: 'nuevos',
  puntonoticias: 'nuevos',
  radarinformativo: 'nuevos',
  reportediario: 'nuevos',
  televisionabc: 'nuevos',
  // nuevos2
  alavistanoticias: 'nuevos2',
  breakingcentermexico: 'nuevos2',
  centronews: 'nuevos2',
  noticias123: 'nuevos2',
  noticiasintegra: 'nuevos2',
  radioabc: 'nuevos2',
  socialmexiconews: 'nuevos2',
  tmznews: 'nuevos2',
  // nuevos3
  actualidadsinfronteras: 'nuevos3',
  adnmexicano: 'nuevos3',
  aztecamexiconoticias: 'nuevos3',
  diariomexicano: 'nuevos3',
  diariomexico: 'nuevos3',
  elanalisismexicano: 'nuevos3',
  elobservadorrepublicano: 'nuevos3',
  elprofetamexicano: 'nuevos3',
  enfoquemexicano: 'nuevos3',
  expresomexicano: 'nuevos3',
  financemarketsmx: 'nuevos3',
  mexicannewsoftheworld: 'nuevos3',
  mexicoandtheworld: 'nuevos3',
  mexicodaily: 'nuevos3',
  mexicoenresumen: 'nuevos3',
  mexicoplus: 'nuevos3',
  monitorrepublicano: 'nuevos3',
  nacionalinstante: 'nuevos3',
  noticiasalinstante: 'nuevos3',
  perspectivamexicana: 'nuevos3',
  politicasalvajealminuto: 'nuevos3',
  pulsorepublicanonoticias: 'nuevos3',
  radioredmx: 'nuevos3',
  republicamx: 'nuevos3',
  wenewsmexico: 'nuevos3',
};

const API_BASE_MAP = {
  originaux: 'https://cms-originaux.sebastianvernis.workers.dev',
  nuevos: 'https://cms-nuevos.sebastianvernis.workers.dev',
  nuevos2: 'https://cms-nuevos2.sebastianvernis.workers.dev',
  nuevos3: 'https://cms-nuevos3.sebastianvernis.workers.dev',
};

const UNIFIED_SCRIPT = `
// UNIFIED ARTICLE RENDERING
(function() {
    'use strict';

    function isWeatherArticle(title) {
        if (!title) return false;
        const t = title.toLowerCase();
        return t.includes('clima') || t.includes('no circula') || t.includes('hoy no');
    }

    function getImageForArticle(article) {
        if (isWeatherArticle(article.title)) return './logo.png';
        return article.imageUrl || './logo.png';
    }

    function esc(t) {
        if (!t) return '';
        return String(t).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
    }

    function enc(t) { return encodeURIComponent(t || ''); }

    function formatDate(dateStr) {
        if (!dateStr) return '';
        try {
            return new Date(dateStr).toLocaleDateString('es-MX', {day:'numeric',month:'short',year:'numeric'});
        } catch (e) { return ''; }
    }

    function renderArticleCard(article) {
        const link = 'articulo/index.html?slug=' + enc(article.slug);
        const img = esc(getImageForArticle(article));
        return '<article class="article-card"><div class="card-image"><a href="' + link + '"><img src="' + img + '" alt="' + esc(article.title) + '" loading="lazy"></a></div><div class="card-content"><span class="card-category-badge cat-' + esc((article.category||'general').toLowerCase()) + '">' + esc(article.category||'General') + '</span><h3><a href="' + link + '">' + esc(article.title) + '</a></h3><p class="card-excerpt">' + esc(article.excerpt||'') + '</p><div class="card-footer"><span class="card-author"><i class="far fa-user"></i> ' + esc(article.author||'Redacción') + '</span><span class="card-date"><i class="far fa-calendar"></i> ' + formatDate(article.publishedAt) + '</span></div></div></article>';
    }

    function sortArticlesForDisplay(articles) {
        const nonWeather = [];
        const weather = [];
        articles.forEach(function(a) {
            if (isWeatherArticle(a.title)) weather.push(a);
            else nonWeather.push(a);
        });
        nonWeather.sort(function(a,b){return new Date(b.publishedAt||0)-new Date(a.publishedAt||0)});
        weather.sort(function(a,b){return new Date(b.publishedAt||0)-new Date(a.publishedAt||0)});
        return nonWeather.concat(weather);
    }

    async function loadArticles() {
        var container = document.getElementById('featured-container');
        var newsContainer = document.getElementById('news-container');
        var newsSection = document.getElementById('news-section');
        try {
            var res = await fetch(API_URL);
            if (!res.ok) throw new Error('err');
            var data = await res.json();
            var arts = data.articles;
            if (!arts||!arts.length) { container.innerHTML='<div class="empty-state">No hay noticias.</div>'; return; }
            var sorted = sortArticlesForDisplay(arts);
            var featured = sorted.find(function(a){return !isWeatherArticle(a.title)}) || sorted[0];
            var gridArts = sorted.filter(function(a){return a!==featured}).slice(0,12);
            if (featured) {
                var fl = 'articulo/index.html?slug='+enc(featured.slug);
                var fi = esc(getImageForArticle(featured));
                container.innerHTML = '<article class="featured-article"><div class="featured-image"><a href="'+fl+'"><img src="'+fi+'" alt="'+esc(featured.title)+'" loading="lazy"></a></div><div class="featured-content"><span class="category-badge cat-'+esc((featured.category||'general').toLowerCase())+'">'+esc(featured.category||'General')+'</span><h1><a href="'+fl+'">'+esc(featured.title)+'</a></h1><p class="excerpt">'+esc(featured.excerpt||'')+'</p><div class="meta"><span class="author"><i class="far fa-user"></i> '+esc(featured.author||'Redacción')+'</span><span class="date"><i class="far fa-calendar"></i> '+formatDate(featured.publishedAt)+'</span></div><a href="'+fl+'" class="read-more">Leer más <i class="fas fa-arrow-right"></i></a></div></article>';
            }
            if (gridArts.length) {
                newsContainer.innerHTML = gridArts.map(renderArticleCard).join('');
            } else if (newsSection) {
                newsSection.style.display='none';
            }
        } catch(e) {
            console.error('Error:',e);
            container.innerHTML='<div class="error-state">Error al cargar.</div>';
        }
    }

    if (document.readyState==='loading') document.addEventListener('DOMContentLoaded',loadArticles);
    else loadArticles();
})();
`;

function processSite(siteSlug, cmsName, dryRun = true) {
  const basePath = `/home/sebastianvernis/News-Site-Orchestration/cms-${cmsName}/sites/${siteSlug}`;
  const indexPath = `${basePath}/index.html`;
  const apiBase = API_BASE_MAP[cmsName];

  const fs = require('fs');

  if (!fs.existsSync(indexPath)) {
    console.log(`  [SKIP] ${cmsName}/${siteSlug}: index.html not found`);
    return { success: false, reason: 'not_found' };
  }

  let content = fs.readFileSync(indexPath, 'utf8');

  // Check if already has unified rendering
  if (content.includes('sortArticlesForDisplay') || content.includes('unifiedIndexRenderer')) {
    console.log(`  [SKIP] ${cmsName}/${siteSlug}: already has unified rendering`);
    return { success: false, reason: 'already_unified' };
  }

  // Check if uses components.js (not inline rendering)
  if (!content.includes('function loadArticles') && !content.includes('loadArticles()')) {
    console.log(`  [INFO] ${cmsName}/${siteSlug}: may use components.js pattern`);
  }

  // Replace the inline script that has loadArticles
  // Find the script block with loadArticles
  const scriptMatch = content.match(/<script>([\s\S]*?)<\/script>\s*$/);
  if (!scriptMatch) {
    console.log(`  [SKIP] ${cmsName}/${siteSlug}: no inline script found`);
    return { success: false, reason: 'no_script' };
  }

  const oldScript = scriptMatch[1];
  if (!oldScript.includes('loadArticles') && !oldScript.includes('fetch(')) {
    console.log(`  [SKIP] ${cmsName}/${siteSlug}: script doesn't load articles`);
    return { success: false, reason: 'no_article_loader' };
  }

  // Extract the API URL from the script
  const apiUrlMatch = oldScript.match(/api\/articles\?site=[^&]+&limit=\d+/);
  if (!apiUrlMatch) {
    console.log(`  [SKIP] ${cmsName}/${siteSlug}: could not find API URL`);
    return { success: false, reason: 'no_api_url' };
  }

  const apiUrl = `https://${apiUrlMatch[0]}`;

  // Build new script
  const newScript = `<script>
(function() {
    var SITE_SLUG = '${siteSlug}';
    var API_URL = '${apiUrl}';
${UNIFIED_SCRIPT}
})();
</script>`;

  const newContent = content.replace(/<script>[\s\S]*?<\/script>\s*$/, newScript);

  if (dryRun) {
    console.log(`  [DRYRUN] ${cmsName}/${siteSlug}: would replace article rendering`);
    return { success: true, dryRun: true };
  } else {
    fs.writeFileSync(indexPath, newContent, 'utf8');
    console.log(`  [DONE] ${cmsName}/${siteSlug}: replaced article rendering`);
    return { success: true };
  }
}

async function main() {
  const args = process.argv.slice(2);
  let dryRun = true;
  let targetCms = null;
  let targetSite = null;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--dry-run') dryRun = true;
    else if (args[i] === '--apply') dryRun = false;
    else if (args[i] === '--cms' && args[i + 1]) targetCms = args[++i];
    else if (args[i] === '--site' && args[i + 1]) targetSite = args[++i];
    else if (args[i] === '--help') {
      console.log(`
Usage: node unify-index-rendering.js [options]

Options:
  --dry-run   Show what would be changed (default)
  --apply     Actually apply changes
  --cms NAME  Process only this CMS (originaux, nuevos, nuevos2, nuevos3)
  --site SLUG Process only this site
  --help      Show this help
      `);
      process.exit(0);
    }
  }

  console.log('========================================');
  console.log('  Unify Index Article Rendering');
  console.log('========================================');
  console.log(`Mode: ${dryRun ? 'DRY-RUN (no changes)' : 'APPLY'}`);
  console.log('========================================');

  const sitesToProcess = [];

  if (targetSite && targetCms) {
    sitesToProcess.push({ site: targetSite, cms: targetCms });
  } else if (targetSite) {
    const cms = Object.keys(SITE_CMS_MAP).find(cms => SITE_CMS_MAP[cms] === targetSite);
    if (cms) sitesToProcess.push({ site: targetSite, cms });
    else console.log(`Site ${targetSite} not found in CMS map`);
  } else {
    // Process all sites
    for (const [site, cms] of Object.entries(SITE_CMS_MAP)) {
      if (targetCms && cms !== targetCms) continue;
      sitesToProcess.push({ site, cms });
    }
  }

  let processed = 0;
  let skipped = 0;

  for (const { site, cms } of sitesToProcess) {
    const result = processSite(site, cms, dryRun);
    if (result.success) processed++;
    else skipped++;
  }

  console.log('========================================');
  console.log(`Processed: ${processed}${dryRun ? ' (dry-run)' : ''}`);
  console.log(`Skipped: ${skipped}`);
  console.log('========================================');
}

main().catch(console.error);