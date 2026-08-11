const supabase = require('../config/supabase')
const {
  attachVariants,
  fetchVariantsByProducts,
} = require('./products.controller')
const {
  applyProductOrder,
  isMissingOrderColumnError,
} = require('../utils/displayOrder')

// GET /api/brands
// Public — returns ONLY active brands (inactive brands are hidden from the
// storefront). Ordering is left to the client (storefront sorts by
// display_order) so this endpoint keeps working before/after migrations.
async function getBrands(req, res) {
  try {
    const { data, error } = await supabase
      .from('brands')
      .select('*')
      .eq('is_active', true)
      .order('name', { ascending: true })

    if (error) {
      console.error('getBrands error:', error)
      return res.status(500).json({ error: 'Failed to fetch brands.' })
    }

    return res.json({ brands: data })
  } catch (err) {
    console.error('getBrands error:', err)
    return res.status(500).json({ error: 'Internal server error' })
  }
}

// GET /api/admin/brands
// Protected (requirePermission 'brands.view'). Returns ALL brands — active
// AND inactive — so the admin brand management screen can edit/reactivate
// any brand. Same no-server-order policy as the public endpoint.
async function getAdminBrands(req, res) {
  try {
    const { data, error } = await supabase
      .from('brands')
      .select('*')
      .order('name', { ascending: true })

    if (error) {
      console.error('getAdminBrands error:', error)
      return res.status(500).json({ error: 'Failed to fetch brands.' })
    }

    return res.json({ brands: data })
  } catch (err) {
    console.error('getAdminBrands error:', err)
    return res.status(500).json({ error: 'Internal server error' })
  }
}

// GET /api/brands/:slug/products
// Public. 404 if brand slug not found.
async function getBrandProducts(req, res) {
  try {
    const { slug } = req.params

    const { data: brand, error: brandError } = await supabase
      .from('brands')
      .select('*')
      .eq('slug', slug)
      .maybeSingle()

    if (brandError) {
      console.error('getBrandProducts lookup error:', brandError)
      return res.status(500).json({ error: 'Failed to fetch brand.' })
    }
    if (!brand) {
      return res.status(404).json({ error: 'Brand not found.' })
    }

    // For Arees and Dahab brands, only return products in the Attar category
    let attarCategoryId = null
    if (slug === 'arees' || slug === 'dahab') {
      const { data: attarCat } = await supabase
        .from('categories')
        .select('id')
        .eq('slug', 'attar')
        .maybeSingle()
      if (attarCat) attarCategoryId = attarCat.id
    }

    // NOTE: PostgREST builders are MUTATED by .order(), so every attempt
    // must build a fresh query — never reuse a builder that already had an
    // order applied to it.
    const buildBrandProducts = (useOrder) => {
      let q = supabase
        .from('products')
        .select(`
          id, name, description, price, compare_at_price,
          rating, review_count, is_featured, image,
          category_id, brand_id, is_active, created_at,
          categories ( id, name, slug )
        `)
        .eq('brand_id', brand.id)
        .eq('is_active', true)
      if (attarCategoryId) {
        q = q.eq('category_id', attarCategoryId)
      }
      return applyProductOrder(q, useOrder)
    }

    // Manual display order (admin-controlled), then newest first. Falls back
    // to newest-first ordering when the display_order migration hasn't been
    // applied yet. Never alphabetical.
    let orderRes = await buildBrandProducts(true)
    if (isMissingOrderColumnError(orderRes.error)) {
      console.warn('[brands] display_order column missing — run server/db/migration_add_display_order.sql to enable manual product ordering.')
      orderRes = await buildBrandProducts(false)
    }
    const { data: products, error: prodError } = orderRes

    if (prodError) {
      console.error('getBrandProducts products error:', prodError)
      return res.status(500).json({ error: 'Failed to fetch products.' })
    }

    const flattened = products.map(({ categories, ...rest }) => ({
      ...rest,
      category_name: categories?.name || null,
      category_slug: categories?.slug || null,
    }))

    // Attach variants so brand-page cards show the default variant's TOTAL
    // price and the variant list — identical behaviour to /api/products.
    let variantsByProduct = {}
    try {
      variantsByProduct = await fetchVariantsByProducts(flattened.map((r) => r.id))
    } catch (varErr) {
      console.error('getBrandProducts fetchVariants error:', varErr)
    }

    return res.json({ brand, products: attachVariants(flattened, variantsByProduct) })
  } catch (err) {
    console.error('getBrandProducts error:', err)
    return res.status(500).json({ error: 'Internal server error' })
  }
}

