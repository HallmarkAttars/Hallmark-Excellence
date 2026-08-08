import { Link } from 'react-router-dom'
import Reveal from '../../animations/Reveal'
import ProductCard from '../product/ProductCard'
import { HOME_FEATURED } from '../../data/content'
import './FeaturedProducts.css'

export default function FeaturedProducts({ products }) {
  // Renders exactly the admin-marked featured products (filtered in Home.jsx
  // via the is_featured field). Hidden until at least one product is featured.
  const items = products || []
  if (items.length === 0) return null

  // Homepage shows a MAXIMUM of 6 featured products — one row on desktop,
  // 2×3 on mobile. The full range lives on the /shop page, linked via View
  // All only when more than 6 featured products actually exist. Data is
  // sliced here — no products are deleted or modified.
  const visibleItems = items.slice(0, 6)
  const hasMoreFeatured = items.length > 6

  return (
    <Reveal as="section" className="section featured-section">
      <div className="container">
        <div className="section-head">
          <h2 className="section-title-upper">{HOME_FEATURED.title}</h2>
          {hasMoreFeatured && (
            <Link to={HOME_FEATURED.viewAll.to} className="view-all">
              {HOME_FEATURED.viewAll.label}
              <span className="view-all-arrow" aria-hidden="true">→</span>
            </Link>
          )}
        </div>

        <div className="featured-track stagger-fade">
          {visibleItems.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </div>
    </Reveal>
  )
}
