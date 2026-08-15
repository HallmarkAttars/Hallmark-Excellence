import './SkeletonBase.css'
import './SkeletonCollectionBanner.css'

// Loading placeholder mirroring the homepage "Our Brands" section:
// a section heading plus five full-image cards in the editorial
// 2 + 3 rhythm (two large, three standard). Mirrors the single
// `.brands-showcase` grid so the skeleton lines up with the real
// cards — no layout shift.
export default function SkeletonCollectionBanner() {
  return (
    <section className="skeleton-brands-section" aria-hidden="true" style={{ pointerEvents: 'none' }}>
      <div className="container">
        <div className="skeleton-brands-head">
          <span className="skeleton-block" />
        </div>
        <div className="skeleton-showcase">
          {Array.from({ length: 5 }, (_, i) => (
            <div
              className={`skeleton-showcase-cell skeleton-showcase-cell--${i < 2 ? 'featured' : 'standard'}`}
              key={i}
            >
              <div className="skeleton-showcase-card">
                <div className="skeleton-showcase-media" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
