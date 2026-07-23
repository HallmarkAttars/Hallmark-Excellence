import { useState } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { useCart } from '../../context/CartContext'
import './Navbar.css'

const LINKS = [
  { to: '/', label: 'Home' },
  { to: '/shop', label: 'Shop' },
  { to: '/categories', label: 'Categories' },
  { to: '/about', label: 'About Us' },
  { to: '/contact', label: 'Contact' },
]

export default function Navbar() {
  const [open, setOpen] = useState(false)
  const { itemCount } = useCart()

  return (
    <header className="navbar">
      <div className="container navbar-inner">
        <Link to="/" className="navbar-logo" onClick={() => setOpen(false)}>
          <img src="/HE Logo.png" alt="HE Logo" className="navbar-logo-img" />
        </Link>

        <nav className={`navbar-links ${open ? 'is-open' : ''}`} aria-label="Main navigation">
          {LINKS.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.to === '/'}
              className={({ isActive }) => `navbar-link ${isActive ? 'is-active' : ''}`}
              onClick={() => setOpen(false)}
            >
              {link.label}
            </NavLink>
          ))}
        </nav>

        <div className="navbar-actions">
          <Link to="/cart" className="navbar-cart" aria-label={`Cart, ${itemCount} items`}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <circle cx="9" cy="21" r="1" /><circle cx="19" cy="21" r="1" />
              <path d="M2 2h2l2.4 12.2a2 2 0 0 0 2 1.8h9.2a2 2 0 0 0 2-1.6L22 7H5.2" />
            </svg>
            {itemCount > 0 && <span className="navbar-cart-badge">{itemCount}</span>}
          </Link>

          <button
            className={`navbar-toggle ${open ? 'is-open' : ''}`}
            aria-label={open ? 'Close menu' : 'Open menu'}
            aria-expanded={open}
            onClick={() => setOpen((o) => !o)}
          >
            <span></span><span></span><span></span>
          </button>
        </div>
      </div>
    </header>
  )
}
