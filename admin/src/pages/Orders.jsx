import { Fragment, useEffect, useRef, useState } from 'react'
import { getOrders, updateOrderStatus, deleteOrder } from '../services/mockApi'
import './Orders.css'

// Canonical statuses — Title Case, matching the values the backend writes
// and the live orders_order_status_check constraint accepts.
const STATUSES = ['Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled']

// Map whatever case the backend stored (legacy rows could differ) onto the
// canonical option values so the controlled <select> always matches an option.
function statusKey(value) {
  return STATUSES.find((s) => s.toLowerCase() === String(value ?? '').toLowerCase()) || value
}

// Shared item rows used by BOTH the desktop expanded detail and the mobile
// expanded card — one renderer, same order data.
function OrderItemsList({ items }) {
  return items.map((item, i) => {
    const name = item.product_name ?? item.name ?? 'Item'
    const unitPrice = Number(item.unit_price ?? item.price ?? 0)
    const qty = Number(item.quantity ?? item.qty ?? 1)
    const subtotal = Number(item.subtotal ?? unitPrice * qty)
    const label = item.variant_label
      || (item.quantity_value != null && item.quantity_unit
          ? `${item.quantity_value} ${item.quantity_unit}`
          : '')
    return (
      <div key={i} className="orders-item">
        {item.image && (
          <img
            src={item.image}
            alt={name}
            className="orders-item-image"
          />
        )}
        <div className="orders-item-info">
          <span className="orders-item-name">{name}</span>
          {label && <span className="orders-item-variant">{label}</span>}
          <span className="orders-item-meta">
            ₹{unitPrice.toLocaleString('en-IN')} × {qty}
          </span>
        </div>
        <span className="orders-item-subtotal">
          ₹{subtotal.toLocaleString('en-IN')}
        </span>
      </div>
    )
  })
}

