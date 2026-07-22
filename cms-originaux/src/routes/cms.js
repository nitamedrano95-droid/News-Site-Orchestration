// src/routes/cms.js — Gestión de artículos CMS (borradores y publicación)

import { Hono } from 'hono';
import { checkAuth } from '../middleware/auth.js';
import { articleSlugify } from '../utils/helpers.js';
import { publishToFBIndividual } from '../cron/facebook.js';
import { uploadToR2 } from '../utils/html.js';

const cms = new Hono();

// Normalizador de fila ARTICULOS_CMS al formato del editor
function normalizeCMSArticle(row) {
  if (!row) return null;
  return {
    id: row.ID,
    title: row.TITULO || '',
    slug: row.SLUG || '',
    content: row.CONTENIDO || '',
    excerpt: row.DESCRIPCION || '',
    category: row.CATEGORIA || 'NACIONAL',
    author: 'Redacción CMS',
    imageUrl: row.URL_IMAGEN || '',
    site: row.SITIOS_DESTINO || '',
    status: row.ESTADO || 'BORRADOR',
    featured: Boolean(row.DESTACADO || 0),
    createdAt: row.FECHA_CREACION,
    publishedAt: row.FECHA_PUBLICACION,
    metaTitle: row.META_TITLE || '',
    metaDescription: row.META_DESCRIPTION || '',
    focusKeyword: row.FOCUS_KEYWORD || '',
    tags: row.TAGS ? row.TAGS.split(',').map((t) => t.trim()).filter(Boolean) : [],
  };
}

// Normalizador unificado para artículos PARAFRASEADOS y CMS
function normalizeArticleUnified(row) {
  if (!row) return null;
  const sourceTable = row.SOURCE_TABLE || (row.TITULO_PARAFRASEADO !== undefined ? 'PARAFRASEADO' : 'CMS');
  if (sourceTable === 'PARAFRASEADO' || row.TITULO_PARAFRASEADO !== undefined) {
    return {
      id: row.ID,
      title: row.TITULO_PARAFRASEADO || '',
      slug: row.SLUG || '',
      content: row.CONTENIDO || '',
      excerpt: row.DESCRIPCION_PARAFRASEADA || row.DESCRIPCION || '',
      category: row.CATEGORIA || 'NACIONAL',
      author: row.AUTOR || 'Redacción Parafraseado',
      imageUrl: row.URL_IMAGEN || '',
      site: row.SITIO_DESTINO || '',
      status: row.ESTADO || 'PUBLICADO',
      featured: Boolean(row.DESTACADO || 0),
      createdAt: row.FECHA_PUBLICACION,
      publishedAt: row.FECHA_PUBLICACION,
      metaTitle: row.META_TITLE || '',
      metaDescription: row.META_DESCRIPTION || '',
      focusKeyword: row.FOCUS_KEYWORD || '',
      tags: row.TAGS ? row.TAGS.split(',').map((t) => t.trim()).filter(Boolean) : [],
      sourceTable: 'PARAFRASEADO',
      fbRequired: Boolean(row.FB_REQUERIDO || 0),
    };
  }
  return { ...normalizeCMSArticle(row), sourceTable: 'CMS' };
}

