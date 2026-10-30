import { useEffect, useMemo, useState } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import ProductGrid from '../components/product/ProductGrid'
import FilterSortControl from '../components/filter/FilterSortControl'
import Pagination from '../components/ui/Pagination'
import usePagination from '../hooks/usePagination'
import { getBrandBySlug, getProductsByBrand } from '../services/mockApi'
import { brandHeroImage } from '../data/content'
import SEO from '../components/seo/SEO'
import { buildBrandSeo } from '../utils/seo'
import { brandPublicSlug } from '../utils/brandSlug'
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

  const publicSlug = brandPublicSlug(slug)
  const lowerSlug = String(publicSlug || '').toLowerCase()
  const isArees = lowerSlug === 'arees'
  const isDahab = lowerSlug === 'dahab'
  const isLuxury = lowerSlug === 'arees-luxury'

  const {
    brandName,
    title: seoTitle,
    description: seoDesc,
    schema: brandSchema,
  } = buildBrandSeo(brand, publicSlug, { products })

  let h1Title = brandName
  let headerLabel = `${brandName} Collection`
  let headerDesc = brand?.tagline || `Explore the complete ${brandName} fragrance collection.`

  if (isArees) {
    h1Title = 'Arees Perfumes & Attars'
    headerLabel = 'Signature Arees Collection'
    headerDesc = 'Discover the complete Arees Perfumes collection — authentic, alcohol-free attars, oud, musk and traditional fragrance oils crafted with heritage in Chennai.'
  } else if (isDahab) {
    h1Title = 'Dahab Perfumes & Dahab Attars'
    headerLabel = 'Dahab Perfumes & Attars Collection'
    headerDesc = 'Authentic Dahab Perfumes and Dahab Attars — concentrated, 100% alcohol-free fragrance oils known for their rich projection, enduring sillage, and exquisite oriental character.'
  } else if (isLuxury) {
    h1Title = 'Arees Luxury Perfumes'
    headerLabel = 'Artisanal Arees Luxury Collection'
    headerDesc = 'The pinnacle of royal oriental perfumery — Arees Luxury Perfumes features vintage oud, precious amber, velvety rose, and signature musk formulations crafted for true connoisseurs.'
  }

  // Active-state badge on the combined control — purely presentational.
  const activeCount = (categoryFilter !== 'all' ? 1 : 0) + (sort !== 'default' ? 1 : 0)
  // Brand hero banner background — resolved from the brand name (see
  // content.js BRAND_HERO_IMAGES). null keeps the plain dark header.
  const heroImage = brandHeroImage(brandName) || brandHeroImage(brand?.name) || (isDahab ? '/Dahab-hero.webp' : null)

  return (
    <div className="brand-page">
      <SEO
        title={seoTitle}
        description={seoDesc}
        canonical={`/brand/${publicSlug}`}
        robots={error || (!loading && products.length === 0) ? 'noindex,follow' : 'index,follow'}
        schema={brandSchema}
      />
      {/* Compact premium collection header — the brand's hero image fills the
          background (subtle dark overlay keeps the text readable); the plain
          dark header remains when the brand has no image. */}
      <header
        className="brand-header"
        style={heroImage ? { backgroundImage: `url('${heroImage}')` } : undefined}
      >
        {brand && (
          <>
            <p className="brand-header-label">{headerLabel}</p>
            <h1>{h1Title}</h1>
            <p className="brand-header-desc">
              {headerDesc}
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
            resultCount={loading ? undefined : visibleProducts.length}
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
