import SEO from '../components/seo/SEO'
import { LEGAL_PAGES } from '../data/legal'
import { buildBreadcrumbsSchema } from '../utils/seo'
import './LegalPage.css'

export default function LegalPage({ slug }) {
  const page = LEGAL_PAGES[slug]
  if (!page) return null

  return (
    <div className="legal-page">
      <SEO
        title={page.metaTitle}
        description={page.metaDescription}
        canonical={`/${slug}`}
        robots="noindex,nofollow"
        schema={buildBreadcrumbsSchema([
          { name: 'Home', path: '/' },
          { name: page.title, path: `/${slug}` },
        ])}
      />
      <div className="container legal-page-inner">
        <div className="page-heading">
          <p className="eyebrow">Legal</p>
          <h1>{page.title}</h1>
        </div>
        <div className="legal-content">
          <p className="legal-intro">{page.intro}</p>
          {page.sections.map((section) => (
            <section key={section.heading} className="legal-section">
              <h2>{section.heading}</h2>
              {section.paragraphs.map((paragraph, index) => (
                <p key={index}>{paragraph}</p>
              ))}
              {section.points && (
                <ul>
                  {section.points.map((point, index) => (
                    <li key={index}>{point}</li>
                  ))}
                </ul>
              )}
            </section>
          ))}
          <p className="legal-updated">Last updated: {page.updated}</p>
          <p className="legal-contact">
            {page.entity && (
              <>
                Legal entity: {page.entity}
                <br />
              </>
            )}
            Arees Perfumes is the retail fragrance identity of Hikma Exports.
          </p>
        </div>
      </div>
    </div>
  )
}
