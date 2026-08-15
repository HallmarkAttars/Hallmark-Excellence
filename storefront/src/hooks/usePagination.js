import { useEffect, useMemo, useRef } from 'react'
import { paginate, pageFromSearch, setPageParam } from '../utils/pagination'

// ---------------------------------------------------------------------------
// usePagination(searchParams, setSearchParams, totalItems, options)
//
// ONE shared client-side pagination hook used by every collection page
// (Shop / Category / Brand). Owns:
//
//   1. URL state      — reads ?page=N from the URL, writes it back via
//                       push navigation (browser back/forward walks pages
//                       normally; every other query parameter is preserved).
//   2. Clamping       — an out-of-range ?page= (e.g. ?page=999 with 2 pages)
//                       never renders an empty page: it clamps to the last
//                       valid page AND rewrites the URL (replace, so the
//                       bogus page never pollutes history). Skipped while
//                       loading so a deep link like ?page=2 is not rewritten
//                       before its data arrives.
//   3. Page reset     — resetToFirstPage() rewrites the URL to page 1
//                       (replace) when a filter/sort/search change shrinks
//                       the result set. Replaces, because a filter change is
//                       not a navigation — page clicks are the only push.
//   4. Scroll anchor  — when the page changes (pagination click or browser
//                       back/forward) the viewport moves to the top of the
//                       product listing section, never the bottom of the
//                       previous page. Skipped on first mount.
//
// Returns: { items, total, totalPages, currentPage, goToPage, resetToFirstPage }
// ---------------------------------------------------------------------------
export default function usePagination(
  searchParams,
  setSearchParams,
  totalItems,
  { scrollAnchorId = null, loading = false, error = null } = {}
) {
  const requestedPage = pageFromSearch(searchParams.toString())

  const { items, total, totalPages, currentPage } = useMemo(
    () => paginate(totalItems, requestedPage),
    [totalItems, requestedPage]
  )

  // Navigate to a specific page — push, so browser history works
  // (page 1 → 2 → 3, back → 2 → 1). All other query parameters preserved.
  // Clicking the already-current page is a no-op (no duplicate history entry).
  const goToPage = (page) => {
    if (page === currentPage) return
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      next.set('page', String(page))
      return next
    })
  }

  // A filter/sort/search change resets the listing to page 1. Replace (not
  // push): the filter change itself is not a navigation, so intermediate
  // page states must not accumulate in history.
  const resetToFirstPage = () => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      next.set('page', '1')
      return next
    }, { replace: true })
  }

  // Normalize an out-of-range ?page= to the last valid page (replace).
  useEffect(() => {
    if (loading || error) return
    if (totalPages >= 1 && requestedPage !== currentPage) {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev)
        next.set('page', String(currentPage))
        return next
      }, { replace: true })
    }
  }, [loading, error, requestedPage, currentPage, totalPages, setSearchParams])

  // Scroll to the top of the product listing when the page changes.
  // Skipped on first mount — a fresh visit already starts at the top.
  const prevPageRef = useRef(requestedPage)
  useEffect(() => {
    if (prevPageRef.current !== requestedPage) {
      prevPageRef.current = requestedPage
      if (scrollAnchorId) {
        // `?.` on the method too — jsdom and very old browsers have no
        // scrollIntoView; the scroll is a nicety, never a crash.
        document.getElementById(scrollAnchorId)?.scrollIntoView?.({
          behavior: 'smooth',
          block: 'start',
        })
      }
    }
  }, [requestedPage, scrollAnchorId])

  return { items, total, totalPages, currentPage, goToPage, resetToFirstPage }
}
