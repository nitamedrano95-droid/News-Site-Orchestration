import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

const API_BASE = import.meta.env.VITE_API_BASE || '/api'

const CMS_CONFIG = [
  { id: 'cms-originaux', name: 'CMS Originaux', sites: 11 },
  { id: 'cms-nuevos', name: 'CMS Nuevos', sites: 18 },
  { id: 'cms-nuevos2', name: 'CMS Nuevos 2', sites: 9 },
  { id: 'cms-nuevos3', name: 'CMS Nuevos 3', sites: 33 },
  { id: 'cms-nuevos4', name: 'CMS Nuevos 4', sites: 25 },
]

export default function Dashboard() {
  const [user, setUser] = useState(null)
  const [cmsStats, setCmsStats] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const userData = localStorage.getItem('hub_user')
    if (userData) {
      setUser(JSON.parse(userData))
    }
    fetchCmsStats()
  }, [])

  const fetchCmsStats = async () => {
    try {
      const token = localStorage.getItem('hub_token')
      const promises = CMS_CONFIG.map(async (cms) => {
        try {
          const res = await fetch(`${API_BASE}/cms/${cms.id}/stats`, {
            headers: { 'Authorization': `Bearer ${token}` },
          })
          if (!res.ok) throw new Error()
          const data = await res.json()
          return { ...cms, ...data }
        } catch {
          return { ...cms, articles: 0, published: 0, error: true }
        }
      })
      const stats = await Promise.all(promises)
      setCmsStats(stats)
    } catch (err) {
      console.error('Failed to fetch CMS stats:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('hub_token')
    localStorage.removeItem('hub_user')
    window.location.href = '/login'
  }

  return (
    <div>
      <header className="dashboard-header flex-between">
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: '700' }}>NexoPress Hub</h1>
          <p className="text-muted text-sm">Panel Editorial Unificado</p>
        </div>
        <div className="flex">
          <span className="text-sm text-muted">
            {user?.username || user?.email}
          </span>
          <button onClick={handleLogout} className="btn-secondary">
            Salir
          </button>
        </div>
      </header>

      <main className="dashboard-content">
        <h2 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px' }}>
          Sitios por CMS
        </h2>

        {loading ? (
          <p className="text-muted">Cargando estadísticas...</p>
        ) : (
          <div className="cms-grid">
            {cmsStats.map((cms) => (
              <div key={cms.id} className="cms-card">
                <div className="cms-card-header">
                  <span className="cms-card-title">{cms.name}</span>
                  {cms.error ? (
                    <span className="badge badge-error">Sin conexión</span>
                  ) : (
                    <span className="badge badge-success">Activo</span>
                  )}
                </div>

                <p className="text-sm text-muted">
                  {cms.sites} sitios
                </p>

                <div className="cms-card-stats">
                  <div className="cms-card-stat">
                    <div className="cms-card-stat-value">
                      {cms.articles || 0}
                    </div>
                    <div className="cms-card-stat-label">Artículos</div>
                  </div>
                  <div className="cms-card-stat">
                    <div className="cms-card-stat-value">
                      {cms.published || 0}
                    </div>
                    <div className="cms-card-stat-label">Publicados</div>
                  </div>
                </div>

                <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid var(--border)' }}>
                  <Link
                    to={`/editor/${cms.id}/new`}
                    className="btn-primary"
                    style={{ display: 'block', textAlign: 'center', padding: '8px' }}
                  >
                    Nuevo Artículo
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}

        <section style={{ marginTop: '32px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px' }}>
            Artículos Recientes
          </h2>
          <div className="card">
            <p className="text-muted text-sm">
              Funcionalidad en desarrollo — próximamente verás aquí los últimos artículos de todos los CMS.
            </p>
          </div>
        </section>
      </main>
    </div>
  )
}
