import { Link } from 'react-router-dom'
import Reveal from '../../animations/Reveal'
import { cloudinarySrc, cloudinarySrcSet } from '../../utils/productImage'
import { normalizeCategorySlug } from '../../utils/categorySlug'
import './CategoryGrid.css'

// Grid body only — the section wrapper + heading live in the parent (Home)
// so the "Shop by Category" heading paints immediately instead of waiting
// on the categories API and a scroll-reveal fade (LCP critical path).
export default function CategoryGrid({ categories }) {
  const all = categories || []

  // Homepage displays EXACTLY 6 categories in a 3-column × 2-row grid on desktop
  // and a 2-column × 3-row grid on mobile. The full list is accessible via VIEW ALL.

  // Fragrance-first ordering for the homepage grid: the retail scent shoppers
  // (bakhoor, roll-on attars, fragrance oils) lead the row of six, while the
  // remaining wholesale packaging categories follow in API order. Names are
  // matched on the trimmed lowercase form — the DB carries padding spaces.
  const HOMEPAGE_CATEGORY_ORDER = [
    'bakhoor',
    'roll on attars',
    'fragrance oil',
    'roll on bottles',
    'spray bottles',
    'canter bottle',
  ]

  // Homepage priority index — categories outside the fragrance-first list
  // sort last, never before the prioritised ones (indexOf's −1 must become
  // the last position or unmatched wholesale categories would lead the grid).
  const priorityIndex = (category) => {
    const idx = HOMEPAGE_CATEGORY_ORDER.indexOf(
      String(category?.name || '').trim().toLowerCase()
    )
    return idx === -1 ? HOMEPAGE_CATEGORY_ORDER.length : idx
  }

  // Array.prototype.sort is stable in modern JS engines, so categories placed
  // after the six prioritised ones keep their original API order.
  const orderedCategories = [...all].sort((a, b) => priorityIndex(a) - priorityIndex(b))

  return (
    <Reveal className="category-grid stagger-fade">
      {orderedCategories.slice(0, 6).map((cat) => {
        const imgSrc = cat.image ? cloudinarySrc(cat.image, { width: 500 }) : null
        const imgSrcSet = cat.image ? cloudinarySrcSet(cat.image, [300, 400, 500]) : undefined
        return (
          <Link key={cat.id} to={`/categories/${normalizeCategorySlug(cat.slug)}`} className="category-card">
            {/* Upper portion — category image */}
            <span className="category-media">
              {imgSrc ? (
                <img
                  className="category-image"
                  src={imgSrc}
                  srcSet={imgSrcSet}
                  sizes="(max-width: 767px) 45vw, 300px"
                  alt={cat.name}
                  loading="lazy"
                  decoding="async"
                  fetchpriority="low"
                  width="400"
                  height="300"
                />
              ) : (
                  <span
                    className="category-image"
                    role="img"
                    aria-label={cat.name}
                  />
                )}
              </span>
              {/* Footer — name + arrow */}
              <span className="category-footer">
                <span className="category-name">{cat.name}</span>
                <span className="category-arrow" aria-hidden="true">→</span>
              </span>
            </Link>
          )
        })}
    </Reveal>
  )
}
