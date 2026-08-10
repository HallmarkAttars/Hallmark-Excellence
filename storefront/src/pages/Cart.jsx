import { Link, useNavigate } from 'react-router-dom'
import { useCart } from '../context/CartContext'
import {
  formatINR,
  showStruckUnitPrice,
  hasLineSavings,
  lineTotalDisplay,
} from '../utils/cartDisplay'
import { SecureIcon, ReturnsIcon, BoxIcon, QualityIcon, LockIcon, TrashIcon } from '../components/icons'
import './Cart.css'

export default function Cart() {
  const { pricedItems, brandStatus, removeItem, total, itemCount } = useCart()
  const navigate = useNavigate()

  const handleCheckout = () => {
    // The resolved snapshot (unit_price already includes any active brand
    // bulk) travels to the checkout page — the server still recomputes
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

  // Brands with combined bulk pricing currently in the cart (derived live —
  // only brands that actually have lines here appear, so banners never show
  // for brands the customer isn't buying).
  const brandBanners = Object.entries(brandStatus)
    .map(([brandId, b]) => ({ brandId, ...b }))
    .filter((b) => b.bulk_enabled && Number.isInteger(b.bulkMinQty) && b.bulkMinQty > 1)
    // Per-brand savings shown inside the ACTIVE banner — real saved amount
    // from the resolved line prices, never invented.
    .map((b) => {
      const saved = pricedItems.reduce((acc, it) => {
        if (it.brand_bulk_applied && String(it.brand_id) === b.brandId) {
          return acc + Math.max(0, it.normal_unit_price - it.unit_price) * it.quantity
        }
        return acc
      }, 0)
      return { ...b, saved }
    })

  // Order-level brand bulk savings for the summary promo box — derived from
  // the resolved line prices (brand bulk is the only bulk discount).
  const bulkSavingsTotal = pricedItems.reduce((acc, it) => {
    if (it.brand_bulk_applied) {
      return acc + Math.max(0, it.normal_unit_price - it.unit_price) * it.quantity
    }
    return acc
  }, 0)

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
          {/* Brand bulk banners — green when active, warm progress when the
              threshold is within reach. Only bulk-enabled brands render. */}
          {brandBanners.length > 0 && (
            <div className="cart-banners" aria-label="Brand bulk pricing">
              {brandBanners.map((b) => {
                const remaining = Math.max(0, b.bulkMinQty - b.totalQty)
                const pct = Math.min(100, Math.round((b.totalQty / b.bulkMinQty) * 100))
                return b.active ? (
                  <div key={b.brandId} className="cart-banner is-active">
                    <span className="cart-banner-check" aria-hidden="true">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <path d="m5 12.5 4.5 4.5L19 7.5" />
                      </svg>
                    </span>
                    <div className="cart-banner-text">
                      <p className="cart-banner-title">
                        <strong>{b.name}</strong> bulk pricing active – {b.totalQty} pieces at ₹
                        {Number(b.bulkUnitPrice).toLocaleString('en-IN')} each
                      </p>
                      {b.saved > 0 && (
                        <p className="cart-banner-saved">
                          You saved ₹{b.saved.toLocaleString('en-IN')} with bulk pricing
                        </p>
                      )}
                    </div>
                    <span className="cart-banner-chevron" aria-hidden="true">›</span>
                  </div>
                ) : (
                  <div key={b.brandId} className="cart-banner is-progress">
                    <span className="cart-banner-flame" aria-hidden="true">🔥</span>
                    <div className="cart-banner-text">
                      <p className="cart-banner-title">
                        Add <strong>{remaining} more {b.name}</strong> piece{remaining === 1 ? '' : 's'} to unlock ₹
                        {Number(b.bulkUnitPrice).toLocaleString('en-IN')}/piece
                      </p>
                      <div className="cart-banner-track" aria-hidden="true">
                        <div className="cart-banner-fill" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                    <span className="cart-banner-count">{b.totalQty} / {b.bulkMinQty} pieces</span>
                  </div>
                )
              })}
            </div>
          )}

          <div className="cart-items">
            {pricedItems.map((item) => {
              const key = item.variant_id != null
                ? `${item.product_id}-v${item.variant_id}`
                : `${item.product_id}-`
              const label = item.variant_label
                || (item.quantity_value != null && item.quantity_unit
                    ? `${item.quantity_value} ${item.quantity_unit}`
                    : '')
              // Resolved pricing — unit_price already includes any active
              // brand-level combined bulk discount.
              const effectivePrice = item.unit_price
              const normalPrice = item.normal_unit_price
              const subtotal = effectivePrice * item.quantity
              const brandBulkSavings =
                item.brand_bulk_applied && normalPrice > effectivePrice
                  ? (normalPrice - effectivePrice) * item.quantity
                  : 0
              const lineSavings = brandBulkSavings
              const bulkBadge = item.brand_bulk_applied
                ? `${item.brand_name || 'Brand'} Bulk Applied`
                : null
              // Display gating (pure helpers in utils/cartDisplay.js — unit
              // tested): what this row SHOWS, never what it charges.
              const showCompareAt = showStruckUnitPrice(bulkBadge, normalPrice, effectivePrice)
              const discountActive = hasLineSavings(lineSavings)
              const totalLine = lineTotalDisplay(normalPrice, item.quantity, lineSavings)
              return (
                <article key={key} className="cart-item">
                  {/* Left — product image (square, cream stage, never cropped) */}
                  <div className="cart-item-media">
                    <div className="cart-item-image-wrap">
                      <img
                        src={item.image}
                        alt={item.name}
                        className="cart-item-image"
                        loading="lazy"
                        onError={(e) => { e.currentTarget.style.display = 'none' }}
                      />
                    </div>
                  </div>

                  {/* Center — brand / name / variant / price / savings / remove */}
                  <div className="cart-item-info">
                    {item.brand_name && <p className="cart-item-brand">{item.brand_name}</p>}
                    <h3 className="cart-item-name">{item.name}</h3>
                    {label && <p className="cart-item-variant">{label}</p>}
                    <div className="cart-item-price-row">
                      <span className="cart-item-unit">
                        ₹{effectivePrice.toLocaleString('en-IN')} / piece
                      </span>
                      {/* Normal per-piece price struck through — only when a
                          brand bulk discount is genuinely active on this line. */}
                      {showCompareAt && (
                        <span className="cart-item-unit-struck">
                          ₹{formatINR(normalPrice)}/piece
                        </span>
                      )}
                      {bulkBadge && (
                        <span className="cart-item-bulk-badge">✓ {bulkBadge}</span>
                      )}
                    </div>
                    {discountActive && (
                      <p className="cart-item-saved">You saved ₹{formatINR(lineSavings)}</p>
                    )}
                    <button className="cart-item-remove" onClick={() => removeItem(key)}>
                      <TrashIcon size={14} /> Remove
                    </button>
                  </div>

                  {/* Right — line total (each line is one unit of the selected
                      variant; same variant added twice merges into a static ×N) */}
                  <div className="cart-item-buybox">
                    {item.quantity > 1 && (
                      <p className="cart-item-qty-static">× {item.quantity}</p>
                    )}
                    <div className="cart-item-total-col">
                      <p className="cart-item-subtotal">₹{subtotal.toLocaleString('en-IN')}</p>
                      {/* With a bulk discount the struck line is the plain
                          normal TOTAL (price × qty) so the hierarchy reads
                          bold bulk total → struck normal total → saving. */}
                      <p className={`cart-item-sub${totalLine.struck ? ' is-struck' : ''}`}>
                        {totalLine.text}
                      </p>
                      {discountActive && (
                        <p className="cart-item-saving">Saving ₹{formatINR(lineSavings)}</p>
                      )}
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

          {bulkSavingsTotal > 0 && (
            <div className="cart-summary-savings">
              <span className="cart-summary-savings-check" aria-hidden="true">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m5 12.5 4.5 4.5L19 7.5" />
                </svg>
              </span>
              <span>You Save ₹{bulkSavingsTotal.toLocaleString('en-IN')} with Bulk Pricing</span>
            </div>
          )}

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
