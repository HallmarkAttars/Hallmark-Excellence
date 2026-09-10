import { Link } from 'react-router-dom'
import Reveal from '../../animations/Reveal'
import { HOME_CATEGORIES } from '../../data/content'
import './CategoryGrid.css'

export default function CategoryGrid({ categories }) {
  const all = categories || []

  // Homepage displays EXACTLY 6 categories in a 3-column × 2-row grid on desktop
  // and a 2-column × 3-row grid on mobile. The full list is accessible via VIEW ALL.
  const visibleCategories = all.slice(0, 6)

  return (
    <Reveal as="section" className="section category-section">
      <div className="container">
        <div className="category-section-head">
          <div className="category-head-text">
            {HOME_CATEGORIES.eyebrow && (
              <p className="category-eyebrow">{HOME_CATEGORIES.eyebrow}</p>
            )}
            <h2 className="category-title">{HOME_CATEGORIES.title}</h2>
            {HOME_CATEGORIES.subtitle && (
              <p className="category-subtitle">{HOME_CATEGORIES.subtitle}</p>
            )}
          </div>
          <div className="category-head-action">
            <Link to={HOME_CATEGORIES.viewAll.to} className="category-view-all">
              <span className="category-view-all-text">{HOME_CATEGORIES.viewAll.label}</span>
              <span className="category-view-all-arrow" aria-hidden="true">→</span>
            </Link>
          </div>
        </div>

        <div className="category-grid stagger-fade">
          {visibleCategories.map((cat) => (
            <Link key={cat.id} to={`/categories/${cat.slug}`} className="category-card">
              {/* Upper portion — category image */}
              <span className="category-media">
                <span
                  className="category-image"
                  style={{ backgroundImage: `url(${cat.image})` }}
                  role="img"
                  aria-label={cat.name}
                />
              </span>
              {/* Footer — name + arrow */}
              <span className="category-footer">
                <span className="category-name">{cat.name}</span>
                <span className="category-arrow" aria-hidden="true">→</span>
              </span>
            </Link>
          ))}
        </div>
      </div>
    </Reveal>
  )
}
