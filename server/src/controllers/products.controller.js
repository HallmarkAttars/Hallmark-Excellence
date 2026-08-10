const supabase = require('../config/supabase')

// Base product select WITHOUT the embedded variants relationship. Variants
// are fetched separately (see fetchVariantsForProducts) so the code works
// even if PostgREST cannot infer the relationship between products and
// product_variants.
const PRODUCT_SELECT = `
  id, name, description, price, compare_at_price, rating, review_count, is_featured,
  category_id, brand_id, image, is_active, created_at,
  categories ( id, name, slug ),
  brands ( id, name, slug )
`

// Fallback select for databases where the pricing/rating migration
// (migration_add_pricing_fields.sql — compare_at_price /
// migration_add_ratings.sql — rating, review_count) has not been applied
// yet. is_featured is kept because the column already exists in the
// production schema.
const PRODUCT_SELECT_BASE = `
  id, name, description, price, is_featured,
  category_id, brand_id, image, is_active, created_at,
  categories ( id, name, slug ),
  brands ( id, name, slug )
`

// True when a PostgREST error means a column does not exist in the DB yet
// (the pricing migration hasn't been applied). SELECTs report
// "...does not exist", UPDATEs/INSERTs report "Could not find ... in the
// schema cache".
function isMissingColumnError(error) {
  return Boolean(error && /does not exist|could not find/i.test(error.message))
}

// Runs a product query, retrying against the base select when the pricing
// columns are missing. Lets the API work both before and after the pricing
// migration is applied.
async function selectProducts(build) {
  let res = await build(PRODUCT_SELECT)
  if (isMissingColumnError(res.error)) {
    console.warn('[products] Pricing/rating columns missing in the products table (compare_at_price, rating, review_count). Run server/db/migration_add_pricing_fields.sql and migration_add_ratings.sql in the Supabase SQL editor to enable these fields.')
    res = await build(PRODUCT_SELECT_BASE)
  }
  return res
}

const VARIANT_SELECT = `
  id, product_id, quantity_value, quantity_unit, display_label, price, is_default
`

// Return the variant that should drive the product-level price.
// Defaults to the variant flagged is_default, otherwise the first one.
function defaultVariant(variants) {
  if (!Array.isArray(variants) || variants.length === 0) return null
  return variants.find((v) => v.is_default) || variants[0]
}

// Sort variants by quantity_value ascending.
function sortVariants(variants) {
  return (variants || []).slice().sort((a, b) => Number(a.quantity_value) - Number(b.quantity_value))
}

// Optional columns that may not exist in every database until their
// migration (migration_add_pricing_fields.sql / migration_add_ratings.sql)
// is applied. These are stripped from writes on pre-migration databases so
// admin saves keep working; the values simply stay dormant until the
// columns exist.
const OPTIONAL_FIELD_KEYS = ['compare_at_price', 'rating', 'review_count']

// Runs an insert/update against the full payload, retrying without the
// optional (migration-dependent) fields when their columns are missing.
async function withOptionalFieldRetry(operation, payload, select, baseSelect) {
  const res = await operation(payload, select)
  if (isMissingColumnError(res.error)) {
    console.warn('[products] Pricing/rating columns missing in the products table (compare_at_price, rating, review_count). Run server/db/migration_add_pricing_fields.sql and migration_add_ratings.sql in the Supabase SQL editor to enable these fields.')
    const basePayload = { ...payload }
    for (const key of OPTIONAL_FIELD_KEYS) delete basePayload[key]
    return operation(basePayload, baseSelect)
  }
  return res
}

// Public-shaped variant object.
function toVariant(v) {
  return {
    id: v.id,
    quantity_value: v.quantity_value,
    quantity_unit: v.quantity_unit,
    display_label: v.display_label,
    price: v.price,
    is_default: v.is_default ?? false,
  }
}

