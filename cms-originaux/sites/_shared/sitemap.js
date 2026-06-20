const esc = (s) =>
  String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

const empty = () =>
  new Response(
    '<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"></urlset>',
    { headers: { 'Content-Type': 'application/xml; charset=utf-8' } }
  )

export async function generateSitemap(context, siteSlug, siteName) {
  const { env, request } = context
  const origin = new URL(request.url).origin
  const now = new Date()
  const twoDaysAgo = new Date(now - 2 * 24 * 60 * 60 * 1000)

  if (!env.DB) return empty()

  try {
    const [cmsResult, paraResult] = await Promise.all([
      env.DB.prepare(
        `SELECT SLUG, TITULO, FECHA_PUBLICACION, FOCUS_KEYWORD, CATEGORIA
         FROM ARTICULOS_CMS
         WHERE ESTADO = 'PUBLICADO' AND SITIOS_DESTINO LIKE ?
         ORDER BY FECHA_PUBLICACION DESC LIMIT 1000`
      ).bind(`%${siteSlug}%`).all(),

      env.DB.prepare(
        `SELECT SLUG, TITULO_PARAFRASEADO AS TITULO, FECHA_PUBLICACION, NULL AS FOCUS_KEYWORD, CATEGORIA
         FROM ARTICULOS_PARAFRASEADOS
         WHERE ESTADO = 'PUBLICADO' AND SITIO_DESTINO LIKE ? AND SLUG IS NOT NULL
         ORDER BY FECHA_PUBLICACION DESC LIMIT 1000`
      ).bind(`%${siteSlug}%`).all(),
    ])

    const seen = new Set()
    const articles = [...(cmsResult.results || []), ...(paraResult.results || [])]
      .filter((a) => {
        if (!a.SLUG || seen.has(a.SLUG)) return false
        seen.add(a.SLUG)
        return true
      })
      .sort((a, b) => new Date(b.FECHA_PUBLICACION || 0) - new Date(a.FECHA_PUBLICACION || 0))

    let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">
  <url>
    <loc>${esc(origin)}/</loc>
    <lastmod>${now.toISOString().slice(0, 10)}</lastmod>
    <changefreq>hourly</changefreq>
    <priority>1.0</priority>
  </url>\n`

    for (const a of articles) {
      const pubDate = a.FECHA_PUBLICACION ? new Date(a.FECHA_PUBLICACION) : null
      const isoDate = (pubDate || now).toISOString()
      const dateOnly = isoDate.slice(0, 10)
      const isRecent = pubDate && pubDate >= twoDaysAgo
      const keywords = esc(a.FOCUS_KEYWORD || a.CATEGORIA || '')
      const title = esc(a.TITULO)

      xml += `  <url>
    <loc>${esc(origin)}/articulo/${a.SLUG}</loc>
    <lastmod>${dateOnly}</lastmod>
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

    return new Response(xml, {
      headers: {
        'Content-Type': 'application/xml; charset=utf-8',
        'Cache-Control': 'public, max-age=3600',
      },
    })
  } catch (err) {
    console.error('[sitemap]', siteSlug, err)
    return empty()
  }
}

export function generateRobots(origin, extraDisallow = []) {
  const sitemap = `${origin}/sitemap.xml`
  const disallow = ['/admin/', ...extraDisallow].map((p) => `Disallow: ${p}`).join('\n')
  return new Response(
    `User-agent: *\nAllow: /\n${disallow}\n\nUser-agent: facebookexternalhit\nAllow: /\n\nUser-agent: Twitterbot\nAllow: /\n\nUser-agent: WhatsApp\nAllow: /\n\nUser-agent: LinkedInBot\nAllow: /\n\nUser-agent: Slackbot\nAllow: /\n\nSitemap: ${sitemap}\n`,
    { headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'public, max-age=86400' } }
  )
}
