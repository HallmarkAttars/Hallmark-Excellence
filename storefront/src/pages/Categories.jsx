import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getCategories } from '../services/mockApi'
import { CATEGORIES_PAGE } from '../data/content'
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
          <div className="categories-grid">
            {categories.map((cat) => (
              <Link key={cat.id} to={`/categories/${cat.slug}`} className="categories-card">
                <div className="categories-image" style={{ backgroundImage: `url(${cat.image})` }} />
                <h3>{cat.name}</h3>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
