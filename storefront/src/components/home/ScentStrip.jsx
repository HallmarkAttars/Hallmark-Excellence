// Homepage scent-family discovery strip — P2 (approved batch).
// Links every family straight into the Shop page's family filter
// (/shop?family=…), where classification comes from the products' own copy
// (see data/fragranceFamilies.js). Text-only links: no images, no data, no
// LCP impact — the strip mounts in the DeferredSection pipeline.
//
// The chip matching the ?family= param renders with an active state, and
// "All Fragrances" is active when no param is set — so the selection is
// always visible, never a mystery.
import { Link, useSearchParams } from 'react-router-dom'
import { FAMILY_FILTERS } from '../../data/fragranceFamilies'
import './ScentStrip.css'

export default function ScentStrip() {
  const [searchParams] = useSearchParams()
  const activeFamily = searchParams.get('family')

  return (
    <section className="section scent-strip" aria-labelledby="scent-strip-title">
      <div className="container">
        <div className="section-head scent-strip-head">
          <p className="scent-strip-eyebrow">Discover Your Fragrance</p>
          <h2 id="scent-strip-title" className="section-title-upper">
            Explore by Fragrance Family
          </h2>
        </div>
        <nav className="scent-strip-chips" aria-label="Shop by fragrance family">
          <Link
            to="/shop"
            className={`scent-chip scent-chip--all${!activeFamily ? ' scent-chip--active' : ''}`}
          >
            All Fragrances
          </Link>
          {FAMILY_FILTERS.map((family) => (
            <Link
              key={family.id}
              to={`/shop?family=${family.id}`}
              className={`scent-chip${activeFamily === family.id ? ' scent-chip--active' : ''}`}
            >
              {family.name}
            </Link>
          ))}
        </nav>
      </div>
    </section>
  )
}
