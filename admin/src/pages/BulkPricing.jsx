import { useEffect, useState } from 'react'
import { getBrands, updateBrandBulkPricing } from '../services/mockApi'
import { useAuth } from '../context/AuthContext'
import Modal from '../components/ui/Modal'
import { getBulkTiers, validateTiers } from '../utils/brandBulkTiers'
import './BulkPricing.css'

// The storefront's exact five brands — same scoping as the Brands page.
const EXPECTED_SLUGS = ['arees', 'dahab', 'misk-al-arab', 'oud-al-haramain', 'amber-oud']

const EMPTY_FORM = {
  brand_id: '',
  standard_price: '',
  status: 'active', // 'active' | 'inactive'
  tiers: [{ minQuantity: '', price: '' }],
}

const inr = (n) => (n == null || n === '' ? '—' : `₹${Number(n).toLocaleString('en-IN')}`)

// A brand has an ACTIVE rule only when bulk_enabled is true AND its stored
// tiers are complete and valid (every price below the normal price, never
// rising with quantity) — the same rule the storefront uses before showing
// anything.
function hasActiveRule(b) {
  if (b.bulk_enabled !== true) return false
  return validateTiers(getBulkTiers(b), b.standard_price) === null
}

export default function BulkPricing() {
  const { can } = useAuth()
  const canEdit = can('brands.edit')
  const [brands, setBrands] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [modalMode, setModalMode] = useState(null) // 'add' | 'edit' | null
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [modalError, setModalError] = useState('')
  const [confirmRemove, setConfirmRemove] = useState(null) // brand | null

  const load = () => {
    setLoading(true)
    getBrands()
      .then((list) => {
        const five = list
          .filter((b) => EXPECTED_SLUGS.includes(b.slug))
          .sort((a, b) => {
            const ao = a.display_order ?? Number.MAX_SAFE_INTEGER
            const bo = b.display_order ?? Number.MAX_SAFE_INTEGER
            if (ao !== bo) return ao - bo
            return EXPECTED_SLUGS.indexOf(a.slug) - EXPECTED_SLUGS.indexOf(b.slug)
          })
        setBrands(five)
        setLoading(false)
      })
      .catch((err) => {
        setError(err.message || 'Failed to load brands.')
        setLoading(false)
      })
  }

  useEffect(load, [])

  // Brands that do NOT already carry an active rule — the only ones that may
  // be picked when adding a new rule (one rule per brand).
  const brandsWithoutRule = brands.filter((b) => !hasActiveRule(b))

  const openAdd = (preselectId = '') => {
    setForm({ ...EMPTY_FORM, brand_id: preselectId })
    setModalError('')
    setEditingId(null)
    setModalMode('add')
  }

  const openEdit = (brand) => {
    // Normalize the stored config (multi-tier jsonb OR legacy single-tier
    // columns) into editable rows — existing single-tier brands open with
    // one tier and are untouched until saved.
    const storedTiers = getBulkTiers(brand)
    setForm({
      brand_id: brand.id,
      standard_price: brand.standard_price != null ? String(brand.standard_price) : '',
      status: brand.bulk_enabled === true ? 'active' : 'inactive',
      tiers: storedTiers && storedTiers.length > 0
        ? storedTiers.map((t) => ({ minQuantity: String(t.minQuantity), price: String(t.price) }))
        : [{ minQuantity: '', price: '' }],
    })
    setModalError('')
    setEditingId(brand.id)
    setModalMode('edit')
  }

  const closeModal = () => {
    setModalMode(null)
    setEditingId(null)
    setForm(EMPTY_FORM)
    setModalError('')
  }

  const handleChange = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }))

  // --- Multi-tier editor ---------------------------------------------------
  const updateTier = (index, field, value) => {
    setForm((f) => ({
      ...f,
      tiers: f.tiers.map((t, i) => (i === index ? { ...t, [field]: value } : t)),
    }))
  }

  const addTier = () => {
    setForm((f) => ({ ...f, tiers: [...f.tiers, { minQuantity: '', price: '' }] }))
  }

  const removeTier = (index) => {
    setForm((f) => ({
      ...f,
      // Never leave the editor with zero rows — removing the last row adds a
      // fresh empty one so the admin always sees the input grid.
      tiers: f.tiers.filter((_, i) => i !== index).length > 0
        ? f.tiers.filter((_, i) => i !== index)
        : [{ minQuantity: '', price: '' }],
    }))
  }

  // Client-side validation mirrors the server (brands.controller): normal
  // price > 0, at least one tier, every tier a positive whole quantity with
  // a positive price below the normal price, unique quantities, and prices
  // that never rise with quantity. Tiers are sorted ascending before saving.
  const handleSubmit = async (e) => {
    e.preventDefault()
    setModalError('')
    if (!form.brand_id) {
      setModalError('Please select a brand.')
      return
    }
    const brand = brands.find((b) => b.id === form.brand_id)
    if (!brand) {
      setModalError('Brand not found.')
      return
    }
    const std = Number(form.standard_price)
    if (form.standard_price === '' || !Number.isFinite(std) || std <= 0) {
      setModalError('Normal price must be a number greater than 0.')
      return
    }

    // Unused (fully empty) rows are pruned — a tier with ANY value filled is
    // validated strictly so a half-filled row can never be saved, no matter
    // the status.
    const filled = form.tiers.filter(
      (t) => String(t.minQuantity).trim() !== '' || String(t.price).trim() !== ''
    )
    if (filled.length === 0) {
      if (form.status === 'active') {
        setModalError('Add at least one bulk price tier.')
        return
      }
      // Inactive with no tiers — there is nothing to validate or store beyond
      // disabling whatever rule is already saved.
    } else {
      const tiers = filled
        .map((t) => ({ minQuantity: Number(t.minQuantity), price: Number(t.price) }))
        .sort((a, b) => a.minQuantity - b.minQuantity)
      const tierError = validateTiers(tiers, std)
      if (tierError) {
        setModalError(tierError)
        return
      }
    }
    if (modalMode === 'add' && hasActiveRule(brand)) {
      setModalError(`"${brand.name}" already has an active bulk pricing rule. Edit it instead.`)
      return
    }

    setSaving(true)
    try {
      const tiers = filled
        .map((t) => ({ minQuantity: Number(t.minQuantity), price: Number(t.price) }))
        .sort((a, b) => a.minQuantity - b.minQuantity)
      if (form.status === 'active') {
        await updateBrandBulkPricing(brand.id, {
          bulk_enabled: true,
          standard_price: std,
          tiers,
        })
      } else if (filled.length > 0) {
        // Inactive with (validated) edits — persist the config but keep the
        // rule hidden so re-activating restores exactly what was entered.
        await updateBrandBulkPricing(brand.id, {
          bulk_enabled: false,
          standard_price: std,
          tiers,
        })
      } else {
        // Inactive, untouched rule — the rule stays stored (re-activating is
        // one click) but the storefront hides it entirely.
        await updateBrandBulkPricing(brand.id, { bulk_enabled: false })
      }
      closeModal()
      load()
    } catch (err) {
      setModalError(err.message || 'Failed to save bulk pricing. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const handleRemove = async (brand) => {
    try {
      await updateBrandBulkPricing(brand.id, {
        bulk_enabled: false,
        standard_price: null,
        bulk_unit_price: null,
        bulk_min_qty: null,
        tiers: null,
      })
      setConfirmRemove(null)
      load()
    } catch (err) {
      setError(err.message || 'Failed to remove bulk pricing.')
      setConfirmRemove(null)
    }
  }

  return (
    <div className="bulk-pricing-page">
      <div className="page-header">
        <div>
          <h1>Bulk Pricing</h1>
          <p className="bulk-pricing-intro">
            Brand-level quantity discounts with <strong>multiple price tiers</strong> per brand.
            When a customer's cart reaches a tier's minimum across <strong>any mix</strong> of that
            brand's products, every eligible product is charged at the <strong>highest applicable
            tier</strong> — the best rate the quantity qualifies for.
          </p>
        </div>
        {canEdit && brandsWithoutRule.length > 0 && (
          <button className="btn btn-gold" onClick={() => openAdd()}>
            + Add Bulk Price
          </button>
        )}
      </div>

      {error && <p className="login-error">{error}</p>}

      {loading ? (
        <div className="loading-state">Loading brands…</div>
      ) : (
        <div className="card bulk-pricing-table-wrap">
          <table className="bulk-pricing-table">
            <thead>
              <tr>
                <th>Brand</th>
                <th>Price Tiers</th>
                <th>Normal Price</th>
                <th>Best Bulk Price</th>
                <th>Status</th>
                <th className="bulk-pricing-actions-col">Actions</th>
              </tr>
            </thead>
            <tbody>
              {brands.map((brand) => {
                const active = hasActiveRule(brand)
                const tiers = getBulkTiers(brand)
                const configured = Boolean(tiers && tiers.length > 0)
                const bestTier = tiers ? tiers[tiers.length - 1] : null
                return (
                  <tr key={brand.id}>
                    <td className="bulk-pricing-brand">
                      <span className="bulk-pricing-brand-name">{brand.name}</span>
                      {configured && (
                        <span className="bulk-pricing-brand-sub">
                          {active ? 'Bulk pricing active' : 'Rule saved · inactive'}
                        </span>
                      )}
                    </td>
                    <td>
                      {configured ? (
                        <ul className="bulk-pricing-tiers">
                          {tiers.map((t) => (
                            <li key={t.minQuantity}>
                              <span className="bulk-pricing-qty">
                                {Number(t.minQuantity).toLocaleString('en-IN')} pcs
                              </span>
                              <span className="bulk-pricing-tier-arrow">→</span>
                              <span className="bulk-pricing-rate">
                                ₹{Number(t.price).toLocaleString('en-IN')}
                              </span>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <span className="bulk-pricing-empty">—</span>
                      )}
                    </td>
                    <td>{inr(brand.standard_price)}</td>
                    <td>
                      {bestTier ? (
                        <span className="bulk-pricing-rate">
                          {inr(bestTier.price)} / pc
                          <span className="bulk-pricing-brand-sub">
                            from {Number(bestTier.minQuantity).toLocaleString('en-IN')} pcs
                          </span>
                        </span>
                      ) : (
                        <span className="bulk-pricing-empty">—</span>
                      )}
                    </td>
                    <td>
                      {active ? (
                        <span className="status-pill bulk-status-active">Active</span>
                      ) : configured ? (
                        <span className="status-pill bulk-status-inactive">Inactive</span>
                      ) : (
                        <span className="status-pill bulk-status-none">Not Set</span>
                      )}
                    </td>
                    <td className="bulk-pricing-actions">
                      {configured ? (
                        <>
                          {canEdit && (
                            <button className="btn btn-outline btn-sm" onClick={() => openEdit(brand)}>
                              Edit
                            </button>
                          )}
                          {canEdit && (
                            <button
                              className="btn btn-danger btn-sm"
                              onClick={() => setConfirmRemove(brand)}
                            >
                              Remove
                            </button>
                          )}
                          {!canEdit && <span className="bulk-pricing-locked">View only</span>}
                        </>
                      ) : (
                        canEdit && (
                          <button className="btn btn-outline btn-sm" onClick={() => openAdd(brand.id)}>
                            Configure
                          </button>
                        )
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {modalMode && (
        <Modal title={modalMode === 'edit' ? 'Edit Bulk Pricing' : 'Add Bulk Price'} onClose={closeModal}>
          <form onSubmit={handleSubmit}>
            <div className="form-field">
              <label htmlFor="bp-brand">Brand</label>
              {modalMode === 'edit' ? (
                <input id="bp-brand" value={brands.find((b) => b.id === form.brand_id)?.name || ''} readOnly />
              ) : (
                <select id="bp-brand" name="brand_id" value={form.brand_id} onChange={handleChange}>
                  <option value="">Select brand…</option>
                  {brandsWithoutRule.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div className="form-row form-row-2">
              <div className="form-field">
                <label htmlFor="bp-normal">Normal Price (₹ / piece)</label>
                <input
                  id="bp-normal"
                  name="standard_price"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="e.g. 50"
                  value={form.standard_price}
                  onChange={handleChange}
                  required
                />
                <small className="field-example">The per-piece price before any bulk discount.</small>
              </div>
              <div className="form-field">
                <label htmlFor="bp-status">Status</label>
                {modalMode === 'edit' ? (
                  <select id="bp-status" name="status" value={form.status} onChange={handleChange}>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                ) : (
                  // Adding always starts Active — an inactive add would store
                  // nothing, so the status is fixed here (editable afterwards).
                  <input id="bp-status" value="Active" readOnly />
                )}
              </div>
            </div>

            {/* BULK PRICE TIERS — dynamic rows, validated on save */}
            <div className="bulk-tiers-block">
              <p className="bulk-tiers-title">BULK PRICE TIERS</p>
              <div className="bulk-tier-head">
                <span>Minimum Quantity</span>
                <span>Price / Piece</span>
                <span />
              </div>
              <div className="bulk-tier-list">
                {form.tiers.map((tier, index) => (
                  <div className="bulk-tier-row" key={index}>
                    <input
                      type="number"
                      min="1"
                      step="1"
                      placeholder="e.g. 100"
                      value={tier.minQuantity}
                      onChange={(e) => updateTier(index, 'minQuantity', e.target.value)}
                      aria-label={`Tier ${index + 1} minimum quantity`}
                    />
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="e.g. 43"
                      value={tier.price}
                      onChange={(e) => updateTier(index, 'price', e.target.value)}
                      aria-label={`Tier ${index + 1} price per piece`}
                    />
                    <button
                      type="button"
                      className="btn btn-danger btn-sm bulk-tier-remove"
                      onClick={() => removeTier(index)}
                      aria-label={`Delete tier ${index + 1}`}
                    >
                      Delete
                    </button>
                  </div>
                ))}
              </div>
              <button type="button" className="btn btn-outline btn-sm bulk-tiers-add" onClick={addTier}>
                + Add Price Tier
              </button>
              <small className="field-example bulk-tier-hint">
                The highest tier the quantity reaches is applied automatically (e.g. 150 pieces of a
                100/150/200-pcs rule uses the 150-pcs rate). Prices must never rise with quantity.
              </small>
            </div>

            {modalError && <p className="login-error">{modalError}</p>}

            <button className="btn btn-gold" type="submit" disabled={saving} style={{ width: '100%' }}>
              {saving ? 'Saving…' : modalMode === 'edit' ? 'Save Changes' : 'Save Bulk Price'}
            </button>
          </form>
        </Modal>
      )}

      {confirmRemove && (
        <Modal title="Remove Bulk Pricing?" onClose={() => setConfirmRemove(null)}>
          <p>
            This clears the bulk pricing rule for <strong>{confirmRemove.name}</strong>. The
            brand's products return to their normal prices and the rule is removed.
          </p>
          <div className="confirm-dialog-actions">
            <button className="btn btn-outline" onClick={() => setConfirmRemove(null)}>
              Cancel
            </button>
            <button className="btn btn-danger" onClick={() => handleRemove(confirmRemove)}>
              Remove Rule
            </button>
          </div>
        </Modal>
      )}
    </div>
  )
}
