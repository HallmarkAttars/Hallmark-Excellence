import { useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { getProductById, getRelatedProducts } from '../services/mockApi'
import { useCart } from '../context/CartContext'
import { useToast } from '../context/ToastContext'
import { isBulkEnabled, bulkPriceOf, bulkMinQtyOf, bulkRemaining } from '../utils/bulk'
import ProductGrid from '../components/product/ProductGrid'
import './ProductDetail.css'

export default function ProductDetail() {
  const { id } = useParams()
  const { addItem } = useCart()
  const { notifyAddSuccess, notifyAddError } = useToast()
  const [product, setProduct] = useState(null)
  const [related, setRelated] = useState([])
  const [activeImage, setActiveImage] = useState(0)
  const [qty, setQty] = useState(1)
  const [loading, setLoading] = useState(true)
  const [added, setAdded] = useState(false)
  const [selectedVariant, setSelectedVariant] = useState(null)
  const [error, setError] = useState(null)
  const [reloadKey, setReloadKey] = useState(0)
  const [adding, setAdding] = useState(false)
  const addedTimer = useRef(null)
  const addTimer = useRef(null)

  // Clear feedback timers on unmount.
  useEffect(() => () => {
    if (addedTimer.current) clearTimeout(addedTimer.current)
    if (addTimer.current) clearTimeout(addTimer.current)
  }, [])

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

  // The default variant is still needed to mark cart lines (is_default flag),
  // though bulk pricing itself is now per SELECTED variant.
  const defaultVariant = variants.length ? variants.find((v) => v.is_default) || variants[0] : null

  // Optional bulk purchasing — configured PER VARIANT. The selected variant's
  // own bulk config is the single source of truth; variant-less products fall
  // back to the product-level bulk fields (legacy).
  const bulkSource = hasVariants ? selectedVariant : product
  const bulkEnabled = isBulkEnabled(bulkSource)
  const bulkPrice = bulkPriceOf(bulkSource)
  const bulkMinQty = bulkMinQtyOf(bulkSource)
  const bulkUnlocked = bulkEnabled && qty >= bulkMinQty
  // Never claim the customer can unlock bulk pricing if the available stock
  // cannot physically reach the required quantity.
  const stockCanReachBulk =
    stock == null || !Number.isFinite(Number(stock)) || Number(stock) >= bulkMinQty

  const stockStatus = () => {
    if (stock > 5) return { text: 'In Stock', className: 'in-stock' }
    if (stock > 0) return { text: `Only ${stock} left`, className: 'low-stock' }
    return { text: 'Out of Stock', className: 'out-of-stock' }
  }

  const handleAdd = () => {
    if (hasVariants && !selectedVariant) return
    if (stock <= 0 || adding) return

    // Build the complete selected variant info for the cart item — including
    // THIS variant's own bulk config so the cart/checkout use the exact price
    // and threshold the customer saw for the size they picked.
    const variantInfo = hasVariants
      ? {
          variant_id: selectedVariant.id,
          variant_label: variantLabel(selectedVariant),
          quantity_value: selectedVariant.quantity_value,
          quantity_unit: selectedVariant.quantity_unit,
          price: Number(selectedVariant.price),
          stock: selectedVariant.stock,
          is_default: String(selectedVariant.id) === String(defaultVariant?.id),
          bulk_enabled: selectedVariant.bulk_enabled === true,
          bulk_price: selectedVariant.bulk_price != null ? Number(selectedVariant.bulk_price) : null,
          bulk_min_qty: selectedVariant.bulk_min_qty != null ? Number(selectedVariant.bulk_min_qty) : null,
        }
      : null

    setAdding(true)
    try {
      // Existing cart operation — unchanged. Brief ADDING state doubles as a
      // duplicate-click guard, then the success toast fires after success.
      // The bulk config rides on the product object so the cart line carries
      // the exact bulk price / quantity the customer saw here.
      addItem(
        {
          id: product.id,
          name: product.name,
          price: Number(price),
          image: product.image,
          // Product-level bulk — only used for variant-less products (the
          // per-variant config rides on variantInfo and wins in the cart).
          bulk_enabled: product.bulk_enabled,
          bulk_price: product.bulk_price,
          bulk_min_qty: product.bulk_min_qty,
        },
        qty,
        variantInfo
      )
      addTimer.current = setTimeout(() => {
        setAdding(false)
        setAdded(true)
        notifyAddSuccess(product)
        addedTimer.current = setTimeout(() => setAdded(false), 2000)
      }, 350)
    } catch {
      setAdding(false)
      notifyAddError()
    }
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

        {bulkEnabled && (
          <div className="bulk-pricing-block">
            <p className="bulk-pricing-label">
              <span aria-hidden="true">🔥</span> Bulk Purchasing
            </p>
            <div className="bulk-pricing-row">
              <span className="bulk-pricing-normal">
                <small>Normal Price</small>
                <strong>₹{Number(price).toLocaleString('en-IN')} <em>/ piece</em></strong>
              </span>
              <span className="bulk-pricing-bulk">
                <small>Bulk Price</small>
                <strong>₹{Number(bulkPrice).toLocaleString('en-IN')} <em>/ piece</em></strong>
              </span>
            </div>
            <p className="bulk-pricing-hint">
              {hasVariants
                ? `Buy ${bulkMinQty}+ pieces of the ${variantLabel(selectedVariant)} size to unlock the bulk price.`
                : `Buy ${bulkMinQty}+ pieces to unlock the bulk price — smaller quantities are always available at the normal price.`}
            </p>
          </div>
        )}

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
            disabled={stock <= 0 || adding}
          >
            {adding ? 'Adding…' : added ? 'Added ✓' : 'Add to Cart'}
          </button>
        </div>

        {/* Live bulk progress — updates instantly with the quantity. Reads
            the SELECTED variant's own bulk config; hides entirely when that
            variant has bulk off (or no valid config). */}
        {bulkEnabled && (
          <div className="bulk-progress" aria-live="polite">
            {stockCanReachBulk ? (
              <>
                {bulkUnlocked ? (
                  <p className="bulk-progress-status is-unlocked">
                    <span aria-hidden="true">✓</span> Bulk Price Unlocked —
                    ₹{Number(bulkPrice).toLocaleString('en-IN')} / piece
                  </p>
                ) : (
                  <p className="bulk-progress-status">
                    Add {bulkRemaining(bulkSource, qty)} more to unlock Bulk Price
                  </p>
                )}
                <div
                  className="bulk-progress-track"
                  role="progressbar"
                  aria-valuemin={0}
                  aria-valuemax={bulkMinQty}
                  aria-valuenow={Math.min(qty, bulkMinQty)}
                  aria-label="Bulk price progress"
                >
                  <div
                    className={`bulk-progress-fill ${bulkUnlocked ? 'is-full' : ''}`}
                    style={{ width: `${Math.min(100, (qty / bulkMinQty) * 100)}%` }}
                  />
                </div>
                <p className="bulk-progress-meta">
                  {Math.min(qty, bulkMinQty)} / {bulkMinQty}
                </p>
              </>
            ) : (
              <p className="bulk-progress-status is-muted">
                Bulk price available from {bulkMinQty} pieces
              </p>
            )}
          </div>
        )}
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
