import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { API_BASE } from '../main.jsx'
import HubNav from '../components/HubNav'

function normalizeUser(row) {
  return {
    id: row.ID ?? row.id ?? null,
    name: row.NOMBRE ?? row.name ?? row.username ?? '',
    email: row.EMAIL ?? row.email ?? '',
    role: (row.ROL ?? row.role ?? 'editor').toString().toLowerCase(),
    active: row.ACTIVO === 1 || row.ACTIVO === true || row.activo === 1 || row.activo === true,
  }
}

function roleLabel(role) {
  const map = {
    admin: 'Administrador',
    editor: 'Editor',
    viewer: 'Visualizador',
    autor: 'Autor',
  }
  return map[role] || (role.charAt(0).toUpperCase() + role.slice(1))
}

function roleBadgeClass(role) {
  if (role === 'admin') return 'badge-success'
  if (role === 'editor') return 'badge-info'
  return 'badge-warning'
}

export default function Users() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [busyId, setBusyId] = useState(null)
  const [modal, setModal] = useState({ open: false, user: null, setupUrl: '', error: null, copied: false })

  const token = () => localStorage.getItem('cms_token')

  useEffect(() => {
    loadUsers()
  }, [])

  const loadUsers = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`${API_BASE}/auth/users`, {
        headers: { 'Authorization': `Bearer ${token()}` },
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || `HTTP ${res.status}`)
      }
      const data = await res.json()
      const list = Array.isArray(data) ? data : (data.users || [])
      setUsers(list.map(normalizeUser))
    } catch (err) {
      console.error('Users.loadUsers:', err)
      setError(err.message)
      setUsers([])
    } finally {
      setLoading(false)
    }
  }

  const openGenerateModal = (user) => {
    setModal({ open: true, user, setupUrl: '', error: null, copied: false })
  }

  const closeModal = () => {
    setModal({ open: false, user: null, setupUrl: '', error: null, copied: false })
  }

  const generateLink = async () => {
    if (!modal.user || busyId) return
    const username = modal.user.name
    if (!username) {
      setModal((prev) => ({ ...prev, error: 'El usuario no tiene nombre identificable.' }))
      return
    }
    setBusyId(modal.user.id ?? username)
    setModal((prev) => ({ ...prev, error: null, setupUrl: '' }))
    try {
      const res = await fetch(`${API_BASE}/auth/generate-password-token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token()}`,
        },
        body: JSON.stringify({ username }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`)
      setModal((prev) => ({
        ...prev,
        setupUrl: data.setupUrl || '',
        error: null,
        copied: false,
      }))
    } catch (err) {
      console.error('Users.generateLink:', err)
      setModal((prev) => ({ ...prev, error: err.message }))
    } finally {
      setBusyId(null)
    }
  }

  const copyLink = async () => {
    if (!modal.setupUrl) return
    try {
      await navigator.clipboard.writeText(modal.setupUrl)
      setModal((prev) => ({ ...prev, copied: true }))
      const t = setTimeout(() => setModal((prev) => ({ ...prev, copied: false })), 2500)
      return () => clearTimeout(t)
    } catch (err) {
      // Fallback for browsers without clipboard API
      const textarea = document.createElement('textarea')
      textarea.value = modal.setupUrl
      textarea.style.position = 'fixed'
      textarea.style.opacity = '0'
      document.body.appendChild(textarea)
      textarea.select()
      try {
        document.execCommand('copy')
        setModal((prev) => ({ ...prev, copied: true }))
      } catch (e) {
        console.error('Users.copyLink fallback:', e)
      }
      document.body.removeChild(textarea)
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
          <h1 style={{ fontSize: '22px', fontWeight: '700', marginTop: '8px' }}>Usuarios</h1>
          <p className="text-sm text-muted" style={{ marginTop: '4px' }}>
            Genera un enlace temporal para que un usuario configure su contraseña.
          </p>
        </div>
      </header>

      {loading ? (
        <p className="text-muted">Cargando usuarios…</p>
      ) : error ? (
        <div className="card" style={{ borderColor: 'var(--error)' }}>
          <p style={{ color: 'var(--error)' }}>No se pudieron cargar los usuarios: {error}</p>
          <button type="button" className="btn-secondary" onClick={loadUsers} style={{ marginTop: '8px' }}>
            Reintentar
          </button>
        </div>
      ) : users.length === 0 ? (
        <p className="text-muted">No hay usuarios registrados.</p>
      ) : (
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Correo</th>
                <th>Rol</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => {
                const key = user.id ?? user.name
                return (
                  <tr key={key}>
                    <td style={{ fontWeight: 500 }}>{user.name || '—'}</td>
                    <td className="text-xs">{user.email || '—'}</td>
                    <td>
                      <span className={`badge ${roleBadgeClass(user.role)}`}>{roleLabel(user.role)}</span>
                    </td>
                    <td>
                      {user.active ? (
                        <span className="badge badge-success">Activo</span>
                      ) : (
                        <span className="badge badge-warning">Inactivo</span>
                      )}
                    </td>
                    <td>
                      <button
                        type="button"
                        className="btn-sm btn-secondary"
                        onClick={() => openGenerateModal(user)}
                      >
                        🔑 Generar link
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {modal.open && (
        <div className="modal-overlay" onClick={closeModal} role="dialog" aria-modal="true">
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h3>Generar enlace de contraseña</h3>
                <p className="text-sm text-muted" style={{ marginTop: '4px' }}>
                  Usuario: <strong>{modal.user?.name}</strong>
                </p>
              </div>
              <button type="button" className="modal-close" onClick={closeModal} aria-label="Cerrar">
                ✕
              </button>
            </div>

            <div className="modal-body">
              <p className="text-sm text-muted">
                Se enviará un enlace válido por 24 horas para que {modal.user?.name || 'el usuario'} configure su contraseña.
                Solo compártelo por un canal seguro.
              </p>

              {modal.error && (
                <p style={{ color: 'var(--error)' }} className="text-sm">
                  {modal.error}
                </p>
              )}

              {modal.setupUrl ? (
                <div className="setup-link-block">
                  <label className="text-xs text-muted">Enlace generado:</label>
                  <code className="setup-link-display">{modal.setupUrl}</code>
                  <div className="flex" style={{ gap: '8px', marginTop: '12px' }}>
                    <button type="button" className="btn-primary" onClick={copyLink}>
                      {modal.copied ? '✓ Copiado' : '📋 Copiar enlace'}
                    </button>
                    <a
                      href={modal.setupUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-secondary"
                    >
                      Abrir ↗
                    </a>
                  </div>
                </div>
              ) : (
                <div className="flex" style={{ gap: '8px', justifyContent: 'flex-end', marginTop: '16px' }}>
                  <button type="button" className="btn-secondary" onClick={closeModal}>
                    Cancelar
                  </button>
                  <button
                    type="button"
                    className="btn-primary"
                    onClick={generateLink}
                    disabled={busyId !== null}
                  >
                    {busyId !== null ? 'Generando…' : 'Generar enlace'}
                  </button>
                </div>
              )}
            </div>

            {modal.setupUrl && (
              <div className="modal-footer" style={{ padding: '0 24px 24px' }}>
                <button type="button" className="btn-secondary" onClick={closeModal}>
                  Cerrar
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
