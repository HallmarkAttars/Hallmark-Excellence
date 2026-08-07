import { Link } from 'react-router-dom'
<<<<<<< HEAD
import Reveal from '../../animations/Reveal'
import { HOME_CATEGORIES } from '../../data/content'
=======
import Reveal from '../ui/Reveal'
>>>>>>> ee0909d (fix the tracker)
import './CategoryGrid.css'

const CATEGORY_ICONS = {
  'Attars': '✦',
  'Oud': '🪵',
  'Floral': '🌸',
  'Musk': '🌙',
  'Bakhoor': '🔥',
  'Gift Sets': '🎁',
}

export default function CategoryGrid({ categories }) {
  return (
<<<<<<< HEAD
    <Reveal as="section" className="section category-section">
      <div className="container">
        <div className="section-head">
          <h2 className="section-title-upper">{HOME_CATEGORIES.title}</h2>
          <Link to={HOME_CATEGORIES.viewAll.to} className="view-all">
            {HOME_CATEGORIES.viewAll.label}
            <span className="view-all-arrow" aria-hidden="true">→</span>
          </Link>
        </div>
        <div className="category-scroll stagger-fade">
          {categories.map((cat) => (
            <Link key={cat.id} to={`/categories/${cat.slug}`} className="category-card">
              <span className="category-media">
                <span
                  className="category-image"
                  style={{ backgroundImage: `url(${cat.image})` }}
                  role="img"
                  aria-label={cat.name}
                />
              </span>
              <span className="category-name">{cat.name}</span>
            </Link>
=======
    <section className="category-section">
      <div className="container">
        <Reveal animation="fade-up" duration={800}>
          <div className="section-header">
            <span className="section-eyebrow">Fragrance Families</span>
            <h2>Shop by Category</h2>
            <p>Explore our curated fragrance families, each crafted for a distinct mood and moment.</p>
          </div>
        </Reveal>
        <div className="category-grid">
          {categories.map((cat, i) => (
            <Reveal
              key={cat.id}
              as={Link}
              to={`/categories/${cat.slug}`}
              viewTransition
              className="category-card"
              animation="fade-up"
              duration={600}
              delay={i * 80}
              options={{ threshold: 0.1 }}
            >
              <div className="category-image-wrapper">
                <div className="category-image" style={{ backgroundImage: `url(${cat.image})` }} />
                <div className="category-image-overlay" aria-hidden="true" />
                <span className="category-icon">{CATEGORY_ICONS[cat.name] || '✦'}</span>
              </div>
              <div className="category-info">
                <span className="category-name">{cat.name}</span>
                <span className="category-arrow">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
                  </svg>
                </span>
              </div>
            </Reveal>
>>>>>>> ee0909d (fix the tracker)
          ))}
        </div>
      </div>
    </Reveal>
  )
}
