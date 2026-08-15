import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import ProductGrid from '../components/product/ProductGrid'
import Pagination from '../components/ui/Pagination'
import usePagination from '../hooks/usePagination'
import { getProducts, getCategories, getBrands } from '../services/mockApi'
import { useCart } from '../context/CartContext'
import { SHOP_PAGE } from '../data/content'
import './Shop.css'

export default function Shop() {
  // Brand bulk state — drives the "Bulk Unlocked" card badges live.
  const { brandBulk } = useCart()
  const [searchParams, setSearchParams] = useSearchParams()
  const [products, setProducts] = useState([])
  const [categories, setCategories] = useState([])
  const [brands, setBrands] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [reloadKey, setReloadKey] = useState(0)
  const [filtersOpen, setFiltersOpen] = useState(false)

  const [categoryFilter, setCategoryFilter] = useState('all')
  const [brandFilter, setBrandFilter] = useState('all')

  useEffect(() => {
    setLoading(true)
    setError(null)
    // Normal mounts reuse the shared 60s catalog cache (Home → Shop navigation
    // doesn't refetch). The "Try Again" retry forces a fresh network read so
    // it can never be served a stale cached failure.
    const refresh = reloadKey > 0
    Promise.all([getProducts({ refresh }), getCategories({ refresh }), getBrands({ refresh })])
      .then(([p, c, b]) => {
        setProducts(p)
        setCategories(c)
        setBrands(b)
        setLoading(false)
      })
      .catch((err) => {
        setError(err.message || 'Failed to load products.')
        setLoading(false)
      })
  }, [reloadKey])

  // Lock body scroll while drawer is open
  useEffect(() => {
    document.body.style.overflow = filtersOpen ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [filtersOpen])

  // Close drawer on ESC
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') setFiltersOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const visibleProducts = useMemo(() => {
    let list = [...products]
    if (categoryFilter !== 'all') list = list.filter((p) => p.category_id === categoryFilter)
    if (brandFilter !== 'all') list = list.filter((p) => p.brand_id === brandFilter)
    return list
  }, [products, categoryFilter, brandFilter])

  // Client-side pagination over the filtered results: FILTER → PAGINATE →
  // render (only the current page's ≤50 products are ever rendered). The
  // page lives in the URL (?page=N); out-of-range pages clamp to the last
  // valid page and the URL is corrected; every other query parameter is
  // preserved. See hooks/usePagination.js.
  const {
    items: pageProducts,
    totalPages,
    currentPage,
    goToPage,
    resetToFirstPage,
  } = usePagination(searchParams, setSearchParams, visibleProducts, {
    scrollAnchorId: 'shop-product-grid',
    loading,
    error,
  })

  // Category and Brand are mutually exclusive.
  // Selecting a category clears the brand; selecting a brand clears the category.
  const toggleCategory = (id) => {
    // Clicking the active category removes it; otherwise select it and clear the brand.
    setCategoryFilter((cur) => {
      const next = cur === id ? 'all' : id
      if (next !== 'all') setBrandFilter('all')
      return next
    })
    // A changed filter means a new result set — reset to page 1.
    resetToFirstPage()
  }

  const toggleBrand = (id) => {
    // Clicking the active brand removes it; otherwise select it and clear the category.
    setBrandFilter((cur) => {
      const next = cur === id ? 'all' : id
      if (next !== 'all') setCategoryFilter('all')
      return next
    })
    // A changed filter means a new result set — reset to page 1.
    resetToFirstPage()
  }

  return (
    <div className="shop-page">
      <div className="page-heading">
        <p className="eyebrow">{SHOP_PAGE.eyebrow}</p>
        <h1>{SHOP_PAGE.title}</h1>
        <p>{SHOP_PAGE.subtitle}</p>
      </div>

      <div className="container shop-layout">
        {/* Top bar */}
        <div className="shop-topbar">
          <button
            className="shop-filter-btn"
            onClick={() => setFiltersOpen(true)}
            aria-haspopup="dialog"
            aria-expanded={filtersOpen}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
            </svg>
            Filters
          </button>
        </div>

        <div id="shop-product-grid" className="shop-results">
          <ProductGrid
            products={pageProducts}
            loading={loading}
            error={error}
            onRetry={() => setReloadKey((k) => k + 1)}
            bulkUnlockedByBrand={brandBulk}
          />
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={goToPage}
          />
        </div>
      </div>

      {/* Backdrop */}
      {filtersOpen && (
        <div className="filter-backdrop" onClick={() => setFiltersOpen(false)} />
      )}

      {/* Filter Drawer */}
      <aside
        className={`filter-drawer ${filtersOpen ? 'is-open' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-hidden={!filtersOpen}
        aria-label="Product filters"
      >
        <div className="filter-drawer-header">
          <h2 className="filter-drawer-title">Filters</h2>
          <button
            className="filter-drawer-close"
            onClick={() => setFiltersOpen(false)}
            aria-label="Close filters"
          >
            ✕
          </button>
        </div>

        <div className="filter-drawer-body">
          {/* Category */}
          <div className="filter-card">
            <h3 className="filter-card-title">Category</h3>
            <div className="filter-rows">
              {categories.map((c) => (
                <button
                  type="button"
                  key={c.id}
                  className={`filter-row ${categoryFilter === c.id ? 'is-active' : ''}`}
                  onClick={() => toggleCategory(c.id)}
                >
                  {c.name}
                </button>
              ))}
            </div>
          </div>

          {/* Brand */}
          <div className="filter-card">
            <h3 className="filter-card-title">Brand</h3>
            <div className="filter-rows">
              {brands.map((b) => (
                <button
                  type="button"
                  key={b.id}
                  className={`filter-row ${brandFilter === b.id ? 'is-active' : ''}`}
                  onClick={() => toggleBrand(b.id)}
                >
                  {b.name}
                </button>
              ))}
            </div>
          </div>

        </div>
      </aside>
    </div>
  )
}

