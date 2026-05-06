import { workflow, node, trigger, ifElse, merge, expr, placeholder, sticky } from '@n8n/workflow-sdk';

// ============================================================
// RSS Feed Cleaner - Batch Processor
// ============================================================
// Este workflow lee feeds RSS, extrae el contenido completo de
// cada artículo, limpia anuncios/scripts/marcas/copyright,
// filtra por calidad, y genera artículos listos para ingestión.
// Output: array de artículos limpios en formato JSON.
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

// ── Configuración del feed ─────────────────────────────────
const feedConfig = node({
  type: 'n8n-nodes-base.set',
  version: 3.4,
  config: {
    name: 'Feed Config',
    position: [540, 300],
    parameters: {
      mode: 'manual',
      assignments: {
        assignments: [
          { id: '1', name: 'feedUrl', value: 'https://www.jornada.com.mx/rss/edicion.xml?v=1', type: 'string' },
          { id: '2', name: 'targetSites', value: 'enfoquemexicano,adnmexicano', type: 'string' },
          { id: '3', name: 'category', value: 'NACIONAL', type: 'string' },
          { id: '4', name: 'maxArticles', value: 4, type: 'number' },
          { id: '5', name: 'feedName', value: 'La Jornada', type: 'string' }
        ]
      }
    }
  },
  output: [{ feedUrl: 'https://www.jornada.com.mx/rss/edicion.xml?v=1', targetSites: 'enfoquemexicano,adnmexicano', category: 'NACIONAL', maxArticles: 4, feedName: 'La Jornada' }]
});

// ── Leer RSS ───────────────────────────────────────────────
const rssRead = node({
  type: 'n8n-nodes-base.rssFeedRead',
  version: 1.2,
  config: {
    name: 'Read RSS Feed',
    position: [840, 300],
    parameters: {
      url: expr('{{ $json.feedUrl }}'),
      options: {
        ignoreSSL: false
      }
    }
  },
  output: [
    { title: 'Ejemplo: AMLO anuncia nuevo programa social', link: 'https://www.jornada.com.mx/2024/01/01/politica/ejemplo.html', pubDate: 'Mon, 01 Jan 2024 10:00:00 GMT', contentSnippet: 'El presidente anunció...', isoDate: '2024-01-01T10:00:00.000Z' },
    { title: 'Ejemplo: Economía mexicana crece 3.2%', link: 'https://www.jornada.com.mx/2024/01/01/economia/ejemplo2.html', pubDate: 'Mon, 01 Jan 2024 09:30:00 GMT', contentSnippet: 'El INEGI reportó...', isoDate: '2024-01-01T09:30:00.000Z' }
  ]
});

// ── Limitar cantidad de artículos ──────────────────────────
const limitArticles = node({
  type: 'n8n-nodes-base.limit',
  version: 1,
  config: {
    name: 'Limitar artículos',
    position: [1140, 300],
    parameters: {
      maxItems: expr('{{ $("Feed Config").item.json.maxArticles }}'),
      keep: 'firstItems'
    }
  },
  output: [
    { title: 'Ejemplo: AMLO anuncia nuevo programa social', link: 'https://www.jornada.com.mx/2024/01/01/politica/ejemplo.html', pubDate: 'Mon, 01 Jan 2024 10:00:00 GMT', contentSnippet: 'El presidente anunció...', isoDate: '2024-01-01T10:00:00.000Z' }
  ]
});

