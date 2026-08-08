import { Link, useNavigate } from 'react-router-dom'
import { useCart } from '../context/CartContext'
import {
  applicableUnitPrice,
  isBulkApplicable,
  isBulkUnlocked,
  bulkRemaining,
  bulkSavings,
} from '../utils/bulk'
import QuantityControl from '../components/product/QuantityControl'
import './Cart.css'

export default function Cart() {
  const { items, removeItem, updateQty, total, itemCount } = useCart()
  const navigate = useNavigate()

  const handleCheckout = () => {
    navigate('/checkout', { state: { checkoutItems: items, total } })
  }

  if (items.length === 0) {
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

          {items.map((item) => {
            const key = item.variant_id != null
              ? `${item.product_id}-v${item.variant_id}`
              : `${item.product_id}-`
            const label = item.variant_label
              || (item.quantity_value != null && item.quantity_unit
                  ? `${item.quantity_value} ${item.quantity_unit}`
                  : '')
            // Bulk-aware pricing — the unit price and line total automatically
            // switch to the bulk price once the quantity reaches the
            // admin-configured threshold.
            const unitPrice = applicableUnitPrice(item)
            const subtotal = unitPrice * item.quantity
            // Bulk UI (progress/chip) shows only for bulk-applicable lines:
            // the default variant, or a variant-less product.
            const bulkApplicable = isBulkApplicable(item)
            const bulkUnlocked = isBulkUnlocked(item)
            const bulkSavingsAmount = bulkSavings(item)
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
                      ₹{unitPrice.toLocaleString('en-IN')}
                      {item.bulk_enabled === true && (
                        <span className="cart-item-unit-suffix">
                          {bulkUnlocked
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

                  {/* Live bulk progress under the quantity selector */}
                  {bulkApplicable && stockCanReachBulk && !bulkUnlocked && (
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
                  {bulkApplicable && !stockCanReachBulk && !bulkUnlocked && (
                    <p className="cart-item-bulk-msg is-muted">
                      Bulk price available from {item.bulk_min_qty} pieces
                    </p>
                  )}
                </div>

                {/* Third column — line total (unit price × quantity) */}
                <div className="cart-item-total-col">
                  <p className="cart-item-subtotal">₹{subtotal.toLocaleString('en-IN')}</p>
                  {bulkUnlocked && bulkSavingsAmount > 0 && (
                    <p className="cart-item-saved">✓ Bulk Price Applied · You Saved ₹{bulkSavingsAmount.toLocaleString('en-IN')}</p>
                  )}
                  {bulkApplicable && stockCanReachBulk && !bulkUnlocked && (
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
