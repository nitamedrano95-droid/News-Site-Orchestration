import { fetchWithTimeout, fetchWithRetry } from './helpers.js';

// src/utils/html.js — Utilidades HTML: meta tags, OG scraping, R2 upload

export const getOGImage = async (url) => {
  try {
    const res = await fetchWithTimeout(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, 8000);
    const html = await res.text();
    const ogMatch =
      html.match(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i) ||
      html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:image["']/i);
    return ogMatch ? ogMatch[1] : null;
  } catch (_) {
    return null;
  }
};

export const uploadToR2 = async (url, env) => {
  try {
    const res = await fetchWithRetry(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, { maxRetries: 2, timeoutMs: 8000 });
    const contentType = res.headers.get('content-type') || 'image/jpeg';
    if (!contentType.startsWith('image/')) {
      console.log('[R2] Not an image:', contentType, url);
      return null;
    }
    const buffer = await res.arrayBuffer();
    const key = `auto/${crypto.randomUUID()}.jpg`;
    await env.UPLOADS.put(key, buffer, { httpMetadata: { contentType } });
    return `https://uploads.sebastianvernis.space/${key}`;
  } catch (e) {
    console.log('[R2] Upload error:', e.message);
    return null;
  }
};

const API_BASE = 'https://cms-nuevos3.sebastianvernis.workers.dev';

const escapeHtml = (s) => {
  if (!s) return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
};

// ============================================================
// injectMetaTags — Inyecta OG meta tags en páginas de artículo
// usando HTMLRewriter de Cloudflare Workers
// ============================================================
export const injectMetaTags = async (request, env, response) => {
  const url = new URL(request.url);
  const slug = url.searchParams.get('slug');
  if (!slug || !url.pathname.includes('/articulo')) return response;

  try {
    let article = await env.DB.prepare(
      'SELECT TITULO_PARAFRASEADO as t, DESCRIPCION_PARAFRASEADA as d, URL_IMAGEN as i FROM ARTICULOS_PARAFRASEADOS WHERE SLUG = ? LIMIT 1'
    ).bind(slug).first();

    if (!article) {
      article = await env.DB.prepare(
        'SELECT TITULO as t, DESCRIPCION as d, URL_IMAGEN as i FROM ARTICULOS_CMS WHERE SLUG = ? LIMIT 1'
      ).bind(slug).first();
    }

    if (!article) return response;

    let ogImg = `${url.origin}/logo.png`;
    if (article.i) {
      if (article.i.startsWith('/api/images/')) ogImg = `${API_BASE}${article.i}`;
      else if (article.i.startsWith('http') && !article.i.includes('/logo.png')) ogImg = article.i;
    }

    const safeTitle = escapeHtml(article.t || '');
    const safeDesc = escapeHtml(article.d || '');
    const safeImg = escapeHtml(ogImg);

    return new HTMLRewriter()
      .on('title', {
        element(el) { el.setInnerContent(safeTitle); }
      })
      .on('head', {
        element(el) {
          el.prepend(
            `<meta property="og:title" content="${safeTitle}" />` +
            `<meta property="og:description" content="${safeDesc}" />` +
            `<meta property="og:image" content="${safeImg}" />` +
            `<meta property="og:url" content="${escapeHtml(url.href)}" />` +
            `<meta property="og:type" content="article" />` +
            `<meta property="og:locale" content="es_MX" />` +
            `<meta name="twitter:card" content="summary_large_image" />` +
            `<meta name="twitter:title" content="${safeTitle}" />` +
            `<meta name="twitter:description" content="${safeDesc}" />` +
            `<meta name="twitter:image" content="${safeImg}" />`,
            { html: true }
          );
        }
      })
      .transform(response);
  } catch (_) {
    return response;
  }
};
