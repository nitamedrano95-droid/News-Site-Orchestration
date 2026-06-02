// src/routes/facebook.js — Rutas de gestión y monitoreo de Facebook

import { Hono } from 'hono';
import { checkAuth } from '../middleware/auth.js';
import { publishToFBIndividual } from '../cron/facebook.js';
import { SITIOS_LIST } from '../config.js';

const facebook = new Hono();

// ── GET /facebook/debug-tokens — Validar tokens FB por sitio ─
facebook.get('/debug-tokens', async (c) => {
  if (!await checkAuth(c)) return c.json({ error: '401' }, 401);
  try {
    const sites = await c.env.DB.prepare(
      'SELECT SLUG, FACEBOOK_TOKEN_SECRET, FACEBOOK_PAGE_ID FROM SITIOS'
    ).all();

    const results = await Promise.all(
      (sites.results || []).map(async (s) => {
        const token     = c.env[s.FACEBOOK_TOKEN_SECRET];
        const has_token = !!token;
        let is_valid    = false;
        let fb_error    = null;

        if (has_token && s.FACEBOOK_PAGE_ID) {
          try {
            const fbRes  = await fetch(
              `https://graph.facebook.com/v19.0/${s.FACEBOOK_PAGE_ID}?fields=name&access_token=${token}`
            );
            const fbData = await fbRes.json();
            if (fbRes.ok) {
              is_valid = true;
            } else {
              fb_error = fbData.error?.message || 'Invalid Token';
            }
          } catch (e) {
            fb_error = e.message;
          }
        }

        return {
          slug:        s.SLUG,
          token_key:   s.FACEBOOK_TOKEN_SECRET,
          has_token,
          is_valid,
          fb_error,
          has_page_id: !!s.FACEBOOK_PAGE_ID,
        };
      })
    );

    return c.json(results);
  } catch (e) {
    return c.json({ error: e.message }, 500);
  }
});

// ── GET /facebook/monitor — Estado de publicación FB por sitio ──
facebook.get('/monitor', async (c) => {
  try {
    const results = [];

    for (const siteSlug of SITIOS_LIST) {
      const tableName = `ARTICULOS_SITIO_${siteSlug.toUpperCase()}`;

      const siteArticles = await c.env.DB.prepare(`
        SELECT
          s.ID as SITIO_ID,
          s.ID_PARAFRASEADO,
          p.TITULO_PARAFRASEADO as TITULO,
          p.URL_IMAGEN,
          p.FECHA_PUBLICACION,
          s.FB_PUBLICADO,
          s.FB_FECHA,
          s.FB_POST_ID,
          p.VALIDO_AI,
          p.VALIDADO_EN,
          p.RAZON_INVALIDO,
          '${siteSlug}' as SITIO,
          'PARA' as TIPO
        FROM ${tableName} s
        JOIN ARTICULOS_PARAFRASEADOS p ON s.ID_PARAFRASEADO = p.ID
        WHERE s.FB_PUBLICADO = 0
        ORDER BY s.FECHA_ASIGNACION DESC
        LIMIT 20
      `).all();

      results.push(...(siteArticles.results || []));
    }

    // Ordenar por fecha de publicación del artículo y limitar a 100
    const sorted = results
      .sort((a, b) => new Date(b.FECHA_PUBLICACION || 0) - new Date(a.FECHA_PUBLICACION || 0))
      .slice(0, 100);

    return c.json(sorted);
  } catch (e) {
    return c.json({ error: e.message }, 500);
  }
});

// ── GET /facebook/queue — Artículos pendientes de Facebook ──────
facebook.get('/queue', async (c) => {
  try {
    const results = [];

    for (const siteSlug of SITIOS_LIST) {
      const tableName = `ARTICULOS_SITIO_${siteSlug.toUpperCase()}`;

      const pending = await c.env.DB.prepare(`
        SELECT
          s.ID as SITIO_ID,
          s.ID_PARAFRASEADO,
          p.TITULO_PARAFRASEADO as TITULO,
          p.URL_IMAGEN,
          p.FECHA_PUBLICACION,
          s.FB_PUBLICADO,
          s.FB_FECHA,
          '${siteSlug}' as SITIO
        FROM ${tableName} s
        JOIN ARTICULOS_PARAFRASEADOS p ON s.ID_PARAFRASEADO = p.ID
        WHERE s.FB_PUBLICADO = 0
          AND p.URL_IMAGEN IS NOT NULL
          AND p.URL_IMAGEN != ''
        ORDER BY s.FECHA_ASIGNACION DESC
        LIMIT 10
      `).all();

      results.push(...(pending.results || []));
    }

    // Contar totales
    const totalPending = results.length;

    return c.json({
      queue: results.slice(0, 50),
      totalPending,
      message: 'Facebook Queue removed - articles now published immediately by timer',
    });
  } catch (e) {
    return c.json({ error: e.message }, 500);
  }
});

