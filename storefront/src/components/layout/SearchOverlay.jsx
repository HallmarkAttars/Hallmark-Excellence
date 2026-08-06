import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { getProducts } from '../../services/mockApi'
import './SearchOverlay.css'

export default function SearchOverlay({ open, onClose }) {
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [ready, setReady] = useState(false)
  const allProducts = useRef([])
  const inputRef = useRef(null)

  // Load real products once, the first time search is opened.
  useEffect(() => {
    if (!open) return
    setQuery('')
    if (allProducts.current.length === 0) {
      setLoading(true)
      getProducts()
        .then((p) => {
          allProducts.current = Array.isArray(p) ? p : []
          setReady(true)
        })
        .finally(() => setLoading(false))
    }
  }, [open])

  // Focus the input when opened.
  useEffect(() => {
    if (open) {
      const t = setTimeout(() => inputRef.current?.focus(), 60)
      return () => clearTimeout(t)
    }
  }, [open])

  // Close on Escape.
  useEffect(() => {
    if (!open) return
    const onKey = (e) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  const results = useMemo(() => {
    const list = allProducts.current
    const q = query.trim().toLowerCase()
    if (!q) return list.slice(0, 6)
    return list
      .filter((p) => (p.name || '').toLowerCase().includes(q))
      .slice(0, 8)
  }, [query, open, ready])

  const formatPrice = (price) => `₹${Number(price).toLocaleString('en-IN')}`

  return (
    <div className={`search-overlay ${open ? 'is-open' : ''}`} role="dialog" aria-modal="true" aria-label="Search products" aria-hidden={!open}>
      <div className="search-overlay-head">
        <p className="eyebrow">Search</p>
        <button type="button" className="navbar-icon-btn" onClick={onClose} aria-label="Close search">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden="true">
            <path d="M5 5l14 14M19 5 5 19" />
          </svg>
        </button>
      </div>

      <form
        className="search-overlay-form"
        role="search"
        onSubmit={(e) => e.preventDefault()}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden="true">
          <circle cx="11" cy="11" r="7" />
          <path d="m20.5 20.5-4-4" />
        </svg>
        <input
          ref={inputRef}
          type="search"
          className="search-overlay-input"
          placeholder="Search attars, oud, musk…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Search products"
        />
      </form>

      <div className="search-overlay-results">
        {loading ? (
          <p className="search-overlay-note">Loading products…</p>
        ) : results.length === 0 ? (
          <p className="search-overlay-note">
            {query.trim() ? 'No products match your search.' : 'Start typing to find your scent.'}
          </p>
        ) : (
          <ul className="search-overlay-list">
            {results.map((p) => (
              <li key={p.id}>
                <Link to={`/product/${p.id}`} className="search-result" onClick={onClose}>
                  <span className="search-result-image">
                    {p.image && <img src={p.image} alt="" loading="lazy" />}
                  </span>
                  <span className="search-result-info">
                    <span className="search-result-name">{p.name}</span>
                    <span className="search-result-price">{formatPrice(p.price)}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
