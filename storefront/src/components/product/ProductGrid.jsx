<<<<<<< HEAD
import Reveal from '../../animations/Reveal'
=======
import Reveal from '../ui/Reveal'
>>>>>>> ee0909d (fix the tracker)
import ProductCard from './ProductCard'

export default function ProductGrid({ products, loading, emptyMessage = 'No products found.' }) {
  if (loading) {
    return (
      <div className="skeleton-grid">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="skeleton-card" aria-hidden="true">
            <div className="skeleton-image" />
            <div className="skeleton-body">
              <div className="skeleton-line" style={{ width: '70%' }} />
              <div className="skeleton-line-sm" />
              <div className="skeleton-btn" />
            </div>
          </div>
        ))}
      </div>
    )
  }
  if (!products || products.length === 0) {
    return <div className="empty-state">{emptyMessage}</div>
  }
  return (
<<<<<<< HEAD
    <Reveal className="product-grid-reveal">
      <div className="grid-products stagger-fade">
        {products.map((p) => (
          <ProductCard key={p.id} product={p} />
        ))}
      </div>
    </Reveal>
=======
    <div className="grid-products">
      {products.map((p, i) => (
        <Reveal
          key={p.id}
          animation="fade-up"
          duration={500}
          delay={i * 60}
          options={{ threshold: 0.05 }}
        >
          <ProductCard product={p} />
        </Reveal>
      ))}
    </div>
>>>>>>> ee0909d (fix the tracker)
  )
}
