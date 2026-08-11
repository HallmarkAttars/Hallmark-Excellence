import { useEffect, useState } from 'react'
import { getCategories, createCategory, updateCategory, deleteCategory, getProducts, uploadImage } from '../services/mockApi'
import { useAuth } from '../context/AuthContext'
import { moveItem } from '../utils/order'
import Modal from '../components/ui/Modal'
import './Categories.css'

const EMPTY = { name: '', slug: '', display_order: '' }

export default function Categories() {
  const { can } = useAuth()
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

  // --- Manual display order --------------------------------------------------
  // The storefront shows categories in EXACTLY this order (never alphabetical).
  // orderList mirrors the server's display_order sequence while the admin drags
  // rows; only a “Save Order” click writes the new positions back.
  const [orderList, setOrderList] = useState([])
  const [orderDirty, setOrderDirty] = useState(false)
  const [savingOrder, setSavingOrder] = useState(false)
  const [orderError, setOrderError] = useState('')
  const [dragIndex, setDragIndex] = useState(null)
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

  // Keep the reorder list in sync with the loaded categories WITHOUT
  // clobbering an in-progress drag: on reload we keep the current row order
  // (refreshing names, dropping deleted rows, appending new ones). Only the
  // first load builds the list from scratch. The API already returns
  // categories sorted by display_order, so an untouched list matches.
  useEffect(() => {
    setOrderList((prev) => {
      if (prev.length === 0) {
        return categories.map((c) => ({ id: c.id, name: c.name }))
      }
      const byId = new Map(categories.map((c) => [c.id, c]))
      const merged = prev.map((row) => byId.get(row.id)).filter(Boolean)
      const known = new Set(merged.map((r) => r.id))
      for (const c of categories) {
        if (!known.has(c.id)) merged.push({ id: c.id, name: c.name })
      }
      return merged
    })
  }, [categories])

  const reorder = (from, to) => {
    const next = moveItem(orderList, from, to)
    if (next) {
      setOrderList(next)
      setOrderDirty(true)
    }
  }
  const moveUp = (i) => reorder(i, i - 1)
  const moveDown = (i) => reorder(i, i + 1)
  const onDrop = (i) => {
    if (dragIndex === null || dragIndex === i) {
      setDragIndex(null)
      return
    }
    reorder(dragIndex, i)
    setDragIndex(null)
  }

  // Persists the current row order as display_order 1..N (one PATCH per row).
  // If the database doesn't have the display_order column yet, the backend
  // accepts the save but the position can't persist — the response then
  // lacks display_order, which we detect and surface instead of claiming
  // success.
  const saveOrder = async () => {
    setSavingOrder(true)
    setOrderError('')
    try {
      const results = await Promise.all(
        orderList.map((item, i) => updateCategory(item.id, { display_order: i + 1 }))
      )
      const persisted = results.every((r) => r && r.display_order !== undefined)
      if (!persisted) {
        setOrderError(
          'The order will apply once the database is migrated — run migration_add_display_order.sql in the Supabase SQL editor, then save again.'
        )
        return
      }
      setOrderDirty(false)
      load()
    } catch (err) {
      setOrderError(err.message || 'Failed to save order. Please try again.')
    } finally {
      setSavingOrder(false)
    }
  }
  const openAdd = () => {
    setForm(EMPTY)
    setExistingImageUrl(null)
    setImagePreview(null)
    setImageFile(null)
    setError('')
    setModalMode('add')
  }
  const openEdit = (cat) => {
    setForm({ name: cat.name, slug: cat.slug, display_order: cat.display_order ?? '' })
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

      const payload = {
        name: form.name,
        slug: form.slug,
        image,
        // Optional explicit position; empty = server places it at the end.
        display_order: form.display_order === '' ? undefined : Number(form.display_order),
      }
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
        {can('categories.create') && <button className="btn btn-gold" onClick={openAdd}>Add Category</button>}
      </div>

      {error && !modalMode && <p className="login-error">{error}</p>}

      {!loading && can('categories.edit') && (
        <div className="card categories-order-card">
          <div className="categories-order-head">
            <h2>Display Order</h2>
            <button
              type="button"
              className="btn btn-gold btn-sm"
              onClick={saveOrder}
              disabled={!orderDirty || savingOrder}
            >
              {savingOrder ? 'Saving…' : orderDirty ? 'Save Order' : 'Order Saved'}
            </button>
          </div>
          <p className="categories-order-hint">
            Drag rows (or use the arrows) to reorder. The storefront “Shop by
            Category” section shows categories in exactly this order — never
            alphabetical. New categories are added to the end.
          </p>
          {orderError && <p className="login-error">{orderError}</p>}
          <ul className="categories-order-list">
            {orderList.map((item, i) => (
              <li
                key={item.id}
                className={`categories-order-row${dragIndex === i ? ' is-dragging' : ''}`}
                draggable
                onDragStart={(e) => {
                  setDragIndex(i)
                  e.dataTransfer.effectAllowed = 'move'
                }}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault()
                  onDrop(i)
                }}
                onDragEnd={() => setDragIndex(null)}
              >
                <span className="categories-order-drag" aria-hidden="true">⋮⋮</span>
                <span className="categories-order-pos">{i + 1}</span>
                <span className="categories-order-name">{item.name}</span>
                <span className="categories-order-count">
                  {productCounts[item.id] || 0} products
                </span>
                <span className="categories-order-arrows">
                  <button
                    type="button"
                    className="order-arrow"
                    onClick={() => moveUp(i)}
                    disabled={i === 0}
                    aria-label={`Move ${item.name} up`}
                    title="Move up"
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    className="order-arrow"
                    onClick={() => moveDown(i)}
                    disabled={i === orderList.length - 1}
                    aria-label={`Move ${item.name} down`}
                    title="Move down"
                  >
                    ↓
                  </button>
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

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
                {can('categories.edit') && <button className="btn btn-outline btn-sm" onClick={() => openEdit(cat)}>Edit</button>}
                {can('categories.delete') && <button className="btn btn-danger btn-sm" onClick={() => setConfirmDelete(cat)}>Delete</button>}
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
              <label htmlFor="cat-order">Display Position (optional)</label>
              <input
                id="cat-order"
                type="number"
                min="1"
                step="1"
                placeholder="End of list"
                value={form.display_order}
                onChange={(e) => setForm((f) => ({ ...f, display_order: e.target.value }))}
              />
              <small className="field-example">Leave empty to add at the end of the display order.</small>
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
