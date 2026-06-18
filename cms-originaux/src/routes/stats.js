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
  try {
    // Total de artículos publicados (PARAFRASEADOS + CMS PUBLICADO)
    const totalPub = await c.env.DB.prepare(
      'SELECT COUNT(*) as count FROM ARTICULOS_PARAFRASEADOS WHERE ESTADO = "PUBLICADO"'
    ).first();

    const totalCMSPub = await c.env.DB.prepare(
      "SELECT COUNT(*) as count FROM ARTICULOS_CMS WHERE ESTADO = 'PUBLICADO'"
    ).first();

    // Borradores totales (CMS + PARAFRASEADOS)
    const totalCMS = await c.env.DB.prepare(
      "SELECT COUNT(*) as count FROM ARTICULOS_CMS WHERE ESTADO = 'BORRADOR'"
    ).first();

    const totalParaDraft = await c.env.DB.prepare(
      "SELECT COUNT(*) as count FROM ARTICULOS_PARAFRASEADOS WHERE ESTADO = 'BORRADOR'"
    ).first();

    // Facebook: Contar publicados en todas las tablas de sitio
    let fbPublished = 0;
    for (const siteSlug of SITIOS_LIST) {
      const tableName = `ARTICULOS_SITIO_${siteSlug.toUpperCase()}`;
      const result = await c.env.DB.prepare(`
        SELECT COUNT(*) as count FROM ${tableName} WHERE FB_PUBLICADO = 1
      `).first();
      fbPublished += result?.count || 0;
    }

    // Sitios activos
    const totalSites = await c.env.DB.prepare(
      'SELECT COUNT(*) as count FROM SITIOS WHERE ACTIVO = 1'
    ).first();

    // Facebook pendiente: artículos sin publicar en todas las tablas
    let fbPending = 0;
    for (const siteSlug of SITIOS_LIST) {
      const tableName = `ARTICULOS_SITIO_${siteSlug.toUpperCase()}`;
      const result = await c.env.DB.prepare(`
        SELECT COUNT(*) as count FROM ${tableName} WHERE FB_PUBLICADO = 0
      `).first();
      fbPending += result?.count || 0;
    }

    // Artículos web publicados hoy (usando FECHA_PUBLICACION de ARTICULOS_PARAFRASEADOS)
    const firstSiteTable = `ARTICULOS_SITIO_${SITIOS_LIST[0].toUpperCase()}`;
    const webToday = await c.env.DB.prepare(`
      SELECT COUNT(*) as count FROM ARTICULOS_PARAFRASEADOS ap
      JOIN ${firstSiteTable} s ON s.ID_PARAFRASEADO = ap.ID
      WHERE ap.ESTADO = 'PUBLICADO' AND DATE(ap.FECHA_PUBLICACION) = DATE('now')
    `).first();

    // Artículos ingestados en las últimas 24 horas
    const ingested24h = await c.env.DB.prepare(`
      SELECT COUNT(*) as count FROM ARTICULOS_PARAFRASEADOS
      WHERE DATE(FECHA_PUBLICACION) >= DATE('now', '-1 day')
    `).first();

    return c.json({
      articles: (totalPub ? totalPub.count : 0) + (totalCMSPub ? totalCMSPub.count : 0),
      drafts: (totalCMS ? totalCMS.count : 0) + (totalParaDraft ? totalParaDraft.count : 0),
      facebook: fbPublished,
      sites: totalSites ? totalSites.count : 0,
      webToday: webToday ? webToday.count : 0,
      ingested24h: ingested24h ? ingested24h.count : 0,
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
      WHERE DATE(FECHA_PUBLICACION) >= DATE('now', '-${validDays} day')
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
      WHERE DATE(FECHA_PUBLICACION) >= DATE('now', '-${validDays} day')
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
