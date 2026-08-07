import { useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { HERO } from '../../data/content'
import { IMAGES } from '../../config/assets'
import './Hero.css'

const TRUST_BADGES = [
  { label: '100% Authentic', icon: '✓' },
  { label: 'Alcohol-Free', icon: '🌿' },
  { label: 'Hand-Blended', icon: '✦' },
]

export default function Hero() {
<<<<<<< HEAD
  // Background image comes from assets.js (inline style overrides the CSS
  // rule); the dark overlay + fallback ink background stay in CSS.
  const bgStyle = IMAGES.heroBackground
    ? { backgroundImage: `url(${IMAGES.heroBackground})` }
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
          <Link to={HERO.primaryCta.to} className="btn btn-gold hero-btn">
            {HERO.primaryCta.label}
          </Link>
          <Link to={HERO.secondaryCta.to} className="btn btn-outline-light hero-btn">
            {HERO.secondaryCta.label}
            <span className="hero-btn-arrow" aria-hidden="true">→</span>
          </Link>
        </div>
=======
  const bgRef = useRef(null)

  useEffect(() => {
    const el = bgRef.current
    if (!el) return

    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (prefersReduced) return

    const hero = el.closest('.hero')
    const heroTop = hero.offsetTop
    const maxOffset = window.innerHeight * 0.7

    const handleScroll = () => {
      const offset = window.scrollY - heroTop
      if (offset >= 0 && offset <= maxOffset) {
        el.style.transform = `translateY(${offset * 0.3}px)`
      }
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <section className="hero" aria-label="Hero banner">
      <div
        ref={bgRef}
        className="hero-bg"
        style={{
          backgroundImage: 'url(https://images.unsplash.com/photo-1615529182904-14819c35db37?w=1600&q=80)',
        }}
      />
      <div className="hero-overlay" />
      <div className="hero-gradient" aria-hidden="true" />

      <div className="hero-content">
        <span className="hero-eyebrow">Arees &amp; Dahab</span>
        <h1>The Art of<br />Significance Attars</h1>
        <p className="hero-tagline">
          Alcohol-free oil perfumes, hand-blended in small batches — oud, rose, and amber
          worn the way scent was always meant to be worn.
        </p>
        <div className="hero-actions">
          <Link to="/shop" viewTransition className="btn btn-gold">
            Shop the Collection
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
            </svg>
          </Link>
          <Link to="/categories" viewTransition className="btn btn-outline hero-btn-outline">
            Explore Categories
          </Link>
        </div>

        <div className="hero-badges">
          {TRUST_BADGES.map((badge) => (
            <span key={badge.label} className="hero-badge">
              <span className="hero-badge-icon">{badge.icon}</span>
              {badge.label}
            </span>
          ))}
        </div>
      </div>

      <div className="hero-scroll" aria-hidden="true">
        <span>Scroll</span>
        <div className="hero-scroll-line" />
>>>>>>> ee0909d (fix the tracker)
      </div>
    </section>
  )
}
