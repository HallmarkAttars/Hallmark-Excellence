import { Fragment, useEffect, useRef, useState } from 'react'
import { getOrders, updateOrderStatus, deleteOrder } from '../services/mockApi'
import { useAuth } from '../context/AuthContext'
import AdminStatusBadge from '../components/ui/AdminStatusBadge'
import {
  formatINR,
  formatOrderDate,
  formatOrderTime,
  formatOrderDateTime,
  formatItemsCount,
} from '../utils/format'
import './Orders.css'

// Canonical statuses — Title Case, matching the values the backend writes
// and the live orders_order_status_check constraint accepts.
const STATUSES = ['Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled']

// Map whatever case the backend stored (legacy rows could differ) onto the
// canonical option values so the controlled <select> always matches an option.
function canonicalStatus(value) {
  return STATUSES.find((s) => s.toLowerCase() === String(value ?? '').toLowerCase()) || value
}

// Shared ORDER ITEMS block used by BOTH the desktop detail panel and the
// mobile expanded card — one renderer, same order data. Images are 56px with
// object-fit: contain; line totals are right-aligned; an Items Total row is
// shown when multiple/live items exist.
function OrderItemsList({ items }) {
  const list = Array.isArray(items) ? items : []
  const itemsTotal = list.reduce((sum, it) => {
    const unit = Number(it.unit_price ?? it.price ?? 0)
    const qty = Number(it.quantity ?? it.qty ?? 1)
    return sum + unit * qty
  }, 0)

  if (list.length === 0) return <p className="orders-panel-empty">No items recorded for this order.</p>

  return (
    <div className="orders-panel-items">
      {list.map((item, i) => {
        const name = item.product_name ?? item.name ?? 'Item'
        const unitPrice = Number(item.unit_price ?? item.price ?? 0)
        const qty = Number(item.quantity ?? item.qty ?? 1)
        const subtotal = Number(item.subtotal ?? unitPrice * qty)
        const label = item.variant_label
          || (item.quantity_value != null && item.quantity_unit
              ? `${item.quantity_value} ${item.quantity_unit}`
              : '')
        return (
          <div className="orders-panel-item" key={i}>
            <div className="orders-panel-item-img">
              {item.image ? (
                <img src={item.image} alt={name} loading="lazy" />
              ) : (
                <span className="orders-panel-item-img-ph" aria-hidden="true">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 3 4 7v10l8 4 8-4V7l-8-4Z" /><path d="M4 7l8 4 8-4M12 11v10" />
                  </svg>
                </span>
              )}
            </div>
            <div className="orders-panel-item-info">
              <span className="orders-panel-item-name">{name}</span>
              {label && <span className="orders-panel-item-variant">{label}</span>}
              <span className="orders-panel-item-meta">{formatINR(unitPrice)} × {qty}</span>
            </div>
            <span className="orders-panel-item-total">{formatINR(subtotal)}</span>
          </div>
        )
      })}
      <div className="orders-panel-items-total">
        <span>Items Total</span>
        <span>{formatINR(itemsTotal)}</span>
      </div>
    </div>
  )
}

// Shared labelled customer rows (CUSTOMER / PHONE / ADDRESS / AREA / MESSAGE).
function CustomerDetails({ o }) {
  return (
    <>
      <p className="orders-panel-name">{o.customer_name}</p>
      {o.phone && (
        <p className="orders-panel-labeled"><span>Phone</span><strong>{o.phone}</strong></p>
      )}
      {(o.address || o.pincode) && (
        <p className="orders-panel-labeled">
          <span>Address</span>
          <strong>{[o.address, o.pincode].filter(Boolean).join(', ')}</strong>
        </p>
      )}
      {(o.city || o.state) && (
        <p className="orders-panel-labeled">
          <span>Area</span>
          <strong>{[o.locality, o.city, o.state].filter(Boolean).join(', ')}</strong>
        </p>
      )}
      {o.message && (
        <p className="orders-panel-labeled"><span>Message</span><strong>"{o.message}"</strong></p>
      )}
    </>
  )
}

// Desktop chevron expand control — 40x40 hit area, aria-expanded, rotates open.
function ExpandButton({ expanded, orderId, onClick }) {
  return (
    <button
      type="button"
      className="orders-expand-btn"
      onClick={onClick}
      aria-expanded={expanded}
      aria-label={expanded ? `Hide details for order ${orderId}` : `View details for order ${orderId}`}
      title={expanded ? 'Hide order details' : 'View order details'}
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="m6 9 6 6 6-6" />
      </svg>
    </button>
  )
}

