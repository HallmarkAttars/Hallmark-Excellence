import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Link, useNavigate } from 'react-router-dom'
import { cloudinarySrc } from '../../utils/productImage'
import { displayProductName } from '../../utils/productName'
import { getStockStatus, isProductInStock } from '../../utils/stock'
import { getDefaultVariant, getDisplayPrice } from '../../utils/productPricing'
import './QuickView.css'

// Lightweight Quick View modal — opens over the product card using the SAME
// product object already loaded in the grid (no extra fetch). The customer
// can preview the product here, but adding to the cart always happens on the
// product details page (variant + quantity selection), so "Add to Cart"
// simply navigates there. Frontend-only; no data is created or changed.

const formatPrice = (value) => `₹${Number(value).toLocaleString('en-IN')}`

// Display unit for the per-unit price (e.g. "₹10 / piece").
const unitDisplay = (unit) => String(unit || '').toLowerCase()

export default function QuickView({ product, onClose, onNavigate }) {
  const navigate = useNavigate()
  const closeRef = useRef(null)

  const variants = Array.isArray(product?.variants) ? product.variants : []
  const hasVariants = variants.length > 0
  const defaultVar = getDefaultVariant(product)
  // Initial state: automatically select the default active variant so its price displays immediately.
  const [selectedVariant, setSelectedVariant] = useState(() => defaultVar)

  useEffect(() => {
    setSelectedVariant(getDefaultVariant(product))
  }, [product])

  const activeVariant = selectedVariant ?? defaultVar

  // The selected variant's TOTAL price is the authoritative amount paid for
  // ONE unit of it; price-per-unit is display only. Variant-less products
  // keep their product-level price.
  const totalPrice = hasVariants
    ? (activeVariant ? Number(activeVariant.total_price ?? activeVariant.price ?? 0) : getDisplayPrice(product))
    : Number(product?.price || 0)
  const perUnit = hasVariants && activeVariant
    ? Number(activeVariant.price_per_unit ?? activeVariant.price ?? 0)
    : null
  const selectedUnit = hasVariants && activeVariant ? activeVariant.quantity_unit : null
  const variantSelected = hasVariants ? Boolean(activeVariant) : true

  // Stock resolution (Product-Level Boolean Availability)
  const isInStock = isProductInStock(product)
  const stockInfo = getStockStatus(isInStock)
  const isOutOfStock = !isInStock

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
      // Return keyboard focus to the card that opened the modal.
      if (previouslyFocused instanceof HTMLElement) previouslyFocused.focus()
    }
  }, [onClose])

  // Adding always happens on the product details page (variant + quantity are
  // chosen there) — never directly from the quick view. Behavior preserved
  // exactly as before; only the price visibility changed.
  const handleAdd = () => {
    onClose()
    if (onNavigate) onNavigate()
    const target = activeVariant?.id ? `/product/${product.id}?variant=${activeVariant.id}` : `/product/${product.id}`
    navigate(target)
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
          <img
            src={cloudinarySrc(product.image, { width: 700 })}
            alt={`${product.name} | ${product.brand_name || 'Arees Perfumes'}`}
            decoding="async"
          />
        </div>

        <div className="quickview-info">
          {product.brand_name && (
            <p className="quickview-brand">{product.brand_name}</p>
          )}

          <h2 className="quickview-name">{displayProductName(product.name)}</h2>

          {hasRating && (
            <p className="quickview-rating">
              <span aria-hidden="true">★</span>
              {ratingDisplay}
              {product.review_count != null && ` (${product.review_count})`}
            </p>
          )}

          {variantSelected && (
            <div className="quickview-price-row price-reveal">
              <span className="quickview-price">{formatPrice(totalPrice)}</span>
              {hasVariants && perUnit != null && Number.isFinite(perUnit) && (
                <span className="quickview-per-unit">
                  {formatPrice(perUnit)} / {unitDisplay(selectedUnit)}
                </span>
              )}
            </div>
          )}

          {stockInfo != null && (
            <p className={`quickview-stock ${stockInfo.badgeClass}`}>
              {stockInfo.badgeText}
            </p>
          )}

          {product.description && (
            <p className="quickview-desc">{product.description}</p>
          )}

          {hasVariants && (
            <div className="quickview-variants">
              <p className="quickview-variants-title">Select Quantity</p>
              <div className="quickview-variant-options">
                {variants.map((v) => {
                  const active = activeVariant ? String(activeVariant.id) === String(v.id) : false
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
              disabled={isOutOfStock}
            >
              {isOutOfStock ? 'Out of Stock' : 'Add to Cart'}
            </button>
          </div>

          <Link
            to={activeVariant?.id ? `/product/${product.id}?variant=${activeVariant.id}` : `/product/${product.id}`}
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

