const crypto = require('crypto')
const bcrypt = require('bcryptjs')
const supabase = require('../config/supabase')
const { ENV_ADMIN_ID, getEnvAdminConfig } = require('../config/envAdmin')
const { signAdminToken } = require('../utils/authTokens')
const { normalizeEmail, validateEmail } = require('../utils/emailValidation')

// Constant-time string comparison so a wrong ADMIN_PASSWORD does not reveal
// itself through timing. Length mismatch short-circuits (length alone is
// never treated as secret here).
function safeEqual(a, b) {
  const ba = Buffer.from(String(a ?? ''))
  const bb = Buffer.from(String(b ?? ''))
  if (ba.length !== bb.length) return false
  return crypto.timingSafeEqual(ba, bb)
}

// POST /api/auth/login
async function login(req, res) {
  try {
    const { email, password } = req.body

    if (!email || !password) {
      return res.status(400).json({ error: 'email and password are required.' })
    }

    // --- Env-configured master admin (server/.env.local) ------------------
    // The ONLY source for these credentials is the server process — never
    // client code, never the bundle, never an API response. When the
    // submitted email matches ADMIN_USERNAME, validation happens entirely
    // against ADMIN_PASSWORD. Every failure returns the SAME generic 401 as
    // the users-table path, so no caller can tell which credential was wrong.
    const envAdmin = getEnvAdminConfig()
    const submittedEmail = normalizeEmail(email)?.normalized || ''
    if (envAdmin.configured && submittedEmail === envAdmin.username) {
      if (!safeEqual(password, envAdmin.password)) {
        return res.status(401).json({ error: 'Invalid email or password.' })
      }
      const admin = {
        id: ENV_ADMIN_ID,
        email: envAdmin.username,
        name: 'Administrator',
        role: 'admin',
      }
      const token = signAdminToken(admin)
      // The password is never part of the token or the response.
      return res.json({ token, admin })
    }

    // Centralized validation — a malformed or disposable email gets the SAME
    // generic 401 as a wrong password, so no account-existence information is
    // ever revealed. The lookup uses the normalized email (domain lowercased).
    const normalizedEmail = normalizeEmail(email)?.normalized || ''
    if (!normalizedEmail || validateEmail(normalizedEmail)) {
      return res.status(401).json({ error: 'Invalid email or password.' })
    }

    const { data: admin, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', normalizedEmail)
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

    const token = signAdminToken({ id: admin.id, email: admin.email, name, role })

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

// GET/POST /api/auth/verify — and POST /api/auth/refresh (same handler).
// Protected by requireAuth — if we get here, the token was valid.
//
// SLIDING-SESSION RENEWAL: alongside the admin profile, a FRESH 7-day token
// is re-issued on every successful verification. The admin client stores the
// new token, so a session only ever expires after 7 continuous days without
// any verification (load / periodic renewal / tab focus) — never from mere
// idle time while the panel is in use. Because requireAuth sits in front,
// renewal never resurrects an expired/revoked token: genuine expiry still
// requires a real login.
async function verify(req, res) {
  try {
    return res.json({
      token: signAdminToken(req.admin),
      admin: req.admin,
    })
  } catch (err) {
    console.error('verify error:', err)
    return res.status(500).json({ error: 'Internal server error' })
  }
}

module.exports = { login, verify }
