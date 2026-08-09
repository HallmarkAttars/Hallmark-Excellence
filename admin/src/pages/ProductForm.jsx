import { useEffect, useState } from 'react'
import { useNavigate, useParams, useSearchParams, Link } from 'react-router-dom'
import { getProduct, createProduct, updateProduct, getCategories, getBrands, uploadImage } from '../services/mockApi'
import { resolveBulkFields, resolveVariantBulkFields } from '../utils/bulkValidation'
import './ProductForm.css'

const EMPTY = {
  name: '', description: '', price: '', stock: '',
  compare_at_price: '', bulk_price: '', bulk_min_qty: '',
  bulk_enabled: false,
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
  const [variants, setVariants] = useState([])
  // Per-variant Unit search query (for the combobox).
  const [unitQueries, setUnitQueries] = useState({})

  // --- Pack state ----------------------------------------------------------
  // Flexible pack options (children of bulk pricing). Each pack: { id?,
  // name?, usage_label, pack_quantity, price, is_active, display_order }.
  // The name auto-generates from pack_quantity when left blank.
  const [packs, setPacks] = useState([])
  const EMPTY_PACK = () => ({
    name: '',
    usage_label: '',
    pack_quantity: '',
    price: '',
    is_active: true,
    display_order: packs.length + 1,
  })

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
            stock: p.stock, category_id: p.category_id ?? '', brand_id: p.brand_id ?? '',
            compare_at_price: p.compare_at_price ?? '',
            bulk_price: p.bulk_price ?? '',
            bulk_min_qty: p.bulk_min_qty ?? '',
            // Legacy products configured through the old bulk fields (price +
            // quantity set, before bulk_enabled existed) keep their config
            // visible — the admin can review or switch it off on save.
            bulk_enabled: Boolean(p.bulk_enabled) || (p.bulk_price != null && p.bulk_min_qty != null),
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
                // Per-variant bulk config — legacy variants (configured via
                // product-level bulk before this migration) surface their
                // inherited values here for review.
                bulk_enabled: Boolean(v.bulk_enabled),
                bulk_price: v.bulk_price ?? '',
                bulk_min_qty: v.bulk_min_qty ?? '',
              }))
            )
          }
          // Load existing pack options (if any) returned by the backend.
          if (Array.isArray(p.packs) && p.packs.length > 0) {
            setPacks(
              p.packs.map((pk) => ({
                id: pk.id,
                name: pk.name ?? '',
                usage_label: pk.usage_label ?? '',
                pack_quantity: pk.pack_quantity ?? '',
                price: pk.price ?? '',
                is_active: pk.is_active !== false,
                display_order: pk.display_order ?? 0,
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

  // --- Pack helpers --------------------------------------------------------
  const updatePack = (index, field, value) => {
    setPacks((prev) => prev.map((p, i) => (i === index ? { ...p, [field]: value } : p)))
  }

  const addPack = () => setPacks((prev) => [...prev, EMPTY_PACK()])

  const removePack = (index) => {
    setPacks((prev) => prev.filter((_, i) => i !== index))
  }

  const movePack = (index, dir) => {
    setPacks((prev) => {
      const next = [...prev]
      const target = index + dir
      if (target < 0 || target >= next.length) return prev
      ;[next[index], next[target]] = [next[target], next[index]]
      return next.map((p, i) => ({ ...p, display_order: i + 1 }))
    })
  }

  // A pack's display name — auto-generates from the quantity when blank.
  const packLabel = (p) =>
    (p.name || '').trim() ||
    (p.pack_quantity != null && String(p.pack_quantity).trim() !== ''
      ? `Pack of ${p.pack_quantity}`
      : 'New Pack')

  // Per-piece rate shown while editing (display only — never saved directly;
  // the backend derives it from price ÷ pack_quantity at order time).
  const packPerPiece = (p) => {
    const qty = Number(p.pack_quantity)
    const price = Number(p.price)
    if (!Number.isFinite(qty) || qty <= 0 || !Number.isFinite(price) || price < 0) return null
    return price / qty
  }

  // Packs are children of bulk pricing: the section renders when the product
  // participates in ANY bulk tier — product-level bulk (variant-less
  // products), per-variant bulk (variant products), OR the selected brand's
  // combined brand bulk (pack products like Royal Marriage carry their bulk
  // at the brand level). Mirrors the storefront showPacks gate exactly, so
  // packs the customer can buy are always manageable here.
  const selectedBrand = brands.find((b) => String(b.id) === String(form.brand_id))
  const brandBulkAvailable = Boolean(selectedBrand && selectedBrand.bulk_enabled === true)
  const bulkAvailable =
    form.bulk_enabled ||
    variants.some((v) => v.bulk_enabled) ||
    brandBulkAvailable

  // Validate the pack set (only meaningful when packs are configured).
  const validatePacks = () => {
    if (packs.length === 0) return ''
    const seen = new Set()
    for (const p of packs) {
      const qty = Number(p.pack_quantity)
      if (p.pack_quantity === '' || p.pack_quantity == null || !Number.isInteger(qty) || qty <= 0) {
        return 'Each pack needs a whole-number quantity greater than 0.'
      }
      const price = Number(p.price)
      if (p.price === '' || p.price == null || !Number.isFinite(price) || price < 0) {
        return 'Each pack needs a price greater than or equal to 0.'
      }
      if (seen.has(qty)) {
        return `Duplicate pack: Pack of ${qty} already exists for this product.`
      }
      seen.add(qty)
    }
    return ''
  }

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
      bulk_enabled: false,
      bulk_price: '',
      bulk_min_qty: '',
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

    // Optional bulk purchasing — per VARIANT. Each size is validated against
    // ITS OWN normal price (utils/bulkValidation.js, unit-tested). The
    // product-level section is used ONLY when the product has no variants.
    const resolvedVariants = []
    for (const v of variants) {
      const r = resolveVariantBulkFields({
        bulk_enabled: v.bulk_enabled,
        bulk_price: v.bulk_price,
        bulk_min_qty: v.bulk_min_qty,
        normalPrice: v.price,
      })
      if (r.error) {
        setError(`Variant ${v.quantity_value} ${v.quantity_unit}: ${r.error}`)
        return
      }
      resolvedVariants.push({ ...v, ...r })
    }

    // Product-level bulk — only relevant when the product has NO variants.
    const bulk = resolveBulkFields({
      bulk_enabled: form.bulk_enabled,
      bulk_price: form.bulk_price,
      bulk_min_qty: form.bulk_min_qty,
      sellingPrice,
      variants,
    })
    if (bulk.error) {
      setError(bulk.error)
      return
    }

    // Optional pack options — only validated when packs exist (and the admin
    // section is only rendered when bulk pricing is available).
    const packError = validatePacks()
    if (packError) {
      setError(packError)
      return
    }

    setSaving(true)
    try {
      let image = existingImages[0] || null
      if (imageFile) {
        image = await uploadImage(imageFile)
      }

      // Build the variants payload for the backend — including each size's
      // own bulk config (null when bulk is off for that variant).
      const variantsPayload = resolvedVariants.map((v) => ({
        quantity_value: Number(v.quantity_value),
        quantity_unit: v.quantity_unit.trim(),
        display_label: `${v.quantity_value} ${v.quantity_unit}`.trim(),
        price: Number(v.price),
        stock: Number(v.stock || 0),
        is_default: Boolean(v.is_default),
        bulk_enabled: v.bulkEnabled,
        bulk_price: v.bulkPrice,
        bulk_min_qty: v.bulkMinQty,
      }))

      const baseStock = hasVariants ? Number(defaultVariant?.stock ?? form.stock) : Number(form.stock)

      // Pack payload — only packs with a real quantity are sent (blank draft
      // rows are dropped). The name is optional; the backend auto-generates
      // "Pack of N" when blank.
      const packsPayload = packs
        .filter((p) => p.pack_quantity !== '' && p.pack_quantity != null)
        .map((p, i) => ({
          id: p.id ?? undefined,
          name: (p.name || '').trim() || undefined,
          usage_label: (p.usage_label || '').trim() || null,
          pack_quantity: Number(p.pack_quantity),
          price: Number(p.price),
          is_active: p.is_active !== false,
          display_order: p.display_order != null ? Number(p.display_order) : i + 1,
        }))

      const payload = {
        name: form.name,
        description: form.description,
        price: sellingPrice,
        compare_at_price: parsedCompareAt,
        bulk_enabled: bulk.bulkEnabled,
        bulk_price: bulk.bulkPrice,
        bulk_min_qty: bulk.bulkMinQty,
        rating: form.rating ? Number(form.rating) : null,
        review_count: form.review_count ? Number(form.review_count) : null,
        is_featured: Boolean(form.is_featured),
        stock: baseStock,
        category_id: form.category_id || null,
        brand_id: form.brand_id || null,
        image,
        variants: variantsPayload,
        packs: packsPayload,
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

        {/* -------- Optional Bulk Purchasing (variant-less products only) --------
            Products WITH variants configure bulk per size inside each variant
            card below — this product-level section is shown ONLY when the
            product has no variants (legacy). */}
        {variants.length === 0 && (
          <div className={`bulk-section ${form.bulk_enabled ? 'is-on' : ''}`}>
            <label className="featured-toggle">
              <input
                type="checkbox"
                name="bulk_enabled"
                checked={form.bulk_enabled}
                onChange={(e) => setForm((f) => ({ ...f, bulk_enabled: e.target.checked }))}
              />
              <span className="featured-switch" aria-hidden="true" />
              <span className="featured-toggle-text">
                Enable Bulk Purchasing
                <small>Lets customers unlock a lower unit price when they buy a minimum quantity.</small>
              </span>
            </label>

            {form.bulk_enabled && (
              <div className="bulk-section-fields">
                <div className="form-row form-row-2">
                  <div className="form-field">
                    <label htmlFor="bulk_price">Bulk Price (₹)</label>
                    <input
                      id="bulk_price"
                      name="bulk_price"
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="e.g. 80"
                      value={form.bulk_price}
                      onChange={handleChange}
                      required
                    />
                    <small className="field-example">Unit price once the bulk quantity is reached.</small>
                  </div>
                  <div className="form-field">
                    <label htmlFor="bulk_min_qty">Bulk Purchase Quantity</label>
                    <input
                      id="bulk_min_qty"
                      name="bulk_min_qty"
                      type="number"
                      min="2"
                      step="1"
                      placeholder="e.g. 100"
                      value={form.bulk_min_qty}
                      onChange={handleChange}
                      required
                    />
                    <small className="field-example">Buy this many or more to unlock the bulk price.</small>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

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

              {/* Per-variant optional bulk purchasing — each size has its own
                  toggle, price and threshold. OFF hides the fields. */}
              <div className={`variant-bulk ${v.bulk_enabled ? 'is-on' : ''}`}>
                <label className="featured-toggle variant-bulk-toggle">
                  <input
                    type="checkbox"
                    checked={v.bulk_enabled}
                    onChange={(e) =>
                      updateVariant(index, 'bulk_enabled', e.target.checked)
                    }
                  />
                  <span className="featured-switch" aria-hidden="true" />
                  <span className="featured-toggle-text">
                    Bulk Purchasing
                    <small>Unlock a lower unit price for this size at a minimum quantity.</small>
                  </span>
                </label>

                {v.bulk_enabled && (
                  <div className="variant-bulk-fields">
                    <div className="form-field">
                      <label htmlFor={`bulk-price-${index}`}>Bulk Price (₹)</label>
                      <input
                        id={`bulk-price-${index}`}
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="e.g. 80"
                        value={v.bulk_price}
                        onChange={(e) => updateVariant(index, 'bulk_price', e.target.value)}
                        required
                      />
                      <small className="field-example">Must be lower than ₹{v.price || 'this variant\'s price'}.</small>
                    </div>
                    <div className="form-field">
                      <label htmlFor={`bulk-min-qty-${index}`}>Bulk Minimum Quantity</label>
                      <input
                        id={`bulk-min-qty-${index}`}
                        type="number"
                        min="2"
                        step="1"
                        placeholder="e.g. 100"
                        value={v.bulk_min_qty}
                        onChange={(e) => updateVariant(index, 'bulk_min_qty', e.target.value)}
                        required
                      />
                      <small className="field-example">Buy this many or more of this size to unlock.</small>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* -------- Optional PACK OPTIONS (children of bulk pricing) --------
            Rendered ONLY when the product participates in bulk purchasing
            (product-level bulk OR any variant bulk). Pack options let the
            customer buy bundles of pieces (Pack of 10 / 20 / 50…) — the
            actual piece quantity (pack_quantity × packs) feeds the existing
            bulk engine. When bulk is OFF, the section (and the storefront
            pack selector) never appear. */}
        {bulkAvailable && (
          <div className="packs-section">
            <div className="variants-header packs-header">
              <h3>Pack Options</h3>
              <button type="button" className="btn btn-outline btn-sm" onClick={addPack}>
                + Add Pack
              </button>
            </div>

            {packs.length === 0 && (
              <p className="variants-empty">
                No packs yet. Add one to let customers buy this product in bundles
                (e.g. Pack of 10). Packs are only available because bulk pricing is on.
              </p>
            )}

            {packs.map((p, index) => {
              const perPiece = packPerPiece(p)
              return (
                <div className={`pack-card${p.is_active ? '' : ' is-inactive'}`} key={index}>
                  <div className="variant-card-head pack-card-head">
                    <span className="variant-title">{packLabel(p)}</span>
                    <div className="pack-card-actions">
                      <button
                        type="button"
                        className="pack-move"
                        onClick={() => movePack(index, -1)}
                        disabled={index === 0}
                        title="Move up"
                        aria-label="Move pack up"
                      >↑</button>
                      <button
                        type="button"
                        className="pack-move"
                        onClick={() => movePack(index, 1)}
                        disabled={index === packs.length - 1}
                        title="Move down"
                        aria-label="Move pack down"
                      >↓</button>
                      <button
                        type="button"
                        className="variant-delete"
                        onClick={() => removePack(index)}
                        title="Delete pack"
                        aria-label="Delete pack"
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="3 6 5 6 21 6" />
                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                          <line x1="10" y1="11" x2="10" y2="17" />
                          <line x1="14" y1="11" x2="14" y2="17" />
                        </svg>
                      </button>
                    </div>
                  </div>

                  <div className="variant-grid pack-grid">
                    <div className="form-field">
                      <label htmlFor={`pack-name-${index}`}>Pack Name (optional)</label>
                      <input
                        id={`pack-name-${index}`}
                        type="text"
                        placeholder={p.pack_quantity ? `Pack of ${p.pack_quantity}` : 'e.g. Pack of 10'}
                        value={p.name}
                        onChange={(e) => updatePack(index, 'name', e.target.value)}
                      />
                      <small className="field-example">Blank auto-generates “Pack of N”.</small>
                    </div>
                    <div className="form-field">
                      <label htmlFor={`pack-usage-${index}`}>Usage Label (optional)</label>
                      <input
                        id={`pack-usage-${index}`}
                        type="text"
                        placeholder="e.g. Family Pack"
                        value={p.usage_label}
                        onChange={(e) => updatePack(index, 'usage_label', e.target.value)}
                      />
                    </div>
                    <div className="form-field">
                      <label htmlFor={`pack-qty-${index}`}>Pieces per Pack</label>
                      <input
                        id={`pack-qty-${index}`}
                        type="number"
                        min="1"
                        step="1"
                        placeholder="e.g. 10"
                        value={p.pack_quantity}
                        onChange={(e) => updatePack(index, 'pack_quantity', e.target.value)}
                      />
                      <small className="field-example">How many pieces are in one pack.</small>
                    </div>
                    <div className="form-field">
                      <label htmlFor={`pack-price-${index}`}>Pack Price (₹)</label>
                      <input
                        id={`pack-price-${index}`}
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="e.g. 400"
                        value={p.price}
                        onChange={(e) => updatePack(index, 'price', e.target.value)}
                      />
                      <small className="field-example">
                        {perPiece != null ? `₹${perPiece.toLocaleString('en-IN', { maximumFractionDigits: 2 })} / piece` : 'Price of one whole pack.'}
                      </small>
                    </div>
                  </div>

                  <div className="pack-card-foot">
                    <label className="default-radio">
                      <input
                        type="checkbox"
                        checked={p.is_active}
                        onChange={(e) => updatePack(index, 'is_active', e.target.checked)}
                      />
                      <span>{p.is_active ? 'Active' : 'Inactive — hidden from customers'}</span>
                    </label>
                  </div>
                </div>
              )
            })}
          </div>
        )}

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
