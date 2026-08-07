<<<<<<< HEAD
import { ABOUT } from '../data/content'
import { IMAGES } from '../config/assets'
=======
import Reveal from '../components/ui/Reveal'
>>>>>>> ee0909d (fix the tracker)
import './About.css'

const VALUES = [
  {
    number: '01',
    title: 'Small Batch',
    text: 'Every attar is blended in limited runs so quality never scales down. Each bottle is a curated moment, not a mass product.',
  },
  {
    number: '02',
    title: 'Alcohol-Free',
    text: 'Pure oil concentrates that sit closer to skin and last far longer. The way fragrance was always meant to be worn.',
  },
  {
    number: '03',
    title: 'Two Houses, One Standard',
    text: 'Arees leans bold and smoky; Dahab leans golden and floral. Both are held to the same uncompromising bar of quality.',
  },
]

export default function About() {
  return (
    <div>
<<<<<<< HEAD
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
=======
      {/* ─── Page Hero ─── */}
      <section className="about-hero">
        <div className="container">
          <Reveal animation="fade-up" duration={800}>
            <span className="section-eyebrow" style={{ color: 'var(--luxury-gold-light)' }}>
              Our Story
            </span>
            <h1>About Arees &amp; Dahab</h1>
            <p className="about-hero-desc">
              Two family recipes united under one roof — tradition preserved in every drop.
            </p>
          </Reveal>
        </div>
      </section>

      <div className="container about-content">
        <Reveal animation="fade-up" duration={800}>
          <section className="about-block">
            <div className="about-image-wrap">
              <Reveal animation="scale-in" duration={700}>
                <div className="about-image" style={{ backgroundImage: 'url(https://images.unsplash.com/photo-1594736797933-d0f06ba09946?w=900&q=80)' }} />
              </Reveal>
              <div className="about-image-accent" aria-hidden="true" />
            </div>
            <Reveal animation="fade-up" duration={700} delay={150}>
              <div className="about-text">
                <span className="section-eyebrow" style={{ textAlign: 'left', marginBottom: 20 }}>
                  <span style={{ display: 'block', width: 24, height: 1.5, background: 'var(--luxury-gold)', margin: '12px 0' }} />
                  A Craft, Not a Category
                </span>
                <p>
                  Arees &amp; Dahab began as two family recipes — one built around oud and smoke,
                  the other around rose and gold — before becoming a single house under one roof.
                  Every attar is still blended in small batches, aged in glass, and bottled by hand.
                </p>
                <p>
                  We work only in oil. No alcohol, no shortcuts — just concentrated fragrance the
                  way it was worn long before spray perfume existed.
                </p>
              </div>
            </Reveal>
          </section>
        </Reveal>

        <Reveal animation="fade-up" duration={700}>
          <section className="about-values">
            <div className="about-values-header">
              <span className="section-eyebrow">Our Philosophy</span>
              <h2>The Principles That Guide Us</h2>
            </div>
            <div className="about-values-grid">
              {VALUES.map((item, i) => (
                <Reveal key={item.title} animation="fade-up" duration={500} delay={i * 100}>
                  <div className="about-value-card">
                    <span className="about-value-number">{item.number}</span>
                    <h3>{item.title}</h3>
                    <p>{item.text}</p>
                  </div>
                </Reveal>
              ))}
            </div>
          </section>
        </Reveal>
>>>>>>> ee0909d (fix the tracker)
      </div>
    </div>
  )
}
