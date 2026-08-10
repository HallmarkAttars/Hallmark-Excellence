import { Fragment, useEffect, useMemo, useRef, useState } from 'react'
import { getOrders, updateOrderStatus, updateOrderPaymentStatus, deleteOrder } from '../services/mockApi'
import { useAuth } from '../context/AuthContext'
import AdminStatusBadge from '../components/ui/AdminStatusBadge'
import Modal from '../components/ui/Modal'
import OrderInvoice from '../components/invoice/OrderInvoice'
import { InvoiceDownloadButton, InvoicePrintButton } from '../components/invoice/InvoiceActions'
import {
  formatINR,
  formatOrderDate,
  formatOrderTime,
  formatOrderDateTime,
  formatItemsCount,
  matchesOrderSearch,
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

// Compact payment-method label for tables/chips/CSV: 'Cash on Delivery' → COD,
// 'UPI / Online Payment' → UPI. Unknown values fall back to the raw stored
// value so nothing is ever hidden or mislabelled.
function paymentShortLabel(value) {
  const s = String(value ?? '').trim()
  if (/cash/i.test(s)) return 'COD'
  if (/upi/i.test(s)) return 'UPI / Online Payment'
  return s || 'COD'
}

// True when the stored payment label/code refers to a UPI order. Both the
// display label and the canonical code (notes.payment_code) are checked so
// every order — new and legacy — is matched correctly.
function isUpiOrder(o) {
  const label = String(o.payment_method || '').toLowerCase()
  const code = String(o.payment_code || o.payment_method || '').toLowerCase()
  return label.includes('upi') || code === 'upi'
}

// Normalize the stored payment status onto a canonical value.
function canonicalPaymentStatus(value) {
  const s = String(value ?? '').toLowerCase()
  if (s === 'paid') return 'Paid'
  return 'Pending'
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
        // Pack purchase — show pack name + packs count + actual pieces instead
        // of the ambiguous single number. All values ride the stored snapshot,
        // so historical orders stay accurate even if the pack is edited later.
        const isPack = item.pack_size != null && item.number_of_packs != null
        const packLine = isPack
          ? `${item.pack_name || `Pack of ${item.pack_size}`} · ${item.number_of_packs} pack${item.number_of_packs > 1 ? 's' : ''} · ${item.actual_piece_quantity ?? item.pack_size * item.number_of_packs} pieces`
          : null
        const meta = isPack
          ? `${formatINR(item.pack_price ?? unitPrice)} / pack × ${item.number_of_packs}`
          : `${formatINR(unitPrice)} × ${qty}`
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
              {packLine && <span className="orders-panel-item-pack">{packLine}</span>}
              <span className="orders-panel-item-meta">{meta}</span>
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

// Shared labelled customer rows (CUSTOMER / PHONE / EMAIL / ADDRESS / AREA / MESSAGE).
function CustomerDetails({ o }) {
  return (
    <>
      <p className="orders-panel-name">{o.customer_name}</p>
      {o.phone && (
        <p className="orders-panel-labeled"><span>Phone</span><strong>{o.phone}</strong></p>
      )}
      {o.email && (
        <p className="orders-panel-labeled"><span>Email</span><strong>{o.email}</strong></p>
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

// Small search icon used in the toolbar input.
function SearchIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="11" cy="11" r="7" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  )
}

// CSV-safe cell: quote only when the value contains a delimiter.
function csvCell(value) {
  const s = String(value ?? '')
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

export default function Orders() {
  const { can } = useAuth()
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState(null)
  const [updatingId, setUpdatingId] = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [invoiceOrder, setInvoiceOrder] = useState(null)
  const [feedback, setFeedback] = useState(null)
  const feedbackTimer = useRef(null)

  // Search + filter state — filtering is CLIENT-SIDE over the already-loaded
  // orders (the admin fetches the full list once), so typing is instant and
  // no extra backend query fires per keystroke. The 180ms debounce only gates
  // the subtle spinner so the UI feels deliberate, never slower than needed.
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [searching, setSearching] = useState(false)
  const [statusFilter, setStatusFilter] = useState('All')
  // Payment-method chip filter: 'All' | 'upi' | 'cod' (no gateway — staff
  // simply filters to see which orders need manual payment follow-up).
  const [paymentFilter, setPaymentFilter] = useState('All')
  const [updatingPaymentId, setUpdatingPaymentId] = useState(null)

  useEffect(() => {
    getOrders().then((o) => {
      setOrders([...o].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)))
      setLoading(false)
    })
    return () => window.clearTimeout(feedbackTimer.current)
  }, [])

  // Debounce the search query; `searching` is true while a keystroke is
  // pending (drives the tiny spinner in the input).
  useEffect(() => {
    if (search === debouncedSearch) return
    setSearching(true)
    const t = window.setTimeout(() => {
      setDebouncedSearch(search)
      setSearching(false)
    }, 180)
    return () => window.clearTimeout(t)
  }, [search, debouncedSearch])

  // The visible set = status filter AND payment chip AND search (auto-detected
  // Order ID / mobile number). Pure function of state — the source of truth is
  // the `orders` array loaded once from the API.
  const visibleOrders = useMemo(() => {
    let list = orders
    if (statusFilter !== 'All') {
      list = list.filter((o) => canonicalStatus(o.status) === statusFilter)
    }
    if (paymentFilter !== 'All') {
      list = list.filter((o) =>
        paymentFilter === 'upi' ? isUpiOrder(o) : !isUpiOrder(o)
      )
    }
    if (debouncedSearch.trim()) {
      list = list.filter((o) => matchesOrderSearch(o, debouncedSearch))
    }
    return list
  }, [orders, statusFilter, paymentFilter, debouncedSearch])

  const hasQuery = Boolean(search.trim())

  const notify = (type, message) => {
    setFeedback({ type, message })
    window.clearTimeout(feedbackTimer.current)
    feedbackTimer.current = window.setTimeout(() => setFeedback(null), 4000)
  }

  // Instant clear — the results list must restore immediately, never waiting
  // on the debounce timer.
  const clearSearch = () => {
    setSearch('')
    setDebouncedSearch('')
    setSearching(false)
  }

  // Clear search + reset the status + payment filters (used by the
  // empty-state button).
  const clearAll = () => {
    clearSearch()
    setStatusFilter('All')
    setPaymentFilter('All')
  }

  // CSV export of the CURRENTLY VISIBLE orders — uses only already-loaded
  // real data; no backend call, no invented fields.
  const handleExport = () => {
    if (visibleOrders.length === 0) return
    const header = ['Order #', 'Customer', 'Phone', 'Date', 'Amount', 'Payment', 'Payment Status', 'Status']
    const rows = visibleOrders.map((o) => [
      o.order_number,
      o.customer_name,
      o.phone,
      formatOrderDate(o.created_at),
      o.total_amount,
      paymentShortLabel(o.payment_method),
      canonicalPaymentStatus(o.payment_status),
      o.status,
    ])
    const csv = [header, ...rows].map((r) => r.map(csvCell).join(',')).join('\r\n')
    const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `orders-${new Date().toISOString().slice(0, 10)}.csv`
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
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

  // Staff payment confirmation — marks an order Paid only after the payment
  // was actually received (no gateway exists). Optimistic like the status
  // select; rolled back if the backend rejects it.
  const handlePaymentStatusChange = async (id, status) => {
    const previous = orders.find((o) => o.id === id)
    if (!previous || updatingPaymentId === id) return

    setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, payment_status: status } : o)))
    setUpdatingPaymentId(id)
    try {
      const updated = await updateOrderPaymentStatus(id, status)
      setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, ...updated } : o)))
      notify('success', `Payment for ${updated.order_number || id} marked ${status}.`)
    } catch (err) {
      console.error('Payment status update error:', err)
      console.error('Code:', err?.code)
      console.error('Message:', err?.message)
      setOrders((prev) => prev.map((o) => (o.id === id ? previous : o)))
      notify('error', 'Unable to update payment status.')
    } finally {
      setUpdatingPaymentId(null)
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

  const noOrdersAtAll = !loading && orders.length === 0
  const noSearchResults = !loading && orders.length > 0 && visibleOrders.length === 0
  // Search-specific empty state only when the admin actually searched; a
  // status filter with no matches gets its own message.
  const emptyBySearch = noSearchResults && hasQuery

  return (
    <div className="orders-page">
      <div className="page-header orders-page-header">
        <div className="orders-page-head">
          <h1>Orders</h1>
          <p className="page-subtitle">Manage and view all customer orders</p>
        </div>
        <button
          type="button"
          className="btn btn-outline orders-export-btn"
          onClick={handleExport}
          disabled={visibleOrders.length === 0}
          title={visibleOrders.length === 0 ? 'Nothing to export' : 'Export visible orders as CSV'}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M12 3v12m0 0 4-4m-4 4-4-4" />
            <path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
          </svg>
          Export
        </button>
      </div>

      {feedback && (
        <div className={`orders-feedback orders-feedback--${feedback.type}`} role="status" aria-live="polite">
          {feedback.message}
        </div>
      )}

      {/* Search + filter toolbar */}
      <div className="card orders-toolbar">
        <div className="orders-search">
          <span className="orders-search-icon" aria-hidden="true"><SearchIcon /></span>
          <input
            type="text"
            inputMode="search"
            role="searchbox"
            className="orders-search-input"
            placeholder="Search by Order ID or mobile number..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search orders by Order ID or mobile number"
            autoComplete="off"
            spellCheck="false"
          />
          {searching && <span className="orders-search-spinner" aria-hidden="true" />}
          {hasQuery && (
            <button
              type="button"
              className="orders-search-clear"
              onClick={clearSearch}
              aria-label="Clear search"
              title="Clear search"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        <div className="orders-filter">
          <label className="orders-filter-label" htmlFor="orders-status-filter">Status</label>
          <select
            id="orders-status-filter"
            className="orders-filter-select"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="All">All Status</option>
            {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        {/* Payment chips — quick way to see orders needing manual follow-up */}
        <div className="orders-payment-chips" role="group" aria-label="Filter by payment method">
          {['All', 'upi', 'cod'].map((p) => (
            <button
              key={p}
              type="button"
              className={`orders-payment-chip${paymentFilter === p ? ' is-active' : ''}`}
              onClick={() => setPaymentFilter(p)}
              aria-pressed={paymentFilter === p}
            >
              {p === 'All' ? 'All' : p === 'upi' ? 'UPI' : 'COD'}
            </button>
          ))}
        </div>
      </div>

      {/* Result count — dynamic, correct singular/plural */}
      {!loading && (
        <p className="orders-count" role="status">
          {visibleOrders.length} {visibleOrders.length === 1 ? 'order' : 'orders'} found
        </p>
      )}

      <div className="card orders-list-card">
        {loading ? (
          <div className="loading-state">Loading orders…</div>
        ) : noOrdersAtAll ? (
          <div className="orders-empty">
            <span className="orders-empty-icon" aria-hidden="true">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" />
                <path d="M3 6h18M16 10a4 4 0 0 1-8 0" />
              </svg>
            </span>
            <h3>No orders yet</h3>
            <p>Customer orders will appear here once an order is placed.</p>
          </div>
        ) : noSearchResults ? (
          <div className="orders-empty">
            <span className="orders-empty-icon" aria-hidden="true">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="7" />
                <path d="m21 21-4.3-4.3M8.5 8.5l5 5M13.5 8.5l-5 5" />
              </svg>
            </span>
            {emptyBySearch ? (
              <>
                <h3>No orders found</h3>
                <p>Check the Order ID or mobile number and try again.</p>
                <button type="button" className="btn btn-outline btn-sm" onClick={clearAll}>
                  Clear Search
                </button>
              </>
            ) : (
              <>
                <h3>No orders match this filter</h3>
                <p>Try a different status or payment method, or clear the filter to see all orders.</p>
                <button type="button" className="btn btn-outline btn-sm" onClick={clearAll}>
                  Clear Filter
                </button>
              </>
            )}
          </div>
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
                      <th>Payment</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleOrders.map((o) => (
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
                          <td className="orders-customer">
                            <span className="orders-customer-name">{o.customer_name}</span>
                            {o.phone && <span className="orders-customer-phone">{o.phone}</span>}
                          </td>
                          <td className="orders-date">
                            <span className="orders-date-line">{formatOrderDate(o.created_at)}</span>
                            <span className="orders-time-line">{formatOrderTime(o.created_at)}</span>
                          </td>
                          <td className="orders-amount">{formatINR(o.total_amount)}</td>
                          <td className="orders-payment-cell">
                            <span className={`orders-payment-label${isUpiOrder(o) ? ' is-upi' : ''}`}>
                              {paymentShortLabel(o.payment_method)}
                            </span>
                            <span className={`orders-payment-status${canonicalPaymentStatus(o.payment_status) === 'Paid' ? ' is-paid' : ''}`}>
                              {canonicalPaymentStatus(o.payment_status)}
                            </span>
                          </td>
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
                            <td colSpan={8}>
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
                                  <div className="orders-panel-meta">
                                    <span className="orders-panel-meta-item">
                                      <span>Payment</span>
                                      <strong>{o.payment_method || 'Cash On Delivery'}</strong>
                                    </span>
                                    <span className="orders-panel-meta-item">
                                      <span>Payment Status</span>
                                      <strong className={`orders-payment-status-text${canonicalPaymentStatus(o.payment_status) === 'Paid' ? ' is-paid' : ''}`}>
                                        {canonicalPaymentStatus(o.payment_status)}
                                      </strong>
                                    </span>
                                    <span className="orders-panel-meta-item">
                                      <span>Delivery</span>
                                      <strong>{Number(o.shipping_charge) > 0 ? formatINR(o.shipping_charge) : 'To be confirmed'}</strong>
                                    </span>
                                    <span className="orders-panel-meta-item">
                                      <span>Total</span>
                                      <strong>{formatINR(o.total_amount)}</strong>
                                    </span>
                                  </div>
                                  {can('orders.update_payment') && (
                                    <div className="orders-payment-confirm">
                                      {canonicalPaymentStatus(o.payment_status) === 'Paid' ? (
                                        <button
                                          type="button"
                                          className="btn btn-outline btn-sm"
                                          onClick={() => handlePaymentStatusChange(o.id, 'Pending')}
                                          disabled={updatingPaymentId === o.id}
                                        >
                                          {updatingPaymentId === o.id ? 'Updating…' : 'Mark Pending'}
                                        </button>
                                      ) : (
                                        <button
                                          type="button"
                                          className="btn btn-outline btn-sm orders-payment-mark-paid"
                                          onClick={() => handlePaymentStatusChange(o.id, 'Paid')}
                                          disabled={updatingPaymentId === o.id}
                                        >
                                          {updatingPaymentId === o.id ? 'Updating…' : 'Mark as Paid'}
                                        </button>
                                      )}
                                    </div>
                                  )}
                                  <span className="orders-panel-placed">
                                    Order placed
                                    <strong>{formatOrderDateTime(o.created_at)}</strong>
                                  </span>
                                </footer>
                                <div className="orders-invoice-actions">
                                  <button type="button" className="btn btn-outline btn-sm" onClick={() => setInvoiceOrder(o)}>
                                    View Invoice
                                  </button>
                                  <InvoicePrintButton order={o} className="btn btn-outline btn-sm" />
                                  <InvoiceDownloadButton order={o} className="btn btn-dark btn-sm" />
                                </div>
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
              {visibleOrders.map((o) => {
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
                    {o.phone && <span className="order-card-phone">{o.phone}</span>}

                    <div className="order-card-bottom">
                      <span className="order-card-date">
                        {formatOrderDate(o.created_at)} · {formatItemsCount(o.items?.length)}
                      </span>
                      <span className="order-card-amount">{formatINR(o.total_amount)}</span>
                    </div>

                    <div className="order-card-payment">
                      <span className={`orders-payment-label${isUpiOrder(o) ? ' is-upi' : ''}`}>
                        {paymentShortLabel(o.payment_method)}
                      </span>
                      <span className={`orders-payment-status${canonicalPaymentStatus(o.payment_status) === 'Paid' ? ' is-paid' : ''}`}>
                        {canonicalPaymentStatus(o.payment_status)}
                      </span>
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

                        <section className="order-card-detail-section">
                          <h4>Payment &amp; Totals</h4>
                          <p className="orders-panel-labeled"><span>Payment</span><strong>{o.payment_method || 'Cash On Delivery'}</strong></p>
                          <p className="orders-panel-labeled"><span>Payment Status</span><strong className={`orders-payment-status-text${canonicalPaymentStatus(o.payment_status) === 'Paid' ? ' is-paid' : ''}`}>{canonicalPaymentStatus(o.payment_status)}</strong></p>
                          <p className="orders-panel-labeled"><span>Delivery</span><strong>{Number(o.shipping_charge) > 0 ? formatINR(o.shipping_charge) : 'To be confirmed'}</strong></p>
                          <p className="orders-panel-labeled"><span>Total</span><strong>{formatINR(o.total_amount)}</strong></p>
                          {can('orders.update_payment') && (
                            <div className="orders-payment-confirm">
                              {canonicalPaymentStatus(o.payment_status) === 'Paid' ? (
                                <button
                                  type="button"
                                  className="btn btn-outline btn-sm"
                                  onClick={() => handlePaymentStatusChange(o.id, 'Pending')}
                                  disabled={updatingPaymentId === o.id}
                                >
                                  {updatingPaymentId === o.id ? 'Updating…' : 'Mark Pending'}
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  className="btn btn-outline btn-sm orders-payment-mark-paid"
                                  onClick={() => handlePaymentStatusChange(o.id, 'Paid')}
                                  disabled={updatingPaymentId === o.id}
                                >
                                  {updatingPaymentId === o.id ? 'Updating…' : 'Mark as Paid'}
                                </button>
                              )}
                            </div>
                          )}
                        </section>

                        <p className="order-card-placed">
                          <span>Order placed</span>
                          <strong>{formatOrderDateTime(o.created_at)}</strong>
                        </p>

                        <section className="order-card-detail-section">
                          <h4>Status</h4>
                          <StatusSelect o={o} updatingId={updatingId} onUpdate={handleStatusChange} className="order-card-status-select" />
                        </section>

                        <div className="orders-invoice-actions">
                          <button type="button" className="btn btn-outline btn-sm" onClick={() => setInvoiceOrder(o)}>
                            View Invoice
                          </button>
                          <InvoicePrintButton order={o} className="btn btn-outline btn-sm" />
                          <InvoiceDownloadButton order={o} className="btn btn-dark btn-sm" />
                        </div>

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

      {invoiceOrder && (
        <Modal
          wide
          title={`Invoice — ${invoiceOrder.order_number}`}
          onClose={() => setInvoiceOrder(null)}
          footer={
            <div className="orders-invoice-modal-actions">
              <InvoicePrintButton order={invoiceOrder} className="btn btn-outline btn-sm" />
              <InvoiceDownloadButton order={invoiceOrder} className="btn btn-dark btn-sm" />
            </div>
          }
        >
          <OrderInvoice order={invoiceOrder} />
        </Modal>
      )}

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
