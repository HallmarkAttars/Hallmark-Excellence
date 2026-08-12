import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useCart } from '../context/CartContext'
import { cartLineKey } from '../utils/cartLines'
import { brandSavings } from '../utils/brandBulk'
import { sortBrandsByDisplayOrder } from '../utils/brandOrder'
import { SecureIcon, ReturnsIcon, BoxIcon, QualityIcon, LockIcon, TrashIcon } from '../components/icons'
import './Cart.css'

// One cart line — compact card: image | info (name, size, per-piece price) |
// quantity + totals. `inGroup` hides the brand name on the card because the
// brand group header above it already shows the brand (no repetition).
// All pricing/quantity behaviour is unchanged — this is presentation only.
function CartLine({ item, inGroup }) {
  const { removeItem, updateLinePieces } = useCart()
  const key = cartLineKey(item)
  const label = item.variant_label
    || (item.quantity_value != null && item.quantity_unit
        ? `${item.quantity_value} ${item.quantity_unit}`
        : '')
  const hasVariant = item.variant_id != null
  // unit_price is the amount charged per ONE unit of this line: the selected
  // variant's TOTAL price, or the product price for variant-less lines.
  // Bulk lines carry the brand's bulk rate (never above normal).
  const unitPrice = item.unit_price
  const isBulkLine = item.bulk_active === true
  // The resolved per-piece price: the brand's bulk rate when the line is
  // bulk-unlocked, else the resolved normal per-piece price (the brand's
  // standard price for piece-priced brand lines). Never the line's own stale
  // stored per-piece figure.
  const perUnit = isBulkLine
    ? item.bulk_per_unit
    : (item.normal_per_piece != null
        ? item.normal_per_piece
        : item.variant_price_per_unit)
  const subtotal = unitPrice * item.quantity
  const unitLower = String(item.quantity_unit || '').toLowerCase()
  const isPiecesUnit = unitLower === 'pieces'
  // The line's exact piece count (brand piece lines) or null.
  const pieces = item.pieces ?? null
  // Struck-through NORMAL per piece on bulk piece lines — derived from the
  // resolved normal line total ÷ pieces (the brand's standard price). Never
  // shown for ML/Gram lines or non-bulk lines.
  const struckPerPiece =
    isBulkLine && isPiecesUnit && pieces != null && pieces > 0 && item.normal_unit_price != null
      ? Number(item.normal_unit_price) / pieces
      : null
  const showStruck =
    struckPerPiece != null && Math.abs(Number(perUnit) - struckPerPiece) > 0.005
  // Every cart line carries its product id — the exact product this line was
  // added from. The image + name link to that product's details page (never
  // the shop/brand page); the rest of the card stays non-navigating.
  const productHref = item.product_id != null
    ? `/product/${item.product_id}`
    : null
  const productImage = (
    <div className="cart-item-image-wrap">
      <img
        src={item.image}
        alt={item.name}
        className="cart-item-image"
        loading="lazy"
        onError={(e) => { e.currentTarget.style.display = 'none' }}
      />
    </div>
  )

  return (
    <article key={key} className="cart-item">
      {/* Image — square, cream stage, never cropped. Link to the product. */}
      <div className="cart-item-media">
        {productHref ? (
          <Link
            to={productHref}
            className="cart-item-image-link"
            aria-label={`View ${item.name} product details`}
          >
            {productImage}
          </Link>
        ) : (
          productImage
        )}
      </div>

      {/* Info — brand (grouped cards omit it) / name / size / per-piece price */}
      <div className="cart-item-info">
        {!inGroup && item.brand_name && <p className="cart-item-brand">{item.brand_name}</p>}
        <h3 className="cart-item-name">
          {productHref ? (
            <Link
              to={productHref}
              className="cart-item-name-link"
              aria-label={`View ${item.name} product details`}
            >
              {item.name}
            </Link>
          ) : (
            item.name
          )}
        </h3>
        {label && <p className="cart-item-variant">{label}</p>}
        <div className="cart-item-price-row">
          {showStruck && struckPerPiece != null && (
            <s className="cart-item-struck">₹{struckPerPiece.toLocaleString('en-IN')}</s>
          )}
          {hasVariant && perUnit != null && Number.isFinite(Number(perUnit)) && (
            <span className={`cart-item-per-unit ${isBulkLine ? 'is-bulk' : ''}`}>
              ₹{Number(perUnit).toLocaleString('en-IN')} /{' '}
              {isBulkLine
                ? (isPiecesUnit ? 'piece' : 'unit')
                : (isPiecesUnit ? 'piece' : unitLower)}
            </span>
          )}
          {isBulkLine && (
            <span className="cart-item-bulk-tag is-bulk">✓ Bulk price</span>
          )}
        </div>
        <button className="cart-item-remove" onClick={() => removeItem(key)}>
          <TrashIcon size={14} /> Remove
        </button>
      </div>

      {/* Buybox — quantity stepper (brand PIECES lines only) + totals */}
      <div className="cart-item-buybox">
        {pieces != null && isPiecesUnit ? (
          <div className="cart-item-qty" aria-label="Quantity">
            <button
              type="button"
              className="qty-control-btn"
              onClick={() => updateLinePieces(key, -1)}
              disabled={item.pieces <= 1}
              aria-label="Decrease quantity"
            >
              −
            </button>
            <span className="qty-control-input" aria-live="polite">
              {item.pieces.toLocaleString('en-IN')}
            </span>
            <button
              type="button"
              className="qty-control-btn"
              onClick={() => updateLinePieces(key, 1)}
              aria-label="Increase quantity"
            >
              +
            </button>
          </div>
        ) : (
          item.quantity > 1 && (
            <p className="cart-item-qty-static">× {item.quantity}</p>
          )
        )}
        <div className="cart-item-total-col">
          <p className="cart-item-subtotal">₹{subtotal.toLocaleString('en-IN')}</p>
          <p className="cart-item-sub">
            {isPiecesUnit && pieces != null ? (
              <>
                ₹{Number(perUnit ?? unitPrice).toLocaleString('en-IN')} ×{' '}
                {pieces.toLocaleString('en-IN')} pieces
              </>
            ) : (
              <>
                ₹{unitPrice.toLocaleString('en-IN')} × {item.quantity}
              </>
            )}
          </p>
        </div>
      </div>
    </article>
  )
}