export default function Orders() {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState(null)
  const [updatingId, setUpdatingId] = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [feedback, setFeedback] = useState(null)
  const feedbackTimer = useRef(null)

  useEffect(() => {
    getOrders().then((o) => {
      setOrders([...o].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)))
      setLoading(false)
    })
    return () => window.clearTimeout(feedbackTimer.current)
  }, [])

  const notify = (type, message) => {
    setFeedback({ type, message })
    window.clearTimeout(feedbackTimer.current)
    feedbackTimer.current = window.setTimeout(() => setFeedback(null), 4000)
  }

  const handleStatusChange = async (id, status) => {
    const previous = orders.find((o) => o.id === id)
    if (!previous || updatingId === id) return

    // Optimistic update for snappy UI; rolled back if Supabase rejects it.
    setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, status } : o)))
    setUpdatingId(id)
    try {
      const updated = await updateOrderStatus(id, status)
      setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, ...updated } : o)))
      notify('success', `Order ${updated.order_number || id} updated successfully.`)
    } catch (err) {
      // Log the real error in development, keep the previous status in the UI.
      console.error('Status update error:', err)
      console.error('Code:', err?.code)
      console.error('Message:', err?.message)
      console.error('Details:', err?.details)
      console.error('Hint:', err?.hint)
      setOrders((prev) => prev.map((o) => (o.id === id ? previous : o)))
      notify('error', 'Unable to update order status.')
    } finally {
      setUpdatingId(null)
    }
  }

  const handleDelete = async (order) => {
    if (deleting) return
    setDeleting(true)
    try {
      await deleteOrder(order.id)
      setOrders((prev) => prev.filter((o) => o.id !== order.id))
      setConfirmDelete(null)
      notify('success', `Order ${order.order_number} deleted successfully.`)
    } catch (err) {
      // The order must stay in the UI — do NOT remove it on failure.
      console.error('Delete order error:', err)
      console.error('Code:', err?.code)
      console.error('Message:', err?.message)
      console.error('Details:', err?.details)
      console.error('Hint:', err?.hint)
      setConfirmDelete(null)
      notify('error', 'Unable to delete order.')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="orders-page">
      <div className="page-header">
        <h1>Orders</h1>
      </div>

      {feedback && (
        <div className={`orders-feedback orders-feedback--${feedback.type}`} role="status" aria-live="polite">
          {feedback.message}
        </div>
      )}

      <div className="card">
        {loading ? (
          <div className="loading-state">Loading orders…</div>
        ) : orders.length === 0 ? (
          <div className="empty-state">No orders yet.</div>
        ) : (
          <>
            {/* Desktop table — kept exactly as-is, shown at >= 768px */}
            <div className="orders-desktop">
              <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th></th><th>Order #</th><th>Customer</th><th>Date</th><th>Amount</th><th>Status</th><th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => {
                  const key = statusKey(o.status)
                  return (
                    <Fragment key={o.id}>
                      <tr className="orders-row" onClick={() => setExpanded(expanded === o.id ? null : o.id)}>
                        <td className="orders-expand-icon">{expanded === o.id ? '−' : '+'}</td>
                        <td className="orders-order-number">{o.order_number}</td>
                        <td className="orders-customer">{o.customer_name}</td>
                        <td className="orders-date">{new Date(o.created_at).toLocaleDateString('en-IN')}</td>
                        <td className="orders-amount">₹{Number(o.total_amount).toLocaleString('en-IN')}</td>
                        <td onClick={(e) => e.stopPropagation()}>
                          <div className="orders-status-cell">
                            <select
                              className={`orders-status-select orders-status-${String(key).toLowerCase()}`}
                              value={key}
                              disabled={updatingId === o.id}
                              onChange={(e) => handleStatusChange(o.id, e.target.value)}
                              aria-label={`Status of order ${o.order_number}`}
                            >
                              {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                              {!STATUSES.some((s) => s.toLowerCase() === String(o.status ?? '').toLowerCase()) && (
                                <option value={o.status} disabled>{o.status}</option>
                              )}
                            </select>
                            {updatingId === o.id && <span className="orders-updating">Updating…</span>}
                          </div>
                        </td>
                        <td onClick={(e) => e.stopPropagation()}>
                          <button
                            className="orders-delete-btn"
                            onClick={() => setConfirmDelete(o)}
                            aria-label={`Delete order ${o.order_number}`}
                          >
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                              <path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6M10 11v6M14 11v6" />
                            </svg>
                            Delete
                          </button>
                        </td>
                      </tr>
                      {expanded === o.id && (
                        <tr className="orders-detail-row">
                          <td colSpan={7}>
                            <div className="orders-detail">
                              <div>
                                <h4>Customer</h4>
                                <p>{o.customer_name}</p>
                                <p>{o.phone}</p>
                                <p>{o.address}, {o.pincode}</p>
                                {(o.city || o.state) && (
                                  <p>{[o.locality, o.city, o.state].filter(Boolean).join(', ')}</p>
                                )}
                                {o.message && <p>"{o.message}"</p>}
                              </div>
                              <div>
                                <h4>Items</h4>
                                <OrderItemsList items={o.items} />
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  )
                })}
              </tbody>
              </table>
              </div>
            </div>

            {/* Mobile order cards — same orders array, shown below 768px */}
            <div className="orders-mobile">
              {orders.map((o) => {
                const key = statusKey(o.status)
                const isOpen = expanded === o.id
                return (
                  <div className={`order-card ${isOpen ? 'is-open' : ''}`} key={o.id}>
                    {/* Header row — order id (truncated) + status badge; clickable */}
                    <div
                      className="order-card-head"
                      onClick={() => setExpanded(isOpen ? null : o.id)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault()
                          setExpanded(isOpen ? null : o.id)
                        }
                      }}
                      aria-expanded={isOpen}
                    >
                      <span className="order-card-id" title={o.order_number}>{o.order_number}</span>
                      <span className={`status-pill status-${String(key).toLowerCase()}`}>{o.status}</span>
                    </div>

                    <span className="order-card-customer">{o.customer_name}</span>

                    <div className="order-card-bottom">
                      <span className="order-card-date">
                        {new Date(o.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </span>
                      <span className="order-card-amount">₹{Number(o.total_amount).toLocaleString('en-IN')}</span>
                    </div>

                    {isOpen && (
                      <div className="order-card-details">
                        <div>
                          <h4>Order Details</h4>
                          <p><strong>Order ID</strong> {o.order_number}</p>
                          {o.phone && <p><strong>Phone</strong> {o.phone}</p>}
                          {o.address && (
                            <p><strong>Address</strong> {o.address}{o.pincode ? `, ${o.pincode}` : ''}</p>
                          )}
                          {(o.city || o.state) && (
                            <p><strong>Area</strong> {[o.locality, o.city, o.state].filter(Boolean).join(', ')}</p>
                          )}
                          {o.message && <p><strong>Message</strong> "{o.message}"</p>}
                        </div>

                        <div>
                          <h4>Products</h4>
                          <OrderItemsList items={o.items} />
                        </div>

                        <div>
                          <h4>Status</h4>
                          <select
                            id={`order-status-${o.id}`}
                            className={`orders-status-select orders-status-${String(key).toLowerCase()} order-card-status-select`}
                            value={key}
                            disabled={updatingId === o.id}
                            onChange={(e) => handleStatusChange(o.id, e.target.value)}
                            aria-label={`Status of order ${o.order_number}`}
                          >
                            {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                            {!STATUSES.some((s) => s.toLowerCase() === String(o.status ?? '').toLowerCase()) && (
                              <option value={o.status} disabled>{o.status}</option>
                            )}
                          </select>
                          {updatingId === o.id && <span className="orders-updating">Updating…</span>}
                        </div>

                        <button
                          type="button"
                          className="order-card-delete"
                          onClick={() => setConfirmDelete(o)}
                          aria-label={`Delete order ${o.order_number}`}
                        >
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                            <path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6M10 11v6M14 11v6" />
                          </svg>
                          Delete Order
                        </button>
                      </div>
                    )}

                    <button
                      type="button"
                      className="order-card-toggle"
                      onClick={() => setExpanded(isOpen ? null : o.id)}
                      aria-expanded={isOpen}
                      aria-label={isOpen ? `Hide details for order ${o.order_number}` : `View details for order ${o.order_number}`}
                    >
                      {isOpen ? 'Hide' : 'View'}
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="m6 9 6 6 6-6" />
                      </svg>
                    </button>
                  </div>
                )
              })}
            </div>
          </>
        )}
      </div>

      {confirmDelete && (
        <div className="modal-scrim" onClick={() => { if (!deleting) setConfirmDelete(null) }}>
          <div className="card confirm-dialog" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="Delete Order?">
            <h3>Delete Order?</h3>
            <p className="confirm-dialog-text">
              Are you sure you want to permanently delete order {confirmDelete.order_number}?
              This cannot be undone.
            </p>
            <div className="confirm-dialog-actions">
              <button className="btn btn-outline" disabled={deleting} onClick={() => setConfirmDelete(null)}>Cancel</button>
              <button className="btn btn-danger" disabled={deleting} onClick={() => handleDelete(confirmDelete)}>
                {deleting ? 'Deleting…' : 'Delete Order'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
