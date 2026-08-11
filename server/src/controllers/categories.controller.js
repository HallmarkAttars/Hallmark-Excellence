const supabase = require('../config/supabase')
const {
  applyCategoryOrder,
  applyProductOrder,
  isMissingOrderColumnError,
} = require('../utils/displayOrder')

// Builds { category_id: count } from the products table.
// `activeOnly` controls whether inactive products count toward the total.
async function buildProductCounts(activeOnly) {
  let query = supabase.from('products').select('category_id')
  if (activeOnly) query = query.eq('is_active', true)

  const { data, error } = await query
  if (error) throw error

  const counts = {}
  for (const row of data) {
    if (!row.category_id) continue
    counts[row.category_id] = (counts[row.category_id] || 0) + 1
  }
  return counts
}

// GET /api/categories
// Public. Admin-defined display order, includes product_count (active only).
async function getCategories(req, res) {
  try {
    // Manual display order; falls back to insertion order (created_at asc)
    // when the display_order migration hasn't been applied yet. Never
    // alphabetical.
    let catRes = await applyCategoryOrder(supabase.from('categories').select('*'))
    if (isMissingOrderColumnError(catRes.error)) {
      console.warn('[categories] display_order column missing — run server/db/migration_add_display_order.sql to enable manual ordering.')
      catRes = await supabase
        .from('categories')
        .select('*')
        .order('created_at', { ascending: true })
    }
    const { data, error } = catRes

    if (error) {
      console.error('getCategories error:', error)
      return res.status(500).json({ error: 'Failed to fetch categories.' })
    }

    const counts = await buildProductCounts(true)

    // Filter out hidden categories from public view (e.g., "Attar" is admin-only)
    const categories = data
      .filter((c) => c.slug !== 'attar')
      .map((c) => ({ ...c, product_count: counts[c.id] || 0 }))

    return res.json({ categories })
  } catch (err) {
    console.error('getCategories error:', err)
    return res.status(500).json({ error: 'Internal server error' })
  }
}

// GET /api/categories/:slug/products
// Public. 404 if category slug not found.
async function getCategoryProducts(req, res) {
  try {
    const { slug } = req.params

    const { data: category, error: catError } = await supabase
      .from('categories')
      .select('*')
      .eq('slug', slug)
      .maybeSingle()

    if (catError) {
      console.error('getCategoryProducts lookup error:', catError)
      return res.status(500).json({ error: 'Failed to fetch category.' })
    }
    if (!category) {
      return res.status(404).json({ error: 'Category not found.' })
    }

    const categoryProductSelect = `
      id, name, description, price, compare_at_price,
      rating, review_count, is_featured, image,
      category_id, brand_id, is_active, created_at,
      brands ( id, name, slug )
    `
    const buildCategoryProducts = (useOrder) =>
      applyProductOrder(
        supabase
          .from('products')
          .select(categoryProductSelect)
          .eq('category_id', category.id)
          .eq('is_active', true),
        useOrder
      )

    // Manual display order first (admin-controlled), then newest first for
    // products without a configured position. Never alphabetical. Falls back
    // to newest-first ordering when the display_order migration hasn't been
    // applied to the database yet.
    let { data: products, error: prodError } = await buildCategoryProducts(true)
    if (prodError && isMissingOrderColumnError(prodError)) {
      ;({ data: products, error: prodError } = await buildCategoryProducts(false))
    }

    if (prodError) {
      console.error('getCategoryProducts products error:', prodError)
      return res.status(500).json({ error: 'Failed to fetch products.' })
    }

    const flattened = products.map(({ brands, ...rest }) => ({
      ...rest,
      brand_name: brands?.name || null,
      brand_slug: brands?.slug || null,
    }))

    return res.json({ category, products: flattened })
  } catch (err) {
    console.error('getCategoryProducts error:', err)
    return res.status(500).json({ error: 'Internal server error' })
  }
}

// GET /api/admin/categories
// Protected. All categories with product count (all products, active + inactive),
// in the same manual display order as the public endpoint.
async function getAdminCategories(req, res) {
  try {
    // Same manual display order as the public endpoint (with the same
    // pre-migration fallback to insertion order).
    let catRes = await applyCategoryOrder(supabase.from('categories').select('*'))
    if (isMissingOrderColumnError(catRes.error)) {
      console.warn('[categories] display_order column missing — run server/db/migration_add_display_order.sql to enable manual ordering.')
      catRes = await supabase
        .from('categories')
        .select('*')
        .order('created_at', { ascending: true })
    }
    const { data, error } = catRes

    if (error) {
      console.error('getAdminCategories error:', error)
      return res.status(500).json({ error: 'Failed to fetch categories.' })
    }

    const counts = await buildProductCounts(false)
    const categories = data.map((c) => ({ ...c, product_count: counts[c.id] || 0 }))

    return res.json({ categories })
  } catch (err) {
    console.error('getAdminCategories error:', err)
    return res.status(500).json({ error: 'Internal server error' })
  }
}

