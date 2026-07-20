import { Link } from 'react-router-dom'
import { useCart } from '../../context/CartContext'
import './ProductCard.css'

export default function ProductCard({ product }) {
  const { addItem } = useCart()

  return (
    <div className="product-card">
      <Link to={`/product/${product.id}`} className="product-card-image-link">
        <img src={product.image} alt={product.name} loading="lazy" />
        {product.stock <= 0 && <span className="product-card-badge">Sold Out</span>}
      </Link>
      <div className="product-card-body">
        <Link to={`/product/${product.id}`}>
          <h3>{product.name}</h3>
        </Link>
        <p className="product-card-price">₹{Number(product.price).toLocaleString('en-IN')}</p>
        <button
          className="btn btn-primary product-card-btn"
          onClick={() => addItem(product, 1)}
          disabled={product.stock <= 0}
        >
          Add to Cart
        </button>
      </div>
    </div>
  )
}
