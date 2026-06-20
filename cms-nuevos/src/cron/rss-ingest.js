// src/cron/rss-ingest.js — Ingesta automática de RSS y parafraseo con IA

import { articleSlugify, decodeHTMLEntities, fetchWithTimeout, notifyTelegram } from '../utils/helpers.js';
import { getOGImage, uploadToR2 } from '../utils/html.js';
import { SITIOS_LIST, SITE_DOMAIN_MAP, log, error, warn, LOG_PREFIXES } from '../config.js';

const RSS_LOG = (...args) => log('[RSS INGEST]', ...args);
const RSS_ERR = (...args) => error('[RSS INGEST]', ...args);
const RSS_WARN = (...args) => warn('[RSS]', ...args);

const isValidSiteSlug = (s) => typeof s === 'string' && /^[a-z0-9_]+$/i.test(s);

// ============================================================
// cleanArticleContent — Limpieza profunda de contenido
// ============================================================
export function cleanArticleContent(text) {
  if (!text) return '';

  let cleaned = text;

  // 1. Decodificar entidades HTML
  cleaned = decodeHTMLEntities(cleaned);

  // 2. Eliminar scripts, estilos y elementos no deseados
  cleaned = cleaned.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
  cleaned = cleaned.replace(/<style[^>]*>[\s\S]*<\/style>/gi, '');
  cleaned = cleaned.replace(/<link[^>]*>/gi, '');
  cleaned = cleaned.replace(/<meta[^>]*>/gi, '');
  cleaned = cleaned.replace(/<noscript[^>]*>[\s\S]*?<\/noscript>/gi, '');
  cleaned = cleaned.replace(/<iframe[^>]*>[\s\S]*?<\/iframe>/gi, '');
  cleaned = cleaned.replace(/<object[^>]*>[\s\S]*?<\/object>/gi, '');
  cleaned = cleaned.replace(/<embed[^>]*>/gi, '');
  cleaned = cleaned.replace(/<form[^>]*>[\s\S]*?<\/form>/gi, '');
  cleaned = cleaned.replace(/<input[^>]*>/gi, '');
  cleaned = cleaned.replace(/<button[^>]*>[\s\S]*?<\/button>/gi, '');
  cleaned = cleaned.replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, '');
  cleaned = cleaned.replace(/<header[^>]*>[\s\S]*?<\/header>/gi, '');
  cleaned = cleaned.replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, '');
  cleaned = cleaned.replace(/<aside[^>]*>[\s\S]*?<\/aside>/gi, '');
  cleaned = cleaned.replace(/<sidebar[^>]*>[\s\S]*?<\/sidebar>/gi, '');

  // 3. Eliminar secciones de comentarios y noticias relacionadas (PATRONES ESPECIFICOS)
  cleaned = cleaned.replace(/Comentarios\s*$/gm, '');
  cleaned = cleaned.replace(/Más leídas\s*$/gm, '');
  cleaned = cleaned.replace(/Otras Noticias\s*$/gm, '');
  cleaned = cleaned.replace(/Últimas noticias\s*$/gm, '');
  cleaned = cleaned.replace(/te puede interesar/gi, '');
  cleaned = cleaned.replace(/lea también/gi, '');
  cleaned = cleaned.replace(/continuar leyendo/gi, '');
  cleaned = cleaned.replace(/Nacional\s+/gi, '');
  cleaned = cleaned.replace(/Internacional\s+/gi, '');
  cleaned = cleaned.replace(/Economía\s+/gi, '');
  cleaned = cleaned.replace(/Deportes\s+/gi, '');
  cleaned = cleaned.replace(/Cultura\s+/gi, '');
  cleaned = cleaned.replace(/Revista Proceso\s+/gi, '');

  // 4. Eliminar firmas, copyright y datos legales
  cleaned = cleaned.replace(/\d{4}\s*DERECHOS\s*RESERVADOS.*$/gim, '');
  cleaned = cleaned.replace(/Derechos\s+de\s+Autor.*$/gim, '');
  cleaned = cleaned.replace(/©\s*\d{4}.*$/gim, '');
  cleaned = cleaned.replace(/todos los derechos reservados/gi, '');
  cleaned = cleaned.replace(/prohibida su reproducción/gi, '');
  cleaned = cleaned.replace(/comunicación e información/gi, '');
  cleaned = cleaned.replace(/EXPANSIÓN.*$/gim, '');
  cleaned = cleaned.replace(/fresas #\d+, col\..*$/gim, '');
  cleaned = cleaned.replace(/\(apro\)/gi, '');
  cleaned = cleaned.replace(/\(agencias\)/gi, '');
  cleaned = cleaned.replace(/\(ep\)/gi, '');

  // 5. Eliminar Google Tag Manager, Dailymotion y anuncios
  cleaned = cleaned.replace(/googletag\.cmd\.push\([^)]*\);/gi, '');
  cleaned = cleaned.replace(/googletag\.display\([^)]*\);/gi, '');
  cleaned = cleaned.replace(/div-gpt-ad-[\w()]+/gi, '');
  cleaned = cleaned.replace(/<script[^>]*googletag[^>]*>[\s\S]*?<\/script>/gi, '');
  cleaned = cleaned.replace(/#dailymotion-pip-large-viewport[^}]*\}[^}]*\}/gi, '');
  cleaned = cleaned.replace(/#dailymotion[^}]*\}/gi, '');

  // 6. Eliminar bloques JSON y datos estructurados
  cleaned = cleaned.replace(/\{\s*"locale"\s*:\s*"[^"]+"\s*\}/gi, '');
  cleaned = cleaned.replace(/\{\s*"@context".*?\}/gis, '');
  cleaned = cleaned.replace(/\{\s*"@type".*?\}/gis, '');

  // 7. Eliminar CSS y reglas de estilo
  cleaned = cleaned.replace(/#[\w-]+\{[^}]*\}/gi, '');
  cleaned = cleaned.replace(/\.[\w-]+\{[^}]*\}/gi, '');
  cleaned = cleaned.replace(/\{[^}]*--[\w-]+:[^}]*\}/gi, '');

  // 7b. Eliminar marcas de sitio original (SUN, ARCHIVO, ESPECIAL, CANVA)
  cleaned = cleaned.replace(/\bSUN\b/gi, '');
  cleaned = cleaned.replace(/\bARCHIVO\b/gi, '');
  cleaned = cleaned.replace(/\bESPECIAL\b/gi, '');
  cleaned = cleaned.replace(/\bCANVA\b/gi, '');
  cleaned = cleaned.replace(/\* \* \* Mantente al día.*?Términos y Condiciones/gi, '');
  cleaned = cleaned.replace(/Registrarse implica aceptar los Términos y Condiciones/gi, '');
  cleaned = cleaned.replace(/únete a nuestro canal de WhatsApp/gi, '');
  cleaned = cleaned.replace(/WhatsApp/gi, '');

  // 7c. Eliminar atribuciones de foto (Foto: AP / Mark Schiefelbein)
  cleaned = cleaned.replace(/Foto:\s*(?:AP|Reuters|EPA|AFP)[^\n]*\n/gi, '');
  cleaned = cleaned.replace(/\bAP\b.*?\//gi, '');

  // 7d. Eliminar fechas de publicacion (jueves, 7 de mayo de 2026 · 22:09)
  cleaned = cleaned.replace(/\{diadeSemana\},\s*\{dia\} de \{mes\} de \{year\}\s*·\s*\{hora\}\n/gi, '');
  cleaned = cleaned.replace(/(?:lunes|martes|miércoles|jueves|viernes|sábado|domingo),?\s*\d{1,2}\s+de\s+(?:enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)\s+de\s+\d{4}\s*·\s*\d{2}:\d{2}\n/gi, '');

  // 7e. Eliminar googletag残留
  cleaned = cleaned.replace(/googletag\.cmd\.push\s*\(\s*function\s*\(\s*\)\s*\{\s*\}\s*\)\s*;/g, '');

  // 7f. Limpiar entidades HTML double-encoded
  cleaned = cleaned.replace(/&amp;amp;amp;amp;amp;amp;amp;amp;amp;amp;amp;amp;amp;amp;amp;amp;amp;amp;amp;amp;amp;amp;amp;amp;amp;amp;amp;amp;amp;amp;amp;amp;amp;amp;amp;amp;amp;nbsp;/g, '&nbsp;');
  cleaned = cleaned.replace(/&amp;amp;amp;amp;amp;amp;amp;amp;amp;amp;amp;amp;amp;amp;amp;amp;amp;amp;amp;amp;amp;amp;amp;amp;amp;amp;amp;amp;amp;amp;amp;amp;amp;amp;amp;amp;amp;amp;/g, '&amp;');
  cleaned = cleaned.replace(/&amp;amp;amp;amp;amp;amp;amp;amp;amp;amp;amp;amp;amp;amp;amp;amp;amp;amp;amp;amp;amp;amp;amp;amp;amp;amp;amp;amp;amp;amp;amp;amp;amp;amp;amp;amp;amp;amp;lt;/g, '&lt;');
  cleaned = cleaned.replace(/&amp;amp;amp;amp;amp;amp;amp;amp;amp;amp;amp;amp;amp;amp;amp;amp;amp;amp;amp;amp;amp;amp;amp;amp;amp;amp;amp;amp;amp;amp;amp;amp;amp;amp;amp;amp;amp;amp;gt;/g, '&gt;');

  // 7g. Eliminar listas de clima de otras ciudades (El Informador)
  cleaned = cleaned.replace(/¿Cómo estará el clima en otras ciudades\?[\s\S]*?$/g, '');

  // 8. Eliminar caracteres corruptos y whitespace excesivo
  cleaned = cleaned.replace(/[\uFFFD]/g, ''); // Replacement character
  cleaned = cleaned.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/g, '');
  cleaned = cleaned.replace(/\r\n/g, '\n');
  cleaned = cleaned.replace(/\n\s*\n\s*\n/g, '\n\n');
  cleaned = cleaned.replace(/^\s+|\s+$/g, '');

  // 9. Filtrar líneas por contenido (línea por línea)
  const lines = cleaned.split('\n');
  const filteredLines = lines.filter(line => {
    const lower = line.toLowerCase().trim();
    const len = line.trim().length;
    
    // Eliminar líneas muy cortas (< 30 chars) que no son contenido válido
    if (len < 30 && len > 0) return false;
    
    // Eliminar líneas que son solo categorías
    if (/^(nacional|internacional|economía|deportes|cultura|opinión)$/i.test(lower)) return false;
    
    // Eliminar líneas que parecen metadata de autor/editorial
    if (lower.includes('expansión') || lower.includes('proceso') || lower.includes('apro')) return false;
    
    // Eliminar líneas con puro copyright
    if (lower.includes('derechos reservados') || lower.includes('©')) return false;
    
    return true;
  });
  cleaned = filteredLines.join('\n');

  // 10. Limpieza final
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n'); // Máximo 2 saltos de línea
  cleaned = cleaned.trim();

  return cleaned;
}

