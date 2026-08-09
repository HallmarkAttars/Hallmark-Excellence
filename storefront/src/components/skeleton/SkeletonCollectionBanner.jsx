import './SkeletonBase.css'
import './SkeletonCollectionBanner.css'

// Loading placeholder mirroring the "Our Brands" section on the homepage
// (Arees + Dahab collection cards). Reuses the shared shimmer system from
// SkeletonBase.css — no new animation keyframes. Layout mirrors the real
// `.our-brands-section` wrapper with the `.collections-section` two-up grid
// and each `.collection-banner` (image-left / content-right 42/58 split), so
// the skeleton lines up with the real cards with no layout shift.
export default function SkeletonCollectionBanner({ count = 2 }) {
  return (
    <section className="skeleton-brands-section" aria-hidden="true" style={{ pointerEvents: 'none' }}>
      <div className="container">
        <div className="skeleton-brands-head">
          <span className="skeleton-block" />
        </div>
        <div className="skeleton-collections-grid">
          {Array.from({ length: count }, (_, i) => (
            <div className="skeleton-collection-banner" key={i}>
              <div className="skeleton-collection-inner">
                {/* Image — left */}
                <div className="skeleton-collection-media" />
                {/* Content — right */}
                <div className="skeleton-collection-content">
                  <span className="skeleton-block skeleton-collection-eyebrow" />
                  <span className="skeleton-block skeleton-collection-title" />
                  <span className="skeleton-block skeleton-collection-title short" />
                  <span className="skeleton-block skeleton-collection-tagline" />
                  <span className="skeleton-collection-btn" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

