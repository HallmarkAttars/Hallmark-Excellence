import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getProducts, getCategories, deleteProduct, toggleProductStatus } from '../services/mockApi'
import './Products.css'

export default function Products() {
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
    <div>
      <div className="page-header">
        <h1>Products</h1>
        <Link to="/admin/products/new" className="btn btn-gold">Add Product</Link>
      </div>

      <div className="card">
        {loading ? (
          <div className="loading-state">Loading products…</div>
        ) : products.length === 0 ? (
          <div className="empty-state">No products yet.</div>
        ) : (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th></th><th>Name</th><th>Category</th><th>Price</th><th>Stock</th><th>Status</th><th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {products.map((p) => (
                  <tr key={p.id}>
                    <td><img src={p.image} alt="" className="products-thumb" /></td>
                    <td>{p.name}</td>
                    <td>{categoryName(p.category_id)}</td>
                    <td>₹{Number(p.price).toLocaleString('en-IN')}</td>
                    <td>{p.stock}</td>
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
                      <Link to={`/admin/products/${p.id}/edit`} className="btn btn-outline btn-sm">Edit</Link>
                      <button className="btn btn-danger btn-sm" onClick={() => setConfirmDelete(p)}>Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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