// ── GET /cms/articles — Listar borradores ────────────────────
cms.get('/gallery', async (c) => {
  const { limit = 100, search = '' } = c.req.query();
  const l = parseInt(limit) || 100;

  try {
    const { SITIOS_LIST } = await import('../config.js');
    const validSites = new Set(SITIOS_LIST.map((s) => s.toLowerCase()));
    const publishedStates = ['publicado', 'published', 'activo', 'publish'];

    // 1. Traer artículos publicados de PARAFRASEADOS y CMS
    let queryPara = "SELECT *, 'PARAFRASEADO' as SOURCE_TABLE FROM ARTICULOS_PARAFRASEADOS";
    let queryCMS  = "SELECT *, 'CMS' as SOURCE_TABLE FROM ARTICULOS_CMS";
    const paramsPara = [];
    const paramsCMS = [];

    const statePlaceholders = publishedStates.map(() => '?').join(',');
    queryPara += ` WHERE LOWER(ESTADO) IN (${statePlaceholders})`;
    queryCMS  += " WHERE ESTADO IN ('PUBLICADO', 'BORRADOR')";
    paramsPara.push(...publishedStates);

    if (search) {
      queryPara += ' AND (TITULO_PARAFRASEADO LIKE ? OR SLUG LIKE ?)';
      queryCMS  += ' AND (TITULO LIKE ? OR SLUG LIKE ?)';
      paramsPara.push(`%${search}%`, `%${search}%`);
      paramsCMS.push(`%${search}%`, `%${search}%`);
    }

    queryPara += ' ORDER BY FECHA_PUBLICACION DESC LIMIT ?';
    queryCMS  += ' ORDER BY FECHA_PUBLICACION DESC LIMIT ?';
    paramsPara.push(l);
    paramsCMS.push(l);

    const [resPara, resCMS] = await Promise.all([
      c.env.DB.prepare(queryPara).bind(...paramsPara).all(),
      c.env.DB.prepare(queryCMS).bind(...paramsCMS).all(),
    ]);

    const rows = [...(resPara.results || []), ...(resCMS.results || [])];

    // 2. Ensamblar respuesta con sitios destino validados
    const articles = rows
      .map((row) => {
        const base = normalizeArticleUnified(row);
        if (!base) return null;

        if (base.sourceTable === 'PARAFRASEADO') {
          const raw = String(row.SITIO_DESTINO || '')
            .split(',')
            .map((s) => s.trim().toLowerCase())
            .filter(Boolean);
          base.siteList = [...new Set(raw.filter((s) => validSites.has(s)))].filter((s) => validSites.has(s));
          base.site = base.siteList.join(',');
        } else {
          base.siteList = (base.site || '')
            .split(',')
            .map((s) => s.trim().toLowerCase())
            .filter((s) => validSites.has(s));
          base.site = base.siteList.join(',');
        }

        return base;
      })
      .filter(Boolean)
      .sort((a, b) => new Date(b.publishedAt || b.createdAt || 0) - new Date(a.publishedAt || a.createdAt || 0))
      .slice(0, l);

    return c.json({ articles });
  } catch (e) {
    console.error('Error en GET /cms/gallery:', e.message);
    return c.json({ error: e.message }, 500);
  }
});

// ── GET /cms/articles — Listar borradores ────────────────────
cms.get('/articles', async (c) => {
  try {
    const { search, limit = 50, offset = 0 } = c.req.query();
    let query = 'SELECT * FROM ARTICULOS_CMS';
    const params = [];
    if (search && search.trim()) {
      query += ' WHERE TITULO LIKE ? OR DESCRIPCION LIKE ? OR CONTENIDO LIKE ?';
      const like = `%${search.trim()}%`;
      params.push(like, like, like);
    }
    query += ' ORDER BY FECHA_CREACION DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit) || 50, parseInt(offset) || 0);

    const res = await c.env.DB.prepare(query).bind(...params).all();
    const articles = (res.results || []).map(normalizeCMSArticle).filter(Boolean);
    return c.json({ articles });
  } catch (e) {
    return c.json({ error: e.message }, 500);
  }
});

// ── GET /cms/articles/:id — Artículo por ID (CMS o PARAFRASEADO) ──────────────────
cms.get('/articles/:id', async (c) => {
  try {
    const id = c.req.param('id');

    // 1. Buscar en CMS
    const rowCMS = await c.env.DB.prepare('SELECT * FROM ARTICULOS_CMS WHERE ID = ?').bind(id).first();
    if (rowCMS) return c.json({ article: normalizeArticleUnified(rowCMS) });

    // 2. Buscar en PARAFRASEADOS
    const rowPara = await c.env.DB.prepare("SELECT * FROM ARTICULOS_PARAFRASEADOS WHERE ID = ?").bind(id).first();
    if (rowPara) return c.json({ article: normalizeArticleUnified(rowPara) });

    return c.json({ error: 'Artículo no encontrado' }, 404);
  } catch (e) {
    return c.json({ error: e.message }, 500);
  }
});

// ── GET /cms/articles/:id/seo — SEO de artículo (CMS o PARAFRASEADO) ──────────────
cms.get('/articles/:id/seo', async (c) => {
  try {
    const id = c.req.param('id');

    const rowCMS = await c.env.DB.prepare(
      'SELECT META_TITLE, META_DESCRIPTION, FOCUS_KEYWORD, TAGS FROM ARTICULOS_CMS WHERE ID = ?'
    ).bind(id).first();
    if (rowCMS) {
      return c.json({
        metaTitle: rowCMS.META_TITLE || '',
        metaDescription: rowCMS.META_DESCRIPTION || '',
        focusKeyword: rowCMS.FOCUS_KEYWORD || '',
        tags: rowCMS.TAGS ? rowCMS.TAGS.split(',').map((t) => t.trim()).filter(Boolean) : [],
      });
    }

    const rowPara = await c.env.DB.prepare(
      'SELECT META_TITLE, META_DESCRIPTION, FOCUS_KEYWORD, TAGS FROM ARTICULOS_PARAFRASEADOS WHERE ID = ?'
    ).bind(id).first();
    if (rowPara) {
      return c.json({
        metaTitle: rowPara.META_TITLE || '',
        metaDescription: rowPara.META_DESCRIPTION || '',
        focusKeyword: rowPara.FOCUS_KEYWORD || '',
        tags: rowPara.TAGS ? rowPara.TAGS.split(',').map((t) => t.trim()).filter(Boolean) : [],
      });
    }

    return c.json({ error: 'Artículo no encontrado' }, 404);
  } catch (e) {
    return c.json({ error: e.message }, 500);
  }
});

