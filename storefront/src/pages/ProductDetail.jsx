import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { getProductById, getRelatedProducts } from '../services/mockApi'
import { useCart } from '../context/CartContext'
import ProductGrid from '../components/product/ProductGrid'
import Reveal from '../components/ui/Reveal'
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
  const [selectedVariant, setSelectedVariant] = useState(null)

  useEffect(() => {
    setLoading(true)
    setActiveImage(0)
    setQty(1)
    setAdded(false)
    setSelectedVariant(null)
    getProductById(id).then((p) => {
      setProduct(p)
      setLoading(false)
      if (p) {
        // Auto-select the default variant, or the first if none is flagged.
        const variants = Array.isArray(p.variants) ? p.variants : []
        if (variants.length > 0) {
          setSelectedVariant(variants.find((v) => v.is_default) || variants[0])
        }
        getRelatedProducts(p).then(setRelated)
      }
    })
  }, [id])

  if (loading) return (
    <div className="container" style={{ paddingTop: 80, paddingBottom: 80 }}>
      <div className="loading-state" style={{ fontSize: '1rem', color: 'var(--gray-400)' }}>
        <span style={{ display: 'inline-block', width: 20, height: 20, borderRadius: '50%', border: '2px solid var(--gray-200)', borderTopColor: 'var(--luxury-gold)', animation: 'spin 0.8s linear infinite', marginRight: 12 }} />
        Loading product…
      </div>
    </div>
  )

  if (!product) {
    return (
      <div className="container" style={{ paddingTop: 80, paddingBottom: 80 }}>
        <div className="empty-state" style={{ textAlign: 'center', color: 'var(--gray-400)' }}>
          <p style={{ fontSize: '1.1rem', marginBottom: 16 }}>Product not found</p>
          <Link to="/shop" viewTransition className="btn btn-dark">Back to Shop</Link>
        </div>
      </div>
    )
  }

  const variants = Array.isArray(product.variants) ? product.variants : []
  const hasVariants = variants.length > 0

  // Price and stock come from the selected variant when variants exist,
  // otherwise fall back to the product-level values (legacy products).
  const price = hasVariants ? selectedVariant?.price : product.price
  const stock = hasVariants ? selectedVariant?.stock : product.stock

  const variantLabel = (v) =>
    v.display_label || `${v.quantity_value} ${v.quantity_unit}`.trim()

  const stockStatus = () => {
    if (stock > 5) return { text: 'In Stock', className: 'in-stock' }
    if (stock > 0) return { text: `Only ${stock} left`, className: 'low-stock' }
    return { text: 'Out of Stock', className: 'out-of-stock' }
  }

  const handleAdd = () => {
    if (hasVariants && !selectedVariant) return
    if (stock <= 0) return

    // Build the complete selected variant info for the cart item.
    const variantInfo = hasVariants
      ? {
          variant_id: selectedVariant.id,
          variant_label: variantLabel(selectedVariant),
          quantity_value: selectedVariant.quantity_value,
          quantity_unit: selectedVariant.quantity_unit,
          price: Number(selectedVariant.price),
          stock: selectedVariant.stock,
        }
      : null

    addItem(
      {
        id: product.id,
        name: product.name,
        price: Number(price),
        image: product.image,
      },
      qty,
      variantInfo
    )
    setAdded(true)
    setTimeout(() => setAdded(false), 2000)
  }

<<<<<<< HEAD
  const stockState = stockStatus()
=======
  const images = product.images?.length > 0 ? product.images : [product.image]
  const currentImage = images[activeImage] || images[0]