// ── POST /facebook/reset-timer/:siteSlug — Resetear timer FB ─
facebook.post('/reset-timer/:siteSlug', async (c) => {
  if (!await checkAuth(c)) return c.json({ error: '401' }, 401);
  const siteSlug = c.req.param('siteSlug');
  const kvKey    = `last_fb_post_${siteSlug}`;
  await c.env.ARTICLES_KV.put(kvKey, '0');
  return c.json({ success: true, message: `Timer reset for ${siteSlug}` });
});

// ── POST /facebook/force-publish/:siteSlug — Forzar publicación FB ──
facebook.post('/force-publish/:siteSlug', async (c) => {
  if (!await checkAuth(c)) return c.json({ error: '401' }, 401);
  const siteSlug  = c.req.param('siteSlug');
  const tableName = `ARTICULOS_SITIO_${siteSlug.toUpperCase()}`;

  try {
    const article = await c.env.DB.prepare(`
      SELECT
        s.ID as SITIO_ID,
        s.ID_PARAFRASEADO,
        p.TITULO_PARAFRASEADO as TITULO,
        p.SLUG,
        p.URL_IMAGEN
      FROM ${tableName} s
      JOIN ARTICULOS_PARAFRASEADOS p ON s.ID_PARAFRASEADO = p.ID
      WHERE s.FB_PUBLICADO = 0
      ORDER BY s.FECHA_ASIGNACION DESC
      LIMIT 1
    `).first();

    if (!article) {
      return c.json({ error: 'No articles pending for Facebook', success: false });
    }

    const result = await publishToFBIndividual(c.env, article, siteSlug);

    if (result.success) {
      await c.env.DB.prepare(`
        UPDATE ${tableName}
        SET FB_PUBLICADO = 1, FB_FECHA = datetime('now'), FB_POST_ID = ?
        WHERE ID = ?
      `).bind(result.post_id, article.SITIO_ID).run();

      return c.json({ success: true, article: article.SITIO_ID, fb_post_id: result.post_id });
    } else {
      return c.json({ success: false, error: result.error });
    }
  } catch (e) {
    return c.json({ error: e.message, success: false });
  }
});

// ── GET /facebook/recent-posts/:siteSlug — Obtener posts publicados (últimas N horas) ──
facebook.get('/recent-posts/:siteSlug', async (c) => {
  if (!await checkAuth(c)) return c.json({ error: '401' }, 401);
  
  const siteSlug = c.req.param('siteSlug');
  const hours = c.req.query('hours') || '24';
  const tableName = `ARTICULOS_SITIO_${siteSlug.toUpperCase()}`;

  try {
    const posts = await c.env.DB.prepare(`
      SELECT
        s.ID as SITIO_ID,
        s.ID_PARAFRASEADO,
        p.TITULO_PARAFRASEADO as TITULO,
        p.SLUG,
        p.URL_IMAGEN,
        s.FB_PUBLICADO,
        s.FB_FECHA,
        s.FB_POST_ID,
        s.FECHA_ASIGNACION
      FROM ${tableName} s
      JOIN ARTICULOS_PARAFRASEADOS p ON s.ID_PARAFRASEADO = p.ID
      WHERE s.FB_PUBLICADO = 1
        AND s.FB_FECHA >= datetime('now', '-${hours} hours')
      ORDER BY s.FB_FECHA DESC
      LIMIT 50
    `).all();

    return c.json(posts.results || []);
  } catch (e) {
    return c.json({ error: e.message }, 500);
  }
});

