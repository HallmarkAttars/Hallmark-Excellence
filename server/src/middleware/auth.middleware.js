const jwt = require('jsonwebtoken')
const supabase = require('../config/supabase')
const { can } = require('../config/roles')

// Protects admin routes. Expects "Authorization: Bearer <token>".
//
// Two layers:
//   1. The JWT must be valid (signature + expiry).
//   2. The FRESH user row is loaded from the users table so role changes and
//      account deactivation apply immediately — a stale JWT payload is never
//      trusted for authorization.
//
// On success, attaches the live profile to req.admin:
//   { id, email, name, role, is_active }
async function requireAuth(req, res, next) {
  const header = req.headers.authorization || ''
  const [scheme, token] = header.split(' ')

  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({ error: 'Missing or malformed Authorization header.' })
  }

  let decoded
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET)
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token.' })
  }

  // A valid-signed token whose `id` is not a UUID can never match a real row;
  // treat it as invalid rather than hitting a Postgres type error (22P02).
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(decoded.id))) {
    return res.status(401).json({ error: 'Invalid or expired token.' })
  }

  try {
    const { data: user, error } = await supabase
      .from('users')
      .select('id, first_name, last_name, email, phone, role, is_active')
      .eq('id', decoded.id)
      .maybeSingle()

    if (error) {
      console.error('requireAuth user lookup error:', error)
      return res.status(500).json({ error: 'Internal server error' })
    }

    // One identical response whether the account was deleted or deactivated,
    // so a removed employee learns nothing from the protected endpoints.
    if (!user || user.is_active === false) {
      return res.status(401).json({ error: 'Account is inactive or no longer exists.' })
    }

    const name = [user.first_name, user.last_name].filter(Boolean).join(' ') || user.email

    req.admin = {
      id: user.id,
      email: user.email,
      name,
      role: user.role || 'staff',
      is_active: user.is_active !== false,
    }

    next()
  } catch (err) {
    console.error('requireAuth error:', err)
    return res.status(500).json({ error: 'Internal server error' })
  }
}

// Route-level authorization: e.g. requirePermission('products.create').
// Must run AFTER requireAuth (needs req.admin.role).
function requirePermission(permission) {
  return function permissionGuard(req, res, next) {
    if (!req.admin || !can(req.admin.role, permission)) {
      return res.status(403).json({ error: 'You do not have permission to perform this action.' })
    }
    next()
  }
}

module.exports = { requireAuth, requirePermission }
