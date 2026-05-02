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

facebook.post('/update-token', async (c) => {
  const { slug, token } = await c.req.json();
  if (!slug || !token) return c.json({ success: false, error: 'Missing slug or token' }, 400);
  try {
    const result = await c.env.DB.prepare(`
      UPDATE SITIOS SET FACEBOOK_PAGE_TOKEN = ?, FACEBOOK_TOKEN_UPDATED_AT = datetime('now') WHERE SLUG = ?
    `).bind(token, slug).run();
    return result.meta?.changes > 0 
      ? c.json({ success: true, slug })
      : c.json({ success: false, error: 'Site not found' }, 404);
  } catch (e) {
    return c.json({ success: false, error: e.message }, 500);
  }
});

export default facebook;
