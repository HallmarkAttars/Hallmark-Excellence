import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { cloudinarySrc } from '../../utils/productImage'
import { displayProductName } from '../../utils/productName'
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

export default function ProductCard({ product, onNavigate, bulkUnlocked = false }) {
  const navigate = useNavigate()
  const [quickViewOpen, setQuickViewOpen] = useState(false)

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

  // NOTE: Prices are deliberately NOT shown on product cards. Customers
  // select a variant on the product details page, where the real price is
  // revealed only after an explicit variant selection. The pricing data stays
  // fully intact for the cart / checkout / bulk pricing — it is simply never
  // rendered here.

  // Conditional rows — only render when real data exists. No invented values.
  const hasRating = product.rating != null && Number.isFinite(Number(product.rating))
  // 4.80 → 4.8, 4.00 → 4 (matches the “★ 4.8” card format)
  const ratingDisplay = hasRating
    ? Number(product.rating).toFixed(2).replace(/\.?0+$/, '')
    : ''

  // Top brown/gold label: Attar products keep their brand name (e.g.
  // "AREES 8ML"); every other category shows its category name (e.g.
  // "FRAGRANCE OIL") in the exact same label styling. The label text is
  // uppercased by the existing .product-card-brand rule — nothing about the
  // label's typography/position changes. Falls back to the other field when
  // the preferred one is missing so no currently-visible label disappears.
  const isAttarCategory =
    String(product.category_name || '').trim().toLowerCase() === 'attar'
  const cardLabel = isAttarCategory
    ? product.brand_name || product.category_name
    : product.category_name || product.brand_name
  // Add to Cart always takes the customer to the product details page, where
  // they pick the variant and quantity. Nothing is ever added to the cart
  // directly from a product card.
  const handleAdd = () => {
    handleNavigate()
    navigate(`/product/${product.id}`)
  }

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
            src={cloudinarySrc(product.image, { width: 600 })}
            alt={product.name}
            loading="lazy"
            decoding="async"
            onError={handleImgError}
          />
        </Link>

        {/* Status badge (Featured only). Driven by real product data;
            nothing is ever invented. The brand's bulk-pricing state stays
            fully active everywhere it is shown (product page, cart,
            checkout) — it is simply no longer displayed as a badge on
            product cards. */}
        {product.is_featured === true && (
          <div className="product-card-badges">
            <span className="product-card-badge is-featured">Featured</span>
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
        {(cardLabel || hasRating) && (
          <div className="product-card-topline">
            {cardLabel && (
              <p className="product-card-brand">{cardLabel}</p>
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
          <h3 className="product-card-name">{displayProductName(product.name)}</h3>
        </Link>

        {(product.category_name || variantLabel) && (
          <p className="product-card-meta">
            {[product.category_name, variantLabel].filter(Boolean).join('  |  ')}
          </p>
        )}

        <button
          type="button"
          className="btn product-card-btn"
          onClick={handleAdd}
          aria-label={`Add ${product.name} to cart`}
        >
          <BagIcon />
          Add to Cart
        </button>
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
