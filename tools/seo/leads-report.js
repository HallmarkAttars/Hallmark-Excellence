// Combined Google-search leads report — GA4 + GSC in one markdown file.
//
// Usage:   node tools/seo/leads-report.js
// Output:  tools/seo/reports/search-leads.md (gitignored) + stdout summary.
//
// Zero dependencies (Node >= 18). READ-ONLY: only Data API runReport queries
// and GSC searchAnalytics queries. Keys are never printed or committed.

const fs = require('fs')
const path = require('path')
const { getStatus } = require('../ga4/auth')
const ga4Config = require('../ga4/config')
const { getAccessToken, authedFetch } = require('../gsc/auth')
const { SITE, ENDPOINTS } = require('../gsc/config')

const PROPERTY = ga4Config.PROPERTY_ID
const REPORT_DIR = path.join(__dirname, 'reports')
const REPORT_PATH = path.join(REPORT_DIR, 'search-leads.md')

// Queries matching these are brand searches; everything else is discovery.
const BRAND_RE = /arees|arees[hz]|aries|aeres|parfum|perfume|attars? &|hikma/i

async function runGa4(token, body) {
  const res = await fetch(`https://analyticsdata.googleapis.com/v1beta/properties/${PROPERTY}:runReport`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const json = await res.json()
  if (!res.ok) throw new Error(`GA4 runReport ${res.status}: ${(json.error && json.error.message) || ''}`)
  return json
}

function organicBody(days) {
  return {
    dateRanges: [{ startDate: `${days}daysAgo`, endDate: 'today' }],
    dimensions: [{ name: 'date' }],
    metrics: [
      { name: 'sessions' },
      { name: 'keyEvents:generate_lead' },
      { name: 'keyEvents:purchase' },
      { name: 'totalRevenue' },
    ],
    dimensionFilter: {
      filter: { fieldName: 'sessionDefaultChannelGroup', stringFilter: { value: 'Organic Search' } },
    },
    orderBys: [{ dimension: { dimensionName: 'date' } }],
  }
}

function funnelBody(days) {
  return {
    dateRanges: [{ startDate: `${days}daysAgo`, endDate: 'today' }],
    dimensions: [{ name: 'eventName' }],
    metrics: [{ name: 'eventCount' }, { name: 'totalUsers' }],
    limit: 100,
  }
}

async function gscQuery(api, days, dimensions, extra = {}) {
  const res = await api(ENDPOINTS.searchAnalytics(SITE), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      startDate: new Date(Date.now() - days * 864e5).toISOString().slice(0, 10),
      endDate: new Date().toISOString().slice(0, 10),
      dimensions,
      rowLimit: 15,
      ...extra,
    }),
  })
  const json = await res.json()
  if (!res.ok) throw new Error(`GSC ${res.status}: ${JSON.stringify(json)}`)
  return json.rows || []
}

