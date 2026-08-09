import './SkeletonBase.css'

// Loading placeholder mirroring the category-card layout (4:3 image block +
// name/arrow footer) inside the `.category-scroll` grid — the same container
// the real Categories page uses — so the skeleton lines up exactly (same
// columns, gaps, responsive breakpoints) with no layout shift.
export default function SkeletonCategoryGrid({ count = 8 }) {
  return (
    <div className="category-scroll stagger-fade categories-page" aria-hidden="true" style={{ pointerEvents: 'none' }}>
      {Array.from({ length: count }, (_, i) => (
        <div className="skeleton-category-card" key={i}>
          <div className="skeleton-media" />
          <div className="skeleton-category-footer">
            <span className="skeleton-block skeleton-category-name" />
            <span className="skeleton-block skeleton-category-arrow" />
          </div>
        </div>
      ))}
    </div>
  )
}
