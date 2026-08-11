import { useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { getProductById, getRelatedProducts } from '../services/mockApi'
import { useCart } from '../context/CartContext'
import { useToast } from '../context/ToastContext'
import { lineNormalPerPiece, pieceBandRange, pieceWord, productPageBrandPieces } from '../utils/brandBulk'
import ProductGrid from '../components/product/ProductGrid'
import SkeletonProductDetail from '../components/skeleton/SkeletonProductDetail'
import './ProductDetail.css'

// Display unit for the per-unit price (e.g. "₹10 / piece").
function unitDisplay(unit) {
  return String(unit || '').toLowerCase()
}

export default function ProductDetail() {
  const { id } = useParams()
  const { addItem, brandPieces, bulkRules } = useCart()
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
  // True once the CURRENT selection (variant + quantity) has actually been
  // added to the cart. While false, the bulk preview shows cart + selection;
  // once true, the cart already contains those pieces and the preview must
  // NOT add them again (the double-counting bug). Reset on every selection
  // change; set after a successful add.
  const [selectionInCart, setSelectionInCart] = useState(false)
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
    setActiveImage(0)
    setAdded(false)
    // Deliberately NOT auto-selecting a variant: the customer must choose
    // one explicitly before any price is revealed.
    setSelectedVariant(null)
    setVariantHint(false)
    setQty(1)
    setSelectionInCart(false)
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
  const bulkMinQty = isBrandBulkProduct ? Math.floor(Number(brandRule.bulk_min_qty)) : 0
  const brandUnlocked = isBrandBulkProduct && totalBrandPieces >= bulkMinQty
  const brandRemaining = isBrandBulkProduct ? Math.max(0, bulkMinQty - totalBrandPieces) : 0
  const bulkPerPiece = isBrandBulkProduct ? Number(brandRule.bulk_unit_price) : 0

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
  // Per-piece label: "piece" for Pieces variants and variant-less products,
  // "unit" for ML/Gram variants (where one unit counts as one piece).
  const bulkUnitLabel =
    pieceStylePrice && hasVariants && !pieceMode
      ? 'unit'
      : 'piece'

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
            select). Brand products with a bulk rule show the per-piece price
            + total so the bulk rate is visible live. Variant products show
            NO price until a variant is chosen. */}
        {!hasVariants && !pieceStylePrice && (
          <p className="product-detail-price">₹{Number(totalPrice).toLocaleString('en-IN')}</p>
        )}

        {!hasVariants && pieceStylePrice && (
          <div className="product-detail-price-block price-reveal">
            <p className="product-detail-per-unit">
              ₹{Number(chargedPerPiece).toLocaleString('en-IN')} / piece
              {bulkApplied && <span className="product-detail-bulk-note"> · bulk price</span>}
            </p>
            <p className="product-detail-price">
              ₹{brandDisplayTotal.toLocaleString('en-IN')}{' '}
              <span className="product-detail-price-total">total</span>
            </p>
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

        {/* Price appears ONLY after the customer explicitly selects a variant. */}
        {hasVariants && variantSelected && !pieceStylePrice && (
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

        {/* Brand products: per-piece price + total (bulk-aware when active). */}
        {hasVariants && variantSelected && pieceStylePrice && (
          <div className="product-detail-price-block price-reveal">
            <p className="product-detail-per-unit">
              ₹{Number(chargedPerPiece).toLocaleString('en-IN')} / {bulkUnitLabel}
              {bulkApplied && <span className="product-detail-bulk-note"> · bulk price</span>}
            </p>
            <p className="product-detail-selected-label">{variantLabel(selectedVariant)} selected</p>
            <p className="product-detail-price">
              ₹{brandDisplayTotal.toLocaleString('en-IN')}{' '}
              <span className="product-detail-price-total">total</span>
            </p>
          </div>
        )}

        {/* Brand bulk panel — live progress toward the unlock + state. */}
        {isBrandBulkProduct && variantSelected && (
          <div className="brand-bulk-panel" aria-live="polite">
            <div className="brand-bulk-panel-head">
              <span className="brand-bulk-title">
                Bulk Price: ₹{Number(bulkPerPiece).toLocaleString('en-IN')} / piece
              </span>
              <span className="brand-bulk-min">
                from {Number(bulkMinQty).toLocaleString('en-IN')} pieces
              </span>
            </div>
            <div className="brand-bulk-progress">
              <div className="brand-bulk-progress-track">
                <span
                  className={`brand-bulk-progress-fill ${brandUnlocked ? 'is-unlocked' : ''}`}
                  style={{
                    width: `${bulkMinQty > 0 ? Math.min(100, (totalBrandPieces / bulkMinQty) * 100) : 0}%`,
                  }}
                />
              </div>
              <span className="brand-bulk-progress-label">
                {totalBrandPieces.toLocaleString('en-IN')} / {bulkMinQty.toLocaleString('en-IN')} pieces
              </span>
            </div>
            {brandUnlocked ? (
              <p className="brand-bulk-unlocked">
                ✓ Bulk price unlocked — ₹{Number(bulkPerPiece).toLocaleString('en-IN')} / piece applied
              </p>
            ) : (
              <p className="brand-bulk-locked">
                Add {Number(brandRemaining).toLocaleString('en-IN')} more {product.brand_name || 'brand'} {pieceWord(brandRemaining)} to unlock bulk price
              </p>
            )}
          </div>
        )}

        <div className="product-detail-actions">
          {/* Quantity control appears only after a variant is selected. */}
          {variantSelected && (
            <div className="qty-control-wrap">
              <div className="qty-selector" aria-label="Quantity">
                <button
                  type="button"
                  onClick={handleDecrease}
                  disabled={pieceMode ? qty <= pieceMin : qty <= 1}
                  aria-label="Decrease quantity"
                >
                  −
                </button>
                <span aria-live="polite">{qty}</span>
                <button
                  type="button"
                  onClick={handleIncrease}
                  aria-label="Increase quantity"
                >
                  +
                </button>
              </div>
              {pieceMode && nextVariant && (
                <p className="qty-piece-hint">
                  {pieceMin}–{pieceMax} pieces of this size · next at {variantLabel(nextVariant)}
                </p>
              )}
              {pieceMode && !nextVariant && (
                <p className="qty-piece-hint">{pieceMin}+ pieces per selection</p>
              )}
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
