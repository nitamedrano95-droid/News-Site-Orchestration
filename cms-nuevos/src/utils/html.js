import { fetchWithTimeout, fetchWithRetry } from './helpers.js';
import { generateNewsArticleSchema } from './seo.js';

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
    return `https://pub-42bf42f47f554f9791e810e7d0f209d4.r2.dev/${key}`;
  } catch (e) {
    console.log('[R2] Upload error:', e.message);
    return null;
  }
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
      if (article.i.startsWith('/api/images/')) ogImg = `${url.origin}${article.i}`;
      else if (article.i.startsWith('http') && !article.i.includes('/logo.png')) ogImg = article.i;
    }

    const esc = (s) => (s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    return new HTMLRewriter()
      .on('title', {
        element(el) { el.setInnerContent(article.t || ''); }
      })
      .on('meta#og-image', { element(el) { el.setAttribute('content', ogImg); } })
      .on('meta#og-url',   { element(el) { el.setAttribute('content', url.href); } })
      .on('head', {
        element(el) {
          el.prepend(
            `<meta property="fb:app_id" content="2726604081032124" />` +
            `<meta property="og:title" content="${esc(article.t)}" />` +
            `<meta property="og:description" content="${esc(article.d)}" />` +
            `<meta property="og:image" content="${esc(ogImg)}" />` +
            `<meta property="og:image:secure_url" content="${esc(ogImg)}" />` +
            `<meta property="og:image:alt" content="${esc(article.t)}" />` +
            `<meta property="og:url" content="${esc(url.href)}" />` +
            `<meta property="og:type" content="article" />` +
            `<meta property="og:locale" content="es_MX" />` +
            `<meta name="twitter:card" content="summary_large_image" />` +
            `<meta name="twitter:image" content="${esc(ogImg)}" />`,
            { html: true }
          );
        }
      })
      .transform(response);
  } catch (_) {
    return response;
  }
};
