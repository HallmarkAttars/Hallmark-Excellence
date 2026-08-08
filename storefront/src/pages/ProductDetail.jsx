import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { getProductById, getRelatedProducts } from '../services/mockApi'
import { useCart } from '../context/CartContext'
import ProductGrid from '../components/product/ProductGrid'
import './ProductDetail.css'

export default function ProductDetail() {
  const { id } = useParams()
  const { addItem } = useCart()
  const [product, setProduct] = useState(null)
  const [related, setRelated] = useState([])
  const [activeImage, setActiveImage] = useState(0)
  const [qty, setQty] = useState(1)
  const [loading, setLoading] = useState(true)
  const [added, setAdded] = useState(false)
  const [selectedVariant, setSelectedVariant] = useState(null)
  const [error, setError] = useState(null)
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    setLoading(true)
    setError(null)
    setActiveImage(0)
    setQty(1)
    setAdded(false)
    setSelectedVariant(null)
    getProductById(id)
      .then((p) => {
        setProduct(p)
        setLoading(false)
        if (p) {
          // Auto-select the default variant, or the first if none is flagged.
          const variants = Array.isArray(p.variants) ? p.variants : []
          if (variants.length > 0) {
            setSelectedVariant(variants.find((v) => v.is_default) || variants[0])
          }
          getRelatedProducts(p).then(setRelated).catch(() => {})
        }
      })
      .catch((err) => {
        setError(err.message || 'Failed to load product.')
        setLoading(false)
      })
  }, [id, reloadKey])

  if (error) {
    return (
      <div className="error-state" role="alert">
        <p>{error}</p>
        <button
          type="button"
          className="btn btn-outline"
          onClick={() => setReloadKey((k) => k + 1)}
        >
          Try Again
        </button>
      </div>
    )
  }
  if (loading) return <div className="loading-state">Loading product…</div>
  if (!product) {
    return (
      <div className="empty-state">
        Product not found. <Link to="/shop">Back to Shop</Link>
      </div>
    )
  }

  const variants = Array.isArray(product.variants) ? product.variants : []
  const hasVariants = variants.length > 0

  // Price and stock come from the selected variant when variants exist,
  // otherwise fall back to the product-level values (legacy products).
  const price = hasVariants ? selectedVariant?.price : product.price
  const stock = hasVariants ? selectedVariant?.stock : product.stock

  const variantLabel = (v) =>
    v.display_label || `${v.quantity_value} ${v.quantity_unit}`.trim()

  const stockStatus = () => {
    if (stock > 5) return { text: 'In Stock', className: 'in-stock' }
    if (stock > 0) return { text: `Only ${stock} left`, className: 'low-stock' }
    return { text: 'Out of Stock', className: 'out-of-stock' }
  }

  const handleAdd = () => {
    if (hasVariants && !selectedVariant) return
    if (stock <= 0) return

    // Build the complete selected variant info for the cart item.
    const variantInfo = hasVariants
      ? {
          variant_id: selectedVariant.id,
          variant_label: variantLabel(selectedVariant),
          quantity_value: selectedVariant.quantity_value,
          quantity_unit: selectedVariant.quantity_unit,
          price: Number(selectedVariant.price),
          stock: selectedVariant.stock,
        }
      : null

    addItem(
      {
        id: product.id,
        name: product.name,
        price: Number(price),
        image: product.image,
      },
      qty,
      variantInfo
    )
    setAdded(true)
    setTimeout(() => setAdded(false), 2000)
  }

  const stockState = stockStatus()

  return (
    <div className="container product-detail">
      <div className="product-detail-gallery">
        <div className="product-detail-main-image">
          <img src={product.image} alt={product.name} />
        </div>
        {product.image && (
          <div className="product-detail-thumbs">
            <button
              className="product-detail-thumb is-active"
              onClick={() => setActiveImage(0)}
              aria-label="Show image"
            >
              <img src={product.image} alt="" />
            </button>
          </div>
        )}
      </div>

      <div className="product-detail-info">
        <h1>{product.name}</h1>
        <p className="product-detail-price">₹{Number(price).toLocaleString('en-IN')}</p>
        <p className="product-detail-description">{product.description}</p>
        <p className={`product-detail-stock ${stockState.className}`}>{stockState.text}</p>

        {hasVariants && (
          <div className="variant-selector">
            <p className="variant-selector-title">Select Quantity</p>
            <div className="variant-options">
              {variants.map((v) => {
                const active = selectedVariant?.id === v.id
                return (
                  <button
                    key={v.id}
                    type="button"
                    className={`variant-option ${active ? 'is-active' : ''}`}
                    onClick={() => setSelectedVariant(v)}
                    aria-pressed={active}
                  >
                    {variantLabel(v)}
                  </button>
                )
              })}
            </div>
          </div>
        )}

        <div className="product-detail-actions">
          <div className="qty-selector">
            <button
              onClick={() => setQty((q) => Math.max(1, q - 1))}
              aria-label="Decrease quantity"
            >
              −
            </button>
            <span aria-live="polite">{qty}</span>
            <button
              onClick={() => setQty((q) => (stock > 0 ? Math.min(stock, q + 1) : q))}
              aria-label="Increase quantity"
            >
              +
            </button>
          </div>
          <button
            className="btn btn-primary"
            onClick={handleAdd}
            disabled={stock <= 0}
          >
            {added ? 'Added ✓' : 'Add to Cart'}
          </button>
        </div>
      </div>

      {related.length > 0 && (
        <div className="product-detail-related">
          <h2>You May Also Like</h2>
          <ProductGrid products={related} />
        </div>
      )}
    </div>
  )
}
