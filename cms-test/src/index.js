// src/index.js — Worker MÍNIMO para CMS test
// Solo implementa las rutas que el editor HUB + SeoPanel llaman.
// NO incluye: cron, RSS ingest, FB integration, ticker, weather.
//
// Endpoints:
//   GET    /api/health
//   POST   /api/auth/login
//   GET    /api/categories
//   GET    /api/sites
//   GET    /api/articles
//   GET    /api/articles/slug/:slug
//   GET    /api/articles/id/:id
//   POST   /api/articles
//   PUT    /api/articles/:id
//   DELETE /api/articles/:id

import { Hono } from 'hono'
import { cors } from 'hono/cors'

const app = new Hono()

app.use('*', cors({
  origin: (origin) => origin || '*',
  allowMethods: ['GET','POST','PUT','DELETE','OPTIONS'],
  allowHeaders: ['Content-Type','Authorization'],
  credentials: true,
}))

// ── Health ────────────────────────────────────────────────────────
app.get('/api/health', (c) => c.json({
  status: 'ok',
  service: c.env.SERVICE_NAME || 'cms-test',
  timestamp: new Date().toISOString(),
}))

// ── Auth: login básico (SHA-256) ──────────────────────────────────
async function sha256(text) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('')
}

app.post('/api/auth/login', async (c) => {
  const { email, password } = await c.req.json()
  if (!email || !password) return c.json({ error: 'email y password requeridos' }, 400)

  const user = await c.env.DB.prepare(
    'SELECT ID, NOMBRE, EMAIL, PASSWORD_HASH, ROL, ACTIVO FROM USUARIOS WHERE EMAIL = ? AND ACTIVO = 1'
  ).bind(email).first()

  if (!user) return c.json({ error: 'credenciales inválidas' }, 401)

  const hash = await sha256(password)
  if (hash !== user.PASSWORD_HASH) {
    return c.json({ error: 'credenciales inválidas' }, 401)
  }

  // Token simple: UUID + binding
  const token = crypto.randomUUID()
  await c.env.AUTH_KV.put(`session_${token}`, JSON.stringify({
    user_id: user.ID, email: user.EMAIL, rol: user.ROL,
    expires_at: Date.now() + 24*60*60*1000
  }), { expirationTtl: 86400 })

  return c.json({
    token,
    user: { id: user.ID, nombre: user.NOMBRE, email: user.EMAIL, rol: user.ROL }
  })
})

// ── Middleware auth ───────────────────────────────────────────────
async function requireAuth(c, next) {
  const auth = c.req.header('Authorization')
  if (!auth || !auth.startsWith('Bearer ')) {
    return c.json({ error: 'no autorizado' }, 401)
  }
  const token = auth.slice(7)
  const session = await c.env.AUTH_KV.get(`session_${token}`)
  if (!session) return c.json({ error: 'sesión inválida' }, 401)
  c.set('user', JSON.parse(session))
  await next()
}

// ── Categorías ────────────────────────────────────────────────────
app.get('/api/categories', async (c) => {
  const { results } = await c.env.DB.prepare(
    'SELECT ID, NOMBRE, SLUG FROM CATEGORIAS WHERE ACTIVA = 1 ORDER BY NOMBRE'
  ).all()
  return c.json(results)
})

// ── Sitios ────────────────────────────────────────────────────────
app.get('/api/sites', async (c) => {
  const { results } = await c.env.DB.prepare(
    'SELECT SLUG, NOMBRE, TAGLINE, DOMINIO FROM SITIOS ORDER BY NOMBRE'
  ).all()
  return c.json(results)
})

// ── Artículos: listar ─────────────────────────────────────────────
app.get('/api/articles', async (c) => {
  const sitio = c.req.query('sitio')
  const limit = parseInt(c.req.query('limit') || '20')
  const offset = parseInt(c.req.query('offset') || '0')

  let sql = 'SELECT ID, TITULO, SLUG, DESCRIPCION, CATEGORIA, ESTADO, FECHA_PUBLICACION, URL_IMAGEN, SITIOS_DESTINO, DESTACADO, META_TITLE, META_DESCRIPTION, FOCUS_KEYWORD, TAGS, READING_SCORE FROM ARTICULOS_CMS'
  const params = []
  if (sitio) {
    sql += ' WHERE SITIOS_DESTINO LIKE ?'
    params.push(`%${sitio}%`)
  }
  sql += ' ORDER BY FECHA_PUBLICACION DESC LIMIT ? OFFSET ?'
  params.push(limit, offset)

  const { results } = await c.env.DB.prepare(sql).bind(...params).all()
  return c.json(results)
})

