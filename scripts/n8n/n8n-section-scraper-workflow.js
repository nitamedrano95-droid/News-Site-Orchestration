import { workflow, node, trigger, expr, sticky, merge } from '@n8n/workflow-sdk';

// ============================================================
// Section Scraper - Sites without RSS
// ============================================================
// Para sitios que NO tienen feed RSS disponible (ej: El Universal).
// Scrapes la pagina de seccion (ej: /minuto-x-minuto/),
// extrae los links de articulos, luego scrapea cada uno,
// limpia el contenido y genera output estructurado.
// ============================================================

// ── Trigger: cada 30 minutos ───────────────────────────────
const scheduleTrigger = trigger({
  type: 'n8n-nodes-base.scheduleTrigger',
  version: 1.3,
  config: {
    name: 'Cada 30 minutos',
    position: [240, 300],
    parameters: {
      rule: {
        interval: [{
          field: 'minutes',
          minutesInterval: 30
        }]
      }
    }
  },
  output: [{ timestamp: '2024-01-01T00:00:00Z' }]
});

// ── Configuracion de la seccion ────────────────────────────
const sectionConfig = node({
  type: 'n8n-nodes-base.set',
  version: 3.4,
  config: {
    name: 'Section Config',
    position: [540, 300],
    parameters: {
      mode: 'manual',
      assignments: {
        assignments: [
          { id: '1', name: 'sectionUrl', value: 'https://www.eluniversal.com.mx/minuto-x-minuto/', type: 'string' },
          { id: '2', name: 'targetSites', value: 'enfoquemexicano,adnmexicano', type: 'string' },
          { id: '3', name: 'category', value: 'NACIONAL', type: 'string' },
          { id: '4', name: 'maxArticles', value: 4, type: 'number' },
          { id: '5', name: 'sourceName', value: 'El Universal', type: 'string' },
          { id: '6', name: 'domain', value: 'https://www.eluniversal.com.mx', type: 'string' }
        ]
      }
    }
  },
  output: [{ sectionUrl: 'https://www.eluniversal.com.mx/minuto-x-minuto/', targetSites: 'enfoquemexicano,adnmexicano', category: 'NACIONAL', maxArticles: 4, sourceName: 'El Universal', domain: 'https://www.eluniversal.com.mx' }]
});

