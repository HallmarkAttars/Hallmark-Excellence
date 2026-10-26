// Public category URL normalization.
// The live catalogue currently stores "Display bottles " for the Canter
// Bottle category; every public URL must use the clean canonical slug.

const CATEGORY_SLUG_ALIASES = new Map([
  ['display bottles', 'display-bottles'],
  ['display-bottles', 'display-bottles'],
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