export default function Cart() {
  const { pricedItems, total, itemCount, brandBulk, brands } = useCart()
  const navigate = useNavigate()

  // Collapsed brand groups — pure UI state, never touches cart data.
  const [collapsed, setCollapsed] = useState(() => new Set())
  const toggleBrand = (id) => {
    setCollapsed((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  // Group cart lines by brand (brand items) with the ADMIN-defined brand
  // order (display_order, never alphabetical — same rule as the header
  // dropdown); category products (no brand) fall into their own section.
  // Each group carries its live bulk state (one source of truth from the
  // shared context) so the header, per-piece prices and savings can never
  // disagree.
  const { brandGroups, categoryItems } = useMemo(() => {
    const byId = new Map()
    const idOrder = []
    const categoryItems = []
    for (const i of pricedItems) {
      if (i.brand_id == null) {
        categoryItems.push(i)
        continue
      }
      const id = String(i.brand_id)
      if (!byId.has(id)) {
        byId.set(id, [])
        idOrder.push(id)
      }
      byId.get(id).push(i)
    }
    const rowById = new Map((brands || []).map((b) => [String(b.id), b]))
    const rows = idOrder.map((id) => ({ id, row: rowById.get(id) || null }))
    const known = rows.filter((r) => r.row)
    const unknown = rows.filter((r) => !r.row)
    // Defensive: the display-order sort only keeps active brands, so any
    // known row it filters out is appended last (never orphaned).
    const sortedKnown = sortBrandsByDisplayOrder(known.map((r) => r.row)).map((b) => ({
      id: String(b.id),
      row: b,
    }))
    const sortedIds = new Set(sortedKnown.map((r) => r.id))
    const ordered = [
      ...sortedKnown,
      ...unknown,
      ...known.filter((r) => !sortedIds.has(r.id)),
    ]
    const groups = ordered.map(({ id, row }) => {
      const state = brandBulk[id] || null
      const items = byId.get(id)
      return {
        id,
        name: state?.name || row?.name || items[0]?.brand_name || 'Brand',
        items,
        // Live bulk state + the exact savings figures (configured prices ×
        // total brand pieces — the shared helper, never re-derived here).
        bulk: state ? { ...state, ...brandSavings(state) } : null,
      }
    })
    return { brandGroups: groups, categoryItems }
  }, [pricedItems, brandBulk, brands])

  const handleCheckout = () => {
    // The resolved snapshot travels to the checkout page — the server still
    // recomputes everything authoritatively from the database.
    navigate('/checkout', { state: { checkoutItems: pricedItems, total } })
  }

  if (pricedItems.length === 0) {
    return (
      <div className="cart-empty">
        <span className="cart-empty-icon" aria-hidden="true">
          <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 8h14l-1.2 11a2 2 0 0 1-2 1.8H8.2a2 2 0 0 1-2-1.8L5 8Z" />
            <path d="M8.5 10V6.5a3.5 3.5 0 0 1 7 0V10" />
          </svg>
        </span>
        <p className="eyebrow">Your Selection</p>
        <h1>Your Cart is Empty</h1>
        <p>Discover something you'll love. Explore the collection and find your signature scent.</p>
        <Link to="/shop" className="btn btn-gold">Shop Now</Link>
      </div>
    )
  }

  return (
    <div className="container cart-page">
      <div className="cart-head">
        <div className="cart-head-text">
          <h1>Your Cart</h1>
          <p className="cart-head-sub">Review your selected products before checkout.</p>
        </div>
        <span className="cart-head-count">
          {itemCount} {itemCount === 1 ? 'item' : 'items'}
        </span>
      </div>

      <div className="cart-layout">
        <section className="cart-main" aria-label="Items in your cart">
          {/* Brand groups — compact collapsible headers with the bulk status,
              pieces/threshold, normal → bulk rate and savings. The products
              sit flat inside one card per brand. */}
          <div className="cart-brand-groups">
            {brandGroups.map((g) => {
              const isCollapsed = collapsed.has(g.id)
              return (
                <section key={g.id} className="cart-brand-group">
                  <button
                    type="button"
                    className="cart-brand-head"
                    onClick={() => toggleBrand(g.id)}
                    aria-expanded={!isCollapsed}
                    aria-controls={`cart-brand-${g.id}`}
                  >
                    <div className="cart-brand-head-text">
                      <div className="cart-brand-head-top">
                        <span className="cart-brand-name">{g.name}</span>
                        {g.bulk && (
                          g.bulk.unlocked ? (
                            <span className="cart-brand-status is-unlocked">✓ Bulk price active</span>
                          ) : (
                            <span className="cart-brand-status">Bulk pricing</span>
                          )
                        )}
                      </div>
                      <div className="cart-brand-head-meta">
                        {g.bulk ? (
                          <>
                            <span className="cart-brand-count">
                              {Number(g.bulk.totalPieces).toLocaleString('en-IN')} /{' '}
                              {Number(
                                g.bulk.unlocked && g.bulk.tier
                                  ? g.bulk.tier.minQuantity
                                  : g.bulk.bulkMinQty
                              ).toLocaleString('en-IN')}{' '}
                              pieces
                            </span>
                            <span className="cart-brand-prices">
                              ₹{Number(g.bulk.standardPrice).toLocaleString('en-IN')} →{' '}
                              <span className={g.bulk.unlocked ? 'is-bulk' : ''}>
                                ₹{Number(g.bulk.bulkUnitPrice).toLocaleString('en-IN')}
                              </span>{' '}
                              / piece
                              {g.bulk.unlocked && g.bulk.tier && (
                                <span className="cart-brand-tier">
                                  {' '}· from {Number(g.bulk.tier.minQuantity).toLocaleString('en-IN')} pcs
                                </span>
                              )}
                            </span>
                            {g.bulk.unlocked && g.bulk.savings > 0 && (
                              <span className="cart-brand-savings">
                                You save ₹{Number(g.bulk.savings).toLocaleString('en-IN')}
                              </span>
                            )}
                          </>
                        ) : (
                          <span className="cart-brand-count">
                            {g.items.length} {g.items.length === 1 ? 'product' : 'products'}
                          </span>
                        )}
                      </div>
                    </div>
                    <svg
                      className={`cart-brand-chevron ${isCollapsed ? 'is-collapsed' : ''}`}
                      width="18" height="18" viewBox="0 0 24 24" fill="none"
                      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <path d="m6 9 6 6 6-6" />
                    </svg>
                  </button>
                  {!isCollapsed && (
                    <div className="cart-brand-items" id={`cart-brand-${g.id}`}>
                      {g.items.map((item) => (
                        <CartLine key={cartLineKey(item)} item={item} inGroup />
                      ))}
                    </div>
                  )}
                </section>
              )
            })}
          </div>

          {/* Category products — separate section, no brand bulk UI. */}
          {categoryItems.length > 0 && (
            <section className="cart-category" aria-label="Other category products">
              <h2 className="cart-category-title">Other Category Products</h2>
              <div className="cart-category-items">
                {categoryItems.map((item) => (
                  <CartLine key={cartLineKey(item)} item={item} />
                ))}
              </div>
            </section>
          )}

          {/* Trust cards — bottom of the items area. */}
          <div className="cart-trust" aria-label="Store promises">
            <span className="cart-trust-item">
              <SecureIcon size={18} />
              <span className="cart-trust-text">
                <strong>Secure Packaging</strong>
                <small>Carefully packed</small>
              </span>
            </span>
            <span className="cart-trust-item">
              <BoxIcon size={18} />
              <span className="cart-trust-text">
                <strong>100% Original Products</strong>
                <small>Authentic products only</small>
              </span>
            </span>
            <span className="cart-trust-item">
              <ReturnsIcon size={18} />
              <span className="cart-trust-text">
                <strong>Easy Returns</strong>
                <small>Easy return support</small>
              </span>
            </span>
          </div>
        </section>

        <aside className="cart-summary" aria-label="Order summary">
          <h2 className="cart-summary-title">Order Summary</h2>

          <div className="cart-summary-lines">
            <div className="cart-summary-row">
              <span>Subtotal</span>
              <span>₹{Number(total).toLocaleString('en-IN')}</span>
            </div>
            <div className="cart-summary-row cart-summary-row-delivery">
              <span>Delivery / Transport</span>
              <span className="cart-summary-delivery">To be confirmed</span>
            </div>
          </div>

          <div className="cart-summary-total">
            <span>Total</span>
            <span>₹{Number(total).toLocaleString('en-IN')}</span>
          </div>

          <button className="btn btn-primary cart-checkout-btn" onClick={handleCheckout}>
            <LockIcon size={15} /> Confirm Order
          </button>

          <Link to="/shop" className="cart-continue-link">
            <span>Continue Shopping</span>
            <span className="cart-continue-arrow" aria-hidden="true">→</span>
          </Link>

          <div className="cart-summary-trust" aria-label="Why shop with us">
            <div className="cart-summary-trust-item">
              <SecureIcon size={17} />
              <div>
                <strong>Secure Checkout</strong>
                <span>100% safe &amp; secure</span>
              </div>
            </div>
            <div className="cart-summary-trust-item">
              <BoxIcon size={17} />
              <div>
                <strong>Fast Delivery</strong>
                <span>Quick &amp; reliable shipping</span>
              </div>
            </div>
            <div className="cart-summary-trust-item">
              <QualityIcon size={17} />
              <div>
                <strong>Premium Quality</strong>
                <span>Finest attars &amp; perfumes</span>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}
