import './About.css'

export default function About() {
  return (
    <div>
      <div className="page-heading">
        <p className="eyebrow">Our Story</p>
        <h1>About Arees &amp; Dahab</h1>
      </div>

      <div className="container about-content">
        <section className="about-block">
          <div className="about-image" style={{ backgroundImage: 'url(https://images.unsplash.com/photo-1594736797933-d0f06ba09946?w=900&q=70)' }} />
          <div className="about-text">
            <h2>A Craft, Not a Category</h2>
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
        </section>

        <section className="about-values">
          <div>
            <h3>Small Batch</h3>
            <p>Every attar is blended in limited runs so quality never scales down.</p>
          </div>
          <div>
            <h3>Alcohol-Free</h3>
            <p>Pure oil concentrates that sit closer to skin and last far longer.</p>
          </div>
          <div>
            <h3>Two Houses, One Standard</h3>
            <p>Arees leans bold and smoky; Dahab leans golden and floral. Both are held to the same bar.</p>
          </div>
        </section>
      </div>
    </div>
  )
}
