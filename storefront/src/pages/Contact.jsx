import { useState } from 'react'
import { useLocation, Link } from 'react-router-dom'
import { submitContactMessage, submitOrder } from '../services/mockApi'
import { useCart } from '../context/CartContext'
import './Contact.css'

export default function Contact() {
  const location = useLocation()
  const { clearCart } = useCart()

  const checkout = location.state?.checkoutItems ? location.state : null
  const isCheckout = Boolean(checkout)

  const [form, setForm] = useState({ name: '', email: '', phone: '', address: '', pincode: '', message: '' })
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState(null) // { orderNumber } | { sent: true }
  const [error, setError] = useState('')

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
        setResult({ orderNumber: res.orderNumber })
        clearCart()
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

  return (
    <div>
      <div className="page-heading">
        <p className="eyebrow">{isCheckout ? 'Checkout' : 'Get in Touch'}</p>
        <h1>{isCheckout ? 'Complete Your Order' : 'Contact Us'}</h1>
      </div>

      <div className="container contact-layout">
        <div className="contact-form-col">
          {result?.orderNumber && (
            <div className="contact-toast">
              <strong>Order placed — #{result.orderNumber}</strong>
              <p>We'll reach out on your phone number to confirm delivery details.</p>
              <Link to="/shop" className="btn btn-outline">Continue Shopping</Link>
            </div>
          )}

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
                  {checkout.checkoutItems.map((item) => {
                    const unitPrice = Number(item.selected_price ?? item.price ?? 0)
                    const quantity = Number(item.quantity ?? item.qty ?? 1)
                    const label = item.variant_label
                      || (item.quantity_value != null && item.quantity_unit
                          ? `${item.quantity_value} ${item.quantity_unit}`
                          : '')
                    return (
                      <div key={item.product_id ?? item.id} className="order-summary-item">
                        <div className="order-summary-item-info">
                          <span className="order-summary-name">{item.name}</span>
                          {label && <span className="order-summary-variant">{label}</span>}
                        </div>
                        <div className="order-summary-item-right">
                          <span>₹{(unitPrice * quantity).toLocaleString('en-IN')}</span>
                        </div>
                      </div>
                    )
                  })}
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
