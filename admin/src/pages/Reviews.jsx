import { useEffect, useState } from 'react'
import { getReviews, moderateReview, deleteReview } from '../services/mockApi'
import { useAuth } from '../context/AuthContext'
import './Reviews.css'

const TABS = [
  { key: 'pending', label: 'Pending' },
  { key: 'approved', label: 'Approved' },
  { key: 'rejected', label: 'Rejected' },
  { key: 'all', label: 'All' },
]

function Stars({ rating }) {
  return (
    <span className="reviews-stars" aria-label={`${rating} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <svg
          key={n}
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="currentColor"
          aria-hidden="true"
          className={n <= rating ? 'is-on' : 'is-off'}
        >
          <path d="m12 2 3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77 5.82 21l1.18-6.88-5-4.87 6.91-1.01L12 2z" />
        </svg>
      ))}
    </span>
  )
}

function reviewDate(iso) {
  if (!iso) return '—'
  try {
    return new Intl.DateTimeFormat('en-IN', {
      timeZone: 'Asia/Kolkata',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    }).format(new Date(iso))
  } catch {
    return String(iso)
  }
}

export default function Reviews() {
  const { can } = useAuth()
  const canModerate = can('reviews.moderate')
  const canDelete = can('reviews.delete')

  const [statusFilter, setStatusFilter] = useState('pending')
  const [reviews, setReviews] = useState([])
  const [counts, setCounts] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [busyId, setBusyId] = useState(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState(null)

  const load = () => {
    setLoading(true)
    setError('')
    getReviews(statusFilter)
      .then(({ reviews: rows, counts: c }) => {
        setReviews(rows)
        setCounts(c)
        setLoading(false)
      })
      .catch(() => {
        setError('Could not load reviews. Please try again.')
        setLoading(false)
      })
  }

  useEffect(load, [statusFilter])

  const act = async (id, action) => {
    setBusyId(id)
    setError('')
    try {
      if (action === 'delete') {
        await deleteReview(id)
      } else {
        await moderateReview(id, action)
      }
      load()
    } catch (err) {
      setError(err?.message || 'Action failed. Please try again.')
    } finally {
      setBusyId(null)
      setConfirmDeleteId(null)
    }
  }

  const countFor = (key) => (counts[key] != null ? ` (${counts[key]})` : '')

  return (
    <div className="reviews-page">
      <div className="page-heading">
        <h1>Customer Reviews</h1>
        <p>
          Reviews submitted by customers from the order tracking page after
          delivery. Only APPROVED reviews with the customer's display consent may
          appear on the storefront. This moderation protects against spam and
          never selects only positive reviews.
        </p>
      </div>

      <div className="reviews-tabs" role="tablist" aria-label="Review status filter">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            role="tab"
            aria-selected={statusFilter === t.key}
            className={`reviews-tab${statusFilter === t.key ? ' is-active' : ''}`}
            onClick={() => setStatusFilter(t.key)}
          >
            {t.label}
            {t.key !== 'all' ? countFor(t.key) : ''}
          </button>
        ))}
      </div>

      {error && <p className="reviews-error" role="alert">{error}</p>}

      {loading ? (
        <p className="reviews-loading">Loading reviews…</p>
      ) : reviews.length === 0 ? (
        <p className="reviews-empty">
          No {statusFilter === 'all' ? '' : statusFilter + ' '}reviews yet.
        </p>
      ) : (
        <ul className="reviews-list">
          {reviews.map((r) => (
            <li key={r.id} className={`reviews-item is-${r.status}`}>
              <div className="reviews-item-head">
                <Stars rating={Number(r.rating) || 0} />
                <span className="reviews-order">#{r.order_number}</span>
                <span
                  className={`reviews-status reviews-status-${r.status}`}
                >
                  {r.status}
                </span>
              </div>

              {r.review_text && (
                <p className="reviews-text">{r.review_text}</p>
              )}

              <div className="reviews-meta">
                <span>
                  {(r.customer_name || 'Customer').split(' ')[0]}{' '}
                  {!r.consent_show && <em>(no display consent)</em>}
                </span>
                <span>{reviewDate(r.created_at)}</span>
                {r.moderated_by && <span>by {r.moderated_by}</span>}
              </div>

              <div className="reviews-actions">
                {canModerate && r.status !== 'approved' && (
                  <button
                    type="button"
                    className="reviews-approve"
                    disabled={busyId === r.id}
                    onClick={() => act(r.id, 'approved')}
                  >
                    {busyId === r.id ? 'Working…' : 'Approve'}
                  </button>
                )}
                {canModerate && r.status !== 'rejected' && (
                  <button
                    type="button"
                    className="reviews-reject"
                    disabled={busyId === r.id}
                    onClick={() => act(r.id, 'rejected')}
                  >
                    Reject
                  </button>
                )}
                {canDelete && (
                  confirmDeleteId === r.id ? (
                    <button
                      type="button"
                      className="reviews-delete-confirm"
                      disabled={busyId === r.id}
                      onClick={() => act(r.id, 'delete')}
                    >
                      Confirm delete?
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="reviews-delete"
                      disabled={busyId === r.id}
                      onClick={() => setConfirmDeleteId(r.id)}
                    >
                      Delete
                    </button>
                  )
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
