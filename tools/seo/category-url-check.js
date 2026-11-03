// Weekly GSC URL-Inspection check for the 5 legacy category slugs and their 5
// canonical replacements.
//
// Usage:  node tools/seo/category-url-check.js            # inspect + log
//
// Why not "Validate fix"? The GSC UI's validation flow has no public API.
// What IS automatable is the URL Inspection API state — the same signal
// "Validate fix" surfaces: whether Google has crawled the 308s, accepted the
// user canonical, and indexed the clean URLs. This script records that state
// weekly so convergence is provable and regressions (e.g. a legacy URL being
// indexed again WITHOUT canonical consolidation) are caught.
//
// Output: tools/seo/reports/category-url-log.md (gitignored, appended).
// Zero dependencies. 10 inspection calls per run — 2000/day quota is ample.

const fs = require('fs')
const path = require('path')
const { getAccessToken, authedFetch } = require('../gsc/auth')
const { SITE, ENDPOINTS } = require('../gsc/config')

const LEGACY = ['1', '3', '10', 'Face%20wash', 'Bakhoor']
const CANONICAL = ['roll-on-attars', 'spray-bottles', 'fragrance-oils', 'face-wash', 'bakhoor']

const LOG_DIR = path.join(__dirname, '..', 'seo', 'reports')
const LOG_PATH = path.join(LOG_DIR, 'category-url-log.md')

async function inspect(api, url) {
  const res = await api(ENDPOINTS.inspect, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ inspectionUrl: url, siteUrl: SITE }),
  })
  const body = await res.json()
  if (!res.ok) return { url, ok: false, status: res.status, message: (body.error && body.error.message) || String(body) }
  const s = body.inspectionResult?.indexStatusResult
  if (!s) return { url, ok: false, message: 'no indexStatusResult' }
  return {
    url,
    ok: true,
    coverage: s.coverageState || '-',
    googleCanonical: s.googleCanonical || '(none)',
    ourCanonical: s.userCanonical || '(none)',
    lastCrawl: s.lastCrawlTime || 'never',
    robots: s.robotsTxtState || '-',
    indexingState: s.indexingState || '-',
    fetchedAs: (s.redirectTarget?.length && s.redirectTarget) || s.fetchedAs || '-',
  }
}

// Health rules per URL class.
function health(row, kind) {
  if (!row.ok) return 'ERROR'
  if (kind === 'canonical') {
    if (/^Submitted and indexed/.test(row.coverage)) return 'OK (indexed)'
    if (/^Crawled|discovered/i.test(row.coverage)) return 'WAIT (crawled, not yet indexed)'
    return 'CHECK'
  }
  // legacy: healthy when Google's chosen canonical moved to the clean URL
  const clean = row.url
    .replace(/categories\/1$/, 'categories/roll-on-attars')
    .replace(/categories\/3$/, 'categories/spray-bottles')
    .replace(/categories\/10$/, 'categories/fragrance-oils')
    .replace(/categories\/Face%20wash$/, 'categories/face-wash')
    .replace(/categories\/Bakhoor$/, 'categories/bakhoor')
  if (row.googleCanonical === clean) return 'OK (canonical consolidated)'
  if (/^Submitted and indexed|Duplicate.*Google chose different canonical/.test(row.coverage) && row.googleCanonical !== clean) {
    return 'ISSUE (indexed with own canonical)'
  }
  return 'WAIT (not yet consolidated)'
}

async function main() {
  fs.mkdirSync(LOG_DIR, { recursive: true })
  const accessToken = await getAccessToken()
  const api = authedFetch(accessToken)

  const jobs = []
  for (const slug of LEGACY) jobs.push(['legacy', `${SITE}categories/${slug}`])
  for (const slug of CANONICAL) jobs.push(['canonical', `${SITE}categories/${slug}`])

  const rows = []
  for (const [kind, url] of jobs) {
    const row = await inspect(api, url)
    row.kind = kind
    row.url = url
    row.health = health(row, kind)
    rows.push(row)
    console.log(`[${kind.padEnd(8)}] ${row.health.padEnd(32)} ${url}`)
    if (row.ok) {
      console.log(`            google-canonical: ${row.googleCanonical}`)
      console.log(`            coverage: ${row.coverage} | crawl: ${row.lastCrawl}`)
    } else {
      console.log(`            api error: ${row.message}`)
    }
  }

  // Weekly log entry
  const stamp = new Date().toISOString().replace('T', ' ').slice(0, 16)
  const okCanonical = rows.filter((r) => r.kind === 'canonical' && r.health.startsWith('OK')).length
  const okLegacy = rows.filter((r) => r.kind === 'legacy' && r.health.startsWith('OK')).length
  const issues = rows.filter((r) => r.health.startsWith('ISSUE') || r.health === 'ERROR')

  let entry = `\n---\n## Check: ${stamp}  → legacy OK ${okLegacy}/5, canonical indexed ${okCanonical}/5 ${issues.length ? `| ISSUES ${issues.length}` : ''}\n\n| Kind | URL | Health | Google-canonical | Coverage | Last crawl |\n|---|---|---|---|---|---|\n`
  for (const row of rows) {
    entry += `| ${row.kind} | \`${row.url.replace('https://www.areesperfumes.in', '')}\` | ${row.health} | ${row.googleCanonical.replace('https://www.areesperfumes.in', '') || '-'} | ${row.coverage} | ${row.ok ? row.lastCrawl : row.message} |\n`
  }
  // Header when the log is new
  if (!fs.existsSync(LOG_PATH)) {
    fs.writeFileSync(
      LOG_PATH,
      '# Category-URL convergence log (GSC URL Inspection, weekly)\n',
      'utf8'
    )
  }
  fs.appendFileSync(LOG_PATH, entry, 'utf8')

  console.log(`\nsummary: legacy consolidated ${okLegacy}/5 | canonical indexed ${okCanonical}/5 | log: ${LOG_PATH}`)
  if (issues.length) {
    console.log(`[!] ${issues.length} URL(s) flagged — inspect manually in the GSC UI (URL Inspection > Validate fix) before removing legacy redirects.`)
    process.exitCode = 2
  }
}

main().catch((err) => {
  console.error(`[error] ${err.message}`)
  process.exitCode = 1
})
