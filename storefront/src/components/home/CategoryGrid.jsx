import { Link } from 'react-router-dom'
import './CategoryGrid.css'

export default function CategoryGrid({ categories }) {
  return (
    <section className="section category-section">
      <div className="container">
        <div className="section-title">
          <p className="eyebrow">Explore</p>
          <h2>Shop by Category</h2>
        </div>
        <div className="category-scroll">
          {categories.map((cat) => (
            <Link key={cat.id} to={`/categories/${cat.slug}`} className="category-card">
              <div className="category-image" style={{ backgroundImage: `url(${cat.image})` }} />
              <span>{cat.name}</span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}
