import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getProducts, getCategories, deleteProduct, toggleProductStatus } from '../services/mockApi'
import { useAuth } from '../context/AuthContext'
import AdminProductCard from '../components/ui/AdminProductCard'
import { resolveProductImage, handleProductImageError } from '../utils/productImage'
import { perUnitDisplay } from '../utils/variantValidation'
import './Products.css'

export default function Products() {
  const { can } = useAuth()
  const [products, setProducts] = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [confirmDelete, setConfirmDelete] = useState(null)

  const load = () => {
    setLoading(true)
    Promise.all([getProducts(), getCategories()]).then(([p, c]) => {
      setProducts(p)
      setCategories(c)
      setLoading(false)
    })
  }

  useEffect(load, [])

  const categoryName = (id) => categories.find((c) => c.id === id)?.name || '—'

  // PRICE column shows the DEFAULT variant's PRICE PER UNIT with the unit
  // from that variant (e.g. "₹45 / piece") — never the Variant Total Price
  // and never the legacy product-level price while variants exist.
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

  const handleToggle = async (product) => {
    const updated = await toggleProductStatus(product.id, product.is_active)
    setProducts((prev) => prev.map((p) => (p.id === product.id ? updated : p)))
  }

  const handleDelete = async (id) => {
    await deleteProduct(id)
    setProducts((prev) => prev.filter((p) => p.id !== id))
    setConfirmDelete(null)
  }

  return (
    <div className="products-page">
      <div className="page-header">
        <h1>Products</h1>
        {can('products.create') && <Link to="/admin/products/new" className="btn btn-gold">Add Product</Link>}
      </div>

      <div className="card">
        {loading ? (
          <div className="loading-state">Loading products…</div>
        ) : products.length === 0 ? (
          <div className="empty-state">No products yet.</div>
        ) : (
          <>
            {/* Desktop table — kept as-is, shown at >= 768px */}
            <div className="products-desktop">
              <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th></th><th>Name</th><th>Category</th><th>Price</th><th>Status</th><th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {products.map((p) => (
                  <tr key={p.id}>
                    <td><img src={resolveProductImage(p)} alt={p.name} className="products-thumb" loading="lazy" onError={handleProductImageError} /></td>
                    <td className="products-name">
                      {p.name}
                      {p.is_featured && <span className="featured-badge">Featured</span>}
                    </td>
                    <td>{categoryName(p.category_id)}</td>
                    <td>{renderPriceCell(p)}</td>
                    <td>
                      <button
                        className={`status-toggle ${p.is_active === false ? '' : 'is-active'}`}
                        onClick={() => handleToggle(p)}
                        aria-pressed={p.is_active !== false}
                      >
                        {p.is_active === false ? 'Inactive' : 'Active'}
                      </button>
                    </td>
                    <td className="products-actions">
                      {can('products.edit') && <Link to={`/admin/products/${p.id}/edit`} className="btn btn-outline btn-sm">Edit</Link>}
                      {can('products.delete') && <button className="btn btn-danger btn-sm" onClick={() => setConfirmDelete(p)}>Delete</button>}
                    </td>
                  </tr>
                ))}
              </tbody>
              </table>
              </div>
            </div>

            {/* Mobile product cards — same products array, shown below 768px */}
            <div className="products-mobile">
              {products.map((p) => (
                <AdminProductCard
                  key={p.id}
                  product={p}
                  category={categoryName(p.category_id)}
                  onToggle={handleToggle}
                  onDelete={setConfirmDelete}
                  canEdit={can('products.edit')}
                  canDelete={can('products.delete')}
                />
              ))}
            </div>

            {/* Small info box — explains what the PRICE column actually shows. */}
            <div className="price-note" role="note">
              <strong>The price shown is the Price Per Unit of the Default Variant.</strong>
              <span>“₹45 / piece” means ₹45 for one piece.</span>
              <span>Variant Total Price is calculated automatically as Quantity × Price Per Unit.</span>
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
