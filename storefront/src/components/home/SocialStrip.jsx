import { Link } from 'react-router-dom'
import { SOCIAL_STRIP } from '../../data/content'
import './SocialStrip.css'

export default function SocialStrip({ products }) {
  const items = (products || []).slice(0, 6)
  if (items.length === 0) return null

  return (
    <section className="social-section">
      <div className="container">
        <div className="social-head">
          <h2 className="section-title-upper">{SOCIAL_STRIP.title}</h2>
          <p className="social-sub">{SOCIAL_STRIP.subtitle}</p>
        </div>

        <div className="social-grid">
          {items.map((product) => (
            <Link
              key={product.id}
              to={`/product/${product.id}`}
              className="social-tile"
              aria-label={product.name}
            >
              <img src={product.image} alt={product.name} loading="lazy" />
            </Link>
          ))}
        </div>

        <div className="social-cta">
          <a href={SOCIAL_STRIP.cta.href} className="btn btn-outline social-cta-btn">
            {SOCIAL_STRIP.cta.label}
          </a>
        </div>
      </div>
    </section>
  )
}