// ── POST /facebook/update-post/:siteSlug/:postId — Actualizar post existente ──
facebook.post('/update-post/:siteSlug/:postId', async (c) => {
  if (!await checkAuth(c)) return c.json({ error: '401' }, 401);
  
  const siteSlug = c.req.param('siteSlug');
  const postId = c.req.param('postId');
  const tableName = `ARTICULOS_SITIO_${siteSlug.toUpperCase()}`;

  try {
    // Obtener datos del artículo
    const article = await c.env.DB.prepare(`
      SELECT
        s.ID as SITIO_ID,
        p.TITULO_PARAFRASEADO as TITULO,
        p.SLUG,
        p.URL_IMAGEN
      FROM ${tableName} s
      JOIN ARTICULOS_PARAFRASEADOS p ON s.ID_PARAFRASEADO = p.ID
      WHERE s.FB_POST_ID = ?
    `).bind(postId).first();

    if (!article) {
      return c.json({ error: 'Article not found for this post', success: false });
    }

    // Obtener config del sitio
    const site = await c.env.DB.prepare(
      'SELECT * FROM SITIOS WHERE SLUG = ? AND FACEBOOK_ACTIVO = 1'
    ).bind(siteSlug).first();

    if (!site) {
      return c.json({ error: 'Site not found or inactive', success: false });
    }

    const token = c.env[site.FACEBOOK_TOKEN_SECRET];
    if (!token) {
      return c.json({ error: 'Missing Facebook token', success: false });
    }

    // Construir URL del artículo (usar .pages.dev para OG tags - producción)
    const pagesDomain = `${siteSlug}.pages.dev`;
    const url = `https://${pagesDomain}/articulo/?slug=${article.SLUG}`;

    console.log(`[FB UPDATE] Updating post ${postId} for ${siteSlug}`);
    console.log(`[FB UPDATE] URL: ${url}`);
    console.log(`[FB UPDATE] Title: ${article.TITULO}`);

    // Actualizar post en Facebook (re-scrapea OG tags)
    const formData = new FormData();
    formData.append('message', article.TITULO || '');
    formData.append('link', url);
    formData.append('access_token', token);

    const response = await fetch(
      `https://graph.facebook.com/v19.0/${postId}`,
      { method: 'POST', body: formData }
    );

    const result = await response.json();

    if (response.ok) {
      console.log(`[FB UPDATE] SUCCESS: Post ${postId} updated`);
      return c.json({ success: true, post_id: postId, message: 'Post updated, OG tags re-scraped' });
    } else {
      console.error(`[FB UPDATE] API Error:`, result);
      return c.json({ success: false, error: result.error?.message || 'Facebook API error' });
    }
  } catch (e) {
    console.error(`[FB UPDATE] Exception:`, e.message);
    return c.json({ error: e.message, success: false });
  }
});

// ── POST /facebook/update-recent/:siteSlug — Actualizar todos los posts recientes ──
facebook.post('/update-recent/:siteSlug', async (c) => {
  if (!await checkAuth(c)) return c.json({ error: '401' }, 401);
  
  const siteSlug = c.req.param('siteSlug');
  const hours = c.req.query('hours') || '24';
  const tableName = `ARTICULOS_SITIO_${siteSlug.toUpperCase()}`;

  try {
    // Obtener posts recientes
    const posts = await c.env.DB.prepare(`
      SELECT
        s.ID as SITIO_ID,
        s.FB_POST_ID,
        p.TITULO_PARAFRASEADO as TITULO,
        p.SLUG
      FROM ${tableName} s
      JOIN ARTICULOS_PARAFRASEADOS p ON s.ID_PARAFRASEADO = p.ID
      WHERE s.FB_PUBLICADO = 1
        AND s.FB_FECHA >= datetime('now', '-${hours} hours')
      ORDER BY s.FB_FECHA DESC
      LIMIT 50
    `).all();

    const results = { updated: 0, failed: 0, errors: [] };

    // Obtener config del sitio
    const site = await c.env.DB.prepare(
      'SELECT * FROM SITIOS WHERE SLUG = ? AND FACEBOOK_ACTIVO = 1'
    ).bind(siteSlug).first();

    if (!site) {
      return c.json({ error: 'Site not found or inactive', success: false });
    }

    const token = c.env[site.FACEBOOK_TOKEN_SECRET];
    if (!token) {
      return c.json({ error: 'Missing Facebook token', success: false });
    }

    const pagesDomain = `${siteSlug}.pages.dev`;

    for (const post of (posts.results || [])) {
      if (!post.FB_POST_ID) continue;

      const url = `https://${pagesDomain}/articulo/?slug=${post.SLUG}`;

      try {
        const formData = new FormData();
        formData.append('message', post.TITULO || '');
        formData.append('link', url);
        formData.append('access_token', token);

        const response = await fetch(
          `https://graph.facebook.com/v19.0/${post.FB_POST_ID}`,
          { method: 'POST', body: formData }
        );

        const result = await response.json();

        if (response.ok) {
          results.updated++;
          console.log(`[FB UPDATE] ${siteSlug}: Post ${post.FB_POST_ID} updated`);
        } else {
          results.failed++;
          results.errors.push({
            post_id: post.FB_POST_ID,
            error: result.error?.message || 'Unknown error'
          });
          console.error(`[FB UPDATE] ${siteSlug}: Post ${post.FB_POST_ID} failed: ${result.error?.message}`);
        }

        // Delay para evitar rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (e) {
        results.failed++;
        results.errors.push({
          post_id: post.FB_POST_ID,
          error: e.message
        });
      }
    }

    return c.json({
      success: true,
      site: siteSlug,
      results,
      message: `Updated ${results.updated} posts, ${results.failed} failed`
    });
  } catch (e) {
    return c.json({ error: e.message, success: false });
  }
});

