import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { API_BASE, CMS_ID } from '../main.jsx'
import HubNav from '../components/HubNav'

const PAGE_LIMIT = 20

const CATEGORY_COLORS = {
  nacional: '#dc3545',
  politica: '#007bff',
  economia: '#28a745',
  deportes: '#fd7e14',
  cultura: '#6f42c1',
  tecnologia: '#17a2b8',
  sociedad: '#e83e8c',
  internacional: '#6610f2',
}

function categoryColor(category) {
  if (!category) return '#6c757d'
  return CATEGORY_COLORS[category.toLowerCase()] || '#6c757d'
}

function sourceLabel(article) {
  if (article.sourceTable === 'PARAFRASEADO') return 'Parafraseado'
  if (article.sourceTable === 'CMS' && article.status === 'BORRADOR') return 'Borrador'
  return 'CMS'
}

function formatDate(value) {
  if (!value) return '—'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleString('es-MX', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function siteInitials(siteString) {
  if (!siteString) return '—'
  const first = siteString.split(',')[0]?.trim()
  if (!first) return '—'
  return first.slice(0, 2).toUpperCase()
}

export default function Articles() {
  const [articles, setArticles] = useState([])
  const [sites, setSites] = useState([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState('table') // 'table' | 'grid'
  const [siteFilter, setSiteFilter] = useState('')
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(false)
  const [publishBusy, setPublishBusy] = useState({})
  const [deleteBusy, setDeleteBusy] = useState({})
  const [toast, setToast] = useState(null)

  const token = () => localStorage.getItem('cms_token')

  useEffect(() => {
    loadSites()
  }, [])

  useEffect(() => {
    loadArticles()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, siteFilter])

  const loadSites = async () => {
    try {
      const res = await fetch(`${API_BASE}/sites`, {
        headers: { 'Authorization': `Bearer ${token()}` },
      })
      if (!res.ok) return
      const data = await res.json()
      const list = Array.isArray(data) ? data : (data.sites || [])
      setSites(list.filter((s) => (s.ACTIVO ?? s.activo ?? 1) === 1))
    } catch (err) {
      console.error('Articles.loadSites:', err)
    }
  }

  const loadArticles = async () => {
    setLoading(true)
    try {
      const offset = (page - 1) * PAGE_LIMIT
      let url = `${API_BASE}/cms/gallery?limit=${PAGE_LIMIT}&offset=${offset}`
      if (siteFilter) url += `&site=${encodeURIComponent(siteFilter)}`
      const res = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token()}` },
      })
      if (!res.ok) throw new Error('Error al obtener artículos')
      const data = await res.json()
      const list = data.articles || []
      setArticles(list)
      setHasMore(list.length >= PAGE_LIMIT)
    } catch (err) {
      console.error('Articles.loadArticles:', err)
      setArticles([])
      setHasMore(false)
    } finally {
      setLoading(false)
    }
  }

  const showToast = (type, message) => {
    setToast({ type, message })
    const t = setTimeout(() => setToast(null), 4000)
    return () => clearTimeout(t)
  }

  const handlePublish = async (article) => {
    if (publishBusy[article.id]) return
    const sitesList = (article.site || '').split(',').map((s) => s.trim()).filter(Boolean)
    if (sitesList.length === 0) {
      alert('Este artículo no tiene sitios asignados. Edítalo y asígnale sitios antes de publicar.')
      return
    }
    if (!window.confirm(`¿Publicar "${article.title || 'Sin título'}" en ${sitesList.length} sitio(s)?`)) return
    setPublishBusy((prev) => ({ ...prev, [article.id]: true }))
    try {
      const res = await fetch(`${API_BASE}/cms/publish`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token()}`,
        },
        body: JSON.stringify({
          id: article.id,
          sitios: sitesList,
          fb_requerido: article.fbRequired || false,
        }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || 'No se pudo publicar')
      }
      showToast('success', `Artículo publicado en ${sitesList.length} sitio(s).`)
      loadArticles()
    } catch (err) {
      alert(`Error al publicar: ${err.message}`)
    } finally {
      setPublishBusy((prev) => ({ ...prev, [article.id]: false }))
    }
  }

  const handleDelete = async (article) => {
    if (deleteBusy[article.id]) return
    if (!window.confirm(`¿Eliminar "${article.title || 'Sin título'}"? Esta acción no se puede deshacer.`)) return
    setDeleteBusy((prev) => ({ ...prev, [article.id]: true }))
    try {
      const res = await fetch(`${API_BASE}/cms/articles/${article.id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token()}` },
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || 'No se pudo eliminar')
      }
      showToast('success', `Artículo "${article.title || 'sin título'}" eliminado.`)
      loadArticles()
    } catch (err) {
      alert(`Error al eliminar: ${err.message}`)
    } finally {
      setDeleteBusy((prev) => ({ ...prev, [article.id]: false }))
    }
  }

  const handleSiteFilterChange = (value) => {
    setPage(1)
    setSiteFilter(value)
  }

  return (
    <div className="dashboard-content">
      <HubNav />
      <header className="dashboard-header flex-between">
        <div>
          <Link to="/" className="text-sm" style={{ color: 'var(--accent)' }}>
            ← Volver al panel
          </Link>
          <h1 style={{ fontSize: '22px', fontWeight: '700', marginTop: '8px' }}>
            Artículos publicados
          </h1>
          <p className="text-sm text-muted" style={{ marginTop: '4px' }}>
            Mezcla de artículos CMS y parafraseados de {CMS_ID.replace('cms-', 'CMS ').toUpperCase()}.
          </p>
        </div>
        <div className="flex" style={{ gap: '8px', flexWrap: 'wrap' }}>
          <div className="view-toggle" role="group" aria-label="Cambiar vista">
            <button
              type="button"
              className={`view-toggle-btn ${view === 'table' ? 'active' : ''}`}
              onClick={() => setView('table')}
              aria-pressed={view === 'table'}
            >
              ▤ Tabla
            </button>
            <button
              type="button"
              className={`view-toggle-btn ${view === 'grid' ? 'active' : ''}`}
              onClick={() => setView('grid')}
              aria-pressed={view === 'grid'}
            >
              ▦ Tarjetas
            </button>
          </div>
          <Link to="/editor/new" className="btn-primary">
            + Artículo nuevo
          </Link>
        </div>
      </header>

      {toast && (
        <div className={`toast toast-${toast.type}`} role="status" aria-live="polite">
          {toast.type === 'success' ? '✓' : '⚠'} {toast.message}
          <button type="button" className="toast-close" onClick={() => setToast(null)} aria-label="Cerrar notificación">
            ✕
          </button>
        </div>
      )}

      <div className="articles-toolbar">
        <label className="text-sm text-muted">Filtrar por sitio:</label>
        <select
          className="form-select"
          value={siteFilter}
          onChange={(e) => handleSiteFilterChange(e.target.value)}
        >
          <option value="">Todos los sitios</option>
          {sites.map((site) => (
            <option key={site.ID || site.SLUG} value={site.SLUG}>
              {site.NOMBRE}
            </option>
          ))}
        </select>
        <span className="text-xs text-muted">
          Página {page} · {articles.length} artículos en esta página
        </span>
      </div>

      {loading ? (
        <p className="text-muted">Cargando artículos…</p>
      ) : articles.length === 0 ? (
        <p className="text-muted">No hay artículos para mostrar.</p>
      ) : view === 'table' ? (
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Título</th>
                <th>Origen</th>
                <th>Categoría</th>
                <th>Sitios</th>
                <th>Actualizado</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {articles.map((article) => (
                <tr key={article.id}>
                  <td style={{ fontWeight: 500 }}>{article.title || 'Sin título'}</td>
                  <td>
                    <span className="badge badge-info badge-sm">{sourceLabel(article)}</span>
                  </td>
                  <td>
                    <span
                      className="badge badge-sm"
                      style={{
                        background: categoryColor(article.category),
                        color: '#fff',
                      }}
                    >
                      {article.category || '—'}
                    </span>
                  </td>
                  <td className="text-xs text-muted">{article.site || '—'}</td>
                  <td className="text-xs text-muted">{formatDate(article.publishedAt || article.createdAt)}</td>
                  <td>
                    <span className={`badge ${article.status === 'PUBLICADO' ? 'badge-success' : 'badge-warning'}`}>
                      {article.status === 'PUBLICADO' ? 'Publicado' : 'Borrador'}
                    </span>
                  </td>
                  <td>
                    <div className="flex" style={{ gap: '6px' }}>
                      <Link to={`/editor/${article.id}`} className="btn-sm btn-secondary">
                        Editar
                      </Link>
                      {article.status !== 'PUBLICADO' && (
                        <button
                          type="button"
                          className="btn-sm btn-success"
                          onClick={() => handlePublish(article)}
                          disabled={publishBusy[article.id]}
                        >
                          {publishBusy[article.id] ? 'Publicando…' : 'Publicar'}
                        </button>
                      )}
                      <button
                        type="button"
                        className="btn-sm btn-danger"
                        onClick={() => handleDelete(article)}
                        disabled={deleteBusy[article.id]}
                      >
                        {deleteBusy[article.id] ? 'Eliminando…' : 'Eliminar'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="gallery-grid">
          {articles.map((article) => (
            <div key={article.id} className="gallery-card">
              <div className="gallery-image-wrapper">
                {article.imageUrl ? (
                  <img
                    src={article.imageUrl}
                    alt={article.title || 'Artículo'}
                    loading="lazy"
                    className="gallery-image"
                  />
                ) : (
                  <div className="gallery-image-placeholder">
                    {siteInitials(article.site)}
                  </div>
                )}
                <span className="gallery-site-count">
                  {((article.site || '').split(',').filter((s) => s.trim()).length) || 0} sitios
                </span>
              </div>
              <div className="gallery-info">
                <h3 className="gallery-title">{article.title || 'Sin título'}</h3>
                <div className="gallery-meta">
                  <span className="badge badge-sm badge-info">{sourceLabel(article)}</span>
                  <span
                    className="badge badge-sm"
                    style={{ background: categoryColor(article.category), color: '#fff' }}
                  >
                    {article.category || '—'}
                  </span>
                  <span className={`badge badge-sm ${article.status === 'PUBLICADO' ? 'badge-success' : 'badge-warning'}`}>
                    {article.status === 'PUBLICADO' ? 'Publicado' : 'Borrador'}
                  </span>
                </div>
                <div className="flex" style={{ gap: '6px', marginTop: '12px', flexWrap: 'wrap' }}>
                  <Link to={`/editor/${article.id}`} className="btn-sm btn-secondary">
                    Editar
                  </Link>
                  {article.status !== 'PUBLICADO' && (
                    <button
                      type="button"
                      className="btn-sm btn-success"
                      onClick={() => handlePublish(article)}
                      disabled={publishBusy[article.id]}
                    >
                      {publishBusy[article.id] ? 'Publicando…' : 'Publicar'}
                    </button>
                  )}
                  <button
                    type="button"
                    className="btn-sm btn-danger"
                    onClick={() => handleDelete(article)}
                    disabled={deleteBusy[article.id]}
                  >
                    {deleteBusy[article.id] ? 'Eliminando…' : 'Eliminar'}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="pagination">
        <button
          type="button"
          className="btn-secondary"
          disabled={page <= 1}
          onClick={() => setPage((p) => Math.max(1, p - 1))}
        >
          ← Anterior
        </button>
        <span className="text-sm text-muted">Página {page}</span>
        <button
          type="button"
          className="btn-secondary"
          disabled={!hasMore}
          onClick={() => setPage((p) => p + 1)}
        >
          Siguiente →
        </button>
      </div>
    </div>
  )
}
