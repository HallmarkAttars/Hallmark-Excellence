const bcrypt = require('bcryptjs')
const supabase = require('../config/supabase')
const { ROLES } = require('../config/roles')

// Every read returns this projection — password_hash is NEVER selected.
const EMPLOYEE_SELECT =
  'id, first_name, last_name, email, phone, role, is_active, last_login, created_at'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function toEmployee(row, selfId) {
  return {
    id: row.id,
    name: [row.first_name, row.last_name].filter(Boolean).join(' ') || row.email,
    first_name: row.first_name || '',
    last_name: row.last_name || '',
    email: row.email,
    phone: row.phone || '',
    role: row.role || 'staff',
    is_active: row.is_active !== false,
    last_login: row.last_login,
    created_at: row.created_at,
    // Lets the UI mark the logged-in admin's own row and disable destructive
    // actions against it — the server enforces the same rules below.
    is_self: row.id === selfId,
  }
}

// Count of ACTIVE admins — used by the last-admin protection rules.
async function countActiveAdmins() {
  const { count, error } = await supabase
    .from('users')
    .select('id', { count: 'exact', head: true })
    .eq('role', 'admin')
    .eq('is_active', true)

  if (error) {
    console.error('countActiveAdmins error:', error)
    return 0
  }
  return count ?? 0
}

// GET /api/admin/employees — list all staff accounts.
async function listEmployees(req, res) {
  try {
    const { data, error } = await supabase
      .from('users')
      .select(EMPLOYEE_SELECT)
      .order('created_at', { ascending: true })

    if (error) {
      console.error('listEmployees error:', error)
      return res.status(500).json({ error: 'Failed to fetch employees.' })
    }

    return res.json({ employees: (data || []).map((row) => toEmployee(row, req.admin.id)) })
  } catch (err) {
    console.error('listEmployees error:', err)
    return res.status(500).json({ error: 'Internal server error' })
  }
}

// POST /api/admin/employees — create an employee account.
// The password is bcrypt-hashed SERVER-SIDE before it ever touches the
// database; no plaintext is stored and no service-role key exists in the
// browser. Duplicate emails return a clean 409.
async function createEmployee(req, res) {
  try {
    const { first_name, last_name, email, phone, role, password, is_active } = req.body

    if (!first_name?.trim() || !email?.trim() || !password) {
      return res.status(400).json({ error: 'First name, email, and temporary password are required.' })
    }
    if (!EMAIL_RE.test(String(email).trim())) {
      return res.status(400).json({ error: 'Enter a valid email address.' })
    }
    if (String(password).length < 6) {
      return res.status(400).json({ error: 'Temporary password must be at least 6 characters.' })
    }
    const roleLower = String(role || '').toLowerCase()
    if (!ROLES.includes(roleLower)) {
      return res.status(400).json({ error: `Invalid role. Must be one of: ${ROLES.join(', ')}.` })
    }

    const passwordHash = await bcrypt.hash(String(password), 10)

    const { data, error } = await supabase
      .from('users')
      .insert({
        first_name: String(first_name).trim(),
        last_name: String(last_name || '').trim(),
        email: String(email).trim().toLowerCase(),
        phone: String(phone || ''),
        password_hash: passwordHash,
        role: roleLower,
        is_active: is_active !== false,
      })
      .select(EMPLOYEE_SELECT)
      .single()

    if (error) {
      if (error.code === '23505') {
        return res.status(409).json({ error: 'An employee with this email already exists.' })
      }
      console.error('createEmployee error:', error)
      return res.status(500).json({ error: 'Failed to create employee.' })
    }

    return res.status(201).json({
      employee: toEmployee(data, req.admin.id),
      message: 'Employee created successfully',
    })
  } catch (err) {
    console.error('createEmployee error:', err)
    return res.status(500).json({ error: 'Internal server error' })
  }
}

