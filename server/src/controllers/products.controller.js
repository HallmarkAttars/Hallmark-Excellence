 const supabase = require('../config/supabase')

const PRODUCT_SELECT = `
  id, name, description, price, stock,
  category_id, brand_id, image, is_active, created_at,
  categories ( id, name, slug ),
  brands ( id, name, slug )
`

function flattenProduct(row) {
  if (!row) return null
  const { categories, brands, ...rest } = row
  return {
    ...rest,
    category_name: categories?.name || null,
    category_slug: categories?.slug || null,
    brand_name: brands?.name || null,
    brand_slug: brands?.slug || null,
  }
}

// GET /api/products
// Public. Only active products. Supports ?category_id= &brand_id= &search= &sort=
async function getProducts(req, res) {
  try {
    const { category_id, brand_id, search, sort } = req.query

    let query = supabase
      .from('products')
      .select(PRODUCT_SELECT)
      .eq('is_active', true)

    if (category_id) query = query.eq('category_id', category_id)
    if (brand_id) query = query.eq('brand_id', brand_id)
    if (search) query = query.ilike('name', `%${search}%`)

    if (sort === 'price_asc') {
      query = query.order('price', { ascending: true })
    } else if (sort === 'price_desc') {
      query = query.order('price', { ascending: false })
    } else {
      query = query.order('created_at', { ascending: false })
    }

    const { data, error } = await query

    if (error) {
      console.error('getProducts error:', error)
      return res.status(500).json({ error: 'Failed to fetch products.' })
    }

    return res.json({ products: data.map(flattenProduct) })
  } catch (err) {
    console.error('getProducts error:', err)
    return res.status(500).json({ error: 'Internal server error' })
  }
}

// GET /api/products/:id
// Public. 404 if not found or not active.
async function getProductById(req, res) {
  try {
    const { id } = req.params

    const { data, error } = await supabase
      .from('products')
      .select(PRODUCT_SELECT)
      .eq('id', id)
      .eq('is_active', true)
      .maybeSingle()

    if (error) {
      console.error('getProductById error:', error)
      return res.status(500).json({ error: 'Failed to fetch product.' })
    }

    if (!data) {
      return res.status(404).json({ error: 'Product not found.' })
    }

    return res.json({ product: flattenProduct(data) })
  } catch (err) {
    console.error('getProductById error:', err)
    return res.status(500).json({ error: 'Internal server error' })
  }
}

// GET /api/products/:id/related
// Public. Other active products in the same category, excluding itself.
// Falls back to same-brand products if the item has no category, then to
// newest active products in general if still empty.
async function getRelatedProducts(req, res) {
  try {
    const { id } = req.params
    const limit = Math.min(parseInt(req.query.limit, 10) || 4, 20)

    const { data: source, error: findError } = await supabase
      .from('products')
      .select('id, category_id, brand_id')
      .eq('id', id)
      .maybeSingle()

    if (findError) {
      console.error('getRelatedProducts lookup error:', findError)
      return res.status(500).json({ error: 'Failed to fetch related products.' })
    }
    if (!source) {
      return res.status(404).json({ error: 'Product not found.' })
    }

    async function fetchRelated(column, value) {
      if (!value) return []
      const { data, error } = await supabase
        .from('products')
        .select(PRODUCT_SELECT)
        .eq(column, value)
        .eq('is_active', true)
        .neq('id', id)
        .order('created_at', { ascending: false })
        .limit(limit)
      if (error) throw error
      return data
    }

    let related = await fetchRelated('category_id', source.category_id)

    if (related.length === 0) {
      related = await fetchRelated('brand_id', source.brand_id)
    }

    if (related.length === 0) {
      const { data, error } = await supabase
        .from('products')
        .select(PRODUCT_SELECT)
        .eq('is_active', true)
        .neq('id', id)
        .order('created_at', { ascending: false })
        .limit(limit)
      if (error) throw error
      related = data
    }

    return res.json({ products: related.map(flattenProduct) })
  } catch (err) {
    console.error('getRelatedProducts error:', err)
    return res.status(500).json({ error: 'Internal server error' })
  }
}

