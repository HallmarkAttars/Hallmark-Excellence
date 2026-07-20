import { useEffect, useMemo, useState } from 'react'
import ProductGrid from '../components/product/ProductGrid'
import { getProducts, getCategories, getBrands } from '../services/mockApi'
import './Shop.css'

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

  const visibleProducts = useMemo(() => {
    let list = [...products]
    if (categoryFilter !== 'all') list = list.filter((p) => p.category_id === categoryFilter)
    if (brandFilter !== 'all') list = list.filter((p) => p.brand_id === brandFilter)
    if (sort === 'price-asc') list.sort((a, b) => a.price - b.price)
    if (sort === 'price-desc') list.sort((a, b) => b.price - a.price)
    return list
  }, [products, categoryFilter, brandFilter, sort])

  return (
    <div>
      <div className="page-heading">
        <p className="eyebrow">Full Collection</p>
        <h1>Shop All Attars</h1>
        <p>Browse every fragrance from Arees and Dahab, filtered your way.</p>
      </div>

      <div className="container shop-layout">
        <button
          className="btn btn-outline shop-filter-toggle"
          onClick={() => setFiltersOpen((o) => !o)}
          aria-expanded={filtersOpen}
        >
          {filtersOpen ? 'Hide Filters' : 'Show Filters'}
        </button>

        <aside className={`shop-filters ${filtersOpen ? 'is-open' : ''}`}>
          <div className="shop-filter-group">
            <label htmlFor="category-filter">Category</label>
            <select id="category-filter" value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
              <option value="all">All Categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          <div className="shop-filter-group">
            <label htmlFor="brand-filter">Brand</label>
            <select id="brand-filter" value={brandFilter} onChange={(e) => setBrandFilter(e.target.value)}>
              <option value="all">All Brands</option>
              {brands.map((b) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </div>

          <div className="shop-filter-group">
            <label htmlFor="sort-filter">Sort by Price</label>
            <select id="sort-filter" value={sort} onChange={(e) => setSort(e.target.value)}>
              <option value="default">Featured</option>
              <option value="price-asc">Price: Low to High</option>
              <option value="price-desc">Price: High to Low</option>
            </select>
          </div>
        </aside>

        <div className="shop-results">
          <ProductGrid products={visibleProducts} loading={loading} />
        </div>
      </div>
    </div>
  )
}
