// src/cron/facebook.js — Publicación automática a Facebook (6 posts/día/página, timer 4h)

import { SITIOS_LIST, SITE_DOMAIN_MAP } from '../config.js';
import { decodeHTMLEntities, articleSlugify } from '../utils/helpers.js';

const FB_INTERVAL_MS = 2 * 60 * 60 * 1000; // 2 horas entre posts = 12 posts/día por página

// ============================================================
// publishToFBIndividual — Publica un artículo a Facebook
// ============================================================
export async function publishToFBIndividual(env, article, siteSlug) {
  try {
    // Get site configuration from DB
    const site = await env.DB.prepare(
      'SELECT * FROM SITIOS WHERE SLUG = ? AND FACEBOOK_ACTIVO = 1'
    ).bind(siteSlug).first();

    if (!site) {
      return { success: false, error: `Site ${siteSlug} not found or Facebook inactive` };
    }

    // Intenta leer token de D1 (obtenido via OAuth) primero, fallback a env var (manualmente configurado)
    const token = site.FACEBOOK_PAGE_TOKEN || env[site.FACEBOOK_TOKEN_SECRET];
    if (!token) {
      return { success: false, error: `Missing Facebook token for ${siteSlug}` };
    }

    if (!site.FACEBOOK_PAGE_ID) {
      return { success: false, error: `Missing Facebook page ID for ${siteSlug}` };
    }

    // Check article has required fields
    if (!article.TITULO) {
      return { success: false, error: 'Article missing title' };
    }

    // Ensure we have a valid slug — generate from title if missing
    const safeSlug = (article.SLUG && article.SLUG.trim()) 
      ? article.SLUG.trim() 
      : articleSlugify(article.TITULO);
    
    if (!safeSlug) {
      return { success: false, error: 'Cannot generate slug for article' };
    }

    // Get domain for the site
    const domain = SITE_DOMAIN_MAP[siteSlug] || `https://${siteSlug}.pages.dev`;
    const url = `${domain}/articulo/?slug=${encodeURIComponent(safeSlug)}`;

    console.log(`[FB] Publishing to ${siteSlug}: ${article.TITULO?.substring(0, 50)}...`);
    console.log(`[FB] URL: ${url}`);

    // Prepare Facebook post
    const formData = new FormData();
    formData.append('message', decodeHTMLEntities(article.TITULO));
    formData.append('link', url);
    formData.append('access_token', token);

    // Call Facebook Graph API
    const fbResponse = await fetch(
      `https://graph.facebook.com/v19.0/${site.FACEBOOK_PAGE_ID}/feed`,
      {
        method: 'POST',
        body: formData
      }
    );

    const fbResult = await fbResponse.json();

    if (fbResponse.ok && fbResult.id) {
      console.log(`[FB] ✓ Published to ${siteSlug}: ${fbResult.id}`);
      return { success: true, post_id: fbResult.id, page_id: site.FACEBOOK_PAGE_ID };
    } else {
      const errorMsg = fbResult.error?.message || 'Unknown Facebook API error';
      console.error(`[FB] ✗ Failed to publish to ${siteSlug}: ${errorMsg}`);
      return { success: false, error: errorMsg };
    }
  } catch (e) {
    console.error(`[FB] Exception publishing to ${siteSlug}:`, e.message);
    return { success: false, error: e.message };
  }
}

