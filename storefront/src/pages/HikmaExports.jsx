import { Link } from 'react-router-dom'
import SEO from '../components/seo/SEO'
import { IMAGES } from '../config/assets'
import { BUSINESS, HIKMA_EXPORTS } from '../data/content'
import { buildHikmaExportsSeo } from '../utils/seo'
import './HikmaExports.css'

export default function HikmaExports() {
  const seo = buildHikmaExportsSeo()

  return (
    <div className="hikma-page">
      <SEO
        title={seo.title}
        description={seo.description}
        canonical={seo.canonical}
        schema={seo.schema}
      />

      <header className="page-heading">
        <p className="eyebrow">{HIKMA_EXPORTS.eyebrow}</p>
        <h1>{HIKMA_EXPORTS.title}</h1>
        <p className="page-heading-sub">{HIKMA_EXPORTS.intro}</p>
      </header>

      <div className="container hikma-container">
        <section className="hikma-intro-card">
          <div className="hikma-intro-copy">
            {HIKMA_EXPORTS.introParagraphs.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
            <div className="hikma-actions">
              <Link to="/wholesale" className="btn btn-primary">Wholesale Enquiry</Link>
              <Link to="/shop" className="btn btn-secondary">Browse Catalogue</Link>
            </div>
          </div>
          <div
            className="hikma-intro-image"
            style={{ backgroundImage: `url(${IMAGES.aboutImage})` }}
            role="img"
            aria-label="Arees and Dahab fragrance bottles at the Chennai atelier"
          />
        </section>

        <section className="hikma-offerings" aria-labelledby="hikma-facts-heading">
          <h2 id="hikma-facts-heading">MOQ, Hours &amp; Export Facts</h2>
          <div className="hikma-offerings-grid">
            {HIKMA_EXPORTS.quickFacts.map((fact) => (
              <article key={fact.label} className="hikma-offering-card">
                <h3>{fact.label}</h3>
                <p>{fact.value}</p>
              </article>
            ))}
          </div>
        </section>

        {HIKMA_EXPORTS.sections.map((section) => (
          <section key={section.heading} className="hikma-section">
            <h2>{section.heading}</h2>
            {section.paragraphs.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </section>
        ))}

        <section className="hikma-offerings" aria-labelledby="hikma-offerings-heading">
          <h2 id="hikma-offerings-heading">What Hikma Exports Supplies</h2>
          <div className="hikma-offerings-grid">
            {HIKMA_EXPORTS.offerings.map((item) => (
              <article key={item.title} className="hikma-offering-card">
                <h3>{item.title}</h3>
                <p>{item.description}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="hikma-related" aria-labelledby="hikma-related-heading">
          <h2 id="hikma-related-heading">Explore the Hikma Exports Group</h2>
          <div className="hikma-related-links">
            <Link to="/about">About Arees & Dahab</Link>
            <Link to="/brand/arees">Arees Perfumes</Link>
            <Link to="/brand/dahab">Dahab</Link>
            <Link to="/wholesale">Wholesale Attars</Link>
          </div>
        </section>

        <section className="hikma-contact" aria-labelledby="hikma-contact-heading">
          <h2 id="hikma-contact-heading">Contact Hikma Exports</h2>
          <p>
            For wholesale pricing, export enquiries, product availability or a visit to the
            Moore Street office, contact the Chennai team.
          </p>
          <div className="hikma-contact-details">
            <p><strong>Address:</strong> {BUSINESS.address}</p>
            <p>
              <strong>Phone / WhatsApp:</strong>{' '}
              <a href={`tel:${BUSINESS.phoneTel}`}>{BUSINESS.phoneDisplay}</a>
            </p>
            <p>
              <strong>Email:</strong>{' '}
              <a href={`mailto:${BUSINESS.email}`}>{BUSINESS.email}</a>
            </p>
          </div>
          <div className="hikma-actions hikma-actions--center">
            <Link to="/contact" className="btn btn-primary">Send an Enquiry</Link>
            <a
              href={BUSINESS.mapDirectionsUrl}
              className="btn btn-secondary"
              target="_blank"
              rel="noopener noreferrer"
            >
              Get Directions
            </a>
          </div>
        </section>

        <section className="hikma-faq" aria-labelledby="hikma-exports-faq-heading">
          <h2 id="hikma-exports-faq-heading">Hikma Exports FAQs</h2>
          <div className="hikma-faq-grid">
            {HIKMA_EXPORTS.faqs.map((faq) => (
              <article key={faq.question} className="hikma-faq-item">
                <h3>{faq.question}</h3>
                <p>{faq.answer}</p>
              </article>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}
