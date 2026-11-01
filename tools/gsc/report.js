// report.js — Search Analytics export (clicks, impressions, CTR, position).
// Usage: node report.js [--days 28] [--dimension query,page] [--limit 500]
// Writes a CSV to reports/ (gitignored) and prints the top rows.

const fs = require('fs')
const path = require('path')
const { getAccessToken, authedFetch } = require('./auth')
const { SITE, DEFAULT_DAYS, DEFAULT_LIMIT, ENDPOINTS } = require('./config')

function argValue(flag, fallback) {
  const index = process.argv.indexOf(flag)
  return index >= 0 && process.argv[index + 1] ? process.argv[index + 1] : fallback
}

function pct(value) {
  return `${(value * 100).toFixed(2)}%`
}

function csvEscape(value) {
  const s = String(value ?? '')
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

async function main() {
  const days = Math.max(Number(argValue('--days', DEFAULT_DAYS)) || DEFAULT_DAYS, 1)
  const dimensionArg = String(argValue('--dimension', 'query,page'))
    .split(',').map((d) => d.trim()).filter(Boolean)
  const limit = Math.min(Number(argValue('--limit', DEFAULT_LIMIT)) || DEFAULT_LIMIT, 25000)

  // endDate = yesterday, startDate = endDate - (days-1)
  const end = new Date()
  end.setDate(end.getDate() - 1)
  const start = new Date(end)
  start.setDate(start.getDate() - (days - 1))
  const startDate = start.toISOString().slice(0, 10)
  const endDateStr = end.toISOString().slice(0, 10)

  const accessToken = await getAccessToken()
  const api = authedFetch(accessToken)

  const res = await api(ENDPOINTS.searchAnalytics(SITE), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ startDate, endDate: endDateStr, dimensions: dimensionArg, rowLimit: limit }),
  })
  const body = await res.json()
  if (!res.ok) throw new Error(`searchAnalytics failed (${res.status}): ${JSON.stringify(body).slice(0, 400)}`)
  const rows = body.rows || []

  console.log(`Search Analytics ${startDate}..${endDateStr} (${days} days) | dimensions: ${dimensionArg.join(',')} | rows: ${rows.length}`)

  const header = [...dimensionArg, 'clicks', 'impressions', 'ctr', 'position']
  const csvLines = [header.join(',')]
  const top = Math.min(rows.length, 25)
  for (let i = 0; i < top; i++) {
    const r = rows[i]
    const keys = dimensionArg.map((_, n) => r.keys[n] ?? '')
    console.log(`  ${r.clicks}c ${r.impressions}i ${pct(r.ctr)} pos ${r.position.toFixed(1)} — ${keys.join(' | ')}`)
  }
  for (const r of rows) {
    const keys = dimensionArg.map((_, n) => r.keys[n] ?? '')
    csvLines.push([...keys, r.clicks, r.impressions, pct(r.ctr), r.position.toFixed(2)].map(csvEscape).join(','))
  }

  const dir = path.join(__dirname, 'reports')
  fs.mkdirSync(dir, { recursive: true })
  const file = path.join(dir, `gsc-${new Date().toISOString().slice(0, 10)}-${days}d-${dimensionArg.join('+')}.csv`)
  fs.writeFileSync(file, `\uFEFF${csvLines.join('\n')}\n`, 'utf8')
  console.log(`\ncsv written: ${file}`)
}

main().catch((err) => {
  console.error(`ERROR: ${err.message}`)
  process.exitCode = 1
})
