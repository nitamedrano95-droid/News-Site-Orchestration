import { Hono } from 'hono';
import { runRSSIngest, runRSSIngestForSite, getFuentesForSite, processPreScrapedArticle, handleIngestGlobal } from '../cron/rss-ingest.js';
import { processFBTimer, processFBTimerForSite, processFBRetries, processFBRetriesForSite } from '../cron/facebook.js';
import { updateTickerData } from '../cron/ticker.js';
import { runMasterCron } from '../cron/master.js';

const jobs = new Hono();

const isValidSiteSlug = (s) => typeof s === 'string' && /^[a-z0-9_]+$/i.test(s);

// GET /api/jobs/fuentes/:site — Expone las FUENTES activas para un sitio
// (para que n8n sepa qué RSS/scraping ejecutar)
jobs.get('/fuentes/:site', async (c) => {
  const siteSlug = c.req.param('site').toLowerCase().trim();
  if (!isValidSiteSlug(siteSlug)) {
    return c.json({ error: 'Invalid site slug' }, 400);
  }

  try {
    const fuentes = await getFuentesForSite(c.env, siteSlug);
    return c.json({ success: true, site: siteSlug, fuentes });
  } catch (e) {
    console.error(`[JOBS] Fuentes lookup failed for ${siteSlug}:`, e.message);
    return c.json({ success: false, site: siteSlug, error: e.message }, 500);
  }
});

// POST /api/jobs/ingest/:site
// Sin body: comportamiento actual (scrapeo completo desde el Worker)
// Con body { articles: [...] }: procesa artículos pre-scrapeados desde n8n
jobs.post('/ingest/:site', async (c) => {
  const siteSlug = c.req.param('site').toLowerCase().trim();
  if (!isValidSiteSlug(siteSlug)) {
    return c.json({ error: 'Invalid site slug' }, 400);
  }

  // Leer body si existe
  let body;
  try {
    body = await c.req.json();
  } catch {
    body = null;
  }

  // Modo n8n: artículos pre-scrapeados
  if (body && body.articles && Array.isArray(body.articles)) {
    console.log(`[JOBS] Processing ${body.articles.length} pre-scraped articles for site: ${siteSlug}`);
    let processed = 0;
    const errors = [];

    for (const article of body.articles) {
      try {
        const result = await processPreScrapedArticle(c.env, siteSlug, article);
        if (result) processed++;
      } catch (e) {
        errors.push({ title: article.title, error: e.message });
      }
    }

    return c.json({
      success: true,
      site: siteSlug,
      articlesIngested: processed,
      totalReceived: body.articles.length,
      errors: errors.length > 0 ? errors : undefined
    });
  }

  // Modo legacy: Worker hace todo el scrapeo
  console.log(`[JOBS] Starting RSS ingest for site: ${siteSlug}`);
  try {
    const count = await runRSSIngestForSite(c.env, siteSlug);
    return c.json({ success: true, site: siteSlug, articlesIngested: count });
  } catch (e) {
    console.error(`[JOBS] RSS ingest failed for ${siteSlug}:`, e.message);
    return c.json({ success: false, site: siteSlug, error: e.message }, 500);
  }
});

jobs.post('/ingest/all', async (c) => {
  console.log('[JOBS] Starting RSS ingest for all sites');
  try {
    const count = await runRSSIngest(c.env);
    return c.json({ success: true, articlesIngested: count });
  } catch (e) {
    console.error('[JOBS] RSS ingest failed:', e.message);
    return c.json({ success: false, error: e.message }, 500);
  }
});

jobs.post('/ingest/global', async (c) => {
  let body;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ success: false, error: 'Body JSON requerido' }, 400);
  }
  try {
    const result = await handleIngestGlobal(c.env, body);
    return c.json(result);
  } catch (e) {
    console.error(`[JOBS] Ingest global failed:`, e.message);
    return c.json({ success: false, error: e.message }, 500);
  }
});

jobs.post('/publish-fb/:site', async (c) => {
  const siteSlug = c.req.param('site').toLowerCase().trim();
  if (!isValidSiteSlug(siteSlug)) {
    return c.json({ error: 'Invalid site slug' }, 400);
  }

  console.log(`[JOBS] Starting FB publish for site: ${siteSlug}`);
  try {
    const stats = await processFBTimerForSite(c.env, siteSlug);
    return c.json({ success: true, site: siteSlug, stats });
  } catch (e) {
    console.error(`[JOBS] FB publish failed for ${siteSlug}:`, e.message);
    return c.json({ success: false, site: siteSlug, error: e.message }, 500);
  }
});

jobs.post('/publish-fb/all', async (c) => {
  console.log('[JOBS] Starting FB publish for all sites');
  try {
    const stats = await processFBTimer(c.env);
    return c.json({ success: true, stats });
  } catch (e) {
    console.error('[JOBS] FB publish failed:', e.message);
    return c.json({ success: false, error: e.message }, 500);
  }
});

jobs.post('/retries/:site', async (c) => {
  const siteSlug = c.req.param('site').toLowerCase().trim();
  if (!isValidSiteSlug(siteSlug)) {
    return c.json({ error: 'Invalid site slug' }, 400);
  }

  console.log(`[JOBS] Starting FB retries for site: ${siteSlug}`);
  try {
    const stats = await processFBRetriesForSite(c.env, siteSlug);
    return c.json({ success: true, site: siteSlug, stats });
  } catch (e) {
    console.error(`[JOBS] FB retries failed for ${siteSlug}:`, e.message);
    return c.json({ success: false, site: siteSlug, error: e.message }, 500);
  }
});

jobs.post('/retries/all', async (c) => {
  console.log('[JOBS] Starting FB retries for all sites');
  try {
    const stats = await processFBRetries(c.env);
    return c.json({ success: true, stats });
  } catch (e) {
    console.error('[JOBS] FB retries failed:', e.message);
    return c.json({ success: false, error: e.message }, 500);
  }
});

jobs.post('/ticker', async (c) => {
  console.log('[JOBS] Starting ticker update');
  try {
    await updateTickerData(c.env);
    return c.json({ success: true });
  } catch (e) {
    console.error('[JOBS] Ticker update failed:', e.message);
    return c.json({ success: false, error: e.message }, 500);
  }
});

jobs.post('/run', async (c) => {
  console.log('[JOBS] Starting full master cron');
  try {
    const status = await runMasterCron(c.env);
    return c.json({ success: true, status });
  } catch (e) {
    console.error('[JOBS] Master cron failed:', e.message);
    return c.json({ success: false, error: e.message }, 500);
  }
});

export default jobs;