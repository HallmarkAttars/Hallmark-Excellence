import { Link, useLocation } from 'react-router-dom'
import { useCart } from '../../context/CartContext'
import './MobileBottomNav.css'

function HomeIcon({ active }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? '2' : '1.6'} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 10.5 12 3l9 7.5V20a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z" />
      <path d="M9 22v-7a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v7" />
    </svg>
  )
}

function CategoriesIcon({ active }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? '2' : '1.6'} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="3" width="7.5" height="7.5" rx="1.5" />
      <rect x="13.5" y="3" width="7.5" height="7.5" rx="1.5" />
      <rect x="13.5" y="13.5" width="7.5" height="7.5" rx="1.5" />
      <rect x="3" y="13.5" width="7.5" height="7.5" rx="1.5" />
    </svg>
  )
}

function BrandsIcon({ active }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? '2' : '1.6'} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12.5 2.5a2 2 0 0 0-1.42.59l-7.5 7.5a2 2 0 0 0 0 2.82l6.5 6.5a2 2 0 0 0 2.83 0l7.5-7.5A2 2 0 0 0 21 11V4a1.5 1.5 0 0 0-1.5-1.5h-7Z" />
      <circle cx="16.5" cy="7.5" r="1.5" fill="currentColor" />
    </svg>
  )
}

function CartIcon({ active }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? '2' : '1.6'} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 8h14l-1.2 11a2 2 0 0 1-2 1.8H8.2a2 2 0 0 1-2-1.8L5 8Z" />
      <path d="M8.5 10V6.5a3.5 3.5 0 0 1 7 0V10" />
    </svg>
  )
}

function TrackIcon({ active }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? '2' : '1.6'} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2" />
      <path d="M14 9h4.3a1.5 1.5 0 0 1 1.2.6l2.5 3.3a1.5 1.5 0 0 1 .3.9V17a1 1 0 0 1-1 1h-2" />
      <circle cx="7" cy="18" r="2" />
      <circle cx="17" cy="18" r="2" />
    </svg>
  )
}

export default function MobileBottomNav() {
  const { pathname } = useLocation()
  const { itemCount } = useCart()

  const isHome = pathname === '/'
  const isCategories = pathname.startsWith('/categories')
  const isBrands = pathname === '/brands' || pathname.startsWith('/brand/')
  const isCart = pathname === '/cart'
  const isTrack = pathname === '/track-order' || pathname.startsWith('/view-order')

  const navItems = [
    {
      id: 'home',
      label: 'Home',
      to: '/',
      isActive: isHome,
      icon: <HomeIcon active={isHome} />,
    },
    {
      id: 'categories',
      label: 'Categories',
      to: '/categories',
      isActive: isCategories,
      icon: <CategoriesIcon active={isCategories} />,
    },
    {
      id: 'brands',
      label: 'Brands',
      to: '/brands',
      isActive: isBrands,
      icon: <BrandsIcon active={isBrands} />,
    },
    {
      id: 'cart',
      label: 'Cart',
      to: '/cart',
      isActive: isCart,
      icon: <CartIcon active={isCart} />,
      badge: itemCount > 0 ? itemCount : null,
    },
    {
      id: 'track',
      label: 'Track Order',
      to: '/track-order',
      isActive: isTrack,
      icon: <TrackIcon active={isTrack} />,
    },
  ]

  return (
    <nav className="mobile-bottom-nav" aria-label="Mobile Bottom Navigation">
      <div className="mobile-bottom-nav-inner">
        {navItems.map((item) => (
          <Link
            key={item.id}
            to={item.to}
            className={`mobile-bottom-nav-item ${item.isActive ? 'is-active' : ''}`}
            aria-current={item.isActive ? 'page' : undefined}
            aria-label={item.label}
          >
            {item.isActive && <span className="mobile-bottom-nav-indicator" aria-hidden="true" />}
            <span className="mobile-bottom-nav-icon-wrap">
              {item.icon}
              {item.badge != null && (
                <span className="mobile-bottom-nav-badge" aria-label={`${item.badge} items in cart`}>
                  {item.badge > 99 ? '99+' : item.badge}
                </span>
              )}
            </span>
            <span className="mobile-bottom-nav-label">{item.label}</span>
          </Link>
        ))}
      </div>
    </nav>
  )
}
