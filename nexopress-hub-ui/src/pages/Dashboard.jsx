import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { API_BASE, CMS_ID } from '../main.jsx'
import HubNav from '../components/HubNav'

export default function Dashboard() {
  const [stats, setStats] = useState({
    articles: 0,
    drafts: 0,
    facebook: 0,
    sites: 0,
    webToday: 0,
    ingested: { '24h': 0, '7d': 0, '30d': 0 },
  })
  const [ingestedPeriod, setIngestedPeriod] = useState('24h')
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState(null)
  const [toast, setToast] = useState(null)
  const [recentArticles, setRecentArticles] = useState([])
  const [siteStats, setSiteStats] = useState([])
  const [deleteBusy, setDeleteBusy] = useState({})
  const [publishBusy, setPublishBusy] = useState({})
  const location = useLocation()

  useEffect(() => {
    const stored = localStorage.getItem('cms_user')
    if (stored) setUser(JSON.parse(stored))
    fetchDashboard()
  }, [])

  useEffect(() => {
    if (location.state?.deleted) {
      setToast({
        type: 'success',
        message: `Artículo "${location.state.deletedTitle || 'sin título'}" eliminado correctamente.`,
      })
      window.history.replaceState({}, '')
      const t = setTimeout(() => setToast(null), 4000)
      return () => clearTimeout(t)
    }
  }, [location.state])

  const token = () => localStorage.getItem('cms_token')

  const fetchDashboard = async () => {
    try {
      await Promise.all([
        fetchStats(),
        fetchRecent(),
        fetchSiteStats(),
        fetchIngested('24h'),
        fetchIngested('7d'),
        fetchIngested('30d'),
      ])
    } catch (err) {
      console.error('fetchDashboard:', err)
    } finally {
      setLoading(false)
    }
  }

  const fetchStats = async () => {
    const res = await fetch(`${API_BASE}/stats/dashboard`, {
      headers: { 'Authorization': `Bearer ${token()}` },
    })
    if (!res.ok) throw new Error('Error al obtener estadísticas')
    const data = await res.json()
    setStats((prev) => ({
      ...prev,
      articles: data.articles || 0,
      drafts: data.drafts || 0,
      facebook: data.facebook || 0,
      sites: data.sites || 0,
      webToday: data.webToday || 0,
      ingested: { ...prev.ingested, '24h': data.ingested24h || 0 },
    }))
  }

  const fetchIngested = async (period) => {
    const days = period === '24h' ? 1 : period === '7d' ? 7 : 30
    try {
      const res = await fetch(`${API_BASE}/stats/ingested?days=${days}`, {
        headers: { 'Authorization': `Bearer ${token()}` },
      })
      if (!res.ok) throw new Error('Error al obtener ingestados')
      const data = await res.json()
      setStats((prev) => ({
        ...prev,
        ingested: { ...prev.ingested, [period]: data.count || 0 },
      }))
    } catch (err) {
      console.error('fetchIngested:', err)
    }
  }

  const fetchRecent = async () => {
    const res = await fetch(`${API_BASE}/articles?limit=8`, {
      headers: { 'Authorization': `Bearer ${token()}` },
    })
    if (!res.ok) throw new Error('Error al obtener artículos')
    const data = await res.json()
    setRecentArticles(data.articles || [])
  }

  const fetchSiteStats = async () => {
    const res = await fetch(`${API_BASE}/sites/stats`, {
      headers: { 'Authorization': `Bearer ${token()}` },
    })
    if (!res.ok) throw new Error('Error al obtener stats por sitio')
    const data = await res.json()
    setSiteStats(Array.isArray(data) ? data : [])
  }

  const handleLogout = async () => {
    try {
      await fetch(`${API_BASE}/auth/logout`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token()}` },
      })
    } catch (e) {}
    localStorage.removeItem('cms_token')
    localStorage.removeItem('cms_user')
    window.location.href = '/login'
  }

  const formatDate = (dateStr) => {
    if (!dateStr) return '—'
    return new Date(dateStr).toLocaleDateString('es-MX', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  const quickPublish = async (id) => {
    const article = recentArticles.find((a) => a.id === id)
    if (!article || publishBusy[id]) return
    const sites = (article.site || '').split(',').map((s) => s.trim()).filter(Boolean)
    if (sites.length === 0) {
      alert('Este artículo no tiene sitios asignados. Editalo y asignale sitios antes de publicar.')
      return
    }
    if (!window.confirm(`¿Publicar "${article.title || 'Sin título'}" en ${sites.length} sitio(s)?`)) return

    setPublishBusy((prev) => ({ ...prev, [id]: true }))
    try {
      const res = await fetch(`${API_BASE}/cms/publish`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token()}`,
        },
        body: JSON.stringify({ id, sitios: sites, fb_requerido: false }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || 'No se pudo publicar')
      }
      const data = await res.json()
      setToast({ type: 'success', message: `Publicado en ${data.siteCount || sites.length} sitio(s).` })
      fetchRecent()
    } catch (err) {
      console.error('quickPublish:', err)
      alert(`Error al publicar: ${err.message}`)
    } finally {
      setPublishBusy((prev) => ({ ...prev, [id]: false }))
    }
  }

  const quickDelete = async (id, articleTitle) => {
    if (deleteBusy[id]) return
    if (!window.confirm(`¿Eliminar "${articleTitle || 'Sin título'}"? Esta acción no se puede deshacer.`)) return
    setDeleteBusy((prev) => ({ ...prev, [id]: true }))
    try {
      const res = await fetch(`${API_BASE}/cms/articles/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token()}` },
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || 'No se pudo eliminar')
      }
      setToast({ type: 'success', message: `Artículo "${articleTitle || 'sin título'}" eliminado.` })
      fetchRecent()
    } catch (err) {
      console.error('quickDelete:', err)
      alert(`Error al eliminar: ${err.message}`)
    } finally {
      setDeleteBusy((prev) => ({ ...prev, [id]: false }))
    }
  }

  const periodLabel = {
    '24h': '24 horas',
    '7d': '7 días',
    '30d': '30 días',
  }

  return (
    <div>
      <HubNav />

      <header className="dashboard-header flex-between">
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: '700' }}>{CMS_ID.replace('cms-', 'CMS ').toUpperCase()}</h1>
          {user && (
            <p className="text-sm text-muted" style={{ marginTop: '4px' }}>
              Bienvenido, <strong>{user.name || user.username}</strong>
              {user.role === 'admin' && <span className="badge badge-success" style={{ marginLeft: '8px' }}>Administrador</span>}
            </p>
          )}
        </div>
        <div className="flex" style={{ gap: '8px' }}>
          <Link to="/editor/new" className="btn-primary">
            + Artículo nuevo
          </Link>
          <button onClick={handleLogout} className="btn-secondary">
            Cerrar sesión
          </button>
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

      <main className="dashboard-content">
        <div className="dashboard-grid-4">
          <div className="stat-card stat-card-blue">
            <div className="stat-icon">📝</div>
            <div className="stat-label">Artículos totales</div>
            <div className="stat-value">{loading ? '…' : stats.articles.toLocaleString('es-MX')}</div>
          </div>
          <div className="stat-card stat-card-amber">
            <div className="stat-icon">⏳</div>
            <div className="stat-label">Borradores</div>
            <div className="stat-value">{loading ? '…' : stats.drafts.toLocaleString('es-MX')}</div>
          </div>
          <div className="stat-card stat-card-purple">
            <div className="stat-icon">👁</div>
            <div className="stat-label">Publicados web hoy</div>
            <div className="stat-value">{loading ? '…' : stats.webToday.toLocaleString('es-MX')}</div>
          </div>
          <div className="stat-card stat-card-green">
            <div className="stat-icon">✅</div>
            <div className="stat-label">En Facebook</div>
            <div className="stat-value">{loading ? '…' : stats.facebook.toLocaleString('es-MX')}</div>
          </div>
        </div>

        <div className="dashboard-grid-4" style={{ marginTop: '16px' }}>
          <div
            className="stat-card stat-card-indigo clickable"
            onClick={() => setIngestedPeriod((prev) => {
              const next = prev === '24h' ? '7d' : prev === '7d' ? '30d' : '24h'
              fetchIngested(next)
              return next
            })}
          >
            <div className="stat-icon">📥</div>
            <div className="stat-label">Ingestados {periodLabel[ingestedPeriod]}</div>
            <div className="stat-value">{loading ? '…' : stats.ingested[ingestedPeriod].toLocaleString('es-MX')}</div>
            <div className="stat-hint">Click para cambiar periodo</div>
          </div>
          <div className="stat-card stat-card-teal">
            <div className="stat-icon">🌐</div>
            <div className="stat-label">Sitios activos</div>
            <div className="stat-value">{loading ? '…' : stats.sites.toLocaleString('es-MX')}</div>
          </div>
          <div className="stat-card stat-card-slate">
            <div className="stat-icon">🚀</div>
            <div className="stat-label">Acciones rápidas</div>
            <div className="stat-actions">
              <Link to="/editor/new" className="text-xs" style={{ color: 'var(--accent)' }}>Nuevo artículo</Link>
              <Link to="/articles" className="text-xs" style={{ color: 'var(--accent)' }}>Ver artículos publicados</Link>
              <Link to="/cms" className="text-xs" style={{ color: 'var(--accent)' }}>Artículos CMS</Link>
              <Link to="/gallery" className="text-xs" style={{ color: 'var(--accent)' }}>Galería</Link>
              <Link to="/users" className="text-xs" style={{ color: 'var(--accent)' }}>Usuarios</Link>
            </div>
          </div>
          <div className="stat-card stat-card-red">
            <div className="stat-icon">🔔</div>
            <div className="stat-label">CMS activo</div>
            <div className="stat-value" style={{ fontSize: '14px', paddingTop: '4px' }}>{CMS_ID.replace('cms-', 'CMS ').toUpperCase()}</div>
          </div>
        </div>

        <div className="dashboard-sections">
          <div className="dashboard-section">
            <h2 className="section-title">
              Artículos recientes
            </h2>
            {recentArticles.length === 0 ? (
              <p className="text-muted">No hay artículos aún. Crea uno nuevo para empezar.</p>
            ) : (
              <div className="table-container">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Título</th>
                      <th>Slug</th>
                      <th>Categoría</th>
                      <th>Estado</th>
                      <th>Actualizado</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentArticles.map((article) => (
                      <tr key={article.id}>
                        <td style={{ fontWeight: 500 }}>{article.title || 'Sin título'}</td>
                        <td className="text-xs text-muted">{article.slug || '—'}</td>
                        <td className="text-xs">{article.category || 'NACIONAL'}</td>
                        <td>
                          <span className={`badge ${article.status === 'PUBLICADO' ? 'badge-success' : 'badge-warning'}`}>
                            {article.status === 'PUBLICADO' ? 'Publicado' : 'Borrador'}
                          </span>
                          {article.sourceTable === 'PARAFRASEADO' && (
                            <span className="badge badge-info" style={{ marginLeft: '6px' }}>Parafraseado</span>
                          )}
                        </td>
                        <td className="text-xs text-muted">{formatDate(article.publishedAt || article.createdAt)}</td>
                        <td>
                          <div className="flex" style={{ gap: '6px' }}>
                            <Link to={`/editor/${article.id}`} className="btn-sm btn-secondary">
                              Editar
                            </Link>
                            {article.status !== 'PUBLICADO' && (
                              <button
                                className="btn-sm btn-success"
                                onClick={() => quickPublish(article.id)}
                                disabled={publishBusy[article.id]}
                                title="Publicar con sitios actuales"
                              >
                                {publishBusy[article.id] ? 'Publicando…' : 'Publicar'}
                              </button>
                            )}
                            <button
                              className="btn-sm btn-danger"
                              onClick={() => quickDelete(article.id, article.title)}
                              disabled={deleteBusy[article.id]}
                              title="Eliminar artículo"
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

          <div className="dashboard-section">
            <h2 className="section-title">Artículos por sitio</h2>
            {siteStats.length === 0 ? (
              <p className="text-muted">No hay datos por sitio.</p>
            ) : (
              <div className="table-container">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Sitio</th>
                      <th>Total artículos</th>
                      <th>Publicados en FB</th>
                    </tr>
                  </thead>
                  <tbody>
                    {siteStats.map((site) => (
                      <tr key={site.slug}>
                        <td style={{ fontWeight: 500 }}>{site.name}</td>
                        <td>{site.total || 0}</td>
                        <td>
                          <span className="badge badge-info">{site.fb || 0}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
