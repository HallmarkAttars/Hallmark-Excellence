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

module.exports = { getBrands, getBrandProducts }
