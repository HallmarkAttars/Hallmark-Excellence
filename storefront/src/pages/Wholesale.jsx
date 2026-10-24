import { Link } from 'react-router-dom'
import SEO from '../components/seo/SEO'
import { buildBreadcrumbsSchema } from '../utils/seo'
import { BUSINESS } from '../data/content'
import './Wholesale.css'

export default function Wholesale() {
  const breadcrumbs = [
    { name: 'Home', path: '/' },
    { name: 'Wholesale Attars', path: '/wholesale' },
  ]

  return (
    <div className="wholesale-page">
      <SEO
        title="Wholesale Attars in Chennai | Arees Perfumes & Hikma Exports"
        description="Wholesale attars and bulk perfume oils from Mannadi, Chennai. Arees Perfumes and Hikma Exports supply retailers with roll-ons, fragrance oils, and packaging across India."
        canonical="/wholesale"
        schema={buildBreadcrumbsSchema(breadcrumbs)}
      />

      <header className="page-heading">
        <p className="eyebrow">B2B & Commercial Supply</p>
        <h1>Wholesale Attars & Bulk Attar Supplier in Chennai</h1>
        <p>Premium alcohol-free perfume oils, glass packaging, and bulk fragrance supply across South India and pan-India.</p>
      </header>

      <div className="container wholesale-container">
        {/* Intro overview */}
        <section className="wholesale-overview">
          <div className="wholesale-intro-card">
            <h2>Trusted Wholesale Perfume Supplier with 30 Years of Industry Experience</h2>
            <p>
              Arees Perfumes supplies wholesale attars and bulk perfume oils to perfumers, retailers, gift shops, and boutique fragrance brands.
              Based in Mannadi, George Town, Chennai, and operating under Hallmark of Excellence and Hikma Exports, we combine traditional
              Arabian perfumery craftsmanship with dependable commercial logistics.
            </p>
            <p>
              Whether you need pre-packaged 6ml and 8ml roll-ons for your retail shelves, concentrated fragrance oils for custom blending,
              or empty roll-on and spray glass bottles with caps and pumps, our wholesale division provides transparent bulk pricing
              and verified quality control.
            </p>
          </div>
        </section>

        {/* Product categories */}
        <section className="wholesale-categories">
          <h2>Our Wholesale Product Range</h2>
          <div className="wholesale-grid">
            <div className="wholesale-card">
              <h3>Wholesale Roll-on Attars</h3>
              <p>
                Ready-to-retail 6ml and 8ml roll-on attar bottles under the acclaimed <strong>Arees</strong> and <strong>Dahab</strong> collections.
                Formulated alcohol-free with long-lasting scent projection.
              </p>
              <Link to="/brand/arees" className="wholesale-link">Explore Arees Wholesale →</Link>
            </div>

            <div className="wholesale-card">
              <h3>Bulk Concentrated Fragrance Oils</h3>
              <p>
                Pure attar bases and undiluted perfume oils available in commercial quantities for blending, decanting,
                and custom perfume creation. Over 290 authentic fragrance varieties.
              </p>
              <Link to="/categories/10" className="wholesale-link">View Fragrance Oils →</Link>
            </div>

            <div className="wholesale-card">
              <h3>Bottles, Caps & Packaging Solutions</h3>
              <p>
                Complete packaging hardware including 3ml, 6ml, 8ml, and 12ml glass roll-on bottles, spray bottles,
                aluminum and gold caps, spray pumps, and display bottles.
              </p>
              <Link to="/categories" className="wholesale-link">View Packaging Range →</Link>
            </div>

            <div className="wholesale-card">
              <h3>Bakhoor & Traditional Incense</h3>
              <p>
                Premium Arabian bakhoor chips and aromatic resins curated for specialty stores, religious occasions,
                and luxury gift packaging.
              </p>
              <Link to="/categories/Bakhoor%20" className="wholesale-link">Explore Bakhoor →</Link>
            </div>
          </div>
        </section>

        {/* Bulk tiers explanation */}
        <section className="wholesale-tiers-section">
          <h2>Transparent Bulk Quantity Tiers</h2>
          <p className="wholesale-section-sub">
            Our catalog features automated tiered pricing designed for volume orders. No artificial markups — volume discounts are applied directly.
          </p>
          <div className="wholesale-tiers-grid">
            <div className="tier-card">
              <span className="tier-badge">Starter Tier</span>
              <h4>60 – 120 Pieces</h4>
              <p>Ideal for independent perfume retailers, boutiques, and initial store stock.</p>
            </div>
            <div className="tier-card">
              <span className="tier-badge">Commercial Tier</span>
              <h4>180 Pieces</h4>
              <p>Optimized rates for growing perfume shops and regional distributors.</p>
            </div>
            <div className="tier-card">
              <span className="tier-badge">Master Wholesale</span>
              <h4>216+ Pieces</h4>
              <p>Our lowest per-piece wholesale price for volume distributors and bulk trading partners.</p>
            </div>
          </div>
        </section>

        {/* How it works */}
        <section className="wholesale-process">
          <h2>How Wholesale Ordering Works</h2>
          <div className="process-steps">
            <div className="step-item">
              <span className="step-num">1</span>
              <h4>Browse Real Catalogue</h4>
              <p>Explore all 370+ active products with live pricing and variant configurations.</p>
            </div>
            <div className="step-item">
              <span className="step-num">2</span>
              <h4>Assemble Order Request</h4>
              <p>Add required quantities to your list or reach our desk directly via WhatsApp with your SKU list.</p>
            </div>
            <div className="step-item">
              <span className="step-num">3</span>
              <h4>Receive Formal Invoice</h4>
              <p>Get a computer-generated GST-compliant invoice specifying exact item rates, quantities, and transport.</p>
            </div>
            <div className="step-item">
              <span className="step-num">4</span>
              <h4>Secure Dispatch</h4>
              <p>Orders are carefully packed and dispatched through reliable courier and transport networks from Chennai.</p>
            </div>
          </div>
        </section>

        {/* Contact info box */}
        <section className="wholesale-contact-cta">
          <h2>Contact Our Wholesale Desk</h2>
          <p>Discuss custom quantities, logistics, or visit our physical trading office in Chennai:</p>
          <div className="wholesale-contact-details">
            <p><strong>Boutique & Trading Office:</strong> {BUSINESS.address}</p>
            <p><strong>Direct Helpline / WhatsApp:</strong> <a href={`tel:${BUSINESS.phoneTel}`}>{BUSINESS.phoneDisplay}</a></p>
            <p><strong>Wholesale Email:</strong> <a href={`mailto:${BUSINESS.email}`}>{BUSINESS.email}</a></p>
          </div>
          <div className="wholesale-buttons">
            <Link to="/contact" className="btn btn-primary">Submit Wholesale Enquiry</Link>
            <Link to="/shop" className="btn btn-secondary">Browse Complete Catalogue</Link>
          </div>
        </section>
      </div>
    </div>
  )
}
