import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import Reveal from '../components/ui/Reveal'
import { getCategories } from '../services/mockApi'
import { CATEGORIES_PAGE } from '../data/content'
import './Categories.css'

const CATEGORY_ICONS = {
  'Attars': '✦',
  'Oud': '🪵',
  'Floral': '🌸',
  'Musk': '🌙',
  'Bakhoor': '🔥',
  'Gift Sets': '🎁',
}

export default function Categories() {
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getCategories().then((c) => { setCategories(c); setLoading(false) })
  }, [])

  return (
    <div>
<<<<<<< HEAD
      <div className="page-heading">
        <p className="eyebrow">{CATEGORIES_PAGE.eyebrow}</p>
        <h1>{CATEGORIES_PAGE.title}</h1>
        <p>{CATEGORIES_PAGE.subtitle}</p>
      </div>
=======
      {/* ─── Page Hero ─── */}
      <section className="categories-hero">
        <div className="container">
          <Reveal animation="fade-up" duration={800}>
            <span className="section-eyebrow" style={{ color: 'var(--luxury-gold-light)' }}>
              Browse
            </span>
            <h1>All Categories</h1>
            <p className="categories-hero-desc">
              Find your signature scent by fragrance family.
            </p>
          </Reveal>
        </div>
      </section>
>>>>>>> ee0909d (fix the tracker)

      {/* ─── Content ─── */}
      <div className="container categories-content">
        {loading ? (
          <div className="loading-state">Loading categories…</div>
        ) : (
          <div className="categories-grid">
            {categories.map((cat, i) => (
              <Reveal
                key={cat.id}
                as={Link}
                to={`/categories/${cat.slug}`}
                viewTransition
                className="categories-card"
                animation="fade-up"
                duration={600}
                delay={i * 80}
                options={{ threshold: 0.1 }}
              >
                <div className="categories-image-wrapper">
                  <div className="categories-image" style={{ backgroundImage: `url(${cat.image})` }} />
                  <div className="categories-image-overlay" aria-hidden="true" />
                  <span className="categories-icon">{CATEGORY_ICONS[cat.name] || '✦'}</span>
                </div>
                <div className="categories-info">
                  <span className="categories-name">{cat.name}</span>
                  <span className="categories-arrow">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
                    </svg>
                  </span>
                </div>
              </Reveal>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
