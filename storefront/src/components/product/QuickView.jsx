import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Link } from 'react-router-dom'
import { useCart } from '../../context/CartContext'
import { useToast } from '../../context/ToastContext'
import { brandBulkDisplay } from '../../utils/bulk'
import './QuickView.css'

// Lightweight Quick View modal — opens over the product card using the SAME
// product object already loaded in the grid (no extra fetch). The customer
// selects the desired variant (capacity/size) and adds ONE unit to the cart —
// exactly like the product detail page. Frontend-only; no data is created or
// changed.

const formatPrice = (value) => `₹${Number(value).toLocaleString('en-IN')}`

export default function QuickView({ product, onClose, onNavigate }) {
  const { addItem, brandStatus } = useCart()
  const { notifyAddSuccess, notifyAddError } = useToast()
  const [added, setAdded] = useState(false)
  const [adding, setAdding] = useState(false)
  const closeRef = useRef(null)
  const addedTimer = useRef(null)
  const addTimer = useRef(null)

  const variants = Array.isArray(product.variants) ? product.variants : []
  const hasVariants = variants.length > 0
  const [selectedVariant, setSelectedVariant] = useState(() =>
    hasVariants ? variants.find((v) => v.is_default) || variants[0] : null
  )
  // Combined BRAND bulk — when the brand's combined cart quantity reaches its
  // threshold, the brand bulk unit price takes over the display (exactly what
  // effectiveUnitPrice() charges in the cart). Derived live from the cart
  // context, so the modal flips the instant any card of the brand crosses the
  // threshold — no per-product cart line needed.
  const brandBulk =
    product.brand_id != null ? brandStatus[String(product.brand_id)] : null

  // Price resolves to the selected variant when variants exist, otherwise the
  // product-level price — same as the detail page.
  const price = hasVariants
    ? Number(selectedVariant?.price ?? product.price)
    : Number(product.price)

  // Display price + active flag — brand bulk only takes over when it is a
  // genuine discount below THIS product's normal price (shared guard, mirrors
  // effectiveUnitPrice()). Unit-tested in utils/bulk.test.js.
  const { active: brandBulkActive, displayPrice } = brandBulkDisplay(brandBulk, price)

  const compareAt = product.compare_at_price ?? product.original_price
  const showCompareAt =
    compareAt != null &&
    Number.isFinite(Number(compareAt)) &&
    Number(compareAt) > price
  const discountPct = showCompareAt
    ? Math.round((1 - price / Number(compareAt)) * 100)
    : null
  // Guarded to > 0 so a sub-1% rounding never shows “0% OFF”.
  const showDiscount = discountPct != null && discountPct > 0

  const hasRating = product.rating != null && Number.isFinite(Number(product.rating))
  const ratingDisplay = hasRating
    ? Number(product.rating).toFixed(2).replace(/\\.?0+$/, '')
    : ''

  const variantLabel = (v) =>
    v.display_label ||
    (v.quantity_value != null && v.quantity_unit
      ? `${v.quantity_value} ${v.quantity_unit}`
      : '')

  // The default variant marks cart lines (is_default flag).
  const defaultVariant = variants.length ? variants.find((v) => v.is_default) || variants[0] : null

  // Close on Escape + lock body scroll while the modal is open.
  // Focus moves into the dialog; returning to the trigger on close.
  useEffect(() => {
    const previouslyFocused = document.activeElement
    const onKey = (e) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    closeRef.current?.focus()
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = prevOverflow
      if (addedTimer.current) clearTimeout(addedTimer.current)
      if (addTimer.current) clearTimeout(addTimer.current)
      // Return keyboard focus to the card that opened the modal.
      if (previouslyFocused instanceof HTMLElement) previouslyFocused.focus()
    }
  }, [onClose])

  const handleAdd = () => {
    if (hasVariants && !selectedVariant) return
    if (adding) return

    // Build the complete selected variant info — identical to ProductDetail.
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
      // no variants).
      addItem(
        {
          id: product.id,
          name: product.name,
          price: Number(price),
          image: product.image,
          // Brand context MUST ride on the line — combined brand bulk
          // pricing is derived from it.
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
        addedTimer.current = setTimeout(() => setAdded(false), 1600)
      }, 350)
    } catch {
      setAdding(false)
      notifyAddError()
    }
  }

  const handleViewDetails = () => {
    onClose()
    if (onNavigate) onNavigate()
  }

  const modal = (
    <div className="quickview-backdrop" onClick={onClose} role="presentation">
      <div
        className="quickview-dialog"
        role="dialog"
        aria-modal="true"
        aria-label={`Quick view ${product.name}`}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          className="quickview-close"
          onClick={onClose}
          ref={closeRef}
          aria-label="Close quick view"
        >
          ✕
        </button>

        <div className="quickview-media">
          <img src={product.image} alt={product.name} />
        </div>

        <div className="quickview-info">
          {product.brand_name && (
            <p className="quickview-brand">{product.brand_name}</p>
          )}

          <h2 className="quickview-name">{product.name}</h2>

          {hasRating && (
            <p className="quickview-rating">
              <span aria-hidden="true">★</span>
              {ratingDisplay}
              {product.review_count != null && ` (${product.review_count})`}
            </p>
          )}

          <div className="quickview-price-row">
            <span className="quickview-price">{formatPrice(displayPrice)}</span>
            {showCompareAt && (
              <span className="quickview-compare">
                {formatPrice(Number(compareAt))}
              </span>
            )}
            {showDiscount && (
              <span className="quickview-discount">-{discountPct}% OFF</span>
            )}
          </div>

          {brandBulkActive && (
            <div className="quickview-bulk quickview-brand-bulk">
              <span className="quickview-bulk-chip is-active" aria-hidden="true">
                ✓ {brandBulk.name ? `${brandBulk.name} Bulk Applied` : 'Bulk Applied'}
              </span>
              <span className="quickview-bulk-detail">
                You're paying {formatPrice(Number(brandBulk.bulkUnitPrice))} / piece
              </span>
            </div>
          )}

          {product.description && (
            <p className="quickview-desc">{product.description}</p>
          )}

          {hasVariants && (
            <div className="quickview-variants">
              <p className="quickview-variants-title">Select Quantity</p>
              <div className="quickview-variant-options">
                {variants.map((v) => {
                  const active = selectedVariant?.id === v.id
                  return (
                    <button
                      key={v.id}
                      type="button"
                      className={`quickview-variant ${active ? 'is-active' : ''}`}
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

          <div className="quickview-actions">
            <button
              type="button"
              className="quickview-add"
              onClick={handleAdd}
              disabled={adding}
            >
              {adding ? 'Adding…' : added ? 'Added ✓' : 'Add to Cart'}
            </button>
          </div>

          <Link
            to={`/product/${product.id}`}
            className="quickview-details-link"
            onClick={handleViewDetails}
          >
            View Full Details →
          </Link>
        </div>
      </div>
    </div>
  )

  return createPortal(modal, document.body)
}
