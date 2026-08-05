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
        <h1>Your Cart is Empty</h1>
        <p>Looks like you haven't added any attars yet.</p>
        <Link to="/shop" className="btn btn-gold">Continue Shopping</Link>
      </div>
    )
  }

  return (
    <div className="container cart-page">
      <h1>Your Cart</h1>

      <div className="cart-items">
{items.map((item) => (
          <div key={item._key} className="cart-item">
            <img src={item.image} alt={item.name} className="cart-item-image" />
            <div className="cart-item-info">
              <h3>{item.name}</h3>
              {item.variant_label && <p className="cart-item-variant">{item.variant_label}</p>}
              <p className="cart-item-price">₹{Number(item.price).toLocaleString('en-IN')}</p>
            </div>
            <div className="cart-item-qty">
              <button onClick={() => updateQty(item._key, item.qty - 1)} aria-label={`Decrease quantity of ${item.name}`}>−</button>
              <span>{item.qty}</span>
              <button onClick={() => updateQty(item._key, item.qty + 1)} aria-label={`Increase quantity of ${item.name}`}>+</button>
            </div>
            <p className="cart-item-subtotal">₹{(Number(item.price) * item.qty).toLocaleString('en-IN')}</p>
            <button className="cart-item-remove" onClick={() => removeItem(item._key)} aria-label={`Remove ${item.name} from cart`}>
              &times;
            </button>
          </div>
        ))}
      </div>

      <div className="cart-summary">
        <div className="cart-summary-row">
          <span>Total</span>
          <span>₹{total.toLocaleString('en-IN')}</span>
        </div>
        <button className="btn btn-primary cart-checkout-btn" onClick={handleCheckout}>
          Confirm Order
        </button>
        <Link to="/shop" className="cart-continue-link">Continue Shopping</Link>
      </div>
    </div>
  )
}
