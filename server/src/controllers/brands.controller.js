const supabase = require('../config/supabase')

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

    let query = supabase
      .from('products')
      .select(`
        id, name, description, price, compare_at_price, bulk_price, bulk_min_qty, bulk_enabled,
        rating, review_count, is_featured, stock, image,
        category_id, brand_id, is_active, created_at,
        categories ( id, name, slug )
      `)
      .eq('brand_id', brand.id)
      .eq('is_active', true)

    if (attarCategoryId) {
      query = query.eq('category_id', attarCategoryId)
    }

    const { data: products, error: prodError } = await query
      .order('created_at', { ascending: false })

    if (prodError) {
      console.error('getBrandProducts products error:', prodError)
      return res.status(500).json({ error: 'Failed to fetch products.' })
    }

    const flattened = products.map(({ categories, ...rest }) => ({
      ...rest,
      category_name: categories?.name || null,
      category_slug: categories?.slug || null,
    }))

    return res.json({ brand, products: flattened })
  } catch (err) {
    console.error('getBrandProducts error:', err)
    return res.status(500).json({ error: 'Internal server error' })
  }
}

// PATCH /api/admin/brands/:id
// Protected (requirePermission 'brands.edit'). Updates ONLY the combined
// brand bulk pricing fields (bulk_enabled, standard_price, bulk_unit_price,
// bulk_min_qty) — no other brand attribute is writable here.
//
// Rules mirror the admin form (utils/bulkValidation.js):
//   - bulk_enabled = false → the pricing fields are forced to NULL (a brand
//     switched OFF never leaks stale bulk values to the storefront).
//   - bulk_enabled = true  → standard_price and bulk_unit_price must be
//     numbers > 0, bulk_unit_price strictly below standard_price, and
//     bulk_min_qty a whole number > 1.
async function updateBrandBulkPricing(req, res) {
  try {
    const { id } = req.params
    const { bulk_enabled, standard_price, bulk_unit_price, bulk_min_qty } = req.body

    if (bulk_enabled === undefined) {
      return res.status(400).json({ error: 'bulk_enabled is required.' })
    }

    const isBulkEnabled = bulk_enabled === true

    if (isBulkEnabled) {
      const standard = standard_price === '' || standard_price == null ? NaN : Number(standard_price)
      if (!Number.isFinite(standard) || standard <= 0) {
        return res.status(400).json({ error: 'Standard price is required and must be greater than 0 when combined bulk pricing is enabled.' })
      }
      const bulk = bulk_unit_price === '' || bulk_unit_price == null ? NaN : Number(bulk_unit_price)
      if (!Number.isFinite(bulk) || bulk <= 0) {
        return res.status(400).json({ error: 'Bulk unit price is required and must be greater than 0 when combined bulk pricing is enabled.' })
      }
      if (bulk >= standard) {
        return res.status(400).json({ error: 'Bulk unit price must be lower than the standard price.' })
      }
      const qty = bulk_min_qty === '' || bulk_min_qty == null ? NaN : Number(bulk_min_qty)
      if (!Number.isInteger(qty) || qty < 2) {
        return res.status(400).json({ error: 'Combined quantity threshold is required and must be a whole number greater than 1 when combined bulk pricing is enabled.' })
      }
    }

    const updates = {
      bulk_enabled: isBulkEnabled,
      // Disabling clears the stored values so the storefront never surfaces
      // stale brand bulk data for a bulk-off brand.
      standard_price: isBulkEnabled ? standard_price ?? null : null,
      bulk_unit_price: isBulkEnabled ? bulk_unit_price ?? null : null,
      bulk_min_qty: isBulkEnabled ? bulk_min_qty ?? null : null,
    }

    const { data, error } = await supabase
      .from('brands')
      .update(updates)
      .eq('id', id)
      .select('*')
      .maybeSingle()

    if (error) {
      console.error('updateBrandBulkPricing error:', error)
      return res.status(500).json({ error: 'Failed to update brand bulk pricing.' })
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

module.exports = { getBrands, getAdminBrands, getBrandProducts, updateBrandBulkPricing, updateBrandDetails }
