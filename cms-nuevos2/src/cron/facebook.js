import { SITIOS_LIST, SITE_DOMAIN_MAP } from '../config.js';
import { decodeHTMLEntities, articleSlugify, fetchWithTimeout, notifyTelegram } from '../utils/helpers.js';

const FB_INTERVAL_MS = 3.5 * 60 * 60 * 1000; // 3.5 horas = 4 publicaciones/día (ventana 8-22 = 14h)

export async function publishToFBIndividual(env, article, siteSlug) {
  try {
    const site = await env.DB.prepare(
      'SELECT * FROM SITIOS WHERE SLUG = ? AND FACEBOOK_ACTIVO = 1'
    ).bind(siteSlug).first();

    if (!site) {
      return { success: false, error: `Site ${siteSlug} not found or Facebook inactive` };
    }

    const token = site.FACEBOOK_PAGE_TOKEN || env[site.FACEBOOK_TOKEN_SECRET];
    if (!token) {
      return { success: false, error: `Missing Facebook token for ${siteSlug}` };
    }

    if (!site.FACEBOOK_PAGE_ID) {
      return { success: false, error: `Missing Facebook page ID for ${siteSlug}` };
    }

    if (!article.TITULO) {
      return { success: false, error: 'Article missing title' };
    }

    const safeSlug = (article.SLUG && article.SLUG.trim())
      ? article.SLUG.trim()
      : articleSlugify(article.TITULO);

    if (!safeSlug) {
      return { success: false, error: 'Cannot generate slug for article' };
    }

    const domain = SITE_DOMAIN_MAP[siteSlug] || `https://${siteSlug}.pages.dev`;
    const url = `${domain}/articulo/?slug=${encodeURIComponent(safeSlug)}`;

    console.log(`[FB] Publishing to ${siteSlug}: ${article.TITULO?.substring(0, 50)}...`);
    console.log(`[FB] URL: ${url}`);

    let photoId = null;

    if (article.URL_IMAGEN && article.URL_IMAGEN.startsWith('http')) {
      try {
        console.log(`[FB] Uploading image via URL: ${article.URL_IMAGEN.substring(0, 60)}...`);
        const photoForm = new FormData();
        photoForm.append('access_token', token);
        photoForm.append('published', 'false');
        photoForm.append('url', article.URL_IMAGEN);

        const photoRes = await fetch(
          `https://graph.facebook.com/v19.0/${site.FACEBOOK_PAGE_ID}/photos`,
          { method: 'POST', body: photoForm }
        );

        const photoData = await photoRes.json();

        if (photoRes.ok && photoData.id) {
          photoId = photoData.id;
          console.log(`[FB] Photo uploaded via URL: ${photoId}`);
        } else {
          console.warn(`[FB] Photo upload via URL failed: ${photoData.error?.message || JSON.stringify(photoData.error) || 'unknown'}`);
        }
      } catch (imgErr) {
        console.warn(`[FB] Image URL upload failed: ${imgErr.message}`);
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
// isNighttimeBlackout — Check if it's currently within the
// nighttime posting blackout (22:00 to 08:00 local time)
// ============================================================
function isNighttimeBlackout(env, siteSlug) {
  const tz = env.SITE_TIMEZONE || 'America/Mexico_City';
  const now = new Date();
  const localHour = parseInt(
    now.toLocaleString('en-US', { timeZone: tz, hour: 'numeric', hour12: false }),
    10
  );
  if (localHour >= 22 || localHour < 8) {
    console.log(`[FB TIMER] ${siteSlug}: skipped (nighttime blackout ${localHour}:00)`);
    return true;
  }
  return false;
}

export async function processFBTimer(env) {
  console.log('[FB TIMER] Starting Facebook timer processing...');

  const stats = {
    processed: 0,
    success: 0,
    failed: 0,
    skipped: 0
  };

  for (const siteSlug of SITIOS_LIST) {
    // Nighttime check for retries
    if (isNighttimeBlackout(env, siteSlug)) {
      continue;
    }
    // Nighttime blackout check
    if (isNighttimeBlackout(env, siteSlug)) {
      stats.skipped++;
      continue;
    }
    // Skip if nighttime
  if (isNighttimeBlackout(env, siteSlug)) {
    return { processed: 0, success: 0, failed: 0, skipped: 1 };
  }

  const kvKey = `last_fb_post_${siteSlug}`;
    const tableName = `ARTICULOS_SITIO_${siteSlug.toUpperCase()}`;

    try {
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
          AND s.FECHA_ASIGNACION >= datetime('now', '-48 hours')
          AND p.URL_IMAGEN IS NOT NULL
          AND p.URL_IMAGEN != ''
          AND p.URL_IMAGEN NOT LIKE '%logo.png'
          AND p.URL_IMAGEN NOT LIKE '%fallback%'
          AND p.SLUG IS NOT NULL
          AND p.SLUG != ''
        ORDER BY s.FECHA_ASIGNACION DESC
        LIMIT 1
      `).first();

      if (!article) {
        console.log(`[FB TIMER] ${siteSlug}: skipped (no pending articles)`);
        stats.skipped++;
        continue;
      }

      // Claim atómico: evitar publicación duplicada en ejecuciones paralelas del cron
      const claim = await env.DB.prepare(
        `UPDATE ${tableName} SET FB_PUBLICADO = 2 WHERE ID = ? AND FB_PUBLICADO = 0`
      ).bind(article.SITIO_ID).run();
      if (claim.changes === 0) {
        console.log(`[FB TIMER] ${siteSlug}: skipped (article already claimed)`);
        stats.skipped++;
        continue;
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
        await env.DB.prepare(
          `UPDATE ${tableName} SET FB_PUBLICADO = 0 WHERE ID = ? AND FB_PUBLICADO = 2`
        ).bind(article.SITIO_ID).run();
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
    // Nighttime check for retries
    if (isNighttimeBlackout(env, siteSlug)) {
      continue;
    }
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
  // Skip if nighttime
  if (isNighttimeBlackout(env, siteSlug)) {
    return { processed: 0, success: 0, failed: 0, skipped: 1 };
  }

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
        AND s.FECHA_ASIGNACION >= datetime('now', '-48 hours')
        AND p.URL_IMAGEN IS NOT NULL
        AND p.URL_IMAGEN != ''
        AND p.URL_IMAGEN NOT LIKE '%logo.png'
        AND p.URL_IMAGEN NOT LIKE '%fallback%'
        AND p.SLUG IS NOT NULL
        AND p.SLUG != ''
      ORDER BY s.FECHA_ASIGNACION DESC
      LIMIT 1
    `).first();

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