// Fetch all variants for a set of product ids, grouped by product_id.
async function fetchVariantsByProducts(productIds) {
  if (!Array.isArray(productIds) || productIds.length === 0) return {}

  const { data, error } = await supabase
    .from('product_variants')
    .select(VARIANT_SELECT)
    .in('product_id', productIds)

  if (error) throw error

  const grouped = {}
  for (const v of data || []) {
    if (!grouped[v.product_id]) grouped[v.product_id] = []
    grouped[v.product_id].push(toVariant(v))
  }
  // Sort each group by quantity_value ASC
  for (const pid of Object.keys(grouped)) {
    grouped[pid] = sortVariants(grouped[pid])
  }
  return grouped
}

// Attach variants to an array of flattened product rows.
function attachVariants(rows, variantsByProduct) {
  return rows.map((row) => {
    const variants = variantsByProduct[row.id] || []
    const dv = defaultVariant(variants)
    const price = variants.length > 0 ? dv.price : row.price
    return { ...row, price, variants }
  })
}

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

    const { data, error } = await selectProducts((select) => {
      let q = supabase
        .from('products')
        .select(select)
        .eq('is_active', true)

      if (category_id) q = q.eq('category_id', category_id)
      if (brand_id) q = q.eq('brand_id', brand_id)
      if (search) q = q.ilike('name', `%${search}%`)

      if (sort === 'price_asc') {
        q = q.order('price', { ascending: true })
      } else if (sort === 'price_desc') {
        q = q.order('price', { ascending: false })
      } else {
        q = q.order('created_at', { ascending: false })
      }

      return q
    })

    if (error) {
      console.error('getProducts error:', error)
      return res.status(500).json({ error: 'Failed to fetch products.' })
    }

    const rows = data.map(flattenProduct)
    // Fetch variants separately so listing works regardless of PostgREST
    // relationship inference.
    let variantsByProduct = {}
    try {
      variantsByProduct = await fetchVariantsByProducts(rows.map((r) => r.id))
    } catch (varErr) {
      console.error('getProducts fetchVariants error:', varErr)
    }

    return res.json({ products: attachVariants(rows, variantsByProduct) })
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

    const { data, error } = await selectProducts((select) =>
      supabase
        .from('products')
        .select(select)
        .eq('id', id)
        .eq('is_active', true)
        .maybeSingle()
    )

    if (error) {
      console.error('getProductById error:', error)
      return res.status(500).json({ error: 'Failed to fetch product.' })
    }

    if (!data) {
      return res.status(404).json({ error: 'Product not found.' })
    }

    const product = flattenProduct(data)

    // Fetch variants separately, sorted by quantity_value ASC.
    let variants = []
    try {
      const { data: vs, error: vErr } = await supabase
        .from('product_variants')
        .select(VARIANT_SELECT)
        .eq('product_id', id)
      if (!vErr) {
        variants = sortVariants((vs || []).map(toVariant))
      }
    } catch (varErr) {
      console.error('getProductById fetchVariants error:', varErr)
    }

    const dv = defaultVariant(variants)
    const price = variants.length > 0 ? dv.price : product.price

    return res.json({ product: { ...product, price, variants } })
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
      const { data, error } = await selectProducts((select) =>
        supabase
          .from('products')
          .select(select)
          .eq(column, value)
          .eq('is_active', true)
          .neq('id', id)
          .order('created_at', { ascending: false })
          .limit(limit)
      )
      if (error) throw error
      return data
    }

    let related = await fetchRelated('category_id', source.category_id)

    if (related.length === 0) {
      related = await fetchRelated('brand_id', source.brand_id)
    }

    if (related.length === 0) {
      const { data, error } = await selectProducts((select) =>
        supabase
          .from('products')
          .select(select)
          .eq('is_active', true)
          .neq('id', id)
          .order('created_at', { ascending: false })
          .limit(limit)
      )
      if (error) throw error
      related = data
    }

    const rows = related.map(flattenProduct)

    let variantsByProduct = {}
    try {
      variantsByProduct = await fetchVariantsByProducts(rows.map((r) => r.id))
    } catch (varErr) {
      console.error('getRelatedProducts fetchVariants error:', varErr)
    }

    return res.json({ products: attachVariants(rows, variantsByProduct) })
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

    const { data, error } = await selectProducts((select) =>
      supabase
        .from('products')
        .select(select)
        .eq('id', id)
        .maybeSingle()
    )

    if (error) {
      console.error('getAdminProductById error:', error)
      return res.status(500).json({ error: 'Failed to fetch product.' })
    }

    if (!data) {
      return res.status(404).json({ error: 'Product not found.' })
    }

    const product = flattenProduct(data)

    let variants = []
    try {
      const { data: vs, error: vErr } = await supabase
        .from('product_variants')
        .select(VARIANT_SELECT)
        .eq('product_id', id)
      if (!vErr) {
        variants = sortVariants((vs || []).map(toVariant))
      }
    } catch (varErr) {
      console.error('getAdminProductById fetchVariants error:', varErr)
    }

    const dv = defaultVariant(variants)
    const price = variants.length > 0 ? dv.price : product.price

    return res.json({ product: { ...product, price, variants } })
  } catch (err) {
    console.error('getAdminProductById error:', err)
    return res.status(500).json({ error: 'Internal server error' })
  }
}

