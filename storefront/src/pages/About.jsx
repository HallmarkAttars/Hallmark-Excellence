import { Link } from 'react-router-dom'
import { ABOUT } from '../data/content'
import { IMAGES } from '../config/assets'
import SEO from '../components/seo/SEO'
import { buildBreadcrumbsSchema, buildFAQSchema } from '../utils/seo'
import './About.css'

export default function About() {
  const aboutSchema = [
    buildBreadcrumbsSchema([
      { name: 'Home', path: '/' },
      { name: 'About Us', path: '/about' },
    ]),
    buildFAQSchema(ABOUT.faqs),
  ]

  return (
    <div>
      <SEO
        title="About Arees Perfumes | Chennai Fragrance House"
        description="Learn about Arees Perfumes, a Chennai fragrance house under Hallmark of Excellence, offering alcohol-free attars, oud, bakhoor and perfume oils for retail and wholesale."
        canonical="/about"
        schema={aboutSchema}
      />
      <div className="page-heading">
        <p className="eyebrow">{ABOUT.eyebrow}</p>
        <h1>{ABOUT.title}</h1>
      </div>

      <div className="container about-content">
        <section className="about-block">
          <div
            className="about-image"
            style={{ backgroundImage: `url(${IMAGES.aboutImage})` }}
            role="img"
            aria-label="Arees Perfumes atelier"
          />
          <div className="about-text">
            <h2>{ABOUT.story.heading}</h2>
            {ABOUT.story.paragraphs.map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </div>
        </section>

        <section className="about-hikma">
          <h2>{ABOUT.hikma.heading}</h2>
          {ABOUT.hikma.paragraphs.map((p, i) => (
            <p key={i}>{p}</p>
          ))}
          <p className="about-hikma-link">
            <Link to="/wholesale">Learn more about our wholesale and export supply →</Link>
          </p>
        </section>

        <section className="about-values">
          {ABOUT.values.map((value) => (
            <div key={value.title}>
              <h3>{value.title}</h3>
              <p>{value.description}</p>
            </div>
          ))}
        </section>

        <section className="about-faq" aria-labelledby="hikma-faq-heading">
          <h2 id="hikma-faq-heading">Hikma Perfumes FAQs</h2>
          <div className="about-faq-grid">
            {ABOUT.faqs.map((faq) => (
              <article key={faq.question} className="about-faq-item">
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
