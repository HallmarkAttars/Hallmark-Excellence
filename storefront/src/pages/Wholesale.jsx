import { useEffect, useMemo } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import SEO from '../components/seo/SEO'
import WholesaleEnquiryForm from '../components/wholesale/WholesaleEnquiryForm'
import { useCart } from '../context/CartContext'
import { buildWholesaleSeo } from '../utils/seo'
import { getBulkTiers, isValidBulkRule } from '../utils/brandBulk'
import { brandPublicSlug } from '../utils/brandSlug'
import { WHATSAPP_URL, trackWhatsAppLead } from '../utils/whatsapp'
import { BUSINESS, WHOLESALE } from '../data/content'
import './Wholesale.css'

const formatPrice = (value) => `₹${Number(value).toLocaleString('en-IN')}`

export default function Wholesale() {
  const seo = buildWholesaleSeo()
  const { brands, brandsLoaded } = useCart()
  const [searchParams] = useSearchParams()
  const prefilledProduct = searchParams.get('product') || ''

  const liveBrands = useMemo(
    () =>
      (brands || [])
        .filter(isValidBulkRule)
        .map((brand) => ({
          id: brand.id,
          name: brand.name,
          collection: brand.collection_label || '',
          slug: brandPublicSlug(brand.slug),
          displayOrder: Number(brand.display_order) || 0,
          tiers: getBulkTiers(brand) || [],
        }))
        .filter((brand) => brand.tiers.length > 0)
        .sort(
          (a, b) =>
            a.displayOrder - b.displayOrder || a.name.localeCompare(b.name)
        ),
    [brands]
  )

  useEffect(() => {
    if (window.location.hash !== '#wholesale-enquiry') return
    const target = document.getElementById('wholesale-enquiry')
    if (!target) return
    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    target.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' })
  }, [])

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
        <div className="wholesale-hero-actions">
          <a href="#wholesale-enquiry" className="btn btn-gold">
            Request a wholesale quote
          </a>
          <a
            href={WHATSAPP_URL}
            className="btn btn-outline"
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => trackWhatsAppLead('wholesale-hero')}
          >
            WhatsApp the trade desk
          </a>
        </div>
      </header>

      <div className="container wholesale-container">
        <ul className="wholesale-trust-row" aria-label="Trade credentials">
          <li><strong>GST</strong> GST-registered business</li>
          <li><strong>IEC</strong> Export documentation on request</li>
          <li><strong>Chennai</strong> Dispatch from Mannadi, George Town</li>
        </ul>
        <section className="wholesale-overview">
          <div className="wholesale-intro-card">
            <h2>{WHOLESALE.overviewHeading}</h2>
            {WHOLESALE.overviewParagraphs.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
            {WHOLESALE.guideCta && (
              <p className="wholesale-guide-link">
                <Link to={WHOLESALE.guideCta.to}>
                  {WHOLESALE.guideCta.label} -&gt;
                </Link>
              </p>
            )}
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

          <figure className="wholesale-showcase">
            <a
              href={WHOLESALE.packagingShowcase.src}
              target="_blank"
              rel="noopener noreferrer"
              className="wholesale-showcase-image-link"
              aria-label="Open the full-size Arees roll-on bottle range"
            >
              <img
                src={WHOLESALE.packagingShowcase.src}
                srcSet={WHOLESALE.packagingShowcase.srcSet}
                sizes={WHOLESALE.packagingShowcase.sizes}
                alt={WHOLESALE.packagingShowcase.alt}
                loading="lazy"
                decoding="async"
              />
            </a>
            <figcaption>
              <span>{WHOLESALE.packagingShowcase.caption}</span>
              <a
                href={WHOLESALE.packagingShowcase.src}
                target="_blank"
                rel="noopener noreferrer"
                className="wholesale-showcase-link"
              >
                View full size -&gt;
              </a>
            </figcaption>
          </figure>
        </section>

        <section className="wholesale-tiers-section" aria-labelledby="wholesale-live-heading">
          <h2 id="wholesale-live-heading">Live Per-Brand Bulk Rates</h2>
          <p className="wholesale-section-sub">{WHOLESALE.tiersNote}</p>
          {!brandsLoaded ? (
            <p className="wholesale-tier-status" role="status">
              Loading the current brand rates…
            </p>
          ) : liveBrands.length > 0 ? (
            <div className="wholesale-live-tier-grid">
              {liveBrands.map((brand) => (
                <article key={brand.id} className="live-tier-card">
                  <span className="tier-badge">{brand.collection || 'Brand'}</span>
                  <h3>{brand.name}</h3>
                  <p className="live-tier-moq">
                    MOQ {brand.tiers[0].minQuantity} pieces
                  </p>
                  <ul className="live-tier-rates">
                    {brand.tiers.map((tier, index) => (
                      <li
                        key={`${brand.id}-${tier.minQuantity}`}
                        className={index === brand.tiers.length - 1 ? 'is-best' : undefined}
                      >
                        <span>{tier.minQuantity}+ pieces</span>
                        <strong>
                          {formatPrice(tier.price)}
                          <small>/piece</small>
                        </strong>
                      </li>
                    ))}
                  </ul>
                  {brand.slug && (
                    <Link to={`/brand/${brand.slug}`} className="wholesale-link">
                      Shop {brand.name} -&gt;
                    </Link>
                  )}
                </article>
              ))}
            </div>
          ) : (
            <div className="wholesale-tier-status">
              <p>Live brand rates are temporarily unavailable.</p>
              <a href="#wholesale-enquiry">Request current tiers and a written quote</a>
            </div>
          )}
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

        <WholesaleEnquiryForm initialProduct={prefilledProduct} />

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
            <a href="#wholesale-enquiry" className="btn btn-primary">
              Start a wholesale enquiry
            </a>
            <a
              href={WHATSAPP_URL}
              className="btn btn-secondary"
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => trackWhatsAppLead('wholesale-contact')}
            >
              WhatsApp the trade desk
            </a>
            <Link to="/shop" className="btn btn-outline">
              Browse the catalogue
            </Link>
          </div>
        </section>
      </div>
    </div>
  )
}
