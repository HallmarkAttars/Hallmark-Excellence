import { Link } from 'react-router-dom'
import { COLLECTIONS } from '../../data/content'
import { IMAGES } from '../../config/assets'
import './BrandShowcaseCard.css'

// Full-image luxury brand card for the homepage "Our Brands" showcase.
// The ENTIRE card is the brand photograph: an absolute image layer
// (object-fit: cover) with a diagonal dark gradient rising from the
// bottom-right corner, text overlaid bottom-right. Fully data-driven —
// name, label, description, image and link all come from the
// Admin/database brand object; the static COLLECTIONS / IMAGES values
// are only fallbacks so a partially-configured brand never breaks.
//
// `variant` controls the desktop editorial scale:
//   - "featured": the first two brands of each group of five — large 50% cards.
//   - "standard": the next three — 33% cards.
export default function BrandShowcaseCard({ brand, variant = 'standard' }) {
  const slug = brand.slug
  const fallback = COLLECTIONS[slug] || COLLECTIONS.arees

  const label =
    brand.collection_label || fallback.eyebrow || `${brand.name} Collection`
  const title = brand.name || fallback.lines?.[0] || fallback.eyebrow
  const description = brand.description || fallback.description || null
  const image =
    brand.card_image_url ||
    brand.cover_image_url ||
    brand.banner_image_url ||
    IMAGES.collections[slug] ||
    null

  return (
    <Link
      to={`/brand/${slug}`}
      className={`brand-showcase-card brand-showcase-card--${variant}`}
      aria-label={`Shop the ${brand.name} collection`}
    >
      {image ? (
        <img
          className="brand-showcase-img"
          src={image}
          alt={brand.name}
          loading="lazy"
        />
      ) : (
        <span className="brand-showcase-monogram" aria-hidden="true">
          {brand.name.charAt(0)}
        </span>
      )}
      <span className="brand-showcase-overlay" aria-hidden="true" />

      <div className="brand-showcase-content">
        <p className="brand-showcase-label">{label}</p>
        <h3 className="brand-showcase-title">{title}</h3>
        {/* Decorative divider — separates title from description */}
        <span className="brand-showcase-divider" aria-hidden="true">
          <span className="brand-showcase-divider-glyph">◆</span>
        </span>
        {description && <p className="brand-showcase-desc">{description}</p>}
        <span className="brand-showcase-cta">
          View Details
          <span aria-hidden="true">→</span>
        </span>
      </div>
    </Link>
  )
}
