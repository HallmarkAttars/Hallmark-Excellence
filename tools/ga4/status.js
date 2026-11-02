// Quick GA4 health snapshot: 7-day totals + event table with storefront
// funnel events flagged, so Batch verification is one command:
//   node tools/ga4/status.js

const { getStatus } = require('./auth')
const { PROPERTY_ID, FUNNEL_EVENTS, STANDARD_EVENTS } = require('./config')

function fmt(n) {
  return String(n).padStart(7)
}

async function runReport(token, body) {
  const res = await fetch(`https://analyticsdata.googleapis.com/v1beta/properties/${PROPERTY_ID}:runReport`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const json = await res.json()
  if (!res.ok) throw new Error(`runReport ${res.status}: ${(json.error && json.error.message) || res.status}`)
  return json
}

async function main() {
  const { token } = await getStatus()

  const totals = await runReport(token, {
    dateRanges: [{ startDate: '7daysAgo', endDate: 'today' }],
    metrics: [{ name: 'totalUsers' }, { name: 'newUsers' }, { name: 'sessions' }, { name: 'screenPageViews' }, { name: 'eventCount' }],
  })
  const t = totals.rows ? totals.rows[0].metricValues.map((m) => Number(m.value)) : [0, 0, 0, 0, 0]
  console.log(`\nGA4 property ${PROPERTY_ID} - last 7 days`)
  console.log(`  users ${fmt(t[0])} | new-users ${fmt(t[1])} | sessions ${fmt(t[2])} | pageviews ${fmt(t[3])} | events ${fmt(t[4])}`)

  const events = await runReport(token, {
    dateRanges: [{ startDate: '7daysAgo', endDate: 'today' }],
    dimensions: [{ name: 'eventName' }],
    metrics: [{ name: 'eventCount' }],
    orderBys: [{ metric: { metricName: 'eventCount' }, desc: true }],
    limit: 40,
  })
  const counts = new Map()
  for (const row of events.rows || []) counts.set(row.dimensionValues[0].value, Number(row.metricValues[0].value))

  console.log('\n  --- storefront funnel (custom events) ---')
  for (const name of FUNNEL_EVENTS) {
    const n = counts.get(name) || 0
    console.log(`  ${n ? 'YES' : ' - '} ${fmt(n)}  ${name}`)
  }
  console.log('  --- top standard events ---')
  for (const name of STANDARD_EVENTS) {
    if (counts.has(name)) console.log(`      ${fmt(counts.get(name))}  ${name}`)
  }
  const other = [...counts.entries()]
    .filter(([name]) => !FUNNEL_EVENTS.includes(name) && !STANDARD_EVENTS.includes(name))
    .slice(0, 8)
  if (other.length) {
    console.log('  --- other events ---')
    for (const [name, n] of other) console.log(`      ${fmt(n)}  ${name}`)
  }
  console.log('\nNote: GA4 standard reporting has a processing lag of a few hours.')
  console.log('For instant confirmation use the GA4 UI Realtime view after a test visit.\n')
}

main().catch((err) => {
  console.error(`[error] ${err.message}`)
  process.exitCode = 1
})
