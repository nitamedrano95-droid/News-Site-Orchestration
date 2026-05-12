import { articleSlugify, decodeHTMLEntities, fetchWithTimeout, notifyTelegram } from '../utils/helpers.js';
import { getOGImage, uploadToR2 } from '../utils/html.js';
import { SITIOS_LIST, SITE_DOMAIN_MAP, log, error, warn, LOG_PREFIXES } from '../config.js';

const RSS_LOG = (...args) => log('[RSS INGEST]', ...args);
const RSS_ERR = (...args) => error('[RSS INGEST]', ...args);
const RSS_WARN = (...args) => warn('[RSS]', ...args);

const isValidSiteSlug = (s) => typeof s === 'string' && /^[a-z0-9_]+$/i.test(s);

export function cleanArticleContent(text) {
  if (!text) return '';

  let cleaned = text;

  cleaned = decodeHTMLEntities(cleaned);

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

  cleaned = cleaned.replace(/googletag\.cmd\.push\([^)]*\);/gi, '');
  cleaned = cleaned.replace(/googletag\.display\([^)]*\);/gi, '');
  cleaned = cleaned.replace(/div-gpt-ad-[\w()]+/gi, '');
  cleaned = cleaned.replace(/<script[^>]*googletag[^>]*>[\s\S]*?<\/script>/gi, '');
  cleaned = cleaned.replace(/#dailymotion-pip-large-viewport[^}]*\}[^}]*\}/gi, '');
  cleaned = cleaned.replace(/#dailymotion[^}]*\}/gi, '');

  cleaned = cleaned.replace(/\{\s*"locale"\s*:\s*"[^"]+"\s*\}/gi, '');
  cleaned = cleaned.replace(/\{\s*"@context".*?\}/gis, '');
  cleaned = cleaned.replace(/\{\s*"@type".*?\}/gis, '');

  cleaned = cleaned.replace(/#[\w-]+\{[^}]*\}/gi, '');
  cleaned = cleaned.replace(/\.[\w-]+\{[^}]*\}/gi, '');
  cleaned = cleaned.replace(/\{[^}]*--[\w-]+:[^}]*\}/gi, '');

  cleaned = cleaned.replace(/[\uFFFD]/g, '');
  cleaned = cleaned.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/g, '');
  cleaned = cleaned.replace(/\r\n/g, '\n');
  cleaned = cleaned.replace(/\n\s*\n\s*\n/g, '\n\n');
  cleaned = cleaned.replace(/^\s+|\s+$/g, '');

  const lines = cleaned.split('\n');
  const filteredLines = lines.filter(line => {
    const lower = line.toLowerCase().trim();
    const len = line.trim().length;
    
    if (len < 10) return false;
    if (lower.includes('suscribete') || lower.includes('suscríbete')) return false;
    if (lower.includes('publicidad')) return false;
    if (lower.includes('lea también') || lower.includes('lea tamb')) return false;
    
    return true;
  });

  return filteredLines.join('\n').trim();
}

function normalizeTitle(title) {
  let cleaned = title;
  
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
  
  cleaned = cleaned.replace(/\s*[\||\-]\s*.+$/g, '');
  
  return cleaned.trim();
}

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

function shuffleArray(array) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

