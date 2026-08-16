// Renames the DAHAB brand from "Dahab 8ml" to "Dahab 6ml" in the database.
//
//   node scripts/renameDahabBrand.js
//
// The brand display name (brands.name) drives EVERY user-facing surface —
// brand page hero heading, brand cards, nav dropdown, mobile menu, product
// cards, product pages, homepage brand sections, search results and filter
// labels — so this one scoped update fixes the whole storefront.
//
// SAFETY:
//   • Touches ONLY the single row where slug = 'dahab'.
//   • Replaces only the "8ml" part of the name (case/space tolerant),
//     preserving the surrounding text and the casing of the "ml" suffix.
//   • Idempotent — safe to re-run; no-ops once the name already says 6ml.
//   • Never touches other brands (e.g. Arees 8ml stays as-is), products,
//     images, pricing or inventory.

require('dotenv').config()
const supabase = require('../src/config/supabase')

const DAHAB_SLUG = 'dahab'
const FALLBACK_NAME = 'Dahab 6ml'

// Replace "8ml" / "8 ML" with the same-width "6" (preserves the ml casing
// and any inner space: "8ML" → "6ML", "8 ml" → "6 ml").
function swapSizeTo6ml(text) {
  return String(text).replace(/8\s*ml/gi, (match) => match.replace(/8/gi, '6'))
}

function nextName(current) {
  const name = String(current || '')
  if (/6\s*ml/i.test(name)) return name // already 6ml — leave it
  if (/8\s*ml/i.test(name)) return swapSizeTo6ml(name)
  return FALLBACK_NAME // plain "Dahab" or anything else — canonical name
}

function nextCollectionLabel(current) {
  const label = String(current || '')
  return /8\s*ml/i.test(label) ? swapSizeTo6ml(label) : label
}

async function main() {
  const { data: brand, error: findError } = await supabase
    .from('brands')
    .select('id, name, collection_label')
    .eq('slug', DAHAB_SLUG)
    .maybeSingle()

  if (findError) throw findError

  if (!brand) {
    console.error(`✗ No brand row found with slug '${DAHAB_SLUG}' — nothing to rename.`)
    process.exit(1)
  }

  const newName = nextName(brand.name)
  const newLabel = nextCollectionLabel(brand.collection_label)

  console.log('Before:')
  console.log(`  name:              ${brand.name}`)
  console.log(`  collection_label:  ${brand.collection_label || '(null)'}`)

  if (newName === brand.name && newLabel === (brand.collection_label || '')) {
    console.log('\n✓ Already correct — the Dahab brand name is already 6ml. Nothing to update.')
    return
  }

  const { error: updateError } = await supabase
    .from('brands')
    .update({ name: newName, collection_label: newLabel })
    .eq('id', brand.id)

  if (updateError) throw updateError

  // Verify.
  const { data: after, error: checkError } = await supabase
    .from('brands')
    .select('name, collection_label')
    .eq('slug', DAHAB_SLUG)
    .maybeSingle()

  if (checkError) throw checkError

  console.log('After:')
  console.log(`  name:              ${after.name}`)
  console.log(`  collection_label:  ${after.collection_label || '(null)'}`)
  console.log('\n✓ Dahab brand renamed to 6ml.')
}

main().catch((err) => {
  console.error('Unexpected error:', err.message)
  process.exit(1)
})
