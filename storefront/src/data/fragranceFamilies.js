// Scent-family discovery — P2 (approved batch).
// Families are keyword-mapped from the products' OWN catalogue copy (name +
// description only): the site never invents scent claims that the product
// text does not already make. A product can belong to several families, and
// non-fragrance products (bottles, caps, carriers, face wash) never get one.
//
// Family order is canonical: filter groups, homepage chips and PDP spec
// values all render in this order, so lists are deterministic.

// Order drives display everywhere (chips, filter group, spec values).
const FAMILY_ORDER = [
  'floral',
  'musk',
  'oud',
  'woody',
  'amber',
  'sweet',
  'fresh',
  'oriental',
]

// Keywords are matched as whole words (word-boundary regex) against the
// lowercased name + description. Saffron/dupes across families is intentional
// (a saffron-rose attar can legitimately be both sweet-leaning and oriental).
const FAMILY_KEYWORDS = {
  floral: [
    'rose', 'gulab', 'jasmine', 'mogra', 'chameli', 'lavender', 'lily',
    'iris', 'gardenia', 'tuberose', 'raat rani', 'night queen', 'floral',
  ],
  musk: ['musk', 'mushk'],
  oud: ['oud', 'oudh', 'agarwood', 'dehn al oud'],
  woody: [
    'sandal', 'chandan', 'cedar', 'vetiver', 'khus', 'patchouli',
    'cashmere wood', 'agar', 'wood',
  ],
  amber: ['amber', 'ambergris'],
  sweet: [
    'vanilla', 'sweet', 'caramel', 'honey', 'chocolate', 'cocoa',
    'gourmand', 'tonka', 'fruity', 'berry', 'mango', 'peach', 'ripe fruits',
  ],
  fresh: [
    'fresh', 'citrus', 'bergamot', 'lemon', 'aqua', 'marine', 'ocean',
    'mint', 'cucumber', 'melon', 'eucalyptus', 'green notes',
  ],
  oriental: [
    'oriental', 'spicy', 'spices', 'saffron', 'cardamom', 'cinnamon',
    'clove', 'pepper', 'bakhoor', 'resin', 'incense',
  ],
}

// Precompiled per-family keyword matchers (word boundaries both sides).
const escapeRegExp = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
const FAMILY_MATCHERS = Object.fromEntries(
  Object.entries(FAMILY_KEYWORDS).map(([family, keywords]) => [
    family,
    keywords.map((keyword) => new RegExp(`\\b${escapeRegExp(keyword)}\\b`)),
  ])
)

// Fragrance categories only. Anything whose category is packaging, display,
// cosmetics or a dilution carrier is ineligible even if its description
// mentions "fragrance blends" (bottles) or "carrier" (DPG).
const FRAGRANCE_CATEGORY_PATTERN = /\battar|\bfragrance oil|\bperfume\b|\bbakhoor\b|\boud\b/
const NON_FRAGRANCE_CATEGORY_PATTERN =
  /bottle|cap\b|caps\b|canter|pump|spray bottle|box|jar|face wash|carrier|dpg|dilution|packing/
export function isFragranceProduct(product) {
  const category = String(
    product?.category_name ?? product?.category ?? ''
  ).toLowerCase()
  return FRAGRANCE_CATEGORY_PATTERN.test(category)
}

// Returns the product's family ids in canonical FAMILY_ORDER order.
export function getProductFamilies(product) {
  if (!isFragranceProduct(product)) return []
  const text = `${String(product?.name ?? '')} ${String(
    product?.description ?? ''
  )}`.toLowerCase()
  return FAMILY_ORDER.filter((family) =>
    FAMILY_MATCHERS[family].some((matcher) => matcher.test(text))
  )
}

// Filter-group/shallow-link options in `{ id, name }` shape — this is the
// exact shape FilterSortControl expects for its option buttons.
export const FAMILY_FILTERS = FAMILY_ORDER.map((family) => ({
  id: family,
  name: family.charAt(0).toUpperCase() + family.slice(1),
}))

// Accepts shared deep links like /shop?family=musk.
export function isValidFamilyParam(value) {
  return FAMILY_ORDER.includes(value)
}

// 'oud' → 'Oud'. Unknown ids fall back to the raw value (never crash).
export function getFamilyLabel(value) {
  const match = FAMILY_FILTERS.find((family) => family.id === value)
  return match ? match.name : String(value ?? '')
}
