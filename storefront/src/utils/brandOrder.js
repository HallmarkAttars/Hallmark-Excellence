// Brand display ordering — the single shared rule for turning the brand list
// from GET /api/brands into the order shown on the storefront. Used by the
// header BRANDS dropdown, the footer Shop column and (conceptually) anywhere
// else brand names are listed, so every location matches the homepage.
//
// The API already returns ONLY active brands; the `is_active !== false` guard
// below is defensive so this helper stays correct for any caller that passes
// a full list (e.g. tests, or an admin-only endpoint).

// Fallback slug order — used ONLY to break ties between brands that have no
// admin-configured display position yet (or equal positions). It keeps
// Arees/Dahab first pre-configuration, then the remaining brand slugs.
export const FALLBACK_BRAND_ORDER = ['arees', 'dahab', 'misk-al-arab', 'oud-al-haramain', 'amber-oud']

// Active brands first (defensive — API already filters), then sorted by
// display_order ascending (admin position, lowest first). Brands without a
// position (null) sort last, ties resolved by FALLBACK_BRAND_ORDER.
export function sortBrandsByDisplayOrder(brands, fallbackOrder = FALLBACK_BRAND_ORDER) {
  const active = (Array.isArray(brands) ? brands : []).filter((b) => b.is_active !== false)
  const order = fallbackOrder || []
  return [...active].sort((a, b) => {
    const ao = a.display_order ?? Number.MAX_SAFE_INTEGER
    const bo = b.display_order ?? Number.MAX_SAFE_INTEGER
    if (ao !== bo) return ao - bo
    const ia = order.indexOf(a.slug)
    const ib = order.indexOf(b.slug)
    return (ia === -1 ? order.length : ia) - (ib === -1 ? order.length : ib)
  })
}