// PUT /api/admin/brands/:id
// Protected (requirePermission 'brands.edit'). Updates the STOREFRONT
// MANAGEMENT fields of a brand (copy, imagery, position, display type,
// active state). The bulk-pricing fields are NOT writable here — they are
// owned exclusively by PATCH /api/admin/brands/:id (updateBrandBulkPricing),
// so the two concerns never step on each other.
//
// Validation:
//   - name            required, non-empty string
//   - display_order   whole number >= 0
//   - display_type    'featured' | 'standard'
//   - is_active       boolean
//   - everything else optional text/image URLs (empty → null)
async function updateBrandDetails(req, res) {
  try {
    const { id } = req.params
    const body = req.body || {}

    if (body.name !== undefined && (typeof body.name !== 'string' || !body.name.trim())) {
      return res.status(400).json({ error: 'Brand name is required.' })
    }

    const updates = {}

    if (body.name !== undefined) updates.name = body.name.trim()

    for (const field of ['collection_label', 'tagline', 'description', 'long_description']) {
      if (body[field] !== undefined) {
        updates[field] = typeof body[field] === 'string' && body[field].trim() ? body[field].trim() : null
      }
    }

    for (const field of ['logo_url', 'cover_image_url', 'card_image_url']) {
      if (body[field] !== undefined) {
        updates[field] = typeof body[field] === 'string' && body[field].trim() ? body[field].trim() : null
      }
    }

    if (body.display_order !== undefined) {
      const order = Number(body.display_order)
      if (!Number.isInteger(order) || order < 0) {
        return res.status(400).json({ error: 'Display position must be a whole number 0 or greater.' })
      }
      updates.display_order = order
    }

    if (body.display_type !== undefined) {
      if (body.display_type !== 'featured' && body.display_type !== 'standard') {
        return res.status(400).json({ error: 'Homepage display type must be "featured" or "standard".' })
      }
      updates.display_type = body.display_type
    }

    if (body.is_active !== undefined) {
      updates.is_active = Boolean(body.is_active)
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'No brand fields to update.' })
    }

    const { data, error } = await supabase
      .from('brands')
      .update(updates)
      .eq('id', id)
      .select('*')
      .maybeSingle()

    if (error) {
      console.error('updateBrandDetails error:', error)
      return res.status(500).json({ error: 'Failed to update brand.' })
    }
    if (!data) {
      return res.status(404).json({ error: 'Brand not found.' })
    }

    return res.json({ brand: data })
  } catch (err) {
    console.error('updateBrandDetails error:', err)
    return res.status(500).json({ error: 'Internal server error' })
  }
}

// PATCH /api/admin/brands/:id/bulk-pricing
// Protected (requirePermission 'brands.edit'). The ONLY writer of the
// brand-level bulk-pricing columns (bulk_enabled / standard_price /
// bulk_unit_price / bulk_min_qty). The storefront-management PUT above
// deliberately never touches these — the two concerns stay independent.
//
// One rule belongs to ONE brand (the brands row IS the rule), so duplicate
// active rules are structurally impossible — the admin add-form simply
// hides brands that already have a rule.
//
// Request body:
//   bulk_enabled     boolean (required) — master on/off switch
//   When enabling, all three values are required and validated:
//   standard_price   number > 0           — reference normal per-piece price
//   bulk_unit_price  number, 0 < x < standard_price — discounted per-piece
//   bulk_min_qty     whole number > 0     — combined pieces to unlock
//   When disabling, values are optional; explicit nulls clear the row.
async function updateBrandBulkPricing(req, res) {
  try {
    const { id } = req.params
    const body = req.body || {}

    if (body.bulk_enabled === undefined) {
      return res.status(400).json({ error: 'bulk_enabled is required.' })
    }

    const enabled = Boolean(body.bulk_enabled)
    const updates = { bulk_enabled: enabled }

    if (enabled) {
      const std = Number(body.standard_price)
      const bulk = Number(body.bulk_unit_price)
      const min = Number(body.bulk_min_qty)

      if (body.standard_price === '' || body.standard_price == null || !Number.isFinite(std) || std <= 0) {
        return res.status(400).json({ error: 'Normal price must be a number greater than 0.' })
      }
      if (body.bulk_unit_price === '' || body.bulk_unit_price == null || !Number.isFinite(bulk) || bulk <= 0) {
        return res.status(400).json({ error: 'Bulk price must be a number greater than 0.' })
      }
      if (bulk >= std) {
        return res.status(400).json({ error: 'Bulk price must be less than the normal price.' })
      }
      if (body.bulk_min_qty === '' || body.bulk_min_qty == null || !Number.isInteger(min) || min < 1) {
        return res.status(400).json({ error: 'Bulk unlock quantity must be a whole number greater than 0.' })
      }

      updates.standard_price = std
      updates.bulk_unit_price = bulk
      updates.bulk_min_qty = min
    } else if (body.standard_price !== undefined) {
      // Disabling: accept explicit clears (Remove / reset), otherwise leave
      // the stored values alone so re-enabling is one click.
      updates.standard_price = body.standard_price == null ? null : Number(body.standard_price)
      updates.bulk_unit_price = body.bulk_unit_price == null ? null : Number(body.bulk_unit_price)
      updates.bulk_min_qty = body.bulk_min_qty == null ? null : Number(body.bulk_min_qty)
    }

    const { data, error } = await supabase
      .from('brands')
      .update(updates)
      .eq('id', id)
      .select('*')
      .maybeSingle()

    if (error) {
      // Pre-migration DB — the bulk columns do not exist yet.
      if (/does not exist|could not find/i.test(error.message)) {
        return res.status(400).json({
          error: 'Brand bulk pricing is not available yet. Run migration_add_brand_bulk_pricing.sql in the Supabase SQL editor first.',
        })
      }
      console.error('updateBrandBulkPricing error:', error)
      return res.status(500).json({ error: 'Failed to update bulk pricing.' })
    }
    if (!data) {
      return res.status(404).json({ error: 'Brand not found.' })
    }

    return res.json({ brand: data })
  } catch (err) {
    console.error('updateBrandBulkPricing error:', err)
    return res.status(500).json({ error: 'Internal server error' })
  }
}

module.exports = { getBrands, getAdminBrands, getBrandProducts, updateBrandDetails, updateBrandBulkPricing }
