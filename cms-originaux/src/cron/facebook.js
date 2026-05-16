// src/cron/facebook.js — Publicación automática a Facebook (6 posts/día/página, timer 4h)

import { SITIOS_LIST, SITE_DOMAIN_MAP } from '../config.js';
import { decodeHTMLEntities, articleSlugify, fetchWithTimeout, notifyTelegram } from '../utils/helpers.js';

const FB_INTERVAL_MS = 60 * 60 * 1000;

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

    // Get domain for the site
    const domain = SITE_DOMAIN_MAP[siteSlug] || `https://${siteSlug}.pages.dev`;
    const safeSlug = (article.SLUG && article.SLUG.trim())
      ? article.SLUG.trim()
      : articleSlugify(article.TITULO);
    const url = `${domain}/articulo/?slug=${encodeURIComponent(safeSlug)}`;

    console.log(`[FB] Publishing to ${siteSlug}: ${article.TITULO?.substring(0, 50)}...`);
    console.log(`[FB] URL: ${url}`);

    let photoId = null;

    if (article.URL_IMAGEN && article.URL_IMAGEN.startsWith('http')) {
      try {
        console.log(`[FB] Fetching image: ${article.URL_IMAGEN.substring(0, 60)}...`);
        const imgRes = await fetchWithTimeout(article.URL_IMAGEN, {
          headers: { 'User-Agent': 'Mozilla/5.0' }
        }, 10000);

        if (imgRes.ok) {
          const imgBlob = await imgRes.blob();
          const photoForm = new FormData();
          photoForm.append('access_token', token);
          photoForm.append('published', 'false');
          photoForm.append('source', imgBlob, 'image.jpg');

          const photoRes = await fetch(
            `https://graph.facebook.com/v19.0/${site.FACEBOOK_PAGE_ID}/photos`,
            { method: 'POST', body: photoForm }
          );

          const photoData = await photoRes.json();

          if (photoRes.ok && photoData.id) {
            photoId = photoData.id;
            console.log(`[FB] Photo uploaded: ${photoId}`);
          } else {
            console.warn(`[FB] Photo upload failed: ${photoData.error?.message || 'unknown'}`);
          }
        }
      } catch (imgErr) {
        console.warn(`[FB] Image fetch/upload failed: ${imgErr.message}`);
      }
    }

    const formData = new FormData();
    formData.append('message', decodeHTMLEntities(article.TITULO));
    formData.append('link', url);
    formData.append('access_token', token);

    if (photoId) {
      formData.append('attached_media[0]', JSON.stringify({ media_fbid: photoId }));
    }

    const fbResponse = await fetch(
      `https://graph.facebook.com/v19.0/${site.FACEBOOK_PAGE_ID}/feed`,
      { method: 'POST', body: formData }
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
          AND s.FECHA_ASIGNACION >= datetime('now', '-3 days')
          AND p.URL_IMAGEN IS NOT NULL
          AND p.URL_IMAGEN != ''
          AND p.URL_IMAGEN NOT LIKE '%logo.png'
          AND p.URL_IMAGEN NOT LIKE '%fallback%'
          AND p.SLUG IS NOT NULL
          AND p.SLUG != ''
        ORDER BY s.FECHA_ASIGNACION ASC
        LIMIT 1
      `).first();

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
            AND s.FECHA_ASIGNACION >= datetime('now', '-3 days')
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
          await env.DB.prepare(`UPDATE ${tableName} SET FB_PUBLICADO = 0 WHERE ID = ?`).bind(article.SITIO_ID).run();
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
            
            // Try primary URL first, then fallback to URL2
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
        await enqueueFBRetry(env, siteSlug, article, fbResult.error);
        await notifyTelegram(env, {
          type: 'fb_publish_failed',
          site: siteSlug,
          message: `Publicación FB falló para ${siteSlug}: ${fbResult.error}`,
          details: { articleId: article.SITIO_ID, error: fbResult.error }
        });
      }

      await new Promise(resolve => setTimeout(resolve, 500));

    } catch (e) {
      console.error(`[FB TIMER] ${siteSlug}: error - ${e.message}`);
      stats.failed++;
      await notifyTelegram(env, {
        type: 'fb_publish_error',
        site: siteSlug,
        message: `Error publicando FB para ${siteSlug}: ${e.message}`,
        details: { error: e.message, stack: e.stack }
      });
    }
  }

  console.log(`[FB TIMER] Complete: processed=${stats.processed}, success=${stats.success}, failed=${stats.failed}, skipped=${stats.skipped}`);
  return stats;
}

const MAX_FB_RETRIES = 3;
const FB_RETRY_DELAYS_MS = [15 * 60 * 1000, 30 * 60 * 1000, 60 * 60 * 1000];

async function enqueueFBRetry(env, siteSlug, article, errorMsg) {
  const kvKey = `fb_retries_${siteSlug}`;
  try {
    const existing = await env.ARTICLES_KV.get(kvKey);
    const queue = existing ? JSON.parse(existing) : [];
    if (queue.some(r => r.sitioId === article.SITIO_ID)) return;
    queue.push({
      sitioId: article.SITIO_ID,
      idParafraseado: article.ID_PARAFRASEADO,
      retries: 0,
      nextRetryAt: Date.now() + FB_RETRY_DELAYS_MS[0],
      error: errorMsg
    });
    await env.ARTICLES_KV.put(kvKey, JSON.stringify(queue));
    console.log(`[FB RETRY] Enqueued ${siteSlug}/${article.SITIO_ID}`);
  } catch (e) {
    console.error(`[FB RETRY] Failed to enqueue:`, e.message);
  }
}

export async function processFBRetries(env) {
  console.log('[FB RETRY] Processing retries...');
  let totalRetried = 0;
  let totalSuccess = 0;

  for (const siteSlug of SITIOS_LIST) {
    const kvKey = `fb_retries_${siteSlug}`;
    const tableName = `ARTICULOS_SITIO_${siteSlug.toUpperCase()}`;

    try {
      const raw = await env.ARTICLES_KV.get(kvKey);
      if (!raw) continue;

      let queue = JSON.parse(raw);
      const now = Date.now();
      const dueRetries = queue.filter(r => r.nextRetryAt <= now);

      if (dueRetries.length === 0) continue;

      const remainingQueue = [];

      for (const retry of dueRetries) {
        totalRetried++;

        const article = await env.DB.prepare(`
          SELECT
            s.ID as SITIO_ID,
            s.ID_PARAFRASEADO,
            p.TITULO_PARAFRASEADO as TITULO,
            p.SLUG,
            p.URL_IMAGEN
          FROM ${tableName} s
          JOIN ARTICULOS_PARAFRASEADOS p ON s.ID_PARAFRASEADO = p.ID
          WHERE s.ID = ?
        `).bind(retry.sitioId).first();

        if (!article) {
          console.log(`[FB RETRY] ${siteSlug}: article ${retry.sitioId} gone, dropping`);
          continue;
        }

        const fbResult = await publishToFBIndividual(env, article, siteSlug);

        if (fbResult.success) {
          await env.DB.prepare(`
            UPDATE ${tableName}
            SET FB_PUBLICADO = 1, FB_FECHA = datetime('now'), FB_POST_ID = ?
            WHERE ID = ?
          `).bind(fbResult.post_id, retry.sitioId).run();

          console.log(`[FB RETRY] ${siteSlug}: retry succeeded (${fbResult.post_id})`);
          totalSuccess++;
        } else {
          retry.retries++;
          if (retry.retries >= MAX_FB_RETRIES) {
            console.error(`[FB RETRY] ${siteSlug}: max retries for ${retry.sitioId}, dropping`);
          } else {
            retry.nextRetryAt = now + FB_RETRY_DELAYS_MS[retry.retries];
            retry.error = fbResult.error;
            remainingQueue.push(retry);
            console.log(`[FB RETRY] ${siteSlug}: retry ${retry.retries} failed, next=${new Date(retry.nextRetryAt).toISOString()}`);
          }
        }
      }

      const nonDue = queue.filter(r => r.nextRetryAt > now);
      const newQueue = [...nonDue, ...remainingQueue];

      if (newQueue.length === 0) {
        await env.ARTICLES_KV.delete(kvKey);
      } else {
        await env.ARTICLES_KV.put(kvKey, JSON.stringify(newQueue));
      }
    } catch (e) {
      console.error(`[FB RETRY] ${siteSlug}: error -`, e.message);
    }
  }

  console.log(`[FB RETRY] Complete: retried=${totalRetried}, succeeded=${totalSuccess}`);
  return { retried: totalRetried, succeeded: totalSuccess };
}

export async function processFBTimerForSite(env, siteSlug) {
  const kvKey = `last_fb_post_${siteSlug}`;
  const tableName = `ARTICULOS_SITIO_${siteSlug.toUpperCase()}`;

  const stats = { processed: 0, success: 0, failed: 0, skipped: 0 };

  try {
    const lastPostRaw = await env.ARTICLES_KV.get(kvKey);
    const lastPostTime = lastPostRaw ? parseInt(lastPostRaw, 10) : 0;
    const now = Date.now();
    const elapsed = now - lastPostTime;

    if (elapsed < FB_INTERVAL_MS && lastPostTime !== 0) {
      const remainingMin = Math.ceil((FB_INTERVAL_MS - elapsed) / 60000);
      console.log(`[FB TIMER] ${siteSlug}: skipped (timer active, ${remainingMin} min remaining)`);
      stats.skipped++;
      return stats;
    }

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
        await env.DB.prepare(`
          UPDATE ${tableName} SET FB_PUBLICADO = 0 WHERE ID = ?
        `).bind(article.SITIO_ID).run();
        console.log(`[FB TIMER] ${siteSlug}: re-publicando artículo antiguo`);
      }
    }

    if (!article) {
      console.log(`[FB TIMER] ${siteSlug}: skipped (no pending articles)`);
      stats.skipped++;
      return stats;
    }

    stats.processed++;
    const fbResult = await publishToFBIndividual(env, article, siteSlug);

    if (fbResult.success) {
      await env.DB.prepare(`
        UPDATE ${tableName}
        SET FB_PUBLICADO = 1, FB_FECHA = datetime('now'), FB_POST_ID = ?
        WHERE ID = ?
      `).bind(fbResult.post_id, article.SITIO_ID).run();

      await env.ARTICLES_KV.put(kvKey, now.toString());
      console.log(`[FB TIMER] ${siteSlug}: published successfully (${fbResult.post_id})`);
      stats.success++;
    } else {
      console.error(`[FB TIMER] ${siteSlug}: publish failed - ${fbResult.error}`);
      stats.failed++;
      await enqueueFBRetry(env, siteSlug, article, fbResult.error);
      await notifyTelegram(env, {
        type: 'fb_publish_failed',
        site: siteSlug,
        message: `Publicación FB falló para ${siteSlug}: ${fbResult.error}`,
        details: { articleId: article.SITIO_ID, error: fbResult.error }
      });
    }
  } catch (e) {
    console.error(`[FB TIMER] ${siteSlug}: error - ${e.message}`);
    stats.failed++;
    await notifyTelegram(env, {
      type: 'fb_publish_error',
      site: siteSlug,
      message: `Error publicando FB para ${siteSlug}: ${e.message}`,
      details: { error: e.message, stack: e.stack }
    });
  }

  return stats;
}

export async function processFBRetriesForSite(env, siteSlug) {
  const kvKey = `fb_retries_${siteSlug}`;
  const tableName = `ARTICULOS_SITIO_${siteSlug.toUpperCase()}`;

  let totalRetried = 0;
  let totalSuccess = 0;

  try {
    const raw = await env.ARTICLES_KV.get(kvKey);
    if (!raw) return { retried: 0, succeeded: 0 };

    let queue = JSON.parse(raw);
    const now = Date.now();
    const dueRetries = queue.filter(r => r.nextRetryAt <= now);

    if (dueRetries.length === 0) return { retried: 0, succeeded: 0 };

    const remainingQueue = [];

    for (const retry of dueRetries) {
      totalRetried++;

      const article = await env.DB.prepare(`
        SELECT
          s.ID as SITIO_ID,
          s.ID_PARAFRASEADO,
          p.TITULO_PARAFRASEADO as TITULO,
          p.SLUG,
          p.URL_IMAGEN
        FROM ${tableName} s
        JOIN ARTICULOS_PARAFRASEADOS p ON s.ID_PARAFRASEADO = p.ID
        WHERE s.ID = ?
      `).bind(retry.sitioId).first();

      if (!article) {
        console.log(`[FB RETRY] ${siteSlug}: article ${retry.sitioId} gone, dropping`);
        continue;
      }

      const fbResult = await publishToFBIndividual(env, article, siteSlug);

      if (fbResult.success) {
        await env.DB.prepare(`
          UPDATE ${tableName}
          SET FB_PUBLICADO = 1, FB_FECHA = datetime('now'), FB_POST_ID = ?
          WHERE ID = ?
        `).bind(fbResult.post_id, retry.sitioId).run();

        console.log(`[FB RETRY] ${siteSlug}: retry succeeded (${fbResult.post_id})`);
        totalSuccess++;
      } else {
        retry.retries++;
        if (retry.retries >= MAX_FB_RETRIES) {
          console.error(`[FB RETRY] ${siteSlug}: max retries for ${retry.sitioId}, dropping`);
        } else {
          retry.nextRetryAt = now + FB_RETRY_DELAYS_MS[retry.retries];
          retry.error = fbResult.error;
          remainingQueue.push(retry);
          console.log(`[FB RETRY] ${siteSlug}: retry ${retry.retries} failed, next=${new Date(retry.nextRetryAt).toISOString()}`);
        }
      }
    }

    const nonDue = queue.filter(r => r.nextRetryAt > now);
    const newQueue = [...nonDue, ...remainingQueue];

    if (newQueue.length === 0) {
      await env.ARTICLES_KV.delete(kvKey);
    } else {
      await env.ARTICLES_KV.put(kvKey, JSON.stringify(newQueue));
    }
  } catch (e) {
    console.error(`[FB RETRY] ${siteSlug}: error -`, e.message);
  }

  return { retried: totalRetried, succeeded: totalSuccess };
}
