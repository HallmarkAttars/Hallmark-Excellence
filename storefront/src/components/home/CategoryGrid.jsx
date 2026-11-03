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
  //
  // Enforce the admin's position here as well as in the API so the storefront
  // remains correct if an API response arrives in a different order. Stable
  // sorting keeps the server's created_at ordering for equal or missing values.
  const getDisplayOrder = (category) => {
    const value = category.display_order
    if (value === null || value === undefined || value === '') return Number.MAX_SAFE_INTEGER
    const order = Number(value)
    return Number.isFinite(order) ? order : Number.MAX_SAFE_INTEGER
  }

  const orderedCategories = all
    .map((category, index) => ({ category, index }))
    .sort((a, b) => {
      return getDisplayOrder(a.category) - getDisplayOrder(b.category) || a.index - b.index
    })
    .slice(0, 6)
    .map(({ category }) => category)

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
