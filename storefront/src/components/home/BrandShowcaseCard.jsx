import { Link } from 'react-router-dom'
import { COLLECTIONS } from '../../data/content'
import { IMAGES } from '../../config/assets'
import './BrandShowcaseCard.css'

// Full-image luxury brand card for the homepage "Our Brands" showcase.
// The ENTIRE card is the brand photograph: an absolute image layer
// (object-fit: cover) with a dark bottom gradient, text overlaid
// bottom-left. Fully data-driven — name, label, tagline, description,
// image and link all come from the Admin/database brand object; the
// static COLLECTIONS / IMAGES values are only fallbacks so a
// partially-configured brand never breaks.
//
// `variant` controls the typographic scale:
//   - "featured": the first two brands, large cards. Title = the brand's
//     tagline split into lines (e.g. "Timeless Scents, Pure Elegance").
//   - "standard": the remaining brands. Title = the brand name.
export default function BrandShowcaseCard({ brand, variant = 'standard' }) {
  const slug = brand.slug
  const fallback = COLLECTIONS[slug] || COLLECTIONS.arees

  const label =
    brand.collection_label || fallback.eyebrow || `${brand.name} Collection`
  const titleLines =
    variant === 'featured'
      ? (brand.tagline
          ? brand.tagline
              .split(',')
              .map((s) => s.trim())
              .filter(Boolean)
          : fallback.lines || [brand.name])
      : [brand.name]
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
        <h3 className="brand-showcase-title">
          {titleLines.map((line, i) => (
            <span key={i} className="brand-showcase-line">
              {line}
            </span>
          ))}
        </h3>
        {description && <p className="brand-showcase-desc">{description}</p>}
        <span className="brand-showcase-cta">
          {fallback.button || 'Shop Now'}
          <span aria-hidden="true">→</span>
        </span>
      </div>
    </Link>
  )
}