// ── POST /cms/articles — Crear o actualizar artículo CMS/PARAFRASEADO ─────────
cms.post('/articles', async (c) => {
  if (!await checkAuth(c)) return c.json({ error: 'Unauthorized' }, 401);
  try {
    const body = await c.req.json();

    // Soporte de nombres en español e inglés
    const id         = body.id;
    const titulo     = body.titulo     || body.title;
    const contenido  = body.contenido  || body.content;
    const descripcion = body.descripcion || body.excerpt;
    const categoria  = body.categoria  || body.category;
    const url_imagen = body.url_imagen || body.imageUrl;
    const sitiosDestino = body.sitios_destino || body.site || body.sitios || body.sites;
    const destacado  = body.destacado !== undefined ? body.destacado : (body.featured ? 1 : 0);
    const estado     = body.estado     || body.status;
    const fbRequerido = body.fb_requerido !== undefined ? body.fb_requerido : body.fbRequired;

    // Campos SEO
    const metaTitle = body.metaTitle || body.meta_title || '';
    const metaDescription = body.metaDescription || body.meta_description || '';
    const focusKeyword = body.focusKeyword || body.focus_keyword || '';
    const tags = Array.isArray(body.tags)
      ? body.tags.join(',')
      : (body.tags || '').toString();

    const sitiosStr = Array.isArray(sitiosDestino)
      ? sitiosDestino.map((s) => `${s}`.trim()).filter(Boolean).join(',')
      : `${sitiosDestino || ''}`.split(',').map((s) => s.trim()).filter(Boolean).join(',');
    const sitiosList = sitiosStr.split(',').filter(Boolean);

    if (!titulo) return c.json({ error: 'Título requerido' }, 400);

    const now       = new Date().toISOString();
    const articleId = id || crypto.randomUUID();
    let slug        = body.slug || articleSlugify(titulo);
    let retryCount  = 0;
    const maxRetries = 3;

    // Determinar destino: CMS, PARAFRASEADO o nuevo
    let targetTable = 'ARTICULOS_CMS';
    if (id) {
      const existsCMS = await c.env.DB.prepare('SELECT ID FROM ARTICULOS_CMS WHERE ID = ?').bind(id).first();
      const existsPara = await c.env.DB.prepare('SELECT ID FROM ARTICULOS_PARAFRASEADOS WHERE ID = ?').bind(id).first();
      if (existsPara) targetTable = 'ARTICULOS_PARAFRASEADOS';
      else if (!existsCMS) return c.json({ error: 'Artículo no encontrado' }, 404);
    }

    while (retryCount < maxRetries) {
      try {
        if (targetTable === 'ARTICULOS_CMS') {
          // ── CMS ──
          if (!id) {
            const existingSlug = await c.env.DB.prepare(
              'SELECT ID, TITULO FROM ARTICULOS_CMS WHERE SLUG = ? LIMIT 1'
            ).bind(slug).first();

            if (existingSlug) {
              slug = `${articleSlugify(titulo)}-${Date.now()}`;
              console.log(`[CMS] SLUG "${articleSlugify(titulo)}" ya existe. Usando: ${slug}`);
            }
          } else if (!body.slug) {
            const current = await c.env.DB.prepare('SELECT SLUG FROM ARTICULOS_CMS WHERE ID = ?').bind(id).first();
            if (current?.SLUG) slug = current.SLUG;
          }

          if (id) {
            await c.env.DB.prepare(`
              UPDATE ARTICULOS_CMS SET
                TITULO = ?, SLUG = ?, CONTENIDO = ?, DESCRIPCION = ?,
                CATEGORIA = ?, URL_IMAGEN = ?, SITIOS_DESTINO = ?, DESTACADO = ?, ESTADO = ?, FB_REQUERIDO = ?,
                META_TITLE = ?, META_DESCRIPTION = ?, FOCUS_KEYWORD = ?, TAGS = ?,
                LEGACY_SLUG = CASE WHEN SLUG IS NOT NULL AND SLUG != ? THEN SLUG ELSE LEGACY_SLUG END
              WHERE ID = ?
            `).bind(
              titulo, slug, contenido || '', descripcion || '',
              (categoria || 'NACIONAL').toUpperCase(), url_imagen || '', sitiosStr,
              destacado || 0, estado || 'BORRADOR', fbRequerido ? 1 : 0,
              metaTitle, metaDescription, focusKeyword, tags,
              slug, id
            ).run();
          } else {
            await c.env.DB.prepare(`
              INSERT INTO ARTICULOS_CMS (
                ID, TITULO, SLUG, CONTENIDO, DESCRIPCION, CATEGORIA, URL_IMAGEN, SITIOS_DESTINO,
                DESTACADO, ESTADO, FECHA_CREACION, FB_REQUERIDO,
                META_TITLE, META_DESCRIPTION, FOCUS_KEYWORD, TAGS
              )
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `).bind(
              articleId, titulo, slug, contenido || '', descripcion || '',
              (categoria || 'NACIONAL').toUpperCase(), url_imagen || '', sitiosStr,
              destacado || 0, estado || 'BORRADOR', now, fbRequerido ? 1 : 0,
              metaTitle, metaDescription, focusKeyword, tags
            ).run();
          }
        } else {
          // ── PARAFRASEADO ──
          if (!body.slug) {
            const current = await c.env.DB.prepare('SELECT SLUG FROM ARTICULOS_PARAFRASEADOS WHERE ID = ?').bind(id).first();
            if (current?.SLUG) slug = current.SLUG;
          }

          await c.env.DB.prepare(`
            UPDATE ARTICULOS_PARAFRASEADOS SET
              TITULO_PARAFRASEADO = ?, SLUG = ?, CONTENIDO = ?, DESCRIPCION_PARAFRASEADA = ?,
              CATEGORIA = ?, URL_IMAGEN = ?, SITIO_DESTINO = ?, DESTACADO = ?, ESTADO = ?, FB_REQUERIDO = ?,
              META_TITLE = ?, META_DESCRIPTION = ?, FOCUS_KEYWORD = ?, TAGS = ?,
              LEGACY_SLUG = COALESCE(LEGACY_SLUG, ?)
            WHERE ID = ?
          `).bind(
            titulo, slug, contenido || '', descripcion || '',
            (categoria || 'NACIONAL').toUpperCase(), url_imagen || '', sitiosStr,
            destacado || 0, estado || 'PUBLICADO', fbRequerido ? 1 : 0,
            metaTitle, metaDescription, focusKeyword, tags,
            current?.SLUG || slug,
            id
          ).run();

          // Sincronizar tablas ARTICULOS_SITIO_<SLUG>
          await syncSiteTables(c.env.DB, id, sitiosList);
        }

        break; // Éxito — salir del loop

      } catch (dbErr) {
        if (dbErr.message.includes('UNIQUE constraint failed') && retryCount < maxRetries - 1) {
          retryCount++;
          slug = `${articleSlugify(titulo)}-${Date.now()}-${retryCount}`;
          console.log(`[CMS] UNIQUE constraint error. Retry ${retryCount}/${maxRetries} con SLUG: ${slug}`);
        } else {
          throw dbErr;
        }
      }
    }

    return c.json({ success: true, id: articleId, slug, table: targetTable });
  } catch (e) {
    console.error('[CMS/articles] Error:', e.message);
    return c.json({ error: e.message }, 500);
  }
});

