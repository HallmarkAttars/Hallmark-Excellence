import './SkeletonBase.css'
import './SkeletonSocialStrip.css'

// Loading placeholder mirroring the homepage "Follow Our Journey" SocialStrip.
// Reuses the shared shimmer/sweep system from SkeletonBase.css — no new
// animation keyframes. Mirrors the real `.social-section` structure: centered
// heading, a row of square photo tiles (horizontal scroll on mobile, 6-column
// grid on desktop), and a CTA. Lines up with the real strip with no layout
// shift when data arrives.
export default function SkeletonSocialStrip({ count = 6 }) {
  return (
    <section className="skeleton-social-section" aria-hidden="true" style={{ pointerEvents: 'none' }}>
      <div className="container">
        <div className="skeleton-social-head">
          <span className="skeleton-block skeleton-social-title" />
          <span className="skeleton-block skeleton-social-sub" />
        </div>
        <div className="skeleton-social-grid">
          {Array.from({ length: count }, (_, i) => (
            <div className="skeleton-social-tile" key={i} />
          ))}
        </div>
        <div className="skeleton-social-cta">
          <span className="skeleton-block" />
        </div>
      </div>
    </section>
  )
}

