import { NavLink } from 'react-router-dom'

const links = [
  { to: '/', label: 'Panel', end: true },
  { to: '/articles', label: 'Artículos' },
  { to: '/cms', label: 'CMS' },
  { to: '/gallery', label: 'Galería' },
  { to: '/users', label: 'Usuarios' },
]

export default function HubNav() {
  return (
    <nav className="hub-nav" aria-label="Navegación principal">
      <NavLink to="/" className="hub-nav-brand" end>
        NexoPress
      </NavLink>
      <div className="hub-nav-links">
        {links.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            end={link.end}
            className={({ isActive }) => `hub-nav-link${isActive ? ' active' : ''}`}
          >
            {link.label}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
