// submit-sitemap.js — (re)submit the sitemap to GSC. Idempotent.
// Usage: node submit-sitemap.js [--sitemap <url>]

const { getAccessToken, authedFetch } = require('./auth')
const { SITE, SITEMAP, ENDPOINTS } = require('./config')

async function main() {
  const flagIndex = process.argv.indexOf('--sitemap')
  const feedpath = flagIndex >= 0 ? process.argv[flagIndex + 1] : SITEMAP
  if (!feedpath || !/^https:\/\//.test(feedpath)) throw new Error(`Invalid sitemap URL: ${feedpath}`)

  const accessToken = await getAccessToken()
  const api = authedFetch(accessToken)

  const res = await api(ENDPOINTS.sitemap(SITE, feedpath), { method: 'PUT' })
  // Google returns 204 No Content on success for PUT sitemap submissions.
  if (res.status !== 200 && res.status !== 204) {
    throw new Error(`sitemap submit failed (${res.status}): ${await res.text()}`)
  }
  console.log(`[ok] submitted ${feedpath} for ${SITE} (HTTP ${res.status})`)

  const check = await (await api(ENDPOINTS.sitemap(SITE, feedpath))).json()
  console.log(`     lastSubmitted: ${check.lastSubmitted || '-'} | pending: ${check.isPending} | errors: ${check.errors || 0} | warnings: ${check.warnings || 0}`)
}

main().catch((err) => {
  console.error(`ERROR: ${err.message}`)
  process.exitCode = 1
})
