import { useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { getProductById, getRelatedProducts, getBrandBySlug } from '../services/mockApi'
import { useCart } from '../context/CartContext'
import { useToast } from '../context/ToastContext'
import { brandBulkConfig, brandBulkDisplay } from '../utils/bulk'
import ProductGrid from '../components/product/ProductGrid'
import SkeletonProductDetail from '../components/skeleton/SkeletonProductDetail'
import './ProductDetail.css'

export default function ProductDetail() {
  const { id } = useParams()
  const { addItem, brandStatus } = useCart()
  const { notifyAddSuccess, notifyAddError } = useToast()
  const [product, setProduct] = useState(null)
  const [related, setRelated] = useState([])
  const [activeImage, setActiveImage] = useState(0)
  const [loading, setLoading] = useState(true)
  const [added, setAdded] = useState(false)
  const [selectedVariant, setSelectedVariant] = useState(null)
  const [error, setError] = useState(null)
  const [reloadKey, setReloadKey] = useState(0)
  const [adding, setAdding] = useState(false)
  // Brand row for this product — carries the combined brand bulk config.
  const [brand, setBrand] = useState(null)
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
    setAdded(false)
    setSelectedVariant(null)
    setBrand(null)
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
          // Load the brand row for the combined brand bulk pricing block.
          if (p.brand_slug) {
            getBrandBySlug(p.brand_slug).then(setBrand).catch(() => {})
          }
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
  if (loading) return <SkeletonProductDetail />
  if (!product) {
    return (
      <div className="empty-state">
        Product not found. <Link to="/shop">Back to Shop</Link>
      </div>
    )
  }

  const variants = Array.isArray(product.variants) ? product.variants : []
  const hasVariants = variants.length > 0

  // Price comes from the selected variant when variants exist, otherwise the
  // product-level price (variant-less products).
  const price = hasVariants ? selectedVariant?.price : product.price

  const variantLabel = (v) =>
    v.display_label || `${v.quantity_value} ${v.quantity_unit}`.trim()

  // The default variant marks cart lines (is_default flag) and determines the
  // initially displayed price.
  const defaultVariant = variants.length ? variants.find((v) => v.is_default) || variants[0] : null

  // Combined BRAND bulk config — valid only when the brand has it enabled.
  const brandBulk = brand ? brandBulkConfig(brand) : null

  // Combined BRAND bulk — LIVE status derived from the cart context (every
  // cart line of this brand, not just this product). When the brand's
  // combined quantity reaches its threshold, the brand bulk unit price takes
  // over this product's display — matching exactly what effectiveUnitPrice()
  // charges in the cart. Reflected at page-load too, so arriving with
  // qualifying items already in the cart shows the bulk price immediately.
  const brandStatusEntry =
    product.brand_id != null ? brandStatus[String(product.brand_id)] : null
  // Display price + active flag — brand bulk only takes over when it is a
  // genuine discount below THIS (selected variant's) normal price (shared
  // guard, mirrors effectiveUnitPrice()). Unit-tested in utils/bulk.test.js.
  const { active: brandBulkActive, displayPrice } = brandBulkDisplay(brandStatusEntry, price)

  const handleAdd = () => {
    if (hasVariants && !selectedVariant) return
    if (adding) return

    // Build the complete selected variant info for the cart item so the cart
    // and checkout show the exact size and price the customer picked.
    const variantInfo = hasVariants
      ? {
          variant_id: selectedVariant.id,
          variant_label: variantLabel(selectedVariant),
          quantity_value: selectedVariant.quantity_value,
          quantity_unit: selectedVariant.quantity_unit,
          price: Number(selectedVariant.price),
          is_default: String(selectedVariant.id) === String(defaultVariant?.id),
        }
      : null

    setAdding(true)
    try {
      // One unit of the selected variant (or the product itself when it has
      // no variants). The customer never picks an arbitrary quantity.
      addItem(
        {
          id: product.id,
          name: product.name,
          price: Number(price),
          image: product.image,
          // Brand context MUST ride on the line — combined brand bulk
          // pricing is derived from it. Without these, a product added
          // here would price differently from the same product added via
          // a product card (which passes the full object).
          brand_id: product.brand_id ?? null,
          brand_name: product.brand_name ?? null,
        },
        1,
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
        <p className="product-detail-price">₹{Number(displayPrice).toLocaleString('en-IN')}</p>

        {/* Combined BRAND bulk pricing — separate from any product-level
            discount (which no longer exists). Applies to the TOTAL quantity
            across ALL of this brand's items in the cart (mix & match). */}
        {brandBulk && (
          <div className={`brand-bulk-row ${brandBulkActive ? 'is-active' : ''}`}>
            {brandBulkActive ? (
              <>
                <p className="brand-bulk-row-label">
                  <span aria-hidden="true">✓</span> {brand.name} · Bulk Pricing
                </p>
                <p className="brand-bulk-row-text">
                  <strong>{brand.name} bulk pricing is active</strong> — you're paying{' '}
                  <strong>₹{brandStatusEntry.bulkUnitPrice.toLocaleString('en-IN')}/piece</strong>{' '}
                  across your {brand.name} items.
                </p>
              </>
            ) : (
              <>
                <p className="brand-bulk-row-label">
                  <span aria-hidden="true">🤝</span> {brand.name} · Bulk Pricing
                </p>
                <p className="brand-bulk-row-text">
                  Buy <strong>{brandBulk.bulkMinQty}+ pieces</strong> of any {brand.name} item for{' '}
                  <strong>₹{brandBulk.bulkUnitPrice.toLocaleString('en-IN')}/piece</strong>
                </p>
              </>
            )}
            {product.brand_slug && (
              <Link to={`/brand/${product.brand_slug}`} className="brand-bulk-row-link">
                View {brand.name} bulk pricing <span aria-hidden="true">→</span>
              </Link>
            )}
          </div>
        )}

        <p className="product-detail-description">{product.description}</p>

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
          <button
            className="btn btn-primary"
            onClick={handleAdd}
            disabled={adding}
          >
            {adding ? 'Adding…' : added ? 'Added ✓' : 'Add to Cart'}
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
