import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { API_BASE, CMS_ID } from '../main.jsx'
import HubNav from '../components/HubNav'

const PAGE_LIMIT = 50

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

function normalizeArticle(row) {
  return {
    id: row.ID ?? row.id,
    title: row.TITULO ?? row.title ?? 'Sin título',
    category: row.CATEGORIA ?? row.category ?? '',
    status: row.ESTADO ?? row.status ?? 'BORRADOR',
    site: row.SITIOS_DESTINO ?? row.site ?? '',
    createdAt: row.FECHA_CREACION ?? row.createdAt ?? row.updatedAt ?? null,
  }
}

export default function CMS() {
  const [articles, setArticles] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [publishBusy, setPublishBusy] = useState({})
  const [deleteBusy, setDeleteBusy] = useState({})
  const [toast, setToast] = useState(null)

  const token = () => localStorage.getItem('cms_token')

  useEffect(() => {
    loadArticles()
  }, [])

  const loadArticles = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`${API_BASE}/cms/articles?limit=${PAGE_LIMIT}`, {
        headers: { 'Authorization': `Bearer ${token()}` },
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || `HTTP ${res.status}`)
      }
      const data = await res.json()
      const list = (data.articles || []).map(normalizeArticle)
      setArticles(list)
    } catch (err) {
      console.error('CMS.loadArticles:', err)
      setError(err.message)
      setArticles([])
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
    if (!window.confirm(`¿Publicar "${article.title}" en ${sitesList.length} sitio(s)?`)) return
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
          fb_requerido: false,
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
    if (!window.confirm(`¿Eliminar "${article.title}" del CMS? Esta acción no se puede deshacer.`)) return
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
      showToast('success', `Artículo "${article.title}" eliminado.`)
      loadArticles()
    } catch (err) {
      alert(`Error al eliminar: ${err.message}`)
    } finally {
      setDeleteBusy((prev) => ({ ...prev, [article.id]: false }))
    }
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
            Artículos del CMS
          </h1>
          <p className="text-sm text-muted" style={{ marginTop: '4px' }}>
            Listado simple de artículos almacenados en {CMS_ID.replace('cms-', 'CMS ').toUpperCase()}.
          </p>
        </div>
        <Link to="/editor/new" className="btn-primary">
          + Artículo nuevo
        </Link>
      </header>

      {toast && (
        <div className={`toast toast-${toast.type}`} role="status" aria-live="polite">
          {toast.type === 'success' ? '✓' : '⚠'} {toast.message}
          <button type="button" className="toast-close" onClick={() => setToast(null)} aria-label="Cerrar notificación">
            ✕
          </button>
        </div>
      )}

      {loading ? (
        <p className="text-muted">Cargando artículos del CMS…</p>
      ) : error ? (
        <div className="card" style={{ borderColor: 'var(--error)' }}>
          <p style={{ color: 'var(--error)' }}>No se pudieron cargar los artículos: {error}</p>
          <button type="button" className="btn-secondary" onClick={loadArticles} style={{ marginTop: '8px' }}>
            Reintentar
          </button>
        </div>
      ) : articles.length === 0 ? (
        <p className="text-muted">No hay artículos en el CMS. Crea el primero con el botón "+ Artículo nuevo".</p>
      ) : (
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Título</th>
                <th>Categoría</th>
                <th>Estado</th>
                <th>Sitios destino</th>
                <th>Creado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {articles.map((article) => (
                <tr key={article.id}>
                  <td style={{ fontWeight: 500 }}>{article.title}</td>
                  <td>{article.category || '—'}</td>
                  <td>
                    <span className={`badge ${article.status === 'PUBLICADO' ? 'badge-success' : 'badge-warning'}`}>
                      {article.status === 'PUBLICADO' ? 'Publicado' : 'Borrador'}
                    </span>
                  </td>
                  <td className="text-xs text-muted">{article.site || '—'}</td>
                  <td className="text-xs text-muted">{formatDate(article.createdAt)}</td>
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
      )}
    </div>
  )
}
