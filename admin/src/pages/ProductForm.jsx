import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams, useSearchParams, Link } from 'react-router-dom'
import { getProduct, createProduct, updateProduct, getCategories, getBrands, uploadImage } from '../services/mockApi'
import { UNIT_OPTIONS, normalizeUnit, validateVariants } from '../utils/variantValidation'
// Attar price auto-fill (Category = Attar + Brand → the default variant's
// price comes from the brand's Bulk Pricing normal price). Pure helpers with
// unit tests in utils/attarPriceSync.test.js.
import { applyAttarPriceSync, computeVariantTotal, shouldSyncAttarPrice } from '../utils/attarPriceSync'
import { compressProductImage } from '../utils/imageCompressor'
import './ProductForm.css'

const EMPTY = {
  name: '', description: '',
  rating: '', review_count: '',
  is_featured: false,
  category_id: '', brand_id: '',
  display_order: '',
}

// Formats the live compact summary for mobile collapsed headers:
// e.g. "100 ML • ₹45/unit • Total ₹4,500"
function getVariantSummary(v) {
  const hasQty = v.quantity_value !== '' && v.quantity_value != null && !isNaN(Number(v.quantity_value))
  const hasPpu = v.price_per_unit !== '' && v.price_per_unit != null && !isNaN(Number(v.price_per_unit))
  const hasTotal = v.total_price !== '' && v.total_price != null && !isNaN(Number(v.total_price))

  const qtyPart = hasQty ? `${v.quantity_value} ${v.quantity_unit || 'ML'}` : '— ML'
  const ppuPart = hasPpu ? `₹${Number(v.price_per_unit).toLocaleString('en-IN')}/unit` : '₹—/unit'
  const totalPart = hasTotal ? `Total ₹${Number(v.total_price).toLocaleString('en-IN')}` : 'Total ₹—'

  return `${qtyPart} • ${ppuPart} • ${totalPart}`
}

