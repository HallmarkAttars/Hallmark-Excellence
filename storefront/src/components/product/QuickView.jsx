import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Link } from 'react-router-dom'
import { cloudinarySrc } from '../../utils/productImage'
import { displayProductName } from '../../utils/productName'
import { getStockStatus, isProductInStock } from '../../utils/stock'
import { productPath } from '../../utils/seo'
import { getDefaultVariant, getDisplayPrice } from '../../utils/productPricing'
import { getProductById } from '../../services/mockApi'
import { useCart } from '../../context/CartContext'
import { useToast } from '../../context/ToastContext'
import { trackEvent, CURRENCY } from '../../utils/analytics'
import './QuickView.css'

// Lightweight Quick View modal - opens over the product card using the SAME
// product object already loaded in the grid. Catalog cards intentionally omit
// variants, so the modal lazy-fetches the full product when it needs variant
// pricing. Adding to cart happens directly here once details are available.

const formatPrice = (value) => `₹${Number(value).toLocaleString('en-IN')}`

// Display unit for the per-unit price (e.g. "₹10 / piece").
const unitDisplay = (unit) => String(unit || '').toLowerCase()

export default function QuickView({ product, onClose, onNavigate }) {
  const { addItem } = useCart()
  const { notifyAddSuccess, notifyAddError } = useToast()
  const closeRef = useRef(null)
  const [fullProduct, setFullProduct] = useState(null)
  const [loadingDetails, setLoadingDetails] = useState(
    () => !Array.isArray(product?.variants) && product?.id != null
  )
  const [detailsError, setDetailsError] = useState(false)
  const [adding, setAdding] = useState(false)

  const effectiveProduct = fullProduct || product
  const variants = Array.isArray(effectiveProduct?.variants) ? effectiveProduct.variants : []
  const hasVariants = variants.length > 0
  const defaultVar = getDefaultVariant(effectiveProduct)
  // Initial state: automatically select the default active variant so its price displays immediately.
  const [selectedVariant, setSelectedVariant] = useState(() => defaultVar)

  // Catalog list endpoints omit variants. Fetch the full product the first
  // time Quick View opens so the customer can choose a size and add directly.
  useEffect(() => {
    if (!product?.id || Array.isArray(product?.variants)) {
      setLoadingDetails(false)
      setDetailsError(false)
      setFullProduct(null)
      return undefined
    }

    let alive = true
    setFullProduct(null)
    setLoadingDetails(true)
    setDetailsError(false)
    getProductById(product.id)
      .then((data) => {
        if (!alive) return
        if (!data) {
          setDetailsError(true)
          return
        }
        setFullProduct({ ...product, ...data })
      })
      .catch(() => {
        if (alive) setDetailsError(true)
      })
      .finally(() => {
        if (alive) setLoadingDetails(false)
      })

    return () => {
      alive = false
    }
  }, [product?.id, product?.variants])

  useEffect(() => {
    setSelectedVariant(getDefaultVariant(effectiveProduct))
  }, [effectiveProduct])

  const activeVariant = selectedVariant ?? defaultVar

  // The selected variant's TOTAL price is the authoritative amount paid for
  // ONE unit of it; price-per-unit is display only. Variant-less products
  // keep their product-level price.
  const totalPrice = hasVariants
    ? (activeVariant ? Number(activeVariant.total_price ?? activeVariant.price ?? 0) : getDisplayPrice(effectiveProduct))
    : Number(effectiveProduct?.price || 0)
  const perUnit = hasVariants && activeVariant
    ? Number(activeVariant.price_per_unit ?? activeVariant.price ?? 0)
    : null
  const selectedUnit = hasVariants && activeVariant ? activeVariant.quantity_unit : null
  const variantSelected = hasVariants ? Boolean(activeVariant) : true

  // Stock resolution (Product-Level Boolean Availability)
  const isInStock = isProductInStock(effectiveProduct)
  const stockInfo = getStockStatus(isInStock)
  const isOutOfStock = !isInStock

  const hasRating = effectiveProduct.rating != null && Number.isFinite(Number(effectiveProduct.rating))
  const ratingDisplay = hasRating
    ? Number(effectiveProduct.rating).toFixed(2).replace(/\.?0+$/, '')
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

  const handleAdd = () => {
    if (isOutOfStock || adding || loadingDetails || detailsError) return
    if (hasVariants && !activeVariant) return

    try {
      setAdding(true)
      addItem(
        {
          ...effectiveProduct,
          productId: effectiveProduct.id,
          variantId: activeVariant?.id ?? null,
          variant_id: activeVariant?.id ?? null,
          variants: effectiveProduct.variants,
        },
        1,
        activeVariant || null
      )
      trackEvent('add_to_cart', {
        currency: CURRENCY,
        value: Number(totalPrice) || 0,
        item_id: effectiveProduct.id,
        item_name: effectiveProduct.name,
        ...(activeVariant?.id ? { variant: String(variantLabel(activeVariant) || activeVariant.id) } : {}),
      })
      notifyAddSuccess(effectiveProduct)
      onClose()
    } catch {
      setAdding(false)
      notifyAddError()
    }
  }

  const handleViewDetails = () => {
    onClose()
    if (onNavigate) onNavigate()
  }

  const addLabel = loadingDetails
    ? 'Loading...'
    : detailsError
      ? 'Details unavailable'
      : isOutOfStock
        ? 'Out of Stock'
        : adding
          ? 'Adding...'
          : 'Add to Cart'

  const modal = (
    <div className="quickview-backdrop" onClick={onClose} role="presentation">
      <div
        className="quickview-dialog"
        role="dialog"
        aria-modal="true"
        aria-label={`Quick view ${effectiveProduct.name}`}
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
            src={cloudinarySrc(effectiveProduct.image, { width: 700 })}
            alt={`${effectiveProduct.name} | ${effectiveProduct.brand_name || 'Arees Perfumes'}`}
            decoding="async"
          />
        </div>

        <div className="quickview-info">
          {effectiveProduct.brand_name && (
            <p className="quickview-brand">{effectiveProduct.brand_name}</p>
          )}

          <h2 className="quickview-name">{displayProductName(effectiveProduct.name)}</h2>

          {hasRating && (
            <p className="quickview-rating">
              <span aria-hidden="true">★</span>
              {ratingDisplay}
              {effectiveProduct.review_count != null && ` (${effectiveProduct.review_count})`}
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

          {effectiveProduct.description && (
            <p className="quickview-desc">{effectiveProduct.description}</p>
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
              disabled={isOutOfStock || adding || loadingDetails || detailsError}
            >
              {addLabel}
            </button>
          </div>

          <Link
            to={productPath(product) + (activeVariant?.id ? `?variant=${activeVariant.id}` : '')}
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
