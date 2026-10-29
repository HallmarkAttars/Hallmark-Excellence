const BRAND_API_SLUGS = new Map([
  ['arees-luxury', 'oud-al-haramain'],
  ['bakhoor', 'misk-al-arab'],
])

const BRAND_PUBLIC_SLUGS = new Map([
  ['oud-al-haramain', 'arees-luxury'],
  ['misk-al-arab', 'bakhoor'],
])

function normalizeBrandSlug(slug) {
  return String(slug ?? '').trim().toLowerCase()
}

export function brandApiSlug(slug) {
  const value = normalizeBrandSlug(slug)
  if (!value) return ''
  return BRAND_API_SLUGS.get(value) || value
}

export function brandPublicSlug(slug) {
  const value = normalizeBrandSlug(slug)
  if (!value) return ''
  return BRAND_PUBLIC_SLUGS.get(value) || value
}