// GET /api/admin/products
// Protected. ALL products (active + inactive), newest first.
async function getAdminProducts(req, res) {
  try {
    const { data, error } = await selectProducts((select) =>
      supabase
        .from('products')
        .select(select)
        .order('created_at', { ascending: false })
    )

    if (error) {
      console.error('getAdminProducts error:', error)
      return res.status(500).json({ error: 'Failed to fetch products.' })
    }

    const rows = data.map(flattenProduct)

    let variantsByProduct = {}
    try {
      variantsByProduct = await fetchVariantsByProducts(rows.map((r) => r.id))
    } catch (varErr) {
      console.error('getAdminProducts fetchVariants error:', varErr)
    }

    return res.json({ products: attachVariants(rows, variantsByProduct) })
  } catch (err) {
    console.error('getAdminProducts error:', err)
    return res.status(500).json({ error: 'Internal server error' })
  }
}

// Generate a URL-friendly slug from a name string
function slugify(text) {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')       // spaces to hyphens
    .replace(/[^\w-]+/g, '')    // remove non-word chars
    .replace(/--+/g, '-')       // collapse multiple hyphens
    .replace(/^-+|-+$/g, '')    // trim hyphens
}

// Normalize an incoming variants array into rows for product_variants.
function normalizeVariants(variants) {
  if (!Array.isArray(variants) || variants.length === 0) return []
  return variants.map((v) => ({
    quantity_value: v.quantity_value ?? 0,
    quantity_unit: v.quantity_unit ?? 'ML',
    display_label: v.display_label ?? '',
    price: v.price,
    is_default: v.is_default ?? false,
  }))
}

async function insertVariants(productId, variants) {
  const rows = normalizeVariants(variants)
  if (rows.length === 0) return []

  const payload = rows.map((r) => ({ ...r, product_id: productId }))

  const { data, error } = await supabase
    .from('product_variants')
    .insert(payload)
    .select(VARIANT_SELECT)

  if (error) throw error

  return sortVariants((data || []).map(toVariant))
}

