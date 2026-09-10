import { Link } from 'react-router-dom'
import { HERO } from '../../data/content'
import { IMAGES } from '../../config/assets'
import './Hero.css'

export default function Hero() {
  return (
    <section className="hero">
      {IMAGES.heroBackground && (
        <picture className="hero-picture">
          {IMAGES.heroBackgroundWebp && (
            <source type="image/webp" srcSet={IMAGES.heroBackgroundWebp} />
          )}
          <img
            src={IMAGES.heroBackground}
            alt="Hallmark luxury perfume and attar collection"
            className="hero-img hero-bg hero-bg-anim"
            fetchpriority="high"
            decoding="async"
          />
        </picture>
      )}
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
