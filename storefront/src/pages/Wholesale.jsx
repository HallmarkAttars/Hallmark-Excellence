import { Link } from 'react-router-dom'
import SEO from '../components/seo/SEO'
import { buildWholesaleSeo } from '../utils/seo'
import { BUSINESS, WHOLESALE } from '../data/content'
import './Wholesale.css'

export default function Wholesale() {
  const seo = buildWholesaleSeo()

  return (
    <div className="wholesale-page">
      <SEO
        title={seo.title}
        description={seo.description}
        canonical={seo.canonical}
        schema={seo.schema}
      />

      <header className="page-heading">
        <p className="eyebrow">{WHOLESALE.eyebrow}</p>
        <h1>{WHOLESALE.title}</h1>
        <p>{WHOLESALE.intro}</p>
      </header>

      <div className="container wholesale-container">
        <section className="wholesale-overview">
          <div className="wholesale-intro-card">
            <h2>{WHOLESALE.overviewHeading}</h2>
            {WHOLESALE.overviewParagraphs.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </div>
        </section>

        <section className="wholesale-tiers-section" aria-labelledby="wholesale-facts-heading">
          <h2 id="wholesale-facts-heading">MOQ, Hours &amp; Export Facts</h2>
          <div className="wholesale-tiers-grid">
            {WHOLESALE.quickFacts.map((fact) => (
              <div key={fact.label} className="tier-card">
                <span className="tier-badge">{fact.label}</span>
                <h4>{fact.value}</h4>
              </div>
            ))}
          </div>
        </section>

        <section className="wholesale-categories">
          <h2>Our Wholesale Product Range</h2>
          <div className="wholesale-grid">
            {WHOLESALE.productRange.map((product) => (
              <div key={product.title} className="wholesale-card">
                <h3>{product.title}</h3>
                <p>{product.description}</p>
                <div className="wholesale-card-links">
                  {product.links.map((link) => (
                    <Link key={link.to} to={link.to} className="wholesale-link">
                      {link.label} -&gt;
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="wholesale-tiers-section">
          <h2>Transparent Bulk Quantity Tiers</h2>
          <p className="wholesale-section-sub">{WHOLESALE.tiersNote}</p>
          <div className="wholesale-tiers-grid">
            {WHOLESALE.tiers.map((tier) => (
              <div key={tier.badge} className="tier-card">
                <span className="tier-badge">{tier.badge}</span>
                <h4>{tier.heading}</h4>
                <p>{tier.description}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="wholesale-process">
          <h2>How Wholesale Ordering Works</h2>
          <div className="process-steps">
            {WHOLESALE.process.map((step, index) => (
              <div key={step.title} className="step-item">
                <span className="step-num">{index + 1}</span>
                <h4>{step.title}</h4>
                <p>{step.description}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="wholesale-overview">
          <div className="wholesale-intro-card">
            {WHOLESALE.sections.map((section) => (
              <div key={section.heading} className="wholesale-copy-block">
                <h2>{section.heading}</h2>
                {section.paragraphs.map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
              </div>
            ))}
          </div>
        </section>

        <section className="wholesale-overview">
          <div className="wholesale-intro-card">
            <h2>What to Include in Your Wholesale Enquiry</h2>
            <ul className="wholesale-checklist">
              {WHOLESALE.buyerChecklist.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        </section>

        <section className="wholesale-categories" aria-labelledby="wholesale-faq-heading">
          <h2 id="wholesale-faq-heading">Wholesale &amp; Export FAQs</h2>
          <div className="wholesale-grid">
            {WHOLESALE.faqs.map((faq) => (
              <div key={faq.question} className="wholesale-card">
                <h3>{faq.question}</h3>
                <p>{faq.answer}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="wholesale-contact-cta">
          <h2>Contact Our Wholesale Desk</h2>
          <p>Discuss MOQ, private label, export requirements or visit our trading office in Chennai:</p>
          <div className="wholesale-contact-details">
            <p><strong>Boutique &amp; Trading Office:</strong> {BUSINESS.address}</p>
            <p><strong>Wholesale Desk Hours:</strong> {BUSINESS.wholesaleHours}</p>
            <p><strong>Direct Helpline / WhatsApp:</strong> <a href={`tel:${BUSINESS.phoneTel}`}>{BUSINESS.phoneDisplay}</a></p>
            <p><strong>Wholesale Email:</strong> <a href={`mailto:${BUSINESS.email}`}>{BUSINESS.email}</a></p>
          </div>
          <p className="wholesale-hikma-link">
            <Link to="/hikma-exports">Learn about Hikma Exports and Hikma Perfumes -&gt;</Link>
          </p>
          <div className="wholesale-buttons">
            <Link to="/contact" className="btn btn-primary">Submit Wholesale Enquiry</Link>
            <Link to="/shop" className="btn btn-secondary">Browse Complete Catalogue</Link>
          </div>
        </section>
      </div>
    </div>
  )
}
