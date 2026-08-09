import './SkeletonBase.css'
import './SkeletonCollectionBanner.css'

// Loading placeholder mirroring the "Our Brands" section on the homepage:
// two large featured collection cards + three compact secondary brand cards.
// Reuses the shared shimmer system from SkeletonBase.css — no new animation
// keyframes. Layout mirrors the real `.our-brands-section` (featured grid +
// secondary grid) so the skeleton lines up with the real cards, no shift.
export default function SkeletonCollectionBanner() {
  return (
    <section className="skeleton-brands-section" aria-hidden="true" style={{ pointerEvents: 'none' }}>
      <div className="container">
        <div className="skeleton-brands-head">
          <span className="skeleton-block" />
        </div>
        <div className="skeleton-collections-grid">
          {Array.from({ length: 2 }, (_, i) => (
            <div className="skeleton-collection-banner" key={i}>
              <div className="skeleton-collection-inner">
                <div className="skeleton-collection-media" />
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

        <div className="skeleton-secondary-grid">
          {Array.from({ length: 3 }, (_, i) => (
            <div className="skeleton-brand-card" key={i}>
              <div className="skeleton-brand-media" />
              <div className="skeleton-brand-body">
                <span className="skeleton-block skeleton-brand-eyebrow" />
                <span className="skeleton-block skeleton-brand-title" />
                <span className="skeleton-block skeleton-brand-title short" />
                <span className="skeleton-block skeleton-brand-tagline" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

