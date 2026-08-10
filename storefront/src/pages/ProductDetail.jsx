import { useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { getProductById, getRelatedProducts } from '../services/mockApi'
import { useCart } from '../context/CartContext'
import { useToast } from '../context/ToastContext'
import ProductGrid from '../components/product/ProductGrid'
import SkeletonProductDetail from '../components/skeleton/SkeletonProductDetail'
import './ProductDetail.css'

// Display unit for the per-unit price (e.g. "₹10 / piece").
function unitDisplay(unit) {
  return String(unit || '').toLowerCase()
}

export default function ProductDetail() {
  const { id } = useParams()
  const { addItem } = useCart()
  const { notifyAddSuccess, notifyAddError } = useToast()
  const [product, setProduct] = useState(null)
  const [related, setRelated] = useState([])
  const [activeImage, setActiveImage] = useState(0)
  const [loading, setLoading] = useState(true)
  const [added, setAdded] = useState(false)
  // Initial state: NO variant is selected and NO price is shown. The
  // customer must explicitly click a variant before the real price appears.
  const [selectedVariant, setSelectedVariant] = useState(null)
  // "Please select a variant" hint when Add to Cart is clicked too early.
  const [variantHint, setVariantHint] = useState(false)
  const [error, setError] = useState(null)
  const [reloadKey, setReloadKey] = useState(0)
  const [adding, setAdding] = useState(false)
  // How many units/packs of the SELECTED VARIANT the customer wants.
  const [qty, setQty] = useState(1)
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
    // Deliberately NOT auto-selecting a variant: the customer must choose
    // one explicitly before any price is revealed.
    setSelectedVariant(null)
    setVariantHint(false)
    setQty(1)
    getProductById(id)
      .then((p) => {
        setProduct(p)
        setLoading(false)
        if (p) {
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

  // The selected variant's TOTAL price is the authoritative amount paid for
  // ONE unit of it (e.g. ₹7500 for "1000 Pieces"). Price-per-unit is display
  // only. Variant-less products keep their product-level price.
  const totalPrice = hasVariants
    ? Number(selectedVariant?.total_price ?? selectedVariant?.price ?? 0)
    : Number(product.price)
  const perUnit = hasVariants
    ? Number(selectedVariant?.price_per_unit ?? selectedVariant?.price ?? 0)
    : null
  const selectedUnit = hasVariants ? selectedVariant?.quantity_unit : null

  // A variant product shows its price ONLY after the customer explicitly
  // selects a variant. The displayed total = selected variant TOTAL × qty
  // (the exact same math the cart line uses — never per-unit × qty).
  const variantSelected = hasVariants ? Boolean(selectedVariant) : true
  const displayTotal = Number.isFinite(totalPrice) ? totalPrice * qty : 0

  const variantLabel = (v) =>
    v.display_label || `${v.quantity_value} ${v.quantity_unit}`.trim()

  // The default variant marks cart lines (is_default flag).
  const defaultVariant = variants.length ? variants.find((v) => v.is_default) || variants[0] : null

  const handleAdd = () => {
    // A variant product can never be added without an explicit variant — show
    // a small existing-style validation hint instead of silently returning.
    if (hasVariants && !selectedVariant) {
      setVariantHint(true)
      return
    }
    setVariantHint(false)
    if (adding) return

    // Build the complete selected variant info for the cart item so the cart
    // and checkout show the exact variant and price the customer picked.
    const variantInfo = hasVariants
      ? {
          variant_id: selectedVariant.id,
          variant_label: variantLabel(selectedVariant),
          quantity_value: selectedVariant.quantity_value,
          quantity_unit: selectedVariant.quantity_unit,
          total_price: Number(selectedVariant.total_price ?? selectedVariant.price),
          price_per_unit: Number(selectedVariant.price_per_unit ?? selectedVariant.price),
          is_default: String(selectedVariant.id) === String(defaultVariant?.id),
        }
      : null

    setAdding(true)
    try {
      // `qty` units of the selected variant. The cart line is priced at
      // variant TOTAL price × qty.
      addItem(
        {
          id: product.id,
          name: product.name,
          price: Number(product.price),
          image: product.image,
          brand_id: product.brand_id ?? null,
          brand_name: product.brand_name ?? null,
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

        {/* Variant-less products keep their simple price row (no variant to
            select). Variant products show NO price until a variant is chosen. */}
        {!hasVariants && (
          <p className="product-detail-price">₹{Number(totalPrice).toLocaleString('en-IN')}</p>
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
                    onClick={() => {
                      setSelectedVariant(v)
                      setVariantHint(false)
                    }}
                    aria-pressed={active}
                  >
                    {variantLabel(v)}
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* Price appears ONLY after the customer explicitly selects a variant. */}
        {hasVariants && variantSelected && (
          <div className="product-detail-price-block price-reveal">
            {perUnit != null && Number.isFinite(perUnit) && (
              <p className="product-detail-per-unit">
                ₹{perUnit.toLocaleString('en-IN')} / {unitDisplay(selectedUnit)}
              </p>
            )}
            <p className="product-detail-selected-label">{variantLabel(selectedVariant)} selected</p>
            <p className="product-detail-price">
              ₹{displayTotal.toLocaleString('en-IN')}{' '}
              <span className="product-detail-price-total">total</span>
            </p>
          </div>
        )}

        <div className="product-detail-actions">
          {/* Quantity control appears only after a variant is selected. */}
          {variantSelected && (
          <div className="qty-selector" aria-label="Quantity">
            <button
              type="button"
              onClick={() => setQty((q) => Math.max(1, q - 1))}
              aria-label="Decrease quantity"
            >
              −
            </button>
            <span aria-live="polite">{qty}</span>
            <button
              type="button"
              onClick={() => setQty((q) => q + 1)}
              aria-label="Increase quantity"
            >
              +
            </button>
          </div>
          )}

          <button
            className="btn btn-primary"
            onClick={handleAdd}
            disabled={adding}
          >
            {adding ? 'Adding…' : added ? 'Added ✓' : 'Add to Cart'}
          </button>
        </div>

        {hasVariants && variantHint && (
          <p className="product-detail-variant-hint" role="alert">Please select a variant</p>
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
