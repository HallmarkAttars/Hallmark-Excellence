import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Link } from 'react-router-dom'
import { useCart } from '../../context/CartContext'
import { useToast } from '../../context/ToastContext'
import { isBulkEnabled, bulkPriceOf, bulkMinQtyOf, bulkRemaining, brandBulkDisplay } from '../../utils/bulk'
import './QuickView.css'

// Lightweight Quick View modal — opens over the product card using the SAME
// product object already loaded in the grid (no extra fetch). All cart
// behaviour mirrors the product detail page exactly (default variant, variant
// price/stock, stock caps). Frontend-only; no data is created or changed.

const formatPrice = (value) => `₹${Number(value).toLocaleString('en-IN')}`

export default function QuickView({ product, onClose, onNavigate }) {
  const { addItem, brandStatus } = useCart()
  const { notifyAddSuccess, notifyAddError } = useToast()
  const [qty, setQty] = useState(1)
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
  // threshold — no per-product cart line needed. Declared BEFORE showPacks
  // (which reads brandBulk.bulk_enabled) to avoid a TDZ crash on render.
  const brandBulk =
    product.brand_id != null ? brandStatus[String(product.brand_id)] : null

  // Active pack options — shown only when bulk pricing is available (packs
  // are children of bulk pricing) AND the product has packs configured.
  const activePacks = (Array.isArray(product.packs) ? product.packs : []).filter((pk) => pk.is_active !== false)
  const hasPacks = activePacks.length > 0
  const bulkAvailable = hasVariants
    ? variants.some((v) => v.bulk_enabled === true)
    : Boolean(product.bulk_enabled)
  // Brand-level bulk also unlocks the pack selector.
  const showPacks = hasPacks && (bulkAvailable || Boolean(brandBulk?.bulk_enabled))
  const [selectedPack, setSelectedPack] = useState(() => (hasPacks ? activePacks[0] : null))

  // Price / stock resolve to the selected variant when variants exist,
  // otherwise fall back to the product-level values — same as the detail page.
  const price = hasVariants
    ? Number(selectedVariant?.price ?? product.price)
    : Number(product.price)
  const stock = hasVariants ? selectedVariant?.stock : product.stock
  const soldOut = Number(stock) <= 0
  // PACK purchases: the stepper counts PACKS, so the max is the number of
  // whole packs the available stock can fill (floor(stock / pack_size)).
  const maxPacks =
    showPacks && selectedPack && stock != null && Number.isFinite(Number(stock))
      ? Math.max(1, Math.floor(Number(stock) / Number(selectedPack.pack_quantity)))
      : 999

  // Display price + active flag — brand bulk only takes over when it is a
  // genuine discount below THIS product's normal price (shared guard, mirrors
  // effectiveUnitPrice()). Unit-tested in utils/bulk.test.js.
  const { active: brandBulkActive, displayPrice } = brandBulkDisplay(brandBulk, price)

  // Optional bulk purchasing — configured PER VARIANT. The selected variant's
  // own bulk config is the single source of truth; variant-less products fall
  // back to the product-level bulk fields (legacy).
  const defaultVariant = variants.length ? variants.find((v) => v.is_default) || variants[0] : null
  const bulkSource = hasVariants ? selectedVariant : product
  const bulkEnabled = isBulkEnabled(bulkSource)
  const bulkPrice = bulkPriceOf(bulkSource)
  const bulkMinQty = bulkMinQtyOf(bulkSource)
  const bulkUnlocked = bulkEnabled && qty >= bulkMinQty
  const stockCanReachBulk =
    stock == null || !Number.isFinite(Number(stock)) || Number(stock) >= bulkMinQty

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
      if (addTimer.current) clearTimeout(addTimer.current)
      // Return keyboard focus to the card that opened the modal.
      if (previouslyFocused instanceof HTMLElement) previouslyFocused.focus()
    }
  }, [onClose])

  const handleAdd = () => {
    if (hasVariants && !showPacks && !selectedVariant) return
    if (showPacks && !selectedPack) return
    if (soldOut || adding) return

    // PACK purchase: build the pack object for the cart line (same shape as
    // ProductDetail) — the line's quantity becomes actual pieces.
    const packInfo = showPacks
      ? {
          pack_id: selectedPack.id,
          name: selectedPack.name || `Pack of ${selectedPack.pack_quantity}`,
          usage_label: selectedPack.usage_label || null,
          pack_size: Number(selectedPack.pack_quantity),
          price: Number(selectedPack.price),
        }
      : null
    if (packInfo) {
      setAdding(true)
      try {
        addItem(
          {
            id: product.id,
            name: product.name,
            price: Number(price),
            image: product.image,
            bulk_enabled: product.bulk_enabled,
            bulk_price: product.bulk_price,
            bulk_min_qty: product.bulk_min_qty,
          },
          qty,
          null,
          packInfo
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
      return
    }

    // Build the complete selected variant info — identical to ProductDetail,
    // including THIS variant's own bulk config.
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

          {brandBulkActive ? (
            <div className="quickview-bulk quickview-brand-bulk">
              <span className="quickview-bulk-chip is-active" aria-hidden="true">
                ✓ {brandBulk.name ? `${brandBulk.name} Bulk Applied` : 'Bulk Applied'}
              </span>
              <span className="quickview-bulk-detail">
                You're paying {formatPrice(Number(brandBulk.bulkUnitPrice))} / piece
              </span>
            </div>
          ) : bulkEnabled ? (
            <div className="quickview-bulk">
              <span className="quickview-bulk-chip" aria-hidden="true">🔥 Bulk Price</span>
              <span className="quickview-bulk-detail">
                {formatPrice(bulkPrice)} / piece · Buy {bulkMinQty}+ pieces
              </span>
            </div>
          ) : null}

          {product.description && (
            <p className="quickview-desc">{product.description}</p>
          )}

          {showPacks ? (
            <div className="quickview-variants">
              <p className="quickview-variants-title">Select Pack</p>
              <div className="quickview-variant-options">
                {activePacks.map((p) => {
                  const active = selectedPack?.id === p.id
                  const perPiece = Number(p.price) / Number(p.pack_quantity)
                  return (
                    <button
                      key={p.id}
                      type="button"
                      className={`quickview-variant ${active ? 'is-active' : ''}`}
                      onClick={() => setSelectedPack(p)}
                      aria-pressed={active}
                    >
                      <span className="quickview-variant-name">
                        {p.name || `Pack of ${p.pack_quantity}`}
                      </span>
                      <span className="quickview-variant-meta">
                        {p.pack_quantity} pieces · ₹{Number(p.price).toLocaleString('en-IN')}
                        {Number.isFinite(perPiece) && perPiece > 0 && (
                          <em>₹{perPiece.toLocaleString('en-IN', { maximumFractionDigits: 2 })}/pc</em>
                        )}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>
          ) : hasVariants ? (
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
          ) : null}

          <div className="quickview-actions">
            <div className="quickview-qty">
              <button
                type="button"
                onClick={() => setQty((q) => Math.max(1, q - 1))}
                aria-label={showPacks ? 'Decrease number of packs' : 'Decrease quantity'}
              >
                −
              </button>
              <span aria-live="polite">{qty}</span>
              <button
                type="button"
                onClick={() => setQty((q) => (showPacks ? Math.min(maxPacks, q + 1) : stock > 0 ? Math.min(stock, q + 1) : q))}
                aria-label={showPacks ? 'Increase number of packs' : 'Increase quantity'}
              >
                +
              </button>
            </div>
            {showPacks && (
              <div className="quickview-pack-readout" aria-live="polite">
                {qty} pack{qty === 1 ? '' : 's'} = {Number(selectedPack?.pack_quantity || 0) * qty} pieces
              </div>
            )}
            <button
              type="button"
              className="quickview-add"
              onClick={handleAdd}
              disabled={soldOut || adding}
            >
              {soldOut ? 'Sold Out' : adding ? 'Adding…' : added ? 'Added ✓' : 'Add to Cart'}
            </button>
          </div>

          {bulkEnabled && !brandBulkActive && (
            <div className="quickview-bulk-progress" aria-live="polite">
              {stockCanReachBulk ? (
                bulkUnlocked ? (
                  <p className="quickview-bulk-unlocked">✓ Bulk Price Unlocked — {formatPrice(bulkPrice)} / piece</p>
                ) : (
                  <>
                    <p className="quickview-bulk-to-unlock">
                      Add {bulkRemaining(bulkSource, qty)} more to unlock Bulk Price
                    </p>
                    <div className="quickview-bulk-track" aria-hidden="true">
                      <div
                        className="quickview-bulk-fill"
                        style={{ width: `${Math.min(100, (qty / bulkMinQty) * 100)}%` }}
                      />
                    </div>
                    <p className="quickview-bulk-meta">
                      {Math.min(qty, bulkMinQty)} / {bulkMinQty}
                    </p>
                  </>
                )
              ) : (
                <p className="quickview-bulk-muted">Bulk price available from {bulkMinQty} pieces</p>
              )}
            </div>
          )}

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
