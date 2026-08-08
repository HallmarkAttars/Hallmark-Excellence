import { useEffect, useRef, useState } from 'react'
import { Navigate, useLocation, Link } from 'react-router-dom'
import { api } from '../services/api'
import { submitContactMessage, submitOrder } from '../services/mockApi'
import { InvoiceDownloadButton } from '../components/invoice/InvoiceActions'
import { useCart } from '../context/CartContext'
import {
  applicableUnitPrice,
  isBulkApplicable,
  isBulkUnlocked,
  bulkSavings,
} from '../utils/bulk'
import { BUSINESS, CONTACT } from '../data/content'
import './Contact.css'

// Format the order's STORED Supabase timestamp for the customer, in
// Asia/Kolkata. The database created_at is the single source of truth — we
// never use new Date() as an authoritative order time. Returns null when no
// real timestamp exists so nothing fake is ever shown.
function formatOrderPlacedAt(value) {
  if (!value) return null
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return null
  const date = new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(d)
  // Normalize the meridiem to uppercase (en-IN engines vary: am/pm vs AM/PM).
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

// Resolve the primary image from the cart snapshot. Cart items store
// `image` (from the product), but we also accept the common alternate field
// names and the first entry of an `images` array — all without any extra
// database reads.
function itemImage(item) {
  if (item.image) return item.image
  if (item.imageUrl) return item.imageUrl
  if (item.productImage) return item.productImage
  if (item.image_url) return item.image_url
  if (Array.isArray(item.images) && item.images.length > 0) return item.images[0]
  return null
}

// Single shared order-summary line used on both the checkout page and the
// order-success page. Image comes from the cart snapshot (no extra reads);
// a neutral placeholder is shown only when no image exists.
function OrderSummaryItem({ item }) {
  // Reuse the exact values the cart/checkout already compute — never a new
  // pricing system. The applicable unit price (bulk once unlocked) × quantity
  // = line total — identical to the cart and to the server-side order math.
  const rawQty = item.quantity ?? item.qty
  const unitPrice = applicableUnitPrice(item)
  const quantity = Number.isFinite(Number(rawQty)) ? Number(rawQty) : 1
  const lineTotal = unitPrice * quantity
  const bulkApplicable = isBulkApplicable(item)
  const bulkUnlocked = isBulkUnlocked(item)
  const savedAmount = bulkSavings(item)
  // Don't advertise an unlock path when the available stock can't physically
  // reach the bulk threshold (e.g. stock 50 vs bulk quantity 100).
  const itemStock = item.stock != null ? Number(item.stock) : null
  const stockCanReachBulk =
    !bulkApplicable ||
    itemStock == null ||
    itemStock >= Number(item.bulk_min_qty)
  const label =
    item.variant_label ||
    (item.quantity_value != null && item.quantity_unit
      ? `${item.quantity_value} ${item.quantity_unit}`
      : '')
  const image = itemImage(item)

  return (
    <div className="order-summary-item">
      {image ? (
        <img
          src={image}
          alt={item.name}
          className="order-summary-item-img"
          loading="lazy"
        />
      ) : (
        <span className="order-summary-item-img order-summary-item-img--placeholder" aria-hidden="true">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 3 4 7v10l8 4 8-4V7l-8-4Z" />
            <path d="M4 7l8 4 8-4M12 11v10" />
          </svg>
        </span>
      )}
      <div className="order-summary-item-info">
        <span className="order-summary-name">{item.name}</span>
        {label && <span className="order-summary-variant">{label}</span>}
        <span className="order-summary-qty">
          ₹{unitPrice.toLocaleString('en-IN')} × {quantity}
        </span>
        {bulkUnlocked && savedAmount > 0 && (
          <span className="order-summary-bulk-note">✓ Bulk Price Applied · You Saved ₹{savedAmount.toLocaleString('en-IN')}</span>
        )}
        {bulkApplicable && stockCanReachBulk && !bulkUnlocked && (
          <span className="order-summary-bulk-chip">🔥 Bulk Price at {item.bulk_min_qty}+ pcs</span>
        )}
      </div>
      {/* Right side = LINE TOTAL (unit price × quantity), never the unit price */}
      <span
        className="order-summary-price"
        aria-label={`Line total ₹${lineTotal.toLocaleString('en-IN')}`}
      >
        ₹{lineTotal.toLocaleString('en-IN')}
      </span>
    </div>
  )
}

function CheckIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m5 12.5 4.5 4.5L19 7.5" />
    </svg>
  )
}

