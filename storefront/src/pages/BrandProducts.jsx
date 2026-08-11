import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import ProductGrid from '../components/product/ProductGrid'
import { getBrandBySlug, getProductsByBrand } from '../services/mockApi'
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

  useEffect(() => {
    setLoading(true)
    setError(null)
    setCategoryFilter('all')
    setSort('default')
    setOpenMenu(null)
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

  // Close open menu on Escape
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') setOpenMenu(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

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
      {/* Compact premium collection header (hidden until brand loads — no flash) */}
      <header className="brand-header">
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
        {/* Toolbar: real product count + client-side filter/sort */}
        <div className="brand-toolbar">
          <p className="brand-count">
            {products.length} <span>Products</span>
          </p>

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
    </div>
  )
}
