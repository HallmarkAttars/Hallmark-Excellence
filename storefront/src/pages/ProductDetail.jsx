import { useEffect, useRef, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { getProductById, getRelatedProducts } from '../services/mockApi'
import { cloudinarySrc } from '../utils/productImage'
import { useCart } from '../context/CartContext'
import { useToast } from '../context/ToastContext'
import {
  getApplicableBulkTier,
  getBulkTiers,
  lineNormalPerPiece,
  pieceWord,
  productPageBrandPieces,
  round2,
} from '../utils/brandBulk'
import { getStockStatus, isProductInStock } from '../utils/stock'
import { getDefaultVariant } from '../utils/productPricing'
import ProductGrid from '../components/product/ProductGrid'
import SkeletonProductDetail from '../components/skeleton/SkeletonProductDetail'
import SEO from '../components/seo/SEO'
import { buildProductSchema, buildBreadcrumbsSchema } from '../utils/seo'
import './ProductDetail.css'

// Extract piece quantity from a variant (either quantity_value or numeric match from display_label)
export function getVariantAmount(v) {
  if (!v) return 1
  if (typeof v === 'number') return v
  if (v.quantity_value != null && Number.isFinite(Number(v.quantity_value)) && Number(v.quantity_value) > 0) {
    return Math.floor(Number(v.quantity_value))
  }
  const match = String(v.display_label || '').match(/(\d+)/)
  if (match) {
    const parsed = parseInt(match[1], 10)
    if (Number.isFinite(parsed) && parsed > 0) return parsed
  }
  return 1
}

export function isPieceVariant(v) {
  if (!v) return false
  const u = String(v.quantity_unit ?? '').trim().toLowerCase()
  const l = String(v.display_label ?? '').toLowerCase()
  return u === 'pieces' || l.includes('piece')
}

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

export default function ProductDetail({ onAddToCart }) {
  const { id } = useParams()
  const [searchParams] = useSearchParams()
  const variantParam = searchParams.get('variant')
  const { addItem, brandPieces, bulkRules } = useCart()
  const { notifyAddSuccess, notifyAddError } = useToast()
  const [product, setProduct] = useState(null)
  const [related, setRelated] = useState([])
  const [loading, setLoading] = useState(true)
  const [added, setAdded] = useState(false)
  // Two completely separate state values: selectedVariant and quantity.
  // selectedVariant tracks the variant value (e.g. 216).
  // quantity tracks the local quantity (e.g. 216, 217, 218...).
  const [selectedVariant, setSelectedVariant] = useState(null)
  const [selectedVariantId, setSelectedVariantId] = useState(null)
  const [quantity, setQuantity] = useState(1)
  const qty = quantity
  const setQty = setQuantity

  // "Please select a variant" hint when Add to Cart is clicked too early.
  const [variantHint, setVariantHint] = useState(false)
  const [error, setError] = useState(null)
  const [reloadKey, setReloadKey] = useState(0)
  const [adding, setAdding] = useState(false)
  const [selectionInCart, setSelectionInCart] = useState(false)
  // Description "Read more" — purely visual (line clamp), no data change.
  const [descOpen, setDescOpen] = useState(false)
  // Frontend-only wishlist toggle (localStorage).
  const [wishlistIds, setWishlistIds] = useState(readWishlist)
  const addedTimer = useRef(null)
  const addTimer = useRef(null)
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
    setSelectedVariant(null)
    setSelectedVariantId(null)
    setVariantHint(false)
    setQuantity(1)
    setSelectionInCart(false)
    setDescOpen(false)
    addingRef.current = false
    getProductById(id, { refresh: reloadKey > 0 })
      .then((p) => {
        setProduct(p)
        setLoading(false)
        if (p) {
          const variants = Array.isArray(p.variants) ? p.variants : []
          let activeVar = null
          if (variantParam && variants.length > 0) {
            activeVar = variants.find((v) => String(v.id) === String(variantParam))
          }
          if (!activeVar) {
            activeVar = getDefaultVariant(p)
          }

          if (activeVar) {
            const isPiece = isPieceVariant(activeVar)
            const varAmount = getVariantAmount(activeVar)
            setSelectedVariant(isPiece ? varAmount : 1)
            setSelectedVariantId(activeVar.id)
            setQuantity(isPiece ? Math.max(1, varAmount) : 1)
          }
          getRelatedProducts(p).then(setRelated).catch(() => {})
        }
      })
      .catch((err) => {
        setError(err.message || 'Failed to load product.')
        setLoading(false)
      })
  }, [id, reloadKey, variantParam])

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

  const defaultVariant =
    getDefaultVariant(product) ||
    (variants.length ? variants.find((v) => v.is_default) || variants[0] : null)

  const activeVariant = hasVariants
    ? (variants.find((v) => String(v.id) === String(selectedVariantId)) ||
       variants.find((v) => getVariantAmount(v) === selectedVariant) ||
       defaultVariant ||
       variants[0] ||
       null)
    : null

  const isBrandProduct = product.brand_id != null
  const pieceMode = hasVariants && Boolean(activeVariant && isPieceVariant(activeVariant))

  const variantSelected = hasVariants ? Boolean(activeVariant || selectedVariant) : true
  const totalPrice = hasVariants
    ? Number(activeVariant?.total_price ?? activeVariant?.price ?? 0)
    : Number(product.price)
  const perUnit = hasVariants
    ? Number(
        activeVariant?.price_per_unit ??
          (isPieceVariant(activeVariant) && getVariantAmount(activeVariant) > 0
            ? Number(activeVariant.total_price ?? activeVariant.price ?? 0) / getVariantAmount(activeVariant)
            : activeVariant?.price) ??
          0
      )
    : null
  const selectedUnit = hasVariants ? activeVariant?.quantity_unit : null

  const variantLabel = (v) => {
    if (!v) return ''
    if (v.display_label) return v.display_label
    const val = v.quantity_value ?? getVariantAmount(v)
    const unit = v.quantity_unit || 'Pieces'
    return `${val} ${unit}`.trim()
  }

  // Stock resolution: product-level boolean availability (single source of truth)
  const isInStock = isProductInStock(product)
  const stockInfo = getStockStatus(isInStock)
  const isOutOfStock = !isInStock

  // --- Brand-level bulk pricing (brand products only) ----------------------
  const brandRule =
    product.brand_id != null ? bulkRules[String(product.brand_id)] || null : null
  const isBrandBulkProduct = Boolean(brandRule)
  const cartBrandPieces =
    product.brand_id != null ? brandPieces[String(product.brand_id)] || 0 : 0

  const handleVariantSelect = (v) => {
    if (!v) return
    const isPiece = isPieceVariant(v)
    const varAmount = getVariantAmount(v)
    const varId = v.id != null ? v.id : (typeof v === 'object' ? v.id : null)

    setSelectedVariant(isPiece ? varAmount : 1)
    if (varId != null) setSelectedVariantId(varId)
    // When the user selects a variant, quantity matches that variant amount
    setQuantity(isPiece ? Math.max(1, varAmount) : 1)
    setVariantHint(false)
    setSelectionInCart(false)
  }

  // Pieces the CURRENT selection would add to the brand tally.
  const selectionPieces =
    !variantSelected
      ? 0
      : pieceMode
        ? quantity
        : hasVariants
          ? isPieceVariant(activeVariant)
            ? getVariantAmount(activeVariant) * quantity
            : quantity
          : quantity

  const totalBrandPieces = isBrandBulkProduct
    ? productPageBrandPieces(cartBrandPieces, selectionPieces, selectionInCart)
    : 0

  const brandTiers = isBrandBulkProduct ? getBulkTiers(brandRule) : null
  const firstBulkTier = brandTiers ? brandTiers[0] : null
  const bulkMinQty = firstBulkTier ? firstBulkTier.minQuantity : 0
  const applicableTier = isBrandBulkProduct
    ? getApplicableBulkTier(brandRule, totalBrandPieces)
    : null
  const brandUnlocked = isBrandBulkProduct && Boolean(applicableTier)
  const brandRemaining = isBrandBulkProduct ? Math.max(0, bulkMinQty - totalBrandPieces) : 0
  const bulkPerPiece = applicableTier
    ? applicableTier.price
    : firstBulkTier
      ? firstBulkTier.price
      : 0
  const bulkThresholdShown = brandUnlocked && applicableTier ? applicableTier.minQuantity : bulkMinQty

  const pieceStylePrice = isBrandBulkProduct || pieceMode

  const ownPerPiece =
    pieceStylePrice && variantSelected && hasVariants && activeVariant
      ? lineNormalPerPiece({
          variant_id: activeVariant.id,
          quantity_unit: activeVariant.quantity_unit || (isPieceVariant(activeVariant) ? 'Pieces' : ''),
          quantity_value: activeVariant.quantity_value ?? selectedVariant,
          variant_price_per_unit: Number(
            activeVariant?.price_per_unit ??
              (isPieceVariant(activeVariant) && getVariantAmount(activeVariant) > 0
                ? Number(activeVariant.total_price ?? activeVariant.price ?? 0) / getVariantAmount(activeVariant)
                : activeVariant.price ?? 0)
          ),
          variant_total_price: Number(activeVariant?.total_price ?? activeVariant?.price ?? 0),
        })
      : Number(product.price)

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

  // Unit price and immediate recalculation of total = unitPrice * quantity
  const getUnitPrice = () => {
    if (bulkApplied && bulkPerPiece > 0) {
      return bulkPerPiece
    }
    if (pieceStylePrice && normalPerPiece > 0) {
      return normalPerPiece
    }
    if (hasVariants && activeVariant) {
      const varTotal = Number(activeVariant.total_price ?? activeVariant.price ?? 0)
      const varAmount = getVariantAmount(activeVariant)
      if (varAmount > 0 && isPieceVariant(activeVariant)) {
        return varTotal / varAmount
      }
      const varPpu = Number(activeVariant.price_per_unit)
      if (Number.isFinite(varPpu) && varPpu > 0) {
        return varPpu
      }
      return varTotal
    }
    return Number(product.price || 0)
  }

  const unitPrice = getUnitPrice()
  const lineTotal =
    hasVariants && activeVariant && quantity === getVariantAmount(activeVariant) && !bulkApplied
      ? Number(activeVariant.total_price ?? activeVariant.price ?? 0)
      : round2(unitPrice * quantity)

  // Top price row: per-piece price (bulk-aware) once a variant is chosen.
  const topPerPiece = pieceStylePrice
    ? chargedPerPiece
    : (hasVariants && isPieceVariant(activeVariant)
        ? unitPrice
        : perUnit)
  const topPriceSuffix = pieceStylePrice
    ? (hasVariants && !pieceMode ? ' / unit' : ' / piece')
    : hasVariants
      ? ` / ${unitDisplay(selectedUnit)}`
      : ''

  // Stepper disable states
  const minAllowed = Number.isFinite(Number(selectedVariant)) && Number(selectedVariant) > 0
    ? Number(selectedVariant)
    : 1
  const canDecrease = !isOutOfStock && quantity > minAllowed
  const canIncrease = !isOutOfStock

  const bulkPct = bulkMinQty > 0 ? Math.min(100, (totalBrandPieces / bulkMinQty) * 100) : 0
  const bulkSavingsPerPiece = bulkApplied
    ? Math.max(0, Number(normalPerPiece) - bulkPerPiece)
    : 0

  const markSelectionChanged = () => setSelectionInCart(false)

  // Stepper handlers: update React state locally without changing selectedVariant
  const handleDecrease = () => {
    if (isOutOfStock) return
    markSelectionChanged()
    setQuantity((q) => {
      const minVal = Number.isFinite(Number(selectedVariant)) && Number(selectedVariant) > 0
        ? Number(selectedVariant)
        : 1
      const current = Number.isInteger(q) && q > 0 ? q : minVal
      return Math.max(minVal, current - 1)
    })
  }

  const handleIncrease = () => {
    if (isOutOfStock) return
    markSelectionChanged()
    setQuantity((q) => {
      const minVal = Number.isFinite(Number(selectedVariant)) && Number(selectedVariant) > 0
        ? Number(selectedVariant)
        : 1
      const current = Number.isInteger(q) && q > 0 ? q : minVal
      return current + 1
    })
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
    if (hasVariants && !activeVariant) {
      setVariantHint(true)
      return
    }
    setVariantHint(false)
    if (isOutOfStock || adding || addingRef.current) return

    const cartPayload = {
      productId: product.id,
      variantId: activeVariant?.id ?? null,
      selectedVariant: selectedVariant,
      quantity: quantity,
    }

    if (typeof onAddToCart === 'function') {
      onAddToCart(cartPayload)
    }

    const variantInfo = hasVariants && activeVariant
      ? {
          variant_id: activeVariant.id,
          variantId: activeVariant.id,
          variant_label: variantLabel(activeVariant),
          quantity_value: selectedVariant,
          quantity_unit: activeVariant.quantity_unit || (isPieceVariant(activeVariant) ? 'Pieces' : ''),
          min_quantity: selectedVariant,
          total_price: Number(activeVariant.total_price ?? activeVariant.price),
          price_per_unit: Number(activeVariant.price_per_unit ?? unitPrice),
          is_default: String(activeVariant.id) === String(defaultVariant?.id),
          selectedVariant: selectedVariant,
          quantity: quantity,
        }
      : null

    setAdding(true)
    addingRef.current = true
    try {
      const pieces = pieceMode ? quantity : null
      addItem(
        {
          id: product.id,
          productId: product.id,
          name: product.name,
          price: Number(product.price),
          image: product.image,
          stock: product.stock != null ? Number(product.stock) : null,
          brand_id: product.brand_id ?? null,
          brand_name: product.brand_name ?? null,
          variantId: activeVariant?.id ?? null,
          selectedVariant: selectedVariant,
          quantity: quantity,
        },
        pieceMode ? 1 : quantity,
        variantInfo,
        pieces
      )
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

  const brandTitle = product.brand_name || 'Arees Perfumes'
  const seoTitle = `${product.name} | ${brandTitle} | Arees Perfumes`
  const seoDesc = product.description
    ? (product.description.length > 155
        ? `${product.description.slice(0, 152)}...`
        : product.description)
    : `Shop ${product.name} from Arees Perfumes. Explore premium attars, oud and fragrances with delivery across India.`
  const ogImg = cloudinarySrc(product.image, { width: 1200 }) || product.image

  const breadcrumbItems = [
    { name: 'Home', path: '/' },
    { name: 'Shop', path: '/shop' },
  ]
  if (product.brand_name) {
    breadcrumbItems.push({
      name: product.brand_name,
      path: `/brand/${product.brand_slug || 'arees'}`,
    })
  }
  if (product.category_name) {
    breadcrumbItems.push({
      name: product.category_name,
      path: `/categories/${product.category_slug || 'attars'}`,
    })
  }
  breadcrumbItems.push({
    name: product.name,
    path: `/product/${product.id}`,
  })

  const productSchema = [
    buildProductSchema(product),
    buildBreadcrumbsSchema(breadcrumbItems),
  ].filter(Boolean)

  return (
    <div className="container product-detail">
      <SEO
        title={seoTitle}
        description={seoDesc}
        canonical={`/product/${product.id}`}
        image={ogImg}
        type="product"
        schema={productSchema}
      />

      {/* Visible Breadcrumbs */}
      <nav className="pd-breadcrumbs" aria-label="Breadcrumb">
        <Link to="/">Home</Link>
        <span className="pd-breadcrumb-sep">/</span>
        <Link to="/shop">Shop</Link>
        {product.brand_name && (
          <>
            <span className="pd-breadcrumb-sep">/</span>
            <Link to={`/brand/${product.brand_slug || 'arees'}`}>{product.brand_name}</Link>
          </>
        )}
        {product.category_name && (
          <>
            <span className="pd-breadcrumb-sep">/</span>
            <Link to={`/categories/${product.category_slug || 'attars'}`}>{product.category_name}</Link>
          </>
        )}
        <span className="pd-breadcrumb-sep">/</span>
        <span className="pd-breadcrumb-current" aria-current="page">{product.name}</span>
      </nav>

      <div className="product-detail-layout">
        {/* One main product image — the only image access on the page
            (the thumbnail/gallery navigation was removed). */}
        <div className="product-detail-gallery">
          <div className="product-detail-main-image">
            {/* Main (LCP) product image — eager, optimized Cloudinary size */}
            <img
              src={cloudinarySrc(product.image, { width: 900 })}
              alt={`${product.name} - ${brandTitle} attar`}
              decoding="async"
              fetchPriority="high"
            />
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

          {/* Stock status — shows for product */}
          {stockInfo != null && (
            <p className={`product-detail-stock ${stockInfo.badgeClass}`}>
              {stockInfo.badgeText}
            </p>
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

          {/* Bulk-pricing card — brand-level, live, one source of truth.
              Positioned directly under the description so the offer is
              visible before any variant is picked (progress shows the
              cart's brand pieces + the current selection). GREEN
              information while unlocked; neutral when locked. */}
          {isBrandBulkProduct && (
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

          {/* Variant selection — strong dark active state */}
          {hasVariants && (
            <div className="variant-selector">
              <p className="pd-section-title">Select Variant</p>
              <div className="variant-options">
                {variants.map((v) => {
                  const active = activeVariant
                    ? String(activeVariant.id) === String(v.id)
                    : (selectedVariant != null && getVariantAmount(v) === selectedVariant)
                  return (
                    <button
                      key={v.id}
                      type="button"
                      className={`variant-option ${active ? 'is-active' : ''} ${isOutOfStock ? 'is-out-of-stock' : ''}`}
                      onClick={() => handleVariantSelect(v)}
                      aria-pressed={active}
                    >
                      {variantLabel(v)} {isOutOfStock ? '(Out of Stock)' : ''}
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
                  <span aria-live="polite">{quantity}</span>
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
                    {hasVariants && activeVariant
                      ? `${variantLabel(activeVariant)} selected`
                      : `${quantity} selected`}
                  </p>
                  <p className="pd-total">
                    ₹{Number(lineTotal).toLocaleString('en-IN')}{' '}
                    <span className="pd-total-word">Total</span>
                  </p>
                </div>
              </div>
              {pieceMode && (
                <p className="qty-piece-hint">
                  {selectedVariant}+ pieces per selection
                </p>
              )}
            </div>
          )}

          {/* Primary action + wishlist */}
          <div className="product-detail-actions">
            <button
              className={`btn btn-primary pd-add-btn ${isOutOfStock ? 'is-out-of-stock' : ''}`}
              onClick={handleAdd}
              disabled={adding || isOutOfStock}
            >
              <BagIcon /> {isOutOfStock ? 'Out of Stock' : adding ? 'Adding…' : added ? 'Added ✓' : 'Add to Cart'}
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
