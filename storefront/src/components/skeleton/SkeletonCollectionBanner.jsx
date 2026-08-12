import './SkeletonBase.css'
import './SkeletonCollectionBanner.css'

// Loading placeholder mirroring the homepage "Our Brands" section:
// a section heading, two large featured full-image cards and three
// standard full-image cards. Mirrors the `.brands-showcase` grids so
// the skeleton lines up with the real cards — no layout shift.
export default function SkeletonCollectionBanner() {
  return (
    <section className="skeleton-brands-section" aria-hidden="true" style={{ pointerEvents: 'none' }}>
      <div className="container">
        <div className="skeleton-brands-head">
          <span className="skeleton-block" />
        </div>
        <div className="skeleton-showcase skeleton-showcase--featured">
          {Array.from({ length: 2 }, (_, i) => (
            <div className="skeleton-showcase-card" key={i}>
              <div className="skeleton-showcase-media" />
            </div>
          ))}
        </div>
        <div className="skeleton-showcase skeleton-showcase--standard">
          {Array.from({ length: 3 }, (_, i) => (
            <div className="skeleton-showcase-card" key={i}>
              <div className="skeleton-showcase-media" />
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