function StatusSelect({ o, updatingId, onUpdate, className }) {
  const key = canonicalStatus(o.status)
  return (
    <div className="orders-status-cell">
      <select
        className={`orders-status-select orders-status-${String(key).toLowerCase()}${className ? ` ${className}` : ''}`}
        value={key}
        disabled={updatingId === o.id}
        onChange={(e) => onUpdate(o.id, e.target.value)}
        aria-label={`Status of order ${o.order_number}`}
      >
        {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
        {!STATUSES.some((s) => s.toLowerCase() === String(o.status ?? '').toLowerCase()) && (
          <option value={o.status} disabled>{o.status}</option>
        )}
      </select>
      {updatingId === o.id && <span className="orders-updating">Updating…</span>}
    </div>
  )
}

export default function Orders() {
  const { can } = useAuth()
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
            {/* Desktop table — kept as-is, shown at >= 768px */}
            <div className="orders-desktop">
              <div className="table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th aria-label="Expand" />
                      <th>Order #</th>
                      <th>Customer</th>
                      <th>Date</th>
                      <th>Amount</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.map((o) => (
                      <Fragment key={o.id}>
                        <tr className={`orders-row ${expanded === o.id ? 'is-expanded' : ''}`}>
                          <td className="orders-expand-cell">
                            <ExpandButton
                              expanded={expanded === o.id}
                              orderId={o.order_number}
                              onClick={() => setExpanded(expanded === o.id ? null : o.id)}
                            />
                          </td>
                          <td className="orders-order-number" title={o.order_number}>{o.order_number}</td>
                          <td className="orders-customer">{o.customer_name}</td>
                          <td className="orders-date">
                            <span className="orders-date-line">{formatOrderDate(o.created_at)}</span>
                            <span className="orders-time-line">{formatOrderTime(o.created_at)}</span>
                          </td>
                          <td className="orders-amount">{formatINR(o.total_amount)}</td>
                          <td>
                            <StatusSelect o={o} updatingId={updatingId} onUpdate={handleStatusChange} />
                          </td>
                          <td className="orders-actions-cell">
                            {can('orders.delete') && (
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
                            )}
                          </td>
                        </tr>
                        {expanded === o.id && (
                          <tr className="orders-detail-row">
                            <td colSpan={7}>
                              <div className="orders-panel">
                                <section className="orders-panel-customer">
                                  <h4>Customer</h4>
                                  <CustomerDetails o={o} />
                                </section>
                                <section className="orders-panel-products">
                                  <h4>Order Items</h4>
                                  <OrderItemsList items={o.items} />
                                </section>
                                <footer className="orders-panel-footer">
                                  <span>Order placed</span>
                                  <strong>{formatOrderDateTime(o.created_at)}</strong>
                                </footer>
                              </div>
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Mobile order cards — same orders array, shown below 768px */}
            <div className="orders-mobile">
              {orders.map((o) => {
                const isOpen = expanded === o.id
                return (
                  <div className={`order-card ${isOpen ? 'is-open' : ''}`} key={o.id}>
                    {/* Header — truncated order id + status badge; clickable */}
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
                      <AdminStatusBadge status={o.status} />
                    </div>

                    <span className="order-card-customer">{o.customer_name}</span>

                    <div className="order-card-bottom">
                      <span className="order-card-date">
                        {formatOrderDate(o.created_at)} · {formatItemsCount(o.items?.length)}
                      </span>
                      <span className="order-card-amount">{formatINR(o.total_amount)}</span>
                    </div>

                    {isOpen && (
                      <div className="order-card-details">
                        <section className="order-card-detail-section">
                          <h4>Customer</h4>
                          <CustomerDetails o={o} />
                        </section>

                        <section className="order-card-detail-section">
                          <h4>Order Items</h4>
                          <OrderItemsList items={o.items} />
                        </section>

                        <p className="order-card-placed">
                          <span>Order placed</span>
                          <strong>{formatOrderDateTime(o.created_at)}</strong>
                        </p>

                        <section className="order-card-detail-section">
                          <h4>Status</h4>
                          <StatusSelect o={o} updatingId={updatingId} onUpdate={handleStatusChange} className="order-card-status-select" />
                        </section>

                        {can('orders.delete') && (
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
                        )}
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
              Delete order {confirmDelete.order_number}? This action cannot be undone.
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
