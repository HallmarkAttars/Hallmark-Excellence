import { Link } from 'react-router-dom'
import { COLLECTIONS } from '../../data/content'
import { IMAGES } from '../../config/assets'
import './BrandCard.css'

// Compact "standard" brand card — used for the secondary brands row on the
// homepage. Fully data-driven from the Admin/database fields with static
// fallbacks (keeps a partially-configured brand looking premium, never broken).
export default function BrandCard({ brand }) {
  const slug = brand.slug
  const fallback = COLLECTIONS[slug] || COLLECTIONS.arees

  const eyebrow = brand.collection_label || fallback.eyebrow || `${brand.name} Collection`
  const description = brand.description || fallback.description || null
  const image =
    brand.card_image_url ||
    brand.cover_image_url ||
    brand.banner_image_url ||
    IMAGES.collections[slug] ||
    null

  return (
    <Link to={`/brand/${slug}`} className="brand-card" aria-label={`${brand.name} collection`}>
      <div className={`brand-card-media ${image ? '' : 'has-no-image'}`}>
        {image ? (
          <img src={image} alt={brand.name} loading="lazy" />
        ) : (
          <span className="brand-card-monogram" aria-hidden="true">
            {brand.name.charAt(0)}
          </span>
        )}
      </div>

      <div className="brand-card-body">
        <p className="brand-card-eyebrow">{eyebrow}</p>
        <h3 className="brand-card-title">{brand.name}</h3>
        {description && <p className="brand-card-desc">{description}</p>}
        <span className="brand-card-cta">
          Shop Now
          <span aria-hidden="true">→</span>
        </span>
      </div>
    </Link>
  )
}
