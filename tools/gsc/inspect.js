// inspect.js — URL Inspection API for a list of URLs (read-only).
// Usage:
//   node inspect.js                    # default longer list (see INSPECT_URLS)
//   node inspect.js <url> [<url> ...]  # inspect specific URLs
//
// Prints per URL: coverage state, robots, last crawl, Google's chosen
// canonical vs ours. Quota: 2000 requests/day per property.

const { getAccessToken, authedFetch } = require('./auth')
const { SITE, ENDPOINTS } = require('./config')

// Longer default list: static pages + every sitemap-known category/brand +
// sample products + all guides. Derived from the live sitemap snapshot
// (2026-11-01). Products can be appended freely; keep the list under ~40 to
// stay well inside the daily quota when run often.
const CAT = (slug) => `${SITE}categories/${slug}`
const CREATION = 'https://www.areesperfumes.in/product/95a844d0-7dd8-406e-b83c-37cb5654348e'
const INSPECT_URLS = [
  // Static pages
  SITE,
  `${SITE}shop`,
  `${SITE}categories`,
  `${SITE}wholesale`,
  `${SITE}hikma-exports`,
  `${SITE}guides`,
  `${SITE}retail`,
  `${SITE}attar-perfume-shop-south-india`,
  `${SITE}about`,
  `${SITE}contact`,
  // Categories (all 10 from the sitemap)
  CAT('1'), CAT('2'), CAT('3'), CAT('4'), CAT('5'),
  CAT('6'), CAT('7'), CAT('8'), CAT('9'), CAT('10'),
  CAT('Roll%20on'), CAT('Caps'), CAT('Pump'), CAT('Bakhoor'),
  CAT('roll-on-bottles'), CAT('display-bottles'), CAT('Face%20wash'),
  // Brands (all 5 + index)
  `${SITE}brands`,
  `${SITE}brand/arees`, `${SITE}brand/arees-12ml`, `${SITE}brand/arees-luxury`,
  `${SITE}brand/dahab`, `${SITE}brand/bakhoor`,
  // Sample products (UUID until the slug migration) + guides
  CREATION,
  `${SITE}product/9f4fa9c2-7559-4f51-b9fd-bee1e85db9b3`,
  `${SITE}product/91080347-2c4e-47b9-b4ce-990d72436009`,
  `${SITE}guides/attar-vs-perfume-oil`,
  `${SITE}guides/buy-attar-chennai`,
  `${SITE}guides/wholesale-attar-buying-guide`,
]

async function main() {
  const urlArgs = process.argv.slice(2).filter((a) => /^https?:\/\//.test(a))
  const urls = urlArgs.length > 0 ? urlArgs : INSPECT_URLS

  const accessToken = await getAccessToken()
  const api = authedFetch(accessToken)

  let indexed = 0
  let pending = 0
  console.log(`URL Inspection — ${urls.length} URLs for ${SITE}\n`)
  for (const url of urls) {
    const res = await api(ENDPOINTS.inspect, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ inspectionUrl: url, siteUrl: SITE }),
    })
    const body = await res.json()
    const s = body.inspectionResult?.indexStatusResult
    if (res.status === 404) {
      console.log(`? UNKNOWN    ${url}`)
      pending++
      continue
    }
    if (!s) {
      console.log(`! ERROR ${res.status} — ${url} ${JSON.stringify(body).slice(0, 160)}`)
      pending++
      continue
    }
    const coverage = s.coverageState || '-'
    const short = coverage.startsWith('Submitted and indexed') ? 'INDEXED  '
      : coverage.startsWith('Crawled') ? 'CRAWLED  '
      : coverage.startsWith('Discovered') ? 'PENDING  '
      : coverage.startsWith('URL is unknown') ? 'UNKNOWN  '
      : 'EXCLUDED '
    if (short === 'INDEXED  ') indexed++
    console.log(`${short} ${url}`)
    console.log(`           lastCrawl: ${s.lastCrawlTime || 'never'} | google: ${s.googleCanonical || '-'} | ours: ${s.userCanonical || '-'}`)
    console.log(`           ${coverage}`)
  }
  console.log(`\nsummary: ${indexed} indexed / ${urls.length} checked (${pending} not resolvable)`)
}

main().catch((err) => {
  console.error(`ERROR: ${err.message}`)
  process.exitCode = 1
})
