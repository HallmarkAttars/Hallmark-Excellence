import { Link, useNavigate } from 'react-router-dom'
import { useCart } from '../context/CartContext'
import { SecureIcon, ReturnsIcon, BoxIcon, QualityIcon, LockIcon, TrashIcon } from '../components/icons'
import './Cart.css'

export default function Cart() {
  const { pricedItems, removeItem, total, itemCount } = useCart()
  const navigate = useNavigate()

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

      <div className="cart-layout">
        <section className="cart-main" aria-label="Items in your cart">
          <div className="cart-items">
            {pricedItems.map((item) => {
              const key = item.variant_id != null
                ? `${item.product_id}-v${item.variant_id}`
                : `${item.product_id}-`
              const label = item.variant_label
                || (item.quantity_value != null && item.quantity_unit
                    ? `${item.quantity_value} ${item.quantity_unit}`
                    : '')
              const hasVariant = item.variant_id != null
              // unit_price is the amount charged per ONE unit of this line:
              // the selected variant's TOTAL price (e.g. ₹7500 for "1000
              // Pieces"), or the product price for variant-less lines.
              const unitPrice = item.unit_price
              const subtotal = unitPrice * item.quantity
              const perUnit = item.variant_price_per_unit
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

                  {/* Center — brand / name / variant / price / remove */}
                  <div className="cart-item-info">
                    {item.brand_name && <p className="cart-item-brand">{item.brand_name}</p>}
                    <h3 className="cart-item-name">{item.name}</h3>
                    {label && <p className="cart-item-variant">{label}</p>}
                    <div className="cart-item-price-row">
                      <span className="cart-item-unit">
                        ₹{unitPrice.toLocaleString('en-IN')}
                        {!hasVariant ? ' / piece' : ''}
                      </span>
                      {hasVariant && perUnit != null && Number.isFinite(Number(perUnit)) && (
                        <span className="cart-item-per-unit">
                          ₹{Number(perUnit).toLocaleString('en-IN')} / {String(item.quantity_unit || '').toLowerCase()}
                        </span>
                      )}
                    </div>
                    <button className="cart-item-remove" onClick={() => removeItem(key)}>
                      <TrashIcon size={14} /> Remove
                    </button>
                  </div>

                  {/* Right — line total (variant total price × quantity) */}
                  <div className="cart-item-buybox">
                    {item.quantity > 1 && (
                      <p className="cart-item-qty-static">× {item.quantity}</p>
                    )}
                    <div className="cart-item-total-col">
                      <p className="cart-item-subtotal">₹{subtotal.toLocaleString('en-IN')}</p>
                      <p className="cart-item-sub">
                        ₹{unitPrice.toLocaleString('en-IN')} × {item.quantity}
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