// GET /api/admin/products/:id
// Protected. Any product regardless of active status — used by the admin edit form.
async function getAdminProductById(req, res) {
  try {
    const { id } = req.params

    const { data, error } = await supabase
      .from('products')
      .select(PRODUCT_SELECT)
      .eq('id', id)
      .maybeSingle()

    if (error) {
      console.error('getAdminProductById error:', error)
      return res.status(500).json({ error: 'Failed to fetch product.' })
    }

    if (!data) {
      return res.status(404).json({ error: 'Product not found.' })
    }

    return res.json({ product: flattenProduct(data) })
  } catch (err) {
    console.error('getAdminProductById error:', err)
    return res.status(500).json({ error: 'Internal server error' })
  }
}

// GET /api/admin/products
// Protected. ALL products (active + inactive), newest first.
async function getAdminProducts(req, res) {
  try {
    const { data, error } = await supabase
      .from('products')
      .select(PRODUCT_SELECT)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('getAdminProducts error:', error)
      return res.status(500).json({ error: 'Failed to fetch products.' })
    }

    return res.json({ products: data.map(flattenProduct) })
  } catch (err) {
    console.error('getAdminProducts error:', err)
    return res.status(500).json({ error: 'Internal server error' })
  }
}

// POST /api/admin/products
// Protected. Creates a product. image = Cloudinary URL already uploaded.
async function createProduct(req, res) {
  try {
    const { name, description, price, stock, category_id, brand_id, image, is_active } = req.body

    if (!name || price === undefined || price === null) {
      return res.status(400).json({ error: 'name and price are required.' })
    }

    const payload = {
      name,
      description: description ?? null,
      price,
      stock: stock ?? 0,
      category_id: category_id ?? null,
      brand_id: brand_id ?? null,
      image: image ?? null,
      is_active: is_active ?? true,
    }

    const { data, error } = await supabase
      .from('products')
      .insert(payload)
      .select(PRODUCT_SELECT)
      .single()

    if (error) {
      console.error('createProduct error:', error)
      return res.status(500).json({ error: 'Failed to create product.' })
    }

    return res.status(201).json({ product: flattenProduct(data) })
  } catch (err) {
    console.error('createProduct error:', err)
    return res.status(500).json({ error: 'Internal server error' })
  }
}

// PATCH /api/admin/products/:id
// Protected. All fields optional; always bumps updated_at.
async function updateProduct(req, res) {
  try {
    const { id } = req.params
    const { name, description, price, stock, category_id, brand_id, image, is_active } = req.body

    const updates = {}
    if (name !== undefined) updates.name = name
    if (description !== undefined) updates.description = description
    if (price !== undefined) updates.price = price
    if (stock !== undefined) updates.stock = stock
    if (category_id !== undefined) updates.category_id = category_id
    if (brand_id !== undefined) updates.brand_id = brand_id
    if (image !== undefined) updates.image = image
    if (is_active !== undefined) updates.is_active = is_active

    const { data, error } = await supabase
      .from('products')
      .update(updates)
      .eq('id', id)
      .select(PRODUCT_SELECT)
      .maybeSingle()

    if (error) {
      console.error('updateProduct error:', error)
      return res.status(500).json({ error: 'Failed to update product.' })
    }

    if (!data) {
      return res.status(404).json({ error: 'Product not found.' })
    }

    return res.json({ product: flattenProduct(data) })
  } catch (err) {
    console.error('updateProduct error:', err)
    return res.status(500).json({ error: 'Internal server error' })
  }
}

// DELETE /api/admin/products/:id
// Protected. Hard delete.
async function deleteProduct(req, res) {
  try {
    const { id } = req.params

    const { data: existing, error: findError } = await supabase
      .from('products')
      .select('id')
      .eq('id', id)
      .maybeSingle()

    if (findError) {
      console.error('deleteProduct lookup error:', findError)
      return res.status(500).json({ error: 'Failed to delete product.' })
    }
    if (!existing) {
      return res.status(404).json({ error: 'Product not found.' })
    }

    const { error } = await supabase.from('products').delete().eq('id', id)

    if (error) {
      console.error('deleteProduct error:', error)
      return res.status(500).json({ error: 'Failed to delete product.' })
    }

    return res.json({ success: true })
  } catch (err) {
    console.error('deleteProduct error:', err)
    return res.status(500).json({ error: 'Internal server error' })
  }
}

module.exports = {
  getProducts,
  getProductById,
  getRelatedProducts,
  getAdminProducts,
  getAdminProductById,
  createProduct,
  updateProduct,
  deleteProduct,
}
