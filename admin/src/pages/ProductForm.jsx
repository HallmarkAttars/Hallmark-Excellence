import { useEffect, useState } from 'react'
import { useNavigate, useParams, useSearchParams, Link } from 'react-router-dom'
import { getProduct, createProduct, updateProduct, getCategories, getBrands, uploadImage } from '../services/mockApi'
import './ProductForm.css'

const EMPTY = {
  name: '', description: '', price: '',
  compare_at_price: '',
  rating: '', review_count: '',
  is_featured: false,
  category_id: '', brand_id: '',
}

// Preset units for the variant dropdown. A variant's EXISTING unit (from
// previously saved products) is preserved as an extra option when it is not
// one of these, so editing an old product never breaks its saved unit.
const UNIT_OPTIONS = ['ML', 'Gram', 'Pieces']

export default function ProductForm() {
  const { id } = useParams()
  const isEdit = Boolean(id)
  const navigate = useNavigate()

  // Optional locked-brand context: /admin/products/new?brand=<id>&brandName=..
  // &brandSlug=.. (used by the per-brand product pages). While present, the
  // brand field is read-only so a product can never be assigned elsewhere.
  const [searchParams] = useSearchParams()
  const lockedBrandId = isEdit ? null : searchParams.get('brand')
  const lockedBrandName = searchParams.get('brandName')
  const lockedBrandSlug = searchParams.get('brandSlug')

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
  // Each variant carries ONLY: quantity_value + quantity_unit + price
  // (+ is_default). Stock, bulk pricing and packs are removed.
  const [variants, setVariants] = useState([])

  useEffect(() => {
    getCategories().then(setCategories)
    getBrands().then(setBrands)
    // Pre-select the locked brand for brand-scoped "Add Product" flows.
    if (lockedBrandId) {
      setForm((f) => ({ ...f, brand_id: lockedBrandId }))
    }
    if (isEdit) {
      getProduct(id).then((p) => {
        if (p) {
          setForm({
            name: p.name, description: p.description ?? '', price: p.price,
            category_id: p.category_id ?? '', brand_id: p.brand_id ?? '',
            compare_at_price: p.compare_at_price ?? '',
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
    // — UNLESS the brand is locked (brand-scoped "Add Product"): the lock must
    // survive a category change so the product can never lose its brand.
    if (selectedCat && selectedCat.slug !== 'attar' && selectedCat.name !== 'Attar') {
      setForm((f) => ({ ...f, category_id: categoryId, brand_id: lockedBrandId || '' }))
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
    setVariants((prev) => [
      ...prev,
      {
        quantity_value: '',
        quantity_unit: 'ML',
        price: '',
        is_default: prev.length === 0, // first variant is default by default
      },
    ])
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

  // The unit dropdown for one variant: the standard options (ML / Gram /
  // Pieces) plus the variant's own saved unit when it is not one of them, so
  // existing products keep their exact unit (e.g. "GM").
  const unitOptionsFor = (index) => {
    const v = variants[index]
    const current = v?.quantity_unit?.trim()
    if (current && !UNIT_OPTIONS.includes(current)) {
      return [...UNIT_OPTIONS, current]
    }
    return UNIT_OPTIONS
  }

  // --- Validation ----------------------------------------------------------
  // Variants are OPTIONAL: a product without variants is sold at its normal
  // product price. When variants exist, each must have Quantity + Unit + Price
  // and exactly one default.
  const validateVariants = () => {
    if (variants.length === 0) return ''
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

    // Validate variants (optional — empty variant list is allowed)
    const variantError = validateVariants()
    if (variantError) {
      setError(variantError)
      return
    }

    // The authoritative selling price: the default variant when variants
    // exist, otherwise the plain product price (variant-less products).
    const defaultVariant = variants.find((v) => v.is_default) || variants[0]
    const sellingPrice = hasVariants ? Number(defaultVariant?.price ?? form.price) : Number(form.price)
    const parsedCompareAt = form.compare_at_price === '' || form.compare_at_price == null ? null : Number(form.compare_at_price)
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

    setSaving(true)
    try {
      let image = existingImages[0] || null
      if (imageFile) {
        image = await uploadImage(imageFile)
      }

      // Build the variants payload for the backend — ONLY quantity value,
      // unit, price and default flag (no stock / no bulk / no packs).
      const variantsPayload = variants.map((v) => ({
        quantity_value: Number(v.quantity_value),
        quantity_unit: v.quantity_unit.trim(),
        display_label: `${v.quantity_value} ${v.quantity_unit}`.trim(),
        price: Number(v.price),
        is_default: Boolean(v.is_default),
      }))

      const payload = {
        name: form.name,
        description: form.description,
        price: sellingPrice,
        compare_at_price: parsedCompareAt,
        rating: form.rating ? Number(form.rating) : null,
        review_count: form.review_count ? Number(form.review_count) : null,
        is_featured: Boolean(form.is_featured),
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
      // Brand-scoped add flows return to that brand's product page.
      if (!isEdit && lockedBrandSlug) {
        navigate(`/admin/brands/${lockedBrandSlug}`)
      } else {
        navigate('/admin/products')
      }
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

        {/* -------- Optional pricing: MRP (struck-through display only) -------- */}
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

        {/* -------- Product Variants section (optional) -------- */}
        <div className="variants-section">
          <div className="variants-header">
            <h3>Product Variants</h3>
            <button type="button" className="btn btn-outline btn-sm" onClick={addVariant}>
              + Add Variant
            </button>
          </div>

          {variants.length === 0 && (
            <p className="variants-empty">
              No variants yet. A product without variants is sold at its normal price.
              Add a variant (e.g. 10 ML → ₹50) to offer capacity/size options.
            </p>
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
                    placeholder="e.g. 10"
                    value={v.quantity_value}
                    onChange={(e) => updateVariant(index, 'quantity_value', e.target.value)}
                  />
                  <small className="field-example">Example: 10</small>
                </div>

                <div className="form-field">
                  <label htmlFor={`unit-${index}`}>Unit</label>
                  <select
                    id={`unit-${index}`}
                    value={v.quantity_unit || 'ML'}
                    onChange={(e) => updateVariant(index, 'quantity_unit', e.target.value)}
                  >
                    {unitOptionsFor(index).map((u) => (
                      <option key={u} value={u}>{u}</option>
                    ))}
                  </select>
                  <small className="field-example">ML, Gram or Pieces</small>
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
              disabled={!isAttarCategory || Boolean(lockedBrandId)}
              style={!isAttarCategory || lockedBrandId ? { opacity: 0.4, cursor: 'not-allowed' } : {}}
            >
              <option value="">Select Brand</option>
              {brands.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
            {/* Locked-brand context (added from a brand page) — never editable. */}
            {lockedBrandId && (
              <small style={{ color: '#1e7a46', display: 'block', marginTop: 4, fontWeight: 600 }}>
                🔒 Brand locked to {lockedBrandName || 'this brand'} — added from its product page
              </small>
            )}
            {/* Only a real hint when Attar is selected AND no brand is chosen
                yet — never shown as a false error once a brand is picked. */}
            {isAttarCategory && !form.brand_id && !lockedBrandId && (
              <small style={{ color: '#b8860b', display: 'block', marginTop: 4 }}>
                Brand is required for Attar products
              </small>
            )}
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
