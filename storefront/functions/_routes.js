// Path resolution for the Cloudflare Pages catch-all function.
//
// Mirrors the rewrites and permanent redirects previously declared in
// `storefront/vercel.json` (and `storefront/netlify.toml`), so the Pages deploy
// keeps the same URLs, canonicals and SEO behaviour.

const PAGE_ROUTES = {
  '/': { type: 'page', slug: 'home' },
  '/shop': { type: 'page', slug: 'shop' },
  '/categories': { type: 'page', slug: 'categories' },
  '/brands': { type: 'page', slug: 'brands' },
  '/about': { type: 'page', slug: 'about' },
  '/contact': { type: 'page', slug: 'contact' },
  '/wholesale': { type: 'page', slug: 'wholesale' },
  '/wholesale-attars': { type: 'page', slug: 'wholesale' },
  '/hikma-exports': { type: 'page', slug: 'hikma-exports' },
  '/retail': { type: 'page', slug: 'retail' },
  '/retail-attars': { type: 'page', slug: 'retail' },
  '/attar-perfume-shop-south-india': { type: 'page', slug: 'attar-perfume-shop-south-india' },
  '/south-india': { type: 'page', slug: 'attar-perfume-shop-south-india' },
  '/guides': { type: 'page', slug: 'guides' },
  '/privacy-policy': { type: 'utility', slug: 'privacy-policy' },
  '/terms': { type: 'utility', slug: 'terms' },
  '/shipping-returns': { type: 'utility', slug: 'shipping-returns' },
  '/cart': { type: 'utility', slug: 'cart' },
  '/checkout': { type: 'utility', slug: 'checkout' },
  '/track-order': { type: 'utility', slug: 'track-order' },
  '/view-order': { type: 'utility', slug: 'view-order' },
}

// Keys are the decoded paths; `resolveRedirect` checks both the raw and the
// decoded request path so `/categories/Display%20bottles` also matches.
const REDIRECTS = new Map([
  ['/categories/Display bottles ', '/categories/display-bottles'],
  ['/categories/Display bottles', '/categories/display-bottles'],
  ['/categories/display bottles ', '/categories/display-bottles'],
  ['/categories/display bottles', '/categories/display-bottles'],
  ['/categories/1', '/categories/roll-on-attars'],
  ['/categories/3', '/categories/spray-bottles'],
  ['/categories/10', '/categories/fragrance-oils'],
  ['/categories/Face wash', '/categories/face-wash'],
  ['/categories/face wash', '/categories/face-wash'],
  ['/categories/Bakhoor ', '/categories/bakhoor'],
  ['/categories/Bakhoor', '/categories/bakhoor'],
])

export const NOT_FOUND_ROUTE = { type: 'notfound' }

function normalizePath(path) {
  if (!path) return '/'
  const trimmed = path.replace(/\/+$/, '')
  return trimmed || '/'
}

function decodePath(path) {
  try {
    return decodeURIComponent(path)
  } catch {
    return path
  }
}

export function resolveRedirect(path) {
  if (!path) return null
  const normalized = normalizePath(path)
  return REDIRECTS.get(normalized) || REDIRECTS.get(decodePath(normalized)) || null
}

export function resolveSeoRoute(path) {
  const normalized = normalizePath(path)
  if (PAGE_ROUTES[normalized]) return PAGE_ROUTES[normalized]

  const segments = normalized.split('/').filter(Boolean)
  if (segments.length === 2) {
    const [head, value] = segments
    if (head === 'product') return { type: 'product', id: decodePath(value) }
    if (head === 'categories') return { type: 'category', slug: decodePath(value) }
    if (head === 'brand') return { type: 'brand', slug: decodePath(value) }
    if (head === 'guides') return { type: 'guide', slug: decodePath(value) }
  }

  return null
}
