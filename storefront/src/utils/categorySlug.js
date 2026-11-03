// Public category URL normalization.
// The live catalogue stores raw DB slugs; every public URL must use the clean
// canonical kebab slug. Aliased slugs resolve normally (normalizeCategorySlug
// is applied to BOTH the page's :slug param and the API's item.slug before
// comparison, e.g. getProductsByCategory in services/mockApi), and the data
// fetch keeps using the API's own raw slug — so aliasing is pure URL vanity,
// data flows are untouched.

const CATEGORY_SLUG_ALIASES = new Map([
  ['display bottles', 'display-bottles'],
  ['display-bottles', 'display-bottles'],
  // Numeric DB ids used as public slugs — replaced by the keyword slugs the
  // category page titles already use.
  ['1', 'roll-on-attars'],
  ['3', 'spray-bottles'],
  ['10', 'fragrance-oils'],
  // Space/mixed-case DB names.
  ['face wash', 'face-wash'],
  ['bakhoor', 'bakhoor'],
])

export function normalizeCategorySlug(slug) {
  let value = String(slug ?? '').trim()
  if (!value) return ''
  try {
    value = decodeURIComponent(value)
  } catch {
    // Keep the original value when it is not valid percent-encoding.
  }
  value = value.replace(/\s+/g, ' ').trim()
  return CATEGORY_SLUG_ALIASES.get(value.toLowerCase()) || value
}
