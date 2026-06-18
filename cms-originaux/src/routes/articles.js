// src/routes/articles.js — CRUD de artículos publicados

import { Hono } from 'hono';
import { checkAuth } from '../middleware/auth.js';
import { articleSlugify, parseArticleRow, sanitizePublishedAt } from '../utils/helpers.js';

const articles = new Hono();

const isValidSiteSlug = (s) => typeof s === 'string' && /^[a-z0-9_]+$/i.test(s);

const splitSiteSlugs = (value) => {
  if (Array.isArray(value)) return value;
  if (typeof value !== 'string') return [];
  return value.split(',');
};

const normalizeTargetSites = ({ value, allowedSet, fallbackSite }) => {
  const candidates = splitSiteSlugs(value)
    .map((s) => (typeof s === 'string' ? s.trim().toLowerCase() : ''))
    .filter(Boolean)
    .filter(isValidSiteSlug)
    .filter((s) => allowedSet.has(s));

  const unique = [...new Set(candidates)];
  if (unique.length > 0) return unique;
  return fallbackSite ? [fallbackSite] : [];
};

// ── GET /articles — Listado con filtros ──────────────────────
articles.get('/', async (c) => {
  const { site, limit = 20, offset = 0, category } = c.req.query();
  const l = parseInt(limit) || 20;
  const o = parseInt(offset) || 0;

  try {
    if (site) {
      const tableName = `ARTICULOS_SITIO_${site.toUpperCase()}`;
      let query = `
        SELECT p.*, s.FB_PUBLICADO, s.FB_FECHA, s.FB_POST_ID
        FROM ${tableName} s
        JOIN ARTICULOS_PARAFRASEADOS p ON s.ID_PARAFRASEADO = p.ID
        WHERE p.ESTADO = 'PUBLICADO'
      `;
      const params = [];
      if (category) {
        query += ' AND LOWER(p.CATEGORIA) = LOWER(?)';
        params.push(category);
      }
      query += ' ORDER BY p.FECHA_PUBLICACION DESC LIMIT ? OFFSET ?';
      params.push(l, o);
      const res = await c.env.DB.prepare(query).bind(...params).all();
      const rows = (res.results || []).map(parseArticleRow).filter(Boolean);
      return c.json({ articles: rows });
    }

    // Sin filtro: consultar PARAFRASEADOS y CMS
    let queryPara  = "SELECT *, 'PARAFRASEADO' as SOURCE_TABLE FROM ARTICULOS_PARAFRASEADOS WHERE ESTADO = 'PUBLICADO'";
    let paramsPara = [];
    let queryCMS   = "SELECT *, 'CMS' as SOURCE_TABLE FROM ARTICULOS_CMS WHERE ESTADO = 'PUBLICADO'";
    let paramsCMS  = [];

    if (category) {
      queryPara += ' AND LOWER(CATEGORIA) = LOWER(?)';
      paramsPara.push(category);
      queryCMS += ' AND LOWER(CATEGORIA) = LOWER(?)';
      paramsCMS.push(category);
    }

    queryPara += ' ORDER BY FECHA_PUBLICACION DESC LIMIT ? OFFSET ?';
    paramsPara.push(l, o);
    queryCMS += ' ORDER BY FECHA_PUBLICACION DESC LIMIT ? OFFSET ?';
    paramsCMS.push(l, o);

    const [resPara, resCMS] = await Promise.all([
      c.env.DB.prepare(queryPara).bind(...paramsPara).all(),
      c.env.DB.prepare(queryCMS).bind(...paramsCMS).all(),
    ]);

    const rows = [...(resPara.results || []), ...(resCMS.results || [])]
      .map(parseArticleRow)
      .filter(Boolean)
      .sort((a, b) => new Date(b.publishedAt || b.createdAt || 0) - new Date(a.publishedAt || a.createdAt || 0))
      .slice(0, l);

    return c.json({ articles: rows });
  } catch (e) {
    console.error('Error en GET /articles:', e.message);
    return c.json({ error: e.message }, 500);
  }
});

// ── GET /articles/id/:id — Artículo por ID ───────────────────
articles.get('/id/:id', async (c) => {
  if (!await checkAuth(c)) return c.json({ error: 'Unauthorized' }, 401);
  try {
    const id = c.req.param('id');
    const rowPara = await c.env.DB.prepare("SELECT *, 'PARAFRASEADO' as SOURCE_TABLE FROM ARTICULOS_PARAFRASEADOS WHERE ID = ?").bind(id).first();
    if (rowPara) return c.json({ article: parseArticleRow(rowPara) });

    const rowCMS = await c.env.DB.prepare("SELECT *, 'CMS' as SOURCE_TABLE FROM ARTICULOS_CMS WHERE ID = ?").bind(id).first();
    if (rowCMS) return c.json({ article: parseArticleRow(rowCMS) });

    return c.json({ error: 'Artículo no encontrado' }, 404);
  } catch (e) {
    return c.json({ error: e.message }, 500);
  }
});

