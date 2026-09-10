import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import './FilterSortControl.css'

// ONE client-side sort set shared by every collection page (Category, Brand,
// Shop) — no backend, no extra reads. 'default' = Featured = the existing
// product order stays untouched.
export const SORT_OPTIONS = [
  { value: 'default', label: 'Featured' },
  { value: 'newest', label: 'Newest' },
  { value: 'price-asc', label: 'Price Low to High' },
  { value: 'price-desc', label: 'Price High to Low' },
  { value: 'name-asc', label: 'A-Z' },
  { value: 'name-desc', label: 'Z-A' },
]

const Chevron = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <polyline points="6 9 12 15 18 9" />
  </svg>
)

// Sliders icon — the combined FILTER & SORT control (mobile + desktop).
const SlidersIcon = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3" />
    <path d="M1 14h6M9 8h6M17 16h6" />
  </svg>
)

// ---------------------------------------------------------------------------
// <FilterSortControl> — ONE premium "FILTER & SORT" experience on every
// collection page (Categories + Brands + Shop).
// Single source of truth:
//   • mobile (<768px): full-width button → bottom sheet
//   • desktop (≥768px): compact button → popover panel anchored under it
// ---------------------------------------------------------------------------
export default function FilterSortControl({
  filterGroups,
  filterLabel = 'Category',
  filterOptions = [],
  allLabel = `All ${filterLabel}s`,
  filterValue = 'all',
  onFilterChange = () => {},
  sortValue = 'default',
  onSortChange = () => {},
  activeCount = 0,
  btnAriaLabel = 'Filter & Sort',
  dialogAriaLabel = 'Filter and sort',
}) {
  const [panelOpen, setPanelOpen] = useState(false) // desktop popover
  const [sheetOpen, setSheetOpen] = useState(false) // mobile bottom sheet
  const sheetRef = useRef(null)
  const panelRef = useRef(null)
  const combinedBtnRef = useRef(null)

  const groups =
    filterGroups && filterGroups.length > 0
      ? filterGroups
      : filterOptions.length > 0
      ? [
          {
            label: filterLabel,
            options: filterOptions,
            allLabel: allLabel || `All ${filterLabel}s`,
            value: filterValue,
            onChange: onFilterChange,
          },
        ]
      : []

  // Close popover / bottom sheet on Escape
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') {
        setPanelOpen(false)
        setSheetOpen(false)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // Lock body scroll while the mobile bottom sheet is open
  useEffect(() => {
    document.body.style.overflow = sheetOpen ? 'hidden' : ''
    document.body.style.overscrollBehavior = sheetOpen ? 'contain' : ''
    if (!sheetOpen || typeof window.matchMedia !== 'function') return undefined
    const mq = window.matchMedia('(min-width: 768px)')
    const onChange = (e) => {
      if (e.matches) setSheetOpen(false)
    }
    mq.addEventListener('change', onChange)
    return () => {
      document.body.style.overflow = ''
      document.body.style.overscrollBehavior = ''
      mq.removeEventListener('change', onChange)
    }
  }, [sheetOpen])

  // Close the desktop popover if the viewport shrinks to mobile (<768px)
  useEffect(() => {
    if (!panelOpen || typeof window.matchMedia !== 'function') return undefined
    const mq = window.matchMedia('(max-width: 767px)')
    const onChange = (e) => {
      if (e.matches) setPanelOpen(false)
    }
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [panelOpen])

  // Focus management
  useEffect(() => {
    if (sheetOpen && sheetRef.current) {
      sheetRef.current.querySelector('.filter-sort-sheet-close')?.focus()
    } else if (panelOpen && panelRef.current) {
      panelRef.current.querySelector('.filter-sort-panel-close')?.focus()
    } else if (combinedBtnRef.current) {
      combinedBtnRef.current.focus()
    }
  }, [sheetOpen, panelOpen])

  // ONE entry point: desktop opens the popover, mobile opens the bottom sheet.
  const openFilter = () => {
    if (typeof window.matchMedia === 'function' && !window.matchMedia('(min-width: 768px)').matches) {
      setSheetOpen(true)
    } else {
      setPanelOpen(true)
    }
  }
  const closeAll = () => {
    setPanelOpen(false)
    setSheetOpen(false)
  }

  const toggleSort = (value) => onSortChange(value)

  const hasFilterOptions = groups.some((g) => g.options && g.options.length > 0)

  return (
    <div className="filter-sort-control">
      <button
        type="button"
        ref={combinedBtnRef}
        className="filter-sort-combined-btn"
        onClick={openFilter}
        aria-haspopup="dialog"
        aria-expanded={sheetOpen || panelOpen}
        aria-label={btnAriaLabel}
      >
        <SlidersIcon />
        <span className="filter-sort-combined-label">
          Filter &amp; Sort
          {activeCount > 0 && (
            <span className="filter-sort-combined-badge" aria-label={`${activeCount} active`}>
              {activeCount}
            </span>
          )}
        </span>
        <Chevron />
      </button>

      {/* Desktop popover — compact panel under the combined control */}
      {panelOpen && (
        <>
          <div className="filter-sort-panel-backdrop" onClick={closeAll} />
          <div
            ref={panelRef}
            className="filter-sort-panel"
            role="dialog"
            aria-modal="true"
            aria-label={dialogAriaLabel}
          >
            <div className="filter-sort-panel-header">
              <h2>Filter &amp; Sort</h2>
              <button
                type="button"
                className="filter-sort-panel-close"
                onClick={closeAll}
                aria-label="Close filter and sort"
              >
                ✕
              </button>
            </div>

            <div className="filter-sort-panel-body">
              <section className="filter-sort-panel-section">
                <h3>Filter</h3>
                {hasFilterOptions ? (
                  groups.map((g, idx) => (
                    <div key={g.label || idx} className="filter-sort-panel-group">
                      <p className="filter-sort-panel-group-title">{g.label}</p>
                      <div className="filter-sort-panel-options">
                        <button
                          type="button"
                          className={g.value === 'all' ? 'is-active' : ''}
                          onClick={() => g.onChange('all')}
                        >
                          {g.allLabel || `All ${g.label}s`}
                        </button>
                        {g.options.map((o) => (
                          <button
                            type="button"
                            key={o.id}
                            className={g.value === o.id ? 'is-active' : ''}
                            onClick={() => g.onChange(o.id)}
                          >
                            {o.name}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="filter-sort-panel-note">No {filterLabel.toLowerCase()} filters for this collection.</p>
                )}
              </section>

              <section className="filter-sort-panel-section">
                <h3>Sort By</h3>
                <div className="filter-sort-panel-options">
                  {SORT_OPTIONS.map((opt) => (
                    <button
                      type="button"
                      key={opt.value}
                      className={sortValue === opt.value ? 'is-active' : ''}
                      onClick={() => toggleSort(opt.value)}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </section>
            </div>

            <div className="filter-sort-panel-footer">
              <button type="button" className="filter-sort-panel-apply" onClick={closeAll}>
                Apply Filters
              </button>
            </div>
          </div>
        </>
      )}

      {/* Mobile bottom sheet */}
      {createPortal(
        <>
          <div
            ref={sheetRef}
            className={`filter-sort-sheet${sheetOpen ? ' is-open' : ''}`}
            role="dialog"
            aria-modal="true"
            aria-hidden={!sheetOpen}
            aria-label={dialogAriaLabel}
          >
            <div className="filter-sort-sheet-header">
              <h2>Filter &amp; Sort</h2>
              <button
                type="button"
                className="filter-sort-sheet-close"
                onClick={() => setSheetOpen(false)}
                aria-label="Close filter and sort"
              >
                ✕
              </button>
            </div>

            <div className="filter-sort-sheet-body">
              <section className="filter-sort-sheet-section">
                <h3>Filter</h3>
                {hasFilterOptions ? (
                  groups.map((g, idx) => (
                    <div key={g.label || idx} className="filter-sort-sheet-group">
                      <p className="filter-sort-sheet-group-title">{g.label}</p>
                      <div className="filter-sort-sheet-options">
                        <button
                          type="button"
                          className={g.value === 'all' ? 'is-active' : ''}
                          onClick={() => g.onChange('all')}
                        >
                          {g.allLabel || `All ${g.label}s`}
                        </button>
                        {g.options.map((o) => (
                          <button
                            type="button"
                            key={o.id}
                            className={g.value === o.id ? 'is-active' : ''}
                            onClick={() => g.onChange(o.id)}
                          >
                            {o.name}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="filter-sort-sheet-note">No {filterLabel.toLowerCase()} filters for this collection.</p>
                )}
              </section>

              <section className="filter-sort-sheet-section">
                <h3>Sort By</h3>
                <div className="filter-sort-sheet-options">
                  {SORT_OPTIONS.map((opt) => (
                    <button
                      type="button"
                      key={opt.value}
                      className={sortValue === opt.value ? 'is-active' : ''}
                      onClick={() => toggleSort(opt.value)}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </section>
            </div>

            <div className="filter-sort-sheet-footer">
              <button type="button" className="filter-sort-sheet-apply" onClick={() => setSheetOpen(false)}>
                Apply Filters
              </button>
            </div>
          </div>
          {sheetOpen && <div className="filter-sort-sheet-backdrop" onClick={() => setSheetOpen(false)} />}
        </>,
        document.body
      )}
    </div>
  )
}