// ── Fetch HTML de cada artículo ────────────────────────────
const fetchArticle = node({
  type: 'n8n-nodes-base.httpRequest',
  version: 4.4,
  config: {
    name: 'Fetch Article HTML',
    position: [1440, 300],
    parameters: {
      method: 'GET',
      url: expr('{{ $json.link }}'),
      sendHeaders: true,
      headerParameters: {
        parameters: [
          { name: 'User-Agent', value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' },
          { name: 'Accept', value: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8' },
          { name: 'Accept-Language', value: 'es-MX,es;q=0.9' }
        ]
      },
      options: {
        response: { responseFormat: 'text', fullResponse: false, neverError: true },
        redirect: { followRedirects: true },
        timeout: 15000,
        batching: { batch: { batchSize: 3, batchInterval: 2000 } }
      }
    }
  },
  output: [{ data: '<html><head><title>AMLO anuncia nuevo programa social | La Jornada</title><meta property="og:image" content="https://example.com/img.jpg"></head><body><div id="cuerpoNota"><p>El presidente Andrés Manuel López Obrador anunció este lunes un nuevo programa social destinado a apoyar a familias de bajos recursos.</p><p>El programa contempla un apoyo mensual de 1,500 pesos para cada beneficiario.</p></div><div class="comentarios">Comentarios</div><script>googletag.cmd.push(function() { googletag.display("div-gpt-ad-123"); });</script></body></html>' }]
});

// ── Extraer y limpiar contenido ────────────────────────────
const cleanArticle = node({
  type: 'n8n-nodes-base.code',
  version: 2,
  config: {
    name: 'Clean Article Content',
    position: [1740, 300],
    parameters: {
      mode: 'runOnceForAllItems',
      language: 'javaScript',
      jsCode: `const rssItems = $('Read RSS Feed').all();
const htmlItems = $input.all();
const config = $('Feed Config').item.json;

return htmlItems.map((item, index) => {
  const html = item.json.data || '';
  const rssItem = rssItems[index]?.json || {};

  // Validar respuesta HTML
  if (!html || html.length < 200) {
    return { json: { isValid: false, reason: 'HTML vacio o muy corto', sourceUrl: rssItem.link } };
  }

  // ── Extraer titulo ──
  let title = rssItem.title || '';
  const ogTitle = html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i);
  if (ogTitle) title = ogTitle[1];
  const titleTag = html.match(/<title>([^<]+)<\\/title>/i);
  if (!title && titleTag) title = titleTag[1].trim();

  // Limpiar prefijos de medios
  const prefixes = [
    /^La\\s+Jornada:\\s*/i, /^El\\s+Informador:\\s*/i, /^Proceso:\\s*/i,
    /^El\\s+Universal:\\s*/i, /^Milenio:\\s*/i, /^Excélsior:\\s*/i,
    /^Expansión:\\s*/i, /^Publimetro:\\s*/i, /^Azteca\\s+Noticias:\\s*/i,
    /^TV\\s+Azteca:\\s*/i, /^El\\s+Economista:\\s*/i, /^24\\s+Horas:\\s*/i
  ];
  for (const p of prefixes) title = title.replace(p, '');
  title = title.replace(/\\s*[\\|\\-]\\s*.+$/g, '').trim();

  // ── Extraer imagen ──
  let imageUrl = '';
  const ogImage = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i);
  if (ogImage) imageUrl = ogImage[1];
  const twImage = html.match(/<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i);
  if (!imageUrl && twImage) imageUrl = twImage[1];
  const jsonLdImage = html.match(/"image"\\s*:\\s*\\[\\s*\\{\\s*"url"\\s*:\\s*"([^"]+)"/i);
  if (!imageUrl && jsonLdImage) imageUrl = jsonLdImage[1];
  // data-src lazy loading
  if (!imageUrl) {
    const dataSrc = html.match(/<img[^>]+data-src=["']([^"']+\\.(?:jpg|jpeg|png|webp|avif))["']/i);
    if (dataSrc) imageUrl = dataSrc[1];
  }
  // primer img grande
  if (!imageUrl) {
    const imgMatch = html.match(/<img[^>]+src=["']([^"']+\\.(?:jpg|jpeg|png|webp|avif))["'][^>]+(?:width|height)=["'][^"']*[5-9]\\d{2,}/i);
    if (imgMatch) imageUrl = imgMatch[1];
  }

  // Normalizar imagen
  if (imageUrl && imageUrl.startsWith('//')) imageUrl = 'https:' + imageUrl;
  if (imageUrl && imageUrl.startsWith('/')) {
    try { imageUrl = new URL(rssItem.link).origin + imageUrl; } catch {}
  }

  // ── Extraer contenido ──
  const extractParagraphs = (block) => {
    if (!block) return '';
    const matches = block.match(/<p[^>]*>([\\s\\S]*?)<\\/p>/g) || [];
    return matches.map(p => p.replace(/<[^>]*>/g, '').trim()).filter(p => p.length > 30).join('\\n\\n');
  };

  const urlLower = (rssItem.link || '').toLowerCase();
  let content = '';

  // Selectores especificos por medio
  const selectors = [
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

  // Fallbacks genericos
  if (!content) {
    const m = html.match(/<article[^>]*>([\\s\\S]*?)<\\/article>/i);
    content = extractParagraphs(m?.[1]);
  }
  if (!content) {
    const pMatches = html.match(/<p[^>]*>([\\s\\S]*?)<\\/p>/g) || [];
    content = pMatches.map(p => p.replace(/<[^>]*>/g, '').trim()).filter(p => p.length > 30).join('\\n\\n');
  }

  // ── Limpieza profunda ──
  function cleanText(text) {
    if (!text) return '';
    let t = text;

    // Decodificar entidades HTML
    t = t.replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, '&')
         .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&nbsp;/g, ' ')
         .replace(/&#39;/g, "'").replace(/&ldquo;/g, '"').replace(/&rdquo;/g, '"')
         .replace(/&lsquo;/g, "'").replace(/&rsquo;/g, "'").replace(/&mdash;/g, '—')
         .replace(/&ndash;/g, '–').replace(/&hellip;/g, '…').replace(/&iexcl;/g, '¡')
         .replace(/&iquest;/g, '¿').replace(/&laquo;/g, '«').replace(/&raquo;/g, '»');

    // Eliminar scripts, estilos, iframes
    t = t.replace(/<script[^>]*>[\\s\\S]*?<\\/script>/gi, '');
    t = t.replace(/<style[^>]*>[\\s\\S]*<\\/style>/gi, '');
    t = t.replace(/<iframe[^>]*>[\\s\\S]*?<\\/iframe>/gi, '');
    t = t.replace(/<noscript[^>]*>[\\s\\S]*?<\\/noscript>/gi, '');
    t = t.replace(/<nav[^>]*>[\\s\\S]*?<\\/nav>/gi, '');
    t = t.replace(/<header[^>]*>[\\s\\S]*?<\\/header>/gi, '');
    t = t.replace(/<footer[^>]*>[\\s\\S]*?<\\/footer>/gi, '');
    t = t.replace(/<aside[^>]*>[\\s\\S]*?<\\/aside>/gi, '');

    // Eliminar anuncios y tracking
    t = t.replace(/googletag\\.cmd\\.push\\([^)]*\\);/gi, '');
    t = t.replace(/googletag\\.display\\([^)]*\\);/gi, '');
    t = t.replace(/div-gpt-ad-[\\w()]+/gi, '');

    // Eliminar marcas de agua, copyright, firmas
    t = t.replace(/\\d{4}\\s*DERECHOS\\s*RESERVADOS.*$/gim, '');
    t = t.replace(/Derechos\\s+de\\s+Autor.*$/gim, '');
    t = t.replace(/©\\s*\\d{4}.*$/gim, '');
    t = t.replace(/todos los derechos reservados/gi, '');
    t = t.replace(/prohibida su reproducción/gi, '');
    t = t.replace(/\\(apro\\)/gi, '');
    t = t.replace(/\\(agencias\\)/gi, '');
    t = t.replace(/\\(ep\\)/gi, '');
    t = t.replace(/EXPANSIÓN.*$/gim, '');
    t = t.replace(/fresas #\\d+, col\\..*$/gim, '');

    // Eliminar secciones de comentarios y relacionadas
    t = t.replace(/Comentarios\\s*$/gm, '');
    t = t.replace(/Más leídas\\s*$/gm, '');
    t = t.replace(/Otras Noticias\\s*$/gm, '');
    t = t.replace(/Últimas noticias\\s*$/gm, '');
    t = t.replace(/te puede interesar/gi, '');
    t = t.replace(/lea también/gi, '');
    t = t.replace(/continuar leyendo/gi, '');

    // Eliminar categorias sueltas
    t = t.replace(/^\\s*(Nacional|Internacional|Economía|Deportes|Cultura|Opinión)\\s*$/gim, '');

    // Eliminar CSS inline y JSON-LD
    t = t.replace(/\\{\\s*"@context".*?\\}/gis, '');
    t = t.replace(/#[\\w-]+\\{[^}]*\\}/gi, '');
    t = t.replace(/\\.[\\w-]+\\{[^}]*\\}/gi, '');

    // Eliminar caracteres corruptos
    const replacementChar = String.fromCharCode(0xFFFD);
    t = t.replace(new RegExp(replacementChar, 'g'), '');
    // Control chars usando hex escapes (funcionan en template literal como caracteres reales)
    t = t.replace(/[\\x00-\\x08\\x0B\\x0C\\x0E-\\x1F\\x7F-\\x9F]/g, '');

    // Normalizar saltos de linea
    t = t.replace(/\\r\\n/g, '\\n');

    // Filtrar lineas por contenido
    const lines = t.split('\\n');
    const filtered = lines.filter(line => {
      const lower = line.toLowerCase().trim();
      const len = line.trim().length;
      if (len < 30 && len > 0) return false;
      if (/^(nacional|internacional|economía|deportes|cultura|opinión)$/i.test(lower)) return false;
      if (lower.includes('expansión') || lower.includes('proceso') || lower.includes('apro')) return false;
      if (lower.includes('derechos reservados') || lower.includes('©')) return false;
      if (lower.includes('comunicación e información')) return false;
      return true;
    });
    t = filtered.join('\\n');

    // Colapsar saltos multiples
    while (t.includes('\\n\\n\\n')) {
      t = t.replace(/\\n\\n\\n/g, '\\n\\n');
    }

    return t.trim();
  }

  content = cleanText(content);

  // ── Validación final ──
  const isImageValid = imageUrl && imageUrl.trim() !== '' && !imageUrl.includes('logo.png') && !imageUrl.includes('undefined');
  const isValid = content.length >= 200 && isImageValid && title.length > 10;

  // Generar slug
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
      sourceUrl: rssItem.link || '',
      sourceTitle: rssItem.title || '',
      publishedAt: rssItem.isoDate || rssItem.pubDate || new Date().toISOString(),
      category: (config.category || 'NACIONAL').toUpperCase(),
      sites: config.targetSites || '',
      author: config.feedName || 'Redacción',
      wordCount: content.split(/\\s+/).filter(Boolean).length,
      isValid,
      reason: isValid ? '' : (content.length < 200 ? 'contenido_corto' : (!isImageValid ? 'sin_imagen' : 'titulo_corto'))
    }
  };
});`
    }
  },
  output: [
    { title: 'AMLO anuncia nuevo programa social', slug: 'amlo-anuncia-nuevo-programa-social', content: 'El presidente Andrés Manuel López Obrador anunció este lunes un nuevo programa social destinado a apoyar a familias de bajos recursos.\n\nEl programa contempla un apoyo mensual de 1,500 pesos para cada beneficiario.', excerpt: 'El presidente Andrés Manuel López Obrador anunció este lunes un nuevo programa social...', imageUrl: 'https://example.com/img.jpg', sourceUrl: 'https://www.jornada.com.mx/2024/01/01/politica/ejemplo.html', publishedAt: '2024-01-01T10:00:00.000Z', category: 'NACIONAL', sites: 'enfoquemexicano,adnmexicano', author: 'La Jornada', wordCount: 35, isValid: true, reason: '' }
  ]
});

// ── Filtrar solo artículos válidos ─────────────────────────
const filterValid = node({
  type: 'n8n-nodes-base.filter',
  version: 2.3,
  config: {
    name: 'Filtrar válidos',
    position: [2040, 300],
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
    { title: 'AMLO anuncia nuevo programa social', slug: 'amlo-anuncia-nuevo-programa-social', content: 'El presidente...', excerpt: 'El presidente...', imageUrl: 'https://example.com/img.jpg', sourceUrl: 'https://www.jornada.com.mx/2024/01/01/politica/ejemplo.html', publishedAt: '2024-01-01T10:00:00.000Z', category: 'NACIONAL', sites: 'enfoquemexicano,adnmexicano', author: 'La Jornada', wordCount: 35, isValid: true, reason: '' }
  ]
});

// ── Formatear output final ─────────────────────────────────
const formatOutput = node({
  type: 'n8n-nodes-base.set',
  version: 3.4,
  config: {
    name: 'Format Output',
    position: [2340, 300],
    parameters: {
      mode: 'manual',
      assignments: {
        assignments: [
          { id: '1', name: 'article', value: expr('{{ { title: $json.title, slug: $json.slug, content: $json.content, excerpt: $json.excerpt, imageUrl: $json.imageUrl, sourceUrl: $json.sourceUrl, publishedAt: $json.publishedAt, category: $json.category, sites: $json.sites, author: $json.author, wordCount: $json.wordCount } }}'), type: 'object' },
          { id: '2', name: 'feedName', value: expr('{{ $("Feed Config").item.json.feedName }}'), type: 'string' },
          { id: '3', name: 'processedAt', value: expr('{{ $now.toISO() }}'), type: 'string' }
        ]
      }
    }
  },
  output: [
    { article: { title: 'AMLO anuncia nuevo programa social', slug: 'amlo-anuncia-nuevo-programa-social', content: 'El presidente...', excerpt: 'El presidente...', imageUrl: 'https://example.com/img.jpg', sourceUrl: 'https://www.jornada.com.mx/2024/01/01/politica/ejemplo.html', publishedAt: '2024-01-01T10:00:00.000Z', category: 'NACIONAL', sites: 'enfoquemexicano,adnmexicano', author: 'La Jornada', wordCount: 35 }, feedName: 'La Jornada', processedAt: '2024-01-01T00:00:00.000Z' }
  ]
});

// ── Agregar nota informativa ───────────────────────────────
const infoNote = sticky(
  '## RSS Feed Cleaner - Output\\n\\nEste workflow genera artículos limpios listos para ingestión.\\n\\n### Output por artículo:\\n- `article`: objeto con título, slug, contenido, excerpt, imagen, URL fuente\\n- `feedName`: nombre del feed origen\\n- `processedAt`: timestamp de procesamiento\\n\\n### Artículos rechazados se marcan con `isValid: false`\\n### Configurar feedUrl, targetSites y category en el nodo "Feed Config"',
  [feedConfig, rssRead, cleanArticle, filterValid, formatOutput],
  { color: 3, position: [540, 60] }
);

// ═══════════════════════════════════════════════════════════
// Compose Workflow
// ═══════════════════════════════════════════════════════════
export default workflow('rss-feed-cleaner-batch', 'RSS Feed Cleaner - Batch Processor')
  .add(scheduleTrigger)
  .to(feedConfig)
  .to(rssRead)
  .to(limitArticles)
  .to(fetchArticle)
  .to(cleanArticle)
  .to(filterValid)
  .to(formatOutput);
