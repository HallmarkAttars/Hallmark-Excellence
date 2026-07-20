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
      .eq('role', 'admin')
      .maybeSingle()

    if (error) {
      console.error('login lookup error:', error)
      return res.status(500).json({ error: 'Failed to log in.' })
    }

    if (!admin) {
      return res.status(401).json({ error: 'Invalid email or password.' })
    }

    const passwordMatches = await bcrypt.compare(password, admin.password_hash)
    if (!passwordMatches) {
      return res.status(401).json({ error: 'Invalid email or password.' })
    }

    const token = jwt.sign(
      { id: admin.id, email: admin.email, name: admin.name },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    )

    return res.json({
      token,
      admin: { id: admin.id, email: admin.email, name: admin.name },
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