// Sincroniza las tablas por sitio para un artículo parafraseado
async function syncSiteTables(DB, paraId, newSites) {
  const desired = [...new Set(newSites.filter(Boolean))];
  const existing = [];

  // Obtener todos los sitios configurados para saber qué tablas inspeccionar
  const { SITIOS_LIST } = await import('../config.js');
  const allSites = new Set((SITIOS_LIST || []).map((s) => s.toLowerCase()).filter(Boolean));

  for (const siteSlug of allSites) {
    const tableName = `ARTICULOS_SITIO_${siteSlug.toUpperCase()}`;
    try {
      const row = await DB.prepare(`SELECT ID FROM ${tableName} WHERE ID_PARAFRASEADO = ?`).bind(paraId).first();
      if (row) existing.push({ site: siteSlug, siteTableId: row.ID });
    } catch (e) {
      // Tabla no existe: ignorar
    }
  }

  const existingSites = new Set(existing.map((e) => e.site));

  // Eliminar sitios que ya no están asignados
  for (const { site, siteTableId } of existing) {
    if (!desired.includes(site)) {
      const tableName = `ARTICULOS_SITIO_${site.toUpperCase()}`;
      try {
        await DB.prepare(`DELETE FROM ${tableName} WHERE ID = ?`).bind(siteTableId).run();
      } catch (e) {
        console.error(`[syncSiteTables] Error eliminando de ${tableName}:`, e.message);
      }
    }
  }

  // Agregar sitios nuevos
  for (const site of desired) {
    if (existingSites.has(site)) continue;
    const tableName = `ARTICULOS_SITIO_${site.toUpperCase()}`;
    try {
      await DB.prepare(`
        INSERT INTO ${tableName} (ID, ID_PARAFRASEADO, FECHA_ASIGNACION, FB_PUBLICADO, FB_FECHA, FB_POST_ID)
        VALUES (?, ?, datetime('now'), 0, NULL, NULL)
      `).bind(crypto.randomUUID(), paraId).run();
    } catch (e) {
      console.error(`[syncSiteTables] Error insertando en ${tableName}:`, e.message);
    }
  }
}

