import { Link } from 'react-router-dom'
import SEO from '../components/seo/SEO'
import { buildSouthIndiaSeo } from '../utils/seo'
import { BUSINESS, SOUTH_INDIA } from '../data/content'
import './SouthIndia.css'

export default function SouthIndia() {
  const seo = buildSouthIndiaSeo()

  return (
    <div className="south-india-page">
      <SEO
        title={seo.title}
        description={seo.description}
        canonical={seo.canonical}
        schema={seo.schema}
      />

      <header className="page-heading">
        <p className="eyebrow">{SOUTH_INDIA.eyebrow}</p>
        <h1>{SOUTH_INDIA.title}</h1>
        <p>{SOUTH_INDIA.intro}</p>
      </header>

      <div className="container south-india-container">
        <section className="si-heritage">
          <div className="si-heritage-card">
            <h2>{SOUTH_INDIA.heritage.heading}</h2>
            {SOUTH_INDIA.heritage.paragraphs.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </div>
        </section>

        <section className="si-reasons">
          <h2>Why Fragrance Buyers in South India Choose Arees</h2>
          <div className="si-reasons-grid">
            {SOUTH_INDIA.reasons.map((reason) => (
              <div key={reason.title} className="si-card">
                <h3>{reason.title}</h3>
                <p>{reason.description}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="si-store-details">
          <h2>{SOUTH_INDIA.store.heading}</h2>
          <div className="si-details-box">
            <div className="si-detail-col">
              <h4>{SOUTH_INDIA.store.addressLabel}</h4>
              <p>{BUSINESS.address}</p>
              <p className="si-landmark">{SOUTH_INDIA.store.landmark}</p>
              <a
                href={BUSINESS.mapDirectionsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="si-map-link"
              >
                {SOUTH_INDIA.store.directionsLabel} -&gt;
              </a>
            </div>

            <div className="si-detail-col">
              <h4>{SOUTH_INDIA.store.hoursHeading}</h4>
              {SOUTH_INDIA.store.hours.map((line) => (
                <p key={line}>{line}</p>
              ))}
              <p>{SOUTH_INDIA.store.wholesaleHours}</p>

              <h4 style={{ marginTop: '16px' }}>{SOUTH_INDIA.store.contactHeading}</h4>
              <p><a href={`tel:${BUSINESS.phoneTel}`}>{BUSINESS.phoneDisplay}</a></p>
              <p><a href={`mailto:${BUSINESS.email}`}>{BUSINESS.email}</a></p>
            </div>
          </div>
        </section>

        <section className="si-coverage">
          <h2>{SOUTH_INDIA.coverage.heading}</h2>
          <p className="si-coverage-sub">{SOUTH_INDIA.coverage.intro}</p>
          <div className="si-regions-grid">
            {SOUTH_INDIA.coverage.regions.map((region) => (
              <div key={region.title} className="si-region">
                <h4>{region.title}</h4>
                <p>{region.description}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="si-cta">
          <h2>{SOUTH_INDIA.cta.heading}</h2>
          <p>{SOUTH_INDIA.cta.intro}</p>
          <div className="si-cta-buttons">
            <Link to="/shop" className="btn btn-primary">Browse All Attars &amp; Perfumes</Link>
            <Link to="/wholesale" className="btn btn-secondary">Wholesale Attars Supply</Link>
            <Link to="/contact" className="btn btn-secondary">Contact Us</Link>
          </div>
        </section>
      </div>
    </div>
  )
}
