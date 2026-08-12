import { useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { getProductById, getRelatedProducts } from '../services/mockApi'
import { useCart } from '../context/CartContext'
import { useToast } from '../context/ToastContext'
import {
  getApplicableBulkTier,
  getBulkTiers,
  lineNormalPerPiece,
  pieceBandRange,
  pieceWord,
  productPageBrandPieces,
} from '../utils/brandBulk'
import { QualityIcon, SecureIcon, ShippingIcon, PhoneIcon } from '../components/icons'
import ProductGrid from '../components/product/ProductGrid'
import SkeletonProductDetail from '../components/skeleton/SkeletonProductDetail'
import './ProductDetail.css'

// Display unit for the per-unit price (e.g. "₹10 / piece").
function unitDisplay(unit) {
  return String(unit || '').toLowerCase()
}

// Frontend-only wishlist persistence (localStorage) — no backend, no cart
// changes. Mirrors how the cart itself persists locally.
const WISHLIST_KEY = 'ad_wishlist_v1'
function readWishlist() {
  try {
    const raw = localStorage.getItem(WISHLIST_KEY)
    const list = raw ? JSON.parse(raw) : []
    return Array.isArray(list) ? list.map(String) : []
  } catch {
    return []
  }
}

function StarIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" stroke="none" aria-hidden="true">
      <path d="M12 2.8 15 8.4l6.2.9-4.5 4.4 1 6.2L12 17.1 6.3 19.9l1-6.2L2.8 9.3 9 8.4l3-5.6Z" />
    </svg>
  )
}

function HeartIcon({ filled }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 20.5 4.7 13.4a4.9 4.9 0 0 1 0-6.9 4.6 4.6 0 0 1 6.7 0l.6.6.6-.6a4.6 4.6 0 0 1 6.7 0 4.9 4.9 0 0 1 0 6.9L12 20.5Z" />
    </svg>
  )
}

function BagIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 8h14l-1.2 11a2 2 0 0 1-2 1.8H8.2a2 2 0 0 1-2-1.8L5 8Z" />
      <path d="M8.5 10V6.5a3.5 3.5 0 0 1 7 0V10" />
    </svg>
  )
}

