import { Link } from 'react-router-dom'
import './BrandBanner.css'

const IMAGES = {
  arees: 'https://images.unsplash.com/photo-1592945403244-b3fbafd7f539?w=1200&q=70',
  dahab: 'https://images.unsplash.com/photo-1615634260167-c8cdede054de?w=1200&q=70',
}

export default function BrandBanner({ brand }) {
  return (
    <article
      className="brand-card"
      style={{ backgroundImage: `url(${IMAGES[brand.slug] || IMAGES.arees})` }}
    >
      <div className="brand-card-overlay" />
      <div className="brand-card-content">
        <h3 className="brand-card-title">{brand.name} Product</h3>
        <Link to={`/brand/${brand.slug}`} className="brand-card-btn">
          Shop
        </Link>
      </div>
    </article>
  )
}
