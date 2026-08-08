import { Link, useNavigate } from 'react-router-dom'
import { useCart } from '../context/CartContext'
import {
  isBulkApplicable,
  isBulkUnlocked,
  bulkRemaining,
  bulkSavings,
} from '../utils/bulk'
import QuantityControl from '../components/product/QuantityControl'
import './Cart.css'

export default function Cart() {
  const { pricedItems, brandStatus, removeItem, updateQty, total, itemCount } = useCart()
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
        <h1>Your Bag is Empty</h1>
        <p>Looks like you haven't added any attars yet. Explore the collection and find your signature scent.</p>
        <Link to="/shop" className="btn btn-gold">Continue Shopping</Link>
      </div>
    )
  }

  // Brands with combined bulk pricing currently in the cart (derived live —
  // only brands that actually have lines here appear, so banners never show
  // for brands the customer isn't buying).
  const brandBanners = Object.entries(brandStatus)
    .map(([brandId, b]) => ({ brandId, ...b }))
    .filter((b) => b.bulk_enabled && Number.isInteger(b.bulkMinQty) && b.bulkMinQty > 1)

  return (
    <div className="container cart-page">
      <div className="cart-head">
        <h1>Your Cart</h1>
        <span className="cart-head-count">
          {itemCount} {itemCount === 1 ? 'item' : 'items'}
        </span>
      </div>

      <div className="cart-layout">
        <section className="cart-items" aria-label="Items in your cart">
          <div className="cart-items-head" aria-hidden="true">
            <span>Product</span>
            <span>Quantity</span>
            <span>Total</span>
          </div>

          {/* Combined brand bulk banners — one per bulk-enabled brand in the
              cart. Active shows the applied rate; near-threshold shows how
              many more pieces unlock it. */}
          {brandBanners.length > 0 && (
            <div className="cart-brand-banners" aria-label="Brand bulk pricing">
              {brandBanners.map((b) => {
                const remaining = Math.max(0, b.bulkMinQty - b.totalQty)
                return (
                  <div
                    key={b.brandId}
                    className={`cart-brand-banner ${b.active ? 'is-active' : 'is-hint'}`}
                  >
                    <span className="cart-brand-banner-mark" aria-hidden="true">
                      {b.active ? '✓' : '🔥'}
                    </span>
                    <p className="cart-brand-banner-text">
                      {b.active ? (
                        <>
                          <strong>{b.name}</strong> bulk pricing active —{' '}
                          {b.totalQty} pieces at ₹{Number(b.bulkUnitPrice).toLocaleString('en-IN')} each
                        </>
                      ) : (
                        <>
                          Add <strong>{remaining} more {b.name}</strong> piece{remaining === 1 ? '' : 's'} to unlock ₹
                          {Number(b.bulkUnitPrice).toLocaleString('en-IN')}/piece
                        </>
                      )}
                    </p>
                  </div>
                )
              })}
            </div>
          )}

          {pricedItems.map((item) => {
            const key = item.variant_id != null
              ? `${item.product_id}-v${item.variant_id}`
              : `${item.product_id}-`
            const label = item.variant_label
              || (item.quantity_value != null && item.quantity_unit
                  ? `${item.quantity_value} ${item.quantity_unit}`
                  : '')
            // Resolved pricing — unit_price already includes any active
            // brand-level combined bulk discount (brand bulk wins over
            // per-product bulk). Per-product bulk UI below still reads the
            // line's own config for the progress/status chips.
            const effectivePrice = item.unit_price
            const subtotal = effectivePrice * item.quantity
            const bulkApplicable = isBulkApplicable(item)
            const bulkUnlocked = isBulkUnlocked(item)
            const bulkSavingsAmount = bulkSavings(item)
            const brandBulkSavings =
              item.brand_bulk_applied && item.normal_unit_price > effectivePrice
                ? (item.normal_unit_price - effectivePrice) * item.quantity
                : 0
            const itemStock = item.stock != null ? Number(item.stock) : null
            const stockCanReachBulk =
              itemStock == null || itemStock >= Number(item.bulk_min_qty)
            return (
              <article key={key} className="cart-item">
                {/* First column — image + product identity */}
                <div className="cart-item-info">
                  <div className="cart-item-image-wrap">
                    <img src={item.image} alt={item.name} className="cart-item-image" loading="lazy" />
                  </div>
                  <div className="cart-item-meta">
                    <h3>{item.name}</h3>
                    {label && <p className="cart-item-variant">{label}</p>}
                    <p className="cart-item-unit">
                      ₹{effectivePrice.toLocaleString('en-IN')}
                      {(item.bulk_enabled === true || item.brand_bulk_applied) && (
                        <span className="cart-item-unit-suffix">
                          {item.brand_bulk_applied
                            ? ` / piece (Brand Bulk Applied)`
                            : bulkUnlocked
                              ? ` / piece (Bulk Applied)`
                              : ` / piece`}
                        </span>
                      )}
                    </p>
                    <button className="cart-item-remove" onClick={() => removeItem(key)}>
                      Remove
                    </button>
                  </div>
                </div>

                {/* Second column — quantity selector (typing still supported) */}
                <div className="cart-item-qty-col">
                  <QuantityControl
                    className="cart-item-qty"
                    value={item.quantity}
                    max={item.stock != null ? item.stock : null}
                    onChange={(n) => updateQty(key, n)}
                    onRemove={() => removeItem(key)}
                    labels={{
                      decrease: `Decrease quantity of ${item.name}`,
                      increase: `Increase quantity of ${item.name}`,
                      input: `Quantity of ${item.name}`,
                    }}
                  />

                  {/* Live per-product bulk progress under the quantity selector */}
                  {!item.brand_bulk_applied && bulkApplicable && stockCanReachBulk && !bulkUnlocked && (
                    <div className="cart-item-bulk">
                      <p className="cart-item-bulk-msg">
                        Add {bulkRemaining(item)} more to unlock Bulk Price
                      </p>
                      <div className="cart-item-bulk-track" aria-hidden="true">
                        <div
                          className="cart-item-bulk-fill"
                          style={{
                            width: `${Math.min(100, (item.quantity / Number(item.bulk_min_qty)) * 100)}%`,
                          }}
                        />
                      </div>
                      <p className="cart-item-bulk-meta">
                        {Math.min(item.quantity, Number(item.bulk_min_qty))} / {item.bulk_min_qty}
                      </p>
                    </div>
                  )}
                  {!item.brand_bulk_applied && bulkApplicable && !stockCanReachBulk && !bulkUnlocked && (
                    <p className="cart-item-bulk-msg is-muted">
                      Bulk price available from {item.bulk_min_qty} pieces
                    </p>
                  )}
                </div>

                {/* Third column — line total (effective unit price × quantity) */}
                <div className="cart-item-total-col">
                  <p className="cart-item-subtotal">₹{subtotal.toLocaleString('en-IN')}</p>
                  {item.brand_bulk_applied && brandBulkSavings > 0 && (
                    <p className="cart-item-saved">
                      ✓ {item.brand_name || 'Brand'} Bulk Discount Applied · You Saved ₹{brandBulkSavings.toLocaleString('en-IN')}
                    </p>
                  )}
                  {!item.brand_bulk_applied && bulkUnlocked && bulkSavingsAmount > 0 && (
                    <p className="cart-item-saved">✓ Bulk Price Applied · You Saved ₹{bulkSavingsAmount.toLocaleString('en-IN')}</p>
                  )}
                  {!item.brand_bulk_applied && bulkApplicable && stockCanReachBulk && !bulkUnlocked && (
                    <p className="cart-item-bulk-chip">🔥 Bulk Price at {item.bulk_min_qty}+ pcs</p>
                  )}
                </div>
              </article>
            )
          })}
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
            Confirm Order
          </button>

          <Link to="/shop" className="cart-continue-link">
            <span>Continue Shopping</span>
            <span className="cart-continue-arrow" aria-hidden="true">→</span>
          </Link>
        </aside>
      </div>
    </div>
  )
}
