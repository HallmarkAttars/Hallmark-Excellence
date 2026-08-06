import { Link, useNavigate } from 'react-router-dom'
import { useCart } from '../context/CartContext'
import './Cart.css'

export default function Cart() {
  const { items, removeItem, updateQty, total } = useCart()
  const navigate = useNavigate()

  const handleCheckout = () => {
    navigate('/contact', { state: { checkoutItems: items, total } })
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
        <h1>Your Cart is Empty</h1>
        <p>Looks like you haven't added any attars yet. Explore the collection and find your signature scent.</p>
        <Link to="/shop" className="btn btn-gold">Continue Shopping</Link>
      </div>
    )
  }

  return (
    <div className="container cart-page">
      <h1>Your Cart</h1>

      <div className="cart-items">
        {items.map((item) => {
          const key = item.variant_id != null
            ? `${item.product_id}-v${item.variant_id}`
            : `${item.product_id}-`
          const label = item.variant_label
            || (item.quantity_value != null && item.quantity_unit
                ? `${item.quantity_value} ${item.quantity_unit}`
                : '')
          const unitPrice = Number(item.selected_price)
          const subtotal = unitPrice * item.quantity
          return (
            <div key={key} className="cart-item">
              {/* Product header — image + identity, separate row */}
              <div className="cart-item-head">
                <img src={item.image} alt={item.name} className="cart-item-image" />
                <div className="cart-item-info">
                  <h3>{item.name}</h3>
                  {label && <p className="cart-item-variant">{label}</p>}
                  <p className="cart-item-price">₹{unitPrice.toLocaleString('en-IN')}</p>
                </div>
              </div>

              {/* Quantity + subtotal row — never overlapping */}
              <div className="cart-item-row">
                <div className="cart-item-qty">
                  <button
                    onClick={() =>
                      item.quantity > 1
                        ? updateQty(key, item.quantity - 1)
                        : removeItem(key)
                    }
                    aria-label={`Decrease quantity of ${item.name}`}
                  >
                    −
                  </button>
                  <span aria-live="polite">{item.quantity}</span>
                  <button
                    onClick={() => updateQty(key, item.quantity + 1)}
                    aria-label={`Increase quantity of ${item.name}`}
                  >
                    +
                  </button>
                </div>
                <p className="cart-item-subtotal">₹{subtotal.toLocaleString('en-IN')}</p>
              </div>

              <button className="cart-item-remove" onClick={() => removeItem(key)}>
                Remove
              </button>
            </div>
          )
        })}
      </div>

      <div className="cart-summary">
        <div className="cart-summary-row">
          <span>Total</span>
          <span>₹{Number(total).toLocaleString('en-IN')}</span>
        </div>
        <button className="btn btn-primary cart-checkout-btn" onClick={handleCheckout}>
          Confirm Order
        </button>
        <Link to="/shop" className="cart-continue-link">Continue Shopping</Link>
      </div>
    </div>
  )
}