// ── PUT /articles/:id — Actualizar artículo publicado ─────────
articles.put('/:id', async (c) => {
  if (!await checkAuth(c)) return c.json({ error: 'Unauthorized' }, 401);
  try {
    const id = c.req.param('id');
    const body = await c.req.json();

    const paraRow = await c.env.DB.prepare('SELECT ID FROM ARTICULOS_PARAFRASEADOS WHERE ID = ?').bind(id).first();
    if (!paraRow) {
      // Fallback: actualizar CMS
      const cmsRow = await c.env.DB.prepare('SELECT ID FROM ARTICULOS_CMS WHERE ID = ?').bind(id).first();
      if (!cmsRow) return c.json({ error: 'Artículo no encontrado' }, 404);
      await c.env.DB.prepare(`
        UPDATE ARTICULOS_CMS SET
          TITULO = ?, SLUG = ?, CONTENIDO = ?, DESCRIPCION = ?,
          CATEGORIA = ?, URL_IMAGEN = ?, SITIOS_DESTINO = ?, DESTACADO = ?, FB_REQUERIDO = ?
        WHERE ID = ?
      `).bind(
        body.title, body.slug, body.content, body.excerpt,
        body.category, body.imageUrl, Array.isArray(body.site) ? body.site.join(',') : (body.site || ''),
        body.featured ? 1 : 0, body.fbRequired ? 1 : 0, id
      ).run();
      return c.json({ success: true, table: 'ARTICULOS_CMS' });
    }

    const { SITIOS_LIST } = await import('../config.js');
    const allowedSet = new Set((SITIOS_LIST || []).map((s) => (typeof s === 'string' ? s.toLowerCase() : '')).filter(Boolean));
    const fallbackSite = allowedSet.has('cbnnoticias') ? 'cbnnoticias' : (SITIOS_LIST?.[0]?.toLowerCase() || null);
    const targetSites = normalizeTargetSites({ value: body.sites ?? body.site, allowedSet, fallbackSite });

    await c.env.DB.prepare(`
      UPDATE ARTICULOS_PARAFRASEADOS SET
        TITULO_PARAFRASEADO = ?, SLUG = ?, CONTENIDO = ?, DESCRIPCION_PARAFRASEADA = ?,
        CATEGORIA = ?, URL_IMAGEN = ?, SITIO_DESTINO = ?, DESTACADO = ?, FB_REQUERIDO = ?
      WHERE ID = ?
    `).bind(
      body.title, body.slug, body.content, body.excerpt,
      body.category, body.imageUrl, targetSites.join(','),
      body.featured ? 1 : 0, body.fbRequired ? 1 : 0, id
    ).run();

    await syncSiteTables(c.env.DB, id, targetSites);

    return c.json({ success: true, table: 'ARTICULOS_PARAFRASEADOS' });
  } catch (e) {
    console.error('Error PUT /articles/:id:', e.message);
    return c.json({ error: e.message }, 500);
  }
});

// ── DELETE /articles/:id — Eliminar artículo publicado ───────
articles.delete('/:id', async (c) => {
  if (!await checkAuth(c)) return c.json({ error: 'Unauthorized' }, 401);
  try {
    const id = c.req.param('id');

    const paraRow = await c.env.DB.prepare('SELECT ID FROM ARTICULOS_PARAFRASEADOS WHERE ID = ?').bind(id).first();
    const cmsRow = await c.env.DB.prepare('SELECT ID FROM ARTICULOS_CMS WHERE ID = ?').bind(id).first();

    if (!paraRow && !cmsRow) return c.json({ error: 'Artículo no encontrado' }, 404);

    if (paraRow) {
      await c.env.DB.prepare('DELETE FROM ARTICULOS_PARAFRASEADOS WHERE ID = ?').bind(id).run();
      const { SITIOS_LIST } = await import('../config.js');
      for (const site of (SITIOS_LIST || [])) {
        const tableName = `ARTICULOS_SITIO_${site.toUpperCase()}`;
        try {
          await c.env.DB.prepare(`DELETE FROM ${tableName} WHERE ID_PARAFRASEADO = ?`).bind(id).run();
        } catch (err) { /* tabla no existe */ }
      }
    }

    if (cmsRow) {
      await c.env.DB.prepare('DELETE FROM ARTICULOS_CMS WHERE ID = ?').bind(id).run();
    }

    return c.json({ success: true });
  } catch (e) {
    console.error('Error DELETE /articles/:id:', e.message);
    return c.json({ error: e.message }, 500);
  }
});

async function syncSiteTables(DB, paraId, newSites) {
  const desired = [...new Set(newSites.filter(Boolean))];
  const { SITIOS_LIST } = await import('../config.js');
  const allSites = new Set((SITIOS_LIST || []).map((s) => (typeof s === 'string' ? s.toLowerCase() : '')).filter(Boolean));

  const existing = [];
  for (const siteSlug of allSites) {
    const tableName = `ARTICULOS_SITIO_${siteSlug.toUpperCase()}`;
    try {
      const row = await DB.prepare(`SELECT ID FROM ${tableName} WHERE ID_PARAFRASEADO = ?`).bind(paraId).first();
      if (row) existing.push({ site: siteSlug, siteTableId: row.ID });
    } catch (e) { /* tabla no existe */ }
  }

  const existingSites = new Set(existing.map((e) => e.site));

  for (const { site, siteTableId } of existing) {
    if (!desired.includes(site)) {
      const tableName = `ARTICULOS_SITIO_${site.toUpperCase()}`;
      await DB.prepare(`DELETE FROM ${tableName} WHERE ID = ?`).bind(siteTableId).run();
    }
  }

  for (const site of desired) {
    if (!existingSites.has(site)) {
      const tableName = `ARTICULOS_SITIO_${site.toUpperCase()}`;
      const siteId = crypto.randomUUID();
      try {
        await DB.prepare(`INSERT INTO ${tableName} (ID, ID_PARAFRASEADO, FECHA_ASIGNACION, FB_PUBLICADO, FB_FECHA, FB_POST_ID) VALUES (?, ?, datetime('now'), 0, NULL, NULL)`)
          .bind(siteId, paraId).run();
      } catch (e) { console.error(`Error insertando en ${tableName}:`, e.message); }
    }
  }
}

export default articles;