// Memoized individual variant card to eliminate render stutter with 10-20+ variants.
// Only the variant being actively edited re-renders on keystroke.
const VariantCardItem = React.memo(function VariantCardItem({
  variant: v,
  index,
  isExpanded,
  hasError,
  summaryText,
  unitOptions,
  onToggle,
  onUpdate,
  onRemove,
  onSetDefault,
  disabled,
}) {
  const itemKey = v._key || `var_${index}`

  return (
    <div
      id={`variant-card-${itemKey}`}
      className={`variant-card${v.is_default ? ' is-default' : ''}${isExpanded ? ' is-expanded' : ' is-collapsed'}${hasError ? ' has-incomplete-fields' : ''}`}
    >
      <div
        className="variant-card-head"
        onClick={onToggle}
        role="button"
        tabIndex={0}
        aria-expanded={isExpanded}
        aria-controls={`variant-body-${itemKey}`}
        aria-label={`Variant ${index + 1}${v.is_default ? ' Default' : ''}, ${isExpanded ? 'collapse details' : 'expand details'}`}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            onToggle()
          }
        }}
      >
        <div className="variant-head-main">
          <div className="variant-title-row">
            <span className="variant-title">
              Variant {index + 1}
              {v.is_default && <span className="variant-default-badge">Default</span>}
              {hasError && (
                <span className="variant-error-indicator" title="This variant has incomplete or invalid fields">
                  ⚠️ Incomplete
                </span>
              )}
            </span>
          </div>
          <div className="variant-mobile-summary" aria-hidden="true">
            {summaryText}
          </div>
        </div>

        <div className="variant-head-actions">
          <button
            type="button"
            className="variant-delete"
            onClick={(e) => {
              e.stopPropagation()
              onRemove(index)
            }}
            title="Delete variant"
            aria-label={`Delete Variant ${index + 1}`}
            disabled={disabled}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
              <line x1="10" y1="11" x2="10" y2="17" />
              <line x1="14" y1="11" x2="14" y2="17" />
            </svg>
          </button>

          <button
            type="button"
            className="variant-chevron-btn"
            onClick={(e) => {
              e.stopPropagation()
              onToggle()
            }}
            aria-expanded={isExpanded}
            aria-controls={`variant-body-${itemKey}`}
            aria-label={`Toggle Variant ${index + 1} details`}
            tabIndex={-1}
          >
            <svg
              className={`variant-chevron-icon ${isExpanded ? 'is-expanded' : ''}`}
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>
        </div>
      </div>

      <div id={`variant-body-${itemKey}`} className="variant-card-body">
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
              onChange={(e) => onUpdate(index, 'quantity_value', e.target.value)}
              disabled={disabled}
            />
            <small className="field-example">Example: 100</small>
          </div>

          <div className="form-field">
            <label htmlFor={`unit-${index}`}>Unit</label>
            <select
              id={`unit-${index}`}
              value={v.quantity_unit || 'ML'}
              onChange={(e) => onUpdate(index, 'quantity_unit', e.target.value)}
              disabled={disabled}
            >
              {unitOptions.map((u) => (
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
              onChange={(e) => onUpdate(index, 'price_per_unit', e.target.value)}
              disabled={disabled}
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
              onChange={() => onSetDefault(index)}
              disabled={disabled}
            />
            <span>Default Variant</span>
          </label>
        </div>
      </div>
    </div>
  )
})

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
  const [isCompressingImage, setIsCompressingImage] = useState(false)
  const compressionPromiseRef = useRef(null)
  const previewUrlRef = useRef(null)
  const [loading, setLoading] = useState(isEdit)
  
  // Submit phases: 'idle' | 'preparing' | 'uploading' | 'saving' | 'success'
  const [submitPhase, setSubmitPhase] = useState('idle')
  const isSubmitting = submitPhase !== 'idle'
  const [error, setError] = useState('')

  // Clean up object URL on unmount to prevent memory leaks
  useEffect(() => {
    return () => {
      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current)
        previewUrlRef.current = null
      }
    }
  }, [])

  // --- Variant state ------------------------------------------------------
  const [variants, setVariants] = useState([])
  const defaultVariantIndex = variants.findIndex((v) => v.is_default)
  const [priceSyncedBrand, setPriceSyncedBrand] = useState(null)

  useEffect(() => {
    // Both master resources resolve from cache or fast parallel network
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
            display_order: p.display_order ?? '',
          })
          setExistingImages([p.image].filter(Boolean))
          setImagePreview(p.image || null)
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
      }).catch((err) => {
        setError(err.message || 'Failed to load product.')
        setLoading(false)
      })
    }
  }, [id, isEdit, lockedBrandId])

  const handleCategoryChange = useCallback((e) => {
    const categoryId = e.target.value
    setForm((f) => ({ ...f, category_id: categoryId }))
  }, [])

  const selectedCategory = useMemo(
    () => categories.find((c) => String(c.id) === String(form.category_id)),
    [categories, form.category_id]
  )
  const isAttarCategory = selectedCategory?.slug === 'attar' || selectedCategory?.name === 'Attar'

  const selectedBrand = useMemo(
    () => brands.find((b) => String(b.id) === String(form.brand_id)),
    [brands, form.brand_id]
  )
  const brandNormalPrice =
    isAttarCategory && selectedBrand ? Number(selectedBrand.standard_price) : null
  const brandHasNormalPrice = Number.isFinite(brandNormalPrice) && brandNormalPrice > 0

  // ATTAR PRICE SYNC
  useEffect(() => {
    if (!shouldSyncAttarPrice({ isEdit, isAttarCategory, brandHasNormalPrice })) {
      setPriceSyncedBrand(null)
      return
    }
    setVariants((prev) =>
      applyAttarPriceSync({
        variants: prev,
        brandId: form.brand_id,
        priceSyncedBrand,
        brandNormalPrice,
      })
    )
    setPriceSyncedBrand(form.brand_id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEdit, isAttarCategory, form.brand_id, selectedBrand, variants.length, defaultVariantIndex, priceSyncedBrand])

  const handleChange = useCallback((e) => {
    const { name, value } = e.target
    setForm((f) => ({ ...f, [name]: value }))
  }, [])

  const handleImageChange = (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Revoke previous blob URL to prevent memory leaks
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current)
      previewUrlRef.current = null
    }

    // Instant local preview without reading full base64 string
    try {
      const previewUrl = URL.createObjectURL(file)
      previewUrlRef.current = previewUrl
      setImagePreview(previewUrl)
    } catch {
      // Fallback
    }

    setImageFile(file)
    setIsCompressingImage(true)

    // Pre-compress image client-side in background while user fills form
    const promise = compressProductImage(file)
      .then((optimizedFile) => {
        setImageFile(optimizedFile)
        setIsCompressingImage(false)
        return optimizedFile
      })
      .catch((err) => {
        console.warn('Image pre-compression warning:', err)
        setImageFile(file)
        setIsCompressingImage(false)
        return file
      })

    compressionPromiseRef.current = promise
  }

  // Tracks which variants are expanded on mobile. Keyed by variant unique key.
  const [expandedMap, setExpandedMap] = useState({})

  const toggleVariant = useCallback((key) => {
    setExpandedMap((prev) => ({
      ...prev,
      [key]: !prev[key],
    }))
  }, [])

  const isVariantIncomplete = useCallback((v, index) => {
    const q = String(v.quantity_value ?? '').trim()
    const u = String(v.quantity_unit ?? '').trim()
    const p = v.price_per_unit
    const t = v.total_price

    if (!q || isNaN(Number(q)) || Number(q) <= 0) return true
    if (!u || !UNIT_OPTIONS.includes(u)) return true
    if (p === '' || p == null || isNaN(Number(p)) || Number(p) < 0) return true
    if (t === '' || t == null || isNaN(Number(t)) || Number(t) < 0) return true

    // Check duplicate quantity + unit with other variants
    const key = `${q.toUpperCase()}|${u.toUpperCase()}`
    const duplicate = variants.some((other, i) => {
      if (i === index) return false
      const oq = String(other.quantity_value ?? '').trim().toUpperCase()
      const ou = String(other.quantity_unit ?? '').trim().toUpperCase()
      return `${oq}|${ou}` === key
    })
    if (duplicate) return true

    return false
  }, [variants])

  const addVariant = useCallback(() => {
    const newKey = `var_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
    setVariants((prev) => [
      ...prev,
      {
        _key: newKey,
        quantity_value: '',
        quantity_unit: 'ML',
        total_price: '',
        price_per_unit: '',
        is_default: prev.length === 0, // first variant is default by default
      },
    ])
    setExpandedMap((prev) => ({
      ...prev,
      [newKey]: true,
    }))
    // Use requestAnimationFrame for immediate smooth scrolling
    requestAnimationFrame(() => {
      const el = document.getElementById(`variant-card-${newKey}`)
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
      }
    })
  }, [])

  const updateVariant = useCallback((index, field, value) => {
    setVariants((prev) =>
      prev.map((v, i) => {
        if (i !== index) return v
        const next = { ...v, [field]: value }
        if (field === 'quantity_value' || field === 'price_per_unit') {
          next.total_price = computeVariantTotal(next.quantity_value, next.price_per_unit)
        }
        return next
      })
    )
  }, [])

  const removeVariant = useCallback((index) => {
    setVariants((prev) => {
      const removedWasDefault = prev[index]?.is_default
      const next = prev.filter((_, i) => i !== index)
      if (removedWasDefault && next.length > 0 && !next.some((v) => v.is_default)) {
        next[0] = { ...next[0], is_default: true }
      }
      return next
    })
  }, [])

  const setDefaultVariant = useCallback((index) => {
    setVariants((prev) => prev.map((v, i) => ({ ...v, is_default: i === index })))
  }, [])

  const unitOptionsFor = useCallback((v) => {
    const current = v?.quantity_unit?.trim()
    if (current && !UNIT_OPTIONS.includes(current)) {
      return [...UNIT_OPTIONS, current]
    }
    return UNIT_OPTIONS
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (isSubmitting) return // Guard against rapid duplicate clicks

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

    try {
      let image = existingImages[0] || null
      if (imageFile) {
        let fileToUpload = imageFile

        // If background compression is still in progress when submit is clicked, wait for it
        if (compressionPromiseRef.current && isCompressingImage) {
          setSubmitPhase('preparing')
          try {
            fileToUpload = await compressionPromiseRef.current
          } catch {
            fileToUpload = imageFile
          }
        }

        setSubmitPhase('uploading')
        try {
          image = await uploadImage(fileToUpload)
        } catch (uploadErr) {
          console.error('Image upload failed:', uploadErr)
          setError(uploadErr.message || 'Image upload failed. Please check your connection and try again.')
          setSubmitPhase('idle')
          return // Stop! Do NOT create product if upload failed
        }
      }

      setSubmitPhase('saving')

      // Build the variants payload for the backend
      const variantsPayload = variants.map((v) => ({
        quantity_value: Number(v.quantity_value),
        quantity_unit: v.quantity_unit.trim(),
        display_label: `${v.quantity_value} ${v.quantity_unit}`.trim(),
        total_price: Number(v.total_price),
        price_per_unit: Number(v.price_per_unit),
        is_default: Boolean(v.is_default),
      }))

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
        display_order: form.display_order === '' ? undefined : Number(form.display_order),
      }

      if (isEdit) {
        await updateProduct(id, payload)
      } else {
        await createProduct(payload)
      }

      setSubmitPhase('success')

      // Immediate navigation to destination
      if (!isEdit && lockedBrandSlug) {
        navigate(`/admin/brands/${lockedBrandSlug}`)
      } else {
        navigate('/admin/products')
      }
    } catch (err) {
      setError(err.message || 'Failed to save product. Please try again.')
      setSubmitPhase('idle')
    }
  }

  const submitButtonLabel = () => {
    if (submitPhase === 'preparing') return 'Preparing image…'
    if (submitPhase === 'uploading') return 'Uploading image…'
    if (submitPhase === 'saving') return isEdit ? 'Saving changes…' : 'Creating product…'
    if (submitPhase === 'success') return isEdit ? 'Changes saved!' : 'Product created!'
    return isEdit ? 'Save Changes' : 'Add Product'
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
          <input
            id="name"
            name="name"
            value={form.name}
            onChange={handleChange}
            required
            disabled={isSubmitting}
          />
        </div>

        <div className="form-field">
          <label htmlFor="description">Description</label>
          <textarea
            id="description"
            name="description"
            rows={4}
            value={form.description}
            onChange={handleChange}
            required
            disabled={isSubmitting}
          />
        </div>

        <div className="form-field featured-field">
          <label className="featured-toggle">
            <input
              type="checkbox"
              name="is_featured"
              checked={form.is_featured}
              onChange={(e) => setForm((f) => ({ ...f, is_featured: e.target.checked }))}
              disabled={isSubmitting}
            />
            <span className="featured-switch" aria-hidden="true" />
            <span className="featured-toggle-text">
              Featured on Homepage
              <small>Shows this product in the “Featured Products” section on the storefront.</small>
            </span>
          </label>
        </div>

        {/* Ratings */}
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
              disabled={isSubmitting}
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
              disabled={isSubmitting}
            />
            <small className="field-example">Displayed as “| (81)” next to the rating.</small>
          </div>
        </div>

        {/* Product Variants section */}
        <div className="variants-section">
          <div className="variants-header">
            <h3>Product Variants</h3>
            <button
              type="button"
              className="btn btn-outline btn-sm"
              onClick={addVariant}
              disabled={isSubmitting}
            >
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

          {variants.map((v, index) => {
            const itemKey = v._key || `var_${index}`
            const isExpanded = Boolean(expandedMap[itemKey])
            const hasError = isVariantIncomplete(v, index)
            const summaryText = getVariantSummary(v)
            const unitOptions = unitOptionsFor(v)

            return (
              <VariantCardItem
                key={itemKey}
                variant={v}
                index={index}
                isExpanded={isExpanded}
                hasError={hasError}
                summaryText={summaryText}
                unitOptions={unitOptions}
                onToggle={() => toggleVariant(itemKey)}
                onUpdate={updateVariant}
                onRemove={removeVariant}
                onSetDefault={setDefaultVariant}
                disabled={isSubmitting}
              />
            )
          })}
        </div>

        <div className="form-field">
          <label htmlFor="display_order">Display Position (optional)</label>
          <input
            id="display_order"
            name="display_order"
            type="number"
            min="1"
            step="1"
            placeholder="End of list"
            value={form.display_order}
            onChange={handleChange}
            disabled={isSubmitting}
          />
          <small className="field-example">
            Products appear on the storefront in this exact order (1 = first,
            never alphabetical). Leave empty for new products to be added at the end.
          </small>
        </div>

        <div className="form-row form-row-2">
          <div className="form-field">
            <label htmlFor="category_id">Category</label>
            <select
              id="category_id"
              name="category_id"
              value={form.category_id}
              onChange={handleCategoryChange}
              required
              disabled={isSubmitting}
            >
              <option value="">Select category</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className="form-field">
            <label htmlFor="brand_id">
              Brand{isAttarCategory ? ' *' : ' (optional)'}
            </label>
            <div className={`brand-select-wrap${lockedBrandId ? ' is-locked' : ''}`}>
              <select
                id="brand_id"
                name="brand_id"
                value={form.brand_id}
                onChange={handleChange}
                required={isAttarCategory}
                disabled={Boolean(lockedBrandId) || isSubmitting}
                className={lockedBrandId ? 'brand-locked-select' : ''}
              >
                <option value="">Select brand</option>
                {brands.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
              {lockedBrandId && (
                <span className="brand-lock-icon" aria-hidden="true">🔒</span>
              )}
            </div>
            {lockedBrandId && (
              <small className="brand-lock-hint">
                🔒 Brand locked to {lockedBrandName || 'this brand'} — added from its product page
              </small>
            )}
            {isAttarCategory && !form.brand_id && !lockedBrandId && (
              <small className="brand-required-hint">
                Brand is required for Attar products
              </small>
            )}
            {!isEdit && isAttarCategory && form.brand_id && selectedBrand && (
              <small className="attar-price-sync-hint">
                {brandHasNormalPrice ? (
                  <>Price synced from {selectedBrand.name} bulk pricing (₹{Number(brandNormalPrice).toLocaleString('en-IN')} / piece)</>
                ) : (
                  <>{selectedBrand.name} has no bulk pricing normal price yet</>
                )}
              </small>
            )}
          </div>
        </div>

        <div className="form-field">
          <label htmlFor="image">Product Image</label>
          <input
            id="image"
            type="file"
            accept="image/*"
            onChange={handleImageChange}
            disabled={isSubmitting}
          />
          {isCompressingImage && (
            <small className="field-example" style={{ color: 'var(--color-gold, #c4974f)' }}>
              Preparing image…
            </small>
          )}
          {imagePreview && (
            <div className="image-preview">
              <img src={imagePreview} alt="Preview" />
            </div>
          )}
        </div>

        {error && <p className="login-error">{error}</p>}

        <button
          className="btn btn-gold"
          type="submit"
          disabled={isSubmitting}
        >
          {submitButtonLabel()}
        </button>
      </form>
    </div>
  )
}
