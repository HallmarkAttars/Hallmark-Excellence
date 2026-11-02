// Minimal GA4 event bridge.
//
// index.html declares the global `gtag` shim that queues into `dataLayer`
// BEFORE the React bundle loads, so every call below is safe from the very
// first render — events fired before gtag.js finishes loading are replayed
// by Google's loader. Every helper is try/catch wrapped: analytics must
// never break a purchase flow.

// GA4 recommended ecommerce + lead events used across the storefront:
//   view_item      – product detail page mounted with data
//   add_to_cart    – Add to Cart accepted on the product page
//   begin_checkout – checkout page mounted with cart items
//   purchase       – order created successfully (transaction_id = orderNumber)
//   generate_lead  – WhatsApp chat opened / contact form submitted
//
// Currency is always INR — the storefront only prices in rupees today.

export function trackEvent(name, params = {}) {
  try {
    if (typeof window === 'undefined') return
    window.dataLayer = window.dataLayer || []
    if (typeof window.gtag === 'function') {
      window.gtag('event', name, params)
    } else {
      // Queue a gtag-shaped call so the loader replays it once gtag.js is up.
      window.dataLayer.push(['event', name, params])
    }
  } catch {
    // Analytics must never break a purchase flow.
  }
}

export const CURRENCY = 'INR'
