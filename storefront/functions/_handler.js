// Shared handler for the Cloudflare Pages catch-all. Both `index.js` (the `/`
// route) and `[[path]].js` (every other route) re-export this.

import metaHandler from '../api/meta.js'
import sitemapHandler from '../api/sitemap.js'
import robotsHandler from '../api/robots.js'
import waWebhookHandler from '../api/wa-webhook.js'
import waCronHandler from '../api/wa-cron.js'
import { adapt, SECURITY_HEADERS } from './_adapter.js'
import { resolveRedirect, resolveSeoRoute, NOT_FOUND_ROUTE } from './_routes.js'

const HANDLERS = {
  '/api/meta': metaHandler,
  '/api/sitemap': sitemapHandler,
  '/api/robots': robotsHandler,
  '/api/wa-webhook': waWebhookHandler,
  '/api/wa-cron': waCronHandler,
  '/sitemap.xml': sitemapHandler,
  '/robots.txt': robotsHandler,
}

export async function onRequest(context) {
  const { request, env } = context
  const url = new URL(request.url)
  const path = url.pathname

  const redirect = resolveRedirect(path)
  if (redirect) {
    return new Response(null, {
      status: 301,
      headers: { Location: new URL(redirect, url.origin).toString(), ...SECURITY_HEADERS },
    })
  }

  const handler = HANDLERS[path]
  if (handler) return adapt(handler, request, env)

  return adapt(metaHandler, request, env, resolveSeoRoute(path) || NOT_FOUND_ROUTE)
}
