// status.js — list GSC properties + sitemap health. Read-only.
// Usage: node status.js [--json]

const { getAccessToken, authedFetch } = require('./auth')
const { SITE, ENDPOINTS } = require('./config')

async function main() {
  const asJson = process.argv.includes('--json')
  const accessToken = await getAccessToken()
  const api = authedFetch(accessToken)

  const sitesRes = await api(ENDPOINTS.sites)
  const sitesBody = await sitesRes.json()
  if (!sitesRes.ok) throw new Error(`sites list failed (${sitesRes.status}): ${JSON.stringify(sitesBody)}`)
  const sites = sitesBody.siteEntry || []

  for (const site of sites) {
    const sitemapsRes = await api(ENDPOINTS.sitemaps(site.siteUrl))
    const sitemapsBody = await sitemapsRes.json()
    const sitemaps = (sitemapsBody.sitemap || []).filter((s) => s.path)
    if (asJson) {
      console.log(JSON.stringify({ site: site.siteUrl, permission: site.permissionLevel, sitemaps }, null, 2))
      continue
    }
    console.log(`\n${site.siteUrl}  [${site.permissionLevel}]`)
    if (sitemaps.length === 0) {
      console.log('  no sitemaps submitted')
      continue
    }
    for (const s of sitemaps) {
      console.log(`  ${s.path}`)
      console.log(`    submitted: ${s.lastSubmitted || '-'} | downloaded: ${s.lastDownloaded || '-'}`)
      console.log(`    pending: ${s.isPending} | errors: ${s.errors || 0} | warnings: ${s.warnings || 0}`)
    }
  }
}

main().catch((err) => {
  console.error(`ERROR: ${err.message}`)
  process.exitCode = 1
})
