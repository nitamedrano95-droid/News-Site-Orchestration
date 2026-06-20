// src/routes/stats.js — Estadísticas del dashboard

import { Hono } from 'hono';
import { checkAuth } from '../middleware/auth.js';
import { SITIOS_LIST } from '../config.js';

const stats = new Hono();

// ── GET /stats — Estadísticas compatibles con el editor nuevo ─
stats.get('/', async (c) => {
  if (!await checkAuth(c)) return c.json({ error: 'Unauthorized' }, 401);
  try {
    const totalPub = await c.env.DB.prepare(
      'SELECT COUNT(*) as count FROM ARTICULOS_PARAFRASEADOS WHERE ESTADO = "PUBLICADO"'
    ).first();

    const totalCMS = await c.env.DB.prepare(
      "SELECT COUNT(*) as count FROM ARTICULOS_CMS"
    ).first();

    const totalDrafts = await c.env.DB.prepare(
      "SELECT COUNT(*) as count FROM ARTICULOS_CMS WHERE ESTADO = 'BORRADOR'"
    ).first();

    return c.json({
      articles: totalPub ? totalPub.count : 0,
      drafts: totalDrafts ? totalDrafts.count : 0,
      published: totalCMS ? totalCMS.count : 0,
    });
  } catch (e) {
    console.error('Stats error:', e.message);
    return c.json({ error: e.message }, 500);
  }
});

// ── GET /stats/dashboard — Estadísticas reales para el admin ─
stats.get('/dashboard', async (c) => {
  if (!await checkAuth(c)) return c.json({ error: 'Unauthorized' }, 401);
  // Helper tolerante a tablas faltantes: si una query falla, retorna 0
  // y loguea en consola, sin tumbar el resto del endpoint.
  const safeCount = async (sql, ...params) => {
    try {
      const row = params.length
        ? await c.env.DB.prepare(sql).bind(...params).first()
        : await c.env.DB.prepare(sql).first();
      return row?.count ?? 0;
    } catch (e) {
      console.warn(`[stats] safeCount skip: ${e.message}`);
      return 0;
    }
  };
  try {
    // Total publicados (parafraseados + CMS publicados)
    const totalPubCount = await safeCount(
      'SELECT COUNT(*) as count FROM ARTICULOS_PARAFRASEADOS WHERE ESTADO = "PUBLICADO"'
    );
    const totalCMSPubCount = await safeCount(
      "SELECT COUNT(*) as count FROM ARTICULOS_CMS WHERE ESTADO = 'PUBLICADO'"
    );

    // Borradores totales (CMS + PARAFRASEADOS)
    const totalCMSDraftCount = await safeCount(
      "SELECT COUNT(*) as count FROM ARTICULOS_CMS WHERE ESTADO = 'BORRADOR'"
    );
    const totalParaDraftCount = await safeCount(
      "SELECT COUNT(*) as count FROM ARTICULOS_PARAFRASEADOS WHERE ESTADO = 'BORRADOR'"
    );

    // Pendientes de revisión
    const totalRevCount = await safeCount(
      "SELECT COUNT(*) as count FROM REVISION_CONTENIDO WHERE ESTADO = 'PENDIENTE'"
    );

    // Facebook: Contar publicados en todas las tablas de sitio
    let fbPublished = 0;
    for (const siteSlug of SITIOS_LIST) {
      const tableName = `ARTICULOS_SITIO_${siteSlug.toUpperCase()}`;
      fbPublished += await safeCount(
        `SELECT COUNT(*) as count FROM ${tableName} WHERE FB_PUBLICADO = 1`
      );
    }

    // Sitios activos
    const totalSites = await safeCount(
      'SELECT COUNT(*) as count FROM SITIOS WHERE ACTIVO = 1'
    );

    // Facebook pendiente
    let fbPending = 0;
    for (const siteSlug of SITIOS_LIST) {
      const tableName = `ARTICULOS_SITIO_${siteSlug.toUpperCase()}`;
      fbPending += await safeCount(
        `SELECT COUNT(*) as count FROM ${tableName} WHERE FB_PUBLICADO = 0`
      );
    }

    // Artículos web publicados hoy (usando FECHA_PUBLICACION ISO UTC)
    const webToday = await safeCount(`
      SELECT COUNT(*) as count FROM ARTICULOS_PARAFRASEADOS
      WHERE ESTADO = 'PUBLICADO'
        AND FECHA_PUBLICACION >= datetime('now', 'start of day')
    `);

    // Artículos ingestados en las últimas 24 horas
    const ingested24h = await safeCount(`
      SELECT COUNT(*) as count FROM ARTICULOS_PARAFRASEADOS
      WHERE FECHA_PUBLICACION >= datetime('now', '-1 day')
    `);

    return c.json({
      articles: totalPubCount + totalCMSPubCount,
      drafts: totalCMSDraftCount + totalParaDraftCount,
      pending: totalRevCount,
      facebook: fbPublished,
      facebookPending: fbPending,
      sites: totalSites,
      webToday: webToday,
      ingested24h: ingested24h,
    });
  } catch (e) {
    console.error('Stats error:', e.message);
    return c.json({ error: e.message }, 500);
  }
});

// ── GET /stats/ingested — Artículos ingestados recientemente ─
stats.get('/ingested', async (c) => {
  if (!await checkAuth(c)) return c.json({ error: 'Unauthorized' }, 401);
  try {
    const days = parseInt(c.req.query('days') || '1', 10);
    const validDays = [1, 7, 30].includes(days) ? days : 1;

    const countResult = await c.env.DB.prepare(`
      SELECT COUNT(*) as count FROM ARTICULOS_PARAFRASEADOS
      WHERE FECHA_PUBLICACION >= datetime('now', '-${validDays} day')
    `).first();

    const articles = await c.env.DB.prepare(`
      SELECT
        ID,
        TITULO_PARAFRASEADO as title,
        SLUG as slug,
        CATEGORIA as category,
        SITIO_DESTINO as site,
        FECHA_PUBLICACION as date,
        VISTAS as views
      FROM ARTICULOS_PARAFRASEADOS
      WHERE FECHA_PUBLICACION >= datetime('now', '-${validDays} day')
      ORDER BY FECHA_PUBLICACION DESC
      LIMIT 50
    `).all();

    return c.json({
      days: validDays,
      count: countResult ? countResult.count : 0,
      articles: articles.results || [],
    });
  } catch (e) {
    console.error('Stats ingested error:', e.message);
    return c.json({ error: e.message }, 500);
  }
});

export default stats;
