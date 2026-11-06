// Shared production I/O for the WhatsApp surfaces (webhook + cron): the exact
// endpoints the storefront uses for catalog reads, order placement, tracking
// and the served UPI QR probe.

import { getShopCategories, getCategoryProducts } from './_catalog.js'

const QR_URL_OVERRIDE = process.env.WHATSAPP_QR_URL || ''

let qrProbe = null

export async function qrImageUrl() {
  if (!QR_URL_OVERRIDE) return null
  if (qrProbe !== null) return qrProbe
  try {
    const res = await fetch(QR_URL_OVERRIDE, { method: 'HEAD' })
    qrProbe = res.ok ? QR_URL_OVERRIDE : null
  } catch {
    qrProbe = null
  }
  return qrProbe
}

export function productionIo() {
  const base = (process.env.SHOP_API_BASE || 'https://api.areesperfumes.in/api').replace(/\/$/, '')
  return {
    getShopCategories: () => getShopCategories(),
    categoryProducts: (cat) => getCategoryProducts(cat),
    postOrder: async (payload) => {
      const res = await fetch(`${base}/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json().catch(() => null)
      if (!res.ok) {
        const err = new Error(data?.error || data?.message || `Order failed (${res.status})`)
        err.status = res.status
        throw err
      }
      return data
    },
    trackOrder: async ({ type, value }) => {
      const res = await fetch(`${base}/track-order`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, value }),
      })
      const data = await res.json().catch(() => null)
      if (!res.ok) throw new Error(data?.error || `Tracking failed (${res.status})`)
      return Array.isArray(data.orders) ? data.orders : []
    },
    getQrImage: async () => qrImageUrl(),
  }
}
