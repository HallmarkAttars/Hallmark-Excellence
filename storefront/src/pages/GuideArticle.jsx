import { Link, useParams } from 'react-router-dom'
import SEO from '../components/seo/SEO'
import { getGuideBySlug } from '../data/guides'
import { buildGuideSeo } from '../utils/seo'
import NotFound from './NotFound'
import './Guides.css'

function formatDate(value) {
  if (!value) return ''
  const date = new Date(`${value}T00:00:00`)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

export default function GuideArticle() {
  const { slug } = useParams()
  const guide = getGuideBySlug(slug)

  if (!guide) return <NotFound />

  const seo = buildGuideSeo(guide)

  return (
    <article className="guide-article">
      <SEO
        title={seo.title}
        description={seo.description}
        canonical={seo.canonical}
        image={seo.image}
        type={seo.type}
        schema={seo.schema}
      />

      <header className="page-heading guide-article-heading">
        <nav className="guide-breadcrumb" aria-label="Breadcrumb">
          <Link to="/">Home</Link>
          <span aria-hidden="true">/</span>
          <Link to="/guides">Guides</Link>
          <span aria-hidden="true">/</span>
          <span aria-current="page">{guide.category}</span>
        </nav>
        <p className="eyebrow">{guide.category}</p>
        <h1>{guide.title}</h1>
        <p>{guide.excerpt}</p>
        <p className="guide-meta">
          {guide.readTime}
          {guide.updated ? ` | Updated ${formatDate(guide.updated)}` : ''}
        </p>
      </header>

      <div className="container guide-article-container">
        <div className="guide-article-body">
          {guide.sections.map((section) => (
            <section key={section.heading}>
              <h2>{section.heading}</h2>
              {section.paragraphs.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </section>
          ))}

          {guide.faqs?.length > 0 && (
            <section className="guide-faqs">
              <h2>Frequently Asked Questions</h2>
              {guide.faqs.map((faq) => (
                <details key={faq.question} className="guide-faq">
                  <summary>{faq.question}</summary>
                  <p>{faq.answer}</p>
                </details>
              ))}
            </section>
          )}
        </div>

        <aside className="guide-sidebar">
          <div className="guide-sidebar-card">
            <p className="eyebrow">Explore</p>
            <h2>Shop the collection</h2>
            <p>
              Browse alcohol-free attars and fragrance oils, or send a wholesale
              enquiry for bulk pricing and packaging.
            </p>
            <Link className="btn btn-primary" to="/shop">Shop attars</Link>
            <Link className="btn btn-secondary" to="/wholesale">Wholesale</Link>
          </div>

          {guide.related?.length > 0 && (
            <nav className="guide-sidebar-card" aria-label="Related guides">
              <p className="eyebrow">Related reading</p>
              <ul className="guide-related-list">
                {guide.related.map((item) => (
                  <li key={item.to}>
                    <Link to={item.to}>{item.label}</Link>
                  </li>
                ))}
              </ul>
            </nav>
          )}
        </aside>
      </div>
    </article>
  )
}
