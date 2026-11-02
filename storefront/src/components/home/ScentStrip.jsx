// Homepage scent-family discovery strip — P2 (approved batch).
// Links every family straight into the Shop page's family filter
// (/shop?family=…), where classification comes from the products' own copy
// (see data/fragranceFamilies.js). Text-only links: no images, no data, no
// LCP impact — the strip mounts in the DeferredSection pipeline.
import { Link } from 'react-router-dom'
import { FAMILY_FILTERS } from '../../data/fragranceFamilies'
import './ScentStrip.css'

export default function ScentStrip() {
  return (
    <section className="section scent-strip" aria-labelledby="scent-strip-title">
      <div className="container">
        <div className="section-head">
          <p className="scent-strip-eyebrow">Discover Your Fragrance</p>
          <h2 id="scent-strip-title" className="section-title-upper">
            Explore by Fragrance Family
          </h2>
          <p className="section-subtitle">
            Not sure where to begin? Start with the scent character we are
            known for — rose, musk, oud and more.
          </p>
        </div>
        <nav className="scent-strip-chips" aria-label="Shop by fragrance family">
          <Link to="/shop" className="scent-chip scent-chip--all">
            All Fragrances
          </Link>
          {FAMILY_FILTERS.map((family) => (
            <Link
              key={family.id}
              to={`/shop?family=${family.id}`}
              className="scent-chip"
            >
              {family.name}
            </Link>
          ))}
        </nav>
      </div>
    </section>
  )
}
