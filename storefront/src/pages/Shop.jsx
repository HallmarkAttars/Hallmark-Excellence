import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import ProductGrid from '../components/product/ProductGrid'
import Pagination from '../components/ui/Pagination'
import usePagination from '../hooks/usePagination'
import FilterSortControl from '../components/filter/FilterSortControl'
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

  const [categoryFilter, setCategoryFilter] = useState('all')
  const [brandFilter, setBrandFilter] = useState('all')
  const [sort, setSort] = useState('default')

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

  const visibleProducts = useMemo(() => {
    let list = [...products]
    if (categoryFilter !== 'all') list = list.filter((p) => p.category_id === categoryFilter)
    if (brandFilter !== 'all') list = list.filter((p) => p.brand_id === brandFilter)
    if (sort === 'newest') list.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0))
    if (sort === 'price-asc') list.sort((a, b) => a.price - b.price)
    if (sort === 'price-desc') list.sort((a, b) => b.price - a.price)
    if (sort === 'name-asc') list.sort((a, b) => a.name.localeCompare(b.name))
    if (sort === 'name-desc') list.sort((a, b) => b.name.localeCompare(a.name))
    return list
  }, [products, categoryFilter, brandFilter, sort])

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

  const activeCount =
    (categoryFilter !== 'all' ? 1 : 0) +
    (brandFilter !== 'all' ? 1 : 0) +
    (sort !== 'default' ? 1 : 0)

  return (
    <div className="shop-page">
      <div className="page-heading">
        <p className="eyebrow">{SHOP_PAGE.eyebrow}</p>
        <h1>{SHOP_PAGE.title}</h1>
        <p>{SHOP_PAGE.subtitle}</p>
      </div>

      <div className="container shop-layout">
        {/* Top bar with Filter & Sort */}
        <div className="shop-topbar">
          <FilterSortControl
            btnAriaLabel="Filters"
            dialogAriaLabel="Product filters"
            filterGroups={[
              {
                label: 'Category',
                options: categories,
                allLabel: 'All Categories',
                value: categoryFilter,
                onChange: toggleCategory,
              },
              ...(brands && brands.length > 0
                ? [
                    {
                      label: 'Brand',
                      options: brands,
                      allLabel: 'All Brands',
                      value: brandFilter,
                      onChange: toggleBrand,
                    },
                  ]
                : []),
            ]}
            sortValue={sort}
            onSortChange={(value) => {
              setSort(value)
              resetToFirstPage()
            }}
            activeCount={activeCount}
          />
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
    </div>
  )
}
