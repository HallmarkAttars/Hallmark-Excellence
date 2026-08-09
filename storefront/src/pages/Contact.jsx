import { useEffect, useRef, useState } from 'react'
import { Navigate, useLocation, Link } from 'react-router-dom'
import { api } from '../services/api'
import { submitContactMessage, submitOrder } from '../services/mockApi'
import { InvoiceDownloadButton } from '../components/invoice/InvoiceActions'
import { useCart } from '../context/CartContext'
import {
  isBulkApplicable,
  isBulkUnlocked,
  bulkSavings,
  resolvedUnitPrice,
} from '../utils/bulk'
import {
  UserIcon,
  HomeIcon,
  BuildingIcon,
  MapPinIcon,
  LockIcon,
  SecureIcon,
  BoxIcon,
  QualityIcon,
  PhoneIcon,
  MailIcon,
  ClockIcon,
} from '../components/icons'
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
  // pricing system. Uses the pre-resolved unit_price carried on the checkout
  // snapshot (which already includes any active combined brand bulk) and falls
  // back to the pure per-line bulk math (bulk once unlocked) for legacy
  // snapshots. × quantity = line total — identical to the cart and to the
  // server-side order math.
  const rawQty = item.quantity ?? item.qty
  const unitPrice = resolvedUnitPrice(item)
  const quantity = Number.isFinite(Number(rawQty)) ? Number(rawQty) : 1
  const lineTotal = unitPrice * quantity
  const bulkApplicable = isBulkApplicable(item)
  const bulkUnlocked = isBulkUnlocked(item)
  const savedAmount = bulkSavings(item)
  // Brand-level combined bulk discount on this line (from the resolved cart
  // snapshot) — the charged amount is always unitPrice.
  const brandBulkSavings =
    item.brand_bulk_applied && item.normal_unit_price != null
      ? Math.max(0, (Number(item.normal_unit_price) - unitPrice) * quantity)
      : 0
  // Don't advertise an unlock path when the available stock can't physically
  // reach the bulk threshold (e.g. stock 50 vs bulk quantity 100).
  const itemStock = item.stock != null ? Number(item.stock) : null
  const stockCanReachBulk =
    !bulkApplicable ||
    itemStock == null ||
    itemStock >= Number(item.bulk_min_qty)
  // Normal (compare-at) unit price for the line — what the customer would pay
  // without the active bulk discount. Snapshot items carry normal_unit_price
  // (set by the cart context); legacy snapshots fall back to the line's own
  // selected price. Mirrors the cart's struck normal-price display: it only
  // appears when a genuine discount is active AND the normal price is really
  // higher than the charged price, so a price identical to itself is never
  // struck through.
  const normalUnitPriceRaw =
    item.normal_unit_price != null
      ? Number(item.normal_unit_price)
      : Number(item.selected_price ?? item.price ?? 0)
  const normalUnitPrice =
    Number.isFinite(normalUnitPriceRaw) && normalUnitPriceRaw > 0
      ? normalUnitPriceRaw
      : null
  const hasBulkDiscount = Boolean(
    (item.brand_bulk_applied && brandBulkSavings > 0) ||
      (!item.brand_bulk_applied && bulkUnlocked && savedAmount > 0)
  )
  const showCompareAt =
    hasBulkDiscount && normalUnitPrice != null && normalUnitPrice > unitPrice
  const normalLineTotal =
    showCompareAt && normalUnitPrice != null ? normalUnitPrice * quantity : null
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
          {showCompareAt && (
            <span className="order-summary-qty-struck">
              {' '}₹{normalUnitPrice.toLocaleString('en-IN')}/piece
            </span>
          )}
        </span>
        {item.brand_bulk_applied && brandBulkSavings > 0 && (
          <span className="order-summary-bulk-note">✓ {item.brand_name || 'Brand'} Bulk Discount Applied · You Saved ₹{brandBulkSavings.toLocaleString('en-IN')}</span>
        )}
        {!item.brand_bulk_applied && bulkUnlocked && savedAmount > 0 && (
          <span className="order-summary-bulk-note">✓ Bulk Price Applied · You Saved ₹{savedAmount.toLocaleString('en-IN')}</span>
        )}
        {!item.brand_bulk_applied && bulkApplicable && stockCanReachBulk && !bulkUnlocked && (
          <span className="order-summary-bulk-chip">🔥 Bulk Price at {item.bulk_min_qty}+ pcs</span>
        )}
      </div>
      {/* Right side = LINE TOTAL (unit price × quantity), never the unit price.
          When a bulk discount is active, the plain normal total (normal price
          × quantity) sits struck-through below it — same pattern as the cart. */}
      <span className="order-summary-price-wrap">
        <span
          className="order-summary-price"
          aria-label={`Line total ₹${lineTotal.toLocaleString('en-IN')}`}
        >
          ₹{lineTotal.toLocaleString('en-IN')}
        </span>
        {normalLineTotal != null && (
          <span className="order-summary-price-struck">
            ₹{normalLineTotal.toLocaleString('en-IN')}
          </span>
        )}
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

  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    house: '',
    building: '',
    landmark: '',
    pincode: '',
    city: '',
    addressLabel: 'Home',
    message: '',
  })
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
      setPinInfo({ status: 'error', localities: [], city: '', state: '', locality: '', error: 'Pincode not found. Please check the pincode.', pinNotFound: true })
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
    // AUTO-FILL the City field from the fetched pincode — the customer never
    // types the city when a valid pincode determines it.
    if (result.city) setForm((f) => ({ ...f, city: result.city }))
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
        setPinInfo({ status: 'error', localities: [], city: '', state: '', locality: '', error: 'Unable to fetch city. Please try again.', pinNotFound: false })
      })
  }

  // Lookup only fires once exactly 6 digits exist, debounced slightly.
  const handlePincodeChange = (e) => {
    const digits = e.target.value.replace(/\D/g, '').slice(0, 6)
    currentPin.current = digits
    // A changed pincode invalidates the previous auto-fetched city — clear it
    // so a stale city can never ride along with a new pincode.
    setForm((f) => ({ ...f, pincode: digits, city: '' }))
    clearFieldError('pincode')
    setPinInfo({ status: 'idle', localities: [], city: '', state: '', locality: '', error: '', pinNotFound: false })
    window.clearTimeout(pinTimer.current)
    if (digits.length === 6) {
      pinTimer.current = window.setTimeout(() => lookupPincode(digits), 350)
    }
  }

  // Blur with a complete 6-digit pincode triggers the lookup immediately
  // (covers paste-and-tab flows where the debounce timer may not have fired).
  // Skipped while a lookup for this pincode is already in flight so the same
  // pin is never fetched twice.
  const handlePincodeBlur = () => {
    if (
      /^\d{6}$/.test(form.pincode) &&
      pinInfo.status !== 'found' &&
      pinInfo.status !== 'loading'
    ) {
      window.clearTimeout(pinTimer.current)
      currentPin.current = form.pincode
      lookupPincode(form.pincode)
    }
  }

  // Manual retry after a failed lookup — never clears other entered fields.
  const retryPincode = () => {
    if (/^\d{6}$/.test(form.pincode)) lookupPincode(form.pincode)
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
      if (!form.house.trim()) errs.house = 'House No. & Floor is required.'
      if (!/^\d{6}$/.test(form.pincode)) errs.pincode = 'Enter a valid 6-digit PIN code.'
      if (!form.city.trim()) errs.city = 'City is required — enter a valid pincode or type it manually.'
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
          // Send the APPLIED unit price (per-product bulk once unlocked AND
          // any active combined brand bulk) so the snapshot mirrors what the
          // customer is charged — the server still recomputes everything
          // authoritatively from the database.
          const unit_price = resolvedUnitPrice(item)
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

        // Structured address fields composed into the single `address` string
        // the order system already stores — no API contract change.
        const address = [form.house, form.building, form.landmark]
          .map((s) => s.trim())
          .filter(Boolean)
          .join(', ')

        const payload = {
          name: form.name,
          email: form.email.trim(),
          // Full Indian number in E.164 form (e.g. +919876543210) — the same
          // phone format the order system already expects.
          phone: `+91${form.phone}`,
          address,
          pincode: form.pincode,
          // City is always the customer's value — auto-fetched from the
          // pincode when the lookup succeeded, typed manually otherwise.
          city: form.city.trim(),
          // Optional locality/state extras from the PIN lookup.
          ...(pinInfo.status === 'found'
            ? { locality: pinInfo.locality, state: pinInfo.state }
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

  // Real line-level subtotal for the checkout summary — the sum of the same
  // resolved unit prices × quantities the item rows display (brand bulk and
  // per-product bulk already included). Delivery is confirmed later, so the
  // Total row uses the cart's authoritative total from the checkout state.
  const checkoutSubtotal = isCheckout && checkout
    ? checkout.checkoutItems.reduce((acc, it) => {
        const unitPrice = resolvedUnitPrice(it)
        const rawQty = it.quantity ?? it.qty
        const qty = Number.isFinite(Number(rawQty)) ? Number(rawQty) : 1
        return acc + unitPrice * qty
      }, 0)
    : 0

  // --- Contact / Checkout view -------------------------------------------
  return (
    <div>
      <div className={`page-heading ${isCheckout ? 'page-heading--checkout' : 'page-heading--contact'}`}>
        <p className="eyebrow">{isCheckout ? CONTACT.checkout.eyebrow : CONTACT.eyebrow}</p>
        <h1>{isCheckout ? CONTACT.checkout.title : CONTACT.title}</h1>
        {isCheckout && <p className="checkout-head-sub">Complete your order securely</p>}
        {!isCheckout && <p className="page-heading-sub">{CONTACT.subtitle}</p>}
      </div>

      {isCheckout ? (
        <div className="container contact-layout contact-layout--checkout">
          {/* Two-column grid: Delivery Information (left) + Order Summary
              (right). The trust strip below is a SEPARATE block — it is not
              part of this grid, so nothing can ever scroll under/over it. */}
          <div className="checkout-grid">
            {/* LEFT — Delivery Information card */}
            <div className="contact-form-col">
              <div className="checkout-card">
                <div className="checkout-card-head">
                  <span className="checkout-card-head-icon" aria-hidden="true">
                    <UserIcon size={18} />
                  </span>
                  <h2>Delivery Information</h2>
                </div>

                <form id="checkout-form" className="contact-form checkout-form" onSubmit={handleSubmit} noValidate>
                  <div className="form-row form-row--2">
                    <div className="form-field">
                      <label htmlFor="name">
                        Full Name <span className="required-star">*</span>
                      </label>
                      <input
                        id="name"
                        name="name"
                        placeholder="Enter your full name"
                        autoComplete="name"
                        value={form.name}
                        onChange={handleChange}
                        required
                      />
                      {fieldErrors.name && <p className="field-hint field-hint--error">{fieldErrors.name}</p>}
                    </div>
                    <div className="form-field">
                      <label htmlFor="email">
                        Email Address <span className="required-star">*</span>
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
                    <label htmlFor="house">
                      House No. &amp; Floor <span className="required-star">*</span>
                    </label>
                    <input
                      id="house"
                      name="house"
                      placeholder="House No. & Floor"
                      value={form.house}
                      onChange={handleChange}
                      required
                    />
                    {fieldErrors.house && <p className="field-hint field-hint--error">{fieldErrors.house}</p>}
                  </div>

                  <div className="form-field">
                    <label htmlFor="building">
                      Building &amp; Block No. <span className="optional-tag">(Optional)</span>
                    </label>
                    <input
                      id="building"
                      name="building"
                      placeholder="Building & Block No. (Optional)"
                      value={form.building}
                      onChange={handleChange}
                    />
                  </div>

                  <div className="form-field">
                    <label htmlFor="landmark">
                      Landmark &amp; Area Name <span className="optional-tag">(Optional)</span>
                    </label>
                    <input
                      id="landmark"
                      name="landmark"
                      placeholder="Landmark & Area Name (Optional)"
                      value={form.landmark}
                      onChange={handleChange}
                    />
                  </div>

                  <div className="form-row form-row--2">
                    <div className="form-field">
                      <label htmlFor="pincode">
                        Pincode <span className="required-star">*</span>
                      </label>
                      <div className="pincode-input-row">
                        <input
                          id="pincode"
                          name="pincode"
                          type="text"
                          inputMode="numeric"
                          maxLength={6}
                          autoComplete="postal-code"
                          placeholder="600001"
                          value={form.pincode}
                          onChange={handlePincodeChange}
                          onBlur={handlePincodeBlur}
                          className={pinInfo.status === 'found' ? 'is-fetched' : ''}
                          required
                        />
                        {pinInfo.status === 'found' && (
                          <span className="pincode-ok" aria-hidden="true">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                              <path d="m5 12.5 4.5 4.5L19 7.5" />
                            </svg>
                          </span>
                        )}
                        {pinInfo.status === 'loading' && <span className="pincode-spinner" aria-hidden="true" />}
                      </div>
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
                        <p className="field-hint field-hint--error">
                          {pinInfo.error}
                          {!pinInfo.pinNotFound && (
                            <button type="button" className="pincode-retry" onClick={retryPincode}>
                              Retry
                            </button>
                          )}
                        </p>
                      )}
                    </div>

                    <div className="form-field">
                      <label htmlFor="city">
                        City <span className="required-star">*</span>
                      </label>
                      <input
                        id="city"
                        name="city"
                        placeholder={pinInfo.status === 'loading' ? 'Fetching city…' : 'Enter city'}
                        autoComplete="address-level2"
                        value={form.city}
                        onChange={handleChange}
                        readOnly={pinInfo.status === 'found'}
                        className={`checkout-city-input${pinInfo.status === 'found' ? ' is-fetched' : ''}`}
                        aria-describedby={pinInfo.status === 'loading' || pinInfo.status === 'found' ? 'city-status' : undefined}
                        required
                      />
                      {fieldErrors.city && <p className="field-hint field-hint--error">{fieldErrors.city}</p>}
                      {pinInfo.status === 'loading' && (
                        <p className="field-hint" id="city-status" role="status">Fetching city…</p>
                      )}
                      {pinInfo.status === 'found' && (
                        <p className="field-hint city-fetched" id="city-status">✓ Auto-filled from pincode</p>
                      )}
                    </div>
                  </div>

                  <div className="form-field">
                    <label id="address-label-title">Add address label</label>
                    <div className="address-label-row" role="radiogroup" aria-labelledby="address-label-title">
                      {[
                        { key: 'Home', icon: <HomeIcon size={15} /> },
                        { key: 'Work', icon: <BuildingIcon size={15} /> },
                        { key: 'Other', icon: <MapPinIcon size={15} /> },
                      ].map((opt) => (
                        <button
                          key={opt.key}
                          type="button"
                          className={`address-label-chip${form.addressLabel === opt.key ? ' is-active' : ''}`}
                          onClick={() => setForm((f) => ({ ...f, addressLabel: opt.key }))}
                          aria-pressed={form.addressLabel === opt.key}
                        >
                          {opt.icon} {opt.key}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="form-field">
                    <label htmlFor="message">Message <span className="optional-tag">(Optional)</span></label>
                    <textarea
                      id="message"
                      name="message"
                      rows={3}
                      placeholder="Add any special instructions for delivery..."
                      value={form.message}
                      onChange={handleChange}
                    />
                  </div>

                  {error && <p className="contact-error">{error}</p>}

                  <button className="btn btn-primary checkout-submit" type="submit" disabled={submitting}>
                    <LockIcon size={15} /> {submitting ? 'Sending…' : 'Send Order'}
                  </button>
                </form>
              </div>
            </div>

            {/* RIGHT — Order Summary card (static, stays in its column) */}
            <div className="checkout-summary-col">
              <div className="order-summary">
                <h3>Order Summary</h3>
                <div className="order-summary-divider" aria-hidden="true" />
                <div className="order-summary-items">
                  {checkout.checkoutItems.map((item, i) => (
                    <OrderSummaryItem
                      key={`${item.product_id ?? item.id}-${item.variant_id ?? ''}-${i}`}
                      item={item}
                    />
                  ))}
                </div>
                <div className="order-summary-row">
                  <span>Subtotal</span>
                  <span>₹{checkoutSubtotal.toLocaleString('en-IN')}</span>
                </div>
                <div className="order-summary-row">
                  <span>Delivery / Transport</span>
                  <span className="order-summary-delivery">To be confirmed</span>
                </div>
                <div className="order-summary-row order-summary-total">
                  <span>Total</span>
                  <span>₹{checkout.total.toLocaleString('en-IN')}</span>
                </div>
                <div className="checkout-security">
                  <SecureIcon size={18} />
                  <div>
                    <strong>Safe &amp; Secure Checkout</strong>
                    <span>Your information is safe with us</span>
                  </div>
                </div>

                <Link to="/cart" className="checkout-return-link">
                  <span className="checkout-return-arrow" aria-hidden="true">←</span> Return to Cart
                </Link>
              </div>
            </div>
          </div>

          {/* Full-width trust strip — separate block BELOW both columns */}
          <div className="checkout-trust-strip" aria-label="Store promises">
            <div className="checkout-trust-item">
              <SecureIcon size={19} />
              <div>
                <strong>Secure Checkout</strong>
                <span>Your data is protected</span>
              </div>
            </div>
            <div className="checkout-trust-item">
              <BoxIcon size={19} />
              <div>
                <strong>Fast Delivery</strong>
                <span>Quick &amp; reliable shipping</span>
              </div>
            </div>
            <div className="checkout-trust-item">
              <QualityIcon size={19} />
              <div>
                <strong>100% Original</strong>
                <span>Authentic products only</span>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="container contact-layout contact-layout--page">
          <div className="contact-form-col">
            {result?.sent && (
              <div className="contact-toast" role="status">
                <strong>Message sent</strong>
                <p>Thanks for reaching out — we'll get back to you shortly.</p>
              </div>
            )}

            {!result && (
              <form
                className="contact-form contact-form--page"
                onSubmit={handleSubmit}
                noValidate
                aria-label="Contact form"
              >
                <h2 className="contact-form-title">Get in Touch</h2>

                <div className="form-field">
                  <label htmlFor="name">
                    Name <span className="required-star">*</span>
                  </label>
                  <input
                    id="name"
                    name="name"
                    placeholder="Enter your name"
                    autoComplete="name"
                    value={form.name}
                    onChange={handleChange}
                    required
                  />
                  {fieldErrors.name && <p className="field-hint field-hint--error">{fieldErrors.name}</p>}
                </div>

                <div className="form-field">
                  <label htmlFor="email">
                    Email <span className="required-star">*</span>
                  </label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="you@example.com"
                    autoComplete="email"
                    value={form.email}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="form-field">
                  <label htmlFor="message">
                    Message <span className="required-star">*</span>
                  </label>
                  <textarea
                    id="message"
                    name="message"
                    rows={4}
                    placeholder="How can we help you?"
                    value={form.message}
                    onChange={handleChange}
                    required
                  />
                </div>

                {error && <p className="contact-error">{error}</p>}

                <button
                  className="btn btn-primary contact-submit"
                  type="submit"
                  disabled={submitting}
                >
                  {submitting ? 'Sending…' : 'Send Message'}
                </button>
              </form>
            )}
          </div>

          <div className="contact-info-col">
            <div className="contact-info-card">
              <h2 className="contact-info-title">{CONTACT.info.title}</h2>

              <ul className="contact-info-list">
                <li className="contact-info-item">
                  <span className="contact-info-icon" aria-hidden="true">
                    <PhoneIcon size={17} />
                  </span>
                  <span className="contact-info-label">{CONTACT.info.phoneLabel}</span>
                  <a
                    className="contact-info-value contact-info-link"
                    href={`tel:${BUSINESS.phoneTel}`}
                  >
                    {BUSINESS.phoneDisplay}
                  </a>
                </li>
                <li className="contact-info-item">
                  <span className="contact-info-icon" aria-hidden="true">
                    <MailIcon size={17} />
                  </span>
                  <span className="contact-info-label">{CONTACT.info.emailLabel}</span>
                  <a
                    className="contact-info-value contact-info-link"
                    href={`mailto:${BUSINESS.email}`}
                  >
                    {BUSINESS.email}
                  </a>
                </li>
                <li className="contact-info-item">
                  <span className="contact-info-icon" aria-hidden="true">
                    <MapPinIcon size={17} />
                  </span>
                  <span className="contact-info-label">{CONTACT.info.addressLabel}</span>
                  <span className="contact-info-value">{BUSINESS.address}</span>
                </li>
              </ul>

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
                  Get Directions <span className="contact-map-link-arrow" aria-hidden="true">→</span>
                </a>
              </div>
            </div>
          </div>

          {/* Reassurance row — claims already used on the site, never invented */}
          <div className="contact-benefits" aria-label="Contact support promises">
            {CONTACT.benefits.map((b) => (
              <div className="contact-benefit" key={b.key}>
                <span className="contact-benefit-icon" aria-hidden="true">
                  {b.key === 'quick' ? (
                    <ClockIcon size={18} />
                  ) : b.key === 'secure' ? (
                    <SecureIcon size={18} />
                  ) : (
                    <UserIcon size={18} />
                  )}
                </span>
                <div>
                  <strong>{b.title}</strong>
                  <span>{b.subtitle}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
