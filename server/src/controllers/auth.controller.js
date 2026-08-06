const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const supabase = require('../config/supabase')

// POST /api/auth/login
async function login(req, res) {
  try {
    const { email, password } = req.body

    if (!email || !password) {
      return res.status(400).json({ error: 'email and password are required.' })
    }

    const { data: admin, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .maybeSingle()

    if (error) {
      console.error('login lookup error:', error)
      return res.status(500).json({ error: 'Failed to log in.' })
    }

    if (!admin) {
      return res.status(401).json({ error: 'Invalid email or password.' })
    }

    // Deactivated employees must NOT be able to sign in. (A deleted account
    // is simply "not found" above; a deactivated one gets an explicit notice.)
    if (admin.is_active === false) {
      return res.status(403).json({ error: 'Your account has been deactivated. Contact an administrator.' })
    }

    const passwordMatches = await bcrypt.compare(password, admin.password_hash)
    if (!passwordMatches) {
      return res.status(401).json({ error: 'Invalid email or password.' })
    }

    const name = [admin.first_name, admin.last_name].filter(Boolean).join(' ') || admin.email
    const role = admin.role || 'staff'

    const token = jwt.sign(
      { id: admin.id, email: admin.email, name, role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    )

    // Record the login time (best-effort — never fails the login).
    supabase
      .from('users')
      .update({ last_login: new Date().toISOString() })
      .eq('id', admin.id)
      .then(() => {})
      .catch((err) => console.error('last_login update error:', err.message))

    return res.json({
      token,
      admin: { id: admin.id, email: admin.email, name, role },
    })
  } catch (err) {
    console.error('login error:', err)
    return res.status(500).json({ error: 'Internal server error' })
  }
}

// POST /api/auth/verify
// Protected by requireAuth — if we get here, the token was valid.
async function verify(req, res) {
  try {
    return res.json({ admin: req.admin })
  } catch (err) {
    console.error('verify error:', err)
    return res.status(500).json({ error: 'Internal server error' })
  }
}

module.exports = { login, verify }
