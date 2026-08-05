import { useEffect, useMemo, useState } from 'react'
import ProductGrid from '../components/product/ProductGrid'
import { getProducts, getCategories, getBrands } from '../services/mockApi'
import './Shop.css'

const SORT_OPTIONS = [
  { value: 'default', label: 'Featured' },
  { value: 'newest', label: 'Newest' },
  { value: 'price-asc', label: 'Price Low to High' },
  { value: 'price-desc', label: 'Price High to Low' },
  { value: 'name-asc', label: 'A-Z' },
  { value: 'name-desc', label: 'Z-A' },
]

export default function Shop() {
  const [products, setProducts] = useState([])
  const [categories, setCategories] = useState([])
  const [brands, setBrands] = useState([])
  const [loading, setLoading] = useState(true)
  const [filtersOpen, setFiltersOpen] = useState(false)

  const [categoryFilter, setCategoryFilter] = useState('all')
  const [brandFilter, setBrandFilter] = useState('all')
  const [sort, setSort] = useState('default')

  useEffect(() => {
    setLoading(true)
    Promise.all([getProducts(), getCategories(), getBrands()]).then(
      ([p, c, b]) => {
        setProducts(p)
        setCategories(c)
        setBrands(b)
        setLoading(false)
      }
    )
  }, [])

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
    if (sort === 'price-asc') list.sort((a, b) => a.price - b.price)
    if (sort === 'price-desc') list.sort((a, b) => b.price - a.price)
    if (sort === 'name-asc') list.sort((a, b) => a.name.localeCompare(b.name))
    if (sort === 'name-desc') list.sort((a, b) => b.name.localeCompare(a.name))
    // 'default' and 'newest' keep original order
    return list
}, [products, categoryFilter, brandFilter, sort])

  // Category and Brand are mutually exclusive.
  // Selecting a category clears the brand; selecting a brand clears the category.
  // Sort is independent and always co-occurs with a category or brand.
  const toggleCategory = (id) => {
    // Clicking the active category removes it; otherwise select it and clear the brand.
    setCategoryFilter((cur) => {
      const next = cur === id ? 'all' : id
      if (next !== 'all') setBrandFilter('all')
      return next
    })
  }

  const toggleBrand = (id) => {
    // Clicking the active brand removes it; otherwise select it and clear the category.
    setBrandFilter((cur) => {
      const next = cur === id ? 'all' : id
      if (next !== 'all') setCategoryFilter('all')
      return next
    })
  }

  const toggleSort = (value) => setSort((cur) => (cur === value ? 'default' : value))

  return (
    <div>
      <div className="page-heading">
        <p className="eyebrow">Full Collection</p>
        <h1>Shop All Attars</h1>
        <p>Browse every fragrance from Arees and Dahab, filtered your way.</p>
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
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
            </svg>
            Filters
          </button>
        </div>

        <div className="shop-results">
          <ProductGrid products={visibleProducts} loading={loading} />
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

          {/* Sort By */}
          <div className="filter-card">
            <h3 className="filter-card-title">Sort By</h3>
            <div className="filter-rows">
              {SORT_OPTIONS.map((opt) => (
                <button
                  type="button"
                  key={opt.value}
                  className={`filter-row ${sort === opt.value ? 'is-active' : ''}`}
                  onClick={() => toggleSort(opt.value)}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </aside>
    </div>
  )
}
