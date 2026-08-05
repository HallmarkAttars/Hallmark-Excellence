import { Link } from 'react-router-dom'
import './BrandBanner.css'

const IMAGES = {
  arees: 'https://images.unsplash.com/photo-1592945403244-b3fbafd7f539?w=1200&q=70',
  dahab: 'https://images.unsplash.com/photo-1615634260167-c8cdede054de?w=1200&q=70',
}

export default function BrandBanner({ brand }) {
  return (
    <Link
      to={`/brand/${brand.slug}`}
      className="brand-card"
      style={{ backgroundImage: `url(${IMAGES[brand.slug] || IMAGES.arees})` }}
      aria-label={`Shop ${brand.name} collection`}
    >
      <div className="brand-card-overlay" />
      <div className="brand-card-content">
        {brand.tagline && <p className="brand-card-subtitle">{brand.tagline}</p>}
        <h3 className="brand-card-title">{brand.name}</h3>
        <span className="brand-card-btn">Shop Now</span>
      </div>
    </Link>
  )
}
