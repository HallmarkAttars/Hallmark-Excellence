import { Link } from 'react-router-dom'
import './Hero.css'

export default function Hero() {
  return (
    <section className="hero">
      <div className="hero-bg" role="img" aria-label="Amber attar bottle on a dark background" />
      <div className="hero-overlay" aria-hidden="true" />
      <div className="container hero-content">
        <p className="eyebrow hero-eyebrow">Arees &amp; Dahab</p>
        <h1 className="hero-title">
          The Art of
          <br />
          Significance
          <br />
          Attars
        </h1>
        <p className="hero-tagline">
          Alcohol-free oil perfumes, hand-blended in small batches from oud, rose, and
          amber — crafted to be worn, close to the heart and remembered long after.
        </p>
        <div className="hero-actions">
          <Link to="/shop" className="btn btn-gold hero-btn">
            Shop the Collection
          </Link>
          <Link to="/categories/attars" className="btn btn-outline-light hero-btn">
            Explore Attars
            <span className="hero-btn-arrow" aria-hidden="true">→</span>
          </Link>
        </div>
      </div>
    </section>
  )
}
