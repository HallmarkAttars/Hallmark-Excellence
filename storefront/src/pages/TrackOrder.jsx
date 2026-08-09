import { useEffect, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import {
  trackOrder,
  normalizeIndianPhone,
  normalizeOrderId,
} from '../services/mockApi'
import { InvoiceDownloadButton } from '../components/invoice/InvoiceActions'
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

// One product line inside a tracking result — unit price × qty + line total,
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

// Map a backend failure to the right customer-facing message. Never claims
// "unable to reach the server" for something that is actually a validation,
// routing or server error — each case is called out distinctly.
function toCustomerMessage(err) {
  const status = err?.status
  const code = err?.message
  if (code === 'INVALID_PHONE') return 'Enter a valid 10-digit mobile number.'
  if (code === 'INVALID_ORDER_ID') return 'Enter a valid Order ID.'
  if (code === 'INVALID_TYPE' || code === 'INVALID_REQUEST') {
    return 'Something went wrong with that request. Please try again.'
  }
  if (code === 'TRACKING_FAILED') return 'Unable to check your order right now. Please try again.'
  if (status === 401 || status === 403) {
    return 'Tracking is temporarily unavailable. Please try again later.'
  }
  if (status === 404) {
    return 'The tracking service could not be reached. Please try again later.'
  }
  if (status === 500) return 'Unable to check your order right now. Please try again.'
  return 'Unable to check your order right now. Please try again.'
}

// One order card — reused for BOTH the single Order-ID result and every card
// in a multi-order phone lookup, so mobile and desktop render identically.
function OrderResultCard({ order }) {
  const stepIndex = stepIndexFor(order.status)
  const isCancelled = (order.status || '').toLowerCase() === 'cancelled'
  const placedAt = formatPlacedAt(order.createdAt)

  return (
    <section className="track-card track-order-card" aria-label={`Order ${order.orderId}`}>
      <header className="track-card-head">
        <p className="track-order-number">Order #{order.orderId}</p>
        {placedAt && <p className="track-placed-on">Placed on {placedAt.date} • {placedAt.time}</p>}
        <span className={`track-status-pill track-status-${(order.status || '').toLowerCase()}`}>
          {order.status}
        </span>
      </header>

      {/* Cancelled — never shown as delivery progress */}
      {isCancelled ? (
        <div className="track-cancelled" role="alert">
          <h2>Order Cancelled</h2>
          <p>This order has been cancelled.</p>
        </div>
      ) : (
        <section aria-label="Order progress">
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
      <section aria-label="Order summary">
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

      {/* Invoice — only after this exact order has been resolved. Generated
          from the SAVED order snapshot returned by the tracking API. */}
      <div className="track-card-actions">
        <Link to="/view-order" state={{ order }} className="btn btn-outline">
          View Order
        </Link>
        <InvoiceDownloadButton order={order} className="btn btn-primary" />
      </div>
    </section>
  )
}

export default function TrackOrder() {
  const location = useLocation()

  // Optional prefill from the order-success screen (router state carries the
  // just-created order number). The phone is never prefilled — the customer
  // must always enter it.
  const prefillOrderId = location.state?.orderNumber || ''

  const [mode, setMode] = useState('orderId') // 'orderId' | 'phone'
  const [form, setForm] = useState({ orderId: prefillOrderId, phone: '' })
  const [fieldErrors, setFieldErrors] = useState({})
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  // Transient note for quiet refresh/poll failures while results are showing.
  const [refreshNote, setRefreshNote] = useState('')
  const [orders, setOrders] = useState([]) // array of safe tracking orders
  // The verified credentials that produced the current results — used by the
  // Refresh button and the light visibility-aware recheck, never leaked.
  const [lookup, setLookup] = useState(null) // { type, value }
  const [refreshing, setRefreshing] = useState(false)

  // --- Premium search animation (purely visual — never affects the lookup) --
  // view: 'form' (search card) → 'searching' (spinner) → 'success' (animated
  // checkmark) → 'results' (real order cards). The trackOrder() API call alone
  // decides success/failure; these states only choreograph the presentation.
  const [view, setView] = useState('form')
  const [leaving, setLeaving] = useState(false) // success panel fade-out
  const [shake, setShake] = useState(false) // subtle error shake on the card
  const [searchLabel, setSearchLabel] = useState('') // value shown while searching
  const animTimers = useRef([])

  // Presentational helpers for the search animation flow.
  const clearAnimTimers = () => {
    animTimers.current.forEach((t) => window.clearTimeout(t))
    animTimers.current = []
  }
  const resetSearchFlow = () => {
    clearAnimTimers()
    setLeaving(false)
    setShake(false)
    setView('form')
  }

  // Clear any in-flight animation timers when the page unmounts.
  useEffect(() => () => clearAnimTimers(), [])

  const clearFieldError = (name) => setFieldErrors((fe) => ({ ...fe, [name]: '' }))

  const handleOrderIdChange = (e) => {
    setForm((f) => ({ ...f, orderId: e.target.value.replace(/^#/, '').trim() }))
    clearFieldError('orderId')
  }

  const handlePhoneChange = (e) => {
    setForm((f) => ({ ...f, phone: e.target.value.replace(/\D/g, '').slice(0, 10) }))
    clearFieldError('phone')
  }

  const switchMode = (next) => {
    if (next === mode) return
    resetSearchFlow()
    setMode(next)
    setFieldErrors({})
    setError('')
    setRefreshNote('')
    setOrders([])
    setLookup(null)
  }

  // Runs a verification. Returns 'ok' | 'empty' | 'error'.
  //   mode 'submit'  → user-initiated: shows errors in the form
  //   mode 'refresh' → manual Refresh button / quiet poll: keeps the last
  //                    known results on transient errors, drops back to the
  //                    form only when the backend definitively says the
  //                    order(s) no longer exist
  const runLookup = async ({ type, value }, { mode: submitMode = 'submit' } = {}) => {
    if (submitMode === 'submit') setSubmitting(true)
    setRefreshNote('')
    try {
      const results = await trackOrder({ type, value })
      if (submitMode !== 'submit' && results.length === 0) {
        // The tracked order(s) no longer exist — stop showing stale data.
        setOrders([])
        setLookup(null)
        setError('This order is no longer available.')
        return 'empty'
      }
      setOrders(results)
      setError('')
      return results.length > 0 ? 'ok' : 'empty'
    } catch (err) {
      // Log the REAL error in development so the exact failure can be
      // diagnosed; customers only ever see the mapped message.
      console.error('[trackOrder] error:', err)
      setError(toCustomerMessage(err))
      if (submitMode !== 'submit') {
        // Transient failure — keep the last known status, just say so.
        setRefreshNote('Could not refresh status. Showing the last known status.')
      }
      return 'error'
    } finally {
      if (submitMode === 'submit') setSubmitting(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setRefreshNote('')
    const errs = {}
    if (mode === 'orderId') {
      if (!normalizeOrderId(form.orderId)) errs.orderId = 'Enter your Order ID.'
    } else {
      if (!normalizeIndianPhone(form.phone)) errs.phone = 'Enter a valid 10-digit mobile number.'
    }
    if (Object.keys(errs).length > 0) {
      setFieldErrors(errs)
      setOrders([])
      setLookup(null)
      return
    }

    const type = mode
    const value =
      type === 'phone' ? normalizeIndianPhone(form.phone) : normalizeOrderId(form.orderId)

    // --- Premium search animation (purely visual — the API decides) -------
    // Show the entered value inside the searching panel, then swap in the
    // animated checkmark ONLY after the backend confirms the order exists.
    setSearchLabel(
      type === 'phone' ? `+91 ${value.slice(0, 5)} ${value.slice(5)}` : value
    )
    clearAnimTimers()
    setLeaving(false)
    setShake(false)
    setView('searching')

    const outcome = await runLookup({ type, value }, { mode: 'submit' })
    // Remember the verified credentials only when orders were found, so the
    // recheck/refresh always targets the exact lookup on screen.
    if (outcome === 'ok') {
      setLookup({ type, value })
      // Checkmark draws (~0.9s), panel fades, then the real results appear.
      setView('success')
      animTimers.current.push(window.setTimeout(() => setLeaving(true), 900))
      animTimers.current.push(
        window.setTimeout(() => {
          setLeaving(false)
          setView('results')
        }, 1180)
      )
    } else {
      setLookup(null)
      if (outcome === 'empty') {
        setError(
          type === 'phone'
            ? 'No orders were found for this mobile number.'
            : "We couldn't find an order with this Order ID."
        )
      }
      // Back to the form with a subtle shake + error icon — never a checkmark.
      setView('form')
      setShake(true)
      animTimers.current.push(window.setTimeout(() => setShake(false), 650))
    }
  }

  // Controlled recheck while results are displayed: re-verify ONLY the last
  // successful lookup, only while the tab is visible, on a slow interval + on
  // tab-return. Never touches the orders table broadly and stops the moment
  // the user navigates away or starts a new lookup.
  useEffect(() => {
    if (!lookup) return undefined
    const check = () => {
      if (document.visibilityState === 'hidden') return
      runLookup(lookup, { mode: 'poll' })
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
    await runLookup(lookup, { mode: 'refresh' })
    setRefreshing(false)
  }

  // Back to the search form — needed because same-route navigation (footer
  // "Track Order" link while already on /track-order) does not remount this
  // page, so without this button the results would be stuck on screen.
  const handleNewSearch = () => {
    resetSearchFlow()
    setOrders([])
    setLookup(null)
    setError('')
    setRefreshNote('')
    setFieldErrors({})
  }

  return (
    <div>
      <div className="page-heading">
        <p className="eyebrow">{TRACK_ORDER_PAGE.eyebrow}</p>
        <h1>{TRACK_ORDER_PAGE.title}</h1>
        <p>{TRACK_ORDER_PAGE.subtitle}</p>
      </div>

      <div className="track-layout">
        {/* SEARCHING — the entered value fades into a circular progress ring.
            Only the real trackOrder() API call can move past this state. */}
        {view === 'searching' && (
          <div className="track-anim-panel" role="status" aria-live="polite">
            <div className="track-searching-value" aria-hidden="true">{searchLabel}</div>
            <div className="track-spinner-wrap" aria-hidden="true">
              <span className="track-spinner" />
            </div>
            <p className="track-anim-title">Searching…</p>
            <p className="track-anim-sub">Checking the details you entered</p>
          </div>
        )}

        {/* SUCCESS — animated checkmark. Rendered ONLY after the backend
            confirmed the order(s) exist; never before. */}
        {view === 'success' && (
          <div
            className={`track-anim-panel track-success-panel${leaving ? ' is-leaving' : ''}`}
            role="status"
            aria-live="polite"
          >
            <div className="track-anim-badge" aria-hidden="true">
              <svg viewBox="0 0 52 52">
                <circle className="track-anim-circle" cx="26" cy="26" r="24" />
                <path className="track-anim-check" d="M15 27.5l7.5 7.5L37 19.5" />
              </svg>
            </div>
            <p className="track-anim-title">
              {orders.length === 1 ? 'Order Found' : 'Orders Found'}
            </p>
            <p className="track-anim-sub">
              Loading your {orders.length === 1 ? 'order' : 'orders'}…
            </p>
          </div>
        )}

        {/* FORM or RESULTS — normal document flow once the animation settles */}
        {view !== 'searching' && view !== 'success' &&
          (orders.length > 0 ? (
            <div className="track-result" aria-live="polite">
              {/* Verified header */}
              <div className="track-found-head">
                <span className="track-found-check">
                  <CheckIcon />
                </span>
                <h2>{orders.length === 1 ? 'Order Found' : `${orders.length} Orders Found`}</h2>
                {lookup && lookup.type === 'phone' && (
                  <p className="track-placed-on">Orders for +91 {lookup.value}</p>
                )}
              </div>

              {/* Cards reveal one by one (staggered) — fast, never slow */}
              {orders.map((order, i) => (
                <div
                  className="track-result-item"
                  style={{ animationDelay: `${Math.min(i * 0.12, 0.6)}s` }}
                  key={order.orderId}
                >
                  <OrderResultCard order={order} />
                </div>
              ))}

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
          ) : (
            <div className={`track-card${shake ? ' track-shake' : ''}`}>
              {/* ONE form, two lookup methods — both call the same trackOrder() */}
              <div className="track-tabs" role="tablist" aria-label="How would you like to track your order?">
                <button
                  type="button"
                  role="tab"
                  aria-selected={mode === 'orderId'}
                  className={`track-tab${mode === 'orderId' ? ' is-active' : ''}`}
                  onClick={() => switchMode('orderId')}
                >
                  Order ID
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={mode === 'phone'}
                  className={`track-tab${mode === 'phone' ? ' is-active' : ''}`}
                  onClick={() => switchMode('phone')}
                >
                  Mobile Number
                </button>
              </div>

              <form className="track-form" onSubmit={handleSubmit} noValidate>
                {mode === 'orderId' ? (
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
                    <p className="field-hint">
                      Enter the Order ID from your confirmation email or receipt.
                    </p>
                  </div>
                ) : (
                  <div className="form-field">
                    <label htmlFor="track-phone">
                      Mobile Number <span className="required-star">*</span>
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
                      We'll show every order placed with this number.
                    </p>
                  </div>
                )}

                {error && (
                  <p className="track-error" role="alert">
                    <span className="track-error-icon" aria-hidden="true">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                        <circle cx="12" cy="12" r="9" />
                        <path d="m9 9 6 6M15 9l-6 6" />
                      </svg>
                    </span>
                    {error}
                  </p>
                )}

                <button className="btn btn-primary track-submit" type="submit" disabled={submitting}>
                  {submitting ? 'Finding orders…' : 'Find Orders'}
                </button>
              </form>
            </div>
          ))}
      </div>
    </div>
  )
}