// ============================================================
// processFBTimer — 1 artículo por sitio cada 4 horas (= 6/día)
// ============================================================
export async function processFBTimer(env) {
  console.log('[FB TIMER] Starting Facebook timer processing...');

  const stats = {
    processed: 0,
    success: 0,
    failed: 0,
    skipped: 0
  };

  for (const siteSlug of SITIOS_LIST) {
    const kvKey = `last_fb_post_${siteSlug}`;
    const tableName = `ARTICULOS_SITIO_${siteSlug.toUpperCase()}`;

    try {
      // Check timer from KV
      const lastPostRaw = await env.ARTICLES_KV.get(kvKey);
      const lastPostTime = lastPostRaw ? parseInt(lastPostRaw, 10) : 0;
      const now = Date.now();
      const elapsed = now - lastPostTime;

      if (elapsed < FB_INTERVAL_MS && lastPostTime !== 0) {
        const remainingMin = Math.ceil((FB_INTERVAL_MS - elapsed) / 60000);
        console.log(`[FB TIMER] ${siteSlug}: skipped (timer active, ${remainingMin} min remaining)`);
        stats.skipped++;
        continue;
      }

      // Buscar artículos no publicados primero, si no hay, buscar artículos publicados hace más de 24h
      let article = await env.DB.prepare(`
        SELECT
          s.ID as SITIO_ID,
          s.ID_PARAFRASEADO,
          p.TITULO_PARAFRASEADO as TITULO,
          p.SLUG,
          p.URL_IMAGEN
        FROM ${tableName} s
        JOIN ARTICULOS_PARAFRASEADOS p ON s.ID_PARAFRASEADO = p.ID
        WHERE s.FB_PUBLICADO = 0
          AND p.URL_IMAGEN IS NOT NULL
          AND p.URL_IMAGEN != ''
          AND p.URL_IMAGEN NOT LIKE '%logo.png'
          AND p.URL_IMAGEN NOT LIKE '%fallback%'
          AND p.SLUG IS NOT NULL
          AND p.SLUG != ''
        ORDER BY s.FECHA_ASIGNACION ASC
        LIMIT 1
      `).first();

      // Si no hay artículos nuevos, buscar artículos publicados hace más de 24h para re-publicar
      if (!article) {
        article = await env.DB.prepare(`
          SELECT
            s.ID as SITIO_ID,
            s.ID_PARAFRASEADO,
            p.TITULO_PARAFRASEADO as TITULO,
            p.SLUG,
            p.URL_IMAGEN
          FROM ${tableName} s
          JOIN ARTICULOS_PARAFRASEADOS p ON s.ID_PARAFRASEADO = p.ID
          WHERE s.FB_PUBLICADO = 1
            AND s.FB_FECHA < datetime('now', '-1 day')
            AND p.URL_IMAGEN IS NOT NULL
            AND p.URL_IMAGEN != ''
            AND p.URL_IMAGEN NOT LIKE '%logo.png'
            AND p.URL_IMAGEN NOT LIKE '%fallback%'
            AND p.SLUG IS NOT NULL
            AND p.SLUG != ''
          ORDER BY s.FB_FECHA ASC
          LIMIT 1
        `).first();
        
        if (article) {
          // Resetear FB_PUBLICADO para poder re-publicar
          await env.DB.prepare(`
            UPDATE ${tableName} SET FB_PUBLICADO = 0 WHERE ID = ?
          `).bind(article.SITIO_ID).run();
          console.log(`[FB TIMER] ${siteSlug}: re-publicando artículo antiguo`);
        }
      }

      if (!article) {
        console.log(`[FB TIMER] ${siteSlug}: skipped (no pending articles)`);
        stats.skipped++;
        continue;
      }

      stats.processed++;

      // Publish to Facebook
      const fbResult = await publishToFBIndividual(env, article, siteSlug);

      if (fbResult.success) {
        // Update database
        await env.DB.prepare(`
          UPDATE ${tableName}
          SET FB_PUBLICADO = 1, FB_FECHA = datetime('now'), FB_POST_ID = ?
          WHERE ID = ?
        `).bind(fbResult.post_id, article.SITIO_ID).run();

        // Update timer in KV
        await env.ARTICLES_KV.put(kvKey, now.toString());

        // Notify engagement engine
        if (fbResult.post_id && env.ENGAGEMENT_ENGINE_URL) {
          try {
            const payload = {
              facebook_post_id: fbResult.post_id,
              page_id: fbResult.page_id
            };
            
            const urls = [env.ENGAGEMENT_ENGINE_URL, env.ENGAGEMENT_ENGINE_URL2].filter(Boolean);
            
            for (const baseUrl of urls) {
              try {
                await fetch(`${baseUrl}/webhook/publish`, {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'x-webhook-secret': env.ENGAGEMENT_WEBHOOK_SECRET || ''
                  },
                  body: JSON.stringify(payload)
                });
                console.log(`[ENGAGEMENT] Notified ${baseUrl}`);
                break;
              } catch (e) {
                console.error(`[ENGAGEMENT] Failed ${baseUrl}:`, e.message);
              }
            }
          } catch (e) {
            console.error(`[ENGAGEMENT] Notification failed for ${siteSlug}:`, e.message);
          }
        }

        console.log(`[FB TIMER] ${siteSlug}: published successfully (${fbResult.post_id})`);
        stats.success++;
      } else {
        console.error(`[FB TIMER] ${siteSlug}: publish failed - ${fbResult.error}`);
        stats.failed++;
      }

      // Small delay between sites to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 500));

    } catch (e) {
      console.error(`[FB TIMER] ${siteSlug}: error - ${e.message}`);
      stats.failed++;
    }
  }

  console.log(`[FB TIMER] Complete: processed=${stats.processed}, success=${stats.success}, failed=${stats.failed}, skipped=${stats.skipped}`);
  return stats;
}
