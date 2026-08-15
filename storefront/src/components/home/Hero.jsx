import { Link } from 'react-router-dom'
import { HERO } from '../../data/content'
import { IMAGES } from '../../config/assets'
import './Hero.css'

export default function Hero() {
  // Background image comes from assets.js (inline style overrides the CSS
  // rule); the dark overlay + fallback ink background stay in CSS.
  // Modern browsers pick the optimized WebP variant (88 KB); legacy browsers
  // without WebP fall back to the original PNG — identical visuals.
  const bgStyle = IMAGES.heroBackground
    ? {
        backgroundImage: `image-set(url(${IMAGES.heroBackgroundWebp}) type('image/webp') 1x, url(${IMAGES.heroBackground}) type('image/png') 1x)`,
      }
    : undefined

  return (
    <section className="hero">
      <div className="hero-bg hero-bg-anim" style={bgStyle} role="img" aria-label="Amber attar bottle on a dark background" />
      <div className="hero-overlay" aria-hidden="true" />
      <div className="hero-content">
        <h1 className="hero-title hero-reveal hero-reveal-1">
          {HERO.title.map((line, i) => (
            <span key={`${line}-${i}`}>
              {line}
              {i < HERO.title.length - 1 && <br />}
            </span>
          ))}
        </h1>
        <p className="hero-tagline hero-reveal hero-reveal-2">{HERO.subtitle}</p>
        <div className="hero-actions hero-reveal hero-reveal-3">
          <Link to={HERO.primaryCta.to} className="btn hero-btn hero-btn-primary">
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
