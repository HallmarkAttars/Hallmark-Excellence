import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { getProductById, getRelatedProducts } from '../services/mockApi'
import { useCart } from '../context/CartContext'
import ProductGrid from '../components/product/ProductGrid'
import './ProductDetail.css'

export default function ProductDetail() {
  const { id } = useParams()
  const { addItem } = useCart()
  const [product, setProduct] = useState(null)
  const [related, setRelated] = useState([])
  const [activeImage, setActiveImage] = useState(0)
  const [qty, setQty] = useState(1)
  const [loading, setLoading] = useState(true)
  const [added, setAdded] = useState(false)

  useEffect(() => {
    setLoading(true)
    setActiveImage(0)
    setQty(1)
    setAdded(false)
    getProductById(id).then((p) => {
      setProduct(p)
      setLoading(false)
      if (p) getRelatedProducts(p).then(setRelated)
    })
  }, [id])

  if (loading) return <div className="loading-state">Loading product…</div>
  if (!product) {
    return (
      <div className="empty-state">
        Product not found. <Link to="/shop">Back to Shop</Link>
      </div>
    )
  }

  const handleAdd = () => {
    addItem(product, qty)
    setAdded(true)
    setTimeout(() => setAdded(false), 2000)
  }

  return (
    <div className="container product-detail">
      <div className="product-detail-gallery">
        <div className="product-detail-main-image">
          <img src={product.image} alt={product.name} />
        </div>
        {product.image && (
          <div className="product-detail-thumbs">
            <button
              className="product-detail-thumb is-active"
              onClick={() => setActiveImage(0)}
              aria-label="Show image"
            >
              <img src={product.image} alt="" />
            </button>
          </div>
        )}
      </div>

      <div className="product-detail-info">
        <h1>{product.name}</h1>
        <p className="product-detail-price">₹{Number(product.price).toLocaleString('en-IN')}</p>
        <p className="product-detail-description">{product.description}</p>
        <p className="product-detail-stock">
          {product.stock > 0 ? `${product.stock} in stock` : 'Currently sold out'}
        </p>

        <div className="product-detail-actions">
          <div className="qty-selector">
            <button onClick={() => setQty((q) => Math.max(1, q - 1))} aria-label="Decrease quantity">−</button>
            <span aria-live="polite">{qty}</span>
            <button onClick={() => setQty((q) => q + 1)} aria-label="Increase quantity">+</button>
          </div>
          <button className="btn btn-primary" onClick={handleAdd} disabled={product.stock <= 0}>
            {added ? 'Added ✓' : 'Add to Cart'}
          </button>
        </div>
      </div>

      {related.length > 0 && (
        <div className="product-detail-related">
          <h2>You May Also Like</h2>
          <ProductGrid products={related} />
        </div>
      )}
    </div>
  )
}
