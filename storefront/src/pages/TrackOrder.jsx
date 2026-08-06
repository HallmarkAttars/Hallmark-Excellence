import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { trackOrder } from '../services/mockApi'
import { TRACK_ORDER_PAGE } from '../data/content'
import './TrackOrder.css'

// Canonical admin workflow — the tracker only ever reflects the EXISTING
// stored order_status. "Pending" is shown to customers as "Order Placed".
const STATUS_STEPS = ['Order Placed', 'Processing', 'Shipped', 'Delivered']

// Map the stored status to a step index: Pending → 0, Processing → 1,
// Shipped → 2, Delivered → 3. Returns -1 for un-trackable statuses
// (Cancelled / Returned / unknown) — those render a distinct notice instead
// of a misleading progress bar.
function stepIndexFor(status) {
  switch ((status || '').toLowerCase()) {
    case 'pending': return 0
    case 'processing': return 1
    case 'shipped': return 2
    case 'delivered': return 3
    default: return -1
  }
}

// Format the STORED Supabase created_at in Asia/Kolkata — the same single
// timestamp used by the order confirmation and Admin Orders. Never generates
// its own time. Returns null when no real timestamp exists.
function formatPlacedAt(value) {
  if (!value) return null
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return null
  const date = new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(d)
  const time = new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
    .format(d)
    .replace(/\bam\b/i, 'AM')
    .replace(/\bpm\b/i, 'PM')
  return { date, time }
}

function itemImage(item) {
  if (item.image) return item.image
  if (item.imageUrl) return item.imageUrl
  if (item.image_url) return item.image_url
  if (Array.isArray(item.images) && item.images.length > 0) return item.images[0]
  return null
}

function CheckIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m5 12.5 4.5 4.5L19 7.5" />
    </svg>
  )
}

// One product line inside the tracking result — unit price × qty + line total,
// reusing the same values the checkout stores (never a new pricing system).
function TrackItem({ item }) {
  const unitPrice = Number.isFinite(Number(item.unit_price)) ? Number(item.unit_price) : 0
  const quantity = Number.isFinite(Number(item.quantity)) && Number(item.quantity) > 0 ? Number(item.quantity) : 1
  const lineTotal = unitPrice * quantity
  const label =
    item.variant_label ||
    (item.quantity_value != null && item.quantity_unit
      ? `${item.quantity_value} ${item.quantity_unit}`
      : '')
  const image = itemImage(item)

  return (
    <div className="track-item">
      {image ? (
        <img src={image} alt={item.product_name} className="track-item-img" loading="lazy" />
      ) : (
        <span className="track-item-img track-item-img--placeholder" aria-hidden="true">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 3 4 7v10l8 4 8-4V7l-8-4Z" />
            <path d="M4 7l8 4 8-4M12 11v10" />
          </svg>
        </span>
      )}
      <div className="track-item-info">
        <span className="track-item-name">{item.product_name}</span>
        {label && <span className="track-item-variant">{label}</span>}
        <span className="track-item-qty">₹{unitPrice.toLocaleString('en-IN')} × {quantity}</span>
      </div>
      <span className="track-item-price" aria-label={`Line total ₹${lineTotal.toLocaleString('en-IN')}`}>
        ₹{lineTotal.toLocaleString('en-IN')}
      </span>
    </div>
  )
}

