import { Link } from 'react-router-dom'
import { HERO } from '../../data/content'
import { IMAGES } from '../../config/assets'
import './Hero.css'

export default function Hero() {
  // Background image comes from assets.js (inline style overrides the CSS
  // rule); the dark overlay + fallback ink background stay in CSS.
  const bgStyle = IMAGES.heroBackground
    ? { backgroundImage: `url(${IMAGES.heroBackground})` }
    : undefined

  return (
    <section className="hero">
      <div className="hero-bg" style={bgStyle} role="img" aria-label="Amber attar bottle on a dark background" />
      <div className="hero-overlay" aria-hidden="true" />
      <div className="hero-content">
        <h1 className="hero-title">
          {HERO.title.map((line, i) => (
            <span key={`${line}-${i}`}>
              {line}
              {i < HERO.title.length - 1 && <br />}
            </span>
          ))}
        </h1>
        <p className="hero-tagline">{HERO.subtitle}</p>
        <div className="hero-actions">
          <Link to={HERO.primaryCta.to} className="btn btn-gold hero-btn">
            {HERO.primaryCta.label}
          </Link>
          <Link to={HERO.secondaryCta.to} className="btn btn-outline-light hero-btn">
            {HERO.secondaryCta.label}
            <span className="hero-btn-arrow" aria-hidden="true">→</span>
          </Link>
        </div>
      </div>
    </section>
  )
}
