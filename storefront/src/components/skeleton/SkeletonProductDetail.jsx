import './SkeletonBase.css'

// Loading placeholder mirroring the ProductDetail layout: a square gallery
// image block on one side, and a right info column with a title, large price,
// description text lines, and an action button block. Uses the same 1-col /
// 2-col grid as .product-detail so there's no shift when the real product
// replaces it.
export default function SkeletonProductDetail() {
  return (
    <div className="container skeleton-detail" aria-hidden="true">
      <div className="skeleton-detail-media" />

      <div className="skeleton-detail-info">
        <span className="skeleton-block skeleton-detail-title" />
        <span className="skeleton-block skeleton-detail-price" />
        <span className="skeleton-block skeleton-detail-text" />
        <span className="skeleton-block skeleton-detail-text short" />
        <span className="skeleton-block skeleton-detail-text short" />
        <span className="skeleton-block skeleton-detail-btn" />
      </div>
    </div>
  )
}