async function scrapeArticleFromURL(url, env) {
  try {
    const res = await fetchWithTimeout(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
    }, 8000);

    if (!res.ok) {
      RSS_WARN(`Failed to fetch ${url}: ${res.status}`);
      return null;
    }

    const html = await res.text();
    const domain = new URL(url).origin;

    let title = '';
    const titleMatch = html.match(/<meta[^>]*property=["']og:title["'][^>]*content=["']([^"']+)["']/i)
      || html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:title["']/i)
      || html.match(/<title[^>]*>([^<]+)<\/title>/i);
    if (titleMatch) title = decodeHTMLEntities(titleMatch[1]).trim();

    let imageUrl = '';
    const ogMatch = html.match(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i)
      || html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:image["']/i);
    if (ogMatch) imageUrl = ogMatch[1];

    if (imageUrl && imageUrl.startsWith('/')) imageUrl = domain + imageUrl;

    let content = '';
    const articleMatch = html.match(/<article[^>]*>([\s\S]*?)<\/article>/i)
      || html.match(/<div[^>]*class=["'][^"']*article[^"']*["'][^>]*>([\s\S]*?)<\/div>/i)
      || html.match(/<div[^>]*class=["'][^"']*content[^"']*["'][^>]*>([\s\S]*?)<\/div>/i);

    if (articleMatch) {
      content = cleanArticleContent(articleMatch[1]);
    } else {
      const pMatch = html.match(/<p[^>]*>([\s\S]*?)<\/p>/gi);
      if (pMatch) {
        const paragraphs = pMatch
          .map(p => p.replace(/<[^>]+>/g, ''))
          .map(p => decodeHTMLEntities(p))
          .filter(p => p.trim().length > 50);
        content = cleanArticleContent(paragraphs.join('\n\n'));
      }
    }

    if (!title || !content) {
      RSS_LOG(`Missing title or content from ${url}`);
      return null;
    }

    const cleanTitle = normalizeTitle(title);

    if (cleanTitle.length < 10 || content.length < 200) {
      return null;
    }

    let finalTitle = cleanTitle;
    let finalContent = content;

    if (env.AI) {
      try {
        const [aiTitle, aiContent] = await Promise.all([
          proofreadTextAI(cleanTitle, 'título', env),
          proofreadTextAI(content, 'contenido', env)
        ]);
        finalTitle = aiTitle || cleanTitle;
        finalContent = aiContent || content;
      } catch (aiErr) {
        RSS_WARN('AI paraphrase failed, using original:', aiErr.message);
      }
    }

    if (finalContent.length > 5000) {
      finalContent = finalContent.substring(0, 5000);
    }

    if (imageUrl && imageUrl.startsWith('http') && !imageUrl.includes('/logo.png') && !imageUrl.includes('/fallback')) {
      try {
        const uploadedUrl = await uploadToR2(imageUrl, env);
        if (uploadedUrl) imageUrl = uploadedUrl;
      } catch (r2Err) {
        RSS_WARN('R2 upload failed:', r2Err.message);
      }
    }

    return { title: finalTitle, content: finalContent, imageUrl, url };
  } catch (e) {
    RSS_ERR(`Error scraping ${url}:`, e.message);
    return null;
  }
}

async function extractLinksFromRSS(rssUrl) {
  try {
    const res = await fetchWithTimeout(rssUrl, {}, 8000);
    if (!res.ok) {
      RSS_WARN(`RSS fetch failed: ${res.status} for ${rssUrl}`);
      return [];
    }

    const xml = await res.text();
    const linkMatches = xml.match(/<link>([^<]+)<\/link>/gi) || [];
    const itemMatches = xml.match(/<item>([\s\S]*?)<\/item>/gi) || [];

    const links = [];

    for (const item of itemMatches) {
      const linkMatch = item.match(/<link>([^<]+)<\/link>/i);
      if (linkMatch && linkMatch[1]) {
        const link = linkMatch[1].trim();
        if (link.startsWith('http')) links.push(link);
      }
    }

    if (links.length === 0) {
      for (const match of linkMatches) {
        const link = match.replace(/<link>/i, '').replace(/<\/link>/i, '').trim();
        if (link.startsWith('http')) links.push(link);
      }
    }

    return [...new Set(links)].slice(0, 20);
  } catch (e) {
    RSS_WARN(`RSS parse error for ${rssUrl}:`, e.message);
    return [];
  }
}

async function scrapeSectionForLinks(sectionUrl, maxRetries = 3) {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const res = await fetchWithTimeout(sectionUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
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

      const dataUrlRegex = /data-(?:href|url|link)=["']([^"']+)["']/gi;
      while ((m = dataUrlRegex.exec(html)) !== null) {
        let href = m[1].trim();
        if (href.startsWith('/')) href = domain + href;
        if (!href.startsWith('http')) continue;
        try {
          new URL(href);
          links.add(href);
        } catch { }
      }

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

export async function runRSSIngest(env) {
  console.log('[RSS INGEST] Starting RSS ingestion...');

  const lastIngestTimestamp = await env.ARTICLES_KV.get('last_ingest_timestamp');
  const isFirstRun = !lastIngestTimestamp;

  if (isFirstRun) {
    RSS_LOG('First run detected');
  } else {
    RSS_LOG(`Continuing from last run (${new Date(parseInt(lastIngestTimestamp)).toISOString()})`);
  }

  let fuentesRows = [];
  try {
    const result = await env.DB.prepare(
      'SELECT * FROM FUENTES WHERE ACTIVA = 1 ORDER BY SITIO_SLUG, ID'
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
      'https://www.france24.com/es/rss',
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

  const validSites = (SITIOS_LIST || []).filter(isValidSiteSlug);

  if (validSites.length === 0) {
    console.log('[RSS INGEST] No valid sites configured; skipping ingestion');
    return 0;
  }

  const dedicatedFuentes = fuentesRows.filter(f => f.SITIO_SLUG && f.SITIO_SLUG !== 'null');
  const globalFuentes = fuentesRows.filter(f => !f.SITIO_SLUG || f.SITIO_SLUG === 'null');

  const fuentesBySite = {};
  for (const site of validSites) {
    fuentesBySite[site] = dedicatedFuentes.filter(f => f.SITIO_SLUG === site);
  }

  let globalIdx = 0;
  for (const site of validSites) {
    if (fuentesBySite[site].length === 0 && globalFuentes.length > 0) {
      fuentesBySite[site].push(globalFuentes[globalIdx % globalFuentes.length]);
      globalIdx++;
    }
  }

  console.log(`[RSS INGEST] Total sites: ${validSites.length}, Fuentes: ${fuentesRows.length}`);

  let totalArticlesPublished = 0;

  for (const siteSlug of validSites) {
    const siteFuentes = fuentesBySite[siteSlug] || [];

    if (siteFuentes.length === 0) {
      RSS_WARN(`[${siteSlug}] No fuentes configured, skipping`);
      continue;
    }

    try {
      let siteArticlesPublished = 0;

      for (const fuente of siteFuentes) {
        const MAX_PER_SITE = isFirstRun ? 2 : 1;
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
            totalArticlesPublished++;
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

    if (siteArticlesPublished > 0) {
      const now = Date.now();
      await env.ARTICLES_KV.put('last_ingest_timestamp', now.toString());
    }
  }

  if (totalArticlesPublished > 0) {
    const now = Date.now();
    await env.ARTICLES_KV.put('last_ingest_timestamp', now.toString());
    RSS_LOG(`Saved last_ingest_timestamp: ${new Date(now).toISOString()}`);
  }

  console.log(`[RSS INGEST] Complete!`);
  console.log(`[RSS INGEST] Total articles published: ${totalArticlesPublished}`);

  return totalArticlesPublished;
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
      'SELECT * FROM FUENTES WHERE ACTIVA = 1 ORDER BY SITIO_SLUG, ID'
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
      'https://www.france24.com/es/rss',
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
  const globalFuentes = fuentesRows.filter(f => !f.SITIO_SLUG || f.SITIO_SLUG === 'null');

  let siteFuentes = dedicatedFuentes.filter(f => f.SITIO_SLUG === siteSlug);
  if (siteFuentes.length === 0 && globalFuentes.length > 0) {
    siteFuentes = [globalFuentes[0]];
  }

  if (siteFuentes.length === 0) {
    RSS_WARN(`[${siteSlug}] No fuentes configured, skipping`);
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
      'SELECT * FROM FUENTES WHERE ACTIVA = 1 ORDER BY SITIO_SLUG, ID'
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