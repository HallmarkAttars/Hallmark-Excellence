import { Link } from 'react-router-dom'
import './CategoryGrid.css'

export default function CategoryGrid({ categories }) {
  return (
    <section className="section category-section">
      <div className="container">
        <div className="section-head">
          <h2 className="section-title-upper">Shop by Category</h2>
          <Link to="/categories" className="view-all">
            View All
            <span className="view-all-arrow" aria-hidden="true">→</span>
          </Link>
        </div>
        <div className="category-scroll">
          {categories.map((cat) => (
            <Link key={cat.id} to={`/categories/${cat.slug}`} className="category-card">
              <span
                className="category-image"
                style={{ backgroundImage: `url(${cat.image})` }}
                role="img"
                aria-label={cat.name}
              />
              <span className="category-name">{cat.name}</span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}
