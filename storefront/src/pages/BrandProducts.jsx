import { useEffect, useMemo, useState } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import ProductGrid from '../components/product/ProductGrid'
import FilterSortControl from '../components/filter/FilterSortControl'
import Pagination from '../components/ui/Pagination'
import usePagination from '../hooks/usePagination'
import { getBrandBySlug, getProductsByBrand } from '../services/mockApi'
import { brandHeroImage } from '../data/content'
import './BrandProducts.css'

export default function BrandProducts() {
  const { slug } = useParams()
  const [searchParams, setSearchParams] = useSearchParams()
  const [brand, setBrand] = useState(null)
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [reloadKey, setReloadKey] = useState(0)
  // Category filter within this brand + client-side sort — same state shape
  // as the Shop / Category pages. 'all' = every product of this brand.
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [sort, setSort] = useState('default')

  useEffect(() => {
    setLoading(true)
    setError(null)
    setCategoryFilter('all')
    setSort('default')
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

  // Unique category names already present in the loaded products (no extra
  // query). Brand pages always keep their brand restriction — the filter
  // only narrows WITHIN this brand's loaded products.
  const categories = useMemo(() => {
    const seen = new Map()
    products.forEach((p) => {
      if (p.category_id && p.category_name && !seen.has(p.category_id)) {
        seen.set(p.category_id, { id: p.category_id, name: p.category_name })
      }
    })
    return Array.from(seen.values())
  }, [products])

  // Client-side filter + sort over the loaded array (same logic as Shop).
  // The brand restriction is inherent in `products` — never removed. 'default'
  // (Featured) keeps the existing product order untouched.
  const visibleProducts = useMemo(() => {
    let list = [...products]
    if (categoryFilter !== 'all') list = list.filter((p) => p.category_id === categoryFilter)
    if (sort === 'newest') list.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0))
    if (sort === 'price-asc') list.sort((a, b) => a.price - b.price)
    if (sort === 'price-desc') list.sort((a, b) => b.price - a.price)
    if (sort === 'name-asc') list.sort((a, b) => a.name.localeCompare(b.name))
    if (sort === 'name-desc') list.sort((a, b) => b.name.localeCompare(a.name))
    return list
  }, [products, categoryFilter, sort])

  // Client-side pagination over the filtered results: FILTER → SORT →
  // PAGINATE → render (only the current page's ≤50 products are rendered).
  // The page lives in the URL (?page=N) and the brand slug stays in the
  // path, so /brand/example-brand?page=2 always shows that brand's page 2.
  // Changing the category filter or sort resets to page 1.
  const {
    items: pageProducts,
    totalPages,
    currentPage,
    goToPage,
    resetToFirstPage,
  } = usePagination(searchParams, setSearchParams, visibleProducts, {
    scrollAnchorId: 'brand-product-grid',
    loading,
    error,
  })

  const brandName = brand?.name || 'Brand'
  // Active-state badge on the combined control — purely presentational.
  const activeCount = (categoryFilter !== 'all' ? 1 : 0) + (sort !== 'default' ? 1 : 0)
  // Brand hero banner background — resolved from the brand name (see
  // content.js BRAND_HERO_IMAGES). null keeps the plain dark header.
  const heroImage = brandHeroImage(brandName)

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
        {/* Combined FILTER & SORT — the SAME component as the Categories page
            (single source of truth), LEFT-aligned with the product grid. The
            category-filter + sort state above are the only source of truth;
            the component only presents them (mobile sheet / desktop popover).
            `key={slug}` remounts it per brand so its open state never leaks
            between brands. */}
        <div className="brand-toolbar">
          <FilterSortControl
            key={slug}
            filterLabel="Category"
            allLabel="All Categories"
            filterOptions={categories}
            filterValue={categoryFilter}
            onFilterChange={(id) => {
              setCategoryFilter((cur) => (cur === id ? 'all' : id))
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
            align="left"
          />
        </div>

        <div id="brand-product-grid" className="brand-grid-anchor">
          <ProductGrid
            products={pageProducts}
            loading={loading}
            error={error}
            onRetry={() => setReloadKey((k) => k + 1)}
            emptyMessage="No products from this brand yet."
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
