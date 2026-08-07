import { Link } from 'react-router-dom'
import Reveal from '../ui/Reveal'
import './BrandShowcase.css'

const BRANDS = [
  {
    id: 'arees',
    name: 'Arees',
    slug: 'arees',
    tagline: 'Bold & Smoky',
    description:
      'Deep oud and amber compositions built for presence. Each attar is aged in cedar and bottled at its peak — worn by those who leave a mark.',
    price: 'From ₹2,499',
    image:
      'https://images.unsplash.com/photo-1592945403244-b3fbafd7f539?w=900&q=80',
    logo: 'A',
    accent: '#2A2A2A',
  },
  {
    id: 'dahab',
    name: 'Dahab',
    slug: 'dahab',
    tagline: 'Golden & Floral',
    description:
      'Rose, jasmine and soft musk blended in the old tradition. Light enough for daylight, layered enough for evening — the gold standard in oil perfumery.',
    price: 'From ₹1,999',
    image:
      'https://images.unsplash.com/photo-1615634260167-c8cdede054de?w=900&q=80',
    logo: 'D',
    accent: '#C8A96A',
  },
]

export default function BrandShowcase() {
  return (
    <section className="brand-showcase">
      <div className="container">
        <Reveal animation="fade-up" duration={800}>
          <div className="section-header">
            <span className="section-eyebrow">Our Houses</span>
            <h2>Two Exceptional Brands</h2>
            <p>
              Two distinct houses united by a single philosophy — concentrated fragrance,
              worn the way scent was always meant to be worn.
            </p>
          </div>
        </Reveal>

        <div className="brand-showcase-list">
          {BRANDS.map((brand, i) => (
            <Reveal
              key={brand.id}
              animation="fade-up"
              duration={700}
              delay={i * 150}
            >
              <article className={`brand-card ${i % 2 === 1 ? 'brand-card-reverse' : ''}`}>
                <div className="brand-card-image-wrap">
                  <Link to={`/brand/${brand.slug}`} viewTransition tabIndex={-1}>
                    <img src={brand.image} alt={brand.name} loading="lazy" />
                  </Link>
                  <div className="brand-card-image-overlay" aria-hidden="true" />
                </div>
                <div className="brand-card-body">
                  <span className="brand-card-logo" style={{ color: brand.accent }}>
                    {brand.logo}
                  </span>
                  <p className="brand-card-tagline">{brand.tagline}</p>
                  <h3 className="brand-card-name">{brand.name}</h3>
                  <p className="brand-card-description">{brand.description}</p>
                  <p className="brand-card-price">{brand.price}</p>
                  <Link
                    to={`/brand/${brand.slug}`}
                    viewTransition
                    className="btn btn-outline brand-card-btn"
                  >
                    Explore {brand.name}
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
                    </svg>
                  </Link>
                </div>
              </article>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}
