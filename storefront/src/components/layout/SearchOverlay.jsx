import { useEffect, useMemo, useRef, useState } from 'react'
import { getProducts } from '../../services/mockApi'
import ProductCard from '../product/ProductCard'
import './SearchOverlay.css'

const SUGGESTIONS = ['Attar', 'Oud', 'Musk', 'Bakhoor']

export default function SearchOverlay({ open, onClose }) {
  const [query, setQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('')
  const [sortBy, setSortBy] = useState('featured')
  const [loading, setLoading] = useState(false)
  const [ready, setReady] = useState(false)
  const allProducts = useRef([])
  const inputRef = useRef(null)

  // Load real products once, the first time search is opened.
  useEffect(() => {
    if (!open) return
    setQuery('')
    setSelectedCategory('')
    setSortBy('featured')
    if (allProducts.current.length === 0) {
      setLoading(true)
      getProducts()
        .then((p) => {
          allProducts.current = Array.isArray(p) ? p : []
          setReady(true)
        })
        .catch(() => {
          // Load failed — search simply has nothing to offer yet.
          allProducts.current = []
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

  // Extract unique categories from catalog
  const categories = useMemo(() => {
    const set = new Set()
    allProducts.current.forEach((p) => {
      if (p.category_name) set.add(p.category_name)
    })
    return Array.from(set).sort()
  }, [ready])

  const results = useMemo(() => {
    const list = allProducts.current
    const q = query.trim().toLowerCase()

    let filtered = list
    if (q) {
      filtered = filtered.filter(
        (p) =>
          (p.name || '').toLowerCase().includes(q) ||
          (p.category_name || '').toLowerCase().includes(q) ||
          (p.brand_name || '').toLowerCase().includes(q)
      )
    } else {
      // If no query, show featured / top items as preview
      filtered = list.slice(0, 8)
    }

    if (selectedCategory) {
      filtered = filtered.filter((p) => p.category_name === selectedCategory)
    }

    if (sortBy === 'rating') {
      filtered = [...filtered].sort(
        (a, b) => (Number(b.rating) || 0) - (Number(a.rating) || 0)
      )
    } else if (sortBy === 'name-asc') {
      filtered = [...filtered].sort((a, b) =>
        (a.name || '').localeCompare(b.name || '')
      )
    } else if (sortBy === 'featured') {
      filtered = [...filtered].sort(
        (a, b) => (b.is_featured ? 1 : 0) - (a.is_featured ? 1 : 0)
      )
    }

    return filtered
  }, [query, selectedCategory, sortBy, open, ready])

  const handleClear = () => {
    setQuery('')
    inputRef.current?.focus()
  }

  const handleSuggestionClick = (term) => {
    setQuery(term)
    inputRef.current?.focus()
  }

  return (
    <div
      className={`search-overlay ${open ? 'is-open' : ''}`}
      role="dialog"
      aria-modal="true"
      aria-label="Search products"
      aria-hidden={!open}
    >
      <div className="search-overlay-head">
        <p className="eyebrow">Search</p>
        <button
          type="button"
          className="navbar-icon-btn search-overlay-close"
          onClick={onClose}
          aria-label="Close search"
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            aria-hidden="true"
          >
            <path d="M5 5l14 14M19 5 5 19" />
          </svg>
        </button>
      </div>

      <form
        className="search-overlay-form"
        role="search"
        onSubmit={(e) => e.preventDefault()}
      >
        <span className="search-overlay-icon" aria-hidden="true">
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          >
            <circle cx="11" cy="11" r="7" />
            <path d="m20.5 20.5-4-4" />
          </svg>
        </span>
        <input
          ref={inputRef}
          type="search"
          className="search-overlay-input"
          placeholder="Search attars, oud, musk…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Search products"
        />
        {query && (
          <button
            type="button"
            className="search-overlay-clear"
            onClick={handleClear}
            aria-label="Clear search query"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              aria-hidden="true"
            >
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        )}
      </form>

      {/* Dynamic Results Context & Filters */}
      {query.trim() && !loading && results.length > 0 && (
        <div className="search-results-context">
          <div className="search-results-meta">
            <h2 className="search-results-title">
              Search results for{' '}
              <span className="search-query-term">"{query.trim()}"</span>
            </h2>
            <span className="search-results-count">
              {results.length} {results.length === 1 ? 'product' : 'products'}
            </span>
          </div>

          <div className="search-filters-row">
            {categories.length > 0 && (
              <div className="search-filter-wrap">
                <select
                  className="search-filter-select"
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  aria-label="Filter by category"
                >
                  <option value="">All Categories</option>
                  {categories.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
                <span className="search-select-arrow" aria-hidden="true">
                  ▾
                </span>
              </div>
            )}

            <div className="search-filter-wrap">
              <select
                className="search-filter-select"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                aria-label="Sort products"
              >
                <option value="featured">Featured</option>
                <option value="rating">Top Rated</option>
                <option value="name-asc">Name: A to Z</option>
              </select>
              <span className="search-select-arrow" aria-hidden="true">
                ▾
              </span>
            </div>
          </div>
        </div>
      )}

      <div className="search-overlay-results">
        {loading ? (
          <div
            className="search-skeleton-grid"
            aria-label="Loading search results"
          >
            {[1, 2, 3, 4].map((n) => (
              <div key={n} className="search-skeleton-card">
                <div className="search-skeleton-media shimmer" />
                <div className="search-skeleton-line short shimmer" />
                <div className="search-skeleton-line title shimmer" />
                <div className="search-skeleton-btn shimmer" />
              </div>
            ))}
          </div>
        ) : results.length === 0 ? (
          <div className="search-empty-state">
            <p className="search-empty-title">No fragrances found</p>
            <p className="search-empty-subtitle">Try searching for:</p>
            <div className="search-suggestions-chips">
              {SUGGESTIONS.map((term) => (
                <button
                  key={term}
                  type="button"
                  className="search-suggestion-chip"
                  onClick={() => handleSuggestionClick(term)}
                >
                  {term}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="search-overlay-grid">
            {results.map((p) => (
              <ProductCard key={p.id} product={p} onNavigate={onClose} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
