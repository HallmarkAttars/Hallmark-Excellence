import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useCart } from '../../context/CartContext'
import QuantityControl from './QuantityControl'
import './ProductCard.css'

<<<<<<< HEAD
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

export default function ProductCard({ product, onNavigate }) {
  const { items, addItem, updateQty, removeItem } = useCart()

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
  const tag = product.category_name || product.brand_name || ''
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
  const showBulk =
    product.bulk_price != null &&
    product.bulk_min_qty != null &&
    Number(product.bulk_price) > 0
    && Number(product.bulk_min_qty) > 0

  const handleAdd = () => {
    if (soldOut) return
    addItem(product, 1, variantForCart)
  }

  const formatPrice = (value) => `₹${Number(value).toLocaleString('en-IN')}`

  // Optional callback fired before the card navigates to the product page.
  // Lets embedding surfaces (e.g. the search overlay) close themselves on
  // navigation. Not used by the regular product grids.
  const handleNavigate = () => {
    if (onNavigate) onNavigate()
=======
export default function ProductCard({ product }) {
  const { addItem } = useCart()
  const [imgLoaded, setImgLoaded] = useState(false)
  const [wishlisted, setWishlisted] = useState(false)
  const [added, setAdded] = useState(false)

  const handleAdd = (e) => {
    e.preventDefault()
    addItem(product, 1)
    setAdded(true)
    setTimeout(() => setAdded(false), 2000)
>>>>>>> ee0909d (fix the tracker)
  }

  return (
    <div className="product-card">
<<<<<<< HEAD
      <Link to={`/product/${product.id}`} className="product-card-image-link" onClick={handleNavigate}>
        <img src={product.image} alt={product.name} loading="lazy" />
        {soldOut && <span className="product-card-badge">Sold Out</span>}
=======
      <Link to={`/product/${product.id}`} viewTransition className="product-card-image-link">
        <img
          src={product.image}
          alt={product.name}
          loading="lazy"
          onLoad={() => setImgLoaded(true)}
          className={imgLoaded ? 'is-loaded' : ''}
        />
        {product.stock <= 0 && <span className="product-card-badge">Sold Out</span>}
        <button
          className={`product-card-wishlist ${wishlisted ? 'is-wishlisted' : ''}`}
          onClick={(e) => { e.preventDefault(); setWishlisted(!wishlisted) }}
          aria-label={wishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill={wishlisted ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
          </svg>
        </button>
>>>>>>> ee0909d (fix the tracker)
      </Link>

      <div className="product-card-body">
<<<<<<< HEAD
        {tag && <p className="product-card-tag">{tag}</p>}

        <Link to={`/product/${product.id}`} className="product-card-name-link" onClick={handleNavigate}>
          <h3 className="product-card-name">{product.name}</h3>
        </Link>

        {variantLabel && <p className="product-card-variant">{variantLabel}</p>}

        {hasRating && (
          <p className="product-card-rating">
            <span aria-hidden="true">★</span>
            {ratingDisplay}
            {product.review_count != null && ` | (${product.review_count})`}
          </p>
        )}

        {hasPrice && (
          <div className="product-card-price-row">
            <span className="product-card-price">{formatPrice(price)}</span>
            {showCompareAt && (
              <span className="product-card-compare">{formatPrice(Number(compareAt))}</span>
            )}
          </div>
        )}

        {showBulk && (
          <p className="product-card-bulk">
            Bulk: {formatPrice(Number(product.bulk_price))} ({product.bulk_min_qty}+)
          </p>
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
            disabled={soldOut}
          >
            {soldOut ? (
              'Sold Out'
            ) : (
              <>
                <BagIcon />
                Add to Cart
              </>
            )}
          </button>
        )}
=======
        <Link to={`/product/${product.id}`} viewTransition>
          <h3 className="product-card-name">{product.name}</h3>
        </Link>
        <p className="product-card-price">₹{Number(product.price).toLocaleString('en-IN')}</p>
        <button
          className={`btn product-card-btn ${added ? 'btn-gold' : ''}`}
          type="button"
          onClick={handleAdd}
          disabled={product.stock <= 0}
        >
          {added ? 'Added ✓' : 'Add to Cart'}
        </button>
>>>>>>> ee0909d (fix the tracker)
      </div>
    </div>
  )
}
