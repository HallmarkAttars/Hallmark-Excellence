import { useState } from 'react'
import { useLocation, Link } from 'react-router-dom'
import { submitContactMessage, submitOrder } from '../services/mockApi'
import { useCart } from '../context/CartContext'
import './Contact.css'

// Business phone number — the same number shown in the site footer/contact.
const BUSINESS_PHONE_DISPLAY = '+91 98765 43210'
const BUSINESS_PHONE_TEL = 'tel:+919876543210'

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
  const unitPrice = Number(item.selected_price ?? item.price ?? 0)
  const quantity = Number(item.quantity ?? item.qty ?? 1)
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
        <span className="order-summary-qty">Qty: {quantity}</span>
      </div>
      <span className="order-summary-price">₹{unitPrice.toLocaleString('en-IN')}</span>
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

  const checkout = location.state?.checkoutItems ? location.state : null
  const isCheckout = Boolean(checkout)

  const [form, setForm] = useState({ name: '', email: '', phone: '', address: '', pincode: '', message: '' })
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState(null) // { orderNumber, order } | { sent: true }
  const [error, setError] = useState('')

  // Order placed successfully (checkout only). Inline state — refreshing the
  // page can never create a duplicate order because the submit handler is the
  // only place an order is created.
  const orderPlaced = isCheckout && Boolean(result?.orderNumber)

  const handleChange = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (isCheckout) {
      if (!form.name || !form.phone || !form.address || !form.pincode) {
        setError('Please fill in all required fields.')
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
          const unit_price = Number(item.selected_price ?? item.price ?? 0)
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
          phone: form.phone,
          address: form.address,
          pincode: form.pincode,
          message: form.message,
          items,
          total: checkout.total,
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

    return (
      <div className="order-success-wrapper">
        <div className="order-success-card">
          <div className="order-success-head">
            <span className="order-success-check">
              <CheckIcon />
            </span>
            <h1>Order Placed Successfully</h1>
            <p className="order-success-id">
              Order ID: <strong>#{orderNumber}</strong>
            </p>
            <p className="order-success-sub">
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
                <a href={BUSINESS_PHONE_TEL}>{BUSINESS_PHONE_DISPLAY}</a>
              </li>
            </ul>
          </section>

          <section id="order-summary" className="order-success-section order-success-summary" aria-label="Order summary">
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
            <Link to="/shop" className="btn btn-primary">Continue Shopping</Link>
            <a href="#order-summary" className="btn btn-outline">View Order</a>
          </div>
        </div>
      </div>
    )
  }

  // --- Contact / Checkout view -------------------------------------------
  return (
    <div>
      <div className={`page-heading ${isCheckout ? 'page-heading--checkout' : ''}`}>
        <p className="eyebrow">{isCheckout ? 'Checkout' : 'Get in Touch'}</p>
        <h1>{isCheckout ? 'Complete Your Order' : 'Contact Us'}</h1>
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
                  <label htmlFor="name">Name</label>
                  <input id="name" name="name" value={form.name} onChange={handleChange} required />
                </div>

                {isCheckout ? (
                  <>
                    <div className="form-field">
                      <label htmlFor="phone">Phone Number</label>
                      <input id="phone" name="phone" type="tel" value={form.phone} onChange={handleChange} required />
                    </div>
                    <div className="form-field">
                      <label htmlFor="address">Address</label>
                      <textarea id="address" name="address" rows={3} value={form.address} onChange={handleChange} required />
                    </div>
                    <div className="form-field">
                      <label htmlFor="pincode">Pincode</label>
                      <input id="pincode" name="pincode" value={form.pincode} onChange={handleChange} required />
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
              <h3>Visit or Reach Us</h3>
              <p>+91 98765 43210</p>
              <p>hello@areesdahab.com</p>
              <p>12 Attar Lane, Chennai, Tamil Nadu 600001</p>
            </div>
            <div className="contact-map-placeholder" aria-hidden="true">Map</div>
          </div>
        )}
      </div>
    </div>
  )
}