// ── Fetch HTML de la seccion ───────────────────────────────
const fetchSection = node({
  type: 'n8n-nodes-base.httpRequest',
  version: 4.4,
  config: {
    name: 'Fetch Section HTML',
    position: [840, 300],
    parameters: {
      method: 'GET',
      url: expr('{{ $json.sectionUrl }}'),
      sendHeaders: true,
      headerParameters: {
        parameters: [
          { name: 'User-Agent', value: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36' },
          { name: 'Accept', value: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8' },
          { name: 'Accept-Language', value: 'es-MX,es;q=0.9,en;q=0.8' },
          { name: 'Accept-Encoding', value: 'gzip, deflate, br' },
          { name: 'Cache-Control', value: 'max-age=0' },
          { name: 'Sec-Ch-Ua', value: '"Google Chrome";v="125", "Chromium";v="125", "Not.A/Brand";v="24"' },
          { name: 'Sec-Ch-Ua-Mobile', value: '?0' },
          { name: 'Sec-Ch-Ua-Platform', value: '"macOS"' },
          { name: 'Sec-Fetch-Dest', value: 'document' },
          { name: 'Sec-Fetch-Mode', value: 'navigate' },
          { name: 'Sec-Fetch-Site', value: 'none' },
          { name: 'Sec-Fetch-User', value: '?1' },
          { name: 'Upgrade-Insecure-Requests', value: '1' }
        ]
      },
      options: {
        response: { responseFormat: 'text', fullResponse: false, neverError: true },
        redirect: { followRedirects: true },
        timeout: 20000
      }
    }
  },
  output: [{ data: '<html><body><article class="card"><a href="/nacion/politica/amlo-anuncia-programa-2024/"><h2>AMLO anuncia programa social</h2></a></article></body></html>' }]
});

// ── Extraer links de articulos ─────────────────────────────
const extractLinks = node({
  type: 'n8n-nodes-base.code',
  version: 2,
  config: {
    name: 'Extract Article Links',
    position: [1140, 300],
    parameters: {
      mode: 'runOnceForAllItems',
      language: 'javaScript',
      jsCode: `const html = ($json.data || '').toString();
const config = $('Section Config').item.json;
const domain = config.domain || new URL(config.sectionUrl).origin;
const domainOrigin = new URL(domain).origin;

const debug = {
  htmlLength: html.length,
  htmlStartsWith: html.substring(0, 200),
  hrefMatches: 0,
  afterOriginFilter: 0,
  afterPathFilter: 0,
  finalCount: 0,
  strategies: []
};

const links = new Set();

// ESTRATEGIA 1: href estandar
const hrefRegex = /href\s*=\s*["']([^"'#?]+)["']/gi;
let m;
while ((m = hrefRegex.exec(html)) !== null) {
  debug.hrefMatches++;
  let href = m[1].trim();
  if (href.startsWith('//')) href = 'https:' + href;
  if (href.startsWith('/')) href = domainOrigin + href;
  if (!href.startsWith('http')) continue;
  try {
    const u = new URL(href);
    if (u.origin !== domainOrigin) continue;
    links.add(href);
  } catch (e) { /* skip invalid */ }
}
debug.strategies.push({ name: 'href_regex', count: links.size });
debug.afterOriginFilter = links.size;

// ESTRATEGIA 2: URLs sueltas del dominio en el HTML
if (links.size === 0) {
  let idx = html.indexOf(domainOrigin);
  while (idx !== -1) {
    const start = idx + domainOrigin.length;
    let end = start;
    while (end < html.length && /[^"'< >\s]/.test(html[end])) end++;
    const path = html.substring(start, end);
    if (path.length > 6) {
      try {
        const fullUrl = domainOrigin + path;
        const u = new URL(fullUrl);
        if (u.origin === domainOrigin) links.add(fullUrl);
      } catch (e) { }
    }
    idx = html.indexOf(domainOrigin, idx + 1);
  }
  debug.strategies.push({ name: 'loose_domain_urls', count: links.size });
}

// ESTRATEGIA 3: data-* attributes
const dataUrlRegex = /data-(?:href|url|link|permalink)\s*=\s*["']([^"']+)["']/gi;
while ((m = dataUrlRegex.exec(html)) !== null) {
  let href = m[1].trim();
  if (href.startsWith('//')) href = 'https:' + href;
  if (href.startsWith('/')) href = domainOrigin + href;
  if (!href.startsWith('http')) continue;
  try {
    const u = new URL(href);
    if (u.origin === domainOrigin) links.add(href);
  } catch (e) { }
}
debug.strategies.push({ name: 'data_attributes', count: links.size });

// ESTRATEGIA 4: JSON incrustado en scripts
const scriptBlocks = html.match(/<script[^>]*>([\s\S]*?)<\\/script>/gi) || [];
for (const block of scriptBlocks) {
  const urlMatches = block.match(/"(https?:\\/\\/[^"]+)"/g) || [];
  for (const um of urlMatches) {
    let href = um.replace(/^"|"$/g, '');
    if (href.indexOf(domainOrigin) === 0) {
      try {
        const u = new URL(href);
        if (u.origin === domainOrigin) links.add(href);
      } catch (e) { }
    }
  }
}
debug.strategies.push({ name: 'script_json', count: links.size });

// FILTROS
const filtered = [];
for (const href of links) {
  try {
    const u = new URL(href);
    const path = u.pathname;
    if (path.length < 6) continue;
    const pathLower = path.toLowerCase();
    const excluded = ['tag', 'search', 'buscar', 'rss', 'feed', 'sitemap', 'robots', 'author', 'contribuidor', 'page', 'pagina', 'video', 'foto', 'galeria', 'autor', 'categoria', 'category'];
    if (excluded.some(function(e) { return pathLower.indexOf('/' + e + '/') !== -1; })) continue;
    const exts = ['.css', '.js', '.xml', '.json', '.jpg', '.jpeg', '.png', '.gif', '.webp', '.pdf', '.svg', '.ico'];
    if (exts.some(function(ext) { return pathLower.endsWith(ext); })) continue;
    filtered.push(href);
  } catch (e) { }
}
debug.afterPathFilter = filtered.length;

// PRIORIZAR: links que parecen articulos
const articlePatterns = [
  /(\\d{4})[\\/-](\\d{2})[\\/-](\\d{2})/,
  /[\\/-]\\d{4}[\\/-]/,
  /[\\/-][a-z0-9-]{10,}[\\/-]?/
];
const scored = filtered.map(function(href) {
  const path = new URL(href).pathname;
  let score = 0;
  if (articlePatterns.some(function(p) { return p.test(path); })) score += 10;
  if (path.split('/').filter(Boolean).length >= 3) score += 5;
  if (path.length > 30) score += 3;
  return { href, score };
});
scored.sort(function(a, b) { return b.score - a.score; });

const result = scored.slice(0, config.maxArticles || 4).map(function(s) { return s.href; });
debug.finalCount = result.length;
debug.sampleLinks = result.slice(0, 3);

return [{
  json: {
    articleLinks: result,
    totalFound: filtered.length,
    sectionUrl: config.sectionUrl,
    sourceName: config.sourceName,
    targetSites: config.targetSites,
    category: config.category,
    domain: config.domain,
    debug: debug
  }
}];`
    }
  },
  output: [{ articleLinks: ['https://www.eluniversal.com.mx/nacion/politica/amlo-anuncia-programa-2024/'], totalFound: 1, sectionUrl: 'https://www.eluniversal.com.mx/minuto-x-minuto/', sourceName: 'El Universal', targetSites: 'enfoquemexicano,adnmexicano', category: 'NACIONAL', domain: 'https://www.eluniversal.com.mx', debug: {} }]
});

// ── Split links into individual items ──────────────────────
const splitLinks = node({
  type: 'n8n-nodes-base.splitOut',
  version: 1,
  config: {
    name: 'Split Links',
    position: [1440, 300],
    parameters: {
      fieldToSplitOut: 'articleLinks',
      include: 'allOtherFields'
    }
  },
  output: [
    { articleLinks: 'https://www.eluniversal.com.mx/nacion/politica/amlo-anuncia-programa-2024/', totalFound: 1, sectionUrl: 'https://www.eluniversal.com.mx/minuto-x-minuto/', sourceName: 'El Universal', targetSites: 'enfoquemexicano,adnmexicano', category: 'NACIONAL', domain: 'https://www.eluniversal.com.mx' }
  ]
});

// ── Fetch HTML de cada articulo ────────────────────────────
const fetchArticle = node({
  type: 'n8n-nodes-base.httpRequest',
  version: 4.4,
  config: {
    name: 'Fetch Article HTML',
    position: [1740, 300],
    parameters: {
      method: 'GET',
      url: expr('{{ $json.articleLinks }}'),
      sendHeaders: true,
      headerParameters: {
        parameters: [
          { name: 'User-Agent', value: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36' },
          { name: 'Accept', value: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8' },
          { name: 'Accept-Language', value: 'es-MX,es;q=0.9,en;q=0.8' },
          { name: 'Accept-Encoding', value: 'gzip, deflate, br' },
          { name: 'Sec-Ch-Ua', value: '"Google Chrome";v="125", "Chromium";v="125", "Not.A/Brand";v="24"' },
          { name: 'Sec-Ch-Ua-Mobile', value: '?0' },
          { name: 'Sec-Ch-Ua-Platform', value: '"macOS"' },
          { name: 'Sec-Fetch-Dest', value: 'document' },
          { name: 'Sec-Fetch-Mode', value: 'navigate' },
          { name: 'Sec-Fetch-Site', value: 'none' },
          { name: 'Sec-Fetch-User', value: '?1' },
          { name: 'Upgrade-Insecure-Requests', value: '1' }
        ]
      },
      options: {
        response: { responseFormat: 'text', fullResponse: false, neverError: true },
        redirect: { followRedirects: true },
        timeout: 20000,
        batching: { batch: { batchSize: 3, batchInterval: 2000 } }
      }
    }
  },
  output: [{ data: '<html><head><title>AMLO anuncia nuevo programa social | El Universal</title><meta property="og:image" content="https://www.eluniversal.com.mx/sites/default/files/styles/fcs_8x7/public/2024/01/01/amlo.jpg"></head><body><div class="field--name-body"><p>El presidente Andres Manuel Lopez Obrador anuncio este lunes un nuevo programa social.</p></div></body></html>' }]
});

// ── Extraer y limpiar contenido ────────────────────────────
const cleanArticle = node({
  type: 'n8n-nodes-base.code',
  version: 2,
  config: {
    name: 'Clean Article Content',
    position: [2040, 300],
    parameters: {
      mode: 'runOnceForAllItems',
      language: 'javaScript',
      jsCode: `const items = $input.all();

return items.map((item) => {
  const html = item.json.data || '';
  const sourceName = item.json.sourceName || 'Redaccion';
  const sourceUrl = item.json.articleLinks || '';
  const category = (item.json.category || 'NACIONAL').toUpperCase();
  const sites = item.json.targetSites || '';

  if (!html || html.length < 200) {
    return { json: { isValid: false, reason: 'HTML vacio o muy corto', sourceUrl } };
  }

  // ── Extraer publishedAt del HTML (fix fecha siempre = now) ──
  // Busca en orden: Open Graph article:published_time, JSON-LD datePublished,
  // meta tag con itemprop datePublished, <time datetime="...">.
  // Si nada parsea, fallback a now (preserva el comportamiento original).
  const fallbackNow = new Date().toISOString();
  let extractedPublishedAt = null;
  const datePatterns = [
    /<meta[^>]+property=["']article:published_time["'][^>]+content=["']([^"']+)["']/i,
    /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']article:published_time["']/i,
    /<meta[^>]+property=["']og:article:published_time["'][^>]+content=["']([^"']+)["']/i,
    /<meta[^>]+name=["']datePublished["'][^>]+content=["']([^"']+)["']/i,
    /<meta[^>]+itemprop=["']datePublished["'][^>]+content=["']([^"']+)["']/i,
    /"datePublished"\s*:\s*"([^"]+)"/i,
    /<time[^>]+datetime=["']([^"']+)["']/i,
  ];
  for (const pat of datePatterns) {
    const m = html.match(pat);
    if (m && m[1]) {
      const d = new Date(m[1]);
      if (!isNaN(d.getTime())) {
        extractedPublishedAt = d.toISOString();
        break;
      }
    }
  }

  // Extraer titulo
  let title = '';
  const ogTitle = html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i);
  if (ogTitle) title = ogTitle[1];
  const titleTag = html.match(/<title>([^<]+)<\\/title>/i);
  if (!title && titleTag) title = titleTag[1].trim();
  const h1Match = html.match(/<h1[^>]*>([\\s\\S]*?)<\\/h1>/i);
  if (!title && h1Match) title = h1Match[1].replace(/<[^>]*>/g, '').trim();

  // Limpiar prefijos de medios
  const prefixes = [
    /^El\\s+Universal:\\s*/i, /^La\\s+Jornada:\\s*/i, /^El\\s+Informador:\\s*/i,
    /^Proceso:\\s*/i, /^Milenio:\\s*/i, /^Excelsior:\\s*/i,
    /^Expansion:\\s*/i, /^Publimetro:\\s*/i, /^Azteca\\s+Noticias:\\s*/i
  ];
  for (const p of prefixes) title = title.replace(p, '');
  title = title.replace(/\\s*[\\|\\-]\\s*.+$/g, '').trim();

  // Extraer imagen
  let imageUrl = '';
  const ogImage = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i);
  if (ogImage) imageUrl = ogImage[1];
  const twImage = html.match(/<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i);
  if (!imageUrl && twImage) imageUrl = twImage[1];
  const jsonLdImage = html.match(/"image"\\s*:\\s*\\[\\s*\\{\\s*"url"\\s*:\\s*"([^"]+)"/i);
  if (!imageUrl && jsonLdImage) imageUrl = jsonLdImage[1];
  if (!imageUrl) {
    const dataSrc = html.match(/<img[^>]+data-src=["']([^"']+\\.(?:jpg|jpeg|png|webp|avif))["']/i);
    if (dataSrc) imageUrl = dataSrc[1];
  }
  if (!imageUrl) {
    const imgMatch = html.match(/<img[^>]+src=["']([^"']+\\.(?:jpg|jpeg|png|webp|avif))["'][^>]+(?:width|height)=["'][^"']*[5-9]\\d{2,}/i);
    if (imgMatch) imageUrl = imgMatch[1];
  }

  if (imageUrl && imageUrl.startsWith('//')) imageUrl = 'https:' + imageUrl;
  if (imageUrl && imageUrl.startsWith('/')) {
    try { imageUrl = new URL(sourceUrl).origin + imageUrl; } catch {}
  }

  // Extraer contenido
  const extractParagraphs = (block) => {
    if (!block) return '';
    const matches = block.match(/<p[^>]*>([\\s\\S]*?)<\\/p>/g) || [];
    return matches.map(p => p.replace(/<[^>]*>/g, '').trim()).filter(p => p.length > 30).join('\\n\\n');
  };

  const urlLower = sourceUrl.toLowerCase();
  let content = '';

  const selectors = [
    { test: /eluniversal\\.com\\.mx/i,    regex: /<div[^>]+class=["'][^"']*field--name-body[^"']*["'][^>]*>([\\s\\S]*?)<\\/div>/i },
    { test: /jornada\\.com\\.mx/i,       regex: /<div[^>]+id=["']cuerpoNota["'][^>]*>([\\s\\S]*?)<\\/div>/i },
    { test: /informador\\.mx/i,           regex: /<div[^>]+class=["'][^"']*field-name-body[^"']*["'][^>]*>([\\s\\S]*?)<\\/div>/i },
    { test: /proceso\\.com\\.mx/i,       regex: /<div[^>]+class=["'][^"']*entry-content[^"']*["'][^>]*>([\\s\\S]*?)<\\/div>/i },
    { test: /expansion\\.mx/i,            regex: /<div[^>]+class=["'][^"']*article-body[^"']*["'][^>]*>([\\s\\S]*?)<\\/div>/i },
    { test: /infobae\\.com/i,             regex: /<article[^>]*>([\\s\\S]*?)<\\/article>/i },
    { test: /reforma\\.com/i,             regex: /<div[^>]+id=["']cuerpoNota["'][^>]*>([\\s\\S]*?)<\\/div>/i },
    { test: /aristeguinoticias\\.com/i,   regex: /<div[^>]+class=["'][^"']*entry-content[^"']*["'][^>]*>([\\s\\S]*?)<\\/div>/i },
    { test: /dw\\.com/i,                  regex: /<div[^>]+class=["'][^"']*longText[^"']*["'][^>]*>([\\s\\S]*?)<\\/div>/i },
    { test: /france24\\.com/i,            regex: /<article[^>]*>([\\s\\S]*?)<\\/article>/i }
  ];

  for (const sel of selectors) {
    if (sel.test.test(urlLower)) {
      const m = html.match(sel.regex);
      content = extractParagraphs(m?.[1]);
      break;
    }
  }

  if (!content) {
    const m = html.match(/<article[^>]*>([\\s\\S]*?)<\\/article>/i);
    content = extractParagraphs(m?.[1]);
  }
  if (!content) {
    const pMatches = html.match(/<p[^>]*>([\\s\\S]*?)<\\/p>/g) || [];
    content = pMatches.map(p => p.replace(/<[^>]*>/g, '').trim()).filter(p => p.length > 30).join('\\n\\n');
  }

  // Limpieza profunda
  function cleanText(text) {
    if (!text) return '';
    let t = text;
    t = t.replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, '&')
         .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&nbsp;/g, ' ')
         .replace(/&#39;/g, "'").replace(/&ldquo;/g, '"').replace(/&rdquo;/g, '"')
         .replace(/&lsquo;/g, "'").replace(/&rsquo;/g, "'").replace(/&mdash;/g, '—')
         .replace(/&ndash;/g, '–').replace(/&hellip;/g, '…').replace(/&iexcl;/g, '¡')
         .replace(/&iquest;/g, '¿').replace(/&laquo;/g, '«').replace(/&raquo;/g, '»');
    t = t.replace(/<script[^>]*>[\\s\\S]*?<\\/script>/gi, '');
    t = t.replace(/<style[^>]*>[\\s\\S]*<\\/style>/gi, '');
    t = t.replace(/<iframe[^>]*>[\\s\\S]*?<\\/iframe>/gi, '');
    t = t.replace(/<noscript[^>]*>[\\s\\S]*?<\\/noscript>/gi, '');
    t = t.replace(/<nav[^>]*>[\\s\\S]*?<\\/nav>/gi, '');
    t = t.replace(/<header[^>]*>[\\s\\S]*?<\\/header>/gi, '');
    t = t.replace(/<footer[^>]*>[\\s\\S]*?<\\/footer>/gi, '');
    t = t.replace(/<aside[^>]*>[\\s\\S]*?<\\/aside>/gi, '');
    t = t.replace(/googletag\\.cmd\\.push\\([^)]*\\);/gi, '');
    t = t.replace(/googletag\\.display\\([^)]*\\);/gi, '');
    t = t.replace(/div-gpt-ad-[\\w()]+/gi, '');
    t = t.replace(/\\d{4}\\s*DERECHOS\\s*RESERVADAS.*$/gim, '');
    t = t.replace(/Derechos\\s+de\\s+Autor.*$/gim, '');
    t = t.replace(/©\\s*\\d{4}.*$/gim, '');
    t = t.replace(/todos los derechos reservados/gi, '');
    t = t.replace(/prohibida su reproduccion/gi, '');
    t = t.replace(/\\(apro\\)/gi, '');
    t = t.replace(/\\(agencias\\)/gi, '');
    t = t.replace(/\\(ep\\)/gi, '');
    t = t.replace(/EXPANSION.*$/gim, '');
    t = t.replace(/fresas #\\d+, col\\..*$/gim, '');
    t = t.replace(/Comentarios\\s*$/gm, '');
    t = t.replace(/Mas leidas\\s*$/gm, '');
    t = t.replace(/Otras Noticias\\s*$/gm, '');
    t = t.replace(/Ultimas noticias\\s*$/gm, '');
    t = t.replace(/te puede interesar/gi, '');
    t = t.replace(/lea tambien/gi, '');
    t = t.replace(/continuar leyendo/gi, '');
    t = t.replace(/^\\s*(Nacional|Internacional|Economia|Deportes|Cultura|Opinion)\\s*$/gim, '');
    t = t.replace(/\\{\\s*"@context".*?\\}/gis, '');
    t = t.replace(/#[\\w-]+\\{[^}]*\\}/gi, '');
    t = t.replace(/\\.[\\w-]+\\{[^}]*\\}/gi, '');
    const replacementChar = String.fromCharCode(0xFFFD);
    t = t.replace(new RegExp(replacementChar, 'g'), '');
    t = t.replace(/[\\x00-\\x08\\x0B\\x0C\\x0E-\\x1F\\x7F-\\x9F]/g, '');
    t = t.replace(/\\r\\n/g, '\\n');
    const lines = t.split('\\n');
    const filtered = lines.filter(line => {
      const lower = line.toLowerCase().trim();
      const len = line.trim().length;
      if (len < 30 && len > 0) return false;
      if (/^(nacional|internacional|economia|deportes|cultura|opinion)$/i.test(lower)) return false;
      if (lower.includes('expansion') || lower.includes('proceso') || lower.includes('apro')) return false;
      if (lower.includes('derechos reservados') || lower.includes('©')) return false;
      if (lower.includes('comunicacion e informacion')) return false;
      return true;
    });
    t = filtered.join('\\n');
    while (t.includes('\\n\\n\\n')) {
      t = t.replace(/\\n\\n\\n/g, '\\n\\n');
    }
    return t.trim();
  }

  content = cleanText(content);

  const isImageValid = imageUrl && imageUrl.trim() !== '' && !imageUrl.includes('logo.png') && !imageUrl.includes('undefined');
  const isValid = content.length >= 200 && isImageValid && title.length > 10;

  const slugBase = title.toLowerCase().trim()
    .replace(/[áàäâã]/g, 'a').replace(/[éèëê]/g, 'e').replace(/[íìïî]/g, 'i')
    .replace(/[óòöôõ]/g, 'o').replace(/[úùüû]/g, 'u').replace(/[ñ]/g, 'n')
    .replace(/[ç]/g, 'c').replace(/\\s+/g, '-').replace(/[^\\w\\-]+/g, '')
    .replace(/\\-\\-+/g, '-').replace(/^-+/, '').replace(/-+$/, '').substring(0, 100);

  const slug = slugBase || 'articulo-' + Date.now();

  return {
    json: {
      title,
      slug,
      content,
      excerpt: content.substring(0, 200) + (content.length > 200 ? '...' : ''),
      imageUrl: isImageValid ? imageUrl : '',
      sourceUrl,
      publishedAt: extractedPublishedAt || fallbackNow,
      category,
      sites,
      author: sourceName,
      wordCount: content.split(/\\s+/).filter(Boolean).length,
      isValid,
      reason: isValid ? '' : (content.length < 200 ? 'contenido_corto' : (!isImageValid ? 'sin_imagen' : 'titulo_corto'))
    }
  };
});`
    }
  },
  output: [
    { title: 'AMLO anuncia nuevo programa social', slug: 'amlo-anuncia-nuevo-programa-social', content: 'El presidente...', excerpt: 'El presidente...', imageUrl: 'https://www.eluniversal.com.mx/sites/default/files/styles/fcs_8x7/public/2024/01/01/amlo.jpg', sourceUrl: 'https://www.eluniversal.com.mx/nacion/politica/amlo-anuncia-programa-2024/', category: 'NACIONAL', sites: 'enfoquemexicano,adnmexicano', author: 'El Universal', wordCount: 35, isValid: true, reason: '' }
  ]
});

// ── Filtrar solo articulos validos ─────────────────────────
const filterValid = node({
  type: 'n8n-nodes-base.filter',
  version: 2.3,
  config: {
    name: 'Filtrar validos',
    position: [2340, 300],
    parameters: {
      conditions: {
        combinator: 'and',
        options: { caseSensitive: false, leftValue: '', typeValidation: 'strict', version: 2 },
        conditions: [
          { leftValue: '={{ $json.isValid }}', operator: { type: 'boolean', operation: 'equals' }, rightValue: true }
        ]
      }
    }
  },
  output: [
    { title: 'AMLO anuncia nuevo programa social', slug: 'amlo-anuncia-nuevo-programa-social', content: 'El presidente...', excerpt: 'El presidente...', imageUrl: 'https://www.eluniversal.com.mx/sites/default/files/styles/fcs_8x7/public/2024/01/01/amlo.jpg', sourceUrl: 'https://www.eluniversal.com.mx/nacion/politica/amlo-anuncia-programa-2024/', category: 'NACIONAL', sites: 'enfoquemexicano,adnmexicano', author: 'El Universal', wordCount: 35, isValid: true, reason: '' }
  ]
});

// ── Formatear output final ─────────────────────────────────
const formatOutput = node({
  type: 'n8n-nodes-base.set',
  version: 3.4,
  config: {
    name: 'Format Output',
    position: [2640, 300],
    parameters: {
      mode: 'manual',
      assignments: {
        assignments: [
          { id: '1', name: 'article', value: expr('{{ { title: $json.title, slug: $json.slug, content: $json.content, excerpt: $json.excerpt, imageUrl: $json.imageUrl, sourceUrl: $json.sourceUrl, publishedAt: $json.publishedAt, category: $json.category, sites: $json.sites, author: $json.author, wordCount: $json.wordCount } }}'), type: 'object' },
          { id: '2', name: 'sourceName', value: expr('{{ $json.author }}'), type: 'string' },
          { id: '3', name: 'processedAt', value: expr('{{ $now.toISO() }}'), type: 'string' }
        ]
      }
    }
  },
  output: [
    { article: { title: 'AMLO anuncia nuevo programa social', slug: 'amlo-anuncia-nuevo-programa-social', content: 'El presidente...', excerpt: 'El presidente...', imageUrl: 'https://www.eluniversal.com.mx/sites/default/files/styles/fcs_8x7/public/2024/01/01/amlo.jpg', sourceUrl: 'https://www.eluniversal.com.mx/nacion/politica/amlo-anuncia-programa-2024/', publishedAt: '2024-01-01T00:00:00.000Z', category: 'NACIONAL', sites: 'enfoquemexicano,adnmexicano', author: 'El Universal', wordCount: 35 }, sourceName: 'El Universal', processedAt: '2024-01-01T00:00:00.000Z' }
  ]
});

// ── Nota informativa ───────────────────────────────────────
const infoNote = sticky(
  '## Section Scraper - Sin RSS\\n\\nPara sitios que no tienen feed RSS (ej: El Universal).\\n\\n### Flujo:\\n1. Scrapea la pagina de seccion (ej: /minuto-x-minuto/)\\n2. Extrae todos los links de articulos del HTML\\n3. Filtra por calidad (excluye tags, busquedas, galerias, etc)\\n4. Scrapea cada articulo individualmente\\n5. Limpia y valida el contenido\\n\\n### Configurar en "Section Config":\\n- `sectionUrl`: URL de la pagina de seccion\\n- `targetSites`: slugs de sitios destino separados por coma\\n- `category`: NACIONAL, INTERNACIONAL, etc\\n- `maxArticles`: cuantos articulos procesar por ejecucion\\n- `sourceName`: nombre del medio\\n- `domain`: dominio base para normalizar URLs relativas',
  [sectionConfig, extractLinks, cleanArticle, filterValid, formatOutput],
  { color: 4, position: [540, 60] }
);

// Compose Workflow
export default workflow('section-scraper-no-rss', 'Section Scraper - No RSS')
  .add(scheduleTrigger)
  .to(sectionConfig)
  .to(fetchSection)
  .to(extractLinks)
  .to(splitLinks)
  .to(fetchArticle)
  .to(cleanArticle)
  .to(filterValid)
  .to(formatOutput);
