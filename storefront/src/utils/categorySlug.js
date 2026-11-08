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
  // Remaining raw DB slugs that would otherwise publish as mixed-case or
  // ambiguous URLs. Each maps to the keyword phrase its category name and
  // editorial title already use, so the sitemap never emits /categories/Roll%20on,
  // /categories/Caps or /categories/Pump and old URLs 301 to the clean form.
  //   'Roll on'  -> 'Fancy Bottle' category (NOT Roll on Attars, which is '1')
  //   'Caps'     -> 'Caps for Roll on bottles'
  //   'Pump'     -> 'Pump & Cap for spray bottles'
  ['roll on', 'fancy-attar-bottles'],
  ['caps', 'roll-on-bottle-caps'],
  ['pump', 'spray-bottle-pumps'],
  ['fancy-attar-bottles', 'fancy-attar-bottles'],
  ['roll-on-bottle-caps', 'roll-on-bottle-caps'],
  ['spray-bottle-pumps', 'spray-bottle-pumps'],
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
