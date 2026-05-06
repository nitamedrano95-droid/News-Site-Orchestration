import { workflow, node, trigger, ifElse, expr, sticky } from '@n8n/workflow-sdk';

// ============================================================
// Article Cleaner Service (Webhook)
// ============================================================
// Servicio on-demand: recibe un artículo "sucio" vía webhook
// (title, html, url, imageUrl opcional), limpia el contenido,
// quita anuncios/scripts/marcas/copyright, y devuelve el
// artículo limpio como JSON.
// ============================================================

// ── Webhook Trigger ────────────────────────────────────────
const webhookTrigger = trigger({
  type: 'n8n-nodes-base.webhook',
  version: 2.1,
  config: {
    name: 'Article Cleaner Webhook',
    position: [240, 300],
    parameters: {
      httpMethod: 'POST',
      path: 'clean-article',
      responseMode: 'responseNode',
      options: {}
    }
  },
  output: [{
    body: {
      title: 'AMLO anuncia nuevo programa social',
      html: '<html><body><div id="cuerpoNota"><p>El presidente anunció...</p></div><script>googletag.cmd.push...</script></body></html>',
      url: 'https://www.jornada.com.mx/2024/01/01/politica/ejemplo.html',
      imageUrl: '',
      category: 'NACIONAL',
      sites: 'enfoquemexicano',
      sourceName: 'La Jornada'
    },
    headers: { 'content-type': 'application/json' }
  }]
});

// ── Validar payload ────────────────────────────────────────
const validatePayload = node({
  type: 'n8n-nodes-base.code',
  version: 2,
  config: {
    name: 'Validate Payload',
    position: [540, 300],
    parameters: {
      mode: 'runOnceForAllItems',
      language: 'javaScript',
      jsCode: `const body = $json.body || {};
const errors = [];
if (!body.title || body.title.trim().length < 5) errors.push('title requerido (min 5 chars)');
if (!body.html || body.html.trim().length < 100) errors.push('html requerido (min 100 chars)');
if (!body.url || !body.url.startsWith('http')) errors.push('url valida requerida');

return [{
  json: {
    title: body.title || '',
    html: body.html || '',
    url: body.url || '',
    imageUrl: body.imageUrl || '',
    category: (body.category || 'NACIONAL').toUpperCase(),
    sites: body.sites || '',
    sourceName: body.sourceName || 'Redacción',
    isValid: errors.length === 0,
    errors
  }
}];`
    }
  },
  output: [{ title: 'AMLO anuncia nuevo programa social', html: '<html>...</html>', url: 'https://www.jornada.com.mx/2024/01/01/politica/ejemplo.html', imageUrl: '', category: 'NACIONAL', sites: 'enfoquemexicano', sourceName: 'La Jornada', isValid: true, errors: [] }]
});

// ── Check payload válido ───────────────────────────────────
const checkPayload = ifElse({
  version: 2.3,
  config: {
    name: 'Payload válido?',
    position: [840, 300],
    parameters: {
      conditions: {
        combinator: 'and',
        options: { caseSensitive: false, leftValue: '', typeValidation: 'strict', version: 2 },
        conditions: [
          { leftValue: '={{ $json.isValid }}', operator: { type: 'boolean', operation: 'equals' }, rightValue: true }
        ]
      }
    }
  }
});

