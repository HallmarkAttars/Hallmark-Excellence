import { Link } from 'react-router-dom'
import { COLLECTIONS } from '../../data/content'
import { IMAGES } from '../../config/assets'
import './CollectionBanner.css'

export default function CollectionBanner({ brand }) {
  const theme = brand.slug === 'dahab' ? 'dahab' : 'arees'
  const copy = COLLECTIONS[theme] || COLLECTIONS.arees
  const image = IMAGES.collections[brand.slug] || IMAGES.collections.arees

  return (
    <section
      className={`collection-banner collection-banner--${theme}`}
      aria-label={`${brand.name} collection`}
    >
      <div className="container collection-banner-inner">
        <div className="collection-banner-content">
          <p className="collection-banner-eyebrow">{copy.eyebrow}</p>
          <h2 className="collection-banner-title">
            {copy.lines.map((line, i) => (
              <span key={line} className="collection-banner-line">
                {line}
              </span>
            ))}
          </h2>
          {copy.description && <p className="collection-banner-tagline">{copy.description}</p>}
          <Link to={`/brand/${brand.slug}`} className={`btn collection-banner-btn collection-banner-btn--${theme}`}>
            {copy.button}
            <span aria-hidden="true">→</span>
          </Link>
        </div>

        <div
          className="collection-banner-image"
          style={{ backgroundImage: `url(${image})` }}
          role="img"
          aria-label={`${brand.name} fragrance`}
        />
      </div>
    </section>
  )
}