export default function ProductDetail() {
  const { id } = useParams()
  const { addItem, brandPieces, bulkRules } = useCart()
  const { notifyAddSuccess, notifyAddError } = useToast()
  const [product, setProduct] = useState(null)
  const [related, setRelated] = useState([])
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
  // True once the CURRENT selection (variant + quantity) has actually been
  // added to the cart. While false, the bulk preview shows cart + selection;
  // once true, the cart already contains those pieces and the preview must
  // NOT add them again (the double-counting bug). Reset on every selection
  // change; set after a successful add.
  const [selectionInCart, setSelectionInCart] = useState(false)
  // Description "Read more" — purely visual (line clamp), no data change.
  const [descOpen, setDescOpen] = useState(false)
  // Frontend-only wishlist toggle (localStorage).
  const [wishlistIds, setWishlistIds] = useState(readWishlist)
  const addedTimer = useRef(null)
  const addTimer = useRef(null)
  // Synchronous re-entry guard for handleAdd: React state (`adding`) cannot
  // block two clicks in the same frame, and a double-fire would add the
  // selected quantity twice (60 → 120). The ref is set before the first
  // mutation and cleared when the add completes.
  const addingRef = useRef(false)

  // Clear feedback timers on unmount.
  useEffect(() => () => {
    if (addedTimer.current) clearTimeout(addedTimer.current)
    if (addTimer.current) clearTimeout(addTimer.current)
  }, [])

  useEffect(() => {
    setLoading(true)
    setError(null)
    setAdded(false)
    // Deliberately NOT auto-selecting a variant: the customer must choose
    // one explicitly before any price is revealed.
    setSelectedVariant(null)
    setVariantHint(false)
    setQty(1)
    setSelectionInCart(false)
    setDescOpen(false)
    addingRef.current = false
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
  const inWishlist = wishlistIds.includes(String(product.id))

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

  // --- Brand-level bulk pricing (brand products only) ----------------------
  // `brandRule` is the brand's valid bulk rule when this product belongs to a
  // brand that has one configured. Category products and brands without a
  // rule are completely untouched. `cartBrandPieces` is the pieces of that
  // brand already in the cart; the current selection adds on top so the
  // unlock state updates live as the customer changes quantity.
  const brandRule =
    product.brand_id != null ? bulkRules[String(product.brand_id)] || null : null
  const isBrandBulkProduct = Boolean(brandRule)
  const cartBrandPieces =
    product.brand_id != null ? brandPieces[String(product.brand_id)] || 0 : 0

  // Any BRAND product whose selected variant is a "Pieces" band gets the
  // one-piece-at-a-time stepper: min = the band's quantity_value, max = one
  // below the next band, auto-advancing at the edge. Category products and
  // ML/Gram brand variants keep the original pack-based control.
  const isBrandProduct = product.brand_id != null
  const pieceVariants = isBrandProduct
    ? variants.filter((v) => String(v.quantity_unit ?? '').trim().toLowerCase() === 'pieces')
    : []
  const pieceMode =
    hasVariants &&
    selectedVariant &&
    pieceVariants.some((v) => String(v.id) === String(selectedVariant.id))
  // Shared band math (unit-tested in utils/brandBulk.js): the selected
  // band's minimum, its max (one below the next band) and the next band
  // (auto-selected at the edge). null for non-Pieces variants / categories.
  const bandRange = pieceMode ? pieceBandRange(variants, selectedVariant.id) : null
  const pieceMin = bandRange ? bandRange.min : 1
  const nextVariant = bandRange ? bandRange.next : null
  const pieceMax = bandRange ? bandRange.max : null

  // VARIANT SELECTION IS THE SOURCE OF INITIAL QUANTITY: selecting a Pieces
  // band of a BRAND product resets the quantity to that band's minimum. It
  // NEVER inherits the previous quantity, another cart item's quantity, the
  // brand total or the bulk threshold — those stay logically separate (the
  // brand total is used ONLY for bulk eligibility). Category products and
  // ML/Gram brand variants keep their current quantity when switching.
  const handleVariantSelect = (v) => {
    setSelectedVariant(v)
    setVariantHint(false)
    // A new variant is a NEW selection — it has not been added to the cart.
    setSelectionInCart(false)
    if (
      isBrandProduct &&
      String(v.quantity_unit ?? '').trim().toLowerCase() === 'pieces' &&
      v.quantity_value != null
    ) {
      // Same `|| 1` guard as pieceBandRange so a corrupt (non-numeric)
      // quantity_value can never leave the quantity at NaN.
      setQty(Math.max(1, Math.floor(Number(v.quantity_value) || 1)))
    }
  }

  // Pieces the CURRENT selection would add to the brand tally.
  const selectionPieces =
    !variantSelected
      ? 0
      : pieceMode
        ? qty
        : hasVariants
          ? String(selectedVariant.quantity_unit ?? '').trim().toLowerCase() === 'pieces'
            ? Math.floor(Number(selectedVariant.quantity_value) || 0) * qty
            : qty
          : qty
  // The brand total shown on the page: the cart's REAL brand pieces plus the
  // current selection — but ONLY while that selection has not yet been added
  // to the cart (once added, the cart total already includes it; adding it
  // again would double-count, e.g. 60/90 becoming 120/90 after Add to Cart).
  const totalBrandPieces = isBrandBulkProduct
    ? productPageBrandPieces(cartBrandPieces, selectionPieces, selectionInCart)
    : 0
  // Multi-tier resolution: progress targets the FIRST tier; once unlocked,
  // the HIGHEST applicable tier drives the price, savings and the shown
  // threshold (100/150/200 pcs example: 149 → 100-tier ₹43, 150 → 150-tier
  // ₹42).
  const brandTiers = isBrandBulkProduct ? getBulkTiers(brandRule) : null
  const firstBulkTier = brandTiers ? brandTiers[0] : null
  const bulkMinQty = firstBulkTier ? firstBulkTier.minQuantity : 0
  const applicableTier = isBrandBulkProduct
    ? getApplicableBulkTier(brandRule, totalBrandPieces)
    : null
  const brandUnlocked = isBrandBulkProduct && Boolean(applicableTier)
  const brandRemaining = isBrandBulkProduct ? Math.max(0, bulkMinQty - totalBrandPieces) : 0
  // The applicable tier's rate once unlocked; the first tier's rate (the
  // advertised offer) while locked.
  const bulkPerPiece = applicableTier
    ? applicableTier.price
    : firstBulkTier
      ? firstBulkTier.price
      : 0
  const bulkThresholdShown = brandUnlocked && applicableTier ? applicableTier.minQuantity : bulkMinQty

  // Brand products with a bulk rule, OR a brand product whose selected Pieces
  // band is active, show a per-piece price + total (the exact math the cart
  // line charges — display can never diverge from the cart). Everything else
  // keeps the original variant-total display.
  const pieceStylePrice = isBrandBulkProduct || pieceMode

  // Per-piece pricing: the brand's bulk rate when the brand is unlocked AND
  // it is a genuine discount below the product's own per-piece price;
  // otherwise the product's normal per-piece price. Uses the SAME per-piece
  // semantics as the cart util (a Pieces variant's price-per-unit; a
  // non-Pieces variant's total per unit; product price for variant-less
  // items).
  // The line's own normal per-piece price (Pieces variant's price-per-unit,
  // non-Pieces variant's total per unit, product price for variant-less).
  const ownPerPiece =
    pieceStylePrice && variantSelected && hasVariants
      ? lineNormalPerPiece({
          variant_id: selectedVariant.id,
          quantity_unit: selectedVariant.quantity_unit,
          quantity_value: selectedVariant.quantity_value,
          variant_price_per_unit: Number(selectedVariant?.price_per_unit ?? selectedVariant?.price ?? 0),
          variant_total_price: Number(selectedVariant?.total_price ?? selectedVariant?.price ?? 0),
        })
      : Number(product.price)
  // The BRAND rule is the source of truth for the brand's PIECE-priced
  // products: when a Pieces band is selected, the brand's standard price is
  // the normal per-piece price (the product's own variant per-piece figure
  // may be stale — e.g. ₹45 while the brand rule says ₹50). ML/Gram variants
  // keep their own per-unit price.
  const brandStandardPerPiece = isBrandBulkProduct
    ? Number(brandRule?.standard_price ?? 0)
    : 0
  const useBrandStandard =
    isBrandBulkProduct &&
    pieceMode &&
    Number.isFinite(brandStandardPerPiece) &&
    brandStandardPerPiece > 0
  const normalPerPiece = useBrandStandard ? brandStandardPerPiece : ownPerPiece
  const bulkApplied =
    isBrandBulkProduct &&
    brandUnlocked &&
    bulkPerPiece > 0 &&
    bulkPerPiece < normalPerPiece
  const chargedPerPiece = bulkApplied ? bulkPerPiece : normalPerPiece
  const brandDisplayTotal =
    pieceStylePrice && variantSelected ? chargedPerPiece * selectionPieces : 0

  // --- Presentation derived values (display only — same underlying math) ---
  // The line total shown in the quantity section: the same total the cart
  // line will charge.
  const lineTotal =
    pieceStylePrice && variantSelected
      ? brandDisplayTotal
      : displayTotal
  // Top price row: per-piece price (bulk-aware) once a variant is chosen.
  const topPerPiece = pieceStylePrice
    ? chargedPerPiece
    : hasVariants
      ? perUnit
      : null
  const topPriceSuffix = pieceStylePrice
    ? (hasVariants && !pieceMode ? ' / unit' : ' / piece')
    : hasVariants
      ? ` / ${unitDisplay(selectedUnit)}`
      : ''
  // Stepper disable states. The + button stays enabled at a band's max when
  // a NEXT band exists — the existing auto-advance (handleIncrease →
  // nextVariant) must stay reachable; it is disabled only on the last band's
  // max.
  const canDecrease = pieceMode ? qty > pieceMin : qty > 1
  const canIncrease =
    pieceMode && pieceMax != null && !nextVariant ? qty < pieceMax : true
  // Bulk card progress + per-piece savings.
  const bulkPct = bulkMinQty > 0 ? Math.min(100, (totalBrandPieces / bulkMinQty) * 100) : 0
  const bulkSavingsPerPiece = bulkApplied
    ? Math.max(0, Number(normalPerPiece) - bulkPerPiece)
    : 0
  // Stock status — the DB currently has no stock column, so this renders only
  // when the API provides real stock data (defensive, never invented).
  const stockClass =
    product.stock == null
      ? ''
      : Number(product.stock) <= 0
        ? 'out-of-stock'
        : Number(product.stock) <= 10
          ? 'low-stock'
          : 'in-stock'
  const stockLabel =
    stockClass === 'out-of-stock'
      ? 'Out of stock'
      : stockClass === 'low-stock'
        ? 'Low stock'
        : 'In stock'

  // One-piece-at-a-time stepping within the selected band (bulk-brand Pieces
  // variants); the existing ±1 behaviour everywhere else.
  // Changing the quantity changes the selection — it is no longer the exact
  // line already in the cart, so the preview must count it again.
  const markSelectionChanged = () => setSelectionInCart(false)
  const handleDecrease = () => {
    markSelectionChanged()
    if (pieceMode) {
      setQty((q) => Math.max(pieceMin, q - 1))
    } else {
      setQty((q) => Math.max(1, q - 1))
    }
  }
  const handleIncrease = () => {
    markSelectionChanged()
    if (pieceMode) {
      if (pieceMax != null && qty >= pieceMax) {
        // The band's max is reached — the customer must select the next band.
        if (nextVariant) handleVariantSelect(nextVariant)
        return
      }
      setQty((q) => q + 1)
    } else {
      setQty((q) => q + 1)
    }
  }

  // Frontend-only wishlist toggle — no backend, no cart changes.
  const toggleWishlist = () => {
    setWishlistIds((prev) => {
      const pid = String(product.id)
      const next = prev.includes(pid)
        ? prev.filter((x) => x !== pid)
        : [...prev, pid]
      try {
        localStorage.setItem(WISHLIST_KEY, JSON.stringify(next))
      } catch {
        // Storage unavailable — the in-memory toggle still works for the session.
      }
      return next
    })
  }

  const handleAdd = () => {
    // A variant product can never be added without an explicit variant — show
    // a small existing-style validation hint instead of silently returning.
    if (hasVariants && !selectedVariant) {
      setVariantHint(true)
      return
    }
    setVariantHint(false)
    if (adding || addingRef.current) return

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
    addingRef.current = true
    try {
      // `qty` units of the selected variant. The cart line is priced at
      // variant TOTAL price × qty.
      // Bulk-brand products with a Pieces variant add an EXACT piece count
      // (quantity 1, priced per piece); everything else adds packs as before.
      const pieces = pieceMode ? qty : null
      addItem(
        {
          id: product.id,
          name: product.name,
          price: Number(product.price),
          image: product.image,
          brand_id: product.brand_id ?? null,
          brand_name: product.brand_name ?? null,
        },
        pieceMode ? 1 : qty,
        variantInfo,
        pieces
      )
      // The selection is now IN the cart — the brand total must come from the
      // updated cart alone, never selection + cart again.
      setSelectionInCart(true)
      addTimer.current = setTimeout(() => {
        addingRef.current = false
        setAdding(false)
        setAdded(true)
        notifyAddSuccess(product)
        addedTimer.current = setTimeout(() => setAdded(false), 2000)
      }, 350)
    } catch {
      addingRef.current = false
      setAdding(false)
      notifyAddError()
    }
  }

  return (
    <div className="container product-detail">
      <div className="product-detail-layout">
        {/* One main product image — the only image access on the page
            (the thumbnail/gallery navigation was removed). */}
        <div className="product-detail-gallery">
          <div className="product-detail-main-image">
            <img src={product.image} alt={product.name} />
          </div>
        </div>

        {/* Information — eyebrow · title · rating · price · description */}
        <div className="product-detail-info">
          {(product.brand_name || product.category_name) && (
            <p className="pd-eyebrow">{product.brand_name || product.category_name}</p>
          )}
          <h1 className="pd-title">{product.name}</h1>

          {product.rating != null && (
            <div className="pd-rating">
              <span className="pd-rating-star"><StarIcon /></span>
              <span className="pd-rating-value">{product.rating}</span>
              <span className="pd-rating-count">
                ({Number(product.review_count ?? 0).toLocaleString('en-IN')} reviews)
              </span>
            </div>
          )}

          {/* Per-piece price — revealed only after a variant is selected
              (existing behaviour). Green + struck normal while bulk is on. */}
          {variantSelected && (
            <div className="pd-price-row price-reveal">
              {bulkApplied && (
                <s className="pd-price-normal">₹{Number(normalPerPiece).toLocaleString('en-IN')}</s>
              )}
              {topPerPiece != null ? (
                <span className={`pd-price-per-piece ${bulkApplied ? 'is-bulk' : ''}`}>
                  ₹{Number(topPerPiece).toLocaleString('en-IN')}{topPriceSuffix}
                </span>
              ) : (
                <span className="pd-price-per-piece">
                  ₹{Number(totalPrice).toLocaleString('en-IN')}
                </span>
              )}
              {bulkApplied && <span className="pd-bulk-badge">✓ Bulk price</span>}
            </div>
          )}

          {/* Stock — only when the API supplies real stock data */}
          {product.stock != null && (
            <p className={`product-detail-stock ${stockClass}`}>✓ {stockLabel}</p>
          )}

          {/* Description with a "Read more" toggle for longer copy */}
          {product.description && (
            <div className="pd-desc-block">
              <p className={`pd-desc ${descOpen ? 'is-open' : ''}`}>{product.description}</p>
              {product.description.length > 120 && (
                <button
                  type="button"
                  className="pd-desc-toggle"
                  onClick={() => setDescOpen((o) => !o)}
                  aria-expanded={descOpen}
                >
                  {descOpen ? 'Read less' : 'Read more'}
                </button>
              )}
            </div>
          )}

          {/* Variant selection — strong dark active state */}
          {hasVariants && (
            <div className="variant-selector">
              <p className="pd-section-title">Select Variant</p>
              <div className="variant-options">
                {variants.map((v) => {
                  const active = selectedVariant?.id === v.id
                  return (
                    <button
                      key={v.id}
                      type="button"
                      className={`variant-option ${active ? 'is-active' : ''}`}
                      onClick={() => handleVariantSelect(v)}
                      aria-pressed={active}
                    >
                      {variantLabel(v)}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* Quantity — stepper + selected label + TOTAL. One quantity state,
              one handler pair, one Add to Cart — identical on every breakpoint. */}
          {variantSelected && (
            <div className="pd-quantity">
              <p className="pd-section-title">Quantity</p>
              <div className="pd-quantity-row">
                <div className="qty-selector" aria-label="Quantity">
                  <button
                    type="button"
                    onClick={handleDecrease}
                    disabled={!canDecrease}
                    aria-label="Decrease quantity"
                  >
                    −
                  </button>
                  <span aria-live="polite">{qty}</span>
                  <button
                    type="button"
                    onClick={handleIncrease}
                    disabled={!canIncrease}
                    aria-label="Increase quantity"
                  >
                    +
                  </button>
                </div>
                <div className="pd-qty-total">
                  <p className="pd-selected-label">
                    {hasVariants
                      ? `${variantLabel(selectedVariant)} selected`
                      : `${qty} selected`}
                  </p>
                  <p className="pd-total">
                    ₹{Number(lineTotal).toLocaleString('en-IN')}{' '}
                    <span className="pd-total-word">Total</span>
                  </p>
                </div>
              </div>
              {pieceMode && (
                <p className="qty-piece-hint">
                  {nextVariant
                    ? `${pieceMin}–${pieceMax} pieces of this size · next at ${variantLabel(nextVariant)}`
                    : `${pieceMin}+ pieces per selection`}
                </p>
              )}
            </div>
          )}

          {/* Compact bulk-pricing card — brand-level, live, one source of
              truth. GREEN information while unlocked; neutral when locked. */}
          {isBrandBulkProduct && variantSelected && (
            <div className="pd-bulk-card" aria-live="polite">
              <div className="pd-bulk-head">
                <span className={`pd-bulk-status ${brandUnlocked ? 'is-unlocked' : ''}`}>
                  {brandUnlocked ? '✓ Bulk Price Active' : '✓ Bulk Price'}
                </span>
                <span className="pd-bulk-rate">
                  ₹{Number(bulkPerPiece).toLocaleString('en-IN')} / piece
                </span>
              </div>
              {!brandUnlocked ? (
                <p className="pd-bulk-min">
                  From {Number(bulkMinQty).toLocaleString('en-IN')} pieces
                </p>
              ) : (
                <p className="pd-bulk-min">
                  Bulk rate from {Number(applicableTier.minQuantity).toLocaleString('en-IN')} pieces
                </p>
              )}
              <div className="pd-bulk-progress">
                <div className="pd-bulk-track">
                  <span
                    className={`pd-bulk-fill ${brandUnlocked ? 'is-unlocked' : ''}`}
                    style={{ width: `${bulkPct}%` }}
                  />
                </div>
                <span className="pd-bulk-count">
                  {Number(totalBrandPieces).toLocaleString('en-IN')} /{' '}
                  {Number(bulkThresholdShown).toLocaleString('en-IN')} pieces
                  {brandUnlocked && <span className="pd-bulk-check"> ✓</span>}
                </span>
              </div>
              {brandUnlocked ? (
                bulkSavingsPerPiece > 0 && (
                  <p className="pd-bulk-save">
                    You save ₹{Number(bulkSavingsPerPiece).toLocaleString('en-IN', { maximumFractionDigits: 2 })} / piece
                  </p>
                )
              ) : (
                <p className="pd-bulk-locked">
                  Add {Number(brandRemaining).toLocaleString('en-IN')} more{' '}
                  {product.brand_name || 'brand'} {pieceWord(brandRemaining)} to unlock bulk price
                </p>
              )}
            </div>
          )}

          {/* Primary action + wishlist */}
          <div className="product-detail-actions">
            <button
              className="btn btn-primary pd-add-btn"
              onClick={handleAdd}
              disabled={adding}
            >
              <BagIcon /> {adding ? 'Adding…' : added ? 'Added ✓' : 'Add to Cart'}
            </button>
            <button
              type="button"
              className={`pd-wishlist ${inWishlist ? 'is-saved' : ''}`}
              onClick={toggleWishlist}
              aria-pressed={inWishlist}
            >
              <HeartIcon filled={inWishlist} />
              {inWishlist ? 'Saved' : 'Wishlist'}
            </button>
          </div>

          {hasVariants && variantHint && (
            <p className="product-detail-variant-hint" role="alert">Please select a variant</p>
          )}

          {/* Benefits — gold icons, premium tone */}
          <div className="pd-benefits" aria-label="Why shop with us">
            <div className="pd-benefit">
              <QualityIcon size={18} />
              <div>
                <strong>100% Original</strong>
                <span>Authentic Products</span>
              </div>
            </div>
            <div className="pd-benefit">
              <SecureIcon size={18} />
              <div>
                <strong>Secure Packaging</strong>
                <span>Carefully packed</span>
              </div>
            </div>
            <div className="pd-benefit">
              <ShippingIcon size={18} />
              <div>
                <strong>Fast Delivery</strong>
                <span>Quick &amp; reliable</span>
              </div>
            </div>
            <div className="pd-benefit">
              <PhoneIcon size={18} />
              <div>
                <strong>Easy Support</strong>
                <span>We're here to help</span>
              </div>
            </div>
          </div>
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
