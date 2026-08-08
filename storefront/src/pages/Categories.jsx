import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import Reveal from '../animations/Reveal'
import { getCategories } from '../services/mockApi'
import { CATEGORIES_PAGE } from '../data/content'
// Single source of truth for the premium category-card look — the homepage
// CategoryGrid imports the same file, so both surfaces stay consistent.
import '../components/home/CategoryGrid.css'
import './Categories.css'

export default function Categories() {
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getCategories().then((c) => { setCategories(c); setLoading(false) })
  }, [])

  return (
    <div>
      <div className="page-heading">
        <p className="eyebrow">{CATEGORIES_PAGE.eyebrow}</p>
        <h1>{CATEGORIES_PAGE.title}</h1>
        <p>{CATEGORIES_PAGE.subtitle}</p>
      </div>

      <div className="container">
        {loading ? (
          <div className="loading-state">Loading categories…</div>
        ) : (
          <Reveal className="category-scroll stagger-fade categories-page">
            {categories.map((cat) => (
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
          </Reveal>
        )}
      </div>
    </div>
  )
}
