import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useCart } from '../../context/CartContext'
import Reveal from '../ui/Reveal'
import './FeaturedProductsSection.css'

const FEATURED = [
  {
    id: 'p1',
    name: 'Royal Oud Attar',
    subtitle: 'Arees Signature',
    badge: 'Best Seller',
    description:
      'A rich, resinous oud attar aged for depth — smoky woods settling into a warm amber base.',
    specs: ['18 ml', 'Alcohol-free'],
    rating: 4.8,
    reviews: 124,
    fragrance: 'Oud',
    price: 2499,
    image:
      'https://images.unsplash.com/photo-1592945403244-b3fbafd7f539?w=800&q=80',
    stock: 18,
  },
  {
    id: 'p4',
    name: 'Dahab Golden Rose',
    subtitle: 'Dahab Flagship',
    badge: 'New',
    description:
      'Turkish rose petals suspended in warm gold — bottled at peak bloom.',
    specs: ['15 ml', 'Floral', 'Long-lasting'],
    rating: 4.9,
    reviews: 98,
    fragrance: 'Floral',
    price: 2299,
    image:
      'https://images.unsplash.com/photo-1615634260167-c8cdede054de?w=800&q=80',
    stock: 20,
  },
  {
    id: 'p10',
    name: 'Midnight Oud',
    subtitle: 'Arees After-Dark',
    badge: 'Limited',
    description:
      'Dark, animalic oud softened with rose and a trace of saffron.',
    specs: ['20 ml', 'Intense'],
    rating: 4.7,
    reviews: 76,
    fragrance: 'Oud',
    price: 2799,
    image:
      'https://images.unsplash.com/photo-1541643600914-78b084683601?w=800&q=80',
    stock: 14,
  },
  {
    id: 'p5',
    name: 'Dahab Jasmine Veil',
    subtitle: 'Dahab Classic',
    badge: null,
    description:
      'Night-blooming jasmine layered over soft sandalwood — light enough for day.',
    specs: ['15 ml', 'Floral-Musk'],
    rating: 4.6,
    reviews: 88,
    fragrance: 'Floral',
    price: 1999,
    image:
      'https://images.unsplash.com/photo-1615529182904-14819c35db37?w=800&q=80',
    stock: 15,
  },
  {
    id: 'p12',
    name: 'Bakhoor Rose Oud',
    subtitle: 'Home Ritual',
    badge: 'Artisan',
    description:
      'Woodchips soaked in rose and oud oil for a home fragrance ritual.',
    specs: ['50 g', 'Burn time 45m'],
    rating: 4.5,
    reviews: 52,
    fragrance: 'Bakhoor',
    price: 1699,
    image:
      'https://images.unsplash.com/photo-1594736797933-d0f06ba09946?w=800&q=80',
    stock: 25,
  },
  {
    id: 'p7',
    name: 'Dahab Discovery Set',
    subtitle: 'Gift Box',
    badge: null,
    description:
      'Five 3ml vials of Dahab\'s best-selling attars in a gold-foiled gift box.',
    specs: ['5 × 3 ml', 'Gift box'],
    rating: 4.9,
    reviews: 136,
    fragrance: 'Variety',
    price: 3499,
    image:
      'https://images.unsplash.com/photo-1587017539504-67cfbddac569?w=800&q=80',
    stock: 10,
  },
]

function StarRating({ rating }) {
  return (
    <div className="featured-rating" aria-label={`${rating} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((star) => (
        <svg
          key={star}
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill={star <= Math.round(rating) ? 'currentColor' : 'none'}
          stroke="currentColor"
          strokeWidth="1.5"
        >
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
        </svg>
      ))}
      <span className="featured-rating-number">{rating}</span>
    </div>
  )
}

export default function FeaturedProductsSection() {
  const { addItem } = useCart()

  return (
    <section className="featured-section">
      <div className="container">
        <Reveal animation="fade-up" duration={800}>
          <div className="section-header">
            <span className="section-eyebrow">Featured Products</span>
            <h2>Curated for You</h2>
            <p>
              A hand-picked edit of our most-loved attars — from smoky oud
              reserves to airy floral veils, each one bottled at its peak.
            </p>
          </div>
        </Reveal>

        <div className="featured-grid" role="list" aria-label="Featured products">
          {FEATURED.map((product, i) => (
            <FeaturedCard key={product.id} product={product} index={i} addItem={addItem} />
          ))}
        </div>
      </div>
    </section>
  )
}

function FeaturedCard({ product, index, addItem }) {
  const [qty, setQty] = useState(1)
  const [added, setAdded] = useState(false)
  const [wishlisted, setWishlisted] = useState(false)

  const handleAdd = () => {
    addItem(
      {
        id: product.id,
        name: product.name,
        price: product.price,
        image: product.image,
      },
      qty
    )
    setAdded(true)
    setTimeout(() => setAdded(false), 2000)
  }

  const badgeClass = product.badge === 'New' ? 'is-new' : product.badge === 'Limited' ? 'is-limited' : product.badge === 'Artisan' ? 'is-artisan' : ''

  return (
    <Reveal
      as="div"
      className="featured-card"
      role="listitem"
      animation="fade-up"
      duration={500}
      delay={index * 80}
      options={{ threshold: 0.05 }}
    >
      <div className="featured-card-image-wrap">
        <Link to={`/product/${product.id}`} viewTransition tabIndex={-1}>
          {product.badge && (
            <span className={`featured-card-badge ${badgeClass}`}>
              {product.badge}
            </span>
          )}
          <img src={product.image} alt={product.name} loading="lazy" />
        </Link>
        <button
          className={`featured-wishlist ${wishlisted ? 'is-wishlisted' : ''}`}
          onClick={() => setWishlisted(!wishlisted)}
          aria-label={wishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill={wishlisted ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
          </svg>
        </button>
      </div>
      <div className="featured-card-body">
        <p className="featured-card-subtitle">{product.subtitle}</p>
        <h3 className="featured-card-name">{product.name}</h3>

        <div className="featured-card-meta">
          <StarRating rating={product.rating} />
          <span className="featured-card-fragrance">{product.fragrance}</span>
        </div>

        <p className="featured-card-price">
          ₹{product.price.toLocaleString('en-IN')}
        </p>

        <div className="featured-card-actions">
          <button
            className={`btn ${added ? 'btn-gold' : 'btn-dark'} featured-add-btn`}
            onClick={handleAdd}
            disabled={product.stock <= 0}
          >
            {added ? 'Added ✓' : 'Add to Cart'}
          </button>
        </div>
      </div>
    </Reveal>
  )
}
