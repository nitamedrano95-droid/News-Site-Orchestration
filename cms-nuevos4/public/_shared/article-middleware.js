const API_BASE = 'https://cms-nuevos4.chispakimnueve.workers.dev';

async function resolveArticleBySlug(db, slug) {
  console.log(`[RESOLVE] Starting query for slug: ${slug}`);
  
  let article = await db.prepare(
    "SELECT ID as para_id, SLUG as canonical_slug, LEGACY_SLUG as legacy_slug, TITULO_PARAFRASEADO as title, DESCRIPCION_PARAFRASEADA as desc, URL_IMAGEN as image FROM ARTICULOS_PARAFRASEADOS WHERE SLUG = ? LIMIT 1"
  ).bind(slug).first();
  
  console.log(`[RESOLVE] Query result 1:`, article ? 'Found' : 'Not found');

  let isCMS = false;

  if (!article) {
    console.log(`[RESOLVE] Trying ARTICULOS_CMS table`);
    article = await db.prepare(
      "SELECT ID as para_id, SLUG as canonical_slug, LEGACY_SLUG as legacy_slug, TITULO as title, DESCRIPCION as desc, URL_IMAGEN as image FROM ARTICULOS_CMS WHERE SLUG = ? LIMIT 1"
    ).bind(slug).first();
    isCMS = Boolean(article);
    console.log(`[RESOLVE] Query result 2 (CMS):`, article ? 'Found' : 'Not found');
  }

  if (!article) {
    console.log(`[RESOLVE] Trying LEGACY_SLUG in PARAFRASEADOS`);
    article = await db.prepare(
      "SELECT ID as para_id, SLUG as canonical_slug, LEGACY_SLUG as legacy_slug, TITULO_PARAFRASEADO as title, DESCRIPCION_PARAFRASEADA as desc, URL_IMAGEN as image FROM ARTICULOS_PARAFRASEADOS WHERE LEGACY_SLUG = ? LIMIT 1"
    ).bind(slug).first();
    console.log(`[RESOLVE] Query result 3:`, article ? 'Found' : 'Not found');
  }

  if (!article) {
    console.log(`[RESOLVE] Trying LEGACY_SLUG in CMS`);
    article = await db.prepare(
      "SELECT ID as para_id, SLUG as canonical_slug, LEGACY_SLUG as legacy_slug, TITULO as title, DESCRIPCION as desc, URL_IMAGEN as image FROM ARTICULOS_CMS WHERE LEGACY_SLUG = ? LIMIT 1"
    ).bind(slug).first();
    isCMS = Boolean(article);
    console.log(`[RESOLVE] Query result 4:`, article ? 'Found' : 'Not found');
  }

  console.log(`[RESOLVE] Final result:`, article ? `Article: ${article.title}` : 'NULL');
  return { article, isCMS };
}

// Fallback: Fetch from API
async function fetchArticleFromAPI(slug) {
  console.log(`[API FALLBACK] Fetching article from API: ${slug}`);
  try {
    const res = await fetch(`${API_BASE}/api/articles/${encodeURIComponent(slug)}`);
    if (!res.ok) {
      console.log(`[API FALLBACK] API returned ${res.status}`);
      return null;
    }
    const data = await res.json();
    const a = data.article || data;
    if (!a || !a.title) {
      console.log(`[API FALLBACK] No article data in response`);
      return null;
    }
    console.log(`[API FALLBACK] Got article: ${a.title}`);
    return {
      title: a.title || '',
      desc: a.excerpt || a.description || '',
      image: a.imageUrl || a.image || '',
      canonical_slug: a.slug || slug,
      para_id: a.id || ''
    };
  } catch (e) {
    console.error(`[API FALLBACK] Error: ${e.message}`);
    return null;
  }
}