// ── DELETE /cms/articles/:id — Eliminar artículo CMS o PARAFRASEADO y sus tablas por sitio ─────────────
cms.delete('/articles/:id', async (c) => {
  if (!await checkAuth(c)) return c.json({ error: 'Unauthorized' }, 401);
  try {
    const id = c.req.param('id');
    const results = { cms: false, parafraseados: false, siteTables: [] };

    // Resolve el ID de PARAFRASEADOS asociado (si el artículo es CMS publicado)
    let paraId = id;
    const cmsRow = await c.env.DB.prepare('SELECT SLUG FROM ARTICULOS_CMS WHERE ID = ?').bind(id).first();
    if (cmsRow?.SLUG) {
      const paraRow = await c.env.DB.prepare(
        'SELECT ID FROM ARTICULOS_PARAFRASEADOS WHERE SLUG = ? AND ESTADO = "PUBLICADO" LIMIT 1'
      ).bind(cmsRow.SLUG).first();
      if (paraRow?.ID) paraId = paraRow.ID;
    }

    // Eliminar de tablas por sitio
    const { SITIOS_LIST } = await import('../config.js');
    const allSites = new Set((SITIOS_LIST || []).map((s) => s.toLowerCase()).filter(Boolean));

    for (const siteSlug of allSites) {
      const tableName = `ARTICULOS_SITIO_${siteSlug.toUpperCase()}`;
      try {
        const res = await c.env.DB.prepare(`DELETE FROM ${tableName} WHERE ID_PARAFRASEADO = ?`).bind(paraId).run();
        if (res.meta?.changes && res.meta.changes > 0) {
          results.siteTables.push(siteSlug);
        }
      } catch (e) {
        // Tabla no existe: ignorar
      }
    }

    // Eliminar de ARTICULOS_PARAFRASEADOS (tanto nativo como el generado desde CMS)
    try {
      await c.env.DB.prepare('DELETE FROM ARTICULOS_PARAFRASEADOS WHERE ID = ? OR SLUG = ?')
        .bind(id, cmsRow?.SLUG || '').run();
      results.parafraseados = true;
    } catch (e) {
      console.error('Delete parafraseados (skip):', e.message);
    }

    // Eliminar de ARTICULOS_CMS
    try {
      await c.env.DB.prepare('DELETE FROM ARTICULOS_CMS WHERE ID = ?').bind(id).run();
      results.cms = true;
    } catch (e) {
      console.error('Delete CMS (may not exist):', e.message);
    }

    return c.json({ success: true, message: 'Artículo eliminado', cleaned: results });
  } catch (e) {
    return c.json({ error: e.message }, 500);
  }
});

