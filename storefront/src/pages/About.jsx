import { ABOUT } from '../data/content'
import { IMAGES } from '../config/assets'
import './About.css'

export default function About() {
  return (
    <div>
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
