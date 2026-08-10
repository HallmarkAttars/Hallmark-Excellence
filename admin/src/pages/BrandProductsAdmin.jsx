import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { getProductsByBrand, getCategories, deleteProduct, toggleProductStatus, getBrands } from '../services/mockApi'
import AdminProductCard from '../components/ui/AdminProductCard'
import { resolveProductImage, handleProductImageError } from '../utils/productImage'
import { perUnitDisplay } from '../utils/variantValidation'
import './Products.css'

export default function BrandProductsAdmin({ brandSlug }) {
  const [products, setProducts] = useState([])
  const [categories, setCategories] = useState([])
  const [brand, setBrand] = useState(null)
  const [loading, setLoading] = useState(true)
  const [confirmDelete, setConfirmDelete] = useState(null)

  // --- Search + filters (client-side over the brand's own products) ---
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [categoryFilter, setCategoryFilter] = useState('all')

  const load = () => {
    setLoading(true)
    Promise.all([getProductsByBrand(brandSlug), getCategories(), getBrands()]).then(([p, c, brands]) => {
      setProducts(p)
      setCategories(c)
      setBrand(brands.find((b) => b.slug === brandSlug) || null)
      setLoading(false)
    })
  }

  useEffect(load, [brandSlug])

  const categoryName = (id) => categories.find((c) => c.id === id)?.name || '—'

  const handleToggle = async (product) => {
    const updated = await toggleProductStatus(product.id, product.is_active)
    setProducts((prev) => prev.map((p) => (p.id === product.id ? updated : p)))
  }

  const handleDelete = async (id) => {
    await deleteProduct(id)
    setProducts((prev) => prev.filter((p) => p.id !== id))
    setConfirmDelete(null)
  }

  const visibleProducts = useMemo(() => {
    const q = query.trim().toLowerCase()
    return products.filter((p) => {
      if (q && !p.name.toLowerCase().includes(q)) return false
      if (statusFilter === 'active' && p.is_active === false) return false
      if (statusFilter === 'inactive' && p.is_active !== false) return false
      if (categoryFilter !== 'all' && p.category_id !== categoryFilter) return false
      return true
    })
  }, [products, query, statusFilter, categoryFilter])

  const hasFilters = query.trim() !== '' || statusFilter !== 'all' || categoryFilter !== 'all'

  // PRICE column shows the DEFAULT variant's Price Per Unit + its unit
  // ("₹45 / piece") — mirrors the main Products list.
  const renderPriceCell = (p) => {
    const info = perUnitDisplay(p)
    if (info) {
      return (
        <span className="products-price-cell">
          ₹{Number(info.perUnit).toLocaleString('en-IN')}
          <span className="products-price-unit"> / {info.unitLabel}</span>
        </span>
      )
    }
    return <span className="products-price-cell">₹{Number(p.price ?? 0).toLocaleString('en-IN')}</span>
  }

  // Add Product is opened in the brand's context — the brand is locked in the
  // form so a product can never be assigned to the wrong brand.
  const addProductUrl = brand
    ? `/admin/products/new?brand=${brand.id}&brandName=${encodeURIComponent(brand.name)}&brandSlug=${brand.slug}`
    : '/admin/products/new'

  return (
    <div className="products-page">
      <div className="page-header">
        <h1>{brand?.name || brandSlug} Products</h1>
        <Link to="/admin/brands" className="btn btn-outline btn-sm">Back to Brands</Link>
        <Link to={addProductUrl} className="btn btn-gold">Add Product</Link>
      </div>

      {/* Search + filters — operate on THIS brand's products only */}
      <div className="card brand-products-tools">
        <div className="search-field">
          <input
            type="search"
            placeholder="Search products…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Search products"
          />
        </div>
        <div className="filter-row">
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} aria-label="Filter by status">
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
          <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} aria-label="Filter by category">
            <option value="all">All Categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          {hasFilters && (
            <button
              type="button"
              className="btn btn-outline btn-sm"
              onClick={() => {
                setQuery('')
                setStatusFilter('all')
                setCategoryFilter('all')
              }}
            >
              Clear
            </button>
          )}
        </div>
      </div>

      <div className="card">
        {loading ? (
          <div className="loading-state">Loading products…</div>
        ) : products.length === 0 ? (
          <div className="empty-state">No {brand?.name || brandSlug} products yet.</div>
        ) : visibleProducts.length === 0 ? (
          <div className="empty-state">
            No products match your filters.
            <button className="btn btn-outline btn-sm" onClick={() => { setQuery(''); setStatusFilter('all'); setCategoryFilter('all'); }}>
              Clear Search
            </button>
          </div>
        ) : (
          <>
            {/* Desktop table — kept as-is, shown at >= 768px */}
            <div className="products-desktop">
              <div className="table-scroll">
                <table>
                  <thead>
                    <tr><th></th><th>Name</th><th>Category</th><th>Price</th><th>Status</th><th>Actions</th></tr>
                  </thead>
                  <tbody>
                    {visibleProducts.map((p) => (
                      <tr key={p.id}>
                        <td><img src={resolveProductImage(p)} alt={p.name} className="products-thumb" loading="lazy" onError={handleProductImageError} /></td>
                        <td className="products-name">{p.name}</td>
                        <td>{categoryName(p.category_id)}</td>
                        <td>{renderPriceCell(p)}</td>
                        <td>
                          <button
                            className={`status-toggle ${p.is_active === false ? '' : 'is-active'}`}
                            onClick={() => handleToggle(p)}
                          >
                            {p.is_active === false ? 'Inactive' : 'Active'}
                          </button>
                        </td>
                        <td className="products-actions">
                          <Link to={`/admin/products/${p.id}/edit`} className="btn btn-outline btn-sm">Edit</Link>
                          <button className="btn btn-danger btn-sm" onClick={() => setConfirmDelete(p)}>Delete</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Mobile product cards — same filtered array, shown below 768px */}
            <div className="products-mobile">
              {visibleProducts.map((p) => (
                <AdminProductCard
                  key={p.id}
                  product={p}
                  category={categoryName(p.category_id)}
                  onToggle={handleToggle}
                  onDelete={setConfirmDelete}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {confirmDelete && (
        <div className="modal-scrim" onClick={() => setConfirmDelete(null)}>
          <div className="card confirm-dialog" onClick={(e) => e.stopPropagation()}>
            <h3>Delete Product?</h3>
            <p>This will permanently remove "{confirmDelete.name}" from the catalog.</p>
            <div className="confirm-dialog-actions">
              <button className="btn btn-outline" onClick={() => setConfirmDelete(null)}>Cancel</button>
              <button className="btn btn-danger" onClick={() => handleDelete(confirmDelete.id)}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
