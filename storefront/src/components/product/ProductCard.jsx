import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useCart } from '../../context/CartContext'
import './ProductCard.css'

export default function ProductCard({ product }) {
  const { addItem } = useCart()
  const [added, setAdded] = useState(false)
  const addedTimer = useRef(null)

  useEffect(() => {
    return () => {
      if (addedTimer.current) window.clearTimeout(addedTimer.current)
    }
  }, [])

  // Surface the default variant's size/label when the product has variants.
  const variants = Array.isArray(product.variants) ? product.variants : []
  const defaultVariant = variants.find((v) => v.is_default) || variants[0]
  const variantLabel = defaultVariant
    ? defaultVariant.display_label ||
      (defaultVariant.quantity_value != null && defaultVariant.quantity_unit
        ? `${defaultVariant.quantity_value} ${defaultVariant.quantity_unit}`
        : '')
    : ''

  const soldOut = Number(product.stock) <= 0

  const handleAdd = () => {
    if (soldOut) return
    addItem(product, 1)
    setAdded(true)
    if (addedTimer.current) window.clearTimeout(addedTimer.current)
    addedTimer.current = window.setTimeout(() => setAdded(false), 1200)
  }

  return (
    <div className="product-card">
      <Link to={`/product/${product.id}`} className="product-card-image-link">
        <img src={product.image} alt={product.name} loading="lazy" />
        {soldOut && <span className="product-card-badge">Sold Out</span>}
      </Link>
      <div className="product-card-body">
        <Link to={`/product/${product.id}`}>
          <h3>{product.name}</h3>
        </Link>
        {variantLabel && <p className="product-card-variant">{variantLabel}</p>}
        <p className="product-card-price">₹{Number(product.price).toLocaleString('en-IN')}</p>
        <button
          className={`btn btn-primary product-card-btn ${added ? 'is-added' : ''}`}
          onClick={handleAdd}
          disabled={soldOut}
        >
          {added ? 'Added ✓' : 'Add to Cart'}
        </button>
      </div>
    </div>
  )
}
