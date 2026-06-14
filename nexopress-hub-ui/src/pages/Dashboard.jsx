import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { API_BASE } from '../main.jsx'

const CMS_CONFIG = [
  { id: 'cms-originaux', name: 'CMS Originales', sites: 11 },
  { id: 'cms-nuevos',    name: 'CMS Nuevos',    sites: 18 },
  { id: 'cms-nuevos2',   name: 'CMS Nuevos 2',  sites: 9  },
  { id: 'cms-nuevos3',   name: 'CMS Nuevos 3',  sites: 33 },
  { id: 'cms-nuevos4',   name: 'CMS Nuevos 4',  sites: 25 },
]

export default function Dashboard() {
  const [cmsStats, setCmsStats] = useState({})
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState(null)
  const [toast, setToast] = useState(null)
  const location = useLocation()

  useEffect(() => {
    const stored = localStorage.getItem('hub_user')
    if (stored) setUser(JSON.parse(stored))
    fetchStats()
  }, [])

  // Capturar notificación de borrado desde el editor
  useEffect(() => {
    if (location.state?.deleted) {
      setToast({
        type: 'success',
        message: `Artículo "${location.state.deletedTitle || 'sin título'}" eliminado correctamente.`,
      })
      // Limpiar el state del navigate para que no reaparezca al recargar
      window.history.replaceState({}, '')
      const t = setTimeout(() => setToast(null), 4000)
      return () => clearTimeout(t)
    }
  }, [location.state])

  const fetchStats = async () => {
    const token = localStorage.getItem('hub_token')
    const results = await Promise.all(
      CMS_CONFIG.map(async (cms) => {
        try {
          const res = await fetch(`${API_BASE}/cms/${cms.id}/stats`, {
            headers: { 'Authorization': `Bearer ${token}` },
          })
          if (!res.ok) return [cms.id, { status: 'error', articles: 0, sites: cms.sites }]
          const data = await res.json()
          return [cms.id, { status: 'ok', ...data, sites: cms.sites }]
        } catch (err) {
          return [cms.id, { status: 'offline', articles: 0, sites: cms.sites }]
        }
      })
    )
    setCmsStats(Object.fromEntries(results))
    setLoading(false)
  }

  const handleLogout = async () => {
    const token = localStorage.getItem('hub_token')
    try {
      await fetch(`${API_BASE}/auth/logout`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
      })
    } catch (e) {}
    localStorage.removeItem('hub_token')
    localStorage.removeItem('hub_user')
    window.location.href = '/login'
  }

  const totalSites = CMS_CONFIG.reduce((acc, c) => acc + c.sites, 0)
  const totalArticles = Object.values(cmsStats).reduce((acc, s) => acc + (s.articles || 0), 0)
  const onlineCms = Object.values(cmsStats).filter((s) => s.status === 'ok').length

  return (
    <div>
      <header className="dashboard-header flex-between">
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: '700' }}>Panel editorial</h1>
          {user && (
            <p className="text-sm text-muted" style={{ marginTop: '4px' }}>
              Bienvenido, <strong>{user.display_name || user.username}</strong>
              {user.role === 'admin' && <span className="badge badge-success" style={{ marginLeft: '8px' }}>Administrador</span>}
            </p>
          )}
        </div>
        <div className="flex" style={{ gap: '8px' }}>
          <Link to="/editor/cms-nuevos4/new" className="btn-primary">
            + Artículo nuevo
          </Link>
          <button onClick={handleLogout} className="btn-secondary">
            Cerrar sesión
          </button>
        </div>
      </header>

      {toast && (
        <div
          className={`toast toast-${toast.type}`}
          role="status"
          aria-live="polite"
        >
          {toast.type === 'success' ? '✓' : '⚠'} {toast.message}
          <button
            type="button"
            className="toast-close"
            onClick={() => setToast(null)}
            aria-label="Cerrar notificación"
          >
            ✕
          </button>
        </div>
      )}

      <main className="dashboard-content">
        {/* Resumen general */}
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-label">Sitios totales</div>
            <div className="stat-value">{totalSites}</div>
            <div className="text-xs text-muted">Distribuidos en 5 CMS</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Artículos publicados</div>
            <div className="stat-value">{loading ? '…' : totalArticles.toLocaleString('es-MX')}</div>
            <div className="text-xs text-muted">En los 5 CMS</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">CMS disponibles</div>
            <div className="stat-value">
              {loading ? '…' : `${onlineCms}/5`}
            </div>
            <div className="text-xs text-muted">Respondiendo correctamente</div>
          </div>
        </div>

        {/* Tarjetas por CMS */}
        <h2 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px', marginTop: '32px' }}>
          Tus CMS
        </h2>
        <div className="cms-grid">
          {CMS_CONFIG.map((cms) => {
            const stats = cmsStats[cms.id] || {}
            return (
              <div key={cms.id} className="card cms-card">
                <div className="flex-between" style={{ marginBottom: '12px' }}>
                  <h3 style={{ fontSize: '16px', fontWeight: '600' }}>{cms.name}</h3>
                  <span
                    className={`badge ${
                      stats.status === 'ok' ? 'badge-success' :
                      stats.status === 'offline' ? 'badge-error' : 'badge-warning'
                    }`}
                  >
                    {stats.status === 'ok' ? 'En línea' :
                     stats.status === 'offline' ? 'Sin conexión' :
                     loading ? 'Verificando…' : 'Con problemas'}
                  </span>
                </div>
                <div className="cms-stats">
                  <div>
                    <div className="text-xs text-muted">Sitios</div>
                    <div style={{ fontSize: '20px', fontWeight: '600' }}>{cms.sites}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted">Artículos</div>
                    <div style={{ fontSize: '20px', fontWeight: '600' }}>
                      {loading ? '…' : (stats.articles || 0).toLocaleString('es-MX')}
                    </div>
                  </div>
                </div>
                <div className="flex" style={{ gap: '8px', marginTop: '16px' }}>
                  <Link
                    to={`/editor/${cms.id}/new`}
                    className="btn-primary"
                    style={{ flex: 1, textAlign: 'center' }}
                  >
                    Crear artículo
                  </Link>
                </div>
              </div>
            )
          })}
        </div>
      </main>
    </div>
  )
}