>>>>>>> ee0909d (fix the tracker)

  return (
    <div className="container product-detail">
      {/* ─── Breadcrumb ─── */}
      <nav className="product-breadcrumb" aria-label="Breadcrumb">
        <Link to="/shop" viewTransition>Shop</Link>
        <span aria-hidden="true">/</span>
        <span>{product.name}</span>
      </nav>

      {/* ─── Gallery ─── */}
      <Reveal animation="fade-up" duration={700}>
        <div className="product-detail-gallery">
          <div className="product-detail-main-image">
            <img src={currentImage} alt={product.name} />
          </div>
          {images.length > 1 && (
            <div className="product-detail-thumbs">
              {images.map((img, i) => (
                <button
                  key={i}
                  className={`product-detail-thumb ${i === activeImage ? 'is-active' : ''}`}
                  onClick={() => setActiveImage(i)}
                  aria-label={`Show image ${i + 1}`}
                >
                  <img src={img} alt="" />
                </button>
              ))}
            </div>
          )}
        </div>
      </Reveal>

      {/* ─── Product Info ─── */}
      <Reveal animation="fade-up" duration={700} delay={150}>
        <div className="product-detail-info">
          <div className="product-detail-badges">
            {product.stock <= 5 && product.stock > 0 && (
              <span className="product-badge-low">Only {product.stock} left</span>
            )}
            {product.stock > 0 && (
              <span className="product-badge-instock">In Stock</span>
            )}
          </div>

          <h1 className="product-detail-title">{product.name}</h1>

          {product.brand_id && (
            <p className="product-detail-brand">
              <span className="product-detail-brand-label">Brand</span>
              {product.brand_id === 'b1' ? 'Arees' : 'Dahab'}
            </p>
          )}

          <p className="product-detail-price">
            ₹{Number(product.price).toLocaleString('en-IN')}
          </p>

          <div className="product-detail-divider" />

          <p className="product-detail-description">{product.description}</p>

          {/* ─── Specs ─── */}
          <div className="product-detail-specs">
            <div className="product-detail-spec-item">
              <span className="product-detail-spec-label">Stock Status</span>
              <span className="product-detail-spec-value">
                {product.stock > 0 ? `${product.stock} units available` : 'Sold Out'}
              </span>
            </div>
            {product.category_id && (
              <div className="product-detail-spec-item">
                <span className="product-detail-spec-label">Category</span>
                <span className="product-detail-spec-value">
                  <Link to={`/categories/${product.category_id}`} viewTransition>View Category</Link>
                </span>
              </div>
            )}
          </div>

          {/* ─── Actions ─── */}
          <div className="product-detail-actions">
            <div className="qty-selector">
              <button onClick={() => setQty((q) => Math.max(1, q - 1))} aria-label="Decrease quantity">−</button>
              <span aria-live="polite">{qty}</span>
              <button onClick={() => setQty((q) => q + 1)} aria-label="Increase quantity">+</button>
            </div>
            <button
              className={`btn ${added ? 'btn-gold' : 'btn-dark'} product-detail-add-btn`}
              onClick={handleAdd}
              disabled={product.stock <= 0}
            >
              {added ? 'Added to Cart ✓' : 'Add to Cart'}
            </button>
          </div>

<<<<<<< HEAD
      <div className="product-detail-info">
        <h1>{product.name}</h1>
        <p className="product-detail-price">₹{Number(price).toLocaleString('en-IN')}</p>
        <p className="product-detail-description">{product.description}</p>
        <p className={`product-detail-stock ${stockState.className}`}>{stockState.text}</p>

        {hasVariants && (
          <div className="variant-selector">
            <p className="variant-selector-title">Select Quantity</p>
            <div className="variant-options">
              {variants.map((v) => {
                const active = selectedVariant?.id === v.id
                return (
                  <button
                    key={v.id}
                    type="button"
                    className={`variant-option ${active ? 'is-active' : ''}`}
                    onClick={() => setSelectedVariant(v)}
                    aria-pressed={active}
                  >
                    {variantLabel(v)}
                  </button>
                )
              })}
            </div>
          </div>
        )}

        <div className="product-detail-actions">
          <div className="qty-selector">
            <button
              onClick={() => setQty((q) => Math.max(1, q - 1))}
              aria-label="Decrease quantity"
            >
              −
            </button>
            <span aria-live="polite">{qty}</span>
            <button
              onClick={() => setQty((q) => (stock > 0 ? Math.min(stock, q + 1) : q))}
              aria-label="Increase quantity"
            >
              +
            </button>
          </div>
          <button
            className="btn btn-primary"
            onClick={handleAdd}
            disabled={stock <= 0}
          >
            {added ? 'Added ✓' : 'Add to Cart'}
          </button>
=======
          {/* ─── Trust ─── */}
          <div className="product-detail-trust">
            <div className="product-detail-trust-item">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--luxury-gold)" strokeWidth="1.5"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>
              <span>100% Authentic</span>
            </div>
            <div className="product-detail-trust-item">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--luxury-gold)" strokeWidth="1.5"><rect x="1" y="3" width="22" height="13" rx="2" /><path d="M7 20h10" /><path d="M9 16v4" /><path d="M15 16v4" /></svg>
              <span>Free Delivery</span>
            </div>
            <div className="product-detail-trust-item">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--luxury-gold)" strokeWidth="1.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>
              <span>Secure Checkout</span>
            </div>
          </div>
>>>>>>> ee0909d (fix the tracker)
        </div>
      </Reveal>

      {/* ─── Related Products ─── */}
      {related.length > 0 && (
        <Reveal animation="fade-up" duration={700}>
          <div className="product-detail-related">
            <div className="section-header" style={{ marginBottom: 36 }}>
              <span className="section-eyebrow">Complete Your Collection</span>
              <h2>You May Also Like</h2>
            </div>
            <ProductGrid products={related} />
          </div>
        </Reveal>
      )}
    </div>
  )
}