// PATCH /api/admin/employees/:id — update name / email / phone / role / status.
// Enforces self-protection and last-admin protection server-side.
async function updateEmployee(req, res) {
  try {
    const { id } = req.params

    const { data: existing, error: fetchError } = await supabase
      .from('users')
      .select(EMPLOYEE_SELECT)
      .eq('id', id)
      .maybeSingle()

    if (fetchError) {
      console.error('updateEmployee lookup error:', fetchError)
      return res.status(500).json({ error: 'Failed to update employee.' })
    }
    if (!existing) {
      return res.status(404).json({ error: 'Employee not found.' })
    }

    const isSelf = existing.id === req.admin.id
    const patch = {}

    if (req.body.first_name !== undefined) {
      if (!String(req.body.first_name).trim()) {
        return res.status(400).json({ error: 'First name cannot be empty.' })
      }
      patch.first_name = String(req.body.first_name).trim()
    }
    if (req.body.last_name !== undefined) {
      patch.last_name = String(req.body.last_name || '').trim()
    }
    if (req.body.phone !== undefined) {
      patch.phone = String(req.body.phone || '')
    }

    // Email change — validate format + duplicate (excluding the row itself).
    if (req.body.email !== undefined) {
      const email = String(req.body.email).trim().toLowerCase()
      if (!EMAIL_RE.test(email)) {
        return res.status(400).json({ error: 'Enter a valid email address.' })
      }
      const { data: dup } = await supabase.from('users').select('id').eq('email', email).maybeSingle()
      if (dup && dup.id !== id) {
        return res.status(409).json({ error: 'An employee with this email already exists.' })
      }
      patch.email = email
    }

    // Role change — self-demotion and last-admin demotion are blocked.
    if (req.body.role !== undefined) {
      const role = String(req.body.role).toLowerCase()
      if (!ROLES.includes(role)) {
        return res.status(400).json({ error: `Invalid role. Must be one of: ${ROLES.join(', ')}.` })
      }
      if (isSelf && role !== existing.role) {
        return res.status(400).json({ error: 'You cannot change your own role.' })
      }
      if (existing.role === 'admin' && role !== 'admin') {
        const activeAdmins = await countActiveAdmins()
        if (activeAdmins <= 1) {
          return res.status(400).json({ error: 'Cannot demote the last active admin.' })
        }
      }
      patch.role = role
    }

    // Status change — self-deactivation and last-admin deactivation are blocked.
    if (req.body.is_active !== undefined) {
      const isActive = Boolean(req.body.is_active)
      if (isSelf && !isActive) {
        return res.status(400).json({ error: 'You cannot deactivate your own account.' })
      }
      if (existing.role === 'admin' && existing.is_active && !isActive) {
        const activeAdmins = await countActiveAdmins()
        if (activeAdmins <= 1) {
          return res.status(400).json({ error: 'Cannot deactivate the last active admin.' })
        }
      }
      patch.is_active = isActive
    }

    if (Object.keys(patch).length === 0) {
      return res.json({ employee: toEmployee(existing, req.admin.id) })
    }

    const { data, error } = await supabase
      .from('users')
      .update(patch)
      .eq('id', id)
      .select(EMPLOYEE_SELECT)
      .single()

    if (error) {
      if (error.code === '23505') {
        return res.status(409).json({ error: 'An employee with this email already exists.' })
      }
      console.error('updateEmployee error:', error)
      return res.status(500).json({ error: 'Failed to update employee.' })
    }

    return res.json({
      employee: toEmployee(data, req.admin.id),
      message: 'Employee updated successfully',
    })
  } catch (err) {
    console.error('updateEmployee error:', err)
    return res.status(500).json({ error: 'Internal server error' })
  }
}

// DELETE /api/admin/employees/:id — permanent removal after confirmation.
// Guards: cannot delete yourself; cannot delete the last active admin.
// The users table is NOT referenced by orders (orders snapshot customer data
// into their own rows), so deleting an employee never touches business data.
async function deleteEmployee(req, res) {
  try {
    const { id } = req.params

    const { data: existing, error: fetchError } = await supabase
      .from('users')
      .select('id, role, is_active, email')
      .eq('id', id)
      .maybeSingle()

    if (fetchError) {
      console.error('deleteEmployee lookup error:', fetchError)
      return res.status(500).json({ error: 'Failed to delete employee.' })
    }
    if (!existing) {
      return res.status(404).json({ error: 'Employee not found.' })
    }

    if (existing.id === req.admin.id) {
      return res.status(400).json({ error: 'You cannot delete your own account.' })
    }
    if (existing.role === 'admin' && existing.is_active) {
      const activeAdmins = await countActiveAdmins()
      if (activeAdmins <= 1) {
        return res.status(400).json({ error: 'Cannot delete the last active admin.' })
      }
    }

    const { error } = await supabase.from('users').delete().eq('id', id)
    if (error) {
      console.error('deleteEmployee error:', error)
      return res.status(500).json({ error: 'Failed to delete employee.' })
    }

    return res.json({ success: true, message: 'Employee deleted successfully' })
  } catch (err) {
    console.error('deleteEmployee error:', err)
    return res.status(500).json({ error: 'Internal server error' })
  }
}

module.exports = {
  listEmployees,
  createEmployee,
  updateEmployee,
  deleteEmployee,
}
