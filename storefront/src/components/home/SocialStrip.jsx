import { Link } from 'react-router-dom'
import './SocialStrip.css'

export default function SocialStrip({ products }) {
  const items = (products || []).slice(0, 6)
  if (items.length === 0) return null

  return (
    <section className="social-section">
      <div className="container">
        <div className="social-head">
          <h2 className="section-title-upper">Follow Our Journey</h2>
          <p className="social-sub">
            Scent, made by hand — oud, rose and amber from our atelier.
          </p>
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
          <a href="#" className="btn btn-outline social-cta-btn">
            Follow Us on Instagram
          </a>
        </div>
      </div>
    </section>
  )
}
