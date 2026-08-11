import { useEffect, useState } from 'react'
import { getBrands, updateBrandBulkPricing } from '../services/mockApi'
import { useAuth } from '../context/AuthContext'
import Modal from '../components/ui/Modal'
import './BulkPricing.css'

// The storefront's exact five brands — same scoping as the Brands page.
const EXPECTED_SLUGS = ['arees', 'dahab', 'misk-al-arab', 'oud-al-haramain', 'amber-oud']

const EMPTY_FORM = {
  brand_id: '',
  bulk_min_qty: '',
  standard_price: '',
  bulk_unit_price: '',
  status: 'active', // 'active' | 'inactive'
}

const inr = (n) => (n == null || n === '' ? '—' : `₹${Number(n).toLocaleString('en-IN')}`)

// A brand has an ACTIVE rule only when bulk_enabled is true AND all three
// values are configured and valid (normal > bulk > 0, whole qty >= 1) — the
// exact same rule the storefront uses before showing anything.
function hasActiveRule(b) {
  const std = Number(b.standard_price)
  const bulk = Number(b.bulk_unit_price)
  const min = Number(b.bulk_min_qty)
  return Boolean(
    b.bulk_enabled === true &&
    Number.isFinite(std) && std > 0 &&
    Number.isFinite(bulk) && bulk > 0 && bulk < std &&
    Number.isInteger(min) && min >= 1
  )
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
    setForm({
      brand_id: brand.id,
      bulk_min_qty: brand.bulk_min_qty != null ? String(brand.bulk_min_qty) : '',
      standard_price: brand.standard_price != null ? String(brand.standard_price) : '',
      bulk_unit_price: brand.bulk_unit_price != null ? String(brand.bulk_unit_price) : '',
      status: brand.bulk_enabled === true ? 'active' : 'inactive',
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

  // Client-side validation mirrors the server (brandBulkPricing controller):
  // brand required, unlock qty whole > 0, normal price > 0, bulk price > 0
  // and strictly below the normal price, no duplicate active rule per brand.
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
    const min = Number(form.bulk_min_qty)
    const std = Number(form.standard_price)
    const bulk = Number(form.bulk_unit_price)

    if (form.bulk_min_qty === '' || !Number.isInteger(min) || min < 1) {
      setModalError('Bulk unlock quantity must be a whole number greater than 0.')
      return
    }
    if (form.standard_price === '' || !Number.isFinite(std) || std <= 0) {
      setModalError('Normal price must be a number greater than 0.')
      return
    }
    if (form.bulk_unit_price === '' || !Number.isFinite(bulk) || bulk <= 0) {
      setModalError('Bulk price must be a number greater than 0.')
      return
    }
    if (bulk >= std) {
      setModalError('Bulk price must be less than the normal price.')
      return
    }
    if (modalMode === 'add' && hasActiveRule(brand)) {
      setModalError(`"${brand.name}" already has an active bulk pricing rule. Edit it instead.`)
      return
    }

    setSaving(true)
    try {
      if (form.status === 'active') {
        await updateBrandBulkPricing(brand.id, {
          bulk_enabled: true,
          standard_price: std,
          bulk_unit_price: bulk,
          bulk_min_qty: min,
        })
      } else {
        // Inactive — the rule stays stored (re-activating is one click) but
        // the storefront hides it entirely.
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
            Brand-level quantity discounts — one rule per brand. When a customer's cart
            reaches the unlock quantity across <strong>any mix</strong> of that brand's
            products, every eligible product of the brand is charged at the bulk price.
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
                <th>Unlock Qty</th>
                <th>Normal Price</th>
                <th>Bulk Price</th>
                <th>Status</th>
                <th className="bulk-pricing-actions-col">Actions</th>
              </tr>
            </thead>
            <tbody>
              {brands.map((brand) => {
                const active = hasActiveRule(brand)
                const configured = brand.bulk_min_qty != null
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
                        <span className="bulk-pricing-qty">
                          {Number(brand.bulk_min_qty).toLocaleString('en-IN')} pcs
                        </span>
                      ) : (
                        <span className="bulk-pricing-empty">—</span>
                      )}
                    </td>
                    <td>{inr(brand.standard_price)}</td>
                    <td>
                      {brand.bulk_unit_price != null ? (
                        <span className="bulk-pricing-rate">{inr(brand.bulk_unit_price)} / pc</span>
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
                <label htmlFor="bp-qty">Bulk Unlock Quantity</label>
                <input
                  id="bp-qty"
                  name="bulk_min_qty"
                  type="number"
                  min="1"
                  step="1"
                  placeholder="e.g. 70"
                  value={form.bulk_min_qty}
                  onChange={handleChange}
                  required
                />
                <small className="field-example">Combined pieces of this brand in one cart.</small>
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

            <div className="form-row form-row-2">
              <div className="form-field">
                <label htmlFor="bp-normal">Normal Price (₹ / piece)</label>
                <input
                  id="bp-normal"
                  name="standard_price"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="e.g. 45"
                  value={form.standard_price}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="form-field">
                <label htmlFor="bp-bulk">Bulk Price (₹ / piece)</label>
                <input
                  id="bp-bulk"
                  name="bulk_unit_price"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="e.g. 42"
                  value={form.bulk_unit_price}
                  onChange={handleChange}
                  required
                />
                <small className="field-example">Must be less than the normal price.</small>
              </div>
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
