// Vercel serverless function — serves /robots.txt (via the /robots.txt → /api/robots rewrite in vercel.json).
//
// The disallowed paths reflect the storefront's ACTUAL routes (App.jsx):
// /cart and /checkout are transactional, /view-order shows a specific order's
// details, and /api/ + /admin/ guard the API surface. No /login, /register,
// /account or /search rules exist because those routes don't exist in this app.
//
// robots.txt needs no data, so it is always instant; the response is cached by
// the CDN for a day.

import { buildRobotsTxt, resolveSiteUrl } from '../src/utils/seo.js'

export default async function handler(req, res) {
  try {
    const baseUrl = resolveSiteUrl(process.env.SITE_URL, req.headers)
    const robots = buildRobotsTxt(baseUrl)

    res.setHeader('Content-Type', 'text/plain; charset=utf-8')
    res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=86400')
    res.status(200).send(robots)
  } catch (err) {
    console.error('robots.txt generation failed:', err)
    res.setHeader('Cache-Control', 'no-store')
    res.status(503).json({ error: 'robots.txt temporarily unavailable. Please retry.' })
  }
}
