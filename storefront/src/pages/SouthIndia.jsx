import { Link } from 'react-router-dom'
import SEO from '../components/seo/SEO'
import { buildBreadcrumbsSchema, buildLocalBusinessSchema } from '../utils/seo'
import { BUSINESS } from '../data/content'
import './SouthIndia.css'

export default function SouthIndia() {
  const breadcrumbs = [
    { name: 'Home', path: '/' },
    { name: 'South India Store', path: '/attar-perfume-shop-south-india' },
  ]

  const schemas = [
    buildBreadcrumbsSchema(breadcrumbs),
    buildLocalBusinessSchema(),
  ]

  return (
    <div className="south-india-page">
      <SEO
        title="Attar & Perfume Shop in South India | Chennai Boutique | Arees Perfumes"
        description="Visit Arees Perfumes in Mannadi, Chennai — a trusted attar and perfume destination in South India. Discover authentic alcohol-free attars, oud, and perfumes with fast delivery across South India."
        canonical="/attar-perfume-shop-south-india"
        schema={schemas}
      />

      <header className="page-heading">
        <p className="eyebrow">Regional Boutique & Supply Hub</p>
        <h1>Attar and Perfume Destination in South India</h1>
        <p>Three decades of authentic fragrance craftsmanship rooted in Mannadi, Chennai — serving perfume lovers and businesses across South India.</p>
      </header>

      <div className="container south-india-container">
        {/* Heritage Section */}
        <section className="si-heritage">
          <div className="si-heritage-card">
            <h2>Trusted Attar and Perfume Tradition in Chennai & South India</h2>
            <p>
              Located in Chennai's renowned trading enclave at Moore Street, Mannadi, <strong>Arees Perfumes</strong> has spent over
              30 years supplying high-grade concentrated perfume oils, authentic attars, and bespoke packaging to fragrance enthusiasts across
              Tamil Nadu, Kerala, Karnataka, Andhra Pradesh, and Telangana.
            </p>
            <p>
              South India has a deep, cherished heritage of natural scent appreciation — from traditional Marikolundu and Sandalwood to precious
              Arabian Oudh, Amber, and floral absolutes. We honour this rich history by formulating alcohol-free perfume oils using pure distillation
              techniques and small-batch artisan blending.
            </p>
          </div>
        </section>

        {/* Why choose Arees in South India */}
        <section className="si-reasons">
          <h2>Why Fragrance Buyers in South India Choose Arees</h2>
          <div className="si-reasons-grid">
            <div className="si-card">
              <h3>Authentic, 100% Alcohol-Free Oils</h3>
              <p>
                Every attar in our boutique is free from synthetic dilution, industrial alcohol, and harsh fixatives.
                Gentle on skin, non-staining on fabrics, and suitable for religious occasions.
              </p>
            </div>

            <div className="si-card">
              <h3>Both Retail & Wholesale Under One Roof</h3>
              <p>
                Whether you need a single 6ml roll-on for personal daily wear or hundreds of wholesale bottles for a perfume store
                in Bengaluru, Hyderabad, Kochi, or Madurai, we provide direct pricing without intermediary margins.
              </p>
            </div>

            <div className="si-card">
              <h3>Fast, Secure South India Delivery</h3>
              <p>
                Strategically positioned in central Chennai with daily dispatches through premier logistics partners, guaranteeing
                prompt transit across all South Indian districts and metropolitan centres.
              </p>
            </div>

            <div className="si-card">
              <h3>Extensive 370+ Fragrance Collection</h3>
              <p>
                From classic Arabian Oudh and Black Musk to traditional Indian florals, fresh aquatic notes, and luxury bakhoor resins —
                explore one of South India's most comprehensive attar selections.
              </p>
            </div>
          </div>
        </section>

        {/* Physical Store & Visiting Details */}
        <section className="si-store-details">
          <h2>Visit Our Chennai Boutique</h2>
          <div className="si-details-box">
            <div className="si-detail-col">
              <h4>Boutique Address</h4>
              <p>{BUSINESS.address}</p>
              <p className="si-landmark">Landmark: Opposite Kalaiyam School, Mannadi, George Town</p>
              <a
                href={BUSINESS.mapDirectionsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="si-map-link"
              >
                Get Directions on Google Maps →
              </a>
            </div>

            <div className="si-detail-col">
              <h4>Visiting Hours</h4>
              <p><strong>Monday – Saturday:</strong> 10:00 AM – 9:00 PM</p>
              <p><strong>Sunday:</strong> Closed / Prior appointment</p>

              <h4 style={{ marginTop: '16px' }}>Phone & WhatsApp</h4>
              <p><a href={`tel:${BUSINESS.phoneTel}`}>{BUSINESS.phoneDisplay}</a></p>
              <p><a href={`mailto:${BUSINESS.email}`}>{BUSINESS.email}</a></p>
            </div>
          </div>
        </section>

        {/* Regional Coverage */}
        <section className="si-coverage">
          <h2>South India Delivery & Service Coverage</h2>
          <p className="si-coverage-sub">
            We deliver carefully packaged retail orders and bulk wholesale consignments to all major South Indian regions:
          </p>
          <div className="si-regions-grid">
            <div className="si-region">
              <h4>Tamil Nadu</h4>
              <p>Chennai, Coimbatore, Madurai, Tiruchirappalli, Salem, Tirunelveli, Vellore, and all districts.</p>
            </div>
            <div className="si-region">
              <h4>Kerala</h4>
              <p>Kochi, Thiruvananthapuram, Kozhikode, Thrissur, Malappuram, Kannur, and statewide express delivery.</p>
            </div>
            <div className="si-region">
              <h4>Karnataka</h4>
              <p>Bengaluru, Mysuru, Mangaluru, Hubballi, Belagavi, and regional commercial centres.</p>
            </div>
            <div className="si-region">
              <h4>Andhra Pradesh & Telangana</h4>
              <p>Hyderabad, Visakhapatnam, Vijayawada, Guntur, Warangal, Tirupati, and Rayalaseema districts.</p>
            </div>
          </div>
        </section>

        {/* Next step buttons */}
        <section className="si-cta">
          <h2>Explore Our South India Collections Online</h2>
          <p>Order directly for home delivery or coordinate bulk supply with our Chennai desk.</p>
          <div className="si-cta-buttons">
            <Link to="/shop" className="btn btn-primary">Browse All Attars & Perfumes</Link>
            <Link to="/wholesale" className="btn btn-secondary">Wholesale Attars Supply</Link>
            <Link to="/contact" className="btn btn-secondary">Contact Us</Link>
          </div>
        </section>
      </div>
    </div>
  )
}