// ============================================================
// cleanTitle — Limpia títulos de nombres de medios/marcas
// ============================================================
export function cleanTitle(title) {
  if (!title) return title;
  
  let cleaned = title;
  
  // Eliminar prefijos de medios comunes
  const prefixes = [
    /^La\s+Jornada:\s*/i,
    /^El\s+Informador:\s*/i,
    /^Proceso:\s*/i,
    /^El\s+Universal:\s*/i,
    /^Milenio:\s*/i,
    /^Excélsior:\s*/i,
    /^El\s+Sol\s+de\s+México:\s*/i,
    /^La\s+Opinión\s*/i,
    /^El\s+Diario\s+de\s+Hoy:\s*/i,
    /^Publimetro:\s*/i,
    /^24\s+Horas:\s*/i,
    /^El\s+Economista:\s*/i,
    /^Expansión:\s*/i,
    /^Azteca\s+Noticias:\s*/i,
    /^TV\s+Azteca:\s*/i,
  ];
  
  for (const prefix of prefixes) {
    cleaned = cleaned.replace(prefix, '');
  }
  
  // Eliminar sufijos con管道 (|) y guiones
  cleaned = cleaned.replace(/\s*[\||\-]\s*.+$/g, '');
  
  return cleaned.trim();
}

// ============================================================
// proofreadTextAI — Parafrasea texto usando Workers AI
// ============================================================
async function proofreadTextAI(text, type, env) {
  try {
    if (!env.AI) {
      RSS_WARN('[AI] No AI binding available');
      return text;
    }

    const prompt = type === 'título'
      ? `Reescribe este titular de noticias en español mexicano, manteniendo el significado pero con palabras diferentes. Solo devuelve el titular reescrito, sin explicaciones:\n\n${text}`
      : `Reescribe este artículo de noticias en español mexicano con tus propias palabras, manteniendo todos los hechos importantes. Usa un estilo periodístico profesional. Solo devuelve el artículo reescrito:\n\n${text.substring(0, 2000)}`;

    const response = await env.AI.run('@cf/meta/llama-3-8b-instruct', {
      messages: [{ role: 'user', content: prompt }],
      max_tokens: type === 'título' ? 100 : 1000,
    });

    return response?.response?.trim() || text;
  } catch (e) {
    RSS_ERR(`Error paraphrasing ${type}:`, e.message);
    return text;
  }
}

