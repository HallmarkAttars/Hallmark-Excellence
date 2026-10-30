import { Link } from 'react-router-dom'
import { COLLECTIONS } from '../../data/content'
import { IMAGES } from '../../config/assets'
import { cloudinarySrc, cloudinarySrcSet } from '../../utils/productImage'
import { brandPublicSlug } from '../../utils/brandSlug'
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
  const apiSlug = brand.slug
  const slug = brandPublicSlug(apiSlug)
  const fallback = COLLECTIONS[apiSlug] || COLLECTIONS[slug] || COLLECTIONS.arees

  const title = brand.name || fallback.lines?.[0] || fallback.eyebrow
  const description = brand.description || fallback.description || null
  const rawImage =
    brand.card_image_url ||
    brand.cover_image_url ||
    brand.banner_image_url ||
    IMAGES.collections[apiSlug] ||
    IMAGES.collections[slug] ||
    null

  // Mobile card ~92vw (≈380px CSS, up to 3x DPR) — w_400 covers it. Desktop
  // reaches w_900 for the 50% "featured" cards. srcSet + sizes let each
  // viewport pick the smallest variant that covers its own DPR, cutting
  // ~150KB from the initial mobile load instead of always fetching w_900.
  const image = rawImage
    ? cloudinarySrc(rawImage, { width: variant === 'featured' ? 900 : 600 })
    : null
  const imageSrcSet = rawImage
    ? cloudinarySrcSet(rawImage, variant === 'featured' ? [400, 600, 900] : [300, 450, 600])
    : undefined

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
          srcSet={imageSrcSet}
          sizes="(max-width: 767px) 92vw, (max-width: 1024px) 50vw, 700px"
          alt={`${brand.name} Perfumes & Attars Collection`}
          loading="lazy"
          decoding="async"
          fetchpriority="low"
        />
      ) : (
        <span className="brand-showcase-monogram" aria-hidden="true">
          {brand.name.charAt(0)}
        </span>
      )}
      <span className="brand-showcase-overlay" aria-hidden="true" />

      <div className="brand-showcase-content">
        <h3 className="brand-showcase-title">{title}</h3>
        {/* Decorative divider — separates title from description */}
        <span className="brand-showcase-divider" aria-hidden="true">
          <span className="brand-showcase-divider-glyph">◆</span>
        </span>
        {description && <p className="brand-showcase-desc">{description}</p>}
        <span className="brand-showcase-cta">
          View Products
          <span aria-hidden="true">→</span>
        </span>
      </div>
    </Link>
  )
}
