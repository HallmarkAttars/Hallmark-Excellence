import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { cloudinarySrc } from '../../utils/productImage'
import Reveal from '../../animations/Reveal'
import { SOCIAL_STRIP } from '../../data/content'
import './SocialStrip.css'

export default function SocialStrip({ products }) {
  const items = (products || []).slice(0, 6)
  const carouselRef = useRef(null)
  const [activeIndex, setActiveIndex] = useState(0)

  // Track active slide on mobile horizontal scroll
  const handleScroll = () => {
    const el = carouselRef.current
    if (!el) return
    const children = Array.from(el.children)
    if (children.length === 0) return

    const center = el.scrollLeft + el.offsetWidth / 2
    let closestIndex = 0
    let minDistance = Infinity

    children.forEach((child, idx) => {
      const childCenter = child.offsetLeft + child.offsetWidth / 2
      const dist = Math.abs(center - childCenter)
      if (dist < minDistance) {
        minDistance = dist
        closestIndex = idx
      }
    })
    setActiveIndex(closestIndex)
  }

  const scrollToSlide = (idx) => {
    const el = carouselRef.current
    if (!el) return
    const child = el.children[idx]
    if (child) {
      child.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' })
    }
  }

  if (items.length === 0) return null

  return (
    <Reveal as="section" className="social-section">
      <div className="container">
        <div className="social-head">
          <div className="atelier-eyebrow-wrap" aria-hidden="true">
            <span className="atelier-line" />
            <span className="atelier-eyebrow">From the Atelier</span>
            <span className="atelier-line" />
          </div>
          <h2 className="social-title">Follow Our Journey</h2>
          <p className="social-sub">
            Scents, made by hand — oud, rose and amber from our atelier.
          </p>
        </div>

        <div
          className="social-grid"
          ref={carouselRef}
          onScroll={handleScroll}
          role="region"
          aria-label="Atelier product gallery"
        >
          {items.map((product, idx) => (
            <Link
              key={product.id}
              to={`/product/${product.id}`}
              className={`social-tile ${idx === activeIndex ? 'is-active' : ''}`}
              aria-label={`View ${product.name} from our atelier`}
            >
              <img
                src={cloudinarySrc(product.image, { width: 600 })}
                alt={product.name}
                loading="lazy"
                decoding="async"
              />
            </Link>
          ))}
        </div>

        {/* Mobile-only pagination dots */}
        <div className="social-pagination" aria-label="Gallery pagination">
          {items.map((_, idx) => (
            <button
              key={idx}
              type="button"
              className={`social-dot ${idx === activeIndex ? 'is-active' : ''}`}
              onClick={() => scrollToSlide(idx)}
              aria-label={`Go to slide ${idx + 1}`}
              aria-current={idx === activeIndex ? 'true' : 'false'}
            />
          ))}
        </div>

        {/* Desktop-only Instagram follow button */}
        <div className="social-cta">
          <a
            href={SOCIAL_STRIP.cta.href}
            className="btn btn-outline social-cta-btn"
            target="_blank"
            rel="noopener noreferrer"
          >
            {SOCIAL_STRIP.cta.label}
          </a>
        </div>
      </div>
    </Reveal>
  )
}
