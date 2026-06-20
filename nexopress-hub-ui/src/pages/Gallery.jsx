import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { API_BASE, CMS_ID } from '../main.jsx'
import HubNav from '../components/HubNav'

export default function Gallery() {
  const [articles, setArticles] = useState([])
  const [sites, setSites] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedArticle, setSelectedArticle] = useState(null)
  const [previewUrl, setPreviewUrl] = useState(null)
  const [siteFilter, setSiteFilter] = useState('')

  useEffect(() => {
    fetchData()
  }, [])

  const token = () => localStorage.getItem('cms_token')

  const fetchData = async () => {
    try {
      const [articlesRes, sitesRes] = await Promise.all([
        fetch(`${API_BASE}/articles?limit=100`, {
          headers: { 'Authorization': `Bearer ${token()}` },
        }),
        fetch(`${API_BASE}/sites`, {
          headers: { 'Authorization': `Bearer ${token()}` },
        }),
      ])

      if (!articlesRes.ok) throw new Error('Error al obtener artículos')
      if (!sitesRes.ok) throw new Error('Error al obtener sitios')

      const articlesData = await articlesRes.json()
      const sitesData = await sitesRes.json()

      const parsedArticles = (articlesData.articles || [])
        .map((a) => ({
          ...a,
          siteList: (a.site || '')
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean),
        }))
        .sort((a, b) => new Date(b.publishedAt || b.createdAt || 0) - new Date(a.publishedAt || a.createdAt || 0))

      setArticles(parsedArticles)
      setSites(sitesData.filter ? sitesData.filter((s) => s.ACTIVO === 1) : sitesData)
    } catch (err) {
      console.error('Gallery fetchData:', err)
    } finally {
      setLoading(false)
    }
  }

  const getSiteUrl = (site) => {
    const domain = site.DOMINIO || site.dominio || site.SLUG
    if (!domain) return ''
    // Si ya es un dominio completo (tiene punto), no forzar www.
    if (domain.includes('.')) return `https://${domain}`
    return `https://www.${domain}`
  }

  const openSiteSelector = (article) => {
    setSelectedArticle(article)
    setPreviewUrl(null)
  }

  const openPreview = (site) => {
    if (!selectedArticle) return
    const base = getSiteUrl(site)
    const url = `${base}/articulo/?slug=${selectedArticle.slug}`
    setPreviewUrl(url)
  }

  const closeModal = () => {
    setSelectedArticle(null)
    setPreviewUrl(null)
  }

  const filteredArticles = siteFilter
    ? articles.filter((a) => a.siteList.includes(siteFilter))
    : articles

  const sourceLabel = (article) => {
    if (article.sourceTable === 'CMS' && article.status === 'BORRADOR') return 'Borrador'
    if (article.sourceTable === 'CMS') return 'CMS'
    return 'Parafraseado'
  }

  return (
    <div className="gallery-page">
      <HubNav />
      <header className="gallery-header">
        <div>
          <Link to="/" className="text-sm" style={{ color: 'var(--accent)' }}>← Volver al dashboard</Link>
          <h1 style={{ fontSize: '22px', fontWeight: '700', marginTop: '8px' }}>Galería de artículos</h1>
          <p className="text-sm text-muted">{filteredArticles.length} artículos · Click para previsualizar en un sitio</p>
        </div>
        <div className="gallery-filter">
          <label className="text-sm text-muted">Filtrar por sitio:</label>
          <select value={siteFilter} onChange={(e) => setSiteFilter(e.target.value)} className="form-select">
            <option value="">Todos los sitios</option>
            {sites.map((site) => (
              <option key={site.ID || site.SLUG} value={site.SLUG}>{site.NOMBRE}</option>
            ))}
          </select>
        </div>
      </header>

      {loading ? (
        <p className="text-muted">Cargando artículos…</p>
      ) : filteredArticles.length === 0 ? (
        <p className="text-muted">No hay artículos para mostrar.</p>
      ) : (
        <div className="gallery-grid">
          {filteredArticles.map((article) => (
            <div
              key={article.id}
              className="gallery-card"
              onClick={() => openSiteSelector(article)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && openSiteSelector(article)}
            >
              <div className="gallery-image-wrapper">
                {article.imageUrl ? (
                  <img src={article.imageUrl} alt={article.title} loading="lazy" className="gallery-image" />
                ) : (
                  <div className="gallery-image-placeholder">Sin imagen</div>
                )}
                <span className="gallery-site-count">{article.siteList.length} sitio{article.siteList.length !== 1 ? 's' : ''}</span>
              </div>
              <div className="gallery-info">
                <h3 className="gallery-title">{article.title || 'Sin título'}</h3>
                <div className="gallery-meta">
                  <span className="badge badge-sm badge-info">{article.category || 'NACIONAL'}</span>
                  <span className="text-xs text-muted">{sourceLabel(article)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedArticle && (
        <div className="modal-overlay gallery-modal" onClick={closeModal}>
          <div className="modal gallery-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h3>{previewUrl ? 'Vista previa' : 'Seleccionar sitio'}</h3>
                <p className="text-sm text-muted" style={{ marginTop: '4px' }}>{selectedArticle.title}</p>
              </div>
              <button className="modal-close" onClick={closeModal} aria-label="Cerrar">✕</button>
            </div>

            <div className="modal-body gallery-modal-body">
              {!previewUrl ? (
                <>
                  <p className="text-sm text-muted">Selecciona el sitio en el que querés ver la preview del artículo:</p>
                  <div className="gallery-site-grid">
                    {sites
                      .filter((site) => selectedArticle.siteList.includes(site.SLUG))
                      .map((site) => (
                        <button
                          key={site.ID || site.SLUG}
                          className="gallery-site-btn"
                          onClick={() => openPreview(site)}
                        >
                          <div className="gallery-site-name">{site.NOMBRE}</div>
                          <div className="text-xs text-muted">{site.DOMINIO}</div>
                        </button>
                      ))}
                  </div>
                  {selectedArticle.siteList.length === 0 && (
                    <p className="text-muted">Este artículo no tiene sitios asignados.</p>
                  )}
                </>
              ) : (
                <>
                  <div className="gallery-preview-toolbar">
                    <a
                      href={previewUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs"
                      style={{ color: 'var(--accent)' }}
                    >
                      Abrir en nueva pestaña ↗
                    </a>
                    <button className="text-xs" onClick={() => setPreviewUrl(null)} style={{ color: 'var(--accent)', background: 'transparent', border: 'none', cursor: 'pointer' }}>
                      Volver a sitios
                    </button>
                  </div>
                  <div className="gallery-preview-frame-wrapper">
                    <iframe
                      src={previewUrl}
                      title="Vista previa del artículo"
                      className="gallery-preview-frame"
                      sandbox="allow-scripts allow-same-origin"
                    ></iframe>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
