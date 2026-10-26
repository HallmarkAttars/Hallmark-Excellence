// Shared rules for the per-product loose-piece quantity mode.
//
// The exact-piece flag normally lives in products.sell_exact_pieces, but this
// project's production database does not have that column yet. Until the
// migration is applied, the setting is mirrored by hidden markers at the end
// of products.description; every API response strips them.

const EXACT_MARKER = '<!--sell-exact-pieces-->'
const PACK_MARKER = '<!--sell-exact-pieces:off-->'
const MODE_MARKER_RE = /\s*<!--\s*sell-exact-pieces(?::off)?\s*-->\s*$/i

function normalize(value) {
  return String(value ?? '').trim().toLowerCase()
}

function isFragranceOilCategory(category) {
  const name = normalize(category?.name ?? category?.category_name)
  const slug = normalize(category?.slug ?? category?.category_slug)
  return (
    name === 'fragrance oil' ||
    slug === '10' ||
    slug === 'fragrance oil' ||
    slug === 'fragrance-oil'
  )
}

function isFragranceOilProduct(product) {
  return isFragranceOilCategory({
    name: product?.category_name,
    slug: product?.category_slug,
  })
}

function isPiecesUnit(unit) {
  const value = normalize(unit)
  return value === 'piece' || value === 'pieces' || value === 'pc' || value === 'pcs'
}

function hasPiecesVariant(variants) {
  return Array.isArray(variants) && variants.some((v) => isPiecesUnit(v?.quantity_unit))
}

function stripModeMarkers(description) {
  if (typeof description !== 'string') return description ?? null
  let cleaned = description
  while (MODE_MARKER_RE.test(cleaned)) {
    cleaned = cleaned.replace(MODE_MARKER_RE, '')
  }
  cleaned = cleaned.trimEnd()
  return cleaned || null
}

function hasExactMarker(description) {
  return typeof description === 'string' && description.includes(EXACT_MARKER)
}

function hasPackMarker(description) {
  return typeof description === 'string' && description.includes(PACK_MARKER)
}

function resolveExactPiecesFlag(description, columnValue) {
  if (hasPackMarker(description)) return false
  return columnValue === true || hasExactMarker(description)
}

function withExactPiecesMode(description, enabled, explicit = false) {
  const base = stripModeMarkers(description)
  if (!enabled && !explicit) return base
  const marker = enabled ? EXACT_MARKER : PACK_MARKER
  return base ? `${base}\n\n${marker}` : marker
}

module.exports = {
  EXACT_MARKER,
  PACK_MARKER,
  isFragranceOilCategory,
  isFragranceOilProduct,
  isPiecesUnit,
  hasPiecesVariant,
  stripModeMarkers,
  hasExactMarker,
  hasPackMarker,
  resolveExactPiecesFlag,
  withExactPiecesMode,
}
