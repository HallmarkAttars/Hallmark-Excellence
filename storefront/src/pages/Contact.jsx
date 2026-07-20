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
        const payload = {
          name: form.name,
          phone: form.phone,
          address: form.address,
          pincode: form.pincode,
          message: form.message,
          items: checkout.checkoutItems,
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
                  {checkout.checkoutItems.map((item) => (
                    <div key={item.id} className="order-summary-row">
                      <span>{item.name} × {item.qty}</span>
                      <span>₹{(item.price * item.qty).toLocaleString('en-IN')}</span>
                    </div>
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
