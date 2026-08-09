import Reveal from '../../animations/Reveal'
import ProductCard from './ProductCard'
import SkeletonProductGrid from '../skeleton/SkeletonProductGrid'

export default function ProductGrid({ products, loading, error, onRetry, emptyMessage = 'No products found.' }) {
  if (error) {
    return (
      <div className="error-state" role="alert">
        <p>{error}</p>
        {onRetry && (
          <button type="button" className="btn btn-outline" onClick={onRetry}>
            Try Again
          </button>
        )}
      </div>
    )
  }
  if (loading) {
    return <SkeletonProductGrid />
  }
  if (!products || products.length === 0) {
    return <div className="empty-state">{emptyMessage}</div>
  }
  return (
    <Reveal className="product-grid-reveal">
      <div className="grid-products stagger-fade">
        {products.map((p) => (
          <ProductCard key={p.id} product={p} />
        ))}
      </div>
    </Reveal>
  )
}