// ── OAuth Batch — Reautorizar TODAS las páginas del CMS ──

facebook.get('/oauth/start-all', async (c) => {
  const authHeader = c.req.header('Authorization');
  const authParam = c.req.query('auth');
  const authToken = authHeader?.replace('Bearer ', '') || authParam;

  if (!authToken) {
    return c.json({ error: 'Unauthorized: no auth token' }, 401);
  }

  const sessionKey = `session_${authToken}`;
  const sessionExists = await c.env.ARTICLES_KV.get(sessionKey);
  if (!sessionExists) {
    return c.json({ error: 'Session expired or invalid' }, 401);
  }

  const origin = new URL(c.req.url).origin;
  const sitios = SITIOS_LIST.map(slug => ({
    slug,
    url: `${origin}/api/facebook/oauth/start?siteSlug=${slug}&auth=${authToken}`
  }));

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Reautorizando todas las páginas...</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; margin: 0; padding: 2rem; background: #f9fafb; }
    .container { max-width: 600px; margin: 0 auto; background: white; padding: 2rem; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
    h1 { color: #1f2937; margin-bottom: 1rem; }
    .status { background: #f0fdf4; border: 1px solid #86efac; padding: 1rem; border-radius: 8px; margin: 1rem 0; }
    .sitios { list-style: none; padding: 0; }
    .sitios li { padding: 0.5rem 0; color: #6b7280; }
    .sitios li.done { color: #10b981; }
    .sitios li.done::before { content: "✓ "; font-weight: bold; }
  </style>
</head>
<body>
  <div class="container">
    <h1>🔄 Reautorizando todas las páginas...</h1>
    <div class="status"><strong>Estado:</strong> <span id="status">Cargando...</span></div>
    <h2>Sitios en proceso:</h2>
    <ul class="sitios" id="sitios-list">
      ${sitios.map(s => `<li id="sitio-${s.slug}">${s.slug}</li>`).join('')}
    </ul>
  </div>
  <script>
    const sitios = ${JSON.stringify(sitios)};
    let completed = 0;
    function updateStatus() {
      const percent = Math.round((completed / sitios.length) * 100);
      document.getElementById('status').textContent = percent + '% completado (' + completed + '/' + sitios.length + ')';
      if (completed === sitios.length) {
        document.querySelector('.status').innerHTML = '<strong style="color: #10b981;">✓ Todos los sitios han sido autorizados</strong>';
      }
    }
    function markDone(slug) {
      const el = document.getElementById('sitio-' + slug);
      if (el) el.classList.add('done');
      completed++;
      updateStatus();
    }
    let popupIndex = 0;
    function openNextPopup() {
      if (popupIndex >= sitios.length) return;
      const sitio = sitios[popupIndex];
      const popup = window.open(sitio.url, 'oauth-' + sitio.slug, 'width=600,height=700');
      const checkInterval = setInterval(() => {
        if (popup.closed) {
          clearInterval(checkInterval);
          markDone(sitio.slug);
          popupIndex++;
          setTimeout(openNextPopup, 1000);
        }
      }, 500);
    }
    openNextPopup();
  </script>
</body>
</html>`;

  return c.html(html);
});

// ── GET /oauth/callback — OAuth callback para guardar tokens en todas las DBs ──
facebook.get('/oauth/callback', async (c) => {
  const code = c.req.query('code');
  const error = c.req.query('error');
  
  if (error) {
    return c.html(`<html><body>
      <h1 style="color:red">OAuth Error: ${error}</h1>
      <p>${c.req.query('error_description') || ''}</p>
    </body></html>`);
  }
  
  if (!code) {
    return c.html('<html><body><h1>No code received</h1></body></html>');
  }
  
  const FB_APP_ID = c.env.FB_APP_ID || '2726604081032124';
  const FB_APP_SECRET = c.env.FB_APP_SECRET;
  
  try {
    console.log('[OAUTH] Received code, attempting token exchange');
    // 1. Exchange code for user access token
    const tokenUrl = `https://graph.facebook.com/v19.0/oauth/access_token?client_id=${FB_APP_ID}&client_secret=${FB_APP_SECRET}&redirect_uri=${encodeURIComponent(c.req.url.split('?')[0])}&code=${code}`;
    console.log('[OAUTH] Token URL:', tokenUrl.replace(FB_APP_SECRET, '***'));
    
    const tokenRes = await fetch(tokenUrl);
    const tokenData = await tokenRes.json();
    console.log('[OAUTH] Token response:', JSON.stringify(tokenData));
    
    if (!tokenData.access_token) {
      throw new Error(tokenData.error?.message || 'Failed to get access token');
    }
    
    const userAccessToken = tokenData.access_token;
    console.log('[OAUTH] User token obtained successfully');
    
    // 2. Get all pages managed by this user
    const pagesRes = await fetch(
      `https://graph.facebook.com/v19.0/me/accounts?fields=id,name,access_token&access_token=${userAccessToken}`
    );
    const pagesData = await pagesRes.json();
    
    if (!pagesData.data) {
      throw new Error(pagesData.error?.message || 'Failed to get pages');
    }
    
    const pages = pagesData.data;
    console.log(`[OAUTH] Found ${pages.length} pages`);
    
    // 3. Map Facebook page names to slugs
    const nameToSlug = {
      'we news mexico': 'wenewsmexico', 'diario mexicano': 'diariomexicano',
      'el observador republicano': 'elobservadorrepublicano', 'mexico daily': 'mexicodaily',
      'mexican news of the world': 'mexicannewsoftheworld', 'perspectiva mexicana': 'perspectivamexicana',
      'nacion al instante': 'nacionalinstante', 'adn mexicano': 'adnmexicano',
      'mexico & the world': 'mexicoandtheworld', 'politica salvaje al minuto': 'politicasalvajealminuto',
      'mexico plus': 'mexicoplus', 'el profeta mexicano': 'elprofetamexicano',
      'monitor republicano digital': 'monitorrepublicano', 'finance & markets mexico': 'financemarketsmx',
      'el analisis mexicano': 'elanalisismexicano', 'actualidad sin fronteras': 'actualidadsinfronteras',
      'diario mexico': 'diariomexico', 'expreso mexicano': 'expresomexicano',
      'mexico en resumen': 'mexicoenresumen', 'pulso republicano noticias': 'pulsorepublicanonoticias',
      'enfoque mexicano': 'enfoquemexicano', 'noticias al instante': 'noticiasalinstante',
      'azteca mexico noticias': 'aztecamexiconoticias', 'social mexico news': 'socialmexiconews',
      'noticias 123': 'noticias123', 'centro news': 'centronews',
      'breaking center news mexico': 'breakingcentermexico', 'a la vista noticias': 'alavistanoticias',
      'tmz news mexico': 'tmznews', 'radio abc': 'radioabc', 'noticias integra': 'noticiasintegra',
      'boom informativo': 'boominformativo', 'capital press': 'capitalpress',
      'diario express': 'diarioexpress', 'el pulso mexicano': 'elpulsomexicano',
      'enfoque capital': 'enfoquecapital', 'enfoque directo': 'enfoquedirecto',
      'formula cdmx': 'formulacdmx', 'mexican times': 'mexicantimes',
      'mexico 360 noticias': 'mexico360noticias', 'm radio': 'mradio',
      'noticias horizonte': 'noticiashorizonte', 'pulso diario': 'pulsodiario',
      'punto clave': 'puntoclave', 'punto noticias': 'puntonoticias',
      'radar informativo': 'radarinformativo', 'reporte diario': 'reportediario',
      'abc television': 'televisionabc', 'nodo informativo': 'nodoinformativo',
      'bitacora urbana': 'bitacoraurbana', 'vertice noticias': 'verticenoticias',
      'mexico informado': 'mexicoinformado', 'radio cinco noticias': 'radiocinconoticias',
      'central mexico news': 'centralmexico', 'cbn noticias': 'cbnnoticias',
      'noticias objetivo': 'noticiasobjetivo', 'reporte central mx': 'reportecentralmx',
      'tv mexico': 'tvmexico', 'radioredmx': 'radioredmx',
    };
    
    // Normalize name helper
    const normalizeName = (name) => name?.trim().toLowerCase().replace(/['']/g, '').replace(/é/g, 'e').replace(/ó/g, 'o') || '';
    
    // Build page_id -> slug mapping
    const pageIdToSlug = {};
    for (const page of pages) {
      const normalized = normalizeName(page.name);
      const slug = nameToSlug[normalized];
      if (slug) {
        pageIdToSlug[page.id] = { slug, token: page.access_token, name: page.name };
        console.log(`[OAUTH] Page "${page.name}" (${page.id}) -> ${slug}`);
      }
    }
    
    // 4. Update tokens in all databases
    console.log('[OAUTH] pageIdToSlug entries:', Object.keys(pageIdToSlug).length);
    
    // Instead of making cross-origin calls (which fail from Workers),
    // generate a script that can be run locally to update all databases
    const updateScript = Object.entries(pageIdToSlug).map(([pageId, { slug, token, name }]) => {
      return { slug, token, pageId, name };
    });
    
    const results = {
      note: 'Cross-origin calls fail from Cloudflare Workers. Run this script locally:',
      script: `cat << 'TOKENS' > /tmp/fb_tokens.json\n${JSON.stringify(updateScript, null, 2)}\nTOKENS`,
      tokens: updateScript
    };
    
    // Also try direct D1 for the current CMS
    try {
      for (const [pageId, { slug, token }] of Object.entries(pageIdToSlug)) {
        const updateResult = await c.env.DB.prepare(`
          UPDATE SITIOS SET FACEBOOK_PAGE_TOKEN = ?, FACEBOOK_TOKEN_UPDATED_AT = datetime('now') WHERE SLUG = ?
        `).bind(token, slug).run();
        if (updateResult.meta?.changes > 0) {
          console.log(`[OAUTH] Updated ${slug} directly in cms-originaux DB`);
          results[`cms-originaux/${slug}`] = 'updated_direct';
        }
      }
    } catch (e) {
      console.log('[OAUTH] Direct DB error:', e.message);
    }
    
    return c.html(`<html><body style="font-family: monospace; padding: 2rem;">
      <h1 style="color: green">✅ OAuth Successful!</h1>
      <p>User access token obtained and processing ${pages.length} pages...</p>
      <h2>Token Updates:</h2>
      <pre>${JSON.stringify(results, null, 2)}</pre>
      <h2>Pages Found:</h2>
      <ul>
        ${pages.map(p => `<li>${p.name} (${p.id})</li>`).join('')}
      </ul>
    </body></html>`);
    
  } catch (e) {
    console.error('[OAUTH] Error:', e);
    return c.html(`<html><body style="font-family: monospace; padding: 2rem;">
      <h1 style="color: red">❌ OAuth Failed</h1>
      <p>${e.message}</p>
    </body></html>`);
  }
});

// ── POST /update-token — Actualizar token de página en SITIOS ──
facebook.post('/update-token', async (c) => {
  const { slug, token, page_id } = await c.req.json();
  
  if (!slug || !token) {
    return c.json({ success: false, error: 'Missing slug or token' }, 400);
  }
  
  try {
    const result = await c.env.DB.prepare(`
      UPDATE SITIOS 
      SET FACEBOOK_PAGE_TOKEN = ?, FACEBOOK_TOKEN_UPDATED_AT = datetime('now')
      WHERE SLUG = ?
    `).bind(token, slug).run();
    
    if (result.meta?.changes > 0) {
      console.log(`[UPDATE_TOKEN] Updated token for ${slug}`);
      return c.json({ success: true, slug });
    } else {
      return c.json({ success: false, error: 'Site not found or token unchanged' }, 404);
    }
  } catch (e) {
    console.error(`[UPDATE_TOKEN] Error for ${slug}:`, e);
    return c.json({ success: false, error: e.message }, 500);
  }
});

export default facebook;