// ── POST /cms/generate-variations — Generar variaciones → Mesa de Revisión ──
cms.post('/generate-variations', async (c) => {
  if (!await checkAuth(c)) return c.json({ error: 'Unauthorized' }, 401);
  try {
    const { id, sitios } = await c.req.json();
    if (!id || !Array.isArray(sitios) || sitios.length === 0) {
      return c.json({ error: 'ID y sitios requeridos' }, 400);
    }

    const article = await c.env.DB.prepare(
      'SELECT * FROM ARTICULOS_CMS WHERE ID = ?'
    ).bind(id).first();
    if (!article) return c.json({ error: 'Artículo no encontrado' }, 404);

    const now = new Date().toISOString();
    for (const sitio of sitios) {
      await c.env.DB.prepare(`
        INSERT INTO REVISION_CONTENIDO
          (ID_ORIGEN, TIPO_ORIGEN, TITULO_PROPUESTO, CONTENIDO_PROPUESTO,
           DESCRIPCION_PROPUESTA, SITIO_DESTINO, CATEGORIA, ESTADO, FECHA_CREACION)
        VALUES (?, 'CMS', ?, ?, ?, ?, ?, 'PENDIENTE', ?)
      `).bind(
        id, article.TITULO, article.CONTENIDO || '',
        article.DESCRIPCION || '', sitio,
        article.CATEGORIA || 'NACIONAL', now
      ).run();
    }

    return c.json({ success: true, variations: sitios.length });
  } catch (e) {
    return c.json({ error: e.message }, 500);
  }
});

