import { Link, useNavigate } from 'react-router-dom'
import Reveal from '../components/ui/Reveal'
import { useCart } from '../context/CartContext'
import QuantityControl from '../components/product/QuantityControl'
import './Cart.css'

export default function Cart() {
  const { items, removeItem, updateQty, total } = useCart()
  const navigate = useNavigate()

  const handleCheckout = () => {
    navigate('/checkout', { state: { checkoutItems: items, total } })
  }

  if (items.length === 0) {
    return (
<<<<<<< HEAD
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
=======
      <div>
        {/* ─── Page Hero ─── */}
        <section className="cart-hero">
          <div className="container">
            <Reveal animation="fade-up" duration={800}>
              <span className="section-eyebrow" style={{ color: 'var(--luxury-gold-light)' }}>
                Your Cart
              </span>
              <h1>Your Cart Awaits</h1>
              <p className="cart-hero-desc">
                No attars yet — a signature scent is just a click away.
              </p>
              <Link to="/shop" viewTransition className="btn btn-gold" style={{ marginTop: 8 }}>
                Explore the Collection
              </Link>
            </Reveal>
          </div>
        </section>
        <div className="container">
          <Reveal animation="fade-up" duration={700} delay={200}>
            <div className="cart-empty-art">
              <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="var(--gray-200)" strokeWidth="0.8">
                <circle cx="9" cy="21" r="1" /><circle cx="19" cy="21" r="1" />
                <path d="M2 2h2l2.4 12.2a2 2 0 0 0 2 1.8h9.2a2 2 0 0 0 2-1.6L22 7H5.2" />
              </svg>
              <p>Your cart is empty</p>
            </div>
          </Reveal>
        </div>
>>>>>>> ee0909d (fix the tracker)
      </div>
    )
  }

  return (
<<<<<<< HEAD
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
=======
    <div>
      {/* ─── Page Hero ─── */}
      <section className="cart-hero">
        <div className="container">
          <Reveal animation="fade-up" duration={800}>
            <span className="section-eyebrow" style={{ color: 'var(--luxury-gold-light)' }}>
              Review
            </span>
            <h1>Your Cart</h1>
            <p className="cart-hero-desc">
              {items.length} {items.length === 1 ? 'item' : 'items'} — ready for your signature moment.
            </p>
          </Reveal>
>>>>>>> ee0909d (fix the tracker)
        </div>
      </section>

      <div className="container cart-layout">
        <Reveal animation="fade-up" duration={700}>
          <div className="cart-items">
            {items.map((item, i) => (
              <Reveal key={item.id} animation="fade-up" duration={500} delay={i * 80}>
                <div className="cart-item">
                  <Link to={`/product/${item.id}`} viewTransition className="cart-item-image-link">
                    <img src={item.image} alt={item.name} className="cart-item-image" />
                  </Link>
                  <div className="cart-item-info">                      <Link to={`/product/${item.id}`} viewTransition>
                      <h3>{item.name}</h3>
                    </Link>
                    <p className="cart-item-price">₹{item.price.toLocaleString('en-IN')} each</p>
                  </div>
                  <div className="cart-item-qty">
                    <button onClick={() => updateQty(item.id, item.qty - 1)} aria-label={`Decrease quantity of ${item.name}`}>−</button>
                    <span>{item.qty}</span>
                    <button onClick={() => updateQty(item.id, item.qty + 1)} aria-label={`Increase quantity of ${item.name}`}>+</button>
                  </div>
                  <p className="cart-item-subtotal">₹{(item.price * item.qty).toLocaleString('en-IN')}</p>
                  <button className="cart-item-remove" onClick={() => removeItem(item.id)} aria-label={`Remove ${item.name} from cart`}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" /><path d="M10 11v6" /><path d="M14 11v6" /><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                    </svg>
                  </button>
                </div>
              </Reveal>
            ))}
          </div>
        </Reveal>

        <Reveal animation="fade-up" duration={600} delay={150}>
          <div className="cart-summary">
            <h3>Order Summary</h3>
            <div className="cart-summary-rows">
              <div className="cart-summary-row">
                <span>Subtotal ({items.length} {items.length === 1 ? 'item' : 'items'})</span>
                <span>₹{total.toLocaleString('en-IN')}</span>
              </div>
              <div className="cart-summary-row">
                <span>Delivery</span>
                <span className="cart-summary-free">Free</span>
              </div>
              <div className="cart-summary-divider" />
              <div className="cart-summary-row cart-summary-total">
                <span>Total</span>
                <span>₹{total.toLocaleString('en-IN')}</span>
              </div>
            </div>
            <button className="btn btn-gold cart-checkout-btn" onClick={handleCheckout}>
              Confirm Order
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
              </svg>
            </button>
            <Link to="/shop" viewTransition className="cart-continue-link">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" />
              </svg>
              Continue Shopping
            </Link>
          </div>
        </Reveal>
      </div>
    </div>
  )
}
