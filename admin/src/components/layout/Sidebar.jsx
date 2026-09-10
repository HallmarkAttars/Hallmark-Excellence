import { useEffect } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import './Sidebar.css'

// SVG icons for each nav item — inline for zero-dependency rendering.
const ICONS = {
  dashboard: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="3" y="3" width="7" height="9" rx="1.5" /><rect x="14" y="3" width="7" height="5" rx="1.5" />
      <rect x="3" y="16" width="7" height="5" rx="1.5" /><rect x="14" y="12" width="7" height="9" rx="1.5" />
    </svg>
  ),
  products: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M20 7 12 3 4 7v10l8 4 8-4V7Z" /><path d="M4 7l8 4 8-4M12 11v10" />
    </svg>
  ),
  orders: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="4" y="7" width="16" height="14" rx="2" /><path d="M9 7V5a3 3 0 0 1 6 0v2" />
    </svg>
  ),
  categories: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z" />
    </svg>
  ),
  brands: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M12 2 2 7l10 5 10-5-10-5z" /><path d="M2 17l10 5 10-5" /><path d="M2 12l10 5 10-5" />
    </svg>
  ),
  bulkPricing: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M12 2v20M17 6H9.5a2.5 2.5 0 0 0 0 5h5a2.5 2.5 0 0 1 0 5H6" />
    </svg>
  ),
  logout: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  ),
}

// Each item may declare the permission required to see it. Items without a
// permission are visible to every authenticated role.
const NAV_ITEMS = [
  { to: '/admin/dashboard', label: 'Dashboard', permission: 'dashboard.view', icon: ICONS.dashboard },
  { to: '/admin/products', label: 'Products', permission: 'products.view', icon: ICONS.products },
  { to: '/admin/orders', label: 'Orders', permission: 'orders.view', icon: ICONS.orders },
  { to: '/admin/categories', label: 'Categories', permission: 'categories.view', icon: ICONS.categories },
  { to: '/admin/brands', label: 'Brands', permission: 'brands.view', icon: ICONS.brands },
  { to: '/admin/brands/bulk-pricing', label: 'Bulk Pricing', permission: 'brands.view', icon: ICONS.bulkPricing },
]

export default function Sidebar({ open, onClose }) {
  const { logout, can } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/admin/login')
  }

  // Lock body scroll when the mobile drawer is open.
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [open])

  return (
    <>
      <aside
        className={`sidebar ${open ? 'is-open' : ''}`}
        aria-label="Admin navigation"
        aria-expanded={open}
      >
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
              <span className="sidebar-link-icon" aria-hidden="true">{item.icon}</span>
              <span className="sidebar-link-label">{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <button className="sidebar-link sidebar-logout" onClick={handleLogout}>
          <span className="sidebar-link-icon" aria-hidden="true">{ICONS.logout}</span>
          <span className="sidebar-link-label">Logout</span>
        </button>
      </aside>
      {open && (
        <div
          className="sidebar-scrim"
          onClick={onClose}
          role="presentation"
          aria-hidden="true"
        />
      )}
    </>
  )
}
