// WhatsApp bot catalogue adapter — maps the live shop API
// (https://api.areesperfumes.in/api) onto the small shapes the deterministic
// bot needs: categories → product list pages → variants → checkout lines.
//
// Everything here is pure (fetch injected) so the offline test suite can run
// it without network. Prices are displayed exactly like the storefront:
// variant total price × quantity — the server re-validates at checkout.

const SHOP_API_BASE = (process.env.SHOP_API_BASE || 'https://api.areesperfumes.in/api').replace(/\/$/, '')

const CACHE_TTL_MS = 5 * 60 * 1000

// Module-level cache. Serverless instances of a single deployment usually
// share their module scope while warm, so this costs at most one /products
// + /categories fetch every 5 minutes instead of per message.
let cache = null // { at, categories, products }

function round2(n) {
  return Math.round((Number(n) || 0) * 100) / 100
}

async function load({ fetchImpl } = {}) {
  const now = Date.now()
  if (cache && now - cache.at < CACHE_TTL_MS && !fetchImpl) return cache
  const doFetch = fetchImpl || globalThis.fetch
  const [prodRes, catRes] = await Promise.all([
    doFetch(`${SHOP_API_BASE}/products`),
    doFetch(`${SHOP_API_BASE}/categories`),
  ])
  if (!prodRes.ok || !catRes.ok) throw new Error('catalog_fetch_failed')
  const products = (await prodRes.json()).products || []
  const categories = (await catRes.json()).categories || []
  // Keep the cache only on a network load — an injected fetchImpl (tests)
  // must not overwrite the production cache.
  if (!fetchImpl) cache = { at: now, categories, products }
  else return { at: now, categories, products }
  return cache
}

// Category rows shown on the bot's browse menu. Categories with zero active
// products are dropped (e.g. "Fancy Bottle" with product_count 0) and long
// gallery categories like "Bakhoor" stay in.
export async function getShopCategories({ fetchImpl } = {}) {
  const { categories, products } = await load({ fetchImpl })
  const counts = new Map()
  for (const p of products) {
    if (p.category_id) counts.set(p.category_id, (counts.get(p.category_id) || 0) + 1)
  }
  const active = new Set(categories.filter((c) => c.is_active !== false).map((c) => c.id))
  return categories
    .filter((c) => active.has(c.id) && counts.get(c.id) > 0)
    .sort((a, b) => (counts.get(b.id) || 0) - (counts.get(a.id) || 0))
    .map((c) => ({ id: c.id, name: String(c.name || 'Category').trim(), count: counts.get(c.id) || 0 }))
}

// Products for one category, cheapest-variant-aware, alphabetical.
// `cat` comes from getShopCategories() so ids stay in sync with the menu.
export async function getCategoryProducts(cat, { fetchImpl } = {}) {
  const { products } = await load({ fetchImpl })
  return products
    .filter((p) => p.category_id === cat.id)
    .sort((a, b) => String(a.name).localeCompare(String(b.name)))
    .map((p) => {
      const variants = (p.variants || []).filter((v) => v && v.id)
      const defaultVariant =
        variants.find((v) => v.is_default && Number(v.total_price || v.price) > 0) ||
        variants.find((v) => Number(v.total_price || v.price) > 0) ||
        null
      const displayPrice = defaultVariant ? round2(defaultVariant.total_price ?? defaultVariant.price) : round2(p.price)
      const unitLabel = defaultVariant ? String(defaultVariant.display_label || '') : ''
      return { id: p.id, name: String(p.name).trim(), displayPrice, unitLabel, variants }
    })
}

// Choose the variant list rows for a product: default variant first, then
// the rest ascending by price. Only Stock-visible picks — the storefront
// treats stock honestly, so the bot must not sell out-of-stock variants.
export function orderVariants(product) {
  return [...(product.variants || [])]
    .sort((a, b) => {
      const d = (b.is_default ? 0 : 1) - (a.is_default ? 0 : 1)
      if (d !== 0) return d
      return round2(a.total_price ?? a.price) - round2(b.total_price ?? b.price)
    })
}

// Build the item payload the shop's POST /api/orders contract accepts —
// the exact field set the storefront checkout builds (Contact.jsx), which the
// order system re-validates against the database.
export function buildOrderItem(product, variant, quantity) {
  const qty = Math.max(1, Math.floor(Number(quantity) || 1))
  const pieces = Number(variant?.quantity_value || variant?.pieces || 1)
  const totalPieces = Math.max(1, pieces * qty)
  const unitPrice = round2(variant?.total_price ?? variant?.price ?? product.displayPrice)
  const line = {
    product_id: product.id,
    productId: product.id,
    variantId: variant ? variant.id : null,
    variant_id: variant ? variant.id : null,
    variantPieces: pieces,
    quantity: qty,
    totalPieces,
    unitPrice,
    totalPrice: round2(unitPrice * qty),
    selectedVariant: pieces,
    product_name: product.name,
    image: product.image || null,
    pieces: totalPieces,
    unit_price: unitPrice,
    subtotal: round2(unitPrice * qty),
  }
  if (variant) {
    line.variant_label = variant.display_label || ''
    line.quantity_value = pieces
    line.quantity_unit = variant.quantity_unit || 'Pieces'
    line.variant_total_price = round2(variant.total_price ?? variant.price ?? unitPrice * qty)
    line.variant_price_per_unit = round2(variant.price_per_unit ?? 0)
  }
  return line
}
