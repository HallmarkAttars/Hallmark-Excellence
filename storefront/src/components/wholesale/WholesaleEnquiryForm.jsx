import { useEffect, useId, useRef, useState } from 'react'
import {
  BUYER_TYPES,
  EMPTY_WHOLESALE_FORM,
  buildWholesaleWhatsAppUrl,
  submitWholesaleEnquiry,
  validateWholesaleForm,
} from '../../utils/wholesaleEnquiry'
import { trackWhatsAppLead } from '../../utils/whatsapp'
import { FORMSPREE_ERROR_MESSAGE } from '../../utils/contactForm'
import './WholesaleEnquiryForm.css'

const FIELD_ORDER = [
  'name',
  'company',
  'email',
  'phone',
  'buyerType',
  'gstin',
  'products',
  'destination',
  'message',
]

export default function WholesaleEnquiryForm({ initialProduct = '' }) {
  const formId = useId()
  const [form, setForm] = useState(() => ({
    ...EMPTY_WHOLESALE_FORM,
    products: initialProduct,
  }))
  const [errors, setErrors] = useState({})
  const [status, setStatus] = useState('idle')
  const [submitError, setSubmitError] = useState('')
  const lastPrefill = useRef(initialProduct)
  const formRef = useRef(null)

  useEffect(() => {
    if (!initialProduct || initialProduct === lastPrefill.current) return
    setForm((prev) => {
      const current = prev.products.trim()
      if (current && current !== lastPrefill.current.trim()) return prev
      return { ...prev, products: initialProduct }
    })
    lastPrefill.current = initialProduct
  }, [initialProduct])

  const update = (field) => (event) => {
    const value = event.target.value
    setForm((prev) => ({ ...prev, [field]: value }))
    setErrors((prev) => {
      if (!prev[field]) return prev
      const next = { ...prev }
      delete next[field]
      return next
    })
  }

  const reset = () => {
    setForm({ ...EMPTY_WHOLESALE_FORM })
    setErrors({})
    setSubmitError('')
    setStatus('idle')
    lastPrefill.current = ''
  }

  const onSubmit = async (event) => {
    event.preventDefault()
    setSubmitError('')
    const nextErrors = validateWholesaleForm(form)
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors)
      setStatus('idle')
      const firstField = FIELD_ORDER.find((field) => nextErrors[field])
      if (firstField) formRef.current?.querySelector(`[name="${firstField}"]`)?.focus()
      return
    }

    setStatus('submitting')
    try {
      await submitWholesaleEnquiry(form)
      setStatus('success')
    } catch (error) {
      setSubmitError(error?.message || FORMSPREE_ERROR_MESSAGE)
      setStatus('idle')
    }
  }

  const whatsappUrl = buildWholesaleWhatsAppUrl(form)

  if (status === 'success') {
    return (
      <section
        id="wholesale-enquiry"
        className="wholesale-enquiry"
        aria-labelledby={`${formId}-success`}
      >
        <div className="wholesale-enquiry-success" role="status">
          <span className="wholesale-enquiry-kicker">Enquiry received</span>
          <h2 id={`${formId}-success`}>Thank you — our trade desk will reply shortly.</h2>
          <p>
            We will confirm availability, current per-brand tiers, lead time and dispatch
            from Chennai. For a faster reply, send the same details on WhatsApp.
          </p>
          <div className="wholesale-enquiry-success-actions">
            <a
              href={whatsappUrl}
              className="btn btn-gold"
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => trackWhatsAppLead('wholesale-enquiry-success')}
            >
              Continue on WhatsApp
            </a>
            <button type="button" className="btn btn-outline" onClick={reset}>
              Send another enquiry
            </button>
          </div>
        </div>
      </section>
    )
  }

  const fieldError = (field) =>
    errors[field] ? (
      <span className="wholesale-field-error" id={`${formId}-${field}-error`}>
        {errors[field]}
      </span>
    ) : null

  const describedBy = (field, hintId) =>
    [errors[field] ? `${formId}-${field}-error` : '', hintId || ''].filter(Boolean).join(' ') ||
    undefined

  return (
    <section
      id="wholesale-enquiry"
      className="wholesale-enquiry"
      aria-labelledby={`${formId}-heading`}
    >
      <div className="wholesale-enquiry-head">
        <span className="wholesale-enquiry-kicker">Wholesale enquiry</span>
        <h2 id={`${formId}-heading`}>Tell us what you need a quote for</h2>
        <p>
          Share your product mix, quantity and destination. The Chennai trade desk will
          confirm live per-brand rates, lead time and documentation — no account needed.
        </p>
      </div>

      <form
        ref={formRef}
        className="wholesale-enquiry-form"
        onSubmit={onSubmit}
        noValidate
        aria-busy={status === 'submitting'}
      >
        <div className="wholesale-form-grid">
          <label className="wholesale-field">
            <span>Name *</span>
            <input
              type="text"
              name="name"
              value={form.name}
              onChange={update('name')}
              autoComplete="name"
              aria-invalid={Boolean(errors.name)}
              aria-describedby={describedBy('name')}
            />
            {fieldError('name')}
          </label>

          <label className="wholesale-field">
            <span>Company / shop</span>
            <input
              type="text"
              name="company"
              value={form.company}
              onChange={update('company')}
              autoComplete="organization"
            />
          </label>

          <label className="wholesale-field">
            <span>Email *</span>
            <input
              type="email"
              name="email"
              value={form.email}
              onChange={update('email')}
              autoComplete="email"
              inputMode="email"
              aria-invalid={Boolean(errors.email)}
              aria-describedby={describedBy('email')}
            />
            {fieldError('email')}
          </label>

          <label className="wholesale-field">
            <span>Phone / WhatsApp *</span>
            <input
              type="tel"
              name="phone"
              value={form.phone}
              onChange={update('phone')}
              autoComplete="tel"
              inputMode="tel"
              aria-invalid={Boolean(errors.phone)}
              aria-describedby={describedBy('phone')}
            />
            {fieldError('phone')}
          </label>

          <label className="wholesale-field">
            <span>Buyer type</span>
            <select name="buyerType" value={form.buyerType} onChange={update('buyerType')}>
              <option value="">Select one</option>
              {BUYER_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </label>

          <label className="wholesale-field">
            <span>GSTIN (optional)</span>
            <input
              type="text"
              name="gstin"
              value={form.gstin}
              onChange={update('gstin')}
              maxLength={15}
              autoComplete="off"
              spellCheck="false"
              aria-invalid={Boolean(errors.gstin)}
              aria-describedby={describedBy('gstin', `${formId}-gstin-hint`)}
            />
            <span className="wholesale-field-hint" id={`${formId}-gstin-hint`}>
              Add this if you need a GST invoice.
            </span>
            {fieldError('gstin')}
          </label>
        </div>

        <label className="wholesale-field">
          <span>Products and quantities *</span>
          <textarea
            name="products"
            rows={4}
            value={form.products}
            onChange={update('products')}
            placeholder="Example: Arees 8ml roll-ons — 240 pieces, 3 fragrances; 2 kg oud oil"
            aria-invalid={Boolean(errors.products)}
            aria-describedby={describedBy('products', `${formId}-products-hint`)}
          />
          <span className="wholesale-field-hint" id={`${formId}-products-hint`}>
            Product names, pack sizes, scent families or a catalogue reference all help.
          </span>
          {fieldError('products')}
        </label>

        <div className="wholesale-form-grid">
          <label className="wholesale-field">
            <span>Delivery city / destination country *</span>
            <input
              type="text"
              name="destination"
              value={form.destination}
              onChange={update('destination')}
              autoComplete="address-level2"
              aria-invalid={Boolean(errors.destination)}
              aria-describedby={describedBy('destination')}
            />
            {fieldError('destination')}
          </label>

          <label className="wholesale-field">
            <span>Anything else?</span>
            <input
              type="text"
              name="message"
              value={form.message}
              onChange={update('message')}
              placeholder="Private label, timeline, shipping terms…"
            />
          </label>
        </div>

        <div className="wholesale-honeypot" aria-hidden="true">
          <label>
            Leave this field empty
            <input
              type="text"
              name="_gotcha"
              value={form._gotcha}
              onChange={update('_gotcha')}
              tabIndex={-1}
              autoComplete="off"
            />
          </label>
        </div>

        {submitError && (
          <p className="wholesale-form-alert" role="alert">
            {submitError}
          </p>
        )}

        <div className="wholesale-form-actions">
          <button
            type="submit"
            className="btn btn-gold"
            disabled={status === 'submitting'}
          >
            {status === 'submitting' ? 'Sending enquiry…' : 'Send wholesale enquiry'}
          </button>
          <a
            href={whatsappUrl}
            className="wholesale-form-whatsapp"
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => trackWhatsAppLead('wholesale-enquiry-form')}
          >
            Or send these details on WhatsApp
          </a>
        </div>
      </form>
    </section>
  )
}
