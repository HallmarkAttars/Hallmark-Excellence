import { useEffect, useState } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { getProduct, createProduct, updateProduct, getCategories, getBrands, uploadImage } from '../services/mockApi'
import './ProductForm.css'

const EMPTY = {
  name: '', description: '', price: '', stock: '',
  compare_at_price: '', bulk_price: '', bulk_min_qty: '',
  rating: '', review_count: '',
  is_featured: false,
  category_id: '', brand_id: '',
}

// Preset units for the searchable dropdown. Admin can also type a custom one.
const UNIT_OPTIONS = ['ML', 'PC', 'GM', 'KG', 'LTR', 'Bottle', 'Box', 'Pack', 'Piece']

export default function ProductForm() {
  const { id } = useParams()
  const isEdit = Boolean(id)
  const navigate = useNavigate()

  const [form, setForm] = useState(EMPTY)
  const [categories, setCategories] = useState([])
  const [brands, setBrands] = useState([])
  const [existingImages, setExistingImages] = useState([])
  const [imagePreview, setImagePreview] = useState(null)
  const [imageFile, setImageFile] = useState(null)
  const [loading, setLoading] = useState(isEdit)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // --- Variant state ------------------------------------------------------
  const [variants, setVariants] = useState([])
  // Per-variant Unit search query (for the combobox).
  const [unitQueries, setUnitQueries] = useState({})

  useEffect(() => {
    getCategories().then(setCategories)
    getBrands().then(setBrands)
    if (isEdit) {
      getProduct(id).then((p) => {
        if (p) {
          setForm({
            name: p.name, description: p.description ?? '', price: p.price,
            stock: p.stock, category_id: p.category_id ?? '', brand_id: p.brand_id ?? '',
            compare_at_price: p.compare_at_price ?? '',
            bulk_price: p.bulk_price ?? '',
            bulk_min_qty: p.bulk_min_qty ?? '',
            rating: p.rating ?? '',
            review_count: p.review_count ?? '',
            is_featured: Boolean(p.is_featured),
          })
          setExistingImages([p.image].filter(Boolean))
          setImagePreview(p.image || null)
          // Load existing variants (if any) returned by the backend.
          if (Array.isArray(p.variants) && p.variants.length > 0) {
            setVariants(
              p.variants.map((v) => ({
                quantity_value: v.quantity_value ?? '',
                quantity_unit: v.quantity_unit ?? 'ML',
                price: v.price ?? '',
                stock: v.stock ?? '',
                is_default: Boolean(v.is_default),
              }))
            )
          }
        }
        setLoading(false)
      })
    }
  }, [id, isEdit])

  const handleCategoryChange = (e) => {
    const categoryId = e.target.value
    const selectedCat = categories.find((c) => String(c.id) === categoryId)
    // If changing from Attar to a non-Attar category, clear the brand selection
    if (selectedCat && selectedCat.slug !== 'attar' && selectedCat.name !== 'Attar') {
      setForm((f) => ({ ...f, category_id: categoryId, brand_id: '' }))
    } else {
      setForm((f) => ({ ...f, category_id: categoryId }))
    }
  }

  const selectedCategory = categories.find((c) => String(c.id) === String(form.category_id))
  const isAttarCategory = selectedCategory?.slug === 'attar' || selectedCategory?.name === 'Attar'

  const handleChange = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }))

  // Only preview locally here — the actual Cloudinary upload happens on
  // submit, so we don't upload a file the admin might still cancel out of.
  const handleImageChange = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setImageFile(file)
    const reader = new FileReader()
    reader.onload = () => setImagePreview(reader.result)
    reader.readAsDataURL(file)
  }

  // --- Variant helpers -----------------------------------------------------
  const hasVariants = variants.length > 0

  const addVariant = () => {
    const next = [...variants, {
      quantity_value: '',
      quantity_unit: 'ML',
      price: '',
      stock: '',
      is_default: variants.length === 0, // first variant is default by default
    }]
    setVariants(next)
  }

  const updateVariant = (index, field, value) => {
    setVariants((prev) => prev.map((v, i) => (i === index ? { ...v, [field]: value } : v)))
  }

  const removeVariant = (index) => {
    setVariants((prev) => {
      const removedWasDefault = prev[index]?.is_default
      const next = prev.filter((_, i) => i !== index)
      // If the removed variant was the default, make the first remaining one default.
      if (removedWasDefault && next.length > 0 && !next.some((v) => v.is_default)) {
        next[0] = { ...next[0], is_default: true }
      }
      return next
    })
  }

  const setDefaultVariant = (index) => {
    setVariants((prev) => prev.map((v, i) => ({ ...v, is_default: i === index })))
  }

  // Update the unit search query for a specific variant.
  const setUnitQuery = (index, value) => {
    setUnitQueries((prev) => ({ ...prev, [index]: value }))
  }

  // Resolve the unit for a variant: the custom typed value if it doesn't
  // match a preset, otherwise the preset option.
  const resolveUnit = (index) => {
    const v = variants[index]
    if (!v) return ''
    const query = (unitQueries[index] ?? '').trim()
    if (query) return query
    return v.quantity_unit || 'ML'
  }

  // Determine which unit options to show based on the current search query.
  const filteredUnits = (index) => {
    const query = (unitQueries[index] ?? '').trim().toLowerCase()
    if (!query) return UNIT_OPTIONS
    return UNIT_OPTIONS.filter((u) => u.toLowerCase().includes(query))
  }

  // --- Validation ----------------------------------------------------------
  const validateVariants = () => {
    if (variants.length === 0) {
      return 'At least one variant is required.'
    }
    const defaults = variants.filter((v) => v.is_default)
    if (defaults.length !== 1) {
      return 'Exactly one variant must be marked as default.'
    }
    // Duplicate quantity + unit check
    const seen = new Set()
    for (const v of variants) {
      const q = String(v.quantity_value ?? '').trim()
      const u = String(v.quantity_unit ?? '').trim()
      if (!q || !u) {
        return 'Each variant needs a Quantity Value and Unit.'
      }
      const numQ = Number(q)
      if (Number.isNaN(numQ)) {
        return 'Quantity Value must be a number.'
      }
      if (Number(v.price ?? '') <= 0) {
        return 'Variant price must be greater than 0.'
      }
      if (Number(v.stock ?? '') < 0) {
        return 'Variant stock cannot be negative.'
      }
      const key = `${q.toUpperCase()}|${u.toUpperCase()}`
      if (seen.has(key)) {
        return 'Duplicate variant: Quantity + Unit combination already exists.'
      }
      seen.add(key)
    }
    return ''
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    // Validate brand is required for Attar category
    if (isAttarCategory && !form.brand_id) {
      setError('Please select a brand.')
      return
    }

    // Validate variants
    const variantError = validateVariants()
    if (variantError) {
      setError(variantError)
      return
    }
    // --- Optional pricing validation (MRP / original price + bulk) ---
    const defaultVariant = variants.find((v) => v.is_default) || variants[0]
    const sellingPrice = hasVariants ? Number(defaultVariant?.price ?? form.price) : Number(form.price)
    const parsedCompareAt = form.compare_at_price === '' || form.compare_at_price == null ? null : Number(form.compare_at_price)
    const parsedBulkPrice = form.bulk_price === '' || form.bulk_price == null ? null : Number(form.bulk_price)
    const parsedBulkMinQty = form.bulk_min_qty === '' || form.bulk_min_qty == null ? null : Number(form.bulk_min_qty)

    if (!Number.isFinite(sellingPrice) || sellingPrice < 0) {
      setError('Selling price must be a number >= 0.')
      return
    }
    if (parsedCompareAt !== null && (!Number.isFinite(parsedCompareAt) || parsedCompareAt < 0)) {
      setError('MRP / Original Price must be a number >= 0.')
      return
    }
    if (parsedCompareAt !== null && parsedCompareAt <= sellingPrice) {
      setError('MRP / Original Price must be higher than the selling price to show as a struck-through price.')
      return
    }
    if (parsedBulkPrice !== null && (!Number.isFinite(parsedBulkPrice) || parsedBulkPrice < 0)) {
      setError('Bulk Price must be a number >= 0.')
      return
    }
    if (parsedBulkPrice !== null && parsedBulkMinQty == null) {
      setError('Bulk Minimum Quantity is required when a Bulk Price is set.')
      return
    }
    if (parsedBulkMinQty !== null && (!Number.isInteger(parsedBulkMinQty) || parsedBulkMinQty < 1)) {
      setError('Bulk Minimum Quantity must be a whole number >= 1.')
      return
    }

    setSaving(true)
    try {
      let image = existingImages[0] || null
      if (imageFile) {
        image = await uploadImage(imageFile)
      }

      // Build the variants payload for the backend.
      const variantsPayload = variants.map((v) => ({
        quantity_value: Number(v.quantity_value),
        quantity_unit: v.quantity_unit.trim(),
        display_label: `${v.quantity_value} ${v.quantity_unit}`.trim(),
        price: Number(v.price),
        stock: Number(v.stock || 0),
        is_default: Boolean(v.is_default),
      }))

      const baseStock = hasVariants ? Number(defaultVariant?.stock ?? form.stock) : Number(form.stock)

      const payload = {
        name: form.name,
        description: form.description,
        price: sellingPrice,
        compare_at_price: parsedCompareAt,
        bulk_price: parsedBulkPrice,
        bulk_min_qty: parsedBulkMinQty,
        rating: form.rating ? Number(form.rating) : null,
        review_count: form.review_count ? Number(form.review_count) : null,
        is_featured: Boolean(form.is_featured),
        stock: baseStock,
        category_id: form.category_id || null,
        brand_id: form.brand_id || null,
        image,
        variants: variantsPayload,
      }

      if (isEdit) {
        await updateProduct(id, payload)
      } else {
        await createProduct(payload)
      }
      navigate('/admin/products')
    } catch (err) {
      setError(err.message || 'Failed to save product. Please try again.')
      setSaving(false)
    }
  }

  if (loading) return <div className="loading-state">Loading product…</div>

  return (
    <div className="product-form-container">
      <div className="page-header">
        <h1>{isEdit ? 'Edit Product' : 'Add Product'}</h1>
        <Link to="/admin/products" className="btn btn-outline btn-sm">Back to Products</Link>
      </div>

      <form className="card product-form" onSubmit={handleSubmit}>
        <div className="form-field">
          <label htmlFor="name">Name</label>
          <input id="name" name="name" value={form.name} onChange={handleChange} required />
        </div>

        <div className="form-field">
          <label htmlFor="description">Description</label>
          <textarea id="description" name="description" rows={4} value={form.description} onChange={handleChange} required />
        </div>

        <div className="form-row form-row-2">
          <div className="form-field">
            <label htmlFor="price">Price (₹)</label>
            <input
              id="price"
              name="price"
              type="number"
              min="0"
              step="0.01"
              value={form.price}
              onChange={handleChange}
              disabled={hasVariants}
              required={!hasVariants}
            />
            {hasVariants && (
              <small className="price-hint">Price is automatically taken from the Default Variant.</small>
            )}
          </div>
          <div className="form-field">
            <label htmlFor="stock">Stock</label>
            <input id="stock" name="stock" type="number" min="0" value={form.stock} onChange={handleChange} required={!hasVariants} />
          </div>
        </div>

        <div className="form-field featured-field">
          <label className="featured-toggle">
            <input
              type="checkbox"
              name="is_featured"
              checked={form.is_featured}
              onChange={(e) => setForm((f) => ({ ...f, is_featured: e.target.checked }))}
            />
            <span className="featured-switch" aria-hidden="true" />
            <span className="featured-toggle-text">
              Featured on Homepage
              <small>Shows this product in the “Featured Products” section on the storefront.</small>
            </span>
          </label>
        </div>

        {/* -------- Optional pricing: MRP + bulk (shown on the storefront only when set) -------- */}
        <div className="form-row form-row-2">
          <div className="form-field">
            <label htmlFor="compare_at_price">MRP / Original Price (₹)</label>
            <input
              id="compare_at_price"
              name="compare_at_price"
              type="number"
              min="0"
              step="0.01"
              placeholder="Optional"
              value={form.compare_at_price}
              onChange={handleChange}
            />
            <small className="field-example">Shown struck-through when higher than the selling price.</small>
          </div>
          <div className="form-field">
            <label htmlFor="bulk_price">Bulk Price (₹)</label>
            <input
              id="bulk_price"
              name="bulk_price"
              type="number"
              min="0"
              step="0.01"
              placeholder="Optional"
              value={form.bulk_price}
              onChange={handleChange}
            />
          </div>
        </div>
        <div className="form-field">
          <label htmlFor="bulk_min_qty">Bulk Minimum Quantity</label>
          <input
            id="bulk_min_qty"
            name="bulk_min_qty"
            type="number"
            min="1"
            placeholder="e.g. 91"
            value={form.bulk_min_qty}
            onChange={handleChange}
          />
          <small className="field-example">Displayed as “Bulk: ₹42 (91+)” on the storefront.</small>
        </div>

        {/* -------- Ratings (shown on the storefront cards only when set) -------- */}
        <div className="form-row form-row-2">
          <div className="form-field">
            <label htmlFor="rating">Rating (0–5)</label>
            <input
              id="rating"
              name="rating"
              type="number"
              min="0"
              max="5"
              step="0.1"
              placeholder="e.g. 4.8"
              value={form.rating}
              onChange={handleChange}
            />
            <small className="field-example">Displayed as “★ 4.8” on the storefront cards.</small>
          </div>
          <div className="form-field">
            <label htmlFor="review_count">Review Count</label>
            <input
              id="review_count"
              name="review_count"
              type="number"
              min="0"
              step="1"
              placeholder="e.g. 81"
              value={form.review_count}
              onChange={handleChange}
            />
            <small className="field-example">Displayed as “| (81)” next to the rating.</small>
          </div>
        </div>

        {/* -------- Product Variants section -------- */}
        <div className="variants-section">
          <div className="variants-header">
            <h3>Product Variants</h3>
            <button type="button" className="btn btn-outline btn-sm" onClick={addVariant}>
              + Add Variant
            </button>
          </div>

          {variants.length === 0 && (
            <p className="variants-empty">No variants yet. Add one to offer multiple pack sizes.</p>
          )}

          {variants.map((v, index) => (
            <div className="variant-card" key={index}>
              <div className="variant-card-head">
                <span className="variant-title">Variant {index + 1}</span>
                <button
                  type="button"
                  className="variant-delete"
                  onClick={() => removeVariant(index)}
                  title="Delete variant"
                  aria-label="Delete variant"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="3 6 5 6 21 6" />
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                    <line x1="10" y1="11" x2="10" y2="17" />
                    <line x1="14" y1="11" x2="14" y2="17" />
                  </svg>
                </button>
              </div>

              <div className="variant-grid">
                <div className="form-field">
                  <label htmlFor={`qty-${index}`}>Quantity Value</label>
                  <input
                    id={`qty-${index}`}
                    type="number"
                    min="0"
                    step="any"
                    placeholder="e.g. 3"
                    value={v.quantity_value}
                    onChange={(e) => updateVariant(index, 'quantity_value', e.target.value)}
                  />
                  <small className="field-example">Example: 3</small>
                </div>

                <div className="form-field">
                  <label htmlFor={`unit-${index}`}>Unit</label>
                  <div className="unit-combobox">
                    <input
                      id={`unit-${index}`}
                      list={`unit-list-${index}`}
                      placeholder="Select or type unit"
                      value={resolveUnit(index)}
                      onChange={(e) => {
                        setUnitQuery(index, e.target.value)
                        updateVariant(index, 'quantity_unit', e.target.value)
                      }}
                      onBlur={() => setUnitQuery(index, '')}
                    />
                    <datalist id={`unit-list-${index}`}>
                      {UNIT_OPTIONS.map((u) => <option key={u} value={u} />)}
                    </datalist>
                  </div>
                  <small className="field-example">ML, PC, GM, KG, LTR, Bottle… or type custom</small>
                </div>

                <div className="form-field">
                  <label htmlFor={`price-${index}`}>Price (₹)</label>
                  <input
                    id={`price-${index}`}
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    value={v.price}
                    onChange={(e) => updateVariant(index, 'price', e.target.value)}
                  />
                </div>

                <div className="form-field">
                  <label htmlFor={`stock-${index}`}>Stock</label>
                  <input
                    id={`stock-${index}`}
                    type="number"
                    min="0"
                    placeholder="0"
                    value={v.stock}
                    onChange={(e) => updateVariant(index, 'stock', e.target.value)}
                  />
                </div>
              </div>

              <div className="variant-default">
                <label className="default-radio">
                  <input
                    type="radio"
                    name="default-variant"
                    checked={v.is_default}
                    onChange={() => setDefaultVariant(index)}
                  />
                  <span>Default Variant</span>
                </label>
              </div>
            </div>
          ))}
        </div>

        <div className="form-row form-row-2">
          <div className="form-field">
            <label htmlFor="category_id">Category</label>
            <select id="category_id" name="category_id" value={form.category_id} onChange={handleCategoryChange} required>
              <option value="">Select category</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className="form-field">
            <label htmlFor="brand_id">Brand</label>
            <select
              id="brand_id"
              name="brand_id"
              value={form.brand_id}
              onChange={handleChange}
              required={isAttarCategory}
              disabled={!isAttarCategory}
              style={!isAttarCategory ? { opacity: 0.4, cursor: 'not-allowed' } : {}}
            >
              <option value="">Select Brand</option>
              {brands.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
            {isAttarCategory && <small style={{ color: '#b8860b', display: 'block', marginTop: 4 }}>Brand is required for Attar products</small>}
          </div>
        </div>

        <div className="form-field">
          <label htmlFor="image">Product Image</label>
          <input id="image" type="file" accept="image/*" onChange={handleImageChange} />
          {imagePreview && (
            <div className="image-preview">
              <img src={imagePreview} alt="Preview" />
            </div>
          )}
        </div>

        {error && <p className="login-error">{error}</p>}

        <button className="btn btn-gold" type="submit" disabled={saving}>
          {saving ? (imageFile ? 'Uploading image…' : 'Saving…') : isEdit ? 'Save Changes' : 'Add Product'}
        </button>
      </form>
    </div>
  )
}
