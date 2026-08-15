// ----------------------------------------------------------------------------
// Shared pagination math for every collection page (Shop / Category / Brand).
//
// The backend catalog endpoints return the FULL dataset — the listing routes
// have no server-side ?page= / ?limit= support — so pagination is done
// client-side: fetch once (shared 60s catalog cache) → search → filter →
// sort → paginate → render. All of the pure math lives here so it is
// unit-tested without a DOM and reused identically by every page (no
// duplicated logic across Shop / Category / Brand).
// ----------------------------------------------------------------------------

// Maximum products rendered per page — the single source of truth for the
// whole storefront. 50 per page: 69 products → 2 pages, 120 → 3 pages, etc.
export const PRODUCTS_PER_PAGE = 50

// Number of pages for a result count.
//   0 products → 0 (callers hide pagination entirely)
//   1–50       → 1
//   51–100     → 2
//   101–150    → 3 …
export function totalPages(totalProducts) {
  return Math.ceil(Math.max(0, totalProducts || 0) / PRODUCTS_PER_PAGE)
}

// Clamp a requested page into [1, lastValidPage]. Never allows page 0 or
// negative pages, and never lets an out-of-range ?page= (e.g. ?page=999
// when only 2 pages exist) render an empty page — it clamps to the last
// valid page instead.
export function clampPage(requestedPage, pageCount) {
  const page = Math.floor(Number(requestedPage))
  if (!Number.isFinite(page) || page < 1) return 1
  const last = Math.max(1, Math.floor(pageCount))
  return Math.min(page, last)
}

// Read the page from a location.search string ('?page=2'). Missing,
// non-numeric, or < 1 values mean page 1.
export function pageFromSearch(search) {
  const raw = new URLSearchParams(search || '').get('page')
  const page = Number.parseInt(raw, 10)
  return Number.isFinite(page) && page >= 1 ? page : 1
}

// Set ?page=N while preserving every other query parameter.
//   setPageParam('category=attar&sort=price-asc', 2)
//     → 'category=attar&sort=price-asc&page=2'
export function setPageParam(search, page) {
  const params = new URLSearchParams(search || '')
  params.set('page', String(page))
  return params.toString()
}

// Build the compact page-number list shown in the pagination control: a
// 3-page window around the current page plus the first and last pages,
// with '…' inserted for gaps so dozens of buttons never render.
//   page 1 of 20  → [1, 2, 3, '…', 20]
//   page 10 of 20 → [1, '…', 9, 10, 11, '…', 20]
//   page 20 of 20 → [1, '…', 18, 19, 20]
// The current page is always visible; small page counts render in full.
export function pageItems(currentPage, pageCount) {
  const total = Math.max(0, Math.floor(pageCount))
  const current = clampPage(currentPage, total)
  if (total <= 1) return [1]

  // 3-page window around the current page — extends outward at the edges so
  // page 1 shows [1, 2, 3] and the last page shows [N-2, N-1, N].
  let windowStart = current - 1
  let windowEnd = current + 1
  if (windowStart < 1) {
    windowEnd += 1 - windowStart
    windowStart = 1
  }
  if (windowEnd > total) {
    windowStart -= windowEnd - total
    windowEnd = total
  }
  windowStart = Math.max(1, windowStart)
  windowEnd = Math.min(total, windowEnd)

  // Always include the first and last pages.
  const wanted = new Set([1, total])
  for (let p = windowStart; p <= windowEnd; p += 1) wanted.add(p)
  const pages = Array.from(wanted).sort((a, b) => a - b)

  // Insert '…' wherever the numbers are not consecutive.
  const items = []
  let prev = null
  for (const p of pages) {
    if (prev !== null && p - prev > 1) {
      items.push(p - prev > 2 ? '…' : prev + 1)
    }
    items.push(p)
    prev = p
  }
  return items
}

// Label shown above the product grid — accurate in every case:
//   single page  → "Showing 38 products"
//   multi-page   → "Showing 50 of 69 products" (page 2 → "Showing 19 of 69")
//   no products  → null (callers hide the count line entirely)
export function productCountLabel(totalProducts, pageCount, itemsOnPage) {
  const total = Math.max(0, totalProducts || 0)
  if (total === 0) return null
  if (pageCount <= 1) return `Showing ${total} products`
  return `Showing ${itemsOnPage} of ${total} products`
}

// Slice a filtered + sorted product array down to the requested page.
// Returns the page's items plus the totals the UI needs. Never returns an
// empty page for an out-of-range page number (clamped to the last valid
// page). startIndex/endIndex follow the spec:
//   startIndex = (page - 1) * PRODUCTS_PER_PAGE
export function paginate(products, requestedPage) {
  const list = Array.isArray(products) ? products : []
  const total = list.length
  const pages = totalPages(total)
  const currentPage = clampPage(requestedPage, pages)
  const startIndex = (currentPage - 1) * PRODUCTS_PER_PAGE
  return {
    items: list.slice(startIndex, startIndex + PRODUCTS_PER_PAGE),
    total,
    totalPages: pages,
    currentPage,
  }
}
