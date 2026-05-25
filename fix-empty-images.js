#!/usr/bin/env node
/**
 * fix-empty-images.js
 *
 * Usage: node fix-empty-images.js [--dry-run] [--apply] [--cms CMS_NAME]
 */

const SITE_CMS_MAP = {
  boominformativo: 'nuevos', capitalpress: 'nuevos', diarioexpress: 'nuevos',
  elpulsomexicano: 'nuevos', enfoquecapital: 'nuevos', enfoquedirecto: 'nuevos',
  formulacdmx: 'nuevos', mexicantimes: 'nuevos', mexico360noticias: 'nuevos',
  mradio: 'nuevos', noticiashorizonte: 'nuevos', pulsodiario: 'nuevos',
  puntoclave: 'nuevos', puntonoticias: 'nuevos', radarinformativo: 'nuevos',
  reportediario: 'nuevos', televisionabc: 'nuevos',
  bitacoraurbana: 'originaux', cbnnoticias: 'originaux', centralmexico: 'originaux',
  mexicoinformado: 'originaux', nodoinformativo: 'originaux', noticiasobjetivo: 'originaux',
  radiocinconoticias: 'originaux', reportecentralmx: 'originaux', tvmexico: 'originaux',
  verticenoticias: 'originaux',
  alavistanoticias: 'nuevos2', breakingcentermexico: 'nuevos2', centronews: 'nuevos2',
  noticias123: 'nuevos2', noticiasintegra: 'nuevos2', radioabc: 'nuevos2',
  socialmexiconews: 'nuevos2', tmznews: 'nuevos2',
  actualidadsinfronteras: 'nuevos3', adnmexicano: 'nuevos3', aztecamexiconoticias: 'nuevos3',
  diariomexicano: 'nuevos3', diariomexico: 'nuevos3', elanalisismexicano: 'nuevos3',
  elobservadorrepublicano: 'nuevos3', elprofetamexicano: 'nuevos3', enfoquemexicano: 'nuevos3',
  expresomexicano: 'nuevos3', financemarketsmx: 'nuevos3', mexicannewsoftheworld: 'nuevos3',
  mexicoandtheworld: 'nuevos3', mexicodaily: 'nuevos3', mexicoenresumen: 'nuevos3',
  mexicoplus: 'nuevos3', monitorrepublicano: 'nuevos3', nacionalinstante: 'nuevos3',
  noticiasalinstante: 'nuevos3', perspectivamexicana: 'nuevos3', politicasalvajealminuto: 'nuevos3',
  pulsorepublicanonoticias: 'nuevos3', radioredmx: 'nuevos3', republicamx: 'nuevos3',
  wenewsmexico: 'nuevos3',
};

function fixSite(siteSlug, cmsName, dryRun = true) {
  const path = '/home/sebastianvernis/News-Site-Orchestration/cms-' + cmsName + '/sites/' + siteSlug + '/index.html';
  const fs = require('fs');

  if (!fs.existsSync(path)) return { success: false, reason: 'not_found' };

  let content = fs.readFileSync(path, 'utf8');
  let original = content;
  let changed = false;

  // Pattern 1: Simple direct imageUrl without weather check
  // if(imgDiv&&a.imageUrl){ imgDiv.style.backgroundImage="url("+a.imageUrl+")";
  // Fix: always set a background, use logo.png fallback
  if (content.includes('if(imgDiv&&a.imageUrl){') && content.includes('"url("+a.imageUrl+")"')) {
    content = content.replace(
      'if(imgDiv&&a.imageUrl){',
      'if(imgDiv){'
    ).replace(
      'imgDiv.style.backgroundImage="url("+a.imageUrl+")"',
      'imgDiv.style.backgroundImage="url("+(a.imageUrl||"./logo.png")+")"'
    );
    changed = true;
  }

  // Pattern 2: Weather check but still requires a.imageUrl
  // if(imgDiv&&a.imageUrl){ imgDiv.style.backgroundImage="url("+(isWeatherArticle(a.title)?"./logo.png":a.imageUrl)+")";
  // Fix: if imgDiv exists, check for weather OR missing imageUrl
  if (content.includes('if(imgDiv&&a.imageUrl){') && content.includes('isWeatherArticle(a.title)')) {
    content = content.replace(
      'if(imgDiv&&a.imageUrl){',
      'if(imgDiv){var useLogo=isWeatherArticle(a.title)||!a.imageUrl;'
    ).replace(
      '"url("+(isWeatherArticle(a.title)?"',
      '"url("+(useLogo?"'
    );
    changed = true;
  }

  if (content === original) return { success: false, reason: 'no_issue' };
  if (dryRun) return { success: true, dryRun: true };

  fs.writeFileSync(path, content, 'utf8');
  return { success: true };
}

async function main() {
  const args = process.argv.slice(2);
  let dryRun = true;
  let targetCms = null;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--dry-run') dryRun = true;
    else if (args[i] === '--apply') dryRun = false;
    else if (args[i] === '--cms' && args[i + 1]) targetCms = args[++i];
  }

  console.log('Mode: ' + (dryRun ? 'DRY-RUN' : 'APPLY'));
  console.log('---');

  for (const [site, cms] of Object.entries(SITE_CMS_MAP)) {
    if (targetCms && cms !== targetCms) continue;
    const result = fixSite(site, cms, dryRun);
    if (result.success) {
      console.log((dryRun ? '[DRYRUN]' : '[FIX]') + ' ' + cms + '/' + site);
    }
  }

  console.log('---');
  console.log('Done.');
}

main().catch(console.error);