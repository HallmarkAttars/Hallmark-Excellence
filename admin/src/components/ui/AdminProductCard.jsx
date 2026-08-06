import { Link } from 'react-router-dom'
import './AdminProductCard.css'

// Shared mobile product card used by ALL admin product-management pages
// (Products, Arees, Dahab). Rendered only below 768px — the desktop table is
// untouched. Consumes the SAME product data and reuses the SAME handlers as
// the table: no new fetching, no new CRUD.
export default function AdminProductCard({ product, category, onToggle, onDelete, canEdit = true, canDelete = true }) {
  // Products pages store the image on `image`; brand pages use `images[0]`.
  const image = product.image || (Array.isArray(product.images) ? product.images[0] : null)
  const isActive = product.is_active !== false
  // NOTE: `.status-toggle` and `.featured-badge` are defined in the pages'
  // shared `Products.css` (both consumers import it). Keep that import when
  // reusing this card anywhere else.

  return (
    <div className="product-card-mobile">
      <div className="product-card-top">
        <div className="product-card-image">
          {image ? (
            <img src={image} alt={product.name} loading="lazy" />
          ) : (
            <span className="product-card-image-placeholder" aria-hidden="true">
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 3 4 7v10l8 4 8-4V7l-8-4Z" />
                <path d="M4 7l8 4 8-4M12 11v10" />
              </svg>
            </span>
          )}
        </div>

        <div className="product-card-info">
          <div className="product-card-name-wrap">
            <span className="product-card-name">{product.name}</span>
            {product.is_featured && <span className="featured-badge">Featured</span>}
          </div>
          <span className="product-card-category">{category}</span>
          <span className="product-card-price">₹{Number(product.price).toLocaleString('en-IN')}</span>
        </div>
      </div>

      <div className="product-card-stock">
        <span className="product-card-stock-label">Stock: {product.stock ?? '—'}</span>
        <button
          type="button"
          className={`status-toggle ${isActive ? 'is-active' : ''}`}
          onClick={() => onToggle(product)}
          aria-pressed={isActive}
        >
          {isActive ? 'Active' : 'Inactive'}
        </button>
      </div>

      <div className="product-card-actions">
        {canEdit && (
          <Link to={`/admin/products/${product.id}/edit`} className="btn btn-outline">
            Edit
          </Link>
        )}
        {canDelete && (
          <button type="button" className="btn btn-danger" onClick={() => onDelete(product)}>
            Delete
          </button>
        )}
      </div>
    </div>
  )
}