// POST /api/admin/categories
// Protected. name and slug required; slug must be unique (409 if duplicate).
async function createCategory(req, res) {
  try {
    const { name, slug, image, display_order } = req.body

    if (!name || !slug) {
      return res.status(400).json({ error: 'name and slug are required.' })
    }

    // Optional explicit position. When omitted, the new category is placed at
    // the END (max display_order + 1) — never inserted alphabetically.
    let order = display_order
    if (order !== undefined) {
      order = Number(order)
      if (!Number.isInteger(order) || order < 0) {
        return res.status(400).json({ error: 'Display position must be a whole number 0 or greater.' })
      }
    } else {
      // End-of-list position: max display_order + 1. Falls back to null
      // (column not written) when the migration hasn't been applied yet.
      const { data: maxRow, error: maxErr } = await supabase
        .from('categories')
        .select('display_order')
        .order('display_order', { ascending: false })
        .limit(1)
      if (maxErr && isMissingOrderColumnError(maxErr)) {
        order = null
      } else {
        order = (maxRow?.[0]?.display_order ?? 0) + 1
      }
    }

    const { data: existing, error: findError } = await supabase
      .from('categories')
      .select('id')
      .eq('slug', slug)
      .maybeSingle()

    if (findError) {
      console.error('createCategory lookup error:', findError)
      return res.status(500).json({ error: 'Failed to create category.' })
    }
    if (existing) {
      return res.status(409).json({ error: `A category with slug "${slug}" already exists.` })
    }

    // display_order is omitted entirely when the column is missing
    // (pre-migration), so category creation never breaks mid-deploy.
    const insertPayload = { name, slug, image: image ?? null }
    if (order != null) insertPayload.display_order = order

    const { data, error } = await supabase
      .from('categories')
      .insert(insertPayload)
      .select('*')
      .single()

    if (error) {
      console.error('createCategory error:', error)
      return res.status(500).json({ error: 'Failed to create category.' })
    }

    return res.status(201).json({ category: { ...data, product_count: 0 } })
  } catch (err) {
    console.error('createCategory error:', err)
    return res.status(500).json({ error: 'Internal server error' })
  }
}

// PATCH /api/admin/categories/:id
// Protected. All fields optional. 404 if not found. 409 if new slug collides.
async function updateCategory(req, res) {
  try {
    const { id } = req.params
    const { name, slug, image, display_order } = req.body

    const { data: existing, error: findError } = await supabase
      .from('categories')
      .select('id')
      .eq('id', id)
      .maybeSingle()

    if (findError) {
      console.error('updateCategory lookup error:', findError)
      return res.status(500).json({ error: 'Failed to update category.' })
    }
    if (!existing) {
      return res.status(404).json({ error: 'Category not found.' })
    }

    if (slug !== undefined) {
      const { data: slugClash, error: slugError } = await supabase
        .from('categories')
        .select('id')
        .eq('slug', slug)
        .neq('id', id)
        .maybeSingle()

      if (slugError) {
        console.error('updateCategory slug check error:', slugError)
        return res.status(500).json({ error: 'Failed to update category.' })
      }
      if (slugClash) {
        return res.status(409).json({ error: `A category with slug "${slug}" already exists.` })
      }
    }

    const updates = {}
    if (name !== undefined) updates.name = name
    if (slug !== undefined) updates.slug = slug
    if (image !== undefined) updates.image = image
    if (display_order !== undefined) {
      const order = Number(display_order)
      if (!Number.isInteger(order) || order < 0) {
        return res.status(400).json({ error: 'Display position must be a whole number 0 or greater.' })
      }
      updates.display_order = order
    }

    let result = await supabase
      .from('categories')
      .update(updates)
      .eq('id', id)
      .select('*')
      .single()

    // Pre-migration fallback: retry without display_order when that column
    // doesn't exist yet, so the reorder save on the admin page never 500s.
    if (result.error && updates.display_order !== undefined && isMissingOrderColumnError(result.error)) {
      console.warn('[categories] display_order column missing — run server/db/migration_add_display_order.sql to enable manual ordering.')
      if (Object.keys(updates).length === 1) {
        // display_order is the ONLY field being saved — there is nothing
        // else to persist (an empty UPDATE is rejected by PostgREST).
        // Return the current row, which simply has no display_order yet, so
        // the admin page can show the migration hint instead of a hard error.
        const { data: row, error: rowErr } = await supabase
          .from('categories')
          .select('*')
          .eq('id', id)
          .maybeSingle()
        result = { data: row, error: rowErr }
      } else {
        const { display_order, ...rest } = updates
        result = await supabase
          .from('categories')
          .update(rest)
          .eq('id', id)
          .select('*')
          .single()
      }
    }
    const { data, error } = result

    if (error) {
      console.error('updateCategory error:', error)
      return res.status(500).json({ error: 'Failed to update category.' })
    }

    return res.json({ category: data })
  } catch (err) {
    console.error('updateCategory error:', err)
    return res.status(500).json({ error: 'Internal server error' })
  }
}

// DELETE /api/admin/categories/:id
// Protected. Blocked if any product still references this category.
async function deleteCategory(req, res) {
  try {
    const { id } = req.params

    const { data: existing, error: findError } = await supabase
      .from('categories')
      .select('id')
      .eq('id', id)
      .maybeSingle()

    if (findError) {
      console.error('deleteCategory lookup error:', findError)
      return res.status(500).json({ error: 'Failed to delete category.' })
    }
    if (!existing) {
      return res.status(404).json({ error: 'Category not found.' })
    }

    const { count, error: countError } = await supabase
      .from('products')
      .select('id', { count: 'exact', head: true })
      .eq('category_id', id)

    if (countError) {
      console.error('deleteCategory count error:', countError)
      return res.status(500).json({ error: 'Failed to delete category.' })
    }

    if (count > 0) {
      return res.status(400).json({
        error: 'Cannot delete category with existing products. Reassign products first.',
      })
    }

    const { error } = await supabase.from('categories').delete().eq('id', id)

    if (error) {
      console.error('deleteCategory error:', error)
      return res.status(500).json({ error: 'Failed to delete category.' })
    }

    return res.json({ success: true })
  } catch (err) {
    console.error('deleteCategory error:', err)
    return res.status(500).json({ error: 'Internal server error' })
  }
}

module.exports = {
  getCategories,
  getCategoryProducts,
  getAdminCategories,
  createCategory,
  updateCategory,
  deleteCategory,
}