export default function TrackOrder() {
  const location = useLocation()

  // Optional prefill from the order-success screen (router state carries the
  // just-created order number). The phone is never prefilled — the customer
  // must always verify it.
  const prefillOrderId = location.state?.orderNumber || ''

  const [form, setForm] = useState({ orderId: prefillOrderId, phone: '' })
  const [fieldErrors, setFieldErrors] = useState({})
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  // Transient note for quiet refresh/poll failures while a result is showing.
  const [refreshNote, setRefreshNote] = useState('')
  const [result, setResult] = useState(null) // { order }
  // The verified credentials that produced the current result — used by the
  // Refresh button and the light visibility-aware recheck, never leaked.
  const [lookup, setLookup] = useState(null) // { orderId, phone }
  const [refreshing, setRefreshing] = useState(false)

  const phoneValid = /^\d{10}$/.test(form.phone)

  const clearFieldError = (name) => setFieldErrors((fe) => ({ ...fe, [name]: '' }))

  const handleOrderIdChange = (e) => {
    setForm((f) => ({ ...f, orderId: e.target.value.replace(/^#/, '').trim() }))
    clearFieldError('orderId')
  }

  const handlePhoneChange = (e) => {
    setForm((f) => ({ ...f, phone: e.target.value.replace(/\D/g, '').slice(0, 10) }))
    clearFieldError('phone')
  }

  // Runs a verification. Returns 'ok' | 'not-found' | 'error'.
  //   mode 'submit'  → user-initiated: shows errors in the form
  //   mode 'refresh' → manual Refresh button / quiet poll: keeps the last known
  //                    result on transient errors, drops back to the form only
  //                    when the backend definitively says the order is gone
  const runLookup = async (orderId, phone, { mode = 'submit' } = {}) => {
    if (mode === 'submit') setSubmitting(true)
    setRefreshNote('')
    try {
      const order = await trackOrder(orderId, phone)
      setResult({ order })
      setError('')
      return 'ok'
    } catch (err) {
      const msg = err?.message || ''
      const notFound = msg.startsWith('Order not found')
      if (mode === 'submit' || notFound) {
        setError(notFound ? msg : 'Unable to check your order. Please try again.')
      }
      if (mode !== 'submit') {
        if (notFound) {
          // The order no longer exists — stop showing stale progress.
          setResult(null)
          setLookup(null)
        } else {
          // Transient failure — keep the last known status, just say so.
          setRefreshNote('Could not refresh status. Showing the last known status.')
        }
      }
      return notFound ? 'not-found' : 'error'
    } finally {
      if (mode === 'submit') setSubmitting(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setRefreshNote('')
    const errs = {}
    if (!form.orderId) errs.orderId = 'Enter your Order ID.'
    if (!phoneValid) errs.phone = 'Enter a valid 10-digit mobile number.'
    if (Object.keys(errs).length > 0) {
      setFieldErrors(errs)
      setResult(null)
      setLookup(null)
      return
    }
    const outcome = await runLookup(form.orderId, form.phone, { mode: 'submit' })
    // Remember the verified credentials only when the lookup succeeded, so the
    // recheck/refresh always targets the exact order on screen.
    if (outcome === 'ok') setLookup({ orderId: form.orderId, phone: form.phone })
    else setLookup(null)
  }

  // Controlled recheck while a tracking result is displayed: re-verify ONLY
  // the single verified order, only while the tab is visible, on a slow
  // interval + on tab-return. Never touches the orders table broadly and
  // stops the moment the user navigates away or starts a new lookup.
  useEffect(() => {
    if (!lookup) return undefined
    const check = () => {
      if (document.visibilityState === 'hidden') return
      runLookup(lookup.orderId, lookup.phone, { mode: 'poll' })
    }
    const timer = window.setInterval(check, 20000)
    const onVisible = () => {
      if (document.visibilityState === 'visible') check()
    }
    window.addEventListener('visibilitychange', onVisible)
    return () => {
      window.clearInterval(timer)
      window.removeEventListener('visibilitychange', onVisible)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lookup])

  const handleRefresh = async () => {
    if (!lookup || refreshing) return
    setRefreshing(true)
    setError('')
    setRefreshNote('')
    await runLookup(lookup.orderId, lookup.phone, { mode: 'refresh' })
    setRefreshing(false)
  }

  // Back to the search form — needed because same-route navigation (footer
  // "Track Order" link while already on /track-order) does not remount this
  // page, so without this button the result would be stuck on screen.
  const handleNewSearch = () => {
    setResult(null)
    setLookup(null)
    setError('')
    setRefreshNote('')
    setFieldErrors({})
  }

  const order = result?.order
  const stepIndex = order ? stepIndexFor(order.status) : -1
  const isCancelled = (order?.status || '').toLowerCase() === 'cancelled'
  const placedAt = order ? formatPlacedAt(order.created_at) : null

  return (
    <div>
      <div className="page-heading">
        <p className="eyebrow">{TRACK_ORDER_PAGE.eyebrow}</p>
        <h1>{TRACK_ORDER_PAGE.title}</h1>
        <p>{TRACK_ORDER_PAGE.subtitle}</p>
      </div>

      <div className="track-layout">
        {!order ? (
          <div className="track-card">
            <form className="track-form" onSubmit={handleSubmit} noValidate>
              <div className="form-field">
                <label htmlFor="track-order-id">
                  Order ID <span className="required-star">*</span>
                </label>
                <input
                  id="track-order-id"
                  name="orderId"
                  type="text"
                  placeholder="ORD-571848"
                  autoComplete="off"
                  value={form.orderId}
                  onChange={handleOrderIdChange}
                  required
                />
                {fieldErrors.orderId && (
                  <p className="field-hint field-hint--error">{fieldErrors.orderId}</p>
                )}
              </div>

              <div className="form-field">
                <label htmlFor="track-phone">
                  Phone Number <span className="required-star">*</span>
                </label>
                <div className="track-phone-row">
                  <span className="track-phone-prefix" aria-hidden="true">+91</span>
                  <input
                    id="track-phone"
                    name="phone"
                    type="tel"
                    inputMode="numeric"
                    maxLength={10}
                    autoComplete="tel-national"
                    pattern="[0-9]{10}"
                    placeholder="9876543210"
                    className="track-phone-input"
                    value={form.phone}
                    onChange={handlePhoneChange}
                    required
                  />
                </div>
                {fieldErrors.phone && (
                  <p className="field-hint field-hint--error">{fieldErrors.phone}</p>
                )}
                <p className="field-hint">
                  We use both your Order ID and phone number to keep your details private.
                </p>
              </div>

              {error && <p className="track-error" role="alert">{error}</p>}

              <button className="btn btn-primary track-submit" type="submit" disabled={submitting}>
                {submitting ? 'Checking your order…' : 'Track Order'}
              </button>
            </form>
          </div>
        ) : (
          <div className="track-result" aria-live="polite">
            {/* Verified header */}
            <div className="track-found-head">
              <span className="track-found-check">
                <CheckIcon />
              </span>
              <h2>Order Found</h2>
              <p className="track-order-number">Order #{order.order_number}</p>
              {placedAt && (
                <p className="track-placed-on">Placed on {placedAt.date} • {placedAt.time}</p>
              )}
              <p className="track-current-label">Current Status</p>
              <span className={`track-status-pill track-status-${(order.status || '').toLowerCase()}`}>
                {order.status}
              </span>
            </div>

            {/* Cancelled — never shown as delivery progress */}
            {isCancelled ? (
              <div className="track-cancelled" role="alert">
                <h2>Order Cancelled</h2>
                <p>This order has been cancelled.</p>
              </div>
            ) : (
              <section className="track-card" aria-label="Order progress">
                <h3 className="track-card-title">Order Progress</h3>
                <div className={`track-steps ${stepIndex < 0 ? 'is-unmapped' : ''}`}>
                  {STATUS_STEPS.map((label, i) => {
                    const state =
                      stepIndex < 0 ? 'upcoming' : i < stepIndex ? 'done' : i === stepIndex ? 'current' : 'upcoming'
                    return (
                      <div className={`track-step is-${state}`} key={label}>
                        <span className="track-step-icon" aria-hidden="true">
                          {state === 'done' ? <CheckIcon /> : null}
                        </span>
                        <span className="track-step-label">{label}</span>
                      </div>
                    )
                  })}
                </div>
                {stepIndex < 0 && (
                  <p className="track-note">We will keep you updated on this order.</p>
                )}
              </section>
            )}

            {/* Order summary */}
            <section className="track-card" aria-label="Order summary">
              <h3 className="track-card-title">Order Summary</h3>
              {order.items && order.items.length > 0 ? (
                order.items.map((item, i) => (
                  <TrackItem key={`${item.product_name}-${i}`} item={item} />
                ))
              ) : (
                <p className="track-note">No items available for this order.</p>
              )}
              <div className="track-row">
                <span>Payment Method</span>
                <span>{order.payment_method || 'Cash On Delivery'}</span>
              </div>
              <div className="track-row track-total">
                <span>Total</span>
                <span>₹{Number(order.total || 0).toLocaleString('en-IN')}</span>
              </div>
            </section>

            <div className="track-actions">
              {refreshNote && <p className="track-note" role="status">{refreshNote}</p>}
              <button
                className="btn btn-outline"
                type="button"
                onClick={handleRefresh}
                disabled={refreshing || !lookup}
              >
                {refreshing ? 'Checking…' : 'Refresh Status'}
              </button>
              <button className="btn btn-outline" type="button" onClick={handleNewSearch}>
                Search Another Order
              </button>
              <Link to="/shop" className="btn btn-gold">Continue Shopping</Link>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