async function listKeyEvents(token) {
  const res = await fetch(`https://analyticsadmin.googleapis.com/v1beta/properties/${PROPERTY}/keyEvents`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  const json = await res.json()
  if (!res.ok) return { keyEvents: [], error: (json.error && json.error.message) || res.status }
  return { keyEvents: (json.keyEvents || []).map((e) => e.eventName) }
}

function sumRows(rows, idx) {
  return rows.reduce((acc, r) => acc + Number(r.metricValues[idx].value || 0), 0)
}

async function main() {
  fs.mkdirSync(REPORT_DIR, { recursive: true })
  const startedAt = new Date().toISOString().replace('T', ' ').slice(0, 16)

  const gscToken = await getAccessToken()
  const gscApi = authedFetch(gscToken)

  let ga4Lines = ''
  let ga4Token = null
  try {
    const status = await getStatus()
    ga4Token = status.token
  } catch (err) {
    ga4Lines = `> GA4 unavailable this run: ${err.message}\n`
    console.log(`[warn] GA4 unavailable: ${err.message}`)
  }

  let md = `# Google-search leads report — areesperfumes.in\n\nGenerated: ${startedAt}\nProperty: GA4 ${PROPERTY} | GSC ${SITE}\n\n`

  // ---- GA4 organic sections ----
  if (ga4Token) {
    const [org90, org7, funnel28, keyEvents] = await Promise.all([
      runGa4(ga4Token, organicBody(90)),
      runGa4(ga4Token, organicBody(7)),
      runGa4(ga4Token, funnelBody(28)),
      listKeyEvents(ga4Token),
    ])

    const sessions90 = sumRows(org90.rows || [], 0)
    const leads90 = sumRows(org90.rows || [], 1)
    const purchases90 = sumRows(org90.rows || [], 2)
    const revenue90 = sumRows(org90.rows || [], 3)
    const sessions7 = sumRows(org7.rows || [], 0)
    const leads7 = sumRows(org7.rows || [], 1)
    const purchases7 = sumRows(org7.rows || [], 2)

    const funnel = {}
    for (const row of funnel28.rows || []) {
      const name = row.dimensionValues[0].value
      if (['view_item', 'add_to_cart', 'begin_checkout', 'purchase', 'generate_lead'].includes(name)) {
        funnel[name] = Number(row.metricValues[0].value)
      }
    }

    md += `## Organic Search (Google) — GA4\n\n| Window | Sessions | generate_lead | purchase |\n|---|---|---|---|\n| Last 90 days | ${sessions90} | ${leads90} | ${purchases90} |\n| Last 7 days | ${sessions7} | ${leads7} | ${purchases7} |\n\n`
    if (revenue90 > 0) md += `Organic-attributed revenue (90d): ₹${revenue90}\n\n`
    md += `Storefront funnel events (28d): view_item ${funnel.view_item || 0} → add_to_cart ${funnel.add_to_cart || 0} → begin_checkout ${funnel.begin_checkout || 0} → purchase ${funnel.purchase || 0} | generate_lead ${funnel.generate_lead || 0}\n\n`
    md += `Key events marked in GA4: ${keyEvents.keyEvents.length ? keyEvents.keyEvents.join(', ') : '(none)'}${keyEvents.error ? ` (list error: ${keyEvents.error})` : ''}\n\n`

    // daily rows (last 30d from the 90d response tail)
    const daily = (org90.rows || []).slice(-30)
    if (daily.length) {
      md += '| Date | Sessions | Leads | Purchases |\n|---|---|---|---|\n'
      for (const row of daily) {
        md += `| ${row.dimensionValues[0].value} | ${row.metricValues[0].value} | ${row.metricValues[1].value} | ${row.metricValues[2].value} |\n`
      }
      md += '\n'
    }
    console.log(`[ga4] organic 90d: ${sessions90} sessions, ${leads90} leads, ${purchases90} purchases`)
  } else {
    md += ga4Lines
  }

  // ---- GSC sections ----
  const [queries, pages] = await Promise.all([
    gscQuery(gscApi, 28, ['query']),
    gscQuery(gscApi, 28, ['page']),
  ])
  // totals: daily rows summed
  const daily28 = await gscQuery(gscApi, 28, ['date'])
  const clicks28 = daily28.reduce((a, r) => a + r.clicks, 0)
  const impressions28 = daily28.reduce((a, r) => a + r.impressions, 0)
  let brandClicks = 0
  let nonBrandClicks = 0
  for (const row of queries) {
    if (BRAND_RE.test(row.keys[0])) brandClicks += row.clicks
    else nonBrandClicks += row.clicks
  }

  md += `## Search Console — last 28 days\n\nClicks: **${clicks28}** | Impressions: **${impressions28}**\n\n`
  md += `Brand vs discovery queries (top ${queries.length}): brand ${brandClicks} clicks | non-brand ${nonBrandClicks} clicks\n\n`
  if (queries.length) {
    md += '| Query | Clicks | Impressions |\n|---|---|---|\n'
    for (const row of queries) md += `| ${row.keys[0]} | ${row.clicks} | ${row.impressions} |\n`
    md += '\n'
  }
  if (pages.length) {
    md += '| Page | Clicks | Impressions |\n|---|---|---|\n'
    for (const row of pages) md += `| ${row.keys[0]} | ${row.clicks} | ${row.impressions} |\n`
    md += '\n'
  }
  md += `Sitemap already verified via tools/gsc/status.js. Redirect/canonical follow-ups are tracked in GSC URL Inspection.\n`
  console.log(`[gsc] 28d: ${clicks28} clicks, ${impressions28} impressions (brand ${brandClicks} / non-brand ${nonBrandClicks})`)

  fs.writeFileSync(REPORT_PATH, md, 'utf8')
  console.log(`[done] wrote ${REPORT_PATH}`)
}

main().catch((err) => {
  console.error(`[error] ${err.message}`)
  process.exitCode = 1
})
