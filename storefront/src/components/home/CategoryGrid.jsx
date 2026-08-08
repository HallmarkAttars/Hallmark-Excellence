import { Link } from 'react-router-dom'
import Reveal from '../../animations/Reveal'
import { HOME_CATEGORIES } from '../../data/content'
import './CategoryGrid.css'

export default function CategoryGrid({ categories }) {
  const all = categories || []

  // Homepage shows a MAXIMUM of 6 categories — one row on desktop, 2×3 on
  // mobile. The full list lives on the /categories page, linked via View All
  // only when more than 6 categories actually exist. Data is sliced here, so
  // the database is never touched and no 7th card ever renders.
  const visibleCategories = all.slice(0, 6)
  const hasMoreCategories = all.length > 6

  return (
    <Reveal as="section" className="section category-section">
      <div className="container">
        <div className="section-head">
          <h2 className="section-title-upper">{HOME_CATEGORIES.title}</h2>
          {hasMoreCategories && (
            <Link to={HOME_CATEGORIES.viewAll.to} className="view-all">
              {HOME_CATEGORIES.viewAll.label}
              <span className="view-all-arrow" aria-hidden="true">→</span>
            </Link>
          )}
        </div>
        <div className="category-scroll stagger-fade">
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