export async function handleArticleRequest(context, siteSlug) {
  const { request, env, next } = context;
  const url = new URL(request.url);
  
  console.log(`[OG MIDDLEWARE] ${siteSlug}: Processing ${url.pathname}?${url.search}`);
  
  // Skip non-HTML requests (CSS, JS, images, etc.)
  const pathname = url.pathname;
  if (/\.(css|js|json|png|jpg|jpeg|gif|svg|webp|ico|woff|woff2|ttf|eot)$/i.test(pathname)) {
    console.log(`[OG MIDDLEWARE] ${siteSlug}: Skipping static file`);
    return await next();
  }
  
  const requestedSlug = url.searchParams.get('slug');
  const canonicalUrl = url.toString();

  if (!requestedSlug) {
    console.log(`[OG MIDDLEWARE] ${siteSlug}: No slug param, redirecting`);
    return Response.redirect(url.origin, 302);
  }

  let article = null;
  
  // Try D1 first
  try {
    if (env.DB) {
      console.log(`[OG MIDDLEWARE] ${siteSlug}: Querying D1 for slug: ${requestedSlug}`);
      const { article: dbArticle } = await resolveArticleBySlug(env.DB, requestedSlug);
      article = dbArticle;
      console.log(`[OG MIDDLEWARE] ${siteSlug}: D1 result:`, article ? `Found: ${article.title}` : 'NULL');
    } else {
      console.log(`[OG MIDDLEWARE] ${siteSlug}: env.DB not available`);
    }
  } catch (e) {
    console.error(`[OG MIDDLEWARE] ${siteSlug}: D1 error: ${e.message}`);
  }
  
  // Fallback to API if no article found
  if (!article) {
    console.log(`[OG MIDDLEWARE] ${siteSlug}: Falling back to API for slug: ${requestedSlug}`);
    article = await fetchArticleFromAPI(requestedSlug);
  }
  
  if (!article) {
    console.log(`[OG MIDDLEWARE] ${siteSlug}: No article found at all for slug: ${requestedSlug}`);
    return await next();
  }

  try {
    if (article.canonical_slug && article.canonical_slug !== requestedSlug) {
      const redirectUrl = new URL(url.href);
      redirectUrl.searchParams.set('slug', article.canonical_slug);
      return Response.redirect(redirectUrl.toString(), 302);
    }

    const response = await next();
    const title = article.title;
    const description = (article.desc || '').substring(0, 200);
    const normalizeImageUrl = (value) => {
      if (!value || typeof value !== 'string') return `${url.origin}/logo.png`;

      let normalized = value.trim();

      if (!normalized || normalized.includes('undefined')) {
        return `${url.origin}/logo.png`;
      }

      if (normalized.startsWith('//')) {
        normalized = `https:${normalized}`;
      } else if (normalized.startsWith('/')) {
        normalized = `${url.origin}${normalized}`;
      } else if (normalized.includes('uploads.sebastianvernis.space') && !/^https?:\/\//i.test(normalized)) {
        normalized = `https://${normalized.replace(/^\/+/, '')}`;
      }

      if (/^http:\/\//i.test(normalized)) {
        normalized = normalized.replace(/^http:\/\//i, 'https://');
      }

      if (!/^https?:\/\//i.test(normalized)) {
        return `${url.origin}/logo.png`;
      }

      return normalized;
    };

    const image = normalizeImageUrl(article.image || '/logo.png');

    if (env.DB) {
      const tableName = `ARTICULOS_SITIO_${siteSlug.toUpperCase()}`;
      try {
        await env.DB.prepare(`
          UPDATE ${tableName}
          SET WEB_URL = ?, WEB_FECHA = CASE WHEN WEB_FECHA IS NULL THEN datetime('now') ELSE WEB_FECHA END
          WHERE ID_PARAFRASEADO = ?
        `).bind(url.href, article.para_id).run();
      } catch (_) {}
    }

    const escapeHtml = (text) => {
      if (!text) return '';
      return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
    };

    const escapedTitle = escapeHtml(title);
    const escapedDescription = escapeHtml(description);
    const escapedImage = escapeHtml(image);
    const escapedCanonicalUrl = escapeHtml(canonicalUrl);

    return new HTMLRewriter()
      .on('title', { element(el) { el.setInnerContent(title); } })
      .on('meta#page-desc', { element(el) { el.setAttribute('content', description); } })
      .on('meta#og-title', { element(el) { el.setAttribute('content', title); } })
      .on('meta#og-desc', { element(el) { el.setAttribute('content', description); } })
      .on('meta#og-image', { element(el) { el.setAttribute('content', image); } })
      .on('meta#og-url', { element(el) { el.setAttribute('content', canonicalUrl); } })
      .on('meta[property="og:type"]', { element(el) { el.setAttribute('content', 'article'); } })
      .on('head', {
        element(el) {
          el.prepend(`
            <meta property="fb:app_id" content="2726604081032124" />
            <meta property="og:type" content="article" />
            <meta property="og:title" content="${escapedTitle}" />
            <meta property="og:description" content="${escapedDescription}" />
            <meta property="og:image" content="${escapedImage}" />
            <meta property="og:image:secure_url" content="${escapedImage}" />
            <meta property="og:image:alt" content="${escapedTitle}" />
            <meta property="og:url" content="${escapedCanonicalUrl}" />
            <meta property="og:site_name" content="NexoPress" />
            <meta property="og:locale" content="es_MX" />
            <meta property="og:updated_time" content="${new Date().toISOString()}" />
            <meta name="twitter:card" content="summary_large_image" />
            <meta name="twitter:title" content="${escapedTitle}" />
            <meta name="twitter:description" content="${escapedDescription}" />
            <meta name="twitter:image" content="${escapedImage}" />
            <meta name="twitter:image:alt" content="${escapedTitle}" />
            <meta name="description" content="${escapedDescription}" />
            <meta name="robots" content="index, follow" />
          `, { html: true });
        }
      })
      .transform(response);
  } catch (e) {
    console.error('SEO Middleware Error:', e.message);
    return await next();
  }
}