// ── Artículos: por slug ───────────────────────────────────────────
app.get('/api/articles/slug/:slug', async (c) => {
  const { slug } = c.req.param()
  const row = await c.env.DB.prepare(
    'SELECT * FROM ARTICULOS_CMS WHERE SLUG = ?'
  ).bind(slug).first()
  if (!row) return c.json({ error: 'no encontrado' }, 404)
  return c.json(row)
})

// ── Artículos: por id ─────────────────────────────────────────────
app.get('/api/articles/id/:id', async (c) => {
  const { id } = c.req.param()
  const row = await c.env.DB.prepare(
    'SELECT * FROM ARTICULOS_CMS WHERE ID = ?'
  ).bind(id).first()
  if (!row) return c.json({ error: 'no encontrado' }, 404)
  return c.json(row)
})

// ── Artículos: crear (editor HUB) ─────────────────────────────────
app.post('/api/articles', requireAuth, async (c) => {
  const body = await c.req.json()
  const id = crypto.randomUUID()
  const now = new Date().toISOString()

  await c.env.DB.prepare(`
    INSERT INTO ARTICULOS_CMS (
      ID, TITULO, SLUG, DESCRIPCION, CONTENIDO, CATEGORIA, ID_AUTOR,
      URL_IMAGEN, SITIOS_DESTINO, ESTADO, DESTACADO, FECHA_CREACION, FECHA_PUBLICACION,
      FB_PUBLICADO, FB_FECHA, FB_REQUERIDO, FB_SITIOS_PUBLICADOS, LEGACY_SLUG,
      META_TITLE, META_DESCRIPTION, FOCUS_KEYWORD, TAGS,
      READING_SCORE, READING_ANALYSIS, STATE_HISTORY
    ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
  `).bind(
    id,
    body.title,
    body.slug,
    body.descripcion || body.description || null,
    body.content || body.contenido || null,
    body.categoria || body.category || null,
    c.get('user').user_id,
    body.url_imagen || body.image || null,
    body.sitios_destino || body.sitio_destino || null,
    body.estado || 'BORRADOR',
    body.destacado || 0,
    now,
    body.estado === 'PUBLICADO' ? now : null,
    body.fb_publicado || 0,
    body.fb_fecha || null,
    body.fb_requerido || 0,
    body.fb_sitios_publicados || '',
    body.legacy_slug || null,
    body.metaTitle || body.meta_title || null,
    body.metaDescription || body.meta_description || null,
    body.focusKeyword || body.focus_keyword || null,
    Array.isArray(body.tags) ? body.tags.join(',') : (body.tags || null),
    body.reading_score || null,
    body.reading_analysis || null,
    body.state_history || null
  ).run()

  // Si hay sitios_destino, crear asignación en ARTICULOS_SITIO_<SITIO>
  if (body.sitios_destino) {
    const sitios = body.sitios_destino.split(',').map(s => s.trim()).filter(Boolean)
    for (const sitio of sitios) {
      const tableName = `ARTICULOS_SITIO_${sitio.toUpperCase()}`
      try {
        await c.env.DB.prepare(`
          INSERT INTO ${tableName} (ID, ID_PARAFRASEADO, FECHA_ASIGNACION, FB_PUBLICADO)
          VALUES (?, ?, datetime('now'), 0)
        `).bind(crypto.randomUUID(), id).run()
      } catch (e) {
        // Tabla no existe o falla, log pero no fallar el POST principal
        console.error(`[assign] ${tableName}: ${e.message}`)
      }
    }
  }

  // Webhook al workflow de publicación
  if (c.env.ARTICLE_PUBLISH_WEBHOOK &&
      c.env.ARTICLE_PUBLISH_WEBHOOK !== 'TBD_WEBHOOK_URL' &&
      body.estado === 'PUBLICADO') {
    try {
      await fetch(c.env.ARTICLE_PUBLISH_WEBHOOK, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event: 'article_published',
          source: c.env.SERVICE_NAME,
          article_id: id,
          slug: body.slug,
          title: body.title,
          sitios_destino: body.sitios_destino,
          timestamp: now,
        }),
      })
    } catch (e) {
      console.error(`[webhook] ${e.message}`)
    }
  }

  const created = await c.env.DB.prepare('SELECT * FROM ARTICULOS_CMS WHERE ID = ?').bind(id).first()
  return c.json(created, 201)
})

