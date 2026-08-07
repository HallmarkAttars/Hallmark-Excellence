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

  return (
    <Reveal as="section" className="section featured-section">
      <div className="container">
        <div className="section-head">
          <h2 className="section-title-upper">{HOME_FEATURED.title}</h2>
          <Link to={HOME_FEATURED.viewAll.to} className="view-all">
            {HOME_FEATURED.viewAll.label}
            <span className="view-all-arrow" aria-hidden="true">→</span>
          </Link>
        </div>

        <div className="featured-track stagger-fade">
          {items.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </div>
    </Reveal>
  )
}
