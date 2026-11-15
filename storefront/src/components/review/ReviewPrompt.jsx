import { useEffect, useId, useState } from 'react'
import { Link } from 'react-router-dom'
import { BUSINESS } from '../../data/content'
import './ReviewPrompt.css'

// Inline, dismissible "review us on Google" prompt.
//
// Placement: the order-placed confirmation (Contact.jsx) and the Track
// Order page when the order shows Delivered — the real post-experience
// moment. Never a modal, never auto-opened, never incentivised, and the
// Google rating is NEVER pre-filled (Google policy prohibits gated or
// incentivised reviews; every customer gets the same honest-review invite).
//
// Dismissal is persisted per order so the card can never nag twice; the
// click flag marks the order as already reviewed. Renders NOTHING when no
// Google review URL is configured — never a dead link.
export const reviewDismissedKey = (orderId) =>
  `arees:review-dismissed:${orderId || 'unknown'}`
export const reviewClickedKey = (orderId) =>
  `arees:review-clicked:${orderId || 'unknown'}`

const GoogleG = () => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 48 48"
    aria-hidden="true"
    focusable="false"
  >
    <path
      fill="#4285F4"
      d="M45.12 24.5c0-1.56-.14-3.06-.4-4.5H24v8.51h11.84a10.12 10.12 0 0 1-4.39 6.64v5.52h7.11c4.16-3.83 6.56-9.47 6.56-16.17z"
    />
    <path
      fill="#34A853"
      d="M24 46c5.94 0 10.92-1.97 14.56-5.33l-7.11-5.52c-1.97 1.32-4.49 2.1-7.45 2.1-5.73 0-10.58-3.87-12.31-9.07H4.34v5.7A22 22 0 0 0 24 46z"
    />
    <path
      fill="#FBBC05"
      d="M11.69 28.18a13.2 13.2 0 0 1 0-8.36v-5.7H4.34a22 22 0 0 0 0 19.76l7.35-5.7z"
    />
    <path
      fill="#EA4335"
      d="M24 9.75c3.23 0 6.13 1.11 8.41 3.29l6.31-6.31A21.14 21.14 0 0 0 24 2 22 22 0 0 0 4.34 14.12l7.35 5.7c1.73-5.2 6.58-9.07 12.31-9.07z"
    />
  </svg>
)

export default function ReviewPrompt({ placement = 'order-success', orderId }) {
  const [hidden, setHidden] = useState(true)
  const headingId = useId()
  const isDelivered = placement === 'delivered'

  useEffect(() => {
    // Guarded by Google's policy rules above: shown at most once per order.
    try {
      if (!BUSINESS.googleReviewUrl) return undefined
      if (window.localStorage.getItem(reviewDismissedKey(orderId))) return undefined
      if (window.localStorage.getItem(reviewClickedKey(orderId))) return undefined
      setHidden(false)
    } catch {
      /* storage unavailable (private mode) — card simply never shows */
    }
    return undefined
  }, [orderId])

  if (hidden) return null

  const dismiss = () => {
    try {
      window.localStorage.setItem(reviewDismissedKey(orderId), '1')
    } catch {
      /* ignore */
    }
    setHidden(true)
  }

  const markReviewed = (source) => {
    try {
      window.localStorage.setItem(reviewClickedKey(orderId), '1')
    } catch {
      /* ignore */
    }
    // Best-effort GA4 event — gtag is only loaded on desktop (async loader).
    if (typeof window.gtag === 'function') {
      window.gtag('event', 'google_review_click', { placement, source })
    }
  }

  const fallbackUrl =
    BUSINESS.googleReviewFallbackUrl &&
    BUSINESS.googleReviewFallbackUrl !== BUSINESS.googleReviewUrl
      ? BUSINESS.googleReviewFallbackUrl
      : ''

  return (
    <section
      className={`review-prompt review-prompt-${placement}`}
      aria-labelledby={headingId}
    >
      <span className="review-prompt-google">
        <GoogleG />
        <span>Google review</span>
      </span>
      <h3 id={headingId} className="review-prompt-heading">
        {isDelivered
          ? 'Share your experience on Google'
          : 'Once your order arrives, share it on Google'}
      </h3>
      <p className="review-prompt-copy">
        {isDelivered
          ? 'Your honest review helps other fragrance lovers in Chennai find a fragrance house they can trust. It only takes a minute.'
          : 'Your order is confirmed. When it arrives, your honest Google review helps other fragrance lovers in Chennai find us.'}
      </p>
      <div className="review-prompt-actions">
        <a
          className="btn btn-gold review-prompt-cta"
          href={BUSINESS.googleReviewUrl}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Write a Google review (opens in a new tab)"
          onClick={() => markReviewed('primary')}
        >
          Write a Google review
        </a>
        {fallbackUrl && (
          <a
            className="review-prompt-fallback"
            href={fallbackUrl}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Open our Google listing (opens in a new tab)"
            onClick={() => markReviewed('fallback')}
          >
            Open our Google listing
          </a>
        )}
      </div>
      <div className="review-prompt-footer">
        <Link className="review-prompt-private" to="/contact">
          Need help with this order? Contact us
        </Link>
        <button type="button" className="review-prompt-dismiss" onClick={dismiss}>
          Not now
        </button>
      </div>
    </section>
  )
}
