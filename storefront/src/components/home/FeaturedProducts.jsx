import { Link } from 'react-router-dom'
import ProductCard from '../product/ProductCard'
import './FeaturedProducts.css'

export default function FeaturedProducts({ products }) {
  // Renders exactly the admin-marked featured products (filtered in Home.jsx
  // via the is_featured field). Hidden until at least one product is featured.
  const items = products || []
  if (items.length === 0) return null

  return (
    <section className="section featured-section">
      <div className="container">
        <div className="section-head">
          <h2 className="section-title-upper">Featured Products</h2>
          <Link to="/shop" className="view-all">
            View All
            <span className="view-all-arrow" aria-hidden="true">→</span>
          </Link>
        </div>

        <div className="featured-track">
          {items.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </div>
    </section>
  )
}