// ── Artículos: actualizar ─────────────────────────────────────────
app.put('/api/articles/:id', requireAuth, async (c) => {
  const { id } = c.req.param()
  const body = await c.req.json()
  const now = new Date().toISOString()

  const existing = await c.env.DB.prepare('SELECT * FROM ARTICULOS_CMS WHERE ID = ?').bind(id).first()
  if (!existing) return c.json({ error: 'no encontrado' }, 404)

  const newEstado = body.estado || existing.ESTADO
  const wasPublished = existing.ESTADO === 'PUBLICADO'
  const isBeingPublished = newEstado === 'PUBLICADO' && !wasPublished

  await c.env.DB.prepare(`
    UPDATE ARTICULOS_CMS SET
      TITULO = ?, SLUG = ?, DESCRIPCION = ?, CONTENIDO = ?, CATEGORIA = ?,
      URL_IMAGEN = ?, SITIOS_DESTINO = ?, ESTADO = ?, DESTACADO = ?,
      FECHA_PUBLICACION = COALESCE(FECHA_PUBLICACION, ?),
      META_TITLE = ?, META_DESCRIPTION = ?, FOCUS_KEYWORD = ?, TAGS = ?,
      READING_SCORE = ?, READING_ANALYSIS = ?
    WHERE ID = ?
  `).bind(
    body.title ?? existing.TITULO,
    body.slug ?? existing.SLUG,
    body.descripcion ?? body.description ?? existing.DESCRIPCION,
    body.content ?? body.contenido ?? existing.CONTENIDO,
    body.categoria ?? body.category ?? existing.CATEGORIA,
    body.url_imagen ?? body.image ?? existing.URL_IMAGEN,
    body.sitios_destino ?? existing.SITIOS_DESTINO,
    newEstado,
    body.destacado ?? existing.DESTACADO,
    newEstado === 'PUBLICADO' ? now : null,
    body.metaTitle ?? body.meta_title ?? existing.META_TITLE,
    body.metaDescription ?? body.meta_description ?? existing.META_DESCRIPTION,
    body.focusKeyword ?? body.focus_keyword ?? existing.FOCUS_KEYWORD,
    Array.isArray(body.tags) ? body.tags.join(',') : (body.tags ?? existing.TAGS),
    body.reading_score ?? existing.READING_SCORE,
    body.reading_analysis ?? existing.READING_ANALYSIS,
    id
  ).run()

  // Webhook al pasar de borrador a publicado
  if (isBeingPublished && c.env.ARTICLE_PUBLISH_WEBHOOK &&
      c.env.ARTICLE_PUBLISH_WEBHOOK !== 'TBD_WEBHOOK_URL') {
    try {
      await fetch(c.env.ARTICLE_PUBLISH_WEBHOOK, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event: 'article_published',
          source: c.env.SERVICE_NAME,
          article_id: id,
          slug: body.slug ?? existing.SLUG,
          title: body.title ?? existing.TITULO,
          sitios_destino: body.sitios_destino ?? existing.SITIOS_DESTINO,
          timestamp: now,
        }),
      })
    } catch (e) {
      console.error(`[webhook] ${e.message}`)
    }
  }

  const updated = await c.env.DB.prepare('SELECT * FROM ARTICULOS_CMS WHERE ID = ?').bind(id).first()
  return c.json(updated)
})

// ── Artículos: borrar ─────────────────────────────────────────────
app.delete('/api/articles/:id', requireAuth, async (c) => {
  const { id } = c.req.param()
  await c.env.DB.prepare('DELETE FROM ARTICULOS_CMS WHERE ID = ?').bind(id).run()
  return c.json({ ok: true })
})

// ── 404 fallback ──────────────────────────────────────────────────
app.notFound((c) => c.json({ error: 'ruta no encontrada', path: c.req.path }, 404))

export default app
