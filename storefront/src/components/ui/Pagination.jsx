import { pageItems } from '../../utils/pagination'
import './Pagination.css'

// ---------------------------------------------------------------------------
// <Pagination> — ONE reusable pagination control for every collection page
// (Shop / Category / Brand). Centered below the product grid.
//
// Purely presentational: the parent owns the URL/page state and passes an
// onPageChange callback — no pagination logic lives here, so there is a
// single source of truth (utils/pagination.js) shared by every page.
//
// Layout:  ←  1  2  3  …  20  →
//   • Previous arrow is a circular button (disabled on page 1)
//   • Next arrow is a circular button (disabled on the final page)
//   • Circular page-number buttons; the current page is dark/black, the
//     rest are white with a border (existing storefront design tokens)
//   • '…' for gaps when there are many pages (current page always visible)
//   • Renders nothing when there is only one page (or none)
//
// Props:
//   currentPage    active page (1-based)
//   totalPages     total number of pages — ≤ 1 hides the control entirely
//   onPageChange   (page) => void — called with the target page
//   disabled       optional — disables every control (e.g. while loading)
// ---------------------------------------------------------------------------
export default function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  disabled = false,
}) {
  // No pagination needed for 0 or 1 pages.
  if (totalPages <= 1) return null

  const items = pageItems(currentPage, totalPages)
  const canGoPrev = currentPage > 1
  const canGoNext = currentPage < totalPages

  return (
    <nav className="pagination" aria-label="Pagination">
      {/* Previous arrow — never allows page 0 / negative pages: disabled on
          page 1 and clamped on the way out via clampPage in paginate(). */}
      <button
        type="button"
        className="pagination-btn pagination-prev"
        onClick={() => onPageChange(currentPage - 1)}
        disabled={disabled || !canGoPrev}
        aria-label="Previous page"
      >
        ←
      </button>

      {items.map((item, i) =>
        item === '…' ? (
          <span key={`ellipsis-${i}`} className="pagination-ellipsis" aria-hidden="true">
            …
          </span>
        ) : (
          <button
            type="button"
            key={item}
            className={`pagination-btn${item === currentPage ? ' is-current' : ''}`}
            onClick={() => {
              // Clicking the already-current page is a no-op — it must not
              // push a duplicate history entry.
              if (item !== currentPage) onPageChange(item)
            }}
            disabled={disabled}
            aria-label={`Page ${item}`}
            aria-current={item === currentPage ? 'page' : undefined}
          >
            {item}
          </button>
        )
      )}

      {/* Next arrow — never allows a page past the last one: disabled on the
          final page and clamped on the way out via clampPage in paginate(). */}
      <button
        type="button"
        className="pagination-btn pagination-next"
        onClick={() => onPageChange(currentPage + 1)}
        disabled={disabled || !canGoNext}
        aria-label="Next page"
      >
        →
      </button>
    </nav>
  )
}
