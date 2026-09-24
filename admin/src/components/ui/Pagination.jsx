import React from 'react'
import './Pagination.css'

function getPageNumbers(currentPage, totalPages) {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1)
  }

  // Near the start
  if (currentPage <= 4) {
    return [1, 2, 3, 4, 5, '...', totalPages]
  }

  // Near the end
  if (currentPage >= totalPages - 3) {
    return [1, '...', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages]
  }

  // Middle
  return [1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages]
}

export default function Pagination({
  currentPage = 1,
  totalPages = 1,
  pageSize = 25,
  totalItems = 0,
  onPageChange,
  onPageSizeChange,
  itemLabel = 'items',
}) {
  if (totalItems <= 0) return null

  const startItem = (currentPage - 1) * pageSize + 1
  const endItem = Math.min(currentPage * pageSize, totalItems)
  const pageNumbers = getPageNumbers(currentPage, totalPages)

  const handlePrev = () => {
    if (currentPage > 1 && onPageChange) {
      onPageChange(currentPage - 1)
    }
  }

  const handleNext = () => {
    if (currentPage < totalPages && onPageChange) {
      onPageChange(currentPage + 1)
    }
  }

  return (
    <div className="pagination-bar" role="navigation" aria-label="Pagination Navigation">
      {/* Left: Summary text */}
      <div className="pagination-summary">
        Showing <strong>{startItem}–{endItem}</strong> of <strong>{totalItems}</strong> {itemLabel}
      </div>

      {/* Center: Rows per page selector */}
      <div className="pagination-pagesize">
        <label htmlFor="pagination-rows-select" className="pagination-pagesize-label">
          Rows per page
        </label>
        <select
          id="pagination-rows-select"
          className="pagination-pagesize-select"
          value={pageSize}
          onChange={(e) => onPageSizeChange && onPageSizeChange(Number(e.target.value))}
          aria-label="Select rows per page"
        >
          <option value={25}>25</option>
          <option value={50}>50</option>
          <option value={100}>100</option>
        </select>
      </div>

      {/* Right Desktop: Page buttons with Previous, Numbers, Next */}
      <div className="pagination-controls pagination-desktop">
        <button
          type="button"
          className="pagination-btn pagination-nav-btn"
          onClick={handlePrev}
          disabled={currentPage <= 1}
          aria-label="Previous page"
        >
          Previous
        </button>

        <div className="pagination-numbers">
          {pageNumbers.map((p, idx) => {
            if (p === '...') {
              return (
                <span key={`ellipsis-${idx}`} className="pagination-ellipsis" aria-hidden="true">
                  …
                </span>
              )
            }

            const isCurrent = p === currentPage
            return (
              <button
                key={p}
                type="button"
                className={`pagination-btn pagination-num-btn ${isCurrent ? 'is-active' : ''}`}
                onClick={() => onPageChange && onPageChange(p)}
                aria-current={isCurrent ? 'page' : undefined}
                aria-label={`Page ${p}`}
              >
                {p}
              </button>
            )
          })}
        </div>

        <button
          type="button"
          className="pagination-btn pagination-nav-btn"
          onClick={handleNext}
          disabled={currentPage >= totalPages}
          aria-label="Next page"
        >
          Next
        </button>
      </div>

      {/* Right Mobile: Compact [ ← ] 2 / 8 [ → ] */}
      <div className="pagination-controls pagination-mobile">
        <button
          type="button"
          className="pagination-btn pagination-icon-btn"
          onClick={handlePrev}
          disabled={currentPage <= 1}
          aria-label="Previous page"
        >
          ←
        </button>
        <span className="pagination-mobile-indicator" aria-live="polite">
          {currentPage} / {totalPages}
        </span>
        <button
          type="button"
          className="pagination-btn pagination-icon-btn"
          onClick={handleNext}
          disabled={currentPage >= totalPages}
          aria-label="Next page"
        >
          →
        </button>
      </div>
    </div>
  )
}
