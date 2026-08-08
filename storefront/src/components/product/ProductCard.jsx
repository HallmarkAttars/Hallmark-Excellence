import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useCart } from '../../context/CartContext'
import { useToast } from '../../context/ToastContext'
import { hasAnyBulk } from '../../utils/bulk'
import QuantityControl from './QuantityControl'
import QuickView from './QuickView'
import './ProductCard.css'

// Graceful image fallback — an inline cream placeholder with the house
// monogram. Only used when the real product image fails to load; no data
// is created or changed.
const PLACEHOLDER_IMG =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='800' height='600' viewBox='0 0 800 600'%3E%3Crect width='800' height='600' fill='%23F0E7D8'/%3E%3Ctext x='400' y='340' font-family='Georgia, serif' font-size='110' fill='%23B88938' text-anchor='middle'%3EA%26D%3C/text%3E%3C/svg%3E"

function BagIcon() {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M5 8h14l-1.2 11a2 2 0 0 1-2 1.8H8.2a2 2 0 0 1-2-1.8L5 8Z" />
      <path d="M8.5 10V6.5a3.5 3.5 0 0 1 7 0V10" />
    </svg>
  )
}

function EyeIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  )
}

export default function ProductCard({ product, onNavigate }) {
  const { items, addItem, updateQty, removeItem } = useCart()
  const { notifyAddSuccess, notifyAddError } = useToast()
  const [quickViewOpen, setQuickViewOpen] = useState(false)
  const [adding, setAdding] = useState(false)
  const addTimer = useRef(null)

  // Clear the cosmetic ADDING timer if the card unmounts mid-flight.
  useEffect(() => () => clearTimeout(addTimer.current), [])

  // Surface the default variant's size/label when the product has variants.
  const variants = Array.isArray(product.variants) ? product.variants : []
  const defaultVariant = variants.find((v) => v.is_default) || variants[0]
  const variantLabel = defaultVariant
    ? defaultVariant.display_label ||
      (defaultVariant.quantity_value != null && defaultVariant.quantity_unit
        ? `${defaultVariant.quantity_value} ${defaultVariant.quantity_unit}`
        : '')
    : ''

  const hasVariants = variants.length > 0
  const soldOut = Number(product.stock) <= 0

  // Price is already resolved to the default variant price by the API.
  const price = Number(product.price)
  const hasPrice = Number.isFinite(price) && price > 0

  // When the product has variants, the card always operates on the default
  // variant — exactly like the product detail page — so the card's quantity
  // controls and the detail page share one cart line per product.
  const variantForCart = hasVariants
    ? {
        variant_id: defaultVariant.id,
        variant_label: variantLabel,
        quantity_value: defaultVariant.quantity_value,
        quantity_unit: defaultVariant.quantity_unit,
        price: Number(defaultVariant.price),
        stock: defaultVariant.stock,
        is_default: true,
        // The card adds the DEFAULT variant, so it carries that size's own
        // bulk config (per-variant bulk).
        bulk_enabled: defaultVariant.bulk_enabled === true,
        bulk_price: defaultVariant.bulk_price != null ? Number(defaultVariant.bulk_price) : null,
        bulk_min_qty: defaultVariant.bulk_min_qty != null ? Number(defaultVariant.bulk_min_qty) : null,
      }
    : null

  const cartLine = items.find((i) =>
    hasVariants
      ? i.product_id === product.id && i.variant_id === defaultVariant.id
      : i.product_id === product.id && i.variant_id == null
  )
  const lineKey = hasVariants
    ? `${product.id}-v${defaultVariant.id}`
    : `${product.id}-`

  // Stock cap for the quantity control — uses existing stock data only.
  // Variant lines carry their own stock; legacy products use product.stock.
  // When no stock field exists, no cap is applied.
  const maxStock =
    cartLine?.stock != null
      ? cartLine.stock
      : Number(product.stock) > 0
        ? Number(product.stock)
        : null

  // Conditional rows — only render when real data exists. No invented values.
  const hasRating = product.rating != null && Number.isFinite(Number(product.rating))
  // 4.80 → 4.8, 4.00 → 4 (matches the “★ 4.8” card format)
  const ratingDisplay = hasRating
    ? Number(product.rating).toFixed(2).replace(/\.?0+$/, '')
    : ''
  const compareAt = product.compare_at_price ?? product.original_price
  const showCompareAt =
    compareAt != null &&
    Number.isFinite(Number(compareAt)) &&
    Number(compareAt) > price
  // Discount chip is derived from the same existing compare-at logic.
  // Guarded to > 0 so a sub-1% rounding (e.g. 999 vs 1000) never shows “0% OFF”.
  const discountPct = showCompareAt
    ? Math.round((1 - price / Number(compareAt)) * 100)
    : null
  const showDiscount = discountPct != null && discountPct > 0
  // Subtle listing indicator — shown when bulk pricing is available on this
  // product at all (any variant, or the product itself for variant-less
  // products). Cards deliberately do NOT show a specific bulk price before a
  // size is selected; the detail page shows the exact numbers per variant.
  const showBulk = hasAnyBulk(product)

  const handleAdd = () => {
    if (soldOut || adding) return
    setAdding(true)
    try {
      // Existing cart operation — unchanged. Runs synchronously, so the brief
      // ADDING state is purely perceived feedback + a duplicate-click guard.
      addItem(product, 1, variantForCart)
      addTimer.current = setTimeout(() => {
        setAdding(false)
        // Success notification ONLY after the cart operation succeeded.
        notifyAddSuccess(product)
      }, 400)
    } catch {
      // Real cart errors are never hidden — show the error notification.
      setAdding(false)
      notifyAddError()
    }
  }

  const formatPrice = (value) => `₹${Number(value).toLocaleString('en-IN')}`

  // Optional callback fired before the card navigates to the product page.
  // Lets embedding surfaces (e.g. the search overlay) close themselves on
  // navigation. Not used by the regular product grids.
  const handleNavigate = () => {
    if (onNavigate) onNavigate()
  }

  const handleImgError = (e) => {
    e.currentTarget.onerror = null
    e.currentTarget.src = PLACEHOLDER_IMG
  }

  return (
    <div className="product-card">
      <div className="product-card-media">
        <Link
          to={`/product/${product.id}`}
          className="product-card-image-link"
          onClick={handleNavigate}
          aria-label={`View ${product.name}`}
        >
          <img
            src={product.image}
            alt={product.name}
            loading="lazy"
            onError={handleImgError}
          />
        </Link>

        {/* Reference layout: the top-left badge area carries status badges only
            (e.g. Sold Out). The discount lives in the price row as "25% OFF"
            — matching the reference card. No badges are ever invented. */}
        {soldOut && (
          <div className="product-card-badges">
            <span className="product-card-badge is-soldout">Sold Out</span>
          </div>
        )}

        <button
          type="button"
          className="product-card-quickview"
          onClick={() => setQuickViewOpen(true)}
          aria-label={`Quick view ${product.name}`}
        >
          <EyeIcon />
          Quick View
        </button>
      </div>

      <div className="product-card-body">
        {(product.brand_name || hasRating) && (
          <div className="product-card-topline">
            {product.brand_name && (
              <p className="product-card-brand">{product.brand_name}</p>
            )}

            {hasRating && (
              <p className="product-card-rating">
                <span className="pc-star" aria-hidden="true">★</span>
                <span>{ratingDisplay}</span>
                {product.review_count != null && (
                  <span className="pc-count">({product.review_count})</span>
                )}
              </p>
            )}
          </div>
        )}

        <Link
          to={`/product/${product.id}`}
          className="product-card-name-link"
          onClick={handleNavigate}
        >
          <h3 className="product-card-name">{product.name}</h3>
        </Link>

        {(product.category_name || variantLabel) && (
          <p className="product-card-meta">
            {[product.category_name, variantLabel].filter(Boolean).join('  |  ')}
          </p>
        )}

        {hasPrice && (
          <div className="product-card-price-row">
            <span className="product-card-price">{formatPrice(price)}</span>
            {showCompareAt && (
              <span className="product-card-compare">
                {formatPrice(Number(compareAt))}
              </span>
            )}
            {showDiscount && (
              <span className="product-card-discount">{discountPct}% OFF</span>
            )}
          </div>
        )}

        {showBulk && (
          <div className="product-card-bulk">
            <span className="product-card-bulk-chip">
              <span aria-hidden="true">🔥</span> Bulk Price Available
            </span>
          </div>
        )}

        {cartLine ? (
          <QuantityControl
            className="product-card-qty"
            value={cartLine.quantity}
            max={maxStock}
            onChange={(n) => updateQty(lineKey, n)}
            onRemove={() => removeItem(lineKey)}
            labels={{
              label: `Quantity for ${product.name}`,
              decrease: `Decrease quantity of ${product.name}`,
              increase: `Increase quantity of ${product.name}`,
              input: `Quantity of ${product.name}`,
            }}
          />
        ) : (
          <button
            type="button"
            className="btn product-card-btn"
            onClick={handleAdd}
            disabled={soldOut || adding}
            aria-label={`Add ${product.name} to cart`}
          >
            {soldOut ? (
              'Sold Out'
            ) : adding ? (
              'Adding…'
            ) : (
              <>
                <BagIcon />
                Add to Cart
              </>
            )}
          </button>
        )}
      </div>

      {quickViewOpen && (
        <QuickView
          product={product}
          onClose={() => setQuickViewOpen(false)}
          onNavigate={onNavigate}
        />
      )}
    </div>
  )
}
