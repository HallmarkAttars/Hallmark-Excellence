import { Link } from 'react-router-dom'
import { COLLECTIONS } from '../../data/content'
import { IMAGES } from '../../config/assets'
import './CollectionBanner.css'

// Featured brand banner (the large homepage cards). Every visible string
// prefers the Admin/database fields; the static COLLECTIONS copy and asset
// images are only fallbacks so a partially-configured brand never breaks.
export default function CollectionBanner({ brand }) {
  const slug = brand.slug
  const theme = slug === 'dahab' ? 'dahab' : slug === 'arees' ? 'arees' : 'default'
  const fallback = COLLECTIONS[slug] || COLLECTIONS.arees

  const eyebrow = brand.collection_label || fallback.eyebrow || `${brand.name} Collection`
  const titleLines = brand.tagline
    ? brand.tagline.split(',').map((s) => s.trim()).filter(Boolean)
    : fallback.lines || [brand.name]
  const description = brand.description || fallback.description || null
  const image =
    brand.cover_image_url ||
    brand.card_image_url ||
    brand.banner_image_url ||
    IMAGES.collections[slug] ||
    null

  return (
    <section
      className={`collection-banner collection-banner--${theme} ${image ? '' : 'has-no-image'}`}
      aria-label={`${brand.name} collection`}
    >
      <div className="container collection-banner-inner">
        <div className="collection-banner-content">
          <p className="collection-banner-eyebrow">{eyebrow}</p>
          <h2 className="collection-banner-title">
            {titleLines.map((line, i) => (
              <span key={i} className="collection-banner-line">
                {line}
              </span>
            ))}
          </h2>
          {description && <p className="collection-banner-tagline">{description}</p>}
          <Link to={`/brand/${slug}`} className={`btn collection-banner-btn collection-banner-btn--${theme}`}>
            {fallback.button || 'Shop Now'}
            <span aria-hidden="true">→</span>
          </Link>
        </div>

        {image ? (
          <div
            className="collection-banner-image"
            style={{ backgroundImage: `url(${image})` }}
            role="img"
            aria-label={`${brand.name} fragrance`}
          />
        ) : (
          <div className="collection-banner-image collection-banner-image--monogram" role="img" aria-label={`${brand.name} fragrance`}>
            <span>{brand.name.charAt(0)}</span>
          </div>
        )}
      </div>
    </section>
  )
}
