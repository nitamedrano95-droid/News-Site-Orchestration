import { Hono } from 'hono'

const app = new Hono()

const esc = (s) =>
  String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

const empty = () =>
  '<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"></urlset>'

app.get('/:site', async (c) => {
  const siteSlug = c.req.param('site').toLowerCase()
  const db = c.env.DB
  const now = new Date()
  const twoDaysAgo = new Date(now - 2 * 24 * 60 * 60 * 1000)

  // Obtener nombre del sitio desde la tabla SITIOS si existe
  let siteName = siteSlug
  try {
    const siteRow = await db.prepare(
      'SELECT NOMBRE FROM SITIOS WHERE SLUG = ? LIMIT 1'
    ).bind(siteSlug).first()
    if (siteRow?.NOMBRE) siteName = siteRow.NOMBRE
  } catch {}

  // Obtener el dominio del sitio para construir las URLs
  let siteOrigin = `https://${siteSlug}.pages.dev`
  try {
    const siteRow = await db.prepare(
      'SELECT DOMINIO FROM SITIOS WHERE SLUG = ? LIMIT 1'
    ).bind(siteSlug).first()
    if (siteRow?.DOMINIO) siteOrigin = `https://${siteRow.DOMINIO}`
  } catch {}

  let articles = []
  try {
    const [cmsResult, paraResult] = await Promise.all([
      db.prepare(
        `SELECT SLUG, TITULO, FECHA_PUBLICACION, FOCUS_KEYWORD, CATEGORIA
         FROM ARTICULOS_CMS
         WHERE ESTADO = 'PUBLICADO' AND SITIOS_DESTINO LIKE ?
         ORDER BY FECHA_PUBLICACION DESC LIMIT 1000`
      ).bind(`%${siteSlug}%`).all(),

      db.prepare(
        `SELECT SLUG, TITULO_PARAFRASEADO AS TITULO, FECHA_PUBLICACION,
                NULL AS FOCUS_KEYWORD, CATEGORIA
         FROM ARTICULOS_PARAFRASEADOS
         WHERE ESTADO = 'PUBLICADO' AND SITIO_DESTINO LIKE ? AND SLUG IS NOT NULL
         ORDER BY FECHA_PUBLICACION DESC LIMIT 1000`
      ).bind(`%${siteSlug}%`).all(),
    ])

    const seen = new Set()
    articles = [...(cmsResult.results || []), ...(paraResult.results || [])]
      .filter((a) => {
        if (!a.SLUG || seen.has(a.SLUG)) return false
        seen.add(a.SLUG)
        return true
      })
      .sort((a, b) => new Date(b.FECHA_PUBLICACION || 0) - new Date(a.FECHA_PUBLICACION || 0))
  } catch (err) {
    console.error('[sitemap] query error:', siteSlug, err)
    return c.text(empty(), 200, { 'Content-Type': 'application/xml; charset=utf-8' })
  }

  let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">
  <url>
    <loc>${esc(siteOrigin)}/</loc>
    <lastmod>${now.toISOString().slice(0, 10)}</lastmod>
    <changefreq>hourly</changefreq>
    <priority>1.0</priority>
  </url>\n`

  for (const a of articles) {
    const pubDate = a.FECHA_PUBLICACION ? new Date(a.FECHA_PUBLICACION) : null
    const isoDate = (pubDate || now).toISOString()
    const isRecent = pubDate && pubDate >= twoDaysAgo
    const title = esc(a.TITULO)
    const keywords = esc(a.FOCUS_KEYWORD || a.CATEGORIA || '')

    xml += `  <url>
    <loc>${esc(siteOrigin)}/articulo/${a.SLUG}</loc>
    <lastmod>${isoDate.slice(0, 10)}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>\n`

    if (isRecent && title) {
      xml += `    <news:news>
      <news:publication>
        <news:name>${esc(siteName)}</news:name>
        <news:language>es</news:language>
      </news:publication>
      <news:publication_date>${isoDate}</news:publication_date>
      <news:title>${title}</news:title>${keywords ? `\n      <news:keywords>${keywords}</news:keywords>` : ''}
    </news:news>\n`
    }

    xml += `  </url>\n`
  }

  xml += `</urlset>`

  return c.text(xml, 200, {
    'Content-Type': 'application/xml; charset=utf-8',
    'Cache-Control': 'public, max-age=3600',
  })
})

export default app