// POST /api/admin/products
// Protected. Creates a product. image = Cloudinary URL already uploaded.
async function createProduct(req, res) {
  try {
    const {
      name, description, price, compare_at_price,
      rating, review_count, category_id, brand_id, image, is_active, is_featured, variants
    } = req.body

    if (!name || price === undefined || price === null) {
      return res.status(400).json({ error: 'name and price are required.' })
    }

    // If the selected category is "Attar", brand is required
    if (category_id) {
      const { data: category } = await supabase
        .from('categories')
        .select('slug')
        .eq('id', category_id)
        .maybeSingle()
      if (category && category.slug === 'attar' && !brand_id) {
        return res.status(400).json({ error: 'Brand is required for Attar products.' })
      }
    }

    const payload = {
      name,
      slug: slugify(name),
      description: description ?? null,
      price,
      compare_at_price: compare_at_price ?? null,
      rating: rating ?? null,
      review_count: review_count ?? null,
      category_id: category_id ?? null,
      brand_id: brand_id ?? null,
      image: image ?? null,
      is_active: is_active ?? true,
      is_featured: is_featured ?? false,
    }

    const { data, error } = await withOptionalFieldRetry(
      (pl, select) => supabase.from('products').insert(pl).select(select).single(),
      payload,
      PRODUCT_SELECT,
      PRODUCT_SELECT_BASE
    )

    if (error) {
      console.error('createProduct error:', error)
      return res.status(500).json({ error: 'Failed to create product.' })
    }

    // Insert variants (if any) after the product exists.
    let inserted = []
    if (Array.isArray(variants) && variants.length > 0) {
      try {
        inserted = await insertVariants(data.id, variants)
      } catch (varErr) {
        console.error('createProduct insertVariants error:', varErr)
        return res.status(500).json({ error: 'Failed to create product variants.' })
      }
    }

    const product = flattenProduct(data)
    const dv = defaultVariant(inserted)
    const pPrice = inserted.length > 0 ? dv.price : product.price

    return res.status(201).json({ product: { ...product, price: pPrice, variants: inserted } })
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
    const {
      name, description, price, compare_at_price,
      rating, review_count, category_id, brand_id, image, is_active, is_featured, variants
    } = req.body

    // If the category is being updated to "Attar", brand is required
    if (category_id !== undefined) {
      const { data: category } = await supabase
        .from('categories')
        .select('slug')
        .eq('id', category_id)
        .maybeSingle()
      if (category && category.slug === 'attar' && !brand_id) {
        return res.status(400).json({ error: 'Brand is required for Attar products.' })
      }
    }

    const updates = {}
    if (name !== undefined) {
      updates.name = name
      updates.slug = slugify(name)
    }
    if (description !== undefined) updates.description = description
    if (price !== undefined) updates.price = price
    if (compare_at_price !== undefined) updates.compare_at_price = compare_at_price
    if (rating !== undefined) updates.rating = rating
    if (review_count !== undefined) updates.review_count = review_count
    if (category_id !== undefined) updates.category_id = category_id
    if (brand_id !== undefined) updates.brand_id = brand_id
    if (image !== undefined) updates.image = image
    if (is_active !== undefined) updates.is_active = is_active
    if (is_featured !== undefined) updates.is_featured = is_featured

    // A PATCH that only changes variants (no scalar columns) would send
    // PostgREST an empty update object, which it rejects — so fetch the row
    // instead and let the variant replacement below do the work.
    let data
    let error
    if (Object.keys(updates).length === 0) {
      ;({ data, error } = await selectProducts((select) =>
        supabase.from('products').select(select).eq('id', id).maybeSingle()
      ))
    } else {
      ;({ data, error } = await withOptionalFieldRetry(
        (pl, select) => supabase.from('products').update(pl).eq('id', id).select(select).maybeSingle(),
        updates,
        PRODUCT_SELECT,
        PRODUCT_SELECT_BASE
      ))
    }

    if (error) {
      console.error('updateProduct error:', error)
      return res.status(500).json({ error: 'Failed to update product.' })
    }

    if (!data) {
      return res.status(404).json({ error: 'Product not found.' })
    }

    // If variants were provided, replace the old set with the new one.
    let inserted = []
    if (Array.isArray(variants)) {
      try {
        const { error: delError } = await supabase
          .from('product_variants')
          .delete()
          .eq('product_id', id)
        if (delError) throw delError

        if (variants.length > 0) {
          inserted = await insertVariants(id, variants)
        }
      } catch (varErr) {
        console.error('updateProduct variants error:', varErr)
        return res.status(500).json({ error: 'Failed to update product variants.' })
      }
    }

    const product = flattenProduct(data)
    const dv = defaultVariant(inserted)
    const pPrice = inserted.length > 0 ? dv.price : product.price

    return res.json({ product: { ...product, price: pPrice, variants: inserted } })
  } catch (err) {
    console.error('updateProduct error:', err)
    return res.status(500).json({ error: 'Internal server error' })
  }
}

// DELETE /api/admin/products/:id
// Protected. Hard delete. Variants are removed automatically via ON DELETE CASCADE.
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
