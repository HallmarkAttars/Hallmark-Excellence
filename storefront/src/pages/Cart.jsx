import { Link, useNavigate } from 'react-router-dom'
import { useCart } from '../context/CartContext'
import { cartLineKey } from '../utils/cartLines'
import { brandSavings, pieceWord } from '../utils/brandBulk'
import { sortBrandsByDisplayOrder } from '../utils/brandOrder'
import { SecureIcon, ReturnsIcon, BoxIcon, QualityIcon, LockIcon, TrashIcon } from '../components/icons'
import './Cart.css'

// Brand-level bulk progress banner — one per brand with an active rule in
// the cart. Unlocked state turns gold; locked shows the exact remaining
// pieces. Reused for every eligible brand (never combined between brands).
function BulkBanner({ state }) {
  const pct =
    state.bulkMinQty > 0 ? Math.min(100, (state.totalPieces / state.bulkMinQty) * 100) : 0
  return (
    <div className={`cart-bulk-banner ${state.unlocked ? 'is-unlocked' : ''}`}>
      <div className="cart-bulk-banner-top">
        <span className="cart-bulk-brand">{state.name}</span>
        {state.unlocked ? (
          <span className="cart-bulk-status is-unlocked">✓ Bulk price active</span>
        ) : (
          <span className="cart-bulk-status">Bulk pricing</span>
        )}
      </div>
      <div className="cart-bulk-progress-row">
        <div className="cart-bulk-progress-track">
          <span className="cart-bulk-progress-fill" style={{ width: `${pct}%` }} />
        </div>
        <span className="cart-bulk-count">
          {state.totalPieces.toLocaleString('en-IN')} / {state.bulkMinQty.toLocaleString('en-IN')} pieces
        </span>
      </div>
      <div className="cart-bulk-banner-bottom">
        <span className="cart-bulk-prices">
          Normal ₹{state.standardPrice.toLocaleString('en-IN')} / piece
          <span className="cart-bulk-arrow" aria-hidden="true">→</span>
          {state.unlocked ? (
            <span className="is-bulk">₹{state.bulkUnitPrice.toLocaleString('en-IN')} / piece</span>
          ) : (
            <span>Bulk ₹{state.bulkUnitPrice.toLocaleString('en-IN')} / piece</span>
          )}
        </span>
        {!state.unlocked && (
          <span className="cart-bulk-hint">
            Add {state.remaining.toLocaleString('en-IN')} more {state.name} {pieceWord(state.remaining)} to unlock bulk price
          </span>
        )}
      </div>
      {state.unlocked && state.savings > 0 && (
        <p className="cart-bulk-savings">
          You save ₹{state.savingsPerPiece.toLocaleString('en-IN', { maximumFractionDigits: 2 })} / piece ·
          ₹{state.savings.toLocaleString('en-IN')} off this order
        </p>
      )}
    </div>
  )
}

export default function Cart() {
  const { pricedItems, removeItem, updateLinePieces, total, itemCount, brandBulk } = useCart()
  const navigate = useNavigate()

  // Per-brand banners in the ADMIN-defined brand order — the same shared
  // rule as the header dropdown (display_order, never alphabetical). Live
  // derived state, no refresh. The savings come from the shared
  // brandSavings helper (configured prices × total brand pieces), so the
  // displayed ₹3 / piece · ₹480 are always the exact figures the customer
  // saves.
  const bulkBanners = sortBrandsByDisplayOrder(
    Object.values(brandBulk).map((s) => s.brand)
  ).map((b) => {
    const state = brandBulk[String(b.id)]
    return { ...state, ...brandSavings(state) }
  })

  const handleCheckout = () => {
    // The resolved snapshot (unit_price already includes the selected variant
    // total price) travels to the checkout page — the server still recomputes
    // everything authoritatively from the database.
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

      {/* Brand bulk pricing — live progress for every eligible brand. */}
      {bulkBanners.length > 0 && (
        <div className="cart-bulk-banners">
          {bulkBanners.map((b) => (
            <BulkBanner key={b.brandId} state={b} />
          ))}
        </div>
      )}

      <div className="cart-layout">
        <section className="cart-main" aria-label="Items in your cart">
          <div className="cart-items">
            {pricedItems.map((item) => {
              const key = cartLineKey(item)
              const label = item.variant_label
                || (item.quantity_value != null && item.quantity_unit
                    ? `${item.quantity_value} ${item.quantity_unit}`
                    : '')
              const hasVariant = item.variant_id != null
              // unit_price is the amount charged per ONE unit of this line:
              // the selected variant's TOTAL price (e.g. ₹7500 for "1000
              // Pieces"), or the product price for variant-less lines. Bulk
              // lines carry the brand's bulk rate (never above normal).
              const unitPrice = item.unit_price
              const normalUnitPrice = Number(item.normal_unit_price ?? item.unit_price)
              const isBulkLine = item.bulk_active === true
              // The resolved per-piece price: the brand's bulk rate when the
              // line is bulk-unlocked, else the resolved normal per-piece
              // price (the brand's standard price for piece-priced brand
              // lines). Never the line's own stale stored per-piece figure.
              const perUnit = isBulkLine
                ? item.bulk_per_unit
                : (item.normal_per_piece != null
                    ? item.normal_per_piece
                    : item.variant_price_per_unit)
              const subtotal = unitPrice * item.quantity
              const unitLower = String(item.quantity_unit || '').toLowerCase()
              const isPiecesUnit = unitLower === 'pieces'
              // The line's exact piece count (brand bulk lines) or null.
              const pieces = item.pieces ?? null
              // Every cart line carries its product id — the exact product
              // this line was added from. The image + name link to that
              // product's details page (never the shop/brand page); the rest
              // of the card (prices, Remove, summary) stays non-navigating.
              const productHref = item.product_id != null
                ? `/product/${item.product_id}`
                : null
              // The image markup is shared by both branches (link vs plain
              // defensive fallback) so they can never drift apart.
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
                  {/* Left — product image (square, cream stage, never cropped).
                      Clicking it opens the exact product's details page. */}
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

                  {/* Center — brand / name / variant / price / remove */}
                  <div className="cart-item-info">
                    {item.brand_name && <p className="cart-item-brand">{item.brand_name}</p>}
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
                      <span className="cart-item-unit">
                        ₹{unitPrice.toLocaleString('en-IN')}
                        {!hasVariant && !isBulkLine ? ' / piece' : ''}
                      </span>
                      {isBulkLine && normalUnitPrice !== unitPrice && (
                        <span className="cart-item-unit is-struck">
                          ₹{normalUnitPrice.toLocaleString('en-IN')}
                        </span>
                      )}
                      {hasVariant && perUnit != null && Number.isFinite(Number(perUnit)) && (
                        <span
                          className={`cart-item-per-unit ${isBulkLine ? 'is-bulk' : ''}`}
                        >
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

                  {/* Right — quantity stepper (brand PIECES lines only: the
                      exact piece count the customer added. Brand ML/Gram and
                      category lines keep their static display — never a dead
                      stepper.) */}
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
            })}
          </div>

          {/* Trust cards — bottom of the items area. Headings are the same
              claims as before; subtitles are descriptive copy already used
              elsewhere on the site (e.g. the checkout trust strip). */}
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
