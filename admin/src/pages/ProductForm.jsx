import { useEffect, useState } from 'react'
import { useNavigate, useParams, useSearchParams, Link } from 'react-router-dom'
import { getProduct, createProduct, updateProduct, getCategories, getBrands, uploadImage } from '../services/mockApi'
import { UNIT_OPTIONS, normalizeUnit, validateVariants } from '../utils/variantValidation'
import './ProductForm.css'

const EMPTY = {
  name: '', description: '',
  rating: '', review_count: '',
  is_featured: false,
  category_id: '', brand_id: '',
}

// Variant validation rules + unit canonicalization live in
// utils/variantValidation.js (unit-tested there) and mirror the backend
// exactly — the dropdown offers ONLY ML, Gram, Pieces.

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
  // Each variant carries EXACTLY: quantity_value + quantity_unit +
  // total_price (Variant Total Price — the amount the customer pays for one
  // selected variant) + price_per_unit (informational display) + is_default.
  // No stock, no bulk pricing, no package pricing.
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
            name: p.name, description: p.description ?? '',
            category_id: p.category_id ?? '', brand_id: p.brand_id ?? '',
            rating: p.rating ?? '',
            review_count: p.review_count ?? '',
            is_featured: Boolean(p.is_featured),
          })
          setExistingImages([p.image].filter(Boolean))
          setImagePreview(p.image || null)
          // Load existing variants (if any) returned by the backend. Legacy
          // variants (pre-total-price) fall back to their old `price` value
          // so editing an old product never loses its data.
          if (Array.isArray(p.variants) && p.variants.length > 0) {
            setVariants(
              p.variants.map((v) => ({
                quantity_value: v.quantity_value ?? '',
                quantity_unit: normalizeUnit(v.quantity_unit) || 'ML',
                total_price: v.total_price != null ? v.total_price : (v.price ?? ''),
                price_per_unit: v.price_per_unit != null ? v.price_per_unit : (v.price ?? ''),
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

  // Variant Total Price is ALWAYS computed automatically: Quantity × Price
  // Per Unit (e.g. 60 × ₹45 = ₹2,700). Returns '' while either input is
  // missing/invalid so the read-only field never shows a fabricated number.
  const computeVariantTotal = (quantity, perUnit) => {
    const q = Number(quantity)
    const p = Number(perUnit)
    if (
      String(quantity ?? '').trim() === '' ||
      String(perUnit ?? '').trim() === '' ||
      !Number.isFinite(q) ||
      !Number.isFinite(p) ||
      q <= 0 ||
      p < 0
    ) {
      return ''
    }
    // Round to 2 decimals to match the numeric(10,2) column.
    return Math.round(q * p * 100) / 100
  }

  const addVariant = () => {
    setVariants((prev) => [
      ...prev,
      {
        quantity_value: '',
        quantity_unit: 'ML',
        total_price: '',
        price_per_unit: '',
        is_default: prev.length === 0, // first variant is default by default
      },
    ])
  }

  const updateVariant = (index, field, value) => {
    setVariants((prev) =>
      prev.map((v, i) => {
        if (i !== index) return v
        const next = { ...v, [field]: value }
        // Recompute the read-only Variant Total Price whenever Quantity or
        // Price Per Unit changes.
        if (field === 'quantity_value' || field === 'price_per_unit') {
          next.total_price = computeVariantTotal(next.quantity_value, next.price_per_unit)
        }
        return next
      })
    )
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

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    // Validate brand is required for Attar category
    if (isAttarCategory && !form.brand_id) {
      setError('Please select a brand.')
      return
    }

    // Validate variants (optional — empty variant list is allowed)
    const variantError = validateVariants(variants)
    if (variantError) {
      setError(variantError)
      return
    }

    setSaving(true)
    try {
      let image = existingImages[0] || null
      if (imageFile) {
        image = await uploadImage(imageFile)
      }

      // Build the variants payload for the backend — ONLY quantity value,
      // unit, variant total price, price per unit and default flag
      // (no stock / no bulk / no packs).
      const variantsPayload = variants.map((v) => ({
        quantity_value: Number(v.quantity_value),
        quantity_unit: v.quantity_unit.trim(),
        display_label: `${v.quantity_value} ${v.quantity_unit}`.trim(),
        total_price: Number(v.total_price),
        price_per_unit: Number(v.price_per_unit),
        is_default: Boolean(v.is_default),
      }))

      // The purchasable price comes ONLY from the product variants (the
      // backend derives the product-level price from the default variant's
      // total). No product-level price or MRP is sent anymore.
      const payload = {
        name: form.name,
        description: form.description,
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
              No variants yet. Add a variant (e.g. 100 Pieces → ₹1000 total, ₹10
              per piece) to offer pack/size options. Products are sold by their
              variants.
            </p>
          )}

          {variants.map((v, index) => (
            <div className={`variant-card${v.is_default ? ' is-default' : ''}`} key={index}>
              <div className="variant-card-head">
                <span className="variant-title">
                  Variant {index + 1}
                  {v.is_default && <span className="variant-default-badge">Default</span>}
                </span>
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
                  <label htmlFor={`qty-${index}`}>Quantity</label>
                  <input
                    id={`qty-${index}`}
                    type="number"
                    min="1"
                    step="any"
                    placeholder="e.g. 100"
                    value={v.quantity_value}
                    onChange={(e) => updateVariant(index, 'quantity_value', e.target.value)}
                  />
                  <small className="field-example">Example: 100</small>
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
                  <label htmlFor={`per-unit-${index}`}>Price Per Unit (₹)</label>
                  <input
                    id={`per-unit-${index}`}
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    value={v.price_per_unit}
                    onChange={(e) => updateVariant(index, 'price_per_unit', e.target.value)}
                  />
                  <small className="field-example">e.g. ₹45 for one piece</small>
                </div>
              </div>

              {/* Variant Total Price — READ-ONLY, always auto-calculated as
                  Quantity × Price Per Unit. The admin never types it. */}
              <div className="form-field variant-total-field">
                <label htmlFor={`total-price-${index}`}>Variant Total Price (₹)</label>
                <div className="variant-total-input-row">
                  <input
                    id={`total-price-${index}`}
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="—"
                    value={v.total_price === '' ? '' : Number(v.total_price)}
                    readOnly
                    tabIndex={-1}
                    aria-readonly="true"
                    className="variant-total-readonly"
                  />
                  <span className="variant-total-lock" title="Calculated automatically" aria-hidden="true">
                    🔒
                  </span>
                </div>
                <small className="field-example variant-total-formula">
                  Automatically calculated: {String(v.quantity_value ?? '').trim() || '—'} × ₹{String(v.price_per_unit ?? '').trim() || '—'}
                </small>
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
