import { ABOUT } from '../data/content'
import { IMAGES } from '../config/assets'
import SEO from '../components/seo/SEO'
import { buildBreadcrumbsSchema } from '../utils/seo'
import './About.css'

export default function About() {
  return (
    <div>
      <SEO
        title="About Arees Perfumes | Hallmark of Excellence"
        description="With 30 years of perfumery experience, Arees Perfumes offers authentic attars, oud oils, and fine fragrances crafted with excellence in Chennai."
        canonical="/about"
        schema={buildBreadcrumbsSchema([
          { name: 'Home', path: '/' },
          { name: 'About Us', path: '/about' },
        ])}
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
            aria-label="Arees and Dahab atelier"
          />
          <div className="about-text">
            <h2>{ABOUT.story.heading}</h2>
            {ABOUT.story.paragraphs.map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </div>
        </section>

        <section className="about-values">
          {ABOUT.values.map((value) => (
            <div key={value.title}>
              <h3>{value.title}</h3>
              <p>{value.description}</p>
            </div>
          ))}
        </section>
      </div>
    </div>
  )
}
