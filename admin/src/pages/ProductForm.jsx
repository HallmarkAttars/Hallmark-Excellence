import { useEffect, useState } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { getProduct, createProduct, updateProduct, getCategories, getBrands, uploadImage } from '../services/mockApi'
import './ProductForm.css'

const EMPTY = { name: '', description: '', price: '', stock: '', category_id: '', brand_id: '' }

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

  useEffect(() => {
    getCategories().then(setCategories)
    getBrands().then(setBrands)
    if (isEdit) {
      getProduct(id).then((p) => {
        if (p) {
          setForm({
            name: p.name, description: p.description ?? '', price: p.price,
            stock: p.stock, category_id: p.category_id ?? '', brand_id: p.brand_id ?? '',
          })
          setExistingImages([p.image].filter(Boolean))
          setImagePreview(p.image || null)
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

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    
    // Validate brand is required for Attar category
    if (isAttarCategory && !form.brand_id) {
      setError('Please select a brand.')
      return
    }
    
    setSaving(true)
    try {
      let image = existingImages[0] || null
      if (imageFile) {
        image = await uploadImage(imageFile)
      }

      const payload = {
        name: form.name,
        description: form.description,
        price: Number(form.price),
        stock: Number(form.stock),
        category_id: form.category_id || null,
        brand_id: form.brand_id || null,
        image,
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
    <div>
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
            <input id="price" name="price" type="number" min="0" step="0.01" value={form.price} onChange={handleChange} required />
          </div>
          <div className="form-field">
            <label htmlFor="stock">Stock</label>
            <input id="stock" name="stock" type="number" min="0" value={form.stock} onChange={handleChange} required />
          </div>
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