export default function Contact() {
  const location = useLocation()
  const { clearCart } = useCart()

  // Checkout lives on its own route (/checkout) so the navbar never highlights
  // "Contact" and the URL stays clean. The cart snapshot travels via router state.
  const checkout = location.state?.checkoutItems ? location.state : null
  const isCheckout = location.pathname === '/checkout'

  const [form, setForm] = useState({ name: '', email: '', phone: '', address: '', pincode: '', message: '' })
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState(null) // { orderNumber, order } | { sent: true }
  const [error, setError] = useState('')
  const [phoneTouched, setPhoneTouched] = useState(false)
  const [fieldErrors, setFieldErrors] = useState({}) // per-field messages shown next to each input
  // PIN-code lookup state: idle | loading | found | error
  const [pinInfo, setPinInfo] = useState({ status: 'idle', localities: [], city: '', state: '', locality: '', error: '', pinNotFound: false })
  const pinCache = useRef(new Map()) // session-only lookup cache
  const pinTimer = useRef(null)
  const currentPin = useRef('') // guards against stale async responses
  // One idempotency key per checkout session. Duplicate submissions (double
  // click, network retry, browser retry) are collapsed by the backend into the
  // same order — no duplicate order, no duplicate confirmation emails.
  const idempotencyKeyRef = useRef(null)
  if (isCheckout && !idempotencyKeyRef.current) {
    idempotencyKeyRef.current =
      typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `ck-${Date.now()}-${Math.random().toString(36).slice(2)}`
  }

  // Indian mobile numbers only: exactly 10 digits. The +91 prefix is rendered
  // in the UI and prepended on submit — the user never types it.
  const phoneValid = /^\d{10}$/.test(form.phone)
  // Live feedback once the user interacts, plus the message set on submit.
  const showPhoneError = Boolean(fieldErrors.phone) || (phoneTouched && form.phone && !phoneValid)

  // Order placed successfully (checkout only). Inline state — refreshing the
  // page can never create a duplicate order because the submit handler is the
  // only place an order is created.
  const orderPlaced = isCheckout && Boolean(result?.orderNumber)

  const clearFieldError = (name) => setFieldErrors((fe) => ({ ...fe, [name]: '' }))

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm((f) => ({ ...f, [name]: value }))
    clearFieldError(name)
  }

  // Fixed Indian format: digits only, capped at 10, never a leading "+".
  const handlePhoneChange = (e) => {
    setPhoneTouched(true)
    setForm((f) => ({ ...f, phone: e.target.value.replace(/\D/g, '').slice(0, 10) }))
    clearFieldError('phone')
  }

  const applyPinResult = (result) => {
    if (result.status !== 'found' || !result.localities.length) {
      setPinInfo({ status: 'error', localities: [], city: '', state: '', locality: '', error: 'Enter a valid 6-digit PIN code.', pinNotFound: true })
      return
    }
    setPinInfo({
      status: 'found',
      localities: result.localities,
      city: result.city,
      state: result.state,
      locality: result.localities.length === 1 ? result.localities[0].name : '',
      error: '',
      pinNotFound: false,
    })
  }

  const lookupPincode = (pin) => {
    if (pinCache.current.has(pin)) {
      applyPinResult(pinCache.current.get(pin))
      return
    }
    setPinInfo({ status: 'loading', localities: [], city: '', state: '', locality: '', error: '', pinNotFound: false })
    // Same origin-safe api helper as every other storefront call.
    api.get(`/api/pincode/${pin}`)
      .then((data) => {
        // Ignore stale responses if the user has since changed the PIN.
        if (currentPin.current !== pin) return
        const result = {
          status: data.status,
          localities: Array.isArray(data.localities) ? data.localities : [],
          city: data.city || '',
          state: data.state || '',
        }
        pinCache.current.set(pin, result)
        applyPinResult(result)
      })
      .catch(() => {
        if (currentPin.current !== pin) return
        setPinInfo({ status: 'error', localities: [], city: '', state: '', locality: '', error: 'Unable to verify this PIN code. Please try again.', pinNotFound: false })
      })
  }

  // Lookup only fires once exactly 6 digits exist, debounced slightly.
  const handlePincodeChange = (e) => {
    const digits = e.target.value.replace(/\D/g, '').slice(0, 6)
    currentPin.current = digits
    setForm((f) => ({ ...f, pincode: digits }))
    clearFieldError('pincode')
    setPinInfo({ status: 'idle', localities: [], city: '', state: '', locality: '', error: '', pinNotFound: false })
    window.clearTimeout(pinTimer.current)
    if (digits.length === 6) {
      pinTimer.current = window.setTimeout(() => lookupPincode(digits), 350)
    }
  }

  const handleLocalityChange = (e) => setPinInfo((p) => ({ ...p, locality: e.target.value }))

  useEffect(() => () => window.clearTimeout(pinTimer.current), [])

  // /checkout requires the cart snapshot carried in router state. A direct
  // visit (or a refresh after the order cleared the cart) safely falls back
  // to the cart page instead of rendering a broken checkout.
  if (isCheckout && !checkout) {
    return <Navigate to="/cart" replace />
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (isCheckout) {
      // Per-field validation — each message renders next to its own input.
      const errs = {}
      if (!form.name.trim()) errs.name = 'Name is required.'
      if (!form.email.trim()) {
        errs.email = 'Email is required.'
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
        errs.email = 'Enter a valid email address.'
      }
      if (!phoneValid) errs.phone = 'Enter a valid 10-digit mobile number.'
      if (!form.address.trim()) errs.address = 'Address is required.'
      if (!/^\d{6}$/.test(form.pincode)) errs.pincode = 'Enter a valid 6-digit PIN code.'
      if (Object.keys(errs).length > 0) {
        setFieldErrors(errs)
        setError('')
        return
      }
      // Block submitting a PIN the postal lookup confirmed does not exist.
      // (Network failures do not hard-block ordering.)
      if (pinInfo.status === 'error' && pinInfo.pinNotFound) {
        setError(pinInfo.error)
        return
      }
    } else {
      if (!form.name || !form.email || !form.message) {
        setError('Please fill in all required fields.')
        return
      }
    }

    setSubmitting(true)
    try {
      if (isCheckout) {
        // Build a complete snapshot of every item so orders remain
        // historically accurate even if the product/variant is edited later.
        const items = checkout.checkoutItems.map((item) => {
          // Send the APPLIED unit price (bulk once unlocked) so the snapshot
          // mirrors what the customer is charged — the server still recomputes
          // everything authoritatively from the database.
          const unit_price = applicableUnitPrice(item)
          const quantity = Number(item.quantity ?? item.qty ?? 1)
          const hasVariant = item.variant_id != null
          return {
            product_id: item.product_id ?? item.id,
            product_name: item.name,
            image: item.image,
            quantity,
            unit_price,
            subtotal: unit_price * quantity,
            ...(hasVariant
              ? {
                  variant_id: item.variant_id,
                  variant_label: item.variant_label,
                  quantity_value: item.quantity_value,
                  quantity_unit: item.quantity_unit,
                }
              : {}),
          }
        })

        const payload = {
          name: form.name,
          email: form.email.trim(),
          // Full Indian number in E.164 form (e.g. +919876543210) — the same
          // phone format the order system already expects.
          phone: `+91${form.phone}`,
          address: form.address,
          pincode: form.pincode,
          // Location details discovered from the PIN lookup (optional extras).
          ...(pinInfo.status === 'found'
            ? { locality: pinInfo.locality, city: pinInfo.city, state: pinInfo.state }
            : {}),
          message: form.message,
          items,
          total: checkout.total,
          idempotencyKey: idempotencyKeyRef.current,
        }
        const res = await submitOrder(payload)
        // Clear the cart ONLY after the order was created successfully.
        clearCart()
        setResult({ orderNumber: res.orderNumber, order: res.order })
      } else {
        await submitContactMessage(form)
        setResult({ sent: true })
        setForm({ name: '', email: '', phone: '', address: '', pincode: '', message: '' })
      }
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  // --- Order Success view -------------------------------------------------
  if (orderPlaced) {
    const order = result.order
    const items = checkout.checkoutItems
    const orderTotal = order?.total != null ? Number(order.total) : Number(checkout.total)
    const paymentMethod = order?.payment_method || 'Cash On Delivery'
    const orderStatus = order?.order_status || 'Pending'
    const orderNumber = result.orderNumber
    // Real Supabase creation timestamp from the persisted order row.
    const placedAt = formatOrderPlacedAt(order?.created_at)

    return (
      <div className="order-success-wrapper">
        <div className="order-success-card">
          <div className="order-success-head">
            <span className="order-success-check success-check">
              <CheckIcon />
            </span>
            <h1 className="success-fade success-fade-1">Order Placed Successfully</h1>
            <p className="order-success-id success-fade success-fade-2">
              Order ID: <strong>#{orderNumber}</strong>
            </p>
            {placedAt && (
              <p className="order-success-placed success-fade success-fade-3">
                Placed on {placedAt.date} • {placedAt.time}
              </p>
            )}
            <p className="order-success-sub success-fade">
              Thank you for your order. We have received your order successfully.
            </p>
          </div>

          <section className="order-success-section order-info" aria-label="Important information">
            <h2>Important Information</h2>
            <ul>
              <li>All rates are inclusive of GST.</li>
              <li>Transport / delivery charges are extra where applicable.</li>
              <li>We will contact you regarding transport or delivery charges once your order is ready for dispatch.</li>
              <li>
                Please save our contact number:{' '}
                <a href={`tel:${BUSINESS.phoneTel}`}>{BUSINESS.phoneDisplay}</a>
              </li>
            </ul>
          </section>

          <section id="order-summary" className="order-success-section order-success-summary success-fade success-fade-2" aria-label="Order summary">
            <h2>Order Summary</h2>
            {items.map((item, i) => (
              <OrderSummaryItem
                key={`${item.product_id ?? item.id}-${item.variant_id ?? ''}-${i}`}
                item={item}
              />
            ))}
            <div className="order-success-row">
              <span>Subtotal</span>
              <span>₹{orderTotal.toLocaleString('en-IN')}</span>
            </div>
            <div className="order-success-row">
              <span>Delivery / Transport</span>
              <span>To be confirmed</span>
            </div>
            <div className="order-success-row order-success-total">
              <span>Total</span>
              <span>₹{orderTotal.toLocaleString('en-IN')}</span>
            </div>
            <div className="order-success-row">
              <span>Payment Method</span>
              <span>{paymentMethod}</span>
            </div>
            <div className="order-success-row">
              <span>Order Status</span>
              <span className="order-status-pill">{orderStatus}</span>
            </div>
          </section>

          <div className="order-success-actions">
            {/* Track the just-created order — prefill carries the real Order ID
                via router state; the phone is never prefilled. */}
            <Link to="/track-order" state={{ orderNumber }} className="btn btn-gold">
              Track Order
            </Link>
            {/* View Order opens the saved order + invoice (state carries the
                full persisted row — never the cart). */}
            <Link to="/view-order" state={{ order: result.order, orderNumber }} className="btn btn-outline">
              View Order
            </Link>
            {/* Invoice is generated from the SAVED order record (result.order),
                never from the cart or live product prices. */}
            <InvoiceDownloadButton order={result.order} className="btn btn-primary" />
            <Link to="/shop" className="btn btn-outline order-success-continue">
              Continue Shopping
            </Link>
          </div>
        </div>
      </div>
    )
  }

  // --- Contact / Checkout view -------------------------------------------
  return (
    <div>
      <div className={`page-heading ${isCheckout ? 'page-heading--checkout' : ''}`}>
        <p className="eyebrow">{isCheckout ? CONTACT.checkout.eyebrow : CONTACT.eyebrow}</p>
        <h1>{isCheckout ? CONTACT.checkout.title : CONTACT.title}</h1>
      </div>

      <div className={`container contact-layout ${isCheckout ? 'contact-layout--checkout' : ''}`}>
        <div className="contact-form-col">
          {result?.sent && (
            <div className="contact-toast">
              <strong>Message sent</strong>
              <p>Thanks for reaching out — we'll get back to you shortly.</p>
            </div>
          )}

          {!result && (
            <>
              {isCheckout && (
                <div className="order-summary">
                  <h3>Order Summary</h3>
                  {checkout.checkoutItems.map((item, i) => (
                    <OrderSummaryItem
                      key={`${item.product_id ?? item.id}-${item.variant_id ?? ''}-${i}`}
                      item={item}
                    />
                  ))}
                  <div className="order-summary-row order-summary-total">
                    <span>Total</span>
                    <span>₹{checkout.total.toLocaleString('en-IN')}</span>
                  </div>
                </div>
              )}

              <form className="contact-form" onSubmit={handleSubmit} noValidate>
                <div className="form-field">
                  <label htmlFor="name">
                    Name <span className="required-star">*</span>
                  </label>
                  <input id="name" name="name" value={form.name} onChange={handleChange} required />
                  {fieldErrors.name && <p className="field-hint field-hint--error">{fieldErrors.name}</p>}
                </div>

                {isCheckout ? (
                  <>
                    <div className="form-field">
                      <label htmlFor="email">
                        Email <span className="required-star">*</span>
                      </label>
                      <input
                        id="email"
                        name="email"
                        type="email"
                        autoComplete="email"
                        placeholder="you@example.com"
                        value={form.email}
                        onChange={handleChange}
                        required
                      />
                      {fieldErrors.email && <p className="field-hint field-hint--error">{fieldErrors.email}</p>}
                    </div>
                    <div className="form-field">
                      <label htmlFor="phone">
                        Phone Number <span className="required-star">*</span>
                        <span className="visually-hidden"> (Indian country code +91 is included)</span>
                      </label>
                      <div className="phone-field-row">
                        <span className="phone-prefix" aria-hidden="true">+91</span>
                        <input
                          id="phone"
                          name="phone"
                          type="tel"
                          inputMode="numeric"
                          maxLength={10}
                          autoComplete="tel-national"
                          pattern="[0-9]{10}"
                          className="phone-national-input"
                          placeholder="9876543210"
                          value={form.phone}
                          onChange={handlePhoneChange}
                          onBlur={() => setPhoneTouched(true)}
                          aria-invalid={showPhoneError || undefined}
                          aria-describedby={showPhoneError ? 'phone-error' : undefined}
                          required
                        />
                      </div>
                      {showPhoneError && (
                        <p className="field-hint field-hint--error" id="phone-error">
                          {fieldErrors.phone || 'Enter a valid 10-digit mobile number.'}
                        </p>
                      )}
                    </div>
                    <div className="form-field">
                      <label htmlFor="address">
                        Address <span className="required-star">*</span>
                      </label>
                      <textarea id="address" name="address" rows={3} value={form.address} onChange={handleChange} required />
                      {fieldErrors.address && <p className="field-hint field-hint--error">{fieldErrors.address}</p>}
                    </div>
                    <div className="form-field">
                      <label htmlFor="pincode">
                        Pincode <span className="required-star">*</span>
                      </label>
                      <input
                        id="pincode"
                        name="pincode"
                        type="text"
                        inputMode="numeric"
                        maxLength={6}
                        autoComplete="postal-code"
                        value={form.pincode}
                        onChange={handlePincodeChange}
                        placeholder="600001"
                        required
                      />
                      {fieldErrors.pincode && (
                        <p className="field-hint field-hint--error">{fieldErrors.pincode}</p>
                      )}
                      {pinInfo.status === 'loading' && (
                        <p className="field-hint" role="status">Finding location…</p>
                      )}
                      {pinInfo.status === 'found' && (
                        <div className="pincode-result">
                          <p className="pincode-location">
                            <span className="pincode-check" aria-hidden="true">✓</span>{' '}
                            {pinInfo.city}, {pinInfo.state}
                          </p>
                          {pinInfo.localities.length > 1 && (
                            <label className="pincode-locality-label" htmlFor="pincode-locality">
                              Locality / Post Office
                            </label>
                          )}
                          {pinInfo.localities.length > 1 && (
                            <select
                              id="pincode-locality"
                              className="pincode-locality-select"
                              value={pinInfo.locality}
                              onChange={handleLocalityChange}
                            >
                              <option value="">Select locality</option>
                              {pinInfo.localities.map((l, i) => (
                                <option key={`${l.name}-${i}`} value={l.name}>{l.name}</option>
                              ))}
                            </select>
                          )}
                        </div>
                      )}
                      {pinInfo.status === 'error' && (
                        <p className="field-hint field-hint--error">{pinInfo.error}</p>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="form-field">
                    <label htmlFor="email">Email</label>
                    <input id="email" name="email" type="email" value={form.email} onChange={handleChange} required />
                  </div>
                )}

                <div className="form-field">
                  <label htmlFor="message">Message {isCheckout && '(optional)'}</label>
                  <textarea id="message" name="message" rows={4} value={form.message} onChange={handleChange} required={!isCheckout} />
                </div>

                {error && <p className="contact-error">{error}</p>}

                <button className="btn btn-primary" type="submit" disabled={submitting}>
                  {submitting ? 'Sending…' : isCheckout ? 'Send Order' : 'Send Message'}
                </button>
              </form>
            </>
          )}
        </div>

        {!isCheckout && (
          <div className="contact-info-col">
            <div className="contact-info-block">
              <h3>{CONTACT.info.title}</h3>
              <p>{BUSINESS.phoneDisplay}</p>
              <p>{BUSINESS.email}</p>
              <p>{BUSINESS.address}</p>
            </div>
            {/* Real Arees Attars location — interactive Google Maps embed.
                The q= query pins the business address so the marker lands on
                the actual shop, not the centre of Chennai. */}
            <div className="contact-map">
              <iframe
                src={BUSINESS.mapEmbedUrl}
                title="Arees Attars Chennai Location"
                loading="lazy"
                allowFullScreen
                referrerPolicy="no-referrer-when-downgrade"
              />
              <a
                className="contact-map-link"
                href={BUSINESS.mapDirectionsUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                Get Directions
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
