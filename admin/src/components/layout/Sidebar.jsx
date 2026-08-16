import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import './Sidebar.css'

// Each item may declare the permission required to see it. Items without a
// permission are visible to every authenticated role.
const NAV_ITEMS = [
  { to: '/admin/dashboard', label: 'Dashboard', permission: 'dashboard.view' },
  { to: '/admin/products', label: 'Products', permission: 'products.view' },
  { to: '/admin/orders', label: 'Orders', permission: 'orders.view' },
  { to: '/admin/categories', label: 'Categories', permission: 'categories.view' },
  { to: '/admin/brands', label: 'Brands', permission: 'brands.view' },
  { to: '/admin/brands/bulk-pricing', label: 'Bulk Pricing', permission: 'brands.view' },
]

export default function Sidebar({ open, onClose }) {
  const { logout, can } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/admin/login')
  }

  return (
    <>
      <aside className={`sidebar ${open ? 'is-open' : ''}`}>
        <div className="sidebar-brand">
          <img src="/HE white Logo.png" alt="HE Logo" className="sidebar-logo-img" />
        </div>

        <nav className="sidebar-nav">
          {NAV_ITEMS.filter((item) => can(item.permission)).map((item) => (
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
