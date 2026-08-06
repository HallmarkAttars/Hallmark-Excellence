import { useEffect, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import './Topbar.css'

export default function Topbar({ onMenuClick }) {
  const { admin } = useAuth()

  // Short, unclipped placeholder on mobile; full description on larger screens.
  const [isMobile, setIsMobile] = useState(() => window.matchMedia('(max-width: 767px)').matches)

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)')
    const onChange = (e) => setIsMobile(e.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  return (
    <header className="topbar">
      <button className="topbar-menu-btn" onClick={onMenuClick} aria-label="Open menu">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M3 6h18M3 12h18M3 18h18" />
        </svg>
      </button>

      <div className="topbar-search">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" />
        </svg>
        <input
          type="search"
          placeholder={isMobile ? 'Search…' : 'Search products, orders…'}
          aria-label="Search"
        />
      </div>

      <div className="topbar-actions">
        <button className="topbar-bell" aria-label="Notifications">
          <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.7 21a2 2 0 0 1-3.4 0" />
          </svg>
        </button>
        <div className="topbar-admin">
          <div className="topbar-avatar">{admin?.name?.[0]?.toUpperCase() || 'A'}</div>
          <span>{admin?.name || 'Admin'}</span>
        </div>
      </div>
    </header>
  )
}
