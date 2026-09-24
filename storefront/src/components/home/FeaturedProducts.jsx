import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import Reveal from '../../animations/Reveal'
import FeaturedProductsCarousel from './FeaturedProductsCarousel'
import { HOME_FEATURED } from '../../data/content'
import './FeaturedProducts.css'

export default function FeaturedProducts({ products, allProducts }) {
  // All featured products participate in the continuous circular carousel (minimum 8 products)
  const allFeatured = useMemo(() => {
    const list = Array.isArray(products) ? products : []
    const fallbackList = Array.isArray(allProducts) ? allProducts : []
    const explicitlyFeatured = list.filter((p) => p.is_featured === true || p.featured === true)

    if (explicitlyFeatured.length >= 8) {
      return explicitlyFeatured
    }

    const pool = explicitlyFeatured.length > 0 ? explicitlyFeatured : list
    const combined = [...pool]
    const existingIds = new Set(combined.map((p) => p.id))

    for (const p of fallbackList) {
      if (combined.length >= 8) break
      if (p && !existingIds.has(p.id)) {
        combined.push(p)
        existingIds.add(p.id)
      }
    }
    return combined
  }, [products, allProducts])

  if (allFeatured.length === 0) return null

  return (
    <Reveal as="section" className="section featured-orbit-section">
      <div className="container">
        {/* Luxury Arabian Section Header matching reference */}
        <div className="featured-palatial-head">
          <div className="featured-diamond-icon" aria-hidden="true">◆</div>
          <div className="featured-title-flanked">
            <span className="flank-line" aria-hidden="true" />
            <h2 className="featured-title-text">
              {HOME_FEATURED.title ? HOME_FEATURED.title.toUpperCase() : 'FEATURED PRODUCTS'}
            </h2>
            <span className="flank-line" aria-hidden="true" />
          </div>
          <p className="featured-subtitle-text">
            Scents, made by hand — oud, rose and amber from our atelier.
          </p>
          {HOME_FEATURED.viewAll && (
            <Link to={HOME_FEATURED.viewAll.to} className="featured-view-all-link">
              <span>{HOME_FEATURED.viewAll.label}</span>
              <span className="view-all-arrow" aria-hidden="true">→</span>
            </Link>
          )}
        </div>

        {/* Reusable Continuous 3D Circular Orbit Carousel */}
        <FeaturedProductsCarousel products={allFeatured} />

        {/* Subtle Luxury Divider */}
        <div className="featured-section-divider" aria-hidden="true">
          <span className="featured-divider-line" />
        </div>
      </div>
    </Reveal>
  )
}
