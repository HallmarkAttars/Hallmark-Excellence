const supabase = require('../config/supabase')

// GET /api/brands
// Public.
async function getBrands(req, res) {
  try {
    const { data, error } = await supabase
      .from('brands')
      .select('*')
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

module.exports = { getBrands, getBrandProducts, updateBrandBulkPricing }