// ── Limpiar contenido ──────────────────────────────────────
const cleanContent = node({
  type: 'n8n-nodes-base.code',
  version: 2,
  config: {
    name: 'Clean Content',
    position: [1140, 200],
    parameters: {
      mode: 'runOnceForAllItems',
      language: 'javaScript',
      jsCode: `const input = $json;
const html = input.html || '';

// ── Extraer titulo ──
let title = input.title || '';
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

// ── Extraer imagen si no viene en payload ──
let imageUrl = input.imageUrl || '';
if (!imageUrl) {
  const ogImage = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i);
  if (ogImage) imageUrl = ogImage[1];
  const twImage = html.match(/<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i);
  if (!imageUrl && twImage) imageUrl = twImage[1];
}
if (imageUrl && imageUrl.startsWith('//')) imageUrl = 'https:' + imageUrl;
if (imageUrl && imageUrl.startsWith('/')) {
  try { imageUrl = new URL(input.url).origin + imageUrl; } catch {}
}

// ── Extraer contenido ──
const extractParagraphs = (block) => {
  if (!block) return '';
  const matches = block.match(/<p[^>]*>([\\s\\S]*?)<\\/p>/g) || [];
  return matches.map(p => p.replace(/<[^>]*>/g, '').trim()).filter(p => p.length > 30).join('\\n\\n');
};

const urlLower = (input.url || '').toLowerCase();
let content = '';

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
  t = t.replace(/Comentarios\\s*$/gm, '');
  t = t.replace(/Más leídas\\s*$/gm, '');
  t = t.replace(/Otras Noticias\\s*$/gm, '');
  t = t.replace(/Últimas noticias\\s*$/gm, '');
  t = t.replace(/te puede interesar/gi, '');
  t = t.replace(/lea también/gi, '');
  t = t.replace(/continuar leyendo/gi, '');
  t = t.replace(/^\\s*(Nacional|Internacional|Economía|Deportes|Cultura|Opinión)\\s*$/gim, '');
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
    if (/^(nacional|internacional|economía|deportes|cultura|opinión)$/i.test(lower)) return false;
    if (lower.includes('expansión') || lower.includes('proceso') || lower.includes('apro')) return false;
    if (lower.includes('derechos reservados') || lower.includes('©')) return false;
    if (lower.includes('comunicación e información')) return false;
    return true;
  });
  t = filtered.join('\\n');
  while (t.includes('\\n\\n\\n')) {
    t = t.replace(/\\n\\n\\n/g, '\\n\\n');
  }
  return t.trim();
}

content = cleanText(content);

// ── Generar slug ──
const slugBase = title.toLowerCase().trim()
  .replace(/[áàäâã]/g, 'a').replace(/[éèëê]/g, 'e').replace(/[íìïî]/g, 'i')
  .replace(/[óòöôõ]/g, 'o').replace(/[úùüû]/g, 'u').replace(/[ñ]/g, 'n')
  .replace(/[ç]/g, 'c').replace(/\\s+/g, '-').replace(/[^\\w\\-]+/g, '')
  .replace(/\\-\\-+/g, '-').replace(/^-+/, '').replace(/-+$/, '').substring(0, 100);
const slug = slugBase || 'articulo-' + Date.now();

return [{
  json: {
    title,
    slug,
    content,
    excerpt: content.substring(0, 200) + (content.length > 200 ? '...' : ''),
    imageUrl: imageUrl || '',
    sourceUrl: input.url,
    category: input.category,
    sites: input.sites,
    author: input.sourceName,
    wordCount: content.split(/\\s+/).filter(Boolean).length,
    cleaned: true,
    processedAt: new Date().toISOString()
  }
}];`
    }
  },
  output: [{ title: 'AMLO anuncia nuevo programa social', slug: 'amlo-anuncia-nuevo-programa-social', content: 'El presidente Andrés Manuel López Obrador anunció este lunes un nuevo programa social...', excerpt: 'El presidente Andrés Manuel López Obrador anunció este lunes...', imageUrl: 'https://example.com/img.jpg', sourceUrl: 'https://www.jornada.com.mx/2024/01/01/politica/ejemplo.html', category: 'NACIONAL', sites: 'enfoquemexicano', author: 'La Jornada', wordCount: 35, cleaned: true, processedAt: '2024-01-01T00:00:00.000Z' }]
});

// ── Responder con artículo limpio ──────────────────────────
const respondClean = node({
  type: 'n8n-nodes-base.respondToWebhook',
  version: 1.5,
  config: {
    name: 'Respond Clean Article',
    position: [1440, 200],
    parameters: {
      respondWith: 'json',
      responseBody: expr('{{ $json }}'),
      options: {
        responseCode: 200,
        responseHeaders: { entries: [{ name: 'Content-Type', value: 'application/json' }] }
      }
    }
  },
  output: [{ success: true }]
});

// ── Responder error ────────────────────────────────────────
const respondError = node({
  type: 'n8n-nodes-base.respondToWebhook',
  version: 1.5,
  config: {
    name: 'Respond Error',
    position: [1140, 400],
    parameters: {
      respondWith: 'json',
      responseBody: expr('{{ { error: true, message: "Payload invalido", details: $json.errors } }}'),
      options: {
        responseCode: 400,
        responseHeaders: { entries: [{ name: 'Content-Type', value: 'application/json' }] }
      }
    }
  },
  output: [{ error: true, message: 'Payload invalido' }]
});

// ── Nota informativa ───────────────────────────────────────
const infoNote = sticky(
  '## Article Cleaner Service\\n\\nWebhook POST: `/webhook/clean-article`\\n\\n### Body esperado:\\n```json\\n{\\n  "title": "Titulo del articulo",\\n  "html": "<html>...</html>",\\n  "url": "https://fuente.com/articulo",\\n  "imageUrl": "https://... (opcional)",\\n  "category": "NACIONAL",\\n  "sites": "enfoquemexicano,adnmexicano",\\n  "sourceName": "La Jornada"\\n}\\n```\\n\\n### Response 200:\\n```json\\n{\\n  "title", "slug", "content", "excerpt",\\n  "imageUrl", "sourceUrl", "category",\\n  "sites", "author", "wordCount"\\n}\\n```',
  [webhookTrigger, validatePayload, cleanContent, respondClean],
  { color: 2, position: [240, 60] }
);

// ═══════════════════════════════════════════════════════════
// Compose Workflow
// ═══════════════════════════════════════════════════════════
export default workflow('article-cleaner-service', 'Article Cleaner Service')
  .add(webhookTrigger)
  .to(validatePayload)
  .to(checkPayload
    .onTrue(cleanContent.to(respondClean))
    .onFalse(respondError)
  );
