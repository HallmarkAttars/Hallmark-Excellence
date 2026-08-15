import { useEffect, useMemo, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import ProductGrid from '../components/product/ProductGrid'
import FilterSortControl from '../components/filter/FilterSortControl'
import Pagination from '../components/ui/Pagination'
import usePagination from '../hooks/usePagination'
import { getCategoryBySlug, getProductsByCategory } from '../services/mockApi'
import './CategoryProducts.css'

export default function CategoryProducts() {
  const { slug } = useParams()
  const [searchParams, setSearchParams] = useSearchParams()
  const [category, setCategory] = useState(null)
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [reloadKey, setReloadKey] = useState(0)
  // Brand filter within this category (products carry brand_id/brand_name)
  // + client-side sort — same state shape as the Shop/Brand pages.
  const [brandFilter, setBrandFilter] = useState('all')
  const [sort, setSort] = useState('default')

  useEffect(() => {
    setLoading(true)
    setError(null)
    setBrandFilter('all')
    setSort('default')
    Promise.all([getCategoryBySlug(slug), getProductsByCategory(slug)])
      .then(([cat, prods]) => {
        setCategory(cat)
        setProducts(prods)
        setLoading(false)
      })
      .catch((err) => {
        setError(err.message || 'Failed to load products.')
        setLoading(false)
      })
  }, [slug, reloadKey])

  // Unique brands already present in the loaded products (no extra query).
  const brands = useMemo(() => {
    const seen = new Map()
    products.forEach((p) => {
      if (p.brand_id && p.brand_name && !seen.has(p.brand_id)) {
        seen.set(p.brand_id, { id: p.brand_id, name: p.brand_name })
      }
    })
    return Array.from(seen.values())
  }, [products])

  // Client-side filter + sort over the loaded array (same logic as Shop).
  // 'default' (Featured) keeps the existing product order untouched.
  const visibleProducts = useMemo(() => {
    let list = [...products]
    if (brandFilter !== 'all') list = list.filter((p) => p.brand_id === brandFilter)
    if (sort === 'newest') list.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0))
    if (sort === 'price-asc') list.sort((a, b) => a.price - b.price)
    if (sort === 'price-desc') list.sort((a, b) => b.price - a.price)
    if (sort === 'name-asc') list.sort((a, b) => a.name.localeCompare(b.name))
    if (sort === 'name-desc') list.sort((a, b) => b.name.localeCompare(a.name))
    return list
  }, [products, brandFilter, sort])

  // Client-side pagination over the filtered results: FILTER → SORT →
  // PAGINATE → render (only the current page's ≤50 products are rendered).
  // The page lives in the URL (?page=N) and the category slug stays in the
  // path, so /categories/attar?page=2 always shows Attar page 2. Changing
  // the brand filter or sort resets to page 1.
  const {
    items: pageProducts,
    totalPages,
    currentPage,
    goToPage,
    resetToFirstPage,
  } = usePagination(searchParams, setSearchParams, visibleProducts, {
    scrollAnchorId: 'category-product-grid',
    loading,
    error,
  })

  // Active-state badge on the combined control — purely presentational.
  const activeCount = (brandFilter !== 'all' ? 1 : 0) + (sort !== 'default' ? 1 : 0)

  return (
    <div className="category-page">
      {/* Premium category header — back link + large serif title */}
      <header className="category-hero">
        <Link to="/categories" className="category-hero-back">
          <span className="category-hero-back-arrow" aria-hidden="true">←</span> All Categories
        </Link>
        <h1>{category ? category.name : 'Category'}</h1>
        <span className="category-hero-rule" aria-hidden="true" />
      </header>

      <div className="container category-body">
        {/* Combined FILTER & SORT control — same premium component as the
            Brand pages. Centered on the category page. The brand-filter and
            sort state above are the only source of truth; this component
            only presents them (mobile bottom sheet / desktop popover). */}
        <div className="category-toolbar">
          <FilterSortControl
            key={slug}
            filterLabel="Brand"
            allLabel="All Brands"
            filterOptions={brands}
            filterValue={brandFilter}
            onFilterChange={(id) => {
              setBrandFilter((cur) => (cur === id ? 'all' : id))
              // A changed filter means a new result set — reset to page 1.
              resetToFirstPage()
            }}
            sortValue={sort}
            onSortChange={(value) => {
              setSort(value)
              // A changed sort reorders the results — reset to page 1.
              resetToFirstPage()
            }}
            activeCount={activeCount}
            align="center"
          />
        </div>

        <div id="category-product-grid" className="category-grid-anchor">
          <ProductGrid
            products={pageProducts}
            loading={loading}
            error={error}
            onRetry={() => setReloadKey((k) => k + 1)}
            emptyMessage="No products in this category yet."
          />
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={goToPage}
          />
        </div>
      </div>
    </div>
  )
}
