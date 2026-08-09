import { Fragment, useEffect, useRef, useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { useCart } from '../../context/CartContext'
import { NAV_LINKS, BRAND_LINKS } from '../../data/content'
import { IMAGES } from '../../config/assets'
import SearchOverlay from './SearchOverlay'
import './Navbar.css'

function SearchIcon() {
  return (
    <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden="true">
      <circle cx="11" cy="11" r="7" />
      <path d="m20.5 20.5-4-4" />
    </svg>
  )
}

function CartIcon() {
  return (
    <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 8h14l-1.2 11a2 2 0 0 1-2 1.8H8.2a2 2 0 0 1-2-1.8L5 8Z" />
      <path d="M8.5 10V6.5a3.5 3.5 0 0 1 7 0V10" />
    </svg>
  )
}

function ChevronIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m6 9 6 6 6-6" />
    </svg>
  )
}

function MenuIcon({ open }) {
  return open ? (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden="true">
      <path d="M5 5l14 14M19 5 5 19" />
    </svg>
  ) : (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden="true">
      <path d="M3.5 6.5h17M3.5 12h17M3.5 17.5h17" />
    </svg>
  )
}

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [dropOpen, setDropOpen] = useState(false)
  const [mobileBrandsOpen, setMobileBrandsOpen] = useState(false)
  const dropRef = useRef(null)
  const { itemCount } = useCart()
  const location = useLocation()

  // Any brand page highlights the "Brands" dropdown trigger.
  const isBrandActive = location.pathname.startsWith('/brand/')

  // The Brands dropdown / drawer group is anchored right after the Categories
  // link in both the desktop nav and the mobile drawer.
  const BRANDS_AFTER = '/categories'

  // One subtle cart-badge pop whenever the count increases (an item was
  // added). Keying the badge re-runs the CSS pop; decreases and quantity
  // edits don't. The cart itself is untouched — animation only. The ref
  // starts at the mount-time count so a persisted cart never pops on load.
  const prevCount = useRef(itemCount)
  const [badgePop, setBadgePop] = useState(0)
  useEffect(() => {
    if (itemCount > prevCount.current) setBadgePop((k) => k + 1)
    prevCount.current = itemCount
  }, [itemCount])

  // Close the mobile menu and the desktop dropdown whenever the route changes.
  useEffect(() => {
    setMenuOpen(false)
    setDropOpen(false)
    setMobileBrandsOpen(false)
  }, [location.pathname])

  // Close the desktop dropdown on outside click or Escape while it's open.
  useEffect(() => {
    if (!dropOpen) return
    const onDown = (e) => {
      if (dropRef.current && !dropRef.current.contains(e.target)) setDropOpen(false)
    }
    const onKey = (e) => {
      if (e.key === 'Escape') setDropOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [dropOpen])

  // Lock body scroll while an overlay is open.
  useEffect(() => {
    const lock = menuOpen || searchOpen
    document.body.style.overflow = lock ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [menuOpen, searchOpen])

  // Close the menu with Escape.
  useEffect(() => {
    if (!menuOpen) return
    const onKey = (e) => {
      if (e.key === 'Escape') setMenuOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [menuOpen])

  return (
    <>
      <header className="navbar">
        <div className="container navbar-inner">
          <Link to="/" className="navbar-logo" aria-label="Arees and Dahab — home">
            <img src={IMAGES.logo} alt="Arees & Dahab" className="navbar-logo-img" />
          </Link>

          <nav className="navbar-nav" aria-label="Main navigation">
            {NAV_LINKS.map((link) => (
              <Fragment key={link.to}>
                <NavLink
                  to={link.to}
                  end={link.end}
                  className={({ isActive }) => `navbar-link ${isActive ? 'is-active' : ''}`}
                >
                  {link.label}
                </NavLink>
                {link.to === BRANDS_AFTER && (
                  <div
                    className={`navbar-drop ${dropOpen ? 'is-open' : ''}`}
                    ref={dropRef}
                    onMouseEnter={() => setDropOpen(true)}
                    onMouseLeave={() => setDropOpen(false)}
                  >
                    <button
                      type="button"
                      className={`navbar-link navbar-drop-trigger ${isBrandActive ? 'is-active' : ''}`}
                      aria-haspopup="true"
                      aria-expanded={dropOpen}
                      onClick={() => setDropOpen((o) => !o)}
                    >
                      Brands
                      <span className="navbar-drop-caret"><ChevronIcon /></span>
                    </button>
                    <div className={`navbar-drop-menu ${dropOpen ? 'is-open' : ''}`}>
                      {BRAND_LINKS.map((brand) => (
                        <NavLink
                          key={brand.to}
                          to={brand.to}
                          className={({ isActive }) => `navbar-drop-link ${isActive ? 'is-active' : ''}`}
                          onClick={() => setDropOpen(false)}
                        >
                          {brand.label}
                        </NavLink>
                      ))}
                    </div>
                  </div>
                )}
              </Fragment>
            ))}
          </nav>

          <div className="navbar-actions">
            <button
              type="button"
              className="navbar-icon-btn"
              onClick={() => setSearchOpen(true)}
              aria-label="Search products"
              aria-expanded={searchOpen}
            >
              <SearchIcon />
            </button>

            <Link to="/cart" className="navbar-icon-btn navbar-cart" aria-label={`Cart, ${itemCount} items`}>
              <CartIcon />
              <span className="navbar-cart-badge-wrap" aria-live="polite">
                {itemCount > 0 && <span key={badgePop} className="navbar-cart-badge cart-badge-pop">{itemCount}</span>}
              </span>
            </Link>

            <button
              type="button"
              className="navbar-icon-btn navbar-toggle"
              aria-label={menuOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((o) => !o)}
            >
              <MenuIcon open={menuOpen} />
            </button>
          </div>
        </div>
      </header>

      {/* Mobile slide-in drawer */}
      <div
        className={`navbar-backdrop ${menuOpen ? 'is-visible' : ''}`}
        onClick={() => setMenuOpen(false)}
        aria-hidden="true"
      />
      <nav
        className={`navbar-drawer ${menuOpen ? 'is-open' : ''}`}
        aria-label="Mobile navigation"
        aria-hidden={!menuOpen}
      >
        <div className="navbar-drawer-head">
          <span className="navbar-drawer-title">Menu</span>
          <button
            type="button"
            className="navbar-icon-btn navbar-drawer-close"
            onClick={() => setMenuOpen(false)}
            aria-label="Close menu"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden="true">
              <path d="M5 5l14 14M19 5 5 19" />
            </svg>
          </button>
        </div>

        <div className="navbar-drawer-links">
          {NAV_LINKS.map((link) => (
            <Fragment key={link.to}>
              <NavLink
                to={link.to}
                end={link.end}
                className={({ isActive }) => `navbar-drawer-link ${isActive ? 'is-active' : ''}`}
                onClick={() => setMenuOpen(false)}
              >
                {link.label}
              </NavLink>
              {link.to === BRANDS_AFTER && (
                <div className="navbar-drawer-group">
                  <button
                    type="button"
                    className={`navbar-drawer-trigger ${mobileBrandsOpen ? 'is-open' : ''}`}
                    aria-expanded={mobileBrandsOpen}
                    onClick={() => setMobileBrandsOpen((o) => !o)}
                  >
                    <span>Brands</span>
                    <span className="navbar-drawer-caret"><ChevronIcon /></span>
                  </button>
                  <div className={`navbar-drawer-sublinks ${mobileBrandsOpen ? 'is-open' : ''}`}>
                    {BRAND_LINKS.map((brand) => (
                      <NavLink
                        key={brand.to}
                        to={brand.to}
                        className={({ isActive }) => `navbar-drawer-sublink ${isActive ? 'is-active' : ''}`}
                        onClick={() => setMenuOpen(false)}
                      >
                        {brand.label}
                      </NavLink>
                    ))}
                  </div>
                </div>
              )}
            </Fragment>
          ))}
        </div>
      </nav>

      <SearchOverlay open={searchOpen} onClose={() => setSearchOpen(false)} />
    </>
  )
}
