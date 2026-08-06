import { useEffect, useMemo, useRef, useState } from 'react'
import {
  getEmployees,
  createEmployee,
  updateEmployee,
  deleteEmployee,
} from '../services/mockApi'
import { ROLES, ROLE_LABELS } from '../config/roles'
import Modal from '../components/ui/Modal'
import './Employees.css'

const EMPTY_FORM = {
  first_name: '',
  last_name: '',
  email: '',
  phone: '',
  role: 'staff',
  password: '',
  is_active: true,
}

export default function Employees() {
  const [employees, setEmployees] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  const [modalMode, setModalMode] = useState(null) // 'add' | 'edit' | null
  const [editing, setEditing] = useState(null) // the employee being edited
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [modalError, setModalError] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})

  const [confirmDelete, setConfirmDelete] = useState(null)
  const [deleting, setDeleting] = useState(false)

  const [togglingId, setTogglingId] = useState(null)
  const [feedback, setFeedback] = useState(null)
  const feedbackTimer = useRef(null)

  const load = () => {
    setLoading(true)
    getEmployees().then((list) => {
      setEmployees(list)
      setLoading(false)
    })
  }

  useEffect(() => {
    load()
    return () => window.clearTimeout(feedbackTimer.current)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const notify = (type, message) => {
    setFeedback({ type, message })
    window.clearTimeout(feedbackTimer.current)
    feedbackTimer.current = window.setTimeout(() => setFeedback(null), 4000)
  }

  // --- Search -------------------------------------------------------------
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return employees
    return employees.filter((e) =>
      [e.name, e.first_name, e.last_name, e.email, e.phone]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q))
    )
  }, [employees, search])

  // --- Add / Edit modal ---------------------------------------------------
  const openAdd = () => {
    setForm({ ...EMPTY_FORM, role: 'staff', is_active: true })
    setEditing(null)
    setModalError('')
    setFieldErrors({})
    setModalMode('add')
  }

  const openEdit = (employee) => {
    setEditing(employee)
    setForm({
      first_name: employee.first_name,
      last_name: employee.last_name,
      email: employee.email,
      phone: employee.phone,
      role: employee.role,
      password: '',
      is_active: employee.is_active,
    })
    setModalError('')
    setFieldErrors({})
    setModalMode('edit')
  }

  const closeModal = () => {
    setModalMode(null)
    setEditing(null)
  }

  const setField = (name, value) => {
    setForm((f) => ({ ...f, [name]: value }))
    setFieldErrors((fe) => ({ ...fe, [name]: '' }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setModalError('')

    const errs = {}
    if (!form.first_name.trim()) errs.first_name = 'First name is required.'
    if (!form.email.trim()) errs.email = 'Email is required.'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) errs.email = 'Enter a valid email address.'
    if (!ROLES.includes(form.role)) errs.role = 'Select a role.'
    if (modalMode === 'add' && form.password.length < 6) errs.password = 'Temporary password must be at least 6 characters.'
    if (Object.keys(errs).length > 0) {
      setFieldErrors(errs)
      return
    }

    setSaving(true)
    try {
      if (modalMode === 'add') {
        const created = await createEmployee({
          first_name: form.first_name,
          last_name: form.last_name,
          email: form.email,
          phone: form.phone,
          role: form.role,
          password: form.password,
          is_active: form.is_active,
        })
        notify('success', 'Employee created successfully')
        setEmployees((prev) => {
          const rest = prev.filter((p) => p.id !== created?.id)
          return created ? [...rest, created] : prev
        })
      } else {
        const updated = await updateEmployee(editing.id, {
          first_name: form.first_name,
          last_name: form.last_name,
          email: form.email,
          phone: form.phone,
          role: form.role,
          is_active: form.is_active,
        })
        notify('success', 'Employee updated successfully')
        setEmployees((prev) => prev.map((p) => (p.id === updated?.id ? updated : p)))
      }
      closeModal()
    } catch (err) {
      // Never swallow the real error — log it for development; the server
      // message (duplicate email, missing migration, permission…) is shown.
      console.error('Create/update employee failed:', err)
      setModalError(err.message || 'Unable to save the employee. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  // --- Quick activate / deactivate ---------------------------------------
  const handleToggleStatus = async (employee) => {
    if (togglingId) return
    setTogglingId(employee.id)
    try {
      const updated = await updateEmployee(employee.id, { is_active: !employee.is_active })
      setEmployees((prev) => prev.map((p) => (p.id === updated.id ? updated : p)))
      notify('success', `${updated.name} ${updated.is_active ? 'activated' : 'deactivated'}.`)
    } catch (err) {
      console.error('Toggle employee status failed:', err)
      notify('error', err.message || 'Unable to update employee status.')
    } finally {
      setTogglingId(null)
    }
  }

  // --- Delete -------------------------------------------------------------
  const handleDelete = async (employee) => {
    if (deleting) return
    setDeleting(true)
    try {
      await deleteEmployee(employee.id)
      setEmployees((prev) => prev.filter((p) => p.id !== employee.id))
      setConfirmDelete(null)
      notify('success', 'Employee deleted successfully')
    } catch (err) {
      console.error('Delete employee failed:', err)
      setConfirmDelete(null)
      notify('error', err.message || 'Unable to delete employee.')
    } finally {
      setDeleting(false)
    }
  }

  const roleOptions = ROLES.map((r) => (
    <option key={r} value={r}>{ROLE_LABELS[r] || r}</option>
  ))

  return (
    <div className="employees-page">
      <div className="page-header">
        <h1>Employees</h1>
        <button className="btn btn-gold" onClick={openAdd}>+ Add Employee</button>
      </div>

      {feedback && (
        <div className={`employees-feedback employees-feedback--${feedback.type}`} role="status" aria-live="polite">
          {feedback.message}
        </div>
      )}

      {/* Search bar */}
      <div className="employees-toolbar">
        <div className="employees-search">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
            <circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" />
          </svg>
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search employees…"
            aria-label="Search employees"
          />
        </div>
      </div>

      <div className="card">
        {loading ? (
          <div className="loading-state">Loading employees…</div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            {employees.length === 0 ? 'No employees yet. Add your first employee.' : 'No employees match your search.'}
          </div>
        ) : (
          <>
            {/* Desktop table — shown at >= 768px */}
            <div className="employees-desktop">
              <div className="table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Email / Phone</th>
                      <th>Role</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((emp) => (
                      <tr key={emp.id} className={emp.is_self ? 'is-self-row' : ''}>
                        <td>
                          <div className="employees-name-cell">
                            <span className="employees-avatar">{emp.name?.[0]?.toUpperCase() || '?'}</span>
                            <span>
                              {emp.name}
                              {emp.is_self && <span className="employees-you-chip">You</span>}
                            </span>
                          </div>
                        </td>
                        <td>
                          <div className="employees-contact-cell">
                            <span className="employees-email">{emp.email}</span>
                            {emp.phone && <span className="employees-phone">{emp.phone}</span>}
                          </div>
                        </td>
                        <td>
                          <span className={`employees-role employees-role--${emp.role}`}>
                            {ROLE_LABELS[emp.role] || emp.role}
                          </span>
                        </td>
                        <td>
                          <span className={`status-pill ${emp.is_active ? 'status-active' : 'status-inactive'}`}>
                            {emp.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td>
                          <div className="employees-actions">
                            <button className="btn btn-outline btn-sm" onClick={() => openEdit(emp)}>Edit</button>
                            <button
                              className="btn btn-outline btn-sm"
                              onClick={() => handleToggleStatus(emp)}
                              disabled={togglingId === emp.id || (emp.is_self && emp.is_active)}
                            >
                              {togglingId === emp.id ? '…' : emp.is_active ? 'Deactivate' : 'Activate'}
                            </button>
                            <button
                              className="btn btn-danger btn-sm"
                              onClick={() => setConfirmDelete(emp)}
                              disabled={emp.is_self}
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Mobile cards — shown below 768px, never a squeezed table */}
            <div className="employees-mobile">
              {filtered.map((emp) => (
                <div className="employee-card" key={emp.id}>
                  <div className="employee-card-head">
                    <span className="employees-avatar">{emp.name?.[0]?.toUpperCase() || '?'}</span>
                    <div className="employee-card-id">
                      <span className="employee-card-name">
                        {emp.name}
                        {emp.is_self && <span className="employees-you-chip">You</span>}
                      </span>
                      <span className="employee-card-email">{emp.email}</span>
                    </div>
                  </div>

                  <div className="employee-card-meta">
                    <span className={`employees-role employees-role--${emp.role}`}>
                      {ROLE_LABELS[emp.role] || emp.role}
                    </span>
                    <span className={`status-pill ${emp.is_active ? 'status-active' : 'status-inactive'}`}>
                      {emp.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>

                  {emp.phone && <p className="employee-card-phone">{emp.phone}</p>}

                  <div className="employee-card-actions">
                    <button className="btn btn-outline btn-sm" onClick={() => openEdit(emp)}>Edit</button>
                    <button
                      className="btn btn-outline btn-sm"
                      onClick={() => handleToggleStatus(emp)}
                      disabled={togglingId === emp.id || (emp.is_self && emp.is_active)}
                    >
                      {togglingId === emp.id ? '…' : emp.is_active ? 'Deactivate' : 'Activate'}
                    </button>
                    <button
                      className="btn btn-danger btn-sm"
                      onClick={() => setConfirmDelete(emp)}
                      disabled={emp.is_self}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Add / Edit modal */}
      {modalMode && (
        <Modal
          title={modalMode === 'edit' ? `Edit ${editing?.name || 'Employee'}` : 'Add Employee'}
          onClose={closeModal}
        >
          <form onSubmit={handleSubmit} noValidate>
            <div className="form-row form-row-2">
              <div className="form-field">
                <label htmlFor="emp-first-name">First Name *</label>
                <input
                  id="emp-first-name"
                  value={form.first_name}
                  onChange={(e) => setField('first_name', e.target.value)}
                  autoComplete="off"
                />
                {fieldErrors.first_name && <p className="field-error">{fieldErrors.first_name}</p>}
              </div>
              <div className="form-field">
                <label htmlFor="emp-last-name">Last Name</label>
                <input
                  id="emp-last-name"
                  value={form.last_name}
                  onChange={(e) => setField('last_name', e.target.value)}
                  autoComplete="off"
                />
              </div>
            </div>

            <div className="form-field">
              <label htmlFor="emp-email">Email *</label>
              <input
                id="emp-email"
                type="email"
                value={form.email}
                onChange={(e) => setField('email', e.target.value)}
                autoComplete="off"
              />
              {fieldErrors.email && <p className="field-error">{fieldErrors.email}</p>}
            </div>

            <div className="form-field">
              <label htmlFor="emp-phone">Phone</label>
              <input
                id="emp-phone"
                type="tel"
                value={form.phone}
                onChange={(e) => setField('phone', e.target.value)}
                placeholder="Optional"
                autoComplete="off"
              />
            </div>

            <div className="form-row form-row-2">
              <div className="form-field">
                <label htmlFor="emp-role">Role *</label>
                <select id="emp-role" value={form.role} onChange={(e) => setField('role', e.target.value)} disabled={editing?.is_self}>
                  {roleOptions}
                </select>
                {fieldErrors.role && <p className="field-error">{fieldErrors.role}</p>}
              </div>
              <div className="form-field">
                <label htmlFor="emp-status">Status</label>
                <select
                  id="emp-status"
                  value={form.is_active ? 'active' : 'inactive'}
                  onChange={(e) => setField('is_active', e.target.value === 'active')}
                  disabled={editing?.is_self}
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            </div>

            {modalMode === 'add' ? (
              <>
                <div className="form-field">
                  <label htmlFor="emp-password">Temporary Password *</label>
                  <input
                    id="emp-password"
                    type="text"
                    value={form.password}
                    onChange={(e) => setField('password', e.target.value)}
                    placeholder="Min 6 characters — hashed server-side"
                    autoComplete="new-password"
                  />
                  <p className="field-hint">The employee signs in with this password using the existing Admin login.</p>
                  {fieldErrors.password && <p className="field-error">{fieldErrors.password}</p>}
                </div>
                <div className="form-field">
                  <label htmlFor="emp-create-status">Status</label>
                  <select
                    id="emp-create-status"
                    value={form.is_active ? 'active' : 'inactive'}
                    onChange={(e) => setField('is_active', e.target.value === 'active')}
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </>
            ) : (
              editing?.is_self && (
                <p className="field-hint">You cannot change your own role or deactivate your own account.</p>
              )
            )}

            {modalError && <p className="login-error">{modalError}</p>}

            <button className="btn btn-gold" type="submit" disabled={saving} style={{ width: '100%' }}>
              {saving ? 'Saving…' : modalMode === 'edit' ? 'Save Changes' : 'Create Employee'}
            </button>
          </form>
        </Modal>
      )}

      {/* Delete confirmation */}
      {confirmDelete && (
        <Modal title="Delete Employee?" onClose={() => { if (!deleting) setConfirmDelete(null) }}>
          <p className="confirm-delete-employee">
            <strong>{confirmDelete.name}</strong> · {ROLE_LABELS[confirmDelete.role] || confirmDelete.role}
          </p>
          <p>This employee will lose access to the Admin Panel.</p>
          <div className="confirm-dialog-actions">
            <button className="btn btn-outline" disabled={deleting} onClick={() => setConfirmDelete(null)}>Cancel</button>
            <button className="btn btn-danger" disabled={deleting} onClick={() => handleDelete(confirmDelete)}>
              {deleting ? 'Deleting…' : 'Delete Employee'}
            </button>
          </div>
        </Modal>
      )}
    </div>
  )
}
