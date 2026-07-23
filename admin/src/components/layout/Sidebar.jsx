import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import './Sidebar.css'

const NAV_ITEMS = [
  { to: '/admin/dashboard', label: 'Dashboard' },
  { to: '/admin/products', label: 'Products' },
  { to: '/admin/orders', label: 'Orders' },
  { to: '/admin/categories', label: 'Categories' },
  { to: '/admin/brands/arees', label: 'Arees Brand' },
  { to: '/admin/brands/dahab', label: 'Dahab Brand' },
]

export default function Sidebar({ open, onClose }) {
  const { logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/admin/login')
  }

  return (
    <>
      <aside className={`sidebar ${open ? 'is-open' : ''}`}>
        <div className="sidebar-brand">
          <img src="/HE logo white.png" alt="HE Logo" className="sidebar-logo-img" />
        </div>

        <nav className="sidebar-nav">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => `sidebar-link ${isActive ? 'is-active' : ''}`}
              onClick={onClose}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <button className="sidebar-link sidebar-logout" onClick={handleLogout}>
          Logout
        </button>
      </aside>
      {open && <div className="sidebar-scrim" onClick={onClose} />}
    </>
  )
}
