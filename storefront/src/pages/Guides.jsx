import { Link } from 'react-router-dom'
import SEO from '../components/seo/SEO'
import Reveal from '../animations/Reveal'
import { GUIDES } from '../data/guides'
import { buildGuidesIndexSeo } from '../utils/seo'
import './Guides.css'

export default function Guides() {
  const seo = buildGuidesIndexSeo()

  return (
    <div className="guides-page">
      <SEO
        title={seo.title}
        description={seo.description}
        canonical={seo.canonical}
        image={seo.image}
        schema={seo.schema}
      />

      <header className="page-heading guides-heading">
        <p className="eyebrow">Fragrance Guides</p>
        <h1>Attar, Perfume Oil &amp; Wholesale Guides</h1>
        <p>
          Practical, no-nonsense guides to choosing, storing and sourcing attars,
          perfume oils and fragrance packaging from Chennai.
        </p>
      </header>

      <div className="container guides-container">
        <Reveal className="guides-grid stagger-fade">
          {GUIDES.map((guide) => (
            <article key={guide.slug} className="guide-card">
              <div className="guide-card-top">
                <span className="guide-card-category">{guide.category}</span>
                <span className="guide-card-time">{guide.readTime}</span>
              </div>
              <h2>
                <Link to={`/guides/${guide.slug}`}>{guide.title}</Link>
              </h2>
              <p>{guide.excerpt}</p>
              <Link className="guide-card-link" to={`/guides/${guide.slug}`}>
                Read guide <span aria-hidden="true">-&gt;</span>
              </Link>
            </article>
          ))}
        </Reveal>

        <aside className="guides-cta">
          <div>
            <p className="eyebrow">Need help choosing?</p>
            <h2>Talk to the Chennai fragrance team</h2>
            <p>
              Ask about a specific scent family, retail order, wholesale range or
              private-label requirement. The team will help you shortlist the right
              oils and packaging.
            </p>
          </div>
          <div className="guides-cta-actions">
            <Link className="btn btn-primary" to="/contact">Contact us</Link>
            <Link className="btn btn-secondary" to="/wholesale">Wholesale enquiry</Link>
          </div>
        </aside>
      </div>
    </div>
  )
}
