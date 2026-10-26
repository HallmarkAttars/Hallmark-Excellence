// One-time (idempotent) data backfill: every existing non-Fragrance Oil
// product with a Pieces variant moves to loose exact pieces unless an admin
// already chose the explicit pack/roll mode.

const supabase = require('../config/supabase')
const {
  isFragranceOilCategory,
  isPiecesUnit,
  hasExactMarker,
  hasPackMarker,
  withExactPiecesMode,
} = require('./exactPieces')

const BATCH_SIZE = 10

function inBatches(items, size) {
  const batches = []
  for (let i = 0; i < items.length; i += size) {
    batches.push(items.slice(i, i + size))
  }
  return batches
}

async function runExactPiecesBackfill() {
  const { data: categories, error: categoryError } = await supabase
    .from('categories')
    .select('id, name, slug')
  if (categoryError) throw categoryError

  const fragranceOilIds = new Set(
    (categories || [])
      .filter((category) => isFragranceOilCategory(category))
      .map((category) => String(category.id))
  )

  const { data: variants, error: variantError } = await supabase
    .from('product_variants')
    .select('product_id, quantity_unit')
  if (variantError) throw variantError

  const productIds = [
    ...new Set(
      (variants || [])
        .filter((variant) => isPiecesUnit(variant.quantity_unit))
        .map((variant) => variant.product_id)
    ),
  ]
  if (productIds.length === 0) return { updated: 0, total: 0 }

  const { data: products, error: productError } = await supabase
    .from('products')
    .select('id, description, category_id')
    .in('id', productIds)
  if (productError) throw productError

  const pending = []
  for (const product of products || []) {
    if (fragranceOilIds.has(String(product.category_id))) continue
    if (hasExactMarker(product.description) || hasPackMarker(product.description)) continue
    const description = withExactPiecesMode(product.description, true, true)
    if (description !== product.description) {
      pending.push({ id: product.id, description })
    }
  }

  let updated = 0
  for (const batch of inBatches(pending, BATCH_SIZE)) {
    const results = await Promise.all(
      batch.map((product) =>
        supabase
          .from('products')
          .update({ description: product.description })
          .eq('id', product.id)
      )
    )
    results.forEach(({ error }) => {
      if (error) {
        console.error('[exact-pieces-backfill] update failed:', error.message)
      } else {
        updated += 1
      }
    })
  }

  if (updated > 0) {
    console.log(`[exact-pieces-backfill] enabled loose exact pieces on ${updated} products`)
  }
  return { updated, total: productIds.length }
}

module.exports = { runExactPiecesBackfill }
