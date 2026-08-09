import './SkeletonBase.css'

// A loading placeholder that mirrors the real ProductCard layout exactly:
// 4:3 image stage, topline (brand + rating), two-line name, meta line,
// price row, and a full-width button. Uses the shared skeleton classes so
// dimensions/gaps match the real card and there's no layout shift when the
// real ProductCard replaces it.
export default function SkeletonProductCard() {
  return (
    <div className="skeleton-card" aria-hidden="true">
      {/* Image stage — 4:3, matching .product-card-media */}
      <div className="skeleton-media" />

      {/* Body — gap/padding mirror .product-card-body */}
      <div className="skeleton-body">
        {/* Topline: brand + rating */}
        <div className="skeleton-topline">
          <span className="skeleton-block skeleton-line-sm skeleton-brand" />
          <span className="skeleton-block skeleton-line-xs skeleton-rating" />
        </div>

        {/* Name — two lines */}
        <span className="skeleton-block skeleton-line-lg" />
        <span className="skeleton-block skeleton-line-md skeleton-name-short" />

        {/* Meta: CATEGORY | SIZE */}
        <span className="skeleton-block skeleton-line-xs skeleton-meta" />

        {/* Price row */}
        <span className="skeleton-block skeleton-price" />

        {/* Button block */}
        <span className="skeleton-btn" />
      </div>
    </div>
  )
}
