import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Link } from 'react-router-dom'
import { useCart } from '../../context/CartContext'
import './QuickView.css'

// Lightweight Quick View modal — opens over the product card using the SAME
// product object already loaded in the grid (no extra fetch). All cart
// behaviour mirrors the product detail page exactly (default variant, variant
// price/stock, stock caps). Frontend-only; no data is created or changed.

const formatPrice = (value) => `₹${Number(value).toLocaleString('en-IN')}`

export default function QuickView({ product, onClose, onNavigate }) {
  const { addItem } = useCart()
  const [qty, setQty] = useState(1)
  const [added, setAdded] = useState(false)
  const closeRef = useRef(null)
  const addedTimer = useRef(null)

  const variants = Array.isArray(product.variants) ? product.variants : []
  const hasVariants = variants.length > 0
  const [selectedVariant, setSelectedVariant] = useState(() =>
    hasVariants ? variants.find((v) => v.is_default) || variants[0] : null
  )

  // Price / stock resolve to the selected variant when variants exist,
  // otherwise fall back to the product-level values — same as the detail page.
  const price = hasVariants
    ? Number(selectedVariant?.price ?? product.price)
    : Number(product.price)
  const stock = hasVariants ? selectedVariant?.stock : product.stock
  const soldOut = Number(stock) <= 0

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
    ? Number(product.rating).toFixed(2).replace(/\.?0+$/, '')
    : ''

  const variantLabel = (v) =>
    v.display_label ||
    (v.quantity_value != null && v.quantity_unit
      ? `${v.quantity_value} ${v.quantity_unit}`
      : '')

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
      // Return keyboard focus to the card that opened the modal.
      if (previouslyFocused instanceof HTMLElement) previouslyFocused.focus()
    }
  }, [onClose])

  const handleAdd = () => {
    if (hasVariants && !selectedVariant) return
    if (soldOut) return

    // Build the complete selected variant info — identical to ProductDetail.
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
      { id: product.id, name: product.name, price: Number(price), image: product.image },
      qty,
      variantInfo
    )
    setAdded(true)
    addedTimer.current = setTimeout(() => setAdded(false), 1600)
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
          {soldOut && <span className="quickview-soldout">Sold Out</span>}
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
            <span className="quickview-price">{formatPrice(price)}</span>
            {showCompareAt && (
              <span className="quickview-compare">
                {formatPrice(Number(compareAt))}
              </span>
            )}
            {showDiscount && (
              <span className="quickview-discount">-{discountPct}% OFF</span>
            )}
          </div>

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
            <div className="quickview-qty">
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
                onClick={() => setQty((q) => (stock > 0 ? Math.min(stock, q + 1) : q))}
                aria-label="Increase quantity"
              >
                +
              </button>
            </div>
            <button
              type="button"
              className="quickview-add"
              onClick={handleAdd}
              disabled={soldOut}
            >
              {soldOut ? 'Sold Out' : added ? 'Added ✓' : 'Add to Cart'}
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
