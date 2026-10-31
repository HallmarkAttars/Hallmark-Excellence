import { useEffect, useId, useState } from 'react'
import { BUSINESS } from '../../data/content'
import './ReviewPrompt.css'

// Inline, dismissible "review us on Google" prompt.
//
// Placement: the order-placed confirmation (Contact.jsx) and the Track
// Order page when the order shows Delivered — the real post-experience
// moment. Never a modal, never auto-opened, never incentivised, and the
// Google rating is NEVER pre-filled (Google policy prohibits gated or
// incentivised reviews; ring-fencing only happy customers is "gating").
//
// Dismissal is persisted per order so the card can never nag twice; the
// click flag marks the order as already reviewed. Renders NOTHING when no
// Google review URL is configured — never a dead link.
export const reviewDismissedKey = (orderId) =>
  `arees:review-dismissed:${orderId || 'unknown'}`
export const reviewClickedKey = (orderId) =>
  `arees:review-clicked:${orderId || 'unknown'}`

const Star = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false">
    <path d="m12 2 3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77 5.82 21l1.18-6.88-5-4.87 6.91-1.01L12 2z" />
  </svg>
)

export default function ReviewPrompt({ placement = 'order-success', orderId }) {
  const [hidden, setHidden] = useState(true)
  const headingId = useId()

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

  const onReviewClick = () => {
    try {
      window.localStorage.setItem(reviewClickedKey(orderId), '1')
    } catch {
      /* ignore */
    }
    // Best-effort GA4 event — gtag is only loaded on desktop (async loader).
    if (typeof window.gtag === 'function') {
      window.gtag('event', 'google_review_click', { placement })
    }
  }

  return (
    <section
      className={`review-prompt review-prompt-${placement}`}
      aria-labelledby={headingId}
    >
      <div className="review-prompt-stars" aria-hidden="true">
        <Star />
        <Star />
        <Star />
        <Star />
        <Star />
      </div>
      <h3 id={headingId} className="review-prompt-heading">
        Loved your order?
      </h3>
      <p className="review-prompt-copy">
        A quick Google review helps other fragrance lovers in Chennai find us.
      </p>
      <a
        className="btn btn-gold review-prompt-cta"
        href={BUSINESS.googleReviewUrl}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Write a Google review (opens in a new tab)"
        onClick={onReviewClick}
      >
        Write a Google Review
      </a>
      <button type="button" className="review-prompt-dismiss" onClick={dismiss}>
        Not now
      </button>
    </section>
  )
}
