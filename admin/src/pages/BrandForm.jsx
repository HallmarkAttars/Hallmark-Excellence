import { useEffect, useState } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { getBrands, updateBrandDetails, uploadImage } from '../services/mockApi'
import { useAuth } from '../context/AuthContext'
import './Brands.css'

// One image slot = current URL + optional replacement file (uploaded on submit).
const imageSlot = (initial) => ({
  current: initial || '',
  file: null,
  preview: initial || '',
})

export default function BrandForm() {
  const { slug } = useParams()
  const navigate = useNavigate()
  const { can } = useAuth()
  const canEdit = can('brands.edit')

  const [brand, setBrand] = useState(null)
  const [form, setForm] = useState({
    name: '',
    collection_label: '',
    description: '',
    long_description: '',
    display_order: '',
    display_type: 'standard',
    is_active: true,
  })
  const [images, setImages] = useState({
    logo_url: null,
    cover_image_url: null,
    card_image_url: null,
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    getBrands()
      .then((brands) => {
        const b = brands.find((x) => x.slug === slug) || null
        setBrand(b)
        if (b) {
          setForm({
            name: b.name || '',
            collection_label: b.collection_label || '',
            description: b.description || '',
            long_description: b.long_description || '',
            display_order: b.display_order != null ? String(b.display_order) : '',
            display_type: b.display_type === 'featured' ? 'featured' : 'standard',
            is_active: b.is_active !== false,
          })
          setImages({
            logo_url: imageSlot(b.logo_url),
            cover_image_url: imageSlot(b.cover_image_url),
            card_image_url: imageSlot(b.card_image_url),
          })
        }
        setLoading(false)
      })
      .catch((err) => {
        setError(err.message || 'Failed to load brand.')
        setLoading(false)
      })
  }, [slug])

  const handleChange = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }))

  // Local preview only — the actual Cloudinary upload happens on submit.
  const handleImageChange = (slotKey, e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setImages((prev) => {
      const slot = { ...prev[slotKey], file, preview: '' }
      const reader = new FileReader()
      reader.onload = () => {
        setImages((cur) => ({ ...cur, [slotKey]: { ...cur[slotKey], preview: reader.result } }))
      }
      reader.readAsDataURL(file)
      return { ...prev, [slotKey]: slot }
    })
  }

  const clearImage = (slotKey) =>
    setImages((prev) => ({ ...prev, [slotKey]: { current: '', file: null, preview: '' } }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (!form.name.trim()) {
      setError('Brand name is required.')
      return
    }
    const order = Number(form.display_order)
    if (form.display_order !== '' && (!Number.isInteger(order) || order < 0)) {
      setError('Display position must be a whole number 0 or greater.')
      return
    }

    setSaving(true)
    try {
      // Upload any replacement images first (Cloudinary), then patch the brand.
      const payload = {
        name: form.name.trim(),
        collection_label: form.collection_label.trim() || null,
        description: form.description.trim() || null,
        long_description: form.long_description.trim() || null,
        display_order: form.display_order === '' ? 0 : order,
        display_type: form.display_type,
        is_active: form.is_active,
      }
      for (const key of ['logo_url', 'cover_image_url', 'card_image_url']) {
        const slot = images[key]
        if (slot.file) {
          payload[key] = await uploadImage(slot.file)
        } else {
          payload[key] = slot.current || null
        }
      }

      await updateBrandDetails(brand.id, payload)
      navigate('/admin/brands')
    } catch (err) {
      setError(err.message || 'Failed to save brand. Please try again.')
      setSaving(false)
    }
  }

  if (loading) return <div className="loading-state">Loading brand…</div>

  if (!brand) {
    return (
      <div className="brands-page">
        <div className="page-header">
          <h1>Edit Brand</h1>
        </div>
        <div className="empty-state">Brand not found.</div>
        <Link to="/admin/brands" className="btn btn-outline btn-sm">Back to Brands</Link>
      </div>
    )
  }

  if (!canEdit) {
    return (
      <div className="brands-page">
        <div className="page-header">
          <h1>Edit Brand</h1>
        </div>
        <p className="brand-bulk-note">
          You have view-only access — ask an Admin or Manager to change brand details.
        </p>
        <Link to="/admin/brands" className="btn btn-outline btn-sm">Back to Brands</Link>
      </div>
    )
  }

  const imageFields = [
    { key: 'logo_url', label: 'Brand Logo' },
    { key: 'cover_image_url', label: 'Brand Cover Image' },
    { key: 'card_image_url', label: 'Brand Card Image' },
  ]

  return (
    <div className="brands-page">
      <div className="page-header">
        <h1>Edit Brand</h1>
        <Link to="/admin/brands" className="btn btn-outline btn-sm">Back to Brands</Link>
      </div>

      <form className="card brand-form" onSubmit={handleSubmit}>
        <div className="form-row form-row-2">
          <div className="form-field">
            <label htmlFor="name">Brand Name</label>
            <input id="name" name="name" value={form.name} onChange={handleChange} required />
          </div>
          <div className="form-field">
            <label htmlFor="collection_label">Collection Label</label>
            <input
              id="collection_label"
              name="collection_label"
              placeholder="e.g. Misk Al Arab Collection"
              value={form.collection_label}
              onChange={handleChange}
            />
          </div>
        </div>

        <div className="form-field">
          <label htmlFor="description">Short Description</label>
          <input
            id="description"
            name="description"
            placeholder="Shown on the storefront brand card"
            value={form.description}
            onChange={handleChange}
          />
        </div>

        <div className="form-field">
          <label htmlFor="long_description">Brand Description</label>
          <textarea
            id="long_description"
            name="long_description"
            rows={3}
            value={form.long_description}
            onChange={handleChange}
          />
        </div>

        <div className="form-row form-row-2">
          <div className="form-field">
            <label htmlFor="display_order">Display Position</label>
            <input
              id="display_order"
              name="display_order"
              type="number"
              min="0"
              step="1"
              placeholder="e.g. 3"
              value={form.display_order}
              onChange={handleChange}
            />
            <small className="field-example">Lower numbers appear first on the storefront.</small>
          </div>
          <div className="form-field">
            <label>Homepage Display Type</label>
            <div className="brand-type-radio">
              <label className="default-radio">
                <input
                  type="radio"
                  name="display_type"
                  value="featured"
                  checked={form.display_type === 'featured'}
                  onChange={handleChange}
                />
                <span>Featured <small>(large card)</small></span>
              </label>
              <label className="default-radio">
                <input
                  type="radio"
                  name="display_type"
                  value="standard"
                  checked={form.display_type === 'standard'}
                  onChange={handleChange}
                />
                <span>Standard <small>(compact card)</small></span>
              </label>
            </div>
          </div>
        </div>

        <div className="form-field featured-field">
          <label className="featured-toggle">
            <input
              type="checkbox"
              name="is_active"
              checked={form.is_active}
              onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))}
            />
            <span className="featured-switch" aria-hidden="true" />
            <span className="featured-toggle-text">
              Brand Active
              <small>Inactive brands are hidden from the storefront but stay editable here.</small>
            </span>
          </label>
        </div>

        {imageFields.map(({ key, label }) => {
          const slot = images[key]
          return (
            <div className="form-field brand-image-field" key={key}>
              <label htmlFor={key}>{label}</label>
              <div className="brand-image-row">
                <input id={key} type="file" accept="image/*" onChange={(e) => handleImageChange(key, e)} />
                {slot.current && !slot.file && (
                  <button type="button" className="btn btn-outline btn-sm" onClick={() => clearImage(key)}>
                    Remove
                  </button>
                )}
              </div>
              {slot.preview && (
                <div className="image-preview brand-image-preview">
                  <img src={slot.preview} alt={`${label} preview`} />
                </div>
              )}
            </div>
          )
        })}

        {error && <p className="login-error">{error}</p>}

        <button className="btn btn-gold" type="submit" disabled={saving}>
          {saving ? 'Saving…' : 'Save Changes'}
        </button>
      </form>
    </div>
  )
}
