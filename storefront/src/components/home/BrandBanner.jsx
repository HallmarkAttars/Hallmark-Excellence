import { Link } from 'react-router-dom'
import './BrandBanner.css'

const IMAGES = {
  arees: 'https://images.unsplash.com/photo-1592945403244-b3fbafd7f539?w=1200&q=70',
  dahab: 'https://images.unsplash.com/photo-1615634260167-c8cdede054de?w=1200&q=70',
}

export default function BrandBanner({ brand }) {
  return (
    <section
      className="brand-banner"
      style={{ backgroundImage: `url(${IMAGES[brand.slug] || IMAGES.arees})` }}
    >
      <div className="brand-banner-overlay" />
      <div className="brand-banner-content container">
        <p className="eyebrow">{brand.tagline}</p>
        <h2>{brand.name} Product</h2>
        <Link to={`/brand/${brand.slug}`} className="btn btn-outline brand-banner-btn">
          Shop {brand.name}
        </Link>
      </div>
    </section>
  )
}
