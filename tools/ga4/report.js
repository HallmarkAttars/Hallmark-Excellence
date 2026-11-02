// Ad-hoc GA4 report from the command line (read-only Data API).
//
// Examples:
//   node tools/ga4/report.js                                  // 28d top pages
//   node tools/ga4/report.js --events                          // raw event counts
//   node tools/ga4/report.js --funnel                          // funnel event counts
//   node tools/ga4/report.js --days 7 --dimension pagePath --metric screenPageViews,totalUsers --limit 15
//   node tools/ga4/report.js --dimension startDate --metric activeUsers --days 14

const { getStatus } = require('./auth')
const { PROPERTY_ID, FUNNEL_EVENTS } = require('./config')

function parseArgs(argv) {
  const args = {}
  for (let i = 2; i < argv.length; i++) {
    const isValueArg = argv[i] === '--days' || argv[i] === '--dimension' || argv[i] === '--metric' || argv[i] === '--limit'
    if (isValueArg && argv[i + 1]) {
      args[argv[i].slice(2)] = argv[i + 1]
      i++
    } else if (argv[i].startsWith('--')) {
      args[argv[i].slice(2)] = true
    }
  }
  return args
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

function printTable(json) {
  if (!json.rows || json.rows.length === 0) {
    console.log('(no rows)')
    return
  }
  const dims = json.rows[0].dimensionValues.length
  const mets = json.rows[0].metricValues.length
  const header =
    dims.map((_, i) => `d${i}`.padEnd(30)).join('') +
    mets.map((_, i) => `m${i}`.padStart(9)).join('')
  console.log(header)
  for (const row of json.rows) {
    console.log(
      row.dimensionValues.map((d) => d.value.slice(0, 30).padEnd(30)).join('') +
      row.metricValues.map((m) => m.value.padStart(9)).join(''),
    )
  }
}

async function main() {
  const args = parseArgs(process.argv)
  const days = args.days || '28'
  const dateRanges = [{ startDate: `${days}daysAgo`, endDate: 'today' }]
  const token = (await getStatus()).token

  if (args.events) {
    const json = await runReport(token, {
      dateRanges,
      dimensions: [{ name: 'eventName' }],
      metrics: [{ name: 'eventCount' }, { name: 'totalUsers' }],
      orderBys: [{ metric: { metricName: 'eventCount' }, desc: true }],
      limit: Number(args.limit || 50),
    })
    console.log(`GA4 events, property ${PROPERTY_ID}, last ${days} days`)
    printTable(json)
    return
  }

  if (args.funnel) {
    const json = await runReport(token, {
      dateRanges,
      dimensions: [{ name: 'eventName' }],
      metrics: [{ name: 'eventCount' }, { name: 'totalUsers' }],
      limit: 100,
    })
    const rows = (json.rows || []).filter((r) => FUNNEL_EVENTS.includes(r.dimensionValues[0].value))
    // keep API-defined order
    console.log(`GA4 funnel, property ${PROPERTY_ID}, last ${days} days`)
    for (const name of FUNNEL_EVENTS) {
      const row = rows.find((r) => r.dimensionValues[0].value === name)
      if (!row) {
        console.log('  -       [no data]'.padStart(10), name)
        continue
      }
      console.log(
        row.metricValues.map((m) => m.value.padStart(9)).join(' '),
        name,
      )
    }
    return
  }

  const dimension = args.dimension || 'pagePath'
  const metric = args.metric || 'screenPageViews,totalUsers'
  const json = await runReport(token, {
    dateRanges,
    dimensions: dimension.split(',').map((name) => ({ name })),
    metrics: metric.split(',').map((name) => ({ name })),
    orderBys: [{ metric: { metricName: metric.split(',')[0] }, desc: true }],
    limit: Number(args.limit || 20),
  })
  console.log(`GA4 report, property ${PROPERTY_ID}, last ${days} days, by ${dimension}`)
  printTable(json)
}

main().catch((err) => {
  console.error(`[error] ${err.message}`)
  process.exitCode = 1
})
