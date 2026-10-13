import { useEffect, useMemo, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import ProductGrid from '../components/product/ProductGrid'
import FilterSortControl from '../components/filter/FilterSortControl'
import Pagination from '../components/ui/Pagination'
import usePagination from '../hooks/usePagination'
import { getCategoryBySlug, getProductsByCategory } from '../services/mockApi'
import SEO from '../components/seo/SEO'
import { buildBreadcrumbsSchema } from '../utils/seo'
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

  const catName = category?.name || 'Category'
  const lowerSlug = String(slug || '').toLowerCase().trim()

  let seoTitle = `${catName} | Pure Attars & Fragrance Oils | Arees Perfumes`
  let seoDesc = category?.description || `Explore authentic ${catName} at Arees Perfumes. 100% alcohol-free concentrated oils and traditional fragrances delivered across India.`
  let introDesc = category?.description || null

  if (lowerSlug.includes('fragrance') || lowerSlug.includes('oil')) {
    seoTitle = 'Fragrance Oils & Pure Concentrated Attars | Arees Perfumes'
    seoDesc = 'Discover premium fragrance oils and concentrated attars by Arees Perfumes. Artisanal alcohol-free perfume oils crafted for daily wear and distinctive longevity.'
    introDesc = introDesc || 'Explore our comprehensive selection of concentrated fragrance oils and traditional attars. Each blend is formulated without alcohol, delivering authentic scent throw, rich skin warmth, and all-day longevity.'
  } else if (lowerSlug.includes('roll') || lowerSlug.includes('pocket')) {
    seoTitle = 'Roll-On Attars & Pocket Perfumes | Alcohol-Free Oils | Arees Perfumes'
    seoDesc = 'Shop pocket-friendly roll-on attars and pure perfume oils from Arees and Dahab. Convenient rollerballs, travel-ready sizes, and intense fragrance oils.'
    introDesc = introDesc || 'Convenient, travel-ready roll-on attars designed for effortless touch-ups throughout the day. Handcrafted with concentrated, skin-friendly essential oils that last for hours.'
  } else if (lowerSlug.includes('bakhoor') || lowerSlug.includes('bukhoor')) {
    seoTitle = 'Bakhoor & Traditional Incense Fragrances | Arees Perfumes'
    seoDesc = 'Artisanal Bakhoor, scented wood chips, and oriental incense by Arees Perfumes. Infuse your living spaces and garments with rich Arabian oud and amber aromas.'
    introDesc = introDesc || 'Immerse your spaces in oriental luxury with Arees artisanal bakhoor. Formulated with aromatic wood chips, precious resins, and pure fragrance oils.'
  } else if (lowerSlug.includes('display') || lowerSlug.includes('bottle')) {
    seoTitle = 'Attar Display Bottles & Crystal Vials | Arees Perfumes'
    seoDesc = 'Elegant attar display bottles, crystal perfume flacons, and traditional applicators. Perfect for vanity displays, gifts, and bespoke fragrance oils.'
    introDesc = introDesc || 'Finely crafted glass and crystal display bottles for attars and concentrated oils. Featuring glass wand applicators and airtight caps.'
  }

  const breadcrumbs = [
    { name: 'Home', path: '/' },
    { name: 'Categories', path: '/categories' },
    { name: catName, path: `/categories/${slug}` },
  ]

  return (
    <div className="category-page">
      <SEO
        title={seoTitle}
        description={seoDesc}
        canonical={`/categories/${slug}`}
        schema={buildBreadcrumbsSchema(breadcrumbs)}
      />
      {/* Premium category header — back link + large serif title */}
      <header className="category-hero">
        <Link to="/categories" className="category-hero-back">
          <span className="category-hero-back-arrow" aria-hidden="true">←</span> All Categories
        </Link>
        <h1>{category ? category.name : 'Category'}</h1>
        {introDesc && <p className="category-hero-desc">{introDesc}</p>}
        <span className="category-hero-rule" aria-hidden="true" />
      </header>

      <div className="container category-body">
        {/* Combined FILTER & SORT control — same premium component as the
            Brand pages. LEFT-aligned with the product grid (alignment is
            fixed inside the shared component). The brand-filter and sort
            state above are the only source of truth; this component only
            presents them (mobile bottom sheet / desktop popover). */}
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
