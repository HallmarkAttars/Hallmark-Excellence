import { Link } from 'react-router-dom'
import './CollectionBanner.css'

const IMAGES = {
  arees: 'https://images.unsplash.com/photo-1592945403244-b3fbafd7f539?w=1200&q=70',
  dahab: 'https://images.unsplash.com/photo-1615634260167-c8cdede054de?w=1200&q=70',
}

const COPY = {
  arees: {
    eyebrow: 'Arees Collection',
    lines: ['Timeless Scents', 'Pure Elegance'],
    description: 'Discover timeless fragrances crafted with refined elegance.',
    button: 'Shop Now',
  },
  dahab: {
    eyebrow: 'Dahab Collection',
    lines: ['Rich Heritage', 'Lasting Impressions'],
    description: 'A rich fragrance collection created to leave a lasting impression.',
    button: 'Shop Now',
  },
}

export default function CollectionBanner({ brand }) {
  const theme = brand.slug === 'dahab' ? 'dahab' : 'arees'
  const copy = COPY[theme] || COPY.arees
  const image = IMAGES[brand.slug] || IMAGES.arees

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
