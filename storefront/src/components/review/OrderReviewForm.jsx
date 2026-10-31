import { useEffect, useState } from 'react'
import { api } from '../../services/api'
import './OrderReviewForm.css'

// "Rate your experience" — on-site order review form (Phase B).
//
// Rendered by TrackOrder once the order shows Delivered. The submission is
// verified server-side (real order + Delivered status + customer phone from
// the phone the tracking lookup was made with); successful posts are stored
// as 'pending' and appear on the site only after admin approval AND the
// customer's display consent. One review per order.
//
// After a successful submit (or when this order already has one), the form
// collapses to a thank-you state. The Google review prompt (ReviewPrompt)
// stays visible below it — the customer who just typed warm words is the
// person most likely to also post them on Google.

// Submitted state is persisted per order so the form can never nag twice.
export const orderReviewPostedKey = (orderId) =>
  `arees:order-review-posted:${orderId || 'unknown'}`

const STAR_LABELS = ['Very poor', 'Poor', 'Average', 'Good', 'Excellent']

export default function OrderReviewForm({ order }) {
  const orderId = order?.orderId
  const [posted, setPosted] = useState(false)
  const [rating, setRating] = useState(0)
  const [hovered, setHovered] = useState(0)
  const [text, setText] = useState('')
  const [consent, setConsent] = useState(false)
  const [phone, setPhone] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    try {
      if (orderId && window.localStorage.getItem(orderReviewPostedKey(orderId))) {
        setPosted(true)
      }
    } catch {
      /* storage unavailable — default to showing the form */
    }
  }, [orderId])

  // The tracking response already carries the customer's own phone (it was
  // verified by the lookup itself), so no phone field unless it's missing.
  const hasStoredPhone = Boolean(order?.phone)

  if (!orderId) return null

  if (posted) {
    return (
      <section className="order-review-card is-thanks" aria-label="Review submitted">
        <p className="order-review-thanks-heading">Thank you for rating this order!</p>
        <p className="order-review-thanks-note">
          Your review is with our team and may appear on the website after a quick check.
        </p>
      </section>
    )
  }

  const submit = async (e) => {
    e.preventDefault()
    if (!rating) {
      setError('Please choose a star rating first.')
      return
    }
    setSubmitting(true)
    setError('')
    try {
      const payload = { orderId, rating, consentShow: consent }
      if (text.trim()) payload.reviewText = text.trim()
      if (hasStoredPhone) payload.phone = order.phone
      else payload.phone = phone
      await api.post('/reviews', payload)
      try {
        window.localStorage.setItem(orderReviewPostedKey(orderId), '1')
      } catch {
        /* ignore */
      }
      setPosted(true)
    } catch (err) {
      const code = Number(err?.status)
      if (code === 409) {
        // Already reviewed — treat as done so the customer is never nagged.
        try {
          window.localStorage.setItem(orderReviewPostedKey(orderId), '1')
        } catch {
          /* ignore */
        }
        setPosted(true)
      } else if (code === 403 || code === 400) {
        setError(err?.message || 'We could not verify this order with the details provided.')
      } else {
        setError('Could not save your review right now. Please try again.')
      }
    } finally {
      setSubmitting(false)
    }
  }

  const activeStar = hovered || rating

  return (
    <section className="order-review-card" aria-label="Rate your experience">
      <h3 className="order-review-heading">Rate your experience</h3>

      <form onSubmit={submit}>
        {/* Star group — radiogroup semantics, keyboard focusable */}
        <div
          className="order-review-stars"
          role="radiogroup"
          aria-label="Star rating"
        >
          {[1, 2, 3, 4, 5].map((value) => (
            <button
              type="button"
              key={value}
              role="radio"
              aria-checked={rating === value}
              className={`order-review-star${value <= activeStar ? ' is-on' : ''}`}
              aria-label={`${value} star${value > 1 ? 's' : ''} — ${STAR_LABELS[value - 1]}`}
              onMouseEnter={() => setHovered(value)}
              onMouseLeave={() => setHovered(0)}
              onClick={() => setRating(value)}
            >
              <svg width="26" height="26" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false">
                <path d="m12 2 3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77 5.82 21l1.18-6.88-5-4.87 6.91-1.01L12 2z" />
              </svg>
            </button>
          ))}
        </div>
        {rating > 0 && (
          <p className="order-review-star-label" aria-hidden="true">
            {STAR_LABELS[rating - 1]}
          </p>
        )}

        <label className="order-review-label" htmlFor={`order-review-text-${orderId}`}>
          Your comments (optional)
        </label>
        <textarea
          id={`order-review-text-${orderId}`}
          className="order-review-textarea"
          value={text}
          maxLength={1000}
          rows={3}
          placeholder="What did you love? What can we do better?"
          onChange={(e) => setText(e.target.value)}
        />

        {!hasStoredPhone && (
          <>
            <label className="order-review-label" htmlFor={`order-review-phone-${orderId}`}>
              Mobile number used for the order
            </label>
            <input
              id={`order-review-phone-${orderId}`}
              className="order-review-phone"
              type="tel"
              inputMode="numeric"
              autoComplete="tel"
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="98765 43210"
            />
          </>
        )}

        <label className="order-review-consent">
          <input
            type="checkbox"
            checked={consent}
            onChange={(e) => setConsent(e.target.checked)}
          />
          <span>
            You may show my review on this website with my first name.
          </span>
        </label>

        {error && (
          <p className="order-review-error" role="alert">
            {error}
          </p>
        )}

        <button type="submit" className="btn btn-gold order-review-submit" disabled={submitting}>
          {submitting ? 'Submitting…' : 'Submit Review'}
        </button>
      </form>
    </section>
  )
}
