import { useEffect, useState } from 'react'
import { getCategories, createCategory, updateCategory, deleteCategory, getProducts, uploadImage } from '../services/mockApi'
import Modal from '../components/ui/Modal'
import './Categories.css'

const EMPTY = { name: '', slug: '' }

export default function Categories() {
  const [categories, setCategories] = useState([])
  const [productCounts, setProductCounts] = useState({})
  const [loading, setLoading] = useState(true)
  const [modalMode, setModalMode] = useState(null) // 'add' | 'edit' | null
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState(EMPTY)
  const [existingImageUrl, setExistingImageUrl] = useState(null)
  const [imagePreview, setImagePreview] = useState(null)
  const [imageFile, setImageFile] = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const load = () => {
    setLoading(true)
    Promise.all([getCategories(), getProducts()]).then(([cats, products]) => {
      setCategories(cats)
      const counts = {}
      products.forEach((p) => { counts[p.category_id] = (counts[p.category_id] || 0) + 1 })
      setProductCounts(counts)
      setLoading(false)
    })
  }

  useEffect(load, [])

  const openAdd = () => {
    setForm(EMPTY)
    setExistingImageUrl(null)
    setImagePreview(null)
    setImageFile(null)
    setError('')
    setModalMode('add')
  }
  const openEdit = (cat) => {
    setForm({ name: cat.name, slug: cat.slug })
    setExistingImageUrl(cat.image || null)
    setImagePreview(cat.image || null)
    setImageFile(null)
    setError('')
    setEditingId(cat.id)
    setModalMode('edit')
  }
  const closeModal = () => { setModalMode(null); setEditingId(null) }

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
    setSaving(true)
    try {
      let image = existingImageUrl
      if (imageFile) {
        image = await uploadImage(imageFile)
      }

      const payload = { name: form.name, slug: form.slug, image }
      if (modalMode === 'edit') {
        await updateCategory(editingId, payload)
      } else {
        await createCategory(payload)
      }
      closeModal()
      load()
    } catch (err) {
      setError(err.message || 'Failed to save category. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id) => {
    try {
      await deleteCategory(id)
      setConfirmDelete(null)
      load()
    } catch (err) {
      setError(err.message || 'Failed to delete category.')
      setConfirmDelete(null)
    }
  }

  return (
    <div>
      <div className="page-header">
        <h1>Categories</h1>
        <button className="btn btn-gold" onClick={openAdd}>Add Category</button>
      </div>

      {error && !modalMode && <p className="login-error">{error}</p>}

      {loading ? (
        <div className="loading-state">Loading categories…</div>
      ) : (
        <div className="categories-admin-grid">
          {categories.map((cat) => (
            <div key={cat.id} className="card categories-admin-card">
              <img src={cat.image} alt="" className="categories-admin-thumb" />
              <h3>{cat.name}</h3>
              <p>{productCounts[cat.id] || 0} products</p>
              <div className="categories-admin-actions">
                <button className="btn btn-outline btn-sm" onClick={() => openEdit(cat)}>Edit</button>
                <button className="btn btn-danger btn-sm" onClick={() => setConfirmDelete(cat)}>Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {modalMode && (
        <Modal title={modalMode === 'edit' ? 'Edit Category' : 'Add Category'} onClose={closeModal}>
          <form onSubmit={handleSubmit}>
            <div className="form-field">
              <label htmlFor="cat-name">Name</label>
              <input id="cat-name" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required />
            </div>
            <div className="form-field">
              <label htmlFor="cat-slug">Slug</label>
              <input id="cat-slug" value={form.slug} onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))} required />
            </div>
            <div className="form-field">
              <label htmlFor="cat-image">Image</label>
              <input id="cat-image" type="file" accept="image/*" onChange={handleImageChange} />
              {imagePreview && <div className="image-preview"><img src={imagePreview} alt="Preview" /></div>}
            </div>
            {error && <p className="login-error">{error}</p>}
            <button className="btn btn-gold" type="submit" disabled={saving} style={{ width: '100%' }}>
              {saving ? (imageFile ? 'Uploading image…' : 'Saving…') : 'Save Category'}
            </button>
          </form>
        </Modal>
      )}

      {confirmDelete && (
        <Modal title="Delete Category?" onClose={() => setConfirmDelete(null)}>
          <p>This will remove "{confirmDelete.name}" from the catalog.</p>
          <div className="confirm-dialog-actions">
            <button className="btn btn-outline" onClick={() => setConfirmDelete(null)}>Cancel</button>
            <button className="btn btn-danger" onClick={() => handleDelete(confirmDelete.id)}>Delete</button>
          </div>
        </Modal>
      )}
    </div>
  )
}
