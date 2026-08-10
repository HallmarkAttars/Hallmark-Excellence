import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { ROLE_LABELS } from '../../config/roles'
import useNewOrderNotifications from '../../hooks/useNewOrderNotifications'
import { formatINR } from '../../utils/format'
import { timeAgo } from '../../utils/orderNotifications'
import './Topbar.css'

export default function Topbar({ onMenuClick }) {
  const { admin } = useAuth()
  const navigate = useNavigate()
  const { unreadCount, notifications, markAllRead, markRead } = useNewOrderNotifications()
  const [panelOpen, setPanelOpen] = useState(false)
  const panelRef = useRef(null)

  // Close the notification panel on outside click / ESC.
  useEffect(() => {
    if (!panelOpen) return
    const onDocClick = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) setPanelOpen(false)
    }
    const onKey = (e) => {
      if (e.key === 'Escape') setPanelOpen(false)
    }
    document.addEventListener('mousedown', onDocClick)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDocClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [panelOpen])

  // Open a new order from the bell → mark that notification read, then jump
  // to the existing Orders page with that exact order expanded.
  const openOrder = (notification) => {
    markRead(notification.id)
    setPanelOpen(false)
    navigate(`/admin/orders?open=${encodeURIComponent(notification.id)}`)
  }

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
        <div className="topbar-bell-wrap" ref={panelRef}>
          <button
            className="topbar-bell"
            aria-label={`Notifications${unreadCount ? ` (${unreadCount} unread)` : ''}`}
            aria-haspopup="true"
            aria-expanded={panelOpen}
            onClick={() => setPanelOpen((v) => !v)}
          >
            <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.7 21a2 2 0 0 1-3.4 0" />
            </svg>
            {unreadCount > 0 && (
              <span className="topbar-bell-badge" aria-hidden="true">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {panelOpen && (
            <div className="topbar-notif-panel" role="dialog" aria-label="New order notifications">
              <div className="topbar-notif-head">
                <h3 className="topbar-notif-title">Notifications</h3>
                {unreadCount > 0 && (
                  <button type="button" className="topbar-notif-markall" onClick={markAllRead}>
                    Mark all as read
                  </button>
                )}
              </div>

              <div className="topbar-notif-list">
                {notifications.length === 0 ? (
                  <p className="topbar-notif-empty">No new orders</p>
                ) : (
                  notifications.map((n) => (
                    <button
                      type="button"
                      key={n.id}
                      className="topbar-notif-item"
                      onClick={() => openOrder(n)}
                    >
                      <span className="topbar-notif-tag">New Order</span>
                      <span className="topbar-notif-order">{n.order_number}</span>
                      <span className="topbar-notif-customer">{n.customer_name}</span>
                      <span className="topbar-notif-meta">
                        <strong>{formatINR(n.total)}</strong>
                        <span>{timeAgo(n.created_at)}</span>
                      </span>
                    </button>
                  ))
                )}
              </div>

              <button
                type="button"
                className="topbar-notif-viewall"
                onClick={() => {
                  setPanelOpen(false)
                  navigate('/admin/orders')
                }}
              >
                View All Orders →
              </button>
            </div>
          )}
        </div>

        {/* Admin identity — avatar + stacked name/role. Role is shown once,
            beneath the name, never duplicated inline. */}
        <div className="topbar-admin">
          <div className="topbar-avatar" aria-hidden="true">
            {admin?.name?.[0]?.toUpperCase() || 'A'}
          </div>
          <div className="topbar-identity">
            <span className="topbar-identity-name">{admin?.name || 'Admin'}</span>
            {admin?.role && (
              <span className="topbar-identity-role">{ROLE_LABELS[admin.role] || admin.role}</span>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}
