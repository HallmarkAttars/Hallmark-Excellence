// Cloudflare Workers entry for the storefront.
//
// Static assets are served asset-first (no Worker invocation) except for `/`,
// which is forced through the Worker so the home page keeps its SSR metadata.
// Every non-asset path goes through the shared SEO/API handlers.

import { onRequest } from './functions/_handler.js'

const ASSET_PREFIXES = ['/assets/', '/fonts/']
const ASSET_EXTENSIONS = /\.(?:webp|png|jpe?g|svg|ico|css|js|map|html|webmanifest)$/i

export function isStaticAsset(pathname) {
  if (!pathname || pathname === '/') return false
  if (pathname === '/BingSiteAuth.xml') return true
  if (ASSET_PREFIXES.some((prefix) => pathname.startsWith(prefix))) return true
  return ASSET_EXTENSIONS.test(pathname)
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url)
    if (isStaticAsset(url.pathname)) {
      return env.ASSETS.fetch(request)
    }
    return onRequest({ request, env, ctx })
  },
}
