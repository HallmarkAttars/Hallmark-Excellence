import ProductCard from './ProductCard'

export default function ProductGrid({ products, loading, emptyMessage = 'No products found.' }) {
  if (loading) {
    return <div className="loading-state">Loading products…</div>
  }
  if (!products || products.length === 0) {
    return <div className="empty-state">{emptyMessage}</div>
  }
  return (
    <div className="grid-products">
      {products.map((p) => (
        <ProductCard key={p.id} product={p} />
      ))}
    </div>
  )
}
