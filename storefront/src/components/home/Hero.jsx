import { Link } from 'react-router-dom'
import './Hero.css'

export default function Hero() {
  return (
    <section className="hero" role="img" aria-label="Amber attar bottle on a dark background">
      <div className="hero-overlay" />
      <div className="hero-content">
        <p className="eyebrow hero-eyebrow">Arees &amp; Dahab</p>
        <h1>The Art of Significance Attars</h1>
        <p className="hero-tagline">
          Alcohol-free oil perfumes, hand-blended in small batches — oud, rose, and amber
          worn the way scent was always meant to be worn.
        </p>
        <Link to="/shop" className="btn btn-gold">Shop the Collection</Link>
      </div>
    </section>
  )
}
