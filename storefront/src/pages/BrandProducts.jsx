import { useEffect, useMemo, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import ProductGrid from '../components/product/ProductGrid'
import { getBrandBySlug, getProductsByBrand } from '../services/mockApi'
import { brandHeroImage } from '../data/content'
import './BrandProducts.css'

// Same client-side sort options as the Shop page — no backend, no extra reads.
const SORT_OPTIONS = [
  { value: 'default', label: 'Featured' },
  { value: 'newest', label: 'Newest' },
  { value: 'price-asc', label: 'Price Low to High' },
  { value: 'price-desc', label: 'Price High to Low' },
  { value: 'name-asc', label: 'A-Z' },
  { value: 'name-desc', label: 'Z-A' },
]

const Chevron = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <polyline points="6 9 12 15 18 9" />
  </svg>
)

// Sliders icon — the mobile combined FILTER & SORT control.
const SlidersIcon = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3" />
    <path d="M1 14h6M9 8h6M17 16h6" />
  </svg>
)

export default function BrandProducts() {
  const { slug } = useParams()
  const [brand, setBrand] = useState(null)
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [reloadKey, setReloadKey] = useState(0)
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [sort, setSort] = useState('default')
  const [openMenu, setOpenMenu] = useState(null) // 'filter' | 'sort' | null
  // Mobile-only: the combined FILTER & SORT bottom sheet.
  const [sheetOpen, setSheetOpen] = useState(false)
  const sheetRef = useRef(null)
  const combinedBtnRef = useRef(null)

  useEffect(() => {
    setLoading(true)
    setError(null)
    setCategoryFilter('all')
    setSort('default')
    setOpenMenu(null)
    setSheetOpen(false)
    Promise.all([getBrandBySlug(slug), getProductsByBrand(slug)])
      .then(([b, prods]) => {
        setBrand(b)
        setProducts(prods)
        setLoading(false)
      })
      .catch((err) => {
        setError(err.message || 'Failed to load products.')
        setLoading(false)
      })
  }, [slug, reloadKey])

  // Close open menu / bottom sheet on Escape
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') {
        setOpenMenu(null)
        setSheetOpen(false)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // Lock body scroll while the bottom sheet is open. If the viewport grows
  // to desktop (>=768px) while open — where the sheet is hidden — close it so
  // body scroll is never left locked with no visible sheet.
  useEffect(() => {
    document.body.style.overflow = sheetOpen ? 'hidden' : ''
    if (!sheetOpen) return undefined
    const mq = window.matchMedia('(min-width: 768px)')
    const onChange = (e) => {
      if (e.matches) setSheetOpen(false)
    }
    mq.addEventListener('change', onChange)
    return () => {
      document.body.style.overflow = ''
      mq.removeEventListener('change', onChange)
    }
  }, [sheetOpen])

  // Dialog focus management: focus the close button on open (so keyboard
  // users never tab behind the modal) and restore focus to the trigger on
  // close. On desktop the trigger is hidden, so focus() is a no-op there.
  useEffect(() => {
    if (sheetOpen) {
      const el = sheetRef.current?.querySelector('.brand-sheet-close')
      if (el) el.focus()
    } else if (combinedBtnRef.current) {
      combinedBtnRef.current.focus()
    }
  }, [sheetOpen])

  // Unique category names already present in the loaded products (no extra query).
  const categories = useMemo(() => {
    const seen = new Map()
    products.forEach((p) => {
      if (p.category_id && p.category_name && !seen.has(p.category_id)) {
        seen.set(p.category_id, p.category_name)
      }
    })
    return Array.from(seen, ([id, name]) => ({ id, name }))
  }, [products])

  // Client-side filter + sort over the loaded array (same logic as the Shop page).
  const visibleProducts = useMemo(() => {
    let list = [...products]
    if (categoryFilter !== 'all') list = list.filter((p) => p.category_id === categoryFilter)
    if (sort === 'price-asc') list.sort((a, b) => a.price - b.price)
    if (sort === 'price-desc') list.sort((a, b) => b.price - a.price)
    if (sort === 'name-asc') list.sort((a, b) => a.name.localeCompare(b.name))
    if (sort === 'name-desc') list.sort((a, b) => b.name.localeCompare(a.name))
    return list
  }, [products, categoryFilter, sort])

  const brandName = brand?.name || 'Brand'
  const activeSort = SORT_OPTIONS.find((o) => o.value === sort)?.label || 'Featured'
  // Active-state badge for the combined control — purely presentational;
  // the actual filter/sort state lives in categoryFilter / sort as before.
  const activeCount = (categoryFilter !== 'all' ? 1 : 0) + (sort !== 'default' ? 1 : 0)
  // Brand hero banner background — resolved from the brand name (see
  // content.js BRAND_HERO_IMAGES). null keeps the plain dark header.
  const heroImage = brandHeroImage(brandName)

  const toggleCategory = (id) => {
    setCategoryFilter((cur) => (cur === id ? 'all' : id))
    setOpenMenu(null)
  }
  const toggleSort = (value) => {
    setSort((cur) => (cur === value ? 'default' : value))
    setOpenMenu(null)
  }

  return (
    <div className="brand-page">
      {/* Compact premium collection header — the brand's hero image fills the
          background (subtle dark overlay keeps the text readable); the plain
          dark header remains when the brand has no image. */}
      <header
        className="brand-header"
        style={heroImage ? { backgroundImage: `url('${heroImage}')` } : undefined}
      >
        {brand && (
          <>
            <p className="brand-header-label">{brandName} Collection</p>
            <h1>{brandName}</h1>
            <p className="brand-header-desc">
              {brand?.tagline || `Discover the complete ${brandName} fragrance collection.`}
            </p>
          </>
        )}
      </header>

      <div className="container brand-body">
        {/* Toolbar: client-side filter/sort only (the product count was
            removed from the UI per product decision). Mobile shows ONE
            combined FILTER & SORT control that opens the bottom sheet;
            desktop/tablet keep the two separate dropdown controls below. */}
        <div className="brand-toolbar">
          {/* Mobile-only combined control */}
          <button
            type="button"
            ref={combinedBtnRef}
            className="brand-combined-btn"
            onClick={() => setSheetOpen(true)}
            aria-haspopup="dialog"
            aria-expanded={sheetOpen}
          >
            <SlidersIcon />
            <span className="brand-combined-label">
              Filter &amp; Sort
              {activeCount > 0 && (
                <span className="brand-combined-badge" aria-label={`${activeCount} active`}>
                  {activeCount}
                </span>
              )}
            </span>
            <Chevron />
          </button>

          <div className="brand-toolbar-actions">
            {categories.length > 0 && (
              <div className="brand-menu">
                <button
                  type="button"
                  className={`brand-menu-btn ${categoryFilter !== 'all' ? 'is-active' : ''}`}
                  onClick={() => setOpenMenu((m) => (m === 'filter' ? null : 'filter'))}
                  aria-haspopup="menu"
                  aria-expanded={openMenu === 'filter'}
                >
                  {categoryFilter !== 'all' ? 'Filtered' : 'Filter'}
                  <Chevron />
                </button>
                {openMenu === 'filter' && (
                  <ul className="brand-menu-list" role="menu" aria-label="Filter by category">
                    <li>
                      <button
                        type="button"
                        role="menuitem"
                        className={categoryFilter === 'all' ? 'is-active' : ''}
                        onClick={() => toggleCategory('all')}
                      >
                        All Categories
                      </button>
                    </li>
                    {categories.map((c) => (
                      <li key={c.id}>
                        <button
                          type="button"
                          role="menuitem"
                          className={categoryFilter === c.id ? 'is-active' : ''}
                          onClick={() => toggleCategory(c.id)}
                        >
                          {c.name}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            <div className="brand-menu">
              <button
                type="button"
                className="brand-menu-btn"
                onClick={() => setOpenMenu((m) => (m === 'sort' ? null : 'sort'))}
                aria-haspopup="menu"
                aria-expanded={openMenu === 'sort'}
              >
                Sort: {activeSort}
                <Chevron />
              </button>
              {openMenu === 'sort' && (
                <ul className="brand-menu-list" role="menu" aria-label="Sort products">
                  {SORT_OPTIONS.map((opt) => (
                    <li key={opt.value}>
                      <button
                        type="button"
                        role="menuitem"
                        className={sort === opt.value ? 'is-active' : ''}
                        onClick={() => toggleSort(opt.value)}
                      >
                        {opt.label}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>

        <div id="brand-product-grid" className="brand-grid-anchor">
          <ProductGrid
            products={visibleProducts}
            loading={loading}
            error={error}
            onRetry={() => setReloadKey((k) => k + 1)}
            emptyMessage="No products from this brand yet."
          />
        </div>
      </div>

      {/* Click-outside to close the open menu */}
      {openMenu && <div className="brand-menu-backdrop" onClick={() => setOpenMenu(null)} />}

      {/* Mobile bottom sheet — ONE entry point to the EXISTING category
          filter and sort options (the same state/handlers as the desktop
          dropdowns; selections apply instantly, APPLY just closes). */}
      <div
        ref={sheetRef}
        className={`brand-sheet${sheetOpen ? ' is-open' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-hidden={!sheetOpen}
        aria-label="Filter and sort"
      >
        <div className="brand-sheet-header">
          <h2>Filter &amp; Sort</h2>
          <button
            type="button"
            className="brand-sheet-close"
            onClick={() => setSheetOpen(false)}
            aria-label="Close filter and sort"
          >
            ✕
          </button>
        </div>

        <div className="brand-sheet-body">
          <section className="brand-sheet-section">
            <h3>Filter</h3>
            {categories.length > 0 ? (
              <div className="brand-sheet-group">
                <p className="brand-sheet-group-title">Category</p>
                <div className="brand-sheet-options">
                  <button
                    type="button"
                    className={categoryFilter === 'all' ? 'is-active' : ''}
                    onClick={() => toggleCategory('all')}
                  >
                    All Categories
                  </button>
                  {categories.map((c) => (
                    <button
                      type="button"
                      key={c.id}
                      className={categoryFilter === c.id ? 'is-active' : ''}
                      onClick={() => toggleCategory(c.id)}
                    >
                      {c.name}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <p className="brand-sheet-note">No category filters for this collection.</p>
            )}
          </section>

          <section className="brand-sheet-section">
            <h3>Sort By</h3>
            <div className="brand-sheet-options">
              {SORT_OPTIONS.map((opt) => (
                <button
                  type="button"
                  key={opt.value}
                  className={sort === opt.value ? 'is-active' : ''}
                  onClick={() => toggleSort(opt.value)}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </section>
        </div>

        <div className="brand-sheet-footer">
          <button type="button" className="brand-sheet-apply" onClick={() => setSheetOpen(false)}>
            Apply Filters
          </button>
        </div>
      </div>
      {sheetOpen && (
        <div className="brand-sheet-backdrop" onClick={() => setSheetOpen(false)} />
      )}
    </div>
  )
}
