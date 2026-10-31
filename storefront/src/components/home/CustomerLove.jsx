import { useEffect, useState } from 'react'
import { api } from '../../services/api'
import './CustomerLove.css'

// Home "customer love" strip — real reviews collected from the order
// tracking page, surfaced only after admin moderation. The server endpoint
// (/reviews/public) already filters to approved + display-consented rows and
// strips names to the first name; this component renders nothing at all
// until at least one review exists, so an empty program never shows a gap.
export default function CustomerLove() {
  const [reviews, setReviews] = useState([])

  useEffect(() => {
    let alive = true
    api
      .get('/reviews/public')
      .then((data) => {
        if (alive) setReviews(data?.reviews ?? [])
      })
      .catch(() => {
        // The strip is decorative trust-building; a failed fetch should
        // simply hide it, never break the home page.
        if (alive) setReviews([])
      })
    return () => {
      alive = false
    }
  }, [])

  if (reviews.length === 0) return null

  return (
    <section className="customer-love-section" aria-label="Customer reviews">
      <div className="container">
        <div className="customer-love-head">
          <p className="customer-love-eyebrow">From Verified Customers</p>
          <h2 className="customer-love-title">Real Words, Real Customers</h2>
          <p className="customer-love-sub">
            Verified reviews from delivered orders — collected on this site after
            each parcel reached its owner.
          </p>
        </div>

        <div className="customer-love-grid">
          {reviews.map((r, idx) => (
            <figure className="customer-love-card" key={idx}>
              <span
                className="customer-love-stars"
                role="img"
                aria-label={`${r.rating} out of 5 stars`}
              >
                {[1, 2, 3, 4, 5].map((n) => (
                  <svg
                    key={n}
                    width="15"
                    height="15"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    aria-hidden="true"
                    className={n <= r.rating ? 'is-on' : 'is-off'}
                  >
                    <path d="m12 2 3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77 5.82 21l1.18-6.88-5-4.87 6.91-1.01L12 2z" />
                  </svg>
                ))}
              </span>
              <blockquote className="customer-love-text">{r.review_text}</blockquote>
              <figcaption className="customer-love-name">— {r.first_name}</figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  )
}