// ============================================================
// shuffleArray — Mezcla un array aleatoriamente
// ============================================================
function shuffleArray(array) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// ============================================================
// scrapeArticleFromURL — Scraping completo desde URL directa
// ============================================================
export async function scrapeArticleFromURL(url, env) {
  console.log('[SCRAPE ARTICLE] Fetching:', url);

  // Fix 2026-06-02: skip France 24 entirely. Their Vue.js SPA wraps the
  // <style> CSS bundle inside the first <article> tag, so even the
  // longest-<article> selector stores 100K+ chars of stylesheet as the
  // article body. The same source also intermittently 403s, so we can't
  // rely on a clean fallback. Disabled at the source until a real fix
  // is built (parse the JSON-LD `articleBody` field instead of HTML).
  if (url && url.includes('france24.com')) {
    console.log('[SCRAPE ARTICLE] Skipping France 24 URL (disabled)');
    return null;
  }

  try {
    const res = await fetch(url, { 
      headers: { 
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'es-MX,es;q=0.9,en;q=0.8',
      } 
    });
    
    if (!res.ok) {
      console.log('[SCRAPE ARTICLE] HTTP error:', res.status);
      return null;
    }
    
    const html = await res.text();
    
    // Extraer título
    let title = null;
    
    // Método 1: OG Title
    const ogTitleMatch = html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i);
    if (ogTitleMatch) title = ogTitleMatch[1];
    
    // Método 2: Title tag
    if (!title) {
      const titleMatch = html.match(/<title>([^<]+)<\/title>/i);
      if (titleMatch) title = titleMatch[1].trim();
    }
    
    // Método 3: JSON-LD
    if (!title) {
      const jsonLdMatch = html.match(/"headline"\s*:\s*"([^"]+)"/i);
      if (jsonLdMatch) {
        title = jsonLdMatch[1].replace(/\\u00e1/g, 'á').replace(/\\u00e9/g, 'é')
                               .replace(/\\u00ed/g, 'í').replace(/\\u00f3/g, 'ó')
                               .replace(/\\u00fa/g, 'ú').replace(/\\u00f1/g, 'ñ');
      }
    }
    
    if (!title) {
      console.log('[SCRAPE ARTICLE] No title found');
      return null;
    }
    
    title = cleanTitle(title);
    console.log('[SCRAPE ARTICLE] Title:', title.substring(0, 60));
    
    // Extraer imagen
    let imageUrl = null;

    // Método 1: OG Image (soporta comillas simples y dobles, con o sin espacios)
    const ogImageMatch = html.match(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i) ||
                         html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:image["']/i) ||
                         html.match(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i);
    if (ogImageMatch) imageUrl = ogImageMatch[1];

    // Método 2: Twitter Card Image
    if (!imageUrl) {
      const twitterImageMatch = html.match(/<meta[^>]*name=["']twitter:image["'][^>]*content=["']([^"']+)["']/i) ||
                                html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*name=["']twitter:image["']/i) ||
                                html.match(/<meta[^>]*name=["']twitter:image:src["'][^>]*content=["']([^"']+)["']/i);
      if (twitterImageMatch) imageUrl = twitterImageMatch[1];
    }

    // Método 3: JSON-LD Image
    if (!imageUrl) {
      const jsonLdImageMatch = html.match(/"image"\s*:\s*\[\s*\{\s*"url"\s*:\s*"([^"]+)"/i) ||
                             html.match(/"image"\s*:\s*\{\s*"url"\s*:\s*"([^"]+)"/i) ||
                             html.match(/"image"\s*:\s*"([^"]+)"/i);
      if (jsonLdImageMatch) imageUrl = jsonLdImageMatch[1];
    }

    // Método 4: Primer <img> en el contenido del artículo
    if (!imageUrl) {
      const imgSelectors = [
        // Imagen destacada con clase específica
        /<img[^>]+class=["'][^"']*(?:figure|main|featured|hero|article|lead|portada)[^"']*["'][^>]+src=["']([^"']+)["']/i,
        // Imagen dentro de figure/div.image
        /<(?:figure|div)[^>]+class=["'][^"']*(?:figure|image|media|img)[^"']*["'][^>]*>[^<]*<img[^>]+src=["']([^"']+)["']/i,
        // Imagen grande (width/height >= 400)
        /<img[^>]+src=["']([^"']+)["'][^>]+(?:width|height)=["'][^"']*[4-9]\d{2,}/i,
        // Cualquier imagen con src
        /<img[^>]+src=["']([^"']+)["']/i,
      ];

      for (const selector of imgSelectors) {
        const match = html.match(selector);
        if (match) {
          imageUrl = match[1];
          console.log('[SCRAPE ARTICLE] Found image with selector:', imageUrl.substring(0, 60));
          break;
        }
      }
    }

    // Método 5: data-src, data-lazy-src, data-original (lazy loading)
    if (!imageUrl) {
      const dataSrcMatch = html.match(/<img[^>]+data-src=["']([^"']+)["']/i) ||
                           html.match(/<img[^>]+data-lazy-src=["']([^"']+)["']/i) ||
                           html.match(/<img[^>]+data-original=["']([^"']+)["']/i);
      if (dataSrcMatch) imageUrl = dataSrcMatch[1];
    }

    // Método 6: srcset (tomar la imagen más grande)
    if (!imageUrl) {
      const srcsetMatch = html.match(/srcset=["']([^"']+)["']/i);
      if (srcsetMatch) {
        const sources = srcsetMatch[1].split(',').map(s => s.trim());
        const largestSource = sources[sources.length - 1];
        const urlMatch = largestSource.match(/([^ ]+)/);
        if (urlMatch) imageUrl = urlMatch[1];
      }
    }

    // Método 7: <picture> con <source srcset>
    if (!imageUrl) {
      const pictureMatch = html.match(/<picture[^>]*>[^<]*<source[^>]+srcset=["']([^"']+)["'][^>]*>[^<]*<img[^>]+src=["']([^"']+)["']/i);
      if (pictureMatch) {
        // Tomar la primera imagen del srcset (generalmente la más grande)
        const srcsetSources = pictureMatch[1].split(',').map(s => s.trim());
        const firstSource = srcsetSources[0];
        const urlMatch = firstSource.match(/([^ ]+)/);
        imageUrl = urlMatch ? urlMatch[1] : pictureMatch[2];
      }
    }

    // Método 8: Imagen en background-image CSS inline
    if (!imageUrl) {
      const bgImageMatch = html.match(/background-image:\s*url\(["']?([^"')]+)["']?\)/i);
      if (bgImageMatch) imageUrl = bgImageMatch[1];
    }

    // Filtrar imágenes inválidas (logos genéricos, íconos, tracking pixels)
    if (imageUrl) {
      const lowerUrl = imageUrl.toLowerCase();
      if (lowerUrl.includes('logo') && !lowerUrl.includes('article') && !lowerUrl.includes('noticia')) {
        console.log('[SCRAPE ARTICLE] Image rejected (generic logo):', imageUrl.substring(0, 60));
        imageUrl = null;
      }
      if (lowerUrl.includes('favicon') || lowerUrl.includes('icon') || lowerUrl.includes('pixel')) {
        console.log('[SCRAPE ARTICLE] Image rejected (icon/pixel):', imageUrl.substring(0, 60));
        imageUrl = null;
      }
      if (lowerUrl.includes('avatar') || lowerUrl.includes('userpic')) {
        console.log('[SCRAPE ARTICLE] Image rejected (avatar):', imageUrl.substring(0, 60));
        imageUrl = null;
      }
    }

    if (!imageUrl) {
      console.log('[SCRAPE ARTICLE] No image found');
      return null;
    }

    // Resolver URLs relativas
    if (imageUrl.startsWith('/')) {
      const baseUrl = new URL(url);
      imageUrl = `${baseUrl.protocol}//${baseUrl.host}${imageUrl}`;
    } else if (imageUrl.startsWith('//')) {
      imageUrl = `https:${imageUrl}`;
    }

    console.log('[SCRAPE ARTICLE] Image found:', imageUrl.substring(0, 60));
    
    // Verificar imagen
    try {
      const imgCheck = await fetch(imageUrl, { 
        method: 'GET', 
        redirect: 'follow',
        headers: { 'User-Agent': 'Mozilla/5.0' }
      });
      if (!imgCheck.ok || !imgCheck.headers.get('content-type')?.startsWith('image/')) {
        console.log('[SCRAPE ARTICLE] Image not valid:', imgCheck.status);
        return null;
      }
    } catch (e) {
      console.log('[SCRAPE ARTICLE] Image check failed:', e.message);
      return null;
    }
    
    // Subir imagen a R2
    let finalImageUrl = null;
    try {
      const r2Url = await uploadToR2(imageUrl, env);
      if (r2Url) {
        finalImageUrl = r2Url;
        console.log('[SCRAPE ARTICLE] Image uploaded to R2');
      }
    } catch (r2Err) {
      console.log('[SCRAPE ARTICLE] R2 upload failed:', r2Err.message);
    }
    
    if (!finalImageUrl) {
      console.log('[SCRAPE ARTICLE] Failed to get final image URL');
      return null;
    }
    
    // Extraer contenido - Selectores específicos por medio
    let content = '';
    const urlLower = url.toLowerCase();
    
    // La Jornada
    if (urlLower.includes('jornada.com.mx')) {
      const articleMatch = html.match(/<div[^>]+id=["']cuerpoNota["'][^>]*>([\s\S]*?)<\/div>/i);
      if (articleMatch) {
        const pMatches = articleMatch[1].match(/<p[^>]*>([\s\S]*?)<\/p>/g) || [];
        content = pMatches.map(p => p.replace(/<[^>]*>/g, '').trim()).filter(p => p.length > 30).join('\n\n');
      }
    }
    // El Informador
    else if (urlLower.includes('informador.mx')) {
      const articleMatch = html.match(/<div[^>]+class=["'][^"']*field-name-body[^"']*["'][^>]*>([\s\S]*?)<\/div>/i);
      if (articleMatch) {
        const pMatches = articleMatch[1].match(/<p[^>]*>([\s\S]*?)<\/p>/g) || [];
        content = pMatches.map(p => p.replace(/<[^>]*>/g, '').trim()).filter(p => p.length > 30).join('\n\n');
      }
    }
    // Proceso
    else if (urlLower.includes('proceso.com.mx')) {
      const articleMatch = html.match(/<div[^>]+class=["'][^"']*entry-content[^"']*["'][^>]*>([\s\S]*?)<\/div>/i);
      if (articleMatch) {
        const pMatches = articleMatch[1].match(/<p[^>]*>([\s\S]*?)<\/p>/g) || [];
        content = pMatches.map(p => p.replace(/<[^>]*>/g, '').trim()).filter(p => p.length > 30).join('\n\n');
      }
    }
    // Expansión
    else if (urlLower.includes('expansion.mx')) {
      const articleMatch = html.match(/<div[^>]+class=["'][^"']*article-body[^"']*["'][^>]*>([\s\S]*?)<\/div>/i);
      if (articleMatch) {
        const pMatches = articleMatch[1].match(/<p[^>]*>([\s\S]*?)<\/p>/g) || [];
        content = pMatches.map(p => p.replace(/<[^>]*>/g, '').trim()).filter(p => p.length > 30).join('\n\n');
      }
    }
    // Infobae
    else if (urlLower.includes('infobae.com')) {
      const articleMatch = html.match(/<article[^>]*>([\s\S]*?)<\/article>/i);
      if (articleMatch) {
        const pMatches = articleMatch[1].match(/<p[^>]*>([\s\S]*?)<\/p>/g) || [];
        content = pMatches.map(p => p.replace(/<[^>]*>/g, '').trim()).filter(p => p.length > 30).join('\n\n');
      }
    }
    // Reforma
    else if (urlLower.includes('reforma.com')) {
      const articleMatch = html.match(/<div[^>]+id=["']cuerpoNota["'][^>]*>([\s\S]*?)<\/div>/i);
      if (articleMatch) {
        const pMatches = articleMatch[1].match(/<p[^>]*>([\s\S]*?)<\/p>/g) || [];
        content = pMatches.map(p => p.replace(/<[^>]*>/g, '').trim()).filter(p => p.length > 30).join('\n\n');
      }
    }
    // Aristegui
    else if (urlLower.includes('aristeguinoticias.com')) {
      const articleMatch = html.match(/<div[^>]+class=["'][^"']*entry-content[^"']*["'][^>]*>([\s\S]*?)<\/div>/i);
      if (articleMatch) {
        const pMatches = articleMatch[1].match(/<p[^>]*>([\s\S]*?)<\/p>/g) || [];
        content = pMatches.map(p => p.replace(/<[^>]*>/g, '').trim()).filter(p => p.length > 30).join('\n\n');
      }
    }
    // DW
    else if (urlLower.includes('dw.com')) {
      const articleMatch = html.match(/<div[^>]+class=["'][^"']*longText[^"']*["'][^>]*>([\s\S]*?)<\/div>/i);
      if (articleMatch) {
        const pMatches = articleMatch[1].match(/<p[^>]*>([\s\S]*?)<\/p>/g) || [];
        content = pMatches.map(p => p.replace(/<[^>]*>/g, '').trim()).filter(p => p.length > 30).join('\n\n');
      }
    }
    // France 24
    // Fix 2026-06-02: France24 is a Vue.js SPA whose first <article> tag on the
    // page wraps the <style> CSS bundle (webpack chunks, @keyframes, etc.). The
    // previous `match(/<article...<\/article>/i)` grabbed the CSS block and
    // stored 100K+ chars of stylesheet as the article body. Take the LONGEST
    // <article> instead (the real prose) and require >50 chars per <p> so
    // related-news cards (~30-40 chars) and other noise are filtered out.
    else if (urlLower.includes('france24.com')) {
      const allArticles = html.match(/<article[^>]*>[\s\S]*?<\/article>/gi) || [];
      if (allArticles.length > 0) {
        const longest = allArticles.reduce((a, b) => (a.length >= b.length ? a : b));
        const m = longest.match(/<article[^>]*>([\s\S]*?)<\/article>/i);
        if (m) {
          const pMatches = m[1].match(/<p[^>]*>([\s\S]*?)<\/p>/g) || [];
          content = pMatches.map(p => p.replace(/<[^>]*>/g, '').trim()).filter(p => p.length > 50).join('\n\n');
        }
      }
    }
    
    // Método genérico si no coincide ningún selector específico
    if (!content) {
      const articleMatch = html.match(/<article[^>]*>([\s\S]*?)<\/article>/i);
      if (articleMatch) {
        const pMatches = articleMatch[1].match(/<p[^>]*>([\s\S]*?)<\/p>/g) || [];
        content = pMatches.map(p => p.replace(/<[^>]*>/g, '').trim()).filter(p => p.length > 30).join('\n\n');
      }
    }
    
    // Método fallback: todos los <p>
    if (!content) {
      const pMatches = html.match(/<p[^>]*>([\s\S]*?)<\/p>/g) || [];
      content = pMatches.map(p => p.replace(/<[^>]*>/g, '').trim()).filter(p => p.length > 30).join('\n\n');
    }
    
    content = cleanArticleContent(content);
    
    if (content.length < 200) {
      console.log('[SCRAPE ARTICLE] Content too short:', content.length);
      return null;
    }
    
    console.log('[SCRAPE ARTICLE] Content length:', content.length);
    
    return {
      title,
      content,
      imageUrl: finalImageUrl,
      url
    };
    
  } catch (e) {
    console.log('[SCRAPE ARTICLE] Error:', e.message);
    return null;
  }
}

// ============================================================
// extractLinksFromRSS — Extrae URLs de un feed RSS
// ============================================================
async function extractLinksFromRSS(feedUrl) {
  try {
    const res = await fetch(feedUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    const xml = await res.text();
    const normalizedXml = xml.replace(/[\r\n]+/g, ' ');
    const items = normalizedXml.match(/<(item|entry)>([\s\S]*?)<\/\1>/gi) || [];

    const links = [];
    for (const item of items) {
      const linkMatch = item.match(/<link[^>]+href=["']([^"']+)["']/) || item.match(/<link>([\s\S]*?)<\/link>/);
      if (linkMatch) {
        links.push(linkMatch[1].trim());
      }
    }
    return links;
  } catch (e) {
    RSS_ERR(`Error fetching RSS ${feedUrl}:`, e.message);
    return [];
  }
}

// ============================================================
// scrapeSectionForLinks — Extrae URLs de una sección web (soporta HTML estático y JSON incrustado)
// ============================================================
async function scrapeSectionForLinks(sectionUrl, maxRetries = 3) {
  const CHROME_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36';

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const res = await fetch(sectionUrl, {
        headers: {
          'User-Agent': CHROME_UA,
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'es-MX,es;q=0.9',
          'Referer': new URL(sectionUrl).origin,
        }
      });
      if (!res.ok) {
        RSS_WARN(`Attempt ${attempt + 1}/${maxRetries}: HTTP ${res.status} from ${sectionUrl}`);
        if (attempt < maxRetries - 1) await new Promise(r => setTimeout(r, 2000));
        continue;
      }

      const html = await res.text();
      const domain = new URL(sectionUrl).origin;
      const links = new Set();

      // Estrategia 1: Extraer URLs de atributos href
      const hrefRegex = /href=["']([^"'#?]+)["']/gi;
      let m;
      while ((m = hrefRegex.exec(html)) !== null) {
        let href = m[1].trim();
        if (href.startsWith('/')) href = domain + href;
        if (!href.startsWith('http')) continue;

        try {
          const u = new URL(href);
          if (u.origin !== domain) continue;
          const path = u.pathname;

          if (path.length < 8) continue;
          if (/\/(tag|search|buscar|rss|feed|sitemap|robots|author|contribuidor|page|pagina)\//i.test(path)) continue;
          if (/\.(css|js|xml|json|jpg|png|gif|webp)$/i.test(path)) continue;

          links.add(href);
        } catch { /* skip invalid */ }
      }

      // Estrategia 2: Extraer URLs de data-* attributes (algunos sitios dinámicos)
      const dataUrlRegex = /data-(?:href|url|link)=["']([^"']+)["']/gi;
      while ((m = dataUrlRegex.exec(html)) !== null) {
        let href = m[1].trim();
        if (href.startsWith('/')) href = domain + href;
        if (!href.startsWith('http')) continue;
        try {
          new URL(href); // validate
          links.add(href);
        } catch { }
      }

      // Estrategia 3: Extraer URLs de JSON incrustado (Next.js, Nuxt, etc)
      const jsonMatches = html.match(/"(?:url|href|link|article)"\s*:\s*"([^"]+)"/gi);
      if (jsonMatches) {
        for (const match of jsonMatches) {
          const urlMatch = match.match(/"([^"]+)"/);
          if (urlMatch) {
            let href = urlMatch[1];
            if (!href.startsWith('http')) {
              if (href.startsWith('/')) href = domain + href;
              else continue;
            }
            try {
              const u = new URL(href);
              if (u.origin === domain) links.add(href);
            } catch { }
          }
        }
      }

      const result = [...links].slice(0, 15);
      if (result.length > 0) {
        RSS_LOG(`Scrape successful: extracted ${result.length} links from ${sectionUrl}`);
        return result;
      }

      RSS_WARN(`No links extracted from ${sectionUrl}, attempt ${attempt + 1}/${maxRetries}`);
      if (attempt < maxRetries - 1) await new Promise(r => setTimeout(r, 2000));
    } catch (e) {
      RSS_WARN(`Error scraping section ${sectionUrl} (attempt ${attempt + 1}/${maxRetries}):`, e.message);
      if (attempt < maxRetries - 1) await new Promise(r => setTimeout(r, 2000));
    }
  }

  return [];
}

// ============================================================
// runRSSIngest — Ingesta artículos por fuentes configurables
// ============================================================
export async function runRSSIngest(env) {
  console.log('[RSS INGEST] Starting RSS ingestion...');

  // Detectar si es primera ejecución
  const lastIngestTimestamp = await env.ARTICLES_KV.get('last_ingest_timestamp');
  const isFirstRun = !lastIngestTimestamp;
  const MAX_ARTICLES = isFirstRun ? 15 : 4;

  if (isFirstRun) {
    RSS_LOG('First run detected — limiting to 15 articles');
  } else {
    RSS_LOG(`Continuing from last run (${new Date(parseInt(lastIngestTimestamp)).toISOString()})`);
  }

  // Cargar fuentes desde D1
  let fuentesRows = [];
  try {
    const result = await env.DB.prepare(
      'SELECT * FROM FUENTES WHERE ACTIVA = 1 AND URL NOT LIKE \'%france24%\' AND LOWER(NOMBRE) NOT LIKE \'%france%\' ORDER BY SITIO_SLUG, ID'
    ).all();
    fuentesRows = result.results || [];
  } catch (e) {
    RSS_WARN('Error loading FUENTES from DB, falling back to hardcoded feeds:', e.message);
  }

  // Fallback a feeds legacy si la tabla no existe o no tiene fuentes activas
  if (fuentesRows.length === 0) {
    RSS_WARN('No active FUENTES found, falling back to hardcoded feeds');
    const LEGACY_FEEDS = [
      'https://www.jornada.com.mx/rss/edicion.xml?v=1',
      'https://www.informador.mx/rss/mexico.xml',
      'https://www.proceso.com.mx/rss/feed.html',
      'https://expansion.mx/rss',
      'https://www.reforma.com/rss/portada.xml',
      'https://aristeguinoticias.com/feed/',
      'https://www.infobae.com/arc/outboundfeeds/rss/?outputType=xml&section=mexico',
      'https://rss.dw.com/xml/rss-esp-all',
    ];
    for (const feedUrl of LEGACY_FEEDS) {
      fuentesRows.push({
        SITIO_SLUG: null, // null = asignar a todos
        NOMBRE: 'Legacy Feed',
        URL: feedUrl,
        TIPO: 'RSS',
        CATEGORIA: 'NACIONAL'
      });
    }
  }

  const dedicatedFuentes = fuentesRows.filter(f => f.SITIO_SLUG && f.SITIO_SLUG !== 'null');

  // ============================================================
  // NUEVA LÓGICA DE ROTACIÓN (2026-06-02):
  // Cada fuente RSS se asigna a 3 sitios (vía campo PRIORIDAD 1,2,3).
  // Cada sitio recibe 2 fuentes distintas.
  // Por ronda: cada fuente sirve solo a 2 de sus 3 sitios, rotando
  // [prioridades 1,2], luego [2,3], luego [3,1], etc.
  // Así cada sitio recibe 2 rondas consecutivas y descansa 1.
  // ============================================================

  // Per-site limit pattern: each site gets articles independently
  const MAX_PER_SITE = isFirstRun ? 2 : 1;

  const validSites = (SITIOS_LIST || []).filter(isValidSiteSlug);

  if (validSites.length === 0) {
    console.log('[RSS INGEST] No valid sites configured; skipping ingestion');
    return 0;
  }

  // Agrupar fuentes por (URL + NOMBRE) ignorando SITIO_SLUG
  const fuenteGroups = new Map(); // key: "url|nombre" → [{site, prioridad}]
  for (const f of dedicatedFuentes) {
    const key = `${f.URL}||${f.NOMBRE}`;
    if (!fuenteGroups.has(key)) fuenteGroups.set(key, []);
    fuenteGroups.get(key).push({
      sitio: f.SITIO_SLUG,
      prioridad: f.PRIORIDAD || 1,
      fuente: f
    });
  }

  // Para cada fuente, leer KV para el round actual y seleccionar 2 sitios activos
  const sitiosActivos = new Set();
  const fuentesPorSitio = {}; // sitio → [fuentes a procesar este ciclo]
  for (const site of validSites) fuentesPorSitio[site] = [];

  for (const [grupoKey, asignaciones] of fuenteGroups) {
    if (asignaciones.length === 0) continue;
    const fuente = asignaciones[0].fuente;

    // Leer round actual de KV (default 0)
    let round = 0;
    try {
      const kvKey = `fuente_round_${fuente.ID}`;
      const raw = await env.ARTICLES_KV.get(kvKey);
      if (raw !== null && raw !== undefined) {
        round = parseInt(raw, 10) || 0;
      }
    } catch (e) { /* OK, default 0 */ }

    // Ordenar asignaciones por prioridad
    asignaciones.sort((a, b) => a.prioridad - b.prioridad);
    const totalSitios = asignaciones.length;

    if (totalSitios === 0) continue;

    // Seleccionar 2 sitios: posiciones [round % totalSitios] y [(round+1) % totalSitios]
    const idx1 = round % totalSitios;
    const idx2 = (round + 1) % totalSitios;

    const selectedSlugs = new Set();
    for (const idx of [idx1, idx2]) {
      const sitio = asignaciones[idx].sitio;
      if (validSites.includes(sitio)) {
        selectedSlugs.add(sitio);
        sitiosActivos.add(sitio);
        fuentesPorSitio[sitio].push(fuente);
      }
    }

    // Avanzar round y guardar
    round = (round + 1) % totalSitios;
    try {
      await env.ARTICLES_KV.put(`fuente_round_${fuente.ID}`, round.toString());
    } catch (e) { RSS_WARN(`Failed to persist fuente_round for ${fuente.NOMBRE}`); }

    RSS_LOG(`Fuente ${fuente.NOMBRE}: round=${round-1}→${round}, activos=[${[...selectedSlugs].join(',')}]`);
  }

  console.log(`[RSS INGEST] Total sites: ${validSites.length}, Fuentes: ${fuentesRows.length}, Active this cycle: ${sitiosActivos.size}, Max per site: ${MAX_PER_SITE}`);

  let articlesPublished = 0;
  let urlsProcessed = 0;
  let urlsSkippedDuplicate = 0;
  let urlsSkippedNoImage = 0;
  let urlsSkippedShortContent = 0;

  // Process each site independently with its own counter
  for (const siteSlug of validSites) {
    const siteFuentes = fuentesPorSitio[siteSlug] || [];

    if (siteFuentes.length === 0) {
      // Sitio en descanso esta ronda — sin warning, es parte del diseño
      continue;
    }

    let siteArticlesPublished = 0;

    for (const fuente of siteFuentes) {
      if (siteArticlesPublished >= MAX_PER_SITE) break;

      RSS_LOG(`[${siteSlug}] Processing fuente: ${fuente.NOMBRE} (${fuente.TIPO})`);

      let articleUrls = [];

      // Extraer URLs según tipo de fuente
      if (fuente.TIPO === 'RSS') {
        articleUrls = await extractLinksFromRSS(fuente.URL);
      } else {
        articleUrls = await scrapeSectionForLinks(fuente.URL);
      }

      RSS_LOG(`[${siteSlug}] Found ${articleUrls.length} candidate URLs from ${fuente.NOMBRE}`);

      for (const link of articleUrls) {
        if (siteArticlesPublished >= MAX_PER_SITE) break;

        urlsProcessed++;

        // Check duplicate
        const urlExists = await env.DB.prepare(
          'SELECT ID FROM ARTICULOS_PARAFRASEADOS WHERE SOURCE_URL = ?'
        ).bind(link).first();

        if (urlExists) {
          urlsSkippedDuplicate++;
          continue;
        }

        // Scraping completo del artículo
        const scrapedArticle = await scrapeArticleFromURL(link, env);

        if (!scrapedArticle) {
          urlsSkippedNoImage++;
          continue;
        }

        const { title, content, imageUrl, url } = scrapedArticle;

        if (content.length < 200) {
          RSS_LOG(`[${siteSlug}] Skip: Content too short`);
          urlsSkippedShortContent++;
          continue;
        }

        // Insert article into DB — asignar SOLO a este sitio
        try {
          const now = new Date().toISOString();
          const paraId = crypto.randomUUID();
          let slug = articleSlugify(title);
          if (!slug || slug.trim() === '') {
            slug = `articulo-${Date.now()}`;
            RSS_LOG(`[${siteSlug}] Generated fallback slug: ${slug}`);
          }

          const tableName = `ARTICULOS_SITIO_${siteSlug.toUpperCase()}`;

          const statements = [];
          statements.push(
            env.DB.prepare(`
              INSERT INTO ARTICULOS_PARAFRASEADOS
                (ID, TITULO_PARAFRASEADO, SLUG, CONTENIDO, DESCRIPCION_PARAFRASEADA,
                 CATEGORIA, AUTOR, FECHA_PUBLICACION, URL_IMAGEN, SOURCE_URL, ESTADO, SITIO_DESTINO)
              VALUES (?, ?, ?, ?, ?, ?, 'NexoPress', ?, ?, ?, 'PUBLICADO', ?)
            `).bind(paraId, title, slug, content, content.substring(0, 200), fuente.CATEGORIA || 'NACIONAL', now, imageUrl, url, siteSlug)
          );

          statements.push(
            env.DB.prepare(`
              INSERT INTO ${tableName} (ID, ID_PARAFRASEADO, FECHA_ASIGNACION, FB_PUBLICADO, FB_FECHA, FB_POST_ID)
              VALUES (?, ?, datetime('now'), 0, NULL, NULL)
            `).bind(crypto.randomUUID(), paraId)
          );

          await env.DB.batch(statements);

          RSS_LOG(`[${siteSlug}] ✓ Published: "${title.substring(0, 40)}..."`);
          siteArticlesPublished++;
          articlesPublished++;
        } catch (dbErr) {
          RSS_ERR(`[${siteSlug}] DB Error:`, dbErr.message);
        }
      }
    }

    RSS_LOG(`[${siteSlug}] Completed: ${siteArticlesPublished} articles this run`);
  }

  console.log(`[RSS INGEST] ===== SUMMARY =====`);
  console.log(`[RSS INGEST] Run type: ${isFirstRun ? 'FIRST RUN (max 15)' : 'NORMAL (max 4)'}`);
  console.log(`[RSS INGEST] URLs processed: ${urlsProcessed}`);
  console.log(`[RSS INGEST] URLs skipped (duplicate): ${urlsSkippedDuplicate}`);
  console.log(`[RSS INGEST] URLs skipped (no image): ${urlsSkippedNoImage}`);
  console.log(`[RSS INGEST] URLs skipped (short content): ${urlsSkippedShortContent}`);
  console.log(`[RSS INGEST] Articles published: ${articlesPublished}`);

  // Guardar timestamp de esta ejecución para la próxima
  if (articlesPublished > 0) {
    const now = Date.now();
    await env.ARTICLES_KV.put('last_ingest_timestamp', now.toString());
    RSS_LOG(`Saved last_ingest_timestamp: ${new Date(now).toISOString()}`);
  }

  console.log(`[RSS INGEST] Complete!`);

  return articlesPublished;
}

export async function runRSSIngestForSite(env, siteSlug) {
  if (!isValidSiteSlug(siteSlug)) {
    throw new Error(`Invalid site slug: ${siteSlug}`);
  }

  console.log(`[RSS INGEST] Starting ingestion for site: ${siteSlug}`);

  const lastIngestTimestamp = await env.ARTICLES_KV.get('last_ingest_timestamp');
  const isFirstRun = !lastIngestTimestamp;
  const MAX_PER_SITE = isFirstRun ? 2 : 1;

  let fuentesRows = [];
  try {
    const result = await env.DB.prepare(
      'SELECT * FROM FUENTES WHERE ACTIVA = 1 AND URL NOT LIKE \'%france24%\' AND LOWER(NOMBRE) NOT LIKE \'%france%\' ORDER BY SITIO_SLUG, ID'
    ).all();
    fuentesRows = result.results || [];
  } catch (e) {
    RSS_WARN('Error loading FUENTES from DB, falling back to hardcoded feeds:', e.message);
  }

  if (fuentesRows.length === 0) {
    RSS_WARN('No active FUENTES found, falling back to hardcoded feeds');
    const LEGACY_FEEDS = [
      'https://www.jornada.com.mx/rss/edicion.xml?v=1',
      'https://www.informador.mx/rss/mexico.xml',
      'https://www.proceso.com.mx/rss/feed.html',
      'https://expansion.mx/rss',
      'https://www.reforma.com/rss/portada.xml',
      'https://aristeguinoticias.com/feed/',
      'https://www.infobae.com/arc/outboundfeeds/rss/?outputType=xml&section=mexico',
      'https://rss.dw.com/xml/rss-esp-all',
    ];
    for (const feedUrl of LEGACY_FEEDS) {
      fuentesRows.push({
        SITIO_SLUG: null,
        NOMBRE: 'Legacy Feed',
        URL: feedUrl,
        TIPO: 'RSS',
        CATEGORIA: 'NACIONAL'
      });
    }
  }

  const dedicatedFuentes = fuentesRows.filter(f => f.SITIO_SLUG && f.SITIO_SLUG !== 'null');

  // Rotación: mismo algoritmo que runRSSIngest — seleccionar solo las fuentes
  // cuyo round actual incluye este sitio (2 de 3 por fuente)
  const fuenteGroups = new Map();
  for (const f of dedicatedFuentes) {
    const key = `${f.URL}||${f.NOMBRE}`;
    if (!fuenteGroups.has(key)) fuenteGroups.set(key, []);
    fuenteGroups.get(key).push({ sitio: f.SITIO_SLUG, prioridad: f.PRIORIDAD || 1, fuente: f });
  }

  const siteFuentes = [];
  for (const [, asignaciones] of fuenteGroups) {
    asignaciones.sort((a, b) => a.prioridad - b.prioridad);
    const totalSitios = asignaciones.length;
    if (totalSitios === 0) continue;

    let round = 0;
    try {
      const raw = await env.ARTICLES_KV.get(`fuente_round_${asignaciones[0].fuente.ID}`);
      if (raw !== null && raw !== undefined) round = parseInt(raw, 10) || 0;
    } catch (e) {}

    const idx1 = round % totalSitios;
    const idx2 = (round + 1) % totalSitios;
    for (const idx of [idx1, idx2]) {
      if (asignaciones[idx].sitio === siteSlug) {
        siteFuentes.push(asignaciones[idx].fuente);
        break;
      }
    }

    if (asignaciones.some(a => a.sitio === siteSlug)) {
      const newRound = (round + 1) % totalSitios;
      try {
        await env.ARTICLES_KV.put(`fuente_round_${asignaciones[0].fuente.ID}`, newRound.toString());
      } catch (e) {}
    }
  }

  if (siteFuentes.length === 0) {
    return 0;
  }

  let siteArticlesPublished = 0;

  try {
    for (const fuente of siteFuentes) {
      if (siteArticlesPublished >= MAX_PER_SITE) break;

      RSS_LOG(`[${siteSlug}] Processing fuente: ${fuente.NOMBRE} (${fuente.TIPO})`);

      let articleUrls = [];
      if (fuente.TIPO === 'RSS') {
        articleUrls = await extractLinksFromRSS(fuente.URL);
      } else {
        articleUrls = await scrapeSectionForLinks(fuente.URL);
      }

      RSS_LOG(`[${siteSlug}] Found ${articleUrls.length} candidate URLs from ${fuente.NOMBRE}`);

      for (const link of articleUrls) {
        if (siteArticlesPublished >= MAX_PER_SITE) break;

        const urlExists = await env.DB.prepare(
          'SELECT ID FROM ARTICULOS_PARAFRASEADOS WHERE SOURCE_URL = ?'
        ).bind(link).first();

        if (urlExists) continue;

        const scrapedArticle = await scrapeArticleFromURL(link, env);
        if (!scrapedArticle) continue;

        const { title, content, imageUrl, url } = scrapedArticle;
        if (content.length < 200) {
          RSS_LOG(`[${siteSlug}] Skip: Content too short`);
          continue;
        }

        try {
          const now = new Date().toISOString();
          const paraId = crypto.randomUUID();
          let slug = articleSlugify(title);
          if (!slug || slug.trim() === '') {
            slug = `articulo-${Date.now()}`;
            RSS_LOG(`[${siteSlug}] Generated fallback slug: ${slug}`);
          }

          const tableName = `ARTICULOS_SITIO_${siteSlug.toUpperCase()}`;

          await env.DB.batch([
            env.DB.prepare(`
              INSERT INTO ARTICULOS_PARAFRASEADOS
                (ID, TITULO_PARAFRASEADO, SLUG, CONTENIDO, DESCRIPCION_PARAFRASEADA,
                 CATEGORIA, AUTOR, FECHA_PUBLICACION, URL_IMAGEN, SOURCE_URL, ESTADO, SITIO_DESTINO)
              VALUES (?, ?, ?, ?, ?, ?, 'NexoPress', ?, ?, ?, 'PUBLICADO', ?)
            `).bind(paraId, title, slug, content, content.substring(0, 200), fuente.CATEGORIA || 'NACIONAL', now, imageUrl, url, siteSlug),
            env.DB.prepare(`
              INSERT INTO ${tableName} (ID, ID_PARAFRASEADO, FECHA_ASIGNACION, FB_PUBLICADO, FB_FECHA, FB_POST_ID)
              VALUES (?, ?, datetime('now'), 0, NULL, NULL)
            `).bind(crypto.randomUUID(), paraId)
          ]);

          RSS_LOG(`[${siteSlug}] ✓ Published: "${title.substring(0, 40)}..."`);
          siteArticlesPublished++;
        } catch (dbErr) {
          RSS_ERR(`[${siteSlug}] DB Error:`, dbErr.message);
        }
      }
    }
  } catch (siteErr) {
    RSS_ERR(`[${siteSlug}] Fatal error during ingestion:`, siteErr.message);
    await notifyTelegram(env, {
      type: 'ingest_error',
      site: siteSlug,
      message: `Ingesta falló para ${siteSlug}: ${siteErr.message}`,
      details: { error: siteErr.message, stack: siteErr.stack }
    });
  }

  console.log(`[RSS INGEST] [${siteSlug}] Done: ${siteArticlesPublished} articles`);

  if (siteArticlesPublished > 0) {
    const now = Date.now();
    await env.ARTICLES_KV.put('last_ingest_timestamp', now.toString());
  }

  return siteArticlesPublished;
}

// ============================================================
// getFuentesForSite — Obtiene las FUENTES activas para un sitio
// ============================================================
export async function getFuentesForSite(env, siteSlug) {
  if (!isValidSiteSlug(siteSlug)) {
    return [];
  }

  let fuentesRows = [];
  try {
    const result = await env.DB.prepare(
      'SELECT * FROM FUENTES WHERE ACTIVA = 1 AND URL NOT LIKE \'%france24%\' AND LOWER(NOMBRE) NOT LIKE \'%france%\' ORDER BY SITIO_SLUG, ID'
    ).all();
    fuentesRows = result.results || [];
  } catch (e) {
    RSS_WARN('Error loading FUENTES from DB:', e.message);
  }

  if (fuentesRows.length === 0) {
    return [];
  }

  const dedicatedFuentes = fuentesRows.filter(f => f.SITIO_SLUG && f.SITIO_SLUG !== 'null');
  const globalFuentes = fuentesRows.filter(f => !f.SITIO_SLUG || f.SITIO_SLUG === 'null');

  let siteFuentes = dedicatedFuentes.filter(f => f.SITIO_SLUG === siteSlug);
  if (siteFuentes.length === 0 && globalFuentes.length > 0) {
    siteFuentes = [globalFuentes[0]];
  }

  return siteFuentes;
}

// ============================================================
// processPreScrapedArticle — Procesa un artículo pre-scrapeado
// desde n8n: parafrasea, maneja imagen y guarda en D1
// ============================================================
export async function processPreScrapedArticle(env, siteSlug, article) {
  if (!isValidSiteSlug(siteSlug)) {
    throw new Error(`Invalid site slug: ${siteSlug}`);
  }

  const { title, content, imageUrl, sourceUrl, category } = article;

  if (!title || !content || content.length < 200) {
    RSS_LOG(`[${siteSlug}] Skip: Content too short or missing`);
    return null;
  }

  // 1. Check duplicate
  const urlExists = await env.DB.prepare(
    'SELECT ID FROM ARTICULOS_PARAFRASEADOS WHERE SOURCE_URL = ?'
  ).bind(sourceUrl).first();

  if (urlExists) {
    RSS_LOG(`[${siteSlug}] Skip: Duplicate article`);
    return null;
  }

  const now = new Date().toISOString();
  const paraId = crypto.randomUUID();

  // 2. Clean content
  const cleanedContent = cleanArticleContent(content || '');
  if (cleanedContent.length < 200) {
    RSS_LOG(`[${siteSlug}] Skip: Cleaned content too short`);
    return null;
  }

  // 3. Paraphrase with AI
  let paraphrasedTitle = title;
  let paraphrasedContent = cleanedContent;
  try {
    if (env.AI) {
      paraphrasedTitle = await proofreadTextAI(title, 'título', env) || title;
      paraphrasedContent = await proofreadTextAI(cleanedContent, 'contenido', env) || cleanedContent;
    }
  } catch (aiErr) {
    RSS_WARN(`[${siteSlug}] AI paraphrasing failed, using original:`, aiErr.message);
  }

  // 4. Handle image
  let finalImageUrl = imageUrl || null;
  if (imageUrl) {
    try {
      const r2Url = await uploadToR2(imageUrl, env);
      if (r2Url) {
        finalImageUrl = r2Url;
        RSS_LOG(`[${siteSlug}] Image uploaded to R2`);
      }
    } catch (imgErr) {
      RSS_WARN(`[${siteSlug}] Image upload failed:`, imgErr.message);
    }
  }

  if (!finalImageUrl) {
    RSS_LOG(`[${siteSlug}] Skip: No valid image`);
    return null;
  }

  // 5. Generate slug
  let slug = articleSlugify(paraphrasedTitle);
  if (!slug || slug.trim() === '') {
    slug = `articulo-${Date.now()}`;
  }

  // 6. Store in D1
  const tableName = `ARTICULOS_SITIO_${siteSlug.toUpperCase()}`;
  try {
    await env.DB.batch([
      env.DB.prepare(`
        INSERT INTO ARTICULOS_PARAFRASEADOS
          (ID, TITULO_PARAFRASEADO, SLUG, CONTENIDO, DESCRIPCION_PARAFRASEADA,
           CATEGORIA, AUTOR, FECHA_PUBLICACION, URL_IMAGEN, SOURCE_URL, ESTADO, SITIO_DESTINO)
        VALUES (?, ?, ?, ?, ?, ?, 'NexoPress', ?, ?, ?, 'PUBLICADO', ?)
      `).bind(paraId, paraphrasedTitle, slug, paraphrasedContent, paraphrasedContent.substring(0, 200),
              category || 'NACIONAL', now, finalImageUrl, sourceUrl, siteSlug),
      env.DB.prepare(`
        INSERT INTO ${tableName} (ID, ID_PARAFRASEADO, FECHA_ASIGNACION, FB_PUBLICADO, FB_FECHA, FB_POST_ID)
        VALUES (?, ?, datetime('now'), 0, NULL, NULL)
      `).bind(crypto.randomUUID(), paraId)
    ]);

    RSS_LOG(`[${siteSlug}] Published pre-scraped: "${paraphrasedTitle.substring(0, 40)}..."`);

    await env.ARTICLES_KV.put('last_ingest_timestamp', Date.now().toString());

    return paraId;
  } catch (dbErr) {
    RSS_ERR(`[${siteSlug}] DB Error:`, dbErr.message);
    throw dbErr;
  }
}

// ============================================================
// DISTRIBUCIÓN — Shuffle + Anti-Colisión para n8n
// ============================================================

function shuffleWithSeed(arr, seed) {
  const a = [...arr];
  let s = hashFNV1a(seed);
  for (let i = a.length - 1; i > 0; i--) {
    s = (s + 0x9e3779b9) >>> 0;
    const j = Math.floor((s / (i + 1)) * (i + 1)) % (i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function hashFNV1a(str) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= Math.max(0, str.charCodeAt(i));
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

async function getSitiosActivosParaFuente(env, fuente) {
  try {
    const fuenteRow = await env.DB.prepare(
      'SELECT * FROM FUENTES WHERE NOMBRE = ? AND ACTIVA = 1 LIMIT 1'
    ).bind(fuente).first();

    let sitios = [];
    if (fuenteRow && fuenteRow.SITIO_SLUG) {
      sitios = [fuenteRow.SITIO_SLUG];
    } else {
      const rows = await env.DB.prepare(`
        SELECT DISTINCT s.SLUG
        FROM SITIOS s
        JOIN FUENTES f ON f.SITIO_SLUG = s.SLUG
        WHERE f.NOMBRE = ? AND f.ACTIVA = 1 AND s.ACTIVO = 1 AND s.FACEBOOK_ACTIVO = 1
      `).bind(fuente).all();
      sitios = (rows.results || []).map(r => r.SLUG);
    }
    return sitios;
  } catch (e) {
    RSS_WARN(`[DIST] Error consultando fuentes para ${fuente}:`, e.message);
  }
  return [];
}

async function insertIntoArticulosFuente(env, article, fuente) {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  await env.DB.prepare(`
    INSERT OR IGNORE INTO ARTICULOS_FUENTE
      (ID, FUENTE, TITULO, DESCRIPCION, URL, URL_IMAGEN, CONTENIDO, CATEGORIA, FECHA_INGESTION, ESTADO)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDIENTE')
  `).bind(
    id, fuente,
    article.title || '',
    (article.description || '').substring(0, 500),
    article.sourceUrl || article.url || '',
    article.imageUrl || null,
    article.content || '',
    article.category || 'NACIONAL',
    now
  ).run();
  return id;
}

async function getDistRound(env, fuente) {
  try {
    const key = `dist_round:${fuente}`;
    const val = await env.ARTICLES_KV.get(key);
    return val ? parseInt(val, 10) : 0;
  } catch { return 0; }
}

async function incrementDistRound(env, fuente) {
  const key = `dist_round:${fuente}`;
  const val = await env.ARTICLES_KV.get(key);
  const round = val ? parseInt(val, 10) : 0;
  await env.ARTICLES_KV.put(key, (round + 1).toString());
  return round + 1;
}

async function distributeArticle(env, articleId, fuente) {
  const sitios = await getSitiosActivosParaFuente(env, fuente);
  if (sitios.length === 0) {
    RSS_LOG(`[DIST] No sitios activos para fuente: ${fuente}`);
    return { distribuido: 0, sitios: [] };
  }

  const round = await incrementDistRound(env, fuente);
  const seed = `${articleId}:${fuente}:${round}`;
  const shuffledSites = shuffleWithSeed(sitios, seed);

  const now = new Date();
  const stmts = [];
  const distEntries = [];

  for (let i = 0; i < shuffledSites.length; i++) {
    const sitioSlug = shuffledSites[i];
    const delayMinutes = i === 0 ? 0 : (15 * i) + (Math.abs(hashFNV1a(articleId + sitioSlug) % 31));
    const scheduledDate = new Date(now.getTime() + delayMinutes * 60 * 1000);
    const distId = crypto.randomUUID();

    stmts.push(
      env.DB.prepare(`
        INSERT INTO DISTRIBUCION_ARTICULOS
          (ID, ID_ARTICULO_FUENTE, ID_SITIO, ORDEN_PUBLICACION, FECHA_PROGRAMADA, PUBLICADO)
        VALUES (?, ?, ?, ?, ?, 0)
      `).bind(distId, articleId, sitioSlug, i + 1, scheduledDate.toISOString())
    );
    distEntries.push({ sitio: sitioSlug, orden: i + 1, programado: scheduledDate.toISOString() });
  }

  try {
    await env.DB.batch(stmts);
  } catch (e) {
    RSS_ERR(`[DIST] Error insertando distribución:`, e.message);
    return { distribuido: 0, error: e.message };
  }

  try {
    await env.DB.prepare(`UPDATE ARTICULOS_FUENTE SET ESTADO = 'DISTRIBUIDO' WHERE ID = ?`).bind(articleId).run();
  } catch (e) {
    RSS_WARN(`[DIST] No se pudo marcar ESTADO=DISTRIBUIDO:`, e.message);
  }

  RSS_LOG(`[DIST] Artículo ${articleId} → ${sitios.length} sitios (round ${round})`);
  return { distribuido: sitios.length, sitios: distEntries };
}

export async function handleIngestGlobal(env, body) {
  const { articles, fuente } = body;

  if (!articles || !Array.isArray(articles) || articles.length === 0) {
    return { success: false, error: 'Se requiere array de artículos no vacío' };
  }
  if (!fuente || typeof fuente !== 'string') {
    return { success: false, error: 'Campo "fuente" requerido' };
  }

  const results = [];
  const errors = [];

  for (const article of articles) {
    try {
      const title = (article.title || '').trim();
      if (!title || title.length < 5) {
        errors.push({ titulo: title || '(sin título)', error: 'título inválido' });
        continue;
      }
      // Detectar títulos de prueba/placeholder
      const lowerTitle = title.toLowerCase();
      if (lowerTitle.includes('test') || lowerTitle.includes('prueba') || lowerTitle.includes('sample') || lowerTitle.includes('articulo de prueba')) {
        errors.push({ titulo: title, error: 'título de prueba detectado' });
        continue;
      }
      if ((article.content || '').length < 200) {
        errors.push({ titulo: title, error: 'contenido < 200 chars' });
        continue;
      }

      // Verificar duplicado en fuente
      const existing = await env.DB.prepare(
        'SELECT ID FROM ARTICULOS_FUENTE WHERE URL = ? AND FUENTE = ?'
      ).bind(article.sourceUrl || article.url || '', fuente).first();
      if (existing) {
        errors.push({ titulo: title, error: 'duplicado en fuente' });
        continue;
      }

      const articleId = await insertIntoArticulosFuente(env, article, fuente);
      const distResult = await distributeArticle(env, articleId, fuente);
      results.push({ idArticulo: articleId, distribuidoA: distResult.distribuido });
    } catch (e) {
      errors.push({ titulo: article.title || '(sin título)', error: e.message });
    }
  }

  return {
    success: true,
    fuente,
    articlesRecibidos: articles.length,
    articlesProcesados: results.length,
    articulosSaltados: errors.length,
    results,
    errors: errors.length > 0 ? errors : undefined,
  };
}
