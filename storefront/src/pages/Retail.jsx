import { Link } from 'react-router-dom'
import SEO from '../components/seo/SEO'
import { buildBreadcrumbsSchema } from '../utils/seo'
import { BUSINESS } from '../data/content'
import './Retail.css'

export default function Retail() {
  const breadcrumbs = [
    { name: 'Home', path: '/' },
    { name: 'Retail Attars', path: '/retail' },
  ]

  return (
    <div className="retail-page">
      <SEO
        title="Retail Attars & Pure Perfume Oils | Buy Online | Arees Perfumes"
        description="Discover pure retail attars and alcohol-free perfume oils from Arees Perfumes. Handcrafted roll-on attars, artisanal oud, musk, and floral blends delivered across India."
        canonical="/retail"
        schema={buildBreadcrumbsSchema(breadcrumbs)}
      />

      <header className="page-heading">
        <p className="eyebrow">Personal Fragrance Collection</p>
        <h1>Retail Attars & Pure Perfume Oils</h1>
        <p>Pure alcohol-free attar oils, individual roll-ons, and personal fragrance bottles crafted for everyday luxury.</p>
      </header>

      <div className="container retail-container">
        {/* Intro section */}
        <section className="retail-intro">
          <div className="retail-intro-card">
            <h2>Handcrafted Retail Attars for Individual Fragrance Connoisseurs</h2>
            <p>
              Looking for authentic, skin-safe, alcohol-free attars for daily wear, prayer, gifting, or special occasions?
              At <strong>Arees Perfumes</strong>, our retail collection offers individual bottles of pure concentrated perfume oils
              blended by hand with 30 years of perfumery expertise.
            </p>
            <p>
              Unlike standard commercial alcohol sprays that evaporate within an hour, authentic oil-based attars bind close to your skin
              and release rich, complex notes that evolve gently over 8 to 14 hours.
            </p>
          </div>
        </section>

        {/* Popular Retail Categories */}
        <section className="retail-collections">
          <h2>Featured Retail Attar Collections</h2>
          <div className="retail-grid">
            <div className="retail-card">
              <h3>Roll-on Attars (6ml & 8ml)</h3>
              <p>
                Convenient pocket-sized roll-ons featuring our signature <strong>Arees 8ml</strong> and <strong>Dahab 6ml</strong> blends.
                Leak-proof, spill-resistant, and perfect for personal fragrance touch-ups.
              </p>
              <Link to="/categories/1" className="retail-link">Browse Roll-on Attars →</Link>
            </div>

            <div className="retail-card">
              <h3>Pure Concentrated Fragrance Oils</h3>
              <p>
                Over 290 authentic scents including White Oudh, Black Musk, Sandaliya, Rose, and Kuwaiti blends
                offered in precise individual bottle quantities.
              </p>
              <Link to="/categories/10" className="retail-link">Explore Fragrance Oils →</Link>
            </div>

            <div className="retail-card">
              <h3>Dahab Signature Attars</h3>
              <p>
                Golden floral and sweet amber compositions crafted in small batches. Known for smooth sweetness and enduring sillage.
              </p>
              <Link to="/brand/dahab" className="retail-link">Explore Dahab Collection →</Link>
            </div>

            <div className="retail-card">
              <h3>Arees Signature Attars</h3>
              <p>
                Bold, smoky, and resinous attars featuring pure oud and warm woods for distinguished, confident presence.
              </p>
              <Link to="/brand/arees" className="retail-link">Explore Arees Collection →</Link>
            </div>
          </div>
        </section>

        {/* How Retail Ordering Works */}
        <section className="retail-guide">
          <h2>Simple, Transparent Order-Request Process</h2>
          <div className="retail-steps">
            <div className="retail-step">
              <span className="step-badge">Step 1</span>
              <h4>Select Your Fragrance</h4>
              <p>Browse our catalog of 370+ perfumes and pick your preferred size or variant.</p>
            </div>
            <div className="retail-step">
              <span className="step-badge">Step 2</span>
              <h4>Add to Bag & Review</h4>
              <p>Review items in your bag. Direct wholesale bulk savings trigger automatically on eligible quantities.</p>
            </div>
            <div className="retail-step">
              <span className="step-badge">Step 3</span>
              <h4>Submit Details</h4>
              <p>Provide delivery name, address, and phone number on our streamlined contact form.</p>
            </div>
            <div className="retail-step">
              <span className="step-badge">Step 4</span>
              <h4>Invoice & Fast Dispatch</h4>
              <p>Receive your order number and downloadable PDF invoice. Our Chennai team confirms and dispatches promptly.</p>
            </div>
          </div>
        </section>

        {/* Retail Assurance */}
        <section className="retail-values">
          <div className="retail-value-item">
            <h3>100% Alcohol-Free</h3>
            <p>Non-irritating, pure botanical and resin oils that are safe on skin and fabric.</p>
          </div>
          <div className="retail-value-item">
            <h3>Direct Atelier Pricing</h3>
            <p>Fair, transparent prices straight from our Chennai perfumery boutique without distributor markups.</p>
          </div>
          <div className="retail-value-item">
            <h3>All-India Delivery</h3>
            <p>Carefully cushioned, leak-proof packaging delivered securely across South India and pan-India.</p>
          </div>
        </section>

        {/* Call to action */}
        <section className="retail-cta">
          <h2>Ready to Find Your Signature Attar?</h2>
          <p>Browse our live inventory or speak directly with our fragrance specialists in Chennai.</p>
          <div className="retail-cta-buttons">
            <Link to="/shop" className="btn btn-primary">Browse All Retail Attars</Link>
            <Link to="/contact" className="btn btn-secondary">Contact Our Team</Link>
          </div>
        </section>
      </div>
    </div>
  )
}
