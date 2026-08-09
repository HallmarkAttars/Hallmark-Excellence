import SkeletonProductCard from './SkeletonProductCard'

// A loading grid that renders N SkeletonProductCard instances inside the
// SAME `.grid-products` container the real ProductGrid uses, so the skeleton
// inherits the exact responsive columns/gaps/breakpoints (2/3/4/5-up) and
// lines up perfectly with real cards — no layout shift when data arrives.
export default function SkeletonProductGrid({ count = 8 }) {
  return (
    <div className="grid-products" style={{ pointerEvents: 'none' }} aria-hidden="true">
      {Array.from({ length: count }, (_, i) => (
        <SkeletonProductCard key={i} />
      ))}
    </div>
  )
}