// ── POST /cms/publish — Publicar directamente desde CMS o PARAFRASEADO ──────
cms.post('/publish', async (c) => {
  if (!await checkAuth(c)) return c.json({ error: 'Unauthorized' }, 401);
  try {
    const { id, sitios, fb_requerido, title, slug, content, excerpt, category, imageUrl } = await c.req.json();
    if (!id || !Array.isArray(sitios) || sitios.length === 0) {
      return c.json({ error: 'ID y sitios requeridos' }, 400);
    }

    // 1. ¿Es CMS o PARAFRASEADO?
    let articleCMS = await c.env.DB.prepare('SELECT * FROM ARTICULOS_CMS WHERE ID = ?').bind(id).first();
    let articlePara = await c.env.DB.prepare('SELECT * FROM ARTICULOS_PARAFRASEADOS WHERE ID = ?').bind(id).first();

    if (!articleCMS && !articlePara) return c.json({ error: 'Artículo no encontrado' }, 404);

    const sitiosStr = sitios.join(',');
    const shouldPublishToFB = Boolean(fb_requerido);
    const now = new Date().toISOString();

    // Si es parafraseado nativo, actualizarlo directamente (y opcionalmente SEO)
    if (articlePara) {
      const existingSites = String(articlePara.SITIO_DESTINO || '')
        .split(',')
        .map((s) => s.trim().toLowerCase())
        .filter(Boolean);
      const mergedSites = [...new Set([...existingSites, ...sitios.map((s) => s.trim().toLowerCase())])];
      const mergedSitesStr = mergedSites.join(',');

      const baseSlug = articlePara.SLUG || (slug ? articleSlugify(slug) : articleSlugify(articlePara.TITULO_PARAFRASEADO));
      const baseTitle = title || articlePara.TITULO_PARAFRASEADO;
      const baseContent = content || articlePara.CONTENIDO;
      const baseExcerpt = excerpt || articlePara.DESCRIPCION_PARAFRASEADA;
      const baseCategory = (category || articlePara.CATEGORIA || 'NACIONAL').toUpperCase();
      const baseImage = imageUrl || articlePara.URL_IMAGEN || '';
      const isFeatured = (articlePara.DESTACADO || 0) === 1 && baseImage !== '';

      await c.env.DB.prepare(`
        UPDATE ARTICULOS_PARAFRASEADOS SET
          TITULO_PARAFRASEADO = ?, SLUG = ?, CONTENIDO = ?, DESCRIPCION_PARAFRASEADA = ?,
          CATEGORIA = ?, FECHA_PUBLICACION = ?, URL_IMAGEN = ?,
          SITIO_DESTINO = ?, DESTACADO = ?, ESTADO = 'PUBLICADO', FB_REQUERIDO = ?,
          META_TITLE = COALESCE(META_TITLE, ?),
          META_DESCRIPTION = COALESCE(META_DESCRIPTION, ?),
          FOCUS_KEYWORD = COALESCE(FOCUS_KEYWORD, ?),
          TAGS = COALESCE(TAGS, ?)
        WHERE ID = ?
      `).bind(
        baseTitle, baseSlug, baseContent, baseExcerpt,
        baseCategory, now, baseImage,
        mergedSitesStr, isFeatured ? 1 : 0, shouldPublishToFB ? 1 : 0,
        baseTitle, baseExcerpt, '', '',
        id
      ).run();

      await syncSiteTables(c.env.DB, id, mergedSites);

      // Publicar en FB para cada sitio
      for (const siteSlug of mergedSites) {
        const tableName = `ARTICULOS_SITIO_${siteSlug.toUpperCase()}`;
        const row = await c.env.DB.prepare(`SELECT ID FROM ${tableName} WHERE ID_PARAFRASEADO = ?`).bind(id).first();
        if (!row) continue;

        if (shouldPublishToFB) {
          try {
            const fbResult = await publishToFBIndividual(c.env, {
              SITIO_ID: row.ID,
              ID_PARAFRASEADO: id,
              TITULO: baseTitle,
              SLUG: baseSlug,
              URL_IMAGEN: baseImage
            }, siteSlug);

            if (fbResult.success) {
              await c.env.DB.prepare(`
                UPDATE ${tableName} SET FB_PUBLICADO = 1, FB_FECHA = datetime('now'), FB_POST_ID = ? WHERE ID = ?
              `).bind(fbResult.post_id, row.ID).run();
            } else {
              console.error(`[FB] ${siteSlug} FAILED:`, JSON.stringify(fbResult.error));
            }
          } catch (fbErr) {
            console.error(`[FB] ${siteSlug} EXCEPTION:`, fbErr.message);
          }
        }
      }

      return c.json({ success: true, published: 1, updated: 1, siteCount: mergedSites.length, source: 'PARAFRASEADO', sites: mergedSites });
    }

    // ── A partir de aquí es CMS ──
    // Resolver imagen: si ya está en R2 usarla directo; si es externa, subir a R2
    // con fallback al URL original para que Meta/Facebook siempre reciba thumbnail.
    const sourceImageUrl = (imageUrl || articleCMS.URL_IMAGEN || '').trim();
    let processedImageUrl = '';

    if (sourceImageUrl) {
      if (sourceImageUrl.startsWith('https://pub-42bf42f47f554f9791e810e7d0f209d4.r2.dev/')) {
        processedImageUrl = sourceImageUrl;
        console.log(`[CMS] Imagen ya en R2: ${sourceImageUrl.substring(0, 80)}`);
      } else if (sourceImageUrl.startsWith('http')) {
        try {
          console.log(`[CMS] Subiendo imagen a R2: ${sourceImageUrl.substring(0, 80)}...`);
          const r2Url = await uploadToR2(sourceImageUrl, c.env);
          processedImageUrl = r2Url || sourceImageUrl;
          if (!r2Url) console.warn('[CMS] uploadToR2 falló, usando URL original como fallback');
        } catch (imgErr) {
          processedImageUrl = sourceImageUrl;
          console.error(`[CMS] Error al procesar imagen: ${imgErr.message}, usando URL original`);
        }
      }
    }

    const baseSlug = articleCMS.SLUG || articleSlugify(articleCMS.TITULO);

    // Verificar si ya existe un registro publicado con este SLUG
    const existingPara = await c.env.DB.prepare(
      'SELECT ID FROM ARTICULOS_PARAFRASEADOS WHERE SLUG = ? AND ESTADO = "PUBLICADO" LIMIT 1'
    ).bind(baseSlug).first();

    let paraId;
    const isFeatured = (articleCMS.DESTACADO || 0) === 1 && processedImageUrl !== '';

    if (existingPara) {
      paraId = existingPara.ID;
      await c.env.DB.prepare(`
        UPDATE ARTICULOS_PARAFRASEADOS SET
          TITULO_PARAFRASEADO = ?, CONTENIDO = ?, DESCRIPCION_PARAFRASEADA = ?,
          CATEGORIA = ?, FECHA_PUBLICACION = ?, URL_IMAGEN = ?,
          SITIO_DESTINO = ?, DESTACADO = ?, FB_REQUERIDO = ?,
          META_TITLE = COALESCE(?, META_TITLE),
          META_DESCRIPTION = COALESCE(?, META_DESCRIPTION),
          FOCUS_KEYWORD = COALESCE(?, FOCUS_KEYWORD),
          TAGS = COALESCE(?, TAGS)
        WHERE ID = ?
      `).bind(
        articleCMS.TITULO, articleCMS.CONTENIDO || '', articleCMS.DESCRIPCION || '',
        (articleCMS.CATEGORIA || 'NACIONAL').toUpperCase(), now,
        processedImageUrl, sitiosStr, isFeatured ? 1 : 0, shouldPublishToFB ? 1 : 0,
        articleCMS.META_TITLE ?? null, articleCMS.META_DESCRIPTION ?? null,
        articleCMS.FOCUS_KEYWORD ?? null, articleCMS.TAGS ?? null,
        paraId
      ).run();

      await c.env.DB.prepare(
        "UPDATE ARTICULOS_CMS SET ESTADO = 'PUBLICADO', SITIOS_DESTINO = ?, FECHA_PUBLICACION = ?, DESTACADO = ?, FB_REQUERIDO = ? WHERE ID = ?"
      ).bind(sitiosStr, now, isFeatured ? 1 : 0, shouldPublishToFB ? 1 : 0, id).run();

      await syncSiteTables(c.env.DB, paraId, sitios);
    } else {
      await c.env.DB.prepare(
        "UPDATE ARTICULOS_CMS SET ESTADO = 'PUBLICADO', SITIOS_DESTINO = ?, FECHA_PUBLICACION = ?, DESTACADO = ?, FB_REQUERIDO = ? WHERE ID = ?"
      ).bind(sitiosStr, now, isFeatured ? 1 : 0, shouldPublishToFB ? 1 : 0, id).run();

      paraId = crypto.randomUUID();
      await c.env.DB.prepare(`
        INSERT INTO ARTICULOS_PARAFRASEADOS
          (ID, TITULO_PARAFRASEADO, SLUG, CONTENIDO, DESCRIPCION_PARAFRASEADA,
           CATEGORIA, AUTOR, FECHA_PUBLICACION, URL_IMAGEN, SITIO_DESTINO,
           DESTACADO, VISTAS, ESTADO, FB_REQUERIDO,
           META_TITLE, META_DESCRIPTION, FOCUS_KEYWORD, TAGS)
        VALUES (?, ?, ?, ?, ?, ?, 'Redacción CMS', ?, ?, ?, ?, 0, 'PUBLICADO', ?, ?, ?, ?, ?)
      `).bind(
        paraId, articleCMS.TITULO, baseSlug,
        articleCMS.CONTENIDO || '', articleCMS.DESCRIPCION || '',
        (articleCMS.CATEGORIA || 'NACIONAL').toUpperCase(), now,
        processedImageUrl, sitiosStr, isFeatured ? 1 : 0, shouldPublishToFB ? 1 : 0,
        articleCMS.META_TITLE ?? null, articleCMS.META_DESCRIPTION ?? null,
        articleCMS.FOCUS_KEYWORD ?? null, articleCMS.TAGS ?? null
      ).run();

      // DISTRIBUCIÓN: Insertar en cada tabla ARTICULOS_SITIO_{SLUG}
      for (const siteSlug of sitios) {
        const siteId = crypto.randomUUID();
        const tableName = `ARTICULOS_SITIO_${siteSlug.toUpperCase()}`;

        try {
          await c.env.DB.prepare(`
            INSERT INTO ${tableName} (
              ID, ID_PARAFRASEADO, FECHA_ASIGNACION,
              FB_PUBLICADO, FB_FECHA, FB_POST_ID
            ) VALUES (?, ?, datetime('now'), 0, NULL, NULL)
          `).bind(siteId, paraId).run();
        } catch (e) {
          console.error(`[DISTRIBUTION] Error inserting into ${tableName}:`, e.message);
        }
      }
    }

    // Publicar en FB para cada sitio (CMS)
    if (shouldPublishToFB) {
      for (const siteSlug of sitios) {
        const tableName = `ARTICULOS_SITIO_${siteSlug.toUpperCase()}`;
        const row = await c.env.DB.prepare(`SELECT ID FROM ${tableName} WHERE ID_PARAFRASEADO = ?`).bind(paraId).first();
        if (!row) continue;

        try {
          const fbResult = await publishToFBIndividual(c.env, {
            SITIO_ID: row.ID,
            ID_PARAFRASEADO: paraId,
            TITULO: articleCMS.TITULO,
            SLUG: baseSlug,
            URL_IMAGEN: processedImageUrl
          }, siteSlug);

          if (fbResult.success) {
            await c.env.DB.prepare(`
              UPDATE ${tableName} SET FB_PUBLICADO = 1, FB_FECHA = datetime('now'), FB_POST_ID = ? WHERE ID = ?
            `).bind(fbResult.post_id, row.ID).run();
          } else {
            console.error(`[FB] ${siteSlug} FAILED:`, JSON.stringify(fbResult.error));
          }
        } catch (fbErr) {
          console.error(`[FB] ${siteSlug} EXCEPTION:`, fbErr.message);
        }
      }
    }

    return c.json({ success: true, published: 1, siteCount: sitios.length, source: 'CMS', paraId });
  } catch (e) {
    return c.json({ error: e.message }, 500);
  }
});

export default cms;
