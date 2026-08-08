import { useEffect, useState } from 'react'
import { getBrands, getProducts, updateBrandBulkPricing } from '../services/mockApi'
import { resolveBrandBulkFields } from '../utils/bulkValidation'
import { useAuth } from '../context/AuthContext'
import './BrandBulkPricing.css'

// Per-brand editable state (strings so the inputs stay typeable, like the
// product form). On save, resolveBrandBulkFields validates + parses them.
const emptyForm = () => ({
  bulk_enabled: false,
  standard_price: '',
  bulk_unit_price: '',
  bulk_min_qty: '',
})

export default function BrandBulkPricing() {
  const { can } = useAuth()
  const canEdit = can('brands.edit')
  const [brands, setBrands] = useState([])
  const [productCounts, setProductCounts] = useState({})
  const [forms, setForms] = useState({})
  const [savingId, setSavingId] = useState(null)
  const [errors, setErrors] = useState({})
  const [successes, setSuccesses] = useState({})
  const [loading, setLoading] = useState(true)

  const load = () => {
    setLoading(true)
    Promise.all([getBrands(), getProducts()])
      .then(([brandList, products]) => {
        setBrands(brandList)
        const counts = {}
        products.forEach((p) => {
          if (p.brand_id) counts[p.brand_id] = (counts[p.brand_id] || 0) + 1
        })
        setProductCounts(counts)
        // Seed the form state from each brand's current values.
        setForms((prev) => {
          const next = { ...prev }
          brandList.forEach((b) => {
            if (next[b.id]) return
            next[b.id] = {
              bulk_enabled: b.bulk_enabled === true,
              standard_price: b.standard_price != null ? String(b.standard_price) : '',
              bulk_unit_price: b.bulk_unit_price != null ? String(b.bulk_unit_price) : '',
              bulk_min_qty: b.bulk_min_qty != null ? String(b.bulk_min_qty) : '',
            }
          })
          return next
        })
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }

  useEffect(load, [])

  const setField = (brandId, field, value) => {
    setForms((prev) => ({ ...prev, [brandId]: { ...prev[brandId], [field]: value } }))
    // Clear the stale message for this brand on any edit.
    setErrors((e) => ({ ...e, [brandId]: '' }))
    setSuccesses((s) => ({ ...s, [brandId]: '' }))
  }

  const handleSave = async (brand) => {
    const form = forms[brand.id]
    if (!form) return

    const resolved = resolveBrandBulkFields(form)
    if (resolved.error) {
      setErrors((e) => ({ ...e, [brand.id]: resolved.error }))
      return
    }

    setSavingId(brand.id)
    try {
      await updateBrandBulkPricing(brand.id, {
        bulk_enabled: resolved.bulkEnabled,
        standard_price: resolved.standardPrice,
        bulk_unit_price: resolved.bulkUnitPrice,
        bulk_min_qty: resolved.bulkMinQty,
      })
      setSuccesses((s) => ({
        ...s,
        [brand.id]: resolved.bulkEnabled
          ? 'Combined bulk pricing saved — live on the storefront now.'
          : 'Combined bulk pricing turned off.',
      }))
      // Reflect the server-normalized values back into the form (OFF clears
      // the inputs so the stored state is never misleading).
      if (!resolved.bulkEnabled) {
        setForms((prev) => ({
          ...prev,
          [brand.id]: { bulk_enabled: false, standard_price: '', bulk_unit_price: '', bulk_min_qty: '' },
        }))
      }
    } catch (err) {
      setErrors((e) => ({ ...e, [brand.id]: err.message || 'Failed to save. Please try again.' }))
    } finally {
      setSavingId(null)
    }
  }

  return (
    <div>
      <div className="page-header">
        <h1>Brand Bulk Pricing</h1>
      </div>

      <p className="brand-bulk-intro">
        Combined-quantity discounts are applied per BRAND: when a customer's cart
        reaches the threshold across any mix of that brand's products, every item
        of the brand is charged at the bulk unit price.
      </p>

      {!canEdit && (
        <p className="brand-bulk-note">
          You have view-only access — ask an Admin or Manager to change brand pricing.
        </p>
      )}

      {loading ? (
        <div className="loading-state">Loading brands…</div>
      ) : brands.length === 0 ? (
        <div className="empty-state">No brands found.</div>
      ) : (
        <div className="brand-bulk-grid">
          {brands.map((brand) => {
            const form = forms[brand.id] || emptyForm()
            const isOn = form.bulk_enabled
            return (
              <div key={brand.id} className="card brand-bulk-card-admin">
                <div className="brand-bulk-card-admin-head">
                  <h2>{brand.name}</h2>
                  <span className="brand-bulk-product-count">
                    {productCounts[brand.id] || 0} products
                  </span>
                </div>

                {/* Enable toggle — same switch pattern as the product form */}
                <div className={`brand-bulk-toggle ${isOn ? 'is-on' : ''}`}>
                  <label className="featured-toggle">
                    <input
                      type="checkbox"
                      checked={isOn}
                      onChange={(e) => setField(brand.id, 'bulk_enabled', e.target.checked)}
                    />
                    <span className="featured-switch" aria-hidden="true" />
                    <span className="featured-toggle-text">
                      Enable Combined Bulk Pricing
                      <small>
                        Discount unlocks when the cart's total quantity across all{' '}
                        {brand.name} items reaches the threshold.
                      </small>
                    </span>
                  </label>
                </div>

                {isOn && (
                  <div className="brand-bulk-fields">
                    <div className="form-row form-row-2">
                      <div className="form-field">
                        <label htmlFor={`standard-price-${brand.id}`}>Standard Price (₹)</label>
                        <input
                          id={`standard-price-${brand.id}`}
                          type="number"
                          min="0"
                          step="0.01"
                          placeholder="e.g. 2500"
                          value={form.standard_price}
                          onChange={(e) => setField(brand.id, 'standard_price', e.target.value)}
                          required
                        />
                        <small className="field-example">
                          The banner's reference price — bulk unit price must be below it.
                        </small>
                      </div>
                      <div className="form-field">
                        <label htmlFor={`bulk-min-${brand.id}`}>Combined Quantity Threshold</label>
                        <input
                          id={`bulk-min-${brand.id}`}
                          type="number"
                          min="2"
                          step="1"
                          placeholder="e.g. 91"
                          value={form.bulk_min_qty}
                          onChange={(e) => setField(brand.id, 'bulk_min_qty', e.target.value)}
                          required
                        />
                        <small className="field-example">
                          Total pieces across any mix of {brand.name} items to unlock.
                        </small>
                      </div>
                    </div>
                    <div className="form-field">
                      <label htmlFor={`bulk-unit-${brand.id}`}>Bulk Unit Price (₹)</label>
                      <input
                        id={`bulk-unit-${brand.id}`}
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="e.g. 2000"
                        value={form.bulk_unit_price}
                        onChange={(e) => setField(brand.id, 'bulk_unit_price', e.target.value)}
                        required
                      />
                      <small className="field-example">
                        Charged per piece for every {brand.name} item once unlocked.
                      </small>
                    </div>
                  </div>
                )}

                {errors[brand.id] && <p className="login-error brand-bulk-error">{errors[brand.id]}</p>}
                {successes[brand.id] && <p className="brand-bulk-success">{successes[brand.id]}</p>}

                <button
                  className="btn btn-gold brand-bulk-save"
                  onClick={() => handleSave(brand)}
                  disabled={savingId === brand.id || !canEdit}
                  title={!canEdit ? 'You need edit permission to save brand pricing.' : undefined}
                >
                  {savingId === brand.id ? 'Saving…' : 'Save Brand Pricing'}
                </button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
